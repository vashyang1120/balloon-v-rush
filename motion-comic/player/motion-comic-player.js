/*
  氣球小V・動態漫畫播放器
  motion-comic-player v0.2.0-test-1（v0.2.0：新增第三幕所需的「遠景」圖層用途、對話 styleType、自動對話可停留到本幕結束）

  這是「唯一」的渲染核心：編輯器預覽與正式播放頁都用這一份，不另做簡化版預覽。

  移植來源：opening-test v0.2.0（已驗收成功版）
    - sample() / EASE            → 逐字沿用（插值與緩動完全相同）
    - drawLids()                 → 眼皮插件 eyelids（逐字沿用，CONFIG 換成專案參數）
    - renderScene1() 的呼吸運算   → 呼吸插件 breath（逐字沿用）
    - renderScene1() 的模糊/曝光  → 核心效果：套在 background 圖層
    - layoutScene2/renderScene2/buildShadows → 圖層類型 swapPair（逐字沿用）
    - render() 的淡黑切鏡         → 轉場 fadeBlack（相同曲線）

  時間模型：
    每一幕有自己的局部時間（毫秒），以及一組「節點 markers」（id → 局部時間）。
    關鍵影格寫成 { m: 節點id, o: 偏移毫秒, v: 數值, e: 緩動 }，實際時間 = 節點時間 + 偏移。
    內建節點：start = 0，end = 該幕 durationMs。
    整體時間軸 = 各幕依序排列；淡黑轉場的「淡出＋全黑」放在兩幕之間，「淡入」疊在下一幕開頭。
*/
(function (global) {
  'use strict';

  const VERSION = 'motion-comic-player v0.2.0-test-1';

  /* ===================== 插值（逐字沿用 v0.2.0） ===================== */
  const EASE = {
    linear: x => x,
    in: x => x * x * x,
    out: x => 1 - Math.pow(1 - x, 3),
    inOut: x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    step: () => 0,
  };
  const EASE_LABELS = { linear: 'linear', in: 'ease-in', out: 'ease-out', inOut: 'ease-in-out', step: 'step' };

  function sample(track, t) {
    if (t <= track[0][0]) return track[0][1];
    for (let i = 1; i < track.length; i++) {
      const [t1, v1, ease] = track[i];
      if (t <= t1) {
        const [t0, v0] = track[i - 1];
        if (t1 === t0) return v1;
        const k = (EASE[ease] || EASE.linear)((t - t0) / (t1 - t0));
        return v0 + (v1 - v0) * k;
      }
    }
    return track[track.length - 1][1];
  }
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const NS = 'http://www.w3.org/2000/svg';
  let uidSeq = 0;

  /* ===================== 效果軌道定義 ===================== */
  // 沒有關鍵影格時的預設值（＝不產生任何效果）
  const TRACK_DEFAULTS = { open: 1, tremor: 0, blur: 0, exposure: 1, breath: 0, overscan: 1 };
  const CAMERA_DEFAULTS = { x: 0, y: 0, scale: 1, rotation: 0 };
  const LAYER_TRACKS = ['x', 'y', 'scale', 'opacity', 'rotation'];

  /* ===================== 時間解析 ===================== */
  function markerTimes(scene) {
    const mm = { start: 0, end: scene.durationMs };
    (scene.markers || []).forEach(m => { mm[m.id] = m.t; });
    return mm;
  }
  // 時間參照：數字＝局部毫秒；物件 { m, o }＝節點時間＋偏移
  function refTime(ref, mm, fallback) {
    if (ref == null) return fallback;
    if (typeof ref === 'number') return ref;
    const base = ref.m != null && mm[ref.m] != null ? mm[ref.m] : 0;
    return base + (+ref.o || 0);
  }
  function compileTrack(kfs, mm) {
    if (!Array.isArray(kfs) || !kfs.length) return null;
    const arr = kfs.map((k, i) => ({ t: refTime(k, mm, 0), v: +k.v, e: k.e, i }));
    arr.sort((a, b) => a.t - b.t || a.i - b.i);
    return arr.map(k => (k.e ? [k.t, k.v, k.e] : [k.t, k.v]));
  }

  function compileScene(scene) {
    const mm = markerTimes(scene);
    const tracks = {};
    Object.keys(scene.tracks || {}).forEach(k => { tracks[k] = compileTrack(scene.tracks[k], mm); });
    const cam = {};
    const camTracks = (scene.camera && scene.camera.tracks) || {};
    Object.keys(camTracks).forEach(k => { cam[k] = compileTrack(camTracks[k], mm); });
    const layers = (scene.layers || []).map(L => {
      const c = { tracks: {} };
      Object.keys(L.tracks || {}).forEach(k => { c.tracks[k] = compileTrack(L.tracks[k], mm); });
      c.startT = refTime(L.start, mm, 0);
      c.endT = L.end == null ? Infinity : refTime(L.end, mm, Infinity);
      if (L.type === 'swapPair') {
        c.switchT = refTime(L.switchFrom, mm, 0);
        c.switchEndT = refTime(L.switchTo, mm, c.switchT);
      }
      return c;
    });
    const dialogues = (scene.dialogues || []).map(d => ({ d, t: refTime(d.at, mm, 0) }));
    return { mm, tracks, cam, layers, dialogues };
  }

  function buildTimeline(project) {
    let t = 0;
    const segs = [];
    (project.scenes || []).forEach((scene, i) => {
      const tr = i === 0 ? { type: 'cut' } : (scene.transitionIn || { type: 'cut' });
      const gap = (i > 0 && tr.type === 'fadeBlack') ? (Math.max(0, +tr.outMs || 0) + Math.max(0, +tr.holdMs || 0)) : 0;
      const start = t + gap;
      const end = start + Math.max(0, +scene.durationMs || 0);
      segs.push({ index: i, scene, tr, transStart: t, start, end });
      t = end;
    });
    return { segs, total: t };
  }

  /* ===================== 圖片載入 ===================== */
  function loadImage(src, timeoutMs) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      let done = false;
      const timer = setTimeout(() => { if (!done) { done = true; reject(new Error('timeout')); } }, timeoutMs || 15000);
      img.decoding = 'async';
      img.onload = () => {
        const fin = () => { if (!done) { done = true; clearTimeout(timer); resolve(img); } };
        if (img.decode) img.decode().then(fin, fin); else fin();
      };
      img.onerror = () => { if (!done) { done = true; clearTimeout(timer); reject(new Error('load failed')); } };
      img.src = src;
    });
  }

  /* ===================== 播放器 ===================== */
  class MotionComicPlayer {
    constructor(host, opts = {}) {
      this.host = host;
      this.baseUrl = opts.baseUrl || '';
      this.mode = opts.mode === 'edit' ? 'edit' : 'play';   // edit＝編輯預覽（對話不阻塞）；play＝正式播放
      this.speed = 1;
      this.t = 0;
      this.ambient = 0;               // 裝飾動畫時鐘：對話暫停劇情時仍會前進
      this.playing = false;
      this.blocked = null;            // 等待型對話阻塞中
      this.fired = new Set();
      this.range = null;
      this.swapView = 'play';         // swapPair 檢視：play / A / B / overlay
      this.assetState = {};           // id → { src, img, ok, failed, w, h }
      this.onTime = opts.onTime || null;
      this.onPlayState = opts.onPlayState || null;
      this.onEnd = opts.onEnd || null;
      this.onDialogue = opts.onDialogue || null;
      this.view = { W: 0, H: 0 };
      this.scenes = [];
      this.structureKey = '';

      host.classList.add('mc-host');
      this.stage = document.createElement('div');
      this.stage.className = 'mc-stage';
      this.scenesHost = document.createElement('div');
      this.scenesHost.className = 'mc-scenes';
      this.cutEl = document.createElement('div');
      this.cutEl.className = 'mc-cut';
      this.stage.append(this.scenesHost, this.cutEl);
      this.dialogue = new DialogueBox(this.stage, () => this.continueDialogue());
      host.appendChild(this.stage);

      this._raf = this._raf.bind(this);
      this._lastNow = 0;
      requestAnimationFrame(this._raf);
      if (global.ResizeObserver) {
        this._ro = new ResizeObserver(() => this.layout());
        this._ro.observe(host);
      } else {
        global.addEventListener('resize', () => this.layout());
      }
    }

    resolveSrc(src) {
      if (!src) return '';
      if (/^(blob:|data:|https?:|\/)/.test(src)) return src;
      return this.baseUrl + src;
    }

    /* ---------- 專案 ---------- */
    setProject(project) {
      this.project = project;
      this.tl = buildTimeline(project);
      const key = JSON.stringify((project.scenes || []).map(s => [s.id,
        (s.layers || []).map(L => [L.id, L.type, L.role, L.asset, L.assetA, L.assetB]),
        !!(s.effects && s.effects.eyelids && s.effects.eyelids.enabled !== false),
        !!(s.effects && s.effects.breath && s.effects.breath.enabled !== false),
        !!(s.tracks && (s.tracks.blur || s.tracks.exposure))]));
      if (key !== this.structureKey) {
        this.structureKey = key;
        this._buildDom();
      }
      this.scenes.forEach((S, i) => { S.scene = project.scenes[i]; S.c = compileScene(S.scene); });
      this._applyAssets();
      this.layout();
      this.t = Math.min(this.t, this.tl.total);
      this.renderAt(this.t, true);
    }

    loadAssets() {
      const assets = (this.project && this.project.assets) || {};
      const jobs = Object.keys(assets).map(id => {
        const a = assets[id];
        const src = this.resolveSrc(a.src);
        const st = this.assetState[id];
        if (st && st.src === src && (st.ok || st.loading)) return st.loading || Promise.resolve();
        const s = this.assetState[id] = { src, ok: false, failed: false, w: a.width || 0, h: a.height || 0 };
        s.loading = loadImage(src).then(img => {
          s.img = img; s.ok = true; s.w = img.naturalWidth || s.w; s.h = img.naturalHeight || s.h;
        }).catch(() => { s.failed = true; }).then(() => { s.loading = null; });
        return s.loading;
      });
      return Promise.all(jobs).then(() => {
        this._applyAssets();
        this.layout();
        this.renderAt(this.t, true);
        return this.assetReport();
      });
    }

    assetReport() {
      const assets = (this.project && this.project.assets) || {};
      return Object.keys(assets).map(id => ({ id, label: assets[id].label || id, src: assets[id].src,
        ok: !!(this.assetState[id] && this.assetState[id].ok),
        failed: !!(this.assetState[id] && this.assetState[id].failed) }));
    }

    assetSize(id) {
      const s = this.assetState[id];
      const a = this.project.assets[id] || {};
      return { w: (s && s.w) || a.width || 1, h: (s && s.h) || a.height || 1 };
    }

    sceneStatus(i) {
      const scene = this.project.scenes[i];
      const ids = [];
      (scene.layers || []).forEach(L => { [L.asset, L.assetA, L.assetB].forEach(id => { if (id) ids.push(id); }); });
      const missing = ids.filter(id => !(this.assetState[id] && this.assetState[id].ok));
      const pending = ids.filter(id => this.assetState[id] && this.assetState[id].loading);
      const hasLayers = (scene.layers || []).length > 0;
      return { ready: hasLayers && missing.length === 0, hasLayers, missing, pending };
    }

    /* ---------- DOM ---------- */
    _buildDom() {
      this.scenesHost.innerHTML = '';
      this.scenes = (this.project.scenes || []).map(scene => {
        const root = document.createElement('div');
        root.className = 'mc-scene';
        const cam = document.createElement('div');
        cam.className = 'mc-cam';
        const shake = document.createElement('div');
        shake.className = 'mc-shake';
        cam.appendChild(shake);
        root.appendChild(cam);
        const S = { scene, root, cam, shake, layerEls: [], lids: null, lastBlurPx: -1, lastExposure: -1 };
        if (scene.effects && scene.effects.breath && scene.effects.breath.enabled !== false) shake.classList.add('mc-breathing');
        (scene.layers || []).forEach(L => {
          let el;
          if (L.type === 'swapPair') el = this._makeSwap(L);
          else {
            const img = document.createElement('img');
            img.alt = ''; img.draggable = false;
            img.className = L.role === 'background' ? 'mc-bg' : 'mc-img';
            if (L.role === 'background' && scene.tracks && (scene.tracks.blur || scene.tracks.exposure)) img.classList.add('mc-filtered');
            el = { type: 'image', img, root: img };
          }
          S.layerEls.push(el);
          shake.appendChild(el.root);
        });
        if (scene.effects && scene.effects.eyelids && scene.effects.eyelids.enabled !== false) {
          const c = document.createElement('canvas');
          c.className = 'mc-lids';
          root.appendChild(c);
          S.lids = { canvas: c, ctx: c.getContext('2d'), pad: 0, feather: 0 };
        }
        const ph = document.createElement('div');
        ph.className = 'mc-placeholder';
        root.appendChild(ph);
        S.placeholder = ph;
        this.scenesHost.appendChild(root);
        return S;
      });
    }

    _makeSwap() {
      const uid = ++uidSeq;
      const wrap = document.createElement('div');
      wrap.className = 'mc-swap';
      wrap.innerHTML =
        `<svg viewBox="0 0 1448 1086" preserveAspectRatio="none" aria-hidden="true">` +
        `<defs><filter id="mcW${uid}" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="24"/></filter>` +
        `<filter id="mcT${uid}" x="-60%" y="-200%" width="220%" height="500%"><feGaussianBlur stdDeviation="7"/></filter></defs>` +
        `<g class="shBed"></g><g class="shShoesA"></g><g class="shShoesB"></g></svg>`;
      const imgA = document.createElement('img');
      const imgB = document.createElement('img');
      [imgA, imgB].forEach(i => { i.alt = ''; i.draggable = false; });
      wrap.append(imgA, imgB);
      return { type: 'swapPair', root: wrap, svg: wrap.querySelector('svg'), imgA, imgB, uid,
        shBed: wrap.querySelector('.shBed'), shShoesA: wrap.querySelector('.shShoesA'), shShoesB: wrap.querySelector('.shShoesB'),
        shadowKey: '' };
    }

    _applyAssets() {
      if (!this.project) return;
      this.scenes.forEach(S => {
        (S.scene.layers || []).forEach((L, li) => {
          const el = S.layerEls[li];
          if (!el) return;
          const set = (img, id) => {
            const st = this.assetState[id];
            const want = st && st.ok ? st.src : '';
            if (want && img.getAttribute('src') !== want) img.src = want;
            if (!want && img.getAttribute('src')) img.removeAttribute('src');
          };
          if (el.type === 'swapPair') { set(el.imgA, L.assetA); set(el.imgB, L.assetB); }
          else set(el.img, L.asset);
        });
      });
    }

    /* ---------- 版面 ---------- */
    layout() {
      if (!this.project) return;
      const vw = this.host.clientWidth, vh = this.host.clientHeight;
      if (!vw || !vh) return;
      const st = this.project.stage || { width: 1672, height: 941 };
      const ratio = st.width / st.height;
      let W, H;
      if (st.fit === 'cover') { W = vw; H = vh; }
      else if (vw / vh > ratio) { H = vh; W = vh * ratio; }
      else { W = vw; H = vw / ratio; }
      W = Math.round(W); H = Math.round(H);
      this.stage.style.width = W + 'px';
      this.stage.style.height = H + 'px';
      this.stage.style.setProperty('--mc-u', (H / 100) + 'px');
      this.view.W = W; this.view.H = H;

      this.scenes.forEach(S => {
        if (S.lids) {
          const P = S.scene.effects.eyelids.params || {};
          const L = S.lids;
          L.feather = Math.max(3, H * P.LID_FEATHER);
          L.pad = Math.ceil(L.feather * 4);
          const c = L.canvas;
          c.style.left = -L.pad + 'px';
          c.style.top = -L.pad + 'px';
          c.style.width = (W + L.pad * 2) + 'px';
          c.style.height = (H + L.pad * 2) + 'px';
          c.style.filter = `blur(${L.feather.toFixed(1)}px)`;
          c.width = W + L.pad * 2;
          c.height = H + L.pad * 2;
        }
        const cam = S.scene.camera || {};
        S.cam.style.transformOrigin = `${((cam.originX ?? 0.5) * 100).toFixed(2)}% ${((cam.originY ?? 0.5) * 100).toFixed(2)}%`;
        (S.scene.layers || []).forEach((Lr, li) => {
          const el = S.layerEls[li];
          if (el && el.type === 'swapPair') this._layoutSwap(Lr, el);
        });
      });
      this.renderAt(this.t, true);
    }

    /* ---------- swapPair（逐字沿用 v0.2.0 第二幕） ---------- */
    _buildShadows(L, el) {
      const A = this.assetSize(L.assetA);
      const sh = L.shadow || {};
      const key = JSON.stringify([A, sh]);
      if (key === el.shadowKey) return;
      el.shadowKey = key;
      el.svg.setAttribute('viewBox', `0 0 ${A.w} ${A.h}`);
      const color = sh.color || '#3a1d08';
      const ell = (cx, cy, rx, ry, op, filterId) => {
        const e = document.createElementNS(NS, 'ellipse');
        e.setAttribute('cx', cx); e.setAttribute('cy', cy);
        e.setAttribute('rx', rx); e.setAttribute('ry', ry);
        e.setAttribute('fill', color);
        e.setAttribute('opacity', op);
        e.setAttribute('filter', `url(#${filterId})`);
        return e;
      };
      el.shBed.innerHTML = '';
      const pts = sh.bedFeet || [];
      if (pts.length >= 3) {
        const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
        const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
        const poly = document.createElementNS(NS, 'polygon');
        poly.setAttribute('points', pts.map(([x, y]) =>
          `${(cx + (x - cx) * 0.9).toFixed(1)},${(cy + (y - cy) * 0.82).toFixed(1)}`).join(' '));
        poly.setAttribute('fill', color);
        poly.setAttribute('opacity', '0.8');
        poly.setAttribute('filter', `url(#mcW${el.uid})`);
        el.shBed.appendChild(poly);
        pts.slice(0, 3).forEach(([x, y]) => el.shBed.appendChild(ell(x, y - 3, 44, 10, 0.9, `mcT${el.uid}`)));
      }
      el.shShoesA.innerHTML = '';
      el.shShoesB.innerHTML = '';
      (sh.shoesA || []).forEach(([x, y, rx, ry]) => el.shShoesA.appendChild(ell(x, y, rx, ry, 0.75, `mcT${el.uid}`)));
      (sh.shoesB || []).forEach(([x, y, rx, ry]) => el.shShoesB.appendChild(ell(x, y, rx, ry, 0.75, `mcT${el.uid}`)));
    }

    _layoutSwap(L, el) {
      const { W, H } = this.view;
      if (!W) return;
      this._buildShadows(L, el);
      const A = this.assetSize(L.assetA), B = this.assetSize(L.assetB);
      const fw = W * L.foregroundScale;
      const k = fw / A.w;
      const fh = A.h * k;
      const left = W * L.foregroundX - fw * L.foregroundAnchorX;
      const top = H * L.foregroundY - fh * L.foregroundAnchorY;
      const r = el.root.style;
      r.left = left.toFixed(2) + 'px'; r.top = top.toFixed(2) + 'px';
      r.width = fw.toFixed(2) + 'px'; r.height = fh.toFixed(2) + 'px';
      const a = el.imgA.style;
      a.left = '0px'; a.top = '0px'; a.width = fw.toFixed(2) + 'px'; a.height = fh.toFixed(2) + 'px';
      const al = L.bAlign || { scale: 1, x: 0, y: 0 };
      const b = el.imgB.style;
      b.left = (al.x * k).toFixed(2) + 'px';
      b.top = (al.y * k).toFixed(2) + 'px';
      b.width = (B.w * al.scale * k).toFixed(2) + 'px';
      b.height = (B.h * al.scale * k).toFixed(2) + 'px';
      const lt = L.look || {};
      const f = [];
      if ((lt.brightness ?? 1) !== 1) f.push(`brightness(${lt.brightness})`);
      if ((lt.saturate ?? 1) !== 1) f.push(`saturate(${lt.saturate})`);
      if ((lt.warmth ?? 0) > 0) f.push(`sepia(${lt.warmth})`);
      el.imgA.style.filter = el.imgB.style.filter = f.length ? f.join(' ') : 'none';
      el.svg.style.opacity = (L.shadow && L.shadow.opacity != null) ? L.shadow.opacity : 0.55;
    }

    _renderSwap(L, el, c, t) {
      let aOp, bOp;
      const v = this.swapView;
      if (v === 'A') { aOp = 1; bOp = 0; }
      else if (v === 'B') { aOp = 0; bOp = 1; }
      else if (v === 'overlay') { aOp = 1; bOp = 0.5; }
      else {
        const SW = c.switchEndT - c.switchT;
        const p = SW > 0 ? clamp01((t - c.switchT) / SW) : (t >= c.switchT ? 1 : 0);
        bOp = EASE.inOut(p);
        aOp = 1 - clamp01((p - 0.6) / 0.4);
      }
      const op = (L.look && L.look.opacity != null) ? L.look.opacity : 1;
      el.imgA.style.opacity = (aOp * op).toFixed(3);
      el.imgB.style.opacity = (bOp * op).toFixed(3);
      el.imgA.style.visibility = aOp > 0 ? 'visible' : 'hidden';
      el.imgB.style.visibility = bOp > 0 ? 'visible' : 'hidden';
      el.shShoesA.style.opacity = (v === 'overlay' ? 1 : 1 - bOp).toFixed(3);
      el.shShoesB.style.opacity = (v === 'overlay' ? 0 : bOp).toFixed(3);
    }

    /* ---------- 單幕渲染 ---------- */
    renderScene(si, t, force) {
      const S = this.scenes[si];
      if (!S) return;
      const scene = S.scene, c = S.c, { W, H } = this.view;
      if (!W) return;
      const val = name => (c.tracks[name] ? sample(c.tracks[name], t) : TRACK_DEFAULTS[name]);
      const sec = t / 1000;
      const status = this.sceneStatus(si);

      // 素材未配置的提示
      if (!status.ready) {
        S.placeholder.style.display = 'flex';
        const names = status.missing.map(id => (this.project.assets[id] && this.project.assets[id].label) || id);
        S.placeholder.innerHTML = `<b>${escapeHtml(scene.name || scene.id)}</b><span>${
          !status.hasLayers ? '尚未配置素材' : (status.pending.length ? '素材載入中…' : '缺少素材：' + escapeHtml(names.join('、')))}</span>`;
      } else S.placeholder.style.display = 'none';

      // 1) 核心效果：背景模糊與曝光（只作用在 background 圖層，同 v0.2.0）
      const blurPx = val('blur') * H;
      const exposure = val('exposure');
      const bRound = Math.round(blurPx * 10) / 10;
      const eRound = Math.round(exposure * 1000) / 1000;
      if (force || bRound !== S.lastBlurPx || eRound !== S.lastExposure) {
        const parts = [];
        if (bRound > 0.05) parts.push(`blur(${bRound}px)`);
        if (Math.abs(eRound - 1) > 0.001) parts.push(`brightness(${eRound})`);
        const fstr = parts.length ? parts.join(' ') : 'none';
        (scene.layers || []).forEach((L, li) => {
          if (L.role === 'background' && S.layerEls[li]) S.layerEls[li].img.style.filter = fstr;
        });
        S.lastBlurPx = bRound; S.lastExposure = eRound;
      }

      // 2) 呼吸插件（逐字沿用 v0.2.0）
      const br = scene.effects && scene.effects.breath;
      if (br && br.enabled !== false) {
        const P = br.params || {};
        const breath = val('breath');
        const overscan = val('overscan');
        const w = (2 * Math.PI) / P.BREATH_PERIOD;
        const by = Math.sin(sec * w) * P.BREATH_Y * H * breath;
        const bx = Math.sin(sec * w * 0.79 + 1.1) * P.BREATH_X * W * breath;
        const brr = Math.sin(sec * w * 0.68 + 0.4) * P.BREATH_ROT * breath;
        const bs = overscan + (0.5 + 0.5 * Math.sin(sec * w + 0.9)) * P.BREATH_SCALE * breath;
        S.shake.style.transform = breath > 0.0005
          ? `translate3d(${bx.toFixed(2)}px, ${by.toFixed(2)}px, 0) rotate(${brr.toFixed(4)}deg) scale(${bs.toFixed(5)})`
          : (overscan > 1.0001 ? `scale(${overscan.toFixed(5)})` : 'none');
      } else S.shake.style.transform = 'none';

      // 3) 通用鏡頭：平移 / 推拉 / 旋轉
      const hasSwap = (scene.layers || []).some(L => L.type === 'swapPair');
      const cv = k => (c.cam[k] ? sample(c.cam[k], t) : CAMERA_DEFAULTS[k]);
      let cx = cv('x'), cy = cv('y'), cs = cv('scale'), cr = cv('rotation');
      if (hasSwap && this.swapView !== 'play') { cx = 0; cy = 0; cs = 1; cr = 0; }   // 對位檢視時不推鏡
      const moved = Math.abs(cx) > 1e-6 || Math.abs(cy) > 1e-6 || Math.abs(cr) > 1e-6;
      if (moved) S.cam.style.transform = `translate3d(${(cx * W).toFixed(2)}px, ${(cy * H).toFixed(2)}px, 0) rotate(${cr.toFixed(4)}deg) scale(${cs.toFixed(5)})`;
      else S.cam.style.transform = (cs > 1.00001 || cs < 0.99999) ? `scale(${cs.toFixed(5)})` : 'none';

      // 4) 圖層
      (scene.layers || []).forEach((L, li) => {
        const el = S.layerEls[li], lc = c.layers[li];
        if (!el || !lc) return;
        const vis = L.visible !== false && t >= lc.startT && t < lc.endT;
        el.root.style.display = vis ? '' : 'none';
        if (!vis) return;
        if (el.type === 'swapPair') { this._renderSwap(L, el, lc, t); return; }
        if (L.role === 'background') {
          const bo = lc.tracks.opacity ? sample(lc.tracks.opacity, t) : (L.opacity != null ? +L.opacity : 1);
          el.img.style.opacity = bo < 1 ? clamp01(bo).toFixed(3) : '';
          return;
        }
        const lv = k => (lc.tracks[k] ? sample(lc.tracks[k], t) : (L[k] != null ? +L[k] : ({ x: 0.5, y: 0.5, scale: 0.4, opacity: 1, rotation: 0 })[k]));
        const sz = this.assetSize(L.asset);
        const w = W * lv('scale');
        const h = w * (sz.h / sz.w);           // 保持原始比例，不拉伸
        const ax = L.anchorX ?? 0.5, ay = L.anchorY ?? 1;
        let x = lv('x') * W, y = lv('y') * H, rot = lv('rotation');
        const sw = L.sway;
        if (sw && sw.periodMs > 0) {
          const ph = (2 * Math.PI * this.ambient) / sw.periodMs;
          x += (sw.x || 0) * W * Math.sin(ph);
          y += (sw.y || 0) * H * Math.sin(ph * 0.83 + 0.7);
          rot += (sw.rot || 0) * Math.sin(ph * 0.71 + 1.3);
        }
        const s = el.img.style;
        s.width = w.toFixed(2) + 'px'; s.height = h.toFixed(2) + 'px';
        s.left = (x - ax * w).toFixed(2) + 'px'; s.top = (y - ay * h).toFixed(2) + 'px';
        s.transformOrigin = `${ax * 100}% ${ay * 100}%`;
        s.transform = Math.abs(rot) > 1e-4 ? `rotate(${rot.toFixed(3)}deg)` : 'none';
        s.opacity = clamp01(lv('opacity')).toFixed(3);
      });

      // 5) 眼皮插件
      if (S.lids) this._drawLids(S, val('open'), sec, val('tremor'));
    }

    /* ---------- 眼皮插件（逐字沿用 v0.2.0 drawLids） ---------- */
    _drawLids(S, open, timeSec, tremorAmt) {
      const CONFIG = S.scene.effects.eyelids.params || {};
      const { W, H } = this.view;
      const { pad, feather, canvas: lids, ctx } = S.lids;
      const cw = lids.width, ch = lids.height;
      ctx.clearRect(0, 0, cw, ch);

      let o = open;
      if (tremorAmt > 0 && o > 0.02 && o < 0.98) {
        o += tremorAmt * CONFIG.TREMOR *
          (Math.sin(timeSec * 7.3) * 0.6 + Math.sin(timeSec * 12.1 + 1.3) * 0.4) *
          Math.min(1, o * 4);
      }
      o = Math.max(0, Math.min(1, o));

      if (o >= 1) { lids.style.visibility = 'hidden'; return; }
      lids.style.visibility = 'visible';

      const cy = H * CONFIG.LID_CENTER_Y;
      const curv = H * (CONFIG.LID_CURVE_MIN + (CONFIG.LID_CURVE_MAX - CONFIG.LID_CURVE_MIN) * o);
      const curvMax = H * CONFIG.LID_CURVE_MAX;
      const margin = curvMax + feather * 3 + H * 0.03;

      const oU = o;
      const oL = Math.pow(o, CONFIG.LOWER_LID_LAG);
      const upperC = cy - oU * (cy + margin);
      const lowerC = cy + oL * ((H - cy) + margin);

      const x0 = -W * 0.12, x1 = W * 1.12, xm = W / 2;

      ctx.save();
      ctx.translate(pad, pad);

      const up = new Path2D();
      up.moveTo(x0, -pad - 2);
      up.lineTo(x0, upperC + curv);
      up.quadraticCurveTo(xm, upperC - curv, x1, upperC + curv);
      up.lineTo(x1, -pad - 2);
      up.closePath();

      const lc = curv * 0.8;
      const lo = new Path2D();
      lo.moveTo(x0, H + pad + 2);
      lo.lineTo(x0, lowerC - lc);
      lo.quadraticCurveTo(xm, lowerC + lc, x1, lowerC - lc);
      lo.lineTo(x1, H + pad + 2);
      lo.closePath();

      ctx.fillStyle = CONFIG.LID_COLOR;
      ctx.fill(up);
      ctx.fill(lo);

      ctx.globalAlpha = Math.min(1, o / 0.18);
      ctx.lineWidth = feather * 2.4;
      ctx.strokeStyle = CONFIG.LID_RIM_COLOR;
      const edgeU = new Path2D();
      edgeU.moveTo(x0, upperC + curv);
      edgeU.quadraticCurveTo(xm, upperC - curv, x1, upperC + curv);
      const edgeL = new Path2D();
      edgeL.moveTo(x0, lowerC - lc);
      edgeL.quadraticCurveTo(xm, lowerC + lc, x1, lowerC - lc);
      ctx.save(); ctx.clip(up); ctx.stroke(edgeU); ctx.restore();
      ctx.save(); ctx.clip(lo); ctx.stroke(edgeL); ctx.restore();

      ctx.restore();
    }

    /* ---------- 整體時間 → 畫面 ---------- */
    locate(T) {
      const segs = this.tl.segs;
      for (const seg of segs) if (T < seg.end) return { seg, local: T - seg.start };
      const last = segs[segs.length - 1];
      return last ? { seg: last, local: last.scene.durationMs } : null;
    }

    renderAt(T, force) {
      if (!this.tl || !this.view.W) return;
      const loc = this.locate(T);
      if (!loc) return;
      const { seg } = loc;
      const i = seg.index;
      let cut = 0;
      const show = [];      // [sceneIndex, localTime, opacity]
      if (T < seg.start) {
        // 淡黑轉場的淡出＋全黑（兩幕之間）
        const tr = seg.tr, d = T - seg.transStart;
        const out = Math.max(0, +tr.outMs || 0);
        if (d < out) {
          cut = EASE.inOut(clamp01(d / Math.max(1, out)));
          show.push([i - 1, this.tl.segs[i - 1].scene.durationMs, 1]);
        } else {
          cut = 1;
          show.push([i, 0, 1]);
        }
      } else {
        const local = Math.min(T - seg.start, seg.scene.durationMs);
        const tr = seg.tr;
        if (i > 0 && tr.type === 'fadeBlack' && local < (+tr.inMs || 0)) {
          cut = 1 - EASE.out(clamp01(local / Math.max(1, +tr.inMs)));
        }
        if (i > 0 && tr.type === 'crossfade' && local < (+tr.durMs || 0)) {
          show.push([i - 1, this.tl.segs[i - 1].scene.durationMs, 1]);
          show.push([i, local, EASE.inOut(clamp01(local / Math.max(1, +tr.durMs)))]);
        } else show.push([i, local, 1]);
      }
      this.cutEl.style.opacity = cut.toFixed(3);

      const visible = new Set(show.map(s => s[0]));
      this.scenes.forEach((S, si) => {
        const on = visible.has(si);
        if (on && S.root.style.display !== 'block') { S.root.style.display = 'block'; force = true; }
        if (!on && S.root.style.display !== 'none') S.root.style.display = 'none';
      });
      show.forEach(([si, local, op], k) => {
        const S = this.scenes[si];
        S.root.style.zIndex = String(k + 1);
        S.root.style.opacity = op < 1 ? op.toFixed(3) : '';
        this.renderScene(si, local, force);
      });
      this._current = { sceneIndex: seg.index, local: loc.local };
      this._renderDialogue();
    }

    /* ---------- 對話 ---------- */
    allDialogues() {
      const out = [];
      this.tl.segs.forEach(seg => {
        const S = this.scenes[seg.index];
        if (!S) return;
        S.c.dialogues.forEach(({ d, t }) => {
          if (d.enabled === false) return;
          out.push({ d, g: seg.start + Math.min(t, seg.scene.durationMs), sceneIndex: seg.index, segEnd: seg.end });
        });
      });
      return out.sort((a, b) => a.g - b.g);
    }

    _included(sceneIndex) {
      return !this.range || !this.range.exclude || !this.range.exclude.has(sceneIndex);
    }

    _nextWaitDialogue(t0, t1) {
      let best = null;
      this.allDialogues().forEach(x => {
        if (x.d.mode !== 'wait' || this.fired.has(x.d.id) || !this._included(x.sceneIndex)) return;
        if (x.g >= t0 && x.g <= t1 && (!best || x.g < best.g)) best = x;
      });
      return best;
    }

    _renderDialogue() {
      const box = this.dialogue;
      if (this.blocked) {
        const b = this.blocked;
        const chars = Array.from(b.d.text || '');
        const n = b.revealAll ? chars.length : Math.floor((performance.now() - b.since) / Math.max(1, b.d.charMs || 45));
        box.show(b.d.speaker, chars.slice(0, n).join(''), n >= chars.length, { waiting: true, styleType: b.d.styleType });
        return;
      }
      const T = this.t;
      let cur = null;
      this.allDialogues().forEach(x => {
        if (!this._included(x.sceneIndex)) return;
        const typeMs = Array.from(x.d.text || '').length * (x.d.charMs || 45);
        let until;
        if (x.d.mode === 'auto') until = (+x.d.autoMs > 0) ? x.g + Math.max(typeMs, +x.d.autoMs) : x.segEnd;   // 0＝停留到本幕結束
        else if (this.mode === 'edit') until = x.g + typeMs + 1500;   // 編輯預覽：只顯示、不阻塞
        else return;
        until = Math.min(until, x.segEnd);                            // 對話不會延續到下一幕
        const inside = T < until || (T === x.segEnd && until === x.segEnd);   // 本幕最後一格仍顯示（停在結尾時不消失）
        if (T >= x.g && inside && (!cur || x.g >= cur.g)) cur = x;
      });
      if (!cur) { box.hide(); return; }
      const chars = Array.from(cur.d.text || '');
      const n = Math.floor((T - cur.g) / Math.max(1, cur.d.charMs || 45));
      box.show(cur.d.speaker, chars.slice(0, n).join(''), n >= chars.length,
        { preview: cur.d.mode === 'wait', waiting: false, styleType: cur.d.styleType });
    }

    continueDialogue() {
      const b = this.blocked;
      if (!b) return;
      const len = Array.from(b.d.text || '').length;
      const n = Math.floor((performance.now() - b.since) / Math.max(1, b.d.charMs || 45));
      if (!b.revealAll && n < len) { b.revealAll = true; this._renderDialogue(); return; }  // 先把字顯示完
      this.blocked = null;
      this.dialogue.hide();
      this._lastNow = performance.now();
      if (b.d.after === 'stop') this.pause();
      if (this.onDialogue) this.onDialogue(null);
    }

    _resetFired(T, inclusive) {
      this.fired = new Set();
      this.allDialogues().forEach(x => { if (inclusive ? x.g <= T : x.g < T) this.fired.add(x.d.id); });
    }

    /* ---------- 播放控制 ---------- */
    _raf(now) {
      requestAnimationFrame(this._raf);
      let dt = now - (this._lastNow || now);
      this._lastNow = now;
      dt = Math.min(dt, 50);
      if (!this.tl) return;
      if (this.playing) this.ambient += dt;
      if (this.playing && !this.blocked && !document.hidden && !this.portraitBlocked()) {
        let nt = this.t + dt * this.speed;
        if (this.mode === 'play') {
          const d = this._nextWaitDialogue(this.t, nt);
          if (d) {
            nt = d.g;
            this.blocked = { d: d.d, since: performance.now(), revealAll: false };
            this.fired.add(d.d.id);
            if (this.onDialogue) this.onDialogue(d.d);
          }
        }
        // 範圍：跳過未包含的幕次
        const loc = this.locate(nt);
        if (loc && !this._included(loc.seg.index)) {
          const next = this.tl.segs.find(s => s.index > loc.seg.index && this._included(s.index));
          nt = next ? next.transStart : this._rangeEnd();
        }
        const end = this._rangeEnd();
        if (nt >= end) {
          this.t = end;
          this.renderAt(this.t);
          this._setPlaying(false);
          if (this.onTime) this.onTime(this.t);
          if (this.onEnd) this.onEnd();
          return;
        }
        this.t = nt;
        this.renderAt(this.t);
        if (this.onTime) this.onTime(this.t);
      } else if (this.blocked) {
        this._renderDialogue();
        if (this._hasSway()) this.renderAt(this.t);   // 劇情暫停時，裝飾動畫仍可繼續
      }
    }

    _hasSway() {
      return (this.project.scenes || []).some(s => (s.layers || []).some(L => L.sway && L.sway.periodMs > 0));
    }

    _rangeEnd() { return this.range && this.range.to != null ? Math.min(this.range.to, this.tl.total) : this.tl.total; }
    _rangeStart() { return this.range && this.range.from != null ? this.range.from : 0; }

    portraitBlocked() {
      return this.mode === 'play' && global.matchMedia && matchMedia('(orientation: portrait) and (pointer: coarse)').matches;
    }

    _setPlaying(p) {
      if (this.playing === p) return;
      this.playing = p;
      this._lastNow = performance.now();
      if (this.onPlayState) this.onPlayState(p);
    }

    // range: null＝全部；{ from, to, exclude:Set(sceneIndex) }
    setRange(range) { this.range = range; }

    rangeFor(kind, sceneIndex) {
      const segs = this.tl.segs;
      if (kind === 'scene') {
        const s = segs[sceneIndex];
        return s ? { from: s.transStart, to: s.end, exclude: new Set(segs.filter(x => x.index !== sceneIndex).map(x => x.index)) } : null;
      }
      if (kind === 'ready') {
        const ex = new Set(segs.filter(s => !this.sceneStatus(s.index).ready).map(s => s.index));
        const inc = segs.filter(s => !ex.has(s.index));
        if (!inc.length) return { from: 0, to: 0, exclude: ex };
        return { from: inc[0].transStart, to: inc[inc.length - 1].end, exclude: ex };
      }
      return null;
    }

    play() {
      if (!this.tl) return;
      const end = this._rangeEnd();
      if (this.t >= end - 1 || this.t < this._rangeStart()) { this.seek(this._rangeStart()); }
      this._setPlaying(true);
    }
    pause() { this._setPlaying(false); }
    togglePlay() { if (this.playing) this.pause(); else this.play(); }

    replay() {
      this.blocked = null;
      this.dialogue.hide();
      this.fired = new Set();
      this.t = this._rangeStart();
      this._resetFired(this.t, false);
      this.renderAt(this.t, true);
      if (this.onTime) this.onTime(this.t);
      this._setPlaying(true);
    }

    seek(T) {
      if (!this.tl) return;
      this.blocked = null;
      this.dialogue.hide();
      this.t = Math.max(0, Math.min(this.tl.total, T));
      this._resetFired(this.t, false);
      this.renderAt(this.t, true);
      if (this.onTime) this.onTime(this.t);
    }

    // 略過目前這一幕：跳到本幕結尾，本幕的對話都視為已觸發
    skipScene() {
      const loc = this.locate(this.t);
      if (!loc) return;
      this.blocked = null;
      this.dialogue.hide();
      let target = loc.seg.end;
      if (this.t >= loc.seg.end - 1) {
        const next = this.tl.segs.find(s => s.index > loc.seg.index && this._included(s.index));
        target = next ? next.end : this.tl.total;
      }
      target = Math.min(target, this._rangeEnd());
      this.t = target;
      this._resetFired(this.t, true);
      this.renderAt(this.t, true);
      if (this.onTime) this.onTime(this.t);
      if (this.t >= this._rangeEnd()) { this._setPlaying(false); if (this.onEnd) this.onEnd(); }
    }

    // 略過全部：到範圍結尾
    skipAll() {
      this.blocked = null;
      this.dialogue.hide();
      this.t = this._rangeEnd();
      this._resetFired(this.t, true);
      this.renderAt(this.t, true);
      this._setPlaying(false);
      if (this.onTime) this.onTime(this.t);
      if (this.onEnd) this.onEnd();
    }

    setMode(m) { this.mode = m === 'edit' ? 'edit' : 'play'; this.blocked = null; this.dialogue.hide(); this.renderAt(this.t, true); }
    setSpeed(s) { this.speed = s; }
    setSwapView(v) { this.swapView = v; this.renderAt(this.t, true); }
    get total() { return this.tl ? this.tl.total : 0; }
    get current() { return this._current; }
  }

  /* ===================== 對話框模組（可替換） =====================
     目前是「預覽樣式」：紫色底部大框＋角色名稱＋逐字顯示＋繼續按鈕。
     尚未取得正式遊戲 RPG 對話系統的原始碼與 CSS，因此不是正式遊戲 UI 的複製品；
     日後可整個替換這個類別（介面：show(name, text, done, opts) / hide()）。 */
  class DialogueBox {
    constructor(parent, onContinue) {
      const el = document.createElement('div');
      el.className = 'mc-dialog';
      el.innerHTML = '<div class="mc-dialog-name"></div><div class="mc-dialog-text"></div>' +
        '<div class="mc-dialog-tag"></div><button type="button" class="mc-dialog-next">繼續 ▼</button>';
      parent.appendChild(el);
      this.el = el;
      this.nameEl = el.querySelector('.mc-dialog-name');
      this.textEl = el.querySelector('.mc-dialog-text');
      this.tagEl = el.querySelector('.mc-dialog-tag');
      this.nextEl = el.querySelector('.mc-dialog-next');
      this.nextEl.addEventListener('click', e => { e.stopPropagation(); onContinue(); });
      el.addEventListener('click', () => onContinue());
      this.state = '';
    }
    show(name, text, done, opts = {}) {
      const key = [name, text, done, opts.waiting, opts.preview, opts.styleType].join('|');
      if (key === this.state) return;
      this.state = key;
      this.el.classList.add('show');
      this.nameEl.textContent = name || '';
      this.nameEl.style.display = name ? '' : 'none';
      this.textEl.textContent = text;
      this.nextEl.style.display = opts.waiting ? '' : 'none';
      this.nextEl.classList.toggle('ready', !!done);
      this.tagEl.textContent = opts.preview ? '等待玩家繼續（編輯預覽不暫停）' : '';
      this.el.classList.toggle('waiting', !!opts.waiting);
      const st = 'mc-style-' + (opts.styleType || 'rpg_box_no_portrait');
      if (this.styleClass !== st) { if (this.styleClass) this.el.classList.remove(this.styleClass); this.el.classList.add(st); this.styleClass = st; }
    }
    hide() {
      if (!this.state) return;
      this.state = '';
      this.el.classList.remove('show');
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ===================== 專案驗證 ===================== */
  const SCHEMA_VERSION = '1.0';
  const EASES = Object.keys(EASE);
  const TRANSITIONS = ['cut', 'fadeBlack', 'crossfade'];
  const DIALOG_STYLES = ['rpg_box_no_portrait'];
  // background＝填滿舞台（套用模糊／曝光）；far＝遠景（例如窗外，可位移縮放運鏡）；character＝人物；foreground＝前景
  const LAYER_ROLES = ['background', 'far', 'character', 'foreground'];

  function validateProject(p) {
    const errors = [], warnings = [];
    const isNum = v => typeof v === 'number' && isFinite(v);
    if (!p || typeof p !== 'object') return { errors: ['檔案內容不是 JSON 物件'], warnings };
    if (p.schemaVersion !== SCHEMA_VERSION) errors.push(`schemaVersion 應為 "${SCHEMA_VERSION}"，目前是 ${JSON.stringify(p.schemaVersion)}`);
    if (!p.stage || !isNum(p.stage.width) || !isNum(p.stage.height)) errors.push('stage.width / stage.height 必須是數字');
    if (!p.assets || typeof p.assets !== 'object') errors.push('缺少 assets 物件');
    if (!Array.isArray(p.scenes) || !p.scenes.length) { errors.push('scenes 必須是非空陣列'); return { errors, warnings }; }
    const sceneIds = new Set();
    const dlgIds = new Set();
    p.scenes.forEach((s, si) => {
      const tag = `第 ${si + 1} 幕（${s && s.name || s && s.id || '?'}）`;
      if (!s || typeof s !== 'object') { errors.push(`${tag} 格式錯誤`); return; }
      if (!s.id) errors.push(`${tag} 缺少 id`);
      else if (sceneIds.has(s.id)) errors.push(`${tag} 的 id「${s.id}」重複`);
      sceneIds.add(s.id);
      if (!isNum(s.durationMs) || s.durationMs <= 0) errors.push(`${tag} durationMs 必須是大於 0 的數字`);
      const mm = { start: 0, end: s.durationMs };
      const mids = new Set(['start', 'end']);
      let prev = 0;
      (s.markers || []).forEach(m => {
        if (!m.id || mids.has(m.id)) errors.push(`${tag} 節點 id「${m.id}」缺少或重複`);
        mids.add(m.id);
        if (!isNum(m.t)) errors.push(`${tag} 節點「${m.id}」時間不是數字`);
        else {
          if (m.t < prev) errors.push(`${tag} 節點「${m.id}」時間 ${m.t} 早於前一個節點`);
          if (m.t > s.durationMs) errors.push(`${tag} 節點「${m.id}」超出本幕長度`);
          prev = m.t;
        }
        mm[m.id] = m.t;
      });
      const checkRef = (r, where) => {
        if (r == null || typeof r === 'number') return;
        if (r.m != null && !mids.has(r.m)) errors.push(`${tag} ${where} 參照了不存在的節點「${r.m}」`);
        if (r.o != null && !isNum(r.o)) errors.push(`${tag} ${where} 偏移不是數字`);
      };
      const checkTrack = (arr, where) => {
        if (!Array.isArray(arr)) { errors.push(`${tag} ${where} 必須是陣列`); return; }
        let last = -Infinity, unordered = false;
        arr.forEach((k, ki) => {
          checkRef(k, `${where}[${ki}]`);
          if (!isNum(k.v)) errors.push(`${tag} ${where}[${ki}] 數值不是數字`);
          if (k.e != null && !EASES.includes(k.e)) errors.push(`${tag} ${where}[${ki}] 緩動「${k.e}」不支援`);
          const t = refTime(k, mm, 0);
          if (t < last) unordered = true;
          last = t;
          if (t < 0 || t > s.durationMs) warnings.push(`${tag} ${where}[${ki}] 時間 ${Math.round(t)}ms 超出本幕範圍`);
        });
        if (unordered) warnings.push(`${tag} ${where} 的關鍵影格時間順序交錯（播放時會依時間排序）`);
      };
      Object.keys(s.tracks || {}).forEach(k => checkTrack(s.tracks[k], `效果軌道 ${k}`));
      Object.keys((s.camera && s.camera.tracks) || {}).forEach(k => checkTrack(s.camera.tracks[k], `鏡頭軌道 ${k}`));
      (s.layers || []).forEach((L, li) => {
        const lt = `圖層「${L.name || L.id || li}」`;
        if (!L.id) errors.push(`${tag} ${lt} 缺少 id`);
        if (L.type === 'swapPair') {
          ['assetA', 'assetB'].forEach(k => { if (!p.assets || !p.assets[L[k]]) errors.push(`${tag} ${lt} 的 ${k}「${L[k]}」不在 assets 中`); });
          checkRef(L.switchFrom, `${lt} 切換開始`); checkRef(L.switchTo, `${lt} 切換結束`);
          ['foregroundScale', 'foregroundX', 'foregroundY', 'foregroundAnchorX', 'foregroundAnchorY'].forEach(k => { if (!isNum(L[k])) errors.push(`${tag} ${lt} ${k} 必須是數字`); });
          if (!L.bAlign || !isNum(L.bAlign.scale) || !isNum(L.bAlign.x) || !isNum(L.bAlign.y)) errors.push(`${tag} ${lt} bAlign 必須包含 scale / x / y 數字`);
        } else if (L.type === 'image') {
          if (!p.assets || !p.assets[L.asset]) errors.push(`${tag} ${lt} 的素材「${L.asset}」不在 assets 中`);
          if (!LAYER_ROLES.includes(L.role)) errors.push(`${tag} ${lt} role「${L.role}」不支援（可用 ${LAYER_ROLES.join(' / ')}）`);
        } else errors.push(`${tag} ${lt} type「${L.type}」不支援（可用 image / swapPair）`);
        checkRef(L.start, `${lt} 開始`); checkRef(L.end, `${lt} 結束`);
        Object.keys(L.tracks || {}).forEach(k => {
          if (!LAYER_TRACKS.includes(k)) warnings.push(`${tag} ${lt} 軌道「${k}」不會被使用`);
          checkTrack(L.tracks[k], `${lt} 軌道 ${k}`);
        });
      });
      (s.dialogues || []).forEach((d, di) => {
        const dt = `對話「${d.id || di}」`;
        if (!d.id) errors.push(`${tag} ${dt} 缺少 id`);
        else if (dlgIds.has(d.id)) errors.push(`${tag} ${dt} id 重複（對話 id 必須全專案唯一）`);
        dlgIds.add(d.id);
        if (!['wait', 'auto'].includes(d.mode)) errors.push(`${tag} ${dt} mode 必須是 wait 或 auto`);
        checkRef(d.at, `${dt} 時間`);
        if (typeof d.text !== 'string') errors.push(`${tag} ${dt} text 必須是文字`);
        if (d.styleType != null && !DIALOG_STYLES.includes(d.styleType)) warnings.push(`${tag} ${dt} styleType「${d.styleType}」目前沒有對應樣式，會用預設對話框`);
      });
      const tr = s.transitionIn;
      if (tr && !TRANSITIONS.includes(tr.type)) errors.push(`${tag} 轉場「${tr.type}」不支援`);
    });
    return { errors, warnings };
  }

  global.MotionComic = {
    VERSION, SCHEMA_VERSION, EASE, EASE_LABELS, EASES, TRANSITIONS, DIALOG_STYLES, LAYER_ROLES, TRACK_DEFAULTS, CAMERA_DEFAULTS, LAYER_TRACKS,
    sample, compileTrack, compileScene, buildTimeline, markerTimes, refTime, validateProject,
    Player: MotionComicPlayer, DialogueBox,
  };
})(window);

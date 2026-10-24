/*
  氣球小V・動態漫畫 音訊引擎  motion-comic-audio v0.3.2.1-test-1（motion-comic-v0.3.2.1-audio-loading-fix-test-1）

  v0.3.2.1 修正（音訊一直 404）：
  - 根因：fetch 使用 cache:'force-cache'，瀏覽器會無限期沿用「檔案上傳前」快取到的 404（GitHub Pages 的 404 也帶 max-age=600），
    之後檔案上傳了、重新整理，都不會再向伺服器請求 → 永遠 404。改為 no-cache（每次向伺服器確認），「重新載入」用 reload。
  - 失敗狀態不再被永久沿用：可「重新載入」；路徑一改就丟掉舊狀態；本機預覽檔在路徑改成正式檔案後自動停用並釋放。
  - 錯誤分類：404／HTTP 錯誤／網路／CORS／無法解碼／逾時；記錄實際請求網址與 HTTP 狀態碼。
  - 路徑解析統一：MC.resolveAudioUrl（完整 https:// 網址不會再加上 baseUrl；相對路徑以 motion-comic/ 為準）。

  設計重點
  - 資料驅動：所有聲音都寫在專案 JSON 的 project.audio（可省略；沒有 audio 時完全不做任何事）。
  - 四種音軌：bgm（背景音樂）、ambient（環境音）、sfx（事件音效）、voice（人物配音，綁定 dialogue id）。
  - 以「整段動態漫畫的全域時間軸」定位；可用 {scene, m, o}（某幕的節點＋偏移）、{dialogue, o}（某句對話）、{t}（整段毫秒）。
  - 兩種時鐘：
      故事時鐘（player.t）：劇情、鏡頭、節點；RPG 對話等待時停住。決定「何時開始／結束」、事件音效的觸發。
      音訊時鐘（AudioContext.currentTime）：BGM／環境音／正在播的配音一旦開始就自己往前走；對話等待時不停。
  - 播放器狀態規則：
      正在播放（含對話等待中）→ 聲音照常；
      真正暫停、分頁被切到背景、手機直向擋住畫面 → 所有聲音（BGM／環境音／音效／配音）一起暫停，恢復時從原位置繼續；
      拖曳時間軸／跳轉 → 不補播之前的音效；BGM／環境音移到新位置；
      重新播放 → 停掉所有聲音、清掉觸發紀錄，從頭來。
  - 事件音效只在「故事時間正常往前經過觸發點」時播放一次（不是用「現在時間 > 觸發時間」判斷），
    所以對話等待、暫停後繼續、拖曳、跳過幕次都不會重複觸發或一次補播一堆。
  - 後端：優先 Web Audio（fetch＋decodeAudioData，音量用 GainNode，iPhone 也能調音量；多音軌同時播放）；
    讀不到（例如 file:// 直接開啟）時改用 HTMLAudioElement。音檔各自載入、互不影響，不會擋住圖片顯示。
*/
(function (global) {
  'use strict';
  const MC = global.MotionComic || (global.MotionComic = {});
  const VERSION = 'motion-comic-audio v0.3.2.1-test-1';
  const TYPES = ['bgm', 'ambient', 'sfx', 'voice'];
  const TYPE_LABELS = { bgm: '背景音樂 BGM', ambient: '環境音', sfx: '事件音效', voice: '人物配音' };
  const MIX_DEFAULTS = { master: 1, bgm: 0.7, ambient: 0.6, sfx: 0.9, voice: 1 };
  const clamp01 = v => Math.max(0, Math.min(1, +v || 0));
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);

  function emptyAudio() {
    return { version: 1, mix: Object.assign({}, MIX_DEFAULTS), assets: {}, clips: [] };
  }
  // 連續型（依時間區間播放，可跨幕、可循環）：bgm、ambient，或任何勾選循環的音效
  const isContinuous = c => c.type === 'bgm' || c.type === 'ambient' || (c.type === 'sfx' && !!c.loop && c.trigger !== 'typing');

  /* ===================== 時間定位 ===================== */
  function sceneIndexById(tl, id) { return tl.segs.findIndex(s => s.scene && s.scene.id === id); }
  function dialogueTimes(project, tl) {
    const out = {};
    tl.segs.forEach(sg => {
      const mm = MC.markerTimes(sg.scene);
      (sg.scene.dialogues || []).forEach(d => {
        out[d.id] = { g: sg.start + Math.min(MC.refTime(d.at, mm, 0), sg.scene.durationMs), si: sg.index, enabled: d.enabled !== false, d };
      });
    });
    return out;
  }
  // ref → 全域毫秒；無法解析時回傳 null
  function resolveRef(ref, tl, dlg) {
    if (ref == null) return null;
    if (typeof ref === 'number') return ref;
    const o = +ref.o || 0;
    if (ref.t != null && isFinite(+ref.t)) return +ref.t;
    if (ref.dialogue != null) { const x = dlg[ref.dialogue]; return x ? x.g + o : null; }
    if (ref.scene != null) {
      const si = sceneIndexById(tl, ref.scene);
      if (si < 0) return null;
      const sg = tl.segs[si];
      if (ref.m === 'transStart') return sg.transStart + o;
      const mm = MC.markerTimes(sg.scene);
      const m = ref.m == null ? 'start' : ref.m;
      if (mm[m] == null) return null;
      return sg.start + mm[m] + o;
    }
    return null;
  }
  // 全域毫秒 → {scene, m, o}（找所在的幕與最接近且不晚於它的節點）
  function refFromGlobal(T, tl) {
    let sg = tl.segs.find(s => T >= s.transStart && T < s.end) || tl.segs[tl.segs.length - 1];
    if (!sg) return { t: Math.round(T) };
    const local = T - sg.start;
    const mm = MC.markerTimes(sg.scene);
    let best = 'start';
    if (local >= sg.scene.durationMs) best = 'end';
    else (sg.scene.markers || []).forEach(m => { if (m.t <= local && m.t >= mm[best]) best = m.id; });
    return { scene: sg.scene.id, m: best, o: Math.round(local - mm[best]) };
  }

  // 把 project.audio.clips 換算成實際播放用的資料
  function compileClips(project, tl) {
    const A = project && project.audio;
    if (!A || !Array.isArray(A.clips) || !tl) return [];
    const dlg = dialogueTimes(project, tl);
    const out = [];
    A.clips.forEach(c => {
      if (!c || !c.id || !TYPES.includes(c.type)) return;
      const r = { id: c.id, clip: c, type: c.type, asset: c.asset || null, enabled: c.enabled !== false,
        volume: clamp01(c.volume == null ? 1 : c.volume), loop: !!c.loop, fadeIn: Math.max(0, num(c.fadeInMs, 0)), fadeOut: Math.max(0, num(c.fadeOutMs, 0)),
        offset: Math.max(0, num(c.offsetMs, 0)), continuous: isContinuous(c), T0: null, T1: Infinity, dialogue: null, typing: false, problem: '' };
      if (c.type === 'voice') {
        const x = c.dialogue && dlg[c.dialogue];
        if (!x) { r.problem = c.dialogue ? `對話「${c.dialogue}」不存在` : '尚未指定對話'; }
        else { r.dialogue = c.dialogue; r.T0 = x.g; if (!x.enabled) r.problem = '對應的對話已停用'; }
        r.loop = false; r.continuous = false;
      } else if (c.type === 'sfx' && c.trigger === 'typing') {
        const x = c.dialogue && dlg[c.dialogue];
        if (!x) r.problem = c.dialogue ? `對話「${c.dialogue}」不存在` : '尚未指定對話';
        else { r.dialogue = c.dialogue; r.T0 = x.g; }
        r.typing = true; r.every = Math.max(1, Math.round(num(c.every, 2))); r.continuous = false; r.loop = false;
      } else {
        r.T0 = resolveRef(c.at, tl, dlg);
        if (r.T0 == null) r.problem = '開始時間的節點／對話找不到';
        const e = resolveRef(c.end, tl, dlg);
        if (e != null) r.T1 = e;
        else if (c.durMs != null && isFinite(+c.durMs) && r.T0 != null) r.T1 = r.T0 + Math.max(0, +c.durMs);
        else if (r.continuous && r.loop) r.T1 = tl.total;   // 循環＋沒有結束＝播到整段結束
        if (r.T0 != null && r.T1 <= r.T0) r.problem = '結束時間早於開始時間';
      }
      if (!r.asset) r.problem = r.problem || '尚未指定音檔';
      else if (!A.assets || !A.assets[r.asset]) r.problem = r.problem || `音訊素材「${r.asset}」不存在`;
      out.push(r);
    });
    // BGM 交叉淡化：新的一首設定 crossfadeMs 時，正在播的其他 BGM 在 [T0, T0+xf] 淡出結束
    out.filter(r => r.type === 'bgm' && r.T0 != null && +r.clip.crossfadeMs > 0).forEach(r => {
      const xf = +r.clip.crossfadeMs;
      r.fadeIn = Math.max(r.fadeIn, xf);
      out.forEach(o => {
        if (o === r || o.type !== 'bgm' || o.T0 == null || !(o.T0 < r.T0 && o.T1 > r.T0)) return;
        o.T1 = Math.min(o.T1, r.T0 + xf); o.fadeOut = xf; o.xfBy = r.id;
      });
    });
    return out;
  }

  /* ===================== 驗證（只產生警告，不會讓動態漫畫無法播放） ===================== */
  function validateAudio(p) {
    const warnings = [];
    const A = p && p.audio;
    if (A == null) return { errors: [], warnings };
    if (typeof A !== 'object') return { errors: [], warnings: ['audio 必須是物件（音訊設定已忽略）'] };
    if (A.assets != null && typeof A.assets !== 'object') warnings.push('audio.assets 必須是物件');
    if (A.clips != null && !Array.isArray(A.clips)) { warnings.push('audio.clips 必須是陣列'); return { errors: [], warnings }; }
    const tl = MC.buildTimeline ? MC.buildTimeline(p) : null;
    const ids = new Set();
    const dlgIds = new Set(); (p.scenes || []).forEach(s => (s.dialogues || []).forEach(d => dlgIds.add(d.id)));
    (A.clips || []).forEach((c, i) => {
      const tag = `音訊「${(c && (c.name || c.id)) || i}」`;
      if (!c || typeof c !== 'object') { warnings.push(`${tag} 格式錯誤`); return; }
      if (!c.id) warnings.push(`${tag} 缺少 id`); else if (ids.has(c.id)) warnings.push(`${tag} id 重複`); ids.add(c.id);
      if (!TYPES.includes(c.type)) warnings.push(`${tag} 類型「${c.type}」不支援（可用 ${TYPES.join(' / ')}）`);
      if (c.volume != null && (typeof c.volume !== 'number' || c.volume < 0 || c.volume > 1)) warnings.push(`${tag} 音量應在 0～1`);
      if (c.asset && !(A.assets && A.assets[c.asset])) warnings.push(`${tag} 使用的音訊素材「${c.asset}」不在 audio.assets 中`);
      if ((c.type === 'voice' || c.trigger === 'typing') && c.dialogue && !dlgIds.has(c.dialogue)) warnings.push(`${tag} 綁定的對話「${c.dialogue}」不存在`);
    });
    if (tl) compileClips(p, tl).forEach(r => { if (r.problem && !/尚未指定音檔/.test(r.problem) && !/不在|不存在/.test(r.problem)) warnings.push(`音訊「${r.clip.name || r.id}」：${r.problem}`); });
    return { errors: [], warnings };
  }

  /* ===================== 播放實例 ===================== */
  // Web Audio：AudioBufferSourceNode 一次只能 start 一次，暫停＝記住位置後停掉，繼續＝用新的 source 從原位置開始
  class BufInst {
    constructor(eng, buffer, bus, o) {
      this.eng = eng; this.ctx = eng.ctx; this.buffer = buffer; this.loop = !!o.loop;
      this.dur = buffer.duration;
      this.g = this.ctx.createGain(); this.g.gain.value = 0; this.g.connect(bus);
      this.paused = false; this.ended = false; this.stopped = false; this.played = 0;   // played＝實際播放過的秒數（不含暫停）
      this._play(o.offset || 0);
    }
    _play(off) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.buffer; src.loop = this.loop;
      src.connect(this.g);
      src.onended = () => { if (this.src === src && !this.paused && !this.stopped) { this.ended = true; this._cleanup(); } };
      const o = this.loop ? (off % this.dur) : Math.min(off, this.dur);
      try { src.start(0, o); } catch (_) { this.ended = true; }
      this.src = src; this.startOff = o; this.startedAt = this.ctx.currentTime;
    }
    get pos() { if (this.paused) return this.pausedAt; const p = this.startOff + (this.ctx.currentTime - this.startedAt); return this.loop ? p % this.dur : Math.min(p, this.dur); }
    get elapsed() { return this.played + (this.paused || this.ended ? 0 : this.ctx.currentTime - this.startedAt); }
    pause() {
      if (this.paused || this.ended || this.stopped) return;
      this.pausedAt = this.pos; this.played += this.ctx.currentTime - this.startedAt;
      this.paused = true; const s = this.src; s.onended = null; try { s.stop(); } catch (_) {}
    }
    resume() { if (!this.paused || this.stopped) return; this.paused = false; this._play(this.pausedAt); }
    setGain(v, immediate) {
      const p = this.g.gain; const now = this.ctx.currentTime;
      if (immediate) { p.cancelScheduledValues(now); p.setValueAtTime(v, now); } else p.setTargetAtTime(v, now, 0.025);
      this.gain = v;
    }
    stop(fadeMs) {
      if (this.stopped) return;
      this.stopped = true;
      const now = this.ctx.currentTime, f = Math.max(0.005, (fadeMs || 0) / 1000);
      try { this.g.gain.cancelScheduledValues(now); this.g.gain.setValueAtTime(this.g.gain.value, now); this.g.gain.linearRampToValueAtTime(0, now + f); } catch (_) {}
      const s = this.src;
      if (s && !this.paused && !this.ended) { s.onended = null; try { s.stop(now + f + 0.01); } catch (_) {} }
      setTimeout(() => this._cleanup(), f * 1000 + 60);
    }
    _cleanup() { try { this.src && this.src.disconnect(); } catch (_) {} try { this.g.disconnect(); } catch (_) {} }
  }
  // HTMLAudioElement 備援（例如 file://）：音量用 element.volume（iPhone 上無法調整音量，只能開關）
  class MediaInst {
    constructor(eng, src, o) {
      this.eng = eng; const a = new Audio(); a.preload = 'auto'; a.src = src; a.loop = !!o.loop; a.volume = 0;
      this.a = a; this.loop = !!o.loop; this.paused = false; this.ended = false; this.stopped = false; this.played = 0; this._t = performance.now();
      a.addEventListener('ended', () => { if (!this.loop) this.ended = true; });
      const go = () => { try { a.currentTime = (o.offset || 0); } catch (_) {} const pr = a.play(); if (pr && pr.catch) pr.catch(() => {}); };
      if (a.readyState >= 1) go(); else a.addEventListener('loadedmetadata', go, { once: true });
    }
    get dur() { return this.a.duration || 0; }
    get pos() { return this.a.currentTime || 0; }
    get elapsed() { return (this.played + (this.paused || this.ended ? 0 : performance.now() - this._t)) / 1000; }
    pause() { if (this.paused || this.ended || this.stopped) return; this.played += performance.now() - this._t; this.paused = true; this.a.pause(); }
    resume() { if (!this.paused || this.stopped) return; this.paused = false; this._t = performance.now(); const pr = this.a.play(); if (pr && pr.catch) pr.catch(() => {}); }
    setGain(v) { this.gain = v; try { this.a.volume = clamp01(v); } catch (_) {} }
    stop() { if (this.stopped) return; this.stopped = true; try { this.a.pause(); this.a.removeAttribute('src'); this.a.load(); } catch (_) {} }
  }

  /* ===================== 路徑解析（v0.3.2.1；播放器與編輯器共用） =====================
     規則：
       blob: / data:                → 原樣（本機預覽、嵌入）
       http(s)://…                  → 原樣（不會再加上 baseUrl）
       /開頭（網站根目錄）          → 以目前網站為準
       其他（例如 assets/x.mp3）     → 相對於「動態漫畫專案根目錄」motion-comic/
     專案根目錄＝播放器的 baseUrl（編輯器、播放頁都是 '../'）相對於目前網頁解析，
     例如 https://vashyang1120.github.io/balloon-v-rush/motion-comic/editor/index.html → …/balloon-v-rush/motion-comic/  */
  function audioProjectRoot(baseUrl) {
    try { return new URL(baseUrl || './', global.location ? location.href : 'http://localhost/').href; } catch (_) { return baseUrl || ''; }
  }
  function resolveAudioUrl(src, rootHref) {
    src = String(src == null ? '' : src).trim();
    if (!src) return '';
    if (/^(blob:|data:)/i.test(src)) return src;
    if (/^https?:\/\//i.test(src)) return src;
    try { return new URL(src.replace(/^\.\//, ''), rootHref).href; } catch (_) { return src; }
  }
  // 建議的正式寫法：同一個網站、在專案根目錄裡的完整網址 → 相對路徑（例如 assets/x.mp3），專案搬家也能用；其他網站的網址保持原樣
  //   也會修正常見的多打字：motion-comic/assets/x.mp3、/balloon-v-rush/motion-comic/assets/x.mp3、./assets/x.mp3
  function canonicalAudioSrc(src, rootHref) {
    src = String(src == null ? '' : src).trim().replace(/\\/g, '/');
    if (!src || /^(blob:|data:)/i.test(src)) return src;
    const m = src.match(/^(?:\.\/)?(?:[^:]*\/)?motion-comic\/(assets\/.+)$/i);
    if (m && !/^https?:/i.test(src)) return m[1];
    try {
      const abs = new URL(src.replace(/^\.\//, ''), rootHref);
      const root = new URL(rootHref);
      if (abs.origin === root.origin && abs.pathname.startsWith(root.pathname)) return decodeURI(abs.pathname.slice(root.pathname.length)) + abs.search;
      return src.replace(/^\.\//, '');
    } catch (_) { return src; }
  }
  // 兩個素材是不是「同一個檔案」（解析後網址相同）
  const audioAssetKey = (src, rootHref) => { const u = resolveAudioUrl(canonicalAudioSrc(src, rootHref), rootHref); try { const x = new URL(u); return x.origin + decodeURI(x.pathname) + x.search; } catch (_) { return u; } };
  const ERROR_KIND_LABELS = { notfound: '找不到（404）', http: '伺服器錯誤', network: '網路失敗', cors: '跨網站限制（CORS）', decode: '無法解碼', timeout: '逾時', nosrc: '沒有路徑', unknown: '讀取失敗', 'cors-media': '相容模式' };

  /* ===================== 引擎 ===================== */
  class AudioEngine {
    constructor(opts = {}) {
      this.baseUrl = opts.baseUrl || '';
      this.ctx = null; this.bus = {}; this.master = null; this.analyser = null;
      this.assets = {};            // id → { src, status:'idle'|'loading'|'ok'|'error', buffer, media, duration, error, local }
      this.localFiles = {};        // id → { url, name }：本機預覽用的音檔（不會寫進 JSON，也不會上傳）
      this.clips = []; this.byId = {};
      this.inst = new Map();       // key → { r, i, startT, startPos }
      this.prevT = null; this.active = false; this.oneShotN = 0;
      this.userVolume = 1; this.muted = false; this.scrubMute = false; this.scrubbing = false;
      this.lastDlg = null;         // 打字音：{ id, n }
      this.log = [];               // 測試／除錯用事件紀錄
      this.onStatus = opts.onStatus || null;
      this.previewInst = null;
      this._key = '';
      this._reloadIds = new Set();
    }

    /* ---------- 掛到播放器 ---------- */
    attach(player) {
      this.player = player; player.audio = this;
      if (player.project) this.setProject(player.project);
      // 分頁切到背景時 requestAnimationFrame 會停，tick 不會被呼叫 → 在這裡直接暫停所有聲音
      if (global.document && !this._vis) {
        this._vis = () => { if (document.hidden && this.active) { this._pauseAll(); this.active = false; } };
        document.addEventListener('visibilitychange', this._vis);
        global.addEventListener('pagehide', this._vis);
      }
      return this;
    }

    hasAudio() { return this.clips.some(r => r.enabled && r.asset); }
    status() {
      if (!this.hasAudio()) return 'none';
      if (!global.AudioContext && !global.webkitAudioContext) return 'media';
      if (!this.ctx) return 'locked';
      return this.ctx.state === 'running' ? 'running' : 'locked';
    }
    _emitStatus() { if (this.onStatus) this.onStatus(this.status()); }

    ensureContext() {
      if (this.ctx) return this.ctx;
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      try { this.ctx = new AC({ latencyHint: 'interactive' }); } catch (_) { try { this.ctx = new AC(); } catch (e) { return null; } }
      const ctx = this.ctx;
      this.master = ctx.createGain();
      // 輕微限幅：多條音軌同時很大聲時避免爆音（一般音量不會作用）
      const lim = ctx.createDynamicsCompressor();
      try { lim.threshold.value = -3; lim.knee.value = 6; lim.ratio.value = 8; lim.attack.value = 0.003; lim.release.value = 0.25; } catch (_) {}
      this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 2048;
      this.master.connect(lim); lim.connect(this.analyser); this.analyser.connect(ctx.destination);
      TYPES.forEach(t => { const g = ctx.createGain(); g.connect(this.master); this.bus[t] = g; });
      this._applyMix(true);
      if (ctx.addEventListener) ctx.addEventListener('statechange', () => this._emitStatus());
      return ctx;
    }
    // 必須在使用者點擊（「開始故事」、播放鍵）裡呼叫：手機瀏覽器只允許在手勢中開啟聲音
    unlock() {
      const ctx = this.ensureContext();
      try { if (global.navigator && navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (_) {}   // iPhone：靜音開關打開時仍可播放（Safari 16.4+）
      if (!ctx) { this._emitStatus(); return Promise.resolve('media'); }
      try { const b = ctx.createBuffer(1, 1, 22050); const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch (_) {}
      const p = ctx.state === 'running' ? Promise.resolve() : ctx.resume();
      return Promise.resolve(p).catch(() => {}).then(() => { this._emitStatus(); if (this._pendingLoad) this.loadAssets(); return this.status(); });
    }

    /* ---------- 專案 ---------- */
    setProject(project) {
      this.project = project;
      const tl = this.player ? this.player.tl : (MC.buildTimeline ? MC.buildTimeline(project) : null);
      this.clips = compileClips(project, tl);
      this.byId = {}; this.clips.forEach(r => { this.byId[r.id] = r; });
      this._applyMix();
      // 停掉已刪除／內容改變的音訊（內容沒變的 BGM 會繼續播，不從頭開始）
      this.inst.forEach((x, k) => {
        const r = this.byId[x.r.id];
        if (!r || !r.enabled || this._sig(r) !== x.sig) this._stopKey(k, 120, 'changed');
        else x.r = r;
      });
      const A = project && project.audio;
      const key = JSON.stringify(A && A.assets || {});
      if (key !== this._key) { this._key = key; this.loadAssets(); }
      this._emitStatus();
    }
    _sig(r) { const a = (this.project.audio.assets || {})[r.asset] || {}; const lf = this._localFor(r.asset); return JSON.stringify([r.clip, a.src, lf && lf.url]); }
    _applyMix(immediate) {
      if (!this.ctx) return;
      const m = Object.assign({}, MIX_DEFAULTS, (this.project && this.project.audio && this.project.audio.mix) || {});
      const now = this.ctx.currentTime;
      const set = (p, v) => { if (immediate) p.setValueAtTime(v, now); else p.setTargetAtTime(v, now, 0.03); };
      TYPES.forEach(t => this.bus[t] && set(this.bus[t].gain, clamp01(m[t])));
      const mute = this.muted || (this.scrubbing && this.scrubMute);
      set(this.master.gain, mute ? 0 : clamp01(m.master) * clamp01(this.userVolume));
    }
    setUserVolume(v) { this.userVolume = clamp01(v); this._applyMix(); this._mediaGains(); }
    setMuted(m) { this.muted = !!m; this._applyMix(); this._mediaGains(); }
    setScrubbing(on) { this.scrubbing = !!on; this._applyMix(); this._mediaGains(); }
    _mixFor(type) {
      const m = Object.assign({}, MIX_DEFAULTS, (this.project && this.project.audio && this.project.audio.mix) || {});
      const mute = this.muted || (this.scrubbing && this.scrubMute);
      return mute ? 0 : clamp01(m[type]) * clamp01(m.master) * clamp01(this.userVolume);
    }
    _mediaGains() { this.inst.forEach(x => { if (x.i instanceof MediaInst) x.i.setGain(x.lastGain != null ? x.lastGain * this._mixFor(x.r.type) : 0); }); }

    /* ---------- 素材 ---------- */
    // 素材路徑 → 實際請求網址（播放器與編輯器共用同一條規則，見 MC.resolveAudioUrl）
    projectRoot() { return audioProjectRoot(this.player ? this.player.baseUrl : this.baseUrl); }
    resolveSrc(id) {
      const lf = this._localFor(id);
      if (lf) return lf.url;
      const a = (this.project && this.project.audio && this.project.audio.assets || {})[id];
      if (!a || !a.src) return '';
      return resolveAudioUrl(a.src, this.projectRoot());
    }
    // 本機預覽檔只在「選檔當時的路徑」有效；之後把路徑改成正式檔案，就自動停止本機預覽並釋放 blob
    _localFor(id) {
      const lf = this.localFiles[id];
      if (!lf) return null;
      const a = (this.project && this.project.audio && this.project.audio.assets || {})[id];
      if (a && lf.forSrc != null && a.src !== lf.forSrc) { URL.revokeObjectURL(lf.url); delete this.localFiles[id]; return null; }
      return lf;
    }
    setLocalFile(id, file, forSrc) {   // 本機預覽：只在這個瀏覽器分頁有效
      const old = this.localFiles[id];
      if (old) URL.revokeObjectURL(old.url);
      if (file) this.localFiles[id] = { url: URL.createObjectURL(file), name: file.name, size: file.size, forSrc: forSrc != null ? forSrc : null };
      else delete this.localFiles[id];
      this._forget(id);
      return this.loadAssets();
    }
    _forget(id) {   // 清掉某素材的載入狀態與正在播的聲音（換路徑、重新載入時）
      const s = this.assets[id]; if (s) s.dead = true;
      delete this.assets[id];
      this.inst.forEach((x, k) => { if (x.r.asset === id) this._stopKey(k, 60, 'reload'); });
    }
    // 重新載入（不使用瀏覽器快取的舊結果）。ids 省略＝全部；只重試失敗的：{ onlyFailed: true }
    reloadAssets(ids, opts = {}) {
      const A = (this.project && this.project.audio && this.project.audio.assets) || {};
      (ids || Object.keys(A)).forEach(id => { if (!A[id]) return; const st = this.assets[id]; if (opts.onlyFailed && st && st.status !== 'error') return; this._forget(id); this._reloadIds.add(id); });
      return this.loadAssets();
    }
    loadAssets() {
      const A = (this.project && this.project.audio && this.project.audio.assets) || {};
      Object.keys(this.assets).forEach(id => { if (!A[id]) this._forget(id); });   // 移除的素材：釋放記憶體
      const jobs = Object.keys(A).map(id => {
        const src = this.resolveSrc(id);
        const st = this.assets[id];
        if (st && st.src === src && (st.status === 'ok' || st.status === 'loading' || st.status === 'error')) return st.promise || Promise.resolve();
        if (st) this._forget(id);   // 路徑變了：舊狀態（含失敗）全部丟掉
        const reload = this._reloadIds.delete(id);
        const s = this.assets[id] = { src, raw: A[id].src || '', status: 'loading', buffer: null, media: false, duration: 0, error: '', kind: '', httpStatus: 0, at: Date.now(), local: !!this.localFiles[id] };
        if (!src) { s.status = 'error'; s.kind = 'nosrc'; s.error = '沒有設定音檔路徑'; return Promise.resolve(); }
        s.promise = this._load(id, s, reload).then(() => { s.promise = null; if (s.dead) return; this._emitStatus(); if (this.onAssets) this.onAssets(); });
        return s.promise;
      });
      return Promise.all(jobs).then(() => this.assetReport());
    }
    async _load(id, s, reload) {
      const ctx = this.ensureContext();
      const fail = (kind, msg, status) => { if (s.dead) return; s.status = 'error'; s.kind = kind; s.error = msg; if (status) s.httpStatus = status; };
      const isFile = global.location && location.protocol === 'file:';
      let fetchErr = null;
      if (ctx && (/^(blob:|data:)/.test(s.src) || !isFile)) {
        let r;
        try {
          // v0.3.2.1：不再用 cache:'force-cache'（會無限期沿用「上傳前」被快取的 404）。
          // no-cache＝每次都向伺服器確認（檔案沒變時只回 304，不會重新下載）；按「重新載入」時用 reload＝完全不用快取
          r = await fetch(s.src, { cache: /^(blob:|data:)/.test(s.src) ? 'default' : (reload ? 'reload' : 'no-cache') });
        } catch (e) { fetchErr = e; }
        if (s.dead) return;
        if (r) {
          s.httpStatus = r.status;
          if (!r.ok) {
            if (r.status === 404) return fail('notfound', `找不到檔案（HTTP 404）。伺服器上沒有這個網址的檔案；請核對路徑與大小寫，或確認 GitHub 已完成部署（上傳後約需 1～2 分鐘）`, 404);
            return fail('http', `伺服器回應錯誤（HTTP ${r.status}${r.statusText ? ' ' + r.statusText : ''}）`, r.status);
          }
          let buf;
          try { buf = await r.arrayBuffer(); } catch (e) { return fail('network', '下載途中中斷（網路錯誤）'); }
          if (s.dead) return;
          try {
            s.buffer = await new Promise((res, rej) => { const p = ctx.decodeAudioData(buf, res, rej); if (p && p.then) p.then(res, rej); });
            s.duration = s.buffer.duration; s.status = 'ok'; s.kind = ''; s.backend = 'webaudio'; return;
          } catch (e) {
            const ct = (r.headers && r.headers.get && r.headers.get('content-type')) || '';
            return fail('decode', /text\/html/.test(ct) ? '取得的是網頁而不是音檔（路徑可能指到錯誤頁面）' : '無法解碼：格式不支援或檔案損毀（建議用 MP3 或 M4A／AAC）');
          }
        }
        // fetch 本身失敗：跨網域時先判斷是 CORS 還是網路
        if (/^https?:/i.test(s.src) && global.location && new URL(s.src).origin !== location.origin) {
          let reachable = false;
          try { await fetch(s.src, { mode: 'no-cors', cache: 'no-store' }); reachable = true; } catch (_) {}
          if (s.dead) return;
          s.corsBlocked = reachable;
        }
      }
      // 備援：HTMLAudioElement（file:// 開啟、或其他網站不允許 fetch（CORS）時仍可播放，但 iPhone 上無法調音量）
      await new Promise(res => {
        const a = new Audio(); a.preload = 'metadata';
        const done = (ok, kind, msg) => { a.onloadedmetadata = a.onerror = null; clearTimeout(tm); if (s.dead) return res();
          if (ok) { s.status = 'ok'; s.media = true; s.backend = 'media'; s.duration = a.duration || 0; s.kind = s.corsBlocked ? 'cors-media' : ''; } else fail(kind, msg); res(); };
        const tm = setTimeout(() => done(false, 'timeout', '載入逾時（15 秒）：網路太慢或連不到伺服器'), 15000);
        a.onloadedmetadata = () => done(true);
        a.onerror = () => {
          const c = a.error && a.error.code;
          if (s.corsBlocked) return done(false, 'cors', '伺服器有回應，但不允許跨網站讀取（CORS）；建議把音檔放到 motion-comic/assets/ 用相對路徑');
          if (fetchErr && !isFile) return done(false, 'network', '網路錯誤：連不到伺服器（請檢查網路或網址）');
          done(false, c === 4 ? 'notfound' : c === 2 ? 'network' : c === 3 ? 'decode' : 'unknown',
            c === 4 ? (isFile ? '讀不到檔案（直接開啟本機網頁時，請確認檔案在 motion-comic/assets/）' : '找不到檔案或格式不支援') : c === 2 ? '網路錯誤' : c === 3 ? '無法解碼' : '讀取失敗');
        };
        a.src = s.src;
      });
    }
    assetReport() {
      const A = (this.project && this.project.audio && this.project.audio.assets) || {};
      return Object.keys(A).map(id => { const s = this.assets[id] || {}; const lf = this._localFor(id); return { id, label: A[id].label || id, src: A[id].src, url: lf ? lf.url : resolveAudioUrl(A[id].src, this.projectRoot()), local: lf ? lf.name : '',
        status: s.status || 'idle', ok: s.status === 'ok', error: s.error || '', kind: s.kind || '', httpStatus: s.httpStatus || 0, at: s.at || 0, duration: s.duration || 0, backend: s.media ? 'media' : (s.buffer ? 'webaudio' : '') }; });
    }

    /* ---------- 實例 ---------- */
    _canPlay() { return this.ctx ? this.ctx.state === 'running' : true; }
    _start(r, key, offsetSec, meta) {
      const s = this.assets[r.asset];
      if (!s || s.status !== 'ok') return null;
      if (!this._canPlay()) return null;
      let i;
      if (s.buffer) {
        if (!r.loop && offsetSec >= s.buffer.duration) return null;
        i = new BufInst(this, s.buffer, this.bus[r.type], { loop: r.loop, offset: offsetSec });
      } else if (s.media) {
        i = new MediaInst(this, s.src, { loop: r.loop, offset: offsetSec });
      } else return null;
      const x = Object.assign({ r, i, sig: this._sig(r), key }, meta || {});
      this.inst.set(key, x);
      this.log.push({ ev: 'start', id: r.id, type: r.type, T: this.player ? this.player.t : 0, off: +offsetSec.toFixed(3), at: performance.now() });
      return x;
    }
    _stopKey(key, fadeMs, why) {
      const x = this.inst.get(key);
      if (!x) return;
      x.i.stop(fadeMs);
      this.inst.delete(key);
      this.log.push({ ev: 'stop', id: x.r.id, type: x.r.type, why: why || '', T: this.player ? this.player.t : 0, at: performance.now() });
    }
    stopAll(fadeMs, filter) { Array.from(this.inst.keys()).forEach(k => { const x = this.inst.get(k); if (!filter || filter(x)) this._stopKey(k, fadeMs, 'stopAll'); }); }
    _pauseAll() { this.inst.forEach(x => x.i.pause()); this.log.push({ ev: 'pauseAll', T: this.player.t, at: performance.now() }); }
    _resumeAll() { this.inst.forEach(x => x.i.resume()); this.log.push({ ev: 'resumeAll', T: this.player.t, at: performance.now() }); }

    /* ---------- 播放器事件 ---------- */
    // kind：seek（拖曳／輸入時間）、skip（略過幕次）、replay（重新播放）、mode、range
    onJump(kind) {
      const T = this.player ? this.player.t : 0;
      this.prevT = T - 0.5;   // 剛好落在目標時間的音效，開始播放時會觸發；目標之前的不補播
      this.lastDlg = null;
      this._stopPreview();
      if (kind === 'replay') { this.stopAll(80); return; }
      this.stopAll(60, x => !x.r.continuous);                 // 音效、配音：停止
      if (kind !== 'skip') this.stopAll(60, x => x.r.continuous);   // BGM／環境音：移到新位置（下一格依新時間重新開始）
    }
    // 每一格由播放器呼叫（播放、對話等待、暫停時都會呼叫）
    tick() {
      const P = this.player;
      if (!P || !P.tl || !this.clips.length) { this.prevT = P ? P.t : null; return; }
      const T = P.t;
      const running = P.playing && !(global.document && document.hidden) && !(P.portraitBlocked && P.portraitBlocked()) && this._canPlay();
      if (!running) {
        if (this.active) { this._pauseAll(); this.active = false; }
        if (this.prevT == null) this.prevT = T - 0.5;
        else if (P.playing && T > this.prevT) this.prevT = T;   // 聲音被瀏覽器擋住時畫面照走：之後不補播這段音效
        return;
      }
      if (!this.active) { this._resumeAll(); this.active = true; }
      const prev = this.prevT == null ? T - 0.5 : this.prevT;
      const included = g => { const loc = P.locate(g); return !loc || !P._included || P._included(loc.seg.index); };

      // 1) 事件型：故事時間「正常往前經過」觸發點時播放一次
      if (T > prev) this.clips.forEach(r => {
        if (!r.enabled || r.continuous || r.typing || r.T0 == null || r.problem) return;
        if (!(r.T0 > prev && r.T0 <= T) || !included(r.T0)) return;
        if (r.type === 'voice') this.stopAll(80, x => x.r.type === 'voice');   // 下一句開始：上一句配音不殘留
        const key = r.type === 'voice' ? 'voice:' + r.id : r.id + '#' + (++this.oneShotN);
        const x = this._start(r, key, r.offset / 1000, { startT: T, startPos: 0 });
        this.log.push({ ev: 'trigger', id: r.id, type: r.type, T, T0: r.T0, ok: !!x, at: performance.now() });
      });

      // 2) 連續型：依故事時間決定「該不該在播」；開始後用音訊時鐘自己往前（對話等待時不停）
      this.clips.forEach(r => {
        if (!r.continuous) return;
        const want = r.enabled && !r.problem && r.T0 != null && T >= r.T0 && T < r.T1 && included(Math.max(r.T0, Math.min(T, r.T1 - 1)));
        const x = this.inst.get(r.id);
        if (want && !x) {
          const s = this.assets[r.asset];
          if (s && s.status === 'ok') {
            const into = (T - r.T0) / 1000 + r.offset / 1000;
            this._start(r, r.id, into, { startT: T, startPos: T - r.T0 });
          }
        } else if (!want && x) this._stopKey(r.id, T >= r.T1 ? 40 : 120, T >= r.T1 ? 'end' : 'outOfRange');
      });

      // 3) 打字音：只在對話文字真的多出一個字時播放
      const dv = P._dlgView;
      if (dv && dv.id) {
        const last = this.lastDlg && this.lastDlg.id === dv.id ? this.lastDlg.n : null;
        if (last != null && dv.n > last && dv.n - last <= 2 && dv.n <= dv.len) {
          this.clips.forEach(r => {
            if (!r.typing || !r.enabled || r.problem || r.dialogue !== dv.id) return;
            for (let k = last + 1; k <= dv.n; k++) if ((k - 1) % r.every === 0) {
              const ch = (dv.chars || [])[k - 1];
              if (ch && /\s|…|。|，|？|！|\?|!|,|\./.test(ch)) continue;   // 標點、空白不出聲
              this._start(r, 'type:' + r.id + '#' + (++this.oneShotN), r.offset / 1000, { startT: T, startPos: 0 });
              break;
            }
          });
        }
        this.lastDlg = { id: dv.id, n: dv.n };
      } else this.lastDlg = null;

      // 4) 音量（淡入用音訊時鐘、淡出用故事時鐘）與自然結束
      this.inst.forEach((x, k) => {
        const r = x.r, i = x.i;
        if (i.ended) { this.inst.delete(k); this.log.push({ ev: 'ended', id: r.id, type: r.type, T, at: performance.now() }); return; }
        if (!r.continuous && r.T1 !== Infinity && T >= r.T1) { this._stopKey(k, 40, 'end'); return; }
        let g = r.volume;
        if (r.fadeIn > 0) g *= clamp01(((x.startPos || 0) + i.elapsed * 1000) / r.fadeIn);
        if (r.fadeOut > 0) {
          if (r.T1 !== Infinity) g *= clamp01((r.T1 - T) / r.fadeOut);
          else if (!r.loop && i.dur) g *= clamp01((i.dur - i.pos) * 1000 / r.fadeOut);
        }
        x.lastGain = g;
        const out = i instanceof MediaInst ? g * this._mixFor(r.type) : g;
        i.setGain(out, x.gainSet !== true);
        x.gainSet = true;
      });
      this.prevT = Math.max(prev, T);   // 只有跳轉（onJump）會讓觸發時鐘往回；一般播放不會倒退
    }

    /* ---------- 對話 ---------- */
    _voiceFor(id) { return this.clips.find(r => r.type === 'voice' && r.enabled && !r.problem && r.dialogue === id); }
    _voicePlaying(id) {
      const r = this._voiceFor(id); if (!r) return false;
      const x = this.inst.get('voice:' + r.id);
      return !!(x && !x.i.ended && !x.i.stopped);
    }
    textInstant(d) { const r = d && this._voiceFor(d.id); return !!(r && r.clip.text === 'instant' && this.assets[r.asset] && this.assets[r.asset].status === 'ok'); }
    // 「繼續」提示是否可以顯示（等配音播完才可繼續時）
    continueReady(d) { const r = d && this._voiceFor(d.id); return !(r && r.clip.waitEnd && this._voicePlaying(d.id)); }
    allowContinue(d) { return this.continueReady(d); }
    onContinue(d) {
      const r = d && this._voiceFor(d.id);
      if (r && (r.clip.onContinue || 'stop') === 'stop') this._stopKey('voice:' + r.id, 120, 'continue');
    }

    /* ---------- 編輯器：單獨預覽 ---------- */
    preview(clipOrAsset, opts = {}) {
      this._stopPreview();
      const ctx = this.ensureContext();
      const id = typeof clipOrAsset === 'string' ? clipOrAsset : clipOrAsset.asset;
      const c = typeof clipOrAsset === 'string' ? {} : clipOrAsset;
      const s = this.assets[id];
      if (!s || s.status !== 'ok') return Promise.resolve(false);
      return Promise.resolve(ctx && ctx.state !== 'running' ? ctx.resume() : null).catch(() => {}).then(() => {
        const type = TYPES.includes(c.type) ? c.type : 'sfx';
        const vol = clamp01(c.volume == null ? 1 : c.volume);
        let i;
        if (s.buffer) { i = new BufInst(this, s.buffer, this.bus[type], { loop: false, offset: (+c.offsetMs || 0) / 1000 }); i.setGain(vol, true); }   // 經過該類型與總音量
        else { i = new MediaInst(this, s.src, { offset: (+c.offsetMs || 0) / 1000 }); i.setGain(vol * this._mixFor(type)); }
        this.previewInst = i;
        const max = opts.maxMs || 8000;
        this._previewTimer = setTimeout(() => this._stopPreview(), max);
        return true;
      });
    }
    _stopPreview() { clearTimeout(this._previewTimer); if (this.previewInst) { this.previewInst.stop(80); this.previewInst = null; } }

    /* ---------- 測試／除錯 ---------- */
    debug() {
      const out = [];
      this.inst.forEach((x, k) => out.push({ key: k, id: x.r.id, type: x.r.type, pos: +(x.i.pos || 0).toFixed(3), gain: +(x.lastGain || 0).toFixed(3), paused: !!x.i.paused, backend: x.i instanceof MediaInst ? 'media' : 'webaudio' }));
      return out;
    }
    level() {   // 主輸出音量（RMS），用來確認靜音／音量控制真的有效
      if (!this.analyser) return 0;
      const a = new Float32Array(this.analyser.fftSize); this.analyser.getFloatTimeDomainData(a);
      let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * a[i]; return Math.sqrt(s / a.length);
    }
    destroy() { this.stopAll(0); this._stopPreview(); Object.values(this.localFiles).forEach(f => URL.revokeObjectURL(f.url)); this.localFiles = {}; this.assets = {}; if (this.ctx && this.ctx.close) this.ctx.close(); this.ctx = null; }
  }

  Object.assign(MC, { resolveAudioUrl, canonicalAudioSrc, audioAssetKey, audioProjectRoot, AUDIO_ERROR_KINDS: ERROR_KIND_LABELS, AUDIO_VERSION: VERSION, AUDIO_TYPES: TYPES, AUDIO_TYPE_LABELS: TYPE_LABELS, AUDIO_MIX_DEFAULTS: MIX_DEFAULTS,
    emptyAudio, compileAudioClips: compileClips, resolveAudioRef: resolveRef, audioRefFromGlobal: refFromGlobal, validateAudio, AudioEngine });
})(window);

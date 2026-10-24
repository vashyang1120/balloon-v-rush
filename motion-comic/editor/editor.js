/*
  氣球小V・動態漫畫編輯器  motion-comic-editor-v0.3.2-test-1（v0.3.2：音訊時間軸 BGM／環境音／事件音效／人物配音；v0.2.0：第三幕正式接入、遠景圖層、對話 styleType、A/B 人物切換通用化）
  只負責「修改專案資料」。畫面一律交給共用播放器 MotionComic.Player 渲染。
*/
(() => {
  'use strict';
  const MC = window.MotionComic;
  const EDITOR_VERSION = 'motion-comic-editor-v0.3.2-test-1';
  const LS_KEY = 'mc-editor-project-v1';
  const LS_META = 'mc-editor-project-v1-meta';
  const $ = id => document.getElementById(id);
  const clone = o => JSON.parse(JSON.stringify(o));

  /* ===================== 小工具 ===================== */
  function el(tag, props, ...kids) {
    const e = document.createElement(tag);
    Object.entries(props || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'style') e.style.cssText = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (k === 'value' || k === 'checked' || k === 'selected' || k === 'disabled') e[k] = v;
      else e.setAttribute(k, v === true ? '' : v);
    });
    kids.flat(Infinity).forEach(c => {
      if (c == null || c === false) return;
      e.append(c.nodeType ? c : document.createTextNode(String(c)));
    });
    return e;
  }
  const fmt = ms => {
    ms = Math.max(0, Math.round(ms));
    const m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60, r = ms % 1000;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(r).padStart(3, '0')}`;
  };
  const sec = ms => (ms / 1000).toFixed(ms % 100 === 0 ? 1 : 3) + 's';
  const parseTime = str => {
    str = String(str).trim();
    let m = str.match(/^(\d+):(\d+(?:\.\d+)?)$/);
    if (m) return (parseInt(m[1], 10) * 60 + parseFloat(m[2])) * 1000;
    m = str.match(/^(\d+(?:\.\d+)?)\s*(ms)?$/);
    if (m) return m[2] ? parseFloat(m[1]) : parseFloat(m[1]) * 1000;
    return NaN;
  };
  const snap = (ms, coarse) => Math.round(ms / (coarse ? 100 : 10)) * (coarse ? 100 : 10);
  const uid = prefix => prefix + '_' + Math.random().toString(36).slice(2, 7);
  let toastTimer = 0;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }
  function modal(title, body, actions) {
    $('modalTitle').textContent = title;
    const b = $('modalBody'); b.innerHTML = '';
    if (typeof body === 'string') b.innerHTML = body; else b.append(body);
    const a = $('modalActions'); a.innerHTML = '';
    (actions || [{ label: '關閉' }]).forEach(act => a.append(el('button', { class: 'tb', onclick: () => { $('modal').hidden = true; if (act.fn) act.fn(); } }, act.label)));
    $('modal').hidden = false;
  }

  /* ===================== 狀態 ===================== */
  const state = {
    project: null,
    baseline: clone(window.MC_BASELINE_V32 || window.MC_BASELINE_V31 || window.MC_BASELINE_V3 || window.MC_BASELINE_V2 || window.MC_BASELINE),   // v0.3.2 基準（v0.3.1 畫面＋空的音訊設定）
    baselineV31: clone(window.MC_BASELINE_V31 || window.MC_BASELINE_V3 || window.MC_BASELINE),   // v0.3.1 基準（定點分鏡修正版，沒有音訊欄位）
    baselineV3: clone(window.MC_BASELINE_V3 || window.MC_BASELINE_V2 || window.MC_BASELINE),   // v0.3.0 基準（五幕完整初版）
    baselineV2: clone(window.MC_BASELINE_V2 || window.MC_BASELINE),                          // v0.2.0 基準（含第三幕）
    baselineV1: clone(window.MC_BASELINE),                          // v0.1.0 基準（只有第一、二幕成功版）
    sel: null,          // { kind, si, ... }
    undo: [], redo: [],
    savedJSON: '',
    zoom: 90,           // 每秒幾 px
    ripple: true,
    range: 'all',
    rangeScene: 0,
  };

  const player = new MC.Player($('preview'), {
    baseUrl: '../', mode: 'edit',
    onTime: t => updatePlayhead(t, true),
    onPlayState: p => { $('playBtn').textContent = p ? '⏸' : '▶'; },
    onEnd: () => {},
    onDialogue: () => {},
  });
  // v0.3.2：音訊引擎（與正式播放頁同一套；拖曳時間軸時可靜音）
  const aud = new MC.AudioEngine({ onStatus: () => updateAudioStatus() });
  aud.scrubMute = true;
  aud.attach(player);
  aud.onAssets = () => { if (!state.project) return; renderTimeline(); if (state.sel && ['project', 'audio'].includes(state.sel.kind)) renderProps(); };
  window.mcEditor = { state, player, audio: aud };   // 供測試與除錯

  /* ===================== 專案載入 / 變更 ===================== */
  function setProject(p, opts = {}) {
    state.project = p;
    if (opts.saved) state.savedJSON = JSON.stringify(p);
    player.setProject(p);
    player.loadAssets().then(() => { renderSceneList(); renderTimeline(); renderProps(); if (opts.reportAssets) reportMissingAssets(); });
    renderAll();
  }

  function snapshot() { return JSON.stringify(state.project); }
  function pushUndo() {
    state.undo.push(snapshot());
    if (state.undo.length > 200) state.undo.shift();
    state.redo = [];
  }
  // 所有修改都經過這裡：先存復原點，再改資料，再讓播放器重新渲染
  function edit(fn, opts = {}) {
    const before = snapshot();
    fn(state.project);
    if (snapshot() === before) { if (!opts.light) renderProps(); return; }   // 沒有實際改變：不留復原點
    if (!opts.noUndo) { state.undo.push(before); if (state.undo.length > 200) state.undo.shift(); state.redo = []; }
    afterChange(opts);
  }
  function afterChange(opts = {}) {
    player.setProject(state.project);
    if (opts.loadAssets) player.loadAssets().then(() => { renderSceneList(); renderTimeline(); renderProps(); });
    if (opts.light) { renderTimeline(); updateTop(); renderSceneList(); return; }
    renderAll();
  }
  function undo() {
    if (!state.undo.length) return;
    state.redo.push(snapshot());
    state.project = JSON.parse(state.undo.pop());
    fixSelection(); afterChange();
    toast('已復原');
  }
  function redo() {
    if (!state.redo.length) return;
    state.undo.push(snapshot());
    state.project = JSON.parse(state.redo.pop());
    fixSelection(); afterChange();
    toast('已重做');
  }
  function fixSelection() {
    const s = state.sel;
    if (!s) return;
    if (s.si != null && !state.project.scenes[s.si]) state.sel = null;
  }
  const isDirty = () => snapshot() !== state.savedJSON;

  /* ===================== 時間換算 ===================== */
  const seg = si => player.tl.segs[si];
  const mmOf = si => MC.markerTimes(state.project.scenes[si]);
  const refT = (si, ref, fb) => MC.refTime(ref, mmOf(si), fb);
  function sceneAtPlayhead() {
    const loc = player.locate(player.t);
    return loc ? loc.seg.index : 0;
  }
  function currentSceneIndex() {
    return state.sel && state.sel.si != null ? state.sel.si : sceneAtPlayhead();
  }
  // 播放頭在第 si 幕的局部時間（若不在此幕則回傳 0）
  function playheadLocal(si) {
    const s = seg(si);
    if (!s) return 0;
    return Math.max(0, Math.min(s.scene.durationMs, player.t - s.start));
  }
  // 把局部時間寫成「最接近且不晚於它的節點＋偏移」
  function refFromLocal(si, local) {
    const mm = mmOf(si);
    let best = 'start';
    (state.project.scenes[si].markers || []).forEach(m => { if (m.t <= local && m.t >= mm[best]) best = m.id; });
    return { m: best, o: Math.round(local - mm[best]) };
  }

  /* ===================== 軌道存取 ===================== */
  const TRACK_META = {
    fx: {
      open: { label: '眼皮開合', step: 0.01, hint: '0＝全閉，1＝眼皮完全離開畫面', color: 'var(--c-open)' },
      tremor: { label: '眼皮顫動', step: 0.05, hint: '迷濛時半開眼的輕微顫動強度（0～1）', color: 'var(--c-tremor)' },
      blur: { label: '背景模糊', step: 0.001, hint: '舞台高度比例：0.024＝高度模糊，0＝清晰（只作用在背景圖層）', color: 'var(--c-blur)' },
      exposure: { label: '曝光', step: 0.01, hint: '1＝原始亮度；1.16＝剛醒來偏亮', color: 'var(--c-exposure)' },
      breath: { label: '呼吸', step: 0.05, hint: '鏡頭呼吸強度（0～1），需要啟用呼吸插件', color: 'var(--c-breath)' },
      overscan: { label: '預留放大', step: 0.001, hint: '呼吸期間預留的放大量（≥1），呼吸收束時一起回到 1', color: 'var(--c-overscan)' },
      fog: { label: '霧氣', step: 0.05, hint: '霧插件的濃度（0～1），需要啟用霧插件', color: '#cfd8d2' },
    },
    cam: {
      x: { label: '水平平移', step: 0.005, hint: '舞台寬度比例，正值＝畫面往右移', color: 'var(--c-camera)' },
      y: { label: '垂直平移', step: 0.005, hint: '舞台高度比例，正值＝畫面往下移', color: '#ffb3c1' },
      scale: { label: '推近／拉遠', step: 0.005, hint: '1＝原始；>1 推近；<1 拉遠（拉遠會露出舞台邊緣）', color: '#ff8fa3' },
      rotation: { label: '鏡頭旋轉', step: 0.1, hint: '度', color: '#ff6f91' },
    },
    layer: {
      x: { label: '位置 X', step: 0.005, hint: '錨點在舞台上的水平位置（0～1）' },
      y: { label: '位置 Y', step: 0.005, hint: '錨點在舞台上的垂直位置（0～1）' },
      scale: { label: '縮放', step: 0.005, hint: '圖寬 ÷ 舞台寬（保持原圖比例）' },
      opacity: { label: '透明度', step: 0.05, hint: '0～1' },
      rotation: { label: '旋轉', step: 0.5, hint: '度' },
      blur: { label: '模糊', step: 0.0005, hint: '舞台高度比例：0.004 ≈ 輕微失焦（例如走進霧裡）' },
    },
  };
  const FX_ROWS = ['open', 'tremor', 'blur', 'exposure', 'breath', 'overscan', 'fog'];
  const POSE_TRACKS = ['x', 'y', 'scale', 'opacity', 'rotation', 'blur'];

  function trackHost(p, d, create) {
    const s = p.scenes[d.si];
    if (!s) return null;
    if (d.scope === 'fx') { if (!s.tracks) s.tracks = {}; return s.tracks; }
    if (d.scope === 'cam') {
      if (!s.camera) s.camera = { originX: 0.5, originY: 0.5, tracks: {} };
      if (!s.camera.tracks) s.camera.tracks = {};
      return s.camera.tracks;
    }
    const L = (s.layers || []).find(l => l.id === d.layerId);
    if (!L) return null;
    if (!L.tracks && create) L.tracks = {};
    return L.tracks || {};
  }
  function trackArr(p, d, create) {
    const h = trackHost(p, d, create);
    if (!h) return null;
    if (!h[d.track] && create) h[d.track] = [];
    return h[d.track] || null;
  }
  function cleanupTrack(p, d) {
    const h = trackHost(p, d, false);
    if (h && h[d.track] && !h[d.track].length) delete h[d.track];
  }
  function currentValue(d, local) {
    const p = state.project;
    const arr = trackArr(p, d, false);
    if (arr && arr.length) return MC.sample(MC.compileTrack(arr, mmOf(d.si)), local);
    if (d.scope === 'fx') return MC.TRACK_DEFAULTS[d.track];
    if (d.scope === 'cam') return MC.CAMERA_DEFAULTS[d.track];
    const L = p.scenes[d.si].layers.find(l => l.id === d.layerId);
    return L && L[d.track] != null ? L[d.track] : MC.LAYER_DEFAULTS[d.track];
  }

  /* ===================== 全部重繪 ===================== */
  function renderAll() {
    updateTop();
    renderSceneList();
    renderProps();
    renderTimeline();
    updatePlayhead(player.t, false);
  }

  function updateTop() {
    $('projTitle').value = state.project.title || '';
    $('dirtyTag').hidden = !isDirty();
    $('undoBtn').disabled = !state.undo.length;
    $('redoBtn').disabled = !state.redo.length;
    const v = MC.validateProject(state.project);
    const vt = $('validTag');
    if (v.errors.length) { vt.textContent = `✕ ${v.errors.length} 個錯誤`; vt.className = 'valid-tag err'; }
    else if (v.warnings.length) { vt.textContent = `⚠ ${v.warnings.length} 個提醒`; vt.className = 'valid-tag'; vt.style.color = 'var(--warn)'; }
    else { vt.textContent = '✓ 格式正確'; vt.className = 'valid-tag ok'; vt.style.color = ''; }
    $('totalTime').textContent = '/ ' + fmt(player.total);
  }

  /* ===================== 場景清單 ===================== */
  function sceneStatusChip(i) {
    const st = player.sceneStatus(i);
    if (st.ready) return el('span', { class: 'chip ready' }, '已就緒');
    if (!st.hasLayers) return el('span', { class: 'chip draft' }, '尚未配置素材');
    if (st.pending.length) return el('span', { class: 'chip draft' }, '載入中');
    return el('span', { class: 'chip missing' }, '缺少素材');
  }
  function renderSceneList() {
    const box = $('sceneList');
    box.innerHTML = '';
    const cur = currentSceneIndex();
    state.project.scenes.forEach((s, i) => {
      box.append(el('div', {
        class: 'scene-card' + (i === cur && state.sel && state.sel.si === i ? ' sel' : ''),
        onclick: () => { select({ kind: 'scene', si: i }); player.seek(seg(i).start); },
      },
      el('div', { class: 'sc-top' }, el('span', { class: 'sc-num' }, `Scene ${String(i + 1).padStart(2, '0')}`), sceneStatusChip(i),
        el('button', { class: 'sc-play', title: '只預覽這一幕', onclick: e => { e.stopPropagation(); previewScene(i); } }, '▶')),
      el('div', { class: 'sc-name' }, s.name || s.id),
      el('div', { class: 'sc-meta' }, `${sec(s.durationMs)}`, s.transitionIn && i > 0 ? `· 轉場 ${transLabel(s.transitionIn.type)}` : '',
        (s.dialogues || []).length ? `· 對話 ${(s.dialogues || []).length}` : '')));
    });
  }
  const transLabel = t => ({ cut: '直接切', fadeBlack: '淡黑', crossfade: '淡入淡出' }[t] || t);

  function previewScene(i) {
    state.range = 'scene'; state.rangeScene = i;
    $('rangeSel').value = 'scene';
    select({ kind: 'scene', si: i });
    applyRange();
    player.replay();
  }

  /* ===================== 選取 ===================== */
  function select(sel) {
    state.sel = sel;
    renderSceneList();
    renderProps();
    renderTimeline();
  }

  /* ===================== 屬性面板：欄位元件 ===================== */
  function numField(label, value, onCommit, o = {}) {
    const inp = el('input', { type: 'number', step: o.step ?? 'any', value: value ?? '', min: o.min, max: o.max });
    inp.addEventListener('change', () => {
      const v = parseFloat(inp.value);
      if (!isFinite(v)) { inp.value = value ?? ''; return; }
      onCommit(o.int ? Math.round(v) : v);
    });
    return el('div', { class: 'f', title: o.hint || '' }, el('label', {}, label),
      el('div', { class: 'inl' }, inp, o.unit ? el('span', { class: 'unit' }, o.unit) : null));
  }
  function textField(label, value, onCommit, o = {}) {
    const inp = el(o.area ? 'textarea' : 'input', o.area ? {} : { type: 'text' });
    inp.value = value ?? '';
    inp.addEventListener('change', () => onCommit(inp.value));
    return el('div', { class: 'f' }, el('label', {}, label), inp);
  }
  function selectField(label, value, options, onCommit) {
    const s = el('select', {}, options.map(([v, t]) => el('option', { value: v, selected: v === value }, t)));
    s.addEventListener('change', () => onCommit(s.value));
    return el('div', { class: 'f' }, el('label', {}, label), s);
  }
  function checkField(label, value, onCommit) {
    const c = el('input', { type: 'checkbox', checked: !!value });
    c.addEventListener('change', () => onCommit(c.checked));
    return el('div', { class: 'f' }, el('label', {}, label), el('div', { class: 'inl' }, c));
  }
  const sect = (title, open, ...kids) => el('details', { class: 'p-sec', open }, el('summary', {}, title), kids);
  const hint = (t, cls) => el('div', { class: 'hint' + (cls ? ' ' + cls : '') }, t);
  const markerOptions = si => [['start', '本幕開始（0）'], ...(state.project.scenes[si].markers || []).map(m => [m.id, `${m.label || m.id}（${sec(m.t)}）`]), ['end', '本幕結束']];

  /* ===================== 關鍵影格表 ===================== */
  function trackEditor(d, opts = {}) {
    const p = state.project;
    const meta = TRACK_META[d.scope][d.track] || { label: d.track, step: 0.01 };
    const arr = trackArr(p, d, false) || [];
    const mm = mmOf(d.si);
    const selIdx = state.sel && state.sel.kind === 'kf' && state.sel.si === d.si && state.sel.scope === d.scope &&
      state.sel.track === d.track && (state.sel.layerId || null) === (d.layerId || null) ? state.sel.idx : -1;
    const rows = arr.map((k, i) => {
      const abs = MC.refTime(k, mm, 0);
      const mSel = el('select', {}, markerOptions(d.si).map(([v, t]) => el('option', { value: v, selected: v === (k.m || 'start') }, t)));
      mSel.addEventListener('change', () => edit(pp => {
        const a = trackArr(pp, d, true);
        const keepAbs = MC.refTime(a[i], MC.markerTimes(pp.scenes[d.si]), 0);
        a[i].m = mSel.value;
        a[i].o = Math.round(keepAbs - MC.markerTimes(pp.scenes[d.si])[mSel.value]);   // 換節點時保持原本的實際時間
      }));
      const oIn = el('input', { type: 'number', step: 10, value: k.o || 0, title: '相對節點的偏移（毫秒）' });
      oIn.addEventListener('change', () => { const v = parseFloat(oIn.value); if (isFinite(v)) edit(pp => { trackArr(pp, d, true)[i].o = Math.round(v); }); });
      const vIn = el('input', { type: 'number', step: meta.step, value: k.v });
      vIn.addEventListener('change', () => { const v = parseFloat(vIn.value); if (isFinite(v)) edit(pp => { trackArr(pp, d, true)[i].v = v; }); });
      const eSel = el('select', {}, [['', '（起點）'], ...MC.EASES.map(e => [e, MC.EASE_LABELS[e]])].map(([v, t]) => el('option', { value: v, selected: (k.e || '') === v }, t)));
      eSel.addEventListener('change', () => edit(pp => { const a = trackArr(pp, d, true); if (eSel.value) a[i].e = eSel.value; else delete a[i].e; }));
      return [
        el('tr', { class: i === selIdx ? 'sel' : '', onclick: e => { if (e.target.tagName === 'TD' || e.target.classList.contains('lab')) { player.seek(seg(d.si).start + abs); select({ kind: 'kf', ...d, idx: i }); } } },
          el('td', { colspan: 5, class: 'lab' }, el('span', { class: 'abs' }, sec(abs) + ' '), k.label || `第 ${i + 1} 格`)),
        el('tr', { class: i === selIdx ? 'sel' : '' },
          el('td', { style: 'width:34%' }, mSel), el('td', { style: 'width:19%' }, oIn), el('td', { style: 'width:18%' }, vIn),
          el('td', { style: 'width:24%' }, eSel),
          el('td', {}, el('button', { class: 'x', title: '刪除這一格', onclick: () => edit(pp => { trackArr(pp, d, true).splice(i, 1); cleanupTrack(pp, d); if (state.sel && state.sel.kind === 'kf') state.sel = null; }) }, '✕'))),
      ];
    });
    const addBtn = el('button', { class: 'sb', onclick: () => {
      const local = playheadLocal(d.si);
      const v = currentValue(d, local);
      edit(pp => {
        const a = trackArr(pp, d, true);
        a.push({ ...refFromLocal(d.si, local), v: +v.toFixed(5), e: a.length ? 'inOut' : undefined });
        if (!a[a.length - 1].e) delete a[a.length - 1].e;
      });
    } }, '＋ 在播放頭新增一格');
    return el('div', {},
      opts.noTitle ? null : el('div', { class: 'p-h', style: `color:${meta.color || 'var(--accent2)'}` }, meta.label + (opts.suffix || '')),
      meta.hint ? hint(meta.hint) : null,
      arr.length ? el('table', { class: 'kft' }, el('tr', {}, el('th', {}, '節點'), el('th', {}, '偏移ms'), el('th', {}, '數值'), el('th', {}, '緩動'), el('th', {})), rows)
        : hint('（沒有關鍵影格，使用預設值）'),
      el('div', { class: 'row-btns' }, addBtn));
  }

  /* ===================== 屬性面板 ===================== */
  function renderProps() {
    const box = $('props');
    box.innerHTML = '';
    const s = state.sel;
    if (!s || s.kind === 'project') return box.append(projectPanel());
    if (s.kind === 'scene' || s.kind === 'marker' || s.kind === 'transition') return box.append(scenePanel(s.si));
    if (s.kind === 'kf' || s.kind === 'track') return box.append(trackPanel(s));
    if (s.kind === 'layer') return box.append(layerPanel(s.si, s.layerId));
    if (s.kind === 'dialogue') return box.append(dialoguePanel(s.si, s.id));
    if (s.kind === 'audio') return box.append(audioPanel(s.id));
    box.append(projectPanel());
  }

  /* ---------- 專案與素材 ---------- */
  function projectPanel() {
    const p = state.project;
    const v = MC.validateProject(p);
    const report = player.assetReport();
    const used = new Set();
    p.scenes.forEach(sc => (sc.layers || []).forEach(L => [L.asset, L.assetA, L.assetB].concat((L.poses || []).map(q => q.asset)).forEach(a => a && used.add(a))));
    return el('div', {},
      el('div', { class: 'p-title' }, '專案與素材管理'),
      el('div', { class: 'p-sub' }, `${p.projectId} · schema ${p.schemaVersion} · 舞台 ${p.stage.width}×${p.stage.height}`),
      textField('專案名稱', p.title, val => edit(pp => { pp.title = val; })),
      el('div', { class: 'p-sec' }, el('div', { class: 'p-h' }, '格式檢查'),
        v.errors.length ? el('ul', {}, v.errors.map(e => el('li', { class: 'hint err' }, e))) : hint('沒有錯誤。'),
        v.warnings.length ? el('ul', {}, v.warnings.map(e => el('li', { class: 'hint warn' }, e))) : null),
      el('div', { class: 'p-sec' }, el('div', { class: 'p-h' }, `素材（${report.length}）`),
        hint('專案內的圖片用「相對路徑」記錄（例如 assets/scene1_bg.png），正式播放器會用同一個路徑。從電腦臨時匯入的圖片只在這次編輯有效，匯出前請把檔案放進 assets 資料夾，或勾選匯出時嵌入圖片。'),
        report.map(r => {
          const a = p.assets[r.id];
          const st = player.assetState[r.id];
          return el('div', { class: 'asset-row' },
            st && st.ok ? el('img', { src: st.src, alt: '' }) : el('div', { style: 'width:44px;height:32px;background:#2a1a1a;border-radius:3px' }),
            el('div', {}, el('div', { class: 'an' }, a.label || r.id, a.local ? '（臨時本機圖片）' : ''),
              el('div', { class: 'as' }, String(a.src).startsWith('data:') ? '（已嵌入圖片資料）' : String(a.src).startsWith('blob:') ? `本機檔案：${a.fileName || ''}` : a.src),
              el('div', { class: r.ok ? 'st-ok' : 'st-bad', style: 'font-size:11px' }, r.ok ? `✓ 可用 ${st.w}×${st.h}` : (st && st.loading ? '載入中…' : '✕ 找不到圖片，需要重新連結'))),
            el('div', { class: 'row-btns', style: 'flex-direction:column' },
              el('button', { class: 'sb', onclick: () => relinkAsset(r.id) }, '重新連結'),
              used.has(r.id) ? null : el('button', { class: 'sb danger', onclick: () => edit(pp => { delete pp.assets[r.id]; }) }, '移除')));
        }),
        el('div', { class: 'row-btns' }, el('button', { class: 'sb', onclick: () => importImage(null) }, '＋ 匯入圖片到素材庫'))),
      audioAssetsSection());
  }

  /* ---------- 場景 ---------- */
  function scenePanel(si) {
    const p = state.project;
    const s = p.scenes[si];
    const st = player.sceneStatus(si);
    const markers = s.markers || [];
    const refs = markerRefCounts(s);

    // 節拍表：每一列＝前一個節點到這個節點的長度
    const beatRows = [];
    let prevT = 0, prevLabel = '本幕開始';
    markers.forEach((m, mi) => {
      const gap = m.t - prevT;
      const gIn = el('input', { type: 'number', step: 10, min: 0, value: gap, title: '這一段的長度（毫秒）' });
      gIn.addEventListener('change', () => {
        const v = Math.max(0, Math.round(parseFloat(gIn.value)));
        if (!isFinite(v)) return;
        edit(pp => {
          const ms = pp.scenes[si].markers;
          setMarkerTime(pp, si, mi, (mi > 0 ? ms[mi - 1].t : 0) + v, state.ripple);
        });
      });
      const lIn = el('input', { type: 'text', value: m.label || m.id });
      lIn.addEventListener('change', () => edit(pp => { pp.scenes[si].markers[mi].label = lIn.value; }));
      beatRows.push(el('tr', { class: state.sel && state.sel.kind === 'marker' && state.sel.id === m.id ? 'sel' : '' },
        el('td', { class: 'lab', style: 'width:38%' }, `${prevLabel} →`), el('td', { style: 'width:22%' }, gIn),
        el('td', { style: 'width:30%' }, lIn),
        el('td', { class: 'abs' }, sec(m.t)),
        el('td', {}, el('button', { class: 'x', title: refs[m.id] ? `有 ${refs[m.id]} 個項目使用這個節點，不能刪除` : '刪除節點',
          disabled: !!refs[m.id], onclick: () => edit(pp => { pp.scenes[si].markers.splice(mi, 1); }) }, '✕'))));
      prevT = m.t; prevLabel = m.label || m.id;
    });
    const endGap = s.durationMs - prevT;
    const eIn = el('input', { type: 'number', step: 10, min: 10, value: endGap });
    eIn.addEventListener('change', () => {
      const v = Math.max(10, Math.round(parseFloat(eIn.value)));
      if (isFinite(v)) edit(pp => { const ms = pp.scenes[si].markers || []; pp.scenes[si].durationMs = (ms.length ? ms[ms.length - 1].t : 0) + v; });
    });
    beatRows.push(el('tr', {}, el('td', { class: 'lab' }, `${prevLabel} →`), el('td', {}, eIn), el('td', { class: 'lab' }, '本幕結束（停留）'), el('td', { class: 'abs' }, sec(s.durationMs)), el('td', {})));

    const scaleIn = el('input', { type: 'number', step: 0.1, min: 0.1, value: (s.durationMs / 1000).toFixed(2) });
    const tr = s.transitionIn || { type: 'cut' };
    const eff = s.effects || {};

    return el('div', {},
      el('div', { class: 'p-title' }, `Scene ${String(si + 1).padStart(2, '0')}｜${s.name}`),
      el('div', { class: 'p-sub' }, s.id, ' · ', st.ready ? '素材已就緒' : (st.hasLayers ? '缺少素材' : '尚未配置素材'), s.note ? ` · ${s.note}` : ''),
      textField('場景名稱', s.name, v => edit(pp => { pp.scenes[si].name = v; })),
      selectField('狀態', s.status || 'draft', [['ready', '正式'], ['draft', '草稿']], v => edit(pp => { pp.scenes[si].status = v; })),
      numField('本幕長度', s.durationMs, v => edit(pp => { pp.scenes[si].durationMs = Math.max((markers.length ? markers[markers.length - 1].t : 0) + 10, v); }), { step: 100, unit: 'ms', int: true }),
      el('div', { class: 'f' }, el('label', {}, '整幕等比例縮放'), el('div', { class: 'inl' }, scaleIn, el('span', { class: 'unit' }, '秒'),
        el('button', { class: 'sb', onclick: () => {
          const target = parseFloat(scaleIn.value) * 1000;
          if (!(target > 0)) return;
          edit(pp => scaleScene(pp.scenes[si], target / pp.scenes[si].durationMs));
          toast(`已把整幕等比例縮放為 ${sec(target)}`);
        } }, '套用'))),
      hint('「等比例縮放」會讓本幕所有節點、關鍵影格與對話一起按比例變快或變慢；平常請用下方「節拍」個別調整。'),

      el('div', { class: 'p-sec' }, el('div', { class: 'p-h' }, '節拍（主要時間節點）'),
        hint(state.ripple ? '修改某一段長度時，後面的節點與掛在節點上的關鍵影格會一起順延（可在下方工具列關閉「順延後續事件」）。'
          : '目前「順延後續事件」已關閉：只移動這個節點，不會超過下一個節點。'),
        el('table', { class: 'kft' }, el('tr', {}, el('th', {}, '從'), el('th', {}, '長度ms'), el('th', {}, '到（節點名稱）'), el('th', {}, '時間'), el('th', {})), beatRows),
        el('div', { class: 'row-btns' }, el('button', { class: 'sb', onclick: () => addMarkerAtPlayhead(si) }, '＋ 在播放頭新增節點'))),

      si > 0 ? el('div', { class: 'p-sec' }, el('div', { class: 'p-h' }, '進場轉場（從上一幕切到本幕）'),
        selectField('轉場方式', tr.type, [['cut', '直接切鏡'], ['fadeBlack', '淡黑'], ['crossfade', '淡入淡出（疊化）']], v => edit(pp => {
          const t = pp.scenes[si].transitionIn = { type: v };
          if (v === 'fadeBlack') Object.assign(t, { outMs: tr.outMs ?? 160, holdMs: tr.holdMs ?? 60, inMs: tr.inMs ?? 240 });
          if (v === 'crossfade') t.durMs = tr.durMs ?? 600;
        })),
        tr.type === 'fadeBlack' ? [
          numField('淡出到黑', tr.outMs, v => edit(pp => { pp.scenes[si].transitionIn.outMs = Math.max(0, v); }), { step: 10, unit: 'ms', int: true }),
          numField('全黑停留', tr.holdMs, v => edit(pp => { pp.scenes[si].transitionIn.holdMs = Math.max(0, v); }), { step: 10, unit: 'ms', int: true }),
          numField('淡入本幕', tr.inMs, v => edit(pp => { pp.scenes[si].transitionIn.inMs = Math.max(0, v); }), { step: 10, unit: 'ms', int: true }),
          hint('淡出與全黑發生在兩幕之間；淡入疊在本幕開頭。改淡入時間不會自動移動本幕的節點。'),
        ] : null,
        tr.type === 'crossfade' ? numField('疊化時間', tr.durMs, v => edit(pp => { pp.scenes[si].transitionIn.durMs = Math.max(0, v); }), { step: 10, unit: 'ms', int: true }) : null,
        si > 0 ? hint(`上一幕結束後的停留時間在「上一幕」的節拍最後一列調整。`) : null) : null,

      el('div', { class: 'p-sec' }, el('div', { class: 'p-h' }, `圖層（${(s.layers || []).length}）`),
        (s.layers || []).length ? (s.layers || []).map((L, li) => el('div', { class: 'f', style: 'grid-template-columns:1fr auto' },
          el('a', { href: '#', onclick: e => { e.preventDefault(); select({ kind: 'layer', si, layerId: L.id }); } },
            `${li + 1}. ${L.name || L.id}`, el('span', { class: 'unit' }, ` ${roleLabel(L)}${L.visible === false ? '（隱藏）' : ''}`)),
          el('div', { class: 'inl' },
            el('button', { class: 'sb', title: '往後（下層）', disabled: li === 0, onclick: () => edit(pp => moveLayer(pp, si, li, -1)) }, '↓'),
            el('button', { class: 'sb', title: '往前（上層）', disabled: li === s.layers.length - 1, onclick: () => edit(pp => moveLayer(pp, si, li, 1)) }, '↑'))))
          : hint('這一幕還沒有任何圖片。'),
        el('div', { class: 'row-btns' },
          el('button', { class: 'sb', onclick: () => importImage({ si, role: 'background' }) }, '＋ 背景圖'),
          el('button', { class: 'sb', onclick: () => importImage({ si, role: 'far' }) }, '＋ 遠景'),
          el('button', { class: 'sb', onclick: () => importImage({ si, role: 'character' }) }, '＋ 人物圖'),
          el('button', { class: 'sb', onclick: () => importImage({ si, role: 'foreground' }) }, '＋ 前景物件'),
          el('button', { class: 'sb', onclick: () => addLayerFromLibrary(si) }, '從素材庫加入')),
        hint('圖片一律保持原始比例；透明 PNG 會保留透明度。')),

      el('div', { class: 'p-sec' }, el('div', { class: 'p-h' }, `對話（${(s.dialogues || []).length}）`),
        (s.dialogues || []).map(d => el('div', {}, el('a', { href: '#', onclick: e => { e.preventDefault(); select({ kind: 'dialogue', si, id: d.id }); } },
          `${sec(refT(si, d.at, 0))}  ${d.speaker ? d.speaker + '：' : ''}${d.text.slice(0, 18)}${d.text.length > 18 ? '…' : ''}`),
          el('span', { class: 'unit' }, ` ${d.mode === 'wait' ? '等待繼續' : '自動'}${d.draft ? '・草稿' : ''}${d.enabled === false ? '・停用' : ''}`))),
        el('div', { class: 'row-btns' }, el('button', { class: 'sb', onclick: () => addDialogue(si) }, '＋ 在播放頭新增對話'))),

      el('details', { class: 'p-sec' }, el('summary', {}, '鏡頭（平移／推拉／旋轉）'),
        numField('鏡頭中心 X', s.camera ? s.camera.originX : 0.5, v => edit(pp => { pp.scenes[si].camera = pp.scenes[si].camera || { tracks: {} }; pp.scenes[si].camera.originX = v; }), { step: 0.01, hint: '推近／旋轉的中心（舞台寬度比例）' }),
        numField('鏡頭中心 Y', s.camera ? s.camera.originY : 0.5, v => edit(pp => { pp.scenes[si].camera = pp.scenes[si].camera || { tracks: {} }; pp.scenes[si].camera.originY = v; }), { step: 0.01 }),
        ['scale', 'x', 'y', 'rotation'].map(k => trackEditor({ si, scope: 'cam', track: k }))),

      el('details', { class: 'p-sec', open: !!(eff.eyelids || eff.breath) }, el('summary', {}, '特殊效果插件'),
        checkField('眼皮插件', eff.eyelids && eff.eyelids.enabled !== false, v => edit(pp => {
          const e = pp.scenes[si].effects = pp.scenes[si].effects || {};
          if (v) e.eyelids = e.eyelids || { enabled: true, params: clone(state.baseline.scenes[0].effects.eyelids.params) };
          if (e.eyelids) e.eyelids.enabled = v;
        })),
        eff.eyelids && eff.eyelids.enabled !== false ? paramsBlock(si, 'eyelids', [
          ['LID_FEATHER', '眼皮柔和毛邊', 0.001, '舞台高度比例'], ['LID_CURVE_MIN', '閉眼時弧度', 0.005], ['LID_CURVE_MAX', '全開時弧度', 0.005],
          ['LID_CENTER_Y', '眼皮相接高度', 0.01], ['LOWER_LID_LAG', '下眼皮延遲', 0.01, '>1 越慢'], ['TREMOR', '顫動幅度', 0.001],
          ['LID_COLOR', '眼皮顏色', 'text'], ['LID_RIM_COLOR', '暖色邊緣', 'text']]) : null,
        checkField('呼吸插件', eff.breath && eff.breath.enabled !== false, v => edit(pp => {
          const e = pp.scenes[si].effects = pp.scenes[si].effects || {};
          if (v) e.breath = e.breath || { enabled: true, params: clone(state.baseline.scenes[0].effects.breath.params) };
          if (e.breath) e.breath.enabled = v;
        })),
        eff.breath && eff.breath.enabled !== false ? [paramsBlock(si, 'breath', [
          ['BREATH_Y', '上下幅度', 0.0005, '舞台高度比例'], ['BREATH_X', '左右幅度', 0.0005], ['BREATH_ROT', '旋轉幅度', 0.01, '度'],
          ['BREATH_SCALE', '縮放起伏', 0.0005], ['BREATH_PERIOD', '呼吸週期', 0.1, '秒']]),
          selectField('呼吸時鐘', eff.breath.params.BREATH_CLOCK === 'ambient' ? 'ambient' : 'scene', [['scene', '跟著劇情（對話暫停時呼吸也停；第一幕用這個）'], ['ambient', '持續（對話暫停劇情時仍輕微呼吸）']],
            v => edit(pp => { const P = pp.scenes[si].effects.breath.params; if (v === 'ambient') P.BREATH_CLOCK = 'ambient'; else delete P.BREATH_CLOCK; }))] : null,
        checkField('霧插件', eff.fog && eff.fog.enabled !== false, v => edit(pp => {
          const e = pp.scenes[si].effects = pp.scenes[si].effects || {};
          if (v) e.fog = e.fog || { enabled: true, params: { CX: 0.5, CY: 0.55, RX: 0.3, RY: 0.2, CORE: 0.9, HAZE: 0.1, COLOR: '236, 240, 234' } };
          if (e.fog) e.fog.enabled = v;
        })),
        eff.fog && eff.fog.enabled !== false ? [paramsBlock(si, 'fog', [
          ['CX', '霧中心 X', 0.01, '舞台寬度比例'], ['CY', '霧中心 Y', 0.01, '舞台高度比例'], ['RX', '霧寬', 0.01], ['RY', '霧高', 0.01],
          ['CORE', '中心濃度', 0.05, '0～1'], ['HAZE', '整體薄霧', 0.01, '0～1'], ['COLOR', '霧的顏色（R, G, B）', 'text']]),
          hint('霧的濃淡隨時間變化：用下方「特效軌道 → 霧氣」。霧在本幕所有圖層之上，會跟著鏡頭移動。')] : null),

      el('details', { class: 'p-sec', open: !!Object.keys(s.tracks || {}).length }, el('summary', {}, '特效軌道（眨眼／模糊／曝光／呼吸）'),
        FX_ROWS.map(k => trackEditor({ si, scope: 'fx', track: k }))),

      el('div', { class: 'p-sec' }, el('div', { class: 'row-btns' },
        el('button', { class: 'sb', disabled: si === 0, onclick: () => edit(pp => { const [x] = pp.scenes.splice(si, 1); pp.scenes.splice(si - 1, 0, x); state.sel = { kind: 'scene', si: si - 1 }; }) }, '↑ 往前移'),
        el('button', { class: 'sb', disabled: si === p.scenes.length - 1, onclick: () => edit(pp => { const [x] = pp.scenes.splice(si, 1); pp.scenes.splice(si + 1, 0, x); state.sel = { kind: 'scene', si: si + 1 }; }) }, '↓ 往後移'),
        el('button', { class: 'sb danger', disabled: p.scenes.length <= 1, onclick: () => modal('刪除場景', `確定要刪除「${escapeHtml(s.name)}」嗎？（可以用「復原」找回）`, [
          { label: '取消' }, { label: '刪除', fn: () => edit(pp => { pp.scenes.splice(si, 1); state.sel = null; }) }]) }, '刪除這一幕'))));
  }

  function paramsBlock(si, plugin, defs) {
    const P = state.project.scenes[si].effects[plugin].params;
    return defs.map(([key, label, step, unit]) => step === 'text'
      ? textField(label, P[key], v => edit(pp => { pp.scenes[si].effects[plugin].params[key] = v; }))
      : numField(label, P[key], v => edit(pp => { pp.scenes[si].effects[plugin].params[key] = v; }), { step, unit }));
  }

  const ROLE_NAMES = { background: '背景', far: '遠景', character: '人物', foreground: '前景' };
  const ROLE_OPTIONS = [['background', '背景（填滿舞台，可套模糊／曝光）'], ['far', '遠景（例如窗外，可位移縮放運鏡）'], ['character', '人物'], ['foreground', '前景物件（例如窗框）']];
  const swapLabels = L => [L.labelA || '2A', L.labelB || '2B'];
  const isBedPair = L => !!(L.shadow && Array.isArray(L.shadow.bedFeet) && L.shadow.bedFeet.length);
  const roleLabel = L => L.type === 'swapPair' ? `${isBedPair(L) ? '人物＋床組' : '人物'}（${swapLabels(L).join('→')}）`
    : L.type === 'poseSeq' ? `人物（${(L.poses || []).map((q, i) => q.label || ('姿勢' + (i + 1))).join('→')}）` : (ROLE_NAMES[L.role] || L.role);
  const XF_OPTIONS = [['dissolve', '真正交叉淡化（A 1→0、B 0→1 同步；建議）'], ['sync', '同步淡化（簡易版，中間會略透明）'], ['legacy', '舊版（B 疊上、A 最後 40% 才淡出）']];

  function markerRefCounts(s) {
    const c = {};
    const add = r => { if (r && typeof r === 'object' && r.m && r.m !== 'start' && r.m !== 'end') c[r.m] = (c[r.m] || 0) + 1; };
    Object.values(s.tracks || {}).forEach(a => a.forEach(add));
    Object.values((s.camera && s.camera.tracks) || {}).forEach(a => a.forEach(add));
    (s.layers || []).forEach(L => { add(L.start); add(L.end); add(L.switchFrom); add(L.switchTo); Object.values(L.tracks || {}).forEach(a => a.forEach(add)); });
    (s.dialogues || []).forEach(d => add(d.at));
    return c;
  }

  // 移動節點：ripple＝後面的節點與本幕長度一起順延；否則限制在前後節點之間
  function setMarkerTime(p, si, mi, newT, ripple) {
    const s = p.scenes[si];
    const ms = s.markers;
    const prev = mi > 0 ? ms[mi - 1].t : 0;
    newT = Math.max(prev, Math.round(newT));
    if (!ripple) {
      const next = mi < ms.length - 1 ? ms[mi + 1].t : s.durationMs;
      newT = Math.min(newT, next);
      ms[mi].t = newT;
      return;
    }
    const delta = newT - ms[mi].t;
    for (let j = mi; j < ms.length; j++) ms[j].t += delta;
    s.durationMs = Math.max(ms[ms.length - 1].t + 10, s.durationMs + delta);
  }

  function scaleScene(s, f) {
    const R = v => Math.round(v * f);
    (s.markers || []).forEach(m => { m.t = R(m.t); });
    s.durationMs = Math.max(10, R(s.durationMs));
    const sr = r => { if (r && typeof r === 'object') r.o = R(r.o || 0); };
    Object.values(s.tracks || {}).forEach(a => a.forEach(sr));
    Object.values((s.camera && s.camera.tracks) || {}).forEach(a => a.forEach(sr));
    (s.layers || []).forEach(L => { sr(L.start); sr(L.end); sr(L.switchFrom); sr(L.switchTo); Object.values(L.tracks || {}).forEach(a => a.forEach(sr)); });
    (s.dialogues || []).forEach(d => { sr(d.at); if (d.autoMs) d.autoMs = R(d.autoMs); });
  }

  function addMarkerAtPlayhead(si) {
    const local = Math.round(playheadLocal(si));
    edit(p => {
      const s = p.scenes[si];
      s.markers = s.markers || [];
      let id = 'm1', n = 1;
      while (s.markers.some(m => m.id === id)) id = 'm' + (++n);
      s.markers.push({ id, label: `節點 ${n}`, t: Math.min(local, s.durationMs) });
      s.markers.sort((a, b) => a.t - b.t);
    });
    toast('已在播放頭新增節點');
  }

  function moveLayer(p, si, li, dir) {
    const a = p.scenes[si].layers;
    const j = li + dir;
    if (j < 0 || j >= a.length) return;
    [a[li], a[j]] = [a[j], a[li]];
  }

  /* ---------- 軌道（選到關鍵影格或軌道名稱） ---------- */
  function trackPanel(s) {
    const d = { si: s.si, scope: s.scope, track: s.track, layerId: s.layerId };
    const scene = state.project.scenes[s.si];
    const meta = TRACK_META[s.scope][s.track] || { label: s.track };
    const where = s.scope === 'cam' ? '鏡頭' : s.scope === 'layer' ? `圖層「${(scene.layers.find(l => l.id === s.layerId) || {}).name || s.layerId}」` : '特效';
    return el('div', {},
      el('div', { class: 'p-title' }, meta.label),
      el('div', { class: 'p-sub' }, `Scene ${String(s.si + 1).padStart(2, '0')}｜${scene.name} · ${where}`),
      // v0.3.1：鏡頭的四條軌道畫在同一列，同一時間的菱形會重疊 → 提供切換按鈕
      s.scope === 'cam' ? el('div', { class: 'row-btns' }, ['x', 'y', 'scale', 'rotation'].map(k => el('button', {
        class: 'sb' + (k === s.track ? ' on' : ''), onclick: () => select({ kind: 'track', si: s.si, scope: 'cam', track: k }) }, TRACK_META.cam[k].label))) : null,
      trackEditor(d, { noTitle: true }),
      hint('時間軸上可以直接拖曳菱形調整時間（每次 10ms；按住 Shift 為 100ms）。關鍵影格掛在「節點」上，移動節點時會一起移動。'),
      el('div', { class: 'row-btns' }, el('button', { class: 'sb', onclick: () => select({ kind: 'scene', si: s.si }) }, '← 回到本幕設定')));
  }

  /* ---------- 圖層 ---------- */
  function layerPanel(si, id) {
    const p = state.project;
    const scene = p.scenes[si];
    const li = scene.layers.findIndex(l => l.id === id);
    const L = scene.layers[li];
    if (!L) return projectPanel();
    const up = fn => edit(pp => fn(pp.scenes[si].layers.find(l => l.id === id)));
    const assetOpts = Object.keys(p.assets).map(k => [k, p.assets[k].label || k]);
    const timeRef = (label, ref, key, fb) => {
      const t = refT(si, ref, fb);
      return numField(label, Math.round(t === Infinity ? scene.durationMs : t), v => up(l => {
        const local = Math.max(0, Math.min(scene.durationMs, v));
        if (key === 'end' && local >= scene.durationMs) delete l.end; else l[key] = refFromLocal(si, local);
      }), { step: 10, unit: 'ms（本幕時間）', int: true });
    };
    const common = [
      textField('圖層名稱', L.name, v => up(l => { l.name = v; })),
      checkField('顯示', L.visible !== false, v => up(l => { l.visible = v; })),
      timeRef('出現時間', L.start, 'start', 0),
      timeRef('消失時間', L.end, 'end', Infinity),
    ];
    let body;
    if (L.type === 'swapPair') {
      const [nA, nB] = swapLabels(L);
      const bed = isBedPair(L);
      const vb = v => el('button', { class: 'sb' + (player.swapView === v ? ' on' : ''), onclick: () => { player.setSwapView(v); if (v !== 'play') player.seek(seg(si).start + refT(si, L.switchFrom, 0) - 1); renderProps(); } },
        ({ A: `顯示 ${nA}`, B: `顯示 ${nB}`, overlay: `${nA}／${nB} 疊圖對位`, play: '回到正常播放' })[v]);
      const al = L.bAlign;
      body = [
        el('div', { class: 'p-sec' }, el('div', { class: 'p-h' }, '對位檢查'), el('div', { class: 'row-btns' }, ['A', 'B', 'overlay', 'play'].map(vb)),
          hint(bed ? `疊圖對位＝${nA} 上面疊半透明 ${nB}。床架以 9 個床架地標對齊（不是對齊人物頭部）；2B 的床橫向比 2A 寬約 3%，殘留 2～6px 的差異屬於素材本身，程式沒有也不會修改原圖。`
            : `疊圖對位＝${nA} 上面疊半透明 ${nB}。兩張是不同姿勢，以身體（皮帶中央、鞋底高度）對齊；頭部位置不同是姿勢本身的差異。`)),
        el('div', { class: 'p-sec' }, el('div', { class: 'p-h' }, '素材與切換（疊化）'),
          selectField(`素材 ${nA}`, L.assetA, assetOpts, v => up(l => { l.assetA = v; })),
          selectField(`素材 ${nB}`, L.assetB, assetOpts, v => up(l => { l.assetB = v; })),
          timeRef('疊化開始', L.switchFrom, 'switchFrom', 0),
          timeRef('疊化結束', L.switchTo, 'switchTo', 0),
          selectField('疊化方式', MC.XF_MODES.includes(L.crossfade) ? L.crossfade : 'legacy', XF_OPTIONS, v => up(l => { l.crossfade = v; })),
          hint(`真正交叉淡化：${nA} 由 1 淡到 0、${nB} 由 0 淡到 1，在同一段時間同步進行，兩張相加剛好不透明（不會透出背景）。疊化開始／結束掛在本幕「節拍」的節點上；要改停留時間或疊化長度，請到本幕「節拍」調整，後面會自動順延。`)),
        el('div', { class: 'p-sec' }, el('div', { class: 'p-h' }, '人物淡入／淡出（關鍵影格）'),
          trackEditor({ si, scope: 'layer', layerId: id, track: 'opacity' })),
        el('div', { class: 'p-sec' }, el('div', { class: 'p-h' }, `${bed ? '人物＋床組' : '人物'}定位（${nA}、${nB} 共用）`),
          numField('縮放 Scale', L.foregroundScale, v => up(l => { l.foregroundScale = v; }), { step: 0.005, hint: `${nA} 圖寬 ÷ 舞台寬` }),
          numField('X', L.foregroundX, v => up(l => { l.foregroundX = v; }), { step: 0.002 }),
          numField('Y', L.foregroundY, v => up(l => { l.foregroundY = v; }), { step: 0.002 }),
          numField('錨點 X', L.foregroundAnchorX, v => up(l => setSwapAnchor(l, 'X', v)), { step: 0.002 }),
          numField('錨點 Y', L.foregroundAnchorY, v => up(l => setSwapAnchor(l, 'Y', v)), { step: 0.002 }),
          hint(bed ? '錨點＝縮放時固定不動的點（預設是床前側兩隻床腳著地點的中間）。改錨點時畫面位置保持不動。'
            : '錨點＝縮放時固定不動的點（預設是皮帶中央）。X／Y＝這個點在畫面上的位置（0～1）。改錨點時畫面位置保持不動。')),
        el('details', { class: 'p-sec' }, el('summary', {}, `進階：${nB} → ${nA} 對位換算（bAlign）`),
          hint(`${nB} 圖上的點 (u,v) → ${nA} 圖上 (u×scale + x, v×scale + y)。這組數值是量測出來的，一般不需要改。`),
          numField('scale', al.scale, v => up(l => { l.bAlign.scale = v; }), { step: 0.0005 }),
          numField('x', al.x, v => up(l => { l.bAlign.x = v; }), { step: 0.1, unit: `${nA} 原圖 px` }),
          numField('y', al.y, v => up(l => { l.bAlign.y = v; }), { step: 0.1, unit: `${nA} 原圖 px` })),
        el('div', { class: 'p-sec' }, el('div', { class: 'p-h' }, '光影（預設不改動素材）'),
          bed ? numField('接地陰影', L.shadow.opacity, v => up(l => { l.shadow.opacity = v; }), { step: 0.01, hint: '0＝關閉' }) : null,
          numField('亮度', (L.look || {}).brightness ?? 1, v => up(l => { l.look = l.look || {}; l.look.brightness = v; }), { step: 0.01 }),
          numField('飽和度', (L.look || {}).saturate ?? 1, v => up(l => { l.look = l.look || {}; l.look.saturate = v; }), { step: 0.01 }),
          numField('色溫偏暖', (L.look || {}).warmth ?? 0, v => up(l => { l.look = l.look || {}; l.look.warmth = v; }), { step: 0.01, hint: '0～0.3' }),
          numField('不透明度', (L.look || {}).opacity ?? 1, v => up(l => { l.look = l.look || {}; l.look.opacity = v; }), { step: 0.01 })),
      ];
    } else if (L.type === 'poseSeq') {
      const poses = L.poses || [];
      const pv = i => el('button', { class: 'sb' + ((player.poseView ?? null) === i ? ' on' : ''), onclick: () => { player.setPoseView(i); renderProps(); } },
        i == null ? '回到正常播放' : `只看 ${poses[i].label || '姿勢' + (i + 1)}`);
      body = [
        el('div', { class: 'p-sec' }, el('div', { class: 'p-h' }, '姿勢（依時間順序）'),
          hint('同一個人物依時間換姿勢，共用下方的位置／縮放軌道，所以換圖時不會跳位。位置 X／Y＝腳底在畫面上的位置；縮放＝人物身高 ÷ 舞台高度（每張圖用自己的「人物頂端～腳底」換算，人物大小一致）。'),
          poses.map((q, qi) => el('details', { class: 'p-sec', open: qi === 0 }, el('summary', {}, `${qi + 1}. ${q.label || ''}（${(p.assets[q.asset] || {}).label || q.asset}）`),
            textField('名稱', q.label || '', v => up(l => { l.poses[qi].label = v; })),
            selectField('圖片', q.asset, assetOpts, v => up(l => { l.poses[qi].asset = v; })),
            numField('腳底 X（原圖 px）', q.footX, v => up(l => { l.poses[qi].footX = v; }), { step: 1 }),
            numField('腳底 Y（原圖 px）', q.footY, v => up(l => { l.poses[qi].footY = v; }), { step: 1 }),
            numField('人物頂端（原圖 px）', q.figTop, v => up(l => { l.poses[qi].figTop = v; }), { step: 1 }),
            numField('人物底端（原圖 px）', q.figBottom, v => up(l => { l.poses[qi].figBottom = v; }), { step: 1 }),
            numField('大小微調', q.scaleAdj ?? 1, v => up(l => { l.poses[qi].scaleAdj = v; }), { step: 0.005, hint: '1＝依身高自動一致；姿勢本身比較高／矮時可微調' }),
            numField('位置微調 X', q.dx || 0, v => up(l => { l.poses[qi].dx = v; }), { step: 0.002, unit: '舞台寬度比例' }),
            numField('位置微調 Y', q.dy || 0, v => up(l => { l.poses[qi].dy = v; }), { step: 0.002, unit: '舞台高度比例' }))),
          el('div', { class: 'row-btns' }, poses.map((_, i) => pv(i)), pv(null))),
        el('div', { class: 'p-sec' }, el('div', { class: 'p-h' }, '換姿勢（交叉淡化）'),
          (L.switches || []).map((sw, j) => el('div', {},
            el('div', { class: 'p-h', style: 'font-size:12px' }, `${poses[j] ? poses[j].label : j + 1} → ${poses[j + 1] ? poses[j + 1].label : j + 2}`),
            numField('開始', Math.round(refT(si, sw.from, 0)), v => up(l => { l.switches[j].from = refFromLocal(si, Math.max(0, Math.min(scene.durationMs, v))); }), { step: 10, unit: 'ms（本幕時間）', int: true }),
            numField('結束', Math.round(refT(si, sw.to, 0)), v => up(l => { l.switches[j].to = refFromLocal(si, Math.max(0, Math.min(scene.durationMs, v))); }), { step: 10, unit: 'ms（本幕時間）', int: true }))),
          selectField('疊化方式', MC.XF_MODES.includes(L.crossfade) ? L.crossfade : 'dissolve', XF_OPTIONS, v => up(l => { l.crossfade = v; })),
          hint('換姿勢的時間通常掛在本幕「節拍」的節點上；在節拍表調整長度時會一起順延。')),
        el('div', { class: 'p-sec' }, el('div', { class: 'p-h' }, '位置與外觀'),
          trackedField(L, 'x', '腳底位置 X', 0.5, 0.005, 'add', up),
          trackedField(L, 'y', '腳底位置 Y', 0.9, 0.005, 'add', up),
          trackedField(L, 'scale', '人物身高（÷ 舞台高）', 0.4, 0.005, 'mul', up),
          trackedField(L, 'opacity', '透明度', 1, 0.05, 'add', up),
          trackedField(L, 'blur', '模糊', 0, 0.0005, 'add', up, '舞台高度比例')),
        el('details', { class: 'p-sec' }, el('summary', {}, '走路起伏（對話暫停劇情時仍會繼續）'),
          numField('上下起伏', (L.sway && L.sway.y) || 0, v => up(l => { l.sway = l.sway || { periodMs: 1000, relative: true }; l.sway.y = v; }), { step: 0.001, hint: '人物身高的比例（勾「跟著人物大小」時）' }),
          numField('左右擺動', (L.sway && L.sway.x) || 0, v => up(l => { l.sway = l.sway || { periodMs: 1000, relative: true }; l.sway.x = v; }), { step: 0.001 }),
          numField('傾斜', (L.sway && L.sway.rot) || 0, v => up(l => { l.sway = l.sway || { periodMs: 1000, relative: true }; l.sway.rot = v; }), { step: 0.1, unit: '度' }),
          numField('一步的時間', (L.sway && L.sway.periodMs) || 0, v => up(l => { l.sway = l.sway || { relative: true }; l.sway.periodMs = v; }), { step: 50, unit: 'ms（0＝關閉）', int: true }),
          checkField('幅度跟著人物大小', !!(L.sway && L.sway.relative), v => up(l => { l.sway = l.sway || { periodMs: 1000 }; l.sway.relative = v; }))),
        el('div', { class: 'p-sec' }, el('div', { class: 'p-h' }, '圖層動畫（關鍵影格）'),
          POSE_TRACKS.map(k => trackEditor({ si, scope: 'layer', layerId: id, track: k }))),
      ];
    } else {
      body = [
        el('div', { class: 'p-sec' }, el('div', { class: 'p-h' }, '素材'),
          selectField('圖片', L.asset, assetOpts, v => up(l => { l.asset = v; })),
          selectField('用途', L.role, ROLE_OPTIONS, v => up(l => {
            l.role = v;
            if (v !== 'background') ['x', 'y', 'scale'].forEach(k => { if (l[k] == null) l[k] = { x: 0.5, y: 0.5, scale: 1 }[k]; });
            if (v !== 'background') { if (l.anchorX == null) l.anchorX = 0.5; if (l.anchorY == null) l.anchorY = 0.5; }
          }))),
        L.role === 'background' ? el('div', { class: 'p-sec' },
          numField('不透明度', L.opacity ?? 1, v => up(l => { l.opacity = v; }), { step: 0.05 }),
          hint('背景圖以原始比例填滿舞台（同第一、二幕）。背景模糊與曝光由本幕的特效軌道控制。'),
          trackEditor({ si, scope: 'layer', layerId: id, track: 'opacity' }))
          : el('div', { class: 'p-sec' }, el('div', { class: 'p-h' }, '位置與外觀'),
            hint('若這個數值已有關鍵影格（例如窗外慢推），這裡顯示「第一格」的數值；修改時會把整條關鍵影格一起平移（位置）或等比例調整（縮放），運鏡的幅度與節奏不變。'),
            trackedField(L, 'x', '位置 X', 0.5, 0.005, 'add', up),
            trackedField(L, 'y', '位置 Y', 0.5, 0.005, 'add', up),
            trackedField(L, 'scale', '縮放（推拉值）', 0.4, 0.005, 'mul', up, '圖寬 ÷ 舞台寬，保持原圖比例'),
            numField('錨點 X', L.anchorX ?? 0.5, v => up(l => { l.anchorX = v; }), { step: 0.01 }),
            numField('錨點 Y', L.anchorY ?? 1, v => up(l => { l.anchorY = v; }), { step: 0.01 }),
            trackedField(L, 'opacity', '透明度', 1, 0.05, 'add', up),
            trackedField(L, 'rotation', '旋轉', 0, 0.5, 'add', up, '度'),
            trackedField(L, 'blur', '模糊', 0, 0.0005, 'add', up, '舞台高度比例')),
        L.role !== 'background' ? el('details', { class: 'p-sec' }, el('summary', {}, '裝飾動畫（對話暫停劇情時仍會繼續）'),
          numField('飄動 X', (L.sway && L.sway.x) || 0, v => up(l => { l.sway = l.sway || { periodMs: 4000 }; l.sway.x = v; }), { step: 0.001 }),
          numField('飄動 Y', (L.sway && L.sway.y) || 0, v => up(l => { l.sway = l.sway || { periodMs: 4000 }; l.sway.y = v; }), { step: 0.001 }),
          numField('擺動角度', (L.sway && L.sway.rot) || 0, v => up(l => { l.sway = l.sway || { periodMs: 4000 }; l.sway.rot = v; }), { step: 0.1 }),
          numField('週期', (L.sway && L.sway.periodMs) || 0, v => up(l => { l.sway = l.sway || {}; l.sway.periodMs = v; }), { step: 100, unit: 'ms', int: true }),
          hint('適合雲朵、光影等裝飾。0＝關閉。')) : null,
        L.role !== 'background' ? el('div', { class: 'p-sec' }, el('div', { class: 'p-h' }, '圖層動畫（關鍵影格）'),
          ['x', 'y', 'scale', 'opacity', 'rotation', 'blur'].map(k => trackEditor({ si, scope: 'layer', layerId: id, track: k }))) : null,
      ];
    }
    return el('div', {},
      el('div', { class: 'p-title' }, L.name || L.id),
      el('div', { class: 'p-sub' }, `Scene ${String(si + 1).padStart(2, '0')}｜${scene.name} · ${roleLabel(L)} · 第 ${li + 1} 層`),
      common, body,
      el('div', { class: 'p-sec' }, el('div', { class: 'row-btns' },
        el('button', { class: 'sb', disabled: li === 0, onclick: () => edit(pp => moveLayer(pp, si, li, -1)) }, '↓ 往下層'),
        el('button', { class: 'sb', disabled: li === scene.layers.length - 1, onclick: () => edit(pp => moveLayer(pp, si, li, 1)) }, '↑ 往上層'),
        el('button', { class: 'sb danger', onclick: () => edit(pp => { pp.scenes[si].layers.splice(li, 1); state.sel = { kind: 'scene', si }; }) }, '刪除圖層'),
        el('button', { class: 'sb', onclick: () => select({ kind: 'scene', si }) }, '← 本幕設定'))));
  }

  // 有關鍵影格的屬性：欄位顯示第一格；修改時整條一起平移（add）或等比例（mul）
  function trackedField(L, key, label, def, step, mode, up, unit) {
    const arr = L.tracks && L.tracks[key];
    const has = arr && arr.length;
    const cur = has ? arr[0].v : (L[key] ?? def);
    return numField(label + (has ? `（${arr.length} 格關鍵影格）` : ''), cur, v => up(l => {
      const a = l.tracks && l.tracks[key];
      if (a && a.length) {
        const base = a[0].v;
        if (mode === 'mul' && base !== 0) a.forEach(k => { k.v = +(k.v * v / base).toFixed(5); });
        else a.forEach(k => { k.v = +(k.v + (v - base)).toFixed(5); });
      }
      l[key] = v;
    }), { step, unit });
  }

  // 把新版內建專案中，使用者版本沒有的「正式幕次」與素材加進來（目前用於第三幕）
  function mergeNewScenes(mine, builtin) {
    Object.entries(builtin.assets || {}).forEach(([id, a]) => { if (!mine.assets[id]) mine.assets[id] = a; });
    // v0.3.0：舊的空白草稿幕（例如舊的 intro_scene04）已被正式幕取代 → 移除（只移除「沒有任何圖層、新版也沒有這個 id」的幕）
    mine.scenes = mine.scenes.filter(s => (s.layers || []).length || builtin.scenes.some(b => b.id === s.id));
    builtin.scenes.forEach((bs, bi) => {
      if (bs.status !== 'ready') return;
      const mi = mine.scenes.findIndex(s => s.id === bs.id);
      const mineHasLayers = mi >= 0 && (mine.scenes[mi].layers || []).length > 0;
      if (mineHasLayers) return;                     // 使用者已經自己做過這一幕：不覆蓋
      if (mi >= 0) mine.scenes[mi] = bs; else mine.scenes.splice(Math.min(bi, mine.scenes.length), 0, bs);
    });
    mine.contentVersion = builtin.contentVersion;
    return mine;
  }

  // v0.3.1：用新版內建專案「替換」指定的幕次（保留使用者其他幕次的修改）；缺少的正式幕次一併加入
  function mergeUpdatedScenes(mine, builtin, ids) {
    mine = mergeNewScenes(mine, builtin);
    Object.entries(builtin.assets || {}).forEach(([id, a]) => { mine.assets[id] = mine.assets[id] || a; });
    ids.forEach(id => {
      const bs = builtin.scenes.find(s => s.id === id); if (!bs) return;
      const mi = mine.scenes.findIndex(s => s.id === id);
      if (mi >= 0) mine.scenes[mi] = clone(bs);
      else mine.scenes.splice(Math.min(builtin.scenes.indexOf(bs), mine.scenes.length), 0, clone(bs));
    });
    mine.contentVersion = builtin.contentVersion;
    return mine;
  }
  const V031_UPDATED = ['intro_scene02', 'intro_scene04a', 'intro_scene04b', 'intro_scene05'];

  function setSwapAnchor(l, axis, value) {
    const W = player.view.W || 1, H = player.view.H || 1;
    const A = player.assetSize(l.assetA);
    const fw = W * l.foregroundScale, fh = A.h * fw / A.w;
    if (axis === 'X') {
      const left = W * l.foregroundX - fw * l.foregroundAnchorX;
      l.foregroundAnchorX = value;
      l.foregroundX = +((left + fw * value) / W).toFixed(4);
    } else {
      const top = H * l.foregroundY - fh * l.foregroundAnchorY;
      l.foregroundAnchorY = value;
      l.foregroundY = +((top + fh * value) / H).toFixed(4);
    }
  }

  /* ---------- 對話 ---------- */
  function dialoguePanel(si, id) {
    const scene = state.project.scenes[si];
    const di = (scene.dialogues || []).findIndex(d => d.id === id);
    const d = scene.dialogues[di];
    if (!d) return projectPanel();
    const up = fn => edit(pp => fn(pp.scenes[si].dialogues.find(x => x.id === id)));
    const local = refT(si, d.at, 0);
    const typeMs = Array.from(d.text).length * (d.charMs || 45);
    return el('div', {},
      el('div', { class: 'p-title' }, '對話事件'),
      el('div', { class: 'p-sub' }, `Scene ${String(si + 1).padStart(2, '0')}｜${scene.name}`),
      textField('事件 ID', d.id, v => {
        v = v.trim();
        if (!v || state.project.scenes.some(s => (s.dialogues || []).some(x => x.id === v && x !== d))) { toast('事件 ID 不能空白或重複'); renderProps(); return; }
        up(x => { x.id = v; }); state.sel.id = v;
      }),
      selectField('所屬幕次', String(si), state.project.scenes.map((s, i) => [String(i), `Scene ${String(i + 1).padStart(2, '0')}｜${s.name}`]), v => {
        const ni = parseInt(v, 10);
        if (ni === si) return;
        edit(pp => {
          const [x] = pp.scenes[si].dialogues.splice(di, 1);
          x.at = { m: 'start', o: Math.min(local, pp.scenes[ni].durationMs) };
          (pp.scenes[ni].dialogues = pp.scenes[ni].dialogues || []).push(x);
          state.sel = { kind: 'dialogue', si: ni, id };
        });
      }),
      textField('角色名稱', d.speaker, v => up(x => { x.speaker = v; })),
      textField('對話文字', d.text, v => up(x => { x.text = v; }), { area: true }),
      selectField('時間節點', (d.at && d.at.m) || 'start', markerOptions(si), v => up(x => {
        const keep = refT(si, x.at, 0);
        x.at = { m: v, o: Math.round(keep - MC.markerTimes(scene)[v]) };
      })),
      numField('偏移', (d.at && d.at.o) || 0, v => up(x => { x.at = { m: (x.at && x.at.m) || 'start', o: Math.round(v) }; }), { step: 100, unit: 'ms', int: true }),
      hint(`實際出現：本幕 ${sec(local)}（整段 ${fmt(seg(si).start + local)}）。也可以在時間軸「對話」列直接拖曳。`),
      selectField('對話模式', d.mode, [['wait', 'A．等待玩家繼續（暫停劇情）'], ['auto', 'B．自動播放（時間到自動消失）']], v => up(x => { x.mode = v; })),
      d.mode === 'auto' ? numField('停留時間', d.autoMs || 0, v => up(x => { x.autoMs = Math.max(0, v); }), { step: 100, unit: 'ms（0＝到本幕結束）', int: true }) : null,
      selectField('對話框樣式', d.styleType || 'rpg_box_no_portrait', MC.DIALOG_STYLES.map(v => [v, { rpg_box_no_portrait: 'RPG 對話框（無半身像）' }[v] || v]), v => up(x => { x.styleType = v; })),
      numField('逐字速度', d.charMs || 45, v => up(x => { x.charMs = Math.max(1, v); }), { step: 5, unit: 'ms／字', int: true }),
      hint(`整句打完約 ${sec(typeMs)}。`),
      selectField('結束後', d.after || 'resume', [['resume', '繼續劇情'], ['stop', '停止播放（停在這裡）']], v => up(x => { x.after = v; })),
      checkField('啟用', d.enabled !== false, v => up(x => { x.enabled = v; })),
      checkField('草稿', !!d.draft, v => up(x => { x.draft = v; })),
      hint('等待型對話：只在「正式播放預覽」與正式播放頁會暫停劇情；拖曳播放頭或「時間軸編輯預覽」只顯示、不暫停。'),
      dialogueAudioSection(d),
      el('div', { class: 'row-btns' },
        el('button', { class: 'sb', onclick: () => { player.seek(seg(si).start + local); } }, '跳到這句'),
        el('button', { class: 'sb', onclick: () => testDialogue(si, local) }, '正式播放測試這句'),
        el('button', { class: 'sb danger', onclick: () => edit(pp => { pp.scenes[si].dialogues.splice(di, 1); state.sel = { kind: 'scene', si }; }) }, '刪除'),
        el('button', { class: 'sb', onclick: () => select({ kind: 'scene', si }) }, '← 本幕設定')));
  }

  function testDialogue(si, local) {
    $('modeSel').value = 'play';
    player.setMode('play');
    state.range = 'all'; $('rangeSel').value = 'all'; applyRange();
    player.seek(Math.max(seg(si).start, seg(si).start + local - 800));
    player.play();
  }

  function addDialogue(si) {
    const local = playheadLocal(si);
    let n = 1, id;
    do { id = `${state.project.scenes[si].id}_d${n++}`; } while (state.project.scenes.some(s => (s.dialogues || []).some(d => d.id === id)));
    edit(p => {
      const s = p.scenes[si];
      (s.dialogues = s.dialogues || []).push({ id, speaker: '小V', text: '（請輸入台詞）', at: refFromLocal(si, local),
        mode: 'wait', autoMs: 2500, charMs: 60, after: 'resume', enabled: true, styleType: 'rpg_box_no_portrait' });
      state.sel = { kind: 'dialogue', si, id };
    });
  }

  /* ===================== 圖片匯入 ===================== */
  let pendingImport = null;
  function importImage(target) {
    pendingImport = target;
    $('imageInput').value = '';
    $('imageInput').click();
  }
  $('imageInput').addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { toast('只支援 PNG、JPG、WebP'); return; }
    const url = URL.createObjectURL(file);
    let w = 0, h = 0;
    try { const img = await loadImg(url); w = img.naturalWidth; h = img.naturalHeight; } catch (_) { toast('圖片無法讀取'); return; }
    const base = file.name.replace(/\.[^.]+$/, '').replace(/[^\w\-]+/g, '_').slice(0, 40) || 'image';
    let id = base, n = 2;
    while (state.project.assets[id]) id = `${base}_${n++}`;
    const target = pendingImport;
    edit(p => {
      p.assets[id] = { src: url, label: file.name, width: w, height: h, local: true, fileName: file.name };
      if (target) addImageLayer(p, target.si, id, target.role);
    }, { loadAssets: true });
    toast(target ? `已加入「${file.name}」到 Scene ${String(target.si + 1).padStart(2, '0')}` : `已匯入「${file.name}」到素材庫`);
  });
  function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }

  function addImageLayer(p, si, assetId, role) {
    const s = p.scenes[si];
    s.layers = s.layers || [];
    const a = p.assets[assetId];
    const L = { id: uid('ly'), name: a.label || assetId, type: 'image', role, asset: assetId, visible: true, tracks: {} };
    if (role === 'character') Object.assign(L, { x: 0.5, y: 0.95, anchorX: 0.5, anchorY: 1, scale: 0.35, opacity: 1, rotation: 0 });
    if (role === 'foreground') Object.assign(L, { x: 0.5, y: 0.5, anchorX: 0.5, anchorY: 0.5, scale: 0.3, opacity: 1, rotation: 0 });
    if (role === 'far') Object.assign(L, { x: 0.5, y: 0.5, anchorX: 0.5, anchorY: 0.5, scale: 1.05, opacity: 1, rotation: 0 });
    if (role === 'background') s.layers.unshift(L); else s.layers.push(L);
    if (!s.status || s.status === 'draft') s.status = 'draft';
    state.sel = { kind: 'layer', si, layerId: L.id };
  }

  function addLayerFromLibrary(si) {
    const p = state.project;
    const ids = Object.keys(p.assets);
    const body = el('div', {}, hint('選擇素材與用途：'));
    let role = 'character';
    const roleSel = el('select', {}, ROLE_OPTIONS.map(([v, t]) => el('option', { value: v, selected: v === role }, t)));
    roleSel.addEventListener('change', () => { role = roleSel.value; });
    body.append(el('div', { class: 'f' }, el('label', {}, '用途'), roleSel));
    ids.forEach(id => body.append(el('div', { class: 'asset-row' },
      player.assetState[id] && player.assetState[id].ok ? el('img', { src: player.assetState[id].src }) : el('div', {}),
      el('div', { class: 'an' }, p.assets[id].label || id),
      el('button', { class: 'sb', onclick: () => { $('modal').hidden = true; edit(pp => addImageLayer(pp, si, id, role)); } }, '加入'))));
    modal('從素材庫加入圖層', body, [{ label: '取消' }]);
  }

  let relinkTarget = null;
  function relinkAsset(id) { relinkTarget = id; $('relinkInput').value = ''; $('relinkInput').click(); }
  $('relinkInput').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (!file || !relinkTarget) return;
    const id = relinkTarget;
    const url = URL.createObjectURL(file);
    edit(p => { Object.assign(p.assets[id], { src: url, local: true, fileName: file.name }); }, { loadAssets: true });
    toast(`已重新連結「${p_label(id)}」`);
  });
  const p_label = id => (state.project.assets[id] && state.project.assets[id].label) || id;

  function reportMissingAssets() {
    const bad = player.assetReport().filter(r => !r.ok);
    if (!bad.length) return;
    modal('有素材需要重新連結', el('div', {},
      el('p', {}, '以下圖片目前讀不到（常見原因：匯出時是臨時本機圖片，或檔案不在 assets 資料夾）。第一、二幕以外的場景不會因此無法播放。'),
      el('ul', {}, bad.map(b => el('li', { class: 'warn' }, `${b.label}：${String(b.src).startsWith('blob:') ? '（已失效的臨時檔案）' : b.src}`))),
      el('p', {}, '請到「專案與素材管理」按「重新連結」，或把檔案放進 motion-comic/assets/ 後重新整理。')));
  }

  /* ===================== 匯入／匯出／儲存 ===================== */
  async function exportProject() {
    const p = clone(state.project);
    p.editorVersion = EDITOR_VERSION;
    p.exportedAt = new Date().toISOString();
    const locals = Object.entries(p.assets).filter(([, a]) => a.local || String(a.src).startsWith('blob:'));
    const aLocals = Object.keys(aud.localFiles).filter(id => p.audio && p.audio.assets && p.audio.assets[id]);
    const aBad = aud.assetReport().filter(r => r.status === 'error' && !aud.localFiles[r.id]);
    const body = el('div', {},
      el('p', {}, '會匯出完整專案（全部場景、節點、關鍵影格、圖層、對話、第一幕特殊參數、第二幕對位與陰影設定、v0.3.2 音訊設定）。'),
      aLocals.length ? el('div', {}, el('p', { class: 'hint warn' }, `有 ${aLocals.length} 個音檔只在這台電腦預覽，GitHub 上還沒有。請把下列檔案上傳到 GitHub 的 motion-comic/assets/（JSON 內已寫好路徑）：`),
        el('ul', {}, aLocals.map(id => el('li', {}, `${aud.localFiles[id].name} → ${p.audio.assets[id].src}`)))) : null,
      aBad.length ? el('div', {}, el('p', { class: 'hint warn' }, `有 ${aBad.length} 個音檔目前讀不到（正式播放時這些聲音會略過，畫面照常）：`),
        el('ul', {}, aBad.map(r => el('li', {}, `${r.label}（${r.src}）：${r.error}`)))) : null,
      locals.length ? el('div', {}, el('p', { class: 'hint warn' }, `有 ${locals.length} 張臨時本機圖片：`),
        el('ul', {}, locals.map(([id, a]) => el('li', {}, `${a.label || id}（${a.fileName || ''}）`)))) : null);
    let embed = false;
    if (locals.length) {
      const c = el('input', { type: 'checkbox' });
      c.addEventListener('change', () => { embed = c.checked; });
      body.append(el('label', {}, c, ' 把這些圖片直接嵌入 JSON（檔案會變大，但重新匯入後不必重新連結）'),
        el('p', { class: 'hint' }, '不勾選時，JSON 會把路徑寫成 assets/檔名；請把圖片檔複製到 motion-comic/assets/ 資料夾，正式播放器才讀得到。'));
    }
    modal('匯出 JSON', body, [{ label: '取消' }, { label: '下載 JSON', fn: async () => {
      for (const [id, a] of locals) {
        if (embed) {
          try { a.src = await blobToDataURL(state.project.assets[id].src); } catch (_) { a.src = 'assets/' + (a.fileName || id + '.png'); }
        } else a.src = 'assets/' + (a.fileName || id + '.png');
        delete a.local;
      }
      const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
      const a = el('a', { href: URL.createObjectURL(blob), download: `${p.projectId || 'motion-comic'}.json` });
      document.body.append(a); a.click(); a.remove();
      toast('已下載 JSON');
    } }]);
  }
  async function blobToDataURL(url) {
    const b = await (await fetch(url)).blob();
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
  }

  $('importInput').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      let p;
      try { p = JSON.parse(r.result); } catch (err) { modal('無法匯入', `<p class="hint err">這不是有效的 JSON 檔：${escapeHtml(err.message)}</p>`); return; }
      const v = MC.validateProject(p);
      if (v.errors.length) {
        modal('專案格式錯誤，未匯入', el('div', {}, el('p', {}, '目前的專案沒有被改動。請修正以下問題：'), el('ul', {}, v.errors.map(x => el('li', { class: 'err' }, x)))));
        return;
      }
      pushUndo();
      state.sel = null;
      setProject(p, { reportAssets: true });
      if (v.warnings.length) modal('已匯入（有提醒）', el('ul', {}, v.warnings.map(x => el('li', { class: 'warn' }, x))));
      else toast(`已匯入「${p.title}」：${p.scenes.length} 幕`);
    };
    r.readAsText(file);
    e.target.value = '';
  });

  function save() {
    try {
      localStorage.setItem(LS_KEY, snapshot());
      localStorage.setItem(LS_META, JSON.stringify({ savedAt: new Date().toISOString(), editor: EDITOR_VERSION }));
      state.savedJSON = snapshot();
      updateTop();
      const locals = Object.values(state.project.assets).some(a => String(a.src).startsWith('blob:'));
      const aLoc = Object.keys(aud.localFiles).length;
      toast(locals ? '已儲存（臨時本機圖片重新開啟後需要重新連結）' : aLoc ? `已儲存（${aLoc} 個本機預覽音檔不會被儲存，請上傳到 GitHub 的 motion-comic/assets/）` : '已儲存到這台電腦的瀏覽器');
    } catch (err) {
      modal('儲存失敗', `<p class="hint err">瀏覽器空間不足或被封鎖：${escapeHtml(err.message)}</p><p>請改用「匯出 JSON」保存。</p>`);
    }
  }

  function resetToBaseline() {
    const go = (b, msg) => { pushUndo(); state.sel = null; setProject(clone(b)); player.seek(0); toast(msg); };
    modal('還原初始範例', '<p>選擇要還原的基準專案：</p><ul><li><b>v0.3.2（目前版本）</b>：畫面與 v0.3.1 完全相同，加上空的音訊設定（尚無任何音檔）。</li><li><b>v0.3.1（定點分鏡修正版）</b>：第一、三幕同 v0.3.0；第二幕放大＋兩句對話、第四幕定點分鏡、第五幕大幅張望；沒有音訊欄位。</li><li><b>v0.3.0（五幕完整初版）</b>：第四幕用人物位移的舊版本。</li><li><b>v0.2.0（含第三幕）</b>：第一、二幕成功版＋第三幕正式版＋第四、五幕空白結構。</li>' +
      '<li><b>v0.1.0</b>：只有第一、二幕成功版，第三～五幕是空白結構。</li></ul><p>目前的修改可以用「復原」找回；基準檔本身不會被改動。</p>',
      [{ label: '取消' },
       { label: '還原 v0.1.0', fn: () => go(state.baselineV1, '已還原 v0.1.0 基準') },
       { label: '還原 v0.2.0（含第三幕）', fn: () => go(state.baselineV2, '已還原 v0.2.0 基準（含第三幕）') },
       { label: '還原 v0.3.0', fn: () => go(state.baselineV3, '已還原 v0.3.0 基準') },
       { label: '還原 v0.3.1', fn: () => go(state.baselineV31, '已還原 v0.3.1 基準') },
       { label: '還原 v0.3.2（目前版本）', fn: () => go(state.baseline, '已還原 v0.3.2 基準') }]);
  }

  /* ===================== 範圍與播放 ===================== */
  function applyRange() {
    if (state.range === 'ready') player.setRange(player.rangeFor('ready'));
    else if (state.range === 'scene') player.setRange(player.rangeFor('scene', Math.min(state.rangeScene, state.project.scenes.length - 1)));
    else player.setRange(null);
  }

  /* ===================== 時間軸 ===================== */
  const tlEls = {};
  const LW = 112;   // 標籤欄寬度（同 CSS --label-w）
  const X = t => t / 1000 * state.zoom;
  const Tfrom = x => x / state.zoom * 1000;

  function renderTimeline() {
    const p = state.project;
    const tl = player.tl;
    if (!tl) return;
    const content = $('tlContent');
    const scroll = $('tlScroll');
    const keepLeft = scroll.scrollLeft, keepTop = scroll.scrollTop;
    content.innerHTML = '';
    const W = Math.max(X(tl.total) + 200, scroll.clientWidth - LW);
    content.style.width = (LW + W) + 'px';

    const row = (label, h, opts = {}) => {
      const lane = el('div', { class: 'tl-lane', style: `width:${W}px;height:${h}px` });
      const lab = el('div', { class: 'tl-label' + (opts.onLabel ? ' click' : ''), title: opts.title || '', onclick: opts.onLabel },
        opts.color ? el('i', { style: `background:${opts.color}` }) : null, label);
      const r = el('div', { class: 'tl-row' + (opts.cls ? ' ' + opts.cls : '') }, lab, lane);
      content.append(r);
      if (!opts.noSeek) lane.addEventListener('mousedown', e => { if (e.target === lane) scrubStart(e, lane); });
      return lane;
    };

    // 尺規
    const ruler = row('時間', 24, { cls: 'tl-ruler', noSeek: true });
    ruler.addEventListener('mousedown', e => scrubStart(e, ruler));
    const step = state.zoom >= 300 ? 100 : state.zoom >= 120 ? 500 : state.zoom >= 50 ? 1000 : 2000;
    for (let t = 0; t <= tl.total + step; t += step) {
      const major = t % (step * (step < 1000 ? 10 : 5)) === 0 || step >= 1000;
      ruler.append(el('div', { class: 'tick' + (major ? '' : ' minor'), style: `left:${X(t)}px` }, major ? el('span', {}, (t / 1000).toFixed(step < 1000 ? 1 : 0) + 's') : null));
    }

    // 幕次
    const sceneLane = row('幕次', 30);
    tl.segs.forEach(sg => {
      const i = sg.index, s = sg.scene;
      if (sg.start > sg.transStart) {
        sceneLane.append(el('div', { class: 'tl-trans', style: `left:${X(sg.transStart)}px;width:${Math.max(2, X(sg.start - sg.transStart))}px`,
          title: `轉場：${transLabel(sg.tr.type)}`, onclick: () => select({ kind: 'transition', si: i }) }, '淡黑'));
      }
      const st = player.sceneStatus(i);
      const cls = st.ready ? 'ready' : (st.hasLayers ? 'missing' : 'draft');
      const blk = el('div', { class: `tl-scene ${cls}${state.sel && state.sel.si === i && ['scene', 'transition'].includes(state.sel.kind) ? ' sel' : ''}`,
        style: `left:${X(sg.start)}px;width:${Math.max(4, X(sg.end - sg.start))}px`,
        title: `${s.name}（${sec(s.durationMs)}）`,
        onmousedown: e => { if (!e.target.classList.contains('rz')) { select({ kind: 'scene', si: i }); scrubStart(e, sceneLane); } } },
      el('b', {}, String(i + 1).padStart(2, '0')), s.name, !st.ready ? el('span', { style: 'opacity:.7' }, st.hasLayers ? '・缺素材' : '・尚未配置素材') : null,
      el('div', { class: 'rz', title: '拖曳調整本幕長度', onmousedown: e => dragSceneEnd(e, i) }));
      sceneLane.append(blk);
    });

    // 節拍
    const mLane = row('節拍', 26);
    tl.segs.forEach(sg => (sg.scene.markers || []).forEach((m, mi) => {
      const isSel = state.sel && state.sel.kind === 'marker' && state.sel.si === sg.index && state.sel.id === m.id;
      mLane.append(el('div', { class: 'tl-marker' + (isSel ? ' sel' : ''), style: `left:${X(sg.start + m.t)}px`, title: `${m.label || m.id}：本幕 ${sec(m.t)}（拖曳調整）`,
        onmousedown: e => dragMarker(e, sg.index, mi) }, el('span', {}, m.label || m.id)));
    }));

    // 圖層
    const lanes = Math.max(1, ...p.scenes.map(s => (s.layers || []).length));
    const lLane = row('圖層', lanes * 19 + 6);
    tl.segs.forEach(sg => {
      const c = player.scenes[sg.index] && player.scenes[sg.index].c;
      (sg.scene.layers || []).forEach((L, li) => {
        const lc = c && c.layers[li];
        if (!lc) return;
        const t0 = sg.start + Math.max(0, lc.startT), t1 = sg.start + Math.min(sg.scene.durationMs, lc.endT);
        const isSel = state.sel && state.sel.kind === 'layer' && state.sel.si === sg.index && state.sel.layerId === L.id;
        const roleCls = L.role === 'background' ? 'bg' : (L.role || 'character');   // far / character / foreground
        const bar = el('div', { class: `tl-bar ${roleCls}${L.visible === false ? ' hidden-layer' : ''}${isSel ? ' sel' : ''}`,
          style: `left:${X(t0)}px;width:${Math.max(4, X(t1 - t0))}px;top:${3 + (lanes - 1 - li) * 19}px`,
          title: `${L.name}（${roleLabel(L)}）`, onclick: () => select({ kind: 'layer', si: sg.index, layerId: L.id }) },
        L.name || L.id);
        if (L.type === 'swapPair' || L.type === 'poseSeq') {
          if (L.type === 'swapPair') bar.append(el('div', { class: 'sw', style: `left:${X(lc.switchT - Math.max(0, lc.startT))}px;width:${Math.max(2, X(lc.switchEndT - lc.switchT))}px`, title: `${swapLabels(L).join(' → ')} 切換` }));
          else (lc.switches || []).forEach(([a, b], j) => bar.append(el('div', { class: 'sw', style: `left:${X(a - Math.max(0, lc.startT))}px;width:${Math.max(2, X(b - a))}px`,
            title: `${((L.poses || [])[j] || {}).label || j + 1} → ${((L.poses || [])[j + 1] || {}).label || j + 2}` })));
          Object.keys(L.tracks || {}).forEach(k => (L.tracks[k] || []).forEach((kf, ki) => {
            const t = sg.start + MC.refTime(kf, c.mm, 0);
            bar.append(kfEl(t - t0, '#fff', { si: sg.index, scope: 'layer', layerId: L.id, track: k, idx: ki }, 'scale(.7) rotate(45deg)'));
          }));
        } else {
          bar.append(el('div', { class: 'eh l', onmousedown: e => dragLayerEdge(e, sg.index, L.id, 'start') }),
            el('div', { class: 'eh r', onmousedown: e => dragLayerEdge(e, sg.index, L.id, 'end') }));
          Object.keys(L.tracks || {}).forEach(k => (L.tracks[k] || []).forEach((kf, ki) => {
            const t = sg.start + MC.refTime(kf, c.mm, 0);
            bar.append(kfEl(t - t0, '#fff', { si: sg.index, scope: 'layer', layerId: L.id, track: k, idx: ki }, 'scale(.7) rotate(45deg)'));
          }));
        }
        lLane.append(bar);
      });
    });

    // 鏡頭
    const camLane = row('鏡頭', 24, { color: 'var(--c-camera)' });
    tl.segs.forEach(sg => {
      const ct = (sg.scene.camera && sg.scene.camera.tracks) || {};
      Object.keys(ct).forEach(k => (ct[k] || []).forEach((kf, ki) => {
        camLane.append(kfEl(sg.start + MC.refTime(kf, player.scenes[sg.index].c.mm, 0), TRACK_META.cam[k] ? TRACK_META.cam[k].color : '#fff',
          { si: sg.index, scope: 'cam', track: k, idx: ki }));
      }));
    });

    // 特效軌道
    FX_ROWS.forEach(k => {
      const meta = TRACK_META.fx[k];
      const lane = row(meta.label, 24, { color: meta.color, title: '點一下：編輯目前這一幕的這條軌道',
        onLabel: () => select({ kind: 'track', si: currentSceneIndex(), scope: 'fx', track: k }) });
      tl.segs.forEach(sg => {
        const arr = sg.scene.tracks && sg.scene.tracks[k];
        if (!arr || !arr.length) return;
        const comp = player.scenes[sg.index].c.tracks[k];
        lane.append(sparkline(comp, sg, meta.color));
        arr.forEach((kf, ki) => lane.append(kfEl(sg.start + MC.refTime(kf, player.scenes[sg.index].c.mm, 0), meta.color, { si: sg.index, scope: 'fx', track: k, idx: ki })));
      });
    });

    // 對話
    const dLane = row('對話', 26, { color: 'var(--c-dialog)' });
    const dl = [];
    tl.segs.forEach(sg => (sg.scene.dialogues || []).forEach(d => dl.push({ d, si: sg.index, t: sg.start + MC.refTime(d.at, player.scenes[sg.index].c.mm, 0) })));
    dl.sort((a, b) => a.t - b.t);
    dl.forEach(({ d, si, t }, k) => {
      // 標籤寬度不超過到下一句的距離，時間接近的對話不會互相遮住
      const room = k < dl.length - 1 ? Math.max(14, X(dl[k + 1].t - t) - 3) : 220;
      const isSel = state.sel && state.sel.kind === 'dialogue' && state.sel.id === d.id;
      dLane.append(el('div', { class: `tl-dlg${d.draft ? ' draft' : ''}${d.enabled === false ? ' off' : ''}${isSel ? ' sel' : ''}`,
        style: `left:${X(t)}px;max-width:${Math.min(220, room)}px${isSel ? ';z-index:2' : ''}`,
        title: `${d.speaker}：${d.text}\n${d.mode === 'wait' ? '等待玩家繼續' : '自動播放'}（拖曳調整時間）`,
        onmousedown: e => dragDialogue(e, si, d.id) }, d.mode === 'wait' ? '⏸ ' : '💬 ', `${d.speaker ? d.speaker + '：' : ''}${d.text}`));
    });

    // v0.3.2：音訊（BGM／環境音／音效／配音），以整段時間軸為準，可跨幕
    renderAudioLanes(row);

    tlEls.playhead = el('div', { id: 'tlPlayhead' });
    content.append(tlEls.playhead);
    scroll.scrollLeft = keepLeft; scroll.scrollTop = keepTop;
    updatePlayhead(player.t, false);
  }

  function kfEl(t, color, ref, transform) {
    const s = state.sel;
    const isSel = s && s.kind === 'kf' && s.si === ref.si && s.scope === ref.scope && s.track === ref.track && s.idx === ref.idx && (s.layerId || null) === (ref.layerId || null);
    const label = ((trackArr(state.project, ref, false) || [])[ref.idx] || {}).label;
    return el('div', { class: 'kf' + (isSel ? ' sel' : ''), style: `left:${X(t)}px;background:${color}${transform ? ';transform:' + transform : ''}`,
      title: `${(TRACK_META[ref.scope][ref.track] || {}).label || ref.track}${label ? '：' + label : ''}（拖曳調整時間）`,
      onmousedown: e => dragKf(e, ref) });
  }

  function sparkline(comp, sg, color) {
    if (!comp) return null;
    const vals = comp.map(k => k[1]);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
    const w = X(sg.end - sg.start), n = Math.max(2, Math.min(200, Math.round(w / 3)));
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = sg.scene.durationMs * i / n;
      const v = MC.sample(comp, t);
      pts.push(`${(w * i / n).toFixed(1)},${(20 - (v - lo) / (hi - lo) * 16).toFixed(1)}`);
    }
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'spark');
    svg.setAttribute('width', w); svg.setAttribute('height', 24);
    svg.style.left = X(sg.start) + 'px';
    svg.innerHTML = `<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-opacity=".55" stroke-width="1.3"/>`;
    return svg;
  }

  function updatePlayhead(t, follow) {
    const ph = tlEls.playhead;
    if (ph) ph.style.left = (LW + X(t)) + 'px';
    const tc = $('timecode');
    if (document.activeElement !== tc) tc.value = fmt(t);
    const loc = player.locate(t);
    if (loc) {
      const s = loc.seg.scene;
      const inTrans = t < loc.seg.start;
      $('hud').textContent = `Scene ${String(loc.seg.index + 1).padStart(2, '0')}｜${s.name}  ·  ${inTrans ? '轉場中' : '本幕 ' + sec(Math.max(0, Math.round(loc.local)))}  ·  ${player.mode === 'edit' ? '編輯預覽' : '正式播放'}`;
    }
    if (follow && player.playing) {
      const sc = $('tlScroll');
      const x = LW + X(t);
      if (x > sc.scrollLeft + sc.clientWidth - 60 || x < sc.scrollLeft + LW) sc.scrollLeft = Math.max(0, x - LW - 80);
    }
  }

  /* ---------- 拖曳 ---------- */
  let tip = null;
  function showTip(e, text) {
    if (!tip) { tip = el('div', { class: 'drag-tip' }); document.body.append(tip); }
    tip.textContent = text;
    tip.style.left = (e.clientX + 12) + 'px'; tip.style.top = (e.clientY - 26) + 'px';
  }
  function hideTip() { if (tip) { tip.remove(); tip = null; } }
  function laneX(e) {
    const r = $('tlContent').getBoundingClientRect();
    return e.clientX - r.left - LW;
  }
  // 通用拖曳：第一次真的移動時才建立復原點（單純點選不會產生復原紀錄）
  function drag(e, onMove, onEnd) {
    e.preventDefault(); e.stopPropagation();
    const x0 = e.clientX;
    let moved = false;
    const mv = ev => {
      if (!moved && Math.abs(ev.clientX - x0) < 3) return;
      if (!moved) { moved = true; pushUndo(); aud.setScrubbing(true); }
      onMove(ev);
    };
    const up = ev => {
      document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up);
      hideTip();
      aud.setScrubbing(false);
      if (onEnd) onEnd(moved, ev);
      if (moved) renderAll();
    };
    document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
  }
  function scrubStart(e) {
    e.preventDefault();
    const wasPlaying = player.playing;
    player.pause();
    aud.setScrubbing(true);
    const go = ev => player.seek(Math.max(0, snap(Tfrom(laneX(ev)), ev.shiftKey)));
    go(e);
    const mv = ev => go(ev);
    const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up);
      aud.setScrubbing(false);
      if (wasPlaying && $('scrubResumeChk').checked) player.play();   // v0.3.2：拖曳結束後從新位置繼續播放（聲音也從新位置開始）
    };
    document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
  }
  function dragKf(e, ref) {
    select({ kind: 'kf', ...ref });
    drag(e, ev => {
      const sg = seg(ref.si);
      const local = Math.max(0, Math.min(sg.scene.durationMs, snap(Tfrom(laneX(ev)) - sg.start, ev.shiftKey)));
      const k = trackArr(state.project, ref, false)[ref.idx];
      k.o = Math.round(local - MC.markerTimes(state.project.scenes[ref.si])[k.m || 'start']);
      if (!k.m) k.m = 'start';
      afterChange({ light: true });
      player.seek(seg(ref.si).start + local);
      showTip(ev, `本幕 ${sec(local)}（${k.m} ${k.o >= 0 ? '+' : ''}${k.o}ms）`);
    }, moved => { if (!moved) player.seek(seg(ref.si).start + MC.refTime(trackArr(state.project, ref, false)[ref.idx], mmOf(ref.si), 0)); });
  }
  function dragMarker(e, si, mi) {
    const id = state.project.scenes[si].markers[mi].id;
    select({ kind: 'marker', si, id });
    drag(e, ev => {
      const sg = seg(si);
      const local = snap(Tfrom(laneX(ev)) - sg.start, ev.shiftKey);
      setMarkerTime(state.project, si, mi, local, state.ripple);
      afterChange({ light: true });
      const m = state.project.scenes[si].markers[mi];
      player.seek(seg(si).start + m.t);
      showTip(ev, `${m.label || m.id}：本幕 ${sec(m.t)}${state.ripple ? '（後續順延）' : ''}`);
    }, moved => { if (!moved) player.seek(seg(si).start + state.project.scenes[si].markers[mi].t); });
  }
  function dragSceneEnd(e, si) {
    select({ kind: 'scene', si });
    drag(e, ev => {
      const s = state.project.scenes[si];
      const ms = s.markers || [];
      const min = (ms.length ? ms[ms.length - 1].t : 0) + 10;
      s.durationMs = Math.max(min, snap(Tfrom(laneX(ev)) - seg(si).start, ev.shiftKey));
      afterChange({ light: true });
      showTip(ev, `本幕長度 ${sec(s.durationMs)}`);
    });
  }
  function dragDialogue(e, si, id) {
    select({ kind: 'dialogue', si, id });
    drag(e, ev => {
      const sg = seg(si);
      const local = Math.max(0, Math.min(sg.scene.durationMs, snap(Tfrom(laneX(ev)) - sg.start, ev.shiftKey)));
      const d = state.project.scenes[si].dialogues.find(x => x.id === id);
      const m = (d.at && d.at.m) || 'start';
      d.at = { m, o: Math.round(local - MC.markerTimes(state.project.scenes[si])[m]) };
      afterChange({ light: true });
      player.seek(seg(si).start + local);
      showTip(ev, `對話：本幕 ${sec(local)}`);
    }, moved => { if (!moved) player.seek(seg(si).start + refT(si, state.project.scenes[si].dialogues.find(x => x.id === id).at, 0)); });
  }
  function dragLayerEdge(e, si, id, key) {
    select({ kind: 'layer', si, layerId: id });
    drag(e, ev => {
      const sg = seg(si);
      const local = Math.max(0, Math.min(sg.scene.durationMs, snap(Tfrom(laneX(ev)) - sg.start, ev.shiftKey)));
      const L = state.project.scenes[si].layers.find(l => l.id === id);
      if (key === 'end' && local >= sg.scene.durationMs) delete L.end; else L[key] = refFromLocal(si, local);
      afterChange({ light: true });
      showTip(ev, `${key === 'start' ? '出現' : '消失'}：本幕 ${sec(local)}`);
    });
  }

  /* ===================== v0.3.2 音訊（BGM／環境音／事件音效／人物配音） ===================== */
  const A_TYPES = MC.AUDIO_TYPES;
  const A_LABEL = { bgm: 'BGM', ambient: '環境音', sfx: '音效', voice: '配音' };
  const A_ICON = { bgm: '🎵', ambient: '🍃', sfx: '✨', voice: '🗣' };
  const A_COLOR = { bgm: '#d98cff', ambient: '#7fd1a8', sfx: '#ffc857', voice: '#7fb8ff' };
  const ensureAudio = p => { if (!p.audio || typeof p.audio !== 'object') p.audio = MC.emptyAudio(); p.audio.assets = p.audio.assets || {}; p.audio.clips = p.audio.clips || []; p.audio.mix = Object.assign({}, MC.AUDIO_MIX_DEFAULTS, p.audio.mix || {}); return p.audio; };
  const aClip = id => ((state.project.audio && state.project.audio.clips) || []).find(c => c.id === id);
  const aComp = id => aud.byId[id];
  const aAssets = () => (state.project.audio && state.project.audio.assets) || {};
  const allDialogues = () => {
    const out = [];
    player.tl.segs.forEach(sg => (sg.scene.dialogues || []).forEach(d => out.push({ d, si: sg.index, g: sg.start + Math.min(MC.refTime(d.at, player.scenes[sg.index].c.mm, 0), sg.scene.durationMs) })));
    return out.sort((a, b) => a.g - b.g);
  };
  const dlgLabel = x => `S${String(x.si + 1).padStart(2, '0')}｜${x.d.text.slice(0, 16)}${x.d.text.length > 16 ? '…' : ''}`;
  function newClipId(type) { let n = 1, id; const ids = new Set(((state.project.audio && state.project.audio.clips) || []).map(c => c.id)); do { id = `${type}_${n++}`; } while (ids.has(id)); return id; }

  function updateAudioStatus() {
    const st = aud.status(), b = $('audioStat');
    if (!b) return;
    const txt = { none: '🔈 尚無音訊', locked: '🔈 點一下播放鍵即可啟用聲音', running: '🔊 聲音已啟用', media: '🔊 聲音（相容模式）' }[st] || st;
    b.textContent = txt; b.className = 'tp-field audio-st ' + st;
    $('muteBtn').textContent = aud.muted ? '🔇 靜音中' : '🔊';
  }
  // 編輯器裡任何一次點擊都可解鎖聲音（瀏覽器規則：要有使用者手勢）
  document.addEventListener('pointerdown', () => { if (aud.status() === 'locked' && Object.keys(aAssets()).length) aud.unlock().then(updateAudioStatus); }, true);

  /* ---------- 時間軸音軌 ---------- */
  function renderAudioLanes(row) {
    const tl = player.tl;
    A_TYPES.forEach(type => {
      const list = aud.clips.filter(r => r.type === type && r.T0 != null)
        .map(r => {
          const s = aud.assets[r.asset];
          let T1 = r.T1;
          if (r.typing) { const x = allDialogues().find(q => q.d.id === r.dialogue); T1 = r.T0 + (x ? Array.from(x.d.text).length * (x.d.charMs || 45) : 1000); }
          else if (!isFinite(T1)) T1 = r.T0 + (s && s.duration ? Math.max(0.2, s.duration - r.offset / 1000) * 1000 : 1000);
          return { r, T0: r.T0, T1: Math.min(T1, tl.total + 2000), open: !isFinite(r.T1) && !r.typing && !(s && s.duration) };
        }).sort((a, b) => a.T0 - b.T0);
      const subs = [];
      list.forEach(it => { let k = subs.findIndex(e => e <= it.T0 + 1); if (k < 0) { k = subs.length; subs.push(0); } subs[k] = it.T1; it.sub = k; });
      const n = Math.max(1, subs.length);
      const lane = row(`${A_ICON[type]} ${A_LABEL[type]} ＋`, n * 18 + 6, { color: A_COLOR[type], title: `點一下：在播放頭新增一段「${MC.AUDIO_TYPE_LABELS[type]}」`, onLabel: () => addClip(type) });
      lane.classList.add('tl-alane');
      if (!list.length) lane.append(el('div', { class: 'tl-reserved' }, type === 'voice' ? '尚無配音（可在對話面板「＋ 配音」）' : '尚無片段（點左邊標籤新增）'));
      list.forEach(it => {
        const r = it.r, s = aud.assets[r.asset];
        const isSel = state.sel && state.sel.kind === 'audio' && state.sel.id === r.id;
        const bad = r.problem || (s && s.status === 'error');
        const fixed = r.type === 'voice' || r.typing;
        const bar = el('div', { class: `tl-aclip t-${type}${r.enabled ? '' : ' off'}${bad ? ' bad' : ''}${isSel ? ' sel' : ''}${it.open ? ' open' : ''}`,
          style: `left:${X(it.T0)}px;width:${Math.max(6, X(it.T1 - it.T0))}px;top:${3 + it.sub * 18}px`,
          title: `${r.clip.name || r.id}（${MC.AUDIO_TYPE_LABELS[type]}）\n${fmt(it.T0)} → ${isFinite(r.T1) ? fmt(r.T1) : (r.typing ? '逐字期間' : '播完為止')}${r.loop ? '・循環' : ''}${bad ? '\n⚠ ' + (r.problem || s.error) : ''}${fixed ? '\n跟著對話時間（拖曳對話即可移動）' : '\n拖曳移動；拖曳兩端調整開始／結束'}`,
          onmousedown: e => { if (e.target.classList.contains('eh')) return; if (fixed) { select({ kind: 'audio', id: r.id }); e.stopPropagation(); return; } dragClip(e, r.id, 'move'); } },
        r.typing ? '⌨ ' : '', r.clip.name || r.id, r.loop ? ' 🔁' : '', bad ? ' ⚠' : '');
        if (!fixed) bar.append(el('div', { class: 'eh l', onmousedown: e => dragClip(e, r.id, 'start') }), el('div', { class: 'eh r', onmousedown: e => dragClip(e, r.id, 'end') }));
        if (r.fadeIn > 0) bar.append(el('div', { class: 'fade in', style: `width:${Math.min(X(r.fadeIn), X(it.T1 - it.T0))}px` }));
        if (r.fadeOut > 0 && isFinite(r.T1)) bar.append(el('div', { class: 'fade out', style: `width:${Math.min(X(r.fadeOut), X(it.T1 - it.T0))}px` }));
        lane.append(bar);
      });
    });
  }

  // 拖曳音訊片段：move＝整段移動；start＝調整開始（同時調整音檔起點，聲音內容對齊不變）；end＝調整結束
  function dragClip(e, id, mode) {
    select({ kind: 'audio', id });
    const r0 = aComp(id); if (!r0 || r0.T0 == null) return;
    const c0 = clone(aClip(id));
    const T0 = r0.T0, rawEnd = MC.resolveAudioRef(c0.end, player.tl, {}) ;
    const endAbs = c0.end ? (c0.end.dialogue ? r0.T1 : rawEnd) : null;
    const x0 = laneX(e);
    aud.setScrubbing(true);
    drag(e, ev => {
      const dT = snap(Tfrom(laneX(ev) - x0), ev.shiftKey);
      const c = aClip(id);
      const setAt = T => {
        T = Math.max(0, Math.min(player.tl.total, T));
        if (c0.at && c0.at.dialogue != null) { const x = allDialogues().find(q => q.d.id === c0.at.dialogue); c.at = { dialogue: c0.at.dialogue, o: Math.round(T - (x ? x.g : 0)) }; }
        else if (c0.at && c0.at.t != null) c.at = { t: Math.round(T) };
        else c.at = MC.audioRefFromGlobal(T, player.tl);
        return T;
      };
      if (mode === 'move') {
        const T = setAt(T0 + dT);
        if (endAbs != null) c.end = MC.audioRefFromGlobal(Math.max(T + 50, endAbs + dT), player.tl);
        showTip(ev, `開始 ${fmt(T)}`);
      } else if (mode === 'start') {
        let d = dT;
        if ((c0.offsetMs || 0) + d < 0) d = -(c0.offsetMs || 0);
        const lim = (endAbs != null ? endAbs : (isFinite(r0.T1) ? r0.T1 : Infinity)) - 50;
        if (T0 + d > lim) d = lim - T0;
        const T = setAt(T0 + d);
        c.offsetMs = Math.round((c0.offsetMs || 0) + d);
        showTip(ev, `開始 ${fmt(T)}（音檔從 ${sec(c.offsetMs)} 開始）`);
      } else {
        const base = endAbs != null ? endAbs : (isFinite(r0.T1) ? r0.T1 : T0 + 2000);
        const T = Math.max(T0 + 50, Math.min(player.tl.total, base + dT));
        c.end = MC.audioRefFromGlobal(T, player.tl);
        showTip(ev, `結束 ${fmt(T)}`);
      }
      afterChange({ light: true });
    }, () => { aud.setScrubbing(false); });
  }

  function addClip(type, extra) {
    if (!player.tl) return;
    const id = newClipId(type);
    const T = player.t;
    const dl = allDialogues();
    const near = dl.filter(x => x.g >= T - 50).concat(dl.slice().reverse())[0];
    edit(p => {
      const A = ensureAudio(p);
      const c = { id, type, name: { bgm: '背景音樂', ambient: '環境音', sfx: '音效', voice: '配音' }[type], asset: '', enabled: true, volume: type === 'voice' ? 1 : 0.8,
        loop: type === 'bgm' || type === 'ambient', fadeInMs: type === 'bgm' || type === 'ambient' ? 1000 : 0, fadeOutMs: type === 'bgm' || type === 'ambient' ? 1000 : 0, offsetMs: 0 };
      if (type === 'voice') Object.assign(c, { dialogue: near ? near.d.id : '', text: 'type', waitEnd: false, onContinue: 'stop' });
      else c.at = MC.audioRefFromGlobal(T, player.tl);
      if (type === 'bgm') c.crossfadeMs = 0;
      Object.assign(c, extra || {});
      if (c.dialogue && type === 'voice') c.name = '配音：' + ((dl.find(x => x.d.id === c.dialogue) || {}).d || { text: '' }).text.slice(0, 10);
      A.clips.push(c);
      state.sel = { kind: 'audio', id };
    });
    toast(`已新增「${MC.AUDIO_TYPE_LABELS[type]}」：請在右側選擇音檔`);
  }

  /* ---------- 音訊素材 ---------- */
  let pendingAudioAsset = null;   // { clipId?, relinkId? }
  const safeId = name => ('a_' + String(name).replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9_\-一-鿿]+/g, '_')).slice(0, 40);
  function addAudioAssetModal(clipId) {
    const pathIn = el('input', { type: 'text', value: 'assets/', style: 'width:100%' });
    modal('新增音訊素材', el('div', {},
      el('p', {}, el('b', {}, 'A．從這台電腦選擇音檔（本機預覽）')),
      el('p', { class: 'hint' }, '只會在這台電腦、這個分頁裡預覽；', el('b', {}, '不會'), '自動上傳到 GitHub。專案 JSON 會記錄成 assets/檔名，正式播放前請把同名檔案上傳到 GitHub 的 motion-comic/assets/。'),
      el('p', {}, el('b', {}, 'B．輸入 GitHub 上已存在的檔案路徑')),
      el('p', { class: 'hint' }, '例如 assets/forest_bgm.mp3（相對於 motion-comic/）。建議格式：MP3 或 M4A（AAC）；WAV 檔案較大；OGG 在 iPhone 上可能無法播放。'),
      pathIn),
      [{ label: '取消' },
       { label: 'A．選擇本機音檔…', fn: () => { pendingAudioAsset = { clipId }; $('audioInput').value = ''; $('audioInput').click(); } },
       { label: 'B．使用這個路徑', fn: () => {
         const src = pathIn.value.trim();
         if (!/\.(mp3|m4a|aac|wav|ogg|oga|opus|webm)$/i.test(src)) { toast('請輸入音檔路徑，例如 assets/forest_bgm.mp3'); return; }
         const name = src.split('/').pop();
         let id = safeId(name); while (aAssets()[id]) id += '_2';
         edit(p => { const A = ensureAudio(p); A.assets[id] = { src, label: name }; if (clipId) { const c = A.clips.find(x => x.id === clipId); if (c) c.asset = id; } });
         toast('已加入音訊素材：' + src);
       } }]);
  }
  $('audioInput').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    const tgt = pendingAudioAsset; pendingAudioAsset = null;
    if (!file || !tgt) return;
    let id = tgt.relinkId;
    if (!id) { id = safeId(file.name); while (aAssets()[id]) id += '_2'; }
    const src = 'assets/' + file.name;
    aud.setLocalFile(id, file);
    edit(p => {
      const A = ensureAudio(p);
      if (tgt.relinkId) { A.assets[id].src = src; }
      else A.assets[id] = { src, label: file.name };
      if (tgt.clipId) { const c = A.clips.find(x => x.id === tgt.clipId); if (c) c.asset = id; }
    });
    modal('本機音檔只用來預覽', el('div', {},
      el('p', {}, `已在這台電腦載入「${file.name}」，可以在編輯器裡試聽與排時間。`),
      el('p', { class: 'hint warn' }, `正式網站（GitHub Pages）還沒有這個檔案。請把「${file.name}」上傳到 GitHub 的 motion-comic/assets/，專案裡記錄的路徑是 ${src}。`),
      el('p', { class: 'hint' }, '重新整理或下次打開編輯器時，本機預覽會消失；檔案上傳到 GitHub 後就會自動讀到。')));
  });
  function audioAssetsSection() {
    const A = state.project.audio || {};
    const rep = aud.assetReport();
    const used = new Set(((A.clips) || []).map(c => c.asset).filter(Boolean));
    const mix = Object.assign({}, MC.AUDIO_MIX_DEFAULTS, A.mix || {});
    const upMix = (k, v) => edit(p => { ensureAudio(p).mix[k] = Math.max(0, Math.min(1, v)); }, { light: true });
    return [
      el('div', { class: 'p-sec' }, el('div', { class: 'p-h' }, '音訊混音（專案預設，0～1）'),
        hint('最後音量＝片段音量 × 類型音量 × 總音量 × 玩家在播放頁調的音量。多條同時播放時另有輕微限幅，避免爆音。'),
        [['master', '總音量'], ['bgm', 'BGM 整體'], ['ambient', '環境音整體'], ['sfx', '音效整體'], ['voice', '配音整體']].map(([k, lab]) =>
          numField(lab, mix[k], v => upMix(k, v), { step: 0.05, min: 0, max: 1 }))),
      el('div', { class: 'p-sec' }, el('div', { class: 'p-h' }, `音訊素材（${rep.length}）`),
        hint('音檔一律放在 motion-comic/assets/（不另外建立資料夾）。「本機預覽」只在這台電腦有效，正式播放需要把檔案上傳到 GitHub。'),
        rep.length ? rep.map(r => {
          const a = A.assets[r.id];
          const st = r.status === 'ok' ? `✓ 可用 ${r.duration.toFixed(2)} 秒${r.backend === 'media' ? '（相容模式）' : ''}` : r.status === 'loading' ? '載入中…' : r.status === 'error' ? '✕ ' + r.error : '尚未載入';
          return el('div', { class: 'asset-row audio' },
            el('div', { class: 'aicon' }, '🎧'),
            el('div', {},
              el('div', { class: 'an' }, a.label || r.id, ' ', el('span', { class: 'unit' }, `（${r.id}）`)),
              textField('路徑', a.src, v => edit(p => { ensureAudio(p).assets[r.id].src = v.trim(); })),
              r.local ? el('div', { class: 'hint warn' }, `本機預覽中：${r.local}（尚未上傳；正式路徑 ${a.src}）`) : null,
              el('div', { class: r.status === 'ok' ? 'st-ok' : (r.status === 'error' ? 'st-bad' : ''), style: 'font-size:11px' }, st)),
            el('div', { class: 'row-btns', style: 'flex-direction:column' },
              el('button', { class: 'sb', disabled: r.status !== 'ok', onclick: () => aud.unlock().then(() => aud.preview(r.id)) }, '▶ 試聽'),
              el('button', { class: 'sb', onclick: () => { pendingAudioAsset = { relinkId: r.id }; $('audioInput').value = ''; $('audioInput').click(); } }, '本機檔案預覽'),
              used.has(r.id) ? el('span', { class: 'unit' }, '使用中') : el('button', { class: 'sb danger', onclick: () => edit(p => { delete ensureAudio(p).assets[r.id]; aud.setLocalFile(r.id, null); }) }, '移除')));
        }) : hint('還沒有任何音訊素材。'),
        el('div', { class: 'row-btns' },
          el('button', { class: 'sb', onclick: () => addAudioAssetModal(null) }, '＋ 新增音訊素材'),
          rep.some(r => !used.has(r.id)) ? el('button', { class: 'sb danger', onclick: () => edit(p => { const AA = ensureAudio(p); Object.keys(AA.assets).forEach(id => { if (!used.has(id)) { delete AA.assets[id]; aud.setLocalFile(id, null); } }); }) }, '移除所有未使用的音訊素材') : null)),
    ];
  }

  /* ---------- 音訊片段面板 ---------- */
  function refMode(ref) { return !ref ? 'auto' : ref.dialogue != null ? 'dialogue' : ref.t != null ? 'time' : 'scene'; }
  function refEditor(si_unused, ref, label, onSet, opts = {}) {
    const mode = refMode(ref);
    const segs = player.tl.segs;
    const cur = ref ? MC.resolveAudioRef(ref, player.tl, Object.fromEntries(allDialogues().map(x => [x.d.id, { g: x.g }]))) : null;
    const modes = [['scene', '某一幕的節點＋偏移'], ['dialogue', '某句對話出現時＋偏移'], ['time', '整段時間（毫秒）']];
    if (opts.allowAuto) modes.unshift(['auto', opts.autoLabel || '自動']);
    const out = [selectField(label, mode, modes, v => {
      if (v === mode) return;
      const T = cur != null ? cur : (opts.fallbackT != null ? opts.fallbackT : player.t);
      if (v === 'auto') onSet(null);
      else if (v === 'time') onSet({ t: Math.round(T) });
      else if (v === 'scene') onSet(MC.audioRefFromGlobal(T, player.tl));
      else { const dl = allDialogues(); const x = dl.filter(q => q.g <= T + 1).pop() || dl[0]; if (x) onSet({ dialogue: x.d.id, o: Math.round(T - x.g) }); else toast('專案裡沒有對話'); }
    })];
    if (mode === 'scene') {
      const si = Math.max(0, segs.findIndex(s => s.scene.id === ref.scene));
      out.push(selectField('　幕次', String(si), segs.map(s => [String(s.index), `Scene ${String(s.index + 1).padStart(2, '0')}｜${s.scene.name}`]), v => onSet({ scene: segs[+v].scene.id, m: 'start', o: 0 })),
        selectField('　節點', ref.m || 'start', markerOptions(si), v => onSet({ scene: ref.scene, m: v, o: ref.o || 0 })),
        numField('　偏移', ref.o || 0, v => onSet({ scene: ref.scene, m: ref.m || 'start', o: Math.round(v) }), { step: 100, unit: 'ms', int: true }));
    } else if (mode === 'dialogue') {
      out.push(selectField('　對話', ref.dialogue, allDialogues().map(x => [x.d.id, dlgLabel(x)]), v => onSet({ dialogue: v, o: ref.o || 0 })),
        numField('　偏移', ref.o || 0, v => onSet({ dialogue: ref.dialogue, o: Math.round(v) }), { step: 100, unit: 'ms（負數＝提早）', int: true }));
    } else if (mode === 'time') {
      out.push(numField('　整段時間', ref.t, v => onSet({ t: Math.max(0, Math.round(v)) }), { step: 100, unit: 'ms', int: true }));
    }
    return out;
  }
  function audioPanel(id) {
    const c = aClip(id);
    if (!c) return projectPanel();
    const r = aComp(id) || {};
    const up = fn => edit(p => fn(ensureAudio(p).clips.find(x => x.id === id)));
    const A = state.project.audio;
    const s = aud.assets[c.asset];
    const assetOpts = [['', '（未指定）']].concat(Object.keys(A.assets).map(k => [k, `${A.assets[k].label || k}（${A.assets[k].src}）`]));
    const dl = allDialogues();
    const isTyping = c.type === 'sfx' && c.trigger === 'typing';
    const trig = c.type === 'voice' ? 'voice' : isTyping ? 'typing' : (c.at && c.at.dialogue != null ? 'dialogue' : 'time');
    const st = !c.asset ? '尚未選擇音檔' : !s ? '尚未載入' : s.status === 'ok' ? `✓ 音檔 ${s.duration.toFixed(2)} 秒` : s.status === 'loading' ? '載入中…' : '✕ ' + s.error;
    return el('div', {},
      el('div', { class: 'p-title' }, `${A_ICON[c.type]} ${MC.AUDIO_TYPE_LABELS[c.type]}`),
      el('div', { class: 'p-sub' }, `${c.id}${r.T0 != null ? ` · 開始 ${fmt(r.T0)}` : ''}${r.T0 != null ? ` · 結束 ${isFinite(r.T1) ? fmt(r.T1) : (c.type === 'voice' || isTyping ? '跟著對話' : (c.loop ? '整段結束' : '音檔播完'))}` : ''}`),
      r.problem ? hint('⚠ ' + r.problem, 'warn') : null,
      textField('名稱', c.name || '', v => up(x => { x.name = v; })),
      selectField('類型', c.type, A_TYPES.map(t => [t, MC.AUDIO_TYPE_LABELS[t]]), v => up(x => {
        x.type = v;
        if (v === 'voice') { delete x.at; delete x.end; delete x.trigger; x.loop = false; x.dialogue = x.dialogue || (dl[0] && dl[0].d.id) || ''; x.text = x.text || 'type'; x.onContinue = x.onContinue || 'stop'; }
        else if (!x.at) { x.at = r.T0 != null ? MC.audioRefFromGlobal(r.T0, player.tl) : MC.audioRefFromGlobal(player.t, player.tl); delete x.dialogue; delete x.text; delete x.waitEnd; delete x.onContinue; }
      })),
      el('div', { class: 'p-sec' }, el('div', { class: 'p-h' }, '音檔'),
        selectField('音訊素材', c.asset || '', assetOpts, v => up(x => { x.asset = v; })),
        el('div', { class: s && s.status === 'ok' ? 'st-ok' : 'st-bad', style: 'font-size:11px;margin:-2px 0 6px' }, st),
        s && aud.localFiles[c.asset] ? hint(`本機預覽中（${aud.localFiles[c.asset].name}）：正式播放前請上傳到 GitHub 的 motion-comic/assets/`, 'warn') : null,
        el('div', { class: 'row-btns' },
          el('button', { class: 'sb', onclick: () => addAudioAssetModal(id) }, '＋ 新增音訊素材…'),
          el('button', { class: 'sb', disabled: !(s && s.status === 'ok'), onclick: () => aud.unlock().then(() => aud.preview(c)) }, '▶ 單獨試聽'),
          el('button', { class: 'sb', onclick: () => aud._stopPreview() }, '■ 停止試聽'))),
      el('div', { class: 'p-sec' }, el('div', { class: 'p-h' }, '什麼時候播放'),
        c.type === 'voice' ? [
          selectField('綁定的對話', c.dialogue || '', [['', '（未指定）']].concat(dl.map(x => [x.d.id, dlgLabel(x)])), v => up(x => { x.dialogue = v; })),
          hint('配音在這句對話出現時開始。移動對話的時間，配音會跟著移動。'),
        ] : [
          c.type === 'sfx' ? selectField('觸發方式', trig, [['time', '在指定時間（節點／整段時間）'], ['dialogue', '某句對話出現時'], ['typing', '對話逐字出現時（打字音）']], v => up(x => {
            if (v === 'typing') { x.trigger = 'typing'; x.dialogue = x.dialogue || (dl[0] && dl[0].d.id) || ''; x.every = x.every || 2; x.loop = false; delete x.end; }
            else { delete x.trigger; delete x.every; if (v === 'dialogue') { const d0 = dl.find(q => q.d.id === x.dialogue) || dl[0]; x.at = { dialogue: d0 ? d0.d.id : '', o: 0 }; } else x.at = MC.audioRefFromGlobal(r.T0 != null ? r.T0 : player.t, player.tl); delete x.dialogue; }
          })) : null,
          isTyping ? [
            selectField('哪一句對話', c.dialogue || '', [['', '（未指定）']].concat(dl.map(x => [x.d.id, dlgLabel(x)])), v => up(x => { x.dialogue = v; })),
            numField('每幾個字響一次', c.every || 2, v => up(x => { x.every = Math.max(1, Math.round(v)); }), { step: 1, int: true }),
            hint('只在文字真的一個字一個字出現時響；標點與空白不出聲；對話等待中不會重複。'),
          ] : [
            refEditor(null, c.at, '開始', ref => up(x => { x.at = ref; })),
            c.type !== 'sfx' || c.loop ? refEditor(null, c.end, '結束', ref => up(x => { if (ref) x.end = ref; else delete x.end; }), { allowAuto: true, autoLabel: c.loop ? '自動（循環到整段結束）' : '自動（音檔播完）',
              fallbackT: isFinite(r.T1) ? r.T1 : (r.T0 != null && s && s.duration && !c.loop ? r.T0 + (s.duration * 1000 - (c.offsetMs || 0)) : player.tl.total) }) : null,
            hint('提示：也可以在時間軸上直接拖曳片段（移動）或拖曳兩端（調整開始／結束）。'),
          ],
        ]),
      el('div', { class: 'p-sec' }, el('div', { class: 'p-h' }, '音量與淡入淡出'),
        numField('音量（0～1）', c.volume ?? 1, v => up(x => { x.volume = Math.max(0, Math.min(1, +v.toFixed(3))); }), { step: 0.05, min: 0, max: 1 }),
        c.type === 'voice' || isTyping ? null : checkField('循環播放', !!c.loop, v => up(x => { x.loop = v; })),
        numField('淡入', c.fadeInMs || 0, v => up(x => { x.fadeInMs = Math.max(0, Math.round(v)); }), { step: 100, unit: 'ms', int: true }),
        numField('淡出', c.fadeOutMs || 0, v => up(x => { x.fadeOutMs = Math.max(0, Math.round(v)); }), { step: 100, unit: 'ms（在結束時間前淡出）', int: true }),
        numField('音檔起點', c.offsetMs || 0, v => up(x => { x.offsetMs = Math.max(0, Math.round(v)); }), { step: 100, unit: 'ms（從音檔第幾毫秒開始）', int: true }),
        c.type === 'bgm' ? numField('與前一首 BGM 交叉淡化', c.crossfadeMs || 0, v => up(x => { x.crossfadeMs = Math.max(0, Math.round(v)); }), { step: 100, unit: 'ms（0＝不使用）', int: true }) : null,
        c.type === 'bgm' ? hint('設定後：這首開始時，還在播的上一首 BGM 會在這段時間內淡出，這首同時淡入。') : null),
      c.type === 'voice' ? el('div', { class: 'p-sec' }, el('div', { class: 'p-h' }, '配音與對話框同步'),
        selectField('文字顯示', c.text || 'type', [['type', '配音開始時，文字逐字出現（速度＝對話的逐字速度）'], ['instant', '配音開始時，整句文字一次顯示']], v => up(x => { x.text = v; })),
        checkField('等配音播完才可按繼續', !!c.waitEnd, v => up(x => { x.waitEnd = v; })),
        selectField('配音還沒播完就按繼續時', c.onContinue || 'stop', [['stop', '停止配音'], ['keep', '讓它播完（下一句開始時一定會停）']], v => up(x => { x.onContinue = v; })),
        hint('音檔還沒上傳或讀不到時：只顯示文字，玩家照常可以繼續。')) : null,
      el('div', { class: 'p-sec' },
        checkField('啟用', c.enabled !== false, v => up(x => { x.enabled = v; })),
        el('div', { class: 'row-btns' },
          r.T0 != null ? el('button', { class: 'sb', onclick: () => { applyRange(); aud.unlock(); player.seek(Math.max(0, r.T0 - 800)); player.play(); } }, '▶ 在動畫中播放這段') : null,
          el('button', { class: 'sb', onclick: () => { const nid = newClipId(c.type); edit(p => { const cc = clone(c); cc.id = nid; cc.name = (c.name || c.id) + '（複製）'; if (cc.type === 'voice') cc.dialogue = ''; ensureAudio(p).clips.push(cc); state.sel = { kind: 'audio', id: nid }; }); toast(c.type === 'voice' ? '已複製（配音請重新選擇綁定的對話）' : '已複製'); } }, '複製'),
          el('button', { class: 'sb danger', onclick: () => edit(p => { const A2 = ensureAudio(p); A2.clips = A2.clips.filter(x => x.id !== id); state.sel = null; }) }, '刪除'))));
  }

  /* ---------- 對話面板：這句的聲音 ---------- */
  function dialogueAudioSection(d) {
    const clips = ((state.project.audio && state.project.audio.clips) || []).filter(c => (c.type === 'voice' && c.dialogue === d.id) || (c.trigger === 'typing' && c.dialogue === d.id) || (c.at && c.at.dialogue === d.id));
    const hasV = clips.some(c => c.type === 'voice' && c.enabled !== false), hasT = clips.some(c => c.trigger === 'typing' && c.enabled !== false), hasS = clips.some(c => c.type === 'sfx' && c.trigger !== 'typing' && c.enabled !== false);
    const mode = hasV ? (hasS || hasT ? 'D．文字＋配音＋音效' : 'C．文字＋人物配音') : (hasT || hasS ? 'B．文字＋打字音／音效' : 'A．純文字');
    return el('div', { class: 'p-sec' }, el('div', { class: 'p-h' }, `聲音（目前：${mode}）`),
      clips.length ? clips.map(c => el('div', {}, el('a', { href: '#', onclick: e => { e.preventDefault(); select({ kind: 'audio', id: c.id }); } },
        `${c.trigger === 'typing' ? '⌨' : A_ICON[c.type]} ${c.name || c.id}`), el('span', { class: 'unit' }, ` ${(aAssets()[c.asset] || {}).src || '（尚未選擇音檔）'}${c.enabled === false ? '・停用' : ''}`))) : hint('這句目前是純文字。'),
      el('div', { class: 'row-btns' },
        hasV ? null : el('button', { class: 'sb', onclick: () => addClip('voice', { dialogue: d.id }) }, '＋ 配音'),
        hasT ? null : el('button', { class: 'sb', onclick: () => addClip('sfx', { name: '打字音', trigger: 'typing', dialogue: d.id, every: 2, volume: 0.5, at: undefined, loop: false, fadeInMs: 0, fadeOutMs: 0 }) }, '＋ 打字音'),
        el('button', { class: 'sb', onclick: () => addClip('sfx', { name: '對話音效', at: { dialogue: d.id, o: 0 }, loop: false, fadeInMs: 0, fadeOutMs: 0 }) }, '＋ 出現時音效')),
      hint('配音、打字音都綁定這句的對話 ID；不需要另一套對話系統。'));
  }

  /* ===================== 事件綁定 ===================== */
  $('undoBtn').onclick = undo;
  $('redoBtn').onclick = redo;
  $('saveBtn').onclick = save;
  $('exportBtn').onclick = exportProject;
  $('importBtn').onclick = () => $('importInput').click();
  $('resetBtn').onclick = resetToBaseline;
  $('playerBtn').onclick = () => {
    if (isDirty()) toast('提醒：播放頁會播放「已儲存」的版本，請先儲存');
    window.open('../player/index.html?source=local&range=' + (state.range === 'ready' ? 'ready' : 'all'), '_blank');
  };
  $('projectBtn').onclick = () => select({ kind: 'project' });
  $('addSceneBtn').onclick = () => edit(p => {
    let n = p.scenes.length + 1, id;
    do { id = `scene${String(n++).padStart(2, '0')}`; } while (p.scenes.some(s => s.id === id));
    p.scenes.push({ id, name: `新場景 ${p.scenes.length + 1}`, status: 'draft', durationMs: 4000,
      transitionIn: { type: 'fadeBlack', outMs: 300, holdMs: 100, inMs: 400 }, markers: [], layers: [],
      camera: { originX: 0.5, originY: 0.5, tracks: {} }, effects: {}, tracks: {}, dialogues: [] });
    state.sel = { kind: 'scene', si: p.scenes.length - 1 };
  });
  $('projTitle').addEventListener('change', () => edit(p => { p.title = $('projTitle').value; }));
  $('validTag').onclick = () => select({ kind: 'project' });

  $('playBtn').onclick = () => { aud.unlock(); applyRange(); player.togglePlay(); };
  $('replayBtn').onclick = () => { aud.unlock(); applyRange(); player.replay(); };
  $('muteBtn').onclick = () => { aud.setMuted(!aud.muted); updateAudioStatus(); };
  $('scrubMuteChk').onchange = e => { aud.scrubMute = e.target.checked; };
  $('toStartBtn').onclick = () => { applyRange(); player.pause(); player.seek(player.range ? player.range.from : 0); };
  $('skipBtn').onclick = () => player.skipScene();
  $('timecode').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const t = parseTime(e.target.value);
    if (isFinite(t)) { player.pause(); player.seek(t); e.target.blur(); } else toast('時間格式：12.5 或 00:12.500');
  });
  $('rangeSel').onchange = e => {
    state.range = e.target.value;
    if (state.range === 'scene') state.rangeScene = currentSceneIndex();
    applyRange();
    toast(state.range === 'scene' ? `只播 Scene ${String(state.rangeScene + 1).padStart(2, '0')}` : state.range === 'ready' ? '只播有素材的幕次' : '播放全部幕次');
  };
  $('modeSel').onchange = e => { player.setMode(e.target.value); updatePlayhead(player.t, false); };
  $('speedSel').onchange = e => player.setSpeed(parseFloat(e.target.value));
  $('rippleChk').onchange = e => { state.ripple = e.target.checked; renderProps(); };
  $('zoomRange').value = state.zoom;
  $('zoomRange').oninput = e => { state.zoom = parseFloat(e.target.value); renderTimeline(); };
  $('tlScroll').addEventListener('wheel', e => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    state.zoom = Math.max(20, Math.min(600, state.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
    $('zoomRange').value = state.zoom;
    renderTimeline();
  }, { passive: false });

  window.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || tag === 'select';
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); redo(); return; }
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return; }
    if (typing || mod) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (player.blocked) { player.continueDialogue(); return; }
      if (e.key === ' ') { applyRange(); player.togglePlay(); }
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault(); player.pause();
      player.seek(player.t + (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 1000 : 100));
    }
    if (e.key === 'Home') { player.pause(); player.seek(0); }
  });
  window.addEventListener('beforeunload', e => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  /* ===================== 啟動 ===================== */
  (async function boot() {
    let p = null, from = '';
    try {
      const s = localStorage.getItem(LS_KEY);
      if (s) { p = JSON.parse(s); from = 'local'; }
    } catch (_) { p = null; }
    if (p && MC.validateProject(p).errors.length) { p = null; from = ''; }
    if (!p && location.protocol !== 'file:') {   // file:// 下瀏覽器禁止讀 JSON，直接用內建專案
      try {
        const r = await fetch('../projects/party-island-opening.json', { cache: 'no-store' });
        if (r.ok) { p = await r.json(); from = 'json'; }
      } catch (_) {}
    }
    if (!p) { p = clone(window.MC_PROJECT); from = 'builtin'; }
    const builtin = window.MC_PROJECT;
    const needUpgrade = from === 'local' && builtin && (p.contentVersion || 1) < (builtin.contentVersion || 1);
    setProject(p, { saved: true, reportAssets: !needUpgrade });
    player.seek(0);
    if (needUpgrade) {
      modal('發現新版內容：v0.3.1 定點分鏡修正版', '<p>這台電腦上儲存的是舊版專案。新版修改了<b>第二幕</b>（床＋小V再放大、兩句對話）、<b>第四幕 A／B</b>（改成固定構圖淡入淡出，人物不再位移）與<b>第五幕</b>（張望幅度加大、含上下）。第一、三幕沒有改。要怎麼處理？</p>' +
        '<ul><li><b>改用新版內建專案（建議）</b>：整個換成新版（你之前的修改可以用「復原」找回）。</li>' +
        '<li><b>只更新第二、四、五幕</b>：保留你調整過的第一、三幕，第二、四A、四B、五幕換成新版（缺少的幕次與素材也會補上）。</li>' +
        '<li><b>維持我的版本</b>：什麼都不改。</li></ul>',
        [{ label: '維持我的版本' },
         { label: '只更新第二、四、五幕', fn: () => { pushUndo(); setProject(mergeUpdatedScenes(clone(state.project), clone(builtin), V031_UPDATED)); toast('已把第二、四、五幕換成新版（記得儲存）'); } },
         { label: '改用新版內建專案', fn: () => { pushUndo(); setProject(clone(builtin)); toast('已改用新版內建專案'); } }]);
      return;
    }
    if (from === 'local') {
      let meta = {};
      try { meta = JSON.parse(localStorage.getItem(LS_META) || '{}'); } catch (_) {}
      toast(`已載入上次儲存的版本${meta.savedAt ? '（' + new Date(meta.savedAt).toLocaleString() + '）' : ''}`);
    }
  })();
})();

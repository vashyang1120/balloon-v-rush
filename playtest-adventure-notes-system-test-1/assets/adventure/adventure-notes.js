'use strict';
// Adventure Notes System｜Test 1 — 冒險筆記（共用模組）
//
// 第一大陸（rpg-continent1-universe/）與雙大陸開發基準（rpg-dual-continent-test/）載入同一份檔案：
//   <script src="../assets/adventure/adventure-notes.js?v=…" data-continents="1">     ← 第一大陸
//   <script src="../assets/adventure/adventure-notes.js?v=…" data-continents="1,2">   ← 第一＋第二大陸
// 必須放在 main.js 之後載入（沿用 chapter3-dog-water.js 的包裝方式：不改 main.js，只包裝既有的全域函式）。
//
// 這個模組負責：
//   A. 筆記資料表（NOTES）：每份筆記一個固定內部 ID；分類「Boss 弱點筆記」「冒險知識筆記」；知識筆記不使用編號
//   B. 永久收藏（獨立於冒險背包）：通關、失敗、從頭挑戰、背包重置、重新開啟遊戲都不會清除；每份只收藏一次；
//      不佔背包容量、不能出售／消耗／交換。存在既有的玩家身份命名空間（getPlayerScopedStorageKey），不寫 Firebase。
//   C. 小V之家「冒險筆記」入口與分類清單（沿用小V之家 UI 2.0 的面板與按鈕樣式）
//   D. 閱讀器：沿用既有橘子王觀察筆記的「中央展示」（rpg-showcase），保持比例、不裁切、不拉伸；可放大
//   E. 關卡拾取：金色燈泡（只用於冒險知識筆記），碰到 → 記錄 → 完整展示 → 玩家按「看完了」→ 恢復遊戲
//
// 不改動：橘子王弱點筆記的取得規則（帶狗、通關才帶回背包、重玩規則）、RPG 已讀規則、背包、Firebase。
(function () {
  if (typeof window === 'undefined' || window.AdvNotes) return;
  const SCRIPT = document.currentScript;
  const CONTINENTS = String((SCRIPT && SCRIPT.dataset && SCRIPT.dataset.continents) || '1')
    .split(',').map(s => Number(s.trim())).filter(n => n > 0);
  const STORE_PREFIX = 'balloonVAdventureHome__notesV1';   // 開頭符合既有冒險存檔規則 → 自動套用正式／開發者副本／測試存檔的隔離
  const STORE_VERSION = 1;
  const VERSION = 'adventure-notes-system-test-1';

  // ── A. 筆記資料表 ───────────────────────────────────────────────────────────────
  const CATEGORIES = [
    { id: 'boss', label: 'Boss 弱點筆記', empty: '還沒有 Boss 弱點筆記。帶著氣球小狗冒險，說不定能找到 Boss 的秘密！' },
    { id: 'knowledge', label: '冒險知識筆記', empty: '還沒有冒險知識筆記。冒險途中看到發光的金色燈泡，碰一下就能收集！' },
  ];
  const NOTES = [
    {
      id: 'orangeKingWeaknessNote01',        // 沿用既有 ID（舊存檔 keyItems 照常對應）
      category: 'boss',
      name: '橘子王觀察筆記',                 // v0.3.62 起的玩家顯示名稱
      continent: 1, chapter: 2, stageId: '2-3', stageName: '2-3',
      image: 'assets/adventure/rpg/objects/orange_king_weakness_note.png',
      imageKey: 'orange_king_weakness_note', // 既有 RPG 素材鍵
      pickupIcon: 'bossNote',                 // 關卡裡沿用既有的 Boss 筆記拾取（main.js hiddenTreasure，不由本模組處理）
      keyItem: true,                          // 取得紀錄來源：通關時寫入 playerInventory.keyItems → 同步進永久收藏
    },
    {
      id: 'knowledgeNoteProjectileMotion',
      category: 'knowledge',
      name: '風之峽谷的飛行秘密',
      continent: 2, chapter: 3, stageId: '3-4', stageName: '3-4 風之峽谷',
      image: 'assets/adventure/notes/knowledge_note_projectile_motion.png',
      imageKey: 'knowledge_note_projectile_motion',
      pickupIcon: 'knowledgeBulb',
      // 第一個大型飛行峽谷（導風深淵 A1）登岸後的第一平台 P1：落點左側的空位（不需要小狗、骰子、付費）
      pickup: { at: () => (typeof C34_LAY === 'undefined' ? null : { x: C34_LAY.p1.x + 240, y: C34_LAY.y(C34_LAY.p1.h) - 50 }) },
    },
  ];
  const PICKUP_ICONS = {
    knowledgeBulb: { path: 'assets/adventure/ui/items/item_knowledge_note_bulb.png', emoji: '💡', size: 50, hit: 30 },
  };
  const byId = id => NOTES.find(n => n.id === id) || null;
  const available = n => !!n && CONTINENTS.includes(n.continent);

  // ── B. 永久收藏 ─────────────────────────────────────────────────────────────────
  function storeKey() {
    try { if (typeof getPlayerScopedStorageKey === 'function') return getPlayerScopedStorageKey(STORE_PREFIX); } catch (e) {}
    return STORE_PREFIX + '__guest';
  }
  let cache = null, cacheKey = null;
  function load() {
    const k = storeKey();
    if (cache && cacheKey === k) return cache;
    let d = null;
    try { d = JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { d = null; }
    if (!d || typeof d !== 'object' || typeof d.notes !== 'object' || !d.notes) d = { v: STORE_VERSION, notes: {} };
    cache = d; cacheKey = k;
    return d;
  }
  function save() {
    const d = load();
    d.v = STORE_VERSION; d.updatedAt = Date.now();
    try { localStorage.setItem(cacheKey, JSON.stringify(d)); return true; } catch (e) { return false; }
  }
  function has(id) { return !!load().notes[id]; }
  function collect(id, src, at) {
    const n = byId(id);
    if (!n || has(id)) return false;          // 每份只收藏一次
    load().notes[id] = { id, at: at || Date.now(), src: src || 'pickup' };
    save();
    console.log('[AdvNotes] 收藏筆記', id, src || 'pickup');
    return true;
  }
  // 舊存檔相容：既有背包 keyItems 裡的 Boss 筆記（通關才會寫入的正式取得紀錄）→ 補進永久收藏；不憑空發放
  function syncFromInventory() {
    try {
      const ks = (typeof playerInventory !== 'undefined' && playerInventory && playerInventory.keyItems) || {};
      NOTES.forEach(n => {
        if (!n.keyItem || has(n.id)) return;
        const k = ks[n.id];
        if (k && k.id === n.id) collect(n.id, 'keyItems', Number(k.acquiredAt) || Date.now());
      });
    } catch (e) {}
  }
  function list(category) { return NOTES.filter(n => available(n) && (!category || n.category === category)); }

  // ── D. 閱讀器（沿用既有中央展示）────────────────────────────────────────────────
  const imgState = {};   // imageKey → 'loading' | 'loaded' | 'failed'
  function ensureImage(n) {
    try {
      if (typeof RPG_ASSETS !== 'undefined' && !RPG_ASSETS[n.imageKey]) RPG_ASSETS[n.imageKey] = n.image;
      if (typeof rpgAssetState === 'function' && rpgAssetState(n.imageKey) === 'loaded') { imgState[n.imageKey] = 'loaded'; return 'loaded'; }
    } catch (e) {}
    if (imgState[n.imageKey] === 'loading' || imgState[n.imageKey] === 'failed') return imgState[n.imageKey];
    imgState[n.imageKey] = 'loading';
    const img = new Image();
    img.onload = () => { imgState[n.imageKey] = 'loaded'; try { rpgImgs[n.imageKey] = img; } catch (e) {} };
    img.onerror = () => { imgState[n.imageKey] = 'failed'; console.warn('[AdvNotes] 筆記圖片載入失敗', n.image); };
    img.src = (typeof resolveAdventureAssetSrc === 'function') ? resolveAdventureAssetSrc(n.image) : n.image;
    return 'loading';
  }
  function sceneFor(n) {
    return {
      id: 'advnote_read:' + n.id, title: n.name,
      modeControlled: false, saveHistory: false, repeatable: true, oneClick: true,   // 閱讀不寫 RPG 已讀、不進劇情紀錄
      showcase: n.imageKey, next: null,
      fallbackText: n.name + '\n（筆記圖片暫時無法顯示，請稍後再打開一次）',
      pages: [{ sp: 'note', face: n.imageKey, text: '' }],
    };
  }
  let reading = null;
  function decorate() {
    const ov = document.getElementById('rpg-overlay'); if (!ov) return;
    const box = ov.querySelector('.rpg-showcase'), img = ov.querySelector('.rpg-showcase-img');
    if (!box || !img) return;
    let wrap = box.querySelector('.advn-scroll');
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'advn-scroll'; img.parentNode.insertBefore(wrap, img); wrap.appendChild(img); }
    let zoom = box.querySelector('.advn-zoom');
    if (!zoom) {
      zoom = document.createElement('button'); zoom.type = 'button'; zoom.className = 'hv-ui-btn advn-zoom';
      zoom.addEventListener('click', e => {
        e.stopPropagation();
        const on = !box.classList.contains('advn-zoomed');
        box.classList.toggle('advn-zoomed', on); zoom.textContent = on ? '🔍 縮小' : '🔍 放大';
        wrap.scrollTop = 0; wrap.scrollLeft = on ? Math.max(0, (wrap.scrollWidth - wrap.clientWidth) / 2) : 0;
      });
      const done = box.querySelector('.rpg-showcase-done');
      box.insertBefore(zoom, done || null);
    }
    zoom.textContent = '🔍 放大';
    ov.classList.add('advn-reading');
    box.classList.remove('advn-zoomed');
  }
  function undecorate() {
    const ov = document.getElementById('rpg-overlay'); if (!ov) return;
    ov.classList.remove('advn-reading');
    const box = ov.querySelector('.rpg-showcase'); if (box) box.classList.remove('advn-zoomed');
  }
  // ui:true → 小V之家／介面中閱讀（不動 gameState，關閉回到原畫面）；ui:false → 冒險中（安全暫停，關閉後恢復）
  function read(id, opts) {
    const n = byId(id), o = opts || {};
    if (!available(n) || !(o.force || has(id))) return false;   // 未取得的筆記不能打開
    if (typeof rpgOpen !== 'function' || (typeof rpgIsActive === 'function' && rpgIsActive())) return false;
    ensureImage(n);
    const ok = rpgOpen(sceneFor(n), { ui: !!o.ui });
    if (ok) { reading = n.id; decorate(); }
    return ok;
  }
  // 圖片還在載入時，等一下再開（最多 3 秒；之後照既有規則顯示文字版）
  function readWhenReady(id, opts, done) {
    const n = byId(id); if (!n) return;
    const started = Date.now();
    const tick = () => {
      const st = ensureImage(n);
      if (st === 'loading' && Date.now() - started < 3000) { setTimeout(tick, 120); return; }
      const ok = read(id, opts);
      if (done) done(ok);
    };
    tick();
  }

  // ── C. 小V之家「冒險筆記」────────────────────────────────────────────────────────
  let tab = 'boss';
  const esc = s => (typeof h2Esc === 'function') ? h2Esc(s) : String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const url = p => { try { return (typeof h2Url === 'function' && h2Url(p)) || resolveAdventureAssetSrc(p); } catch (e) { return p; } };
  function row(o) {
    if (typeof h2RowHtml === 'function') return h2RowHtml(o);
    return '<div class="h2-row">' + (o.iconHtml || '') + '<b>' + esc(o.name) + '</b>' + (o.side || '') + '</div>';
  }
  function panelHtml() {
    syncFromInventory();
    if (!CATEGORIES.some(c => c.id === tab)) tab = 'boss';
    const tabs = '<div class="advn-tabs" role="tablist">' + CATEGORIES.map(c => {
      const ns = list(c.id), got = ns.filter(n => has(n.id)).length;
      return '<button type="button" role="tab" class="h2-pill h2-pill--yellow h2-tab' + (tab === c.id ? ' is-on' : '') + '" data-advn-tab="' + c.id + '" aria-selected="' + (tab === c.id) + '">'
        + esc(c.label) + (ns.length ? ' <small>' + got + ' / ' + ns.length + '</small>' : '') + '</button>';
    }).join('') + '</div>';
    const cat = CATEGORIES.find(c => c.id === tab);
    const ns = list(tab), got = ns.filter(n => has(n.id));
    let body = '';
    if (!got.length) body += '<div class="h2-empty advn-empty">' + esc(cat.empty) + '</div>';
    body += '<div class="h2-list">' + ns.map(n => {
      if (has(n.id)) {
        return row({
          iconHtml: '<img class="advn-thumb" src="' + esc(url(n.image)) + '" alt="" draggable="false">',
          name: n.name, desc: esc(n.stageName ? '取得地點：' + n.stageName : ''), attr: ' data-advn-row="' + esc(n.id) + '"',
          side: '<button type="button" class="h2-pill h2-pill--blue h2-pill--sm" data-advn-read="' + esc(n.id) + '">閱讀</button>',
        });
      }
      // 未取得：只顯示「？？？」與大概地點，不透露名稱、圖片與內容
      return row({ iconHtml: '<span class="advn-unknown" aria-hidden="true">？</span>', name: '？？？', zero: true,
        desc: esc('尚未找到' + (n.stageName ? '（' + n.stageName.split(' ')[0] + '）' : '')), attr: ' data-advn-row="' + esc(n.id) + '"' });
    }).join('') + '</div>';
    return tabs + body + '<div class="h2-sub" style="margin-top:0.7em">冒險筆記會永久收藏：從頭挑戰、背包重置或重新開啟遊戲都不會消失，也不佔背包空間。</div>'
      + '<div class="h2-sub advn-ver" style="margin-top:0.4em;opacity:.6;font-size:.8em">' + VERSION + '</div>';
  }

  function injectEntry() {
    const bar = document.querySelector('#h2-root .h2-topbar');
    if (!bar || document.getElementById('h2-notes-btn')) return;
    const b = document.createElement('button');
    b.type = 'button'; b.id = 'h2-notes-btn'; b.className = 'h2-pill h2-pill--purple h2-pill--sm';
    b.textContent = '冒險筆記';
    const hb = document.getElementById('h2-handbook-btn');
    if (hb && hb.parentNode === bar) bar.insertBefore(b, hb.nextSibling); else bar.appendChild(b);
  }
  function openPanel(category) {
    if (category) tab = category;
    syncFromInventory();
    if (typeof h2OpenPanel === 'function') h2OpenPanel('notes');
  }
  function rerender() { try { if (typeof H2 !== 'undefined' && H2.panel && H2.panel.kind === 'notes') h2RenderPanel(false); } catch (e) {} }
  function bindHome() {
    const root = document.getElementById('h2-root');
    if (!root || root.dataset.advnBound) return;
    root.dataset.advnBound = '1';
    root.addEventListener('click', e => {
      const t = e.target, c = s => t.closest && t.closest(s);
      if (c('#h2-notes-btn')) { openPanel(); return; }
      const tb = c('[data-advn-tab]'); if (tb) { tab = tb.dataset.advnTab; rerender(); return; }
      const rd = c('[data-advn-read]'); if (rd) { read(rd.dataset.advnRead, { ui: true }); return; }
    });
  }

  function injectStyles() {
    if (document.getElementById('advn-styles')) return;
    const st = document.createElement('style'); st.id = 'advn-styles';
    st.textContent = [
      '.advn-tabs{display:flex;gap:0.5em;flex-wrap:wrap;margin:0 0 0.7em}',
      '.advn-tabs small{opacity:.8;font-size:.82em}',
      '.advn-thumb{width:100%;height:100%;object-fit:contain;display:block}',
      '.advn-unknown{display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-weight:900;font-size:1.5em;color:#8a6a3a;opacity:.7}',
      '.advn-empty{margin-bottom:.6em}',
      /* 閱讀器：一般模式時外框不影響原本版面（display:contents）；放大時變成可捲動區域 */
      '#rpg-overlay .advn-scroll{display:contents}',
      '#rpg-overlay .advn-zoom{display:none;margin-top:calc(8px * var(--rk,1));font-size:calc(15px * var(--rk,1));padding:calc(5px * var(--rk,1)) calc(16px * var(--rk,1));cursor:pointer}',
      '#rpg-overlay.advn-reading .advn-zoom{display:inline-block}',
      '#rpg-overlay .rpg-showcase.advn-zoomed .advn-scroll{display:block;overflow:auto;-webkit-overflow-scrolling:touch;width:96%;height:78%;flex:0 0 auto;touch-action:pan-x pan-y}',
      '#rpg-overlay .rpg-showcase.advn-zoomed .rpg-showcase-img{max-width:none;max-height:none;width:180%;height:auto;display:block;margin:0 auto;animation:none}',
    ].join('\n');
    document.head.appendChild(st);
  }

  // ── E. 關卡拾取（金色燈泡）──────────────────────────────────────────────────────
  const pickupImgs = {};
  function pickupImg(key) {
    const d = PICKUP_ICONS[key]; if (!d) return null;
    if (!pickupImgs[key]) { const im = new Image(); im.src = (typeof resolveAdventureAssetSrc === 'function') ? resolveAdventureAssetSrc(d.path) : d.path; pickupImgs[key] = im; }
    const im = pickupImgs[key];
    return im.complete && im.naturalWidth ? im : null;
  }
  let run = { stage: null, told: {}, pending: null, pendingAt: 0 };
  function stageId() { try { return advCurrentStageId(); } catch (e) { return null; } }
  function stagePickups() {
    const sid = stageId(); if (!sid) return [];
    return NOTES.filter(n => available(n) && n.pickup && n.stageId === sid).map(n => ({ n, at: n.pickup.at() })).filter(p => p.at);
  }
  function stepPickups() {
    if (typeof gameState === 'undefined' || gameState !== 'playing' || typeof player === 'undefined') return;
    const sid = stageId();
    if (run.stage !== sid) run = { stage: sid, told: {}, pending: null, pendingAt: 0 };
    stagePickups().forEach(({ n, at }) => {
      const d = PICKUP_ICONS[n.pickupIcon] || { hit: 30 };
      const hit = typeof rectsOverlap === 'function'
        ? rectsOverlap(player.x, player.y, player.w, player.h, at.x - d.hit, at.y - d.hit, d.hit * 2, d.hit * 2)
        : false;
      if (!hit) return;
      if (has(n.id)) {
        // 已收藏：不再強制打開、不重複發放；只輕輕提示一次
        if (!run.told[n.id]) { run.told[n.id] = true; try { showHint('💡 已收藏「' + n.name + '」：可在小V之家的「冒險筆記」重新閱讀', 200); } catch (e) {} }
        return;
      }
      if (!collect(n.id, 'pickup')) return;
      run.told[n.id] = true;
      ensureImage(n);
      try { sfxPlay('secretDiscovered'); } catch (e) {}
      try { showHint('💡 獲得冒險知識筆記：' + n.name + '！已收進小V之家的「冒險筆記」', 260); } catch (e) {}
      run.pending = n.id; run.pendingAt = Date.now();
    });
    // 收藏後完整展示（等其他對話結束；圖片最多等 3 秒）
    if (run.pending && gameState === 'playing' && !(typeof rpgIsActive === 'function' && rpgIsActive())
        && !(typeof isDiscoveryItemModalOpen === 'function' && isDiscoveryItemModalOpen())) {
      const n = byId(run.pending);
      const st = ensureImage(n);
      if (st !== 'loading' || Date.now() - run.pendingAt > 3000) {
        if (read(n.id, { ui: false })) run.pending = null;
      }
    }
  }
  function drawPickups(cx) {
    if (typeof ctx === 'undefined') return;
    stagePickups().forEach(({ n, at }) => {
      const d = PICKUP_ICONS[n.pickupIcon] || { size: 50 };
      const sx = at.x - cx; if (sx < -80 || sx > CANVAS_W + 80) return;
      const t = (typeof bobT === 'number') ? bobT : performance.now() / 1000;
      const sy = at.y + Math.sin(t * 2.2) * 5;
      const got = has(n.id);
      ctx.save();
      if (got) ctx.globalAlpha *= 0.38;   // 已收藏：淡淡顯示（不發光），提醒這裡拿過了
      else if (typeof drawChapter2ItemGlow === 'function') drawChapter2ItemGlow(sx, sy, d.size * 0.72, true);
      const im = pickupImg(n.pickupIcon);
      if (im) ctx.drawImage(im, sx - d.size / 2, sy - d.size / 2, d.size, d.size);
      else { ctx.font = Math.round(d.size * 0.7) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(d.emoji || '💡', sx, sy); }
      ctx.restore();
    });
  }

  // ── 安裝：包裝既有全域函式（不修改 main.js）────────────────────────────────────
  function wrap(name, make) {
    const orig = window[name];
    if (typeof orig !== 'function' || orig.__advnWrapped) return false;
    const w = make(orig); w.__advnWrapped = true; window[name] = w;
    return true;
  }
  function install() {
    injectStyles();
    try { if (typeof H2_PANEL_TITLES !== 'undefined') H2_PANEL_TITLES.notes = '冒險筆記'; } catch (e) {}
    try { if (typeof H2_ICON !== 'undefined' && !H2_ICON.knowledgeNote) H2_ICON.knowledgeNote = { path: PICKUP_ICONS.knowledgeBulb.path, emoji: '💡' }; } catch (e) {}
    wrap('h2PanelBody', orig => function (kind, t) { return kind === 'notes' ? panelHtml() : orig.apply(this, arguments); });
    wrap('h2Open', orig => function () { const r = orig.apply(this, arguments); try { syncFromInventory(); injectEntry(); bindHome(); } catch (e) {} return r; });
    wrap('saveInventory', orig => function () { const r = orig.apply(this, arguments); syncFromInventory(); return r; });
    wrap('rpgClose', orig => function () { const was = reading; const r = orig.apply(this, arguments); if (was && !(typeof rpgIsActive === 'function' && rpgIsActive())) { reading = null; undecorate(); rerender(); } return r; });
    if (NOTES.some(n => available(n) && n.pickup)) {
      wrap('checkHiddenTreasure', orig => function () { const r = orig.apply(this, arguments); try { stepPickups(); } catch (e) { console.warn('[AdvNotes] pickup', e); } return r; });
      wrap('drawScorpionDefeatEffects', orig => function (cx) { try { drawPickups(cx); } catch (e) {} return orig.apply(this, arguments); });
    }
    injectEntry(); bindHome();
    syncFromInventory();
    // 筆記圖片提早預載（只載入本大陸可用的筆記）
    NOTES.filter(available).forEach(n => { if (n.pickup) { ensureImage(n); pickupImg(n.pickupIcon); } });
  }

  const api = {
    VERSION, CONTINENTS: CONTINENTS.slice(), CATEGORIES, NOTES, PICKUP_ICONS,
    byId, available, list, has, collect, read, readWhenReady, openPanel, syncFromInventory, storeKey,
    collected: () => Object.keys(load().notes).filter(id => available(byId(id))),
    record: id => Object.assign({}, load().notes[id] || null),
    debug: () => ({ continents: CONTINENTS, key: storeKey(), store: JSON.parse(JSON.stringify(load())), run: Object.assign({}, run), reading,
      pickups: stagePickups().map(p => ({ id: p.n.id, x: p.at.x, y: p.at.y })) }),
    _resetCache: () => { cache = null; cacheKey = null; },
  };
  Object.defineProperty(window, 'AdvNotes', { value: api });
  install();
})();

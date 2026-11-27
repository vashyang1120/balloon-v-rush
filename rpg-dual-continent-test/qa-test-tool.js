'use strict';
// Revision 5 Batch E: QA test tool (isolated developer tool).
// It only exists when the URL has guest=1, sandbox=1 and devtools=1 at the same time, so a normal
// player never sees it. Everything it changes goes into the isolated guest/sandbox test save.
// It sets states only; dialogues and events still come from normal play (E-02).
(() => {
  const query = new URLSearchParams(location.search);
  const allowed = query.get('guest') === '1' && query.get('sandbox') === '1' && query.get('devtools') === '1' &&
    typeof advDevMode === 'function' && advDevMode();
  if (!allowed) return;

  const PENDING = 'balloonV_qaTool_pending';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const toast = msg => { try { h2Toast(msg); } catch (e) {} try { showHint(msg, 240); } catch (e) {} console.log('[QA tool] ' + msg); };
  const save = () => { try { saveInventory(); } catch (e) {} };

  // ── E-01 RPG read/unread ───────────────────────────────────────────────────────
  const RPG_ITEMS = [
    { key: 'dice', label: '氣球骰子秘笈', ids: ['rpg020_find:recipe:balloonDice', 'rpg007_recipe:balloonDice'] },
    { key: 'volleyball', label: '氣球排球秘笈', ids: ['rpg020_find:recipe:balloonVolleyball', 'rpg007_recipe:balloonVolleyball'] },
    { key: 'umbrella', label: '3-1 雨傘秘笈', ids: ['c2_31_umbrella', 'rpg007_recipe:balloonUmbrella'] },
    { key: 'wet', label: '3-4 第一次溼身', ids: ['c34_first_wet'], taught: true },
    { key: 'dry', label: '3-4 第一次烘乾', ids: ['c34_first_dry_wind'], taught: true },
    { key: 'tree', label: '3-4 樹峽谷提示（第 2／4 次）', ids: ['c34_tree_gap_2', 'c34_tree_gap_4'], taught: true, attemptOnly: true },
  ];
  function rpgItemRead(item) {
    if (item.attemptOnly) return item.ids.every(id => c34.taught.has(id));
    return item.ids.every(id => rpgIsSeen(id));
  }
  function setRpgItem(item, read) {
    const data = rpgLoad();
    for (const id of item.ids) {
      if (!item.attemptOnly) {
        if (read) { if (!rpgIsSeen(id)) rpgMarkSeen(id, 'qaTool'); }
        else delete data.seen[id];
      }
      if (item.taught) { if (read) c34.taught.add(id); else c34.taught.delete(id); }
      try { if (!read) { rpgAttempt.shown.delete(id); rpgAttempt.queued.delete(id); } } catch (e) {}
    }
    try { rpgSave(); } catch (e) {}
  }

  // ── E-03 umbrella scenarios (3-1 cleared, home before 3-2) ──────────────────────
  // Recipe cost and pack price are read from the game data, never hard-coded.
  function umbrellaNumbers() {
    const recipe = RECIPES.find(r => r.id === 'balloonUmbrella');
    const pack = V395_SHOP.find(i => i.id === 'b260Bundle');
    const required = recipe.cost.balloon260;
    const quantity = Math.ceil(required / pack.n);
    return { recipe, pack, required, quantity, total: quantity * pack.price };
  }
  const UMB = {
    A: { label: 'A 已有雨傘', expect: '直接出發' },
    B: { label: 'B 已有材料', expect: '引導製作' },
    C: { label: 'C 金幣足夠買齊', expect: '商店引導購買' },
    D: { label: 'D 金幣不夠買一包', expect: '星靈完整救援（金幣保留）' },
    E: { label: 'E 金幣只夠買一部分', expect: '星靈完整救援（金幣保留）' },
  };
  function applyUmbrellaScenario(key) {
    const n = umbrellaNumbers(), inv = playerInventory;
    inv.unlockedRecipes = Object.assign({}, inv.unlockedRecipes, { balloonUmbrella: true });
    inv.craftedItems = Object.assign({}, inv.craftedItems, { balloonUmbrella: 0 });
    const flow = c2Flow();
    delete flow.umbrellaRescue; delete flow.umbrellaPurchaseGuide;
    inv.bagLevel = Math.max(1, inv.bagLevel || 1);
    if (key === 'A') inv.craftedItems.balloonUmbrella = 1;
    if (key === 'B') for (const [k, v] of Object.entries(n.recipe.cost)) inv[k] = Math.max(Number(inv[k]) || 0, v);
    if (key === 'C') { inv.balloon260 = 0; inv.coins = n.total; }
    if (key === 'D') { inv.balloon260 = 0; inv.coins = Math.max(0, n.pack.price - 1); }
    if (key === 'E') { inv.balloon260 = 0; inv.coins = Math.max(n.pack.price, (n.quantity - 1) * n.pack.price); }
    try { initEquippedUmbrella(); } catch (e) {}
    save();
    try { h2RenderAll(); } catch (e) {}
    const prep = c2UmbrellaPrep();
    const got = prep.ready ? 'ready' : prep.craft ? 'craft' : prep.buy ? 'buy' : prep.rescue ? 'rescue' : prep.rescued ? 'rescued' : 'noRecipe';
    toast('雨傘情境 ' + UMB[key].label + '：260 ×' + (inv.balloon260 || 0) + '、金幣 ' + inv.coins + ' → ' + got + '（預期：' + UMB[key].expect + '）');
    window.debugQaUmbrella = { key, prep, numbers: { required: n.required, packN: n.pack.n, price: n.pack.price, quantity: n.quantity, total: n.total } };
    return window.debugQaUmbrella;
  }
  function loadUmbrellaScenario(key) {
    sessionStorage.setItem(PENDING, JSON.stringify({ kind: 'umbrella', key }));
    const q = new URLSearchParams(location.search);
    q.set('ch3test', '3-2'); q.delete('ch3bag');
    location.search = q.toString();
  }
  function resumePending() {
    let job = null;
    try { job = JSON.parse(sessionStorage.getItem(PENDING) || 'null'); } catch (e) {}
    if (!job || job.kind !== 'umbrella') return;
    const started = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - started > 60000) { clearInterval(timer); sessionStorage.removeItem(PENDING); return; }
      try {
        if (!(typeof h2IsOpen === 'function' && h2IsOpen() && c2Is31Clear())) return;
      } catch (e) { return; }
      clearInterval(timer);
      sessionStorage.removeItem(PENDING);
      applyUmbrellaScenario(job.key);
    }, 250);
  }

  // ── E-04 resources ──────────────────────────────────────────────────────────────
  const RES = [
    { key: 'coins', label: '冒險金幣', get: () => playerInventory.coins, set: v => { playerInventory.coins = v; } },
    { key: 'b260', label: '260 長條氣球', get: () => playerInventory.balloon260, set: v => { playerInventory.balloon260 = v; } },
    { key: 'round', label: '圓形氣球', get: () => playerInventory.roundBalloon, set: v => { playerInventory.roundBalloon = v; } },
    { key: 'bag', label: '背包等級（1／2）', get: () => playerInventory.bagLevel || 1, set: v => { playerInventory.bagLevel = Math.max(1, Math.min(V395_BAG.maxLevel, v)); } },
    { key: 'hp', label: 'HP', get: () => player.hp, set: v => { player.hp = Math.max(1, Math.min(player.maxHp || 3, v)); try { refreshAllHpDisplays(); } catch (e) {} } },
    { key: 'umbrella', label: '氣球雨傘（把）', get: () => (playerInventory.craftedItems || {}).balloonUmbrella || 0,
      set: v => { playerInventory.unlockedRecipes.balloonUmbrella = true; playerInventory.craftedItems.balloonUmbrella = v; try { initEquippedUmbrella(); } catch (e) {} } },
    { key: 'dice', label: '氣球骰子（顆）', get: () => (playerInventory.craftedItems || {}).balloonDice || 0,
      set: v => { playerInventory.unlockedRecipes.balloonDice = true; playerInventory.craftedItems.balloonDice = v; } },
  ];

  // ── E-05 shortcuts ──────────────────────────────────────────────────────────────
  function startAt(stageId, opts) {
    const o = Object.assign({ dog: false, section: 'start' }, opts);
    if (typeof gameStartGateActive !== 'undefined' && gameStartGateActive) { toast('請先按「開始冒險」'); return; }
    try { if (rpgActive) rpgClose('skipped'); } catch (e) {}
    c34DevBegin(stageId);
    nextBringDog = !!o.dog;
    c34Start(stageId, 'dev', o.section);
    if (!o.place) return;
    const begun = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - begun > 60000) { clearInterval(timer); return; }
      if (advCurrentStageId() !== stageId || gameState !== 'playing' || assetGateActive) return;
      clearInterval(timer);
      setTimeout(() => {
        try { if (rpgActive) rpgClose('skipped'); } catch (e) {}
        const at = o.place();
        player.x = at.x; player.y = at.y - player.h; player.vx = 0; player.vy = 0; player.onGround = true;
        cameraX = Math.max(0, Math.min(LEVEL_LENGTH - CANVAS_W, player.x - 380));
        try { if (c34Is()) c34.camY = c34CamTarget(true); } catch (e) {}
        if (at.after) at.after();
        toast('已傳送：' + o.name);
      }, 350);
    }, 100);
  }
  const L = () => C34_LAY;
  const SHORTCUTS = [
    { key: 'umbrella31', name: '3-1 雨傘秘笈（帶狗）', go: () => startAt('3-1', { dog: true, name: '3-1 雨傘秘笈前', place: () => ({ x: 2900 - 260, y: GROUND_Y }) }) },
    { key: 'scorpion32', name: '3-2 新增風刃蠍子', go: () => startAt('3-2', { name: '3-2 開頭空地（新蠍子在右邊 x 650～750）', place: () => ({ x: 380, y: GROUND_Y }) }) },
    { key: 'tree', name: '3-4 樹峽谷', go: () => startAt('3-4', { name: '3-4 P2 樹旁', place: () => ({ x: L().p2.x + 40, y: L().y(L().p2.h) }) }) },
    { key: 'pool', name: '3-4 水池／瀑布', go: () => startAt('3-4', { section: 'pool', name: '3-4 水池區段' }) },
    { key: 'dogpool', name: '3-4 水池（帶小狗，狗狗游泳）', go: () => startAt('3-4', { section: 'pool', dog: true, name: '3-4 水池區段（小狗同行）' }) },
    { key: 'chest', name: '3-4 珍貴寶箱（帶狗）', go: () => startAt('3-4', { dog: true, name: '3-4 烘乾風口前（往右走進風口再跳、往左上到寶箱岩棚）',
      place: () => ({ x: L().dryingVent.x - 160, y: L().y(L().ct.h) }) }) },
    { key: 'camera', name: '3-4 高台鏡頭', go: () => startAt('3-4', { name: '3-4 P3 岩棚（往右跳上峽谷頂部）', place: () => ({ x: L().p3.x + 20, y: L().y(L().p3.h) }) }) },
    { key: 'dice', name: '骰子音效（寶箱前，骰子 1 顆）', go: () => startAt('3-4', { dog: true, name: '寶箱岩棚（站到寶箱旁，星靈邀請會直接出現）',
      place: () => ({ x: L().chestLedge.x + 30, y: L().y(L().chestLedge.h),
        after: () => { playerInventory.unlockedRecipes.balloonDice = true; playerInventory.craftedItems.balloonDice = Math.max(1, v395Count('balloonDice')); } }) }) },
    // Adventure Notes System Test 1：冒險筆記
    { key: 'note34', name: '3-4 冒險知識筆記（第一平台 P1，燈泡在右前方）', go: () => startAt('3-4', { name: '3-4 第一平台 P1（往右走碰燈泡）',
      place: () => ({ x: L().p1.x + 40, y: L().y(L().p1.h) }) }) },
    { key: 'note34fly', name: '3-4 導風裝置前（實際飛過深淵 A1 再拿燈泡）', go: () => startAt('3-4', { name: '3-4 導風裝置前（敲星星墊選角度，再走進風裡）',
      place: () => ({ x: 860, y: GROUND_Y }) }) },
    { key: 'note23', name: '2-3 橘子王觀察筆記（第一大陸關卡，帶狗）', go: () => startAt('2-3', { dog: true, name: '2-3 筆記前（往右走）',
      place: () => ({ x: 4980, y: GROUND_Y }) }) },
    { key: 'noteshome', name: '小V之家「冒險筆記」', go: () => openNotesHome() },
  ];
  function openNotesHome() {
    try { if (!(typeof h2IsOpen === 'function' && h2IsOpen())) c34OpenTestHome('3-1'); } catch (e) {}
    const begun = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - begun > 60000) return clearInterval(timer);
      try { if (!h2IsOpen() || assetGateActive) return; } catch (e) { return; }
      clearInterval(timer);
      try { if (typeof h2HideSummary === 'function') h2HideSummary(); } catch (e) {}
      try { window.AdvNotes.openPanel(); toast('已打開小V之家「冒險筆記」'); } catch (e) {}
    }, 200);
  }
  // 冒險筆記收藏（只改訪客沙盒的測試收藏）
  function notesStatus() {
    const A = window.AdvNotes; if (!A) return [];
    return A.list().map(n => ({ n, got: A.has(n.id) }));
  }
  function setNote(id, got) {
    const A = window.AdvNotes; if (!A) return;
    const k = A.storeKey();
    let d = null; try { d = JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) {}
    if (!d || !d.notes) d = { v: 1, notes: {} };
    if (got) d.notes[id] = d.notes[id] || { id, at: Date.now(), src: 'qaTool' }; else delete d.notes[id];
    localStorage.setItem(k, JSON.stringify(d));
    A._resetCache();
    if (!got && id === 'orangeKingWeaknessNote01') { try { delete playerInventory.keyItems[id]; save(); } catch (e) {} }
    try { if (h2IsOpen()) h2RenderAll(); } catch (e) {}
    try { if (H2.panel && H2.panel.kind === 'notes') h2RenderPanel(false); } catch (e) {}
  }

  // ── UI ──────────────────────────────────────────────────────────────────────────
  const css = document.createElement('style');
  css.textContent = `
#qa-tool-btn{position:fixed;left:8px;bottom:8px;z-index:2147483000;font:800 13px/1 system-ui,sans-serif;padding:8px 10px;border-radius:999px;border:2px solid #fff;background:#5b2bd6;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.4);cursor:pointer}
#qa-tool{position:fixed;inset:4vh 4vw;z-index:2147483001;background:#fffdf6;color:#2b1d0e;border:3px solid #5b2bd6;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.5);display:none;flex-direction:column;font:14px/1.45 system-ui,sans-serif}
#qa-tool.on{display:flex}
#qa-tool header{display:flex;align-items:center;gap:8px;padding:8px 12px;background:#5b2bd6;color:#fff;font-weight:900}
#qa-tool header button{margin-left:auto}
#qa-tool .qa-body{overflow:auto;padding:10px 12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px}
#qa-tool section{border:1px solid #d8c9a8;border-radius:10px;padding:8px 10px;background:#fff}
#qa-tool h3{margin:0 0 6px;font-size:14px}
#qa-tool .row{display:flex;align-items:center;gap:6px;margin:4px 0;flex-wrap:wrap}
#qa-tool .row span.l{flex:1 1 140px}
#qa-tool button{font:700 13px system-ui,sans-serif;padding:4px 9px;border-radius:8px;border:1px solid #6d4c1f;background:#ffe08a;cursor:pointer}
#qa-tool button.alt{background:#e7e2ff}
#qa-tool input{width:70px;font:13px system-ui,sans-serif;padding:3px 5px}
#qa-tool .st{font-size:12px;padding:1px 6px;border-radius:6px;background:#eee}
#qa-tool .st.read{background:#c8f2c8}#qa-tool .st.unread{background:#ffd6d6}
#qa-tool small{color:#7a6a55}`;
  document.head.appendChild(css);
  const btn = document.createElement('button');
  btn.id = 'qa-tool-btn'; btn.type = 'button'; btn.textContent = '🧪 QA 測試工具';
  const box = document.createElement('div');
  box.id = 'qa-tool';
  document.body.append(btn, box);

  function render() {
    const inC34 = (() => { try { return c34Is(); } catch (e) { return false; } })();
    const mode = (() => { try { return rpgGetMode(); } catch (e) { return 'first'; } })();
    const n = umbrellaNumbers();
    box.innerHTML = `<header>🧪 QA 測試工具（Revision 5，只在訪客沙盒＋開發工具顯示）<button type="button" data-qa="close">關閉</button></header>
<div class="qa-body">
<section><h3>① RPG 已讀／未讀（E-01）</h3>
${RPG_ITEMS.map(item => { const r = rpgItemRead(item); return `<div class="row"><span class="l">${esc(item.label)} <span class="st ${r ? 'read' : 'unread'}">${r ? '已讀' : '未讀'}</span></span>
<button type="button" data-qa="read" data-k="${item.key}">設為已讀</button><button type="button" class="alt" data-qa="unread" data-k="${item.key}">設為未讀</button></div>`; }).join('')}
<div class="row"><span class="l">樹峽谷失敗次數 ${inC34 ? '' : '<small>（進 3-4 才有效）</small>'}</span><input type="number" min="0" max="9" id="qa-tree-fail" value="${inC34 ? c34.treeFailures : 0}"><button type="button" data-qa="treefail">套用</button></div>
<div class="row"><span class="l">RPG 顯示模式</span>${['full', 'first', 'off'].map(m => `<button type="button" class="${m === mode ? '' : 'alt'}" data-qa="mode" data-k="${m}">${esc(RPG_MODE_LABEL[m])}</button>`).join('')}</div>
<small>樹峽谷提示是「每次挑戰」計算：設為已讀＝本次挑戰不再出現；重新開始關卡會恢復。</small></section>
<section><h3>② 雨傘情境 A～E（E-03）</h3>
<small>一鍵載入「3-1 通關、準備前往 3-2」的小V之家。雨傘需要 260 ×${n.required}；商店一包 ${n.pack.n} 條 ${n.pack.price} 金幣（讀取遊戲資料）。</small>
${Object.entries(UMB).map(([k, u]) => `<div class="row"><span class="l">${esc(u.label)}<br><small>預期：${esc(u.expect)}</small></span><button type="button" data-qa="umb" data-k="${k}">載入</button></div>`).join('')}</section>
<section><h3>③ 資源設定（E-04）</h3>
${RES.map(r => `<div class="row"><span class="l">${esc(r.label)}</span><input type="number" id="qa-res-${r.key}" value="${esc(r.get() ?? 0)}"><button type="button" data-qa="res" data-k="${r.key}">套用</button></div>`).join('')}
<div class="row"><button type="button" data-qa="res-all">全部套用</button><small>寫入訪客沙盒的測試背包（不影響正式存檔）</small></div></section>
<section><h3>④ 快速前往（E-05）</h3>
${SHORTCUTS.map((s, i) => `<div class="row"><span class="l">${esc(s.name)}</span><button type="button" data-qa="go" data-k="${i}">前往</button></div>`).join('')}
<small>前往後照一般遊玩操作即可觸發事件（工具不會直接播放對話）。</small></section>
<section><h3>⑤ 冒險筆記收藏（Notes Test 1）</h3>
${notesStatus().map(({ n, got }) => `<div class="row"><span class="l">${esc(n.name)} <span class="st ${got ? 'read' : 'unread'}">${got ? '已收藏' : '未收藏'}</span></span>
<button type="button" data-qa="note-on" data-k="${esc(n.id)}">設為已收藏</button><button type="button" class="alt" data-qa="note-off" data-k="${esc(n.id)}">清除</button></div>`).join('')}
<small>只改訪客沙盒的測試收藏。清除橘子王筆記時，也會一起清掉測試背包裡的筆記，方便重新體驗 2-3 拾取。</small></section>
</div>`;
  }
  function open() {
    try { if (gameState === 'playing') pauseGame(); } catch (e) {}
    render(); box.classList.add('on');
  }
  function close() { box.classList.remove('on'); }
  btn.addEventListener('click', () => (box.classList.contains('on') ? close() : open()));
  box.addEventListener('click', e => {
    const b = e.target.closest('button[data-qa]'); if (!b) return;
    const act = b.dataset.qa, k = b.dataset.k;
    if (act === 'close') return close();
    if (act === 'read' || act === 'unread') { setRpgItem(RPG_ITEMS.find(i => i.key === k), act === 'read'); toast('RPG：' + RPG_ITEMS.find(i => i.key === k).label + ' → ' + (act === 'read' ? '已讀' : '未讀')); }
    if (act === 'treefail') { try { if (c34Is()) { c34.treeFailures = Math.max(0, Math.floor(Number(document.getElementById('qa-tree-fail').value) || 0)); toast('樹峽谷失敗次數 → ' + c34.treeFailures); } else toast('請先進入 3-4'); } catch (err) {} }
    if (act === 'mode') rpgSetMode(k);
    if (act === 'note-on' || act === 'note-off') { setNote(k, act === 'note-on'); toast('冒險筆記：' + k + (act === 'note-on' ? ' → 已收藏' : ' → 已清除')); }
    if (act === 'umb') return loadUmbrellaScenario(k);
    if (act === 'res' || act === 'res-all') {
      for (const r of RES.filter(r => act === 'res-all' || r.key === k)) {
        const v = Math.max(0, Math.floor(Number(document.getElementById('qa-res-' + r.key).value) || 0));
        r.set(v);
      }
      save();
      try { refreshAllHpDisplays(); } catch (err) {}
      try { if (h2IsOpen()) h2RenderAll(); } catch (err) {}
      try { if (gameState === 'paused') p2RenderPause(); } catch (err) {}
      toast('資源已套用');
    }
    if (act === 'go') { close(); try { if (h2IsOpen()) { h2ClosePanel(); } } catch (err) {} return SHORTCUTS[Number(k)].go(); }
    render();
  });

  // The button stays out of the way of the touch controls: it is hidden while the stage is being played
  // and shows on the start gate, at home, in the pause menu and on result screens.
  setInterval(() => {
    let playing = false;
    try { playing = gameState === 'playing' && !(typeof h2IsOpen === 'function' && h2IsOpen()); } catch (e) {}
    const want = playing && !box.classList.contains('on') ? 'none' : '';
    if (btn.style.display !== want) btn.style.display = want;
  }, 200);
  resumePending();
  // Landing-page links: ?qago=<shortcut key> runs a shortcut once the game is running; ?qaopen=1 opens the panel.
  const autoGo = query.get('qago'), autoOpen = query.get('qaopen') === '1';
  if (autoGo || autoOpen) {
    const begun = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - begun > 90000) return clearInterval(timer);
      try {
        if (gameStartGateActive || assetGateActive) return;
        if (autoGo) { if (gameState !== 'playing' && !(typeof h2IsOpen === 'function' && h2IsOpen())) return; }
        else if (!(typeof h2IsOpen === 'function' && h2IsOpen()) && gameState !== 'playing') return;
      } catch (e) { return; }
      clearInterval(timer);
      const s = SHORTCUTS.find(x => x.key === autoGo);
      if (s) s.go(); else open();
    }, 250);
  }
  window.qaTestTool = { open, close, render, setNote, openNotesHome, applyUmbrellaScenario, loadUmbrellaScenario, setRpgItem, RPG_ITEMS, SHORTCUTS, umbrellaNumbers };
})();

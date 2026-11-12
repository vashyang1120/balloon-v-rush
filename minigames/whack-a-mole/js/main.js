/* =========================================================
 * main.js — 啟動、主迴圈、畫面切換（開場 / 遊戲 / 結算）
 * 網址參數：?seed=123456 指定種子；?debug=0 隱藏測試資訊
 * ========================================================= */
(function (W) {
  'use strict';
  var WAM = W.WAM;
  var C = WAM.CONFIG;
  var $ = function (id) { return document.getElementById(id); };

  var params = new URLSearchParams(location.search);
  var canvas = $('board');
  var grid = new WAM.HoleGrid();
  var spirit = new WAM.SpiritView($('spirit'));
  var game, renderer;

  function isCompact() {
    var coarse = W.matchMedia && W.matchMedia('(pointer: coarse)').matches;
    return coarse || W.innerHeight < 560;
  }

  game = new WAM.Game(grid, {
    onSpirit: function (key, text) {
      spirit.open(text, '知道了 ▶', function (realMs) { game.closeSpirit(realMs); });
    },
    onEnd: function (result) { showResult(result); }
  });
  renderer = new WAM.Renderer(canvas, grid, game);
  renderer.debug = params.get('debug') !== '0';
  new WAM.Input(canvas, game, renderer);

  /* ---------- 開局 ---------- */
  function newRound(seed) {
    $('result').classList.add('hidden');
    game.reset(seed);
    updateSeedUrl(seed);
    // 開場星靈對話：關閉後 30 秒才開始
    spirit.open(C.SPIRIT_TEXT.opening, '開始！ ▶', function (realMs) { game.start(realMs); });
  }
  function updateSeedUrl(seed) {
    try {
      var u = new URL(location.href);
      u.searchParams.set('seed', seed);
      history.replaceState(null, '', u.toString());
    } catch (e) { /* 預覽環境可能不允許，忽略 */ }
  }

  /* ---------- 結算 ---------- */
  function showResult(r) {
    var tier = r.tier;
    $('resScore').textContent = r.score;
    $('resTier').textContent = tier.name + '（' + WAM.Rewards.tierRangeText(tier) + '）';
    $('resTier').className = 'res-tier tier-' + tier.id;
    var items = ['金幣 ×' + tier.coins, '260氣球 ×' + tier.balloon260];
    if (tier.roundBalloon) items.push('圓氣球 ×' + tier.roundBalloon);
    $('resRewards').innerHTML = items.map(function (s) { return '<li>' + s + '</li>'; }).join('');
    var c = r.counts;
    $('resDetail').textContent =
      '蠍子怪 ' + c.scorpion + '・金槌命中 ' + (c.goldScorpion + c.goldOrange + c.goldSpike) +
      '・橘子王 ' + c.boss + ' 下・爆槌 ' + c.breaks + ' 次・種子 ' + r.seed;
    $('resCost').textContent = '本局成本 ' + C.PLAY_COST_COINS + ' 金幣（模擬，未實際扣款／未發放材料）';
    $('result').classList.remove('hidden');
  }

  $('btnSameSeed').addEventListener('click', function () { newRound(game.seed); });
  $('btnNewSeed').addEventListener('click', function () { newRound(WAM.newSeed()); });
  $('dbgSame').addEventListener('click', function () { newRound(game.seed); });
  $('dbgNew').addEventListener('click', function () { newRound(WAM.newSeed()); });
  $('dbgToggle').addEventListener('click', function () { setDebug(!renderer.debug); });
  function setDebug(on) {
    renderer.debug = on;
    $('debugBar').classList.toggle('collapsed', !on);
    $('dbgToggle').textContent = on ? '隱藏測試資訊' : '測試';
  }
  W.addEventListener('keydown', function (e) {
    if (e.code === 'Backquote' && !e.repeat) setDebug(!renderer.debug);
  });

  /* ---------- 版面 / 方向 / 分頁 ---------- */
  function layout() {
    grid.setMode(isCompact());
    renderer.resize();
    var portrait = W.innerHeight > W.innerWidth && isCompact();
    $('rotate').classList.toggle('hidden', !portrait);
    game.setPause('orient', portrait, performance.now());
    var side = grid.sideW / WAM.VIEW_W * 100;
    $('debugBar').style.width = (side - 2.4) + '%';
  }
  W.addEventListener('resize', layout);
  W.addEventListener('orientationchange', function () { setTimeout(layout, 200); });
  document.addEventListener('visibilitychange', function () {
    game.setPause('hidden', document.hidden, performance.now());
  });

  /* ---------- 主迴圈 ---------- */
  function frame() {
    var now = performance.now();
    game.update(now);
    renderer.draw(now);
    requestAnimationFrame(frame);
  }

  var seedParam = parseInt(params.get('seed'), 10);
  layout();
  setDebug(renderer.debug);
  newRound(isFinite(seedParam) && seedParam > 0 ? seedParam : WAM.newSeed());
  requestAnimationFrame(frame);

  W.__wam = { game: game, grid: grid, renderer: renderer }; // 開發測試用
})(window);

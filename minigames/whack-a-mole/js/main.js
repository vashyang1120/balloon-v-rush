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
  var AU = WAM.Audio;
  WAM.Assets.loadAll();
  AU.preload();
  AU.bindUnlock();
  var game, renderer;

  function isCompact() {
    var coarse = W.matchMedia && W.matchMedia('(pointer: coarse)').matches;
    return coarse || W.innerHeight < 560;
  }

  game = new WAM.Game(grid, {
    onSpirit: function (key, text) {
      AU.play('dialogOpen');
      spirit.open(text, '知道了 ▶', function (realMs) { game.closeSpirit(realMs); }, 'spiritAngry');
    },
    onEnd: function (result) {
      AU.bgmFadeOut();
      // 第 30 秒若第二把金槌仍有效，會同時響「金槌結束音」→ 結算音延後 0.55 秒，兩者不互相干擾
      var goldAtEnd = game.hammer.goldFrom >= 0 && Math.abs(game.hammer.goldUntil - C.GAME_DURATION) < 1e-6;
      AU.play('result', goldAtEnd ? 0.55 : 0);
      showResult(result);
    }
  });
  renderer = new WAM.Renderer(canvas, grid, game);
  renderer.debug = params.get('debug') !== '0';
  // 敲擊音效（只依結果播放，不影響任何判定與間隔）
  new WAM.Input(canvas, game, renderer, function (res) {
    if (!res.ok) return;
    switch (res.outcome) {
      case 'scorpion': AU.play('hammerHit'); AU.play('scorpionHurt'); break;
      case 'gold-orange': case 'gold-spike': AU.play('hammerHit'); break;
      case 'bossHit': AU.play('hammerHit'); AU.play('bossHurt'); break;
      case 'ring': AU.play('ringGet'); break;
      case 'break': AU.play('balloonPop'); break;
      case 'empty': AU.play('hammerSwing'); break;
    }
  });

  /* ---------- 開局 ---------- */
  function newRound(seed) {
    $('result').classList.add('hidden');
    AU.bgmStop();
    prevBroken = false; prevBoss = false; cueT = 0;
    game.reset(seed);
    updateSeedUrl(seed);
    // 開場星靈對話：關閉後 30 秒才開始
    spirit.open(C.SPIRIT_TEXT.opening, '開始！ ▶', function (realMs) {
      game.start(realMs);
      AU.bgmStart(); // 在玩家點擊中啟動，手機瀏覽器才允許播放
    }, 'spiritNormal');
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

  ['btnSameSeed', 'btnNewSeed', 'dbgSame', 'dbgNew', 'dbgToggle'].forEach(function (id) {
    $(id).addEventListener('pointerdown', function () { AU.play('uiClick'); });
  });
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
    AU.setSuspended(document.hidden);
  });

  /* ---------- 主迴圈 ---------- */
  /* 無敵槌倒數：只看遊戲時鐘（星靈對話、直拿、切分頁暫停時時鐘不動 → 不會偷偷前進）
   * - 必須主動敲中金環才有金槌；沒取得就沒有倒數
   * - 晚取得只播之後的節點；已錯過的不補播；每個節點最多一次（cueT 只會往前） */
  var cueT = 0;
  function goldCues() {
    if (game.state !== 'playing' && game.state !== 'ended') return;
    var t = game.clock.t, h = game.hammer;
    if (t <= cueT) return;
    if (h.goldFrom >= 0) {
      var U = h.goldUntil;
      var nodes = C.GOLD_COUNTDOWN.map(function (sec, i, a) {
        return { at: U - sec, kind: i === a.length - 1 ? 'tickHigh' : 'tick' };
      });
      nodes.push({ at: U, kind: 'goldEnd' });
      nodes.forEach(function (n) {
        if (n.at > cueT + 1e-6 && n.at <= t + 1e-6 && n.at > h.goldFrom + 1e-6) AU.tone(n.kind);
      });
    }
    cueT = t;
  }

  var prevBroken = false, prevBoss = false;
  function frame() {
    var now = performance.now();
    game.update(now);
    goldCues();
    // 音訊跟著遊戲時鐘（只讀狀態，不改判定）
    if (game.state === 'playing') {
      var t = game.clock.t;
      AU.bgmSetPaused(game.clock.isPaused());
      var broken = game.hammer.isBroken(t);
      if (prevBroken && !broken) AU.play('reinflate'); // 1.5 秒修復完成
      prevBroken = broken;
      var boss = game.boss.isActive(t);
      if (boss && !prevBoss) AU.play('bossIntro');
      prevBoss = boss;
    }
    renderer.draw(now);
    if (spirit.isOpen() && !spirit.icon.classList.contains('has-img')) spirit.refreshFace();
    requestAnimationFrame(frame);
  }

  var seedParam = parseInt(params.get('seed'), 10);
  layout();
  setDebug(renderer.debug);
  newRound(isFinite(seedParam) && seedParam > 0 ? seedParam : WAM.newSeed());
  requestAnimationFrame(frame);

  W.__wam = { game: game, grid: grid, renderer: renderer }; // 開發測試用
})(window);

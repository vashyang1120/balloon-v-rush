/* ==========================================================
   派對島大作戰・第一大陸 × 遊戲宇宙「正式成績」掛鉤（最小修改）
   adventure-v0.4.1-continent1-universe + balloon-v-universe-v0.3.0-launch-integration-test-1

   做的事情只有兩件（不改任何關卡、角色、怪物、武器、碰撞、金幣、道具、商店、動畫、音效、BGM、操作、結算規則）：
     1. 正式冒險的一趟（challengeId）開始時，向遊戲宇宙伺服器取得「場次」（POST /v1/sessions）
     2. 第一大陸「完整、正式」通關後（沿用 achOnContinentComplete 的判定：七關完整、打倒 2-4 王、不是開發者模式、
        不是訪客、玩家存在），把派對島自己算好的大陸總分送到伺服器（POST /v1/scores）
   ‧ 總分、五大分項、連鎖加分、七關通關秒數都直接取自原本的 advComputeScore 結果，不另外計算
   ‧ 練習模式、王關重戰、測試捷徑、開發者模式、訪客、測試沙盒：一律不送
   ‧ 伺服器判定 accepted／pending_review／rejected 後，在總結算畫面多顯示一行結果
   ‧ 送不出去（斷線）會暫存，下次開啟時自動補送（同一個 submissionId，不會重複計分或重複加幣）
   ‧ 正式成績功能（伺服器 SCORES_ENABLED）沒有開啟時，什麼都不會寫入
   依賴：遊戲宇宙共用 SDK v0.3.0 以上（universe-sdk.js 的 BVUniverse.createOfficialClient）
   ========================================================== */
(function () {
  'use strict';
  var U = window.BVUniverse;
  if (!U || typeof U.createOfficialClient !== 'function') { console.log('[C1U-official] 共用 SDK 沒有正式成績功能（v0.3.0 以上才有）→ 不送成績'); return; }
  if (typeof C1U === 'undefined' || C1U.mode !== 'production') return;          // 測試沙盒：永遠不送正式資料

  var SESS_KEY = function () { return 'bvUniverseAdventure_v3_officialSessions__' + C1U.playerId; };
  var SESSION_REFRESH_MS = 5 * 3600 * 1000;   // 伺服器場次 6 小時有效；超過 5 小時就重新取得

  function eligiblePlayer() {
    return typeof c1uIsUniversePlayer === 'function' && c1uIsUniversePlayer() && C1U.verify !== 'notFound'
      && !(typeof advDevMode === 'function' && advDevMode());
  }
  var official = U.createOfficialClient({ gameId: 'adventure', gameVersion: GAME_VERSION, mode: 'production',
    getPlayer: function () { return eligiblePlayer() ? { playerId: C1U.playerId } : null; } });

  function readSessions() { try { var v = JSON.parse(localStorage.getItem(SESS_KEY()) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } }
  function writeSessions(m) {
    var keys = Object.keys(m).sort(function (a, b) { return (m[b].at || 0) - (m[a].at || 0); }).slice(0, 5);
    var out = {}; keys.forEach(function (k) { out[k] = m[k]; });
    try { localStorage.setItem(SESS_KEY(), JSON.stringify(out)); } catch (e) {}
  }
  /* 這一趟冒險的成績編號：固定由 challengeId 產生（和本機 __results 紀錄的 submissionId 相同） */
  function submissionIdFor(challengeId) { return String(challengeId).replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 64); }

  var pending = {};
  function ensureSession(challengeId) {
    if (!challengeId || pending[challengeId]) return pending[challengeId] || Promise.resolve(null);
    var m = readSessions(), cur = m[challengeId];
    if (cur && Date.now() - cur.at < SESSION_REFRESH_MS) return Promise.resolve(cur);
    pending[challengeId] = official.beginRun().then(function (run) {
      delete pending[challengeId];
      if (!run || !run.official) { console.log('[C1U-official] 不取得正式場次：', run && run.reason); return null; }
      var rec = { sessionId: run.sessionId, playerId: run.playerId, startedAt: run.startedAt, at: Date.now() };
      var mm = readSessions(); mm[challengeId] = rec; writeSessions(mm);
      return rec;
    }, function () { delete pending[challengeId]; return null; });
    return pending[challengeId];
  }

  /* 1) 正式冒險的每次關卡嘗試開始時：確保這一趟有伺服器場次（中途接續存檔、超過 5 小時也會補取） */
  var origAttempt = window.advOnAttemptStart;
  if (typeof origAttempt === 'function') {
    window.advOnAttemptStart = function () {
      var r = origAttempt.apply(this, arguments);
      try {
        if (advPlayMode === 'official' && eligiblePlayer()) {
          var run = advLoad().active;
          if (run && run.status === 'in_progress') ensureSession(run.challengeId);
        }
      } catch (e) { console.warn('[C1U-official] 場次', e); }
      return r;
    };
  }

  function scoreDataFrom(snap) {
    var stageClearSec = {};
    OFFICIAL_ADVENTURE_STAGE_IDS.forEach(function (sid) { var r = snap.stageResults && snap.stageResults[sid]; if (r) stageClearSec[sid] = Number(r.clearSec) || 0; });
    var P = snap.scores || {};
    return { continentId: 1, total: snap.total, rank: String(snap.rank || ''), scoreVersion: snap.scoreVersion,
      complete: snap.complete === true, bossDefeated: !!(snap.raw && snap.raw.combat && snap.raw.combat.bossDefeated),
      parts: { collect: P.collect, explore: P.explore, combat: P.combat, survival: P.survival, efficiency: P.efficiency },
      chainBonus: snap.chainBonus || 0, stages: OFFICIAL_ADVENTURE_STAGE_IDS.slice(), stageClearSec: stageClearSec };
  }

  function showLine(text, kind) {
    try {
      var el = document.getElementById('adv-final-overlay'); if (!el) return;
      var line = document.getElementById('c1u-official-result');
      if (!line) {
        line = document.createElement('div'); line.id = 'c1u-official-result';
        line.style.cssText = 'margin:10px auto;padding:10px 14px;max-width:640px;border-radius:12px;font-weight:800;text-align:center;line-height:1.5;background:#fff7d6;color:#6b3a12;';
        var btns = el.querySelector('.adv-final-btns'); (btns ? btns.parentNode : el).insertBefore(line, btns || null);
      }
      line.textContent = text;
      line.dataset.kind = kind || '';
    } catch (e) {}
  }

  /* 2) 第一大陸完整通關：沿用原本的資格判定（c1uFinalCtx.eligible）與成績快照（advLastSnapshot） */
  var origClear = window.advAfterClear;
  if (typeof origClear === 'function') {
    window.advAfterClear = function () {
      var r = origClear.apply(this, arguments);
      try {
        var ctx = typeof c1uFinalCtx !== 'undefined' ? c1uFinalCtx : null;
        var snap = typeof advLastSnapshot !== 'undefined' ? advLastSnapshot : null;
        if (advPlayMode !== 'official' || !ctx || !ctx.eligible || !snap || snap.testOnly || !snap.complete || snap.challengeId !== ctx.challengeId) return r;
        submitSnapshot(snap);
      } catch (e) { console.warn('[C1U-official] 送出成績', e); }
      return r;
    };
  }

  function submitSnapshot(snap) {
    showLine('📮 正在把第一大陸成績送到遊戲宇宙伺服器…');
    official.init().then(function () {
      if (!official.isEnabled()) { showLine('遊戲宇宙正式成績尚未開啟，這次成績只保存在這台裝置。'); return; }
      return ensureSession(snap.challengeId).then(function (sess) {
        if (!sess) { showLine('⚠️ 沒有取得正式場次，這次成績沒有記入正式排行榜。'); return; }
        var run = { official: true, sessionId: sess.sessionId, playerId: sess.playerId, startedAt: sess.startedAt, submissionId: submissionIdFor(snap.challengeId) };
        return official.submitRun(run, scoreDataFrom(snap), { finishedAt: new Date(snap.completedAt || Date.now()).toISOString() }).then(function (res) {
          var m = readSessions(); delete m[snap.challengeId]; writeSessions(m);
          showLine(U.describeOfficialResult(res), res.status);
          console.log('[C1U-official] 伺服器判定：', res.status, res.reasons || []);
        }, function (err) {
          showLine(err && err.queued ? '📶 網路不穩，成績已暫存，下次開啟遊戲會自動補送' : '⚠️ ' + ((err && err.userMessage) || '成績送出失敗'), 'error');
        });
      });
    });
  }

  /* 開啟時：補送上次沒送出的成績 */
  if (eligiblePlayer() || C1U.verify === 'checking') {
    setTimeout(function () { official.init().then(function () { if (eligiblePlayer()) official.flushOutbox(); }); }, 1500);
  }
  window.C1UOfficial = { client: official, ensureSession: ensureSession, scoreDataFrom: scoreDataFrom, submitSnapshot: submitSnapshot };
})();

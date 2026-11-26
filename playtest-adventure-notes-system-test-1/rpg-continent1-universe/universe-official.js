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
    if (!challengeId || !eligiblePlayer()) return Promise.resolve(null);
    var playerId = C1U.playerId;
    var pendingKey = playerId + "/" + challengeId;
    if (pending[pendingKey]) return pending[pendingKey];
    var m = readSessions(), cur = m[challengeId];
    if (cur && cur.playerId === playerId && Date.now() - cur.at < SESSION_REFRESH_MS) return Promise.resolve(cur);
    pending[pendingKey] = official.beginRun().then(function (run) {
      delete pending[pendingKey];
      if (!run || !run.official) { console.log('[C1U-official] 不取得正式場次：', run && run.reason); return null; }
      if (C1U.playerId !== playerId || run.playerId !== playerId) return null;
      var rec = { sessionId: run.sessionId, playerId: run.playerId, startedAt: run.startedAt, at: Date.now() };
      var mm = readSessions(); mm[challengeId] = rec; writeSessions(mm);
      return rec;
    }, function () { delete pending[pendingKey]; return null; });
    return pending[pendingKey];
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

  // Initialize counters at creation, before any stage or shop action can be recorded.
  var trackFields = ['kills', 'damage', 'purchases'];
  function validTrack(t) {
    return t && trackFields.every(function (k) { return Number.isSafeInteger(t[k]) && t[k] >= 0; });
  }
  var origNewRun = window.advNewRun;
  if (typeof origNewRun === 'function') {
    window.advNewRun = function () {
      var run = origNewRun.apply(this, arguments);
      if (run.status === 'in_progress' && eligiblePlayer()) {
        var d = achLoad();
        d.runs[run.challengeId] = { kills: 0, damage: 0, purchases: 0, log: [], startedAt: run.startedAt, fullTracking: true };
        var ids = Object.keys(d.runs);
        ids.slice(0, Math.max(0, ids.length - 12)).forEach(function (id) { delete d.runs[id]; });
        achSave(d);
      }
      return run;
    };
  }

  function scoreDataFrom(snap) {
    var stageClearSec = {};
    OFFICIAL_ADVENTURE_STAGE_IDS.forEach(function (sid) { var r = snap.stageResults && snap.stageResults[sid]; if (r) stageClearSec[sid] = Number(r.clearSec) || 0; });
    var P = snap.scores || {};
    var ctx = typeof c1uFinalCtx !== 'undefined' && c1uFinalCtx;
    var track = ctx && ctx.eligible && ctx.challengeId === snap.challengeId ? achLoad().runs[snap.challengeId] : null;
    var data = { continentId: 1, total: snap.total, rank: String(snap.rank || ''), scoreVersion: snap.scoreVersion,
      complete: snap.complete === true, bossDefeated: !!(snap.raw && snap.raw.combat && snap.raw.combat.bossDefeated),
      parts: { collect: P.collect, explore: P.explore, combat: P.combat, survival: P.survival, efficiency: P.efficiency },
      chainBonus: snap.chainBonus || 0, stages: OFFICIAL_ADVENTURE_STAGE_IDS.slice(), stageClearSec: stageClearSec };
    if (track && track.fullTracking === true && validTrack(track)) data.achievementTrack = { kills: track.kills, damage: track.damage, purchases: track.purchases };
    return data;
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
        submitSnapshot(snap).finally(migrateLegacyTitles);
      } catch (e) { console.warn('[C1U-official] 送出成績', e); }
      return r;
    };
  }

  function submitSnapshot(snap) {
    if (!eligiblePlayer()) return Promise.resolve();
    var playerId = C1U.playerId;
    var scoreData = scoreDataFrom(snap);
    var finishedAt = new Date(snap.completedAt || Date.now()).toISOString();
    showLine('📮 正在把第一大陸成績送到遊戲宇宙伺服器…');
    return official.init().then(function () {
      if (!eligiblePlayer() || C1U.playerId !== playerId) return;
      if (!official.isEnabled()) { showLine('遊戲宇宙正式成績尚未開啟，這次成績只保存在這台裝置。'); return; }
      return ensureSession(snap.challengeId).then(function (sess) {
        if (!sess) { showLine('⚠️ 沒有取得正式場次，這次成績沒有記入正式排行榜。'); return; }
        if (!eligiblePlayer() || C1U.playerId !== playerId || sess.playerId !== playerId) return;
        var run = { official: true, sessionId: sess.sessionId, playerId: sess.playerId, startedAt: sess.startedAt, submissionId: submissionIdFor(snap.challengeId) };
        return official.submitRun(run, scoreData, { finishedAt: finishedAt }).then(function (res) {
          if (C1U.playerId !== playerId) return;
          var m = readSessions(); delete m[snap.challengeId]; writeSessions(m);
          showLine(U.describeOfficialResult(res), res.status);
          console.log('[C1U-official] 伺服器判定：', res.status, res.reasons || []);
        }, function (err) {
          showLine(err && err.queued ? '📶 網路不穩，成績已暫存，下次開啟遊戲會自動補送' : '⚠️ ' + ((err && err.userMessage) || '成績送出失敗'), 'error');
        });
      });
    });
  }

  var titleApi = U.createApiClient();
  var starts = new Map();
  var sending = null;
  var retryTimer = null;
  var retryDelay = 1500;

  function titleIdentity() {
    if (!eligiblePlayer()) return null;
    var p = C1U.verify === 'ok' ? C1U.profile : C1U.verify === 'offline' ? C1U.cachedProfile : null;
    if (!p || !p.displayId || !p.baseAvatarKey) return null;
    return { playerId: C1U.playerId, displayId: p.displayId, baseAvatarKey: p.baseAvatarKey };
  }
  function titleEndpoint(identity, operation) {
    return '/v1/players/' + encodeURIComponent(identity.playerId) + '/adventure-title-' + operation;
  }
  function startMinigame(kind, c) {
    var identity = titleIdentity();
    if (!identity || !c || !c.id || c.state === 'done') return;
    var key = identity.playerId + '/' + c.id;
    if (starts.has(key)) return;
    var begin = titleApi._request('POST', titleEndpoint(identity, 'session'), Object.assign({ id: c.id, kind: kind }, identity))
      .catch(function () { starts.delete(key); });
    starts.set(key, begin);
    if (starts.size > 32) starts.delete(starts.keys().next().value);
  }
  function queueKey(id) { return 'bvAdventureTitles_v1_production__' + id; }
  function queued(id) {
    try { return JSON.parse(localStorage.getItem(queueKey(id)) || '{}') || {}; }
    catch (e) { return {}; }
  }
  function writeQueue(id, items) {
    try { localStorage.setItem(queueKey(id), JSON.stringify(items)); }
    catch (e) { console.warn('[C1U-official] 稱號補送存檔失敗', e); }
  }
  function flushTitles() {
    var identity = titleIdentity();
    if (!identity || sending) return sending;
    var playerId = identity.playerId;
    var waitForRetry = false;
    sending = Promise.resolve().then(async function () {
      for (var [id, item] of Object.entries(queued(playerId))) {
        if (!titleIdentity() || C1U.playerId !== playerId) break;
        var key = playerId + '/' + id;
        await starts.get(key);
        if (!titleIdentity() || C1U.playerId !== playerId) break;
        try {
          await titleApi._request('POST', titleEndpoint(identity, 'result'), Object.assign({ id: id, evidence: item }, identity));
        } catch (err) {
          if (err && ['validation', 'conflict', 'forbidden'].includes(err.kind)) {
            // Retain the game’s original result for reviewed historical recovery.
          } else {
            waitForRetry = true;
            break;
          }
        }
        starts.delete(key);
        var remaining = queued(playerId);
        delete remaining[id];
        writeQueue(playerId, remaining);
      }
    }).finally(function () {
      sending = null;
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = null;
      if (titleIdentity() && Object.keys(queued(C1U.playerId)).length) {
        retryDelay = waitForRetry ? Math.min(retryDelay * 2, 60000) : 1500;
        retryTimer = setTimeout(flushTitles, retryDelay);
      } else retryDelay = 1500;
    });
    return sending;
  }
  function recordMinigame(id, evidence) {
    var identity = titleIdentity();
    if (!identity || !id) return;
    var pendingTitles = queued(identity.playerId);
    pendingTitles[id] = evidence;
    writeQueue(identity.playerId, pendingTitles);
    flushTitles();
  }

  var legacyBuild = 'adventure-v0.4.1-continent1-universe-test-1';
  var currentTitleBuild = 'adventure-v0.4.2-title-sync-test-2';
  var stagingSite = window.location?.hostname === 'balloon-v-universe-staging.pages.dev';
  var originalTitleRecord = window.achTitleRecord;
  if (typeof originalTitleRecord === 'function') {
    window.achTitleRecord = function () {
      var record = originalTitleRecord.apply(this, arguments);
      record.gameVersion = currentTitleBuild;
      return record;
    };
  }

  var migrating = null;
  var migrationTimer = null;
  var migrationDelay = 1500;
  var mainLegacyTitles = new Set(['adventure_kind_adventurer', 'adventure_peace_ambassador', 'adventure_super_thrifty']);
  var legacyVolleyball = {
    adventure_volleyball_rookie: 'scorpion',
    adventure_volleyball_expert: 'orange',
    adventure_volleyball_king: 'orange_king'
  };
  function rawObject(key) {
    try { return JSON.parse(ADV_DEVTEST.rawGet.call(localStorage, key) || '{}') || {}; }
    catch (e) { return {}; }
  }
  function validLegacyId(id) { return typeof id === 'string' && /^[A-Za-z0-9_-]{6,128}$/.test(id); }
  function legacyClaims(identity, workspace) {
    var save = rawObject(C1U_ACH_KEY + workspace);
    var inventory = rawObject('balloonV_inventory' + workspace);
    var results = Array.isArray(save.results) ? save.results : [];
    var titles = save.titles || {};
    var seen = rawObject('bvAdventureLegacyMigrated_v1__' + identity.playerId);
    var claims = [];
    for (var [key, record] of Object.entries(titles)) {
      if (seen[key] === true || !record || record.titleKey !== key ||
          (record.gameVersion !== legacyBuild && !(stagingSite && record.gameVersion === currentTitleBuild && mainLegacyTitles.has(key))) ||
          record.gameId !== 'adventure' || record.category !== 'adventure' || record.source !== 'client' ||
          record.serverConfirmed !== false || !Number.isSafeInteger(record.unlockedAt) ||
          record.unlockedAt <= 0 || record.unlockedAt > Date.now()) continue;
      var evidence;
      var runId = record.challengeId;
      if (mainLegacyTitles.has(key)) {
        if (record.via !== undefined || typeof runId !== 'string' || !/^adv-[a-z0-9]+-[a-z0-9]{0,6}$/.test(runId)) continue;
        var result = results.find(function (r) {
          return r && r.submissionId === runId && r.playerId === identity.playerId && r.mode === 'production' && r.gameId === 'adventure';
        });
        var track = save.runs && save.runs[runId];
        if (result && validTrack(track)) {
          var matches = key === 'adventure_super_thrifty' ? track.purchases === 0 :
            track.kills === 0 && (key === 'adventure_kind_adventurer' || track.damage === 0);
          if (!matches) continue;
          if (track.fullTracking === true || record.gameVersion === legacyBuild) {
            evidence = { id: runId, kind: 'continent', complete: true, track: { kills: track.kills, damage: track.damage, purchases: track.purchases } };
          }
        }
      } else if (Object.hasOwn(legacyVolleyball, key)) {
        var opponent = legacyVolleyball[key];
        if (record.via !== 'volleyball:' + opponent + ':7-0') continue;
        var matches = inventory.volleyball && inventory.volleyball.history;
        var match = Array.isArray(matches) && matches.find(function (r) {
          return r && r.t === 'match' && r.opponent === opponent && r.score === '7:0' && r.winner === 'player' && validLegacyId(r.session);
        });
        if (match) evidence = { id: match.session, kind: 'volleyball', opponent: opponent, playerScore: 7, cpuScore: 0, winner: 'player' };
      } else if (key === 'adventure_whack_legend') {
        var via = typeof record.via === 'string' && record.via.match(/^whack:(\d{1,8})$/);
        if (!via || Number(via[1]) < 660) continue;
        var score = Number(via[1]);
        var games = inventory.whack && inventory.whack.history;
        var game = Array.isArray(games) && games.find(function (r) {
          return r && r.t === 'game' && r.score === score && validLegacyId(r.session);
        });
        if (game) evidence = { id: game.session, kind: 'whack', score: score };
      } else continue;
      var { gameId, titleKey, category, unlockedAt, source, serverConfirmed, challengeId, gameVersion, via } = record;
      claims.push({ record: { gameId, titleKey, category, unlockedAt, source, serverConfirmed, challengeId, gameVersion, via },
        ...(evidence ? { evidence: evidence } : {}) });
    }
    return claims;
  }
  function migrateLegacyTitles() {
    if (migrationTimer) clearTimeout(migrationTimer);
    migrationTimer = null;
    var identity = titleIdentity();
    if (migrating || !identity || C1U.verify !== 'ok' || C1U.mode !== 'production' ||
        C1U.storageId !== identity.playerId || C1U.ws !== '__c1u__prd__' + identity.playerId ||
        typeof ADV_DEVTEST === 'undefined' || !ADV_DEVTEST.rawGet || !ADV_DEVTEST.rawSet) return migrating;
    var claims = legacyClaims(identity, C1U.ws);
    if (!claims.length) return;
    var playerId = identity.playerId;
    var key = 'bvAdventureLegacyMigrated_v1__' + playerId;
    var retry = false;
    migrating = titleApi._request('POST', titleEndpoint(identity, 'migration'),
      Object.assign({ mode: 'production', workspace: C1U.ws, claims: claims }, identity))
      .then(function (reply) {
        var confirmed = new Set(reply && Array.isArray(reply.confirmed) ? reply.confirmed : []);
        var seen = rawObject(key);
        for (var claim of claims) {
          if (confirmed.has(claim.record.titleKey)) seen[claim.record.titleKey] = true;
          else retry = true;
        }
        ADV_DEVTEST.rawSet.call(localStorage, key, JSON.stringify(seen));
      })
      .catch(function (err) {
        retry = !err || !['validation', 'forbidden', 'conflict'].includes(err.kind);
      })
      .finally(function () {
        migrating = null;
        if (retry && C1U.playerId === playerId) {
          migrationDelay = Math.min(migrationDelay * 2, 60000);
          migrationTimer = setTimeout(migrateLegacyTitles, migrationDelay);
        } else {
          migrationDelay = 1500;
          if (C1U.playerId !== playerId) migrateLegacyTitles();
        }
      });
    return migrating;
  }

  var origVbOpen = window.vbOpenFrame;
  window.vbOpenFrame = function (c) {
    startMinigame('volleyball', c);
    return origVbOpen.apply(this, arguments);
  };
  var origWhOpen = window.whOpenFrame;
  window.whOpenFrame = function (c) {
    startMinigame('whack', c);
    return origWhOpen.apply(this, arguments);
  };
  var origVbSettle = window.vbSettle;
  window.vbSettle = function (d, c) {
    var success = origVbSettle.apply(this, arguments);
    if (success && c && c.result && c.result.playerScore === VB_CONFIG.targetScore && c.result.cpuScore === 0) {
      recordMinigame(c.id, { kind: 'volleyball', opponent: c.opponent, playerScore: c.result.playerScore, cpuScore: c.result.cpuScore, winner: c.result.winner });
    }
    return success;
  };
  var origWhSettle = window.whSettle;
  window.whSettle = function () {
    var success = origWhSettle.apply(this, arguments);
    var c = success && whData().current;
    if (c && c.id === arguments[1] && c.score >= 660) recordMinigame(c.id, { kind: 'whack', score: c.score });
    return success;
  };

  function historicalEvidence() {
    var identity = titleIdentity();
    if (!identity) return null;
    var d = achLoad();
    var evidence = [];
    d.results.forEach(function (r) {
      var t = d.runs[r.submissionId];
      if (r.playerId === identity.playerId && r.mode === 'production' && validTrack(t) &&
          (t.kills === 0 || t.purchases === 0)) {
        evidence.push({ id: r.submissionId, kind: 'continent', complete: true, track: { kills: t.kills, damage: t.damage, purchases: t.purchases } });
      }
    });
    vbData().history.forEach(function (r) {
      if (r.t === 'match' && (r.score === '7:0' || r.score === VB_CONFIG.targetScore + ':0') && r.winner === 'player') {
        evidence.push({ id: r.session, kind: 'volleyball', opponent: r.opponent, playerScore: Number(r.score.split(':')[0]), cpuScore: 0, winner: r.winner });
      }
    });
    whData().history.forEach(function (r) {
      if (r.t === 'game' && r.score >= 660) evidence.push({ id: r.session, kind: 'whack', score: r.score });
    });
    return { playerId: identity.playerId, evidence: evidence, localTitles: Object.values(d.titles) };
  }
  function adventureAchievementsHtml() {
    var titles = achLoad().titles;
    var unlocked = C1U_TITLES.filter(function (def) { return Object.hasOwn(titles, def.titleKey); });
    if (!unlocked.length) return '';
    return '<div class="c1u-final-sec"><div class="adv-section-title">派對島已解鎖成就</div><div class="c1u-titles">' +
      unlocked.map(function (def) {
        return '<div class="c1u-title is-got"><span class="c1u-tico">🏅</span><div><b>' +
          h2Esc(def.name) + '</b><small>' + h2Esc(def.desc) + '</small></div></div>';
      }).join('') + '</div></div>';
  }
  var origFinalSections = window.c1uFinalSectionsHtml;
  if (typeof origFinalSections === 'function') {
    window.c1uFinalSectionsHtml = function () {
      return origFinalSections.apply(this, arguments) + adventureAchievementsHtml();
    };
  }
  var origPlayerPanel = window.h2PanelBody;
  window.h2PanelBody = function (kind) {
    var html = origPlayerPanel.apply(this, arguments);
    if (kind === 'handbook' && titleIdentity()) return html + adventureAchievementsHtml();
    return kind === 'player' && titleIdentity() ? html +
      '<div style="margin-top:.6em"><button type="button" class="h2-pill h2-pill--blue h2-pill--sm" data-adventure-title-export>下載冒險稱號紀錄</button></div>' : html;
  };
  document.addEventListener('click', function (event) {
    if (!event.target.closest?.('[data-adventure-title-export]')) return;
    var history = historicalEvidence();
    if (!history) return;
    var url = URL.createObjectURL(new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' }));
    var download = document.createElement('a');
    download.href = url;
    download.download = 'adventure-title-evidence.json';
    download.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });
  window.addEventListener('online', function () {
    var results = flushTitles();
    var migration = C1U.verify === 'offline' ? c1uVerifyPlayer().then(migrateLegacyTitles) : migrateLegacyTitles();
    return Promise.all([results, migration]);
  });
  var startupChecks = 0;
  function restoreTitleQueue() {
    if (C1U.verify === "checking" && startupChecks++ < 15) setTimeout(restoreTitleQueue, 1000);
    else {
      flushTitles();
      migrateLegacyTitles();
    }
  }
  setTimeout(restoreTitleQueue, 1500);

  /* 開啟時：補送上次沒送出的成績 */
  if (eligiblePlayer() || C1U.verify === 'checking') {
    setTimeout(function () { official.init().then(function () { if (eligiblePlayer()) official.flushOutbox(); }); }, 1500);
  }
  window.C1UOfficial = { client: official, ensureSession: ensureSession, scoreDataFrom: scoreDataFrom, submitSnapshot: submitSnapshot };
})();

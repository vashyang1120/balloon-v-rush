/* 打地鼠規則自動測試（開發用）
 * 執行：node minigames/whack-a-mole/tests/rules.test.js
 * 用模擬時間跑遊戲核心，不需要瀏覽器。 */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');
var ctx = { console: console, Math: Math };
ctx.globalThis = ctx;
vm.createContext(ctx);
['config', 'core', 'schedule', 'holes', 'hammer', 'goldring', 'boss', 'scoring', 'game'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
});
var WAM = ctx.WAM, C = WAM.CONFIG;

var pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name); }
}
function section(n) { console.log('■ ' + n); }

/* ---------- 1. 排程 ---------- */
section('排程：2000 顆種子全部有效、配額正確、可重現');
var bad = 0, maxAttempts = 0;
for (var s = 1; s <= 2000; s++) {
  var sch = WAM.Schedule.build(s);
  maxAttempts = Math.max(maxAttempts, sch.attempts);
  if (WAM.Schedule.validate(sch).length) bad++;
  if (sch.targets.length !== 50) bad++;
  sch.rings.forEach(function (r) { if (C.CORNER_HOLES.indexOf(r.hole) < 0) bad++; });
}
ok(bad === 0, '所有排程通過驗證');
var a1 = JSON.stringify(WAM.Schedule.build(777)), a2 = JSON.stringify(WAM.Schedule.build(777));
ok(a1 === a2, '同種子排程完全相同');
ok(a1 !== JSON.stringify(WAM.Schedule.build(778)), '不同種子排程不同');
console.log('  最多重排次數：' + maxAttempts);

/* ---------- 測試用遊戲驅動 ---------- */
function makeGame(seed) {
  var grid = new WAM.HoleGrid();
  var events = { spirit: [], end: null };
  var g = new WAM.Game(grid, {
    onSpirit: function (k) { events.spirit.push(k); },
    onEnd: function (r) { events.end = r; }
  });
  g.reset(seed);
  g.ev = events;
  g.real = 0;
  g.start(0);
  // 以 60fps 模擬推進到遊戲時間 T（不含暫停）
  g.runTo = function (T) {
    while (g.state === 'playing' && g.clock.t < T - 1e-9) {
      var step = Math.min(1000 / 60, (T - g.clock.t) * 1000);
      g.real += step;
      g.update(g.real);
      if (g.clock.isPaused()) break;
    }
  };
  g.wait = function (ms) { g.real += ms; g.update(g.real); };
  g.key = function (idx) { return g.requestHit({ kind: 'key', index: idx }, 'key', g.real); };
  g.tap = function (idx, source) {
    var c = grid.cells[idx].hit;
    return g.requestHit({ kind: 'point', x: c.x + c.w / 2, y: c.y + c.h / 2 }, source || 'mouse', g.real);
  };
  g.tapBoss = function (source) {
    var b = grid.boss;
    return g.requestHit({ kind: 'point', x: b.cx, y: b.hit.y + b.hit.h / 2 }, source || 'mouse', g.real);
  };
  g.firstOf = function (type, after) {
    return g.pending.filter(function (t) { return t.type === type && t.s >= (after || 0); })[0];
  };
  return g;
}

/* ---------- 2. 計分與爆槌 ---------- */
section('蠍子怪 +10、同隻只算一次');
var g = makeGame(1001);
var sc = g.firstOf('scorpion');
g.runTo(sc.s + 0.05);
var r = g.key(sc.hole);
ok(r.outcome === 'scorpion' && g.scoring.score === 10, '蠍子怪 +10');
g.wait(150);
r = g.key(sc.hole);
ok(g.scoring.score === 10 && (r.outcome === 'empty' || r.outcome !== 'scorpion'), '同一隻不重複得分');

section('橘子怪爆槌1.5秒、星靈提醒、暫停');
g = makeGame(1002);
var or = g.firstOf('orange');
g.runTo(or.s + 0.05);
var tBreak = g.clock.t;
r = g.tap(or.hole, 'mouse');
ok(r.outcome === 'break' && r.cause === 'orange', '普通槌敲橘子怪爆槌');
ok(g.scoring.score === 0, '橘子怪不扣分');
ok(g.ev.spirit.length === 1 && g.ev.spirit[0] === 'orange', '星靈提醒（橘子怪台詞）');
ok(g.clock.isPaused(), '星靈對話時時鐘暫停');
var tFrozen = g.clock.t;
g.wait(5000);
ok(g.clock.t === tFrozen, '暫停5秒真實時間，遊戲時間不動');
var spawnedBefore = JSON.stringify(g.spawned);
ok(g.hammer.repairLeft(g.clock.t) === C.BREAK_DURATION, '修復倒數也暫停');
r = g.tap(or.hole, 'touch');
ok(!r.ok, '對話中敲擊無效');
g.closeSpirit(g.real);
ok(!g.clock.isPaused() && g.clock.t === tFrozen, '關閉後從原時間繼續');
g.wait(500);
ok(g.hammer.isBroken(g.clock.t), '修復中');
r = g.key(4); var r2 = g.tap(0, 'touch'); var r3 = g.tap(8, 'mouse');
ok(r.reason === 'broken' && r2.reason === 'broken' && r3.reason === 'broken', '爆槌期間三種輸入都無效');
g.runTo(tBreak + C.BREAK_DURATION + 0.02);
ok(!g.hammer.isBroken(g.clock.t), '1.5秒後自動恢復');
ok(Math.abs(g.hammer.repairUntil - (tBreak + 1.5)) < 1e-9, '修復時間恰為1.5秒（遊戲時間）');

section('第二次爆槌不再提醒；尖刺爆槌');
var sp = g.firstOf('spike', g.clock.t + 0.2);
g.runTo(sp.s + 0.05);
r = g.key(sp.hole);
ok(r.outcome === 'break' && r.cause === 'spike', '尖刺爆槌');
ok(g.ev.spirit.length === 1 && !g.clock.isPaused(), '第二次爆槌不出現星靈、不暫停');

section('尖刺台詞');
g = makeGame(1003);
sp = g.firstOf('spike');
g.runTo(sp.s + 0.05);
g.key(sp.hole);
ok(g.ev.spirit[0] === 'spike', '尖刺台詞正確');

section('0.1秒間隔：多種輸入不能繞過');
g = makeGame(1004);
g.runTo(1.0);
var r1 = g.tap(4, 'mouse');
r2 = g.key(4);
r3 = g.tap(4, 'touch');
ok(r1.ok && !r2.ok && r2.reason === 'tooFast' && !r3.ok, '同一瞬間滑鼠+鍵盤+觸控只算一次');
g.wait(60);
ok(g.tap(3, 'touch').reason === 'tooFast', '0.06秒後仍無效');
g.wait(45);
ok(g.key(3).ok, '0.1秒後有效');

section('空洞不得分、不爆槌');
g = makeGame(1005);
g.runTo(0.1);
r = g.key(0);
ok(r.outcome === 'empty' && g.scoring.score === 0 && !g.hammer.isBroken(g.clock.t), '空敲');

/* ---------- 3. 金環 ---------- */
section('金環：9秒出現、主動敲中才取得、17秒結束（v0.1.4 固定 8 秒）');
g = makeGame(2001);
var ring1 = g.rings.rings[0];
g.runTo(8.95);
ok(!g.rings.activeAt(g.clock.t), '9秒前沒有金環');
g.runTo(9.0);
ok(g.rings.activeAt(g.clock.t) && g.rings.activeAt(g.clock.t).hole === ring1.hole, '9秒出現在角落');
g.runTo(14.9);
ok(!g.hammer.isGold(g.clock.t), '沒敲不會自動取得');
ok(!g.targetAtHole(ring1.hole, g.clock.t), '金環洞口沒有普通目標');
g.runTo(15.0);
r = g.key(ring1.hole);
ok(r.outcome === 'ring' && g.hammer.isGold(g.clock.t), '敲中取得金槌');
ok(Math.abs(g.hammer.goldLeft(g.clock.t) - 2) < 0.02, '第15秒取得只剩約2秒');
// 金槌敲橘子怪/尖刺
var gt = g.pending.filter(function (t) { return (t.type === 'orange' || t.type === 'spike') && t.s > 15.15 && t.s < 16.7; })[0];
if (gt) {
  g.runTo(gt.s + 0.03);
  var before = g.scoring.score;
  r = g.key(gt.hole);
  ok(r.outcome === 'gold-' + gt.type && g.scoring.score === before + 10 && !g.hammer.isBroken(g.clock.t), '金槌敲' + gt.type + ' +10 不爆槌');
} else { console.log('  （此種子15～16.7秒無橘子怪/尖刺，略過）'); }
g.runTo(16.99);
ok(g.hammer.isGold(g.clock.t), '16.99秒仍是金槌');
g.runTo(17.0);
ok(!g.hammer.isGold(g.clock.t), '17秒準時結束');

section('金環未敲中持續到時間窗結束');
g = makeGame(2002);
g.runTo(16.9);
ok(!!g.rings.activeAt(g.clock.t), '16.9秒金環仍在');
g.runTo(17.0);
ok(!g.rings.activeAt(g.clock.t), '17秒金環消失');

/* ---------- 4. Boss ---------- */
section('Boss：27秒登場、立即可敲、每下+20、0.1秒連打');
g = makeGame(3001);
var ring2 = g.rings.rings[1];
g.runTo(25.5);
r = g.key(ring2.hole);
ok(r.outcome === 'ring', '25.5秒取得第二次金環');
g.runTo(26.99);
ok(g.active.filter(function (t) { return t.hitAt === null; }).length === 0 || g.active.every(function (t) { return t.e <= 27; }), '普通目標在27秒前退場');
g.runTo(27.0);
ok(g.active.length === 0, '27秒九宮格無普通目標');
var s0 = g.scoring.score;
r = g.tapBoss('touch');
ok(r.outcome === 'bossHit' && g.scoring.score === s0 + 20, '登場第一幀就能敲 +20');
var hits = 1;
for (var i = 0; i < 20; i++) {
  g.wait(100);
  r = (i % 3 === 0) ? g.key(4) : g.tapBoss(i % 2 ? 'mouse' : 'touch');
  if (r.outcome === 'bossHit') hits++;
}
ok(hits === 21, '每0.1秒一下都算（受擊動畫不擋判定）：' + hits + '/21');
g.wait(50);
ok(g.tapBoss().reason === 'tooFast', '0.05秒內第二下無效');
ok(g.boss.reactAmount(g.clock.t) > 0, '有受擊反應');

section('普通槌敲 Boss 爆槌 + 星靈；Boss 不自動給金槌、不自動修槌');
g = makeGame(3002);
g.runTo(26.8);
var orx = g.pending.filter(function (t) { return t.type === 'orange'; })[0];
ok(!g.hammer.isGold(g.clock.t), '27秒前沒拿金環就沒有金槌');
g.runTo(27.05);
ok(!g.hammer.isGold(g.clock.t), 'Boss登場不會自動給金槌');
r = g.tapBoss();
ok(r.outcome === 'break' && r.cause === 'boss' && g.scoring.score === 0, '普通槌敲Boss爆槌不得分');
ok(g.ev.spirit[0] === 'boss', '橘子王台詞');
g.closeSpirit(g.real);
// Boss 戰中仍可取得第二次金環
g.runTo(28.6);
r = g.key(g.rings.rings[1].hole);
ok(r.outcome === 'ring', 'Boss戰中仍能敲金環取得金槌');
g.runTo(28.75);
r = g.key(4);
ok(r.outcome === 'bossHit', '取得後鍵盤 S/5 攻擊Boss +20');

section('爆槌中 Boss 登場不會修好槌子');
g = makeGame(3003);
var lateOr = g.pending.filter(function (t) { return (t.type === 'orange' || t.type === 'spike') && t.s > 25.6; })[0]
  || g.pending.filter(function (t) { return t.type === 'orange' || t.type === 'spike'; }).slice(-1)[0];
g.runTo(lateOr.s + 0.02);
g.key(lateOr.hole);
g.closeSpirit(g.real);
var until = g.hammer.repairUntil;
g.runTo(27.01);
ok(g.hammer.isBroken(g.clock.t) === (until > 27.01), 'Boss登場時維持原修復狀態');

/* ---------- 5. 結束 ---------- */
section('30秒立即結束、停止計分');
g = makeGame(4001);
g.runTo(25.2); g.key(g.rings.rings[1].hole);
g.runTo(29.95);
r = g.tapBoss();
var sEnd = g.scoring.score;
g.runTo(30.0);
ok(g.state === 'ended' && g.ev.end && g.ev.end.score === sEnd, '30秒結束並結算');
g.wait(200);
r = g.tapBoss();
ok(!r.ok && g.scoring.score === sEnd, '結束後不再計分');
ok(g.clock.t === 30, '時間停在30');

/* ---------- 6. 配額不受玩家影響 ---------- */
section('瘋狂敲擊不會增加生成數量、50個全部實際出現');
function totals(game) {
  var o = { scorpion: 0, orange: 0, spike: 0 };
  Object.keys(game.spawned).forEach(function (k) { ['scorpion', 'orange', 'spike'].forEach(function (ty) { o[ty] += game.spawned[k][ty]; }); });
  return o;
}
var gIdle = makeGame(5001); gIdle.runTo(30);
var gMad = makeGame(5001);
var k = 0;
while (gMad.state === 'playing') {
  gMad.wait(1000 / 60);
  if (gMad.spiritOpen) gMad.closeSpirit(gMad.real);
  gMad.key(k++ % 9);
  gMad.tapBoss('touch');
}
ok(JSON.stringify(gIdle.spawned) === JSON.stringify(gMad.spawned), '不敲 vs 狂敲：各時段生成數完全相同');
var tt = totals(gIdle);
ok(tt.scorpion === 30 && tt.orange === 12 && tt.spike === 8, '實際出現 蠍30 橘12 刺8');
C.PERIODS.forEach(function (p) {
  ok(JSON.stringify(gIdle.spawned[p.id]) === JSON.stringify(p.quota), p.label + ' 實際出現數 = 配額');
});

/* ---------- 7. 獎勵 ---------- */
section('三級獎勵');
ok(WAM.Rewards.tierFor(0).name === '初級' && WAM.Rewards.tierFor(199).name === '初級', '0～199 初級');
ok(WAM.Rewards.tierFor(200).name === '中級' && WAM.Rewards.tierFor(399).name === '中級', '200～399 中級');
ok(WAM.Rewards.tierFor(400).name === '高級' && WAM.Rewards.tierFor(9999).name === '高級', '400+ 高級');

/* ---------- 8. 暫停原因疊加 ---------- */
section('切換分頁/直拿暫停不吃時間');
g = makeGame(6001);
g.runTo(5);
g.setPause('hidden', true, g.real);
g.wait(10000);
ok(Math.abs(g.clock.t - 5) < 1e-9, '分頁隱藏期間時間不動');
g.setPause('hidden', false, g.real);
g.wait(100);
ok(Math.abs(g.clock.t - 5.1) < 1e-6, '恢復後從5秒繼續');

/* ---------- 9. v0.1.3 受擊停留與暫停 ---------- */
section('v0.1.3：受擊停留 0.55 秒只是畫面，不能再得分、不影響生成');
g = makeGame(7001);
sc = g.firstOf('scorpion');
g.runTo(sc.s + 0.05);
g.key(sc.hole);
var s1 = g.scoring.score, hitT = g.clock.t;
g.runTo(hitT + 0.3);
ok(g.active.some(function (a) { return a.id === sc.id; }), '命中後 0.3 秒仍在畫面（受擊停留）');
ok(g.key(sc.hole).outcome !== 'scorpion' && g.scoring.score === s1, '受擊停留期間再敲不得分');
g.runTo(hitT + 0.56);
ok(!g.active.some(function (a) { return a.id === sc.id; }), '約 0.55 秒後退場');
var gH = makeGame(7002), kk = 0;
while (gH.state === 'playing') {
  gH.wait(1000 / 60);
  if (gH.spiritOpen) gH.closeSpirit(gH.real);
  var t0 = gH.clock.t;
  gH.active.forEach(function (a) { if (a.hitAt === null && a.type === 'scorpion' && a.s <= t0) gH.key(a.hole); });
}
var gI = makeGame(7002); gI.runTo(30);
ok(JSON.stringify(gH.spawned) === JSON.stringify(gI.spawned), '每隻蠍子都敲中 vs 都不敲：各時段生成數完全相同');

section('v0.1.3：玩家主動暫停與其他暫停原因互不干擾');
g = makeGame(7003);
g.runTo(5);
g.setPause('user', true, g.real);
g.setPause('hidden', true, g.real);
g.wait(3000);
g.setPause('hidden', false, g.real);
g.wait(1000);
ok(Math.abs(g.clock.t - 5) < 1e-9 && g.clock.isPaused(), '主動暫停後切分頁再回來：仍保持暫停、時間不動');
ok(!g.key(4).ok, '暫停中不能敲擊');
g.setPause('user', false, g.real);
g.wait(100);
ok(Math.abs(g.clock.t - 5.1) < 1e-6, '按繼續後從 5 秒接著跑，不補跑暫停期間');

/* ---------- 10. v0.1.4 固定 8 秒無敵時段與邊界 ---------- */
section('v0.1.4：金環 9 / 22 秒出現，固定在 17 / 30 秒結束');
ok(C.GOLD_WINDOWS[0].from === 9 && C.GOLD_WINDOWS[0].to === 17 && C.GOLD_WINDOWS[1].from === 22 && C.GOLD_WINDOWS[1].to === 30, '設定：9→17、22→30');
function takeAt(seed, idx, T) {
  var gg = makeGame(seed);
  gg.runTo(T);
  var res = gg.key(gg.rings.rings[idx].hole);
  return { g: gg, res: res };
}
var A9 = takeAt(8001, 0, 9.0);
ok(A9.res.outcome === 'ring' && Math.abs(A9.g.hammer.goldLeft(A9.g.clock.t) - 8) < 0.02, '9 秒立即取得：剩 8 秒');
var A11 = takeAt(8001, 0, 11.0);
ok(Math.abs(A11.g.hammer.goldLeft(A11.g.clock.t) - 6) < 0.02, '11 秒取得：剩 6 秒（不重置成 8）');
var A15 = takeAt(8001, 0, 15.0);
ok(Math.abs(A15.g.hammer.goldLeft(A15.g.clock.t) - 2) < 0.02, '15 秒取得：剩 2 秒');
A15.g.runTo(17.0);
ok(!A15.g.hammer.isGold(A15.g.clock.t), '一律 17 秒結束');

section('邊界 A：沒取得第一次金環 → 不啟動無敵');
g = makeGame(8002); g.runTo(17.5);
ok(g.hammer.goldFrom < 0 && !g.hammer.isGold(g.clock.t), '沒有金槌');

section('邊界 C：17 秒邊界敲金環 → 不得取得已過期的無敵');
g = makeGame(8003); g.runTo(16.99);
ok(!!g.rings.activeAt(g.clock.t), '16.99 秒金環仍在');
g.runTo(17.0);
r = g.key(g.rings.rings[0].hole);
ok(r.outcome !== 'ring' && !g.hammer.isGold(g.clock.t), '17 秒敲金環位置：沒有取得');

section('邊界 D / E：22 秒取得第二次 → 最多 8 秒，橘子王可連打');
var D = takeAt(8004, 1, 22.0);
ok(D.res.outcome === 'ring' && Math.abs(D.g.hammer.goldLeft(D.g.clock.t) - 8) < 0.02, '22 秒取得：剩 8 秒');
D.g.runTo(27.0);
var bh = 0;
for (var bi = 0; bi < 10; bi++) { if (D.g.tapBoss().outcome === 'bossHit') bh++; D.g.wait(100); }
ok(bh === 10 && D.g.boss.hits === 10, '27 秒後金槌連打橘子王 10 下全中');

section('邊界 F：29 秒才取得第二次 → 只剩 1 秒、30 秒正常結束');
var F = takeAt(8005, 1, 29.0);
ok(F.res.outcome === 'ring' && Math.abs(F.g.hammer.goldLeft(F.g.clock.t) - 1) < 0.02, '29 秒取得：剩 1 秒');
F.g.runTo(30);
ok(F.g.state === 'ended' && F.g.ev.end, '30 秒正常結算');

section('邊界 G：金槌剩 1 秒時暫停 → 凍結，恢復後才繼續');
var G = takeAt(8006, 1, 23.0);
G.g.runTo(29.0);
G.g.setPause('user', true, G.g.real);
G.g.wait(5000);
ok(Math.abs(G.g.hammer.goldLeft(G.g.clock.t) - 1) < 0.02 && G.g.hammer.isGold(G.g.clock.t), '暫停 5 秒後仍剩 1 秒');
G.g.setPause('hidden', true, G.g.real); G.g.setPause('hidden', false, G.g.real); G.g.wait(500);
ok(Math.abs(G.g.hammer.goldLeft(G.g.clock.t) - 1) < 0.02, '暫停中切分頁再回來：不偷跑');
G.g.setPause('user', false, G.g.real);
G.g.runTo(29.5);
ok(Math.abs(G.g.hammer.goldLeft(G.g.clock.t) - 0.5) < 0.02, '繼續後從 1 秒接著倒數');

section('v0.1.4：排程配額不變（50 個、各時段相同）');
var Q = makeGame(8007); Q.runTo(30);
C.PERIODS.forEach(function (p) { ok(JSON.stringify(Q.spawned[p.id]) === JSON.stringify(p.quota), p.label + ' 配額不變'); });
ok(Q.pending.every(function (tg) {
  return Q.rings.rings.every(function (rr) { return rr.hole !== tg.hole || tg.e + C.SAME_HOLE_GAP <= rr.from + 1e-6 || tg.s >= rr.to - 1e-6; });
}), '9～17、22～30 金環洞口沒有普通目標');

console.log('\n結果：' + pass + ' 通過，' + fail + ' 失敗');
process.exit(fail ? 1 : 0);

/* =========================================================
 * schedule.js — 目標排程與生成（每局開始前一次排好）
 *
 * - 每局固定 50 個普通目標，各時段配額固定
 * - 先決定兩個金環的角落洞口，排程時就把該洞口的時間窗預留起來
 * - 同一洞口不重疊、同時數量不超過節奏上限、全部在第27秒前退場
 * - 有衝突就重新安排；整局排不出來就以同一顆種子繼續重抽，
 *   絕不刪除目標湊數
 * ========================================================= */
(function (W) {
  'use strict';
  var WAM = W.WAM;
  var C = WAM.CONFIG;
  var EPS = 1e-6;
  var TYPES = ['scorpion', 'orange', 'spike'];

  function rhythmAt(t) {
    for (var i = 0; i < C.RHYTHM.length; i++) {
      var r = C.RHYTHM[i];
      if (t >= r.from - EPS && t < r.to - EPS) return r;
    }
    return null;
  }
  function dwellAt(s) { var r = rhythmAt(s); return r ? r.dwell : null; }
  function capAt(t) { var r = rhythmAt(t); return r ? r.maxConcurrent : 0; }
  function round3(x) { return Math.round(x * 1000) / 1000; }

  function holeFree(list, hole, s, e) {
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (o.hole !== hole) continue;
      if (s < o.e + C.SAME_HOLE_GAP - EPS && o.s < e + C.SAME_HOLE_GAP - EPS) return false;
    }
    return true;
  }
  function ringReserved(rings, hole, s, e) {
    for (var i = 0; i < rings.length; i++) {
      var r = rings[i];
      if (r.hole !== hole) continue;
      if (s < r.to - EPS && r.from < e + C.SAME_HOLE_GAP - EPS) return true;
    }
    return false;
  }
  function activeCount(list, x) {
    var n = 0;
    for (var i = 0; i < list.length; i++) {
      if (list[i].s <= x + EPS && x < list[i].e - EPS) n++;
    }
    return n;
  }
  function concurrencyOk(list) {
    for (var i = 0; i < list.length; i++) {
      var x = list[i].s;
      if (activeCount(list, x) > capAt(x)) return false;
    }
    return true;
  }

  // 一個配額時段內最晚可出現時間：出現 + 停留 必須 ≤ 27 秒
  function latestSpawn(p) {
    var b = p.to;
    if (b + dwellAt(b - 0.001) > C.BOSS_START) b = C.BOSS_START - dwellAt(b - 0.001);
    return b;
  }

  function placePeriod(p, rng, targets, rings) {
    var types = [];
    TYPES.forEach(function (ty) { for (var i = 0; i < p.quota[ty]; i++) types.push(ty); });
    var n = types.length;
    var a = Math.max(p.from, C.FIRST_SPAWN_AT);
    var b = latestSpawn(p);
    var w = (b - a) / n;

    for (var periodTry = 0; periodTry < 40; periodTry++) {
      rng.shuffle(types);
      var placed = [];
      var success = true;
      for (var k = 0; k < n && success; k++) {
        var done = false;
        for (var tryK = 0; tryK < 30 && !done; tryK++) {
          var s = round3(a + w * k + w * rng.range(0.08, 0.92));
          if (s >= b - EPS) continue;
          var d = dwellAt(s);
          var e = round3(s + d);
          if (e > C.BOSS_START + EPS) continue;
          var all = targets.concat(placed);
          var cands = [];
          for (var h = 0; h < 9; h++) {
            if (!holeFree(all, h, s, e)) continue;
            if (ringReserved(rings, h, s, e)) continue;
            var cand = { s: s, e: e, hole: h };
            if (!concurrencyOk(all.concat([cand]))) continue;
            cands.push(h);
          }
          if (!cands.length) continue;
          var prev = placed.length ? placed[placed.length - 1].hole : (targets.length ? targets[targets.length - 1].hole : -1);
          if (cands.length > 1) cands = cands.filter(function (hh) { return hh !== prev; });
          placed.push({ type: types[k], s: s, d: d, e: e, hole: rng.pick(cands), period: p.id });
          done = true;
        }
        if (!done) success = false;
      }
      if (success) {
        for (var i = 0; i < placed.length; i++) targets.push(placed[i]);
        return true;
      }
    }
    return false;
  }

  function validateSchedule(sch) {
    var errors = [];
    var targets = sch.targets, rings = sch.rings;
    var totals = { scorpion: 0, orange: 0, spike: 0 };
    C.PERIODS.forEach(function (p) {
      var cnt = { scorpion: 0, orange: 0, spike: 0 };
      targets.forEach(function (t) { if (t.period === p.id) cnt[t.type]++; });
      TYPES.forEach(function (ty) {
        if (cnt[ty] !== p.quota[ty]) errors.push(p.id + ' ' + ty + ' 配額 ' + cnt[ty] + '/' + p.quota[ty]);
      });
    });
    targets.forEach(function (t) {
      totals[t.type]++;
      var p = C.PERIODS.filter(function (pp) { return pp.id === t.period; })[0];
      if (!p || t.s < Math.max(p.from, C.FIRST_SPAWN_AT) - EPS || t.s >= p.to - EPS) errors.push('目標 #' + t.id + ' 出現時間不在時段內');
      if (Math.abs(t.d - dwellAt(t.s)) > EPS) errors.push('目標 #' + t.id + ' 停留秒數錯誤');
      if (Math.abs(t.e - (t.s + t.d)) > 0.002) errors.push('目標 #' + t.id + ' 結束時間錯誤');
      if (t.e > C.BOSS_START + EPS) errors.push('目標 #' + t.id + ' 超過第27秒');
      if (t.hole < 0 || t.hole > 8) errors.push('目標 #' + t.id + ' 洞口錯誤');
      if (ringReserved(rings, t.hole, t.s, t.e)) errors.push('目標 #' + t.id + ' 占用金環洞口');
    });
    TYPES.forEach(function (ty) {
      if (totals[ty] !== C.TOTAL_QUOTA[ty]) errors.push('總數 ' + ty + ' ' + totals[ty] + '/' + C.TOTAL_QUOTA[ty]);
    });
    if (targets.length !== 50) errors.push('總目標數 ' + targets.length + '/50');
    for (var i = 0; i < targets.length; i++) {
      for (var j = i + 1; j < targets.length; j++) {
        var x = targets[i], y = targets[j];
        if (x.hole === y.hole && x.s < y.e + C.SAME_HOLE_GAP - EPS && y.s < x.e + C.SAME_HOLE_GAP - EPS) {
          errors.push('洞口 ' + x.hole + ' 目標 #' + x.id + ' 與 #' + y.id + ' 重疊');
        }
      }
    }
    if (!concurrencyOk(targets)) errors.push('同時數量超過上限');
    rings.forEach(function (r) {
      if (C.CORNER_HOLES.indexOf(r.hole) < 0) errors.push('金環 ' + r.id + ' 不在角落');
    });
    return errors;
  }

  function buildSchedule(seed) {
    var rng = WAM.createRng(seed);
    for (var attempt = 1; attempt <= C.SCHEDULE_MAX_ATTEMPTS; attempt++) {
      var rings = C.GOLD_WINDOWS.map(function (w) {
        return { id: w.id, from: w.from, to: w.to, hole: rng.pick(C.CORNER_HOLES) };
      });
      var targets = [];
      var ok = true;
      for (var i = 0; i < C.PERIODS.length && ok; i++) ok = placePeriod(C.PERIODS[i], rng, targets, rings);
      if (!ok) continue;
      targets.sort(function (a, b) { return a.s - b.s; });
      targets.forEach(function (t, idx) { t.id = idx + 1; });
      var sch = { seed: seed, attempts: attempt, targets: targets, rings: rings };
      var errors = validateSchedule(sch);
      if (!errors.length) return sch;
    }
    throw new Error('排程失敗：種子 ' + seed + ' 在 ' + C.SCHEDULE_MAX_ATTEMPTS + ' 次內無法產生有效排程');
  }

  // 依排程計算各時段平均同時目標數（測試資訊用）
  function averageConcurrency(targets, from, to) {
    var sum = 0;
    targets.forEach(function (t) {
      var a = Math.max(t.s, from), b = Math.min(t.e, to);
      if (b > a) sum += b - a;
    });
    return sum / (to - from);
  }

  WAM.Schedule = {
    build: buildSchedule,
    validate: validateSchedule,
    dwellAt: dwellAt,
    rhythmAt: rhythmAt,
    averageConcurrency: averageConcurrency
  };
})(typeof window !== 'undefined' ? window : globalThis);

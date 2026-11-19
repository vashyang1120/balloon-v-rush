/* =========================================================
 * goldring.js — 金環（固定時間窗、固定角落洞口、需主動敲中）
 * ========================================================= */
(function (W) {
  'use strict';
  var WAM = W.WAM;

  function GoldRings() { this.rings = []; }
  GoldRings.prototype.reset = function (scheduleRings) {
    this.rings = scheduleRings.map(function (r) {
      return { id: r.id, from: r.from, to: r.to, hole: r.hole, takenAt: null };
    });
  };
  // 目前在場上、可被敲擊的金環
  GoldRings.prototype.activeAt = function (t) {
    for (var i = 0; i < this.rings.length; i++) {
      var r = this.rings[i];
      if (r.takenAt === null && t >= r.from - 1e-9 && t < r.to - 1e-9) return r;
    }
    return null;
  };
  GoldRings.prototype.ringAtHole = function (hole, t) {
    var r = this.activeAt(t);
    return r && r.hole === hole ? r : null;
  };
  GoldRings.prototype.take = function (ring, t) { ring.takenAt = t; };
  GoldRings.prototype.status = function (ring, t) {
    if (ring.takenAt !== null) return '已取得@' + ring.takenAt.toFixed(2) + 's';
    if (t < ring.from) return '等待（' + ring.from + 's出現）';
    if (t < ring.to) return '出現中・未取得';
    return '結束・未取得';
  };

  WAM.GoldRings = GoldRings;
})(typeof window !== 'undefined' ? window : globalThis);

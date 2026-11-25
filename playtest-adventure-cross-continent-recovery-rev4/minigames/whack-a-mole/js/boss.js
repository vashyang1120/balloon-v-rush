/* =========================================================
 * boss.js — 橘子王 Boss 戰
 * 判定與動畫分離：只要 t ≥ 27 就能被敲，
 * 升起動畫、受擊動畫只影響畫面，不會擋下任何合法敲擊。
 * ========================================================= */
(function (W) {
  'use strict';
  var WAM = W.WAM;
  var C = WAM.CONFIG;

  function Boss() { this.reset(); }
  Boss.prototype.reset = function () {
    this.lastHitAt = -1;
    this.hits = 0;
  };
  Boss.prototype.isActive = function (t) { return t >= C.BOSS_START - 1e-9; };
  // 0→1 升起進度（純畫面）
  Boss.prototype.introProgress = function (t) {
    return Math.max(0, Math.min(1, (t - C.BOSS_START) / C.BOSS_INTRO_TIME));
  };
  Boss.prototype.dimAlpha = function (t) {
    if (t < C.BOSS_START) return 0;
    return C.BOSS_DIM_ALPHA * Math.min(1, (t - C.BOSS_START) / C.BOSS_DIM_TIME);
  };
  Boss.prototype.reactAmount = function (t) {
    if (this.lastHitAt < 0) return 0;
    var k = (t - this.lastHitAt) / C.BOSS_HIT_REACT;
    return k >= 0 && k < 1 ? 1 - k : 0;
  };
  Boss.prototype.registerHit = function (t) {
    this.lastHitAt = t;
    this.hits++;
  };

  WAM.Boss = Boss;
})(typeof window !== 'undefined' ? window : globalThis);

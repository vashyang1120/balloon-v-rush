/* =========================================================
 * hammer.js — 氣球槌狀態（普通 / 爆裂修復中 / 金色無敵）
 * 全部以遊戲時鐘秒數判斷，沒有 setTimeout。
 * ========================================================= */
(function (W) {
  'use strict';
  var WAM = W.WAM;
  var C = WAM.CONFIG;

  function Hammer() { this.reset(); }
  Hammer.prototype.reset = function () {
    this.repairUntil = -1;   // 爆裂修復到第幾秒
    this.brokenAt = -1;
    this.goldUntil = -1;     // 金槌到第幾秒結束（固定17或30）
    this.goldFrom = -1;
    this.lastHitAt = -Infinity; // 上一次「有效敲擊」時間（全域0.1秒間隔）
    this.breakCount = 0;
  };
  Hammer.prototype.isBroken = function (t) { return t < this.repairUntil - 1e-9; };
  Hammer.prototype.isGold = function (t) { return !this.isBroken(t) && t < this.goldUntil - 1e-9; };
  Hammer.prototype.mode = function (t) {
    if (this.isBroken(t)) return 'broken';
    if (t < this.goldUntil - 1e-9) return 'gold';
    return 'normal';
  };
  Hammer.prototype.repairLeft = function (t) { return Math.max(0, this.repairUntil - t); };
  Hammer.prototype.goldLeft = function (t) { return Math.max(0, this.goldUntil - t); };
  Hammer.prototype.intervalOk = function (t) {
    return t - this.lastHitAt >= C.HIT_MIN_INTERVAL - 1e-9;
  };
  Hammer.prototype.markHit = function (t) { this.lastHitAt = t; };
  Hammer.prototype.breakAt = function (t) {
    this.brokenAt = t;
    this.repairUntil = t + C.BREAK_DURATION;
    this.breakCount++;
  };
  Hammer.prototype.makeGold = function (t, until) {
    this.goldFrom = t;
    this.goldUntil = until; // 不重新計算5秒，固定到時間窗結束
  };

  WAM.Hammer = Hammer;
})(typeof window !== 'undefined' ? window : globalThis);

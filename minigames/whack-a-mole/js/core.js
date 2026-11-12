/* =========================================================
 * core.js — 可重現亂數（種子）＋ 統一遊戲時鐘
 * ========================================================= */
(function (W) {
  'use strict';
  var WAM = W.WAM;

  /* ---------- 可重現亂數：mulberry32 ---------- */
  function createRng(seed) {
    var a = seed >>> 0;
    var rng = function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    rng.range = function (lo, hi) { return lo + (hi - lo) * rng(); };
    rng.int = function (n) { return Math.floor(rng() * n); };
    rng.pick = function (arr) { return arr[Math.floor(rng() * arr.length)]; };
    rng.shuffle = function (arr) {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(rng() * (i + 1));
        var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
      }
      return arr;
    };
    return rng;
  }

  function newSeed() {
    return (Math.floor(Math.random() * 900000) + 100000); // 6 位數，方便口頭回報
  }

  /* ---------- 統一遊戲時鐘 ----------
   * 所有遊戲判定（出現、消失、金環、修復、Boss、得分動畫）都只看 clock.t。
   * 暫停（星靈對話、手機直拿、切到別的分頁）時 clock.t 完全停止，
   * 不使用任何 setTimeout，因此不會有計時器「偷偷繼續跑」。
   * realMs 一律由外部傳入（瀏覽器用 performance.now()，測試可用模擬時間）。
   */
  var MAX_FRAME_DT = 0.1; // 單次最多前進 0.1 秒，避免卡頓時一次跳太多

  function GameClock() { this.reset(); }
  GameClock.prototype.reset = function () {
    this.t = 0;
    this.lastReal = null;
    this.running = false;
    this.pauses = {};
    this.limit = Infinity;
  };
  GameClock.prototype.isPaused = function () {
    for (var k in this.pauses) if (this.pauses[k]) return true;
    return false;
  };
  GameClock.prototype.isAdvancing = function () {
    return this.running && !this.isPaused();
  };
  // 取得「此刻」精確遊戲時間（不修改狀態）
  GameClock.prototype.peek = function (realMs) {
    if (!this.isAdvancing() || this.lastReal === null) return this.t;
    var dt = (realMs - this.lastReal) / 1000;
    if (dt < 0) dt = 0;
    if (dt > MAX_FRAME_DT) dt = MAX_FRAME_DT;
    return Math.min(this.t + dt, this.limit);
  };
  // 推進到此刻
  GameClock.prototype.tick = function (realMs) {
    this.t = this.peek(realMs);
    this.lastReal = realMs;
    return this.t;
  };
  GameClock.prototype.start = function (realMs) {
    this.running = true;
    this.lastReal = realMs;
  };
  GameClock.prototype.stop = function (realMs) {
    this.tick(realMs);
    this.running = false;
  };
  GameClock.prototype.pause = function (reason, realMs) {
    this.tick(realMs);
    this.pauses[reason] = true;
    this.lastReal = realMs;
  };
  GameClock.prototype.resume = function (reason, realMs) {
    if (!this.pauses[reason]) return;
    delete this.pauses[reason];
    this.lastReal = realMs; // 從原時間點繼續，不補算暫停期間
  };

  WAM.createRng = createRng;
  WAM.newSeed = newSeed;
  WAM.GameClock = GameClock;
})(typeof window !== 'undefined' ? window : globalThis);

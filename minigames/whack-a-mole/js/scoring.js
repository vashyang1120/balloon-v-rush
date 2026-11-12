/* =========================================================
 * scoring.js — 計分與結算（模擬獎勵，不寫入任何存檔）
 * ========================================================= */
(function (W) {
  'use strict';
  var WAM = W.WAM;
  var C = WAM.CONFIG;

  function Scoring() { this.reset(); }
  Scoring.prototype.reset = function () {
    this.score = 0;
    this.counts = { scorpion: 0, goldOrange: 0, goldSpike: 0, goldScorpion: 0, boss: 0, empty: 0, breaks: 0 };
  };
  Scoring.prototype.add = function (points, kind) {
    this.score += points;
    if (kind && this.counts[kind] !== undefined) this.counts[kind]++;
  };
  Scoring.prototype.count = function (kind) {
    if (this.counts[kind] !== undefined) this.counts[kind]++;
  };

  // 三級擇一，不累加
  function tierFor(score) {
    var tiers = C.REWARD_TIERS.slice().sort(function (a, b) { return a.minScore - b.minScore; });
    var pick = tiers[0];
    for (var i = 0; i < tiers.length; i++) if (score >= tiers[i].minScore) pick = tiers[i];
    return pick;
  }
  function tierRangeText(tier) {
    var tiers = C.REWARD_TIERS.slice().sort(function (a, b) { return a.minScore - b.minScore; });
    var idx = tiers.indexOf(tier);
    var next = tiers[idx + 1];
    return next ? (tier.minScore + '～' + (next.minScore - 1) + '分') : (tier.minScore + '分以上');
  }

  WAM.Scoring = Scoring;
  WAM.Rewards = { tierFor: tierFor, tierRangeText: tierRangeText };
})(typeof window !== 'undefined' ? window : globalThis);

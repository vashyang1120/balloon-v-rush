/* =========================================================
 * game.js — 遊戲狀態與計時、輸入與敲擊判定（核心規則）
 *
 * 滑鼠、鍵盤、觸控全部呼叫同一個 requestHit()：
 * 同一套判定、同一套計分、同一把槌子、同一個0.1秒間隔。
 * 本檔不碰 DOM，可在 Node 直接跑自動測試。
 * ========================================================= */
(function (W) {
  'use strict';
  var WAM = W.WAM;
  var C = WAM.CONFIG;

  function Game(grid, hooks) {
    this.grid = grid;
    this.hooks = hooks || {};
    this.clock = new WAM.GameClock();
    this.hammer = new WAM.Hammer();
    this.rings = new WAM.GoldRings();
    this.boss = new WAM.Boss();
    this.scoring = new WAM.Scoring();
    this.state = 'idle';
  }

  Game.prototype.reset = function (seed) {
    this.seed = seed >>> 0;
    this.schedule = WAM.Schedule.build(this.seed);
    this.clock.reset();
    this.clock.limit = C.GAME_DURATION;
    this.hammer.reset();
    this.rings.reset(this.schedule.rings);
    this.boss.reset();
    this.scoring.reset();
    this.pending = this.schedule.targets.map(function (t) {
      return { id: t.id, type: t.type, s: t.s, d: t.d, e: t.e, hole: t.hole, period: t.period, hitAt: null };
    });
    this.nextIdx = 0;
    this.active = [];
    this.fx = [];
    this.spiritUsed = 0;
    this.spiritOpen = null;
    this.rejected = { broken: 0, tooFast: 0, notPlaying: 0 };
    this.lastResult = null;
    this.spawned = {};
    var self = this;
    C.PERIODS.forEach(function (p) { self.spawned[p.id] = { scorpion: 0, orange: 0, spike: 0 }; });
    this.state = 'intro';
  };

  Game.prototype.start = function (realMs) {
    if (this.state !== 'intro') return;
    this.state = 'playing';
    this.clock.start(realMs);
  };

  Game.prototype.now = function (realMs) { return this.clock.peek(realMs); };
  Game.prototype.isBossPhase = function (t) { return this.boss.isActive(t); };

  Game.prototype.periodAt = function (t) {
    if (t >= C.BOSS_START) return { id: 'BOSS', label: '27～30秒 Boss戰' };
    for (var i = 0; i < C.PERIODS.length; i++) {
      if (t >= C.PERIODS[i].from && t < C.PERIODS[i].to) return C.PERIODS[i];
    }
    return C.PERIODS[0];
  };

  /* ---------- 每幀更新（以遊戲時鐘推進） ---------- */
  Game.prototype.update = function (realMs) {
    if (this.state !== 'playing') return;
    var t = this.clock.tick(realMs);

    // 依排程生成（只看時間，與玩家表現無關）
    while (this.nextIdx < this.pending.length && this.pending[this.nextIdx].s <= t + 1e-9) {
      var tg = this.pending[this.nextIdx++];
      this.active.push(tg);
      this.spawned[tg.period][tg.type]++;
    }
    // 退場
    this.active = this.active.filter(function (g) {
      var endT = g.hitAt !== null ? Math.min(g.e + C.HIT_LEAVE_TIME, g.hitAt + C.HIT_LEAVE_TIME) : g.e;
      return t < endT;
    });
    // 特效清理
    this.fx = this.fx.filter(function (f) { return t - f.t0 < 1.4; });

    if (t >= C.GAME_DURATION - 1e-9) this.finish(realMs);
  };

  Game.prototype.finish = function (realMs) {
    if (this.state !== 'playing') return;
    this.clock.stop(realMs);
    this.clock.t = C.GAME_DURATION;
    this.state = 'ended';
    this.fx = this.fx.filter(function (f) { return f.type !== 'swing'; });
    var tier = WAM.Rewards.tierFor(this.scoring.score);
    if (this.hooks.onEnd) this.hooks.onEnd({ score: this.scoring.score, tier: tier, counts: this.scoring.counts, seed: this.seed });
  };

  Game.prototype.targetAtHole = function (hole, t) {
    for (var i = 0; i < this.active.length; i++) {
      var g = this.active[i];
      if (g.hole === hole && g.hitAt === null && g.s <= t + 1e-9 && t < g.e) return g;
    }
    return null;
  };

  Game.prototype.addFx = function (f) { this.fx.push(f); return f; };

  /* ---------- 敲擊（三種輸入共用） ----------
   * input: { kind:'point', x, y } 或 { kind:'key', index }
   * source: 'mouse' | 'touch' | 'pen' | 'key'
   */
  Game.prototype.requestHit = function (input, source, realMs) {
    this.update(realMs); // 先把狀態推進到敲擊的精確時間
    var res = { ok: false, source: source, reason: '', outcome: '', slot: null };
    if (this.state !== 'playing' || this.clock.isPaused()) {
      this.rejected.notPlaying++;
      res.reason = 'notPlaying';
      return res;
    }
    var t = this.clock.t;
    if (t >= C.GAME_DURATION) { res.reason = 'ended'; return res; }

    var bossPhase = this.isBossPhase(t);
    var slot;
    if (input.kind === 'key') slot = this.grid.slotFromKeyIndex(input.index, bossPhase);
    else slot = this.grid.hitTest(input.x, input.y, bossPhase);
    res.slot = slot;

    var px = input.kind === 'point' ? input.x : null;
    var py = input.kind === 'point' ? input.y : null;

    if (slot === null) { // 點到九宮格外：只揮空，不算敲擊
      if (!this.hammer.isBroken(t)) this.addFx({ type: 'swing', t0: t, slot: null, x: px, y: py, source: source, gold: this.hammer.isGold(t) });
      res.reason = 'outside';
      return res;
    }
    if (this.hammer.isBroken(t)) {
      this.rejected.broken++;
      this.addFx({ type: 'denied', t0: t, slot: slot, x: px, y: py, source: source });
      res.reason = 'broken';
      return res;
    }
    if (!this.hammer.intervalOk(t)) {
      this.rejected.tooFast++;
      res.reason = 'tooFast';
      return res;
    }

    // ---- 有效敲擊 ----
    this.hammer.markHit(t);
    var gold = this.hammer.isGold(t);
    this.addFx({ type: 'swing', t0: t, slot: slot, x: px, y: py, source: source, gold: gold });
    res.ok = true;

    if (slot === 'boss') {
      if (gold) {
        this.boss.registerHit(t);
        this.scoring.add(C.SCORE_BOSS, 'boss');
        this.addFx({ type: 'pop', t0: t, slot: 'boss', text: '+' + C.SCORE_BOSS, big: true });
        res.outcome = 'bossHit';
      } else {
        this.breakHammer('boss', t, realMs, slot);
        res.outcome = 'break';
        res.cause = 'boss';
      }
    } else {
      var ring = this.rings.ringAtHole(slot, t);
      if (ring) {
        this.rings.take(ring, t);
        this.hammer.makeGold(t, ring.to);
        this.addFx({ type: 'goldget', t0: t, slot: slot });
        res.outcome = 'ring';
      } else {
        var tg = this.targetAtHole(slot, t);
        if (!tg) {
          this.scoring.count('empty');
          this.addFx({ type: 'dust', t0: t, slot: slot });
          res.outcome = 'empty';
        } else if (tg.type === 'scorpion') {
          tg.hitAt = t;
          this.scoring.add(gold ? C.SCORE_GOLD_TARGET : C.SCORE_SCORPION, gold ? 'goldScorpion' : 'scorpion');
          this.addFx({ type: 'pop', t0: t, slot: slot, text: '+' + (gold ? C.SCORE_GOLD_TARGET : C.SCORE_SCORPION) });
          res.outcome = 'scorpion';
        } else if (gold) {
          tg.hitAt = t;
          this.scoring.add(C.SCORE_GOLD_TARGET, tg.type === 'orange' ? 'goldOrange' : 'goldSpike');
          this.addFx({ type: 'pop', t0: t, slot: slot, text: '+' + C.SCORE_GOLD_TARGET, goldText: true });
          res.outcome = 'gold-' + tg.type;
        } else {
          this.breakHammer(tg.type, t, realMs, slot);
          res.outcome = 'break';
          res.cause = tg.type;
        }
        res.targetId = tg ? tg.id : null;
      }
    }
    this.lastResult = { t: t, outcome: res.outcome, source: source };
    return res;
  };

  /* ---------- 爆槌 + 星靈提醒（每局最多一次） ---------- */
  Game.prototype.breakHammer = function (cause, t, realMs, slot) {
    this.hammer.breakAt(t);
    this.scoring.count('breaks');
    this.addFx({ type: 'burst', t0: t, slot: slot, cause: cause });
    if (this.spiritUsed < C.SPIRIT_MAX_REMINDERS) {
      this.spiritUsed++;
      this.openSpirit(cause, realMs);
    }
  };

  Game.prototype.openSpirit = function (key, realMs) {
    this.spiritOpen = key;
    this.clock.pause('spirit', realMs); // 遊戲時間、出現、金環、修復、Boss 全部凍結
    if (this.hooks.onSpirit) this.hooks.onSpirit(key, C.SPIRIT_TEXT[key]);
  };
  Game.prototype.closeSpirit = function (realMs) {
    if (!this.spiritOpen) return;
    this.spiritOpen = null;
    this.clock.resume('spirit', realMs);
  };

  // 其他暫停原因（手機直拿、切換分頁）
  Game.prototype.setPause = function (reason, on, realMs) {
    if (on) this.clock.pause(reason, realMs);
    else this.clock.resume(reason, realMs);
  };

  WAM.Game = Game;
})(typeof window !== 'undefined' ? window : globalThis);

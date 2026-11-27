'use strict';

const balloonDice = (() => {
  const tiers = Object.freeze({ normal: 40, rare: 60, precious: 100 });
  const pipLayout = [
    [[0, 0]],
    [[-1, -1], [1, 1]],
    [[-1, -1], [0, 0], [1, 1]],
    [[-1, -1], [1, -1], [-1, 1], [1, 1]],
    [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
    [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
  ];

  function isFace(value) { return Number.isInteger(value) && value >= 1 && value <= 6; }

  function payout(tier, rolls = null) {
    if (!Object.hasOwn(tiers, tier)) throw new RangeError('Unknown treasure tier');
    return payoutCoins(tiers[tier], rolls);
  }

  function payoutCoins(base, rolls = null) {
    if (!Number.isSafeInteger(base) || base <= 0) throw new RangeError('Invalid coin reward');
    if (rolls === null) return { outcome: 'declined', coins: base };
    const { player, spirit } = rolls;
    if (!isFace(player) || !isFace(spirit)) throw new RangeError('Invalid die face');
    if (player === spirit) return { outcome: 'tie', coins: base };
    return player > spirit ? { outcome: 'win', coins: base * 2 } : { outcome: 'loss', coins: base / 2 };
  }

  function rollFace(random = Math.random) { return 1 + Math.floor(random() * 6); }

  // The caller saves the returned ledger alongside inventory in a single update.
  function prepareClaim(ledger, chestId, tier, rolls = null) {
    if (typeof chestId !== 'string' || !chestId) throw new TypeError('Missing chest identity');
    if (Object.hasOwn(ledger, chestId)) return null;
    const result = payout(tier, rolls);
    return { ...result, ledger: { ...ledger, [chestId]: { tier, ...result } } };
  }

  // faceBox is measured inside the yellow balloon on the approved front image.
  function drawFace(ctx, art, bounds, faceBox, face, motion) {
    if (!art || !isFace(face)) throw new RangeError('Dice art and a standard face are required');
    const { x, y, w, h } = bounds;
    const { cx, cy, spacing, radius } = faceBox;
    ctx.save();
    try {
      ctx.translate(x + w / 2, y + h / 2 + motion.y);
      ctx.rotate(motion.angle);
      ctx.scale(motion.scaleX, motion.scaleY);
      ctx.drawImage(art, -w / 2, -h / 2, w, h);
      ctx.fillStyle = '#4c285d';
      for (const [dx, dy] of pipLayout[face - 1]) {
        ctx.beginPath();
        ctx.arc((cx + dx * spacing - 0.5) * w, (cy + dy * spacing - 0.5) * h,
          radius * Math.min(w, h), 0, Math.PI * 2);
        ctx.fill();
      }
    } finally { ctx.restore(); }
  }

  // Revision 5（G-04）：傳入 timing 時，兩顆骰子平分骰子音檔的長度，最後一顆在音檔結束時停住並揭曉。
  //   timing = { totalMs(), elapsed(), finished() }；沒有 timing 時維持原本每顆 1450 ms。
  //   跳動次數與換面節奏照原本的視覺風格按時間等比例放大（同樣的跳動頻率，只是跳得比較久）。
  const BASE_SPAN = 1450;
  function animate(draw, { random = Math.random, nextFrame = requestAnimationFrame, timing = null } = {}) {
    if (typeof draw !== 'function') throw new TypeError('Missing dice renderer');
    let active;
    return function play(final) {
      if (active) return active;
      final ??= { player: rollFace(random), spirit: rollFace(random) };
      let firstTime, lastChange = -Infinity;
      let die = 'player';
      let face = rollFace(random);
      let finish, fail;
      active = new Promise((resolve, reject) => { finish = resolve; fail = reject; });
      const pending = active;
      function frame(now) {
        try {
          firstTime ??= now;
          let span = BASE_SPAN, dieElapsed, over = false;
          if (timing) {
            const total = Math.max(1, timing.totalMs());
            const el = Math.min(total, Math.max(0, timing.elapsed()));
            span = total / 2;
            over = timing.finished() || el >= total;
            if (die === 'player' && (over || el >= span)) {
              if (!over) { die = 'spirit'; lastChange = -Infinity; }
            }
            if (over) { die = 'spirit'; dieElapsed = span; }
            else dieElapsed = el - (die === 'player' ? 0 : span);
          } else dieElapsed = now - firstTime;
          const k = span / BASE_SPAN;
          const t = Math.min(1, dieElapsed / span);
          const remaining = 1 - t;
          if (t < 1 && dieElapsed - lastChange >= (33 + 220 * t ** 2) * Math.min(k, 1.6)) {
            lastChange = dieElapsed;
            face = rollFace(random);
          }
          const hop = Math.abs(Math.sin(t * 4 * k * Math.PI)) * remaining ** 2;
          const squash = Math.cos(t * 8 * k * Math.PI) * 0.10 * remaining;
          const rolling = t === 1 ? final[die] : face;
          draw(die === 'player' ? { player: rolling, spirit: null } : { player: final.player, spirit: rolling }, {
            die,
            y: -64 * hop,
            angle: Math.sin(t * 5 * k * Math.PI) * 0.72 * remaining,
            scaleX: 1 + squash,
            scaleY: 1 - squash,
          });
          if (timing) {
            if (over) { active = null; finish(final); }
            else nextFrame(frame);
          } else if (t < 1) nextFrame(frame);
          else if (die === 'player') {
            die = 'spirit';
            firstTime = undefined;
            lastChange = -Infinity;
            nextFrame(frame);
          } else { active = null; finish(final); }
        } catch (error) { active = null; fail(error); }
      }
      try { nextFrame(frame); } catch (error) { active = null; fail(error); }
      return pending;
    };
  }

  return { tiers, payout, payoutCoins, prepareClaim, rollFace, drawFace, animate };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = balloonDice;

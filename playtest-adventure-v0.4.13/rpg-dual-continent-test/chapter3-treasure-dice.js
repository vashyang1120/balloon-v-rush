'use strict';

const chapter3TreasureDice = (() => {
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
    const base = tiers[tier];
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

  function animate(draw, { random = Math.random, nextFrame = requestAnimationFrame } = {}) {
    if (typeof draw !== 'function') throw new TypeError('Missing dice renderer');
    let active;
    return function play(final) {
      if (active) return active;
      final ??= { player: rollFace(random), spirit: rollFace(random) };
      let firstTime, lastChange = -Infinity;
      let faces = { player: rollFace(random), spirit: rollFace(random) };
      let finish, fail;
      active = new Promise((resolve, reject) => { finish = resolve; fail = reject; });
      const pending = active;
      function frame(now) {
        try {
          firstTime ??= now;
          const elapsed = now - firstTime;
          const t = Math.min(1, elapsed / 1450);
          const remaining = 1 - t;
          if (t < 1 && elapsed - lastChange >= 33 + 220 * t ** 2) {
            lastChange = elapsed;
            faces = { player: rollFace(random), spirit: rollFace(random) };
          }
          const hop = Math.abs(Math.sin(t * 4 * Math.PI)) * remaining ** 2;
          const squash = Math.cos(t * 8 * Math.PI) * 0.10 * remaining;
          draw(t === 1 ? final : faces, {
            y: -64 * hop,
            angle: Math.sin(t * 5 * Math.PI) * 0.72 * remaining,
            scaleX: 1 + squash,
            scaleY: 1 - squash,
          });
          if (t < 1) nextFrame(frame);
          else { active = null; finish(final); }
        } catch (error) { active = null; fail(error); }
      }
      try { nextFrame(frame); } catch (error) { active = null; fail(error); }
      return pending;
    };
  }

  return { tiers, payout, prepareClaim, rollFace, drawFace, animate };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = chapter3TreasureDice;

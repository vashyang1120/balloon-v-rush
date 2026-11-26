'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const dice = require('../chapter3-treasure-dice.js');

test('all confirmed payouts and refusal use only the current chest value', () => {
  for (const [tier, base] of Object.entries({ normal: 40, rare: 60, precious: 100 })) {
    assert.deepEqual(dice.payout(tier), { outcome: 'declined', coins: base });
    assert.deepEqual(dice.payout(tier, { player: 6, spirit: 4 }), { outcome: 'win', coins: 2 * base });
    assert.deepEqual(dice.payout(tier, { player: 2, spirit: 4 }), { outcome: 'loss', coins: base / 2 });
    assert.deepEqual(dice.payout(tier, { player: 3, spirit: 3 }), { outcome: 'tie', coins: base });
  }
  assert.throws(() => dice.payout('constructor'), RangeError);
  assert.throws(() => dice.payout('normal', { player: 0, spirit: 4 }), RangeError);
});

test('claim decisions can be saved and retried without paying the same chest twice', () => {
  const original = {};
  const claim = dice.prepareClaim(original, '3-4:bank', 'precious', { player: 5, spirit: 2 });
  assert.equal(claim.coins, 200);
  assert.deepEqual(original, {});
  const loaded = JSON.parse(JSON.stringify(claim.ledger));
  assert.equal(dice.prepareClaim(loaded, '3-4:bank', 'precious'), null);
  assert.equal(dice.prepareClaim(loaded, '3-4:cliff', 'rare').coins, 60);
});

test('the random draw divides its input into six equal faces', () => {
  const counts = Array(6).fill(0);
  for (let i = 0; i < 6000; i++) counts[dice.rollFace(() => (i + 0.5) / 6000) - 1]++;
  assert.deepEqual(counts, [1000, 1000, 1000, 1000, 1000, 1000]);
});

test('all standard pips are contained and share the image transform', () => {
  for (let face = 1; face <= 6; face++) {
    const events = [];
    const ctx = {};
    for (const method of ['save','restore','translate','rotate','scale','drawImage','beginPath','arc','fill']) {
      ctx[method] = (...args) => events.push([method, ...args]);
    }
    const image = {};
    dice.drawFace(ctx, image, { x: 50, y: 40, w: 120, h: 120 },
      { cx: 0.5, cy: 0.5, spacing: 0.12, radius: 0.04 }, face,
      { y: -8, angle: 0.3, scaleX: 1.04, scaleY: 0.96 });
    assert.deepEqual(events.slice(0, 5), [
      ['save'], ['translate', 110, 92], ['rotate', 0.3], ['scale', 1.04, 0.96],
      ['drawImage', image, -60, -60, 120, 120],
    ]);
    const pips = events.filter(([name]) => name === 'arc');
    assert.equal(pips.length, face);
    assert.equal(new Set(pips.map(([, x, y]) => x + ',' + y)).size, face);
    assert.ok(pips.every(([, x, y, r]) => Math.max(Math.abs(x), Math.abs(y)) + r < 20));
    assert.deepEqual(events.at(-1), ['restore']);
  }
});

test('a running animation rejects duplicate starts and lands on the exact result', async () => {
  const frames = [], draws = [];
  const randomValues = [0.9, 0.2];
  const play = dice.animate((faces, motion) => draws.push({ faces, motion }), {
    random: () => randomValues.shift() ?? 0.4,
    nextFrame: callback => frames.push(callback),
  });
  const result = play();
  assert.equal(play(), result);
  for (const time of [0, 240, 600, 1050, 1460, 1480, 1710, 2100, 2950]) frames.shift()(time);
  assert.equal(frames.length, 0);
  assert.deepEqual(await result, { player: 6, spirit: 2 });
  assert.deepEqual(draws.at(-1).faces, { player: 6, spirit: 2 });
  assert.ok(draws.filter(({ motion }) => motion.die === 'player').every(({ faces }) => faces.spirit === null));
  assert.ok(draws.filter(({ motion }) => motion.die === 'spirit').every(({ faces }) => faces.player === 6));
  assert.ok(draws.some(frame => frame.motion.y < -10));
  assert.equal(Math.abs(draws.at(-1).motion.y), 0);
  assert.equal(draws.at(-1).motion.scaleX, 1);
});

// Revision 5 G-04: with an audio timing source, the dice stop exactly when the audio ends.
test('audio-timed animation splits the clip between the two dice and stops at its end', async () => {
  const frames = [], draws = [];
  let clock = 0, ended = false;
  const total = 6661;
  const timing = { totalMs: () => total, elapsed: () => clock, finished: () => ended };
  const play = dice.animate((faces, motion) => draws.push({ faces, motion, at: clock }), {
    random: () => 0.5, nextFrame: callback => frames.push(callback), timing,
  });
  const result = play({ player: 4, spirit: 3 });
  const step = ms => { clock = ms; frames.shift()(ms); };
  for (let t = 0; t <= 6600; t += 100) step(t);
  assert.equal(frames.length, 1, 'still rolling before the audio ends');
  assert.ok(draws.filter(d => d.at < total / 2).every(d => d.motion.die === 'player'));
  assert.ok(draws.filter(d => d.at >= total / 2 + 1).every(d => d.motion.die === 'spirit'));
  ended = true; step(6661);
  assert.equal(frames.length, 0, 'stops on the audio end');
  assert.deepEqual(await result, { player: 4, spirit: 3 });
  assert.deepEqual(draws.at(-1).faces, { player: 4, spirit: 3 });
  assert.equal(draws.at(-1).at, 6661);
});

test('audio-timed animation also stops on the verified duration when no end event comes (G-10)', async () => {
  const frames = [];
  let clock = 0;
  const play = dice.animate(() => {}, {
    random: () => 0.3, nextFrame: callback => frames.push(callback),
    timing: { totalMs: () => 6661, elapsed: () => clock, finished: () => false },
  });
  const result = play({ player: 1, spirit: 6 });
  for (const t of [0, 3000, 6000, 6660]) { clock = t; frames.shift()(t); }
  assert.equal(frames.length, 1);
  clock = 6661; frames.shift()(6661);
  assert.equal(frames.length, 0);
  assert.deepEqual(await result, { player: 1, spirit: 6 });
});

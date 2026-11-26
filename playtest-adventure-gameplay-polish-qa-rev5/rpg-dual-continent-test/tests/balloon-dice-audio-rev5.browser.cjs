'use strict';
// Revision 5 Batch G: balloon dice audio, measured in a real browser with real input.
// Flow: QA tool shortcut to the 3-4 chest ledge (dog + one die) → spirit invitation → "是" → roll → reveal → continue.
// Checks G-01 (one BGM at a time, level BGM back afterwards), G-03 (ring SFX once, only after "是"),
// G-04 (reveal when the roll audio ends), G-05/06/07 (result SFX once or none), G-09 (no live voices left), and
// the "否" path. Measured timestamps go to REV5_EVIDENCE/G12-dice-audio-timeline.json.
const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const { test } = require('node:test');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { serveCheckout } = require('./chapter3-static-fixture.cjs');

const origin = 'http://127.0.0.1:8412';
const evidence = process.env.REV5_EVIDENCE;

async function boot(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  const page = await context.newPage();
  await page.route(/^https?:\/\/[^/]+\//, route => serveCheckout(route, origin));
  await page.addInitScript(() => {
    window.__sfx = [];
    window.__wrapSfx = () => {
      if (window.__sfxWrapped || typeof sfxPlay !== 'function') return;
      const o = sfxPlay; window.__sfxWrapped = true;
      globalThis.sfxPlay = function (key) { window.__sfx.push({ key, t: Math.round(performance.now()) }); return o.apply(this, arguments); };
    };
  });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(origin + '/rpg-dual-continent-test/?guest=1&sandbox=1&devtools=1&ch3test=start');
  await page.waitForFunction(() => assetBootReady, undefined, { timeout: 90000 });
  await page.locator('#btn-start-gate-go').click();   // a real click: unlocks audio like a player tap
  await page.waitForFunction(() => gameState === 'playing' && debugC34().ready, undefined, { timeout: 90000 });
  await page.evaluate(() => { if (rpgActive) rpgClose('skipped'); window.__wrapSfx(); });
  await page.waitForTimeout(1500);
  return { page, context, errors };
}

async function toInvitation(page) {
  await page.evaluate(() => qaTestTool.SHORTCUTS.find(s => s.name.startsWith('骰子音效')).go());
  await page.waitForFunction(() => rpgActive?.id === 'chapter3-treasure-invite', undefined, { timeout: 60000 });
  await page.waitForTimeout(900);
  return page.evaluate(() => ({ dice: debugDiceAudio(), levelBgmPaused: chapter3Bgm ? chapter3Bgm.paused : null }));
}

async function toChoice(page) {
  const accept = page.locator('#rpg-overlay [data-act="dice-accept"]');
  for (let i = 0; i < 8 && !await accept.isVisible(); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(350); }
  await accept.waitFor({ timeout: 5000 });
}

// The dice rules are untouched; the test only fixes which faces come up so every result sound is measured.
const FIXED = { win: [6, 1], loss: [1, 6], tie: [3, 3] };
for (const [outcome, faces] of Object.entries(FIXED)) test('dice audio: accept path timeline (' + outcome + ')', { timeout: 240000 }, async () => {
  const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  try {
    const { page, errors } = await boot(browser);
    const inv = await toInvitation(page);
    assert.equal(inv.dice.active, true);
    assert.equal(inv.dice.bgm.paused, false, 'minigame BGM plays at the invitation');
    assert.match(inv.dice.bgm.src, /minigames\/volleyball\/assets\/audio\/bgm\/volleyball_game_bgm\.mp3/);
    assert.equal(inv.levelBgmPaused, true, 'level BGM is paused while the minigame BGM plays');
    await toChoice(page);
    await page.evaluate(f => { const q = f.slice(); chapter3TreasureDice.rollFace = () => q.shift(); }, faces);
    const ringBefore = await page.evaluate(() => window.__sfx.filter(s => s.key === 'ringGet').length);
    assert.equal(ringBefore, 0, 'no ring SFX before "是"');
    await page.locator('#rpg-overlay [data-act="dice-accept"]').click();
    await page.waitForFunction(() => debugDiceAudio().log.some(e => e.ev === 'reveal'), undefined, { timeout: 20000 });
    await page.waitForTimeout(4500);   // let the victory SFX (3.997 s) finish
    const mid = await page.evaluate(() => ({ dice: debugDiceAudio(), ring: window.__sfx.filter(s => s.key === 'ringGet'), levelBgmPaused: chapter3Bgm.paused }));
    const log = mid.dice.log;
    const at = ev => log.find(e => e.ev === ev);
    const roll = at('rollStart'), reveal = at('reveal'), ended = at('rollAudioEnded'), heroic = at('heroic');
    assert.equal(mid.ring.length, 1, 'ring SFX exactly once');
    assert.equal(heroic.played, true);
    assert.equal(roll.mode, 'webaudio');
    assert.ok(Math.abs(roll.totalMs - 6661) <= 2, 'roll uses the measured clip length: ' + roll.totalMs);
    // The reveal comes when the roll audio reaches its end on the audio clock; the onended event itself
    // may arrive a frame before or after that.
    assert.ok(reveal.audioMs >= roll.totalMs - 20, 'audio clock at the reveal: ' + reveal.audioMs);
    assert.ok(reveal.audioMs - roll.totalMs < 120, 'reveal within one or two frames of the audio end: ' + reveal.audioMs);
    if (ended) assert.ok(Math.abs(reveal.t - ended.t) < 120, 'reveal next to the end event: ' + (reveal.t - ended.t));
    assert.ok(Math.abs(reveal.animMs - 6661) < 150, 'animation length follows the audio: ' + reveal.animMs);
    const results = log.filter(e => e.ev === 'resultSfx');
    assert.equal(results.length, 1, 'one result SFX decision');
    assert.equal(reveal.outcome, outcome);
    assert.equal(results[0].played, outcome !== 'tie');
    assert.equal(mid.dice.bgm.paused, false, 'still one minigame BGM during the result');
    assert.equal(mid.levelBgmPaused, true);
    await page.getByRole('button', { name: '繼續冒險', exact: true }).click();
    await page.waitForTimeout(1200);
    const after = await page.evaluate(() => ({ dice: debugDiceAudio(), levelBgmPaused: chapter3Bgm.paused, gameState }));
    assert.equal(after.dice.active, false);
    assert.equal(after.dice.bgm.paused, true, 'minigame BGM stopped');
    assert.equal(after.dice.liveRollVoice, false, 'no roll voice left');
    assert.equal(after.levelBgmPaused, false, 'level BGM back');
    assert.deepEqual(errors, []);
    if (evidence) {
      await mkdir(evidence, { recursive: true });
      const t0 = log.find(e => e.ev === 'invite').t;
      await writeFile(evidence + '/G12-dice-audio-timeline-' + outcome + '.json', JSON.stringify({
        outcome: reveal.outcome,
        timelineMs: log.map(e => Object.assign({}, e, { t: Math.round(e.t - t0) })),
        ringSfxAtMs: mid.ring.map(r => r.t - Math.round(t0)),
        audioMsAtReveal: reveal.audioMs, revealMinusEndEventMs: ended ? Math.round(reveal.t - ended.t) : null, animMs: reveal.animMs, rollTotalMs: roll.totalMs,
        resultSfxAtMs: results.map(e => Math.round(e.t - t0)),
        afterContinue: { minigameBgmPaused: after.dice.bgm.paused, levelBgmPaused: after.levelBgmPaused },
      }, null, 2));
    }
  } finally { await browser.close(); }
});

test('dice audio: "否" stops the minigame BGM and plays no ring or roll audio', { timeout: 180000 }, async () => {
  const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  try {
    const { page, errors } = await boot(browser);
    await toInvitation(page);
    await toChoice(page);
    await page.locator('#rpg-overlay [data-act="dice-decline"]').click();
    await page.waitForTimeout(1500);
    const s = await page.evaluate(() => ({ dice: debugDiceAudio(), ring: window.__sfx.filter(x => x.key === 'ringGet').length, levelBgmPaused: chapter3Bgm.paused, rpg: rpgActive?.id || null }));
    assert.equal(s.ring, 0);
    assert.equal(s.dice.active, false);
    assert.equal(s.dice.bgm.paused, true);
    assert.ok(!s.dice.log.some(e => e.ev === 'rollStart'));
    assert.equal(s.levelBgmPaused, false, 'level BGM back after "否"');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('dice audio: tie adds no result SFX; mute keeps the timing; tab hide pauses the BGM', { timeout: 120000 }, async () => {
  const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  try {
    const { page } = await boot(browser);
    const r = await page.evaluate(async () => {
      const wait = ms => new Promise(res => setTimeout(res, ms));
      balloonDiceAudio.invite();
      await wait(1500);
      SFX.muted = true;
      const timing = balloonDiceAudio.startRoll();
      const total = timing.totalMs();
      await wait(800);
      const mid = timing.elapsed();
      balloonDiceAudio.reveal('tie');
      const log = debugDiceAudio().log;
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      balloonDiceAudio.sync();
      const hiddenPaused = debugDiceAudio().bgm.paused;
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      SFX.muted = false;
      balloonDiceAudio.sync();
      await wait(300);
      const back = debugDiceAudio().bgm.paused;
      balloonDiceAudio.end('test');
      return { total, mid, tie: log.filter(e => e.ev === 'resultSfx'), hiddenPaused, back, ended: debugDiceAudio().active };
    });
    assert.ok(Math.abs(r.total - 6661) <= 2);
    assert.ok(r.mid > 600 && r.mid < 1200, 'muted roll still advances on the audio clock: ' + r.mid);
    assert.deepEqual(r.tie.map(e => e.played), [false]);
    assert.equal(r.hiddenPaused, true);
    assert.equal(r.back, false);
    assert.equal(r.ended, false);
  } finally { await browser.close(); }
});

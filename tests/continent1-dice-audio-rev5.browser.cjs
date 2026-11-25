'use strict';
// Revision 5 Batch G on Continent 1: the same balloon-dice-audio.js drives the 1-3 coin-bag duel.
// Win, loss and tie are fixed through balloonDice.rollFace (rules untouched) so every result sound is measured.
const assert = require('node:assert/strict');
const test = require('node:test');
const { mkdir, writeFile } = require('node:fs/promises');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { createPreview } = require('./preview-entry.cjs');
const entryPath = '/rpg-continent1-universe/';
const evidence = process.env.REV5_EVIDENCE;

test('Continent 1 dice audio timeline', { timeout: 400000 }, async t => {
  const server = createPreview();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  t.after(() => browser.close());
  for (const [outcome, faces, choice] of [['win', [6, 1], 'accept'], ['loss', [1, 6], 'accept'], ['tie', [4, 4], 'accept'], ['declined', [6, 1], 'decline']]) {
    await t.test(outcome, async () => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
        await page.addInitScript(() => {
          if (localStorage.getItem('balloonV_inventory')) return;
          localStorage.setItem('balloonV_inventory', JSON.stringify({
            coins: 100, balloon260: 7, roundBalloon: 2, craftedItems: { basicHammer: 1, balloonDice: 1 },
            unlockedRecipes: { basicHammer: true, balloonDice: true }, chapter1Flow: { hammerRecipeGranted: true, hammerMaterialGuaranteeDone: true },
            balloonDog: { present: true, turnsLeft: 3 }, bagLevel: 1,
          }));
        });
        await page.goto(origin + entryPath + '?guest=1&sandbox=1&nocomic=1', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => assetBootReady, undefined, { timeout: 90000 });
        await page.mouse.click(5, 5);   // a user gesture for audio
        await page.evaluate(faces => {
          rpgLoad().worldIntro = 'done';
          rpgSetMode('first');
          rpgMarkSeen('rpg011_hammer_crafted', 'qa');
          window.__ring = 0;
          const o = sfxPlay; globalThis.sfxPlay = function (key) { if (key === 'ringGet') window.__ring++; return o.apply(this, arguments); };
          if (rpgActive) rpgClose('reset');
          closeHomeScreen();
          if (gameStartGateActive) startAdventureFromGate();
          currentLevelIndex = LEVELS.findIndex(level => level.stageId === '1-3');
          loadLevel(currentLevelIndex);
          restart({ keepHp: false });
          // The guest sandbox keeps its own save, so the die is given in-game (as crafting would).
          playerInventory.unlockedRecipes.balloonDice = true;
          playerInventory.craftedItems.balloonDice = 1;
          saveInventory();
          createLevelStartSnapshot();
          gameState = 'playing';
          const rolls = faces.slice();
          balloonDice.rollFace = () => rolls.shift();
        }, faces);
        await page.waitForTimeout(1500);
        await page.evaluate(() => {
          const item = coins.find(c => c.v395Kind === 'coinBag');
          player.x = item.x - 8; player.y = item.y - 10; checkCollectibles();
        });
        const dialog = page.locator('#rpg-overlay');
        await dialog.waitFor({ state: 'visible' });
        await page.waitForTimeout(900);
        const invite = await page.evaluate(() => ({ dice: debugDiceAudio(), level: chapter1Bgm ? chapter1Bgm.paused : null }));
        assert.equal(invite.dice.active, true);
        assert.equal(invite.dice.bgm.paused, false);
        assert.equal(invite.level, true);
        for (let i = 0; i < 4; ++i) {
          await page.keyboard.press('Enter');
          if (await dialog.getByRole('button', { name: '是', exact: true }).isVisible()) break;
        }
        await dialog.getByRole('button', { name: choice === 'accept' ? '是' : '否', exact: true }).click();
        if (choice === 'decline') {
          await page.waitForTimeout(1500);
          const s = await page.evaluate(() => ({ dice: debugDiceAudio(), ring: window.__ring, level: chapter1Bgm.paused }));
          assert.equal(s.ring, 0);
          assert.equal(s.dice.active, false);
          assert.equal(s.dice.bgm.paused, true);
          assert.ok(!s.dice.log.some(e => e.ev === 'rollStart'));
          assert.equal(s.level, false);
          assert.deepEqual(errors, []);
          return;
        }
        await dialog.getByRole('button', { name: '繼續冒險' }).waitFor({ state: 'visible', timeout: 20000 });
        const mid = await page.evaluate(() => ({ dice: debugDiceAudio(), ring: window.__ring }));
        const log = mid.dice.log, at = ev => log.find(e => e.ev === ev);
        const reveal = at('reveal'), roll = at('rollStart');
        assert.equal(mid.ring, 1);
        assert.equal(roll.mode, 'webaudio');
        assert.equal(reveal.outcome, outcome);
        assert.ok(reveal.audioMs >= roll.totalMs - 20 && reveal.audioMs - roll.totalMs < 120, 'reveal at the audio end: ' + reveal.audioMs);
        const results = log.filter(e => e.ev === 'resultSfx');
        assert.equal(results.length, 1);
        assert.equal(results[0].played, outcome !== 'tie');
        await dialog.getByRole('button', { name: '繼續冒險' }).click();
        await page.waitForTimeout(1200);
        const after = await page.evaluate(() => ({ dice: debugDiceAudio(), level: chapter1Bgm.paused }));
        assert.equal(after.dice.active, false);
        assert.equal(after.dice.bgm.paused, true);
        assert.equal(after.dice.liveRollVoice, false);
        assert.equal(after.level, false);
        assert.deepEqual(errors, []);
        if (evidence) {
          await mkdir(evidence, { recursive: true });
          const t0 = at('invite').t;
          await writeFile(evidence + '/G12-continent1-dice-audio-' + outcome + '.json', JSON.stringify({
            outcome, timelineMs: log.map(e => Object.assign({}, e, { t: Math.round(e.t - t0) })) }, null, 2));
        }
      } finally { await context.close(); }
    });
  }
});

'use strict';
// Revision 5 C-01 to C-04: the 3-4 tree chasm (A3) with real keyboard input.
// Each fall must play the hurt presentation, return the player to P2, keep HP, shield, items and
// the damage counters, and show the hints only on the 2nd and 4th falls (in every RPG mode that
// shows them). The tree must still fall and carry the player across afterwards.
const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const { test } = require('node:test');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { serveCheckout } = require('./chapter3-static-fixture.cjs');

const origin = 'http://127.0.0.1:8412';
const evidence = process.env.REV5_EVIDENCE;
const HINT_2 = '咦！這個峽谷似乎太遠了，好像跳不過去。那我可以怎麼辦呢？';
const HINT_4 = '咦！這邊有棵樹。還是說我可以把樹槌倒當作橋梁呢？';

async function boot(page) {
  await page.route(/^https?:\/\/[^/]+\//, route => serveCheckout(route, origin));
  await page.addInitScript(() => {
    window.__rev5 = { scenes: [], hurtSfx: 0 };
    setInterval(() => {
      try {
        const id = rpgActive?.id;
        if (id && window.__rev5.scenes[window.__rev5.scenes.length - 1]?.id !== id) {
          window.__rev5.scenes.push({ id, text: rpgActive.pages?.map(p => p.text).join(' / ') });
        }
      } catch (e) {}
    }, 20);
  });
  await page.goto(origin + '/rpg-dual-continent-test/?guest=1&sandbox=1&devtools=1&ch3test=start');
  await page.waitForFunction(() => assetBootReady, undefined, { timeout: 90000 });
  await page.locator('#btn-start-gate-go').click();
  await page.waitForFunction(() => !assetGateActive && !gameStartGateActive && gameState === 'playing' && debugC34().ready,
    undefined, { timeout: 90000 });
  await page.evaluate(() => {
    if (rpgActive) rpgClose('skipped');
    const o = sfxOnPlayerHurt;
    globalThis.sfxOnPlayerHurt = function () { window.__rev5.hurtSfx++; return o.apply(this, arguments); };
    // Keep the chasm test about the chasm: no scorpions walking into the player.
    enemies.length = 0; wsBlades.length = 0;
  });
}

async function standOnP2(page) {
  await page.evaluate(() => {
    if (rpgActive) rpgClose('skipped');
    const L = C34_LAY;
    player.x = L.p2.x + 40; player.y = L.y(L.p2.h) - player.h; player.vx = 0; player.vy = 0; player.onGround = true;
    player.invincible = 0;
    cameraX = Math.max(0, player.x - 380);
  });
  await page.waitForTimeout(400);
}

async function fallOnce(page, n) {
  const before = await page.evaluate(() => ({
    hp: player.hp, shield: v395Shield(),
    hurts: c34.treeGapHurts || 0, failures: c34.treeFailures, scenes: window.__rev5.scenes.length,
    hurtSfx: window.__rev5.hurtSfx, hits: JSON.stringify([currentRunStats.damageTaken, (typeof advLoad === 'function' ? (advLoad().progress || {}).damage : null)]),
    inv: JSON.stringify(playerInventory.craftedItems),
  }));
  // A real attempt: run right and jump at the edge of P2.
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => player.x + player.w > C34_LAY.p2.x + C34_LAY.p2.w - 6, undefined, { timeout: 8000 });
  await page.keyboard.down('Space'); await page.waitForTimeout(250); await page.keyboard.up('Space');
  await page.waitForFunction(h => (c34.treeGapHurts || 0) > h, before.hurts, { timeout: 8000 });
  await page.keyboard.up('ArrowRight');
  const at = await page.evaluate(() => ({
    hp: player.hp, shield: v395Shield(), x: Math.round(player.x),
    feet: Math.round(player.y + player.h), p2Top: C34_LAY.y(C34_LAY.p2.h), invincible: player.invincible,
    pose: typeof computeHeroArtKey === 'function' ? computeHeroArtKey() : null,
    failures: c34.treeFailures, hurtSfx: window.__rev5.hurtSfx,
    hits: JSON.stringify([currentRunStats.damageTaken, (typeof advLoad === 'function' ? (advLoad().progress || {}).damage : null)]),
    inv: JSON.stringify(playerInventory.craftedItems), gameState,
  }));
  await page.waitForTimeout(700);
  const scenes = await page.evaluate(() => window.__rev5.scenes.slice());
  const fresh = scenes.slice(before.scenes);
  if (evidence && (n === 2 || n === 4)) {
    await mkdir(evidence, { recursive: true });
    await page.waitForFunction(() => /^c34_tree_gap_/.test(rpgActive?.id || ''), undefined, { timeout: 2500 }).catch(() => {});
    await page.waitForTimeout(400);
    await page.screenshot({ path: evidence + '/C03-tree-gap-fall-' + n + '.png' });
  }
  while (await page.evaluate(() => !!rpgActive)) { await page.keyboard.press('Enter'); await page.waitForTimeout(150); }
  return { n, before, at, fresh };
}

for (const mode of ['full', 'first', 'off']) {
  test('3-4 tree chasm falls 1 to 6 in RPG mode ' + mode, { timeout: 240000 }, async () => {
    const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
    try {
      const page = await (await browser.newContext({ viewport: { width: 1280, height: 820 } })).newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await boot(page);
      await page.evaluate(m => rpgSetMode(m), mode);
      const rows = [];
      for (let n = 1; n <= 6; n++) {
        await standOnP2(page);
        rows.push(await fallOnce(page, n));
      }
      for (const r of rows) {
        // A hint dialogue pauses the game; anything else (failed, game over) is a regression.
        assert.ok(['playing', 'paused'].includes(r.at.gameState), 'fall ' + r.n + ' keeps the run going: ' + r.at.gameState);
        assert.equal(r.at.hp, r.before.hp, 'fall ' + r.n + ' keeps HP');
        assert.equal(r.at.shield, r.before.shield, 'fall ' + r.n + ' keeps the shield');
        assert.equal(r.at.hits, r.before.hits, 'fall ' + r.n + ' keeps the damage count');
        assert.equal(r.at.inv, r.before.inv, 'fall ' + r.n + ' keeps items');
        assert.equal(r.at.feet, r.at.p2Top, 'fall ' + r.n + ' returns to the top of P2');
        assert.ok(r.at.invincible > 0, 'fall ' + r.n + ' plays the hurt blink');
        assert.equal(r.at.hurtSfx, r.before.hurtSfx + 1, 'fall ' + r.n + ' plays the hurt sound once');
        assert.equal(r.at.failures, r.n, 'one count per fall');
        const hints = r.fresh.filter(s => /^c34_tree_gap_/.test(s.id));
        const expected = mode === 'off' ? [] : r.n === 2 ? [HINT_2] : r.n === 4 ? [HINT_4] : [];
        assert.deepEqual(hints.map(s => s.text), expected, 'fall ' + r.n + ' hints');
      }
      // The big flight canyon (A1) keeps its own counter.
      const wdSeparate = await page.evaluate(() => ({ tree: c34.treeFailures, wd: c34.noUmbrellaFalls || 0 }));
      assert.equal(wdSeparate.tree, 6);
      assert.equal(wdSeparate.wd, 0);
      // Afterwards the tree still falls with the hammer and the player walks over it.
      await standOnP2(page);
      await page.keyboard.press('Digit2');
      await page.keyboard.down('ArrowRight');
      await page.waitForFunction(() => player.x >= C34_LAY.tree.x - 28, undefined, { timeout: 8000 });
      await page.keyboard.up('ArrowRight');
      for (let i = 0; i < 80 && await page.evaluate(() => breakableTrees[0]?.state === 'standing'); i++) {
        await page.keyboard.press('z'); await page.waitForTimeout(150);
      }
      await page.waitForFunction(() => breakableTrees[0]?.state === 'fallen', undefined, { timeout: 15000 });
      while (await page.evaluate(() => !!rpgActive)) { await page.keyboard.press('Enter'); await page.waitForTimeout(150); }
      await page.keyboard.down('ArrowRight');
      // Over the fallen trunk onto the P3 ledge, then one jump up to the canyon top.
      await page.waitForFunction(() => player.x > C34_LAY.p3.x && player.onGround && Math.abs(player.y + player.h - C34_LAY.y(C34_LAY.p3.h)) < 2,
        undefined, { timeout: 20000 });
      await page.keyboard.down('Space'); await page.waitForTimeout(300); await page.keyboard.up('Space');
      await page.waitForFunction(() => player.x > C34_LAY.ct.x + 20 && player.onGround, undefined, { timeout: 20000 });
      await page.keyboard.up('ArrowRight');
      const end = await page.evaluate(() => ({ hp: player.hp, failures: c34.treeFailures, x: Math.round(player.x), onCanyonTop: Math.abs(player.y + player.h - C34_LAY.y(C34_LAY.ct.h)) < 2 }));
      if (evidence) await writeFile(evidence + '/C04-tree-gap-' + mode + '.json', JSON.stringify({ mode, rows, end, errors }, null, 2));
      assert.equal(end.failures, 6);
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  });
}

'use strict';
// Adventure Notes System Test 1 — official Continent 1 entry (rpg-continent1-universe/), guest sandbox only.
//   ・the same shared module (../assets/adventure/adventure-notes.js) runs with continents = [1]
//   ・2-3: the existing 橘子王觀察筆記 pickup (dog, find dialogue, centre showcase, pending until clear) is unchanged;
//     on clear it lands in keyItems as before and is copied into the permanent notes collection
//   ・小V之家「冒險筆記」: boss note readable; knowledge category empty; the 3-4 note is never shown or drawn
//   ・storage: only the Continent 1 sandbox guest namespace (__c1u__sbx__guest)
const assert = require('node:assert/strict');
const test = require('node:test');
const { mkdir } = require('node:fs/promises');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { createPreview } = require('./preview-entry.cjs');
const evidence = process.env.NOTES_EVIDENCE;

test('Continent 1 adventure notes', { timeout: 300000 }, async t => {
  const server = createPreview();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
  t.after(() => browser.close());
  for (const touch of [false, true]) {
    await t.test(touch ? 'landscape touch' : 'desktop keyboard', async () => {
      const context = await browser.newContext({ viewport: { width: touch ? 844 : 1280, height: touch ? 390 : 720 }, isMobile: touch, hasTouch: touch });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
      await page.goto(origin + '/rpg-continent1-universe/?guest=1&sandbox=1&nocomic=1', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => assetBootReady && window.AdvNotes, undefined, { timeout: 90000 });
      const info = await page.evaluate(() => ({
        cont: AdvNotes.CONTINENTS, all: AdvNotes.list().map(n => n.id), key: AdvNotes.storeKey(),
        wrappedPickup: !!checkHiddenTreasure.__advnWrapped, script: [...document.scripts].filter(s => /adventure-notes\.js/.test(s.src)).map(s => new URL(s.src).pathname),
      }));
      assert.deepEqual(info.cont, [1]);
      assert.deepEqual(info.all, ['orangeKingWeaknessNote01'], 'Continent 1 never lists the 3-4 note');
      assert.equal(info.wrappedPickup, false, 'no world pickups on Continent 1');
      assert.deepEqual(info.script, ['/assets/adventure/adventure-notes.js'], 'the shared module from assets/adventure');
      // 2-3 with the dog, walk to the note (real input)
      await page.evaluate(() => {
        rpgLoad().worldIntro = 'done'; rpgSetMode('first');
        if (rpgActive) rpgClose('reset');
        closeHomeScreen();
        if (gameStartGateActive) startAdventureFromGate();
        currentLevelIndex = LEVELS.findIndex(level => level.stageId === '2-3');
        loadLevel(currentLevelIndex);
        restart({ keepHp: false });
        bringBalloonDog = true; gameState = 'playing';
        player.x = 5050; player.y = GROUND_Y - player.h; player.vx = 0; player.vy = 0; cameraX = 4700;
        enemies.length = 0; projectileOrangeShots.length = 0;
        window.__seen = [];
        window.__g = setInterval(() => { if (!rpgActive) return; window.__seen.push(rpgActive.id); if (!/king_note/.test(rpgActive.id)) rpgClose('skipped'); }, 30);
      });
      assert.equal(await page.evaluate(() => AdvNotes.has('orangeKingWeaknessNote01')), false);
      if (touch) {
        const cdp = await context.newCDPSession(page);
        const b = await page.locator('#btn-right').boundingBox();
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 0, x: b.x + b.width / 2, y: b.y + b.height / 2 }] });
        await page.waitForFunction(() => currentRunStats.foundBossNote, undefined, { timeout: 20000 });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await page.keyboard.down('ArrowRight');
        await page.waitForFunction(() => currentRunStats.foundBossNote, undefined, { timeout: 20000 });
        await page.keyboard.up('ArrowRight');
      }
      // existing flow: find dialogue → centre showcase; still pending (not yet in keyItems, not yet in the collection)
      await page.waitForFunction(() => rpgActive && rpgActive.id === 'rpg016_king_note_show' || (rpgActive && rpgActive.id === 'rpg019_king_note_find'), undefined, { timeout: 8000 });
      const pending = await page.evaluate(() => ({ key: !!(playerInventory.keyItems || {}).orangeKingWeaknessNote01, pend: !!currentRunStats.pendingKeyItems.orangeKingWeaknessNote01, note: AdvNotes.has('orangeKingWeaknessNote01') }));
      assert.deepEqual(pending, { key: false, pend: true, note: false });
      await page.evaluate(() => { clearInterval(window.__g); let n = 0; while (rpgActive && n++ < 10) rpgClose('finished'); });
      // clear → keyItems (existing rule) → permanent collection
      await page.evaluate(() => { if (rpgActive) rpgClose('qa'); triggerClear(); });
      await page.waitForFunction(() => AdvNotes.has('orangeKingWeaknessNote01'), undefined, { timeout: 5000 });
      assert.equal(await page.evaluate(() => !!playerInventory.keyItems.orangeKingWeaknessNote01), true);
      assert.equal(await page.evaluate(() => AdvNotes.record('orangeKingWeaknessNote01').src), 'keyItems');
      // home → 冒險筆記
      await page.evaluate(() => { if (rpgActive) rpgClose('qa'); openHomeScreen('clear'); h2HideSummary(); });
      const click = l => touch ? l.tap() : l.click();
      await page.waitForSelector('#h2-notes-btn');
      assert.equal(await page.locator('#h2-notes-btn').count(), 1);
      await click(page.locator('#h2-notes-btn'));
      await page.waitForFunction(() => H2.panel && H2.panel.kind === 'notes');
      let body = await page.locator('#h2-panel-body').innerText();
      assert.match(body, /橘子王觀察筆記/);
      if (evidence) { await mkdir(evidence, { recursive: true }); await page.screenshot({ path: evidence + '/c1-' + (touch ? 'touch' : 'desktop') + '-home-boss.png' }); }
      await click(page.locator('[data-advn-tab="knowledge"]'));
      body = await page.locator('#h2-panel-body').innerText();
      assert.match(body, /還沒有冒險知識筆記/);
      assert.doesNotMatch(body, /風之峽谷|？？？|3-4/, 'no hint of Continent 2 notes');
      await click(page.locator('[data-advn-tab="boss"]'));
      await click(page.locator('[data-advn-read="orangeKingWeaknessNote01"]'));
      await page.waitForFunction(() => rpgActive && rpgActive.ui && rpgActive.showcase === 'orange_king_weakness_note');
      const img = await page.evaluate(() => { const i = document.querySelector('.rpg-showcase-img'); const r = i.getBoundingClientRect(); return { nw: i.naturalWidth, nh: i.naturalHeight, w: r.width, h: r.height, fit: getComputedStyle(i).objectFit }; });
      assert.ok(img.nw > 0 && img.w > 0);
      assert.ok(Math.abs(img.w / img.h - img.nw / img.nh) < 0.02, 'aspect ratio kept (no stretch)');
      await page.waitForTimeout(700);
      if (evidence) await page.screenshot({ path: evidence + '/c1-' + (touch ? 'touch' : 'desktop') + '-reader.png' });
      await click(page.locator('.rpg-showcase-done'));
      await page.waitForFunction(() => !rpgActive && H2.panel && H2.panel.kind === 'notes');
      // the pause-bag / home-bag reading still uses the existing path
      assert.equal(await page.evaluate(() => typeof openKeyItemReadModal), 'function');
      const keys = await page.evaluate(() => { const r = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.includes('notesV1')) r.push(k); } return r; });
      assert.deepEqual(keys, ['balloonVAdventureHome__notesV1__' + await page.evaluate(() => getPlayerScopedStorageKey('x').slice(3)) + '__c1u__sbx__guest']);
      assert.deepEqual(errors, []);
      await context.close();
    });
  }
});

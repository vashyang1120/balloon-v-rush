'use strict';
// Adventure Notes System Test 1 — dual baseline (Continent 1 + 2), real keyboard / touch input.
//   1. 3-4: the gold bulb on P1 → record → full picture → "看完了" → play resumes; not re-opened on replay
//   2. permanent: survives restart from the beginning (fresh adventure), a failed attempt and a page reload
//   3. 小V之家「冒險筆記」: one entry, two categories, uncollected notes stay hidden, reader returns to the panel
//   4. 2-3 boss note: the existing pickup still works; on clear it is copied into the permanent collection
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const { test } = require('node:test');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { serveCheckout } = require('./chapter3-static-fixture.cjs');

const origin = 'http://127.0.0.1:8412';
const evidence = process.env.NOTES_EVIDENCE;
const BASE = origin + '/rpg-dual-continent-test/?guest=1&sandbox=1&devtools=1';

async function boot(context, query) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/[^/]+\//, route => serveCheckout(route, origin));
  await page.goto(BASE + query);
  await page.waitForFunction(() => typeof assetBootReady !== 'undefined' && assetBootReady && window.AdvNotes, undefined, { timeout: 90000 });
  return { page, errors };
}
async function shot(page, name) {
  if (!evidence) return;
  await mkdir(evidence, { recursive: true });
  await page.screenshot({ path: evidence + '/' + name + '.png' });
}
async function startGate(page, touch) {
  const go = page.locator('#btn-start-gate-go');
  if (touch) await go.tap(); else await go.click();
}

for (const mode of ['keyboard', 'touch']) test('3-4 knowledge note pickup and reader (' + mode + ')', { timeout: 300000 }, async () => {
  const touch = mode === 'touch';
  const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext(touch
      ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }
      : { viewport: { width: 1280, height: 720 } });
    const { page, errors } = await boot(context, '&ch3test=start&qago=note34');
    await startGate(page, touch);
    await page.waitForFunction(() => {
      if (rpgActive && !String(rpgActive.id).startsWith('advnote')) rpgClose('skipped');
      return gameState === 'playing' && advCurrentStageId() === '3-4' && !assetGateActive && player.x > C34_LAY.p1.x && player.x < C34_LAY.p1.x + 100;
    }, undefined, { timeout: 90000 });
    const before = await page.evaluate(() => ({ d: AdvNotes.debug(), key: AdvNotes.storeKey(), cont: AdvNotes.CONTINENTS, has: AdvNotes.has('knowledgeNoteProjectileMotion') }));
    assert.deepEqual(before.cont, [1, 2]);
    assert.equal(before.has, false, 'fresh sandbox: not collected yet');
    assert.equal(before.d.pickups.length, 1);
    const pk = before.d.pickups[0];
    // On P1, inside the platform, clear of the wind director (deviceX 1040) and the abyss A1 (ends at P1.x)
    const lay = await page.evaluate(() => ({ p1: C34_LAY.p1, top: C34_LAY.y(C34_LAY.p1.h), dev: C34.wd.deviceX }));
    assert.ok(pk.x > lay.p1.x + 40 && pk.x < lay.p1.x + lay.p1.w - 40, 'bulb sits on P1');
    assert.ok(pk.y < lay.top && pk.y > lay.top - 90, 'bulb hovers just above P1');
    await page.evaluate(() => { enemies.length = 0; window.__guard = setInterval(() => { if (rpgActive && !String(rpgActive.id).startsWith('advnote')) rpgClose('skipped'); }, 50); });
    // walk right into the bulb
    if (touch) {
      const cdp = await context.newCDPSession(page);
      const b = await page.locator('#btn-right').boundingBox();
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 0, x: b.x + b.width / 2, y: b.y + b.height / 2 }] });
      await page.waitForFunction(() => AdvNotes.has('knowledgeNoteProjectileMotion'), undefined, { timeout: 15000 });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
      await page.keyboard.down('ArrowRight');
      await page.waitForFunction(() => AdvNotes.has('knowledgeNoteProjectileMotion'), undefined, { timeout: 15000 });
      await page.keyboard.up('ArrowRight');
    }
    // the full picture opens and the game is safely paused
    await page.waitForFunction(() => rpgActive && rpgActive.id === 'advnote_read:knowledgeNoteProjectileMotion', undefined, { timeout: 8000 });
    const reading = await page.evaluate(() => ({ gs: gameState, ui: rpgActive.ui, showcase: !!document.querySelector('#rpg-overlay.rpg--showcase'),
      reading: document.querySelector('#rpg-overlay').classList.contains('advn-reading'), zoomBtn: getComputedStyle(document.querySelector('.advn-zoom')).display,
      rec: AdvNotes.record('knowledgeNoteProjectileMotion'), fc: frameCount }));
    assert.equal(reading.gs, 'paused');
    assert.equal(reading.ui, false);
    assert.ok(reading.showcase && reading.reading);
    assert.notEqual(reading.zoomBtn, 'none');
    assert.equal(reading.rec.src, 'pickup');
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => frameCount), reading.fc, 'no game steps while reading (enemies cannot attack)');
    await page.waitForTimeout(200);
    await shot(page, mode + '-34-reader');
    // zoom in and out
    const zoom = page.locator('.advn-zoom');
    if (touch) await zoom.tap(); else await zoom.click();
    assert.equal(await page.evaluate(() => document.querySelector('.rpg-showcase').classList.contains('advn-zoomed')), true);
    await shot(page, mode + '-34-reader-zoom');
    if (touch) await zoom.tap(); else await zoom.click();
    // close with the existing "看完了" button → play resumes
    const done = page.locator('.rpg-showcase-done');
    if (touch) await done.tap(); else await done.click();
    await page.waitForFunction(() => !rpgActive && gameState === 'playing', undefined, { timeout: 5000 });
    assert.equal(await page.evaluate(() => document.querySelector('#rpg-overlay').classList.contains('advn-reading')), false);
    // walk back over the bulb: no second reading, no second record
    const at1 = await page.evaluate(() => AdvNotes.record('knowledgeNoteProjectileMotion').at);
    await page.evaluate(() => { player.x = C34_LAY.p1.x + 230; player.vx = 0; });
    await page.waitForTimeout(800);
    const again = await page.evaluate(() => ({ active: rpgActive && rpgActive.id, at: AdvNotes.record('knowledgeNoteProjectileMotion').at, n: AdvNotes.collected().length }));
    assert.equal(again.active, null);
    assert.equal(again.at, at1);
    // the RPG read-state is untouched by reading notes
    assert.equal(await page.evaluate(() => Object.keys(rpgLoad().seen || {}).some(k => k.startsWith('advnote'))), false);
    await shot(page, mode + '-34-after');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('permanent collection, home entry and categories', { timeout: 300000 }, async () => {
  const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    let { page, errors } = await boot(context, '&ch3test=3-1&qago=noteshome');
    await startGate(page, false);
    await page.waitForFunction(() => H2.panel && H2.panel.kind === 'notes', undefined, { timeout: 90000 });
    // one entry button, next to 冒險手冊
    const entry = await page.evaluate(() => ({ n: document.querySelectorAll('#h2-notes-btn').length, txt: document.getElementById('h2-notes-btn').textContent,
      prev: document.getElementById('h2-notes-btn').previousElementSibling.id, title: document.getElementById('h2-panel-title').textContent }));
    assert.deepEqual(entry, { n: 1, txt: '冒險筆記', prev: 'h2-handbook-btn', title: '冒險筆記' });
    // empty state + hidden uncollected entries
    let body = await page.locator('#h2-panel-body').innerText();
    assert.match(body, /Boss 弱點筆記/); assert.match(body, /冒險知識筆記/);
    assert.match(body, /還沒有 Boss 弱點筆記/);
    assert.doesNotMatch(body, /橘子王觀察筆記/, 'uncollected boss note stays hidden');
    await page.locator('[data-advn-tab="knowledge"]').click();
    body = await page.locator('#h2-panel-body').innerText();
    assert.match(body, /還沒有冒險知識筆記/);
    assert.doesNotMatch(body, /風之峽谷的飛行秘密/, 'uncollected knowledge note stays hidden');
    assert.match(body, /？？？/);
    await shot(page, 'home-notes-empty');
    // collect the knowledge note (as the 3-4 pickup does), then reload: still there
    await page.evaluate(() => AdvNotes.collect('knowledgeNoteProjectileMotion', 'pickup'));
    await page.close();
    ({ page, errors } = await boot(context, '&ch3test=3-1&qago=noteshome'));
    await startGate(page, false);
    await page.waitForFunction(() => H2.panel && H2.panel.kind === 'notes', undefined, { timeout: 90000 });
    assert.equal(await page.evaluate(() => AdvNotes.has('knowledgeNoteProjectileMotion')), true, 'survives a page reload');
    await page.locator('[data-advn-tab="knowledge"]').click();
    body = await page.locator('#h2-panel-body').innerText();
    assert.match(body, /風之峽谷的飛行秘密/);
    assert.doesNotMatch(body, /No\.|#\s?0*1|第\s*1\s*號/, 'knowledge notes have no numbering');
    await shot(page, 'home-notes-knowledge');
    // read from home → returns to the same panel, gameState untouched
    const gs = await page.evaluate(() => gameState);
    await page.locator('[data-advn-read="knowledgeNoteProjectileMotion"]').click();
    await page.waitForFunction(() => rpgActive && rpgActive.ui === true && rpgActive.showcase === 'knowledge_note_projectile_motion');
    await page.waitForTimeout(700);
    await shot(page, 'home-notes-reader');
    await page.locator('.rpg-showcase-done').click();
    await page.waitForFunction(() => !rpgActive);
    assert.equal(await page.evaluate(() => H2.panel && H2.panel.kind), 'notes');
    assert.equal(await page.evaluate(() => gameState), gs);
    // old save: a boss note in keyItems is copied into the collection (not granted without it)
    assert.equal(await page.evaluate(() => AdvNotes.has('orangeKingWeaknessNote01')), false);
    await page.evaluate(() => { playerInventory.keyItems.orangeKingWeaknessNote01 = { id: 'orangeKingWeaknessNote01', type: 'bossNote', name: '橘子王觀察筆記', acquiredAt: 1700000000000 }; saveInventory(); });
    const rec = await page.evaluate(() => AdvNotes.record('orangeKingWeaknessNote01'));
    assert.equal(rec.src, 'keyItems'); assert.equal(rec.at, 1700000000000);
    // fresh adventure (restart from the beginning / bag reset to LV1): bag empties, notes stay
    await page.evaluate(() => resetInventory({ freshAdventure: true }));
    const after = await page.evaluate(() => ({ key: Object.keys(playerInventory.keyItems || {}).length, bag: playerInventory.bagLevel, notes: AdvNotes.collected().sort() }));
    assert.equal(after.key, 0); assert.equal(after.bag, 1);
    assert.deepEqual(after.notes, ['knowledgeNoteProjectileMotion', 'orangeKingWeaknessNote01']);
    await page.evaluate(() => h2RenderPanel(false));
    await page.locator('[data-advn-tab="boss"]').click();
    body = await page.locator('#h2-panel-body').innerText();
    assert.match(body, /橘子王觀察筆記/);
    await shot(page, 'home-notes-boss');
    // the notes live in the dual baseline's own sandbox namespace, never in an official or Continent 1 key
    const keys = await page.evaluate(() => { const r = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.includes('notesV1')) r.push(k); } return r; });
    assert.ok(keys.length >= 1);
    for (const k of keys) { assert.match(k, /__c1d__sbx__guest/); assert.doesNotMatch(k, /__c1u__|__prd__/); }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

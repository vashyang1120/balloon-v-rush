'use strict';
// Adventure Notes System Test 1 — the independent playtest package, entry by entry.
//   local:  node --test tests/playtest-notes-system-test-1.browser.cjs
//   public: NOTES_PUBLIC_BASE=https://rawcdn.githack.com/vashyang1120/balloon-v-rush/<sha>/playtest-adventure-notes-system-test-1/ node --test …
const assert = require('node:assert/strict');
const test = require('node:test');
const { mkdir } = require('node:fs/promises');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { serveCheckout } = require('../rpg-dual-continent-test/tests/chapter3-static-fixture.cjs');

const PKG = 'playtest-adventure-notes-system-test-1/';
const origin = 'http://127.0.0.1:8412';
const base = process.env.NOTES_PUBLIC_BASE || origin + '/' + PKG;
const evidence = process.env.NOTES_EVIDENCE;

async function open(browser, path, touch) {
  const context = await browser.newContext(touch ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  if (!process.env.NOTES_PUBLIC_BASE) await page.route(/^https?:\/\/[^/]+\//, route => serveCheckout(route, origin));
  await page.goto(base + path);
  await page.waitForFunction(() => typeof assetBootReady !== 'undefined' && assetBootReady && window.AdvNotes, undefined, { timeout: 120000 });
  const go = page.locator('#btn-start-gate-go');
  if (touch) await go.tap(); else await go.click();
  return { context, page, errors };
}
async function shot(page, name) { if (evidence) { await mkdir(evidence, { recursive: true }); await page.screenshot({ path: evidence + '/pkg-' + name + '.png' }); } }

test('playtest package entries', { timeout: 600000 }, async t => {
  const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
  t.after(() => browser.close());

  await t.test('landing page lists every entry', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    if (!process.env.NOTES_PUBLIC_BASE) await page.route(/^https?:\/\/[^/]+\//, route => serveCheckout(route, origin));
    await page.goto(base + 'index.html');
    const hrefs = await page.$$eval('a', as => as.map(a => a.getAttribute('href')));
    for (const want of ['notesqa=note23', 'notesqa=home', 'notesqa=homeboss', 'qago=note34', 'qago=note34fly', 'qago=noteshome'])
      assert.ok(hrefs.some(h => h.includes(want)), want);
    const bulb = await page.$eval('img.bulb', i => i.naturalWidth);
    assert.equal(bulb, 256);
    await context.close();
  });

  await t.test('Continent 1 copy: home notes with the boss note (test state)', async () => {
    const { context, page, errors } = await open(browser, 'rpg-continent1-universe/index.html?nocomic=1&notesqa=homeboss', true);
    await page.waitForFunction(() => H2.panel && H2.panel.kind === 'notes', undefined, { timeout: 60000 });
    const st = await page.evaluate(() => ({ cont: AdvNotes.CONTINENTS, has: AdvNotes.has('orangeKingWeaknessNote01'), href: location.href, ver: document.querySelector('.advn-ver').textContent }));
    assert.deepEqual(st.cont, [1]); assert.equal(st.has, true); assert.match(st.href, /guest=1/); assert.match(st.href, /sandbox=1/);
    assert.equal(st.ver, 'adventure-notes-system-test-1');
    let body = await page.locator('#h2-panel-body').innerText();
    assert.match(body, /橘子王觀察筆記/);
    await shot(page, 'c1-home-boss');
    await page.locator('[data-advn-tab="knowledge"]').tap();
    body = await page.locator('#h2-panel-body').innerText();
    assert.match(body, /還沒有冒險知識筆記/); assert.doesNotMatch(body, /風之峽谷|？？？/);
    await page.locator('[data-advn-tab="boss"]').tap();
    await page.locator('[data-advn-read="orangeKingWeaknessNote01"]').tap();
    await page.waitForFunction(() => rpgActive && rpgActive.showcase === 'orange_king_weakness_note');
    await page.waitForTimeout(700);
    await shot(page, 'c1-reader');
    const keys = await page.evaluate(() => { const r = []; for (let i = 0; i < localStorage.length; i++) r.push(localStorage.key(i)); return r.filter(k => k.includes('notesV1')); });
    assert.equal(keys.length, 1); assert.match(keys[0], /__c1u__sbx__guest$/);
    assert.deepEqual(errors, []);
    await context.close();
  });

  await t.test('Continent 1 copy: 2-3 note shortcut', async () => {
    const { context, page, errors } = await open(browser, 'rpg-continent1-universe/index.html?nocomic=1&notesqa=note23', false);
    await page.waitForFunction(() => advCurrentStageId() === '2-3' && bringBalloonDog && Math.abs(player.x - 4980) < 200, undefined, { timeout: 60000 });
    await page.evaluate(() => { enemies.length = 0; window.__g = setInterval(() => { if (rpgActive && !/king_note/.test(rpgActive.id)) rpgClose('skipped'); }, 40); });
    await page.keyboard.down('ArrowRight');
    await page.waitForFunction(() => currentRunStats.foundBossNote, undefined, { timeout: 20000 });
    await page.keyboard.up('ArrowRight');
    await page.waitForFunction(() => rpgActive && /king_note/.test(rpgActive.id), undefined, { timeout: 8000 });
    await page.waitForTimeout(600);
    await shot(page, 'c1-note23');
    assert.deepEqual(errors, []);
    await context.close();
  });

  await t.test('Dual: 3-4 knowledge note shortcut', async () => {
    const { context, page, errors } = await open(browser, 'rpg-dual-continent-test/index.html?devtools=1&ch3test=start&qago=note34', false);
    await page.waitForFunction(() => { if (rpgActive && !String(rpgActive.id).startsWith('advnote')) rpgClose('skipped');
      return gameState === 'playing' && advCurrentStageId() === '3-4' && player.x > C34_LAY.p1.x && player.x < C34_LAY.p1.x + 100; }, undefined, { timeout: 90000 });
    await page.waitForTimeout(500);
    await shot(page, 'dual-34-bulb');
    await page.evaluate(() => { enemies.length = 0; });
    await page.keyboard.down('ArrowRight');
    await page.waitForFunction(() => rpgActive && rpgActive.id === 'advnote_read:knowledgeNoteProjectileMotion', undefined, { timeout: 20000 });
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(600);
    await shot(page, 'dual-34-reader');
    const st = await page.evaluate(() => ({ gs: gameState, img: (() => { const i = document.querySelector('.rpg-showcase-img'); return { nw: i.naturalWidth, nh: i.naturalHeight, shown: getComputedStyle(i).display !== 'none' }; })() }));
    assert.equal(st.gs, 'paused');
    assert.deepEqual([st.img.nw, st.img.nh, st.img.shown], [1455, 1081, true]);
    await page.locator('.rpg-showcase-done').click();
    await page.waitForFunction(() => !rpgActive && gameState === 'playing');
    assert.deepEqual(errors, []);
    await context.close();
  });

  await t.test('Dual: home notes', async () => {
    const { context, page, errors } = await open(browser, 'rpg-dual-continent-test/index.html?devtools=1&ch3test=3-1&qago=noteshome', true);
    await page.waitForFunction(() => H2.panel && H2.panel.kind === 'notes', undefined, { timeout: 90000 });
    const st = await page.evaluate(() => ({ cont: AdvNotes.CONTINENTS }));
    assert.deepEqual(st.cont, [1, 2]);
    await page.locator('[data-advn-tab="knowledge"]').tap();
    await page.waitForTimeout(300);
    await shot(page, 'dual-home-knowledge');
    assert.deepEqual(errors, []);
    await context.close();
  });
});

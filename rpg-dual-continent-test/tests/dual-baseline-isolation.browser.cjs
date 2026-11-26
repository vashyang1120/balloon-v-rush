'use strict';
// Baseline Release 1: the repo-root development build (rpg-dual-continent-test/) shares the GitHub Pages
// origin with the Continent 1 release. It must never read-modify or write Continent 1 saves, and the QA
// tool must only appear in guest + sandbox + devtools sessions.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { serveCheckout } = require('./chapter3-static-fixture.cjs');

const origin = 'https://vashyang1120.github.io';
const pagesPath = '/balloon-v-rush';
const entry = origin + pagesPath + '/rpg-dual-continent-test/index.html';
const formal = {
  balloonV_inventory: JSON.stringify({ coins: 777, balloon260: 9, roundBalloon: 4, marker: 'formal-legacy' }),
  'balloonV_inventory__c1u__prd__p_aaaaaaaaaaaaaaaaaaaa': JSON.stringify({ coins: 555, marker: 'continent1-player' }),
  'balloonV_inventory__c1u__prd__guest': JSON.stringify({ coins: 333, marker: 'continent1-guest' }),
  'bvUniverse_v2_currentPlayerId': 'p_aaaaaaaaaaaaaaaaaaaa',
};

for (const [name, query, qaExpected] of [
  ['player entry without tools', '', false],
  ['guest sandbox', '?guest=1&sandbox=1', false],
  ['guest sandbox devtools 3-4', '?guest=1&sandbox=1&devtools=1&ch3test=start', true],
]) test('dual baseline isolation: ' + name, { timeout: 180000 }, async () => {
  const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 820 } });
    await context.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(origin + pagesPath + '/')) return serveCheckout(route, origin, pagesPath);
      return route.abort();   // no network: universe SDK, Firebase and fonts are not needed for this check
    });
    await context.addInitScript(f => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      for (const [k, v] of Object.entries(f)) localStorage.setItem(k, v);
    }, formal);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(entry + query);
    await page.waitForFunction(() => typeof assetBootReady !== 'undefined' && assetBootReady, undefined, { timeout: 90000 });
    await page.locator('#btn-start-gate-go').click();
    await page.waitForTimeout(6000);
    // Play a little and save, then read the raw storage behind the game's key mapping.
    await page.evaluate(() => { try { if (rpgActive) rpgClose('skipped'); } catch (e) {} try { saveInventory(); } catch (e) {} });
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => {
      const get = k => (typeof ADV_DEVTEST !== 'undefined' && ADV_DEVTEST.rawGet ? ADV_DEVTEST.rawGet : Storage.prototype.getItem).call(localStorage, k);
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
      return { keys, values: Object.fromEntries(keys.map(k => [k, get(k)])), qa: !!document.getElementById('qa-tool-btn'), ws: ADV_WS_SUFFIX };
    });
    for (const [k, v] of Object.entries(formal)) assert.equal(after.values[k], v, 'formal key untouched: ' + k);
    const written = after.keys.filter(k => /^balloonV/.test(k) && !(k in formal));
    assert.ok(written.every(k => k.includes('__c1d__') || k.startsWith('balloonV_devFreshTest_v1') || k === 'balloonV_devTools'),
      'every save of this build is in its own __c1d__ namespace: ' + written.filter(k => !k.includes('__c1d__')).join(', '));
    assert.ok(!written.some(k => k.includes('__c1u__')), 'never writes Continent 1 (__c1u__) saves');
    assert.equal(after.qa, qaExpected, 'QA tool visibility');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

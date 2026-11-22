'use strict';
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const { resolve } = require('node:path');
const { test } = require('node:test');
const { setTimeout: delay } = require('node:timers/promises');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { serveCheckout } = require('./chapter3-static-fixture.cjs');

const root = resolve(__dirname, '../..');
const prefix = '/balloon-v-rush/playtest-adventure-v0.4.13-test-4/';
const origin = 'https://vashyang1120.github.io';
const tree = 'rpg-dual-continent-test/';
const test2Namespace = 'balloon-v-rush:adventure-playtest:v0.4.13:';
const namespace = 'balloon-v-rush:adventure-playtest:v0.4.13-test-4:';
const shortcutResources = {
  '3-1': [303, 44, 13], '3-2': [379, 53, 15], '3-3': [406, 62, 20], '3-4': [497, 68, 22],
};

async function waitUntil(page, predicate, value, timeout = 30000) {
  const deadline = Date.now() + timeout;
  do {
    if (await page.evaluate(predicate, value)) return;
    await delay(50);
  } while (Date.now() < deadline);
  throw new Error('Timed out waiting for the playtest: ' + predicate);
}

async function fixture(context, guard, requests) {
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    requests.push({ origin: url.origin, pathname: url.pathname, method: request.method() });
    if (url.origin !== origin || !['GET', 'HEAD'].includes(request.method())) return route.abort();
    if (url.pathname === '/formal-fixture') return route.fulfill({ contentType: 'text/html', body: '<title>Formal fixture</title>' });
    if (!url.pathname.startsWith(prefix)) return route.abort();
    if (url.pathname === prefix + 'playtest-guard.js') {
      return route.fulfill({ contentType: 'application/javascript; charset=utf-8', body: guard });
    }
    return serveCheckout(route, origin, '/balloon-v-rush');
  });
}

test('Chapter 3 Integration Test 4 Pages directory blocks writes and preserves formal saves', { timeout: 180000 }, async t => {
  const guard = await readFile(process.env.ADVENTURE_PLAYTEST_GUARD ||
    resolve(root, 'playtest-adventure-v0.4.13-test-4/playtest-guard.js'), 'utf8');
  const test3Guard = guard.replace(test2Namespace, namespace);
  const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
  t.after(() => browser.close());
  const formalKeys = ['balloonV_inventory', 'adventure:title', 'adventure:achievement',
    'adventure:vcoins', 'adventure:settings', 'adventure:progress', test2Namespace + 'probe'];

  const desktop = { width: 1280, height: 820 };
  for (const [section, viewport] of [['', desktop], ['start', desktop],
    ['pool', { width: 844, height: 390 }], ['3-1', desktop], ['3-2', desktop], ['3-3', desktop], ['3-4', desktop]]) {
    await t.test(section || 'general', async () => {
      const mobile = section === 'pool';
      const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
      try {
        const requests = [];
        await fixture(context, test3Guard, requests);
        const page = await context.newPage();
        await page.goto(origin + '/formal-fixture');
        await page.evaluate(keys => {
          for (const key of keys) { localStorage.setItem(key, 'formal'); sessionStorage.setItem(key, 'formal'); }
        }, formalKeys);
        requests.length = 0;
        const entry = origin + prefix + tree + (section ? '?ch3test=' + section : '');
        await page.goto(entry);
        await waitUntil(page, () => window.adventurePlaytestReady && assetBootReady);
        const identity = await page.evaluate(() => ({
          query: Object.fromEntries(new URLSearchParams(location.search)),
          version: GAME_VERSION,
        }));
        assert.equal(identity.version, 'adventure-v0.4.13-ch3-water-terrain-integration-test-4');
        assert.deepEqual([identity.query.guest, identity.query.sandbox, identity.query.devtools], ['1', '1', '1']);
        await page.locator('#btn-start-gate-go').click();
        let bagKey;
        if (section === 'start' || section === 'pool') {
          await waitUntil(page, s => !assetGateActive && gameState === 'playing' &&
            c34Is() && c34.section === s && c34ArtReady(), section);
          const persisted = await page.evaluate(() => {
            playerInventory.coins += 10;
            const ok = saveInventory();
            return ok && !!localStorage.getItem(c34BagKey('3-4', 'cumulative'));
          });
          assert.equal(persisted, true);
          bagKey = await page.evaluate(() => ADV_DEVTEST.map(c34BagKey('3-4', 'cumulative')));
        } else if (section) {
          await waitUntil(page, s => !assetGateActive && h2IsOpen() &&
            c34.devBagStage === s && playerInventory.unlockedRecipes.balloonDice === true, section);
          assert.deepEqual(await page.evaluate(() =>
            [playerInventory.coins, playerInventory.balloon260, playerInventory.roundBalloon]),
          shortcutResources[section]);
        } else {
          await waitUntil(page, () => !gameStartGateActive);
        }
        if (mobile) {
          const held = await page.locator('#btn-left').boundingBox();
          assert.ok(held && held.x >= 0 && held.x + held.width <= viewport.width);
          const playerX = await page.evaluate(() => player.x);
          const cdp = await context.newCDPSession(page);
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart',
            touchPoints: [{ x: held.x + held.width / 2, y: held.y + held.height / 2 }] });
          try {
            await waitUntil(page, x => player.x < x - 5, playerX);
          } finally {
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            await cdp.detach();
          }
        }
        const guardResult = await page.evaluate(async () => {
          const denied = [];
          for (const method of ['POST', 'PUT']) {
            try { await fetch('/formal-fixture', { method }); denied.push(false); }
            catch { denied.push(true); }
          }
          try { new XMLHttpRequest().open('PATCH', '/formal-fixture'); denied.push(false); }
          catch { denied.push(true); }
          denied.push(!navigator.sendBeacon('/formal-fixture', 'write'));
          sessionStorage.setItem('probe', 'playtest');
          return denied;
        });
        assert.deepEqual(guardResult, [true, true, true, true]);
        // The home attempts a public default avatar; fixture() aborts every out-of-root request.
        const permittedObservation = req => req.origin === origin &&
          (req.pathname.startsWith(prefix) || req.pathname === '/balloon-v-universe/assets/avatars/base/boy1.png');
        assert.ok(requests.every(req => permittedObservation(req) &&
          ['GET', 'HEAD'].includes(req.method)), JSON.stringify(requests.filter(req => req.origin !== origin || !req.pathname.startsWith(prefix) || !['GET', 'HEAD'].includes(req.method))));
        await page.goto(origin + '/formal-fixture');
        const storage = await page.evaluate(({ keys, namespace, bagKey }) => ({
          preserved: keys.every(key => localStorage.getItem(key) === 'formal' &&
            sessionStorage.getItem(key) === 'formal'),
          bag: bagKey ? localStorage.getItem(namespace + bagKey) : null,
          session: sessionStorage.getItem(namespace + 'probe'),
        }), { keys: formalKeys, namespace, bagKey });
        assert.equal(storage.preserved, true);
        assert.equal(storage.session, 'playtest');
        if (bagKey) assert.ok(JSON.parse(storage.bag).coins > 0);
      } finally { await context.close(); }
    });
  }
});

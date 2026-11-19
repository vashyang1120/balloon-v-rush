'use strict';
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const { extname, resolve, sep } = require('node:path');
const { test } = require('node:test');
const { setTimeout: delay } = require('node:timers/promises');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const root = resolve(__dirname, '../..');
const prefix = '/balloon-v-rush/playtest-adventure-v0.4.13/';
const origin = 'https://vashyang1120.github.io';
const tree = 'rpg-dual-continent-test/';
const namespace = 'balloon-v-rush:adventure-playtest:v0.4.13:';
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.webm': 'video/webm',
};
const csp = "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data: blob:; media-src 'self' data: blob:; font-src 'self' data:; " +
  "connect-src 'self' data: blob:; frame-src 'self'; base-uri 'self'; form-action 'none'";

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
    if (url.pathname === '/formal-fixture') return route.fulfill({ contentType: mime['.html'], body: '<title>Formal fixture</title>' });
    if (!url.pathname.startsWith(prefix)) return route.abort();

    let rel = decodeURIComponent(url.pathname.slice(prefix.length));
    if (rel.endsWith('/')) rel += 'index.html';
    const file = resolve(root, rel);
    if (!file.startsWith(root + sep)) return route.abort();
    let body;
    try {
      body = rel === 'playtest-guard.js' ? guard : await readFile(file);
    } catch {
      return route.fulfill({ status: 404 });
    }
    if (rel === tree + 'index.html') {
      body = Buffer.from(body.toString('utf8')
        .replace('<head>', '<head><meta http-equiv="Content-Security-Policy" content="' + csp +
          '"><script src="' + prefix + 'playtest-guard.js"></script>')
        .replace(/<script[^>]+github\.io[^>]+><\/script>/g, ''));
    }
    const contentType = mime[extname(rel)] || 'application/octet-stream';
    const range = request.headers().range?.match(/^bytes=(\d+)-(\d*)$/);
    if (range) {
      const first = Number(range[1]);
      const last = range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
      if (first > last) return route.fulfill({ status: 416 });
      return route.fulfill({ status: 206, contentType, headers: {
        'content-range': 'bytes ' + first + '-' + last + '/' + body.length,
        'accept-ranges': 'bytes',
      }, body: body.subarray(first, last + 1) });
    }
    return route.fulfill({ status: 200, contentType, body: request.method() === 'HEAD' ? Buffer.alloc(0) : body });
  });
}

test('test-2 in the existing Pages directory can load without touching formal saves or network', { timeout: 180000 }, async t => {
  const guard = await readFile(process.env.ADVENTURE_PLAYTEST_GUARD ||
    resolve(root, 'playtest-adventure-v0.4.13/playtest-guard.js'));
  const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
  t.after(() => browser.close());
  const formalKeys = ['balloonV_inventory', 'adventure:title', 'adventure:achievement',
    'adventure:vcoins', 'adventure:settings', 'adventure:progress'];

  for (const [section, viewport] of [['', { width: 1280, height: 820 }],
    ['start', { width: 1280, height: 820 }], ['pool', { width: 844, height: 390 }]]) {
    await t.test(section || 'general', async () => {
      const mobile = section === 'pool';
      const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
      try {
        const requests = [];
        await fixture(context, guard, requests);
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
        assert.equal(identity.version, 'adventure-v0.4.13-ch3-water-terrain-integration-test-2');
        assert.deepEqual([identity.query.guest, identity.query.sandbox, identity.query.devtools], ['1', '1', '1']);
        await page.locator('#btn-start-gate-go').click();
        let bagKey;
        if (section) {
          await waitUntil(page, s => !assetGateActive && gameState === 'playing' &&
            c34Is() && c34.section === s && c34ArtReady(), section);
          const persisted = await page.evaluate(() => {
            playerInventory.coins += 10;
            const ok = saveInventory();
            return ok && !!localStorage.getItem(c34BagKey('cumulative'));
          });
          assert.equal(persisted, true);
          bagKey = await page.evaluate(() => ADV_DEVTEST.map(c34BagKey('cumulative')));
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
        assert.ok(requests.every(req => req.origin === origin && req.pathname.startsWith(prefix) &&
          ['GET', 'HEAD'].includes(req.method)));
        await page.goto(origin + '/formal-fixture');
        const storage = await page.evaluate(({ keys, namespace, bagKey }) => ({
          preserved: keys.every(key => localStorage.getItem(key) === 'formal' &&
            sessionStorage.getItem(key) === 'formal'),
          bag: bagKey ? localStorage.getItem(namespace + bagKey) : null,
          session: sessionStorage.getItem(namespace + 'probe'),
        }), { keys: formalKeys, namespace, bagKey });
        assert.equal(storage.preserved, true);
        assert.equal(storage.session, 'playtest');
        if (section) assert.ok(JSON.parse(storage.bag).coins > 0);
      } finally { await context.close(); }
    });
  }
});

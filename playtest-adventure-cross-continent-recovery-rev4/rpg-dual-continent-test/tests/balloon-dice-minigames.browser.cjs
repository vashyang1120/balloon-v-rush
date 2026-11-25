'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { setTimeout: settle } = require('node:timers/promises');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { serveCheckout, openHostedAdventure } = require('./chapter3-static-fixture.cjs');

test('Test 3 guest home starts and returns from both minigames', { timeout: 145000 }, async t => {
  const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  const origin = 'https://vashyang1120.github.io';
  const publicUrl = process.env.PLAYTEST_PUBLIC_URL;
  if (!publicUrl) await context.route('**/*', route => serveCheckout(route, origin, '/balloon-v-rush'));
  const page = await context.newPage();
  async function waitFor(check, timeout) {
    const until = Date.now() + timeout;
    do {
      if (await page.evaluate(check)) return true;
      await settle(50);
    } while (Date.now() < until);
    return false;
  }
  const errors = [];
  const whAlerts = [];
  page.on('console', msg => { if (msg.text().includes('[Whack]')) whAlerts.push(msg.text()); });
  page.on('pageerror', error => errors.push(error.message));
  const base = publicUrl || origin + '/balloon-v-rush/playtest-balloon-dice-v2-test-3/';
  const entry = base + 'rpg-dual-continent-test/index.html?ch3test=3-1';
  if (publicUrl) await openHostedAdventure(page, entry);
  else await page.goto(entry);
  await page.locator('#btn-start-gate-go').click({ timeout: 30000 });
  await page.locator('#h2-nav-go').waitFor();
  // The isolated fixture has already finished the unlock/recipe flow.
  await page.evaluate(() => {
    playerInventory.unlockedRecipes.balloonVolleyball = true;
    playerInventory.craftedItems.balloonVolleyball = 1;
    vbData().matchesLeft = 1;
    h2RenderAll();
  });
  await page.locator('#h2-nav-volleyball').click();
  await page.locator('[data-vb-act="play"]').first().click();
  const vb = page.frameLocator('#vb-frame');
  await vb.locator('#btnEmbedStart').click({ timeout: 25000 });
  assert.equal(await waitFor(() => vbCurrent()?.state === 'active', 7000), true, 'volleyball session started');
  await vb.locator('#btnPause').click({ timeout: 10000 });
  await vb.locator('#btnPauseTitle').click();
  await page.locator('#vb-frame-wrap').waitFor({ state: 'hidden' });
  await page.locator('#h2-nav-go').waitFor();
  assert.equal(await page.evaluate(() => vbData().matchesLeft), 1);

  await page.locator('#h2-panel-close').click();
  await page.locator('#h2-nav-whack').click();
  await page.locator('[data-wh-act="play"]').click();
  await waitFor(() => whFrame.ready || !whFrame.iframe?.isConnected, 22000);
  assert.equal(await page.evaluate(() => whFrame.ready),
    true, (await page.locator('#asset-loading-overlay').innerText().catch(() => '')) + '\n' + whAlerts.join('\n'));

  const wh = page.frameLocator('#wam-frame');
  await wh.locator('.spirit-btn').click({ force: true, timeout: 7000 });
  await wh.locator('#btnPause').click({ timeout: 10000 });
  await wh.locator('#c1uPauseHome').click();
  await page.locator('#wam-frame').waitFor({ state: 'detached' });
  await page.locator('#h2-nav-go').waitFor();
  assert.deepEqual(errors, []);
});

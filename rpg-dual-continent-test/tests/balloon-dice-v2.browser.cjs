'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mkdir } = require('node:fs/promises');
const { join } = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { serveCheckout } = require('./chapter3-static-fixture.cjs');

const origin = 'https://vashyang1120.github.io';
const entry = origin + '/balloon-v-rush/playtest-balloon-dice-v2-test-1/rpg-dual-continent-test/index.html';
const shots = process.env.CH3_SCREENSHOTS;

test('isolated 1-1 start and official 1-3 / 2-2 art in the real renderer', { timeout: 150000 }, async t => {
  const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  await context.route('**/*', route => serveCheckout(route, origin, '/balloon-v-rush'));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  async function open(stage = '') {
    await page.goto(entry + (stage ? '?ch3test=' + stage : ''));
    await page.locator('#btn-start-gate-go').click({ timeout: 35000 });
  }
  async function waitFor(predicate, timeout = 30000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (await page.evaluate(predicate)) return;
      await delay(80);
    }
    assert.fail('Timed out: ' + predicate);
  }
  async function image(name) {
    if (!shots) return;
    await mkdir(shots, { recursive: true });
    await page.screenshot({ path: join(shots, name) });
  }

  await open();
  await waitFor(() => advCurrentStageId() === '1-1' && !assetGateActive && gameState === 'playing');
  assert.equal(await page.evaluate(() => !!playerInventory.unlockedRecipes.balloonDice), false);

  await open('1-3');
  await page.locator('#h2-nav-go').waitFor({ timeout: 30000 });
  await page.locator('#h2-title-recipes').click();
  await page.locator('.h2-more').filter({ hasText: '打開氣球秘笈' }).click();
  await page.locator('button[data-h2-act="craft"][data-key="basicHammer"]').click();
  await page.locator('#h2-panel-close').click();
  await page.locator('#h2-nav-go').click();
  await waitFor(() => advCurrentStageId() === '1-3' && !assetGateActive && gameState === 'playing');
  const bag = await page.evaluate(() => {
    const found = coins.find(c => c.v395Kind === 'coinBag');
    return [found.x, found.y];
  });
  assert.deepEqual(bag, [605,298]);
  await page.keyboard.down('ArrowRight');
  for (let i = 0; i < 55; i++) {
    const state = await page.evaluate(() => ({ x: player.x, dialog: !!rpgActive, ground: player.onGround }));
    if (state.x >= 225) break;
    if (state.dialog) await page.keyboard.press('Enter');
    else if (state.ground && state.x >= 155) await page.keyboard.press('Space');
    await page.keyboard.down('ArrowRight');
    await delay(45);
  }
  await page.keyboard.up('ArrowRight');
  await waitFor(() => !!v395Img('coinBag'));
  await image('1-3-coin-bag.png');

  await open('2-2');
  await page.locator('[data-h2-act="bringDog"]').click({ timeout: 30000 });
  await page.locator('#h2-nav-go').click();
  await waitFor(() => advCurrentStageId() === '2-2' && !assetGateActive && gameState === 'playing');
  // Rendering/collision fixture only. This case deliberately positions the player
  // beside the chest for a reproducible screenshot and does not test this route.
  await page.evaluate(async () => {
    if (rpgActive) rpgClose('reset');
    const chest = unclaimedChapter3Treasure('2-2');
    player.x = chest.x - 150;
    player.y = GROUND_Y - player.h;
    player.vx = 0;
    cameraX = chest.x - 560;
    gameState = 'paused';
    ch3TreasureImage('item_treasure_chest_normal.png');
    await ch3TreasureImages.get('item_treasure_chest_normal.png').decode();
  });
  await image('2-2-normal-chest-render-fixture.png');
  assert.deepEqual(await page.evaluate(() => {
    const chest = chapter3TreasureSpots('2-2')[0];
    return [chest.x,chest.y,chest.tier,bringBalloonDog];
  }), [3790,474,'normal',true]);
  assert.deepEqual(errors, []);
});

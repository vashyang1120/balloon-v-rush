'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mkdir } = require('node:fs/promises');
const { join } = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { serveCheckout } = require('./chapter3-static-fixture.cjs');

const origin = 'https://vashyang1120.github.io';
const entry = origin + '/balloon-v-rush/playtest-adventure-gameplay-polish-qa-rev5/rpg-dual-continent-test/index.html';
const shots = process.env.CH3_SCREENSHOTS;

test('1-1 entry, 1-2 recipe by normal movement, and 1-3 / 2-2 art', { timeout: 220000 }, async t => {
  const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  await context.route('**/*', route => serveCheckout(route, origin, '/balloon-v-rush/playtest-adventure-gameplay-polish-qa-rev5'));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  async function open(stage = '') {
    await page.goto(entry + (stage ? '?devtools=1&ch3test=' + stage : ''));
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
  await page.frameLocator('#oc-frame').locator('#skipAllBtn').click({ timeout: 35000 });
  await waitFor(() => advCurrentStageId() === '1-1' && !assetGateActive &&
    (gameState === 'playing' || !!rpgActive));
  assert.equal(await page.evaluate(() => !!playerInventory.unlockedRecipes.balloonDice), false);

  await open('1-3');
  await page.locator('#h2-nav-go').waitFor({ timeout: 30000 });
  await page.locator('#h2-title-recipes').click();
  await page.locator('.h2-more').filter({ hasText: '打開氣球秘笈' }).click();
  await page.locator('button[data-h2-act="craft"][data-key="basicHammer"]').click();
  await page.locator('#h2-panel-close').click();
  await page.locator('#h2-nav-go').click();
  await waitFor(() => advCurrentStageId() === '1-3' && !assetGateActive && (gameState === 'playing' || !!rpgActive));
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
  await waitFor(() => advCurrentStageId() === '2-2' && !assetGateActive && (gameState === 'playing' || !!rpgActive));
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
  await open('1-2b');
  await page.locator('[data-h2-act="bringDog"]').click({ timeout: 30000 });
  await page.locator('#h2-nav-go').click();
  await waitFor(() => advCurrentStageId() === '1-2b' && !assetGateActive && (gameState === 'playing' || !!rpgActive));
  assert.equal(await page.evaluate(() => bringBalloonDog), true);
  const introductions = new Map();
  const targetJumps = [1750, 2260, 2940, 3660, 3940];
  const started = Date.now();
  let lastSwing = 0;
  let movingRight = false;
  while (Date.now() - started < 55000) {
    const state = await page.evaluate(() => ({
      x: player.x, ground: player.onGround, state: gameState, dialogue: rpgActive?.id,
      pages: rpgActive?.pages.map(p => [p.sp, p.text]),
    }));
    if (['clear', 'failed', 'gameover'].includes(state.state)) break;
    if (state.dialogue) {
      if (movingRight) {
        await page.keyboard.up('ArrowRight');
        movingRight = false;
      }
      if (state.dialogue.endsWith(':balloonDice')) introductions.set(state.dialogue, state.pages);
      await page.keyboard.press('Enter');
      await delay(140);
      continue;
    }
    if (!movingRight) {
      await page.keyboard.down('ArrowRight');
      movingRight = true;
    }
    while (targetJumps.length && state.x > targetJumps[0] + 140) targetJumps.shift();
    if (state.ground && targetJumps.length && state.x >= targetJumps[0]) {
      targetJumps.shift();
      await page.keyboard.press('Space', { delay: 65 });
    }
    if (Date.now() - lastSwing > 350) {
      await page.keyboard.press('z');
      lastSwing = Date.now();
    }
    await delay(38);
  }
  await page.keyboard.up('ArrowRight');
  const recipeResult = await page.evaluate(() => ({
    state: gameState, x: player.x, hasDice: playerInventory.unlockedRecipes.balloonDice,
    hasHammer: playerInventory.unlockedRecipes.basicHammer,
    round: playerInventory.roundBalloon
  }));
  assert.deepEqual([recipeResult.state, recipeResult.hasDice, recipeResult.hasHammer], ['clear', true, true], JSON.stringify(recipeResult));
  assert.deepEqual([...introductions.values()].flat(), [
    ['balloonv', '咦？這裡竟然藏著一本氣球秘笈！'],
    ['balloonv', '氣球骰子？原來用氣球也能做出骰子啊！'],
    ['balloonv', '可是氣球骰子可以做什麼呢？'],
  ]);
  assert.ok(recipeResult.round >= 3, JSON.stringify(recipeResult));
  assert.equal(await page.getByRole('button', { name: '查看本關詳細結算' }).count(), 0);
  await page.locator('#h2-sum-ok').click();
  await page.locator('#h2-title-recipes').click();
  await page.locator('.h2-more').filter({ hasText: '打開氣球秘笈' }).click();
  await page.locator('button[data-h2-act="craft"][data-key="basicHammer"]').click();
  const tutorialSkip = page.locator('#rpg-overlay [data-act="skip"]');
  if (await tutorialSkip.isVisible()) await tutorialSkip.click();
  await page.locator('button[data-h2-act="craft"][data-key="balloonDice"]').click();
  assert.equal(await page.evaluate(() => v395Count('basicHammer')), 1);
  assert.equal(await page.evaluate(() => v395Count('balloonDice')), 1);

  assert.deepEqual(errors, []);
});

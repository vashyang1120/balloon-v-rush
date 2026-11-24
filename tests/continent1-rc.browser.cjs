'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { createPreview } = require('./preview-entry.cjs');

test('Continent 1 RC dice and legacy-save replay', { timeout: 120000 }, async t => {
  const server = createPreview();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
  t.after(() => browser.close());
  for (const touch of [false, true]) {
    await t.test(touch ? 'landscape touch' : 'desktop keyboard', async t => {
      const context = await browser.newContext({ viewport: { width: touch ? 844 : 1280, height: touch ? 390 : 720 },
        isMobile: touch, hasTouch: touch });
      t.after(() => context.close());
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
      await page.addInitScript(() => {
        if (localStorage.getItem('balloonV_inventory')) return;
        localStorage.setItem('balloonV_inventory', JSON.stringify({
          coins: 100, balloon260: 7, roundBalloon: 2, craftedItems: { basicHammer: 1 },
          unlockedRecipes: { basicHammer: true }, chapter1Flow: { hammerRecipeGranted: true, hammerMaterialGuaranteeDone: true },
          balloonDog: { present: true, turnsLeft: 3 }, bagLevel: 1,
        }));
      });
      const url = origin + '/rpg-continent1-universe/?guest=1&sandbox=1';
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => assetBootReady, undefined, { timeout: 90000 });
      await page.evaluate(() => {
        window.rcStage = (stage, dog = false) => {
          if (rpgActive) rpgClose('reset');
          closeHomeScreen();
          if (gameStartGateActive) startAdventureFromGate();
          currentLevelIndex = LEVELS.findIndex(level => level.stageId === stage);
          loadLevel(currentLevelIndex);
          restart({ keepHp: false });
          bringBalloonDog = dog;
          createLevelStartSnapshot();
          gameState = 'playing';
        };
        window.rcCollect = item => {
          player.x = item.x - 8; player.y = item.y - 10;
          if (item.v395Kind) checkCollectibles(); else checkHiddenTreasure();
        };
        rcStage('1-2b', true);
        const book = vbTreasureList.find(item => item.recipeKey === 'balloonDice');
        currentHiddenTreasure = book;
        rcCollect(book);
      });
      assert.equal(await page.evaluate(() => currentRunStats.pendingRecipeUnlocks.balloonDice), true);
      await page.evaluate(() => { if (rpgActive) rpgClose('reset'); triggerClear(); });
      assert.equal(await page.evaluate(() => localStorage.getItem(SAVE_KEY) && playerInventory.unlockedRecipes.balloonDice), true);
      const crafted = await page.evaluate(() => {
        const before = [playerInventory.balloon260, playerInventory.roundBalloon];
        h2Craft('balloonDice');
        const after = [playerInventory.balloon260, playerInventory.roundBalloon];
        return [before[0] - after[0], before[1] - after[1], v395Count('balloonDice'), v395Cap('balloonDice'), craftItem('balloonDice')];
      });
      assert.deepEqual(crafted, [3, 1, 1, 1, false]);
      await page.evaluate(() => {
        rcStage('1-3');
        const rolls = [1, 6];
        balloonDice.rollFace = () => rolls.shift();
        rcCollect(coins.find(item => item.v395Kind === 'coinBag'));
      });
      const dialog = page.locator('#rpg-overlay');
      await dialog.waitFor({ state: 'visible' });
      await page.waitForTimeout(300);
      for (let i = 0; i < 4; ++i) {
        if (touch) await dialog.locator('.rpg-text').tap();
        else await page.keyboard.press('Enter');
        if (await dialog.getByRole('button', { name: '是', exact: true }).isVisible()) break;
      }
      await dialog.getByRole('button', { name: '是', exact: true }).waitFor({ state: 'visible', timeout: 6000 });
      assert.match(await dialog.locator('.rpg-text').innerText(), /要不要挑戰呢/);
      const accept = dialog.getByRole('button', { name: '是', exact: true });
      const decline = dialog.getByRole('button', { name: '否', exact: true });
      assert.ok((await accept.boundingBox()).x < (await decline.boundingBox()).x);
      const button = touch ? decline : accept;
      const box = await button.boundingBox();
      const point = [box.x + box.width / 2, box.y + box.height / 2];
      if (touch) await page.touchscreen.tap(...point); else await page.mouse.click(...point);
      if (!touch) {
        const outcome = dialog.getByRole('button', { name: '繼續冒險' });
        await outcome.waitFor({ state: 'visible' });
        assert.equal(await dialog.locator('.rpg-dice-board').getAttribute('data-points'), '1,6');
        const resultBox = await outcome.boundingBox();
        await page.mouse.click(resultBox.x + resultBox.width / 2, resultBox.y + resultBox.height / 2);
      }
      const after = await page.evaluate(() => {
        const reward = diceRewardAttempt.coins;
        restoreLevelStartSnapshot();
        const dice = v395Count('balloonDice');
        const saved = JSON.parse(localStorage.getItem(SAVE_KEY)).craftedItems.balloonDice;
        return { dice, saved, reward };
      });
      assert.equal(after.dice, touch ? 1 : 0);
      assert.equal(after.saved, after.dice);
      assert.equal(after.reward, touch ? 10 : 5);
      const chest = await page.evaluate(() => {
        rcStage('2-2');
        playerInventory.craftedItems.balloonDice = 0;
        const chest = vbTreasureList.find(item => item.type === 'goldChest');
        currentHiddenTreasure = chest;
        rcCollect(chest);
        const withoutDog = chest.found;
        bringBalloonDog = true;
        rcCollect(chest);
        return [withoutDog, chest.found, diceRewardAttempt.coins];
      });
      assert.deepEqual(chest, [false, true, 40]);
      const replay = await page.evaluate(() => {
        rcStage('2-2', true);
        const chest = vbTreasureList.find(item => item.type === 'goldChest');
        currentHiddenTreasure = chest;
        rcCollect(chest);
        const repeatChest = diceRewardAttempt.coins;
        rcStage('2-1');
        rcCollect(coins.find(item => item.v395Kind === 'coinBag'));
        return [repeatChest, diceRewardAttempt.coins, playerInventory.unlockedRecipes.balloonDice];
      });
      assert.deepEqual(replay, [40, 10, true]);
      const upgrade = await page.evaluate(() => {
        gameState = 'clear';
        playerInventory.coins = 80;
        const purchase = v395Buy('bagUpgrade');
        if (!purchase.ok) throw Error(purchase.why);
        return [purchase.ok, purchase.price, purchase.coinsBefore - purchase.coinsAfter,
          v395Cap('balloonDice'), JSON.parse(localStorage.getItem(SAVE_KEY)).bagLevel];
      });
      assert.deepEqual(upgrade, [true, 80, 80, 2, 2]);
      assert.deepEqual(errors, []);
    });
  }
});

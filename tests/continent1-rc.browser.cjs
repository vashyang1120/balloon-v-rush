'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { mkdir } = require('node:fs/promises');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { createPreview } = require('./preview-entry.cjs');
const entryPath = '/rpg-continent1-universe/';
const baselineRef = '5272600dfb76a7782a3d879336a9961bae969f9f';
const baselineRepo = 'https://raw.githubusercontent.com/vashyang1120/balloon-v-rush/' + baselineRef;

async function baselineSources() {
  if (process.env.GITHUB_ACTIONS !== 'true') return null;
  const files = { 'index.html': 'text/html', 'main.js': 'text/javascript', 'style.css': 'text/css' };
  return new Map(await Promise.all(Object.entries(files).map(async ([name, contentType]) => {
    const response = await fetch(baselineRepo + entryPath + name, { signal: AbortSignal.timeout(30000) });
    assert.equal(response.ok, true, 'Load exact baseline ' + name);
    return [entryPath + name, { contentType: contentType + '; charset=utf-8', body: await response.text() }];
  })));
}

function clearFirstStageForSummary() {
  if (gameStartGateActive) startAdventureFromGate();
  if (rpgActive) rpgClose('qa');
  rpgLoad().worldIntro = 'done';
  currentRunStats.coins = 10;
  currentRunStats.vCoinsGranted = true;
  currentRunStats.vCoinsEarnedThisClear = 5;
  triggerClear();
}

test('Continent 1 RC dice and legacy-save replay', { timeout: 300000 }, async t => {
  const server = createPreview();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
  t.after(() => browser.close());
  const baseline = await baselineSources();
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
      const url = origin + entryPath + '?guest=1&sandbox=1&nocomic=1';
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => assetBootReady, undefined, { timeout: 90000 });
      await page.evaluate(() => {
        rpgLoad().worldIntro = 'done';
        rpgSetMode('first');
        rpgMarkSeen('rpg011_hammer_crafted', 'qa');
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
      const click = locator => touch ? locator.tap() : locator.click();
      await page.evaluate(() => {
        if (rpgActive) rpgClose('qa');
        playerInventory.whack = { hammerRecipeVerified: true, firstPlayGranted: true, playsLeft: 1 };
        playerInventory.volleyball = { matchesLeft: 2 };
        playerInventory.balloonDiceSpent = 2;
        saveInventory();
        openHomeScreen('clear');
        h2HideSummary();
      });
      await click(page.locator('#h2-nav-challenge'));
      await click(page.locator('[data-oc="no"]'));
      assert.equal(await page.evaluate(() => v395BagLevel()), 2);
      await click(page.locator('#h2-nav-challenge'));
      await click(page.locator('[data-oc="yes"]'));
      await page.waitForFunction(() => advCurrentStageId() === '1-1' && !assetGateBusy);
      assert.deepEqual(await page.evaluate(() => [
        v395BagLevel(), whUnlocked(), whData().playsLeft, vbUnlocked(), v395Count('balloonDice'),
        !!playerInventory.unlockedRecipes.balloonDice, JSON.parse(localStorage.getItem(SAVE_KEY)).bagLevel
      ]), [1, false, 0, false, 0, false, 1]);

      // The guest fixture supplies display-only V coins without exercising the production wallet.
      assert.equal(await page.evaluate(() => rpgShouldShowScene(rpgBuildScene('rpg011_hammer_crafted'))), false);
      await page.evaluate(clearFirstStageForSummary);
      await page.locator('#h2-sum-wrap.is-open').waitFor();
      const summary = page.locator('#h2-sum-wrap');
      assert.deepEqual(await summary.getByRole('button').allTextContents(), ['收下獎勵，開始整備']);
      const icons = await summary.locator('img').evaluateAll(images => images.map(i => i.dataset.h2Path));
      assert.ok(icons.includes('assets/adventure/ui/items/item_coin.png'));
      assert.ok(icons.includes('assets/adventure/ui/items/item_coin_crown.png'));
      await page.waitForFunction(() => {
        const icon = document.querySelector('#h2-sum-body img[data-h2-path$="item_coin_crown.png"]');
        return icon?.complete && icon.naturalWidth > 0;
      });
      const artifacts = process.env.ENTRY_SCREENSHOTS || 'entry-screenshots';
      const device = touch ? 'touch' : 'pc';
      await mkdir(artifacts, { recursive: true });
      await page.screenshot({ path: artifacts + '/fresh-start-vcoin-after-' + device + '.png' });
      if (baseline) {
        const priorContext = await browser.newContext({ viewport: { width: touch ? 844 : 1280, height: touch ? 390 : 720 },
          isMobile: touch, hasTouch: touch });
        t.after(() => priorContext.close().catch(() => {}));
        const prior = await priorContext.newPage();
        await prior.route('**/*', route => {
          const url = new URL(route.request().url());
          if (url.origin !== origin) return route.abort();
          const exact = baseline.get(url.pathname);
          return exact ? route.fulfill(exact) : route.continue();
        });
        await prior.goto(origin + entryPath + 'index.html?guest=1&sandbox=1&nocomic=1', { waitUntil: 'domcontentloaded' });
        await prior.waitForFunction(() => assetBootReady, undefined, { timeout: 90000 });
        await prior.evaluate(() => { rpgLoad().worldIntro = 'done'; });
        await prior.evaluate(clearFirstStageForSummary);
        await prior.locator('#h2-sum-detail').waitFor();
        await prior.locator('#h2-sum-body').getByText('🐷').waitFor();
        await prior.screenshot({ path: artifacts + '/fresh-start-vcoin-before-' + device + '.png' });
        await priorContext.close();
      }
      await click(page.locator('#h2-sum-ok'));
      const serialized = () => page.evaluate(() => [JSON.stringify(playerInventory), JSON.stringify(playerWallet)]);
      const beforeView = await serialized();
      for (let i = 0; i < 2; i++) {
        await click(page.getByRole('button', { name: '本關詳細結算', exact: true }));
        await summary.waitFor({ state: 'visible' });
        assert.equal(await page.locator('#result-overlay').isVisible(), false);
        assert.equal(await page.locator('#h2-sum-ok').innerText(), '返回整備');
        assert.equal(await summary.locator('img[data-h2-path$="item_coin_crown.png"]').count(), 1);
        await click(page.locator('#h2-sum-ok'));
      }
      assert.deepEqual(await serialized(), beforeView);
      assert.deepEqual(await page.evaluate(() => [v395BagLevel(), whUnlocked()]), [1, false]);

      const upgradedThisRun = await page.evaluate(() => {
        playerInventory.coins = 85;
        const purchase = v395Buy('bagUpgrade');
        return [purchase.ok, purchase.price, v395BagLevel(), playerInventory.coins, getLevelIndexByStageId('3-1')];
      });
      assert.deepEqual(upgradedThisRun, [true, 80, 2, 5, -1]);
      await click(page.locator('#h2-nav-challenge'));
      await click(page.locator('[data-oc="yes"]'));
      await page.waitForFunction(() => advCurrentStageId() === '1-1' && !assetGateBusy);
      assert.deepEqual(await page.evaluate(() => [v395BagLevel(), whUnlocked(), vbUnlocked()]), [1, false, false]);
      assert.deepEqual(errors, []);
    });
  }
});

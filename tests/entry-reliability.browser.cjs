'use strict';
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const { createPreview } = require('./preview-entry.cjs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const test = require('node:test');

const dirs = ['rpg-continent1-universe', 'rpg-dual-continent-test'];
const artifacts = process.env.ENTRY_SCREENSHOTS || 'entry-screenshots';
const whackAsset = '**/minigames/whack-a-mole/assets/whack_hole_back.png*';
const balances = page => page.evaluate(() => ({
  coins: playerInventory.coins, plays: whData().playsLeft,
  state: whData().current?.state, id: whData().current?.id
}));
const closeResult = page => page.evaluate(() => {
  document.getElementById('vb-modal')?.remove();
  h2OpenPanel('whack');
});
async function homeForWhack(page) {
  await page.evaluate(() => { if (gameStartGateActive) startAdventureFromGate(); });
  await page.evaluate(() => {
    gameState = 'clear';
    openHomeScreen('clear');
    h2HideSummary();
    h2OpenPanel('whack');
  });
}

test('isolated browser, real chapter and minigame assets', { timeout: 420000, concurrency: true }, async t => {
  const server = createPreview();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  t.after(() => server.close());
  await mkdir(artifacts, { recursive: true });
  await Promise.all(dirs.map((dir, index) => t.test(dir, async t => {
      const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
      t.after(() => browser.close());
      const context = await browser.newContext(index ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }
        : { viewport: { width: 1280, height: 720 } });
      const page = await context.newPage();
      page.on('pageerror', e => console.log('pageerror', e.message));
      await page.route(/^https?:\/\/[^/]+\//, route => {
        const req = route.request();
        return req.url().startsWith(origin + '/') ? route.continue() : route.abort();
      });
      await page.goto(origin + '/' + dir + '/?guest=1&sandbox=1', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => typeof h2IsOpen === 'function' && assetBootReady, undefined, { timeout: 90000 });

      // Use a controlled combat fixture to reach the actual boss defeat and confirmation path.
      const bossAssets = await page.evaluate(async () => {
        const index = LEVELS.findIndex(l => l.stageId === '2-4');
        const result = await ensureAssetsForStage(index);
        if (!result.ok) return result.criticalFailedPaths;
        startAdventureFromGate();
        currentLevelIndex = index; loadLevel(index); restart({ keepHp: false }); gameState = 'playing';
        orangeKingBoss.hp = 0;
        startOrangeKingDefeat();
        return [];
      });
      assert.deepEqual(bossAssets, []);
      await page.locator('#btn-boss-victory-ok').click({ timeout: 20000 });
      await page.evaluate(() => { openHomeScreen('clear'); advConfirmOfficialChallenge(); });
      await page.locator('[data-oc="yes"]').click();
      await page.waitForFunction(() => advCurrentStageId() === '1-1' && !assetGateBusy);
      const chapters = await page.evaluate(async () => {
        const out = [];
        for (const sid of ['1-1', '2-1']) {
          const check = await ensureAssetsForStage(sid);
          out.push({ sid, failed: check.criticalFailedPaths,
            checked: check.summaries.map(x => x.group + ':' + x.loaded + '/' + x.total) });
        }
        return out;
      });
      console.log(dir, JSON.stringify(chapters));
      assert.deepEqual(chapters.flatMap(x => x.failed), []);
      await page.screenshot({ path: artifacts + '/' + dir + '-official-restart.png' });

      await page.evaluate(() => {
        playerInventory.whack = { unlocked: true, playsLeft: 0 };
        playerInventory.coins = 50;
        playerInventory.unlockedRecipes.basicHammer = false;
      });
      await homeForWhack(page);
      await page.getByText('🔒 尚未解鎖', { exact: false }).first().waitFor({ state: 'visible' });
      await page.evaluate(() => {
        // Set the 1-2 finish state without driving the side-scroller for the whole chapter.
        const index = LEVELS.findIndex(l => l.stageId === '1-2');
        currentLevelIndex = index; loadLevel(index); restart({ keepHp: true }); gameState = 'playing';
        triggerClear();
        playerInventory.coins = 50;
        saveInventory();
      });
      await page.waitForFunction(() => !H2.enterPending && h2IsOpen());
      await page.evaluate(() => { h2HideSummary(); h2OpenPanel('whack'); });
      const launch = page.locator('[data-wh-act="play"]');
      await launch.waitFor({ state: 'visible' });
      assert.equal(await launch.isEnabled(), true);
      console.log(dir, '1-2 completed, first play available');
      await page.getByText('遊戲背後的故事', { exact: true }).click();
      await page.getByText('每次在氣球課教孩子們製作氣球槌時', { exact: false }).waitFor({ state: 'visible' });

      await page.route(whackAsset, async route => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        try { await route.abort(); } catch {}
      });
      await page.evaluate(() => { whStart(); whStart(); });
      await page.waitForFunction(() => ADV_LOAD.st?.scene === 'WHACK' && ADV_LOAD.st.realP > 0);
      await page.screenshot({ path: artifacts + '/' + dir + '-whack-loading.png' });
      await page.locator('#whack-loading-back').click();
      assert.equal((await balances(page)).coins, 50);
      assert.equal((await balances(page)).plays, 1);
      await launch.click();
      await page.locator('.adv-load-err [data-k="retry"]').waitFor();
      assert.equal((await balances(page)).coins, 50);
      assert.equal((await balances(page)).plays, 1);
      await page.unroute(whackAsset);
      await page.locator('.adv-load-err [data-k="retry"]').click();
      await page.waitForFunction(() => whFrame.ready);
      console.log(dir, 'slow failure, cancellation and retry completed');
      assert.equal((await balances(page)).coins, 50);
      const intro = page.frameLocator('#wam-frame').getByRole('button', { name: /開始/ });
      await intro.waitFor();
      await page.screenshot({ path: artifacts + '/' + dir + '-whack-intro.png' });
      await intro.dispatchEvent('click');
      await page.waitForFunction(() => whData().current?.state === 'active');
      const paid = await balances(page);
      assert.equal(paid.coins, 30);
      assert.equal(paid.plays, 0);

      await page.waitForFunction(() => whData().current?.state === 'done', undefined, { timeout: 45000 });
      const done = await balances(page);
      assert.equal(done.coins, 50);
      assert.equal(done.plays, 0);
      console.log(dir, '30-second paid round completed once');
      const duplicated = await page.evaluate(() => whSettle({ score: 0 }, whData().current.id, whFrame.iframe.contentWindow));
      assert.equal(duplicated, false);
      await page.frameLocator('#wam-frame').locator('#c1uResHome').click();
      await closeResult(page);
      assert.equal(await page.locator('[data-wh-act="play"]').isEnabled(), false);
      await page.evaluate(() => { whData().playsLeft = 1; saveInventory(); h2RenderPanel(); });
      await page.locator('[data-wh-act="play"]').click();
      await page.waitForFunction(() => whFrame.ready);
      await page.frameLocator('#wam-frame').getByRole('button', { name: /開始/ }).dispatchEvent('click');
      assert.equal((await balances(page)).coins, 30);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => assetBootReady);
      await homeForWhack(page);
      await page.waitForFunction(() => whData().current?.abortedAt > 0);
      assert.equal((await balances(page)).coins, 30);
      assert.equal(await page.locator('[data-wh-act="play"]').isEnabled(), false);
      console.log(dir, 'reload did not restart a paid round');
      await page.evaluate(() => h2OpenPanel('volleyball'));
      await page.getByText('遊戲背後的故事', { exact: true }).click();
      await page.getByText('氣球排球的靈感', { exact: false }).waitFor({ state: 'visible' });
  })));
});

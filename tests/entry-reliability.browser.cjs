'use strict';
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const { createPreview } = require('./preview-entry.cjs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const test = require('node:test');

const cases = [
  { dir: 'rpg-continent1-universe', touch: false },
  { dir: 'rpg-continent1-universe', touch: true },
  { dir: 'rpg-dual-continent-test', touch: true },
];
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
  await Promise.all(cases.map(({ dir, touch }) => t.test(dir + (touch ? ' touch' : ' PC'), async t => {
      const continent1 = dir === 'rpg-continent1-universe';
      const artifactName = dir + (touch ? '-touch' : '-pc');
      const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
      t.after(() => browser.close());
      const context = await browser.newContext(touch ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }
        : { viewport: { width: 1280, height: 720 } });
      const page = await context.newPage();
      page.on('pageerror', e => console.log('pageerror', e.message));
      await page.route(/^https?:\/\/[^/]+\//, async route => {
        const url = route.request().url();
        if (!url.startsWith(origin + '/')) return route.abort();
        if (!continent1 || !new URL(url).pathname.endsWith('/minigames/volleyball/main.js')) return route.continue();
        const response = await route.fetch();
        const source = await response.text();
        const testHook = `
          window.testVolleyBackground = () => {
            const tiles = [];
            const draw = ctx.drawImage;
            ctx.drawImage = function (image, x, y, width, height) {
              const transform = ctx.getTransform();
              tiles.push({ top: transform.f, bottom: transform.f + height * transform.d, scaleY: transform.d });
              return draw.apply(this, arguments);
            };
            ctx.save();
            try {
              ctx.setTransform(viewScale * dpr, 0, 0, viewScale * dpr, viewOX * dpr, viewOY * dpr);
              drawArtBackground();
            } finally {
              ctx.restore();
              ctx.drawImage = draw;
            }
            return { height: canvas.height, tiles };
          };
          window.awardTestVolleyPoint = () => {
            game.state = STATE.RALLY;
            scorePoint('left');
            afterPoint();
            return { target: CONFIG.TARGET_SCORE, score: game.score.left, won: game.state === STATE.GAME_OVER };
          };
        `;
        return route.fulfill({ response, body: source.replace(/\}\)\(\);\s*$/, testHook + '})();') });
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
      const required = await page.evaluate(() => {
        openHomeScreen('clear');
        const entry = getAssetManifest().chapter1.find(x => x.critical && x.type === 'image');
        const record = ASSET_REGISTRY[entry.path];
        record.status = 'failed';
        ASSET_GROUP_STATE.chapter1.summary = summarizeAssetGroup('chapter1');
        playerInventory.coins = 71;
        advConfirmOfficialChallenge();
        return entry.path;
      });
      const brokenAsset = url => url.origin === origin && url.pathname === '/' + required;
      await page.route(brokenAsset, route => route.fulfill({ status: 503, body: 'QA unavailable' }));
      await page.locator('[data-oc="yes"]').click();
      await page.locator('.adv-load-err [data-k="retry"]').waitFor();
      assert.equal((await balances(page)).coins, 71);
      await page.screenshot({ path: artifacts + '/' + artifactName + '-official-retry.png' });
      await page.unroute(brokenAsset);
      await page.locator('.adv-load-err [data-k="retry"]').click();
      console.log(dir, 'official restart retried simulated HTTP 503 for', required);
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
      await page.screenshot({ path: artifacts + '/' + artifactName + '-official-restart.png' });

      await page.evaluate(() => {
        playerInventory.whack = { unlocked: true, playsLeft: 0 };
        playerInventory.coins = 50;
        playerInventory.unlockedRecipes.basicHammer = false;
      });
      await homeForWhack(page);
      await page.getByText('🔒 尚未解鎖', { exact: false }).first().waitFor({ state: 'visible' });
      await page.evaluate(continent1 => {
        // Fast-forward travel, then use the actual dog-only treasure collision in the formal 1-2.
        if (rpgActive) rpgClose('qa');
        const index = LEVELS.findIndex(l => l.stageId === (continent1 ? '1-2b' : '1-2'));
        currentLevelIndex = index; loadLevel(index); restart({ keepHp: true }); gameState = 'playing';
        if (continent1) {
          bringBalloonDog = true;
          currentHiddenTreasure = vbTreasureList.find(item => item.recipeKey === 'basicHammer');
          if (!currentHiddenTreasure) throw Error('Missing hammer recipe in 1-2');
          player.x = currentHiddenTreasure.x;
          player.y = currentHiddenTreasure.y;
          checkHiddenTreasure();
          if (!currentRunStats.pendingRecipeUnlocks?.basicHammer) throw Error('Dog did not collect hammer recipe');
          if (rpgActive) rpgClose('qa');
        }
        triggerClear();
        playerInventory.coins = 50;
        saveInventory();
      }, continent1);
      await page.waitForFunction(() => !H2.enterPending && h2IsOpen());
      await page.evaluate(() => { h2HideSummary(); h2OpenPanel('whack'); });
      const launch = page.locator('[data-wh-act="play"]');
      await launch.waitFor({ state: 'visible' });
      if (continent1) {
        assert.equal(await launch.isEnabled(), false);
        assert.equal(await page.evaluate(() => playerInventory.chapter1Flow.hammerRecipeDiscovered), true);
        await page.evaluate(() => h2OpenPanel('recipes'));
        const hammer = page.locator('[data-h2-act="craft"][data-key="basicHammer"]');
        if (touch) await hammer.tap(); else await hammer.click();
        await page.waitForFunction(() => whUnlocked() && whData().playsLeft === 1);
        await page.waitForFunction(() => rpgActive && rpgActive.id === C1U_HAMMER_SCENE, undefined, { timeout: 10000 });
        await page.evaluate(() => { rpgClose('qa'); h2OpenPanel('whack'); });
      }
      assert.equal(await launch.isEnabled(), true);
      console.log(artifactName, '1-2 completed, first play available');
      await page.getByText('遊戲背後的故事', { exact: true }).click();
      await page.getByText('每次在氣球課教孩子們製作氣球槌時', { exact: false }).waitFor({ state: 'visible' });

      if (continent1) {
        const bgm = '**/volleyball/assets/audio/bgm/volleyball_game_bgm.mp3*';
        await page.route(bgm, route => route.fulfill({ status: 503, body: 'QA unavailable' }));
        await launch.click();
        await page.locator('.adv-load-err [data-k="retry"]').waitFor();
        assert.equal((await balances(page)).coins, 50);
        assert.equal((await balances(page)).plays, 1);
        await page.unroute(bgm);
        await page.locator('.adv-load-err [data-k="cont"]').click();
      }
      await page.route(whackAsset, async route => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        try { await route.abort(); } catch {}
      });
      await page.evaluate(() => { whStart(); whStart(); });
      await page.waitForFunction(() => ADV_LOAD.st?.scene === 'WHACK' && ADV_LOAD.st.realP > 0);
      await page.screenshot({ path: artifacts + '/' + artifactName + '-whack-loading.png' });
      await page.locator('#whack-loading-back').click();
      assert.equal((await balances(page)).coins, 50);
      assert.equal((await balances(page)).plays, 1);
      await launch.click();
      await page.locator('.adv-load-err [data-k="retry"]').waitFor();
      assert.equal((await balances(page)).coins, 50);
      assert.equal((await balances(page)).plays, 1);
      await page.locator('.adv-load-err [data-k="cont"]').click();
      await page.evaluate(() => { C1U_WHACK.loadTimeoutMs = 100; });
      await launch.click();
      await page.locator('.adv-load-err [data-k="retry"]').waitFor();
      assert.equal((await balances(page)).coins, 50);
      assert.equal((await balances(page)).plays, 1);
      await page.unroute(whackAsset);
      await page.evaluate(() => { C1U_WHACK.loadTimeoutMs = 20000; });
      await page.locator('.adv-load-err [data-k="retry"]').click();
      await page.waitForFunction(() => whFrame.ready);
      // The intro rejects input during its first 250 ms to prevent accidental skips.
      await page.waitForTimeout(300);
      console.log(dir, 'slow failure, cancellation, timeout and retry completed');
      assert.equal((await balances(page)).coins, 50);
      const intro = page.frameLocator('#wam-frame').getByRole('button', { name: /開始/ });
      await intro.waitFor();
      await page.screenshot({ path: artifacts + '/' + artifactName + '-whack-intro.png' });
      const startButton = await intro.boundingBox();
      const startPoint = [startButton.x + startButton.width / 2, startButton.y + startButton.height / 2];
      if (touch) await page.touchscreen.tap(...startPoint); else await page.mouse.click(...startPoint);
      await page.waitForFunction(() => whData().current?.state === 'active');
      if (dir === 'rpg-continent1-universe') {
        const whack = await (await page.locator('#wam-frame').elementHandle()).contentFrame();
        await whack.waitForFunction(() => WAM.Audio.report().bgmTime > 0 && WAM.Audio.report().bgm.includes('播放中'), undefined, { timeout: 10000 });
      }
      if (continent1) {
        const board = await page.frameLocator('#wam-frame').locator('#board').boundingBox();
        const point = [board.x + board.width / 2, board.y + board.height / 2];
        if (touch) await page.touchscreen.tap(...point); else await page.mouse.click(...point);
      }
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
      // The intro rejects input during its first 250 ms to prevent accidental skips.
      await page.waitForTimeout(300);
      await page.frameLocator('#wam-frame').getByRole('button', { name: /開始/ }).dispatchEvent('click');
      await page.waitForFunction(() => whData().current?.state === 'active');
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
      await page.evaluate(() => {
        playerInventory.unlockedRecipes[VB_CONFIG.recipeKey] = true;
        playerInventory.craftedItems[VB_CONFIG.recipeKey] = 1;
        vbData().matchesLeft = 1;
        h2RenderPanel();
      });
      await page.locator('[data-vb-act="play"][data-op="scorpion"]').click();
      await page.waitForFunction(() => vbFrame.ready);
      const volley = page.frameLocator('#vb-frame');
      const volleyStart = volley.locator('#btnEmbedStart');
      await volleyStart.waitFor();
      await volleyStart.click();
      await page.waitForFunction(() => vbCurrent()?.state === 'active');
      if (dir === 'rpg-continent1-universe') {
        const frame = await (await page.locator('#vb-frame').elementHandle()).contentFrame();
        await frame.waitForFunction(() => {
          const snapshot = BalloonVolleyball.getSnapshot();
          return snapshot.audio.bgm.game?.playing && snapshot.visual.court.background === 'ready';
        }, undefined, { timeout: 10000 });
      }
      if (dir === 'rpg-continent1-universe') {
        const frame = await (await page.locator('#vb-frame').elementHandle()).contentFrame();
        await page.setViewportSize({ width: 1046, height: 896 });
        await frame.waitForFunction(() => BalloonVolleyball.getSnapshot().view.h === 896);
        const background = await frame.evaluate(() => testVolleyBackground());
        assert.ok(background.tiles.length > 0);
        for (const tile of background.tiles) {
          assert.ok(tile.scaleY > 0);
          assert.ok(tile.top <= 1 && tile.bottom >= background.height - 1);
        }
        await page.screenshot({ path: artifacts + '/' + artifactName + '-volleyball-tall-viewport.png' });
        await page.setViewportSize({ width: 1280, height: 720 });
      }
      await volley.locator('#btnPause').dispatchEvent('click');
      await volley.locator('#btnPauseTitle').dispatchEvent('click');
      await page.waitForFunction(() => !vbFrame.session);
      const tickets = await page.evaluate(() => ({ tickets: vbTickets(), matches: vbData().matchesLeft }));
      assert.deepEqual(tickets, { tickets: 1, matches: 1 });
      console.log(dir, 'volleyball opened, started and returned home');
      if (dir === 'rpg-continent1-universe') {
        for (const opponent of ['scorpion', 'orange', 'orange_king']) {
          await page.evaluate(() => {
            vbData().matchesLeft = 1;
            playerInventory.craftedItems[VB_CONFIG.recipeKey] = 1;
            h2OpenPanel('volleyball');
          });
          await page.waitForFunction(() => Date.now() - (H2.lastTap.vbPlay || 0) >= 500);
          await page.locator('[data-vb-act="play"][data-op="' + opponent + '"]').click();
          await page.waitForFunction(opponent => vbFrame.ready && vbFrame.session && vbCurrent()?.opponent === opponent, opponent);
          await volleyStart.dispatchEvent('click');
          await page.waitForFunction(() => vbCurrent()?.state === 'active');
          const frame = await (await page.locator('#vb-frame').elementHandle()).contentFrame();
          const scores = await frame.evaluate(() => Array.from({ length: 5 }, () => awardTestVolleyPoint()));
          assert.deepEqual(scores, Array.from({ length: 5 }, (_, i) => ({ target: 5, score: i + 1, won: i === 4 })));
          await page.waitForFunction(() => vbCurrent()?.state === 'done');
          await volley.locator('#btnChange').dispatchEvent('click');
          await page.waitForFunction(() => !vbFrame.session);
          await page.evaluate(() => { document.getElementById('vb-modal')?.remove(); });
          console.log(dir, opponent, '5–0 settled and returned home');
        }
      } else {
        // Only the existing dual-continent entry exposes the 2-4 → 3-1 trip.
        const purchased = await page.evaluate(() => {
          if (rpgActive) rpgClose('qa');
          document.getElementById('vb-modal')?.remove();
          currentLevelIndex = getLevelIndexByStageId('2-4');
          gameState = 'clear';
          openHomeScreen('clear');
          playerInventory.coins = 85;
          const purchase = v395Buy('bagUpgrade');
          playerInventory.balloon260 = 13;
          playerInventory.roundBalloon = 3;
          playerInventory.balloonDog = { present: true, turnsLeft: 2 };
          playerInventory.craftedItems.basicHammer = 1;
          nextBringDog = true;
          return [purchase.ok, purchase.price, c2GoContinent2('home')];
        });
        assert.deepEqual(purchased, [true, 80, true]);
        await page.waitForFunction(() => advCurrentStageId() === '3-1' && !assetGateBusy, undefined, { timeout: 90000 });
        assert.deepEqual(await page.evaluate(() => [
          v395BagLevel(), playerInventory.coins, playerInventory.balloon260,
          playerInventory.roundBalloon, playerInventory.craftedItems.basicHammer, bringBalloonDog
        ]), [2, 5, 13, 3, 1, true]);
        console.log(artifactName, 'LV2 and trip inventory carried from 2-4 into 3-1');
      }
  })));
});

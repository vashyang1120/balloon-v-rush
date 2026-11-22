'use strict';
const assert = require('node:assert/strict');
const { mkdir, mkdtemp, readFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { setTimeout: delay } = require('node:timers/promises');
const { join } = require('node:path');
const { build, previewDir } = require('./build-volleyball-playtest.cjs');
const { createPreview } = require('./preview-entry.cjs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const test = require('node:test');


const volleyballScript = '**/minigames/volleyball/main.js*';
const volleyballCases = [
  ['scorpion', 5, 0], ['orange', 5, 0], ['orange_king', 5, 0],
  ['scorpion', 5, 1], ['orange', 5, 4], ['orange_king', 0, 5], ['scorpion', 4, 5],
];

async function waitForAdventureState(page, predicate) {
  const until = Date.now() + 15000;
  while (Date.now() < until) {
    if (await page.evaluate(predicate)) return;
    await delay(50);
  }
  assert.fail('Adventure state did not reach ' + predicate.toString());
}

async function completeVolleyball(page, opponent, playerScore, cpuScore, touch, titleMode = 'guest') {
  const before = await page.evaluate(() => {
    playerInventory.craftedItems[VB_CONFIG.recipeKey] = 1;
    vbData().matchesLeft = 1;
    h2RenderPanel();
    return [playerInventory.coins, playerInventory.balloon260, playerInventory.roundBalloon];
  });
  await page.locator('[data-vb-act="play"][data-op="' + opponent + '"]').click();
  await waitForAdventureState(page, () => vbFrame.ready);
  const frame = await (await page.locator('#vb-frame').elementHandle()).contentFrame();
  await frame.locator('#btnEmbedStart').click();
  await waitForAdventureState(page, () => vbCurrent()?.state === 'active');
  const state = () => frame.evaluate(() => window.volleyballQA.state());
  const points = [...Array(playerScore === 5 ? cpuScore : playerScore).fill(playerScore === 5 ? 'right' : 'left'),
    ...Array(playerScore === 5 ? playerScore : cpuScore).fill(playerScore === 5 ? 'left' : 'right')];
  for (const [i, winner] of points.entries()) {
    await frame.waitForFunction(() => window.volleyballQA.canServe());
    if ((await state()).server === 'left') {
      if (touch) {
        const button = await frame.locator('[data-cmd="hit"]').boundingBox();
        assert.ok(button);
        await page.touchscreen.tap(button.x + button.width / 2, button.y + button.height / 2);
      } else await page.keyboard.press('Space');
    }
    await frame.waitForFunction(() => window.volleyballQA.state().state === 'RALLY');
    await frame.evaluate(winner => window.volleyballQA.land(winner), winner);
    await frame.waitForFunction(() => window.volleyballQA.state().state === 'POINT_SCORED');
    const scored = await state();
    assert.equal(scored.left + scored.right, i + 1);
    if (i < points.length - 1) assert.ok(scored.left < 5 && scored.right < 5);
  }
  await frame.locator('#overlayOver').waitFor();
  assert.match(await frame.locator('#overScore').textContent(), new RegExp(playerScore + '\\s*:\\s*' + cpuScore));
  const finished = await state();
  assert.equal(finished.state, 'GAME_OVER');
  await frame.evaluate(() => window.volleyballQA.land('left'));
  assert.deepEqual(await state(), finished);
  await waitForAdventureState(page, () => vbCurrent()?.state === 'done');
  const settled = await page.evaluate(() => {
    const c = vbCurrent();
    const duplicate = vbSettle({ matchId: c.matchId }, c);
    return {
      duplicate, ticket: vbTickets(), left: vbData().matchesLeft, saved: vbData().settled[c.matchId] === c.id,
      balance: [playerInventory.coins, playerInventory.balloon260, playerInventory.roundBalloon],
      reward: [c.reward.coins, c.reward.balloon260, c.reward.roundBalloon], title: c.titleRes || null,
    };
  });
  assert.equal(settled.duplicate, false);
  assert.equal(settled.saved, true);
  assert.equal(settled.ticket, 0);
  assert.equal(settled.left, 0);
  assert.deepEqual(settled.balance.map((v, i) => (v || 0) - (before[i] || 0)), settled.reward);
  const titleSuffix = { scorpion: 'rookie', orange: 'expert', orange_king: 'king' };
  assert.equal(settled.title?.key, titleMode && playerScore === 5 && cpuScore === 0 ? 'adventure_volleyball_' + titleSuffix[opponent] : undefined);
  if (settled.title) {
    if (titleMode === 'guest') assert.equal(settled.title.reason, 'guest');
    else assert.equal(settled.title.ok, true);
  }
  await frame.locator('#btnChange').click();
  await page.locator('#vb-modal').waitFor();
  await page.locator('#vb-modal [data-vb-close]').click();
  return settled.title;
}

async function installVolleyballFixture(page) {
  const source = await readFile(join(__dirname, '..', 'minigames', 'volleyball', 'main.js'), 'utf8');
  const end = source.lastIndexOf('})();');
  assert.ok(end > 0);
  const fixture = `
    window.volleyballQA = {
      state: () => ({ state: game.state, server: game.server, ...game.score }),
      canServe: () => game.state === STATE.SERVE_READY || (game.state === STATE.RALLY && game.server === 'right'),
      land: winner => {
        const x = winner === 'left' ? CONFIG.WORLD_W - BR - 4 : BR + 4;
        Object.assign(ball, { x, y: CONFIG.GROUND_Y - BR + 1, vx: 0, vy: 100, held: false });
      },
    };
  `;
  await page.route(volleyballScript, route => route.fulfill({
    contentType: 'application/javascript',
    body: source.slice(0, end) + fixture + source.slice(end),
  }));
}

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
      await page.screenshot({ path: artifacts + '/' + dir + '-official-retry.png' });
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
      await volleyStart.dispatchEvent('click');
      await page.waitForFunction(() => vbCurrent()?.state === 'active');
      await volley.locator('#btnPause').dispatchEvent('click');
      await volley.locator('#btnPauseTitle').dispatchEvent('click');
      await page.waitForFunction(() => !vbFrame.session);
      const tickets = await page.evaluate(() => ({ tickets: vbTickets(), matches: vbData().matchesLeft }));
      assert.deepEqual(tickets, { tickets: 1, matches: 1 });
      console.log(dir, 'volleyball opened, started and returned home');
      await installVolleyballFixture(page);
      for (const [opponent, playerScore, cpuScore] of volleyballCases) {
        await completeVolleyball(page, opponent, playerScore, cpuScore, index === 1);
        console.log(dir, 'volleyball', opponent, playerScore + ':' + cpuScore, 'settled and returned home');
      }

  })));
});

test('second-continent volleyball completes and sends real rewards', { timeout: 120000 }, async t => {
  const server = createPreview();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.route(/^https?:\/\/[^/]+\//, route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
  await installVolleyballFixture(page);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin + '/rpg-continent2/?guest=1&sandbox=1', { waitUntil: 'domcontentloaded' });
  const fallback = page.locator('.adv-load-err [data-k="cont"]');
  try {
    await Promise.race([
      page.waitForFunction(() => assetBootReady, undefined, { timeout: 30000 }),
      fallback.waitFor({ timeout: 30000 }).then(async () => {
        const missing = await page.evaluate(() => ['common', 'chapter1', 'rpgBoot'].flatMap(group =>
          summarizeAssetGroup(group).criticalFailedPaths
        ));
        console.log('rpg-continent2 boot required the existing asset fallback for', missing);
        await fallback.click();
      }),
    ]);
    await waitForAdventureState(page, () => assetBootReady);
  } catch (error) {
    throw new Error('Second-continent boot failed: ' + (await page.locator('body').innerText()).slice(-1100) +
      '\\nPage errors: ' + errors.join('; '), { cause: error });
  }
  await page.evaluate(() => {
    advBootOpenHome({ ctx: { stageId: '1-2', levelIndex: 1, gameState: 'clear' } });
    playerInventory.unlockedRecipes[VB_CONFIG.recipeKey] = true;
    h2OpenPanel('volleyball');
  });
  await completeVolleyball(page, 'orange_king', 5, 0, false, null);
});

test('packaged volleyball playtest preserves and awards titles inside isolated storage', { timeout: 180000 }, async t => {
  const output = await mkdtemp(join(tmpdir(), 'volleyball-preview-'));
  t.after(() => rm(output, { recursive: true, force: true }));
  await build(output);
  const server = createPreview(output);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const outside = [];
  const productionKey = 'balloonV_inventory';
  page.on('request', req => {
    if (!req.url().startsWith(origin + '/' + previewDir + '/')) outside.push(req.url());
  });
  await installVolleyballFixture(page);
  await page.addInitScript(() => {
    if (window === window.top && location.pathname.endsWith('/playtest-volleyball-five-point-test-1/')) {
      localStorage.setItem('balloonV_inventory', 'production-sentinel');
    }
  });
  await page.goto(origin + '/' + previewDir + '/', { waitUntil: 'domcontentloaded' });
  await page.getByText('在小V之家試玩與結算').click();
  await page.locator('[data-vb-act="play"][data-op="scorpion"]').waitFor({ timeout: 90000 });
  await page.evaluate(() => {
    const d = achLoad();
    const def = C1U_TITLES.find(t => t.titleKey === 'adventure_volleyball_rookie');
    d.titles[def.titleKey] = { ...achTitleRecord(def, null), via: 'volleyball:scorpion:7-0' };
    achSave(d);
  });
  assert.equal((await completeVolleyball(page, 'scorpion', 5, 0, false, 'sandbox')).isNew, false);
  assert.equal((await completeVolleyball(page, 'orange', 5, 0, false, 'sandbox')).isNew, true);
  assert.equal((await completeVolleyball(page, 'orange_king', 5, 0, false, 'sandbox')).isNew, true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-vb-act="play"][data-op="scorpion"]').waitFor({ timeout: 90000 });
  const saved = await page.evaluate(() => Object.fromEntries(Object.entries(achLoad().titles).map(([key, record]) => [key, record.via])));
  assert.deepEqual(saved, {
    adventure_volleyball_rookie: 'volleyball:scorpion:7-0',
    adventure_volleyball_expert: 'volleyball:orange:5-0',
    adventure_volleyball_king: 'volleyball:orange_king:5-0',
  });
  assert.deepEqual(outside, []);
  await page.goto(origin + '/missing', { waitUntil: 'domcontentloaded' });
  assert.equal(await page.evaluate(key => localStorage.getItem(key), productionKey), 'production-sentinel');
});

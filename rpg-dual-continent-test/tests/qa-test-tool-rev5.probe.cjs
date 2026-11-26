const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = 'http://127.0.0.1:8412/rpg-dual-continent-test/';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
  const out = { isolation: {}, umbrella: {}, shortcuts: {}, rpg: {}, res: null, errors: [] };
  async function boot(q, ctx) {
    const page = await (ctx || await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    page.on('pageerror', e => out.errors.push(q + ': ' + e.message));
    await page.goto(base + 'index.html?' + q);
    await page.waitForFunction(() => typeof assetBootReady !== 'undefined' && assetBootReady, null, { timeout: 90000 });
    await page.waitForTimeout(800);
    return page;
  }
  for (const q of ['', 'guest=1&sandbox=1', 'devtools=1', 'guest=1&devtools=1', 'guest=1&sandbox=1&devtools=1']) {
    const page = await boot(q);
    out.isolation[q || '(none)'] = await page.locator('#qa-tool-btn').count();
    await page.close();
  }
  // RPG toggles + resources at the 3-4 start
  {
    const page = await boot('guest=1&sandbox=1&devtools=1&ch3test=start');
    await page.locator('#btn-start-gate-go').click();
    await page.waitForFunction(() => gameState === 'playing' && debugC34().ready, null, { timeout: 90000 });
    await page.evaluate(() => { if (rpgActive) rpgClose('skipped'); });
    await page.evaluate(() => { if (gameState === 'playing') pauseGame(); qaTestTool.open(); });
    for (const k of ['dice', 'wet', 'tree']) {
      await page.locator(`#qa-tool button[data-qa="read"][data-k="${k}"]`).click();
      const a = await page.evaluate(k => qaTestTool.RPG_ITEMS.find(i => i.key === k).ids.map(id => [id, rpgIsSeen(id), c34.taught.has(id)]), k);
      await page.locator(`#qa-tool button[data-qa="unread"][data-k="${k}"]`).click();
      const b = await page.evaluate(k => qaTestTool.RPG_ITEMS.find(i => i.key === k).ids.map(id => [id, rpgIsSeen(id), c34.taught.has(id)]), k);
      out.rpg[k] = { read: a, unread: b };
    }
    await page.locator('#qa-tool button[data-qa="mode"][data-k="off"]').click();
    out.rpg.mode = await page.evaluate(() => rpgGetMode());
    await page.locator('#qa-tool button[data-qa="mode"][data-k="first"]').click();
    await page.fill('#qa-tree-fail', '3'); await page.locator('#qa-tool button[data-qa="treefail"]').click();
    out.rpg.treeFailures = await page.evaluate(() => c34.treeFailures);
    for (const [k, v] of [['coins', 260], ['b260', 7], ['round', 4], ['bag', 2], ['hp', 1], ['umbrella', 3], ['dice', 2]]) await page.fill('#qa-res-' + k, String(v));
    await page.locator('#qa-tool button[data-qa="res-all"]').click();
    out.res = await page.evaluate(() => ({ coins: playerInventory.coins, b260: playerInventory.balloon260, round: playerInventory.roundBalloon, bag: playerInventory.bagLevel, hp: player.hp, umb: playerInventory.craftedItems.balloonUmbrella, dice: playerInventory.craftedItems.balloonDice }));
    await page.screenshot({ path: (process.env.REV5_EVIDENCE || '/tmp/qa') + '/E-panel.png' });
    // shortcuts
    const names = await page.evaluate(() => qaTestTool.SHORTCUTS.map(s => s.name));
    for (let i = 0; i < names.length; i++) {
      if (!await page.locator('#qa-tool.on').count()) await page.evaluate(() => { if (gameState === 'playing') pauseGame(); qaTestTool.open(); });
      await page.locator(`#qa-tool button[data-qa="go"][data-k="${i}"]`).click();
      const want = ['3-1', '3-2', '3-4', '3-4', '3-4', '3-4', '3-4'][i];
      await page.waitForFunction(w => advCurrentStageId() === w && gameState === 'playing' && !assetGateActive, want, { timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(1600);
      await page.evaluate(() => { if (rpgActive && rpgActive.id !== 'chapter3-treasure-invite') rpgClose('skipped'); });
      out.shortcuts[names[i]] = await page.evaluate(() => ({ stage: advCurrentStageId(), gs: gameState, x: Math.round(player.x), feet: Math.round(player.y + player.h), dog: bringBalloonDog, section: c34Is() ? debugC34().section : null, dice: v395Count('balloonDice') }));
      await page.screenshot({ path: `/tmp/qa/E-shortcut-${i}.png` });
    }
    await page.close();
  }
  // Umbrella scenarios
  for (const key of ['A', 'B', 'C', 'D', 'E']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await boot('guest=1&sandbox=1&devtools=1&ch3test=start', ctx);
    await page.evaluate(k => qaTestTool.loadUmbrellaScenario(k), key);
    await page.waitForFunction(() => typeof assetBootReady !== 'undefined' && assetBootReady, null, { timeout: 90000 });
    await page.waitForTimeout(800);
    await page.locator('#btn-start-gate-go').click();
    await page.waitForFunction(() => window.debugQaUmbrella, null, { timeout: 60000 }).catch(() => {});
    const r = await page.evaluate(() => ({ dbg: window.debugQaUmbrella, coins: playerInventory.coins, b260: playerInventory.balloon260, stage: advCurrentStageId() }));
    await page.waitForTimeout(600);
    await page.locator('#h2-nav-go').click().catch(() => {});
    await page.waitForTimeout(1800);
    r.after = await page.evaluate(() => ({ rpg: rpgActive && rpgActive.id, stage: advCurrentStageId(), gs: gameState, guide: document.body.classList.contains('umbrella-guide') }));
    await page.screenshot({ path: `/tmp/qa/E-umbrella-${key}.png` });
    out.umbrella[key] = r;
    await ctx.close();
  }
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();

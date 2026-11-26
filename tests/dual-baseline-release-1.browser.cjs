'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { mkdir } = require('node:fs/promises');
const { createPreview } = require('./preview-entry.cjs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

// Baseline Release 1: the same Revision 3/4/5 regression, run on the repo-root development build.
const path = '/rpg-dual-continent-test/index.html';

test('Dual baseline keeps the Revision 3/4/5 umbrella recovery, RPG, 3-4 and shared rules', { timeout: 180000 }, async t => {
  const server = createPreview();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
  t.after(() => browser.close());
  const origin = 'http://127.0.0.1:' + server.address().port;
  for (const touch of [false, true]) {
    await t.test(touch ? 'landscape touch' : 'desktop', async t => {
      const context = await browser.newContext({
        viewport: touch ? { width: 844, height: 390 } : { width: 1280, height: 820 }, hasTouch: touch, isMobile: touch, bypassCSP: true,
      });
      t.after(() => context.close());
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const press = locator => touch ? locator.tap() : locator.click();
      const start = async () => {
        await page.waitForFunction(() => assetBootReady);
        await press(page.locator('#btn-start-gate-go'));
        await page.waitForFunction(() => h2IsOpen() && c2Is31Clear());
      };
      const fixture = (coins, balloons, umbrella = 0) => page.evaluate(({ coins, balloons, umbrella }) => {
        playerInventory.coins = coins;
        playerInventory.balloon260 = balloons;
        playerInventory.unlockedRecipes.balloonUmbrella = true;
        playerInventory.craftedItems.balloonUmbrella = umbrella;
        delete c2Flow().umbrellaRescue;
        saveInventory();
        h2RenderAll();
        return c2UmbrellaPrep();
      }, { coins, balloons, umbrella });
      await page.goto(origin + path + '?guest=1&sandbox=1&devtools=1&ch3test=3-2');
      await start();
      assert.deepEqual(await page.evaluate(() => {
        const wet = rpgBuildScene('c34_first_wet');
        const dry = rpgBuildScene('c34_first_dry_wind');
        const umbrella = rpgBuildScene('c2_31_umbrella');
        const dice = rpgBuildScene('rpg007_recipe:balloonDice');
        return [wet.policy, dry.policy, wet.id !== dry.id, umbrella.pages.length,
          umbrella.firstReplayFrom, dice.firstReplayFrom, VB_CONFIG.targetScore];
      }), ['oncePerPlayer', 'oncePerPlayer', true, 2, 0, 1, 5]);
      assert.equal((await fixture(0, 0, 1)).ready, true);
      assert.equal((await fixture(0, 5)).craft, true);
      assert.equal((await fixture(11, 0)).rescue, true);
      assert.equal((await fixture(6, 0)).rescue, true);
      assert.deepEqual(await fixture(12, 0), { buy: true, have: 0, missing: 5, required: 5, quantity: 2, totalCost: 12 });
      const go = page.locator('#h2-nav-go');
      await press(go);
      const dialogue = page.locator('#rpg-overlay');
      const lines = [
        '小V！要前往下一關，需要一把氣球雨傘喔！',
        '可是你的 260 長條氣球只有 0 條，還差 5 條……',
        '右上角的商店可以購買氣球，快去補足吧！',
      ];
      for (const line of lines) {
        await page.waitForFunction(expected => document.querySelector('#rpg-overlay .rpg-text')?.textContent === expected, line);
        await press(dialogue.locator('.rpg-text'));
      }
      const pack = page.locator('[data-shop-row="b260Bundle"]');
      const purchase = pack.locator('[data-h2-act="buy395"]');
      await purchase.waitFor();
      assert.equal(await pack.locator('.h2-qty b').innerText(), '2');
      assert.match(await pack.innerText(), /合計 \$12/);
      await page.locator('#h2-panel-close').dispatchEvent('click');
      await pack.getByRole('button', { name: '增加數量' }).dispatchEvent('click');
      await page.keyboard.press('Escape');
      assert.equal(await pack.locator('.h2-qty b').innerText(), '2');
      const screenshot = async name => {
        if (!process.env.CH3_SCREENSHOTS) return;
        await mkdir(process.env.CH3_SCREENSHOTS, { recursive: true });
        await page.screenshot({ path: process.env.CH3_SCREENSHOTS + '/' + (touch ? 'touch-' : 'desktop-') + name + '.png' });
      };
      await screenshot('required-pack');
      await page.reload();
      await start();
      await purchase.waitFor();
      assert.equal(await pack.locator('.h2-qty b').innerText(), '2');
      assert.deepEqual(await page.evaluate(() => [playerInventory.coins, playerInventory.balloon260]), [12, 0]);
      await page.evaluate(() => {
        window.revision3Save = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key) {
          if (String(key).startsWith('balloonV_dev_ch3_inventory:')) throw new Error('Test transaction failure');
          return window.revision3Save.apply(this, arguments);
        };
      });
      await press(purchase);
      assert.deepEqual(await page.evaluate(() => [playerInventory.coins, playerInventory.balloon260]), [12, 0]);
      await page.evaluate(() => { Storage.prototype.setItem = window.revision3Save; });
      await page.waitForTimeout(500);
      await press(purchase);
      const craft = page.locator('[data-h2-act="craft"][data-key="balloonUmbrella"]');
      await craft.waitFor();
      const state = () => page.evaluate(() => [playerInventory.coins, playerInventory.balloon260,
        c2UmbrellaCount(), !!c2Flow().umbrellaRescue, !!c2Flow().umbrellaPurchaseGuide]);
      await craft.dispatchEvent('click');
      assert.deepEqual(await state(), [0, 6, 0, false, true]);
      await page.reload();
      await start();
      await craft.waitFor();
      await screenshot('required-craft');
      await press(craft);
      await page.waitForFunction(() => !document.body.classList.contains('umbrella-guide'));
      assert.deepEqual(await state(), [0, 1, 1, false, false]);
      await press(page.locator('#h2-panel-close'));
      await fixture(40, 0, 1);
      const openShop = page.locator('[data-h2-open="shop"]');
      if (!await openShop.isVisible()) await press(page.locator('[data-h2-toggle="shop"]'));
      await press(openShop);
      const roundBefore = await page.evaluate(() => playerInventory.roundBalloon);
      for (const [id, total] of [['b260Bundle', 12], ['roundBundle', 20]]) {
        const row = page.locator('[data-shop-row="' + id + '"]');
        await press(row.getByRole('button', { name: '增加數量' }));
        assert.match(await row.innerText(), new RegExp('合計 \\$' + total));
        await press(row.locator('[data-h2-act="buy395"]'));
      }
      assert.equal(await page.evaluate(() => playerInventory.coins), 8);
      assert.equal(await page.evaluate(() => playerInventory.balloon260), 6);
      assert.equal(await page.evaluate(() => playerInventory.roundBalloon), roundBefore + 8);
      assert.equal(await page.evaluate(() => playerInventory.shopLog.items.roundBundle), 2);
      await press(page.locator('#h2-panel-close'));
      await fixture(6, 0);
      await press(go);
      await page.waitForFunction(() => c2UmbrellaCount() === 1 && !!c2Flow().umbrellaRescue);
      assert.deepEqual(await state(), [6, 0, 1, true, false]);
      assert.deepEqual(errors, []);
    });
  }
  await t.test('tree chasm counts failed crossings independently', async () => {
    const page = await browser.newPage({ bypassCSP: true, viewport: { width: 1280, height: 820 } });
    try {
      await page.goto(origin + path + '?guest=1&sandbox=1&devtools=1&ch3test=start');
      await page.waitForFunction(() => assetBootReady);
      await page.locator('#btn-start-gate-go').click();
      await page.waitForFunction(() => !assetGateActive && gameState === 'playing' && c34Is());
      const result = await page.evaluate(() => {
        screenFreezeForTest = true;
        const { p1, p2, y, p3 } = C34_LAY;
        const on = p => player.onGround && player.x + player.w > p.x && player.x < p.x + p.w &&
          Math.abs(player.y + player.h - y(p.h)) < 2;
        function advance(limit, stop, { right = () => true, jump = false, attack = false } = {}) {
          const scenes = [];
          for (let tick = 0; tick < limit && !stop(); tick++) {
            if (rpgActive) { scenes.push(rpgActive.id); rpgClose('finished'); }
            if (gameState !== 'playing') break;
            keys.ArrowRight = right();
            keys.Space = jump && tick === 0;
            keys.KeyZ = attack;
            update(1);
          }
          keys.ArrowRight = keys.Space = keys.KeyZ = false;
          return scenes;
        }
        activeSlot = 'umbrella';
        advance(240, () => player.x >= 960);
        wdSetAngleIndex(WD_TUNING.angles.indexOf(60));
        advance(280, () => on(p1), { right: () => player.x < 1780 });
        advance(90, () => player.x >= p1.x + p1.w - player.w - 8);
        advance(80, () => player.onGround && player.x >= p2.x, { jump: true });
        const onTreePlatform = on(p2);
        activeSlot = 'sword';
        const scorpion = enemies.find(enemy => enemy.c2Id === 'P2-W1');
        advance(150, () => !scorpion.active, { attack: true, right: () => player.x < scorpion.x - 35 });
        const scorpionCleared = !scorpion.active;
        const hp = player.hp, wind = c34.noUmbrellaFalls, pitHits = c2Run.pitHits;
        const attempts = [];
        for (let i = 1; i <= 5; i++) {
          advance(80, () => player.x >= p2.x + p2.w - player.w - 8);
          advance(180, () => c34.treeFailures >= i, { jump: true, right: () => player.x < p2.x + p2.w + 48 });
          const hints = advance(40, () => false, { right: () => false }).filter(id => id.startsWith('c34_tree_gap_'));
          attempts.push({ count: c34.treeFailures, hp: player.hp, onTreePlatform: on(p2), hints });
        }
        activeSlot = 'hammer';
        const tree = breakableTrees.find(t => t.c34BaseDy);
        advance(120, () => tree.state !== 'standing', { attack: true });
        advance(120, () => tree.state === 'fallen', { right: () => false });
        advance(120, () => player.x >= p3.x + 25);
        return { onTreePlatform, scorpionCleared, attempts, hp, events: c34.log.slice(-30), x: player.x, y: player.y, sameWind: wind === c34.noUmbrellaFalls,
          samePits: pitHits === c2Run.pitHits, bridge: tree.state === 'fallen' && on(p3) };
      });
      if (result.attempts.some((attempt, i) => attempt.count !== i + 1)) t.diagnostic(JSON.stringify(result));
      assert.equal(result.onTreePlatform, true);
      assert.equal(result.scorpionCleared, true);
      assert.deepEqual(result.attempts, [1, 2, 3, 4, 5].map(count => ({
        count, hp: result.hp, onTreePlatform: true, hints: count === 2 || count === 4 ? ['c34_tree_gap_' + count] : [],
      })));
      assert.equal(result.sameWind, true);
      assert.equal(result.samePits, true);
      assert.equal(result.bridge, true);
    } finally { await page.close(); }
  });

  // ── Revision 5 Batch A (both continents), B (3-2 wind scorpion) and D (pause background) ──
  const c1 = '/rpg-continent1-universe/index.html';
  await t.test('Batch A: shared rules on both continents', async () => {
    for (const entry of [path, c1]) {
      const page = await browser.newPage({ bypassCSP: true, viewport: { width: 1280, height: 820 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      try {
        await page.goto(origin + entry + '?guest=1&sandbox=1&devtools=1' + (entry === path ? '&ch3test=3-2' : ''));
        await page.waitForFunction(() => assetBootReady);
        const r = await page.evaluate(() => {
          const inv = playerInventory;
          inv.unlockedRecipes = Object.assign({}, inv.unlockedRecipes, { balloonDice: true, balloonUmbrella: true });
          inv.craftedItems = Object.assign({}, inv.craftedItems, { balloonDice: 1 });
          inv.bagLevel = 1;
          const lv1 = { umbrella: v395Cap('balloonUmbrella'), dice: v395Cap('balloonDice') };
          inv.bagLevel = 2;
          const lv2 = { umbrella: v395Cap('balloonUmbrella'), dice: v395Cap('balloonDice') };
          inv.bagLevel = 1;
          // A-02: stock above the new cap is kept, never confiscated.
          inv.craftedItems.balloonUmbrella = 5; saveInventory();
          const keptOverCap = JSON.parse(JSON.stringify(inv)).craftedItems.balloonUmbrella;
          const craftBlocked = craftItem('balloonUmbrella') === false && inv.craftedItems.balloonUmbrella === 5;
          inv.craftedItems.balloonUmbrella = 1;
          // A-06: up to what the coins can pay and the bag can hold.
          inv.coins = 13;
          const shopIds = (typeof V395_SHOP !== 'undefined' ? V395_SHOP.map(i => i.id) : []).filter(id => id === 'b260Bundle');
          const room = shopIds.map(id => ({ id, room: h2ShopRoom(id), carry: h2ShopCarryRoom(id), afford: h2ShopAffordable(id) }));
          inv.items = Object.assign({}, inv.items, { bandage: 0 });
          inv.coins = 0;
          const broke = h2ShopRoom('bandage');
          return {
            lv1, lv2, keptOverCap, craftBlocked, room, broke,
            firstAid: SHOP_ITEMS.firstAidKit.description,
            shopTabs: H2_SHOP_TABS.map(([id]) => id),
            bagTab: H2_BAG_TABS[0][1],
            diceRow: h2DiceBagRowHtml().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '),
          };
        });
        assert.deepEqual(r.lv1, { umbrella: 2, dice: 1 }, entry);
        assert.deepEqual(r.lv2, { umbrella: 4, dice: 2 }, entry);
        assert.equal(r.keptOverCap, 5);
        assert.equal(r.craftBlocked, true);
        assert.equal(r.firstAid, '使用後直接補滿生命。');
        assert.deepEqual(r.shopTabs, ['items']);
        assert.equal(r.bagTab, '武器・裝備');
        assert.match(r.diceRow, /氣球骰子.*持有 1 \/ 上限 1/);
        assert.equal(r.broke, 0);
        for (const x of r.room) assert.equal(x.room, Math.min(x.carry, x.afford));
        // A-07: no free LV2 test button anywhere on Continent 1 (or 2).
        const html = await page.content();
        assert.doesNotMatch(html, /data-h2-act="(bagLv1|bagLv2)"|免費升級 LV2|LV2（測試）/);
        assert.deepEqual(errors, []);
      } finally { await page.close(); }
    }
  });

  await t.test('Batch A-04/D-01: pause HP updates at once and Continent 2 uses Wind Canyon scenery', async () => {
    const page = await browser.newPage({ bypassCSP: true, viewport: { width: 1280, height: 820 } });
    try {
      await page.goto(origin + path + '?guest=1&sandbox=1&devtools=1&ch3test=start');
      await page.waitForFunction(() => assetBootReady);
      await page.locator('#btn-start-gate-go').click();
      await page.waitForFunction(() => !assetGateActive && gameState === 'playing' && c34Is());
      const r = await page.evaluate(() => {
        if (rpgActive) rpgClose('skipped');
        ensureInventoryItems(); playerInventory.items.bandage = 2;
        player.hp = 1;
        pauseGame();
        const hearts = () => document.getElementById('p2-hearts').innerHTML;
        const before = hearts();
        useHealingItem('bandage');
        return { before, after: hearts(), hp: player.hp };
      });
      // The background image is applied once it has loaded.
      await page.waitForFunction(() => /window_continent_02\.png/.test(getComputedStyle(document.documentElement).getPropertyValue('--h2-img-continent')), undefined, { timeout: 15000 });
      r.bg = await page.evaluate(() => getComputedStyle(document.querySelector('.p2-bg')).backgroundImage);
      assert.ok(r.hp > 1);
      assert.notEqual(r.after, r.before, 'hearts redrawn without reopening the pause menu');
      assert.match(r.bg, /window_continent_02\.png/);
    } finally { await page.close(); }
  });

  await t.test('Batch B: 3-2 opening scorpion and wind-blade lifecycle', async () => {
    const page = await browser.newPage({ bypassCSP: true, viewport: { width: 1280, height: 820 } });
    try {
      await page.goto(origin + path + '?guest=1&sandbox=1&devtools=1&ch3test=start');
      await page.waitForFunction(() => assetBootReady);
      await page.locator('#btn-start-gate-go').click();
      await page.waitForFunction(() => !assetGateActive && gameState === 'playing' && c34Is());
      await page.evaluate(() => { if (rpgActive) rpgClose('skipped'); c34Start('3-2', 'dev', 'start'); });
      await page.waitForFunction(() => advCurrentStageId() === '3-2' && gameState === 'playing' && !assetGateActive);
      const r = await page.evaluate(async () => {
        if (rpgActive) rpgClose('skipped');
        const a1 = enemies.find(e => e.c2Id === 'A1');
        player.x = 1700; player.y = GROUND_Y - player.h;
        const guard = setInterval(() => { player.invincible = Math.max(player.invincible, 2); if (rpgActive) rpgClose('skipped'); }, 30);
        // Keep the whole flight on screen (blades leaving the view are culled by the existing rule) and
        // the player out of its path; the lifecycle, not the aim, is under test.
        const keepCamera = updateCamera; globalThis.updateCamera = () => { cameraX = 520; };
        const blade = wsFire(a1);
        blade.vx = Math.abs(Math.hypot(blade.vx, blade.vy)); blade.vy = 0; blade.ang = 0;
        a1.active = false; a1.dead = true;   // the shooter is gone right after firing
        const samples = [];
        await new Promise(done => {
          const step = () => {
            const alive = wsBlades.includes(blade);
            samples.push({ dist: Math.round(blade.dist * 10) / 10, alpha: Math.round(wsBladeAlpha(blade) * 1000) / 1000, alive });
            if (!alive || samples.length > 400) done(); else requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
        clearInterval(guard); globalThis.updateCamera = keepCamera;
        return { a1: { x: Math.round(a1.x), kind: a1.attack || a1.kind || null }, spawnX: 100, samples, tuning: { range: WS_TUNING.normalRange, fade: WS_TUNING.fadeStartRatio, speed: WS_TUNING.bladeSpeed, hitMin: WS_TUNING.hitMinAlpha },
          bigAlpha: wsBladeAlpha({ big: true, dist: 2000 }), lateAlpha: wsBladeAlpha({ dist: 470 }),
          end: (typeof wsLog !== 'undefined' ? wsLog : []).filter(e => e.id === blade.id).slice(-2) };
      });
      assert.ok(Math.abs(r.a1.x - 700) < 80, 'A1 patrols the empty opening: ' + r.a1.x);
      const alive = r.samples.filter(s => s.alive);
      assert.ok(alive.length > 60, 'blade keeps flying after the shooter is gone: ' + JSON.stringify({ n: alive.length, last: alive.at(-1), end: r.end }));
      const last = alive.at(-1);
      assert.ok(last.dist <= r.tuning.range && last.dist > r.tuning.range - 10, 'ends at the range: ' + last.dist);
      assert.ok(alive.filter(s => s.dist <= r.tuning.range * r.tuning.fade).every(s => s.alpha === 1));
      for (let i = 1; i < alive.length; i++) assert.ok(alive[i].alpha <= alive[i - 1].alpha + 1e-9, 'fade never goes back up');
      assert.ok(last.alpha < 0.05);
      assert.ok(r.lateAlpha < r.tuning.hitMin, 'a nearly gone blade no longer hits');
      assert.equal(r.bigAlpha, 1, 'armored blades unchanged');
      assert.equal(r.tuning.speed, 3.4);
    } finally { await page.close(); }
  });
});


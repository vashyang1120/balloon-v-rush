'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { mkdir } = require('node:fs/promises');
const { createPreview } = require('./preview-entry.cjs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const path = '/playtest-adventure-cross-continent-recovery-rev4/rpg-dual-continent-test/index.html';

test('Revision 4 keeps the Revision 3 umbrella recovery, RPG and 3-4 gap rules', { timeout: 180000 }, async t => {
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
});

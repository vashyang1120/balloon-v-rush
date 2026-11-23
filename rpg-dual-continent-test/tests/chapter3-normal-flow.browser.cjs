'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { setTimeout: delay } = require('node:timers/promises');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { serveCheckout } = require('./chapter3-static-fixture.cjs');

const origin = 'https://vashyang1120.github.io';
const cdn = 'https://rawcdn.githack.com';
const cdnPath = '/vashyang1120/balloon-v-rush/test-fixture';
const pagesPrefix = '/balloon-v-rush/playtest-adventure-v0.4.13-test-4';
const entry = cdn + cdnPath + '/playtest-balloon-dice-v2-test-3/rpg-dual-continent-test/?ch3test=3-4';
const keys = { left: 'ArrowLeft', right: 'ArrowRight', jump: 'Space', attack: 'z' };
const weaponKeys = { sword: 'Digit1', hammer: 'Digit2', umbrella: 'Digit3' };

for (const mode of ['keyboard', 'touch'].filter(mode => !process.env.CH3_INPUT || process.env.CH3_INPUT === mode)) {
test('3-4 ' + mode + ' adventure from crafting to reloaded settlement', { timeout: 200000 }, async t => {
  const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
  t.after(() => browser.close());
  const mobile = mode === 'touch';
  const context = await browser.newContext(mobile
    ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }
    : { viewport: { width: 1280, height: 820 } });
  await context.route('**/*', route => {
    if (route.request().url().startsWith(cdn + cdnPath + '/')) return serveCheckout(route, cdn, cdnPath);
    return serveCheckout(route, origin, pagesPrefix, { 'access-control-allow-origin': '*' });
  });
  const page = await context.newPage();
  const cdp = mobile ? await context.newCDPSession(page) : null;
  const activate = locator => mobile ? locator.tap({ timeout: 5000 }) : locator.click({ timeout: 5000 });
  async function nextDialogue() {
    if (!mobile) return page.keyboard.press('Enter');
    const next = page.locator('#rpg-overlay.rpg--show [data-act="next"]:visible');
    if (!await next.isVisible()) return;
    const box = await next.boundingBox();
    if (!box) return;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart',
      touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  async function choose(tool, current) {
    if (!mobile) return page.keyboard.press(weaponKeys[tool]);
    const selector = tool === 'umbrella' || current === 'umbrella' ? '#btn-switch-tool' : '#btn-switch-weapon';
    try {
      await page.locator(selector).tap({ timeout: 650 });
    } catch (error) {
      if (!await page.locator('#rpg-overlay.rpg--show').isVisible()) throw error;
    }
  }
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const held = new Set();
  async function input(actions) {
    if (mobile) {
      if (actions.length === held.size && actions.every(action => held.has(action))) return;
      if (held.size) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      held.clear();
      if (actions.length) {
        const touchPoints = await Promise.all(actions.map(async (action, id) => {
          const box = await page.locator('#btn-' + action).boundingBox();
          assert.ok(box && box.width > 0, 'touch control visible: ' + action);
          return { id, x: box.x + box.width / 2, y: box.y + box.height / 2 };
        }));
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints });
        actions.forEach(action => held.add(action));
      }
      return;
    }
    for (const action of held) {
      if (!actions.includes(action)) {
        await page.keyboard.up(keys[action]);
        held.delete(action);
      }
    }
    for (const action of actions) {
      if (!held.has(action)) {
        await page.keyboard.down(keys[action]);
        held.add(action);
      }
    }
  }
  const read = () => page.evaluate(() => ({
    x: player.x, y: player.y, w: player.w, h: player.h, ground: player.onGround,
    hp: player.hp, slot: activeSlot, state: gameState, dialog: rpgActive?.id || null,
    wet: c34.wet, fill: c34.level, swim: c34.swim, climb: !!c34.climb,
    filling: !!c34.poolImpact, facingRight: player.facingRight,
    angle: wd.ang, hammer: equippedHammer.id, hit: wd.hitBoxes, anglePad: wdPadHitRect(),
    layout: C34_LAY, floor: GROUND_Y, tree: breakableTrees[0]?.state,
    pad: platforms.find(p => p.c34Pad), dog: bringBalloonDog,
    reflected: wsBlades.some(b => b.owner?.c2Id === 'BANK-W1' && b.st === 'reflect'),
    bankWind: enemies.find(e => e.c2Id === 'BANK-W1')?.active,
    coins: playerInventory.coins, long: playerInventory.balloon260, round: playerInventory.roundBalloon,
    dice: v395Count('balloonDice'), done: c2Proto.done,
    chest: diceRewardAttempt.claims.has('3-4:high-bank'), pending: diceRewardAttempt.coins,
    cleared: !!c2Flow().stage34?.claimed,
  }));
  async function advance(label, reached, controls = [], tool = null, seconds = 15) {
    const end = Date.now() + seconds * 1000;
    let state;
    while (Date.now() < end) {
      state = await read();
      if (reached(state)) {
        await input([]);
        t.diagnostic(label + ' · x=' + Math.round(state.x) + ' · y=' + Math.round(state.y) +
          ' · ' + state.slot + ' · HP=' + state.hp + ' · wet=' + state.wet);
        return state;
      }
      if (['failed', 'gameover'].includes(state.state)) break;
      if (await page.locator('#rpg-overlay [data-act="dice-decline"]').isVisible()) {
        await input([]);
        await activate(page.locator('#rpg-overlay [data-act="dice-decline"]'));
      } else if (state.dialog) {
        await input([]);
        await nextDialogue();
        await delay(190);
      } else if (tool && state.slot !== tool) {
        await input([]);
        await choose(tool, state.slot);
        await delay(65);
      } else {
        await input(typeof controls === 'function' ? controls(state) : controls);
        await delay(25);
      }
    }
    await input([]);
    if (process.env.CH3_SCREENSHOTS) await page.screenshot({ path: process.env.CH3_SCREENSHOTS + '/normal-flow-' + mode + '-failure.png' });
    assert.fail(label + ': ' + JSON.stringify(state));
  }

  await page.goto(entry);
  await page.locator('#btn-start-gate-go').waitFor({ timeout: 30000 });
  await activate(page.locator('#btn-start-gate-go'));
  await page.locator('#h2-nav-go').waitFor({ timeout: 30000 });
  const beforeCraft = await read();
  await activate(page.locator('#h2-title-recipes'));
  await activate(page.locator('.h2-more').filter({ hasText: '打開氣球秘笈' }));
  await activate(page.locator('button[data-h2-act="craft"][data-key="balloonDice"]'));
  const crafted = await read();
  assert.deepEqual([crafted.dice, crafted.long, crafted.round], [1, beforeCraft.long - 3, beforeCraft.round - 1]);
  await activate(page.locator('#h2-panel-close'));
  await activate(page.locator('[data-h2-act="bringDog"]'));
  await activate(page.locator('#h2-nav-go'));
  const initial = await advance('stage start', s => s.state === 'playing', []);
  assert.ok(initial.x < 620 && initial.hammer && initial.dog);
  assert.equal(await page.evaluate(() => adventureTestLoadoutActive || c2UmbTest.active), false);
  assert.equal(await page.evaluate(() => {
    const waterfall = c34Art.image('01_waterfall_main', 0);
    const umbrella = umbImgs.idle;
    return [waterfall, umbrella].every(img => img?.crossOrigin === 'anonymous' && img.src.startsWith(adventurePlaytestAssetRoot));
  }), true);
  const L = initial.layout;
  const onTop = (s, x, w, y) => s.ground && s.x + s.w > x &&
    s.x < x + w && Math.abs(s.y + s.h - y) < 3;
  const onMesa = (s, mesa) => onTop(s, mesa.x, mesa.w, initial.floor - mesa.h);
  const jumpRight = () => {
    let airborne = false;
    return state => {
      airborne ||= !state.ground;
      return airborne ? ['right'] : ['jump', 'right'];
    };
  };

  const beyondFirstFall = await advance('first waterfall', s => s.x > 660, ['right'], 'umbrella');
  assert.equal(beyondFirstFall.wet, 0);
  await advance('hammer pad', s => s.x >= s.anglePad.x - 47, ['right'], 'hammer');
  await advance('60 degree launcher', s => s.angle === 60, ['attack'], 'hammer');
  await advance('first mesa', s => onMesa(s, L.p1), s => s.x < 1760 ? ['right'] : [], 'umbrella');
  await advance('first mesa edge', s => s.x >= L.p1.x + L.p1.w - s.w - 10, ['right'], 'umbrella');
  await advance('second mesa', s => onMesa(s, L.p2), jumpRight(), 'umbrella');
  await advance('tree hit', s => s.tree !== 'standing' || s.x >= L.tree.x - 28, ['right', 'attack'], 'hammer');
  await advance('fallen tree', s => s.tree === 'fallen', ['attack'], 'hammer');
  await advance('rock pillar', s => onMesa(s, L.p3) && s.x >= L.p3.x + 70, ['right', 'attack'], 'hammer');
  await advance('canyon top', s => onMesa(s, L.ct), jumpRight(), 'umbrella');
  await advance('upper enemy path', s => s.x >= L.ct.x + 440, ['right', 'attack'], 'sword');
  await advance('second waterfall approach', s => s.x >= L.fallX - 77, ['right'], 'umbrella');
  await advance('filled and dried', s => s.fill === 1 && s.wet === 0, s => {
    if (s.filling) return [];
    return s.x >= L.fallX - 40 ? ['left'] : ['right'];
  }, 'umbrella', 42);
  await advance('swimming', s => s.swim, ['right'], 'umbrella');
  await advance('climbing the floating pad', s => s.climb, ['right'], 'umbrella');
  await advance('on the floating pad', s => s.pad && onTop(s, s.pad.x, s.pad.w, s.pad.y), [], 'umbrella');
  await advance('dried on the floating pad', s => s.wet === 0, [], 'umbrella', 25);
  await advance('right bank', s => onMesa(s, L.bank), s => {
    if (s.climb) return [];
    if (s.swim) return ['left'];
    if (!s.ground || !onTop(s, s.pad.x, s.pad.w, s.pad.y)) return ['right'];
    if (s.wet > 0) return []; // After a missed jump, wait for full jump height again.
    return s.x >= s.pad.x + s.pad.w - 33 ? ['right', 'jump'] : ['right'];
  }, 'umbrella', 50);
  await advance('wind blade blocked', s => s.reflected, ['attack'], 'umbrella', 20);
  await advance('bank enemy approach', s => s.x >= L.bank.x + 335, ['right'], 'sword');
  await advance('bank enemy defeated', s => !s.bankWind, ['attack'], 'sword');

  const accept = page.locator('#rpg-overlay [data-act="dice-accept"]');
  const deadline = Date.now() + 15000;
  while (!await accept.isVisible() && Date.now() < deadline) {
    if ((await read()).dialog) {
      await input([]);
      await nextDialogue();
      await delay(180);
    } else {
      await input(['right']);
      await delay(25);
    }
  }
  await input([]);
  const beforeRoll = await read();
  await activate(accept);
  const resume = page.getByRole('button', { name: '繼續冒險', exact: true });
  await resume.waitFor({ timeout: 15000 });
  await activate(resume);
  const awarded = await read();
  assert.equal(awarded.chest, true);
  const chestCoins = awarded.pending - beforeRoll.pending;
  assert.ok([50, 100, 200].includes(chestCoins));
  assert.equal(awarded.coins, beforeRoll.coins);
  assert.equal(awarded.dice, 0);
  await advance('clear', s => s.done, ['right', 'attack'], 'sword');
  await page.locator('#h2-nav-go').waitFor({ timeout: 15000 });
  const home = await read();
  assert.ok(home.cleared && home.coins >= awarded.coins + awarded.pending);
  await page.reload();
  await activate(page.locator('#btn-start-gate-go'));
  await page.locator('#h2-nav-go').waitFor({ timeout: 15000 });
  const reloaded = await read();
  assert.deepEqual([reloaded.coins, reloaded.long, reloaded.round, reloaded.dice, reloaded.cleared],
    [home.coins, home.long, home.round, home.dice, home.cleared]);
  assert.deepEqual(errors, []);
});
}

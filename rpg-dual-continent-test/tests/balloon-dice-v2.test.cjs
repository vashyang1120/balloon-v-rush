'use strict';
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../chapter3-treasure-dice.js');
const read = name => readFileSync(resolve(__dirname, '..', name), 'utf8');
const main = read('main.js');
const interaction = read('chapter3-treasure-interaction.js');
const source = (start, end) => {
  const from = main.indexOf(start);
  const to = main.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from);
  return main.slice(from, to);
};

function game(stage = '3-4') {
  let durable;
  const snapshot = { coins: 100, craftedItems: { balloonDice: 2 }, balloonDiceSpent: 0 };
  const env = {
    stage, stageSnapshot: structuredClone(snapshot), levelStartSnapshot: structuredClone(snapshot),
    playerInventory: { coins: 100, craftedItems: { balloonDice: 2 }, unlockedRecipes: {},
      chapter3Chests: { '3-4:high-bank': { coins: 200 } } },
    player: { x: 0, y: 0, w: 60, h: 80, coinsCollected: 0 },
    currentRunStats: { coins: 0 },
    coins: [], balloons260: [], chapter3TreasureDice: rules, assetGateActive: false,
    GROUND_Y: 460, C34_LAY: { bank: { x: 3862, h: 705 }, y: h => 460 - h },
    CONFIG: { COIN_R: 10 }, V395_BUNDLE: { coinBag: 10 }, bringBalloonDog: true,
    gameState: 'playing', rpgActive: null, writeFails: false, showHint() {}, spawnTreasurePickupEffect() {},
    advNoteExplore() {}, advNoteCollect() {}, sfxPlay() {}, advGuardWrite() {},
    rpgOpen(scene) { env.rpgActive = scene; return true; },
    advCurrentStageId: () => env.stage,
    v395Count: () => env.playerInventory.craftedItems.balloonDice,
    saveInventory(record) {
      if (env.writeFails) return false;
      durable = structuredClone(record ?? env.playerInventory);
      return true;
    },
    durable: () => durable,
    rectsOverlap: (a,b,w,h,x,y,i,j) => a < x+i && a+w > x && b < y+j && b+h > y,
  };
  vm.createContext(env);
  vm.runInContext(interaction + '\n' +
    source('function v395PickupStep()', '// ── HUD：盾牌') +
    source('function checkCollectibles()', '  balloons260.forEach') + '\n}', env);
  return env;
}

test('all bag outcomes share the original dice rules', () => {
  for (const [roll, result, amount] of [[null,'declined',10], [{player:6,spirit:1},'win',20],
    [{player:1,spirit:6},'loss',5], [{player:3,spirit:3},'tie',10]]) {
    assert.deepEqual(rules.payoutCoins(10, roll), { outcome: result, coins: amount });
    for (const tier of Object.keys(rules.tiers)) {
      assert.deepEqual(rules.payoutCoins(rules.tiers[tier], roll), rules.payout(tier, roll));
    }
  }
});

test('all hidden chests require a dog, ignore legacy flags, and reappear on a new attempt', () => {
  for (const [stage, base] of [['2-2',40],['3-1',40],['3-3',60],['3-4',100]]) {
    const e = game(stage);
    const chest = e.unclaimedChapter3Treasure(stage);
    Object.assign(e.player, { x: chest.x - 20, y: chest.y - 20 });
    e.bringBalloonDog = false;
    e.checkChapter3Treasure();
    assert.equal(e.rpgActive, null);
    assert.equal(e.ch3TreasureClaim(chest, null), null);
    e.bringBalloonDog = true;
    e.checkChapter3Treasure();
    assert.match(e.rpgActive.pages[0].text, /寶箱/);
    e.rpgActive = null;
    e.playerInventory.craftedItems.balloonDice = 0;
    e.checkChapter3Treasure();
    e.checkChapter3Treasure();
    assert.equal(e.currentRunStats.coins, base);
    assert.equal(e.playerInventory.coins, 100);
    assert.equal(e.unclaimedChapter3Treasure(stage), undefined);
    e.resetDiceRewardAttempt();
    assert.equal(e.unclaimedChapter3Treasure(stage).id, chest.id);
    e.checkChapter3Treasure();
    e.commitDiceRewardCoins();
    e.commitDiceRewardCoins();
    assert.equal(e.playerInventory.coins, 100 + base);
  }
});

test('bags invite without dogs and ordinary coins still grant exactly one', () => {
  for (const stage of ['1-3','2-1','3-1','3-4']) {
    const e = game(stage);
    e.bringBalloonDog = false;
    const bag = { advId: stage + '#c-bag', v395Kind: 'coinBag', x: 10, y: 10 };
    e.coins = [bag, { x: 15, y: 15 }];
    e.v395PickupStep();
    assert.match(e.rpgActive.pages[0].text, /金幣包/);
    e.checkCollectibles();
    assert.equal(e.currentRunStats.coins, 1);
    assert.equal(bag.collected, undefined);
    e.rpgActive = null;
    e.playerInventory.craftedItems.balloonDice = 0;
    e.v395PickupStep();
    e.v395PickupStep();
    e.checkCollectibles();
    assert.equal(e.currentRunStats.coins, 11);
    assert.equal(e.playerInventory.coins, 101);
    e.commitDiceRewardCoins();
    assert.equal(e.playerInventory.coins, 111);
  }
});

test('failed save, duplicate decision, defeat and stale guard restore keep debit and gold separate', () => {
  for (const isBag of [true, false]) {
    const e = game();
    const source = isBag ? { id: 'bag', coins: 10, coin: {} } : e.unclaimedChapter3Treasure('3-4');
    const losing = { player: 1, spirit: 6 };
    e.playerInventory.coins = 107;
    e.writeFails = true;
    assert.equal(e.ch3TreasureClaim(source, losing), null);
    assert.equal(e.v395Count(), 2);
    assert.equal(e.currentRunStats.coins, 0);
    e.writeFails = false;
    assert.equal(e.ch3TreasureClaim(source, losing).coins, isBag ? 5 : 50);
    assert.equal(e.ch3TreasureClaim(source, losing), null);
    assert.equal(e.v395Count(), 1);
    assert.equal(e.durable().coins, 100);
    assert.equal(e.durable().craftedItems.balloonDice, 1);
    assert.equal(e.restoreDiceCount(e.stageSnapshot, e.durable()), 1);
    assert.equal(e.restoreDiceCount(e.levelStartSnapshot, e.playerInventory), 1);
    e.resetDiceRewardAttempt();
    e.commitDiceRewardCoins();
    assert.equal(e.playerInventory.coins, 107);
    assert.equal(e.ch3TreasureClaim(source, null).coins, isBag ? 10 : 100);
    assert.equal(e.v395Count(), 1);
  }
});

test('the discovery scene contains only the three approved lines and is watched once', () => {
  const env = {
    RPG_TEXT: {}, RPG_FIND_NAMES: { recipe: '氣球秘笈' },
  };
  vm.createContext(env);
  vm.runInContext(source('const RPG_RECIPE_LINES =', '// 008：') +
    'function scene(kind, key, id) {\n' +
    source('    const nm = RPG_FIND_NAMES', '    const next = kind') + '\n}', env);
  const scene = env.scene('recipe', 'balloonDice', 'rpg020_find:recipe:balloonDice');
  assert.equal(scene.policy, 'oncePerPlayer');
  assert.equal(scene.oneClick, true);
  assert.equal(scene.next, 'rpg007_recipe:balloonDice');
  const pages = [...scene.pages, ...vm.runInContext('RPG_RECIPE_LINES.balloonDice', env)];
  assert.deepEqual(JSON.parse(JSON.stringify(pages.map(p => [p.sp,p.face,p.text]))), [
    ['balloonv','balloonv_surprised','咦？這裡竟然藏著一本氣球秘笈！'],
    ['balloonv','balloonv_thinking','氣球骰子？原來用氣球也能做出骰子啊！'],
    ['balloonv','balloonv_thinking','可是氣球骰子可以做什麼呢？'],
  ]);
});

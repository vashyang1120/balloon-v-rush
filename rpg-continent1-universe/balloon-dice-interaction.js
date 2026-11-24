'use strict';

const DICE_ART = 'assets/adventure/ui/items/';
const DICE_RECIPE = 'balloonDice';
const diceImages = new Map();
let diceRewardAttempt = { claims: new Set(), coins: 0 };

function installBalloonDiceItems() {
  RECIPES.push({
    id: DICE_RECIPE, unlockKey: DICE_RECIPE, name: '氣球骰子',
    effect: '帶著氣球骰子，遇到金幣包或隱藏寶箱時，發揮你的強運，帶走更多金幣吧！',
    cost: { balloon260: 3, roundBalloon: 1 }, emoji: '🎲',
  });
  V395_BAG.caps.balloonDice = 1;
  H2_ICON.balloonDice = { path: DICE_ART + 'item_balloon_dice.png', emoji: '🎲' };
}

function diceImage(name) {
  if (!diceImages.has(name)) {
    const img = new Image();
    img.src = resolveAdventureAssetSrc(DICE_ART + name);
    diceImages.set(name, img);
  }
  const img = diceImages.get(name);
  return img.complete && img.naturalWidth ? img : null;
}

function resetDiceRewardAttempt() {
  closeDiceChoice();
  diceRewardAttempt = { claims: new Set(), coins: 0 };
}

function commitDiceRewardCoins() {
  playerInventory.coins += diceRewardAttempt.coins;
  diceRewardAttempt.coins = 0;
}

function diceSpentTotal(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function restoreDiceCount(snapshot, inventory) {
  const spentAfterSnapshot = Math.max(0, diceSpentTotal(inventory.balloonDiceSpent) -
    diceSpentTotal(snapshot.balloonDiceSpent));
  return Math.max(0, (snapshot.craftedItems?.balloonDice || 0) - spentAfterSnapshot);
}

function spendDiceForReward() {
  if (!levelStartSnapshot || v395Count(DICE_RECIPE) < 1) return false;
  const craftedItems = { ...playerInventory.craftedItems, [DICE_RECIPE]: v395Count(DICE_RECIPE) - 1 };
  const balloonDiceSpent = diceSpentTotal(playerInventory.balloonDiceSpent) + 1;
  // Persist the debit with the pre-attempt balances, including in an isolated stage slot.
  if (!saveInventory({
    ...playerInventory, craftedItems, balloonDiceSpent,
    coins: levelStartSnapshot.coins,
  })) return false;
  Object.assign(playerInventory, { craftedItems, balloonDiceSpent });
  levelStartSnapshot.craftedItems[DICE_RECIPE] =
    Math.max(0, (levelStartSnapshot.craftedItems[DICE_RECIPE] || 0) - 1);
  levelStartSnapshot.balloonDiceSpent = balloonDiceSpent;
  advGuardWrite('dice-spend');
  return true;
}

function claimDiceReward(source, rolls) {
  if (diceRewardAttempt.claims.has(source.id) || (source.chest && !bringBalloonDog)) return null;
  const base = source.coins;
  const result = balloonDice.payoutCoins(base, rolls);
  if (rolls && !spendDiceForReward()) return null;
  diceRewardAttempt.claims.add(source.id);
  diceRewardAttempt.coins += result.coins;
  currentRunStats.coins += result.coins;
  player.coinsCollected += result.coins;
  if (source.coin) {
    source.coin.collected = true;
    advNoteCollect('coin', source.coin);
    sfxPlay('coinPickup');
    showHint('💰 金幣袋！冒險金幣 +' + result.coins, 110);
  } else {
    source.chest.found = true;
    currentRunStats.foundHiddenTreasure = true;
    currentRunStats.pendingCoins = result.coins;
    advNoteExplore(source.chest);
    currentRunStats.foundTreasureCoins = (currentRunStats.foundTreasureCoins || 0) + result.coins;
    if (!currentRunStats.foundHiddenTreasureName) currentRunStats.foundHiddenTreasureName = '金幣寶箱';
    spawnTreasurePickupEffect('獲得金幣寶箱！', '金幣 +' + result.coins);
  }
  return result;
}

const DICE_CHOICE_ACTIONS = [{ action: 'dice-accept', label: '是' }, { action: 'dice-decline', label: '否' }];
const DICE_RESULT_FACES = {
  win: ['balloonv_happy', 'star_spirit_angry_02', '哇！你贏了！金幣加倍送給你！'],
  loss: ['balloonv_panic', 'star_spirit_happy', '嘿嘿！這次是我贏了！'],
  tie: ['balloonv_thinking', 'star_spirit_mysterious', '咦！居然一樣大耶！'],
};

function offerDiceReward(source) {
  if (gameState !== 'playing' || assetGateActive || rpgActive) return;
  if (v395Count(DICE_RECIPE) < 1) {
    if (claimDiceReward(source, null) && source.chest) sfxPlay('secretDiscovered');
    return;
  }
  diceImage('dice_face_blank.png');
  const attempt = diceRewardAttempt;
  const choice = { sp: 'balloonv', face: 'balloonv_thinking', right: null, text: '要不要挑戰呢...', instant: true, options: DICE_CHOICE_ACTIONS };
  const scene = {
    id: 'balloon-dice-invite', title: '氣球骰子', repeatable: true, requirePages: true,
    pages: [
      { sp: 'spirit', face: 'star_spirit_mysterious', text: '哇！是一個' + (source.coin ? '金幣包' : '寶箱') + '耶！小V，要不要跟我比比看誰的骰子點數比較大？' },
      { sp: 'spirit', face: 'star_spirit_happy', text: '你贏，我給你兩倍金幣。\n你輸，我給你一半金幣。\n如果平手，我給你原本的金幣。' },
      choice,
    ],
    onOption(action) {
      if (attempt !== diceRewardAttempt) return;
      if (action === 'dice-decline') {
        if (claimDiceReward(source, null)) rpgClose('finished');
        return;
      }
      const rolls = { player: balloonDice.rollFace(), spirit: balloonDice.rollFace() };
      const result = claimDiceReward(source, rolls);
      if (!result) {
        choice.text = '未能儲存這次挑戰，請再試一次。';
        rpgShowPage(scene.pages.indexOf(choice));
        return;
      }
      showDiceDuel(scene, rolls, result);
    },
  };
  if (rpgOpen(scene) && source.chest) sfxPlay('secretDiscovered');
}

function closeDiceChoice() {
  if (rpgActive?.id === 'balloon-dice-invite') rpgClose('reset');
}

async function showDiceDuel(scene, rolls, result) {
  const overlay = document.getElementById('rpg-overlay');
  const board = overlay.querySelector('.rpg-dice-board');
  const g = board.getContext('2d');
  scene.pages[0] = {
    sp: 'balloonv', face: 'balloonv_heroic', right: 'star_spirit_mysterious', bothActive: true,
    text: '來比比誰的骰子點數比較大！', options: [],
  };
  rpgShowPage(0);
  board.hidden = false;
  board.removeAttribute('data-points');
  const still = { y: 0, angle: 0, scaleX: 1, scaleY: 1 };
  const pips = { cx: 0.50, cy: 0.52, spacing: 0.103, radius: 0.034 };
  const render = (faces, motion) => {
    if (rpgActive !== scene) return;
    g.clearRect(0, 0, board.width, board.height);
    const art = diceImage('dice_face_blank.png');
    for (const [die, x] of [['player', 75], ['spirit', 395]]) {
      if (!faces[die]) continue;
      const pose = motion.die === die ? motion : still;
      if (art) balloonDice.drawFace(g, art, { x, y: 48, w: 190, h: 190 }, pips, faces[die], pose);
      else {
        g.font = 'bold 105px sans-serif';
        g.textAlign = 'center';
        g.fillStyle = '#ffe27a';
        g.fillText(faces[die], x + 95, 168 + pose.y);
      }
    }
  };
  try { await balloonDice.animate(render)(rolls); } catch { /* Keep the rolled result if animation fails. */ }
  if (rpgActive !== scene) return;
  render(rolls, still);
  board.dataset.points = rolls.player + ',' + rolls.spirit;
  const [left, face, text] = DICE_RESULT_FACES[result.outcome];
  scene.pages[0] = {
    sp: 'spirit', face, left, bothActive: true,
    text: text + '\n小V ' + rolls.player + '　星靈 ' + rolls.spirit + '　獲得 ' + result.coins + ' 金幣',
    instant: true,
    options: [{ action: 'dice-done', label: '繼續冒險' }],
  };
  scene.onOption = () => rpgClose('finished');
  rpgShowPage(0);
}

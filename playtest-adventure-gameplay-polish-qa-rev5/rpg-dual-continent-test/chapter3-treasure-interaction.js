'use strict';

const CH3_TREASURE_ART = 'assets/adventure/ui/items/';
const CH3_DICE_RECIPE = 'balloonDice';
const ch3TreasureImages = new Map();
let diceRewardAttempt = { claims: new Set(), coins: 0 };

function installChapter3TreasureItems() {
  RECIPES.push({
    id: CH3_DICE_RECIPE, unlockKey: CH3_DICE_RECIPE, name: '氣球骰子',
    effect: '帶著氣球骰子，遇到金幣包或隱藏寶箱時，發揮你的強運，帶走更多金幣吧！',
    cost: { balloon260: 3, roundBalloon: 1 }, emoji: '🎲',
  });
  V395_BAG.caps.balloonDice = 1;
  H2_ICON.balloonDice = { path: CH3_TREASURE_ART + 'item_balloon_dice.png', emoji: '🎲' };
}

function chapter3TreasureSpots(stageId) {
  switch (stageId) {
    case '2-2': return [{ id: '2-2:low-trench', tier: 'normal', requiresDog: true, x: 3790, y: GROUND_Y + 14 }];
    case '3-1': return [{ id: '3-1:wind-ledge', tier: 'normal', requiresDog: true, x: 1020, y: GROUND_Y - 222 }];
    case '3-3': return [{ id: '3-3:high-ledge', tier: 'rare', requiresDog: true, x: 3580, y: GROUND_Y - 297 }];
    // Revision 5 C-05: moved off the exit bank (was x = bank.x + 565 = 4427, y = y(705) - 27 = -272) to the
    // optional ledge above the drying vent. Same id, tier, dog rule and once-per-run claim.
    case '3-4': return [{ id: '3-4:high-bank', tier: 'precious', requiresDog: true, x: C34_LAY.chestLedge.x + 80, y: C34_LAY.y(C34_LAY.chestLedge.h) - 27 }];
    default: return [];
  }
}

function unclaimedChapter3Treasure(stageId) {
  return chapter3TreasureSpots(stageId).find(chest => !diceRewardAttempt.claims.has(chest.id));
}

function ch3TreasureImage(name) {
  if (!ch3TreasureImages.has(name)) {
    const img = new Image();
    img.src = resolveAdventureAssetSrc(CH3_TREASURE_ART + name);
    ch3TreasureImages.set(name, img);
  }
  const img = ch3TreasureImages.get(name);
  return img.complete && img.naturalWidth ? img : null;
}

function drawChapter3Treasure(cx) {
  const chest = unclaimedChapter3Treasure(advCurrentStageId());
  if (!chest || !bringBalloonDog) return;
  const dist = Math.abs(player.x + player.w / 2 - chest.x);
  if (dist > 230) return;
  const art = ch3TreasureImage('item_treasure_chest_' + chest.tier + '.png');
  ctx.save();
  ctx.globalAlpha *= Math.min(1, (230 - dist) / 126);
  if (art) ctx.drawImage(art, chest.x - cx - 44, chest.y - 48, 88, 88);
  else { ctx.font = '32px sans-serif'; ctx.fillText('📦', chest.x - cx - 15, chest.y + 8); }
  ctx.restore();
}

function resetDiceRewardAttempt() {
  closeChapter3TreasureChoice();
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
  if (!levelStartSnapshot || v395Count(CH3_DICE_RECIPE) < 1) return false;
  const craftedItems = { ...playerInventory.craftedItems, [CH3_DICE_RECIPE]: v395Count(CH3_DICE_RECIPE) - 1 };
  const balloonDiceSpent = diceSpentTotal(playerInventory.balloonDiceSpent) + 1;
  // Persist the debit with the pre-attempt balances, including in an isolated stage slot.
  if (!saveInventory({
    ...playerInventory, craftedItems, balloonDiceSpent,
    coins: levelStartSnapshot.coins,
  })) return false;
  Object.assign(playerInventory, { craftedItems, balloonDiceSpent });
  levelStartSnapshot.craftedItems[CH3_DICE_RECIPE] =
    Math.max(0, (levelStartSnapshot.craftedItems[CH3_DICE_RECIPE] || 0) - 1);
  levelStartSnapshot.balloonDiceSpent = balloonDiceSpent;
  advGuardWrite('dice-spend');
  return true;
}

function ch3TreasureClaim(source, rolls) {
  if (diceRewardAttempt.claims.has(source.id) || (source.tier && !bringBalloonDog)) return null;
  const base = source.tier ? chapter3TreasureDice.tiers[source.tier] : source.coins;
  const result = chapter3TreasureDice.payoutCoins(base, rolls);
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
    if (advCurrentStageId() === '2-2') advNoteExplore({ type: 'goldChest' });
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
  if (v395Count(CH3_DICE_RECIPE) < 1) {
    if (ch3TreasureClaim(source, null) && source.tier) sfxPlay('secretDiscovered');
    return;
  }
  ch3TreasureImage('dice_face_blank.png');
  const attempt = diceRewardAttempt;
  const choice = { sp: 'balloonv', face: 'balloonv_thinking', right: null, text: '要不要挑戰呢...', instant: true, options: DICE_CHOICE_ACTIONS };
  const scene = {
    id: 'chapter3-treasure-invite', title: '氣球骰子', repeatable: true, requirePages: true,
    pages: [
      { sp: 'spirit', face: 'star_spirit_mysterious', text: '哇！是一個' + (source.coin ? '金幣包' : '寶箱') + '耶！小V，要不要跟我比比看誰的骰子點數比較大？' },
      { sp: 'spirit', face: 'star_spirit_happy', text: '你贏，我給你兩倍金幣。\n你輸，我給你一半金幣。\n如果平手，我給你原本的金幣。' },
      choice,
    ],
    onOption(action) {
      if (attempt !== diceRewardAttempt) return;
      if (action === 'dice-decline') {
        if (typeof balloonDiceAudio !== 'undefined') balloonDiceAudio.decline();   // G-01：選「否」→ 結束小遊戲 BGM，不播 Heroic／骰子音效
        if (ch3TreasureClaim(source, null)) rpgClose('finished');
        return;
      }
      const rolls = { player: chapter3TreasureDice.rollFace(), spirit: chapter3TreasureDice.rollFace() };
      const result = ch3TreasureClaim(source, rolls);
      if (!result) {
        choice.text = '未能儲存這次挑戰，請再試一次。';
        rpgShowPage(scene.pages.indexOf(choice));
        return;
      }
      showDiceDuel(scene, rolls, result);
    },
  };
  const opened = rpgOpen(scene);
  if (opened && typeof balloonDiceAudio !== 'undefined') balloonDiceAudio.invite();   // Revision 5（G-01）：星靈邀約 → 小遊戲 BGM
  if (opened && source.tier) sfxPlay('secretDiscovered');
}

function checkChapter3Treasure() {
  if (!bringBalloonDog) return;
  const chest = unclaimedChapter3Treasure(advCurrentStageId());
  if (!chest || !rectsOverlap(player.x, player.y, player.w, player.h, chest.x - 37, chest.y - 34, 74, 68)) return;
  offerDiceReward(chest);
}

function closeChapter3TreasureChoice() {
  if (rpgActive?.id === 'chapter3-treasure-invite') rpgClose('reset');
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
  if (typeof balloonDiceAudio !== 'undefined') balloonDiceAudio.accept();   // G-03：小V首次切到 Heroic 表情 → 金色油管環音效一次
  board.hidden = false;
  board.removeAttribute('data-points');
  const still = { y: 0, angle: 0, scaleX: 1, scaleY: 1 };
  const pips = { cx: 0.50, cy: 0.52, spacing: 0.103, radius: 0.034 };
  const render = (faces, motion) => {
    if (rpgActive !== scene) return;
    g.clearRect(0, 0, board.width, board.height);
    const art = ch3TreasureImage('dice_face_blank.png');
    for (const [die, x] of [['player', 75], ['spirit', 395]]) {
      if (!faces[die]) continue;
      const pose = motion.die === die ? motion : still;
      if (art) chapter3TreasureDice.drawFace(g, art, { x, y: 48, w: 190, h: 190 }, pips, faces[die], pose);
      else {
        g.font = 'bold 105px sans-serif';
        g.textAlign = 'center';
        g.fillStyle = '#ffe27a';
        g.fillText(faces[die], x + 95, 168 + pose.y);
      }
    }
  };
  // G-04：骰子跳動與骰子音效同時開始；音效結束時（或核對過的音檔長度到時）最後一顆骰子停住並揭曉
  const timing = typeof balloonDiceAudio !== 'undefined' ? balloonDiceAudio.startRoll() : null;
  try { await chapter3TreasureDice.animate(render, { timing })(rolls); } catch { /* Keep the rolled result if animation fails. */ }
  if (typeof balloonDiceAudio !== 'undefined') balloonDiceAudio.reveal(result.outcome);   // G-05～07：勝利／敗北音效；平手不加
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

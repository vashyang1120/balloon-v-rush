'use strict';

const CH3_TREASURE_ART = 'assets/adventure/ui/items/';
const CH3_DICE_RECIPE = 'balloonDice';
const ch3TreasureImages = new Map();
let ch3TreasureDialog = null;

RECIPES.push({
  id: CH3_DICE_RECIPE, unlockKey: CH3_DICE_RECIPE, name: '氣球骰子',
  effect: '帶著氣球骰子發現隱藏寶箱，星靈會邀請你比點數。',
  cost: { balloon260: 3, roundBalloon: 1 }, emoji: '🎲',
});
V395_BAG.caps.balloonDice = 1;
H2_ICON.balloonDice = { path: CH3_TREASURE_ART + 'item_balloon_dice.png', emoji: '🎲' };

function chapter3TreasureSpots(stageId) {
  switch (stageId) {
    case '3-1': return [{ id: '3-1:wind-ledge', tier: 'normal', x: 1020, y: GROUND_Y - 222 }];
    case '3-3': return [{ id: '3-3:high-ledge', tier: 'rare', x: 3580, y: GROUND_Y - 297 }];
    case '3-4': return [{ id: '3-4:high-bank', tier: 'precious', x: C34_LAY.bank.x + 565, y: C34_LAY.y(C34_LAY.bank.h) - 27 }];
    default: return [];
  }
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
  if (!bringBalloonDog) return;
  for (const chest of chapter3TreasureSpots(advCurrentStageId())) {
    const dist = Math.abs(player.x + player.w / 2 - chest.x);
    if (dist > 230 || playerInventory.chapter3Chests?.[chest.id]) continue;
    const art = ch3TreasureImage('item_treasure_chest_' + chest.tier + '.png');
    ctx.save();
    ctx.globalAlpha *= Math.min(1, (230 - dist) / 126);
    if (art) ctx.drawImage(art, chest.x - cx - 44, chest.y - 48, 88, 88);
    else if (advDevMode()) { ctx.font = '32px sans-serif'; ctx.fillText('📦', chest.x - cx - 15, chest.y + 8); }
    ctx.restore();
  }
}

function ch3TreasureClaim(chest, rolls) {
  const priorLedger = playerInventory.chapter3Chests;
  const result = chapter3TreasureDice.prepareClaim(priorLedger || {}, chest.id, chest.tier, rolls);
  if (!result) return null;
  const priorCoins = playerInventory.coins;
  playerInventory.coins += result.coins;
  playerInventory.chapter3Chests = result.ledger;
  if (!saveInventory()) {
    playerInventory.coins = priorCoins;
    playerInventory.chapter3Chests = priorLedger;
    return null;
  }
  currentRunStats.coins += result.coins;
  player.coinsCollected += result.coins;
  currentRunStats.foundTreasureCoins = (currentRunStats.foundTreasureCoins || 0) + result.coins;
  if (!currentRunStats.foundHiddenTreasureName) currentRunStats.foundHiddenTreasureName = '金幣寶箱';
  spawnTreasurePickupEffect('獲得金幣寶箱！', '金幣 +' + result.coins);
  return result;
}

function ch3TreasureScene() {
  return {
    id: 'chapter3-treasure-invite', title: '氣球骰子', repeatable: true,
    left: null, right: 'star_spirit_mysterious',
    pages: [
      { sp: 'spirit', face: 'star_spirit_mysterious', text: '哇！是一個寶箱耶！小V，要不要跟我比比看誰的骰子點數比較大？' },
      { sp: 'spirit', face: 'star_spirit_happy', text: '你贏，我給你兩倍金幣。\n你輸，我給你一半金幣。\n如果平手，我給你原本的金幣。' },
    ],
  };
}

function checkChapter3Treasure() {
  if (gameState !== 'playing' || assetGateActive || !bringBalloonDog || rpgActive || ch3TreasureDialog) return;
  const chest = chapter3TreasureSpots(advCurrentStageId()).find(t =>
    !playerInventory.chapter3Chests?.[t.id] &&
    rectsOverlap(player.x, player.y, player.w, player.h, t.x - 37, t.y - 34, 74, 68));
  if (!chest) return;
  if (v395Count(CH3_DICE_RECIPE) < 1) {
    if (ch3TreasureClaim(chest, null)) sfxPlay('secretDiscovered');
    return;
  }
  const scene = ch3TreasureScene();
  scene.onEnd = how => {
    if (how !== 'reset' && (gameState === 'playing' || gameState === 'paused')) ch3TreasureChoose(chest);
  };
  if (rpgOpen(scene)) sfxPlay('secretDiscovered');
}

function closeChapter3TreasureChoice() {
  const view = ch3TreasureDialog;
  ch3TreasureDialog = null;
  view?.close();
  view?.remove();
}

function ch3TreasureChoose(chest) {
  if (ch3TreasureDialog) return;
  gameState = 'paused';
  const box = document.createElement('dialog');
  ch3TreasureDialog = box;
  box.className = 'ch3-treasure-dialog';
  box.setAttribute('aria-labelledby', 'ch3-treasure-heading');
  box.innerHTML = '<h2 id="ch3-treasure-heading">氣球骰子</h2><div class="ch3-treasure-portrait"><img alt="" /><span>小V</span></div>' +
    '<canvas width="600" height="210" aria-label="小V與星靈的骰子" hidden></canvas><p class="ch3-treasure-note" aria-live="polite"></p>' +
    '<div class="ch3-treasure-scores" hidden><span>小V</span><span>星靈</span></div><div class="ch3-treasure-actions">' +
    '<button type="button" data-choice="accept">好啊！來挑戰看看！</button>' +
    '<button type="button" data-choice="decline">不用了，直接領取寶箱。</button></div>';
  const portrait = box.querySelector('img');
  portrait.src = rpgImgUrl('balloonv_thinking');
  portrait.addEventListener('error', () => { portrait.hidden = true; });
  const choices = box.querySelector('.ch3-treasure-actions');
  const board = box.querySelector('canvas');
  const note = box.querySelector('.ch3-treasure-note');
  const scores = box.querySelector('.ch3-treasure-scores');
  const accept = choices.querySelector('[data-choice="accept"]');
  const decline = choices.querySelector('[data-choice="decline"]');
  const g = board.getContext('2d');
  const roll = chapter3TreasureDice.animate((faces, motion) => {
    g.clearRect(0, 0, board.width, board.height);
    const face = ch3TreasureImage('dice_face_blank.png');
    if (face) {
      chapter3TreasureDice.drawFace(g, face, { x: 78, y: 53, w: 154, h: 154 }, { cx: 0.50, cy: 0.52, spacing: 0.103, radius: 0.034 }, faces.player, motion);
      chapter3TreasureDice.drawFace(g, face, { x: 368, y: 53, w: 154, h: 154 }, { cx: 0.50, cy: 0.52, spacing: 0.103, radius: 0.034 }, faces.spirit, motion);
    }
    scores.children[0].textContent = '小V　' + faces.player;
    scores.children[1].textContent = '星靈　' + faces.spirit;
  });
  function resume() {
    closeChapter3TreasureChoice();
    if (gameState === 'paused') {
      gameState = 'playing';
      lastTime = 0;
      fixedStepAccumulator = 0;
      if (rpgPauseAfterClose) { rpgPauseAfterClose = false; pauseGame(); }
    }
  }
  function finish(rolls) {
    const result = ch3TreasureClaim(chest, rolls);
    if (!result) { note.textContent = '未能儲存寶箱獎勵。'; return; }
    if (!rolls) { resume(); return; }
    const copy = {
      win: ['哇！你贏了！金幣加倍送給你！', 'star_spirit_surprised', 'star_spirit_happy'],
      loss: ['嘿嘿！這次是我贏了！', 'star_spirit_happy', 'star_spirit_happy'],
      tie: ['咦！居然一樣大耶！', 'star_spirit_surprised', 'star_spirit_mysterious'],
    }[result.outcome];
    note.textContent = copy[0] + '　獲得 ' + result.coins + ' 金幣';
    portrait.src = rpgImgUrl(RPG_ASSETS[copy[1]] ? copy[1] : copy[2]);
    box.querySelector('.ch3-treasure-portrait span').textContent = '星靈';
    const done = document.createElement('button');
    done.type = 'button';
    done.textContent = '繼續冒險';
    done.addEventListener('click', resume, { once: true });
    choices.replaceChildren(done);
    done.focus();
  }
  box.addEventListener('cancel', event => event.preventDefault());
  decline.addEventListener('click', () => finish(null));
  accept.addEventListener('click', async () => {
    accept.disabled = decline.disabled = true;
    scores.hidden = false;
    board.hidden = !ch3TreasureImage('dice_face_blank.png');
    try {
      const rolls = await roll();
      if (ch3TreasureDialog === box) finish(rolls);
    } catch {
      if (ch3TreasureDialog === box) note.textContent = '骰子暫時無法顯示。';
    } finally {
      if (accept.isConnected && ch3TreasureDialog === box) accept.disabled = decline.disabled = false;
    }
  });
  document.body.append(box);
  box.showModal();
  ch3TreasureImage('dice_face_blank.png');
}

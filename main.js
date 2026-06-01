// =============================================
//  氣球小V：派對島大作戰 — main.js
//  MVP 0.1
// =============================================

// ── Canvas setup ──────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Internal resolution (16:9)
const CANVAS_W = 960;
const CANVAS_H = 540;
canvas.width  = CANVAS_W;
canvas.height = CANVAS_H;

// =============================================
//  CONFIG - 可調參數區（在這裡微調數值）
// =============================================
const CONFIG = {
  // -- 角色 --
  PLAYER_W:        60,    // 角色顯示寬度 (px)
  PLAYER_H:        80,    // 角色顯示高度 (px)
  PLAYER_SPEED:    3.8,   // 移動速度（數值越大越快）
  JUMP_FORCE:      13,    // 跳躍初速（數值越大跳越高）
  GRAVITY:         0.55,  // 重力（數值越大下落越快）

  // -- projectile（子彈，保留給未來氣球槍使用）--
  PROJECTILE_W:    22,    // 氣球彈射物寬度 (px)
  PROJECTILE_H:    22,    // 氣球彈射物高度 (px)
  PROJECTILE_SPD:  9,     // 彈射物飛行速度
  PROJECTILE_LIFE: 40,    // 彈射物存活幀數（越大飛越遠）

  // -- basicSword 近戰攻擊範圍 --
  BASIC_SWORD_ATTACK_RANGE:    55,   // 攻擊框從角色前緣往前延伸的距離 (px)
  BASIC_SWORD_ATTACK_WIDTH:    55,   // 攻擊框寬度 (px)
  BASIC_SWORD_ATTACK_HEIGHT:   60,   // 攻擊框高度 (px)
  BASIC_SWORD_ATTACK_DURATION: 14,   // 攻擊框存活幀數（約 230ms @ 60fps）
  BASIC_SWORD_ATTACK_COOLDOWN: 28,   // 攻擊冷卻幀數

  // -- 小怪 --
  ENEMY_W:         48,    // 小怪顯示寬度 (px)
  ENEMY_H:         50,    // 小怪顯示高度 (px)
  ENEMY_SPEED:     1.2,   // 小怪巡邏速度

  // -- 收集物 --
  COIN_R:          10,    // 金幣半徑 (px)，顯示大小 = COIN_R*2
  BALLOON_W:       18,    // 260氣球碰撞寬度 (px)
  BALLOON_H:       40,    // 260氣球碰撞高度 (px)

  // -- 鏡頭 --
  SCROLL_SPEED:    2.2,   // 鏡頭自動推進速度（px/幀）

  // -- 關卡 --
  LEVEL_DURATION:  60,    // 關卡時間限制（秒）
  LEVEL_LENGTH:    14400, // 關卡世界總寬度 (px)

  // -- 橘子怪 (balloonNemesis) --
  ORANGE_W:           44,   // 橘子怪寬度 (px)
  ORANGE_H:           44,   // 橘子怪高度 (px)
  ORANGE_SPRAY_W:    140,   // 噴油範圍寬度 (px)
  ORANGE_SPRAY_H:     28,   // 噴油範圍高度 (px)
  ORANGE_WINDUP_MS:  600,   // 預備動作時間 (ms)
  ORANGE_SPRAY_MS:   500,   // 噴油持續時間 (ms)
  ORANGE_COOLDOWN_MS:3000,  // 兩次噴油間隔 (ms)
};
// =============================================

// -- 從 CONFIG 展開（內部使用，不需修改）--
const GRAVITY        = CONFIG.GRAVITY;
const PLAYER_SPEED   = CONFIG.PLAYER_SPEED;
const JUMP_FORCE     = CONFIG.JUMP_FORCE;
const SCROLL_SPEED   = CONFIG.SCROLL_SPEED;
const LEVEL_LENGTH   = CONFIG.LEVEL_LENGTH;
const LEVEL_DURATION = CONFIG.LEVEL_DURATION;
const GROUND_Y       = CANVAS_H - 80; // 地面頂部 Y 座標（不建議輕易修改）

const COLORS = {
  sky:        '#87CEEB',
  skyGrad2:   '#c8e8ff',
  ground:     '#5aaa2a',
  groundDark: '#3d7a1a',
  dirt:       '#8B6914',
  platform:   '#c87a2a',
  platformTop:'#e09040',
  coin:       '#FFD700',
  balloon260: '#FF69B4',
  spike:      '#888',
  enemy:      '#e05050',
  enemyEye:   '#fff',
  projectile: '#FF1493',
  hpFull:     '#e04040',
  hpEmpty:    '#444',
  ui:         'rgba(0,0,0,0.45)',
};

const TRIVIA = [
  '260 長條氣球是造型氣球最常使用的材料之一。',
  '氣球要避免靠近尖銳物，一碰就破！',
  '高溫會加速乳膠氣球老化，要存放在陰涼處。',
  '柑橘類果皮中的油分可能讓乳膠氣球更容易破裂。',
  '一條 260 氣球可以扭出超過 20 個基本泡泡。',
  '柑橘類果皮中的油分，可能讓乳膠氣球更容易破裂，所以氣球要盡量遠離橘子皮喔！',
];

// ── Input state ───────────────────────────────
const keys = {};
const mobileBtn = { left: false, right: false, jump: false, attack: false };

window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['Space','ArrowLeft','ArrowRight','ArrowUp','KeyZ'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function bindBtn(id, prop) {
  const el = document.getElementById(id);
  if (!el) return;
  ['touchstart','mousedown'].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); mobileBtn[prop] = true; el.classList.add('pressed'); }));
  ['touchend','mouseup','mouseleave','touchcancel'].forEach(ev => el.addEventListener(ev, () => { mobileBtn[prop] = false; el.classList.remove('pressed'); }));
}
bindBtn('btn-left',   'left');
bindBtn('btn-right',  'right');
bindBtn('btn-jump',   'jump');
bindBtn('btn-attack', 'attack');

function inp(action) {
  switch (action) {
    case 'left':   return keys['ArrowLeft']  || mobileBtn.left;
    case 'right':  return keys['ArrowRight'] || mobileBtn.right;
    case 'jump':   return keys['Space'] || keys['ArrowUp'] || mobileBtn.jump;
    case 'attack': return keys['KeyZ'] || mobileBtn.attack;
  }
}


// ── Inventory & Save (MVP 0.2) ────────────────
// playerInventory: 跨局累積的背包資料
// 新增材料時只需在此物件與 INVENTORY_DEFAULTS 加欄位即可
const INVENTORY_DEFAULTS = {
  coins:      0,
  balloon260: 0,
  // 未來材料可在此擴充：balloon160, roundBalloon5, roundBalloon12, recipeCards ...
  craftedItems: {
    basicSword: 0,
    // 未來可在此擴充更多道具
  },
  // 目前裝備的劍耐久（localStorage 持久化，關卡結束後保留）
  equippedSwordDur: 0,
};

// ── 氣球秘笈配方定義 (MVP 0.3) ────────────────
// 新增道具只需在此加一筆，UI 會自動讀取
const RECIPES = [
  {
    id:       'basicSword',
    name:     '基礎氣球劍',
    effect:   '可以攻擊一般小怪',
    durability: 10,
    cost: { balloon260: 2 },   // 材料需求
    emoji:    '⚔️',
  },
  // 未來可繼續擴充
];

// 製作道具
function craftItem(recipeId) {
  const recipe = RECIPES.find(r => r.id === recipeId);
  if (!recipe) return false;

  // 檢查材料是否足夠
  for (const [mat, qty] of Object.entries(recipe.cost)) {
    if ((playerInventory[mat] || 0) < qty) return false;
  }

  // 扣除材料
  for (const [mat, qty] of Object.entries(recipe.cost)) {
    playerInventory[mat] -= qty;
  }

  // 新增道具
  if (!playerInventory.craftedItems) playerInventory.craftedItems = {};
  playerInventory.craftedItems[recipeId] =
    (playerInventory.craftedItems[recipeId] || 0) + 1;

  saveInventory();
  return true;
}

const SAVE_KEY = 'balloonV_inventory';

function loadInventory() {
  try {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const merged = Object.assign({}, INVENTORY_DEFAULTS, parsed);
      // craftedItems 需深度合併，避免舊存檔缺少新道具欄位
      merged.craftedItems = Object.assign(
        {}, INVENTORY_DEFAULTS.craftedItems, parsed.craftedItems || {}
      );
      return merged;
    }
  } catch(e) { /* 存檔損壞時直接用預設值 */ }
  // 深複製 defaults（避免共用同一個 craftedItems 物件參考）
  const d = Object.assign({}, INVENTORY_DEFAULTS);
  d.craftedItems = Object.assign({}, INVENTORY_DEFAULTS.craftedItems);
  return d;
}

function saveInventory() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(playerInventory)); } catch(e) {}
}

function resetInventory() {
  Object.assign(playerInventory, INVENTORY_DEFAULTS);
  playerInventory.craftedItems    = Object.assign({}, INVENTORY_DEFAULTS.craftedItems);
  playerInventory.equippedSwordDur = 0;
  saveInventory();
  // 清除執行期裝備狀態
  equippedSword.id = null;
  equippedSword.name = '';
  equippedSword.maxDur = 0;
  equippedSword.currentDur = 0;
}

let playerInventory = loadInventory();

// currentRunStats: 本局獲得（每次 restart 清零）
let currentRunStats = {
  coins:           0,
  balloon260:      0,
  enemiesDefeated: 0,
  damageTaken:     0,  // 受傷次數（本局）
};

// ── Asset loading ─────────────────────────────
const playerImg = new Image();
playerImg.src = 'assets/player.png'; // place your image here

// ── Game state ────────────────────────────────
let gameState = 'playing'; // 'playing' | 'gameover' | 'clear'
let cameraX   = 0;
let frameCount = 0;
let lastTime   = 0;
let elapsedSec = 0;

// ── Equipped sword (MVP 0.4) ──────────────────
// 執行期裝備狀態（從 inventory 載入，關卡中即時更新）
const equippedSword = {
  id:        null,  // 'basicSword' | null
  name:      '',
  maxDur:    0,
  currentDur:0,
};

// 從 inventory 初始化裝備（每次 restart 時呼叫）
function initEquippedSword() {
  const ci  = playerInventory.craftedItems || {};
  const qty = ci.basicSword || 0;
  const recipe = RECIPES.find(r => r.id === 'basicSword');

  if (qty > 0 && recipe) {
    equippedSword.id   = 'basicSword';
    equippedSword.name = recipe.name;
    equippedSword.maxDur = recipe.durability;
    // 若 inventory 有保存耐久且 > 0，使用該值；否則初始化為最大值
    const savedDur = playerInventory.equippedSwordDur || 0;
    equippedSword.currentDur = (savedDur > 0 && savedDur <= recipe.durability)
      ? savedDur
      : recipe.durability;
  } else {
    equippedSword.id = null;
    equippedSword.name = '';
    equippedSword.maxDur = 0;
    equippedSword.currentDur = 0;
  }
}

// 打中敵人時呼叫：扣耐久、處理斷裂
function consumeSwordDurability() {
  if (!equippedSword.id) return;
  equippedSword.currentDur--;

  if (equippedSword.currentDur <= 0) {
    // 這把劍耗盡
    const ci = playerInventory.craftedItems;
    ci.basicSword = Math.max(0, (ci.basicSword || 1) - 1);

    if (ci.basicSword > 0) {
      // 還有備用劍，自動裝下一把
      equippedSword.currentDur = equippedSword.maxDur;
    } else {
      // 沒有劍了
      equippedSword.id = null;
      equippedSword.name = '';
      equippedSword.maxDur = 0;
      equippedSword.currentDur = 0;
    }
    playerInventory.equippedSwordDur = equippedSword.currentDur;
    saveInventory();
  } else {
    // 儲存目前耐久
    playerInventory.equippedSwordDur = equippedSword.currentDur;
    saveInventory();
  }
}

const player = {
  x: 100, y: GROUND_Y - CONFIG.PLAYER_H,
  w: CONFIG.PLAYER_W, h: CONFIG.PLAYER_H,
  vx: 0,  vy: 0,
  onGround: false,
  facingRight: true,
  hp: 5, maxHp: 5,
  invincible: 0,        // frames of invincibility after hit
  attackCooldown: 0,
  attackActive: 0,      // frames the projectile flash is live (no-sword)
  meleeActive: 0,       // frames the melee hitbox is live (basicSword)
  meleeHit: false,      // 本次揮擊是否已命中過（每揮一次只扣一次耐久）
  // Stats
  coinsCollected: 0,
  balloonsCollected: 0,
  enemiesDefeated: 0,
};

// ── Level generation ──────────────────────────
// All positions are in world coordinates.

const platforms = [
  // { x, y, w, h }
  { x: 400,  y: GROUND_Y - 100, w: 120, h: 18 },
  { x: 650,  y: GROUND_Y - 160, w: 100, h: 18 },
  { x: 900,  y: GROUND_Y - 110, w: 140, h: 18 },
  { x: 1200, y: GROUND_Y - 150, w: 120, h: 18 },
  { x: 1500, y: GROUND_Y - 120, w: 160, h: 18 },
  { x: 1800, y: GROUND_Y - 180, w: 100, h: 18 },
  { x: 2100, y: GROUND_Y - 130, w: 130, h: 18 },
  { x: 2400, y: GROUND_Y - 160, w: 110, h: 18 },
  { x: 2800, y: GROUND_Y - 120, w: 180, h: 18 },
  { x: 3200, y: GROUND_Y - 150, w: 140, h: 18 },
];

const coins = generateCoins();
const balloons260 = generateBalloons();
const spikes      = generateSpikes();
const enemies     = generateEnemies();
const orangeNemeses = generateOrangeNemeses(); // balloonNemesis: 不能被攻擊
const projectiles = []; // player-fired balloons

// Finish line position
const FINISH_X = LEVEL_LENGTH - 200;

function generateCoins() {
  const list = [];
  for (let i = 0; i < 60; i++) {
    list.push({
      x: 300 + i * 200 + Math.random() * 80,
      y: GROUND_Y - 50 - Math.random() * 80,
      collected: false,
      bobOffset: Math.random() * Math.PI * 2,
    });
  }
  // Also place some on platforms
  platforms.forEach(p => {
    list.push({ x: p.x + p.w / 2, y: p.y - 30, collected: false, bobOffset: Math.random() * Math.PI * 2 });
    list.push({ x: p.x + p.w / 2 - 28, y: p.y - 30, collected: false, bobOffset: Math.random() * Math.PI * 2 });
  });
  return list;
}

function generateBalloons() {
  const list = [];
  const positions = [500, 900, 1300, 1700, 2100, 2500, 2900, 3300, 3700, 4100, 4500];
  positions.forEach(x => {
    list.push({
      x: x + Math.random() * 60,
      y: GROUND_Y - 80 - Math.random() * 60,
      collected: false,
      bobOffset: Math.random() * Math.PI * 2,
    });
  });
  return list;
}

function generateSpikes() {
  const list = [];
  const positions = [700, 1000, 1400, 1900, 2300, 2700, 3100, 3500, 4000, 4400, 4800];
  positions.forEach(x => {
    list.push({ x: x + Math.random() * 40, y: GROUND_Y - 24, w: 40, h: 24 });
  });
  return list;
}

function generateEnemies() {
  const list = [];
  const positions = [600, 1100, 1600, 2000, 2400, 2800, 3200, 3600, 4000, 4400, 4800, 5200];
  positions.forEach(x => {
    list.push({
      x: x + Math.random() * 50,
      y: GROUND_Y - CONFIG.ENEMY_H,
      w: CONFIG.ENEMY_W, h: CONFIG.ENEMY_H,
      vx: (Math.random() > 0.5 ? 1 : -1) * CONFIG.ENEMY_SPEED,
      hp: 2,
      patrol: x,
      patrolRange: 120,
      active: true,
      hitFlash: 0,
    });
  });
  return list;
}


function generateOrangeNemeses() {
  // 只放兩隻，位置明顯、可以跳過
  const positions = [1250, 3000];
  return positions.map(x => ({
    x,
    y: GROUND_Y - CONFIG.ORANGE_H,
    w: CONFIG.ORANGE_W,
    h: CONFIG.ORANGE_H,
    // 噴油方向：固定朝左（玩家通常從左往右跑）
    sprayDir: -1,
    // 狀態機：'idle' | 'windup' | 'spraying'
    phase:    'idle',
    phaseTimer: 0,        // 目前 phase 已過的 ms
    sprayActive: false,   // 目前是否有傷害範圍
  }));
}

// ── Rect collision helper ─────────────────────
function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ── Update ────────────────────────────────────
function update(dt, dtMs = 16.667) {
  if (gameState !== 'playing') return;

  frameCount++;
  elapsedSec += dtMs / 1000; // real seconds

  // Time up → game over
  if (elapsedSec >= LEVEL_DURATION) {
    triggerGameOver();
    return;
  }

  updateCamera();
  updatePlayer(dt);
  updateEnemies();
  updateProjectiles();
  updateMeleeAttack();
  updateOrangeNemeses(dtMs);
  checkCollectibles();
  checkHazards();
  checkFinish();
}

function updateCamera() {
  // Auto-advance camera
  cameraX += SCROLL_SPEED;

  // Camera also follows player (lead slightly ahead)
  const targetX = player.x - CANVAS_W * 0.3;
  if (targetX > cameraX) cameraX = targetX;

  // Clamp camera to level
  cameraX = Math.max(0, Math.min(cameraX, LEVEL_LENGTH - CANVAS_W));

  // Push player if falling behind left edge
  const leftBound = cameraX + 30;
  if (player.x < leftBound) {
    player.x = leftBound;
    player.vx = 0;
  }
}

function updatePlayer(dt) {
  // Horizontal movement
  let moving = false;
  if (inp('left'))  { player.vx = -PLAYER_SPEED; player.facingRight = false; moving = true; }
  if (inp('right')) { player.vx =  PLAYER_SPEED; player.facingRight = true;  moving = true; }
  if (!moving) player.vx *= 0.75; // friction

  // Right edge: can't go past FINISH_X + some buffer
  const rightBound = Math.min(cameraX + CANVAS_W - 60, LEVEL_LENGTH - 20);
  player.x = Math.max(cameraX + 30, Math.min(rightBound, player.x + player.vx));

  // Jump
  if (inp('jump') && player.onGround) {
    player.vy = -JUMP_FORCE;
    player.onGround = false;
  }

  // Gravity
  player.vy += GRAVITY;
  player.y += player.vy;
  player.onGround = false;

  // Ground collision
  if (player.y + player.h >= GROUND_Y) {
    player.y = GROUND_Y - player.h;
    player.vy = 0;
    player.onGround = true;
  }

  // Platform collisions (top only)
  platforms.forEach(p => {
    if (
      player.vy >= 0 &&
      player.x + player.w > p.x && player.x < p.x + p.w &&
      player.y + player.h >= p.y && player.y + player.h <= p.y + 24
    ) {
      player.y = p.y - player.h;
      player.vy = 0;
      player.onGround = true;
    }
  });

  // Attack
  if (player.attackCooldown > 0) player.attackCooldown--;
  if (player.attackActive > 0)   player.attackActive--;
  if (player.meleeActive > 0)    player.meleeActive--;

  if (inp('attack') && player.attackCooldown === 0) {
    if (equippedSword.id === 'basicSword') {
      // ── 近戰攻擊（basicSword）──
      player.attackCooldown = CONFIG.BASIC_SWORD_ATTACK_COOLDOWN;
      player.meleeActive    = CONFIG.BASIC_SWORD_ATTACK_DURATION;
      player.meleeHit       = false; // 重置命中旗標
    } else {
      // ── 無裝備：保留舊攻擊視覺效果，但不發射子彈，也不打傷敵人 ──
      player.attackCooldown = 30;
      player.attackActive   = 12;
      // （projectile 系統保留，留給未來氣球槍；此處刻意不呼叫 fireProjectile）
    }
  }

  // Invincibility frames
  if (player.invincible > 0) player.invincible--;
}

function fireProjectile() {
  const dir = player.facingRight ? 1 : -1;
  projectiles.push({
    x: player.x + (player.facingRight ? player.w : -16),
    y: player.y + player.h * 0.35,
    w: CONFIG.PROJECTILE_W, h: CONFIG.PROJECTILE_H,
    vx: dir * CONFIG.PROJECTILE_SPD,
    life: CONFIG.PROJECTILE_LIFE,
  });
}

function updateProjectiles() {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx;
    p.life--;
    if (p.life <= 0) { projectiles.splice(i, 1); continue; }

    // Hit enemies
    enemies.forEach(e => {
      if (!e.active) return;
      if (rectsOverlap(p.x, p.y, p.w, p.h, e.x, e.y, e.w, e.h)) {
        e.hp--;
        e.hitFlash = 8;
        e.vx = (p.vx > 0 ? 3 : -3); // knockback
        if (e.hp <= 0) {
          e.active = false;
          player.enemiesDefeated++;
        }
        consumeSwordDurability(); // 打中才扣耐久
        projectiles.splice(i, 1);
      }
    });
  }
}


// ── Melee attack check (basicSword) ──────────
// 每幀在 meleeActive > 0 時檢查命中；每次揮擊只扣一次耐久（meleeHit 旗標）
function updateMeleeAttack() {
  if (player.meleeActive <= 0) return;

  // 攻擊框世界座標
  const atkX = player.facingRight
    ? player.x + player.w                          // 面右：從角色右緣往前
    : player.x - CONFIG.BASIC_SWORD_ATTACK_RANGE;  // 面左：從角色左緣往前
  const atkY = player.y + (player.h - CONFIG.BASIC_SWORD_ATTACK_HEIGHT) / 2;
  const atkW = CONFIG.BASIC_SWORD_ATTACK_RANGE;
  const atkH = CONFIG.BASIC_SWORD_ATTACK_HEIGHT;

  enemies.forEach(e => {
    if (!e.active) return;
    if (rectsOverlap(atkX, atkY, atkW, atkH, e.x, e.y, e.w, e.h)) {
      e.hp--;
      e.hitFlash = 8;
      e.vx = (player.facingRight ? 3.5 : -3.5); // knockback
      if (e.hp <= 0) {
        e.active = false;
        player.enemiesDefeated++;
      }
      if (!player.meleeHit) {
        player.meleeHit = true;
        consumeSwordDurability(); // 每次揮擊只扣一次耐久
      }
    }
  });
}


// ── Orange Nemesis update ────────────────────
function updateOrangeNemeses(dtMs) {
  orangeNemeses.forEach(o => {
    o.phaseTimer += dtMs;

    switch (o.phase) {
      case 'idle':
        o.sprayActive = false;
        if (o.phaseTimer >= CONFIG.ORANGE_COOLDOWN_MS) {
          o.phase      = 'windup';
          o.phaseTimer = 0;
        }
        break;

      case 'windup':
        // 預備：抖動視覺由 drawOrangeNemesis 處理
        o.sprayActive = false;
        if (o.phaseTimer >= CONFIG.ORANGE_WINDUP_MS) {
          o.phase      = 'spraying';
          o.phaseTimer = 0;
          o.sprayActive = true;
        }
        break;

      case 'spraying':
        o.sprayActive = true;
        if (o.phaseTimer >= CONFIG.ORANGE_SPRAY_MS) {
          o.phase      = 'idle';
          o.phaseTimer = 0;
          o.sprayActive = false;
        }
        break;
    }
  });
}

function updateEnemies() {
  enemies.forEach(e => {
    if (!e.active) return;
    if (e.hitFlash > 0) e.hitFlash--;

    // Patrol
    e.x += e.vx;
    if (e.x < e.patrol - e.patrolRange || e.x > e.patrol + e.patrolRange) {
      e.vx *= -1;
    }

    // Keep on ground (simple: pin to GROUND_Y)
    if (e.y + e.h < GROUND_Y) {
      e.y = GROUND_Y - e.h; // keep grounded for now
    }
  });
}

function checkCollectibles() {
  const px = player.x, py = player.y, pw = player.w, ph = player.h;

  coins.forEach(c => {
    if (c.collected) return;
    if (rectsOverlap(px, py, pw, ph, c.x - CONFIG.COIN_R, c.y - CONFIG.COIN_R, CONFIG.COIN_R*2, CONFIG.COIN_R*2)) {
      c.collected = true;
      currentRunStats.coins++;
      player.coinsCollected++;      // HUD 顯示用（與 currentRunStats 同步）
      playerInventory.coins++;
    }
  });

  balloons260.forEach(b => {
    if (b.collected) return;
    if (rectsOverlap(px, py, pw, ph, b.x - CONFIG.BALLOON_W/2, b.y - CONFIG.BALLOON_H/2, CONFIG.BALLOON_W, CONFIG.BALLOON_H)) {
      b.collected = true;
      currentRunStats.balloon260++;
      player.balloonsCollected++;   // HUD 顯示用
      playerInventory.balloon260++;
    }
  });
}

function checkHazards() {
  if (player.invincible > 0) return;
  const px = player.x + 6, py = player.y + 6, pw = player.w - 12, ph = player.h - 6;

  // Spikes
  spikes.forEach(s => {
    if (rectsOverlap(px, py + ph - 12, pw, 12, s.x, s.y, s.w, s.h)) {
      damagePlayer();
    }
  });

  // Enemies (contact damage)
  enemies.forEach(e => {
    if (!e.active) return;
    if (rectsOverlap(px, py, pw, ph, e.x + 4, e.y + 4, e.w - 8, e.h - 8)) {
      damagePlayer();
    }
  });

  // Orange nemesis: body contact + spray damage
  orangeNemeses.forEach(o => {
    // 碰到本體也受傷
    if (rectsOverlap(px, py, pw, ph, o.x + 4, o.y + 4, o.w - 8, o.h - 8)) {
      damagePlayer();
      return; // 同幀只扣一次
    }
    // 噴油範圍
    if (o.sprayActive) {
      const sx = o.sprayDir < 0
        ? o.x - CONFIG.ORANGE_SPRAY_W
        : o.x + o.w;
      const sy = o.y + (o.h - CONFIG.ORANGE_SPRAY_H) / 2;
      if (rectsOverlap(px, py, pw, ph, sx, sy, CONFIG.ORANGE_SPRAY_W, CONFIG.ORANGE_SPRAY_H)) {
        damagePlayer();
      }
    }
  });
}

function damagePlayer() {
  player.hp--;
  player.invincible = 90; // 約 1.5 秒無敵（90 幀 @ 60fps）
  currentRunStats.damageTaken++;
  if (player.hp <= 0) triggerGameOver();
}

function checkFinish() {
  if (player.x + player.w >= FINISH_X) {
    triggerClear();
  }
}

function triggerGameOver() {
  currentRunStats.enemiesDefeated = player.enemiesDefeated;
  saveInventory();
  gameState = 'gameover';
  populateResultPanel();
  showResultButtons();
}

function triggerClear() {
  currentRunStats.enemiesDefeated = player.enemiesDefeated;
  saveInventory();
  gameState = 'clear';
  populateResultPanel();
  showResultButtons();
}

// ── Draw ──────────────────────────────────────
function draw() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  if (gameState === 'playing') {
    drawWorld();
    drawHUD();
  } else if (gameState === 'gameover') {
    drawWorld();
    drawHUD();
    drawResultBox(); // 只畫背景遮罩，標題由 HTML 面板顯示
  } else if (gameState === 'clear') {
    drawWorld();
    drawHUD();
    drawResultBox(); // 只畫背景遮罩
  }
}

function drawWorld() {
  // Sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  grad.addColorStop(0, COLORS.sky);
  grad.addColorStop(1, COLORS.skyGrad2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const cx = cameraX;

  // Ground
  ctx.fillStyle = COLORS.ground;
  ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);
  ctx.fillStyle = COLORS.groundDark;
  ctx.fillRect(0, GROUND_Y, CANVAS_W, 8);
  ctx.fillStyle = COLORS.dirt;
  ctx.fillRect(0, GROUND_Y + 8, CANVAS_W, CANVAS_H - GROUND_Y - 8);

  // Finish flag
  drawFinishFlag(cx);

  // Platforms
  platforms.forEach(p => {
    const sx = p.x - cx;
    if (sx > CANVAS_W + 10 || sx + p.w < -10) return;
    ctx.fillStyle = COLORS.platform;
    ctx.fillRect(sx, p.y, p.w, p.h);
    ctx.fillStyle = COLORS.platformTop;
    ctx.fillRect(sx, p.y, p.w, 6);
  });

  // Coins
  const bobT = frameCount * 0.07;
  coins.forEach(c => {
    if (c.collected) return;
    const sx = c.x - cx;
    if (sx < -20 || sx > CANVAS_W + 20) return;
    const sy = c.y + Math.sin(bobT + c.bobOffset) * 5;
    drawCoin(sx, sy);
  });

  // 260 Balloons
  balloons260.forEach(b => {
    if (b.collected) return;
    const sx = b.x - cx;
    if (sx < -20 || sx > CANVAS_W + 20) return;
    const sy = b.y + Math.sin(bobT * 0.7 + b.bobOffset) * 6;
    drawBalloon260(sx, sy);
  });

  // Spikes
  spikes.forEach(s => {
    const sx = s.x - cx;
    if (sx > CANVAS_W + 10 || sx + s.w < -10) return;
    drawSpike(sx, s.y, s.w, s.h);
  });

  // Enemies
  enemies.forEach(e => {
    if (!e.active) return;
    const sx = e.x - cx;
    if (sx > CANVAS_W + 10 || sx + e.w < -10) return;
    drawEnemy(sx, e.y, e.w, e.h, e.hitFlash > 0);
  });

  // Orange nemeses (balloonNemesis)
  orangeNemeses.forEach(o => {
    const sx = o.x - cx;
    if (sx > CANVAS_W + 60 || sx + o.w < -CONFIG.ORANGE_SPRAY_W) return;
    drawOrangeNemesis(sx, o);
  });

  // Projectiles
  projectiles.forEach(p => {
    const sx = p.x - cx;
    ctx.fillStyle = COLORS.projectile;
    ctx.beginPath();
    ctx.ellipse(sx + p.w / 2, p.y + p.h / 2, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // string
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx + p.w / 2, p.y + p.h);
    ctx.lineTo(sx + p.w / 2, p.y + p.h + 8);
    ctx.stroke();
  });

  // Player
  drawPlayer(cx);
}

function drawPlayer(cx) {
  const sx = player.x - cx;
  const sy = player.y;

  // Blink during invincibility
  if (player.invincible > 0 && frameCount % 6 < 3) return;

  ctx.save();
  if (!player.facingRight) {
    ctx.translate(sx + player.w, sy);
    ctx.scale(-1, 1);
    if (playerImg.complete && playerImg.naturalWidth > 0) {
      ctx.drawImage(playerImg, 0, 0, player.w, player.h);
    } else {
      drawPlayerFallback(0, 0, player.w, player.h);
    }
  } else {
    ctx.translate(sx, sy);
    if (playerImg.complete && playerImg.naturalWidth > 0) {
      ctx.drawImage(playerImg, 0, 0, player.w, player.h);
    } else {
      drawPlayerFallback(0, 0, player.w, player.h);
    }
  }

  // Attack effect
  if (player.meleeActive > 0) {
    // basicSword 近戰攻擊框（placeholder：半透明矩形 + 亮框）
    const atkLocalX = player.facingRight ? player.w : -CONFIG.BASIC_SWORD_ATTACK_RANGE;
    const atkLocalY = (player.h - CONFIG.BASIC_SWORD_ATTACK_HEIGHT) / 2;
    const progress  = player.meleeActive / CONFIG.BASIC_SWORD_ATTACK_DURATION;
    const alpha     = 0.25 + 0.35 * progress;
    ctx.fillStyle = `rgba(180,240,255,${alpha})`;
    ctx.strokeStyle = `rgba(100,220,255,${alpha + 0.3})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(atkLocalX, atkLocalY, CONFIG.BASIC_SWORD_ATTACK_RANGE, CONFIG.BASIC_SWORD_ATTACK_HEIGHT, 6);
    ctx.fill();
    ctx.stroke();
  } else if (player.attackActive > 0) {
    // 無裝備：小範圍拳擊視覺（比氣球劍短），無命中判定
    ctx.fillStyle = 'rgba(255,220,100,0.3)';
    ctx.beginPath();
    ctx.ellipse(
      (player.facingRight ? player.w + 10 : -10), player.h * 0.45,
      18, 14, 0, 0, Math.PI * 2
    );
    ctx.fill();
  }

  ctx.restore();
}

function drawPlayerFallback(x, y, w, h) {
  // Simple placeholder when image not loaded
  ctx.fillStyle = '#ffe0b2';
  ctx.fillRect(x + w * 0.2, y, w * 0.6, h * 0.45); // head
  ctx.fillStyle = '#f5c518';
  ctx.fillRect(x + w * 0.15, y + h * 0.45, w * 0.7, h * 0.55); // body
}

function drawCoin(x, y) {
  ctx.fillStyle = COLORS.coin;
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff8';
  ctx.beginPath();
  ctx.arc(x - 3, y - 3, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c8a000';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.stroke();
}

function drawBalloon260(x, y) {
  // Long balloon shape (260 style)
  ctx.fillStyle = COLORS.balloon260;
  ctx.beginPath();
  ctx.ellipse(x, y + 15, 7, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c0407a';
  ctx.lineWidth = 1;
  ctx.stroke();
  // knot
  ctx.fillStyle = '#c0407a';
  ctx.beginPath();
  ctx.arc(x, y + 37, 3, 0, Math.PI * 2);
  ctx.fill();
  // string
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + 40);
  ctx.lineTo(x + 3, y + 52);
  ctx.stroke();
  // label
  ctx.fillStyle = '#fff';
  ctx.font = '7px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('260', x, y + 18);
}

function drawSpike(x, y, w, h) {
  const count  = Math.max(1, Math.floor(w / 16));
  const tipW   = w / count;

  // 底座
  ctx.fillStyle = '#5a3a1a';
  ctx.fillRect(x, y + h - 6, w, 6);

  // 尖刺本體（紅色，加深色邊緣）
  for (let i = 0; i < count; i++) {
    const bx = x + i * tipW;

    // 填色
    const grad = ctx.createLinearGradient(bx, y + h, bx + tipW / 2, y);
    grad.addColorStop(0, '#c0180a');
    grad.addColorStop(1, '#ff4422');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(bx + 1,       y + h - 6);
    ctx.lineTo(bx + tipW / 2, y);
    ctx.lineTo(bx + tipW - 1, y + h - 6);
    ctx.closePath();
    ctx.fill();

    // 亮邊
    ctx.strokeStyle = 'rgba(255,180,100,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx + tipW / 2, y + 2);
    ctx.lineTo(bx + 2,       y + h - 7);
    ctx.stroke();
  }

  // 警告底線（閃爍，每 40 幀交替）
  if (frameCount % 40 < 20) {
    ctx.fillStyle = 'rgba(255,80,40,0.22)';
    ctx.fillRect(x - 4, y - 6, w + 8, h + 8);
  }
}

function drawEnemy(x, y, w, h, flashing) {
  ctx.fillStyle = flashing ? '#fff' : COLORS.enemy;
  // Body
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  // Eyes
  ctx.fillStyle = COLORS.enemyEye;
  ctx.beginPath(); ctx.arc(x + 12, y + 16, 6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 34, y + 16, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#333';
  ctx.beginPath(); ctx.arc(x + 14, y + 16, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 36, y + 16, 3, 0, Math.PI * 2); ctx.fill();
  // Mouth
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h * 0.65, 8, 0, Math.PI);
  ctx.stroke();
  // HP pip
  for (let i = 0; i < 2; i++) {
    ctx.fillStyle = i < 2 ? '#e00' : '#444';  // always show 2 since max is 2
    ctx.fillRect(x + 8 + i * 18, y - 10, 14, 6);
  }
}


function drawOrangeNemesis(sx, o) {
  const cx_local = cameraX; // 已在呼叫前轉為螢幕 x

  // ── 噴油範圍（先畫，在本體之下）──
  if (o.sprayActive) {
    const spx = o.sprayDir < 0
      ? sx - CONFIG.ORANGE_SPRAY_W
      : sx + o.w;
    const spy = o.y + (o.h - CONFIG.ORANGE_SPRAY_H) / 2;
    const sprayProgress = o.phaseTimer / CONFIG.ORANGE_SPRAY_MS;
    const alpha = 0.45 - sprayProgress * 0.25;
    ctx.fillStyle = `rgba(255,140,0,${alpha})`;
    ctx.beginPath();
    ctx.roundRect(spx, spy, CONFIG.ORANGE_SPRAY_W, CONFIG.ORANGE_SPRAY_H, 8);
    ctx.fill();
    // 油滴粒子（簡單三顆）
    ctx.fillStyle = `rgba(255,180,30,${alpha + 0.1})`;
    [0.2, 0.5, 0.8].forEach(t => {
      const px = spx + CONFIG.ORANGE_SPRAY_W * t;
      const py = spy + CONFIG.ORANGE_SPRAY_H / 2 + Math.sin(frameCount * 0.3 + t * 10) * 5;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // ── 預備光暈（windup 時閃爍）──
  if (o.phase === 'windup') {
    const t = o.phaseTimer / CONFIG.ORANGE_WINDUP_MS;
    const glow = Math.sin(t * Math.PI * 6) * 0.3 + 0.3; // 快速閃爍
    ctx.fillStyle = `rgba(255,180,0,${glow})`;
    ctx.beginPath();
    ctx.arc(sx + o.w / 2, o.y + o.h / 2, o.w * 0.75, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── 本體：橘色圓形 ──
  // 抖動（windup 時）
  const shakeX = o.phase === 'windup'
    ? (Math.random() - 0.5) * 4 : 0;

  ctx.fillStyle = '#e87020';
  ctx.beginPath();
  ctx.arc(sx + o.w / 2 + shakeX, o.y + o.h / 2, o.w / 2, 0, Math.PI * 2);
  ctx.fill();

  // 橘子紋路
  ctx.strokeStyle = 'rgba(200,100,0,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(sx + o.w / 2 + shakeX, o.y + o.h / 2, o.w / 2 - 2, 0, Math.PI * 2);
  ctx.stroke();

  // 橘子蒂頭
  ctx.fillStyle = '#4a8a20';
  ctx.fillRect(sx + o.w / 2 - 3 + shakeX, o.y + 2, 6, 7);

  // 噴油方向指示箭頭（idle 時顯示）
  if (o.phase === 'idle') {
    const arrowX = o.sprayDir < 0 ? sx + 4 : sx + o.w - 4;
    ctx.fillStyle = 'rgba(255,160,0,0.5)';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(o.sprayDir < 0 ? '💨' : '💨', arrowX, o.y - 4);
  }

  // 標籤
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('橘子怪', sx + o.w / 2 + shakeX, o.y - 6);
}

function drawFinishFlag(cx) {
  const sx = FINISH_X - cx;
  if (sx < -40 || sx > CANVAS_W + 40) return;
  // Pole
  ctx.fillStyle = '#888';
  ctx.fillRect(sx, GROUND_Y - 120, 6, 120);
  // Flag
  ctx.fillStyle = '#e74c3c';
  ctx.fillRect(sx + 6, GROUND_Y - 118, 50, 32);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('GOAL', sx + 10, GROUND_Y - 98);
}

function drawHUD() {
  const timeLeft = Math.max(0, LEVEL_DURATION - Math.floor(elapsedSec));
  const barW = 200;
  const pad  = 12;

  // HUD background strip
  ctx.fillStyle = COLORS.ui;
  ctx.fillRect(0, 0, CANVAS_W, 46);

  // HP
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('❤️', pad, 28);
  for (let i = 0; i < player.maxHp; i++) {
    ctx.fillStyle = i < player.hp ? COLORS.hpFull : COLORS.hpEmpty;
    ctx.beginPath();
    ctx.roundRect(pad + 28 + i * 22, 12, 16, 22, 4);
    ctx.fill();
  }

  // Timer
  ctx.fillStyle = timeLeft <= 10 ? '#ff6b6b' : '#fff';
  ctx.font = `bold 20px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(`⏱ ${String(timeLeft).padStart(2,'0')}`, CANVAS_W / 2, 30);

  // Coins & balloons
  ctx.textAlign = 'right';
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#FFD700';
  ctx.fillText(`🪙 ${player.coinsCollected}`, CANVAS_W - pad - 100, 28);
  ctx.fillStyle = '#FF69B4';
  ctx.fillText(`🎈 ${player.balloonsCollected}`, CANVAS_W - pad, 28);

  // 裝備顯示（右側 HUD 下方）
  if (equippedSword.id) {
    ctx.textAlign = 'right';
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#c8f0ff';
    ctx.fillText(`⚔️ ${equippedSword.name}`, CANVAS_W - pad, 58);
    // 耐久條
    const durBarW = 80;
    const durBarX = CANVAS_W - pad - durBarW;
    const durFrac = equippedSword.currentDur / equippedSword.maxDur;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(durBarX, 62, durBarW, 5);
    ctx.fillStyle = durFrac > 0.4 ? '#60d080' : '#e08040';
    ctx.fillRect(durBarX, 62, durBarW * durFrac, 5);
    ctx.fillStyle = 'rgba(200,240,255,0.6)';
    ctx.font = '10px sans-serif';
    ctx.fillText(`${equippedSword.currentDur}/${equippedSword.maxDur}`, CANVAS_W - pad, 76);
  } else {
    ctx.textAlign = 'right';
    ctx.font = '11px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText('目前道具：無', CANVAS_W - pad, 60);
  }

  // Progress bar
  const progress = Math.min(1, (cameraX / (LEVEL_LENGTH - CANVAS_W)));
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(CANVAS_W / 2 - barW / 2, 38, barW, 5);
  ctx.fillStyle = '#2ecc71';
  ctx.fillRect(CANVAS_W / 2 - barW / 2, 38, barW * progress, 5);
}

function drawOverlay(text, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = color;
  ctx.font = 'bold 46px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, CANVAS_W / 2, CANVAS_H / 2 - 80);
}

// drawResultBox：Canvas 只畫模糊遮罩，所有內容由 HTML overlay 負責
function drawResultBox() {
  // 僅加深背景，讓 HTML 面板更清楚
  ctx.fillStyle = 'rgba(10,10,30,0.6)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

// 填充 HTML 結算面板內容（每次 triggerClear/GameOver 時呼叫）
function populateResultPanel() {
  const timeLeft = Math.max(0, LEVEL_DURATION - Math.floor(elapsedSec));
  const ci = playerInventory.craftedItems || {};

  // 本關成果
  const runRows = [
    ['🪙 金幣',         `${currentRunStats.coins} 枚`,            'result-gold'],
    ['🎈 260 長條氣球', `${currentRunStats.balloon260} 條`,       'result-pink'],
    ['💥 擊退小怪',     `${currentRunStats.enemiesDefeated} 隻`,  'result-orange'],
    ['🩹 受傷次數',     `${currentRunStats.damageTaken} 次`,      'result-red'],
    ['❤️ 剩餘生命',     `${player.hp} / ${player.maxHp}`,        'result-red'],
    ['⏱  剩餘時間',     `${timeLeft} 秒`,                         'result-blue'],
  ];

  // 背包
  const bagRows = [
    ['🪙 金幣總計',         `${playerInventory.coins} 枚`,        'result-gold'],
    ['🎈 260 長條氣球總計', `${playerInventory.balloon260} 條`,   'result-pink'],
  ];
  const swordQty = ci.basicSword || 0;
  if (swordQty > 0 || equippedSword.id === 'basicSword') {
    const durInfo = equippedSword.id === 'basicSword'
      ? ` (耐久 ${equippedSword.currentDur}/${equippedSword.maxDur})`
      : '';
    bagRows.push([`⚔️ 基礎氣球劍${durInfo}`, `${swordQty} 把`,  'result-cyan']);
  }

  // 小知識
  const trivia = TRIVIA[(currentRunStats.coins + currentRunStats.balloon260) % TRIVIA.length];

  function makeTable(rows) {
    return rows.map(([label, val, cls]) =>
      `<div class="rp-row"><span class="rp-label">${label}</span><span class="rp-val ${cls}">${val}</span></div>`
    ).join('');
  }

  const panel = document.getElementById('result-panel-body');
  if (!panel) return;
  panel.innerHTML = `
    <div class="rp-section">
      <div class="rp-section-title">📋 本關成果</div>
      ${makeTable(runRows)}
    </div>
    <div class="rp-section">
      <div class="rp-section-title">🎒 目前背包</div>
      ${makeTable(bagRows)}
    </div>
    <div class="rp-trivia">
      💡 ${trivia}
    </div>
  `;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split('');
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n];
    if (ctx.measureText(testLine).width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n];
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

// ── Restart ───────────────────────────────────
function restart() {
  hideResultButtons();
  // Reset player stats (本局)
  Object.assign(player, {
    x: 100, y: GROUND_Y - CONFIG.PLAYER_H,
    vx: 0, vy: 0,
    onGround: false, facingRight: true,
    hp: 5, invincible: 0,
    attackCooldown: 0, attackActive: 0,
    meleeActive: 0, meleeHit: false,
    coinsCollected: 0, balloonsCollected: 0, enemiesDefeated: 0,
  });
  // Reset currentRunStats（本局歸零，inventory 不動）
  currentRunStats.coins           = 0;
  currentRunStats.balloon260      = 0;
  currentRunStats.enemiesDefeated = 0;
  currentRunStats.damageTaken     = 0;

  // 儲存目前耐久到 inventory（下局可繼續）
  if (equippedSword.id) {
    playerInventory.equippedSwordDur = equippedSword.currentDur;
    saveInventory();
  }

  // 重新初始化裝備
  initEquippedSword();

  // Reset world
  cameraX    = 0;
  frameCount = 0;
  elapsedSec = 0;
  gameState  = 'playing';

  coins.forEach(c => { c.collected = false; });
  balloons260.forEach(b => { b.collected = false; });
  enemies.forEach(e => { e.active = true; e.hp = 2; e.x = e.patrol; e.hitFlash = 0; });
  orangeNemeses.forEach(o => { o.phase = 'idle'; o.phaseTimer = 0; o.sprayActive = false; });
  projectiles.length = 0;
}

// ── Reset Save ────────────────────────────────
// 綁定 HTML 中 id="btn-reset-save" 的按鈕（在 index.html 加即可）
(function() {
  const btn = document.getElementById('btn-reset-save');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (confirm('確定要清除背包資料嗎？')) {
      resetInventory();
    }
  });
})();

// 結算畫面操作改由 HTML 按鈕負責（見 showResultButtons / hideResultButtons）
// 鍵盤與 canvas 點擊不再直接觸發 restart，避免誤觸


// ── Result Screen Buttons (HTML overlay) ─────
// Canvas 無法做可點擊按鈕，改用浮動 div 覆蓋在 canvas 上
// 按鈕在 gameState 進入 gameover/clear 時顯示，restart 時隱藏

function showResultButtons() {
  const el = document.getElementById('result-overlay');
  if (el) el.style.display = 'flex';
}

function hideResultButtons() {
  const el = document.getElementById('result-overlay');
  if (el) el.style.display = 'none';
}

// 綁定結算按鈕（DOM 載入後執行）
(function bindResultButtons() {
  // 再玩一次
  const btnPlay = document.getElementById('btn-play-again');
  if (btnPlay) {
    ['click', 'touchstart'].forEach(ev =>
      btnPlay.addEventListener(ev, e => {
        e.preventDefault();
        if (gameState !== 'playing') restart();
      })
    );
  }

  // 氣球秘笈
  const btnGuidebook = document.getElementById('btn-guidebook');
  if (btnGuidebook) {
    ['click', 'touchstart'].forEach(ev =>
      btnGuidebook.addEventListener(ev, e => {
        e.preventDefault();
        openGuidebook();
      })
    );
  }

  // 清除存檔
  const btnReset = document.getElementById('btn-result-reset');
  if (btnReset) {
    ['click', 'touchstart'].forEach(ev =>
      btnReset.addEventListener(ev, e => {
        e.preventDefault();
        if (confirm('確定要清除背包資料嗎？')) {
          resetInventory();
          populateResultPanel(); // 清除後刷新面板數字
        }
      })
    );
  }
})();


// ── Guidebook (氣球秘笈) HTML overlay ────────
function openGuidebook() {
  renderGuidebook();
  const el = document.getElementById('guidebook-overlay');
  if (el) el.style.display = 'flex';
}

function closeGuidebook() {
  const el = document.getElementById('guidebook-overlay');
  if (el) el.style.display = 'none';
}

function renderGuidebook() {
  const list = document.getElementById('guidebook-recipe-list');
  if (!list) return;
  list.innerHTML = '';

  RECIPES.forEach(recipe => {
    const ci    = playerInventory.craftedItems || {};
    const owned = ci[recipe.id] || 0;

    // 計算材料是否足夠
    let canCraft = true;
    const matLines = [];
    for (const [mat, qty] of Object.entries(recipe.cost)) {
      const have = playerInventory[mat] || 0;
      const ok   = have >= qty;
      if (!ok) canCraft = false;
      // 材料名稱對照
      const matName = mat === 'balloon260' ? '260 長條氣球' : mat;
      matLines.push({ matName, have, qty, ok });
    }

    const card = document.createElement('div');
    card.className = 'recipe-card';

    // 材料 HTML
    const matsHtml = matLines.map(m =>
      `<span class="recipe-mat ${m.ok ? '' : 'recipe-mat--low'}">
        ${m.ok ? '✅' : '⚠️'} ${m.matName}：${m.have} / ${m.qty}
      </span>`
    ).join('');

    card.innerHTML = `
      <div class="recipe-card__header">
        <span class="recipe-card__emoji">${recipe.emoji}</span>
        <span class="recipe-card__name">${recipe.name}</span>
        ${owned > 0 ? `<span class="recipe-card__owned">已擁有 ${owned} 把</span>` : ''}
      </div>
      <div class="recipe-card__effect">效果：${recipe.effect}</div>
      <div class="recipe-card__dur">耐久：可攻擊 ${recipe.durability} 次</div>
      <div class="recipe-card__mats">${matsHtml}</div>
      <button class="recipe-card__btn ${canCraft ? '' : 'recipe-card__btn--disabled'}"
              data-id="${recipe.id}" ${canCraft ? '' : 'disabled'}>
        ${canCraft ? '製作' : '材料不足'}
      </button>
    `;

    // 製作按鈕事件
    const btn = card.querySelector('.recipe-card__btn');
    if (btn && canCraft) {
      ['click', 'touchstart'].forEach(ev =>
        btn.addEventListener(ev, e => {
          e.preventDefault();
          const ok = craftItem(recipe.id);
          if (ok) {
            showCraftMessage(`成功製作 ${recipe.name}！`);
            renderGuidebook(); // 重新渲染更新數量
          }
        })
      );
    }

    list.appendChild(card);
  });
}

function showCraftMessage(msg) {
  const el = document.getElementById('craft-message');
  if (!el) return;
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.style.opacity = '0'; }, 2200);
}

// 關閉秘笈按鈕
(function() {
  const btn = document.getElementById('btn-close-guidebook');
  if (btn) {
    ['click', 'touchstart'].forEach(ev =>
      btn.addEventListener(ev, e => { e.preventDefault(); closeGuidebook(); })
    );
  }
})();

// ── Game loop ─────────────────────────────────
function loop(timestamp) {
  const dtMs = lastTime ? Math.min(timestamp - lastTime, 50) : 16.667;
  const dt   = dtMs / 16.667; // frame multiplier for physics (1.0 at 60fps)
  lastTime   = timestamp;

  update(dt, dtMs);
  draw();

  initEquippedSword(); // 頁面載入時從 inventory 初始化裝備
requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

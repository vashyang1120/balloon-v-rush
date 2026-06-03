
// ── 全域錯誤捕捉 + 畫面顯示 ──────────────────
function showDebugError(type, message, file, line, col, stack) {
  // 確保面板存在
  let panel = document.getElementById('__debug-error-panel__');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = '__debug-error-panel__';
    panel.style.cssText = [
      'position:fixed','top:0','left:0','right:0',
      'background:rgba(180,0,0,0.95)','color:#fff',
      'font-family:monospace','font-size:12px',
      'padding:12px 16px','z-index:99999',
      'max-height:50vh','overflow-y:auto',
      'border-bottom:3px solid #ff4444',
      'white-space:pre-wrap','word-break:break-all',
    ].join(';');
    document.body.appendChild(panel);
  }
  var parts = ['[DEBUG] ' + type, 'Message: ' + (message || '(no message)')];
  if (file) parts.push('File: ' + file);
  if (line) parts.push('Line: ' + line);
  if (stack) parts.push('Stack: ' + stack);
  var msg = parts.join(' | ');
  panel.textContent = msg;
  console.error('[showDebugError]', type, message, stack);
}

window.addEventListener('error', function(e) {
  showDebugError('GLOBAL ERROR', e.message, e.filename, e.lineno, e.colno,
    e.error && e.error.stack);
});
window.addEventListener('unhandledrejection', function(e) {
  const r = e.reason;
  showDebugError('UNHANDLED PROMISE',
    r && (r.message || String(r)), '', '', '',
    r && r.stack);
});

// =============================================
//  氣球小V：派對島大作戰 — main.js
//  MVP 0.7 — 第 1 關：氣球森林小徑
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
  SCROLL_SPEED:    2.2,   // 鏡頭自動推進速度（px/幀）（與 AUTO_SCROLL_SPEED_NORMAL 對應）

  // -- 探索速度（氣球狗尋寶用）--
  AUTO_SCROLL_SPEED_NORMAL:       2.2,   // 一般關卡速度
  AUTO_SCROLL_SPEED_EXPLORE:      1.87,  // 有隱藏物的關卡（稍慢）
  AUTO_SCROLL_SPEED_DOG:          1.65,  // 帶狗出門時再慢一點
  TREASURE_SLOW_ZONE_RADIUS:      420,   // 靠近寶物多少 px 時啟動慢速
  TREASURE_SLOW_SCROLL_MULTIPLIER:0.38,  // 最慢速倍率（接近寶物時明顯放慢）

  // -- 關卡 --
  LEVEL_DURATION:  60,    // 關卡時間限制（秒）
  LEVEL_LENGTH:    6400,  // 第 1 關世界寬度（約 60 秒）

  // -- basicHammer 近戰攻擊 --
  HAMMER_ATTACK_RANGE:    70,   // 攻擊框往前延伸距離 (px)
  HAMMER_ATTACK_HEIGHT:   55,   // 攻擊框高度 (px)
  HAMMER_ATTACK_DURATION: 14,   // 攻擊框存活幀數
  HAMMER_ATTACK_COOLDOWN: 35,   // 攻擊冷卻幀數
  HAMMER_SPIN_SPEED:       9,   // 旋轉小怪飛行速度 (px/幀)
  HAMMER_SPIN_LIFE:      200,   // 旋轉小怪飛行幀數

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
// LEVEL_LENGTH / LEVEL_NAME 由 loadLevel() 動態設定
var LEVEL_LENGTH   = CONFIG.LEVEL_LENGTH;
var LEVEL_NAME     = '第 1 關：氣球森林小徑';
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
  '氣球佈置時，路線與高度也很重要，安全動線比華麗更優先！',
  '戶外或高低落差大的場地，氣球佈置要特別注意固定與通行安全。',
];

// ── Input state ───────────────────────────────
const keys = {};
const mobileBtn = { left: false, right: false, jump: false, attack: false };

window.addEventListener('keydown', e => {
  if (e.code === 'Escape') {
    if (gameState === 'playing') { pauseGame(); return; }
    if (gameState === 'paused')  { resumeGame(); return; }
    return;
  }
  // 數字鍵切換武器
  if (e.code === 'Digit1' && gameState === 'playing') {
    if (equippedSword.id) activeSlot = 'sword';
    else showHint('尚未擁有基礎氣球劍', 150);
    return;
  }
  if (e.code === 'Digit2' && gameState === 'playing') {
    if (equippedHammer.id) activeSlot = 'hammer';
    else showHint('尚未擁有基礎氣球槌', 150);
    return;
  }
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
  coins:         0,
  balloon260:    0,
  roundBalloon:  0,        // MVP 1.0B：圓氣球材料
  // 未來材料可在此擴充：balloon160, roundBalloon5, roundBalloon12 ...
  craftedItems: {
    basicSword:       0,
    basicHammer:      0,
    balloonLollipop:  0,   // 氣球棒棒糖
    // 未來可在此擴充更多道具
  },
  unlockedRecipes: {
    basicHammer:      false,   // 第 3 關通關後解鎖
    balloonLollipop:  false,   // 第 3 關隱藏秘笈（棒棒糖）
    // 未來可在此擴充更多解鎖狀態
  },
  // 氣球狗（小V的家）
  balloonDog: {
    present:    false, // 家裡有沒有狗
    turnsLeft:  0,     // 剩餘陪伴回合
  },
  // 跨關卡暫存（不保存到 localStorage，每次 triggerClear/loadLevel 時重置）
  // 這裡只存 persistent 部分
  equippedSwordDur:     0,
  equippedHammerDur:    0,       // 裝備中的氣球槌耐久
  tutorialSwordGranted: false,
  uniqueCollectibles: {
    level3RoundBalloon: false,  // 第 3 關圓氣球是否已成功帶回（通關）
    // 未來可在此擴充更多一次性收集物
  },
};

// ── 氣球秘笈配方定義 (MVP 0.3) ────────────────
// 新增道具只需在此加一筆，UI 會自動讀取
const RECIPES = [
  {
    id:         'basicSword',
    name:       '基礎氣球劍',
    effect:     '可以攻擊一般小怪',
    durability: 10,
    cost:       { balloon260: 2 },
    emoji:      '⚔️',
    unlockKey:  null,            // null = 預設解鎖
  },
  {
    id:         'basicHammer',
    name:       '基礎氣球槌',
    effect:     '可以敲擊小怪，也可觸發特定場景機關（下一版開放）',
    durability: 3,
    cost:       { roundBalloon: 1, balloon260: 1 },
    emoji:      '🔨',
    unlockKey:  'basicHammer',   // 對應 unlockedRecipes.basicHammer
  },
  {
    id:         'balloonDog',
    name:       '氣球小狗',
    effect:     '可靠近隱藏寶物時讓鼻子發亮，協助小V尋找寶物',
    durability: 0,             // 無耐久，以 turnsLeft 計算
    cost:       { balloon260: 1 },
    emoji:      '🐶',
    unlockKey:  null,          // 預設解鎖（有製作材料即可）
    maxOne:     true,          // 家裡最多一隻
  },
  {
    id:         'balloonLollipop',
    name:       '氣球棒棒糖',
    effect:     '可愛的氣球點心（未來可作為補血道具）',
    durability: 0,
    cost:       { balloon260: 2 },
    emoji:      '🍭',
    unlockKey:  'balloonLollipop',
    // comingSoon 已移除 — 取得秘笈後可正常製作
  },
  // 未來可繼續擴充
];


// ── 材料顯示名稱對照 ──────────────────────────
const MATERIAL_NAMES = {
  balloon260:   '260 長條氣球',
  roundBalloon: '圓氣球',
  coins:        '金幣',
  // 未來可在此擴充
};
function matName(key) { return MATERIAL_NAMES[key] || key; }

// 製作道具
function craftItem(recipeId) {
  // 特殊：氣球狗 → 存入 playerHome 結構而非 craftedItems
  if (recipeId === 'balloonDog') {
    if (playerInventory.balloonDog?.present) return false; // 已有一隻
    const recipe = RECIPES.find(r => r.id === 'balloonDog');
    if (!recipe) return false;
    for (const [mat, qty] of Object.entries(recipe.cost)) {
      if ((playerInventory[mat] || 0) < qty) return false;
    }
    for (const [mat, qty] of Object.entries(recipe.cost)) {
      playerInventory[mat] -= qty;
    }
    if (!playerInventory.balloonDog) playerInventory.balloonDog = {};
    playerInventory.balloonDog.present   = true;
    playerInventory.balloonDog.turnsLeft = 3;
    saveInventory();
    return true;
  }
// 製作道具（一般）
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
      // craftedItems / unlockedRecipes 需深度合併，避免舊存檔缺少新欄位
      merged.craftedItems = Object.assign(
        {}, INVENTORY_DEFAULTS.craftedItems, parsed.craftedItems || {}
      );
      merged.unlockedRecipes = Object.assign(
        {}, INVENTORY_DEFAULTS.unlockedRecipes, parsed.unlockedRecipes || {}
      );
      merged.uniqueCollectibles = Object.assign(
        {}, INVENTORY_DEFAULTS.uniqueCollectibles, parsed.uniqueCollectibles || {}
      );
      merged.balloonDog = Object.assign(
        {}, INVENTORY_DEFAULTS.balloonDog, parsed.balloonDog || {}
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
  playerInventory.craftedItems       = Object.assign({}, INVENTORY_DEFAULTS.craftedItems);
  playerInventory.unlockedRecipes    = Object.assign({}, INVENTORY_DEFAULTS.unlockedRecipes);
  playerInventory.uniqueCollectibles = Object.assign({}, INVENTORY_DEFAULTS.uniqueCollectibles);
  playerInventory.balloonDog         = Object.assign({}, INVENTORY_DEFAULTS.balloonDog);
  playerInventory.equippedSwordDur     = 0;
  playerInventory.tutorialSwordGranted = false;
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
  coins:                    0,
  balloon260:               0,
  roundBalloon:             0,
  enemiesDefeated:          0,
  damageTaken:              0,
  unlockedHammerThisClear:  false,
  usedHeartPatch:           false,
  foundHiddenTreasure:      false,
  foundTreasureCoins:       0,
  pendingRecipeUnlocks:     {},  // 本關暫時解鎖（通關才寫入）
  pendingCoins:             0,
  foundHiddenTreasureName:  null, // 本關找到的隱藏物名稱
  foundTreasureCoins:       0,      // 本關從寶箱獲得的金幣
};

// ── Asset loading ─────────────────────────────
const playerImg = new Image();
playerImg.src = 'assets/player.png'; // place your image here

// ── Game state ────────────────────────────────
// gameState 用 var 使其成為全域變數，讓 index.html script 也可讀取
var gameState = 'playing'; // 'playing' | 'paused' | 'failed' | 'gameover' | 'clear'
// 注意：'failed' = 死亡失敗（不進結算）；'gameover' = 時間到（進結算但沒下一關按鈕）
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
  hp: 3, maxHp: 3,  // MVP 1.0A: 改為 3 格，支援 0.5 單位
  invincible: 0,        // frames of invincibility after hit
  attackCooldown: 0,
  attackActive: 0,      // frames the projectile flash is live (no-sword)
  meleeActive: 0,
  meleeHit: false,
  meleeHammerActive: 0, // hammer melee hitbox live frames
  hammerHit: false,
  // Stats
  coinsCollected: 0,
  balloonsCollected: 0,
  enemiesDefeated: 0,
};

// ── Level generation ──────────────────────────
// All positions are in world coordinates.

// 第 1 關平台（配合 5 段節奏，世界寬 6400）
const platforms = [
  // 段 1：安全區平台，低跳可上，引導移動
  { x:  420, y: GROUND_Y - 90,  w: 130, h: 18 },
  { x:  680, y: GROUND_Y - 130, w: 110, h: 18 },
  // 段 2：小怪區，平台讓玩家有制高點
  { x: 1050, y: GROUND_Y - 100, w: 140, h: 18 },
  { x: 1380, y: GROUND_Y - 140, w: 120, h: 18 },
  // 段 3：尖刺區，平台讓玩家可以跳越尖刺
  { x: 2000, y: GROUND_Y - 110, w: 150, h: 18 },
  { x: 2300, y: GROUND_Y - 100, w: 130, h: 18 },
  { x: 2700, y: GROUND_Y - 130, w: 120, h: 18 },
  { x: 3100, y: GROUND_Y - 110, w: 140, h: 18 },
  // 段 4：橘子怪區，平台讓玩家可以跳過噴油
  { x: 3600, y: GROUND_Y - 120, w: 160, h: 18 },
  { x: 4000, y: GROUND_Y - 100, w: 140, h: 18 },
  // 段 5：終點獎勵區
  { x: 4800, y: GROUND_Y - 100, w: 180, h: 18 },
  { x: 5300, y: GROUND_Y - 120, w: 140, h: 18 },
];

let coins = generateCoins();
let balloons260 = generateBalloons();
let spikes      = generateSpikes();
let enemies     = generateEnemies();
let orangeNemeses   = generateOrangeNemeses(); // balloonNemesis: 不能被攻擊
let roundBalloons   = [];  // 圓氣球收集物（由 loadLevel 填充）
let tackHazards     = [];  // 圖釘區（由 loadLevel 填充）
const projectiles = []; // player-fired balloons

// Finish line position（由 loadLevel() 更新）
var FINISH_X = LEVEL_LENGTH - 200;

function generateCoins() {
  // 第 1 關：精確配置 ~28 枚，引導玩家前進
  // 格式：[x, y偏移(從地面往上)]
  const placements = [
    // 段 1：安全區 — 地面引導線 + 平台上
    [200, 55], [280, 55], [360, 55],
    [440, 130], [520, 55],
    [600, 55], [700, 170], [760, 55],
    // 段 2：小怪區
    [1000, 55], [1100, 55],
    [1060, 140], // 平台上方
    [1250, 55], [1420, 180],
    // 段 3：尖刺區（空隙引導）
    [1950, 55], [2060, 150], [2180, 55],
    [2380, 55], [2500, 55],
    [2750, 170], [2900, 55],
    // 段 4：橘子怪前後
    [3400, 55], [3650, 160],
    [4100, 140], [4300, 55],
    // 段 5：終點獎勵區（較密集）
    [4820, 55], [4870, 55], [4920, 55],
    [5000, 140], [5100, 55], [5200, 160],
    [5400, 55], [5600, 55], [5800, 55],
  ];
  return placements.map(([x, yOff]) => ({
    x,
    y: GROUND_Y - yOff,
    collected: false,
    bobOffset: Math.random() * Math.PI * 2,
  }));
}

function generateBalloons() {
  // 第 1 關：8 個 260 長條氣球，分散各段
  const positions = [
    480,   // 段 1：早早出現讓玩家認識
    780,   // 段 1 尾
    1200,  // 段 2：小怪區
    1600,  // 段 2 尾
    2200,  // 段 3：尖刺區
    3000,  // 段 3 尾
    3700,  // 段 4：橘子怪旁（跳過後獎勵）
    5100,  // 段 5：終點前
  ];
  return positions.map(x => ({
    x: x + 20,
    y: GROUND_Y - 85,
    collected: false,
    bobOffset: Math.random() * Math.PI * 2,
  }));
}

function generateSpikes() {
  // 第 1 關：4 組尖刺，集中在段 3（1920～3360），單組，間距足夠
  return [
    { x: 2050, y: GROUND_Y - 24, w: 40, h: 24 },
    { x: 2350, y: GROUND_Y - 24, w: 40, h: 24 },
    { x: 2680, y: GROUND_Y - 24, w: 40, h: 24 },
    { x: 3150, y: GROUND_Y - 24, w: 40, h: 24 },
  ];
}

function generateEnemies() {
  // 第 1 關：4 隻小怪，段 2（960～1920）為主，1 隻在段 4 後方
  const defs = [
    { x: 1000, patrol: 1000, range: 100 }, // 段 2 第一隻，範圍小，讓玩家有準備
    { x: 1250, patrol: 1250, range: 120 }, // 段 2 第二隻
    { x: 1600, patrol: 1600, range: 100 }, // 段 2 第三隻
    { x: 4400, patrol: 4400, range: 140 }, // 段 4 後：橘子怪通過後的額外考驗
  ];
  return defs.map(d => ({
    x: d.x,
    y: GROUND_Y - CONFIG.ENEMY_H,
    w: CONFIG.ENEMY_W, h: CONFIG.ENEMY_H,
    vx: -CONFIG.ENEMY_SPEED, // 統一朝左（朝向玩家）
    hp: 2,
    patrol: d.patrol,
    patrolRange: d.range,
    active: true,
    hitFlash: 0,
  }));
}


function generateOrangeNemeses() {
  // 第 1 關：1 隻橘子怪，段 4（x=3800），站在平台前方地面
  return [{
    x: 3820,
    y: GROUND_Y - CONFIG.ORANGE_H,
    w: CONFIG.ORANGE_W,
    h: CONFIG.ORANGE_H,
    sprayDir: -1, // 朝左噴（朝向玩家來向）
    phase:    'idle',
    phaseTimer: 0,
    sprayActive: false,
  }];
}



// ── Level Index ───────────────────────────────
var currentLevelIndex = 0; // 0 = 第1關, 1 = 第2關

// ── LEVELS 定義 ──────────────────────────────
// 每關包含自己的物件生成函式與 hints
// 新增關卡只需在此陣列加一筆
const LEVELS = [

  // ════════════════════════════════════════════
  //  關卡 0：氣球森林小徑
  // ════════════════════════════════════════════
  {
    name:   '第 1 關：氣球森林小徑',
    length: 6400,
    emoji:  '🌿',
    hints: [
      { triggerX:   30, msg: '← → 移動　空白鍵 跳躍',             shown: false, duration: 270 },
      { triggerX:  680, msg: '⚔️ Z 鍵 使用氣球劍攻擊小怪！',      shown: false, duration: 240 },
      { triggerX: 1700, msg: '⚠️ 尖刺不能攻擊，請跳過！',          shown: false, duration: 240 },
      { triggerX: 3350, msg: '🍊 橘子怪會噴果皮油！等空檔再通過', shown: false, duration: 270 },
    ],
    buildPlatforms: () => [
      { x:  420, y: GROUND_Y - 90,  w: 130, h: 18 },
      { x:  680, y: GROUND_Y - 130, w: 110, h: 18 },
      { x: 1050, y: GROUND_Y - 100, w: 140, h: 18 },
      { x: 1380, y: GROUND_Y - 140, w: 120, h: 18 },
      { x: 2000, y: GROUND_Y - 110, w: 150, h: 18 },
      { x: 2300, y: GROUND_Y - 100, w: 130, h: 18 },
      { x: 2700, y: GROUND_Y - 130, w: 120, h: 18 },
      { x: 3100, y: GROUND_Y - 110, w: 140, h: 18 },
      { x: 3600, y: GROUND_Y - 120, w: 160, h: 18 },
      { x: 4000, y: GROUND_Y - 100, w: 140, h: 18 },
      { x: 4800, y: GROUND_Y - 100, w: 180, h: 18 },
      { x: 5300, y: GROUND_Y - 120, w: 140, h: 18 },
    ],
    buildCoins: () => {
      const placements = [
        [200,55],[280,55],[360,55],[440,130],[520,55],
        [600,55],[700,170],[760,55],
        [1000,55],[1100,55],[1060,140],[1250,55],[1420,180],
        [1950,55],[2060,150],[2180,55],[2380,55],[2500,55],
        [2750,170],[2900,55],
        [3400,55],[3650,160],[4100,140],[4300,55],
        [4820,55],[4870,55],[4920,55],[5000,140],
        [5100,55],[5200,160],[5400,55],[5600,55],[5800,55],
      ];
      return placements.map(([x,yOff]) => ({ x, y: GROUND_Y-yOff, collected:false, bobOffset:Math.random()*Math.PI*2 }));
    },
    buildBalloons: () =>
      [480,780,1200,1600,2200,3000,3700,5100].map(x => ({
        x: x+20, y: GROUND_Y-85, collected:false, bobOffset:Math.random()*Math.PI*2
      })),
    buildSpikes: () => [
      { x:2050, y:GROUND_Y-24, w:40, h:24 },
      { x:2350, y:GROUND_Y-24, w:40, h:24 },
      { x:2680, y:GROUND_Y-24, w:40, h:24 },
      { x:3150, y:GROUND_Y-24, w:40, h:24 },
    ],
    buildEnemies: () => [
      { x:1000,patrol:1000,patrolRange:100 },
      { x:1250,patrol:1250,patrolRange:120 },
      { x:1600,patrol:1600,patrolRange:100 },
      { x:4400,patrol:4400,patrolRange:140 },
    ].map(d => ({
      x:d.x, y:GROUND_Y-CONFIG.ENEMY_H,
      w:CONFIG.ENEMY_W, h:CONFIG.ENEMY_H,
      vx:-CONFIG.ENEMY_SPEED, hp:2,
      patrol:d.patrol, patrolRange:d.patrolRange,
      active:true, hitFlash:0,
    })),
    buildOranges: () => [{
      x:3820, y:GROUND_Y-CONFIG.ORANGE_H,
      w:CONFIG.ORANGE_W, h:CONFIG.ORANGE_H,
      sprayDir:-1, phase:'idle', phaseTimer:0, sprayActive:false,
    }],
  },

  // ════════════════════════════════════════════
  //  關卡 1：橘子果園危機
  // ════════════════════════════════════════════
  {
    name:   '第 2 關：橘子果園危機',
    length: 6400,
    emoji:  '🍊',
    hints: [
      { triggerX:   30, msg: '🍊 第 2 關：橘子果園危機！',                       shown: false, duration: 270 },
      { triggerX:  750, msg: '🍊 橘子怪是氣球剋星，不能用氣球劍硬打！',         shown: false, duration: 270 },
      { triggerX: 1100, msg: '💨 等噴油結束，再安全通過！',                       shown: false, duration: 240 },
      { triggerX: 2600, msg: '🪜 有些危險可以從上方平台繞過。',                   shown: false, duration: 240 },
      { triggerX: 3400, msg: '⚠️ 兩隻橘子怪！觀察噴油節奏，選一個方向通過。',   shown: false, duration: 270 },
    ],
    buildPlatforms: () => [
      // 段 1：安全區
      { x:  350, y: GROUND_Y - 90,  w: 130, h: 18 },
      { x:  640, y: GROUND_Y - 120, w: 110, h: 18 },
      // 段 2：第一隻橘子怪前的觀察平台
      { x: 1000, y: GROUND_Y - 130, w: 150, h: 18 }, // 高平台，可從上繞過
      { x: 1350, y: GROUND_Y - 100, w: 120, h: 18 },
      // 段 3：小怪區
      { x: 1900, y: GROUND_Y - 110, w: 140, h: 18 },
      { x: 2200, y: GROUND_Y - 130, w: 130, h: 18 },
      // 段 4：雙橘子怪區 — 高平台繞路
      { x: 2700, y: GROUND_Y - 160, w: 180, h: 18 }, // 主繞路平台，夠寬
      { x: 3100, y: GROUND_Y - 140, w: 150, h: 18 },
      { x: 3600, y: GROUND_Y - 120, w: 160, h: 18 },
      { x: 4100, y: GROUND_Y - 100, w: 130, h: 18 },
      // 段 5：獎勵區
      { x: 4700, y: GROUND_Y - 100, w: 180, h: 18 },
      { x: 5200, y: GROUND_Y - 120, w: 150, h: 18 },
    ],
    buildCoins: () => {
      const placements = [
        // 段 1
        [150,55],[230,55],[310,55],[390,55],
        [460,130],[550,55],[660,160],[730,55],
        // 段 2
        [900,55],[1020,170],[1150,55],[1280,55],[1420,140],
        // 段 3
        [1800,55],[1950,55],[2100,55],[2250,170],
        [2400,55],[2500,55],
        // 段 4
        [2720,200],[2850,55],[3000,55],
        [3150,180],[3400,55],[3600,55],[3800,55],[4150,140],
        [4300,55],[4450,55],
        // 段 5
        [4720,55],[4790,55],[4860,55],[4930,55],
        [5000,140],[5100,55],[5300,55],[5500,55],[5700,55],
      ];
      return placements.map(([x,yOff]) => ({ x, y:GROUND_Y-yOff, collected:false, bobOffset:Math.random()*Math.PI*2 }));
    },
    buildBalloons: () =>
      [400,700,1100,1500,2000,2800,3900,5200].map(x => ({
        x:x+20, y:GROUND_Y-85, collected:false, bobOffset:Math.random()*Math.PI*2
      })),
    buildSpikes: () => [
      { x:1750, y:GROUND_Y-24, w:40, h:24 },
      { x:2450, y:GROUND_Y-24, w:40, h:24 },
      { x:4500, y:GROUND_Y-24, w:40, h:24 },
    ],
    buildEnemies: () => [
      { x:2000,patrol:2000,patrolRange:120 },
      { x:2350,patrol:2350,patrolRange:100 },
      { x:4300,patrol:4300,patrolRange:130 },
    ].map(d => ({
      x:d.x, y:GROUND_Y-CONFIG.ENEMY_H,
      w:CONFIG.ENEMY_W, h:CONFIG.ENEMY_H,
      vx:-CONFIG.ENEMY_SPEED, hp:2,
      patrol:d.patrol, patrolRange:d.patrolRange,
      active:true, hitFlash:0,
    })),
    buildOranges: () => [
      // 段 2：第一隻，單獨出現，有足夠前置空間
      { x:1280, y:GROUND_Y-CONFIG.ORANGE_H,
        w:CONFIG.ORANGE_W, h:CONFIG.ORANGE_H,
        sprayDir:-1, phase:'idle', phaseTimer:0, sprayActive:false },
      // 段 4：兩隻，錯開位置，可選平台繞路
      { x:3450, y:GROUND_Y-CONFIG.ORANGE_H,
        w:CONFIG.ORANGE_W, h:CONFIG.ORANGE_H,
        sprayDir:-1, phase:'idle', phaseTimer:1500, sprayActive:false }, // 計時器錯開
      { x:3700, y:GROUND_Y-CONFIG.ORANGE_H,
        w:CONFIG.ORANGE_W, h:CONFIG.ORANGE_H,
        sprayDir:-1, phase:'idle', phaseTimer:0, sprayActive:false },
    ],
  },


  // ════════════════════════════════════════════
  //  關卡 2：糖果氣球懸崖
  // ════════════════════════════════════════════
  {
    name:   '第 3 關：糖果氣球懸崖',
    length: 6400,
    emoji:  '🍬',
    hints: [
      // 觸發位置均在危險/選擇點前 ~300px
      { triggerX:   30, msg: '🍬 第 3 關：糖果氣球懸崖！',                   shown: false, duration: 270 },
      { triggerX:  850, msg: '🪜 上方路線獎勵較多，但要小心跳躍！',          shown: false, duration: 260 },
      { triggerX: 2000, msg: '🔼 走上方平台，有時比硬闖更安全！',            shown: false, duration: 250 },
      { triggerX: 3200, msg: '⚔️ 跳躍後也可以用氣球劍打退小怪！',           shown: false, duration: 250 },
      { triggerX: 4700, msg: '🎉 快到終點了！收集最後的氣球吧！',            shown: false, duration: 240 },
    ],
    buildPlatforms: () => [
      // 段 1：安全區，高低交替，讓玩家習慣起伏
      { x:  280, y: GROUND_Y - 80,  w: 130, h: 18 },  // 低平台
      { x:  520, y: GROUND_Y - 130, w: 120, h: 18 },  // 中平台
      { x:  760, y: GROUND_Y - 90,  w: 140, h: 18 },  // 低平台

      // 段 2：高低路線分叉
      // 下方路線（地面可走，安全但獎勵少）
      { x: 1050, y: GROUND_Y - 80,  w: 140, h: 18 },  // 低平台（下方路線基礎）
      { x: 1380, y: GROUND_Y - 80,  w: 130, h: 18 },  // 低平台
      { x: 1680, y: GROUND_Y - 80,  w: 120, h: 18 },  // 低平台（下方路線終段）
      // 上方路線（需跳上，獎勵多）
      { x: 1000, y: GROUND_Y - 148, w: 160, h: 18 },  // 上方起點（從地面可跳達）
      { x: 1350, y: GROUND_Y - 150, w: 140, h: 18 },  // 上方中段
      { x: 1700, y: GROUND_Y - 148, w: 150, h: 18 },  // 上方終段（可跳回地面）

      // 段 3：尖刺在下方，上方迴避路線
      { x: 2150, y: GROUND_Y - 145, w: 160, h: 18 },  // 上方繞路
      { x: 2450, y: GROUND_Y - 138, w: 150, h: 18 },  // 上方繞路
      { x: 2780, y: GROUND_Y - 130, w: 140, h: 18 },  // 回落平台
      { x: 3050, y: GROUND_Y - 90,  w: 130, h: 18 },  // 回地面緩衝

      // 段 4：平台小怪區
      { x: 3400, y: GROUND_Y - 110, w: 150, h: 18 },  // 小怪站立平台
      { x: 3750, y: GROUND_Y - 130, w: 140, h: 18 },  // 高平台，可跳攻擊
      { x: 4100, y: GROUND_Y - 100, w: 160, h: 18 },  // 中平台
      { x: 4450, y: GROUND_Y - 90,  w: 130, h: 18 },  // 低平台，回地面

      // 段 5：終點獎勵區
      { x: 4850, y: GROUND_Y - 100, w: 180, h: 18 },
      { x: 5250, y: GROUND_Y - 130, w: 160, h: 18 },
      { x: 5650, y: GROUND_Y - 100, w: 150, h: 18 },
    ],
    buildCoins: () => {
      const placements = [
        // 段 1：引導
        [150,55],[240,55],[330,55],
        [300,120],[540,170],[780,130],
        // 段 2：下方路線少量，上方路線較多
        [1070,120],[1180,55],[1400,120],
        // 上方路線金幣（y 偏移更大）
        [1020,200],[1080,200],[1140,200],  // 上方路線起點
        [1370,210],[1440,210],[1510,210],  // 上方路線中段
        [1720,195],[1800,195],             // 上方路線終段
        // 段 3：上方繞路獎勵
        [2170,190],[2250,190],[2330,180],
        [2470,180],[2550,170],
        [2800,170],[2900,55],[3000,55],
        // 段 4：平台上小怪前後
        [3420,150],[3550,55],[3650,55],
        [3770,170],[3900,55],[4000,55],
        [4120,140],[4300,55],[4460,130],
        // 段 5：密集獎勵
        [4870,55],[4940,55],[5010,55],[5080,140],
        [5150,55],[5270,170],[5400,55],[5520,55],
        [5670,140],[5800,55],[5950,55],[6050,55],
      ];
      return placements.map(([x,yOff]) => ({
        x, y: GROUND_Y - yOff, collected: false, bobOffset: Math.random()*Math.PI*2
      }));
    },
    buildBalloons: () => {
      // 10 個，上方路線多放幾個作為誘因
      const positions = [
        [500,  130], // 段 1 平台
        [800,  130],
        [1060, 188], // 段 2 上方路線
        [1450, 190],
        [1730, 188],
        [2200, 185], // 段 3 上方
        [2800, 170],
        [3780, 175], // 段 4 高平台
        [4900, 140], // 段 5
        [5300, 170],
      ];
      return positions.map(([x, yOff]) => ({
        x: x+10, y: GROUND_Y - yOff, collected: false, bobOffset: Math.random()*Math.PI*2
      }));
    },
    buildSpikes: () => [
      // 段 3：下方地面尖刺，上方有平台可繞
      { x: 2280, y: GROUND_Y - 24, w: 40, h: 24 },
      { x: 2580, y: GROUND_Y - 24, w: 40, h: 24 },
      { x: 2920, y: GROUND_Y - 24, w: 40, h: 24 },
      // 段 4：平台間一組小尖刺
      { x: 4200, y: GROUND_Y - 24, w: 40, h: 24 },
    ],
    buildEnemies: () => [
      // 段 4：2 隻小怪在平台旁，可選擇跳躍或攻擊
      { x: 3500, patrol: 3500, patrolRange: 110 },
      { x: 4000, patrol: 4000, patrolRange: 120 },
      // 段 5：1 隻小怪在終點前，增加一點挑戰
      { x: 5500, patrol: 5500, patrolRange: 100 },
    ].map(d => ({
      x: d.x, y: GROUND_Y - CONFIG.ENEMY_H,
      w: CONFIG.ENEMY_W, h: CONFIG.ENEMY_H,
      vx: -CONFIG.ENEMY_SPEED, hp: 2,
      patrol: d.patrol, patrolRange: d.patrolRange,
      active: true, hitFlash: 0,
    })),
    buildOranges: () => [
      { x: 4600, y: GROUND_Y - CONFIG.ORANGE_H,
        w: CONFIG.ORANGE_W, h: CONFIG.ORANGE_H,
        sprayDir: -1, phase: 'idle', phaseTimer: 0, sprayActive: false },
    ],
    buildRoundBalloons: () => {
      const uc = playerInventory.uniqueCollectibles || {};
      if (uc.level3RoundBalloon) return [];
      return [{ x: 1400, y: GROUND_Y - 195, collected: false, bobOffset: Math.random()*Math.PI*2 }];
    },
    hiddenTreasure: {
      type:      'recipe',
      recipeKey: 'balloonLollipop',
      x:         2900,            // 段 3 上方路線，需要狗找
      y:         GROUND_Y - 175,  // 浮在空中的隱藏秘笈
      found:     false,
      emoji:     '🍭',
    },
  },


  // ════════════════════════════════════════════
  //  關卡 3：圖釘工坊
  // ════════════════════════════════════════════
  {
    name:   '第 4 關：圖釘工坊',
    length: 6400,
    emoji:  '📌',
    hints: [
      { triggerX:   30, msg: '📌 第 4 關：圖釘工坊！',                     shown: false, duration: 270 },
      { triggerX:  750, msg: '📌 圖釘是氣球剋星，不能用氣球劍硬打！',      shown: false, duration: 260 },
      { triggerX: 1050, msg: '🔨 按 2 裝備氣球槌，再按 Z 敲倒樹！',        shown: false, duration: 260 },
      { triggerX: 2100, msg: '💥 氣球槌可以把小怪敲飛，撞到前方其他小怪！',shown: false, duration: 260 },
      { triggerX: 3500, msg: '🌲 觀察場景機關，比硬闖更安全！',            shown: false, duration: 250 },
    ],
    buildPlatforms: () => [
      { x:  300, y: GROUND_Y - 80,  w: 130, h: 18 },
      { x:  600, y: GROUND_Y - 110, w: 120, h: 18 },
      { x: 1200, y: GROUND_Y - 120, w: 150, h: 18 },
      { x: 1600, y: GROUND_Y - 100, w: 140, h: 18 },
      { x: 2200, y: GROUND_Y - 120, w: 140, h: 18 },
      { x: 2600, y: GROUND_Y - 100, w: 130, h: 18 },
      { x: 3200, y: GROUND_Y - 130, w: 160, h: 18 },
      { x: 3700, y: GROUND_Y - 110, w: 140, h: 18 },
      { x: 4200, y: GROUND_Y - 120, w: 150, h: 18 },
      { x: 4800, y: GROUND_Y - 100, w: 180, h: 18 },
      { x: 5300, y: GROUND_Y - 120, w: 150, h: 18 },
    ],
    buildCoins: () => {
      const p = [
        [150,55],[240,55],[330,55],[430,55],
        [620,150],[720,55],
        [900,55],[1000,55],
        [1400,55],[1550,55],[1700,55],
        [2000,55],[2250,160],[2450,55],
        [2750,55],[2900,55],
        [3050,55],[3350,170],[3600,55],
        [4000,55],[4150,55],[4300,160],
        [4820,55],[4900,55],[4980,55],[5060,55],
        [5100,140],[5300,55],[5500,55],[5700,55],[5900,55],
      ];
      return p.map(([x,yOff]) => ({ x, y:GROUND_Y-yOff, collected:false, bobOffset:Math.random()*Math.PI*2 }));
    },
    buildBalloons: () =>
      [400,900,1500,2200,3000,3800,4600,5200].map(x => ({
        x:x+20, y:GROUND_Y-80, collected:false, bobOffset:Math.random()*Math.PI*2
      })),
    buildSpikes: () => [
      // 少量尖刺，圖釘區是主要障礙
      { x:2050, y:GROUND_Y-24, w:40, h:24 },
    ],
    buildTackHazards: () => [
      // 段 2：第一個圖釘區（樹倒下後可安全通過）
      { x:1350, y:GROUND_Y-24, w:120, h:24 },
      // 段 4：第二個圖釘區
      { x:3900, y:GROUND_Y-24, w:120, h:24 },
    ],
    buildTrees: () => [
      // 段 2：第一棵樹，敲倒後覆蓋 tackHazard[0]
      { x:1200, y:0, h:120, trunkW:22, crownR:38, state:'standing', fallTimer:0, safeZone:null },
      // 段 4：第二棵樹
      { x:3700, y:0, h:120, trunkW:22, crownR:38, state:'standing', fallTimer:0, safeZone:null },
    ],
    buildEnemies: () => [
      { x:2300,patrol:2300,patrolRange:120 },
      { x:2600,patrol:2600,patrolRange:100 },
      { x:2900,patrol:2900,patrolRange:110 },
      { x:4500,patrol:4500,patrolRange:120 },
    ].map(d => ({
      x:d.x, y:GROUND_Y-CONFIG.ENEMY_H,
      w:CONFIG.ENEMY_W, h:CONFIG.ENEMY_H,
      vx:-CONFIG.ENEMY_SPEED, hp:2,
      patrol:d.patrol, patrolRange:d.patrolRange,
      active:true, hitFlash:0,
    })),
    buildOranges: () => [],
    buildRoundBalloons: () => [],
    hiddenTreasure: {
      type:        'goldChest',
      rewardCoins: 30,
      x:           2400,           // 段 3 小怪區附近，需要狗才容易察覺
      y:           GROUND_Y - 70,
      found:       false,
      emoji:       '💰',
    },
  },

];  // end LEVELS


// ── 第 1 關教學劍發放 ────────────────────────
// 規則：第 1 關 + 未曾發放 + 目前沒有劍 → 給 1 把，顯示一次性提示
function grantTutorialSwordIfNeeded() {
  if (currentLevelIndex !== 0) return;                       // 只在第 1 關
  if (playerInventory.tutorialSwordGranted) return;          // 已發放過
  const ci = playerInventory.craftedItems || {};
  if ((ci.basicSword || 0) > 0) {                            // 已有劍就不送
    playerInventory.tutorialSwordGranted = true;
    saveInventory();
    return;
  }
  // 發放教學劍
  if (!playerInventory.craftedItems) playerInventory.craftedItems = {};
  playerInventory.craftedItems.basicSword =
    (playerInventory.craftedItems.basicSword || 0) + 1;
  playerInventory.tutorialSwordGranted = true;
  saveInventory();
  // 重新初始化裝備（讓劍立刻生效）
  initEquippedSword();
  // 顯示一次性教學提示（插在目前提示序列前）
  showHint('⚔️ 小V獲得了基礎氣球劍！按 Z 打退小怪。', 320);
}


// ── Equipped Hammer (MVP 1.1) ─────────────────
const equippedHammer = {
  id:         null,
  name:       '',
  maxDur:     0,
  currentDur: 0,
};

// 目前裝備槽（'sword' | 'hammer' | null）
var activeSlot = 'sword'; // 預設劍

// ── Hidden treasure & balloon dog run state ───
var currentHiddenTreasure = null;
// ── 進關前快照（死亡時 rollback 用）──
var levelStartSnapshot = null;
var bringBalloonDog  = false; // 本關是否帶狗出門（loadLevel 後才設定）
var nextBringDog     = false; // 下一關是否帶狗（帶狗按鈕設定，進下一關時轉移）
var dogNoseGlow      = 0;     // 0～1（保留）
var dogNoseLevel     = 0;     // 0-3：0=暗, 1=微亮, 2=亮, 3=閃爍

function initEquippedHammer() {
  const ci  = playerInventory.craftedItems || {};
  const qty = ci.basicHammer || 0;
  const recipe = RECIPES.find(r => r.id === 'basicHammer');
  if (qty > 0 && recipe) {
    equippedHammer.id      = 'basicHammer';
    equippedHammer.name    = recipe.name;
    equippedHammer.maxDur  = recipe.durability;
    const saved = playerInventory.equippedHammerDur || 0;
    equippedHammer.currentDur = (saved > 0 && saved <= recipe.durability)
      ? saved : recipe.durability;
  } else {
    equippedHammer.id = null;
    equippedHammer.name = '';
    equippedHammer.maxDur = 0;
    equippedHammer.currentDur = 0;
  }
}

function consumeHammerDurability() {
  if (!equippedHammer.id) return;
  equippedHammer.currentDur--;
  if (equippedHammer.currentDur <= 0) {
    const ci = playerInventory.craftedItems;
    ci.basicHammer = Math.max(0, (ci.basicHammer || 1) - 1);
    if (ci.basicHammer > 0) {
      equippedHammer.currentDur = equippedHammer.maxDur;
    } else {
      equippedHammer.id = null;
      equippedHammer.name = '';
      equippedHammer.maxDur = 0;
      equippedHammer.currentDur = 0;
      // 自動切回劍（若有）
      if (equippedSword.id) activeSlot = 'sword';
      else activeSlot = null;
    }
    playerInventory.equippedHammerDur = equippedHammer.currentDur;
    saveInventory();
  } else {
    playerInventory.equippedHammerDur = equippedHammer.currentDur;
    saveInventory();
  }
}

// 切換道具（手機按鈕 / 鍵盤）
function cycleWeapon() {
  const hasSword  = !!equippedSword.id;
  const hasHammer = !!equippedHammer.id;
  if (!hasSword && !hasHammer) { showHint('目前沒有可裝備道具', 150); return; }
  if (activeSlot === 'sword') {
    if (hasHammer) { activeSlot = 'hammer'; }
    else           { showHint('目前沒有其他道具可以切換', 150); }
  } else {
    if (hasSword) { activeSlot = 'sword'; }
    else          { showHint('目前沒有其他道具可以切換', 150); }
  }
}

// ── loadLevel：載入指定關卡資料 ──────────────
function loadLevel(index) {
  const lv = LEVELS[index];
  if (!lv) return;

  LEVEL_NAME   = lv.name;
  LEVEL_LENGTH = lv.length;
  FINISH_X     = LEVEL_LENGTH - 200;

  // 重建物件陣列
  platforms.length = 0;
  lv.buildPlatforms().forEach(p => platforms.push(p));

  coins.length = 0;
  lv.buildCoins().forEach(c => coins.push(c));

  balloons260.length = 0;
  lv.buildBalloons().forEach(b => balloons260.push(b));

  spikes.length = 0;
  lv.buildSpikes().forEach(s => spikes.push(s));

  enemies.length = 0;
  lv.buildEnemies().forEach(e => enemies.push(e));

  orangeNemeses.length = 0;
  lv.buildOranges().forEach(o => orangeNemeses.push(o));

  // 圓氣球
  roundBalloons.length = 0;
  if (lv.buildRoundBalloons) lv.buildRoundBalloons().forEach(r => roundBalloons.push(r));

  // 圖釘區與可敲倒的樹
  tackHazards.length = 0;
  if (lv.buildTackHazards) lv.buildTackHazards().forEach(t => tackHazards.push(t));
  breakableTrees.length = 0;
  if (lv.buildTrees) lv.buildTrees().forEach(t => breakableTrees.push(t));
  spinningEnemies.length = 0;

  // 複製 hints（每次都要 reset shown 狀態）
  HINTS.length = 0;
  lv.hints.forEach(h => HINTS.push(Object.assign({}, h, { shown: false })));

  currentLevelIndex = index;

  // 隱藏寶物（深拷貝，避免 found 狀態污染 LEVELS 原始資料）
  const rawTreasure = lv.hiddenTreasure || null;
  currentHiddenTreasure = rawTreasure
    ? Object.assign({}, rawTreasure, { found: false })
    : null;
  console.log('loadLevel hiddenTreasure:', currentHiddenTreasure);
  console.log('bringBalloonDog:', bringBalloonDog);

  // 探索速度（根據是否有隱藏物調整，帶狗後再 updateCamera 動態調整）
  // 實際速度在 updateCamera 裡根據 bringBalloonDog 動態計算

  // 第 1 關：嘗試發放教學劍（有保護機制，不會重複）
  // 注意：此時 initEquippedSword 尚未被 restart() 呼叫，
  // grantTutorialSwordIfNeeded 裡有獨立的 initEquippedSword 呼叫
  if (index === 0) grantTutorialSwordIfNeeded();
  activeSlot = equippedSword.id ? 'sword' : (equippedHammer.id ? 'hammer' : 'sword');
}

// ── Tutorial Hints (MVP 0.7) ──────────────────
// 依玩家 x 位置顯示一次性教學提示
// ── Tutorial Hints 觸發位置說明 ──────────────
// triggerX：玩家 x 到達此值時觸發（世界座標）
// duration：顯示幀數（60fps 下，180 = 3 秒，240 = 4 秒）
//
// 小怪首次出現 x ≈ 1000，提示在 x=680 觸發（提前 ~320px）
// 尖刺首次出現 x ≈ 2050，提示在 x=1700 觸發（提前 ~350px）
// 橘子怪出現   x ≈ 3820，提示在 x=3350 觸發（提前 ~470px）
//
// TODO（未來正式版）：
//   - 加入「跳過教學關」按鈕，可在第 1 關開始時選擇略過提示
//   - 記錄 localStorage 中 tutorialComplete 旗標，重複遊玩後不再顯示提示
//   - 支援多語言提示文字
// HINTS 由 loadLevel() 動態填充，初始化後由各關 LEVELS[n].hints 資料填入
let HINTS = []; // 勿在此直接填資料

let activeHint = null; // { msg, duration, framesLeft }
let hintQueue  = [];   // 待顯示的提示（保留供未來排隊用）

function checkHints() {
  // 只在 playing 時觸發
  if (gameState !== 'playing') return; // paused / failed / gameover / clear 都停
  HINTS.forEach(h => {
    if (!h.shown && player.x >= h.triggerX) {
      h.shown = true;
      showHint(h.msg, h.duration);
    }
  });
}

function showHint(msg, duration = 200) {
  activeHint = { msg, duration, framesLeft: duration };
}

function tickHint() {
  if (!activeHint) return;
  activeHint.framesLeft--;
  if (activeHint.framesLeft <= 0) activeHint = null;
}

function drawHintBox() {
  if (!activeHint) return;
  const msg      = activeHint.msg;
  const dur      = activeHint.duration || 200;
  const progress = activeHint.framesLeft / dur; // 0=消失 → 1=剛出現
  // 前 15% 快速淡入，後段緩慢淡出
  const alpha    = Math.min(1, (1 - progress) < 0.15
    ? (1 - progress) / 0.15
    : progress / 0.85
  ) * 0.93;

  const bw = Math.min(CANVAS_W - 40, 540);
  const bh = 42;
  const bx = (CANVAS_W - bw) / 2;
  // 畫面底部偏上，避免手機橫向時被操作按鈕遮住
  const by = CANVAS_H - 100;

  ctx.fillStyle = `rgba(5,15,45,${alpha * 0.88})`;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 11);
  ctx.fill();
  ctx.strokeStyle = `rgba(120,200,255,${alpha * 0.5})`;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = `rgba(210,245,255,${alpha})`;
  ctx.font      = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(msg, CANVAS_W / 2, by + bh * 0.66);
}

function resetHints() {
  HINTS.forEach(h => { h.shown = false; });
  activeHint = null;
}

// ── Rect collision helper ─────────────────────
function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ── Update ────────────────────────────────────
function update(dt, dtMs = 16.667) {
  if (gameState !== 'playing') return; // paused / failed / gameover / clear 都停

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
  updateHammerMelee();
  updateSpinningEnemies(dt);
  updateBreakableTrees(dt);
  updateOrangeNemeses(dtMs);
  checkCollectibles();
  checkHazards();
  checkHints();
  tickHint();
  if (bringBalloonDog) updateDogNose();
  checkHiddenTreasure();
  checkFinish();
}

function updateCamera() {
  let scrollSpeed = CONFIG.AUTO_SCROLL_SPEED_NORMAL;
  try {
    const hasTreasure = !!(currentHiddenTreasure
      && !currentHiddenTreasure.found
      && typeof currentHiddenTreasure.x === 'number');
    if (hasTreasure) {
      scrollSpeed = bringBalloonDog
        ? CONFIG.AUTO_SCROLL_SPEED_DOG
        : CONFIG.AUTO_SCROLL_SPEED_EXPLORE;
      if (bringBalloonDog) {
        const dist = Math.abs(player.x - currentHiddenTreasure.x);
        if (dist < CONFIG.TREASURE_SLOW_ZONE_RADIUS) {
          const factor = Math.max(
            CONFIG.TREASURE_SLOW_SCROLL_MULTIPLIER,
            dist / CONFIG.TREASURE_SLOW_ZONE_RADIUS
          );
          scrollSpeed = Math.max(
            CONFIG.AUTO_SCROLL_SPEED_NORMAL * 0.38,
            scrollSpeed * factor
          );
        }
        // Debug log（每 60 幀）
        if (frameCount % 60 === 0) {
          const dist2 = Math.abs(player.x - currentHiddenTreasure.x);
          console.log('[Scroll] speed:', scrollSpeed.toFixed(3),
            'dist:', Math.round(dist2), 'noseLevel:', dogNoseLevel,
            'pendingCoins:', currentRunStats.pendingCoins || 0,
            'foundTreasure:', currentRunStats.foundHiddenTreasure);
        }
      }
    }
  } catch(e) { scrollSpeed = CONFIG.AUTO_SCROLL_SPEED_NORMAL; }
  cameraX += scrollSpeed;

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

  if (player.meleeHammerActive > 0) player.meleeHammerActive--;

  if (inp('attack') && player.attackCooldown === 0) {
    if (activeSlot === 'hammer' && equippedHammer.id) {
      player.attackCooldown     = CONFIG.HAMMER_ATTACK_COOLDOWN;
      player.meleeHammerActive  = CONFIG.HAMMER_ATTACK_DURATION;
      player.hammerHit          = false;
    } else if (activeSlot === 'sword' && equippedSword.id === 'basicSword') {
      player.attackCooldown = CONFIG.BASIC_SWORD_ATTACK_COOLDOWN;
      player.meleeActive    = CONFIG.BASIC_SWORD_ATTACK_DURATION;
      player.meleeHit       = false;
    } else {
      player.attackCooldown = 30;
      player.attackActive   = 12;
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


// ── Spinning enemies（被槌子打飛的小怪）────────
let spinningEnemies = []; // { x, y, w, h, vx, life }

function updateHammerMelee() {
  if (player.meleeHammerActive <= 0) return;

  const atkX = player.facingRight
    ? player.x + player.w
    : player.x - CONFIG.HAMMER_ATTACK_RANGE;
  const atkY = player.y + (player.h - CONFIG.HAMMER_ATTACK_HEIGHT) / 2;
  const atkW = CONFIG.HAMMER_ATTACK_RANGE;
  const atkH = CONFIG.HAMMER_ATTACK_HEIGHT;

  // 打一般小怪 → 旋轉飛出
  enemies.forEach(e => {
    if (!e.active) return;
    if (rectsOverlap(atkX, atkY, atkW, atkH, e.x, e.y, e.w, e.h)) {
      e.active = false; // 從場上移除
      spinningEnemies.push({
        x: e.x, y: e.y, w: e.w, h: e.h,
        vx: player.facingRight ? CONFIG.HAMMER_SPIN_SPEED : -CONFIG.HAMMER_SPIN_SPEED,
        life: CONFIG.HAMMER_SPIN_LIFE,
        angle: 0,
      });
      if (!player.hammerHit) {
        player.hammerHit = true;
        consumeHammerDurability();
      }
    }
  });

  // 打可敲倒的樹
  // 樹幹碰撞框：從地面往上 t.h 高，x 從 t.x 開始，寬 t.trunkW（加大判定寬度至 60px 讓手感好）
  breakableTrees.forEach(t => {
    if (t.state !== 'standing') return;
    const treeHitX = t.x;
    const treeHitY = GROUND_Y - t.h;        // 樹頂 Y（樹從這裡往下到地面）
    const treeHitW = Math.max(t.trunkW, 60); // 判定比視覺樹幹寬，手感好
    const treeHitH = t.h;
    if (rectsOverlap(atkX, atkY, atkW, atkH, treeHitX, treeHitY, treeHitW, treeHitH)) {
      console.log('Hammer hit tree:', t.x);
      t.state     = 'falling';
      t.fallTimer = 0;
      console.log('Tree falling');
      if (!player.hammerHit) {
        player.hammerHit = true;
        consumeHammerDurability();
      }
    }
  });
}

function updateSpinningEnemies(dt) {
  for (let i = spinningEnemies.length - 1; i >= 0; i--) {
    const s = spinningEnemies[i];
    s.x += s.vx * dt;
    s.angle += 0.3 * dt;
    s.life--;
    if (s.life <= 0) { spinningEnemies.splice(i, 1); continue; }
    // 撞到其他活著的小怪 → 消滅
    enemies.forEach(e => {
      if (!e.active) return;
      if (rectsOverlap(s.x, s.y, s.w, s.h, e.x, e.y, e.w, e.h)) {
        e.active = false;
        player.enemiesDefeated++;
        s.life = 0;
      }
    });
  }
}

// ── Breakable Trees ──────────────────────────
let breakableTrees = [];   // loadLevel 填充
const TREE_FALL_DURATION = 60; // 幀數

function updateBreakableTrees(dt) {
  breakableTrees.forEach(t => {
    if (t.state === 'falling') {
      t.fallTimer += dt;
      if (t.fallTimer >= TREE_FALL_DURATION) {
        t.state = 'fallen';
        // safeZone：從樹往右延伸 280px，高 60px（覆蓋玩家整個下半身），Y 從地面往上
        t.safeZone = {
          x: t.x,
          y: GROUND_Y - 60,
          w: 280,   // 足以覆蓋前方圖釘區（樹到圖釘距離約 150-200px + 圖釘寬 120px）
          h: 60,    // 覆蓋玩家腳部高度
        };
        console.log('Tree fallen, safeZone active:', t.safeZone);
      }
    }
  });
}

function isInSafeZone(px, py, pw, ph) {
  return breakableTrees.some(t =>
    t.state === 'fallen' && t.safeZone &&
    rectsOverlap(px, py, pw, ph, t.safeZone.x, t.safeZone.y, t.safeZone.w, t.safeZone.h)
  );
}


// ── 狗鼻子亮度 ──────────────────────────────
function updateDogNose() {
  try {
    if (!bringBalloonDog
        || !currentHiddenTreasure
        || currentHiddenTreasure.found
        || typeof currentHiddenTreasure.x !== 'number') {
      dogNoseGlow  = 0;
      dogNoseLevel = 0;
      return;
    }
    const dist = Math.abs(player.x - currentHiddenTreasure.x);
    if      (dist > 400) { dogNoseLevel = 0; dogNoseGlow = 0;    }
    else if (dist > 250) { dogNoseLevel = 1; dogNoseGlow = 0.25; }
    else if (dist > 120) { dogNoseLevel = 2; dogNoseGlow = 0.65; }
    else                 { dogNoseLevel = 3; dogNoseGlow = 0.85 + Math.sin(frameCount * 0.3) * 0.15; }
    // Debug log（每 120 幀輸出一次）
    if (frameCount % 120 === 0) {
      console.log('[DogNose] dist:', Math.round(dist), 'level:', dogNoseLevel, 'glow:', dogNoseGlow.toFixed(2),
        'scrollSpeed:', CONFIG.AUTO_SCROLL_SPEED_DOG.toFixed(2));
    }
  } catch(e) { dogNoseGlow = 0; dogNoseLevel = 0; }
}

// ── 隱藏寶物碰撞 ────────────────────────────
function checkHiddenTreasure() {
  try {
    // 必須帶狗才能觸發隱藏物
    if (!bringBalloonDog) return;
    if (!currentHiddenTreasure || currentHiddenTreasure.found) return;
    if (currentRunStats.foundHiddenTreasure) return; // 本輪已取得，不重複
    if (typeof currentHiddenTreasure.x !== 'number') return;
    const t = currentHiddenTreasure;
    const R = 50;
    if (!rectsOverlap(player.x, player.y, player.w, player.h, t.x-R, t.y-R, R*2, R*2)) return;

    t.found = true;
    currentRunStats.foundHiddenTreasure = true;

    if (t.type === 'recipe') {
      // 棒棒糖秘笈：pending 模式，通關才正式寫入
      if (!currentRunStats.pendingRecipeUnlocks) currentRunStats.pendingRecipeUnlocks = {};
      currentRunStats.pendingRecipeUnlocks[t.recipeKey] = true;
      currentRunStats.foundHiddenTreasureName = '氣球棒棒糖秘笈';
      showHint('找到隱藏秘笈：氣球棒棒糖！', 320);
      console.log('hidden treasure found:', { type: 'recipe', recipeKey: t.recipeKey, bringBalloonDog,
        pending: currentRunStats.pendingRecipeUnlocks });
    } else if (t.type === 'goldChest') {
      const coins = t.rewardCoins || 30;
      // 金幣立即加入 inventory 和 runStats（死亡時 snapshot rollback 會復原）
      playerInventory.coins                   += coins;
      currentRunStats.coins                   += coins; // HUD 和本關成果同步
      player.coinsCollected                   += coins; // HUD 金幣數字同步
      currentRunStats.pendingCoins             = coins; // 通關時結算面板用
      currentRunStats.foundTreasureCoins       = coins;
      currentRunStats.foundHiddenTreasureName  = '金幣寶箱';
      saveInventory();
      console.log('gold chest applied:', {
        runCoins: currentRunStats.coins, inventoryCoins: playerInventory.coins });
      showHint('找到隱藏寶箱！獲得 ' + coins + ' 金幣！', 320);
    }
  } catch(e) { console.error('checkHiddenTreasure error:', e.message, e.stack); }
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
      player.balloonsCollected++;
      playerInventory.balloon260++;
    }
  });

  // 圓氣球
  roundBalloons.forEach(r => {
    if (r.collected) return;
    const R = 16;
    if (rectsOverlap(px, py, pw, ph, r.x - R, r.y - R, R*2, R*2)) {
      r.collected = true;
      currentRunStats.roundBalloon++;
      playerInventory.roundBalloon++;
      saveInventory();
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

  // TackHazards（圖釘區），safeZone 內不受傷
  tackHazards.forEach(t => {
    if (rectsOverlap(px, py + ph - 12, pw, 12, t.x, t.y, t.w, t.h)) {
      if (isInSafeZone(px, py, pw, ph)) {
        console.log('Protected by fallen tree safeZone');
      } else {
        damagePlayer();
      }
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
  if (player.hp <= 0) triggerFailed();
}

function checkFinish() {
  if (player.x + player.w >= FINISH_X) {
    triggerClear();
  }
}


// ── Pause / Resume ────────────────────────────
function pauseGame() {
  if (gameState !== 'playing') return; // paused / failed / gameover / clear 都停
  gameState = 'paused';
  const el = document.getElementById('pause-overlay');
  if (el) el.style.display = 'flex';
}

function resumeGame() {
  if (gameState !== 'paused') return;
  gameState = 'playing';
  const el = document.getElementById('pause-overlay');
  if (el) el.style.display = 'none';
  // lastTime 重置，避免暫停後 dt 爆炸大
  lastTime = 0;
}


// ── 挑戰失敗（死亡）─────────────────────────
// 規則：死亡時回滾本局收集到的材料（未帶走）
function triggerFailed() {
  // 用進關前快照完整還原（含隱藏秘笈/寶箱/材料）
  if (levelStartSnapshot) {
    // 還原背包
    playerInventory.coins              = levelStartSnapshot.coins;
    playerInventory.balloon260         = levelStartSnapshot.balloon260;
    playerInventory.roundBalloon       = levelStartSnapshot.roundBalloon;
    playerInventory.craftedItems       = JSON.parse(JSON.stringify(levelStartSnapshot.craftedItems));
    playerInventory.unlockedRecipes    = JSON.parse(JSON.stringify(levelStartSnapshot.unlockedRecipes));
    playerInventory.uniqueCollectibles = JSON.parse(JSON.stringify(levelStartSnapshot.uniqueCollectibles));
    playerInventory.balloonDog         = JSON.parse(JSON.stringify(levelStartSnapshot.balloonDog));
    playerInventory.equippedSwordDur   = levelStartSnapshot.equippedSwordDur;
    playerInventory.equippedHammerDur  = levelStartSnapshot.equippedHammerDur;
    // 還原裝備執行期狀態
    if (levelStartSnapshot.equippedSwordId) {
      equippedSword.id         = levelStartSnapshot.equippedSwordId;
      equippedSword.currentDur = levelStartSnapshot.equippedSwordDur;
      equippedSword.maxDur     = levelStartSnapshot.equippedSwordMax;
    } else {
      equippedSword.id = null; equippedSword.currentDur = 0; equippedSword.maxDur = 0;
    }
    if (levelStartSnapshot.equippedHammerId) {
      equippedHammer.id         = levelStartSnapshot.equippedHammerId;
      equippedHammer.currentDur = levelStartSnapshot.equippedHammerDur;
      equippedHammer.maxDur     = levelStartSnapshot.equippedHammerMax;
    } else {
      equippedHammer.id = null; equippedHammer.currentDur = 0; equippedHammer.maxDur = 0;
    }
    activeSlot  = levelStartSnapshot.activeSlot || 'sword';
    player.hp   = levelStartSnapshot.hp;
    saveInventory();
    console.log('restored from snapshot:', {
      coins: playerInventory.coins,
      hammer: playerInventory.craftedItems.basicHammer,
      hammerDur: equippedHammer.currentDur,
      swordDur:  equippedSword.currentDur,
    });
  }

  console.log('discard hidden treasure rewards on failed');

  gameState = 'failed';
  showFailedOverlay();
  if (typeof window.hidePauseBtn === 'function') window.hidePauseBtn();
}

function showFailedOverlay() {
  const el = document.getElementById('failed-overlay');
  if (el) el.style.display = 'flex';
}
function hideFailedOverlay() {
  const el = document.getElementById('failed-overlay');
  if (el) el.style.display = 'none';
}

function triggerGameOver() {
  // 時間到：同樣回滾本局材料（沒成功帶走）
  playerInventory.coins        = Math.max(0, playerInventory.coins        - currentRunStats.coins);
  playerInventory.balloon260   = Math.max(0, playerInventory.balloon260   - currentRunStats.balloon260);
  playerInventory.roundBalloon = Math.max(0, playerInventory.roundBalloon - currentRunStats.roundBalloon);
  currentRunStats.enemiesDefeated = player.enemiesDefeated;
  saveInventory();
  gameState = 'gameover';
  populateResultPanel(); // 顯示結算（但 updateNextLevelButton 不會加下一關）
  showResultButtons();
  if (typeof window.hidePauseBtn === 'function') window.hidePauseBtn();
}

function triggerClear() {
  currentRunStats.enemiesDefeated = player.enemiesDefeated;

  if (currentLevelIndex === 2) {
    if (!playerInventory.unlockedRecipes)    playerInventory.unlockedRecipes    = {};
    if (!playerInventory.uniqueCollectibles) playerInventory.uniqueCollectibles = {};

    // Debug log
    console.log('[triggerClear] Before unlock basicHammer:', playerInventory.unlockedRecipes.basicHammer);

    // 這局是否第一次解鎖 basicHammer？（先判斷，再設值）
    const firstUnlock = playerInventory.unlockedRecipes.basicHammer !== true;
    if (firstUnlock) {
      playerInventory.unlockedRecipes.basicHammer  = true;
      currentRunStats.unlockedHammerThisClear      = true;
    }

    console.log('[triggerClear] unlockedHammerThisClear:', currentRunStats.unlockedHammerThisClear);

    // 通關帶回圓氣球：鎖定一次性收集物
    if (currentRunStats.roundBalloon > 0) {
      playerInventory.uniqueCollectibles.level3RoundBalloon = true;
    }
  }

  // 隱藏物通關正式結算
  if (currentRunStats.foundHiddenTreasure) {
    if (!playerInventory.unlockedRecipes) playerInventory.unlockedRecipes = {};
    const pending = currentRunStats.pendingRecipeUnlocks || {};
    for (const key of Object.keys(pending)) {
      playerInventory.unlockedRecipes[key] = true;
    }
    // 注意：金幣已在找到寶箱時立即寫入 playerInventory
    // pendingCoins 只是給結算畫面顯示用，不需再加
    console.log('apply hidden treasure rewards on clear:', {
      pendingCoins: currentRunStats.pendingCoins,
      pendingRecipeUnlocks: currentRunStats.pendingRecipeUnlocks,
    });
    const unlockedLollipop = !!(currentRunStats.pendingRecipeUnlocks?.balloonLollipop);
    console.log('lollipop recipe unlocked on clear:', unlockedLollipop,
      'unlockedRecipes:', JSON.stringify(playerInventory.unlockedRecipes));
  }

  // 氣球狗結算：先回血，再扣回合（最後一回合仍回血）
  const dog = playerInventory.balloonDog || {};
  if (dog.present) {
    player.hp = Math.min(player.maxHp, player.hp + 0.5);
    currentRunStats.dogHealed = true;
    dog.turnsLeft = Math.max(0, (dog.turnsLeft || 1) - 1);
    if (dog.turnsLeft <= 0) {
      dog.present   = false;
      dog.turnsLeft = 0;
      currentRunStats.dogGoneThisClear = true;
    }
    playerInventory.balloonDog = dog;
  }

  saveInventory();
  gameState = 'clear';
  populateResultPanel();
  updateNextLevelButton();
  showResultButtons();
  if (typeof window.hidePauseBtn === 'function') window.hidePauseBtn();
}

// 更新結算畫面「再玩一次」按鈕的文字與功能
function updateNextLevelButton() {
  const btn = document.getElementById('btn-play-again');
  if (!btn) return;
  const hasNext = currentLevelIndex < LEVELS.length - 1;
  if (hasNext && gameState === 'clear') {
    btn.childNodes[0].textContent = '下一關';
    const sub = btn.querySelector('.result-btn-sub');
    if (sub) sub.textContent = 'Next Level';
    btn._nextLevel = true;
  } else {
    btn.childNodes[0].textContent = '再玩一次';
    const sub = btn.querySelector('.result-btn-sub');
    if (sub) sub.textContent = 'Play Again';
    btn._nextLevel = false;
  }
}

// ── Draw ──────────────────────────────────────
function draw() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  if (gameState === 'playing') {
    drawWorld();
    drawHUD();
    drawHintBox();
  } else if (gameState === 'paused') {
    drawWorld();
    drawHUD();
    // 暫停遮罩（半透明）：overlay 由 HTML 負責，Canvas 只畫模糊底
    ctx.fillStyle = 'rgba(0,0,20,0.45)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  } else if (gameState === 'failed') {
    drawWorld();
    drawHUD();
    // 失敗遮罩（HTML overlay 負責，Canvas 只加暗底）
    ctx.fillStyle = 'rgba(60,0,0,0.55)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  } else if (gameState === 'gameover') {
    drawWorld();
    drawHUD();
    drawResultBox();
  } else if (gameState === 'clear') {
    drawWorld();
    drawHUD();
    drawResultBox();
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

  // 隱藏寶物（只在帶狗或寶物快找到時才顯示）
  if (currentHiddenTreasure
      && !currentHiddenTreasure.found
      && typeof currentHiddenTreasure.x === 'number'
      && (bringBalloonDog || dogNoseGlow > 0)) {
    try {
      const tx = currentHiddenTreasure.x - cx;
      if (tx > -60 && tx < CANVAS_W + 60) drawHiddenTreasure(tx, currentHiddenTreasure);
    } catch(e) {}
  }

  // 圓氣球
  roundBalloons.forEach(r => {
    if (r.collected) return;
    const sx = r.x - cx;
    if (sx < -30 || sx > CANVAS_W + 30) return;
    const sy = r.y + Math.sin(bobT * 0.8 + r.bobOffset) * 6;
    drawRoundBalloon(sx, sy);
  });

  // 圖釘區
  tackHazards.forEach(t => {
    const sx = t.x - cx;
    if (sx > CANVAS_W + 10 || sx + t.w < -10) return;
    drawTackHazard(sx, t.y, t.w, t.h);
  });

  // 可敲倒的樹
  breakableTrees.forEach(t => {
    const sx = t.x - cx;
    if (sx > CANVAS_W + 80 || sx + 80 < -10) return;
    drawBreakableTree(sx, t);
  });

  // 旋轉飛出的小怪
  spinningEnemies.forEach(s => {
    const sx = s.x - cx;
    if (sx > CANVAS_W + 60 || sx + s.w < -60) return;
    ctx.save();
    ctx.translate(sx + s.w/2, s.y + s.h/2);
    ctx.rotate(s.angle);
    ctx.fillStyle = '#e05050';
    ctx.beginPath();
    ctx.roundRect(-s.w/2, -s.h/2, s.w, s.h, 8);
    ctx.fill();
    // 暈眩星星
    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★', 0, 4);
    ctx.restore();
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
  // 氣球狗（跟隨玩家）
  if (bringBalloonDog) {
    try {
      const dogX = player.x - cx - 30;
      const dogY = player.y + player.h * 0.5;
      drawBalloonDog(dogX, dogY);
    } catch(e) {}
  }
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
  } else if (player.meleeHammerActive > 0) {
    // 槌子攻擊效果
    const hx  = player.facingRight ? player.w : -CONFIG.HAMMER_ATTACK_RANGE;
    const hy  = (player.h - CONFIG.HAMMER_ATTACK_HEIGHT) / 2;
    const prg = player.meleeHammerActive / CONFIG.HAMMER_ATTACK_DURATION;
    ctx.fillStyle = `rgba(255,210,80,${0.3 + 0.3 * prg})`;
    ctx.strokeStyle = `rgba(255,180,0,${0.6 + 0.3 * prg})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(hx, hy, CONFIG.HAMMER_ATTACK_RANGE, CONFIG.HAMMER_ATTACK_HEIGHT, 6);
    ctx.fill();
    ctx.stroke();
    // 槌頭圓形
    const hcx = player.facingRight ? player.w + CONFIG.HAMMER_ATTACK_RANGE * 0.7 : -CONFIG.HAMMER_ATTACK_RANGE * 0.7;
    ctx.fillStyle = `rgba(200,140,0,${0.6 * prg})`;
    ctx.beginPath();
    ctx.arc(hcx, player.h * 0.45, 14, 0, Math.PI * 2);
    ctx.fill();
  } else if (player.attackActive > 0) {
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


function drawRoundBalloon(x, y) {
  const R = 16;
  // 主體：藍紫色圓形
  const grad = ctx.createRadialGradient(x - R*0.3, y - R*0.3, R*0.1, x, y, R);
  grad.addColorStop(0, '#c8aaff');
  grad.addColorStop(1, '#7040e0');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5020b0';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // 光澤
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(x - R*0.3, y - R*0.35, R*0.3, R*0.2, -0.5, 0, Math.PI*2);
  ctx.fill();
  // 氣球結
  ctx.fillStyle = '#5020b0';
  ctx.beginPath();
  ctx.arc(x, y + R + 2, 3, 0, Math.PI*2);
  ctx.fill();
  // 線
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + R + 5);
  ctx.lineTo(x + 2, y + R + 14);
  ctx.stroke();
  // 標籤
  ctx.fillStyle = '#fff';
  ctx.font = '8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('圓', x, y + 4);
}



function drawHiddenTreasure(sx, t) {
  // 寶物：輕微上下浮動，帶狗時有輝光
  const bob = Math.sin(frameCount * 0.05) * 4;
  const glow = bringBalloonDog ? dogNoseGlow * 0.6 : 0;

  if (glow > 0.1) {
    ctx.fillStyle = `rgba(255,240,100,${glow * 0.35})`;
    ctx.beginPath();
    ctx.arc(sx + 16, t.y + bob + 16, 32, 0, Math.PI * 2);
    ctx.fill();
  }
  // 圖示
  ctx.font = '28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(t.emoji, sx + 16, t.y + bob + 20);
  // 問號（帶狗時才顯示，否則完全隱藏）
  if (!bringBalloonDog) {
    ctx.fillStyle = 'rgba(255,255,255,0)'; // 完全透明：沒帶狗看不到
  } else if (dogNoseGlow < 0.5) {
    ctx.fillStyle = 'rgba(255,255,150,0.3)';
    ctx.font = '12px sans-serif';
    ctx.fillText('?', sx + 16, t.y + bob - 8);
  }
}

// 鼻子顏色：4 段（dogNoseLevel 0-3）
const DOG_NOSE_COLORS = ['#555555', '#ffe080', '#ffaa00', '#ff4400'];

function drawBalloonDog(x, y) {
  // 依全域 dogNoseLevel 決定鼻子顏色
  const level     = dogNoseLevel || 0;
  const noseColor = DOG_NOSE_COLORS[level];
  const isFlash   = level === 3;
  const flashVis  = !isFlash || (Math.floor(frameCount / 6) % 2 === 0); // 每 6 幀閃一次

  ctx.save();
  ctx.translate(x, y);

  // 身體
  ctx.fillStyle = '#f5c842';
  ctx.beginPath(); ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI*2); ctx.fill();

  // 頭
  ctx.beginPath(); ctx.arc(14, -6, 9, 0, Math.PI*2); ctx.fill();

  // 耳朵
  ctx.fillStyle = '#e8a800';
  ctx.beginPath(); ctx.ellipse(10, -13, 4, 6, -0.4, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(18, -13, 4, 6,  0.4, 0, Math.PI*2); ctx.fill();

  // 鼻子光暈（level >= 2 才有）
  if (level >= 2 && flashVis) {
    const haloR = 8 + (level - 2) * 6;
    ctx.fillStyle = level === 3 ? 'rgba(255,80,0,0.45)' : 'rgba(255,200,0,0.3)';
    ctx.beginPath(); ctx.arc(22, -5, haloR, 0, Math.PI*2); ctx.fill();
  }

  // 鼻子本體（flashVis 控制閃爍）
  if (flashVis) {
    ctx.fillStyle = noseColor;
    ctx.beginPath(); ctx.arc(22, -5, 4, 0, Math.PI*2); ctx.fill();
  }

  // 眼睛
  ctx.fillStyle = '#333';
  ctx.beginPath(); ctx.arc(20, -9, 2, 0, Math.PI*2); ctx.fill();

  // 尾巴
  ctx.strokeStyle = '#f5c842'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-12, -2); ctx.quadraticCurveTo(-22, -14, -16, -20); ctx.stroke();

  // 鼻子等級標示（debug，level > 0 時顯示）
  if (level > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('L' + level, 22, 6);
  }

  ctx.restore();
}

function drawTackHazard(x, y, w, h) {
  // 圖釘區：深灰底板 + 多個小圖釘
  ctx.fillStyle = '#444';
  ctx.fillRect(x, y + h - 6, w, 6);
  const count = Math.max(1, Math.floor(w / 12));
  for (let i = 0; i < count; i++) {
    const bx = x + i * (w / count) + (w / count) / 2;
    ctx.fillStyle = '#aaa';
    ctx.beginPath();
    ctx.moveTo(bx, y);
    ctx.lineTo(bx - 4, y + h - 6);
    ctx.lineTo(bx + 4, y + h - 6);
    ctx.closePath();
    ctx.fill();
    // 圖釘頭
    ctx.fillStyle = '#ccc';
    ctx.beginPath();
    ctx.arc(bx, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // 警告標籤
  ctx.fillStyle = 'rgba(255,200,0,0.7)';
  ctx.font = '8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('圖釘', x + w / 2, y - 4);
}

function drawBreakableTree(sx, t) {
  const trunkH = t.h;
  const trunkW = t.trunkW || 22;
  const crownR = t.crownR || 38;
  const baseY  = GROUND_Y; // 樹根在地面

  if (t.state === 'standing') {
    // 樹幹（從地面往上）
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(sx, baseY - trunkH, trunkW, trunkH);
    // 樹冠（在樹頂）
    ctx.fillStyle = '#3a8a1a';
    ctx.beginPath();
    ctx.arc(sx + trunkW/2, baseY - trunkH - crownR * 0.4, crownR, 0, Math.PI * 2);
    ctx.fill();
    // 🔨 提示
    ctx.fillStyle = 'rgba(255,255,150,0.9)';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔨?', sx + trunkW/2, baseY - trunkH - crownR - 8);
  } else if (t.state === 'falling') {
    // 倒下動畫：繞根部往右旋轉
    const progress = Math.min(1, t.fallTimer / TREE_FALL_DURATION);
    const angle    = progress * (Math.PI / 2);
    ctx.save();
    ctx.translate(sx + trunkW/2, baseY);
    ctx.rotate(angle);
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(-trunkW/2, -trunkH, trunkW, trunkH);
    ctx.fillStyle = '#3a8a1a';
    ctx.beginPath();
    ctx.arc(0, -trunkH, crownR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (t.state === 'fallen') {
    // 水平倒下的樹幹
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(sx, baseY - trunkW, trunkH, trunkW);
    // 樹冠（在右端）
    ctx.fillStyle = '#3a8a1a';
    ctx.beginPath();
    ctx.arc(sx + trunkH, baseY - trunkW/2, crownR * 0.7, 0, Math.PI * 2);
    ctx.fill();
    // 安全橋提示（綠色底層）
    ctx.fillStyle = 'rgba(80,220,80,0.35)';
    ctx.fillRect(sx, baseY - trunkW - 2, 280, trunkW + 2);
    ctx.strokeStyle = 'rgba(80,220,80,0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, baseY - trunkW - 2, 280, trunkW + 2);
  }
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

  // HP（支援 0.5 單位：整格紅色、半格橘色、空格深灰）
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('❤️', pad, 28);
  for (let i = 0; i < player.maxHp; i++) {
    const bx = pad + 28 + i * 22;
    const by = 12;
    const bw = 16;
    const bh = 22;
    const filled = player.hp - i; // >1 整格, 0.5~1 半格, <=0 空格
    if (filled >= 1) {
      ctx.fillStyle = COLORS.hpFull;
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 4); ctx.fill();
    } else if (filled > 0) {
      // 空格底
      ctx.fillStyle = COLORS.hpEmpty;
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 4); ctx.fill();
      // 半格填色（左半）
      ctx.fillStyle = '#e08030'; // 橘色代表半格
      ctx.beginPath(); ctx.roundRect(bx, by, bw / 2, bh, [4,0,0,4]); ctx.fill();
    } else {
      ctx.fillStyle = COLORS.hpEmpty;
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 4); ctx.fill();
    }
  }
  // 文字顯示 hp（清楚顯示小數）
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${player.hp}/${player.maxHp}`, pad + 28, 44);

  // Timer
  ctx.fillStyle = timeLeft <= 10 ? '#ff6b6b' : '#fff';
  ctx.font = `bold 20px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(`⏱ ${String(timeLeft).padStart(2,'0')}`, CANVAS_W / 2, 30);

  // Coins & balloons & round balloon
  ctx.textAlign = 'right';
  ctx.font = '14px sans-serif';
  // 圓氣球（只在有圓氣球收集物的關卡顯示，目前為第 3 關）
  const showRound = roundBalloons.length > 0;
  const colOffset = showRound ? 150 : 100;
  ctx.fillStyle = '#FFD700';
  ctx.fillText(`🪙 ${player.coinsCollected}`, CANVAS_W - pad - colOffset, 28);
  ctx.fillStyle = '#FF69B4';
  ctx.fillText(`🎈 ${player.balloonsCollected}`, CANVAS_W - pad - (showRound ? 50 : 0), 28);
  if (showRound) {
    ctx.fillStyle = '#c8aaff';
    ctx.fillText(`⚪ ${currentRunStats.roundBalloon}`, CANVAS_W - pad, 28);
  }

  // 裝備顯示（右側 HUD 下方）
  // 裝備顯示（依 activeSlot）
  ctx.textAlign = 'right';
  const activeItem = activeSlot === 'hammer' ? equippedHammer : equippedSword;
  if (activeItem && activeItem.id) {
    const itemEmoji = activeSlot === 'hammer' ? '🔨' : '⚔️';
    ctx.font = '12px sans-serif';
    ctx.fillStyle = activeSlot === 'hammer' ? '#ffd080' : '#c8f0ff';
    ctx.fillText(`${itemEmoji} ${activeItem.name}`, CANVAS_W - pad, 58);
    const durBarW = 80;
    const durBarX = CANVAS_W - pad - durBarW;
    const durFrac = activeItem.currentDur / activeItem.maxDur;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(durBarX, 62, durBarW, 5);
    ctx.fillStyle = durFrac > 0.4 ? '#60d080' : '#e08040';
    ctx.fillRect(durBarX, 62, durBarW * durFrac, 5);
    ctx.fillStyle = 'rgba(200,240,255,0.6)';
    ctx.font = '10px sans-serif';
    ctx.fillText(`${activeItem.currentDur}/${activeItem.maxDur}`, CANVAS_W - pad, 76);
  } else {
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

// ── buildBagRows：產生「目前背包」顯示陣列 ──
// 製作道具後呼叫 refreshResultBag() 即時更新，不需重跑整個 populateResultPanel
function buildBagRows() {
  const ci = playerInventory.craftedItems || {};
  const rows = [
    ['🪙 金幣總計',         `${playerInventory.coins} 枚`,          'result-gold'],
    ['🎈 260 長條氣球總計', `${playerInventory.balloon260} 條`,     'result-pink'],
  ];
  if (playerInventory.roundBalloon > 0) {
    rows.push(['⚪ 圓氣球總計', `${playerInventory.roundBalloon} 顆`, 'result-purple']);
  }
  // 基礎氣球劍：x數量｜裝備 dur/max（合併，不重複）
  const swordQty = ci.basicSword || 0;
  if (swordQty > 0 || equippedSword.id === 'basicSword') {
    const qty    = Math.max(swordQty, equippedSword.id === 'basicSword' ? 1 : 0);
    const durStr = equippedSword.id === 'basicSword'
      ? `｜裝備 ${equippedSword.currentDur}/${equippedSword.maxDur}`
      : '';
    rows.push([`⚔️ 基礎氣球劍`, `x${qty}${durStr}`, 'result-cyan']);
  }
  // 基礎氣球槌
  if ((ci.basicHammer || 0) > 0) {
    const hqty   = ci.basicHammer;
    const hdurStr = (equippedHammer.id && activeSlot === 'hammer')
      ? `｜裝備 ${equippedHammer.currentDur}/${equippedHammer.maxDur}` : '';
    rows.push([`🔨 基礎氣球槌`, `x${hqty}${hdurStr}`, 'result-purple']);
  }
  // 氣球棒棒糖
  if ((ci.balloonLollipop || 0) > 0) {
    rows.push([`🍭 氣球棒棒糖`, `x${ci.balloonLollipop}`, 'result-pink']);
  }
  return rows;
}

// ── refreshResultBag：製作道具後即時重繪「目前背包」區塊 ──
// 使用明確 id="rp-inventory-section"，不猜 querySelectorAll index

// ── refreshResultDog：製作狗後即時更新狗區塊（含帶狗出門提示）──
function refreshResultDog() {
  const sec = document.getElementById('dog-section');
  if (!sec) return;
  const dog    = playerInventory.balloonDog || {};
  const hasDog = dog.present;
  const turns  = dog.turnsLeft || 0;
  const nextLvIndex        = currentLevelIndex + 1;
  const nextLvHasTreasure  = nextLvIndex < LEVELS.length && !!LEVELS[nextLvIndex]?.hiddenTreasure;
  const canBringDog        = hasDog && (playerInventory.balloon260 || 0) >= 1;

  let inner = '';
  if (hasDog) {
    inner += '<div class="rp-section-title">🐶 氣球小狗</div>';
    inner += '<div class="rp-row"><span class="rp-label">狀態</span><span class="rp-val result-gold">已在小V的家</span></div>';
    inner += '<div class="rp-row"><span class="rp-label">陪伴回合</span><span class="rp-val result-blue">' + turns + ' 回合</span></div>';
    if (nextLvHasTreasure) {
      inner += '<div class="rp-supply-hp" style="color:#ffe080">氣球小狗好像聞到了什麼……下一關也許有隱藏寶物，記得帶牠一起去！</div>';
      const btnLabel  = canBringDog ? '帶狗出發 -1 🎈' : '氣球不足';
      const btnDisStr = canBringDog ? '' : 'disabled';
      const btnCls    = canBringDog ? '' : 'rp-supply-btn--disabled';
      inner += '<div class="rp-supply-item" style="margin-top:6px">'
        + '<div class="rp-supply-info"><span class="rp-supply-name">帶氣球小狗出發</span>'
        + '<span class="rp-supply-price">消耗 260 長條氣球 x1 作為牽繩</span></div>'
        + '<button id="btn-bring-dog" class="rp-supply-btn ' + btnCls + '" ' + btnDisStr
        + ' onclick="bringDogNextLevel()">' + btnLabel + '</button></div>';
    }
  } else {
    inner += '<div class="rp-section-title">🐶 氣球小狗</div>';
    inner += '<div class="rp-row"><span class="rp-label">狀態</span><span class="rp-val" style="color:#666">尚未入住</span></div>';
  }
  sec.innerHTML = inner;
}

function refreshResultBag() {
  const section = document.getElementById('rp-inventory-section');
  if (!section) return; // 結算畫面未開啟
  const rows    = buildBagRows();
  const content = rows.map(([label, val, cls]) =>
    `<div class="rp-row"><span class="rp-label">${label}</span><span class="rp-val ${cls}">${val}</span></div>`
  ).join('');
  // 保留 section-title，只替換內容列
  const title = section.querySelector('.rp-section-title');
  section.innerHTML = '';
  if (title) section.appendChild(title);
  section.insertAdjacentHTML('beforeend', content);
}

function populateResultPanel() {
  const timeLeft = Math.max(0, LEVEL_DURATION - Math.floor(elapsedSec));
  const ci       = playerInventory.craftedItems || {}; // 供 hammerHint 等使用

  // 本關成果
  const runRows = [
    ['🪙 金幣',         `${currentRunStats.coins} 枚`,                'result-gold'],
    ['🎈 260 長條氣球', `${currentRunStats.balloon260} 條`,           'result-pink'],
    ...(currentRunStats.roundBalloon > 0
      ? [['🎈 圓氣球',  `${currentRunStats.roundBalloon} 顆`,         'result-purple']]
      : []),
    ['💥 擊退小怪',     `${currentRunStats.enemiesDefeated} 隻`,      'result-orange'],
    ['🩹 受傷次數',     `${currentRunStats.damageTaken} 次`,          'result-red'],
    ['⏱  剩餘時間',     `${timeLeft} 秒`,                             'result-blue'],
  ];

  // 背包
  // 背包道具顯示（統一由 buildBagRows() 產生，製作後即時重繪用）
  const bagRows = buildBagRows();

  // 小知識（各關有偏好的小知識）
  let trivia;
  const orangeIdx  = TRIVIA.findIndex(t => t.includes('橘子皮') || t.includes('柑橘'));
  const routeIdx   = TRIVIA.findIndex(t => t.includes('路線') || t.includes('通行'));
  if (currentLevelIndex === 1 && Math.random() < 0.6 && orangeIdx >= 0) {
    trivia = TRIVIA[orangeIdx]; // 第 2 關：橘子皮相關
  } else if (currentLevelIndex === 2 && Math.random() < 0.55 && routeIdx >= 0) {
    trivia = TRIVIA[routeIdx];  // 第 3 關：路線/通行相關
  } else {
    trivia = TRIVIA[(currentRunStats.coins + currentRunStats.balloon260) % TRIVIA.length];
  }

  function makeTable(rows) {
    return rows.map(([label, val, cls]) =>
      `<div class="rp-row"><span class="rp-label">${label}</span><span class="rp-val ${cls}">${val}</span></div>`
    ).join('');
  }

  console.log('[populateResultPanel] unlockedHammerThisClear:', currentRunStats.unlockedHammerThisClear);
  console.log('[populateResultPanel] foundHiddenTreasure:', currentRunStats.foundHiddenTreasure,
    'name:', currentRunStats.foundHiddenTreasureName,
    'pendingCoins:', currentRunStats.pendingCoins);

  // 隱藏物發現提示（只在通關結算時顯示）
  const treasureHint = (gameState === 'clear' && currentRunStats.foundHiddenTreasure)
    ? ('<div class="rp-guidebook-hint" style="border-color:rgba(255,220,80,0.5);background:rgba(80,60,0,0.2)">'
      + '<div class="rp-guidebook-hint__title">🎉 隱藏發現！</div>'
      + '<div class="rp-guidebook-hint__body">'
      + (currentRunStats.foundHiddenTreasureName === '金幣寶箱'
          ? '金幣寶箱 +' + (currentRunStats.pendingCoins || 30) + ' 金幣 已加入背包！'
          : '氣球棒棒糖秘笈已解鎖！可在氣球秘笈中查看。')
      + '</div></div>')
    : '';

  // 氣球狗相關
  const dogData       = playerInventory.balloonDog || {};
  const hasDog        = dogData.present;
  const dogTurns      = dogData.turnsLeft || 0;
  const nextLvIndex   = currentLevelIndex + 1;
  const nextLvHasTreasure = nextLvIndex < LEVELS.length
    && !!LEVELS[nextLvIndex].hiddenTreasure;
  const canBringDog   = hasDog && (playerInventory.balloon260 || 0) >= 1;

  // 第 3 關：basicHammer 解鎖提示（只在「這局第一次解鎖」時顯示）
  const ur = playerInventory.unlockedRecipes || {};
  const hammerHint = currentRunStats.unlockedHammerThisClear ? `
    <div class="rp-guidebook-hint" style="border-color:rgba(160,120,255,0.4);background:rgba(80,40,160,0.15)">
      <div class="rp-guidebook-hint__title">🔨 新秘笈解鎖：基礎氣球槌！</div>
      <div class="rp-guidebook-hint__body">
        你找到圓氣球了！可以用 <strong>圓氣球 x1 + 260 長條氣球 x1</strong> 製作基礎氣球槌。<br>
        點選下方「氣球秘笈」查看。
      </div>
    </div>
  ` : '';

  // 第 1 關結算：加入氣球秘笈教學區塊
  const guideBookHint = currentLevelIndex === 0 ? `
    <div class="rp-guidebook-hint">
      <div class="rp-guidebook-hint__title">📖 氣球秘笈解鎖！</div>
      <div class="rp-guidebook-hint__body">
        收集到 260 長條氣球後，可以在<strong>氣球秘笈</strong>裡製作基礎氣球劍，帶入下一關使用！
      </div>
    </div>
  ` : '';

  const panel = document.getElementById('result-panel-body');
  if (!panel) return;

  // ── 組裝各區塊 HTML（不用巢狀 template literal，避免瀏覽器解析問題）──

  // 氣球狗區塊
  let dogSectionHtml = '';
  if (hasDog) {
    let dogInner = '';
    dogInner += '<div class="rp-section-title">🐶 氣球小狗</div>';
    dogInner += '<div class="rp-row"><span class="rp-label">狀態</span><span class="rp-val result-gold">已在小V的家</span></div>';
    dogInner += '<div class="rp-row"><span class="rp-label">陪伴回合</span><span class="rp-val result-blue">' + dogTurns + ' 回合</span></div>';
    if (currentRunStats.dogHealed) {
      dogInner += '<div class="rp-row"><span class="rp-label">❤️ 結算回血</span><span class="rp-val result-red">+0.5</span></div>';
    }
    if (currentRunStats.dogGoneThisClear) {
      dogInner += '<div class="rp-supply-hp" style="color:#ffaaaa">氣球小狗慢慢消氣了。牠陪小V完成了一段美好的冒險。</div>';
    }
    if (nextLvHasTreasure && !currentRunStats.dogGoneThisClear) {
      dogInner += '<div class="rp-supply-hp" style="color:#ffe080">氣球小狗好像聞到了什麼……下一關也許有隱藏寶物，記得帶牠一起去！</div>';
      const btnLabel  = canBringDog ? '帶狗出發 -1 🎈' : '氣球不足';
      const btnDisStr = canBringDog ? '' : 'disabled';
      const btnCls    = canBringDog ? '' : 'rp-supply-btn--disabled';
      dogInner += '<div class="rp-supply-item" style="margin-top:6px">'
        + '<div class="rp-supply-info">'
        + '<span class="rp-supply-name">帶氣球小狗出發</span>'
        + '<span class="rp-supply-price">消耗 260 長條氣球 x1 作為牽繩</span>'
        + '</div>'
        + '<button id="btn-bring-dog" class="rp-supply-btn ' + btnCls + '" ' + btnDisStr + ' onclick="bringDogNextLevel()">'
        + btnLabel + '</button></div>';
    }
    dogSectionHtml = '<div class="rp-section" id="dog-section">' + dogInner + '</div>';
  } else {
    dogSectionHtml = '<div class="rp-section" id="dog-section">'
      + '<div class="rp-section-title">🐶 氣球小狗</div>'
      + '<div class="rp-row"><span class="rp-label">狀態</span><span class="rp-val" style="color:#666">尚未入住</span></div>'
      + '</div>';
  }

  // 貼布按鈕文字
  const bandageBtnText = playerInventory.coins < 20 ? '金幣不足'
    : player.hp >= player.maxHp ? '生命已滿'
    : ('購買並使用 -' + BANDAGE_PRICE + ' 🪙');

  // 組合完整 HTML
  let html = '';
  html += '<div class="rp-level-name">' + (LEVELS[currentLevelIndex]?.emoji || '🌿') + ' ' + LEVEL_NAME + '</div>';
  html += '<div class="rp-section" id="rp-run-section"><div class="rp-section-title">📋 本關成果</div>' + makeTable(runRows) + '</div>';
  html += '<div class="rp-section" id="rp-inventory-section"><div class="rp-section-title">🎒 目前背包</div>' + makeTable(buildBagRows()) + '</div>';
  html += treasureHint;
  html += hammerHint;
  html += guideBookHint;
  html += dogSectionHtml;
  html += '<div class="rp-section" id="supply-section">'
    + '<div class="rp-section-title">🏠 小V的家・補給</div>'
    + '<div class="rp-supply-hp">❤️ 目前生命：<span id="supply-hp">' + player.hp + ' / ' + player.maxHp + '</span></div>'
    + '<div class="rp-supply-item"><div class="rp-supply-info">'
    + '<span class="rp-supply-name">🩹 愛心貼布</span>'
    + '<span class="rp-supply-price">20 🪙　+1 ❤️</span>'
    + '</div><button id="btn-buy-bandage" class="rp-supply-btn" onclick="buyBandage()">'
    + bandageBtnText + '</button></div>'
    + '<div id="bandage-msg" class="rp-supply-msg"></div></div>';
  html += '<div class="rp-trivia">💡 ' + trivia + '</div>';

  panel.innerHTML = html;

  // 更新補給按鈕狀態（購買後重刷用）
  updateBandageBtn();

  // 秘笈按鈕強調 + 建議查看文字
  const btnGuide = document.getElementById('btn-guidebook');
  if (btnGuide) {
    const isHammerUnlock = currentRunStats.unlockedHammerThisClear === true;
    const shouldHighlight = currentLevelIndex === 0 || isHammerUnlock;
    btnGuide.classList.toggle('result-btn--guide-highlight', shouldHighlight);

    // 按鈕主文字（第一個 text node）
    const textNode = [...btnGuide.childNodes].find(n => n.nodeType === 3);
    if (textNode) {
      textNode.textContent = isHammerUnlock ? '氣球秘笈' : '氣球秘笈';
    }
    // 副標（.result-btn-sub span）
    const sub = btnGuide.querySelector('.result-btn-sub');
    if (sub) sub.textContent = isHammerUnlock ? '建議查看' : 'Guidebook';
  }
}


// ── 愛心貼布購買（結算畫面補給區）────────────
// TODO: 正式版改為在「小V的家」購買，放進背包，關卡中按暫停使用，每關最多一次

const BANDAGE_PRICE = 20;
const BANDAGE_HEAL  = 1;

function buyBandage() {
  if (player.hp >= player.maxHp) return;
  if (currentRunStats.usedHeartPatch) return;        // 每關限一次
  if (playerInventory.coins < BANDAGE_PRICE) return;
  playerInventory.coins -= BANDAGE_PRICE;
  player.hp = Math.min(player.maxHp, player.hp + BANDAGE_HEAL);
  currentRunStats.usedHeartPatch = true;
  saveInventory();

  // 更新補給區目前生命
  const supplyHp = document.getElementById('supply-hp');
  if (supplyHp) supplyHp.textContent = `${player.hp} / ${player.maxHp}`;
  // 更新目前背包（金幣減少）
  refreshResultBag();
  // 更新按鈕狀態
  updateBandageBtn();
  // 注意：本關成果 (rp-run-section) 完全不動
  // 顯示訊息
  const msg = document.getElementById('bandage-msg');
  if (msg) {
    msg.textContent = `❤️ 使用愛心貼布，恢復 ${BANDAGE_HEAL} 生命！`;
    msg.style.opacity = '1';
    clearTimeout(msg._t);
    msg._t = setTimeout(() => { msg.style.opacity = '0'; }, 2500);
  }
}

function updateBandageBtn() {
  const btn = document.getElementById('btn-buy-bandage');
  if (!btn) return;
  if (player.hp >= player.maxHp) {
    btn.textContent = '生命已滿';
    btn.disabled = true;
    btn.classList.add('rp-supply-btn--disabled');
  } else if (currentRunStats.usedHeartPatch) {
    btn.textContent = '本關已使用';
    btn.disabled = true;
    btn.classList.add('rp-supply-btn--disabled');
  } else if (playerInventory.coins < BANDAGE_PRICE) {
    btn.textContent = '金幣不足';
    btn.disabled = true;
    btn.classList.add('rp-supply-btn--disabled');
  } else {
    btn.textContent = `購買並使用 -${BANDAGE_PRICE} 🪙`;
    btn.disabled = false;
    btn.classList.remove('rp-supply-btn--disabled');
  }
}


// ── 帶氣球小狗出門（結算畫面按鈕）────────────
function bringDogNextLevel() {
  const dog = playerInventory.balloonDog || {};
  console.log('prepare bring dog:', {
    present: dog.present,
    turnsLeft: dog.turnsLeft,
    balloon260: playerInventory.balloon260,
    nextBringDog
  });
  if (!dog.present) { console.warn('no dog'); return; }
  if ((playerInventory.balloon260 || 0) < 1) {
    showHint('需要 260 長條氣球 x1 作為牽繩', 180);
    return;
  }
  playerInventory.balloon260--;
  nextBringDog = true;  // 下一關才生效，不是現在
  saveInventory();
  const btn = document.getElementById('btn-bring-dog');
  if (btn) {
    btn.textContent = '已安排帶狗出發 🐶';
    btn.disabled = true;
    btn.classList.add('rp-supply-btn--disabled');
  }
  refreshResultBag(); // 更新 260 氣球數量
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
  // 確保所有 overlay 關掉
  const pauseEl  = document.getElementById('pause-overlay');
  if (pauseEl) pauseEl.style.display = 'none';
  hideFailedOverlay();
  // 恢復暫停按鈕顯示
  if (typeof window.showPauseBtn === 'function') window.showPauseBtn();
  // Reset player stats (本局)
  Object.assign(player, {
    x: 100, y: GROUND_Y - CONFIG.PLAYER_H,
    vx: 0, vy: 0,
    onGround: false, facingRight: true,
    hp: player.maxHp, invincible: 0,  // 使用 maxHp（支援自訂）
    attackCooldown: 0, attackActive: 0,
    meleeActive: 0, meleeHit: false, meleeHammerActive: 0, hammerHit: false,
    coinsCollected: 0, balloonsCollected: 0, enemiesDefeated: 0,
  });
  // Reset currentRunStats（本局歸零，inventory 不動）
  currentRunStats.coins                   = 0;
  currentRunStats.balloon260              = 0;
  currentRunStats.roundBalloon            = 0;
  currentRunStats.enemiesDefeated         = 0;
  currentRunStats.damageTaken             = 0;
  currentRunStats.unlockedHammerThisClear = false;
  currentRunStats.usedHeartPatch          = false;
  currentRunStats.foundHiddenTreasure     = false;
  currentRunStats.pendingRecipeUnlocks     = {};
  currentRunStats.pendingCoins             = 0;
  currentRunStats.foundHiddenTreasureName  = null;
  currentRunStats.foundTreasureCoins      = 0;
  if (currentHiddenTreasure) currentHiddenTreasure.found = false; // 重試時重置取得狀態
  currentRunStats.dogHealed               = false;
  currentRunStats.dogGoneThisClear        = false;
  // bringBalloonDog 由 next/retry button 管理，不在 restart 清除
  dogNoseGlow  = 0;
  dogNoseLevel = 0;

  // 注意：耐久由 triggerClear 通關時才儲存，不在 restart 裡儲存
  // （避免死亡後耐久被錯誤存入）

  // 重新初始化裝備
  initEquippedSword();
  initEquippedHammer();
  activeSlot = equippedSword.id ? 'sword' : (equippedHammer.id ? 'hammer' : 'sword');

  // Reset world
  cameraX    = 0;
  frameCount = 0;
  elapsedSec = 0;

  // ── 建立進關前快照（在 gameState = 'playing' 前，關卡剛初始化完成時）──
  levelStartSnapshot = {
    coins:              playerInventory.coins,
    balloon260:         playerInventory.balloon260,
    roundBalloon:       playerInventory.roundBalloon,
    craftedItems:       JSON.parse(JSON.stringify(playerInventory.craftedItems || {})),
    unlockedRecipes:    JSON.parse(JSON.stringify(playerInventory.unlockedRecipes || {})),
    uniqueCollectibles: JSON.parse(JSON.stringify(playerInventory.uniqueCollectibles || {})),
    balloonDog:         JSON.parse(JSON.stringify(playerInventory.balloonDog || {})),
    equippedSwordId:    equippedSword.id,
    equippedSwordDur:   equippedSword.currentDur,
    equippedSwordMax:   equippedSword.maxDur,
    equippedHammerId:   equippedHammer.id,
    equippedHammerDur:  equippedHammer.currentDur,
    equippedHammerMax:  equippedHammer.maxDur,
    activeSlot:         activeSlot,
    hp:                 player.hp,
  };
  console.log('levelStartSnapshot created:', {
    coins: levelStartSnapshot.coins,
    hammer: levelStartSnapshot.craftedItems.basicHammer,
    hammerDur: levelStartSnapshot.equippedHammerDur,
    swordDur:  levelStartSnapshot.equippedSwordDur,
  });

  gameState  = 'playing';

  coins.forEach(c => { c.collected = false; });
  balloons260.forEach(b => { b.collected = false; });
  enemies.forEach(e => { e.active = true; e.hp = 2; e.x = e.patrol; e.hitFlash = 0; });
  orangeNemeses.forEach(o => { o.phase = 'idle'; o.phaseTimer = 0; o.sprayActive = false; });
  roundBalloons.forEach(r => { r.collected = false; });
  spinningEnemies.length = 0;
  breakableTrees.forEach(t => { t.state = 'standing'; t.fallTimer = 0; t.safeZone = null; });
  projectiles.length = 0;
  resetHints();
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
  // 再玩一次 / 下一關
  const btnPlay = document.getElementById('btn-play-again');
  if (btnPlay) {
    ['click', 'touchstart'].forEach(ev =>
      btnPlay.addEventListener(ev, e => {
        e.preventDefault();
        if (gameState !== 'playing') {
          try {
            if (btnPlay._nextLevel) {
              const nextIdx = currentLevelIndex + 1;
              console.log('NEXT LEVEL CLICKED', {
                currentLevelIndex, nextIdx,
                levelsLength: LEVELS.length,
                nextBringDog, bringBalloonDog,
                hasDog: !!(playerInventory.balloonDog?.present),
              });
              if (nextIdx >= LEVELS.length) {
                console.warn('No more levels, restarting current');
                loadLevel(currentLevelIndex);
                restart();
                return;
              }
              bringBalloonDog = (nextBringDog === true);
              nextBringDog    = false;
              console.log('BEFORE loadLevel', nextIdx);
              loadLevel(nextIdx);
              console.log('AFTER loadLevel, hiddenTreasure:', currentHiddenTreasure);
              console.log('BEFORE restart, bringBalloonDog:', bringBalloonDog);
              restart();
              console.log('AFTER restart');
            } else {
              nextBringDog    = false;
              bringBalloonDog = false;
              loadLevel(currentLevelIndex);
              restart();
            }
          } catch(err) {
            showDebugError('NEXT LEVEL CRASH', err.message, '', '', '', err.stack);
          }
        }
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



// ── Pause overlay 內部按鈕綁定 ────────────────
// 注意：外部暫停按鈕的事件在 index.html script 中綁定（DOM 已存在時執行）
(function bindPauseOverlayButtons() {
  // 繼續遊戲
  const btnResume = document.getElementById('btn-resume');
  if (btnResume) {
    ['click', 'touchstart'].forEach(ev =>
      btnResume.addEventListener(ev, e => { e.preventDefault(); resumeGame(); })
    );
  }
  // 重新開始（從暫停畫面）
  const btnRestart = document.getElementById('btn-pause-restart');
  if (btnRestart) {
    ['click', 'touchstart'].forEach(ev =>
      btnRestart.addEventListener(ev, e => {
        e.preventDefault();
        gameState = 'playing'; // 先設回 playing 讓 restart() 不被擋
        restart();
      })
    );
  }
  // 外部 #btn-pause 與 #btn-pause-ingame 的事件已在 index.html 綁定，勿重複
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
    // 未解鎖的配方不顯示
    if (recipe.unlockKey) {
      const ur = playerInventory.unlockedRecipes || {};
      if (!ur[recipe.unlockKey]) return;
    }

    // 氣球狗特殊邏輯
    const isDog = recipe.id === 'balloonDog';
    const dogData = playerInventory.balloonDog || {};
    const ci    = playerInventory.craftedItems || {};
    const owned = isDog ? (dogData.present ? 1 : 0) : (ci[recipe.id] || 0);

    // 計算材料是否足夠
    let canCraft = true;
    const matLines = [];
    for (const [mat, qty] of Object.entries(recipe.cost)) {
      const have = playerInventory[mat] || 0;
      const ok   = have >= qty;
      if (!ok) canCraft = false;
      matLines.push({ matName: matName(mat), have, qty, ok });
    }

    const card = document.createElement('div');
    card.className = 'recipe-card';

    // 材料 HTML
    const matsHtml = matLines.map(m =>
      `<span class="recipe-mat ${m.ok ? '' : 'recipe-mat--low'}">
        ${m.ok ? '✅' : '⚠️'} ${m.matName}：${m.have} / ${m.qty}
      </span>`
    ).join('');

    // 製作按鈕文字
    let craftBtnText = canCraft ? '製作' : '材料不足';
    let craftDisabled = !canCraft;
    if (recipe.maxOne && owned >= 1)  { craftBtnText = '已在小V的家'; craftDisabled = true; }
    if (recipe.comingSoon)            { craftBtnText = '即將開放'; craftDisabled = true; }

    const durLine = recipe.durability > 0
      ? `<div class="recipe-card__dur">耐久：可攻擊 ${recipe.durability} 次</div>` : '';
    const ownedLabel = isDog
      ? (owned > 0 ? '<span class="recipe-card__owned">已在小V的家</span>' : '')
      : (owned > 0 ? `<span class="recipe-card__owned">已擁有 ${owned} 把</span>` : '');

    card.innerHTML = `
      <div class="recipe-card__header">
        <span class="recipe-card__emoji">${recipe.emoji}</span>
        <span class="recipe-card__name">${recipe.name}</span>
        ${ownedLabel}
      </div>
      <div class="recipe-card__effect">效果：${recipe.effect}</div>
      ${durLine}
      <div class="recipe-card__mats">${matsHtml}</div>
      <button class="recipe-card__btn ${craftDisabled ? 'recipe-card__btn--disabled' : ''}"
              data-id="${recipe.id}" ${craftDisabled ? 'disabled' : ''}>
        ${craftBtnText}
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
            renderGuidebook();
            refreshResultBag();
            if (recipe.id === 'balloonDog') refreshResultDog(); // 狗區塊即時更新
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

  requestAnimationFrame(loop);
}

// ── 初始化並啟動 ────────────────────────────
loadLevel(0);        // 載入第 1 關
initEquippedSword(); // 初始化裝備（只執行一次）
initEquippedHammer();
requestAnimationFrame(loop);

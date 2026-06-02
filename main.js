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
  SCROLL_SPEED:    2.2,   // 鏡頭自動推進速度（px/幀）

  // -- 關卡 --
  LEVEL_DURATION:  60,    // 關卡時間限制（秒）
  LEVEL_LENGTH:    6400,  // 第 1 關世界寬度（約 60 秒）

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
  // Esc：playing ↔ paused 切換（結算/秘笈時不處理）
  if (e.code === 'Escape') {
    if (gameState === 'playing') { pauseGame(); return; }
    if (gameState === 'paused')  { resumeGame(); return; }
    return; // gameover / clear 狀態 Esc 不做事
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
  coins:      0,
  balloon260: 0,
  // 未來材料可在此擴充：balloon160, roundBalloon5, roundBalloon12, recipeCards ...
  craftedItems: {
    basicSword: 0,
    // 未來可在此擴充更多道具
  },
  // 目前裝備的劍耐久（localStorage 持久化，關卡結束後保留）
  equippedSwordDur: 0,
  // 第 1 關教學劍是否已發放（防止重複刷劍）
  tutorialSwordGranted: false,
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
  playerInventory.craftedItems         = Object.assign({}, INVENTORY_DEFAULTS.craftedItems);
  playerInventory.equippedSwordDur     = 0;
  playerInventory.tutorialSwordGranted = false; // 清除背包後可重領教學劍
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
// gameState 用 var 使其成為全域變數，讓 index.html script 也可讀取
var gameState = 'playing'; // 'playing' | 'paused' | 'gameover' | 'clear'
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
let orangeNemeses = generateOrangeNemeses(); // balloonNemesis: 不能被攻擊
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
      // 選擇性：1 隻在段 4，不是本關主角，位置寬鬆可跳過
      { x: 4600, y: GROUND_Y - CONFIG.ORANGE_H,
        w: CONFIG.ORANGE_W, h: CONFIG.ORANGE_H,
        sprayDir: -1, phase: 'idle', phaseTimer: 0, sprayActive: false },
    ],
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

  // 複製 hints（每次都要 reset shown 狀態）
  HINTS.length = 0;
  lv.hints.forEach(h => HINTS.push(Object.assign({}, h, { shown: false })));

  currentLevelIndex = index;

  // 第 1 關：嘗試發放教學劍（有保護機制，不會重複）
  // 注意：此時 initEquippedSword 尚未被 restart() 呼叫，
  // grantTutorialSwordIfNeeded 裡有獨立的 initEquippedSword 呼叫
  if (index === 0) grantTutorialSwordIfNeeded();
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
  if (gameState !== 'playing') return;
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
  checkHints();
  tickHint();
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


// ── Pause / Resume ────────────────────────────
function pauseGame() {
  if (gameState !== 'playing') return;
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

function triggerGameOver() {
  currentRunStats.enemiesDefeated = player.enemiesDefeated;
  saveInventory();
  gameState = 'gameover';
  populateResultPanel();
  showResultButtons();
  if (typeof window.hidePauseBtn === 'function') window.hidePauseBtn();
}

function triggerClear() {
  currentRunStats.enemiesDefeated = player.enemiesDefeated;
  saveInventory();
  gameState = 'clear';
  populateResultPanel();
  updateNextLevelButton(); // 第1關通關 → 按鈕改「下一關」
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
  panel.innerHTML = `
    <div class="rp-level-name">${LEVELS[currentLevelIndex]?.emoji || '🌿'} ${LEVEL_NAME}</div>
    <div class="rp-section">
      <div class="rp-section-title">📋 本關成果</div>
      ${makeTable(runRows)}
    </div>
    <div class="rp-section">
      <div class="rp-section-title">🎒 目前背包</div>
      ${makeTable(bagRows)}
    </div>
    ${guideBookHint}
    <div class="rp-trivia">
      💡 ${trivia}
    </div>
  `;

  // 第 1 關結算：輕微強調氣球秘笈按鈕
  const btnGuide = document.getElementById('btn-guidebook');
  if (btnGuide) {
    if (currentLevelIndex === 0) {
      btnGuide.classList.add('result-btn--guide-highlight');
    } else {
      btnGuide.classList.remove('result-btn--guide-highlight');
    }
  }
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
  // 確保暫停 overlay 也關掉
  const pauseEl = document.getElementById('pause-overlay');
  if (pauseEl) pauseEl.style.display = 'none';
  // 恢復暫停按鈕顯示
  if (typeof window.showPauseBtn === 'function') window.showPauseBtn();
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
          if (btnPlay._nextLevel) {
            // 進入下一關：背包保留，關卡 index +1
            const nextIdx = currentLevelIndex + 1;
            loadLevel(nextIdx);
            restart();
          } else {
            // 再玩一次：重載同一關
            loadLevel(currentLevelIndex);
            restart();
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

  requestAnimationFrame(loop);
}

// ── 初始化並啟動 ────────────────────────────
loadLevel(0);        // 載入第 1 關
initEquippedSword(); // 初始化裝備（只執行一次）
requestAnimationFrame(loop);

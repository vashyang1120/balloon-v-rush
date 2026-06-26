
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
//  Phase 1 — 正式版資料結構整理
// =============================================

// ── 版本資訊 ──────────────────────────────────
const GAME_VERSION = 'adventure-v0.3.13-orange-skin-foundation-test-1';
const BUILD_TIME   = '2026-06-24 12:00';
// 更新版本時同步修改 index.html 的 <script src="main.js?v=...">

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
// =============================================
//  CONFIG — 全域數值常數（Phase 1 整理）
//  修改遊戲數值請集中在此，不要散落 magic number
//  下方數值與 MVP 封版版本一致，未修改任何數值
// =============================================
const CONFIG = {
  // ── 玩家 ──
  MAX_HP:                    3,
  // ── 補給 ──
  HEART_PATCH_COST:          20,
  HEART_PATCH_HEAL:          1,
  // ── 氣球狗 ──
  DOG_HEAL_AMOUNT:           0.5,
  DOG_INITIAL_TURNS:         3,
  DOG_LEASH_COST_BALLOON260: 1,
  // ── 武器耐久 ──
  BASIC_SWORD_DURABILITY:    10,
  BASIC_HAMMER_DURABILITY:   3,
  // ── 隱藏物 ──
  GOLD_CHEST_REWARD:         30,
  TREASURE_DETECT_RADIUS:    50,   // 玩家碰到隱藏物的判定半徑
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


// ── 小V的作品牆連結（請填入實際 URL）───────────
const LINKS = {
  instagramWorks:      '',  // 例：'https://www.instagram.com/balloon.v'
  youtubePerformance:  '',  // 例：'https://www.youtube.com/...'
  youtubeTeaching:     '',  // 例：'https://www.youtube.com/...'
  officialSite:        '',  // 例：'https://balloonv.com'
};


// =============================================
//  玩家身份系統（Phase A）
//  playerProfile   — 玩家身份資料
//  playerKey       = encodeURIComponent(id) + "__" + baseAvatarKey
//  baseAvatarKey   — 用於產生 playerKey，不可隨意變更
//  displayAvatarKey — 顯示用，可更換，不影響 playerKey
//  avatarKey       — 舊 UI 相容，值等於 displayAvatarKey
//
//  localStorage key: 'balloonVAdventurePlayerProfile'
//  （與 balloonV_inventory 完全分離，清除背包不清身份）
// =============================================

const PLAYER_PROFILE_STORAGE_KEY = 'balloonVAdventurePlayerProfile';

const PLAYER_PROFILE_DEFAULTS = {
  id:               'Player',
  name:             'Player',
  baseAvatarKey:    'boy1',    // 身份頭像：用於產生 playerKey，不可輕易改變
  displayAvatarKey: 'boy1',    // 顯示頭像：可更換，不影響 playerKey
  avatarKey:        'boy1',    // 相容舊 UI，等於 displayAvatarKey
  playerKey:        '',        // encodeURIComponent(id) + "__" + baseAvatarKey
};

let playerProfile = null; // 由 loadPlayerProfile() 初始化

// ── buildPlayerKey ───────────────────────────
// ── encodeFirebaseKeyPart ──────────────────
// encodeURIComponent 不會轉 '.'，但 Firebase key 禁止 '.'
// 此函式在 encodeURIComponent 之後再替換 %2E 以外的 . 字元
function encodeFirebaseKeyPart(value) {
  return encodeURIComponent(value || 'Player').replace(/\./g, '%2E');
}

function buildPlayerKey(id, baseAvatarKey) {
  const newKey = encodeFirebaseKeyPart(id || 'Player') + '__' + (baseAvatarKey || 'boy1');
  return newKey;
}

// ── createDefaultPlayerProfile ───────────────
function createDefaultPlayerProfile() {
  const prof = Object.assign({}, PLAYER_PROFILE_DEFAULTS);
  prof.playerKey = buildPlayerKey(prof.id, prof.baseAvatarKey);
  return prof;
}

// ── normalizePlayerProfile ───────────────────
// 舊資料缺欄位時自動補齊，不可 crash
function normalizePlayerProfile(raw) {
  if (!raw || typeof raw !== 'object') return createDefaultPlayerProfile();
  const prof = Object.assign({}, PLAYER_PROFILE_DEFAULTS, raw);
  // avatarKey 等於 displayAvatarKey，不影響 playerKey
  prof.avatarKey = prof.displayAvatarKey || prof.baseAvatarKey || 'boy1';
  // playerKey：沿用既有值，不覆蓋；僅在尚未設定時才用新 encode
  const expectedKey = buildPlayerKey(prof.id, prof.baseAvatarKey);
  if (prof.playerKey) {
    if (prof.playerKey !== expectedKey) {
      console.warn('[normalizePlayerProfile] playerKey mismatch, keep existing until migration:', prof.playerKey, 'expected:', expectedKey);
    }
    // 沿用 prof.playerKey，不覆蓋
  } else {
    // 新玩家：用 encodeFirebaseKeyPart 產生 playerKey
    prof.playerKey = expectedKey;
  }
  return prof;
}

// ── loadPlayerProfile ────────────────────────
function loadPlayerProfile() {
  try {
    const raw = localStorage.getItem(PLAYER_PROFILE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return normalizePlayerProfile(parsed);
    }
  } catch(e) {
    console.warn('loadPlayerProfile failed, using default:', e.message);
  }
  return createDefaultPlayerProfile();
}

// ── savePlayerProfile ────────────────────────
function savePlayerProfile() {
  try {
    if (!playerProfile) return;
    localStorage.setItem(PLAYER_PROFILE_STORAGE_KEY, JSON.stringify(playerProfile));
  } catch(e) {
    console.warn('savePlayerProfile failed:', e.message);
  }
}

// ── getPlayerIdentityForResult ───────────────
// 未來給 gameLogs / leaderboard 使用
function getPlayerIdentityForResult() {
  const p = playerProfile || createDefaultPlayerProfile();
  return {
    id:               p.id,
    name:             p.name,
    playerKey:        p.playerKey,
    baseAvatarKey:    p.baseAvatarKey,
    displayAvatarKey: p.displayAvatarKey,
    avatarKey:        p.avatarKey,
  };
}

// ── setDisplayAvatarForTest ──────────────────
// 開發用：更換顯示頭像，不影響 playerKey
function setDisplayAvatarForTest(newDisplayAvatarKey) {
  if (!playerProfile) playerProfile = loadPlayerProfile();
  playerProfile.displayAvatarKey = newDisplayAvatarKey;
  playerProfile.avatarKey        = newDisplayAvatarKey;
  // baseAvatarKey 和 playerKey 不變
  savePlayerProfile();
  console.log('setDisplayAvatarForTest:', {
    displayAvatarKey: playerProfile.displayAvatarKey,
    baseAvatarKey:    playerProfile.baseAvatarKey,
    playerKey:        playerProfile.playerKey,
  });
  // 若小V的家已開啟，刷新玩家區塊
  if (typeof renderHomePlayer === 'function') renderHomePlayer();
}


// =============================================
//  V幣 Foundation（Phase 3A / localStorage 測試版）
//  Phase 3B 才接 Firebase players/{playerKey}/wallet
//  所有 localStorage key 依 playerKey 分流
// =============================================

// ── Firebase safety wrapper（Phase 3B 才啟用）──
function isFirebaseAvailable() {
  return typeof firebase !== 'undefined'
    && firebase.apps
    && firebase.apps.length
    && typeof firebase.database === 'function';
}

// ── playerKey-scoped storage key ────────────
function getPlayerScopedStorageKey(prefix) {
  const p = playerProfile || loadPlayerProfile();
  const key = p.playerKey || buildPlayerKey(p.id, p.baseAvatarKey);
  return prefix + '__' + key;
}

// ── Wallet ───────────────────────────────────
let playerWallet = null;

function getDefaultWallet() {
  return { vCoins: 0, totalEarnedVCoins: 0, totalSpentVCoins: 0, updatedAt: Date.now() };
}
function loadPlayerWallet() {
  try {
    const raw = localStorage.getItem(getPlayerScopedStorageKey('balloonVAdventureWallet'));
    if (raw) { playerWallet = Object.assign(getDefaultWallet(), JSON.parse(raw)); }
    else       { playerWallet = getDefaultWallet(); }
  } catch(e) { playerWallet = getDefaultWallet(); }
  return playerWallet;
}
function savePlayerWallet() {
  try {
    if (!playerWallet) return;
    playerWallet.updatedAt = Date.now();
    localStorage.setItem(getPlayerScopedStorageKey('balloonVAdventureWallet'), JSON.stringify(playerWallet));
  } catch(e) { console.warn('savePlayerWallet failed:', e.message); }
}
function ensurePlayerWallet() {
  if (!playerWallet) loadPlayerWallet();
  return playerWallet;
}

// ── DailyRewards ─────────────────────────────
let playerDailyRewards = null;

function getTodayKey() {
  // 台灣時間 UTC+8
  const d = new Date(Date.now() + 8 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}
function getDefaultDailyRewards() {
  return { lastDailyPlayDate: '', dailyPlayClaimed: false, streak: 0, updatedAt: Date.now() };
}
function loadDailyRewards() {
  try {
    const raw = localStorage.getItem(getPlayerScopedStorageKey('balloonVAdventureDailyRewards'));
    if (raw) { playerDailyRewards = Object.assign(getDefaultDailyRewards(), JSON.parse(raw)); }
    else       { playerDailyRewards = getDefaultDailyRewards(); }
  } catch(e) { playerDailyRewards = getDefaultDailyRewards(); }
  return playerDailyRewards;
}
function saveDailyRewards() {
  try {
    if (!playerDailyRewards) return;
    playerDailyRewards.updatedAt = Date.now();
    localStorage.setItem(getPlayerScopedStorageKey('balloonVAdventureDailyRewards'), JSON.stringify(playerDailyRewards));
  } catch(e) { console.warn('saveDailyRewards failed:', e.message); }
}
function canClaimDailyPlayReward() {
  const dr = playerDailyRewards || loadDailyRewards();
  return dr.lastDailyPlayDate !== getTodayKey();
}
function grantDailyPlayReward() {
  const dr = playerDailyRewards || loadDailyRewards();
  const yesterday = (() => {
    const d = new Date(Date.now() + 8*3600*1000 - 86400*1000);
    return d.toISOString().slice(0, 10);
  })();
  dr.streak            = (dr.lastDailyPlayDate === yesterday) ? (dr.streak || 0) + 1 : 1;
  dr.lastDailyPlayDate = getTodayKey();
  dr.dailyPlayClaimed  = true;
  playerDailyRewards   = dr;
  saveDailyRewards();
}

// ── PlayerHome ───────────────────────────────
let playerHomeData = null;

function getDefaultPlayerHome() {
  const p = playerProfile || loadPlayerProfile();
  return {
    name: (p.name || p.id || 'Player') + '的家',
    status: 'building',
    layoutVersion: 1,
    placedItems: {},
    updatedAt: Date.now(),
  };
}
function loadPlayerHome() {
  try {
    const raw = localStorage.getItem(getPlayerScopedStorageKey('balloonVAdventureHome'));
    if (raw) { playerHomeData = Object.assign(getDefaultPlayerHome(), JSON.parse(raw)); }
    else       { playerHomeData = getDefaultPlayerHome(); }
  } catch(e) { playerHomeData = getDefaultPlayerHome(); }
  return playerHomeData;
}
function savePlayerHome() {
  try {
    if (!playerHomeData) return;
    playerHomeData.updatedAt = Date.now();
    localStorage.setItem(getPlayerScopedStorageKey('balloonVAdventureHome'), JSON.stringify(playerHomeData));
  } catch(e) { console.warn('savePlayerHome failed:', e.message); }
}
function ensurePlayerHome() {
  if (!playerHomeData) loadPlayerHome();
  if (!playerHomeData.name) playerHomeData = getDefaultPlayerHome();
  return playerHomeData;
}

// ── VCoinLogs ────────────────────────────────
function loadVCoinLogs() {
  try {
    const raw = localStorage.getItem(getPlayerScopedStorageKey('balloonVAdventureVCoinLogs'));
    return raw ? JSON.parse(raw) : [];
  } catch(e) { return []; }
}
function saveVCoinLogs(logs) {
  try {
    // 最多保留 50 筆
    const trimmed = logs.slice(-50);
    localStorage.setItem(getPlayerScopedStorageKey('balloonVAdventureVCoinLogs'), JSON.stringify(trimmed));
  } catch(e) { console.warn('saveVCoinLogs failed:', e.message); }
}
function appendVCoinLog(entry) {
  const logs = loadVCoinLogs();
  logs.push(Object.assign({ ts: Date.now(), date: getTodayKey(), achievementKey: '' }, entry));
  saveVCoinLogs(logs);
}

// ── addVCoins ────────────────────────────────

// ── Achievements（一次性成就，Phase 3A）────────
// key: balloonVAdventureAchievements__{playerKey}
let playerAchievements = null;

function getDefaultAchievements() {
  return { claimed: {}, updatedAt: Date.now() };
}
function loadPlayerAchievements() {
  try {
    const raw = localStorage.getItem(getPlayerScopedStorageKey('balloonVAdventureAchievements'));
    if (raw) { playerAchievements = Object.assign(getDefaultAchievements(), JSON.parse(raw)); }
    else       { playerAchievements = getDefaultAchievements(); }
  } catch(e) { playerAchievements = getDefaultAchievements(); }
  return playerAchievements;
}
function savePlayerAchievements() {
  try {
    if (!playerAchievements) return;
    playerAchievements.updatedAt = Date.now();
    localStorage.setItem(
      getPlayerScopedStorageKey('balloonVAdventureAchievements'),
      JSON.stringify(playerAchievements)
    );
  } catch(e) { console.warn('savePlayerAchievements failed:', e.message); }
}
function hasClaimedAchievement(achievementKey) {
  const a = playerAchievements || loadPlayerAchievements();
  return !!(a.claimed && a.claimed[achievementKey]);
}
function grantAchievementReward(achievementKey, amount, meta) {
  if (!amount || amount <= 0) return false;
  if (hasClaimedAchievement(achievementKey))  return false; // 已領過，直接 return
  // 先記錄成就，再發 V幣
  const a = playerAchievements || loadPlayerAchievements();
  a.claimed[achievementKey] = {
    claimedAt:     Date.now(),
    amount,
    gameId:        meta?.gameId  || 'adventure',
    stageId:       meta?.stageId || '',
    achievementKey,
  };
  playerAchievements = a;
  savePlayerAchievements();
  // addVCoins 包含 appendVCoinLog（帶 achievementKey）
  addVCoins(amount, 'achievement', meta);
  return true;
}

function addVCoins(amount, source, meta) {
  if (!amount || amount <= 0) return;
  ensurePlayerWallet();
  playerWallet.vCoins             += amount;
  playerWallet.totalEarnedVCoins  += amount;
  savePlayerWallet();
  appendVCoinLog({
    gameId:         'adventure',
    source,
    amount,
    stageId:        meta?.stageId        || '',
    achievementKey: meta?.achievementKey || '',
  });
  // UI 刷新（元素不存在時安全 return）
  if (typeof refreshResultVCoins === 'function') refreshResultVCoins();
  if (typeof renderHomeWallet    === 'function') renderHomeWallet();
  if (typeof renderHomeInventory === 'function') renderHomeInventory();
  if (typeof renderHomePreviewCard === 'function') renderHomePreviewCard();
}


// =============================================
//  Firebase gameLogs（Phase 3B 正式）
//  本版只寫入 gameLogs/adventure/{autoPushId}
//  不寫 leaderboard / players / wallet / V幣
// =============================================


// =============================================
//  Asset Resolver（美術前置，Phase Art-Foundation）
//  resolveAdventureAssetSrc(path) — 安全路徑 helper
//  resolveAdventureAvatarSrc(key) — 頭像路徑
//  本版只建立 helper，不替換任何遊戲美術
// =============================================

// 冒險遊戲部署根路徑（GitHub Pages）
const ADVENTURE_BASE_URL = 'https://vashyang1120.github.io/balloon-v-rush/';

function resolveAdventureAssetSrc(path) {
  if (!path) return '';
  const s = String(path).trim();
  if (!s) return '';
  // 已是完整 URL，直接回傳
  if (/^https?:\/\//.test(s)) return s;
  // 相對路徑：組完整 URL
  return ADVENTURE_BASE_URL + s.replace(/^\//, '');
}

function resolveAdventureAvatarSrc(avatarKey) {
  if (!avatarKey) return resolveAdventureAvatarSrc('boy1');
  // 共用 vparty-rhythm-game 的頭像資源
  return 'https://vashyang1120.github.io/vparty-rhythm-game/assets/avatars/' + avatarKey + '.png';
}


// =============================================
//  Adventure Hero Art Foundation（Phase Art）
//  ADVENTURE_HERO_ASSETS：主角素材路徑規格
//  adventureImages：載入快取（不在 draw loop 裡 new Image）
//  heroArtState：目前最佳可用狀態圖片 key
// =============================================

// 主角美術繪製比例（只改顯示，不改碰撞盒）
const HERO_DRAW_SCALE    = 2.0;   // 主角美術繪製比例（1.35→2.0，放大主角視覺，不改碰撞盒）
const HERO_FOOT_ANCHOR_Y = 0.883; // 腳底線位於圖片高度 88.3%（512px 圖腳底約 452px）
const HERO_DRAW_OFFSET_X = 0;     // 水平微調（正值往右）
const HERO_DRAW_OFFSET_Y = 0;     // 垂直微調（正值往下）

// 主角素材路徑（未來替換只需改這裡）
const ADVENTURE_HERO_ASSETS = {
  idle:          'assets/adventure/hero/hero_idle.png',
  run01:         'assets/adventure/hero/hero_run_01.png',  // 起跑過渡
  run02:         'assets/adventure/hero/hero_run_02.png',  // 跑步左極限
  run03:         'assets/adventure/hero/hero_run_03.png',  // 跑步中間回收
  run04:         'assets/adventure/hero/hero_run_04.png',  // 跑步右極限
  run05:         'assets/adventure/hero/hero_run_05.png',  // 右腳前伸
  jump:          'assets/adventure/hero/hero_jump.png',
  fall:          'assets/adventure/hero/hero_fall.png',
  hurt:          'assets/adventure/hero/hero_hurt.png',
  swordAttack01: 'assets/adventure/hero/hero_sword_attack_01.png',
  swordAttack02: 'assets/adventure/hero/hero_sword_attack_02.png',
  swordAttack03: 'assets/adventure/hero/hero_sword_attack_03.png',
  swordAttack04:   'assets/adventure/hero/hero_sword_attack_04.png',
  // Hammer attack（路徑在 HAMMER_ATTACK_ASSETS，由 initHammerAttackArt 預載）
};

// 圖片快取（key → Image 物件，只載入一次）
const adventureImages = {};
let adventureHeroLoaded = false;  // 至少一張 hero 圖片可用
let _lastHeroArtKey     = 'idle'; // DEBUG：目前主角幀 key
let screenFreezeForTest = false;  // 測試版 F8 凍結畫面（不改 gameState，不顯示 overlay）

// ── 跑步動畫狀態機 ──
// 動畫序列：起跑 run01→run02，持續主循環 run02→run03→run04→run03，停下 run03→run01→idle
// _heroRunPhase: 'entry'（起跑）| 'loop'（持續主循環）| 'exit'（停下）
let _heroRunPhase   = 'idle';  // 目前動畫階段
let _heroRunFrame   = 0;       // 在目前動畫序列裡的位置
let _heroWasMoving  = false;   // 上一幀是否在移動（偵測起跑/停下邊界）
let _heroFrameTimer = 0;       // 計幀器（控制每張圖停留幾幀）

// 安全圖片載入（快取 + 404 不 crash）
function loadAdventureImage(key, src) {
  if (adventureImages[key]) return; // 已載入過
  const img = new Image();
  const fullSrc = resolveAdventureAssetSrc(src);
  img.onload = function() {
    adventureImages[key] = img;
    adventureHeroLoaded = true;
    // console.log('[Art] hero image loaded:', key, fullSrc);
  };
  img.onerror = function() {
    // 圖片不存在 → 不 crash，保留 undefined，fallback 自動啟動
    // 只在首次失敗時 log 一次
    if (!img._errLogged) {
      img._errLogged = true;
      console.warn('[Art] hero image not found:', key, fullSrc, '(fallback active)');
    }
  };
  img.src = fullSrc;
}

// 取得已載入的圖片（未載入回 null）
function getAdventureImage(key) {
  const img = adventureImages[key];
  if (img && img.complete && img.naturalWidth > 0) return img;
  return null;
}

// 初始化：非阻塞地嘗試載入所有 hero 素材
function initAdventureHeroArt() {
  Object.entries(ADVENTURE_HERO_ASSETS).forEach(([key, src]) => {
    loadAdventureImage(key, src);
  });
}

// 依玩家目前物理狀態選擇最適合的素材 key（run05 + 劍攻擊動畫）
function getHeroArtKey() {
  // ── 優先 0：槌子攻擊視覺動畫（hammerAnimTimer > 0）──
  // 01→02→03→04，一次性下砸動作，不循環
  if (player.hammerAnimTimer > 0) {
    _heroRunPhase = 'idle'; _heroRunFrame = 0; _heroWasMoving = false;
    const totalDur = HAMMER_ATTACK_ASSETS.length * HAMMER_ATTACK_FRAME_DUR;
    const elapsed  = totalDur - player.hammerAnimTimer;
    const fi = Math.min(Math.floor(elapsed / HAMMER_ATTACK_FRAME_DUR), 3);
    return ['hammerAttack01','hammerAttack02','hammerAttack03','hammerAttack04'][fi];
  }

  // ── 優先 1：劍攻擊視覺動畫（swordAnimTimer > 0，與 hitbox 獨立）──
  // 播放順序：01→02→03→02→01（5段，各 6 幀，共 30 幀）不使用 swordAttack04
  if (player.swordAnimTimer > 0) {
    _heroRunPhase = 'idle'; _heroRunFrame = 0; _heroWasMoving = false;
    const t = 30 - player.swordAnimTimer; // 已過幀數 0~29
    if (t < 6)  return 'swordAttack01';   //  0~5  : 6 幀（起手）
    if (t < 12) return 'swordAttack02';   //  6~11 : 6 幀（揮出）
    if (t < 18) return 'swordAttack03';   // 12~17 : 6 幀（命中）
    if (t < 24) return 'swordAttack02';   // 18~23 : 6 幀（回收）
    return 'swordAttack01';               // 24~29 : 6 幀（收招）
  }

  // ── 受傷 ──
  if (player.invincible > 0) {
    _heroRunPhase = 'idle'; _heroRunFrame = 0; _heroWasMoving = false;
    return 'hurt';
  }

  // ── 空中 ──
  if (!player.onGround) {
    _heroRunPhase = 'idle'; _heroRunFrame = 0; _heroWasMoving = false;
    return player.vy < -0.5 ? 'jump' : 'fall';
  }

  const moving = Math.abs(player.vx) > 0.5;

  // ── 邊界偵測 ──
  if (_heroWasMoving && !moving) { _heroRunPhase = 'exit';  _heroRunFrame = 0; _heroFrameTimer = 0; }
  if (!_heroWasMoving && moving)  { _heroRunPhase = 'entry'; _heroRunFrame = 0; _heroFrameTimer = 0; }
  _heroWasMoving = moving;

  // ── 靜止 ──
  if (!moving) {
    if (_heroRunPhase === 'exit') {
      _heroFrameTimer++;
      if (_heroFrameTimer >= 8) { _heroFrameTimer = 0; _heroRunFrame++; }
      // exit 過渡：run03 → run01 → idle
      if (_heroRunFrame === 0) return 'run03';
      if (_heroRunFrame === 1) return 'run01';
      _heroRunPhase = 'idle'; _heroRunFrame = 0;
    }
    return 'idle';
  }

  // ── 起跑過渡（entry）：run01 → run02，各 6 幀 ──
  if (_heroRunPhase === 'entry') {
    _heroFrameTimer++;
    if (_heroFrameTimer >= 6) { _heroFrameTimer = 0; _heroRunFrame++; }
    if (_heroRunFrame === 0) return 'run01';
    if (_heroRunFrame === 1) return 'run02';
    _heroRunPhase = 'loop'; _heroRunFrame = 0; _heroFrameTimer = 0;
  }

  // ── 持續跑步主循環：123454321（9格，每幀 5 game frames，平均自然節奏）──
  const loopFrames    = ['run03','run04','run05','run04','run03','run02','run01','run02']; // 34543212，run03 為循環起點，最接近 idle 過渡
  const LOOP_DUR = 7; // 每幀停留時間（game frames）：≈120ms@60fps，符合素材 8.33fps
  _heroFrameTimer++;
  if (_heroFrameTimer >= LOOP_DUR) {
    _heroFrameTimer = 0;
    _heroRunFrame = (_heroRunFrame + 1) % loopFrames.length;
  }
  return loopFrames[_heroRunFrame];
}


// =============================================
//  氣球蠍子 Walk 動畫素材（Phase Enemy-Art）
//  walk_01~04 循環播放，僅接外觀，不改碰撞/AI
// =============================================

const SCORPION_WALK_ASSETS = [
  'assets/enemies/scorpion/scorpion_walk_01.png',
  'assets/enemies/scorpion/scorpion_walk_02.png',
  'assets/enemies/scorpion/scorpion_walk_03.png',
  'assets/enemies/scorpion/scorpion_walk_04.png',
];
const SCORPION_DRAW_SCALE    = 2.2;   // 顯示比例（只影響繪製，不改 hitbox）
const SCORPION_FOOT_ANCHOR_Y = 0.883; // 腳底線位於圖片高度的 88.3%（512px 圖，腳底約在 452px）
const SCORPION_DRAW_OFFSET_X = 0;     // 水平微調（正值往右）
const SCORPION_DRAW_OFFSET_Y = 8;     // 垂直微調（正值往下），補正蠍子略微浮空
const SCORPION_ANIM_SPEED    = 7;     // 每幾 game frames 換一張

// 預載圖片快取（key=0~3，載入失敗保留 undefined）
const scorpionWalkImgs = [];
let scorpionWalkReady = false;  // 至少一張載入完成才設 true


// ── 蠍子受傷圖（被槌子擊飛旋轉時使用）────────────────
const SCORPION_HURT_ASSET = 'assets/enemies/scorpion/scorpion_hurt_01.png';
let scorpionHurtImg   = null;
let scorpionHurtReady = false;

function initScorpionHurtArt() {
  const img      = new Image();
  const fullSrc  = resolveAdventureAssetSrc(SCORPION_HURT_ASSET);
  img.onload = function() {
    scorpionHurtImg   = img;
    scorpionHurtReady = true;
    console.log('[Scorpion] hurt image loaded:', fullSrc);
  };
  img.onerror = function() {
    console.warn('[Scorpion] hurt image not found:', fullSrc, '(fallback: walk_01 or box)');
  };
  img.src = fullSrc;
}

// 取受傷圖：優先 scorpion_hurt_01，fallback scorpion_walk_01，再 fallback null（紅色方塊）
function getScorpionHurtImg() {
  if (scorpionHurtReady && scorpionHurtImg && scorpionHurtImg.complete && scorpionHurtImg.naturalWidth > 0) {
    return scorpionHurtImg;
  }
  return (scorpionWalkImgs && scorpionWalkImgs[0]) || null;
}

function initScorpionWalkArt() {
  let loadedCount = 0;
  SCORPION_WALK_ASSETS.forEach((src, i) => {
    const img = new Image();
    img.onload = function() {
      scorpionWalkImgs[i] = img;
      loadedCount++;
      if (loadedCount >= 1) scorpionWalkReady = true;
    };
    img.onerror = function() {
      console.warn('[Scorpion] walk image not found:', src, '(fallback active)');
    };
    img.src = resolveAdventureAssetSrc(src);
  });
}

// 取得目前應顯示的蠍子 walk 圖（依 frameCount 輪播）
function getScorpionWalkImg() {
  if (!scorpionWalkReady) return null;
  const idx = Math.floor(frameCount / SCORPION_ANIM_SPEED) % 4;
  return scorpionWalkImgs[idx] || null;
}


// =============================================
//  Hammer Attack 動畫素材（Phase Art v0.3.9）
//  01→02→03→04 一次性下砸，不循環，不補第 5 幀
// =============================================

const HAMMER_ATTACK_SCALE_MULTIPLIER  = 1.383; // 1.465 × 0.944 = 1.383（補回縮小比率後再校正）
const ROUND_BALLOON_CARRY_LIMIT       = 2;    // 玩家最多攜帶 2 顆圓氣球（可補充材料） // 補回素材端縮小比率（610→416px，需放大補回）
const HAMMER_ATTACK_FRAME_DUR        = 6;     // 每幀停留（game frames），接近 sword attack 節奏

const HAMMER_ATTACK_ASSETS = [
  'assets/adventure/hero/hero_hammer_attack_01.png',
  'assets/adventure/hero/hero_hammer_attack_02.png',
  'assets/adventure/hero/hero_hammer_attack_03.png',
  'assets/adventure/hero/hero_hammer_attack_04.png',
];
// 注意：hero_hammer_attack_05.png 不存在也不引用

const hammerAttackImgs = [];  // 快取，key 0-3
let   hammerAttackReady = false;

function initHammerAttackArt() {
  HAMMER_ATTACK_ASSETS.forEach((src, i) => {
    const img = new Image();
    const fullSrc = resolveAdventureAssetSrc(src);
    img.onload = function() {
      hammerAttackImgs[i] = img;
      hammerAttackReady = true;
      console.log('[HammerArt] loaded:', i + 1, fullSrc);
    };
    img.onerror = function() {
      console.warn('[HammerArt] image not found:', i + 1, fullSrc, '(fallback active)');
    };
    img.src = fullSrc;
  });
}

// 依 hammerAnimTimer 取得目前應顯示的 hammer attack 圖
// hammerAnimTimer 從 totalDur 倒數到 0
function getHammerAttackImg(hammerAnimTimer) {
  if (!hammerAttackReady || hammerAnimTimer <= 0) return null;
  const totalDur = HAMMER_ATTACK_ASSETS.length * HAMMER_ATTACK_FRAME_DUR; // 4×6 = 24
  const elapsed  = totalDur - hammerAnimTimer;
  const frameIdx = Math.min(Math.floor(elapsed / HAMMER_ATTACK_FRAME_DUR), 3); // 0~3
  return hammerAttackImgs[frameIdx] || null;
}


// =============================================
//  橘子怪 Orange Enemy Art（v0.3.13-orange-skin-foundation）
//  素材路徑、載入快取、繪製參數
//  不改碰撞 / AI / hitbox
// =============================================

// 橘子怪素材路徑
const ORANGE_ENEMY_ASSETS = {
  idle:    'assets/enemies/orange/orange_idle_01.png',
  warning: 'assets/enemies/orange/orange_warning_01.png',
  spray:   'assets/enemies/orange/orange_spray_01.png',
  oil01:   'assets/enemies/orange/orange_oil_spray_01.png',
  oil02:   'assets/enemies/orange/orange_oil_spray_02.png',
  oil03:   'assets/enemies/orange/orange_oil_spray_03.png',
};

// 橘子怪 skin 繪製參數（只影響視覺，不動 hitbox）
const ORANGE_DRAW_SCALE      = 1.6;   // 本體顯示比例（基於 hitbox 尺寸 44×44 放大）
const ORANGE_FOOT_ANCHOR_Y   = 0.88;  // 腳底錨點（圖片高度比例）
const ORANGE_SPRAY_SCALE     = 1.2;   // 噴射本體 (spray_01) 顯示比例（可獨立調整）

// orange_spray_01 的噴口像素座標（素材原圖座標）
const ORANGE_SPRAY_MOUTH_X   = 1156;
const ORANGE_SPRAY_MOUTH_Y   = 237;

// orange_oil_spray_XX 的接點像素座標（素材原圖座標）
const ORANGE_OIL_ANCHOR_X    = 1024;
const ORANGE_OIL_ANCHOR_Y    = 132;

// 橘子怪圖片快取（key → Image）
const orangeEnemyImgs = {};
let orangeEnemyCoreReady = false;  // idle + warning + spray 至少全部就緒才設 true

// 核心 key（影響 preload gate 判斷）
const ORANGE_CORE_KEYS = ['idle', 'warning', 'spray'];

function initOrangeEnemyArt() {
  let coreLoaded = 0;
  Object.entries(ORANGE_ENEMY_ASSETS).forEach(([key, src]) => {
    if (orangeEnemyImgs[key]) return; // 已載入
    const img = new Image();
    const fullSrc = resolveAdventureAssetSrc(src);
    img.onload = function() {
      orangeEnemyImgs[key] = img;
      // 核心三張全部就緒才設 ready
      if (ORANGE_CORE_KEYS.every(k => {
        const i = orangeEnemyImgs[k];
        return i && i.complete && i.naturalWidth > 0;
      })) {
        orangeEnemyCoreReady = true;
        console.log('[OrangeArt] core assets ready');
      }
      console.log('[OrangeArt] loaded:', key, fullSrc);
    };
    img.onerror = function() {
      // 油圖失敗不 crash；核心圖失敗 fallback 幾何圖
      console.warn('[OrangeArt] image not found:', key, fullSrc, '(fallback active)');
    };
    img.src = fullSrc;
  });
}

// 取橘子怪圖片（未載入回 null）
function getOrangeEnemyImg(key) {
  const img = orangeEnemyImgs[key];
  if (img && img.complete && img.naturalWidth > 0) return img;
  return null;
}


// =============================================
//  Hammer Attack 視覺測試工具（測試版限定）
//  GAME_VERSION 含 hammer-attack-foundation-test 時啟用
//  正式版自動關閉
// =============================================
// 通用測試版判斷：版本號含 -test- 即為測試版
const IS_ADVENTURE_TEST_VERSION      = GAME_VERSION.includes('-test-');
const HAMMER_ATTACK_VISUAL_TEST_LOADOUT = IS_ADVENTURE_TEST_VERSION;
const ADVENTURE_TEST_TOOLS_ENABLED      = IS_ADVENTURE_TEST_VERSION;

// 安全化 activeSlot：若指向不存在的武器，自動切到有效武器
function normalizeActiveWeaponSlot() {
  if (activeSlot === 'hammer' && !(equippedHammer && equippedHammer.id)) {
    if (equippedSword && equippedSword.id) activeSlot = 'sword';
  }
  if (activeSlot === 'sword' && !(equippedSword && equippedSword.id)) {
    if (equippedHammer && equippedHammer.id) activeSlot = 'hammer';
  }
}

// 測試版完整裝備（sword + hammer，runtime-only，不寫背包）
function applyAdventureTestLoadout() {
  if (!ADVENTURE_TEST_TOOLS_ENABLED) return;
  equippedSword.id         = 'basicSword';
  equippedSword.name       = '基礎氣球劍（測試）';
  equippedSword.maxDur     = 999;
  equippedSword.currentDur = 999;
  equippedHammer.id         = 'basicHammer';
  equippedHammer.name       = '基礎氣球槌（測試）';
  equippedHammer.maxDur     = 999;
  equippedHammer.currentDur = 999;
  activeSlot = 'sword';
  console.log('[AdventureTest] runtime test loadout: sword + hammer equipped');
}

// runtime-only 槌子（不寫 playerInventory / localStorage / Firebase）
function applyHammerAttackVisualTestLoadout() {
  if (!HAMMER_ATTACK_VISUAL_TEST_LOADOUT) return;
  equippedHammer.id         = 'basicHammer';
  equippedHammer.name       = '基礎氣球槌（測試）';
  equippedHammer.maxDur     = 999;
  equippedHammer.currentDur = 999;
  activeSlot = 'hammer';
  console.log('[HammerTest] runtime-only hammer equipped for visual test');
}

// 測試版：直接跳第 3 關（完整重設 runtime state，不清玩家身份/V幣/Firebase）
function startAdventureTestLevel3() {
  if (!ADVENTURE_TEST_TOOLS_ENABLED) return;

  // 清冒險背包（不清身份/V幣/Firebase）
  resetInventory();

  // 設定目標關卡
  currentLevelIndex = 2;

  // 1. 載入第 3 關資料（地圖、平台、敵人、圓氣球、關卡長度）
  loadLevel(2);

  // 2. 正式初始化裝備（先用正式流程）
  initEquippedSword();
  initEquippedHammer();
  normalizeActiveWeaponSlot();

  // 3. 補測試用 sword + hammer 999（runtime-only，不寫背包）
  applyAdventureTestLoadout();

  // 4. 完整重設 runtime state（沿用 restart() 的穩定流程）
  //    restart() 會重設：player.x/y/vx/vy, cameraX, elapsedSec, frameCount,
  //    currentRunStats, projectiles, meleeAttacks, spinningEnemies,
  //    scorpionDefeatEffects, etc.
  restart({ keepHp: false, preserveBringDog: false });

  // 5. restart() 後再補 applyAdventureTestLoadout（restart 會呼叫 initEquipped 再 normalizeSlot）
  applyAdventureTestLoadout();

  // 6. 確保 pause overlay 關閉（restart 應已關閉，但雙重保險）
  const pauseEl = document.getElementById('pause-overlay');
  if (pauseEl) { pauseEl.style.display = 'none'; pauseEl.classList.remove('active'); }

  gameState = 'playing';
  showHint('已進入第 3 關測試：已配備測試用氣球劍與氣球槌', 220);
  console.log('[TestTools] startAdventureTestLevel3 complete:', {
    stageId:     LEVELS[2] && LEVELS[2].stageId,
    playerX:     player.x,
    playerY:     player.y,
    activeSlot,
    swordDur:    equippedSword && equippedSword.currentDur,
    hammerDur:   equippedHammer && equippedHammer.currentDur,
  });
}

// 測試版：重置冒險測試狀態（不清 playerProfile / V幣 / Firebase）
function resetAdventureTestState() {
  if (!ADVENTURE_TEST_TOOLS_ENABLED) return;
  // 只清冒險背包與關卡進度，不清玩家身份 / V幣 / Firebase
  resetInventory();
  currentLevelIndex = 0;
  loadLevel(0);
  // v0.3.12-test-2：呼叫 restart() 確保 player 位置 / HP / currentRunStats 全部歸零，
  // 避免從第 2 / 3 節重置後帶著舊狀態進入第 1 節（原本只有 loadLevel 是不夠的）
  nextBringDog  = false;
  bringBalloonDog = false;
  restart({ keepHp: false });
  // 關閉 pause-overlay（restart 裡也關，但這裡多做一次防呆）
  const pauseEl = document.getElementById('pause-overlay');
  if (pauseEl) pauseEl.classList.remove('active');
  if (pauseEl) pauseEl.style.display = 'none';
  showHint('已重置測試狀態，從第 1 節重新開始', 180);
  console.log('[TestTools] resetAdventureTestState complete:', {
    currentLevelIndex,
    stageId: LEVELS[currentLevelIndex] && LEVELS[currentLevelIndex].stageId,
    activeSlot,
    equippedHammerDur: equippedHammer && equippedHammer.currentDur,
  });
}

function calcAdventureScore() {
  const timeLeft = Math.max(0, LEVEL_DURATION - Math.floor(elapsedSec));
  const score =
    (currentRunStats.coins            || 0) * 10
  + (currentRunStats.balloon260       || 0) * 20
  + (currentRunStats.roundBalloon     || 0) * 50
  + (currentRunStats.enemiesDefeated  || 0) * 30
  + timeLeft * 5
  + Math.floor((player.hp || 0) * 100)
  + (currentRunStats.foundHiddenTreasure ? 200 : 0)
  - (currentRunStats.damageTaken      || 0) * 20;
  return Math.max(0, Math.floor(score));
}

function buildAdventureResultSnapshot(clearStatus) {
  const identity = getPlayerIdentityForResult();
  const lv = LEVELS[currentLevelIndex] || {};
  const ci = playerInventory.craftedItems || {};

  const foundRecipe   = currentRunStats.foundHiddenTreasureName === '氣球棒棒糖秘笈';
  const foundTreasure = currentRunStats.foundHiddenTreasureName === '金幣寶箱';
  const progressLabel = [lv.stageId || '', lv.shortName || lv.name || ''].filter(Boolean).join(' ');

  return {
    gameId:           'adventure',
    playerKey:        identity.playerKey,     // 來自 playerProfile.playerKey
    id:               identity.id,
    name:             identity.name,
    baseAvatarKey:    identity.baseAvatarKey, // 身份頭像
    displayAvatarKey: identity.displayAvatarKey, // 顯示頭像
    avatarKey:        identity.avatarKey,     // 舊 UI 相容
    avatarSrc: resolveAdventureAvatarSrc(
      identity.displayAvatarKey || identity.avatarKey || identity.baseAvatarKey || 'boy1'
    ),

    score:            calcAdventureScore(),
    ts:               Date.now(),
    date:             getTodayKey(),
    version:          GAME_VERSION,

    levelId:          lv.stageId || '',
    levelName:        LEVEL_NAME || lv.name || '',
    completed:        clearStatus === 'clear',
    clearStatus,
    progressLabel,

    coins:            currentRunStats.coins            || 0,
    hp:               player.hp                        || 0,
    maxHp:            player.maxHp                     || 0,
    timeUsed:         Math.floor(elapsedSec            || 0),
    retryCount:       currentChallenge.retryCount      || 0,
    damageTaken:      currentRunStats.damageTaken      || 0,
    enemiesDefeated:  currentRunStats.enemiesDefeated  || 0,

    materials: {
      balloon260:   currentRunStats.balloon260   || 0,
      roundBalloon: currentRunStats.roundBalloon || 0,
    },
    items: {
      basicSword:       ci.basicSword        || 0,
      basicHammer:      ci.basicHammer       || 0,
      balloonLollipop:  ci.balloonLollipop   || 0,
    },

    recipesFound:   foundRecipe   ? 1 : 0,
    recipesTotal:   lv.hiddenTreasure?.type === 'recipe'    ? 1 : 0,
    treasuresFound: foundTreasure ? 1 : 0,
    treasuresTotal: lv.hiddenTreasure?.type === 'goldChest' ? 1 : 0,

    // 當場裝備稱號快照（Phase 3B：讀取 equippedTitle / quizEquippedTitle）
    equippedTitleKey:          playerEquippedTitle?.titleKey          || '',
    equippedTitleName:         playerEquippedTitle?.name              || '',
    equippedTitleGameId:       playerEquippedTitle?.gameId            || '',
    equippedTitleFromFallback: !!playerEquippedTitle?.fromFallback,
  };
}

async function submitAdventureGameLog(clearStatus) {
  try {
    if (!isFirebaseAvailable()) {
      console.warn('[Firebase] adventure gameLog skipped: firebase unavailable');
      return false;
    }

    // 先嘗試讀取最新稱號，讓快照包含正確稱號資料
    try {
      await loadEquippedTitleFromFirebase();
    } catch(titleErr) {
      console.warn('[Title] preload before gameLog failed:', titleErr && titleErr.message ? titleErr.message : titleErr);
    }

    const snapshot = buildAdventureResultSnapshot(clearStatus);

    await firebase.database().ref('gameLogs/adventure').push(snapshot);

    console.log('[Firebase] adventure gameLog submitted:', {
      clearStatus,
      playerKey:         snapshot.playerKey,
      score:             snapshot.score,
      levelId:           snapshot.levelId,
      equippedTitleKey:  snapshot.equippedTitleKey,
      equippedTitleName: snapshot.equippedTitleName,
    });
    return true;
  } catch(e) {
    console.warn('[Firebase] submitAdventureGameLog failed:', e.message, e);
    return false;
  }
}

// ── tryGrantVCoinsOnClear ────────────────────
function tryGrantVCoinsOnClear() {
  if (currentRunStats.vCoinsGranted) return;
  currentRunStats.vCoinsGranted = true; // 先鎖，防重入
  if (gameState !== 'clear') return;

  let total = 0;
  const details = [];

  if (currentLevelIndex === 0) {
    const ach = 'adventure_level_1_first_clear';
    const granted = grantAchievementReward(ach, 10, {
      achievementKey: ach,
      gameId:  'adventure',
      stageId: LEVELS[currentLevelIndex]?.stageId || '1-1',
    });
    if (granted) {
      total += 10;
      details.push({ label: '第一關首次通關成就', amount: 10 });
    }
  }

  if (canClaimDailyPlayReward()) {
    grantDailyPlayReward();
    addVCoins(30, 'daily_first_play', { stageId: LEVELS[currentLevelIndex]?.stageId });
    total += 30;
    details.push({ label: '今日首次遊玩', amount: 30 });
  }

  currentRunStats.vCoinsEarnedThisClear = total;
  currentRunStats.vCoinEarnDetails      = details;
  console.log('[V幣] tryGrantVCoinsOnClear total=', total, details);
}

// ── UI render ────────────────────────────────
function refreshResultVCoins() {
  const el = document.getElementById('rp-vcoin-section');
  if (!el) return;
  const w = playerWallet || loadPlayerWallet();
  const earned  = currentRunStats.vCoinsEarnedThisClear || 0;
  const details = currentRunStats.vCoinEarnDetails || [];
  if (earned <= 0) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  const detailHtml = details.map(d =>
    '<div class="rp-vcoin-detail">' + d.label + ' <span class="result-gold">+' + d.amount + '</span></div>'
  ).join('');
  el.innerHTML =
    '<div class="rp-vcoin-badge">🐷 本次獲得 V幣 <span class="result-gold">+' + earned + '</span></div>'
    + detailHtml
    + '<div class="rp-vcoin-total">目前 V幣：' + w.vCoins + '</div>';
}

function renderHomeWallet() {
  const el = document.getElementById('home-wallet-body');
  if (!el) return;
  const w = playerWallet || loadPlayerWallet();
  el.innerHTML =
    '<div class="home-wallet-coins">🐷 <span class="hw-num">' + w.vCoins + '</span> <span class="hw-label">V幣</span></div>';
}

function renderHomePreviewCard() {
  const el = document.getElementById('home-preview-body');
  if (!el) return;
  const h = playerHomeData || loadPlayerHome();
  const w = playerWallet  || loadPlayerWallet();
  el.innerHTML =
    '<div class="home-preview-name">' + (h.name || '小V的家') + '</div>'
    + '<div class="home-preview-status">🏗️ 建構中</div>'
    + '<div class="home-preview-hint">目前 V幣：' + w.vCoins + '<br>未來可用 V幣購買擺設與家具</div>';
}

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
  // 測試版：F8 凍結 / 解凍畫面（不觸發 pause overlay）
  if (ADVENTURE_TEST_TOOLS_ENABLED && e.code === 'F8') {
    screenFreezeForTest = !screenFreezeForTest;
    console.log('[TestTools] screenFreezeForTest:', screenFreezeForTest);
    showHint(screenFreezeForTest ? '畫面暫停：ON（F8 恢復）' : '畫面暫停：OFF', 120);
    e.preventDefault();
  }
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


// =============================================
//  玩家資料結構（Phase 1 整理）
//  playerInventory  — 背包與解鎖
//  playerHome       — 小V的家（狗等）
//  playerProgress   — 進度（未來排行榜用）
//  → 目前 playerHome 整合在 playerInventory.balloonDog
//  → playerProgress 為未來擴充預留
// =============================================

// ── Inventory & Save ──────────────────────────
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
  // 未來排行榜用進度欄位（Phase 1 預留，尚未實作）
  // playerProgress: { highestStageCleared: 0, totalStagesCleared: 0 }
  equippedSwordDur:     0,
  equippedHammerDur:    0,       // 裝備中的氣球槌耐久
  tutorialSwordGranted: false,
  tutorialDogGranted:   false,
  uniqueCollectibles: {
    level3RoundBalloon: false,  // 第 3 關圓氣球是否已成功帶回（通關）
    // 未來可在此擴充更多一次性收集物
  },
  // v0.3.11 Chapter1 核心流程旗標（一次性教學 / 保底機制，隨背包存檔）
  chapter1Flow: {
    dogIntroDone:                  false,
    forcedDogTripDone:             false,
    hammerRecipeGranted:           false,
    hammerMaterialGuaranteeDone:   false,
    hammerCraftIntroShown:         false,
    chapter1LowHpSupplyRescueDone: false,
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
    cost:       { roundBalloon: 2, balloon260: 1 },  // 2 顆圓氣球（槌頭）+ 1 條 260（握把）
    emoji:      '🔨',
    unlockKey:  'basicHammer',   // 對應 unlockedRecipes.basicHammer
  },
  {
    id:         'balloonDog',
    name:       '氣球小狗',
    effect:     '製作成功時立刻療癒 ❤️ +0.5。之後只要牠還陪著小V，每次通關也會療癒 ❤️ +0.5。靠近隱藏寶物時，鼻子也會發亮。',
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
    playerInventory.balloonDog.turnsLeft = CONFIG.DOG_INITIAL_TURNS || 3;
    player.hp = Math.min(player.maxHp, player.hp + CONFIG.DOG_HEAL_AMOUNT); // 製作立即回血
    saveInventory();
    if (typeof refreshResultHpStatus === 'function') refreshResultHpStatus();
    if (typeof renderHomeSupply === 'function') renderHomeSupply();
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

// =============================================
//  存檔原則（Phase 1 註解，Firebase 尚未實作）
//
//  localStorage：
//   - 儲存 playerInventory（背包、解鎖、氣球狗）
//   - 儲存遊戲進度（highestStageCleared）
//   - 不存 currentChallenge（每次挑戰重新計算）
//
//  Firebase（未來）：
//   - 只在玩家主動「提交排行榜」時寫入一筆
//   - 不要每關寫 Firebase
//   - 不要每次撿金幣/材料就寫 Firebase
//   - 排行榜資料格式：
//     { playerName, score, progressLabel,
//       recipesFound, treasuresFound,
//       retryCount, damageTaken, submittedAt }
//
//  localStorage key: 'balloonV_inventory'（目前沿用 MVP key）
// =============================================

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
      merged.chapter1Flow = Object.assign(
        {}, INVENTORY_DEFAULTS.chapter1Flow, parsed.chapter1Flow || {}
      );
      return merged;
    }
  } catch(e) { /* 存檔損壞時直接用預設值 */ }
  // 深複製 defaults（避免共用同一個 craftedItems 物件參考）
  const d = Object.assign({}, INVENTORY_DEFAULTS);
  d.craftedItems = Object.assign({}, INVENTORY_DEFAULTS.craftedItems);
  d.chapter1Flow = Object.assign({}, INVENTORY_DEFAULTS.chapter1Flow);
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
  playerInventory.chapter1Flow       = Object.assign({}, INVENTORY_DEFAULTS.chapter1Flow);
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


// =============================================
//  currentChallenge — 跨關累積挑戰資料（Phase 1）
//  currentRunStats  — 單關資料（已有）
//  分工：runStats 記本關，challenge 記整段挑戰
// =============================================
let currentChallenge = {
  score:               0,
  stagesCleared:       0,
  currentStageId:      null,   // 例如 '1-1'、'1-2'
  reachedStageId:      null,
  totalCoinsCollected: 0,
  totalMaterials: {
    balloon260:   0,
    roundBalloon: 0,
  },
  hiddenRecipesFound:   0,
  hiddenTreasuresFound: 0,
  retryCount:           0,
  damageTaken:          0,
  itemsCrafted:         0,
  startedAt:            null,
  endedAt:              null,
  isCompleted:          false,
  isAbandoned:          false,
};

function resetCurrentChallenge() {
  currentChallenge.score               = 0;
  currentChallenge.stagesCleared       = 0;
  currentChallenge.currentStageId      = null;
  currentChallenge.reachedStageId      = null;
  currentChallenge.totalCoinsCollected = 0;
  currentChallenge.totalMaterials      = { balloon260: 0, roundBalloon: 0 };
  currentChallenge.hiddenRecipesFound  = 0;
  currentChallenge.hiddenTreasuresFound= 0;
  currentChallenge.retryCount          = 0;
  currentChallenge.damageTaken         = 0;
  currentChallenge.itemsCrafted        = 0;
  currentChallenge.startedAt           = null;
  currentChallenge.endedAt             = null;
  currentChallenge.isCompleted         = false;
  currentChallenge.isAbandoned         = false;
}

// currentChallenge 在 triggerClear 時累積（Phase 1 只建結構）
function updateChallengeOnClear() {
  currentChallenge.stagesCleared++;
  currentChallenge.totalCoinsCollected  += currentRunStats.coins;
  currentChallenge.totalMaterials.balloon260   += currentRunStats.balloon260;
  currentChallenge.totalMaterials.roundBalloon += currentRunStats.roundBalloon;
  if (currentRunStats.foundHiddenTreasure) {
    if (currentRunStats.pendingRecipeUnlocks && Object.keys(currentRunStats.pendingRecipeUnlocks).length)
      currentChallenge.hiddenRecipesFound++;
    else
      currentChallenge.hiddenTreasuresFound++;
  }
  currentChallenge.damageTaken   += currentRunStats.damageTaken;
  currentChallenge.retryCount    += 0; // retry 在 triggerFailed 計
  currentChallenge.currentStageId = LEVELS[currentLevelIndex]?.stageId || null;
  currentChallenge.reachedStageId = currentChallenge.currentStageId;
}


// ── 死亡失敗畫面：顯示本關資訊 ────────────
function updateFailedPanelInfo() {
  const lv = LEVELS[currentLevelIndex];
  const infoEl = document.getElementById('failed-info');
  if (!infoEl) return;
  const hp = levelStartHp > 0 ? levelStartHp
    : (levelStartSnapshot?.hp > 0 ? levelStartSnapshot.hp : player.hp);
  const hpFilled = Math.floor(hp);
  const hpHalf   = hp % 1 >= 0.5;
  let hearts = '';
  for (let i = 0; i < 3; i++) {
    hearts += '<span class="fi-heart'
      + (i < hpFilled ? ' fi-heart--full' : (i === hpFilled && hpHalf ? ' fi-heart--half' : ''))
      + '">❤️</span>';
  }
  const dogLine = bringBalloonDog
    ? '<div class="fi-dog">🐶 氣球小狗也會回到本關開始狀態</div>' : '';
  infoEl.innerHTML =
    '<div class="fi-stage">' + getChapterDisplayTitle(currentLevelIndex) + '</div>'
    + '<div class="fi-hp-row">' + hearts
    + '<span class="fi-hp-num">本關開始 ' + hp + ' / 3</span></div>'
    + dogLine
    + '<div class="fi-hint">重試會回到本關開始狀態</div>';
}

function updateChallengeOnRetry() {
  currentChallenge.retryCount++;
}

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
  pendingRecipeUnlocks:     {},
  pendingCoins:             0,
  foundHiddenTreasureName:  null,
  dogHealed:                false,
  dogGoneThisClear:         false,
  // V幣（Phase 3A）
  vCoinsGranted:            false,
  vCoinsEarnedThisClear:    0,
  vCoinEarnDetails:         [],
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
  swordAnimTimer: 0,   // 揮劍視覺動畫獨立計時（與 hitbox 分開）
  hammerAnimTimer: 0,  // 槌子視覺動畫獨立計時
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
    deathTimer: 0,  // 被劍砍死後短暫顯示 hurt 圖再消失
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
  //  Stage 1-1：氣球森林小徑
  // ════════════════════════════════════════════
  {
    chapterId:   1,
    stageId:     '1-1',
    displayName: '第 1 關：氣球森林小徑',
    name:        '第 1 關：氣球森林小徑', // 保留 name 供舊程式碼相容
    shortName:   '氣球森林小徑',
    length:      6400,
    emoji:       '🌿',
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
  //  Stage 1-2：橘子果園危機
  // ════════════════════════════════════════════
  {
    chapterId:   1,
    stageId:     '1-2',
    displayName: '第 2 關：橘子果園危機',
    name:        '第 2 關：橘子果園危機',
    shortName:   '橘子果園危機',
    length:      6400,
    emoji:       '🍊',
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
  //  Stage 1-3：糖果氣球懸崖
  // ════════════════════════════════════════════
  {
    chapterId:   1,
    stageId:     '1-3',
    displayName: '第 3 關：糖果氣球懸崖',
    name:        '第 3 關：糖果氣球懸崖',
    shortName:   '糖果氣球懸崖',
    length:      6400,
    emoji:       '🍬',
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
      // 圓氣球是可消耗材料，不用一次性旗標決定是否生成
      // 依缺量生成：最多讓玩家補到 ROUND_BALLOON_CARRY_LIMIT (2) 顆
      const have    = Number(playerInventory.roundBalloon || 0);
      const missing = Math.max(0, ROUND_BALLOON_CARRY_LIMIT - have);
      const results = [];
      if (missing >= 1) results.push({ x: 1400, y: GROUND_Y - 195, collected: false, bobOffset: Math.random()*Math.PI*2 });
      if (missing >= 2) results.push({ x: 1700, y: GROUND_Y - 195, collected: false, bobOffset: Math.random()*Math.PI*2 });
      return results;
    },
    hiddenTreasure: {
      type:       'recipe',
      recipeKey:  'balloonLollipop',
      recipeName: '氣球棒棒糖秘笈',
      foundMsg:   '找到隱藏秘笈：氣球棒棒糖！',
      x:          2900,            // 段 3 上方路線，需要狗找
      y:          GROUND_Y - 175,  // 浮在空中的隱藏秘笈
      found:      false,
      emoji:      '🍭',
    },
  },


  // ════════════════════════════════════════════
  //  Stage 1-4：圖釘工坊
  // ════════════════════════════════════════════
  {
    chapterId:   1,
    stageId:     '1-4',
    displayName: '第 4 關：圖釘工坊',
    name:        '第 4 關：圖釘工坊',
    shortName:   '圖釘工坊',
    length:      6400,
    emoji:       '📌',
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

  // ════════════════════════════════════════════
  //  v0.3.11 Chapter1 流程專用：氣球小狗尋寶關
  //  ──────────────────────────────────────────
  //  這一關「不是」遊戲裡原本順序中的「第二關」。
  //  它被刻意附加在 LEVELS 陣列最後面（而非插入），
  //  目的是避免影響既有 7 處 currentLevelIndex === 2
  //  的硬編碼判斷（那些判斷假設 index 2 是糖果氣球懸崖／槌子關）。
  //
  //  本關在遊戲「順序」中的位置，是由下方的
  //  CHAPTER1_FLOW_LEVEL_INDICES / getNextLevelIndex()
  //  路由機制決定，不是由它在 LEVELS 陣列中的實際 index 決定。
  //
  //  未來若要做正式的章節系統，應改為 stageId-based routing，
  //  屆時這個暫時的「附加 + 流程表」做法可以整個替換掉。
  // ════════════════════════════════════════════
  {
    chapterId:   1,
    stageId:     '1-2b', // 暫時 stageId，避免與既有 1-2（橘子果園）衝突
    displayName: '第 2 關：氣球小狗尋寶',
    name:        '第 2 關：氣球小狗尋寶',
    shortName:   '氣球小狗尋寶',
    length:      5200,
    emoji:       '🐶',
    hints: [
      { triggerX:   30, msg: '🐶 氣球小狗陪你出發！靠近隱藏物時，牠的鼻子會發亮！', shown: false, duration: 280 },
      { triggerX:  900, msg: '👃 鼻子越亮，代表隱藏寶物越近！',                       shown: false, duration: 240 },
      { triggerX: 2400, msg: '✨ 寶物應該就在附近，仔細找找看！',                     shown: false, duration: 240 },
    ],
    buildPlatforms: () => [
      { x:  400, y: GROUND_Y - 90,  w: 130, h: 18 },
      { x:  700, y: GROUND_Y - 120, w: 110, h: 18 },
      { x: 1100, y: GROUND_Y - 100, w: 140, h: 18 },
      { x: 1500, y: GROUND_Y - 140, w: 120, h: 18 },
      { x: 1900, y: GROUND_Y - 110, w: 150, h: 18 },
      { x: 2300, y: GROUND_Y - 120, w: 160, h: 18 }, // v0.3.11-test-4：秘笈平台，原本 -180 玩家跳不上去，改成 -120（與其他主路線平台同高度）
      { x: 2700, y: GROUND_Y - 120, w: 130, h: 18 },
      { x: 3200, y: GROUND_Y - 100, w: 140, h: 18 },
      { x: 3700, y: GROUND_Y - 130, w: 150, h: 18 },
      { x: 4200, y: GROUND_Y - 100, w: 160, h: 18 },
      { x: 4700, y: GROUND_Y - 120, w: 150, h: 18 },
    ],
    buildCoins: () => {
      const placements = [
        [180,55],[260,55],[340,55],[420,130],
        [560,55],[660,140],[760,55],
        [1120,55],[1220,55],[1320,120],
        [1520,170],[1620,170],[1720,170],
        [1920,55],[2020,55],[2120,140],
        [2330,210],[2420,210],[2510,210], // 秘笈平台附近
        [2720,150],[2820,55],[2920,55],
        [3220,55],[3320,140],[3420,55],
        [3720,160],[3820,55],[3920,55],
        [4220,55],[4320,140],[4420,55],
        [4720,150],[4820,55],[4920,55],[5020,55],
      ];
      return placements.map(([x,yOff]) => ({ x, y: GROUND_Y-yOff, collected:false, bobOffset:Math.random()*Math.PI*2 }));
    },
    buildBalloons: () =>
      [450,750,1150,1550,1950,2750,3250,3750,4250,4750].map(x => ({
        x: x+20, y: GROUND_Y-85, collected:false, bobOffset:Math.random()*Math.PI*2
      })),
    buildSpikes: () => [
      { x:1850, y:GROUND_Y-24, w:40, h:24 },
      { x:3050, y:GROUND_Y-24, w:40, h:24 },
      { x:4050, y:GROUND_Y-24, w:40, h:24 },
    ],
    buildEnemies: () => [
      { x:1300, patrol:1300, patrolRange:110 },
      { x:3400, patrol:3400, patrolRange:120 },
    ].map(d => ({
      x:d.x, y:GROUND_Y-CONFIG.ENEMY_H,
      w:CONFIG.ENEMY_W, h:CONFIG.ENEMY_H,
      vx:-CONFIG.ENEMY_SPEED, hp:2,
      patrol:d.patrol, patrolRange:d.patrolRange,
      active:true, hitFlash:0,
    })),
    buildOranges: () => [],
    buildRoundBalloons: () => {
      // 依缺量生成，與既有 1-3 邏輯一致：補到 ROUND_BALLOON_CARRY_LIMIT (2) 顆為止
      const have    = Number(playerInventory.roundBalloon || 0);
      const missing = Math.max(0, ROUND_BALLOON_CARRY_LIMIT - have);
      const results = [];
      if (missing >= 1) results.push({ x: 1600, y: GROUND_Y - 195, collected: false, bobOffset: Math.random()*Math.PI*2 });
      if (missing >= 2) results.push({ x: 2000, y: GROUND_Y - 195, collected: false, bobOffset: Math.random()*Math.PI*2 });
      return results;
    },
    hiddenTreasure: {
      type:       'recipe',
      recipeKey:  'basicHammer',
      recipeName: '氣球槌秘笈',
      foundMsg:   '找到氣球槌秘笈！原來圓球可以做成氣球槌！',
      x:          2380,            // v0.3.11-test-4：對齊新平台（x:2300, w:160），位於平台中段偏右
      y:          GROUND_Y - 150,  // v0.3.11-test-4：浮在平台（GROUND_Y-120）上方 30px，玩家站上平台後一抬頭就能碰到
      found:      false,
      emoji:      '🔨',
    },
  },

];  // end LEVELS


// ════════════════════════════════════════════════════════════
//  v0.3.11 Chapter1 核心流程路由（測試版專用，暫時映射）
//  ──────────────────────────────────────────────────────────
//  目的：在不搬動 LEVELS 既有 index、不改動既有 7 處
//  currentLevelIndex === 2 硬編碼判斷的前提下，
//  讓「劍 → 狗 → 槌」三關可以串成一條可測試的固定流程。
//
//  Chapter1-1 = LEVELS[0]              （現有 1-1，劍 / 基礎戰鬥）
//  Chapter1-2 = dogHammerStageIndex     （附加在陣列最後的狗狗尋寶關）
//  Chapter1-3 = LEVELS[2]               （現有 1-3，槌子戰鬥展示）
//
//  橘子果園（LEVELS[1]）視為未來 Chapter 2 雛形，本流程完全跳過，
//  不會被路由到，也不會被本版任何邏輯修改。
//
//  ⚠️ 重要：未來若要做正式章節系統，請改成 stageId-based routing，
//  屆時這整個區塊（含 CHAPTER1_FLOW_LEVEL_INDICES）應該被取代，
//  不要再用「LEVELS 陣列 index」當作章節流程的依據。
// ════════════════════════════════════════════════════════════

const dogHammerStageIndex = LEVELS.findIndex(lv => lv.stageId === '1-2b');

const CHAPTER1_FLOW_LEVEL_INDICES = [
  0,                    // Chapter 1-1：劍 / 基礎戰鬥
  dogHammerStageIndex,  // Chapter 1-2：狗狗尋寶 / basicHammer 秘笈
  2,                    // Chapter 1-3：槌子戰鬥展示（沿用現有糖果氣球懸崖）
];

// 回傳 levelIndex 在第一章流程表中的第幾步（0-based），不在流程表中回傳 -1
function getChapter1FlowStep(levelIndex) {
  return CHAPTER1_FLOW_LEVEL_INDICES.indexOf(levelIndex);
}

// 判斷某個 levelIndex 是否屬於第一章核心流程
function isInChapter1Flow(levelIndex) {
  return getChapter1FlowStep(levelIndex) !== -1;
}

// 取得「下一關」的真正 LEVELS index。
// 若目前關卡在第一章流程表內，依流程表前進；
// 流程表最後一步時回傳 LEVELS.length（代表流程結束，避免誤跳到橘子果園）。
// 若目前關卡不在流程表內（例如未來其他章節關卡），fallback 回傳 levelIndex + 1，
// 維持舊行為，不影響流程表以外的關卡。
function getNextLevelIndex(levelIndex) {
  const step = getChapter1FlowStep(levelIndex);
  if (step === -1) return levelIndex + 1; // 不在第一章流程內：維持舊行為
  if (step + 1 < CHAPTER1_FLOW_LEVEL_INDICES.length) {
    return CHAPTER1_FLOW_LEVEL_INDICES[step + 1];
  }
  return LEVELS.length; // 流程表最後一步：視為「沒有下一關」
}

// 確保 playerInventory.chapter1Flow 旗標物件存在，並回傳它
// 這些旗標只服務 v0.3.11 第一章核心流程的一次性教學 / 保底機制
function ensureChapter1Flags() {
  if (!playerInventory.chapter1Flow) {
    playerInventory.chapter1Flow = {
      dogIntroDone:                  false,
      forcedDogTripDone:             false,
      hammerRecipeGranted:           false,
      hammerMaterialGuaranteeDone:   false,
      hammerCraftIntroShown:         false,
      chapter1LowHpSupplyRescueDone: false,
    };
  }
  return playerInventory.chapter1Flow;
}

// ════════════════════════════════════════════════════════
//  v0.3.11-test-2：章節式顯示標題
//  ──────────────────────────────────────────────────────
//  玩家畫面上不應該看到工程用的 stageId（1-1 / 1-2b / 1-3）
//  或個別小關全名（氣球森林小徑 / 氣球小狗尋寶...），
//  本版先用統一的「第一章」標題取代，段落副標可選用。
//
//  stageId 仍保留在 LEVELS 資料與 gameLogs / debug 用途，
//  本函式只負責「玩家看得到的畫面」要顯示什麼字。
// ════════════════════════════════════════════════════════
function getChapterDisplayTitle(levelIndex) {
  if (isInChapter1Flow(levelIndex)) {
    return '第一章 森林氣球小徑';
  }
  // 不在第一章流程內的關卡（橘子果園、1-4 等），暫時 fallback 用原本 shortName，
  // 避免影響未來章節尚未設計標題前就被本函式覆蓋掉
  const lv = LEVELS[levelIndex];
  return (lv && (lv.shortName || lv.name)) || '';
}

// 第一章內部段落副標（給願意顯示副標的 UI 使用，非必要）
function getChapter1FlowSubLabel(levelIndex) {
  const step = getChapter1FlowStep(levelIndex);
  switch (step) {
    case 0:  return '第 1 段：氣球劍與基礎戰鬥';
    case 1:  return '第 2 段：氣球狗尋寶';
    case 2:  return '第 3 段：氣球槌戰鬥';
    default: return '';
  }
}

// ════════════════════════════════════════════════════════
//  v0.3.11-test-3：玩家可見的「章節 + 第幾節」完整標題
//  ──────────────────────────────────────────────────────
//  測試時光看「第一章 森林氣球小徑」分不出現在第幾節，
//  本函式回傳 { title, subtitle }，subtitle 用「第 N 節｜功能型名稱」，
//  取代 getChapter1FlowSubLabel 的「第 N 段：...」措辭（兩者並存，
//  getChapter1FlowSubLabel 保留給尚未遷移的舊呼叫點，不強制全部換掉）。
// ════════════════════════════════════════════════════════
function getChapterDisplayInfo(levelIndex) {
  const title = getChapterDisplayTitle(levelIndex);
  const step  = getChapter1FlowStep(levelIndex);
  let subtitle = '';
  switch (step) {
    case 0:  subtitle = '第 1 節｜氣球劍與基礎戰鬥'; break;
    case 1:  subtitle = '第 2 節｜氣球狗尋寶';       break;
    case 2:  subtitle = '第 3 節｜氣球槌戰鬥';       break;
    default: subtitle = ''; break; // 不在第一章流程內，沒有節數副標
  }
  return { title, subtitle };
}

// ════════════════════════════════════════════════════════
//  v0.3.11-test-3：「下一步」狀態解析
//  ──────────────────────────────────────────────────────
//  回傳目前結算畫面應該顯示的單一重點行動，對應 spec 情境 A～E。
//  只在 currentLevelIndex 位於第一章流程內且 gameState 是
//  'clear'（非 gameover）時才回傳有意義的內容；其餘情況回傳 null，
//  呼叫端應該 fallback 成不顯示「下一步」區塊（不影響非第一章關卡）。
//
//  回傳格式：
//  {
//    kind:        'bringDog' | 'goNext' | 'craftHammer' | 'goHammerStage' | 'flowComplete',
//    title:       下一步標題,
//    body:        說明文字,
//    actionLabel: 主要行動鈕文字,
//    actionFn:    對應要呼叫的函式名稱字串（給呼叫端 onclick 用，避免在這裡耦合 DOM）,
//    nextBtnText: 結算畫面下一關按鈕應顯示的文字,
//    nextBtnLocked: 下一關按鈕是否應視覺鎖定,
//  }
// ════════════════════════════════════════════════════════
function getChapter1NextStepInfo() {
  if (gameState !== 'clear') return null;
  if (!isInChapter1Flow(currentLevelIndex)) return null;

  const nextIdx = getNextLevelIndex(currentLevelIndex);

  // 情境 E：第 3 節（流程最後一步）通關，流程結束
  if (nextIdx >= LEVELS.length) {
    return {
      kind:        'flowComplete',
      title:       '第一章測試流程完成',
      body:        '目前第一章核心流程已完成，可以重玩或回小V的家整理背包。',
      actionLabel: '',
      actionFn:    '',
      nextBtnText: '再玩一次',
      nextBtnLocked: false,
    };
  }

  // 情境 A / B：下一步是狗狗尋寶關，依是否已安排帶狗分流
  if (nextIdx === dogHammerStageIndex) {
    if (nextBringDog !== true) {
      return {
        kind:        'bringDog',
        title:       '下一步：帶氣球小狗出發',
        body:        '第 2 節需要氣球小狗幫你找到隱藏寶藏！',
        actionLabel: '帶狗出發',
        actionFn:    'bringDogNextLevel',
        nextBtnText: '請先帶狗出發',
        nextBtnLocked: true,
      };
    }
    return {
      kind:        'goNext',
      title:       '下一步：前往第 2 節',
      body:        '氣球小狗準備好了，牠會陪你一起尋找隱藏寶藏！',
      actionLabel: '前往第 2 節',
      actionFn:    'goToNextChapter1Level',
      nextBtnText: '前往第 2 節',
      nextBtnLocked: false,
    };
  }

  // 情境 C / D：下一步是槌子戰鬥展示關，依是否已製作 basicHammer 分流
  if (nextIdx === 2) {
    const hasHammer = ((playerInventory.craftedItems || {}).basicHammer || 0) > 0;
    if (!hasHammer) {
      return {
        kind:        'craftHammer',
        title:       '下一步：製作第一把氣球槌',
        body:        '打開氣球秘笈，用圓球 x2 + 260 x1 製作氣球槌。',
        actionLabel: '打開氣球秘笈',
        actionFn:    'openGuidebook',
        nextBtnText: '請先製作氣球槌',
        nextBtnLocked: true,
      };
    }
    return {
      kind:        'goHammerStage',
      title:       '下一步：前往第 3 節',
      body:        '氣球槌準備好了！下一節要練習用槌子打飛蠍子。',
      actionLabel: '前往第 3 節',
      actionFn:    'goToNextChapter1Level',
      nextBtnText: '前往第 3 節',
      nextBtnLocked: false,
    };
  }

  return null; // 理論上不會走到這裡（第一章流程只有上述幾種下一步）
}

// v0.3.11-test-3：「下一步」主要行動鈕 — 前往下一節
// 直接觸發既有 btn-play-again 的 click，重用同一套 gate / routing 邏輯，
// 避免另外複製一份「前往下一關」的轉場流程造成兩邊邏輯漂移
function goToNextChapter1Level() {
  const btn = document.getElementById('btn-play-again');
  if (btn) btn.click();
}

// ════════════════════════════════════════════════════════
//  v0.3.11 Chapter1 進度阻擋檢查
//  在「前往下一關」之前呼叫，回傳 true 代表可以放行，
//  回傳 false 代表已被阻擋（呼叫端應該 return，不要繼續前進）。
//  兩個既有的「下一關」入口（結算畫面按鈕 / 小V的家）都呼叫這個函式，
//  確保第一章流程的關卡阻擋邏輯只需要維護一份。
// ════════════════════════════════════════════════════════
function checkChapter1ProgressionGate(nextIdx) {
  // 阻擋一：前往 Chapter1-2（狗狗尋寶關）前，必須帶狗出門
  if (nextIdx === dogHammerStageIndex) {
    const flags = ensureChapter1Flags();
    const dog   = playerInventory.balloonDog || {};
    const wantsToBringDog = (nextBringDog === true);

    if (!dog.present) {
      // 理論上第 1 關已自動發狗，這裡只是防呆
      showHint('這一關要帶氣球小狗一起出發！牠會教你怎麼找到隱藏的寶藏。', 260);
      return false;
    }

    if (!wantsToBringDog) {
      showHint('這一關要帶氣球小狗一起出發！牠會教你怎麼找到隱藏的寶藏。', 260);
      return false;
    }

    // 玩家想帶狗，但 260 不足以付狗繩費用 → 第一章教學限定補發一次
    if ((playerInventory.balloon260 || 0) < CONFIG.DOG_LEASH_COST_BALLOON260
        && !flags.forcedDogTripDone) {
      playerInventory.balloon260 = (playerInventory.balloon260 || 0) + CONFIG.DOG_LEASH_COST_BALLOON260;
      flags.forcedDogTripDone = true;
      saveInventory();
      showHint('小V幫你準備了 1 條 260 氣球，做成狗繩帶氣球狗出發吧！', 260);
    }
    return true;
  }

  // 阻擋二：前往 Chapter1-3（槌子戰鬥展示關）前，必須已製作 basicHammer
  // 只在「從第一章流程內前進」時檢查，避免影響流程表以外的關卡跳轉
  if (nextIdx === 2 && isInChapter1Flow(currentLevelIndex)) {
    const ci = playerInventory.craftedItems || {};
    if ((ci.basicHammer || 0) <= 0) {
      showHint('材料準備好了嗎？打開氣球秘笈，先製作第一把氣球槌吧！', 280);
      return false;
    }
    return true;
  }

  return true; // 其他關卡不受第一章流程阻擋
}


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

// ── 第 1 關教學狗發放（v0.3.11 Chapter1）──────
// 規則：第 1 關 + 未曾發放 + 目前沒有狗 → 給 1 隻，顯示一次性提示
// 做法仿照 grantTutorialSwordIfNeeded()，避免重複發放
function grantTutorialDogIfNeeded() {
  if (currentLevelIndex !== 0) return;                        // 只在第 1 關
  if (playerInventory.tutorialDogGranted) return;             // 已發放過
  const dog = playerInventory.balloonDog || {};
  if (dog.present) {                                          // 已有狗就不送
    playerInventory.tutorialDogGranted = true;
    saveInventory();
    return;
  }
  // 發放教學狗
  playerInventory.balloonDog = {
    present:   true,
    turnsLeft: CONFIG.DOG_INITIAL_TURNS,
  };
  playerInventory.tutorialDogGranted = true;
  saveInventory();
  showHint('🐶 氣球小狗加入了！牠會陪你冒險，也能幫你找到隱藏寶物。', 320);
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

// =============================================
//  Snapshot 函式（Phase 1 整理）
//  createLevelStartSnapshot() — 進關前建立快照
//  restoreLevelStartSnapshot() — 死亡時還原
//  clearLevelStartSnapshot()  — 通關後清除
// =============================================

function createLevelStartSnapshot() {
  levelStartSnapshot = {
    // 背包資料
    coins:              playerInventory.coins,
    balloon260:         playerInventory.balloon260,
    roundBalloon:       playerInventory.roundBalloon,
    craftedItems:       JSON.parse(JSON.stringify(playerInventory.craftedItems || {})),
    unlockedRecipes:    JSON.parse(JSON.stringify(playerInventory.unlockedRecipes || {})),
    uniqueCollectibles: JSON.parse(JSON.stringify(playerInventory.uniqueCollectibles || {})),
    balloonDog:         JSON.parse(JSON.stringify(playerInventory.balloonDog || {})),
    // 裝備耐久（執行期）
    equippedSwordId:    equippedSword.id,
    equippedSwordDur:   equippedSword.currentDur,
    equippedSwordMax:   equippedSword.maxDur,
    equippedHammerId:   equippedHammer.id,
    equippedHammerDur:  equippedHammer.currentDur,
    equippedHammerMax:  equippedHammer.maxDur,
    activeSlot:         activeSlot,
    // 玩家生命
    hp:                 player.hp,
    // 帶狗狀態（死亡重試時還原）
    bringBalloonDog:    bringBalloonDog,
  };
  console.log('createLevelStartSnapshot:', {
    coins: levelStartSnapshot.coins,
    swordDur: levelStartSnapshot.equippedSwordDur,
    hammerDur: levelStartSnapshot.equippedHammerDur,
  });
}

function restoreLevelStartSnapshot() {
  if (!levelStartSnapshot) return;
  playerInventory.coins              = levelStartSnapshot.coins;
  playerInventory.balloon260         = levelStartSnapshot.balloon260;
  playerInventory.roundBalloon       = levelStartSnapshot.roundBalloon;
  playerInventory.craftedItems       = JSON.parse(JSON.stringify(levelStartSnapshot.craftedItems));
  playerInventory.unlockedRecipes    = JSON.parse(JSON.stringify(levelStartSnapshot.unlockedRecipes));
  playerInventory.uniqueCollectibles = JSON.parse(JSON.stringify(levelStartSnapshot.uniqueCollectibles));
  playerInventory.balloonDog         = JSON.parse(JSON.stringify(levelStartSnapshot.balloonDog));
  playerInventory.equippedSwordDur   = levelStartSnapshot.equippedSwordDur;
  playerInventory.equippedHammerDur  = levelStartSnapshot.equippedHammerDur;
  // 還原執行期裝備狀態
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
  activeSlot      = levelStartSnapshot.activeSlot || 'sword';
  player.hp       = levelStartSnapshot.hp;
  bringBalloonDog = (levelStartSnapshot.bringBalloonDog === true);
  saveInventory();
  console.log('restoreLevelStartSnapshot:', {
    coins: playerInventory.coins,
    swordDur: equippedSword.currentDur,
    hammerDur: equippedHammer.currentDur,
  });
}

function clearLevelStartSnapshot() {
  levelStartSnapshot = null;
}


var bringBalloonDog  = false;
var homeEntryMode       = 'normal'; // 'clear' | 'failed' | 'normal'
var levelStartBringDog = false; // 本關開始時的帶狗狀態（穩定記錄）
var levelStartHp       = 3;    // 本關開始時的 HP（穩定記錄）
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
  // 測試版槌子：耐久不耗盡
  if (ADVENTURE_TEST_TOOLS_ENABLED && equippedHammer.currentDur >= 990) {
    equippedHammer.currentDur = equippedHammer.maxDur || 999;
    return;
  }
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
  scorpionDefeatEffects.length = 0;
  treasurePickupEffects.length = 0; // v0.3.12

  // 複製 hints（每次都要 reset shown 狀態）
  HINTS.length = 0;
  lv.hints.forEach(h => HINTS.push(Object.assign({}, h, { shown: false })));
  // 延遲一點讓畫面載入後再顯示，避免第一幀閃過
  setTimeout(() => showStageStartHint(index), 400);

  currentLevelIndex = index;
  // 重設本局 stage flow hint 狀態（roundBalloon 每關重設）
  stageFlowHints.roundBalloonHintShown  = false;
  stageFlowHints.scorpionHammerHintShown = false;

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
  // 第 1 關：比照氣球劍，自動發放一隻氣球小狗（有保護機制，不會重複）
  if (index === 0) grantTutorialDogIfNeeded();
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


// ── 桌機 / 手機操作提示分流（v0.3.10）──────────────────
function isMobileControlMode() {
  // 觸控裝置或手機橫向：使用 pointer: coarse 判斷
  return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
}

function getControlHintText(type) {
  const m = isMobileControlMode();
  switch (type) {
    case 'stage1':
      return m
        ? '左側按鈕移動，右側「跳」跳躍，按「砍」使用氣球劍！先熟悉基本操作吧！'
        : '方向鍵移動，空白鍵跳躍，Z 使用氣球劍！先熟悉基本操作吧！';
    case 'stage3':
      return m
        ? '收集圓氣球，回小V的家製作氣球槌，再用「換武器」和「砍」敲飛蠍子！'
        : '收集圓氣球，回小V的家製作氣球槌，再用槌子敲飛蠍子！';
    case 'stage3Chapter1Flow':
      // v0.3.11：玩家透過第一章流程抵達時，槌子應該已經做好了，
      // 文案改成槌子戰鬥教學，而不是舊版「去收集圓氣球」的文字
      return m
        ? '氣球槌比較重，但可以把蠍子打飛！按「換武器」切換，再按「砍」試試看！'
        : '氣球槌比較重，但可以把蠍子打飛！有時候一槌可以連續清掉好幾隻怪！';
    case 'hammerCrafted':
      return m
        ? '氣球槌完成！先按「換武器」，再按「砍」把蠍子敲飛！'
        : '氣球槌完成！按 2 切換武器，再按 Z 敲飛蠍子！';
    case 'scorpionHammer':
      return m
        ? '蠍子擋路！裝備氣球槌後按「砍」，可以把牠敲飛！'
        : '蠍子擋路！裝備氣球槌後按 Z，可以把牠敲飛！';
    default:
      return '';
  }
}

// ── Stage Flow Hints（v0.3.10 關卡引導提示）──────────────
// 純 runtime 狀態，不寫 localStorage / Firebase
let stageFlowHints = {
  stageStart:             {},    // { [levelIndex]: true } 已顯示關卡開始提示
  roundBalloonHintShown:  false, // 第 3 關首次撿圓氣球提示
  hammerCraftHintShown:   false, // 製作 basicHammer 後提示
  scorpionHammerHintShown:false, // 接近蠍子提示槌子用途
  hammerUsedOnScorpion:   false, // 曾用槌子打飛過蠍子
};

// 關卡開始提示
function showStageStartHint(levelIndex) {
  if (stageFlowHints.stageStart[levelIndex]) return; // 本次啟動內只提示一次
  stageFlowHints.stageStart[levelIndex] = true;
  if (levelIndex === 0) {
    showHint(getControlHintText('stage1'), 240);
  } else if (levelIndex === 1) {
    showHint('小心尖刺與障礙！觀察路線，安全通過氣球森林！', 240);
  } else if (levelIndex === 2) {
    // v0.3.11：若玩家是透過第一章流程抵達（已經有槌子），改用槌子戰鬥教學文案
    const hasHammer = ((playerInventory.craftedItems || {}).basicHammer || 0) > 0;
    if (isInChapter1Flow(levelIndex) && hasHammer) {
      showHint(getControlHintText('stage3Chapter1Flow'), 260);
    } else {
      showHint(getControlHintText('stage3'), 260);
    }
  }
}
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
  updateScorpionDefeatEffects(dt);
  updateTreasurePickupEffects(); // v0.3.12
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
  if (player.swordAnimTimer > 0)  player.swordAnimTimer--;
  if (player.hammerAnimTimer > 0)  player.hammerAnimTimer--;

  if (player.meleeHammerActive > 0) player.meleeHammerActive--;

  if (inp('attack') && player.attackCooldown === 0) {
    // activeSlot fallback：若指向不存在的武器，自動切到有效武器
    if (activeSlot === 'hammer' && !(equippedHammer && equippedHammer.id)) {
      if (equippedSword && equippedSword.id) { activeSlot = 'sword'; }
      else { showHint('目前沒有可用武器', 90); }
    } else if (activeSlot === 'sword' && !(equippedSword && equippedSword.id === 'basicSword')) {
      if (equippedHammer && equippedHammer.id) { activeSlot = 'hammer'; }
      else { showHint('目前沒有可用武器', 90); }
    }
    if (activeSlot === 'hammer' && equippedHammer && equippedHammer.id) {
      player.attackCooldown     = CONFIG.HAMMER_ATTACK_COOLDOWN;
      player.meleeHammerActive  = CONFIG.HAMMER_ATTACK_DURATION;
      player.hammerAnimTimer    = HAMMER_ATTACK_ASSETS.length * HAMMER_ATTACK_FRAME_DUR; // 視覺動畫 24 幀
      player.hammerHit          = false;
    } else if (activeSlot === 'sword' && equippedSword && equippedSword.id === 'basicSword') {
      player.attackCooldown = CONFIG.BASIC_SWORD_ATTACK_COOLDOWN;
      player.meleeActive    = CONFIG.BASIC_SWORD_ATTACK_DURATION;
      player.meleeHit       = false;
      player.swordAnimTimer = 30; // 視覺動畫獨立計時（30 幀）
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

    // 第 3 關蠍子接近提示（首次接近時提示槌子用途）
    if (currentLevelIndex === 2 && !stageFlowHints.scorpionHammerHintShown && !stageFlowHints.hammerUsedOnScorpion) {
      enemies.forEach(e => {
        if (!e.active) return;
        const dist = Math.abs((player.x + player.w / 2) - (e.x + e.w / 2));
        if (dist < 220) {
          stageFlowHints.scorpionHammerHintShown = true;
          showHint(getControlHintText('scorpionHammer'), 260);
        }
      });
    }

    // Hit enemies
    enemies.forEach(e => {
      if (!e.active) return;
      if (rectsOverlap(p.x, p.y, p.w, p.h, e.x, e.y, e.w, e.h)) {
        e.hp--;
        if (e.hp <= 0) {
          spawnScorpionDefeatEffect(e);
          e.active = false;
          player.enemiesDefeated++;
        } else {
          e.hitFlash = 6;
          e.vx = (p.vx > 0 ? 3 : -3);
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
      if (e.hp <= 0) {
        // 死亡：立刻失效 + 產生純視覺死亡演出
        spawnScorpionDefeatEffect(e);
        e.active = false;
        player.enemiesDefeated++;
      } else {
        // 受擊未死：短暫閃爍 + knockback
        e.hitFlash = 6;
        e.vx = (player.facingRight ? 3.5 : -3.5);
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
let spinningEnemies = [];
let scorpionDefeatEffects = []; // 純視覺死亡演出（不參與碰撞/攻擊/扣血）

// v0.3.12：隱藏寶藏取得瞬間最小視覺回饋（完全獨立，不共用蠍子特效）
let treasurePickupEffects = [];

function spawnScorpionDefeatEffect(e) {
  scorpionDefeatEffects.push({
    x:          e.x,
    y:          e.y,
    w:          e.w,
    h:          e.h,
    vx:         0,
    vy:         -0.4,
    life:       12,
    maxLife:    12,
    facingLeft: (e.vx || 0) < 0,
  });
}

function updateScorpionDefeatEffects(dt) {
  for (let i = scorpionDefeatEffects.length - 1; i >= 0; i--) {
    const fx = scorpionDefeatEffects[i];
    fx.life -= 1;
    fx.x += (fx.vx || 0) * dt;
    fx.y += (fx.vy || 0) * dt;
    if (fx.life <= 0) scorpionDefeatEffects.splice(i, 1);
  }
}

function drawScorpionDefeatEffects(cx) {
  scorpionDefeatEffects.forEach(fx => {
    const sx = fx.x - cx;
    if (sx > CANVAS_W + 60 || sx + fx.w < -60) return;

    const img = getScorpionHurtImg();
    const t   = fx.life / fx.maxLife; // 1 → 0 淡出

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, t));

    if (img) {
      const drawW = fx.w * SCORPION_DRAW_SCALE;
      const drawH = drawW * (img.height / img.width);
      const groundY = fx.y + fx.h;
      const drawX   = sx + fx.w / 2 - drawW / 2 + SCORPION_DRAW_OFFSET_X;
      const drawY   = groundY - drawH * SCORPION_FOOT_ANCHOR_Y + SCORPION_DRAW_OFFSET_Y;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      if (!fx.facingLeft) {
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
      } else {
        ctx.translate(sx + fx.w / 2, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, -drawW / 2, drawY, drawW, drawH);
      }
    } else {
      // fallback 方塊
      ctx.fillStyle = '#e05050';
      ctx.fillRect(sx, fx.y, fx.w, fx.h);
    }

    ctx.restore();
  });
} // { x, y, w, h, vx, life }

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
      stageFlowHints.hammerUsedOnScorpion = true; // 記錄曾用槌子打過蠍子
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

    // v0.3.12：取得瞬間最小視覺回饋（文字上飄 + 淡出，不影響任何取得邏輯）
    // 在這裡先 spawn，後面 showHint 和 pendingRecipe 邏輯不受影響
    {
      // v0.3.12-test-2：RPG 式重要道具通知框，title + subtitle 兩行
      let notifTitle, notifSubtitle;
      if (t.type === 'recipe') {
        notifTitle    = '📖 獲得' + (t.recipeName ? t.recipeName + '！' : '秘笈！');
        notifSubtitle = t.recipeName ? '氣球秘笈新增：' + t.recipeName : '';
      } else if (t.type === 'goldChest') {
        notifTitle    = '🎁 獲得金幣寶箱！';
        notifSubtitle = '金幣 +' + (t.rewardCoins || 30);
      } else {
        notifTitle    = '找到隱藏寶藏！';
        notifSubtitle = '';
      }
      spawnTreasurePickupEffect(notifTitle, notifSubtitle);
    }

    if (t.type === 'recipe') {
      // 秘笈類隱藏物：pending 模式，通關才正式寫入
      // recipeName / foundMsg 由關卡資料提供，避免文字寫死成棒棒糖
      if (!currentRunStats.pendingRecipeUnlocks) currentRunStats.pendingRecipeUnlocks = {};
      currentRunStats.pendingRecipeUnlocks[t.recipeKey] = true;
      currentRunStats.foundHiddenTreasureName = t.recipeName || '隱藏秘笈';
      showHint(t.foundMsg || ('找到隱藏秘笈：' + (t.recipeName || '') + '！'), 320);
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
      playerInventory.roundBalloon = Math.min(
        ROUND_BALLOON_CARRY_LIMIT,
        (playerInventory.roundBalloon || 0) + 1
      );
      saveInventory();
      // 第 3 關：首次撿到圓氣球，提示它是槌子材料
      if (currentLevelIndex === 2 && !stageFlowHints.roundBalloonHintShown) {
        stageFlowHints.roundBalloonHintShown = true;
        showHint('拿到圓氣球！收集 2 顆圓氣球 + 1 條 260，就能在小V的家製作氣球槌！', 280);
      }
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
  restoreLevelStartSnapshot();
  bringBalloonDog = levelStartBringDog;
  console.log('[FAILED]', {
    hp:          player.hp,
    levelStartHp,
    snapshotHp:  levelStartSnapshot && levelStartSnapshot.hp,
  });
  // 防呆：restore 後 hp 仍 <= 0，強制回本關開始 HP
  if (player.hp <= 0) {
    const fixHp = levelStartHp > 0 ? levelStartHp : player.maxHp;
    console.warn('[FAILED] hp still <=0 after restore, fix to', fixHp);
    player.hp = fixHp;
  }

  console.log('discard hidden treasure rewards on failed');
  updateChallengeOnRetry(); // 重試次數 +1

  // 更新失敗畫面顯示本關資訊
  updateFailedPanelInfo();
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
  submitAdventureGameLog('gameover'); // Phase 3B：gameLogs/adventure（不阻塞，不發 V幣）
  populateResultPanel();
  updateNextLevelButton(); // Game Over：確保主按鈕顯示「再玩一次」，_nextLevel = false
  showResultButtons();
  if (typeof window.hidePauseBtn === 'function') window.hidePauseBtn();
}

function triggerClear() {
  currentRunStats.enemiesDefeated = player.enemiesDefeated;

  // v0.3.11：basicHammer 不再於 1-3（index 2）通關時自動解鎖。
  // 解鎖職責已移轉到 Chapter1-2 狗狗尋寶關（見下方 dogHammerStageIndex 區塊）。
  // 1-3 在 Chapter1 流程中現在純粹是槌子戰鬥展示關。
  if (currentLevelIndex === 2) {
    if (!playerInventory.uniqueCollectibles) playerInventory.uniqueCollectibles = {};
    // 通關帶回圓氣球：鎖定一次性收集物（與 hammer 解鎖無關，維持原行為）
    if (currentRunStats.roundBalloon > 0) {
      playerInventory.uniqueCollectibles.level3RoundBalloon = true;
    }
  }

  // ════════════════════════════════════════════════════════
  //  v0.3.11-test-4 第一章低血量補給救濟
  //  ──────────────────────────────────────────────────────
  //  第 1 節通關結算時，若玩家 HP <= 1.5 且金幣不夠買一張愛心貼布，
  //  把金幣「補足」到剛好能買一張（不是直接送貼布），
  //  讓玩家仍然要自己按「購買並使用」才會學到補給機制。
  //  限定第一章流程內，只發一次（chapter1Flow.chapter1LowHpSupplyRescueDone）。
  // ════════════════════════════════════════════════════════
  if (currentLevelIndex === 0 && isInChapter1Flow(currentLevelIndex)) {
    const flags = ensureChapter1Flags();
    if (!flags.chapter1LowHpSupplyRescueDone
        && player.hp <= 1.5
        && (playerInventory.coins || 0) < CONFIG.HEART_PATCH_COST) {
      const missing = CONFIG.HEART_PATCH_COST - (playerInventory.coins || 0);
      playerInventory.coins = (playerInventory.coins || 0) + missing;
      flags.chapter1LowHpSupplyRescueDone = true;
      currentRunStats.chapter1LowHpSupplyRescueGranted = missing; // 給結算面板顯示用
      saveInventory();
    }
  }

  // ════════════════════════════════════════════════════════
  //  v0.3.11 Chapter1-2（狗狗尋寶關）結算：保底三件套
  //  1. 槌子秘笈保底（若狗狗尋寶沒找到，這裡補發）
  //  2. 槌子材料保底（roundBalloon 補到 2、balloon260 補到 1）
  //  3. 製作引導（材料+秘笈到位後，提示並讓秘笈按鈕閃爍）
  //  全部使用 playerInventory.chapter1Flow 旗標防止重玩時反覆觸發
  // ════════════════════════════════════════════════════════
  if (currentLevelIndex === dogHammerStageIndex) {
    const flags = ensureChapter1Flags();
    if (!playerInventory.unlockedRecipes) playerInventory.unlockedRecipes = {};

    // 1. 槌子秘笈保底
    // v0.3.11-test-4 修正：原本用 playerInventory.unlockedRecipes.basicHammer 是否為 true
    // 來判斷玩家「是否已經真的找到」，但這個欄位要等到下面「隱藏物通關正式結算」
    // 區塊（在這之後才執行）才會真的被寫入 true，導致即使玩家這局真的有碰到
    // hiddenTreasure，這裡判斷時欄位仍是 undefined，誤判成保底、顯示錯誤文案。
    // 改用 currentRunStats.foundHiddenTreasure（在 checkHiddenTreasure() 玩家實際
    // 碰到時就會立刻設成 true，不受結算區塊執行順序影響）來判斷，並且這裡直接把
    // 秘笈寫入 playerInventory，讓後面的正式結算區塊即使重複寫一次也是 idempotent。
    if (!flags.hammerRecipeGranted) {
      const genuinelyFound = currentRunStats.foundHiddenTreasure === true;
      if (!genuinelyFound) {
        playerInventory.unlockedRecipes.basicHammer = true;
        currentRunStats.unlockedHammerThisClear     = true;
        currentRunStats.chapter1HammerRecipeFallback = true;
        showHint('小V突然靈光乍現，領悟了氣球槌的作法！你的氣球秘笈新增了「氣球槌」秘笈。', 320);
      } else {
        // 狗狗尋寶已正常找到：這裡也直接寫入秘笈（不等下面正式結算區塊），
        // 確保不管後面區塊有沒有跑、跑的順序如何，秘笈一定會到位
        playerInventory.unlockedRecipes.basicHammer = true;
        currentRunStats.unlockedHammerThisClear = true;
      }
      flags.hammerRecipeGranted = true;
    }

    // 2. 槌子材料保底（roundBalloon 補到 2、balloon260 補到 1，不可突破上限）
    if (!flags.hammerMaterialGuaranteeDone) {
      const haveRound = Number(playerInventory.roundBalloon || 0);
      if (haveRound < ROUND_BALLOON_CARRY_LIMIT) {
        const missing = ROUND_BALLOON_CARRY_LIMIT - haveRound;
        playerInventory.roundBalloon = ROUND_BALLOON_CARRY_LIMIT;
        currentRunStats.chapter1RoundBalloonGranted = missing;
        showHint('氣球小狗在家門口找到 ' + missing + ' 顆圓氣球！牠搖著尾巴把材料帶回來了！', 280);
      }
      const have260 = Number(playerInventory.balloon260 || 0);
      if (have260 < 1) {
        playerInventory.balloon260 = 1;
        currentRunStats.chapter1Balloon260Granted = true;
        showHint('氣球小狗又找到 1 條 260 氣球！剛好可以準備製作氣球槌！', 280);
      }
      flags.hammerMaterialGuaranteeDone = true;
    }

    // 3. 製作引導：材料 + 秘笈都到位後提示製作（guidebook 按鈕沿用既有 highlight class）
    if (!flags.hammerCraftIntroShown) {
      const hasRecipe   = playerInventory.unlockedRecipes.basicHammer === true;
      const hasMaterial = Number(playerInventory.roundBalloon || 0) >= 2
        && Number(playerInventory.balloon260 || 0) >= 1;
      if (hasRecipe && hasMaterial) {
        flags.hammerCraftIntroShown = true;
        currentRunStats.chapter1CraftIntroShown = true;
      }
    }

    saveInventory();
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
  submitAdventureGameLog('clear'); // Phase 3B：gameLogs/adventure（不阻塞 V幣）
  tryGrantVCoinsOnClear(); // Phase 3A：發放 V幣（只在 clear 時）
  populateResultPanel();
  updateNextLevelButton();
  showResultButtons();
  updateChallengeOnClear(); // 累積跨關挑戰資料
  clearLevelStartSnapshot(); // 通關後快照可清除
  if (typeof window.hidePauseBtn === 'function') window.hidePauseBtn();
}

// 更新結算畫面「再玩一次」按鈕的文字與功能
function updateNextLevelButton() {
  const btn = document.getElementById('btn-play-again');
  if (!btn) return;
  // v0.3.11：用 getNextLevelIndex 判斷是否有下一關，
  // 避免 dogHammerStageIndex 被附加在陣列尾端造成 LEVELS.length-1 誤判
  const nextIdx = getNextLevelIndex(currentLevelIndex);
  const hasNext = nextIdx < LEVELS.length;
  if (hasNext && gameState === 'clear') {
    // v0.3.11-test-3：按鈕文字改用 getChapter1NextStepInfo 算出的明確文字
    // （「請先帶狗出發」/「請先製作氣球槌」/「前往第 N 節」），
    // 不在第一章流程內的關卡 fallback 回舊版「下一關」文字
    const nextStepInfo = getChapter1NextStepInfo();
    const btnText = nextStepInfo ? nextStepInfo.nextBtnText : '下一關';
    const isLocked = nextStepInfo ? nextStepInfo.nextBtnLocked : false;

    btn.childNodes[0].textContent = btnText;
    const sub = btn.querySelector('.result-btn-sub');
    if (sub) sub.textContent = isLocked ? 'Locked' : 'Next Level';
    btn._nextLevel = true;

    // 可點擊：主色明亮（opacity 還原）；不可點擊：明顯變暗，且按鈕文字本身已說明原因
    btn.style.opacity = isLocked ? '0.45' : '';
  } else {
    btn.childNodes[0].textContent = '再玩一次';
    const sub = btn.querySelector('.result-btn-sub');
    if (sub) sub.textContent = 'Play Again';
    btn._nextLevel = false;
    btn.style.opacity = '';
  }
}

// ── Draw ──────────────────────────────────────
function draw() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  if (gameState === 'playing') {
    drawWorld();
    drawHUD();
    drawHintBox();
    drawTreasurePickupEffects(); // v0.3.12-test-2：screen-space 通知框，在 HUD 上方
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
  drawVersionInfo(); // 所有狀態都顯示版本號
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
    drawEnemy(sx, e.y, e.w, e.h, e.hitFlash > 0, e.vx);
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

  // 蠍子死亡視覺演出（獨立 effects 陣列，不參與碰撞）
  drawScorpionDefeatEffects(cameraX);
  // treasurePickupEffects 已移至 draw() 頂層，在 HUD 上方渲染（screen-space）

  // 旋轉飛出的小怪（被槌子擊飛時改用 scorpion_hurt_01.png）
  spinningEnemies.forEach(s => {
    const sx = s.x - cx;
    if (sx > CANVAS_W + 60 || sx + s.w < -60) return;
    const hurtImg = getScorpionHurtImg();
    ctx.save();
    ctx.translate(sx + s.w/2, s.y + s.h/2);
    ctx.rotate(s.angle);
    if (hurtImg) {
      // 使用蠍子受傷圖，尺寸與 walk 一致（SCORPION_DRAW_SCALE）
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const drawW = s.w * SCORPION_DRAW_SCALE;
      const drawH = drawW * (hurtImg.height / hurtImg.width);
      ctx.drawImage(hurtImg, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      // Fallback：原本紅色方塊（圖片未載入時）
      ctx.fillStyle = '#e05050';
      ctx.beginPath();
      ctx.roundRect(-s.w/2, -s.h/2, s.w, s.h, 8);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★', 0, 4);
    }
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

  // Art Foundation（Phase Art）：優先使用 hero 素材，fallback 維持原本邏輯
  const heroKey = getHeroArtKey();
  _lastHeroArtKey = heroKey; // DEBUG

  // Hammer attack 幀：用 hammerAttackImgs 取圖 + 套用放大補償
  const isHammerFrame = heroKey.startsWith('hammerAttack');

  // 取圖：hammer 幀優先用 hammerAttackImgs，取不到才 fallback idle（但不套放大倍率）
  let heroImg       = null;
  let useHammerScale = false;

  if (isHammerFrame) {
    const hamImg = getHammerAttackImg(player.hammerAnimTimer);
    if (hamImg) {
      heroImg       = hamImg;
      useHammerScale = true;
    } else {
      // 圖片尚未載入或路徑不對：fallback 到 idle，不套放大
      console.warn('[HammerArt] hammer frame missing, fallback idle (no scale):', heroKey, player.hammerAnimTimer);
      heroImg       = getAdventureImage('idle');
      useHammerScale = false;
    }
  } else {
    heroImg = getAdventureImage(heroKey) || getAdventureImage('idle');
  }

  const effectiveScale = useHammerScale ? HAMMER_ATTACK_SCALE_MULTIPLIER : 1;

  if (!player.facingRight) {
    ctx.translate(sx + player.w, sy);
    ctx.scale(-1, 1);
    if (heroImg) {
      // Foot anchor 對齊：圖片 88.3% 高度處對齊 hitbox 底部（local 座標）
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const dW = player.w * HERO_DRAW_SCALE * effectiveScale; // hammer 時乘以補償倍率
      const dH = dW * (heroImg.height / heroImg.width); // 保持圖片比例
      const dX = (player.w - dW) / 2 + HERO_DRAW_OFFSET_X;
      const dY = player.h - dH * HERO_FOOT_ANCHOR_Y + HERO_DRAW_OFFSET_Y;
      ctx.drawImage(heroImg, dX, dY, dW, dH);
    } else if (playerImg.complete && playerImg.naturalWidth > 0) {
      ctx.drawImage(playerImg, 0, 0, player.w, player.h);
    } else {
      drawPlayerFallback(0, 0, player.w, player.h);
    }
  } else {
    ctx.translate(sx, sy);
    if (heroImg) {
      // Foot anchor 對齊（local 座標，往右走）
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const dW = player.w * HERO_DRAW_SCALE * effectiveScale; // hammer 時乘以補償倍率
      const dH = dW * (heroImg.height / heroImg.width);
      const dX = (player.w - dW) / 2 + HERO_DRAW_OFFSET_X;
      const dY = player.h - dH * HERO_FOOT_ANCHOR_Y + HERO_DRAW_OFFSET_Y;
      ctx.drawImage(heroImg, dX, dY, dW, dH);
    } else if (playerImg.complete && playerImg.naturalWidth > 0) {
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

    // ── DEBUG 角色頭上文字：已停用，改用 drawHeroDebugPanel() 固定面板 ──
  if (false && typeof _lastHeroArtKey !== 'undefined') { // 停用
    ctx.save();
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.fillStyle = 'rgba(255,255,0,1)';
    const dbX = sx + player.w / 2;   // canvas 座標，不在 translate 內，不受翻轉影響
    const dbY = sy - 28;              // 角色頂部再往上 28px，地面跑步也看得到
    ctx.strokeText(_lastHeroArtKey, dbX, dbY);
    ctx.fillText(_lastHeroArtKey, dbX, dbY);
    ctx.restore();
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
  // v0.3.12：寶藏透明度依狗鼻亮度（dogNoseLevel）逐步浮現
  // 沒帶狗時呼叫端已攔截（外層 bringBalloonDog 判斷），但做 fallback 防呆
  let treasureAlpha;
  if (!bringBalloonDog) {
    treasureAlpha = 0;
  } else {
    switch (dogNoseLevel) {
      case 0:  treasureAlpha = 0;   break; // 很遠：完全不可見
      case 1:  treasureAlpha = 0.4; break; // 微亮：開始有感
      case 2:  treasureAlpha = 0.7; break; // 亮：明顯可見
      case 3:  treasureAlpha = 1.0; break; // 閃爍：幾乎完整顯示
      default: treasureAlpha = 0;
    }
    const dist = Math.abs(player.x - t.x);
    if (dist <= 80) treasureAlpha = 1.0; // 非常近：完整顯示
  }

  if (treasureAlpha <= 0) return;

  const bob    = Math.sin(frameCount * 0.05) * 4;
  const cx     = sx + 16;
  const cy     = t.y + bob + 16;
  const isHigh = treasureAlpha >= 0.7; // ≥ Lv2：加強光暈
  const isFull = treasureAlpha >= 1.0; // ≥ Lv3 / dist≤80：完整顯示

  ctx.save();

  // ── 底層：金色圓形光暈 ──────────────────────────────
  // 高亮時光暈更亮、更大、更實；低亮度時保留原本的淡光暈
  if (isHigh) {
    // 強光暈：較大半徑、更高不透明度
    const glowR   = isFull ? 42 : 36;
    const glowAlpha = isFull ? 0.55 : 0.38;
    ctx.globalAlpha = treasureAlpha * glowAlpha;
    const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, glowR);
    grad.addColorStop(0,   'rgba(255,230,80,0.9)');
    grad.addColorStop(0.5, 'rgba(255,200,40,0.4)');
    grad.addColorStop(1,   'rgba(255,160,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // 基礎光暈（原本邏輯，維持低亮度時的行為）
    const dogGlow = bringBalloonDog ? dogNoseGlow * 0.6 : 0;
    if (dogGlow > 0.1) {
      ctx.globalAlpha = treasureAlpha * dogGlow * 0.35;
      ctx.fillStyle = 'rgba(255,240,100,1)';
      ctx.beginPath();
      ctx.arc(cx, cy, 32, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── 中層：圓形描邊（高亮時才出現，避免低亮度時太突兀）──
  if (isHigh) {
    const strokeAlpha = isFull ? 0.92 : 0.65;
    const strokeColor = isFull ? 'rgba(255,255,180,1)' : 'rgba(255,220,80,1)';
    ctx.globalAlpha = treasureAlpha * strokeAlpha;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth   = isFull ? 2.5 : 1.8;
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ── 上層：emoji 本體 ────────────────────────────────
  // 低亮度時跟著外層 alpha 淡入；高亮度時強制 alpha=1 確保清晰
  ctx.globalAlpha = isHigh ? 1.0 : treasureAlpha;
  ctx.font        = '28px sans-serif';
  ctx.textAlign   = 'center';
  ctx.fillText(t.emoji, cx, t.y + bob + 20);

  // ── 最高層：完整顯示時加 4 個小閃光點 ──────────────
  if (isFull) {
    const sparkPhase  = frameCount * 0.12;
    const sparkDist   = 26;
    const sparkPoints = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
    ctx.globalAlpha   = 0.85 * (0.6 + 0.4 * Math.sin(frameCount * 0.25));
    ctx.fillStyle     = 'rgba(255,255,200,0.95)';
    for (let i = 0; i < sparkPoints.length; i++) {
      const angle  = sparkPoints[i] + sparkPhase;
      const spx    = cx + Math.cos(angle) * sparkDist;
      const spy    = cy + Math.sin(angle) * sparkDist;
      const spSize = 2.5 + Math.sin(frameCount * 0.3 + i * 1.5) * 1.2;
      ctx.beginPath();
      ctx.arc(spx, spy, spSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── 問號提示（仍在遠處時顯示）──
  if (!isHigh) {
    ctx.globalAlpha = treasureAlpha * 0.7;
    ctx.fillStyle   = 'rgba(255,255,150,1)';
    ctx.font        = '12px sans-serif';
    ctx.fillText('?', cx, t.y + bob - 8);
  }

  ctx.restore();
}

// v0.3.12：隱藏寶藏取得瞬間最小視覺回饋
// ──────────────────────────────────────────────────────
// 設計：純文字上飄 + alpha 淡出，不需粒子、不需音效、不需圖片素材。
// 完全獨立於 scorpionDefeatEffects，不共用任何結構。
// ──────────────────────────────────────────────────────
// v0.3.12-test-2：RPG 式重要道具通知框（screen-space，畫面中央偏上）
// duration = 90 frames @60fps ≈ 1.5s；淡入 9f / 停留 54f / 淡出 27f
const TREASURE_NOTIF_DURATION  = 90;
const TREASURE_NOTIF_FADE_IN   = 9;
const TREASURE_NOTIF_FADE_OUT  = 27;

function spawnTreasurePickupEffect(title, subtitle) {
  // 最多同時只顯示一個（新通知蓋掉舊的，避免多通知堆疊）
  treasurePickupEffects.length = 0;
  treasurePickupEffects.push({ title, subtitle, timer: 0, duration: TREASURE_NOTIF_DURATION });
}

function updateTreasurePickupEffects() {
  for (let i = treasurePickupEffects.length - 1; i >= 0; i--) {
    treasurePickupEffects[i].timer++;
    if (treasurePickupEffects[i].timer >= treasurePickupEffects[i].duration) {
      treasurePickupEffects.splice(i, 1);
    }
  }
}

function drawTreasurePickupEffects(cx) { // cx 保留參數名相容呼叫端，此版未使用（screen-space）
  if (treasurePickupEffects.length === 0) return;
  const e = treasurePickupEffects[0]; // 只顯示第一個
  const t = e.timer, d = e.duration;

  // alpha 計算：淡入 → 停留 → 淡出
  let alpha;
  if (t < TREASURE_NOTIF_FADE_IN) {
    alpha = t / TREASURE_NOTIF_FADE_IN;
  } else if (t < d - TREASURE_NOTIF_FADE_OUT) {
    alpha = 1;
  } else {
    alpha = (d - t) / TREASURE_NOTIF_FADE_OUT;
  }
  alpha = Math.max(0, Math.min(1, alpha));
  if (alpha <= 0) return;

  ctx.save();
  ctx.globalAlpha = alpha;

  // 通知框尺寸與位置（中央偏上）
  const boxW  = 290;
  const boxH  = e.subtitle ? 66 : 46;
  const boxX  = (CANVAS_W - boxW) / 2;
  const boxY  = CANVAS_H * 0.24;
  const rad   = 10;

  // 半透明深色底
  ctx.fillStyle = 'rgba(10,5,30,0.82)';
  ctx.beginPath();
  ctx.moveTo(boxX + rad, boxY);
  ctx.lineTo(boxX + boxW - rad, boxY);
  ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + rad);
  ctx.lineTo(boxX + boxW, boxY + boxH - rad);
  ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - rad, boxY + boxH);
  ctx.lineTo(boxX + rad, boxY + boxH);
  ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - rad);
  ctx.lineTo(boxX, boxY + rad);
  ctx.quadraticCurveTo(boxX, boxY, boxX + rad, boxY);
  ctx.closePath();
  ctx.fill();

  // 金色邊框
  ctx.strokeStyle = 'rgba(255,210,80,0.75)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 標題文字（第一行，金色）
  ctx.textAlign = 'center';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = '#ffe066';
  ctx.fillText(e.title, CANVAS_W / 2, boxY + 22);

  // 副標題（第二行，白色）
  if (e.subtitle) {
    ctx.font = '12px sans-serif';
    ctx.fillStyle = 'rgba(230,220,255,0.9)';
    ctx.fillText(e.subtitle, CANVAS_W / 2, boxY + 44);
  }

  ctx.restore();
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

// 蠍子 fallback：保留原本程式繪製（圖片不可用時使用）
function drawEnemyFallback(x, y, w, h, flashing) {
  ctx.fillStyle = flashing ? '#fff' : COLORS.enemy;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.fillStyle = COLORS.enemyEye;
  ctx.beginPath(); ctx.arc(x + 12, y + 16, 6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 34, y + 16, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#333';
  ctx.beginPath(); ctx.arc(x + 14, y + 16, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 36, y + 16, 3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x + w / 2, y + h * 0.65, 8, 0, Math.PI); ctx.stroke();
  for (let i = 0; i < 2; i++) {
    ctx.fillStyle = '#e00';
    ctx.fillRect(x + 8 + i * 18, y - 10, 14, 6);
  }
}

function drawEnemy(x, y, w, h, flashing, enemyVx) {
  // ── 蠍子圖片模式：hitFlash 時優先使用 hurt 圖（受擊回饋）──
  const img = flashing
    ? (getScorpionHurtImg() || getScorpionWalkImg()) // dying / 受擊時優先 hurt 圖
    : getScorpionWalkImg();
  if (img) {
    // ── Foot anchor 對齊：讓圖片 88.3% 高度處對齊 hitbox 底部 ──
    const drawW  = w * SCORPION_DRAW_SCALE;
    const drawH  = drawW * (img.height / img.width); // 保持圖片比例（512×512 → 正方形）
    const groundY  = y + h;                          // hitbox 底部（地面）
    const centerX  = x + w / 2;
    const drawX    = centerX - drawW / 2 + SCORPION_DRAW_OFFSET_X;
    const drawY    = groundY - drawH * SCORPION_FOOT_ANCHOR_Y + SCORPION_DRAW_OFFSET_Y;

    ctx.save();
    // 圖片平滑：非像素風圖片需要開啟
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 閃白效果（受傷）
    if (flashing) ctx.globalAlpha = 0.5;

    // 依移動方向水平翻轉（素材面向右，往左走時翻轉）
    const goingLeft = (enemyVx !== undefined ? enemyVx : 0) < 0;
    if (goingLeft) {
      // 以圖片中心為翻轉基準
      ctx.translate(drawX + drawW / 2, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -drawW / 2, drawY, drawW, drawH);
    } else {
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    }

    if (flashing) ctx.globalAlpha = 1;
    ctx.restore();

    // 受擊白閃：hitFlash 時在 hurt 圖上疊一層半透明白色
    if (flashing) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#ffffff';
      const drawW2 = w * SCORPION_DRAW_SCALE;
      const drawH2 = drawW2 * (img.height / img.width);
      const groundY2 = y + h;
      const drawX2   = x + w / 2 - drawW2 / 2 + SCORPION_DRAW_OFFSET_X;
      const drawY2   = groundY2 - drawH2 * SCORPION_FOOT_ANCHOR_Y + SCORPION_DRAW_OFFSET_Y;
      ctx.fillRect(drawX2, drawY2, drawW2, drawH2);
      ctx.restore();
    }
    // HP 指示條（不受翻轉影響）
    for (let i = 0; i < 2; i++) {
      ctx.fillStyle = '#e00';
      ctx.fillRect(x + 8 + i * 18, y - 10, 14, 6);
    }
    return;
  }

  // ── Fallback：原本 placeholder 繪製 ──
  drawEnemyFallback(x, y, w, h, flashing);
}


function drawOrangeNemesis(sx, o) {
  // ── 判斷素材是否就緒，決定走 skin 路徑還是 fallback 幾何路徑 ──
  const useSkin = orangeEnemyCoreReady;

  // ── helper：依腳底錨點將圖片置於 hitbox 下緣，回傳是否成功 ──
  function drawBodySprite(img, scale, extraShakeX) {
    if (!img) return false;
    const drawW = img.naturalWidth  * scale;
    const drawH = img.naturalHeight * scale;
    const footY = drawH * ORANGE_FOOT_ANCHOR_Y;
    const drawX = sx + (o.w - drawW) / 2 + (extraShakeX || 0);
    const drawY = (o.y + o.h) - footY;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    return true;
  }

  // ── helper：取得本體繪製座標（供油圖錨點計算用）──
  function getBodyDrawInfo(img, scale) {
    if (!img) return null;
    const drawW = img.naturalWidth  * scale;
    const drawH = img.naturalHeight * scale;
    const footY = drawH * ORANGE_FOOT_ANCHOR_Y;
    const drawX = sx + (o.w - drawW) / 2;
    const drawY = (o.y + o.h) - footY;
    return { drawX, drawY, drawW, drawH, scale };
  }

  ctx.save();

  // ─────────────────────────────────────────────
  //  1. 噴油效果（先畫，在本體之下）
  // ─────────────────────────────────────────────
  if (o.phase === 'spraying' && o.sprayActive) {
    if (useSkin) {
      // ── Skin 路徑：橘皮油三段動畫 ──
      const ratio  = Math.min(o.phaseTimer / CONFIG.ORANGE_SPRAY_MS, 1.0);
      const oilKey = ratio < 1/3 ? 'oil01' : ratio < 2/3 ? 'oil02' : 'oil03';
      const oilImg   = getOrangeEnemyImg(oilKey);
      const sprayImg = getOrangeEnemyImg('spray');

      if (sprayImg && oilImg) {
        // 計算 spray 本體的繪製位置
        const info = getBodyDrawInfo(sprayImg, ORANGE_SPRAY_SCALE);
        if (info) {
          // 噴口世界座標 = 圖片左上角 + 噴口像素座標 × 縮放比例
          const mouthWorldX = info.drawX + ORANGE_SPRAY_MOUTH_X * info.scale;
          const mouthWorldY = info.drawY + ORANGE_SPRAY_MOUTH_Y * info.scale;

          // 油圖使用相同 ORANGE_SPRAY_SCALE
          const oilScale = ORANGE_SPRAY_SCALE;
          const oilW     = oilImg.naturalWidth  * oilScale;
          const oilH     = oilImg.naturalHeight * oilScale;

          // 讓油圖 anchor 對準噴口
          const oilDrawX = mouthWorldX - ORANGE_OIL_ANCHOR_X * oilScale;
          const oilDrawY = mouthWorldY - ORANGE_OIL_ANCHOR_Y * oilScale;

          if (o.sprayDir < 0) {
            // 面朝左：以噴口為軸水平翻轉
            ctx.save();
            ctx.translate(mouthWorldX * 2, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(oilImg, oilDrawX, oilDrawY, oilW, oilH);
            ctx.restore();
          } else {
            ctx.drawImage(oilImg, oilDrawX, oilDrawY, oilW, oilH);
          }
        }
      } else {
        // 油圖尚未載入，fallback 幾何
        _drawOrangeSprayGeometry(sx, o);
      }
    } else {
      _drawOrangeSprayGeometry(sx, o);
    }
  }

  // ─────────────────────────────────────────────
  //  2. 本體繪製
  // ─────────────────────────────────────────────
  if (useSkin) {
    if (o.phase === 'windup') {
      // ── warning 圖 + pulse 縮放 + 輕微 glow ──
      const warnImg = getOrangeEnemyImg('warning');
      const t       = o.phaseTimer / CONFIG.ORANGE_WINDUP_MS; // 0→1
      const pulse   = 1.0 + Math.sin(t * Math.PI * 4) * 0.06; // 0.96~1.08，約 2 次呼吸
      const glowAlpha = (Math.sin(t * Math.PI * 6) * 0.5 + 0.5) * 0.35;

      if (warnImg) {
        const drawW = warnImg.naturalWidth  * ORANGE_DRAW_SCALE * pulse;
        const drawH = warnImg.naturalHeight * ORANGE_DRAW_SCALE * pulse;
        const footY = drawH * ORANGE_FOOT_ANCHOR_Y;
        const drawX = sx + (o.w - drawW) / 2;
        const drawY = (o.y + o.h) - footY;

        // 外框 glow（純視覺，不動 hitbox）
        if (glowAlpha > 0.05) {
          ctx.save();
          ctx.globalAlpha = glowAlpha;
          ctx.shadowColor = '#ff8800';
          ctx.shadowBlur  = 18;
          ctx.drawImage(warnImg, drawX, drawY, drawW, drawH);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
        ctx.drawImage(warnImg, drawX, drawY, drawW, drawH);
      } else {
        _drawOrangeBodyGeometry(sx, o, true);
      }

    } else if (o.phase === 'spraying') {
      // ── spray 本體圖 ──
      const sprayImg = getOrangeEnemyImg('spray');
      if (!drawBodySprite(sprayImg, ORANGE_SPRAY_SCALE, 0)) {
        _drawOrangeBodyGeometry(sx, o, false);
      }

    } else {
      // ── idle（含 cooldown）── 
      const idleImg = getOrangeEnemyImg('idle');
      if (!drawBodySprite(idleImg, ORANGE_DRAW_SCALE, 0)) {
        _drawOrangeBodyGeometry(sx, o, false);
      }
    }
  } else {
    // ── 全幾何 fallback ──
    _drawOrangeBodyGeometry(sx, o, o.phase === 'windup');
  }

  ctx.restore();
}

// ── 幾何 fallback：橘色圓本體 ──
function _drawOrangeBodyGeometry(sx, o, isWindup) {
  const shakeX = isWindup ? (Math.random() - 0.5) * 4 : 0;
  if (isWindup) {
    const t = o.phaseTimer / CONFIG.ORANGE_WINDUP_MS;
    const glow = Math.sin(t * Math.PI * 6) * 0.3 + 0.3;
    ctx.fillStyle = `rgba(255,180,0,${glow})`;
    ctx.beginPath();
    ctx.arc(sx + o.w / 2, o.y + o.h / 2, o.w * 0.75, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#e87020';
  ctx.beginPath();
  ctx.arc(sx + o.w / 2 + shakeX, o.y + o.h / 2, o.w / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,100,0,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(sx + o.w / 2 + shakeX, o.y + o.h / 2, o.w / 2 - 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#4a8a20';
  ctx.fillRect(sx + o.w / 2 - 3 + shakeX, o.y + 2, 6, 7);
  if (!isWindup) {
    const arrowX = o.sprayDir < 0 ? sx + 4 : sx + o.w - 4;
    ctx.fillStyle = 'rgba(255,160,0,0.5)';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💨', arrowX, o.y - 4);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('橘子怪', sx + o.w / 2 + shakeX, o.y - 6);
}

// ── 幾何 fallback：噴油效果 ──
function _drawOrangeSprayGeometry(sx, o) {
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
  ctx.fillStyle = `rgba(255,180,30,${alpha + 0.1})`;
  [0.2, 0.5, 0.8].forEach(t => {
    const px = spx + CONFIG.ORANGE_SPRAY_W * t;
    const py = spy + CONFIG.ORANGE_SPRAY_H / 2 + Math.sin(frameCount * 0.3 + t * 10) * 5;
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
  });
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


// ── DEBUG 固定面板（移除時刪 drawHeroDebugPanel 及其呼叫）────────────
function drawHeroDebugPanel() {
  // 取得 loopDurations 的目前 dur（只在 loop 狀態有意義）
  const loopFrames    = ['run01','run02','run03','run05','run04','run05','run03','run02'];
  const loopDurations = [    6,      6,      7,     14,     16,     14,      7,      6 ];
  const curDur = (_heroRunPhase === 'loop') ? (loopDurations[_heroRunFrame] || 6) : 0;

  const lines = [
    { label: 'ART',        val: _lastHeroArtKey || '—',     color: '#FFD700' },
    { label: 'RUN_PHASE',  val: _heroRunPhase,               color: '#fff' },
    { label: 'RUN_INDEX',  val: _heroRunFrame + ' / ' + loopFrames.length, color: '#fff' },
    { label: 'RUN_TIMER',  val: _heroFrameTimer + ' / ' + curDur,          color: '#fff' },
    { label: 'SWORD_TMR',  val: (player.swordAnimTimer || 0).toString(),   color: '#adf' },
  ];

  const px = 12, py = 68;
  const lh = 16, pad = 6, fw = 138;
  const boxH = lines.length * lh + pad * 2;

  ctx.save();
  // 半透明黑底
  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  ctx.beginPath();
  ctx.roundRect(px - 2, py - 2, fw, boxH, 5);
  ctx.fill();

  ctx.font = '11px monospace';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  lines.forEach((ln, i) => {
    ctx.fillStyle = 'rgba(160,160,160,0.9)';
    ctx.fillText(ln.label + ': ', px + pad, py + pad + i * lh);
    ctx.fillStyle = ln.color;
    ctx.fillText(ln.val, px + pad + 68, py + pad + i * lh);
  });

  ctx.restore();
}

function drawHUD() {
  const timeLeft = Math.max(0, LEVEL_DURATION - Math.floor(elapsedSec));
  const pad = 10;

  // ── HUD 背景：深色半透明帶 ──
  ctx.fillStyle = 'rgba(8,6,30,0.72)';
  ctx.fillRect(0, 0, CANVAS_W, 52);
  // 底邊漸層線
  const gLine = ctx.createLinearGradient(0, 51, CANVAS_W, 51);
  gLine.addColorStop(0,   'rgba(162,155,254,0)');
  gLine.addColorStop(0.5, 'rgba(162,155,254,0.45)');
  gLine.addColorStop(1,   'rgba(162,155,254,0)');
  ctx.fillStyle = gLine;
  ctx.fillRect(0, 51, CANVAS_W, 1);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // ── 左上：HP 心心條 ──
  const heartY = 26;
  const heartSize = 18;
  for (let i = 0; i < player.maxHp; i++) {
    const hx  = pad + i * (heartSize + 4);
    const fill = player.hp - i;
    ctx.font = heartSize + 'px sans-serif';
    if (fill >= 1)      ctx.globalAlpha = 1.0;     // 全心
    else if (fill > 0)  ctx.globalAlpha = 0.6;     // 半心（淡色）
    else                ctx.globalAlpha = 0.18;    // 空心
    ctx.fillText('❤️', hx, heartY);
  }
  ctx.globalAlpha = 1.0;
  // HP 數字（半心時特別標出）
  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = player.hp % 1 > 0 ? '#FDCB6E' : 'rgba(255,255,255,0.5)';
  ctx.fillText(player.hp + '/' + player.maxHp, pad, 44);

  // ── 右上：收集資料（金幣、氣球） ──
  ctx.textAlign = 'right';
  ctx.font = 'bold 13px sans-serif';
  const showRound  = roundBalloons.length > 0;
  let rx = CANVAS_W - pad;
  if (showRound) {
    ctx.fillStyle = '#A29BFE';
    ctx.fillText('⚪' + currentRunStats.roundBalloon, rx, 18);
    rx -= 56;
  }
  ctx.fillStyle = '#FF6B9D';
  ctx.fillText('🎈' + player.balloonsCollected, rx, 18);
  rx -= 60;
  ctx.fillStyle = '#FFD93D';
  ctx.fillText('🪙' + player.coinsCollected, rx, 18);

  // ── 中央：關卡名稱 + 計時器（正式 UI，非 debug）──
  ctx.textAlign = 'center';
  const lv      = LEVELS[currentLevelIndex] || {};
  // v0.3.11-test-2：HUD 不再顯示工程用 stageId，改用章節標題
  const stageLabel = getChapterDisplayTitle(currentLevelIndex);
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = 'rgba(200,195,255,0.85)';
  ctx.fillText(stageLabel, CANVAS_W / 2, 13);

  const timerColor = timeLeft <= 10 ? '#FF6B9D' : 'rgba(255,255,255,0.9)';
  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = timerColor;
  ctx.fillText('⏱ ' + String(timeLeft).padStart(2, '0'), CANVAS_W / 2, 31);

  // 進度條
  const barW = 180;
  const barX = CANVAS_W / 2 - barW / 2;
  const progress = Math.min(1, cameraX / Math.max(1, LEVEL_LENGTH - CANVAS_W));
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath(); ctx.roundRect(barX, 34, barW, 4, 2); ctx.fill();
  const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  barGrad.addColorStop(0, '#55EFC4'); barGrad.addColorStop(1, '#74B9FF');
  ctx.fillStyle = barGrad;
  ctx.beginPath(); ctx.roundRect(barX, 34, barW * progress, 4, 2); ctx.fill();

  // ── 右下：裝備道具膠囊 ──
  const activeItem = activeSlot === 'hammer' ? equippedHammer : equippedSword;
  if (activeItem && activeItem.id) {
    const itemEmoji = activeSlot === 'hammer' ? '🔨' : '⚔️';
    const durFrac   = activeItem.currentDur / activeItem.maxDur;
    const capColor  = activeSlot === 'hammer' ? 'rgba(255,208,128,0.18)' : 'rgba(200,240,255,0.14)';
    const capBorder = activeSlot === 'hammer' ? 'rgba(255,208,128,0.45)' : 'rgba(200,240,255,0.4)';
    const capW = 96, capH = 22, capX = CANVAS_W - pad - capW, capY = 56;

    // 膠囊背景
    ctx.fillStyle = capColor;
    ctx.beginPath(); ctx.roundRect(capX, capY, capW, capH, 8); ctx.fill();
    ctx.strokeStyle = capBorder; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(capX, capY, capW, capH, 8); ctx.stroke();

    // emoji + 耐久文字
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '12px sans-serif';
    ctx.fillText(itemEmoji, capX + 5, capY + 11);
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = activeSlot === 'hammer' ? '#ffd080' : '#c8f0ff';
    ctx.fillText(activeItem.currentDur + '/' + activeItem.maxDur, capX + 22, capY + 11);

    // 耐久小橫條（膠囊底部）
    const bx = capX + 4, bw2 = capW - 8, by2 = capY + capH - 4;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath(); ctx.roundRect(bx, by2, bw2, 3, 1); ctx.fill();
    ctx.fillStyle = durFrac > 0.4 ? '#55EFC4' : '#FDCB6E';
    ctx.beginPath(); ctx.roundRect(bx, by2, bw2 * durFrac, 3, 1); ctx.fill();
  }

  // ── 氣球小狗 HUD ──
  if (bringBalloonDog) {
    const dogX = CANVAS_W - pad - 96;
    const dogY = 84;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,179,209,0.15)';
    ctx.beginPath(); ctx.roundRect(dogX, dogY, 96, 18, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(255,107,157,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(dogX, dogY, 96, 18, 6); ctx.stroke();
    ctx.font = '11px sans-serif'; ctx.fillStyle = '#FFB3D1';
    const noseText = dogNoseLevel >= 3 ? '🐶✨' : dogNoseLevel >= 2 ? '🐶🌟' : dogNoseLevel >= 1 ? '🐶💡' : '🐶';
    ctx.fillText(noseText + ' 小狗同行', dogX + 5, dogY + 9);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
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

function drawVersionInfo() {
  // 測試版：[TEST MODE] 顯示在版本號下方（正式版自動隱藏）
  if (ADVENTURE_TEST_TOOLS_ENABLED) {
    ctx.save();
    ctx.textAlign = 'right';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = 'rgba(255,230,120,0.95)';
    ctx.fillText(
      '[TEST MODE] F8 畫面暫停｜runtime hammer: ' + (HAMMER_ATTACK_VISUAL_TEST_LOADOUT ? 'ON' : 'OFF'),
      CANVAS_W - 14,
      32
    );
    ctx.restore();
  }
  // --- original drawVersionInfo below ---
  // 測試階段：明顯版本條（右上角，黑底白字）
  const vText = GAME_VERSION + '  Build: ' + BUILD_TIME;
  ctx.font     = '10px monospace';
  const tw     = ctx.measureText(vText).width;
  const px = CANVAS_W - tw - 10;
  const py = 4;
  // 黑色半透明底
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(px - 4, py, tw + 8, 18);
  // 白字
  ctx.fillStyle    = '#ffffff';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(vText, px, py + 3);
  ctx.textBaseline = 'alphabetic';
}

function drawResultBox() {
  // 僅加深背景，讓 HTML 面板更清楚
  ctx.fillStyle = 'rgba(10,10,30,0.6)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

// 填充 HTML 結算面板內容（每次 triggerClear/GameOver 時呼叫）

// ── buildBagRows：產生「目前背包」顯示陣列 ──
// 製作道具後呼叫 refreshResultBag() 即時更新，不需重跑整個 populateResultPanel


function rpToggle(titleEl) {
  const bodyId = titleEl.dataset.target;
  const body   = bodyId ? document.getElementById(bodyId) : null;
  if (!body) return;
  const open  = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  const arrow = titleEl.querySelector('.rp-toggle-arrow');
  if (arrow) arrow.textContent = open ? '▶' : '▼';
}

function toggleRpSection(bodyId, titleEl) {
  const body = document.getElementById(bodyId);
  if (!body) return;
  const open  = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  const arrow = titleEl ? titleEl.querySelector('.rp-toggle-arrow') : null;
  if (arrow) arrow.textContent = open ? '▶' : '▼';
}

function toggleRpDetail() {
  const body   = document.getElementById('rp-detail-body');
  const toggle = document.getElementById('rp-detail-toggle');
  if (!body) return;
  const open = body.style.display !== 'none';
  body.style.display   = open ? 'none' : 'block';
  if (toggle) toggle.textContent = open ? '▶ 詳細數據' : '▼ 詳細數據';
}

function buildBagRows() {
  const ci = playerInventory.craftedItems || {};
  const w  = playerWallet || getDefaultWallet(); // V幣（Phase 3A）
  const rows = [
    ['🐷 V幣',              `${w.vCoins || 0}`,                'result-gold'],
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
  const nextLvIndex       = getNextLevelIndex(currentLevelIndex);
  const nextLvHasTreasure = nextLvIndex < LEVELS.length && !!LEVELS[nextLvIndex]?.hiddenTreasure;
  const canBringDog       = hasDog && (playerInventory.balloon260 || 0) >= 1 && !nextBringDog;

  let inner = '';
  if (hasDog) {
    inner += '<div class="rp-section-title">🐶 氣球小狗</div>';
    const ds = getDogStatusText();
    inner += '<div class="rp-row"><span class="rp-label">狀態</span><span class="rp-val result-gold">' + ds.status + '</span></div>';
    inner += '<div class="rp-row"><span class="rp-label">陪伴</span><span class="rp-val result-blue">' + ds.turns + '</span></div>';
    if (currentRunStats.dogHealed) {
      inner += '<div class="rp-row"><span class="rp-label">🐶 療癒</span><span class="rp-val result-red">❤️ +' + CONFIG.DOG_HEAL_AMOUNT + '</span></div>';
    }
    // 帶狗按鈕（不論下一關是否有隱藏物）
    if (!currentRunStats.dogGoneThisClear && turns > 0) {
      // v0.3.11-test-2：下一關需要帶狗才能進入時，用更直接的行動呼籲
      const dogTripRequired = (nextLvIndex === dogHammerStageIndex) && !nextBringDog;
      const hint = dogTripRequired
        ? '先帶氣球小狗出發，牠會幫你找到隱藏寶藏！'
        : nextLvHasTreasure
          ? '氣球小狗好像聞到了什麼……下一關也許有隱藏寶物！'
          : '氣球小狗可以陪小V一起冒險，通關後恢復 ❤️ +' + CONFIG.DOG_HEAL_AMOUNT + '。';
      inner += '<div class="rp-supply-hp" style="color:#ffe080">' + hint + '</div>';
      if (nextBringDog) {
        // 已安排，顯示確認狀態，不可重複點擊
        inner += '<div class="rp-supply-item" style="margin-top:6px">'
          + '<button class="rp-supply-btn rp-supply-btn--disabled" disabled>✅ 已安排帶狗出發</button></div>';
      } else {
        const btnLabel  = canBringDog ? '帶狗出發 -1 🎈' : '260 氣球不足';
        const btnDisStr = canBringDog ? '' : 'disabled';
        const btnCls    = canBringDog ? '' : 'rp-supply-btn--disabled';
        inner += '<div class="rp-supply-item" style="margin-top:6px">'
          + '<div class="rp-supply-info"><span class="rp-supply-name">帶氣球小狗出發</span>'
          + '<span class="rp-supply-price">消耗 260 長條氣球 x1 作為牽繩</span></div>'
          + '<button id="btn-bring-dog" class="rp-supply-btn ' + btnCls + '" ' + btnDisStr
          + ' onclick="bringDogNextLevel()">' + btnLabel + '</button></div>';
      }
    }
  } else {
    inner += '<div class="rp-section-title">🐶 氣球小狗</div>';
    inner += '<div class="rp-row"><span class="rp-label">狀態</span><span class="rp-val" style="color:#666">尚未入住</span></div>';
  }
  sec.innerHTML = inner;
}

function refreshResultBag() {
  // 背包內容在 rp-inventory-body（可收合區塊的 body）
  const body = document.getElementById('rp-inventory-body');
  if (!body) return;
  const rows = buildBagRows();
  body.innerHTML = rows.map(([label, val, cls]) =>
    '<div class="rp-row"><span class="rp-label">' + label + '</span>'
    + '<span class="rp-val ' + cls + '">' + val + '</span></div>'
  ).join('');
}

function populateResultPanel() {
  const timeLeft = Math.max(0, LEVEL_DURATION - Math.floor(elapsedSec));
  const ci       = playerInventory.craftedItems || {}; // 供 hammerHint 等使用
  // v0.3.11-test-3：「下一步」狀態提早算好，整個函式內都可參考，
  // 避免結算畫面各區塊（狗狗區塊等）各自重複判斷同一組條件
  const nextStepInfo = (gameState === 'clear') ? getChapter1NextStepInfo() : null;

  // 本關成果：主要圖示磚（emoji, 數值, css class, 標籤）
  const runRowsMain = [
    ['🪙', String(currentRunStats.coins),                 'result-gold',   '本關金幣'],
    ['🎈', String(currentRunStats.balloon260),            'result-pink',   '260 氣球'],
    ...(currentRunStats.roundBalloon > 0
      ? [['⚪', String(currentRunStats.roundBalloon),     'result-purple', '圓氣球']]
      : []),
    ['💥', String(currentRunStats.enemiesDefeated),       'result-orange', '擊退小怪'],
  ];
  // 詳細數據（可展開，舊三元素格式 [label, value, cls]）
  const runRows = [
    ['🩹 受傷次數', `${currentRunStats.damageTaken} 次`, 'result-red'],
    ['⏱  剩餘時間', `${timeLeft} 秒`,                    'result-blue'],
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
          : currentRunStats.foundHiddenTreasureName === '氣球槌秘笈'
            ? '找到氣球槌秘笈！原來圓球可以做成氣球槌！'
            : '氣球棒棒糖秘笈已解鎖！可在氣球秘笈中查看。')
      + '</div></div>')
    : '';

  // 氣球狗相關
  const dogData       = playerInventory.balloonDog || {};
  const hasDog        = dogData.present;
  const dogTurns      = dogData.turnsLeft || 0;
  const nextLvIndex   = getNextLevelIndex(currentLevelIndex);
  const nextLvHasTreasure = nextLvIndex < LEVELS.length
    && !!LEVELS[nextLvIndex].hiddenTreasure;
  const canBringDog   = hasDog && (playerInventory.balloon260 || 0) >= 1;

  // 第 3 關：basicHammer 解鎖提示（只在「這局第一次解鎖」時顯示）
  // v0.3.11-test-4：實際找到 vs 結算保底，文案分流（不要讓保底也說「你找到了」）
  const ur = playerInventory.unlockedRecipes || {};
  const hammerHint = currentRunStats.unlockedHammerThisClear ? (
    currentRunStats.chapter1HammerRecipeFallback ? `
    <div class="rp-guidebook-hint" style="border-color:rgba(160,120,255,0.4);background:rgba(80,40,160,0.15)">
      <div class="rp-guidebook-hint__title">🔨 新秘笈解鎖：基礎氣球槌！</div>
      <div class="rp-guidebook-hint__body">
        小V靈光乍現，突然領悟了氣球槌的製作方法！氣球秘笈新增：<strong>基礎氣球槌</strong>。<br>
        用 <strong>圓氣球 x2 + 260 長條氣球 x1</strong> 即可製作。點選下方「氣球秘笈」查看。
      </div>
    </div>
  ` : `
    <div class="rp-guidebook-hint" style="border-color:rgba(160,120,255,0.4);background:rgba(80,40,160,0.15)">
      <div class="rp-guidebook-hint__title">🔨 新秘笈解鎖：基礎氣球槌！</div>
      <div class="rp-guidebook-hint__body">
        找到氣球槌秘笈！原來圓球可以做成氣球槌！可以用 <strong>圓氣球 x2 + 260 長條氣球 x1</strong> 製作。<br>
        點選下方「氣球秘笈」查看。
      </div>
    </div>
  `) : '';

  // 第 1 關結算：加入氣球秘笈教學區塊
  const guideBookHint = currentLevelIndex === 0 ? `
    <div class="rp-guidebook-hint">
      <div class="rp-guidebook-hint__title">📖 氣球秘笈解鎖！</div>
      <div class="rp-guidebook-hint__body">
        收集到 260 長條氣球後，可以在<strong>氣球秘笈</strong>裡製作基礎氣球劍，帶入下一關使用！
      </div>
    </div>
  ` : '';

  // v0.3.11：第 1 關結算低血量補給教學（HP <= 1.5 才啟動，避免打斷血量健康的玩家）
  // v0.3.11-test-4：低血量補給救濟若這次有觸發（chapter1LowHpSupplyRescueGranted 有值），
  // 顯示救濟專屬文案；否則維持原本「夠/不夠」兩種文案
  // ──────────────────────────────────────────────────────
  // 重要：救濟判定（triggerClear 內）發生在氣球狗回血（+0.5）之前，
  // 但這個提示是在 populateResultPanel 才組裝，回血早就跑完了。
  // 如果外層只看「目前 player.hp <= 1.5」，玩家剛好以 1.5 結算、
  // 觸發了救濟、卻被狗狗回血到 2.0，提示就會憑空消失——金幣多了卻不知道為什麼。
  // 所以外層判斷要「這次有觸發救濟」OR「目前仍然血量低」兩者其一即可顯示。
  const lowHpRescueHint = (currentLevelIndex === 0
      && (currentRunStats.chapter1LowHpSupplyRescueGranted || player.hp <= 1.5)) ? (
    currentRunStats.chapter1LowHpSupplyRescueGranted ? `
    <div class="rp-guidebook-hint" style="border-color:rgba(255,140,140,0.4);background:rgba(160,40,40,0.15)">
      <div class="rp-guidebook-hint__title">🩹 你受傷了！</div>
      <div class="rp-guidebook-hint__body">
        小V幫你補足了補給金，可以先買一張愛心貼布！打開下方「補給」區看看吧。
      </div>
    </div>
  ` : (playerInventory.coins || 0) >= BANDAGE_PRICE ? `
    <div class="rp-guidebook-hint" style="border-color:rgba(255,140,140,0.4);background:rgba(160,40,40,0.15)">
      <div class="rp-guidebook-hint__title">🩹 你受傷了！</div>
      <div class="rp-guidebook-hint__body">
        可以用金幣買貼布恢復 HP！打開下方「補給」區，花 ${BANDAGE_PRICE} 🪙 買一個愛心貼布吧。
      </div>
    </div>
  ` : `
    <div class="rp-guidebook-hint" style="border-color:rgba(255,140,140,0.4);background:rgba(160,40,40,0.15)">
      <div class="rp-guidebook-hint__title">🩹 你受傷了！</div>
      <div class="rp-guidebook-hint__body">
        金幣不夠也沒關係，氣球小狗會陪你繼續冒險！
      </div>
    </div>
  `) : '';


  const panel = document.getElementById('result-panel-body');
  if (!panel) return;

  // ── 組裝各區塊 HTML（不用巢狀 template literal，避免瀏覽器解析問題）──

  // 氣球狗區塊
  let dogSectionHtml = '';
  if (hasDog) {
    let dogInner = '';
    dogInner += '<div class="rp-section-title">🐶 氣球小狗</div>';
    const dsDog = getDogStatusText();
    dogInner += '<div class="rp-row"><span class="rp-label">狀態</span><span class="rp-val result-gold">' + dsDog.status + '</span></div>';
    dogInner += '<div class="rp-row"><span class="rp-label">陪伴</span><span class="rp-val result-blue">' + dsDog.turns + '</span></div>';
    if (currentRunStats.dogHealed) {
      dogInner += '<div class="rp-row"><span class="rp-label">❤️ 結算回血</span><span class="rp-val result-red">+0.5</span></div>';
    }
    // v0.3.11-test-3：第 1 關完整說明文字已移到上方「下一步」區塊處理，
    // 這裡只在「下一步」不會顯示時（非第一章流程關卡）才補完整說明，
    // 避免兩處同時出現重複文字
    if (currentLevelIndex === 0 && !nextStepInfo) {
      const ch1Flags = ensureChapter1Flags();
      if (!ch1Flags.dogIntroDone) {
        ch1Flags.dogIntroDone = true;
        saveInventory();
        dogInner += '<div class="rp-supply-hp" style="color:#ffe080">'
          + '氣球狗療癒了你的心，HP +' + CONFIG.DOG_HEAL_AMOUNT + '！牠還能陪你冒險 '
          + CONFIG.DOG_INITIAL_TURNS + ' 回合。帶牠出門需要消耗 1 條 260 氣球作為狗繩。'
          + '氣球狗會幫你找到隱藏的寶藏！'
          + '</div>';
      }
    }
    if (currentRunStats.dogGoneThisClear) {
      dogInner += '<div class="rp-supply-hp" style="color:#ffaaaa">氣球小狗慢慢消氣了。牠陪小V完成了一段美好的冒險。</div>';
    }
    // v0.3.11-test-3：結算畫面資訊減量 — 帶狗出發的主要行動已移到上方「下一步」區塊，
    // 這裡只在「下一步」沒有顯示帶狗行動時才補完整的提示+按鈕（例如已經安排好帶狗、
    // 或不在第一章流程內但仍有 hiddenTreasure 的情況），避免同一個按鈕重複出現兩次
    const nextStepAlreadyHandlesBringDog = nextStepInfo && nextStepInfo.kind === 'bringDog';
    if (nextLvHasTreasure && !currentRunStats.dogGoneThisClear && !nextStepAlreadyHandlesBringDog) {
      dogInner += '<div class="rp-supply-hp" style="color:#ffe080">'
        + '氣球小狗好像聞到了什麼……下一關也許有隱藏寶物，記得帶牠一起去！'
        + '</div>';
      if (!nextBringDog) {
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

  // ── 組合完整 HTML（Phase 2B-2：兒童友善，資訊層級）── //

  // 【第一層】主標題 + 本關收穫圖示磚
  const mainTiles = runRowsMain.map(([e, v, cls, lbl]) =>
    '<div class="rp-reward-tile"><div class="rp-reward-tile__icon">' + e + '</div>'
    + '<div class="rp-reward-tile__num ' + cls + '">+' + v + '</div>'
    + '<div class="rp-reward-tile__lbl">' + lbl + '</div></div>'
  ).join('');

  // 徽章（隱藏物 + 狗療癒）
  const foundBadges = [];
  if (currentRunStats.foundHiddenTreasureName === '氣球棒棒糖秘笈')
    foundBadges.push('<div class="rp-award-badge rp-award-badge--recipe"><span>📖</span>新秘笈發現！</div>');
  if (currentRunStats.foundHiddenTreasureName === '金幣寶箱')
    foundBadges.push('<div class="rp-award-badge rp-award-badge--chest"><span>🎁</span>隱藏寶箱 +' + (currentRunStats.foundTreasureCoins || 30) + ' 🪙</div>');
  if (currentRunStats.dogHealed)
    foundBadges.push('<div class="rp-award-badge rp-award-badge--dog"><span>🐶</span>氣球小狗療癒 ❤️ +' + CONFIG.DOG_HEAL_AMOUNT + '</div>');
  const badgesHtml = foundBadges.join('');

  // 【第二層】目前背包（預設收合）—— onclick 用 data-target，避免字串引號衝突
  const bagHtml = '<div class="rp-fold-card" id="rp-inventory-section">'
    + '<div class="rp-fold-btn" data-target="rp-inventory-body" onclick="rpToggle(this)">'
    + '<span class="rp-fold-icon">🎒</span><span>目前背包</span><span class="rp-toggle-arrow">▶</span></div>'
    + '<div id="rp-inventory-body" style="display:none">' + makeTable(buildBagRows()) + '</div></div>';

  // 【第三層】詳細紀錄（預設收合）
  const detailHtml = '<div class="rp-fold-card" id="rp-run-section">'
    + '<div class="rp-fold-btn" data-target="rp-detail-body" onclick="rpToggle(this)">'
    + '<span class="rp-fold-icon">📋</span><span>詳細紀錄</span><span class="rp-toggle-arrow">▶</span></div>'
    + '<div id="rp-detail-body" style="display:none">' + makeTable(runRows) + '</div></div>';

  // 【第四層】補給（預設收合）
  const supplyHtml = '<div class="rp-fold-card" id="supply-section">'
    + '<div class="rp-fold-btn" data-target="rp-supply-body" onclick="rpToggle(this)">'
    + '<span class="rp-fold-icon">🏥</span><span>補給</span><span class="rp-toggle-arrow">▶</span></div>'
    + '<div id="rp-supply-body" style="display:none">'
    + (function(){
        var hpFilled = Math.floor(player.hp);
        var hpHalf   = player.hp % 1 >= 0.5;
        var hearts   = '';
        for(var i=0;i<player.maxHp;i++){
          hearts += '<span class="rp-hp-heart'+(i<hpFilled?' rp-hp-heart--full':(i===hpFilled&&hpHalf?' rp-hp-heart--half':''))+'">❤️</span>';
        }
        return '<div class="rp-supply-hp-row">'+hearts+'<span class="rp-supply-hp-num" id="supply-hp">'+player.hp+' / '+player.maxHp+'</span></div>';
      })()
    + '<div class="rp-supply-bandage-row"><div class="rp-supply-bandage-info"><span class="rp-supply-name">🩹 愛心貼布</span><span class="rp-supply-price">−20 🪙　+1 ❤️</span></div>'
    + '<button id="btn-buy-bandage" class="rp-supply-btn rp-supply-btn--'
    + (player.hp>=player.maxHp||currentRunStats.usedHeartPatch||(playerInventory.coins||0)<BANDAGE_PRICE ? 'disabled' : 'active')
    + '" onclick="buyBandage()">' + bandageBtnText + '</button></div>'
    + '<div id="bandage-msg" class="rp-supply-msg"></div>'
    + '</div></div>';

  // 確保 wallet 已載入（結算畫面顯示用）
  ensurePlayerWallet();

  // 組合
  let html = '';
  // v0.3.11-test-3：badge 副標改用「第 N 節｜...」（取代舊版「第 N 段：...」措辭）
  const chapterDisplayInfo = getChapterDisplayInfo(currentLevelIndex);
  const chapterSubLabel    = chapterDisplayInfo.subtitle;
  html += '<div class="rp-level-badge"><span class="rp-level-emoji">'
    + (LEVELS[currentLevelIndex]?.emoji || '🌿')
    + '</span><span class="rp-level-stageId">'
    + chapterSubLabel
    + '</span></div>';
  // v0.3.11-test-2：主標題改用章節標題（不再顯示「1-1 氣球森林小徑」這類工程命名）
  const chapterTitle = chapterDisplayInfo.title;
  if (gameState === 'gameover') {
    html += '<div class="rp-clear-title rp-gameover-title">⏰ 時間到！</div>';
    html += '<div class="rp-level-display-name">' + chapterTitle + '</div>';
    html += '<div class="rp-clear-sub">這次沒有抵達終點，再挑戰一次吧！</div>';
  } else {
    html += '<div class="rp-clear-title">🎉 過關成功！</div>';
    html += '<div class="rp-level-display-name">' + chapterTitle + '</div>';
    html += '<div class="rp-clear-sub">本關帶回這些派對材料！</div>';
  }
  html += buildResultHpHtml(); // 直接顯示目前 HP

  // v0.3.11-test-3：「下一步」區塊 — 結算畫面資訊減量後的單一重點行動指引
  // 放在中上方（標題/HP 之後，主要收穫區塊之前），只在第一章流程內、且為 clear（非 gameover）時顯示
  // （nextStepInfo 已在函式開頭算好，這裡直接使用）
  if (nextStepInfo) {
    html += '<div class="rp-guidebook-hint rp-next-step">'
      + '<div class="rp-guidebook-hint__title">' + nextStepInfo.title + '</div>'
      + '<div class="rp-guidebook-hint__body">' + nextStepInfo.body + '</div>'
      + (nextStepInfo.actionLabel
          ? '<button class="rp-next-step-btn" onclick="' + nextStepInfo.actionFn + '()">'
            + nextStepInfo.actionLabel + '</button>'
          : '')
      + '</div>';
  }

  // 第一層：重點收穫
  html += '<div class="rp-hero-section" id="rp-hero-section">'
    + '<div class="rp-reward-grid">' + mainTiles + '</div>'
    + (badgesHtml ? '<div class="rp-awards">' + badgesHtml + '</div>' : '')
    + '</div>';
  // V幣獎勵 section（Phase 3A，earned > 0 才顯示）
  html += '<div id="rp-vcoin-section" style="display:none"></div>';

  // 特殊提示（槌子解鎖 / 秘笈按鈕）
  html += treasureHint;
  html += hammerHint;
  html += guideBookHint;
  html += lowHpRescueHint;
  // 氣球小狗
  html += dogSectionHtml;
  // 可收合的三層
  html += bagHtml;
  html += detailHtml;
  html += supplyHtml;
  // 氣球小知識
  html += '<div class="rp-trivia-card"><span class="rp-trivia-icon">💡</span><span>' + trivia + '</span></div>';

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
  // Phase 3A：V幣明細顯示（DOM 建立後才呼叫）
  if (typeof refreshResultVCoins === 'function') refreshResultVCoins();
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
  if (typeof refreshResultHpStatus === 'function') refreshResultHpStatus();
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
    // v0.3.11-test-2：第一章流程下，260 不足不能讓玩家卡死在「帶狗出發」這一步。
    // 用既有 chapter1Flow.forcedDogTripDone 旗標，限定補發一次 260 作狗繩費用。
    const nextIdx = getNextLevelIndex(currentLevelIndex);
    const flags   = ensureChapter1Flags();
    if (nextIdx === dogHammerStageIndex && !flags.forcedDogTripDone) {
      playerInventory.balloon260 = (playerInventory.balloon260 || 0) + 1;
      flags.forcedDogTripDone = true;
      showHint('小V幫你準備了 1 條 260 氣球，做成狗繩帶氣球狗出發吧！', 260);
      // 補完後直接往下走原本流程（扣 1 條、設 nextBringDog）
    } else {
      showHint('需要 260 長條氣球 x1 作為牽繩', 180);
      return;
    }
  }
  playerInventory.balloon260--;
  nextBringDog = true;  // 下一關才生效，不是現在
  saveInventory();
  refreshResultBag(); // 更新 260 氣球數量
  // v0.3.11-test-3：完整重繪結算面板，讓「下一步」區塊／下一關按鈕文字／
  // 狗狗區塊三處同步從情境 A 切換到情境 B，避免三條更新路徑各自手動同步出現漂移
  if (typeof populateResultPanel === 'function' && document.getElementById('result-panel-body')) {
    populateResultPanel();
  }
  if (typeof updateNextLevelButton === 'function') updateNextLevelButton();
}


// =============================================
//  小V的家（Phase 2）
//  openHomeScreen()   — 開啟小V的家
//  closeHomeScreen()  — 關閉小V的家
//  renderHome*()      — 各區塊渲染
//  homeGoNextLevel()  — 從小V的家進入下一關
// =============================================


// ── 小V的家卡片展開/收合 ────────────────────
function initHomeCards() {
  document.querySelectorAll('.hcard').forEach(card => {
    if (card.dataset.bound) return;
    card.dataset.bound = '1';
    card.addEventListener('click', () => {
      const targetId = card.dataset.target;
      const section  = document.getElementById(targetId);
      if (!section) return;
      // v0.3.12：「氣球秘笈」卡片直接打開秘笈 overlay，不再需要展開區塊後再按一次按鈕
      if (targetId === 'home-guidebook-section') {
        openGuidebook();
        return;
      }
      // 收合其他 section（不含 home-next-stage-section，它是固定的）
      document.querySelectorAll('#home-body .home-section').forEach(s => {
        s.style.display = 'none';
      });
      document.querySelectorAll('.hcard').forEach(c => c.classList.remove('hcard--open'));
      // 永遠展開被點擊的那張（再點同一張也保持展開，不會消失）
      section.style.display = 'block';
      card.classList.add('hcard--open');
      // 展開後刷新對應內容
      if (targetId === 'home-inventory-section') renderHomeInventory();
      else if (targetId === 'home-dog-section')   renderHomeDog();
      else if (targetId === 'home-supply-section') renderHomeSupply();
      else if (targetId === 'home-challenge-section') renderHomeChallenge();
    });
  });
}


// =============================================
//  共用裝備稱號讀取（Phase 3B：read-only）
//  讀取 players/{playerKey}/equippedTitle
//  fallback: players/{playerKey}/quizEquippedTitle
//  本版只讀取顯示，不寫入、不解鎖、不收藏
// =============================================

let playerEquippedTitle = null;

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getDefaultEquippedTitle() {
  return { titleKey: '', name: '', gameId: '', source: '', equippedAt: 0, fromFallback: false };
}

function normalizeEquippedTitle(raw, fromFallback) {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    if (!raw.trim()) return null;
    return { titleKey: raw, name: raw, gameId: '', source: '', equippedAt: 0, fromFallback: !!fromFallback };
  }
  if (typeof raw === 'object') {
    const titleKey = raw.titleKey || raw.key || '';
    const name     = raw.name || titleKey;
    if (!name && !titleKey) return null;
    return {
      titleKey:    titleKey,
      name:        name,
      gameId:      raw.gameId  || '',
      source:      raw.source  || '',
      equippedAt:  raw.equippedAt || 0,
      fromFallback: !!fromFallback,
    };
  }
  return null;
}

function getEquippedTitleDisplayText() {
  if (!playerEquippedTitle) return '未裝備';
  return playerEquippedTitle.name || playerEquippedTitle.titleKey || '未裝備';
}

async function loadEquippedTitleFromFirebase() {
  try {
    const identity  = getPlayerIdentityForResult();
    const playerKey = identity.playerKey;
    if (!playerKey || !isFirebaseAvailable()) {
      playerEquippedTitle = null;
      return null;
    }
    const db = firebase.database();

    // 先讀主欄位 equippedTitle
    const mainSnap  = await db.ref('players/' + playerKey + '/equippedTitle').once('value');
    const mainTitle = normalizeEquippedTitle(mainSnap.val(), false);
    if (mainTitle) {
      playerEquippedTitle = mainTitle;
      console.log('[Title] equippedTitle loaded:', mainTitle.name);
      return playerEquippedTitle;
    }

    // 主欄位不存在才讀 fallback
    const fbSnap      = await db.ref('players/' + playerKey + '/quizEquippedTitle').once('value');
    const fallbackTitle = normalizeEquippedTitle(fbSnap.val(), true);
    playerEquippedTitle = fallbackTitle || null;
    if (playerEquippedTitle) console.log('[Title] quizEquippedTitle (fallback) loaded:', playerEquippedTitle.name);
    return playerEquippedTitle;
  } catch(e) {
    console.warn('[Title] loadEquippedTitleFromFirebase failed:', e.message, e);
    playerEquippedTitle = null;
    return null;
  }
}

// ── 頭像圖片路徑（共用 vparty-rhythm-game assets）──
const ADVENTURE_AVATAR_BASE = 'https://vashyang1120.github.io/vparty-rhythm-game/assets/avatars/';
function getAvatarImgUrl(avatarKey) {
  if (!avatarKey) return '';
  return ADVENTURE_AVATAR_BASE + avatarKey + '.png';
}

// ── 冒險通行證 avatar HTML ──
function buildPassportAvatarHtml(avatarKey, size, label) {
  const url = resolveAdventureAvatarSrc(avatarKey || 'boy1'); // 使用統一 resolver
  const sz = size || 80;
  return '<div class="passport-avatar-wrap">'
    + '<img src="' + escapeHtml(url) + '" alt="' + escapeHtml(avatarKey) + '"'
    + ' class="passport-avatar-img" style="width:' + sz + 'px;height:' + sz + 'px;"'
    + ' onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">'
    + '<div class="passport-avatar-fallback" style="width:' + sz + 'px;height:' + sz + 'px;display:none">🎈</div>'
    + (label ? '<div class="passport-avatar-label">' + escapeHtml(label) + '</div>' : '')
    + '</div>';
}

function renderHomePlayer() {
  const el = document.getElementById('home-player-body');
  if (!el) return;
  const p = playerProfile || createDefaultPlayerProfile();
  const titleText  = getEquippedTitleDisplayText();
  const hasTitle   = titleText && titleText !== '未裝備';
  const showAlt    = p.displayAvatarKey && p.displayAvatarKey !== p.baseAvatarKey;

  // 主頭像區（角色身份）
  const mainAvatarHtml = buildPassportAvatarHtml(p.baseAvatarKey, 88, '角色身份');

  // 副頭像區（目前外觀，只在與身份不同時顯示）
  const altAvatarHtml = showAlt
    ? '<div class="passport-alt-avatar">'
      + buildPassportAvatarHtml(p.displayAvatarKey, 72, '目前外觀')
      + '</div>'
    : '';

  el.innerHTML =
    '<div class="passport-card">'
    // 頭像列
    + '<div class="passport-avatar-row">'
    + mainAvatarHtml
    + altAvatarHtml
    + '</div>'
    // 玩家名稱
    + '<div class="passport-name">' + escapeHtml(p.name || p.id || 'Player') + '</div>'
    // 稱號
    + '<div class="passport-title' + (hasTitle ? ' passport-title--active' : ' passport-title--empty') + '">'
    + (hasTitle ? '✦ ' + escapeHtml(titleText) : '未裝備稱號')
    + '</div>'
    // 說明小字
    + '<div class="passport-hint">這個身份會記錄你的冒險成績、稱號與獎勵。</div>'
    + '</div>';
}

function openHomeScreen(from) {
  homeEntryMode = from || 'normal';
  // 初始化 V幣資料（Phase 3A）
  loadPlayerWallet();
  loadPlayerHome();
  // 同步隱藏其他 overlay（但保留在背後，可返回）
  const resultEl = document.getElementById('result-overlay');
  const failedEl = document.getElementById('failed-overlay');
  if (resultEl) resultEl.style.display = 'none';
  if (failedEl) failedEl.style.display = 'none';

  // 更新返回按鈕
  const backBtn = document.getElementById('btn-home-back');
  if (backBtn) {
    if (homeEntryMode === 'clear') {
      backBtn.textContent = '← 返回結算畫面';
      backBtn.style.display = 'inline-block';
    } else if (homeEntryMode === 'failed') {
      backBtn.textContent = '← 返回失敗畫面';
      backBtn.style.display = 'inline-block';
    } else {
      backBtn.style.display = 'none';
    }
  }

  // 渲染各區塊
  renderHomeInventory();
  renderHomeSupply();
  renderHomeDog();
  renderHomeNextStage();
  renderHomeChallenge();
  renderHomePlayer(); // 先顯示現有狀態（未裝備）
  renderHomeWallet();
  renderHomePreviewCard();
  // 非同步讀取裝備稱號，完成後刷新玩家資訊
  loadEquippedTitleFromFirebase().then(function() {
    if (typeof renderHomePlayer === 'function') renderHomePlayer();
  });
  initHomeCards();
  // home-next-stage-section 現在是固定顯示，不需要 JS show/hide
  // 確保所有其他 section 預設收合（首次進入時）
  document.querySelectorAll('#home-body .home-section').forEach(s => {
    s.style.display = 'none';
  });
  document.querySelectorAll('.hcard').forEach(c => c.classList.remove('hcard--open'));

  document.getElementById('home-screen').style.display = 'flex';
  if (typeof window.hidePauseBtn === 'function') window.hidePauseBtn();
}

function closeHomeScreen() {
  document.getElementById('home-screen').style.display = 'none';
}

// ── 目前背包 ────────────────────────────────
function renderHomeInventory() {
  const el = document.getElementById('home-inventory-body');
  if (!el) return;
  const ci = playerInventory.craftedItems || {};
  const eqSword  = (equippedSword.id && equippedSword.currentDur) ? equippedSword.currentDur + '/' + equippedSword.maxDur : null;
  const eqHammer = (equippedHammer.id && equippedHammer.currentDur) ? equippedHammer.currentDur + '/' + equippedHammer.maxDur : null;
  const items = [
    { e:'🪙',  v: playerInventory.coins,       lbl:'金幣',    cls:'inv-coin',   dur:null },
    { e:'🎈',  v: playerInventory.balloon260,  lbl:'260 氣球',cls:'inv-balloon',dur:null },
    { e:'⚪',  v: playerInventory.roundBalloon,lbl:'圓氣球',  cls:'inv-round',  dur:null },
    { e:'⚔️', v: ci.basicSword     ||0,        lbl:'氣球劍',  cls:'inv-sword',  dur:eqSword },
    { e:'🔨', v: ci.basicHammer    ||0,        lbl:'氣球槌',  cls:'inv-hammer', dur:eqHammer },
    { e:'🍭', v: ci.balloonLollipop||0,        lbl:'棒棒糖',  cls:'inv-candy',  dur:null },
  ].filter(i => i.v > 0);
  if (!items.length) { el.innerHTML = '<div class="inv-empty">背包空空如也 🎈</div>'; return; }
  el.innerHTML = '<div class="inv-grid">'
    + items.map(i =>
        '<div class="inv-item ' + i.cls + '">'
        + '<div class="inv-item__icon">' + i.e + '</div>'
        + '<div class="inv-item__count">' + i.v + '</div>'
        + '<div class="inv-item__name">' + i.lbl + '</div>'
        + (i.dur ? '<div class="inv-item__dur">' + i.dur + '</div>' : '')
        + '</div>'
      ).join('')
    + '</div>';
}

// ── 補給與生命 ──────────────────────────────
function renderHomeSupply() {
  const el = document.getElementById('home-supply-body');
  if (!el) return;

  const bandageBtnText = player.hp >= player.maxHp  ? '生命已滿'
    : currentRunStats.usedHeartPatch                 ? '本關已使用'
    : (playerInventory.coins || 0) < CONFIG.HEART_PATCH_COST ? '金幣不足'
    : '購買並使用 -' + CONFIG.HEART_PATCH_COST + ' 🪙';
  const bandageDisabled = (player.hp >= player.maxHp
    || currentRunStats.usedHeartPatch
    || (playerInventory.coins || 0) < CONFIG.HEART_PATCH_COST);

  el.innerHTML =
    '<div class="home-row"><span class="home-row-label">❤️ 目前生命</span>'
    + '<span class="home-row-val result-red">' + player.hp + ' / ' + player.maxHp + '</span></div>'
    + '<div class="home-supply-item">'
    + '<div><span class="home-row-label">🩹 愛心貼布</span>'
    + '<span style="color:#888;font-size:11px;margin-left:6px">20 🪙 +1 ❤️</span></div>'
    + '<button id="btn-home-bandage" class="home-btn '
    + (bandageDisabled ? 'home-btn--dim' : 'home-btn--red') + '" '
    + (bandageDisabled ? 'disabled' : '') + ' onclick="homeUseBandage()">'
    + bandageBtnText + '</button></div>'
    + '<div id="home-bandage-msg" class="home-msg"></div>';
}

function homeUseBandage() {
  if (typeof buyBandage === 'function') {
    buyBandage(); // 共用現有邏輯
    renderHomeSupply();     // 更新補給區
    renderHomeInventory();  // 更新背包金幣
  }
}

// ── 氣球小狗 ────────────────────────────────
function renderHomeDog() {
  const el = document.getElementById('home-dog-body');
  if (!el) return;
  const dog             = playerInventory.balloonDog || {};
  const hasDog          = dog.present;
  const turns           = dog.turnsLeft || 0;
  const nextLvIdx       = getNextLevelIndex(currentLevelIndex);
  const nextHasTreasure = nextLvIdx < LEVELS.length && !!LEVELS[nextLvIdx]?.hiddenTreasure;
  const canBringDog     = hasDog && (playerInventory.balloon260 || 0) >= 1;

  if (!hasDog) {
    const canCraft = (playerInventory.balloon260 || 0) >= 1;
    el.innerHTML =
      '<div class="dog-card dog-card--empty">'
      + '<div class="dog-card__face">🐶</div>'
      + '<div class="dog-card__title">還沒有氣球小狗</div>'
      + '<div class="dog-card__desc">製作時立刻療癒 ❤️ +0.5<br>之後每次通關也療癒 ❤️ +0.5</div>'
      + '<button class="dog-craft-btn ' + (canCraft ? '' : 'dog-craft-btn--disabled') + '" '
      + (canCraft ? 'onclick="homeMakeDog()"' : 'disabled') + '>'
      + (canCraft ? '✨ 製作氣球小狗 −1 🎈' : '260 氣球不足') + '</button>'
      + '</div>';
    return;
  }

  // 回合格子
  let turnsHtml = '';
  for (let i = 0; i < 3; i++) {
    turnsHtml += '<div class="dog-turn-dot' + (i < turns ? ' dog-turn-dot--filled' : '') + '"></div>';
  }

  // 帶狗提示（不論下一關是否有隱藏物，只要有狗就可帶）
  // v0.3.11-test-2：若下一關需要帶狗才能進入，且玩家還沒安排，
  // 用更直接的行動呼籲取代原本「好像聞到了什麼」的軟性提示
  const dogTripRequired = (nextLvIdx === dogHammerStageIndex) && !nextBringDog;
  const dogHint = dogTripRequired
    ? '🐶 先帶氣球小狗出發，牠會幫你找到隱藏寶藏！'
    : nextHasTreasure
      ? '🐶 氣球小狗好像聞到了什麼……下一關也許有隱藏寶物！'
      : '🐶 氣球小狗可以陪小V一起冒險，通關後恢復 ❤️ +' + CONFIG.DOG_HEAL_AMOUNT + '。';

  let bringBtnHtml = '';
  if (turns <= 0) {
    bringBtnHtml = '<div style="font-size:11px;color:#ff8888;margin-top:6px">氣球小狗已消氣，無法帶出門</div>';
  } else if (nextBringDog) {
    // 已安排帶狗，顯示確認，不可重複扣
    bringBtnHtml = '<div class="dog-arranged">✅ 已安排帶狗出發</div>';
  } else {
    const canBring = hasDog && (playerInventory.balloon260 || 0) >= 1;
    const btnText  = canBring ? '帶狗出發 -1 🎈' : '260 氣球不足';
    bringBtnHtml = '<button id="btn-home-bring-dog" class="dog-bring-btn '
      + (canBring ? '' : 'dog-bring-btn--disabled') + '" '
      + (canBring ? 'onclick="homeBringDog()"' : 'disabled') + '>'
      + (canBring ? '🐾 ' : '') + btnText + '</button>';
  }

  el.innerHTML =
    '<div class="dog-card dog-card--present">'
    + '<div class="dog-card__face dog-wiggle">🐶</div>'
    + '<div class="dog-card__title">' + (bringBalloonDog ? '🐶 氣球小狗同行中' : '氣球小狗在小V的家') + '</div>'
    + '<div class="dog-card__turns">' + turnsHtml + '</div>'
    + '<div class="dog-card__desc">製作時 ❤️ +' + CONFIG.DOG_HEAL_AMOUNT + '，通關時也療癒 ❤️ +' + CONFIG.DOG_HEAL_AMOUNT + '</div>'
    + '</div>'
    + '<div class="dog-hint-text">' + dogHint + '</div>'
    + bringBtnHtml;
}


function homeMakeDog() {
  const ok = craftItem('balloonDog');
  if (ok) {
    showCraftMessage('🐶 氣球小狗入住小V的家，療癒了小V ❤️ +0.5');
    renderHomeDog();
    renderHomeInventory();
    renderHomeSupply();
    refreshResultDog();
    refreshResultBag();
    const supplyHp = document.getElementById('supply-hp');
    if (supplyHp) supplyHp.textContent = player.hp + ' / ' + player.maxHp;
    if (typeof refreshResultHpStatus === 'function') refreshResultHpStatus(); // 結算主 HP
  } else {
    showCraftMessage('260 氣球不足，無法製作氣球小狗');
  }
}

function homeBringDog() {
  if (typeof bringDogNextLevel === 'function') {
    bringDogNextLevel();
    renderHomeDog();        // 更新小V的家狗區塊（顯示「已安排」）
    renderHomeInventory();  // 更新 260 氣球數量
    refreshResultDog();     // 同步結算畫面狗區塊
    refreshResultBag();     // 同步背包 260 數量
  }
}

// ── 下一關資訊 ──────────────────────────────
function renderHomeNextStage() {
  const el  = document.getElementById('home-next-stage-body');
  const btn = document.getElementById('btn-home-next-level');
  if (!el) return;

  if (homeEntryMode === 'failed') {
    const lv = LEVELS[currentLevelIndex];
    // v0.3.11-test-2：不顯示工程用 stageId，改用章節標題（橘子果園等非第一章流程關卡仍 fallback 原名稱）
    el.innerHTML =
      '<div class="hns-badge hns-badge--warn">本關尚未完成</div>'
      + '<div class="hns-name">' + getChapterDisplayTitle(currentLevelIndex) + '</div>'
      + '<div class="hns-hint">擊退所有挑戰，帶著收穫回家吧！</div>';
    if (btn) { btn.textContent = '↺ 重試本關'; btn.className = btn.className.replace('home-btn--green','home-btn--red'); }
    return;
  }

  const nextIdx = getNextLevelIndex(currentLevelIndex);
  if (nextIdx >= LEVELS.length) {
    el.innerHTML = '<div class="hns-badge hns-badge--clear">🎉 全部關卡完成！</div><div class="hns-hint">可以重玩或等待更多冒險！</div>';
    if (btn) { btn.textContent = '🔄 再玩一次'; btn.className = btn.className.replace('home-btn--red','home-btn--green'); }
    return;
  }
  const lv = LEVELS[nextIdx];
  const hasSecret = lv.hiddenTreasure && playerInventory.balloonDog?.present;
  // v0.3.11-test-3：改用 getChapterDisplayInfo，副標統一成「第 N 節｜...」，與結算畫面一致
  const nextDisplayInfo = getChapterDisplayInfo(nextIdx);
  el.innerHTML =
    '<div class="hns-stage-id">' + nextDisplayInfo.subtitle + '</div>'
    + '<div class="hns-name">' + nextDisplayInfo.title + '</div>'
    + (hasSecret ? '<div class="hns-hint hns-hint--secret">🔮 這一關似乎藏著神秘寶物……</div>' : '');
  if (btn) { btn.textContent = '🚀 出發冒險！'; btn.className = btn.className.replace('home-btn--red','home-btn--green'); }
}

// ── 本次挑戰 ────────────────────────────────
function renderHomeChallenge() {
  const el = document.getElementById('home-challenge-body');
  if (!el) return;
  const c = currentChallenge;
  const stats = [
    { e:'🗺️', v: c.stagesCleared,      lbl:'完成關卡' },
    { e:'🪙',  v: c.totalCoinsCollected,lbl:'金幣' },
    { e:'📖', v: c.hiddenRecipesFound,  lbl:'秘笈' },
    { e:'🎁',  v: c.hiddenTreasuresFound,lbl:'寶箱' },
    { e:'↺',  v: c.retryCount,          lbl:'重試' },
    { e:'🩹',  v: c.damageTaken,         lbl:'受傷' },
  ];
  el.innerHTML = '<div class="challenge-grid">'
    + stats.map(s =>
        '<div class="challenge-tile">'
        + '<div class="challenge-tile__icon">' + s.e + '</div>'
        + '<div class="challenge-tile__val">' + s.v + '</div>'
        + '<div class="challenge-tile__lbl">' + s.lbl + '</div>'
        + '</div>'
      ).join('')
    + '</div>';
}

// ── 從小V的家進入下一關 ──────────────────────




// ── 開發測試用：清掉 V幣相關 localStorage（不清背包、不清身份）────
window.resetAdventureVCoinTestData = function() {
  const keys = [
    getPlayerScopedStorageKey('balloonVAdventureWallet'),
    getPlayerScopedStorageKey('balloonVAdventureDailyRewards'),
    getPlayerScopedStorageKey('balloonVAdventureAchievements'),
    getPlayerScopedStorageKey('balloonVAdventureVCoinLogs'),
  ];
  keys.forEach(k => {
    localStorage.removeItem(k);
    console.log('[resetAdventureVCoinTestData] removed:', k);
  });
  playerWallet       = null;
  playerDailyRewards = null;
  playerAchievements = null;
  console.log('[resetAdventureVCoinTestData] cache cleared. Reload to apply: location.reload()');
};

// ── 開發測試用：切換 playerKey（console only，無正式 UI）────
window.setAdventurePlayerForTest = function(id, baseAvatarKey) {
  const newKey = buildPlayerKey(id || 'Player', baseAvatarKey || 'boy1');
  const newProfile = {
    id:               id || 'Player',
    name:             id || 'Player',
    baseAvatarKey:    baseAvatarKey || 'boy1',
    displayAvatarKey: baseAvatarKey || 'boy1',
    avatarKey:        baseAvatarKey || 'boy1',
    playerKey:        newKey,
  };
  localStorage.setItem(PLAYER_PROFILE_STORAGE_KEY, JSON.stringify(newProfile));
  // 清掉執行期快取
  playerProfile      = null;
  playerWallet       = null;
  playerDailyRewards = null;
  playerHomeData     = null;
  playerAchievements = null;
  console.log('[setAdventurePlayerForTest] new playerKey:', newKey);
  console.log('[setAdventurePlayerForTest] reload the page to apply: location.reload()');
};

// =============================================
//  retryCurrentLevelFromStart()
//  所有「重試本關」入口的統一函式（規格版）
// =============================================

// ── 結算畫面 HP 狀態 HTML ────────────────────

// ── 氣球小狗狀態文字（依 bringBalloonDog）────
function getDogStatusText() {
  const dog = playerInventory.balloonDog || {};
  if (!dog.present) return { status: '尚未製作氣球小狗', turns: '' };
  const turns = dog.turnsLeft || 0;
  const turnsText = '陪伴還剩 ' + turns + ' 次冒險';
  if (bringBalloonDog) return { status: '🐶 氣球小狗同行中', turns: turnsText };
  return { status: '🐶 氣球小狗在小V的家', turns: turnsText };
}

function buildResultHpHtml() {
  const hpFilled = Math.floor(player.hp);
  const hpHalf   = player.hp % 1 >= 0.5;
  let hearts = '';
  for (let i = 0; i < player.maxHp; i++) {
    hearts += '<span class="rp-hp-heart'
      + (i < hpFilled ? ' rp-hp-heart--full' : (i === hpFilled && hpHalf ? ' rp-hp-heart--half' : ''))
      + '">❤️</span>';
  }
  const warn = player.hp <= 1
    ? '<div class="rp-hp-warn">⚠️ 生命偏低，建議先補給再出發！</div>' : '';
  return '<div class="rp-hp-status" id="rp-hp-status">'
    + '<div class="rp-hp-status__row">' + hearts
    + '<span class="rp-hp-status__num">' + player.hp + ' / ' + player.maxHp + '</span></div>'
    + warn + '</div>';
}

function refreshResultHpStatus() {
  const el = document.getElementById('rp-hp-status');
  if (el) el.outerHTML = buildResultHpHtml();
}

function retryCurrentLevelFromStart() {
  // 1. restore snapshot
  if (typeof restoreLevelStartSnapshot === 'function') restoreLevelStartSnapshot();

  // 2. 取得 retryHp
  let retryHp = 0;
  if (levelStartSnapshot && typeof levelStartSnapshot.hp === 'number' && levelStartSnapshot.hp > 0) {
    retryHp = levelStartSnapshot.hp;
  } else if (typeof levelStartHp === 'number' && levelStartHp > 0) {
    retryHp = levelStartHp;
  } else {
    retryHp = player.maxHp;
    console.warn('[RETRY] fallback hp to maxHp');
  }

  // 3. 取得 retryDog
  let retryDog = false;
  if (levelStartSnapshot && typeof levelStartSnapshot.bringBalloonDog === 'boolean') {
    retryDog = levelStartSnapshot.bringBalloonDog;
  } else {
    retryDog = levelStartBringDog === true;
  }

  // 4. 先設定
  player.hp = retryHp;
  bringBalloonDog = retryDog;

  // 5. 重新載入本關
  loadLevel(currentLevelIndex);

  // 6. restart
  restart({ keepHp: true, preserveBringDog: true });

  // 7. restart 後再次強制保險
  player.hp = retryHp;
  bringBalloonDog = retryDog;
  levelStartHp = retryHp;
  levelStartBringDog = retryDog;

  if (levelStartSnapshot) {
    levelStartSnapshot.hp = retryHp;
    levelStartSnapshot.bringBalloonDog = retryDog;
  }

  gameState = 'playing';

  console.log('[RETRY] retryCurrentLevelFromStart', {
    retryHp,
    retryDog,
    finalHp: player.hp,
    finalDog: bringBalloonDog
  });
}

// ── 小V的家「返回」按鈕 ─────────────────────
function homeGoBack() {
  closeHomeScreen();
  if (typeof window.showPauseBtn === 'function') window.showPauseBtn();
  if (homeEntryMode === 'clear') {
    const resultEl = document.getElementById('result-overlay');
    if (resultEl) resultEl.style.display = 'flex';
  } else if (homeEntryMode === 'failed') {
    const failedEl = document.getElementById('failed-overlay');
    if (failedEl) failedEl.style.display = 'flex';
  }
}

function homeGoNextLevel() {
  try {
    // 失敗模式：只能重試本關，不能前往下一關
    if (homeEntryMode === 'failed') {
      closeHomeScreen();
      if (typeof window.showPauseBtn === 'function') window.showPauseBtn();
      retryCurrentLevelFromStart();
      return;
    }
    // 通關模式：正常前往下一關，保留 HP
    // v0.3.11：第一章流程用 getNextLevelIndex 算下一關，而不是裸寫 + 1
    const nextIdx = getNextLevelIndex(currentLevelIndex);
    if (nextIdx >= LEVELS.length) {
      // 最後一關再玩：snapshot 還原
      if (typeof restoreLevelStartSnapshot === 'function') restoreLevelStartSnapshot();
      nextBringDog = false;
      loadLevel(currentLevelIndex);
      closeHomeScreen();
      if (typeof window.showPauseBtn === 'function') window.showPauseBtn();
      restart({ keepHp: true });
      return;
    }
    // v0.3.11：第一章流程阻擋檢查（強制帶狗 / 製作槌子才能進下一關）
    if (!checkChapter1ProgressionGate(nextIdx)) {
      return;
    }
    bringBalloonDog = (nextBringDog === true);
    nextBringDog    = false;
    closeHomeScreen();
    if (typeof window.showPauseBtn === 'function') window.showPauseBtn();
    loadLevel(nextIdx);
    restart({ keepHp: true });
  } catch(err) {
    if (typeof showDebugError === 'function')
      showDebugError('HOME NEXT LEVEL', err.message, '', '', '', err.stack);
  }
}

// placeholder 供未來擴充
function openChallengeSummary() {
  alert('本次成績結算功能將在下一階段加入。');
}


// ── 暫停畫面：查看背包 ──────────────────────
function openPauseBag() {
  const panel = document.getElementById('pause-bag-panel');
  if (!panel) return;
  const ci = playerInventory.craftedItems || {};
  const eqSword  = (equippedSword.id  && equippedSword.currentDur)  ? equippedSword.currentDur  + '/' + equippedSword.maxDur  : null;
  const eqHammer = (equippedHammer.id && equippedHammer.currentDur) ? equippedHammer.currentDur + '/' + equippedHammer.maxDur : null;
  const items = [
    { e:'🪙',  v:playerInventory.coins,        lbl:'金幣',   cls:'inv-coin',    dur:null },
    { e:'🎈',  v:playerInventory.balloon260,   lbl:'260氣球',cls:'inv-balloon', dur:null },
    { e:'⚪',  v:playerInventory.roundBalloon, lbl:'圓氣球', cls:'inv-round',   dur:null },
    { e:'⚔️', v:ci.basicSword     ||0,         lbl:'氣球劍', cls:'inv-sword',   dur:eqSword },
    { e:'🔨', v:ci.basicHammer    ||0,         lbl:'氣球槌', cls:'inv-hammer',  dur:eqHammer },
    { e:'🍭', v:ci.balloonLollipop||0,         lbl:'棒棒糖', cls:'inv-candy',   dur:null },
  ].filter(i => i.v > 0);

  const dog = playerInventory.balloonDog || {};
  let dogHtml = '';
  if (dog.present) {
    const ds = getDogStatusText();
    dogHtml = '<div class="pause-bag-dog">' + ds.status + '　' + ds.turns + '</div>';
  }

  const body = document.getElementById('pause-bag-body');
  body.innerHTML = (items.length
    ? '<div class="inv-grid">' + items.map(i =>
        '<div class="inv-item ' + i.cls + '">'
        + '<div class="inv-item__icon">' + i.e + '</div>'
        + '<div class="inv-item__count">' + i.v + '</div>'
        + '<div class="inv-item__name">' + i.lbl + '</div>'
        + (i.dur ? '<div class="inv-item__dur">' + i.dur + '</div>' : '')
        + '</div>'
      ).join('') + '</div>'
    : '<div class="inv-empty">背包空空如也 🎈</div>')
    + dogHtml;
  panel.style.display = 'flex';
}

function closePauseBag() {
  const panel = document.getElementById('pause-bag-panel');
  if (panel) panel.style.display = 'none';
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
function restart(opts) {
  const keepHp          = opts && opts.keepHp;
  const preserveBringDog = opts && opts.preserveBringDog;
  // 若要保留帶狗狀態，從穩定記錄還原
  if (preserveBringDog) {
    bringBalloonDog = levelStartBringDog;
  }
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
    hp: (() => {
      if (!keepHp) return player.maxHp;
      if (player.hp > 0) return player.hp;
      // keepHp 但 hp <= 0：防呆
      const fallback = levelStartHp > 0 ? levelStartHp : player.maxHp;
      console.warn('[RESTART] keepHp but hp<=0, fallback=', fallback);
      return fallback;
    })(), invincible: 0,
    attackCooldown: 0, attackActive: 0,
    meleeActive: 0, meleeHit: false, meleeHammerActive: 0, hammerHit: false, swordAnimTimer: 0, hammerAnimTimer: 0,
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
  currentRunStats.vCoinsGranted           = false;
  currentRunStats.vCoinsEarnedThisClear   = 0;
  currentRunStats.vCoinEarnDetails        = [];
  // bringBalloonDog 由 next/retry button 管理，不在 restart 清除
  dogNoseGlow  = 0;
  dogNoseLevel = 0;

  // 注意：耐久由 triggerClear 通關時才儲存，不在 restart 裡儲存
  // （避免死亡後耐久被錯誤存入）

  // 重新初始化裝備
  initEquippedSword();
  initEquippedHammer();
  normalizeActiveWeaponSlot();         // 確保 activeSlot 正確
  applyAdventureTestLoadout();          // 測試版：runtime-only sword + hammer

  // Reset world
  cameraX    = 0;
  frameCount = 0;
  elapsedSec = 0;

  // ── 建立進關前快照 ── 包含 bringBalloonDog（此行是關鍵修正！）
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
    bringBalloonDog:    bringBalloonDog, // ← 關鍵：記錄本關帶狗狀態
  };
  // 穩定備份（雙重保險）
  levelStartBringDog = bringBalloonDog;
  levelStartHp       = player.hp;
  console.log('snapshot created: bringBalloonDog=' + bringBalloonDog + ' hp=' + player.hp);

  gameState  = 'playing';

  coins.forEach(c => { c.collected = false; });
  balloons260.forEach(b => { b.collected = false; });
  enemies.forEach(e => { e.active = true; e.hp = 2; e.x = e.patrol; e.hitFlash = 0; });
  orangeNemeses.forEach(o => { o.phase = 'idle'; o.phaseTimer = 0; o.sprayActive = false; });
  roundBalloons.forEach(r => { r.collected = false; });
  spinningEnemies.length = 0;
  scorpionDefeatEffects.length = 0;
  treasurePickupEffects.length = 0; // v0.3.12
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
            if (btnPlay._nextLevel && gameState === 'clear') { // 防呆：只有 clear 才能進下一關
              // v0.3.11：第一章流程用 getNextLevelIndex 算下一關，
              // 而不是裸寫 currentLevelIndex + 1（避免誤跳橘子果園）
              const nextIdx = getNextLevelIndex(currentLevelIndex);
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
              // v0.3.11：第一章流程阻擋檢查（強制帶狗 / 製作槌子才能進下一關）
              if (!checkChapter1ProgressionGate(nextIdx)) {
                return;
              }
              bringBalloonDog = (nextBringDog === true);
              nextBringDog    = false;
              console.log('BEFORE loadLevel', nextIdx);
              loadLevel(nextIdx);
              console.log('AFTER loadLevel, hiddenTreasure:', currentHiddenTreasure);
              console.log('BEFORE restart, bringBalloonDog:', bringBalloonDog);
              restart({ keepHp: true }); // 跨關保留 HP
              console.log('AFTER restart');
            } else if (gameState === 'gameover') {
              // Game Over 再玩一次：走同一套穩定還原流程（含 HP / 狗 / 背包）
              if (typeof retryCurrentLevelFromStart === 'function') {
                retryCurrentLevelFromStart();
              } else {
                // fallback
                if (typeof restoreLevelStartSnapshot === 'function') restoreLevelStartSnapshot();
                bringBalloonDog = levelStartBringDog;
                loadLevel(currentLevelIndex);
                restart({ keepHp: true, preserveBringDog: true });
              }
            } else {
              // 再玩一次（clear 同關）：snapshot 還原後 keepHp
              if (typeof restoreLevelStartSnapshot === 'function') restoreLevelStartSnapshot();
              nextBringDog    = false;
              loadLevel(currentLevelIndex);
              restart({ keepHp: true });
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
  // 重試本關（從暫停畫面）
  const btnRestart = document.getElementById('btn-pause-restart');
  if (btnRestart) {
    ['click', 'touchstart'].forEach(ev =>
      btnRestart.addEventListener(ev, e => {
        e.preventDefault();
        gameState = 'playing'; // 先設回 playing 讓 restart() 不被擋
        retryCurrentLevelFromStart();
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
            let craftMsg = `成功製作 ${recipe.name}！`;
            if (recipe.id === 'balloonDog') craftMsg = '🐶 氣球小狗入住小V的家，療癒了小V ❤️ +0.5';
            showCraftMessage(craftMsg);
            // 製作 basicHammer 後提示如何使用
            if (recipe.id === 'basicHammer' && !stageFlowHints.hammerCraftHintShown) {
              stageFlowHints.hammerCraftHintShown = true;
              setTimeout(() => showHint('氣球槌完成！按 2 或點擊切換武器，再按 Z 敲飛蠍子！', 280), 800);
            }
            // v0.3.11-test-3：製作 basicHammer 後，結算畫面「下一步」區塊與下一關按鈕
            // 要立刻從「請先製作氣球槌」切換成「前往第 3 節」，不用等玩家關掉秘笈視窗
            if (recipe.id === 'basicHammer'
                && typeof populateResultPanel === 'function'
                && document.getElementById('result-panel-body')) {
              populateResultPanel();
              if (typeof updateNextLevelButton === 'function') updateNextLevelButton();
            }
            renderGuidebook();
            refreshResultBag();
            // 更新生命顯示
            const supplyHp = document.getElementById('supply-hp');
            if (supplyHp) supplyHp.textContent = player.hp + ' / ' + player.maxHp;
            if (recipe.id === 'balloonDog') {
              refreshResultDog();      // 結算畫面狗區塊
              if (typeof refreshResultHpStatus === 'function') refreshResultHpStatus(); // 結算主 HP
            }
            // 若小V的家已開啟，同步刷新
            if (document.getElementById('home-screen')?.style.display !== 'none') {
              renderHomeInventory();
              renderHomeSupply(); // 生命更新
              if (recipe.id === 'balloonDog') renderHomeDog();
            }
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

// v0.3.12-test-2：核心素材就緒判斷
// 只檢查幾張最基本的圖片，避免閃爍；不等太久（有 timeout fallback）
const CORE_ART_KEYS = ['idle', 'run01', 'run02', 'run03', 'run04', 'run05', 'jump', 'fall'];
let _artReadyConfirmed = false;
let _artReadyStartMs   = 0;
const ART_READY_TIMEOUT_MS = 5000; // 5 秒後強制 fallback，避免卡死

function isAdventureCoreArtReady() {
  if (_artReadyConfirmed) return true;
  // 每幀檢查：所有 CORE_ART_KEYS 都已載入完成
  const heroOk = CORE_ART_KEYS.every(k => {
    const img = adventureImages[k];
    return img && img.complete && img.naturalWidth > 0;
  });
  const scorpionOk = scorpionWalkReady; // 至少 1 張蠍子 walk 圖已就緒
  const orangeOk   = orangeEnemyCoreReady; // idle + warning + spray 全部就緒
  if (heroOk && scorpionOk && orangeOk) {
    _artReadyConfirmed = true;
    return true;
  }
  // timeout fallback：超過 5 秒就不再等了
  if (_artReadyStartMs > 0 && (performance.now() - _artReadyStartMs) > ART_READY_TIMEOUT_MS) {
    console.warn('[Art] Core art timeout after 5s, proceeding with fallback geometry.');
    _artReadyConfirmed = true;
    return true;
  }
  return false;
}

// ── Game loop ─────────────────────────────────
function loop(timestamp) {
  const dtMs = lastTime ? Math.min(timestamp - lastTime, 50) : 16.667;
  const dt   = dtMs / 16.667; // frame multiplier for physics (1.0 at 60fps)
  lastTime   = timestamp;

  // v0.3.12-test-2：核心素材尚未就緒時，只繪製等待畫面，不跑 update/draw，
  // 避免 hero / 蠍子在幾何 fallback 與正式圖片之間閃爍
  if (!isAdventureCoreArtReady()) {
    if (_artReadyStartMs === 0) _artReadyStartMs = performance.now();
    ctx.fillStyle = '#1a1230';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = 'rgba(200,180,255,0.85)';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('氣球正在充氣中…', CANVAS_W / 2, CANVAS_H / 2);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = 'rgba(180,160,220,0.6)';
    const elapsed = Math.floor((performance.now() - _artReadyStartMs) / 1000);
    ctx.fillText('素材準備中 ' + elapsed + 's', CANVAS_W / 2, CANVAS_H / 2 + 28);
    requestAnimationFrame(loop);
    return;
  }

  if (!screenFreezeForTest) {
    update(dt, dtMs); // 測試版 F8 凍結時跳過 update（不扣時間/不推進動畫）
  }
  draw();  // 保留 draw，讓畫面可截圖

  requestAnimationFrame(loop);
}


// ── ensurePlayerProfileSaved：若 localStorage 無 profile，保存預設值 ──
function ensurePlayerProfileSaved() {
  try {
    const existing = localStorage.getItem(PLAYER_PROFILE_STORAGE_KEY);
    if (!existing) {
      // 尚未落地：把 normalized profile 存入 localStorage
      const p = playerProfile || loadPlayerProfile();
      savePlayerProfile(p);
      console.log('[Profile] default profile saved to localStorage, playerKey:', p.playerKey);
    }
  } catch(e) {
    console.warn('[Profile] ensurePlayerProfileSaved failed:', e.message);
  }
}

// ── 初始化並啟動 ────────────────────────────
playerProfile = loadPlayerProfile(); // 初始化玩家身份
ensurePlayerProfileSaved();           // 確保 localStorage 有落地
initAdventureHeroArt();               // 非阻塞地嘗試載入 hero 美術素材
initScorpionWalkArt();                // 非阻塞地嘗試載入蠍子 walk 素材
initScorpionHurtArt();                // 非阻塞地嘗試載入蠍子受傷圖
initHammerAttackArt();                // 非阻塞地嘗試載入 hammer attack 素材
initOrangeEnemyArt();                 // 非阻塞地嘗試載入橘子怪 skin 素材
loadLevel(0);        // 載入第 1 關
initEquippedSword(); // 初始化裝備（只執行一次）
initEquippedHammer();
normalizeActiveWeaponSlot();          // 確保 activeSlot 指向有效武器
applyAdventureTestLoadout();          // 測試版：runtime-only sword + hammer

// 測試版：綁定暫停畫面測試按鈕
(function bindPauseTestBtns() {
  const btnPauseReset = document.getElementById('btn-pause-reset-test');
  if (btnPauseReset) {
    btnPauseReset.style.display = ADVENTURE_TEST_TOOLS_ENABLED ? '' : 'none';
    btnPauseReset.addEventListener('click', resetAdventureTestState);
  }
  const btnTestLevel3 = document.getElementById('btn-pause-test-level3');
  if (btnTestLevel3) {
    btnTestLevel3.style.display = ADVENTURE_TEST_TOOLS_ENABLED ? '' : 'none';
    btnTestLevel3.addEventListener('click', startAdventureTestLevel3);
  }
})();

requestAnimationFrame(loop);

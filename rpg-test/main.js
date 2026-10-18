
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
const GAME_VERSION = 'adventure-v0.3.65-additional-sfx-test-1';
const BUILD_TIME   = '2026-10-19 04:45';
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
  ORANGE_WINDUP_MS:  800,   // 預備動作（warning）時間 (ms) — 給玩家足夠反應時間
  ORANGE_SPRAY_MS:   700,   // 噴油持續時間 (ms) — 讓三段油圖都能看清楚
  ORANGE_COOLDOWN_MS:1600,  // v0.3.14：明確 cooldown phase 時間 (ms) — 玩家通過空檔
  ORANGE_IDLE_MS:    1300,  // v0.3.14：cooldown 後靜止等待時間 (ms)（原 ORANGE_COOLDOWN_MS 語意重命名）
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
  // v0.3.46：橙煌王權劍（只在 2-4 撿到金色油管環後使用；載入失敗 → 自動用原本氣球劍圖）
  royalSwordAttack01: 'assets/adventure/hero/hero_sword_attack_01_royal.png', // v0.3.51：屬於 orangeKingBoss 群組（進 2-4 前才載）
  royalSwordAttack02: 'assets/adventure/hero/hero_sword_attack_02_royal.png',
  royalSwordAttack03: 'assets/adventure/hero/hero_sword_attack_03_royal.png',
  royalSwordAttack04: 'assets/adventure/hero/hero_sword_attack_04_royal.png',
};
const ROYAL_SWORD_HERO_KEYS = ['royalSwordAttack01', 'royalSwordAttack02', 'royalSwordAttack03', 'royalSwordAttack04'];

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

// v0.3.46：橙煌王權劍 — 2-4 橘子王戰中，撿到金色油管環（ringActive）且手上是氣球劍時才使用
function isRoyalSwordActive() {
  return typeof isOrangeKingStageActive === 'function' && isOrangeKingStageActive()
    && !!orangeKingBoss && !!orangeKingBoss.ringActive && activeSlot === 'sword';
}
// F4 預覽王權劍 frame（1~4）時回傳編號，否則 0
function getRoyalSwordCalibFrame() {
  if (typeof ADVENTURE_TEST_TOOLS_ENABLED === 'undefined' || !ADVENTURE_TEST_TOOLS_ENABLED) return 0;
  if (typeof orangeKingMachineCalibMode === 'undefined' || !orangeKingMachineCalibMode) return 0;
  const m = /^royal([1-4])$/.exec(orangeKingMachineCalibTarget || '');
  return m ? Number(m[1]) : 0;
}
// 主角圖的繪製矩形（local 座標）；royalN = 1~4 時套用王權劍定位（以原本氣球劍的像素比例、腳底線、身體中心為基準）
function getHeroDrawRect(img, effectiveScale, royalN) {
  if (royalN) {
    const A = ORANGE_KING_MACHINE_ART;
    // 原本氣球劍圖是 420×420（不是 512）：以「對應的原本 frame 寬度」當基準，royal 圖每個像素和原本一樣大
    const ref = getAdventureImage('swordAttack0' + royalN);
    const refW = ref ? ref.width : 420;
    const k = (player.w * HERO_DRAW_SCALE / refW) * (A['royalSwordAttack' + royalN + 'Scale'] || 1);
    const dW = img.width * k, dH = img.height * k;
    return { dW, dH,
      dX: (player.w - dW) / 2 + HERO_DRAW_OFFSET_X + (A['royalSwordAttack' + royalN + 'OffsetX'] || 0),
      dY: player.h - dH * HERO_FOOT_ANCHOR_Y + HERO_DRAW_OFFSET_Y + (A['royalSwordAttack' + royalN + 'OffsetY'] || 0) };
  }
  const dW = player.w * HERO_DRAW_SCALE * effectiveScale;
  const dH = dW * (img.height / img.width);
  return { dW, dH, dX: (player.w - dW) / 2 + HERO_DRAW_OFFSET_X, dY: player.h - dH * HERO_FOOT_ANCHOR_Y + HERO_DRAW_OFFSET_Y };
}

// 依玩家目前物理狀態選擇最適合的素材 key（run05 + 劍攻擊動畫）
// v0.3.33-fix-1：發現物品視窗（發現模式）開啟時，主角畫面定格在開窗當下的那一張，
// 不再推進跑步動畫計時器（原本 getHeroArtKey 每次繪製都會推進 _heroFrameTimer，造成原地跑步）。
// 只在發現模式套用；一般暫停選單、閱讀模式都不受影響。
let _heroLastArtKey = null;
function getHeroArtKey() {
  if (_heroLastArtKey && isDiscoveryItemModalOpen() && discoveryModalMode === 'discovery') {
    return _heroLastArtKey;
  }
  _heroLastArtKey = computeHeroArtKey();
  return _heroLastArtKey;
}

function computeHeroArtKey() {
  // v0.3.46：F4 預覽王權劍 frame — 固定顯示該張
  const calibRoyal = getRoyalSwordCalibFrame();
  if (calibRoyal) return 'swordAttack0' + calibRoyal;
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

// v0.3.15-test-2：per-skinKey 圖片資源表
// fastBody 尚無正式圖，目前共用 scorpion_normal
const SCORPION_SKIN_ASSETS = {
  scorpion_normal: {
    walk: [
      'assets/enemies/scorpion/scorpion_walk_01.png',
      'assets/enemies/scorpion/scorpion_walk_02.png',
      'assets/enemies/scorpion/scorpion_walk_03.png',
      'assets/enemies/scorpion/scorpion_walk_04.png',
    ],
    hurt: 'assets/enemies/scorpion/scorpion_hurt_01.png',
  },
  scorpion_heavy: {
    walk: [
      'assets/enemies/scorpion/scorpion_heavy_walk_01.png',
      'assets/enemies/scorpion/scorpion_heavy_walk_02.png',
      'assets/enemies/scorpion/scorpion_heavy_walk_03.png',
      'assets/enemies/scorpion/scorpion_heavy_walk_04.png',
    ],
    hurt: 'assets/enemies/scorpion/scorpion_heavy_hurt_01.png',
  },
  // scorpion_fast 正式圖尚未提供，載入時自動 fallback scorpion_normal
};

// 每個 skinKey 的快取：{ walk: [img×4], hurt: img, walkReady: bool, hurtReady: bool }
const scorpionSkinImgs = {};

function initScorpionSkinArt() {
  Object.entries(SCORPION_SKIN_ASSETS).forEach(([skinKey, assets]) => {
    if (!scorpionSkinImgs[skinKey]) {
      scorpionSkinImgs[skinKey] = { walk: [], walkReady: false, hurt: null, hurtReady: false };
    }
    const cache = scorpionSkinImgs[skinKey];
    let loadedCount = 0;
    assets.walk.forEach((src, i) => {
      const img = new Image();
      img.onload = function() {
        cache.walk[i] = img;
        loadedCount++;
        if (loadedCount >= 1) cache.walkReady = true;
      };
      img.onerror = function() {
        console.warn('[ScorpionSkin] walk not found:', src, '→ fallback scorpion_normal');
      };
      img.src = resolveAdventureAssetSrc(src);
    });
    if (assets.hurt) {
      const hurtImg = new Image();
      hurtImg.onload = function() { cache.hurt = hurtImg; cache.hurtReady = true; };
      hurtImg.onerror = function() { console.warn('[ScorpionSkin] hurt not found:', assets.hurt); };
      hurtImg.src = resolveAdventureAssetSrc(assets.hurt);
    }
  });
}

// 取得特定 skinKey 的 walk 圖；載入失敗 fallback scorpion_normal；skinKey 未知也 fallback
function getScorpionWalkImgForSkin(skinKey) {
  const cache = scorpionSkinImgs[skinKey];
  if (cache && cache.walkReady) {
    const idx = Math.floor(frameCount / SCORPION_ANIM_SPEED) % 4;
    const img = cache.walk[idx] || cache.walk[0];
    if (img) return img;
  }
  // fallback：scorpion_normal 快取，或舊全域快取
  const nc = scorpionSkinImgs['scorpion_normal'];
  if (nc && nc.walkReady) {
    const idx = Math.floor(frameCount / SCORPION_ANIM_SPEED) % 4;
    return nc.walk[idx] || nc.walk[0] || null;
  }
  return scorpionWalkImgs[Math.floor(frameCount / SCORPION_ANIM_SPEED) % 4] || null;
}

// 取得特定 skinKey 的 hurt 圖；載入失敗 fallback
function getScorpionHurtImgForSkin(skinKey) {
  const cache = scorpionSkinImgs[skinKey];
  if (cache && cache.hurtReady && cache.hurt) return cache.hurt;
  const nc = scorpionSkinImgs['scorpion_normal'];
  if (nc && nc.hurtReady && nc.hurt) return nc.hurt;
  return getScorpionHurtImg(); // global fallback
}


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
  idle:        'assets/enemies/orange/orange_idle_01.png',
  warning:     'assets/enemies/orange/orange_warning_01.png',
  spray:       'assets/enemies/orange/orange_spray_01.png',
  oil01:       'assets/enemies/orange/orange_oil_spray_01.png',
  oil02:       'assets/enemies/orange/orange_oil_spray_02.png',
  oil03:       'assets/enemies/orange/orange_oil_spray_03.png',
  cooldown01:  'assets/enemies/orange/orange_cooldown_01.png', // v0.3.14
  cooldown02:  'assets/enemies/orange/orange_cooldown_02.png', // v0.3.14
};

// ── v0.3.22：煙囟橘子（chimney orange）正式素材 ──────────────
const CHIMNEY_ORANGE_ASSETS = {
  idle:       'assets/enemies/orange/orange_chimney_idle_01.png',
  warning01:  'assets/enemies/orange/orange_chimney_warning_01.png',
  warning02:  'assets/enemies/orange/orange_chimney_warning_02.png',
  spray:      'assets/enemies/orange/orange_chimney_spray_01.png',
  cooldown01: 'assets/enemies/orange/orange_chimney_cooldown_01.png',
  cooldown02: 'assets/enemies/orange/orange_chimney_cooldown_02.png',
};

const chimneyOrangeImgs = {};
let chimneyOrangeCoreReady = false;

function initChimneyOrangeArt() {
  let loadedCount = 0;
  const total = Object.keys(CHIMNEY_ORANGE_ASSETS).length;
  Object.entries(CHIMNEY_ORANGE_ASSETS).forEach(([key, src]) => {
    if (chimneyOrangeImgs[key]) return;
    const img = new Image();
    const fullSrc = resolveAdventureAssetSrc(src);
    img.onload = function () {
      chimneyOrangeImgs[key] = img;
      loadedCount++;
      if (loadedCount >= total) {
        chimneyOrangeCoreReady = true;
        console.log('[ChimneyOrangeArt] all assets ready');
      }
      console.log('[ChimneyOrangeArt] loaded:', key, fullSrc);
    };
    img.onerror = function () {
      console.warn('[ChimneyOrangeArt] not found:', key, fullSrc, '(fallback active)');
    };
    img.src = fullSrc;
  });
}

function getChimneyOrangeImg(key) {
  const img = chimneyOrangeImgs[key];
  if (img && img.complete && img.naturalWidth > 0) return img;
  return null;
}

// 煙囟橘子圖片繪製對齊參數（只影響視覺，不動 hitbox）
const CHIMNEY_ORANGE_BODY_DRAW_SCALE = 2.4;  // 圖片顯示寬度 = co.w * 此比例
const CHIMNEY_ORANGE_FOOT_ANCHOR_Y   = 0.88; // 腳底錨點（圖片高度比例）
const CHIMNEY_ORANGE_DRAW_OFFSET_X   = 0;    // 水平視覺微調（px，正值往右）
const CHIMNEY_ORANGE_DRAW_OFFSET_Y   = 0;    // 垂直視覺微調（px，正值往下）

// ── 煙囟橘子油柱素材（v0.3.24，非阻塞）────────────────
// 只接 spray01 一張；02/03 不存在，不要猜其他檔名
const CHIMNEY_ORANGE_OIL_ASSETS = {
  spray01: 'assets/enemies/orange/orange_chimney_oil_spray_01.png',
};

const chimneyOrangeOilImgs = {};
let chimneyOrangeOilReady = false;

function initChimneyOrangeOilArt() {
  Object.entries(CHIMNEY_ORANGE_OIL_ASSETS).forEach(([key, src]) => {
    if (chimneyOrangeOilImgs[key]) return;
    const img = new Image();
    const fullSrc = resolveAdventureAssetSrc(src);
    img.onload = function () {
      chimneyOrangeOilImgs[key] = img;
      chimneyOrangeOilReady = true;
      console.log('[ChimneyOilArt] loaded:', key, fullSrc);
    };
    img.onerror = function () {
      console.warn('[ChimneyOilArt] not found:', key, fullSrc, '(canvas fallback active)');
    };
    img.src = fullSrc;
  });
}

function getChimneyOrangeOilImg(key) {
  const img = chimneyOrangeOilImgs[key];
  if (img && img.complete && img.naturalWidth > 0) return img;
  return null;
}

// 油柱圖片繪製參數（只影響視覺，hitbox 不變）
// 原始尺寸 256×512，與本體等比例設計，故沿用相同縮放基準
// v0.3.24-fix-1：油圖使用 chimney body 原圖 local coordinate system
// chimney body 原圖為 512×512，oil 圖為 256×512
const CHIMNEY_ORANGE_SOURCE_SIZE    = 512; // chimney body 原圖邊長（px）
const CHIMNEY_ORANGE_OIL_SOURCE_W   = 256; // oil 圖原始寬度（px）
const CHIMNEY_ORANGE_OIL_SOURCE_H   = 512; // oil 圖原始高度（px）
const CHIMNEY_ORANGE_OIL_LOCAL_X    = 256; // oil 水平中心對齊 body 原圖 local x（中心線）
const CHIMNEY_ORANGE_OIL_LOCAL_Y    = 129; // oil 上緣對齊 body 原圖 local y（煙囪口附近）
// v0.3.24 oil sprite 視覺 offset（正式版預設值，calibration tool 可即時覆蓋）
const CHIMNEY_ORANGE_OIL_EXTRA_OFFSET_X = -1;
const CHIMNEY_ORANGE_OIL_EXTRA_OFFSET_Y = -111;
// 舊版常數保留供參考，實際繪製改用 local coord 方式（見 drawChimneyOranges）
const CHIMNEY_ORANGE_OIL_DRAW_SCALE   = CHIMNEY_ORANGE_BODY_DRAW_SCALE; // 同本體比例（備用）

// ── 雙噴嘴橘子美術（v0.3.25 art-integration，非阻塞）──────────────────────
// idle×5 / warning×2 / spray×1 / cooldown×2 + 左右油圖 oil_left_01 / oil_right_01（v0.3.25 stable）
const DUAL_ORANGE_ASSETS = {
  idle_01:     'assets/enemies/orange/orange_dual_idle_01.png',
  idle_02:     'assets/enemies/orange/orange_dual_idle_02.png',
  idle_03:     'assets/enemies/orange/orange_dual_idle_03.png',
  idle_04:     'assets/enemies/orange/orange_dual_idle_04.png',
  idle_05:     'assets/enemies/orange/orange_dual_idle_05.png',
  warning_01:  'assets/enemies/orange/orange_dual_warning_01.png',
  warning_02:  'assets/enemies/orange/orange_dual_warning_02.png',
  spray_01:    'assets/enemies/orange/orange_dual_spray_01.png',
  cooldown_01: 'assets/enemies/orange/orange_dual_cooldown_01.png',
  cooldown_02: 'assets/enemies/orange/orange_dual_cooldown_02.png',
  // v0.3.25-oil-calibration: 左右油圖
  oil_left_01:  'assets/enemies/orange/orange_dual_oil_left_01.png',
  oil_right_01: 'assets/enemies/orange/orange_dual_oil_right_01.png',
};

const dualOrangeImgs = {};
let dualOrangeLoadedCount = 0;

// v0.3.27-test-2：dual orange 圖片載入加入版本 cache busting + 失敗重試（同 projectile orange）
// 最多重試 3 次（300 / 800 / 1500ms），每次換新網址參數；成功寫入 dualOrangeImgs[key]，
// getDualOrangeImg() 每幀重新查 cache，所以載入成功後會自動從幾何 fallback 切回正式圖。
const DUAL_ORANGE_IMG_RETRY_DELAYS_MS = [300, 800, 1500];
const dualOrangeLoadStatus = {}; // key → 'loading' | 'retry N' | 'LOADED' | 'ERROR'

function loadDualOrangeImage(key, bustedSrc, retryCount) {
  const img = new Image();
  const src = retryCount === 0
    ? bustedSrc
    : bustedSrc + '&retry=' + retryCount + '&ts=' + Date.now();
  dualOrangeLoadStatus[key] = retryCount === 0 ? 'loading' : 'retry ' + retryCount;
  if (retryCount === 0) console.log('[DualOrangeArt] loading:', key, src);
  else                  console.log('[DualOrangeArt] retry ' + retryCount + ':', key, src);

  img.onload = function () {
    if (!dualOrangeImgs[key]) dualOrangeLoadedCount++;
    dualOrangeImgs[key] = img;
    dualOrangeLoadStatus[key] = 'LOADED';
    console.log('[DualOrangeArt] LOADED:', key, src, img.naturalWidth, img.naturalHeight);
  };
  img.onerror = function () {
    if (retryCount < DUAL_ORANGE_IMG_RETRY_DELAYS_MS.length) {
      const delay = DUAL_ORANGE_IMG_RETRY_DELAYS_MS[retryCount];
      dualOrangeLoadStatus[key] = 'retry ' + (retryCount + 1);
      setTimeout(function () {
        if (dualOrangeImgs[key]) return; // 期間已成功就不再重試
        loadDualOrangeImage(key, bustedSrc, retryCount + 1);
      }, delay);
    } else {
      dualOrangeLoadStatus[key] = 'ERROR';
      console.warn('[DualOrangeArt] ERROR:', key, src, '(canvas fallback active)');
    }
  };
  img.src = src;
}

function initDualOrangeArt() {
  Object.entries(DUAL_ORANGE_ASSETS).forEach(([key, src]) => {
    if (dualOrangeImgs[key]) return;
    const fullSrc   = resolveAdventureAssetSrc(src);
    const bustedSrc = fullSrc + (fullSrc.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(GAME_VERSION);
    loadDualOrangeImage(key, bustedSrc, 0);
  });
}

function getDualOrangeImg(key) {
  const img = dualOrangeImgs[key];
  if (img && img.complete && img.naturalWidth > 0) return img;
  return null;
}

// 雙噴嘴橘子繪製參數（只影響視覺，不動 hitbox）
const DUAL_ORANGE_BODY_DRAW_SCALE = 2.4;   // 圖片顯示寬度 = dn.w * 此比例
const DUAL_ORANGE_FOOT_ANCHOR_Y   = 0.88;  // 腳底錨點（圖片高度比例）
const DUAL_ORANGE_DRAW_OFFSET_Y   = 0;     // 垂直視覺微調（備用）

// idle 動畫參數
// 播放順序：01→02→03→02→01→04→05→04→01→loop（左右巡視，常回中）
// idle_01=正中 / idle_02=左中 / idle_03=看左 / idle_04=右中 / idle_05=看右
const DUAL_ORANGE_IDLE_FRAME_DUR = 14;     // 每 14 frames 換一張（約 4.3fps，不要太快）
const DUAL_ORANGE_IDLE_SEQ = [0, 1, 2, 1, 0, 3, 4, 3, 0]; // 9 steps，索引對應 idle_01~05

// warning 動畫參數（2 張交替，蓄力感）
const DUAL_ORANGE_WARNING_FRAME_DUR = 8;   // 每 8 frames 換一張（較快，表現蓄力緊張）

// cooldown 動畫參數（2 張慢速交替，喘氣感）
const DUAL_ORANGE_COOLDOWN_FRAME_DUR = 30; // 每 30 frames 換一張（約 2fps，慢速疲憊）

// ── v0.3.26：飛行油彈橘子（projectile orange）美術測試（非阻塞）──────────────
// v0.3.26-complete-art：完整第一套 — idle×3 / warning×2 / release×1 / shot×1 / cooldown×2 / 飛行油彈×1
// release_01 = 原本的發射姿勢；shot_01 = 氣功掌發射姿勢（release 狀態優先使用）；oil_shot_01 = 飛出去的油彈
const PROJECTILE_ORANGE_ASSETS = {
  idle_01:       'assets/enemies/orange/orange_projectile_idle_01.png',
  idle_02:       'assets/enemies/orange/orange_projectile_idle_02.png',
  idle_03:       'assets/enemies/orange/orange_projectile_idle_03.png',

  warning_01:    'assets/enemies/orange/orange_projectile_warning_01.png',
  warning_02:    'assets/enemies/orange/orange_projectile_warning_02.png',

  release_01:    'assets/enemies/orange/orange_projectile_release_01.png',
  shot_01:       'assets/enemies/orange/orange_projectile_shot_01.png',

  cooldown_01:   'assets/enemies/orange/orange_projectile_cooldown_01.png',
  cooldown_02:   'assets/enemies/orange/orange_projectile_cooldown_02.png',

  oil_shot_01:   'assets/enemies/orange/orange_projectile_oil_shot_01.png',
};

const projectileOrangeImgs = {};

// v0.3.26-debug：診斷用狀態（每個 key 只 log 一次，避免每幀刷 console）
const projectileOrangeGetFailLogged      = {};
const projectileOrangeDrawFallbackLogged = {};
const projectileOrangeLoadStatus         = {}; // key → 'loading' | 'LOADED' | 'ERROR'
const projectileOrangeResolvedSrc        = {}; // key → 實際請求的完整網址

// v0.3.26 stable：圖片載入失敗時最多重試 3 次（300 / 800 / 1500ms），
// 每次重試都換新的網址參數避開快取；全部失敗才標記 ERROR。
// 每次重試都建立新的 Image 物件，成功的那張寫入 projectileOrangeImgs[key]，
// getProjectileOrangeImg() 每幀都會重新查 cache，所以載入成功後會自動從幾何 fallback 切回正式圖。
const PROJECTILE_ORANGE_IMG_RETRY_DELAYS_MS = [300, 800, 1500];

function loadProjectileOrangeImage(key, bustedSrc, retryCount) {
  const img = new Image();
  const src = retryCount === 0
    ? bustedSrc
    : bustedSrc + '&retry=' + retryCount + '&ts=' + Date.now();
  projectileOrangeResolvedSrc[key] = src;
  projectileOrangeLoadStatus[key]  = retryCount === 0 ? 'loading' : 'retry ' + retryCount;

  img.onload = function () {
    projectileOrangeImgs[key] = img;
    projectileOrangeLoadStatus[key] = 'LOADED';
    projectileOrangeGetFailLogged[key] = false; // 之後若又失敗可再 log
    console.log('[ProjectileOrangeArt] LOADED:', key, src, img.naturalWidth, img.naturalHeight,
      retryCount > 0 ? '(after retry ' + retryCount + ')' : '');
  };
  img.onerror = function () {
    if (retryCount < PROJECTILE_ORANGE_IMG_RETRY_DELAYS_MS.length) {
      const delay = PROJECTILE_ORANGE_IMG_RETRY_DELAYS_MS[retryCount];
      projectileOrangeLoadStatus[key] = 'retry ' + (retryCount + 1);
      console.warn('[ProjectileOrangeArt] load failed, retry', retryCount + 1, 'in', delay + 'ms:', key, src);
      setTimeout(function () {
        if (projectileOrangeImgs[key]) return; // 期間已成功就不再重試
        loadProjectileOrangeImage(key, bustedSrc, retryCount + 1);
      }, delay);
    } else {
      projectileOrangeLoadStatus[key] = 'ERROR';
      console.warn('[ProjectileOrangeArt] ERROR (gave up after ' + retryCount + ' retries):', key, src, img.currentSrc);
    }
  };
  console.log('[ProjectileOrangeArt] loading:', key, src);
  img.src = src;
}

function initProjectileOrangeArt() {
  console.log('[ProjectileOrangeArt] init start, version:', GAME_VERSION);
  console.log('[ProjectileOrangeArt] assets:', PROJECTILE_ORANGE_ASSETS);
  console.log('[ProjectileOrangeArt] ADVENTURE_BASE_URL:', ADVENTURE_BASE_URL,
    '| page location:', (typeof location !== 'undefined' ? location.href : '(n/a)'));
  Object.entries(PROJECTILE_ORANGE_ASSETS).forEach(([key, src]) => {
    if (projectileOrangeImgs[key]) return;
    const fullSrc = resolveAdventureAssetSrc(src);
    // 圖片網址加上版本參數，避開瀏覽器 / CDN 快取到的舊 404
    const bustedSrc = fullSrc + (fullSrc.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(GAME_VERSION);
    loadProjectileOrangeImage(key, bustedSrc, 0);
  });
}

function getProjectileOrangeImg(key) {
  const img = projectileOrangeImgs[key];
  if (img && img.complete && img.naturalWidth > 0) return img;
  // v0.3.26-debug：取圖失敗時每個 key 只 log 一次
  if (!projectileOrangeGetFailLogged[key]) {
    projectileOrangeGetFailLogged[key] = true;
    console.warn('[ProjectileOrangeArt] get failed:', key, {
      exists:        !!img,
      complete:      img && img.complete,
      naturalWidth:  img && img.naturalWidth,
      naturalHeight: img && img.naturalHeight,
      src:           img && img.src,
      loadStatus:    projectileOrangeLoadStatus[key] || '(not started)',
      requestedSrc:  projectileOrangeResolvedSrc[key] || '(none)',
    });
  }
  return null;
}

// v0.3.26-debug：畫面左上角 asset status HUD（只在測試版、場上有 projectile orange 時顯示）
// v0.3.27-test-2：asset status HUD 預設關閉，按 F6 開 / 關（未來其他 asset HUD 也受此控制）
let assetStatusHudVisible = false;

function drawProjectileOrangeAssetStatusHud() {
  if (!ADVENTURE_TEST_TOOLS_ENABLED) return;
  if (!assetStatusHudVisible) return;
  if (!projectileOranges || projectileOranges.length === 0) return;
  const keys = Object.keys(PROJECTILE_ORANGE_ASSETS);
  const x = 12, y = 64, lineH = 15;
  const sampleSrc = projectileOrangeResolvedSrc['idle_01'] || '';
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(x - 6, y - 14, 470, lineH * (keys.length + 3) + 10);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#ffe066';
  ctx.fillText('ProjectileOrangeArt:', x, y);
  ctx.font = '11px monospace';
  keys.forEach((key, i) => {
    const img = projectileOrangeImgs[key];
    const ok  = !!(img && img.complete && img.naturalWidth > 0);
    const st  = projectileOrangeLoadStatus[key] || 'not started';
    ctx.fillStyle = ok ? '#7dff9a' : '#ff8080';
    ctx.fillText(key + ': ' + (ok ? 'OK ' + img.naturalWidth + 'x' + img.naturalHeight : 'missing (' + st + ')'),
      x, y + lineH * (i + 1));
  });
  ctx.fillStyle = '#aaccff';
  ctx.fillText('src: ' + (sampleSrc.length > 66 ? '…' + sampleSrc.slice(-65) : sampleSrc), x, y + lineH * (keys.length + 1));
  ctx.fillText('base: ' + ADVENTURE_BASE_URL, x, y + lineH * (keys.length + 2));
  ctx.restore();
}

// 繪製參數（只影響視覺，不動 hitbox）
const PROJECTILE_ORANGE_SOURCE_SIZE     = 512;
const PROJECTILE_ORANGE_BODY_DRAW_SCALE = 2.4;   // 顯示寬度 = po.w * 此比例
const PROJECTILE_ORANGE_FOOT_ANCHOR_Y   = 0.88;  // 腳底錨點（圖片高度比例）
const PROJECTILE_ORANGE_DRAW_OFFSET_Y   = 0;     // 垂直視覺微調

// idle：01 → 02 → 03 → 02 → loop，每 12 frames 換一張
const PROJECTILE_ORANGE_IDLE_FRAME_DUR = 12;
const PROJECTILE_ORANGE_IDLE_SEQ       = [0, 1, 2, 1];
const PROJECTILE_ORANGE_IDLE_BOB_Y     = 2;      // idle 上下呼吸位移（px）

// warning：warning_01 / warning_02 快速交替（集氣）
const PROJECTILE_ORANGE_WARNING_FRAME_DUR = 8;

// cooldown：cooldown_01 / cooldown_02 交替（喘氣感）
const PROJECTILE_ORANGE_COOLDOWN_FRAME_DUR = 24;

// ── v0.3.26-shot-calibration：飛行油彈定位 / 尺寸常數（F7 工具可即時調整）──
// LOCAL_X / LOCAL_Y = 以本體 512×512 原圖為基準的手部發射點（油彈中心對齊這個點）
// v0.3.26 stable：F7 實測完成的 visual final 值
const PROJECTILE_ORANGE_OIL_SHOT_LOCAL_X    = 56;
const PROJECTILE_ORANGE_OIL_SHOT_LOCAL_Y    = 255;
const PROJECTILE_ORANGE_OIL_SHOT_OFFSET_X   = 0;
const PROJECTILE_ORANGE_OIL_SHOT_OFFSET_Y   = 0;
const PROJECTILE_ORANGE_OIL_SHOT_SCALE_MULT = 1;

// ── v0.3.26 stable：damage hitbox final 值（F7 + H 手動校準完成）──
// 油彈 hitbox：以油彈視覺中心為基準（W/H = 實際傷害框大小，OFFSET = 相對中心偏移）
const PROJECTILE_ORANGE_OIL_SHOT_HITBOX_W        = 70;
const PROJECTILE_ORANGE_OIL_SHOT_HITBOX_H        = 49;
const PROJECTILE_ORANGE_OIL_SHOT_HITBOX_OFFSET_X = 71;
const PROJECTILE_ORANGE_OIL_SHOT_HITBOX_OFFSET_Y = 0;
// 本體 hitbox：以碰撞框底部中心（腳底）為基準，往上長高
const PROJECTILE_ORANGE_BODY_HITBOX_W        = 65;
const PROJECTILE_ORANGE_BODY_HITBOX_H        = 73;
const PROJECTILE_ORANGE_BODY_HITBOX_OFFSET_X = 2;
const PROJECTILE_ORANGE_BODY_HITBOX_OFFSET_Y = 4;

// 本體 draw rect（world coordinate，不扣 cameraX）；本體與油彈共用同一套 bodyScale
function getProjectileOrangeBodyDrawRect(po, img) {
  const bodyScale = (po.w * PROJECTILE_ORANGE_BODY_DRAW_SCALE) / PROJECTILE_ORANGE_SOURCE_SIZE;
  const drawW = img ? img.naturalWidth  * bodyScale : po.w * PROJECTILE_ORANGE_BODY_DRAW_SCALE;
  const drawH = img ? img.naturalHeight * bodyScale : drawW;
  const drawX = (po.x + po.w / 2) - drawW / 2;
  const drawY = (po.y + po.h) - drawH * PROJECTILE_ORANGE_FOOT_ANCHOR_Y + PROJECTILE_ORANGE_DRAW_OFFSET_Y;
  return { drawX, drawY, drawW, drawH, bodyScale };
}

// ── v0.3.25-oil-calibration：左右油圖定位常數 ─────────────────────────
// 素材原圖座標基準（假設 512x512）
const DUAL_ORANGE_SOURCE_SIZE = 512;

// 左油接點（local pixel coord，油圖右側接近左噴嘴）
const DUAL_ORANGE_OIL_LEFT_LOCAL_X = 120;
const DUAL_ORANGE_OIL_LEFT_LOCAL_Y = 240;

// 右油接點（local pixel coord，油圖左側接近右噴嘴）
const DUAL_ORANGE_OIL_RIGHT_LOCAL_X = 392;
const DUAL_ORANGE_OIL_RIGHT_LOCAL_Y = 240;

// 左右油圖 extra offset 預設值（v0.3.25 stable final 值，F10 手動校準）
const DUAL_ORANGE_OIL_LEFT_EXTRA_OFFSET_X  = -8;
const DUAL_ORANGE_OIL_LEFT_EXTRA_OFFSET_Y  = 11;
const DUAL_ORANGE_OIL_RIGHT_EXTRA_OFFSET_X = -139;
const DUAL_ORANGE_OIL_RIGHT_EXTRA_OFFSET_Y = 10;

// ── v0.3.25 stable：左右油圖 damage hitbox final 預設值（F10 手動校準完成值）──
// 判定集中在主要水平油流，不吃整張油圖外框
const DUAL_ORANGE_OIL_LEFT_HITBOX_W  = 65;
const DUAL_ORANGE_OIL_LEFT_HITBOX_H  = 40;
const DUAL_ORANGE_OIL_LEFT_HITBOX_OFFSET_X  = 0;
const DUAL_ORANGE_OIL_LEFT_HITBOX_OFFSET_Y  = 0;
const DUAL_ORANGE_OIL_RIGHT_HITBOX_W = 70;
const DUAL_ORANGE_OIL_RIGHT_HITBOX_H = 40;
const DUAL_ORANGE_OIL_RIGHT_HITBOX_OFFSET_X = 144;
const DUAL_ORANGE_OIL_RIGHT_HITBOX_OFFSET_Y = 0;

// 橘子怪 skin 繪製參數（只影響視覺，不動 hitbox）
const ORANGE_BODY_DRAW_SCALE = 2.4;   // v0.3.13-test-2：本體寬度 = o.w * 此比例 ≈ 44*2.4=106px
// ORANGE_DRAW_SCALE / ORANGE_SPRAY_SCALE 已廢棄（test-1 用 naturalWidth*scale 導致巨大化）
const ORANGE_FOOT_ANCHOR_Y   = 0.88;  // 腳底錨點（圖片高度比例）
// v0.3.14-test-4：cooldown_01/02 已輸出為 512x512 且地平線與其他狀態一致，offset 歸零
const ORANGE_COOLDOWN_DRAW_OFFSET_Y = 0;  // 已不需要額外下壓 offset
// v0.3.14-test-3：cooldown 圖片切換速度（frames），30 frames ≈ 2fps，慢速喘氣感
const ORANGE_COOLDOWN_FRAME_DUR = 30; // 每 30 frames 換一張

// orange_spray_01 的噴口像素座標（素材原圖座標）
const ORANGE_SPRAY_MOUTH_X   = 111;
const ORANGE_SPRAY_MOUTH_Y   = 365;

// orange_oil_spray_XX 的接點像素座標（素材原圖座標）
const ORANGE_OIL_ANCHOR_X    = 1024;
const ORANGE_OIL_ANCHOR_Y    = 132;

// v0.3.14-test-2：oil_spray_03 有效噴出距離（原圖素材單位）
// oil_spray_03 實際寬度 685px，與 spray 本體重疊約 55px，有效噴出距離 = 685 - 55 = 630px
// 整段 spraying 固定使用 oil_spray_03 最遠有效範圍作為傷害判定，不做三段式 hitbox
const ORANGE_OIL_HITBOX_SOURCE_W = 630;

// ═══════════════════════════════════════════════════════════════
//  v0.3.15：Enemy Variant + Tier 系統
//  ─────────────────────────────────────────────────────────────
//  type     = 敵人大類（scorpion / balloonNemesis）
//  variant  = 同類的真正種類 / 攻擊模式（關係到 AI 行為與未來美術 skin）
//  tier     = 同一 variant 的強化程度（影響數值與程式色調）
//
//  設計原則：
//  - variant 是種類（直線噴 / 雙向噴 / 扇形噴 / 普通蠍子 / 快腿蠍子…）
//  - tier 是強化版（normal / fast / …）
//  - fast 是 tier，不是 variant
//  - cooldown 是橘子怪噴完後的狀態，不是一種新橘子怪
// ═══════════════════════════════════════════════════════════════

const ENEMY_VARIANTS = {
  scorpion: {
    normal: {
      label:                '普通蠍子',
      skinKey:              'scorpion_normal',
      behaviorType:         'patrol',
      baseSpeedMultiplier:  1.0,
      drawScaleMultiplier:  1.0,
      hp:                   1,    // v0.3.18：一劍即死
      maxHp:                1,
      damage:               1,
      abilityTags:          ['melee', 'patrol'],
    },
    fastBody: {
      label:                '快腿蠍子',
      skinKey:              'scorpion_fast',   // 尚無正式圖，fallback scorpion_normal
      behaviorType:         'patrol',
      baseSpeedMultiplier:  1.35,
      drawScaleMultiplier:  0.92,
      hp:                   1,    // fastBody 不在正式流程，hp 跟 normal 一樣
      maxHp:                1,
      damage:               1,
      abilityTags:          ['melee', 'patrol', 'fast-body'],
    },
    heavyBody: {
      label:                '重甲蠍子',
      skinKey:              'scorpion_heavy',
      behaviorType:         'patrol',
      baseSpeedMultiplier:  0.72,
      drawScaleMultiplier:  1.18,
      hp:                   3,    // v0.3.18：Tank 型，需要 3 劍擊敗
      maxHp:                3,
      damage:               1,
      abilityTags:          ['melee', 'patrol', 'heavy-body'],
    },
  },

  balloonNemesis: {
    straight: {
      label:              '直線噴油橘子怪',
      skinKey:            'orange_straight',
      attackPattern:      'straight',
      baseWindupMs:       800,   // === CONFIG.ORANGE_WINDUP_MS at v0.3.14
      baseSprayMs:        700,   // === CONFIG.ORANGE_SPRAY_MS
      baseCooldownMs:     1600,  // === CONFIG.ORANGE_COOLDOWN_MS
      baseIdleMs:         1300,  // === CONFIG.ORANGE_IDLE_MS
      sprayRangeSourceW:  630,   // === ORANGE_OIL_HITBOX_SOURCE_W
      damage:             1,
      abilityTags:        ['spray', 'straight', 'warning', 'cooldown-window'],
    },
    dual: {
      label:              '雙向噴油橘子怪',
      skinKey:            'orange_dual',   // 尚無正式圖，fallback orange_straight skin
      attackPattern:      'dual',          // TODO：前後同時噴油，本版只建資料架構
      baseWindupMs:       800,
      baseSprayMs:        700,
      baseCooldownMs:     1800,
      baseIdleMs:         1500,
      sprayRangeSourceW:  630,
      damage:             1,
      abilityTags:        ['spray', 'dual-direction', 'warning', 'cooldown-window'],
    },
    fan: {
      label:              '扇形噴油橘子怪',
      skinKey:            'orange_fan',    // 尚無正式圖與 fan hitbox，本版只建資料
      attackPattern:      'fan',           // TODO：需專用 fan oil sprite + fan hitbox
      baseWindupMs:       700,
      baseSprayMs:        800,
      baseCooldownMs:     2000,
      baseIdleMs:         1500,
      sprayRangeSourceW:  630,
      damage:             1,
      abilityTags:        ['spray', 'fan-area', 'warning', 'cooldown-window'],
    },
  },
};

const ENEMY_TIERS = {
  normal: {
    label:                '普通',
    speedMultiplier:      1.0,
    drawScaleMultiplier:  1.0,
    windupMultiplier:     1.0,
    sprayMultiplier:      1.0,
    cooldownMultiplier:   1.0,
    idleMultiplier:       1.0,
    tintMode:             'none',
  },
  fast: {
    label:                '急速',
    speedMultiplier:      1.15,
    drawScaleMultiplier:  1.0,
    windupMultiplier:     0.75,
    sprayMultiplier:      1.0,
    cooldownMultiplier:   0.82,
    idleMultiplier:       0.72,
    tintMode:             'red-orange',
  },
};

function getDefaultVariantForEnemyType(type) {
  if (type === 'scorpion') return 'normal';
  if (type === 'balloonNemesis') return 'straight';
  return 'normal';
}

function getEnemyVariantConfig(enemy) {
  const type       = enemy.type || 'scorpion';
  const variantKey = enemy.variant || getDefaultVariantForEnemyType(type);
  const group      = ENEMY_VARIANTS[type];
  if (!group) { console.warn('[EnemyVariant] unknown type:', type); return null; }
  const cfg = group[variantKey];
  if (!cfg) {
    console.warn('[EnemyVariant] unknown variant:', variantKey, 'for type:', type);
    return group[getDefaultVariantForEnemyType(type)] || null;
  }
  return cfg;
}

function getEnemyTierConfig(enemy) {
  const tierKey = enemy.tier || 'normal';
  const cfg     = ENEMY_TIERS[tierKey];
  if (!cfg) {
    console.warn('[EnemyTier] unknown tier:', tierKey);
    return ENEMY_TIERS.normal;
  }
  return cfg;
}

// ── 橘子怪快捷 helper（套用 variant+tier 後的實際計時）──
function getOrangeTimings(o) {
  const v = getEnemyVariantConfig(o) || ENEMY_VARIANTS.balloonNemesis.straight;
  const t = getEnemyTierConfig(o);
  return {
    windupMs:   v.baseWindupMs   * t.windupMultiplier,
    sprayMs:    v.baseSprayMs    * t.sprayMultiplier,
    cooldownMs: v.baseCooldownMs * t.cooldownMultiplier,
    idleMs:     v.baseIdleMs     * t.idleMultiplier,
  };
}

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
// v0.3.33-fix-2：開發流程中 -test- 與 -fix- 都視為測試版（fix-1 因不含 -test- 導致測試入口消失）
const IS_ADVENTURE_TEST_VERSION      = GAME_VERSION.includes('-test-') || GAME_VERSION.includes('-fix-');
const HAMMER_ATTACK_VISUAL_TEST_LOADOUT = IS_ADVENTURE_TEST_VERSION;
const ADVENTURE_TEST_TOOLS_ENABLED      = IS_ADVENTURE_TEST_VERSION;

// ── Chimney Oil Calibration Tool（測試版限定）─────────────────────────
const CHIMNEY_OIL_CALIB_LS_KEY = 'balloonVAdventure_chimneyOilCalibration';
let chimneyOilCalibrationMode    = false;
let chimneyOilCalibrationOffsetX = CHIMNEY_ORANGE_OIL_EXTRA_OFFSET_X;
let chimneyOilCalibrationOffsetY = CHIMNEY_ORANGE_OIL_EXTRA_OFFSET_Y;

function loadChimneyOilCalibrationSettings() {
  if (!ADVENTURE_TEST_TOOLS_ENABLED) return;
  try {
    const raw = localStorage.getItem(CHIMNEY_OIL_CALIB_LS_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (typeof data.offsetX === 'number') chimneyOilCalibrationOffsetX = data.offsetX;
      if (typeof data.offsetY === 'number') chimneyOilCalibrationOffsetY = data.offsetY;
      console.log('[ChimneyOilCalib] loaded from localStorage:', data);
    }
  } catch (e) {
    chimneyOilCalibrationOffsetX = CHIMNEY_ORANGE_OIL_EXTRA_OFFSET_X;
    chimneyOilCalibrationOffsetY = CHIMNEY_ORANGE_OIL_EXTRA_OFFSET_Y;
  }
}

function saveChimneyOilCalibrationSettings() {
  try {
    const data = { offsetX: chimneyOilCalibrationOffsetX, offsetY: chimneyOilCalibrationOffsetY };
    localStorage.setItem(CHIMNEY_OIL_CALIB_LS_KEY, JSON.stringify(data));
    showHint('💾 oil offset 已存入 localStorage', 150);
    console.log('[ChimneyOilCalib] saved:', data);
  } catch (e) {
    showHint('localStorage 儲存失敗', 150);
  }
}

function resetChimneyOilCalibrationSettings() {
  chimneyOilCalibrationOffsetX = CHIMNEY_ORANGE_OIL_EXTRA_OFFSET_X;
  chimneyOilCalibrationOffsetY = CHIMNEY_ORANGE_OIL_EXTRA_OFFSET_Y;
  try { localStorage.setItem(CHIMNEY_OIL_CALIB_LS_KEY, JSON.stringify({ offsetX: chimneyOilCalibrationOffsetX, offsetY: chimneyOilCalibrationOffsetY })); } catch (e) {}
  showHint('🔄 oil offset 已重置', 150);
}

function copyChimneyOilCalibrationSettings() {
  const text = `const CHIMNEY_ORANGE_OIL_EXTRA_OFFSET_X = ${chimneyOilCalibrationOffsetX};\nconst CHIMNEY_ORANGE_OIL_EXTRA_OFFSET_Y = ${chimneyOilCalibrationOffsetY};`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showHint('📋 建議常數已複製到剪貼簿', 150);
    }).catch(() => {
      console.log('[ChimneyOilCalib] copy result:\n' + text);
      showHint('已輸出到 console（剪貼簿失敗）', 150);
    });
  } else {
    console.log('[ChimneyOilCalib] copy result:\n' + text);
    showHint('已輸出到 console', 150);
  }
}

// 啟動時讀取 calibration 設定
loadChimneyOilCalibrationSettings();

// ── Dual Oil Calibration Tool（測試版限定）──────────────────────────────
const DUAL_OIL_CALIB_LS_KEY = 'balloonVAdventure_dualOilCalibration';
let dualOilCalibrationMode   = false;
let dualOilCalibrationTarget = 'left';    // 'left' | 'right'
let dualOilEditMode          = 'visual';  // 'visual' | 'hitbox'

// ── Visual offset 運行時變數 ──
let dualOilLeftOffsetX  = DUAL_ORANGE_OIL_LEFT_EXTRA_OFFSET_X;
let dualOilLeftOffsetY  = DUAL_ORANGE_OIL_LEFT_EXTRA_OFFSET_Y;
let dualOilRightOffsetX = DUAL_ORANGE_OIL_RIGHT_EXTRA_OFFSET_X;
let dualOilRightOffsetY = DUAL_ORANGE_OIL_RIGHT_EXTRA_OFFSET_Y;

// ── Hitbox 運行時變數 ──
let dualOilLeftHitboxW        = DUAL_ORANGE_OIL_LEFT_HITBOX_W;
let dualOilLeftHitboxH        = DUAL_ORANGE_OIL_LEFT_HITBOX_H;
let dualOilLeftHitboxOffsetX  = DUAL_ORANGE_OIL_LEFT_HITBOX_OFFSET_X;
let dualOilLeftHitboxOffsetY  = DUAL_ORANGE_OIL_LEFT_HITBOX_OFFSET_Y;
let dualOilRightHitboxW       = DUAL_ORANGE_OIL_RIGHT_HITBOX_W;
let dualOilRightHitboxH       = DUAL_ORANGE_OIL_RIGHT_HITBOX_H;
let dualOilRightHitboxOffsetX = DUAL_ORANGE_OIL_RIGHT_HITBOX_OFFSET_X;
let dualOilRightHitboxOffsetY = DUAL_ORANGE_OIL_RIGHT_HITBOX_OFFSET_Y;

// v0.3.25-localstorage-fix：把 runtime 變數全部重置為本版 final 常數
// save=true 時同時寫入 localStorage（R reset 使用）
function resetDualOilCalibrationToDefaults({ save = false } = {}) {
  dualOilLeftOffsetX  = DUAL_ORANGE_OIL_LEFT_EXTRA_OFFSET_X;
  dualOilLeftOffsetY  = DUAL_ORANGE_OIL_LEFT_EXTRA_OFFSET_Y;
  dualOilRightOffsetX = DUAL_ORANGE_OIL_RIGHT_EXTRA_OFFSET_X;
  dualOilRightOffsetY = DUAL_ORANGE_OIL_RIGHT_EXTRA_OFFSET_Y;

  dualOilLeftHitboxW        = DUAL_ORANGE_OIL_LEFT_HITBOX_W;
  dualOilLeftHitboxH        = DUAL_ORANGE_OIL_LEFT_HITBOX_H;
  dualOilLeftHitboxOffsetX  = DUAL_ORANGE_OIL_LEFT_HITBOX_OFFSET_X;
  dualOilLeftHitboxOffsetY  = DUAL_ORANGE_OIL_LEFT_HITBOX_OFFSET_Y;

  dualOilRightHitboxW       = DUAL_ORANGE_OIL_RIGHT_HITBOX_W;
  dualOilRightHitboxH       = DUAL_ORANGE_OIL_RIGHT_HITBOX_H;
  dualOilRightHitboxOffsetX = DUAL_ORANGE_OIL_RIGHT_HITBOX_OFFSET_X;
  dualOilRightHitboxOffsetY = DUAL_ORANGE_OIL_RIGHT_HITBOX_OFFSET_Y;

  if (save) saveDualOilCalibrationSettings();
}

// 目前 runtime 數值 → localStorage 資料格式（含 version 防呆）
function buildDualOilCalibrationData() {
  return {
    version: GAME_VERSION,
    left:  { offsetX: dualOilLeftOffsetX,  offsetY: dualOilLeftOffsetY,
             hitboxW: dualOilLeftHitboxW,   hitboxH: dualOilLeftHitboxH,
             hitboxOX: dualOilLeftHitboxOffsetX, hitboxOY: dualOilLeftHitboxOffsetY },
    right: { offsetX: dualOilRightOffsetX, offsetY: dualOilRightOffsetY,
             hitboxW: dualOilRightHitboxW,  hitboxH: dualOilRightHitboxH,
             hitboxOX: dualOilRightHitboxOffsetX, hitboxOY: dualOilRightHitboxOffsetY }
  };
}

// 靜默寫入（不顯示 hint，供頁面載入時覆寫舊資料使用）
function writeDualOilCalibrationToStorage() {
  try {
    const data = buildDualOilCalibrationData();
    localStorage.setItem(DUAL_OIL_CALIB_LS_KEY, JSON.stringify(data));
    return data;
  } catch (e) {
    return null;
  }
}

function loadDualOilCalibrationSettings() {
  if (!ADVENTURE_TEST_TOOLS_ENABLED) return;
  try {
    const raw = localStorage.getItem(DUAL_OIL_CALIB_LS_KEY);
    if (!raw) return; // 沒有存檔：直接使用常數預設值

    const data = JSON.parse(raw);

    // v0.3.25-localstorage-fix：版本防呆
    // 沒有 version、或 version 不是目前 GAME_VERSION → 不套用舊資料，
    // 使用本版 final 常數，並把 localStorage 覆寫成本版預設值
    if (!data || data.version !== GAME_VERSION) {
      resetDualOilCalibrationToDefaults();
      writeDualOilCalibrationToStorage();
      console.log('[DualOilCalib] ignored stale localStorage (version:',
        (data && data.version) || '(none)', '→ current:', GAME_VERSION, '), using defaults');
      return;
    }

    // 只有 version === GAME_VERSION 才套用
    if (data.left) {
      if (typeof data.left.offsetX  === 'number') dualOilLeftOffsetX        = data.left.offsetX;
      if (typeof data.left.offsetY  === 'number') dualOilLeftOffsetY        = data.left.offsetY;
      if (typeof data.left.hitboxW  === 'number') dualOilLeftHitboxW        = data.left.hitboxW;
      if (typeof data.left.hitboxH  === 'number') dualOilLeftHitboxH        = data.left.hitboxH;
      if (typeof data.left.hitboxOX === 'number') dualOilLeftHitboxOffsetX  = data.left.hitboxOX;
      if (typeof data.left.hitboxOY === 'number') dualOilLeftHitboxOffsetY  = data.left.hitboxOY;
    }
    if (data.right) {
      if (typeof data.right.offsetX  === 'number') dualOilRightOffsetX       = data.right.offsetX;
      if (typeof data.right.offsetY  === 'number') dualOilRightOffsetY       = data.right.offsetY;
      if (typeof data.right.hitboxW  === 'number') dualOilRightHitboxW       = data.right.hitboxW;
      if (typeof data.right.hitboxH  === 'number') dualOilRightHitboxH       = data.right.hitboxH;
      if (typeof data.right.hitboxOX === 'number') dualOilRightHitboxOffsetX = data.right.hitboxOX;
      if (typeof data.right.hitboxOY === 'number') dualOilRightHitboxOffsetY = data.right.hitboxOY;
    }
    console.log('[DualOilCalib] loaded from localStorage:', data);
  } catch (e) {
    // 讀取失敗時回到預設值
    resetDualOilCalibrationToDefaults();
  }
}

function saveDualOilCalibrationSettings() {
  const data = writeDualOilCalibrationToStorage();
  if (data) {
    showHint('💾 dual oil visual + hitbox 已存入 localStorage', 150);
    console.log('[DualOilCalib] saved:', data);
  } else {
    showHint('localStorage 儲存失敗', 150);
  }
}

function resetDualOilCalibrationSettings() {
  resetDualOilCalibrationToDefaults({ save: true });
  showHint('🔄 dual oil visual + hitbox 已重置為預設值', 150);
}

function copyDualOilCalibrationSettings() {
  const text =
    `const DUAL_ORANGE_OIL_LEFT_EXTRA_OFFSET_X  = ${dualOilLeftOffsetX};\n` +
    `const DUAL_ORANGE_OIL_LEFT_EXTRA_OFFSET_Y  = ${dualOilLeftOffsetY};\n` +
    `const DUAL_ORANGE_OIL_RIGHT_EXTRA_OFFSET_X = ${dualOilRightOffsetX};\n` +
    `const DUAL_ORANGE_OIL_RIGHT_EXTRA_OFFSET_Y = ${dualOilRightOffsetY};\n\n` +
    `const DUAL_ORANGE_OIL_LEFT_HITBOX_W  = ${dualOilLeftHitboxW};\n` +
    `const DUAL_ORANGE_OIL_LEFT_HITBOX_H  = ${dualOilLeftHitboxH};\n` +
    `const DUAL_ORANGE_OIL_LEFT_HITBOX_OFFSET_X  = ${dualOilLeftHitboxOffsetX};\n` +
    `const DUAL_ORANGE_OIL_LEFT_HITBOX_OFFSET_Y  = ${dualOilLeftHitboxOffsetY};\n\n` +
    `const DUAL_ORANGE_OIL_RIGHT_HITBOX_W = ${dualOilRightHitboxW};\n` +
    `const DUAL_ORANGE_OIL_RIGHT_HITBOX_H = ${dualOilRightHitboxH};\n` +
    `const DUAL_ORANGE_OIL_RIGHT_HITBOX_OFFSET_X = ${dualOilRightHitboxOffsetX};\n` +
    `const DUAL_ORANGE_OIL_RIGHT_HITBOX_OFFSET_Y = ${dualOilRightHitboxOffsetY};`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showHint('📋 dual oil visual + hitbox 常數已複製到剪貼簿', 150);
    }).catch(() => {
      console.log('[DualOilCalib] copy result:\n' + text);
      showHint('已輸出到 console（剪貼簿失敗）', 150);
    });
  } else {
    console.log('[DualOilCalib] copy result:\n' + text);
    showHint('已輸出到 console', 150);
  }
}

// 啟動時讀取 dual oil calibration 設定
loadDualOilCalibrationSettings();

// ── Projectile Oil Shot Calibration Tool（測試版限定，F7）─────────────────
const PROJECTILE_OIL_SHOT_CALIB_LS_KEY = 'balloonVAdventure_projectileOilShotCalibration';
let projectileOilShotCalibrationMode = false;

let projectileOilShotLocalX    = PROJECTILE_ORANGE_OIL_SHOT_LOCAL_X;
let projectileOilShotLocalY    = PROJECTILE_ORANGE_OIL_SHOT_LOCAL_Y;
let projectileOilShotOffsetX   = PROJECTILE_ORANGE_OIL_SHOT_OFFSET_X;
let projectileOilShotOffsetY   = PROJECTILE_ORANGE_OIL_SHOT_OFFSET_Y;
let projectileOilShotScaleMult = PROJECTILE_ORANGE_OIL_SHOT_SCALE_MULT;

// v0.3.26-hitbox-calibration：F7 編輯模式 'visual' | 'oilHitbox' | 'bodyHitbox'
let projectileOilShotEditMode = 'visual';

let projectileOilShotHitboxW       = PROJECTILE_ORANGE_OIL_SHOT_HITBOX_W;
let projectileOilShotHitboxH       = PROJECTILE_ORANGE_OIL_SHOT_HITBOX_H;
let projectileOilShotHitboxOffsetX = PROJECTILE_ORANGE_OIL_SHOT_HITBOX_OFFSET_X;
let projectileOilShotHitboxOffsetY = PROJECTILE_ORANGE_OIL_SHOT_HITBOX_OFFSET_Y;

let projectileOrangeBodyHitboxW       = PROJECTILE_ORANGE_BODY_HITBOX_W;
let projectileOrangeBodyHitboxH       = PROJECTILE_ORANGE_BODY_HITBOX_H;
let projectileOrangeBodyHitboxOffsetX = PROJECTILE_ORANGE_BODY_HITBOX_OFFSET_X;
let projectileOrangeBodyHitboxOffsetY = PROJECTILE_ORANGE_BODY_HITBOX_OFFSET_Y;

function resetProjectileOilShotCalibrationToDefaults({ save = false } = {}) {
  projectileOilShotLocalX    = PROJECTILE_ORANGE_OIL_SHOT_LOCAL_X;
  projectileOilShotLocalY    = PROJECTILE_ORANGE_OIL_SHOT_LOCAL_Y;
  projectileOilShotOffsetX   = PROJECTILE_ORANGE_OIL_SHOT_OFFSET_X;
  projectileOilShotOffsetY   = PROJECTILE_ORANGE_OIL_SHOT_OFFSET_Y;
  projectileOilShotScaleMult = PROJECTILE_ORANGE_OIL_SHOT_SCALE_MULT;

  projectileOilShotHitboxW       = PROJECTILE_ORANGE_OIL_SHOT_HITBOX_W;
  projectileOilShotHitboxH       = PROJECTILE_ORANGE_OIL_SHOT_HITBOX_H;
  projectileOilShotHitboxOffsetX = PROJECTILE_ORANGE_OIL_SHOT_HITBOX_OFFSET_X;
  projectileOilShotHitboxOffsetY = PROJECTILE_ORANGE_OIL_SHOT_HITBOX_OFFSET_Y;

  projectileOrangeBodyHitboxW       = PROJECTILE_ORANGE_BODY_HITBOX_W;
  projectileOrangeBodyHitboxH       = PROJECTILE_ORANGE_BODY_HITBOX_H;
  projectileOrangeBodyHitboxOffsetX = PROJECTILE_ORANGE_BODY_HITBOX_OFFSET_X;
  projectileOrangeBodyHitboxOffsetY = PROJECTILE_ORANGE_BODY_HITBOX_OFFSET_Y;

  if (save) saveProjectileOilShotCalibrationSettings();
}

function buildProjectileOilShotCalibrationData() {
  return {
    version:   GAME_VERSION,

    localX:    projectileOilShotLocalX,
    localY:    projectileOilShotLocalY,
    offsetX:   projectileOilShotOffsetX,
    offsetY:   projectileOilShotOffsetY,
    scaleMult: projectileOilShotScaleMult,

    oilHitboxW:       projectileOilShotHitboxW,
    oilHitboxH:       projectileOilShotHitboxH,
    oilHitboxOffsetX: projectileOilShotHitboxOffsetX,
    oilHitboxOffsetY: projectileOilShotHitboxOffsetY,

    bodyHitboxW:       projectileOrangeBodyHitboxW,
    bodyHitboxH:       projectileOrangeBodyHitboxH,
    bodyHitboxOffsetX: projectileOrangeBodyHitboxOffsetX,
    bodyHitboxOffsetY: projectileOrangeBodyHitboxOffsetY,
  };
}

function writeProjectileOilShotCalibrationToStorage() {
  try {
    const data = buildProjectileOilShotCalibrationData();
    localStorage.setItem(PROJECTILE_OIL_SHOT_CALIB_LS_KEY, JSON.stringify(data));
    return data;
  } catch (e) { return null; }
}

function loadProjectileOilShotCalibrationSettings() {
  if (!ADVENTURE_TEST_TOOLS_ENABLED) return;
  try {
    const raw = localStorage.getItem(PROJECTILE_OIL_SHOT_CALIB_LS_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    // 版本防呆：沒有 version 或 version 不同 → 不套用，使用本版常數並覆寫存檔
    if (!data || data.version !== GAME_VERSION) {
      resetProjectileOilShotCalibrationToDefaults();
      writeProjectileOilShotCalibrationToStorage();
      console.log('[ProjOilShotCalib] ignored stale localStorage (version:',
        (data && data.version) || '(none)', '), using defaults');
      return;
    }
    if (typeof data.localX    === 'number') projectileOilShotLocalX    = data.localX;
    if (typeof data.localY    === 'number') projectileOilShotLocalY    = data.localY;
    if (typeof data.offsetX   === 'number') projectileOilShotOffsetX   = data.offsetX;
    if (typeof data.offsetY   === 'number') projectileOilShotOffsetY   = data.offsetY;
    if (typeof data.scaleMult === 'number') projectileOilShotScaleMult = data.scaleMult;
    if (typeof data.oilHitboxW        === 'number') projectileOilShotHitboxW          = data.oilHitboxW;
    if (typeof data.oilHitboxH        === 'number') projectileOilShotHitboxH          = data.oilHitboxH;
    if (typeof data.oilHitboxOffsetX  === 'number') projectileOilShotHitboxOffsetX    = data.oilHitboxOffsetX;
    if (typeof data.oilHitboxOffsetY  === 'number') projectileOilShotHitboxOffsetY    = data.oilHitboxOffsetY;
    if (typeof data.bodyHitboxW       === 'number') projectileOrangeBodyHitboxW       = data.bodyHitboxW;
    if (typeof data.bodyHitboxH       === 'number') projectileOrangeBodyHitboxH       = data.bodyHitboxH;
    if (typeof data.bodyHitboxOffsetX === 'number') projectileOrangeBodyHitboxOffsetX = data.bodyHitboxOffsetX;
    if (typeof data.bodyHitboxOffsetY === 'number') projectileOrangeBodyHitboxOffsetY = data.bodyHitboxOffsetY;
    console.log('[ProjOilShotCalib] loaded from localStorage:', data);
  } catch (e) {
    resetProjectileOilShotCalibrationToDefaults();
  }
}

function saveProjectileOilShotCalibrationSettings() {
  const data = writeProjectileOilShotCalibrationToStorage();
  if (data) {
    showHint('💾 projectile visual + hitbox 已存入 localStorage', 150);
    console.log('[ProjOilShotCalib] saved:', data);
  } else {
    showHint('localStorage 儲存失敗', 150);
  }
}

function resetProjectileOilShotCalibrationSettings() {
  resetProjectileOilShotCalibrationToDefaults({ save: true });
  showHint('🔄 projectile visual + hitbox 已重置為預設值', 150);
}

function copyProjectileOilShotCalibrationSettings() {
  const text =
    `const PROJECTILE_ORANGE_OIL_SHOT_LOCAL_X = ${projectileOilShotLocalX};\n` +
    `const PROJECTILE_ORANGE_OIL_SHOT_LOCAL_Y = ${projectileOilShotLocalY};\n` +
    `const PROJECTILE_ORANGE_OIL_SHOT_OFFSET_X = ${projectileOilShotOffsetX};\n` +
    `const PROJECTILE_ORANGE_OIL_SHOT_OFFSET_Y = ${projectileOilShotOffsetY};\n` +
    `const PROJECTILE_ORANGE_OIL_SHOT_SCALE_MULT = ${projectileOilShotScaleMult};\n\n` +
    `const PROJECTILE_ORANGE_OIL_SHOT_HITBOX_W = ${projectileOilShotHitboxW};\n` +
    `const PROJECTILE_ORANGE_OIL_SHOT_HITBOX_H = ${projectileOilShotHitboxH};\n` +
    `const PROJECTILE_ORANGE_OIL_SHOT_HITBOX_OFFSET_X = ${projectileOilShotHitboxOffsetX};\n` +
    `const PROJECTILE_ORANGE_OIL_SHOT_HITBOX_OFFSET_Y = ${projectileOilShotHitboxOffsetY};\n\n` +
    `const PROJECTILE_ORANGE_BODY_HITBOX_W = ${projectileOrangeBodyHitboxW};\n` +
    `const PROJECTILE_ORANGE_BODY_HITBOX_H = ${projectileOrangeBodyHitboxH};\n` +
    `const PROJECTILE_ORANGE_BODY_HITBOX_OFFSET_X = ${projectileOrangeBodyHitboxOffsetX};\n` +
    `const PROJECTILE_ORANGE_BODY_HITBOX_OFFSET_Y = ${projectileOrangeBodyHitboxOffsetY};`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showHint('📋 projectile visual + hitbox 常數已複製到剪貼簿', 150);
    }).catch(() => {
      console.log('[ProjOilShotCalib] copy result:\n' + text);
      showHint('已輸出到 console（剪貼簿失敗）', 150);
    });
  } else {
    console.log('[ProjOilShotCalib] copy result:\n' + text);
    showHint('已輸出到 console', 150);
  }
}

// 啟動時讀取 oil shot calibration 設定
loadProjectileOilShotCalibrationSettings();

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

// v0.3.14：橘子怪測試關入口（LEVELS[1]，橘子果園）
// 測試版限定按鈕觸發，讓玩家快速觀察 idle→warning→spray→cooldown 完整節奏
// v0.3.51：測試入口也走 preload gate（跳到哪、載哪；載完才開始）
function startOrangeTestLevel() { return runWithAssetGate(['common', 'chapter1'], '橘子怪測試關準備中...', () => startOrangeTestLevel__impl()); }
function startOrangeTestLevel__impl() {
  try { advMarkTestEntry('startOrangeTestLevel'); } catch (e) {} // v0.3.63：測試捷徑 → 只能是測試紀錄
  if (!ADVENTURE_TEST_TOOLS_ENABLED) return;
  resetInventory();
  currentLevelIndex = 1; // LEVELS[1] = 橘子果園（橘子怪所在關）
  loadLevel(1);
  initEquippedSword();
  initEquippedHammer();
  normalizeActiveWeaponSlot();
  applyAdventureTestLoadout();
  restart({ keepHp: false, preserveBringDog: false });
  applyAdventureTestLoadout();
  const pauseEl = document.getElementById('pause-overlay');
  if (pauseEl) { pauseEl.style.display = 'none'; pauseEl.classList.remove('active'); }
  gameState = 'playing';
  showHint('已進入橘子怪測試關！觀察 idle→warning→spray→cooldown 節奏', 260);
  console.log('[TestTools] startOrangeTestLevel:', {
    stageId: LEVELS[1] && LEVELS[1].stageId,
  });
}

// v0.3.15：Enemy Variant + Tier 測試入口
// 進入一個 runtime-only 測試關，直接在畫面上產生各種 variant/tier 組合，
// 讓開發者確認 variant+tier 有正確套用（速度、大小、tint）
// v0.3.19：第二章測試入口（跳到 2-1 煙囟橘子初遭遇）
// v0.3.51：測試入口也走 preload gate（跳到哪、載哪；載完才開始）
function startChapter2TestLevel() { return runWithAssetGate(['common', 'chapter1', 'chapter2'], '第二章素材載入中...', () => startChapter2TestLevel__impl()); }
function startChapter2TestLevel__impl() {
  try { advMarkTestEntry('startChapter2TestLevel'); } catch (e) {} // v0.3.63：測試捷徑 → 只能是測試紀錄
  if (!ADVENTURE_TEST_TOOLS_ENABLED) return;
  const idx = LEVELS.findIndex(lv => lv.stageId === '2-1');
  if (idx < 0) { showHint('找不到 2-1 關卡', 160); return; }
  resetInventory();
  currentLevelIndex = idx;
  loadLevel(idx);
  initEquippedSword();
  initEquippedHammer();
  normalizeActiveWeaponSlot();
  applyAdventureTestLoadout();
  restart({ keepHp: false, preserveBringDog: false });
  applyAdventureTestLoadout();
  const pauseEl = document.getElementById('pause-overlay');
  if (pauseEl) { pauseEl.style.display = 'none'; pauseEl.classList.remove('active'); }
  gameState = 'playing';
  showHint('已進入第二章 2-1：煙囟橘子初遭遇', 260);
}

// v0.3.25：雙噴嘴橘子美術觀察入口（TEST MODE 限定）
// 跳到 2-2（雙噴嘴橘子所在關），讓開發者觀察 idle/warning/spray/cooldown 美術表現
// v0.3.51：測試入口也走 preload gate（跳到哪、載哪；載完才開始）
function startDualOrangeTestLevel() { return runWithAssetGate(['common', 'chapter1', 'chapter2'], '第二章素材載入中...', () => startDualOrangeTestLevel__impl()); }
function startDualOrangeTestLevel__impl() {
  try { advMarkTestEntry('startDualOrangeTestLevel'); } catch (e) {} // v0.3.63：測試捷徑 → 只能是測試紀錄
  if (!ADVENTURE_TEST_TOOLS_ENABLED) return;
  const idx = LEVELS.findIndex(lv => lv.stageId === '2-2');
  if (idx < 0) { showHint('找不到 2-2 關卡', 160); return; }
  resetInventory();
  currentLevelIndex = idx;
  loadLevel(idx);
  initEquippedSword();
  initEquippedHammer();
  normalizeActiveWeaponSlot();
  applyAdventureTestLoadout();
  restart({ keepHp: false, preserveBringDog: false });
  applyAdventureTestLoadout();
  const pauseEl = document.getElementById('pause-overlay');
  if (pauseEl) { pauseEl.style.display = 'none'; pauseEl.classList.remove('active'); }
  gameState = 'playing';
  showHint('🍊 雙噴嘴橘子測試：觀察 idle/warning/spray/cooldown 美術', 280);
}

// v0.3.26：飛行油彈橘子美術觀察入口（TEST MODE 限定，runtime-only）
// 用 2-2 地圖當底板，清掉其他威脅，放 projectile orange 觀察 idle/warning/release 循環。
// v0.3.26-complete-art：每隻 release 都會生油彈，改成只放 3 隻避免畫面太亂。
// v0.3.27：第二章「橘子怪家族」綜合測試關（TEST MODE 限定，runtime-only）
// 用 2-2 地圖當底板，清掉原有威脅，依序展示四種橘子怪；不修改 LEVELS 原始資料。
// 注意：煙囪 / 雙噴嘴橘子的狀態欄位是 sprayPhase（不是 phase），與正式 2-x 關卡的建構方式一致。
// v0.3.51：測試入口也走 preload gate（跳到哪、載哪；載完才開始）
function startOrangeFamilyMixTestLevel() { return runWithAssetGate(['common', 'chapter1', 'chapter2'], '第二章素材載入中...', () => startOrangeFamilyMixTestLevel__impl()); }
function startOrangeFamilyMixTestLevel__impl() {
  try { advMarkTestEntry('startOrangeFamilyMixTestLevel'); } catch (e) {} // v0.3.63：測試捷徑 → 只能是測試紀錄
  if (!ADVENTURE_TEST_TOOLS_ENABLED) return;
  const idx = LEVELS.findIndex(lv => lv.stageId === '2-2');
  if (idx < 0) { showHint('找不到 2-2 關卡', 160); return; }
  resetInventory();
  currentLevelIndex = idx;
  loadLevel(idx);
  initEquippedSword();
  initEquippedHammer();
  normalizeActiveWeaponSlot();
  applyAdventureTestLoadout();
  restart({ keepHp: false, preserveBringDog: false });
  applyAdventureTestLoadout();

  // 清掉底板原有威脅（只影響本次 runtime）
  enemies.length = 0;
  orangeNemeses.length = 0;
  chimneyOranges.length = 0;
  dualNozzleOranges.length = 0;
  projectileOranges.length = 0;
  projectileOrangeShots.length = 0;
  fanOranges.length = 0;
  spikes.length = 0;

  // v0.3.28：維持舊 2-2 底板平台（2-2 已改為正式關卡）
  applyLegacy22TestTerrain();

  // v0.3.27-test-2：本關只測敵人，清空所有收集物（避免終點後 / 與橘子重疊的金幣與氣球）
  coins.length = 0;
  balloons260.length = 0;
  roundBalloons.length = 0;
  currentHiddenTreasure = null;

  // 關卡長度與終點（只影響本次 runtime；loadLevel 時會依 LEVELS 重設）
  LEVEL_LENGTH = 6200;
  FINISH_X     = 6000;

  // v0.3.27-test-2：測試容錯 — HP 6 顆、補血道具（runtime-only，不呼叫 saveInventory）
  player.maxHp = 6;
  player.hp    = 6;
  levelStartHp = 6;
  if (levelStartSnapshot) levelStartSnapshot.hp = 6;
  ensureInventoryItems();
  testSupplyOriginalItems = Object.assign({}, playerInventory.items); // 存檔時改用這份
  playerInventory.items.bandage     = Math.max(playerInventory.items.bandage     || 0, 5);
  playerInventory.items.firstAidKit = Math.max(playerInventory.items.firstAidKit || 0, 1);

  const oy = GROUND_Y - CONFIG.ORANGE_H;
  const mkNormal = (x) => ({
    x, y: oy, w: CONFIG.ORANGE_W, h: CONFIG.ORANGE_H,
    sprayDir: -1, phase: 'idle', phaseTimer: 0, sprayActive: false,
    type: 'balloonNemesis', variant: 'straight', tier: 'normal',
  });
  const mkChimney = (x) => ({
    x, y: oy, w: CONFIG.ORANGE_W, h: CONFIG.ORANGE_H,
    type: 'chimneyOrange', sprayPhase: 'idle', phaseTimer: 0, sprayActive: false, active: true,
  });
  const mkDual = (x) => ({
    x, y: oy, w: CONFIG.ORANGE_W, h: CONFIG.ORANGE_H,
    type: 'dualNozzleOrange', sprayPhase: 'idle', phaseTimer: 0, sprayActive: false, active: true,
  });
  const mkProjectile = (x) => ({
    x, y: oy, w: CONFIG.ORANGE_W, h: CONFIG.ORANGE_H,
    active: true, phase: 'idle', phaseTimer: 0, shotSpawned: false,
  });

  // A. 前段：普通橘子（水平近距離噴油）
  orangeNemeses.push(mkNormal(700));
  // B. 前中段：煙囪橘子（向上油柱）
  chimneyOranges.push(mkChimney(1300));
  // C. 中段：雙噴嘴橘子（左右噴油）
  dualNozzleOranges.push(mkDual(2000));
  // D. 中後段：飛行油彈橘子（遠距離油彈）
  projectileOranges.push(mkProjectile(2700));
  // E. 後段：普通 + 飛行油彈（拉開 400px）
  orangeNemeses.push(mkNormal(3500));
  projectileOranges.push(mkProjectile(3900));
  // F. 結尾前：煙囪 + 雙噴嘴（拉開 550px）
  chimneyOranges.push(mkChimney(4700));
  dualNozzleOranges.push(mkDual(5250));

  const pauseEl = document.getElementById('pause-overlay');
  if (pauseEl) { pauseEl.style.display = 'none'; pauseEl.classList.remove('active'); }
  gameState = 'playing';
  showHint('🍊 橘子家族測試：普通 / 煙囪 / 雙噴嘴 / 飛行油彈', 300);
  // 依序顯示補給提示與短提示（若玩家已離開本測試關則不顯示）
  const familyLevelIdx = idx;
  const stillInFamilyLevel = () =>
    gameState === 'playing' && currentLevelIndex === familyLevelIdx && LEVEL_LENGTH === 6200;
  setTimeout(() => {
    if (stillInFamilyLevel()) showHint('測試關補給：HP 6，繃帶 ×5，急救包 ×1', 220);
  }, 5200);
  setTimeout(() => {
    if (stillInFamilyLevel()) showHint('不同橘子怪的出油方式不同，看清楚動作再通過！', 240);
  }, 9200);
}

// v0.3.27：⛰️ 第二章地形原型測試關（TEST MODE 限定，runtime-only）
// 以 2-2 為底板，重建平台 / 低處坑道 / 高處橘子 / 收集物；不修改 LEVELS 原始資料。
// 不含移動平台、不含落穴死亡（坑底有平台接住）。
const CH2_TERRAIN_PIT_X       = 1500;
const CH2_TERRAIN_PIT_W       = 260;
// 坑底深度：玩家判定框頂端必須低於飛行油彈 damage hitbox 底端（約 GROUND_Y-15）才躲得過，
// 玩家高 80px，所以坑底至少要在 GROUND_Y+59；取 +66 留一點安全空間。
const CH2_TERRAIN_PIT_FLOOR_Y = GROUND_Y + 66;

// v0.3.51：測試入口也走 preload gate（跳到哪、載哪；載完才開始）
function startChapter2TerrainPrototypeTestLevel() { return runWithAssetGate(['common', 'chapter1', 'chapter2'], '第二章素材載入中...', () => startChapter2TerrainPrototypeTestLevel__impl()); }
function startChapter2TerrainPrototypeTestLevel__impl() {
  try { advMarkTestEntry('startChapter2TerrainPrototypeTestLevel'); } catch (e) {} // v0.3.63：測試捷徑 → 只能是測試紀錄
  if (!ADVENTURE_TEST_TOOLS_ENABLED) return;
  const idx = LEVELS.findIndex(lv => lv.stageId === '2-2');
  if (idx < 0) { showHint('找不到 2-2 關卡', 160); return; }
  resetInventory();
  currentLevelIndex = idx;
  loadLevel(idx);
  initEquippedSword();
  initEquippedHammer();
  normalizeActiveWeaponSlot();
  applyAdventureTestLoadout();
  restart({ keepHp: false, preserveBringDog: false });
  applyAdventureTestLoadout();

  // ── 清掉底板原有威脅與收集物（只影響本次 runtime）──
  enemies.length = 0;
  orangeNemeses.length = 0;
  chimneyOranges.length = 0;
  dualNozzleOranges.length = 0;
  projectileOranges.length = 0;
  projectileOrangeShots.length = 0;
  fanOranges.length = 0;
  spikes.length = 0;
  coins.length = 0;
  balloons260.length = 0;
  roundBalloons.length = 0;
  currentHiddenTreasure = null;

  // ── 關卡長度與終點 ──
  LEVEL_LENGTH = 7000;
  FINISH_X     = 6800;

  // ── 測試容錯：HP 6、補給（runtime-only，存檔保護同橘子家族測試關）──
  player.maxHp = 6;
  player.hp    = 6;
  levelStartHp = 6;
  if (levelStartSnapshot) levelStartSnapshot.hp = 6;
  ensureInventoryItems();
  testSupplyOriginalItems = Object.assign({}, playerInventory.items);
  playerInventory.items.bandage     = Math.max(playerInventory.items.bandage     || 0, 5);
  playerInventory.items.firstAidKit = Math.max(playerInventory.items.firstAidKit || 0, 1);

  // ── 地形：清掉底板平台後重建 ──
  platforms.length = 0;
  groundGaps.length = 0;
  const P = (x, y, w, h = 22) => platforms.push({ x, y, w, h });
  // A. 入口低平台
  P(520,  GROUND_Y - 90,  260);
  // B. 低處坑道：兩側階梯平台 + 坑底（地面在 1500~1760 挖空，坑底平台接住玩家）
  P(1250, GROUND_Y - 50,  160);
  groundGaps.push({ x: CH2_TERRAIN_PIT_X, w: CH2_TERRAIN_PIT_W });
  P(CH2_TERRAIN_PIT_X, CH2_TERRAIN_PIT_FLOOR_Y, CH2_TERRAIN_PIT_W, CANVAS_H - CH2_TERRAIN_PIT_FLOOR_Y);
  P(1820, GROUND_Y - 50,  160);
  // C. 上路獎勵平台（下路不放敵人，可選擇避開）
  P(2350, GROUND_Y - 130, 520);
  // D. 雙噴嘴橘子前等待平台
  P(3350, GROUND_Y - 70,  280);
  // F. 下路安全平台（放在 E 之前宣告，與 E 部分重疊、高度不同）
  P(4450, GROUND_Y - 40,  280);
  // E. 高處飛行油彈橘子砲台平台
  P(4700, GROUND_Y - 120, 360);
  // G. 結尾等待平台
  P(5750, GROUND_Y - 80,  280);

  // ── 橘子怪 ──
  const groundOrangeY = GROUND_Y - CONFIG.ORANGE_H;
  const yOnPlatform = (platformY) => platformY - CONFIG.ORANGE_H;
  const mkNormalOrange = (x, y) => ({
    x, y, w: CONFIG.ORANGE_W, h: CONFIG.ORANGE_H,
    sprayDir: -1, phase: 'idle', phaseTimer: 0, sprayActive: false,
    type: 'balloonNemesis', variant: 'straight', tier: 'normal',
  });
  const mkChimneyOrange = (x, y) => ({
    x, y, w: CONFIG.ORANGE_W, h: CONFIG.ORANGE_H,
    type: 'chimneyOrange', sprayPhase: 'idle', phaseTimer: 0, sprayActive: false, active: true,
  });
  const mkDualOrange = (x, y) => ({
    x, y, w: CONFIG.ORANGE_W, h: CONFIG.ORANGE_H,
    type: 'dualNozzleOrange', sprayPhase: 'idle', phaseTimer: 0, sprayActive: false, active: true,
  });
  const mkProjectileOrange = (x, y) => ({
    x, y, w: CONFIG.ORANGE_W, h: CONFIG.ORANGE_H,
    active: true, phase: 'idle', phaseTimer: 0, shotSpawned: false,
  });

  // A 段：普通橘子（地面，在入口平台右側；平台是躲噴油的上路）
  orangeNemeses.push(mkNormalOrange(860, groundOrangeY));
  // B 段：飛行油彈橘子（地面，坑道右側；油彈往左飛越坑道上方）
  projectileOranges.push(mkProjectileOrange(2150, groundOrangeY));
  // C 段：上路平台上的普通橘子（高處）
  orangeNemeses.push(mkNormalOrange(2600, yOnPlatform(GROUND_Y - 130)));
  // D 段：雙噴嘴橘子（地面）
  dualNozzleOranges.push(mkDualOrange(3750, groundOrangeY));
  // E 段：高處飛行油彈橘子（站在 E 平台上）
  projectileOranges.push(mkProjectileOrange(4850, yOnPlatform(GROUND_Y - 120)));
  // F 段：煙囪橘子 + 雙噴嘴橘子（地面，相距 550px）
  chimneyOranges.push(mkChimneyOrange(5700, groundOrangeY));
  dualNozzleOranges.push(mkDualOrange(6250, groundOrangeY));

  // ── 收集物（全部可取得，不放終點後、不與橘子重疊）──
  const C  = (x, y) => coins.push({ x, y, collected: false, bobOffset: Math.random() * Math.PI * 2 });
  const B  = (x, y) => balloons260.push({ x, y, collected: false, bobOffset: Math.random() * Math.PI * 2 });
  const RB = (x, y) => roundBalloons.push({ x, y, collected: false, bobOffset: Math.random() * Math.PI * 2 });
  // 入口平台上方
  C(560, GROUND_Y - 125); C(620, GROUND_Y - 125); C(680, GROUND_Y - 125);
  // 上路獎勵平台上方（原 2620 會與平台上的橘子重疊，移到橘子右側 2720）
  C(2380, GROUND_Y - 165); C(2460, GROUND_Y - 165); C(2540, GROUND_Y - 165); C(2720, GROUND_Y - 165);
  // 下路安全平台上方
  C(4480, GROUND_Y - 75); C(4560, GROUND_Y - 75);
  // 氣球
  B(2800, GROUND_Y - 185);
  B(4950, GROUND_Y - 175);
  RB(5050, GROUND_Y - 180);

  const pauseEl = document.getElementById('pause-overlay');
  if (pauseEl) { pauseEl.style.display = 'none'; pauseEl.classList.remove('active'); }
  gameState = 'playing';
  showHint('⛰️ 第二章地形測試：高低平台 / 低處躲油彈 / 高處橘子', 300);
  const terrainLevelIdx = idx;
  setTimeout(() => {
    if (gameState === 'playing' && currentLevelIndex === terrainLevelIdx && LEVEL_LENGTH === 7000) {
      showHint('低處可以用來躲飛行油彈，上路有額外獎勵！', 240);
    }
  }, 5200);
}

// v0.3.28-polish：🚀 測試正式第二章 — 直接進入正式 LEVELS 中的 2-1（TEST MODE 限定）
// 之後依正常流程 2-1 → 2-2 → 2-3；不做任何 runtime 關卡改動
// v0.3.51：測試入口也走 preload gate（跳到哪、載哪；載完才開始）
function startFormalChapter2TestLevel() { return runWithAssetGate(['common', 'chapter1', 'chapter2'], '第二章素材載入中...', () => startFormalChapter2TestLevel__impl()); }
function startFormalChapter2TestLevel__impl() {
  try { advMarkTestEntry('startFormalChapter2TestLevel'); } catch (e) {} // v0.3.63：測試捷徑 → 只能是測試紀錄
  if (!ADVENTURE_TEST_TOOLS_ENABLED) return;
  const idx = LEVELS.findIndex(lv => lv.stageId === '2-1');
  if (idx < 0) { showHint('找不到 2-1 關卡', 160); return; }
  resetInventory();
  currentLevelIndex = idx;
  loadLevel(idx);
  initEquippedSword();
  initEquippedHammer();
  normalizeActiveWeaponSlot();
  applyAdventureTestLoadout();
  restart({ keepHp: false, preserveBringDog: false });
  applyAdventureTestLoadout();
  const pauseEl = document.getElementById('pause-overlay');
  if (pauseEl) { pauseEl.style.display = 'none'; pauseEl.classList.remove('active'); }
  gameState = 'playing';
  showHint('🚀 正式第二章測試：2-1 → 2-2 → 2-3 → 2-4', 240);
}

// v0.3.51：測試入口也走 preload gate（跳到哪、載哪；載完才開始）
function startProjectileOrangeTestLevel() { return runWithAssetGate(['common', 'chapter1', 'chapter2'], '第二章素材載入中...', () => startProjectileOrangeTestLevel__impl()); }
function startProjectileOrangeTestLevel__impl() {
  try { advMarkTestEntry('startProjectileOrangeTestLevel'); } catch (e) {} // v0.3.63：測試捷徑 → 只能是測試紀錄
  if (!ADVENTURE_TEST_TOOLS_ENABLED) return;
  const idx = LEVELS.findIndex(lv => lv.stageId === '2-2');
  if (idx < 0) { showHint('找不到 2-2 關卡', 160); return; }
  resetInventory();
  currentLevelIndex = idx;
  loadLevel(idx);
  initEquippedSword();
  initEquippedHammer();
  normalizeActiveWeaponSlot();
  applyAdventureTestLoadout();
  restart({ keepHp: false, preserveBringDog: false });
  applyAdventureTestLoadout();

  // 清除測試底板中的其他威脅（只影響本次 runtime，不改 LEVELS 資料）
  enemies.length = 0;
  orangeNemeses.length = 0;
  chimneyOranges.length = 0;
  dualNozzleOranges.length = 0;
  fanOranges.length = 0;
  spikes.length = 0;

  // v0.3.28：維持舊 2-2 底板平台（2-2 已改為正式關卡），並清掉新 2-2 的收集物，
  // 避免金幣懸在已移除的平台位置上
  applyLegacy22TestTerrain();
  coins.length = 0;
  balloons260.length = 0;
  roundBalloons.length = 0;

  // 放 projectile orange：第一隻 x=700（一進場就看得到），共 3 隻
  projectileOranges.length = 0;
  projectileOrangeShots.length = 0;
  const xs = [700, 1800, 2900];
  xs.forEach((x, i) => {
    projectileOranges.push({
      x,
      y: GROUND_Y - CONFIG.ORANGE_H,
      w: CONFIG.ORANGE_W,
      h: CONFIG.ORANGE_H,
      active: true,
      phase: 'idle',
      phaseTimer: (i * 700) % PROJECTILE_ORANGE_IDLE_MS, // 錯開，方便同時比較不同狀態
      shotSpawned: false,
    });
  });

  const pauseEl = document.getElementById('pause-overlay');
  if (pauseEl) { pauseEl.style.display = 'none'; pauseEl.classList.remove('active'); }
  gameState = 'playing';
  showHint('🥋 Projectile Orange 美術測試：觀察 idle → warning → release 循環', 280);
}

// v0.3.51：測試入口也走 preload gate（跳到哪、載哪；載完才開始）
function startEnemyVariantTestLevel() { return runWithAssetGate(['common', 'chapter1', 'chapter2'], '測試關素材載入中...', () => startEnemyVariantTestLevel__impl()); }
function startEnemyVariantTestLevel__impl() {
  try { advMarkTestEntry('startEnemyVariantTestLevel'); } catch (e) {} // v0.3.63：測試捷徑 → 只能是測試紀錄
  if (!ADVENTURE_TEST_TOOLS_ENABLED) return;
  resetInventory();
  // 用 LEVELS[0]（1-1）作為底板，然後 runtime 置換敵人
  currentLevelIndex = 0;
  loadLevel(0);
  initEquippedSword();
  initEquippedHammer();
  normalizeActiveWeaponSlot();
  applyAdventureTestLoadout();
  restart({ keepHp: false, preserveBringDog: false });
  applyAdventureTestLoadout();

  // 清除原有敵人，放入測試組合
  enemies.length = 0;
  const mkE = (x, variant, tier) => ({
    x, y: GROUND_Y - CONFIG.ENEMY_H,
    w: CONFIG.ENEMY_W, h: CONFIG.ENEMY_H,
    vx: -CONFIG.ENEMY_SPEED, hp: 2,
    patrol: x, patrolRange: 80,
    active: true, hitFlash: 0,
    type: 'scorpion', variant, tier,
    baseVx: CONFIG.ENEMY_SPEED,
    runtimeId: nextEnemyRuntimeId++,
    hurtCooldown: 0, lastSwordSwingId: 0, lastHammerSwingId: 0,
  });
  enemies.push(mkE(500,  'normal',    'normal')); // 1. 普通/普通
  enemies.push(mkE(750,  'fastBody',  'normal')); // 2. 快腿/普通
  enemies.push(mkE(1000, 'normal',    'fast'));    // 3. 普通/急速 tier（有紅橘 tint）
  enemies.push(mkE(1300, 'heavyBody', 'normal')); // 4. 重甲/普通

  // 橘子怪測試
  orangeNemeses.length = 0;
  const mkO = (x, variant, tier) => ({
    x, y: GROUND_Y - CONFIG.ORANGE_H,
    w: CONFIG.ORANGE_W, h: CONFIG.ORANGE_H,
    sprayDir: -1, phase: 'idle', phaseTimer: 0, sprayActive: false,
    type: 'balloonNemesis', variant, tier,
  });
  orangeNemeses.push(mkO(1800, 'straight', 'normal')); // 5. 直線/普通
  orangeNemeses.push(mkO(2300, 'straight', 'fast'));   // 6. 直線/急速（計時較快）
  // dual/fan 只有資料，本版不做實體（TODO 標記）
  // orangeNemeses.push(mkO(2800, 'dual', 'normal')); // TODO：dual attackPattern 待實作

  const pauseEl = document.getElementById('pause-overlay');
  if (pauseEl) { pauseEl.style.display = 'none'; pauseEl.classList.remove('active'); }
  gameState = 'playing';
  showHint('Enemy Variant+Tier 測試關：觀察速度 / 大小 / tint 差異', 280);
  console.log('[TestTools] startEnemyVariantTestLevel: 4 scorpions + 2 oranges');
}

// 測試版：直接跳第 3 關（完整重設 runtime state，不清玩家身份/V幣/Firebase）
// v0.3.51：測試入口也走 preload gate（跳到哪、載哪；載完才開始）
function startAdventureTestLevel3() { return runWithAssetGate(['common', 'chapter1'], '派對島準備中...', () => startAdventureTestLevel3__impl()); }
function startAdventureTestLevel3__impl() {
  try { advMarkTestEntry('startAdventureTestLevel3'); } catch (e) {} // v0.3.63：測試捷徑 → 只能是測試紀錄
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
  try { if (advAttempt) advAttempt.ended = true; const _d = advLoad(); if (_d.active) { advArchiveRun(_d, _d.active, _d.active.status === 'test_only' ? 'test_only' : 'abandoned'); _d.active = null; advSave(_d); } } catch (e) {} // v0.3.63：重置測試狀態 = 封存舊的一趟，從 1-1 開新的一趟
  try { if (typeof rpgResetForTest === 'function') rpgResetForTest(); } catch (e) { console.warn('[RPG] 測試重置失敗', e); } // v0.3.61：首次教學可以重測
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
  // v0.3.28-polish：第二章 shortName 已含 stageId（例如「2-1 橘子油危機」），避免重複成「2-1 2-1 …」
  const _lvLabel = lv.shortName || lv.name || '';
  const progressLabel = (lv.stageId && _lvLabel.startsWith(lv.stageId))
    ? _lvLabel
    : [lv.stageId || '', _lvLabel].filter(Boolean).join(' ');

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
  if (typeof rpgHandleKey === 'function' && rpgHandleKey(e)) return; // v0.3.59：RPG 對話中只處理對話按鍵
  if (typeof rpgNotesOpen === 'function' && rpgNotesOpen()) { if (e.code === 'Escape' || e.code === 'Enter') rpgCloseNotes(); e.preventDefault(); return; } // v0.3.61：提示筆記開著
  if (typeof orangeKingVictoryConfirmOpen !== 'undefined' && orangeKingVictoryConfirmOpen) { // v0.3.61：勝利確認視窗
    if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyZ') confirmOrangeKingVictory();
    e.preventDefault(); return;
  }
  // v0.3.57：開始冒險前，鍵盤不操作遊戲（Enter / 空白鍵 = 開始冒險，需已在橫向）
  if (isGameStartGateActive()) {
    if ((e.code === 'Enter' || e.code === 'Space') && getStartGateStep() === 'start') { startAdventureFromGate(); e.preventDefault(); }
    return;
  }
  if (e.code === 'Escape') {
    // v0.3.57：秘笈從暫停選單開啟 → ESC 關秘笈、回到暫停選單
    if (typeof isGuidebookOpen === 'function' && isGuidebookOpen()) { closeGuidebook(); e.preventDefault(); return; }
    // v0.3.33：最上層是發現物品視窗 → ESC 等同「收進背包，繼續冒險」
    if (isDiscoveryItemModalOpen()) { closeDiscoveryItemModal(); return; }
    // v0.3.29-fix-1：ESC 先關最上層 overlay — 暫停背包開著時只關背包，回到暫停選單
    if (isPauseBagOpen()) { closePauseBagBackToPauseMenu(); return; }
    if (gameState === 'playing') { pauseGame(); return; }
    if (gameState === 'paused')  { resumeGame(); return; }
    return;
  }
  // v0.3.36：橘子王機關美術定位工具（測試版 F4）— 開啟時數字鍵 / 方向鍵 / [ ] 由工具使用
  if (handleOrangeKingMachineCalibKey(e)) return;
  // 數字鍵切換武器
  if (e.code === 'Digit1' && gameState === 'playing') {
    if (equippedSword.id) activeSlot = 'sword';
    else showHint('尚未擁有基礎氣球劍', 150);
    return;
  }
  if (e.code === 'Digit2' && gameState === 'playing') {
    if (isOrangeKingStageActive()) { showHint(BOSS_SWORD_ONLY_MSG, 150); return; } // v0.3.46：2-4 只限劍
    if (equippedHammer.id) activeSlot = 'hammer';
    else showHint('尚未擁有基礎氣球槌', 150);
    return;
  }
  // v0.3.56：測試版 ` 鍵 → 狗狗視覺校準面板
  if (ADVENTURE_TEST_TOOLS_ENABLED && e.code === 'Backquote') { toggleDogCalibPanel(); e.preventDefault(); return; }
  // 測試版：F3 開 / 關 projectile orange hitbox debug 紅框（不與 F7 / F9 / F10 互斥）
  if (ADVENTURE_TEST_TOOLS_ENABLED && e.code === 'F3') {
    projectileOrangeHitboxDebugVisible = !projectileOrangeHitboxDebugVisible;
    showHint(projectileOrangeHitboxDebugVisible ? 'Projectile hitbox debug: ON' : 'Projectile hitbox debug: OFF', 120);
    e.preventDefault();
    return;
  }

  // 測試版：F6 開 / 關 asset status HUD（不與 F7 / F9 / F10 互斥）
  // F2 為備用鍵：部分瀏覽器的 F6 會把焦點跳到網址列
  if (ADVENTURE_TEST_TOOLS_ENABLED && (e.code === 'F6' || e.code === 'F2')) {
    assetStatusHudVisible = !assetStatusHudVisible;
    showHint(assetStatusHudVisible ? 'Asset Status HUD: ON' : 'Asset Status HUD: OFF', 120);
    e.preventDefault();
    return;
  }

  // 測試版：F7 開關 projectile oil shot calibration mode（與 F9 / F10 互斥）
  if (ADVENTURE_TEST_TOOLS_ENABLED && e.code === 'F7') {
    projectileOilShotCalibrationMode = !projectileOilShotCalibrationMode;
    if (projectileOilShotCalibrationMode) {
      chimneyOilCalibrationMode = false;
      dualOilCalibrationMode    = false;
    }
    showHint(projectileOilShotCalibrationMode
      ? '🎯 Projectile Oil Shot Align Mode ON（F7 關閉）\n請用 暫停→🥋 測試 Projectile Orange'
      : '🎯 Projectile Oil Shot Align Mode OFF', 180);
    e.preventDefault();
    return;
  }

  // F7 mode：H 切換 visual / oilHitbox / bodyHitbox；方向鍵、[ ]、; ' 依模式調整；S / R / C
  if (ADVENTURE_TEST_TOOLS_ENABLED && projectileOilShotCalibrationMode) {
    if (e.code === 'KeyH') {
      projectileOilShotEditMode =
        projectileOilShotEditMode === 'visual'    ? 'oilHitbox'  :
        projectileOilShotEditMode === 'oilHitbox' ? 'bodyHitbox' : 'visual';
      const label = { visual: 'VISUAL', oilHitbox: 'OIL HITBOX', bodyHitbox: 'BODY HITBOX' }[projectileOilShotEditMode];
      showHint('Projectile Edit Mode: ' + label, 100);
      e.preventDefault(); return;
    }
    const step = e.shiftKey ? 10 : 1;
    if (projectileOilShotEditMode === 'visual') {
      if (e.code === 'ArrowUp')    { projectileOilShotLocalY -= step; e.preventDefault(); return; }
      if (e.code === 'ArrowDown')  { projectileOilShotLocalY += step; e.preventDefault(); return; }
      if (e.code === 'ArrowLeft')  { projectileOilShotLocalX -= step; e.preventDefault(); return; }
      if (e.code === 'ArrowRight') { projectileOilShotLocalX += step; e.preventDefault(); return; }
      if (e.code === 'BracketLeft') {
        projectileOilShotScaleMult = Math.max(0.1, Math.round((projectileOilShotScaleMult - 0.05) * 100) / 100);
        e.preventDefault(); return;
      }
      if (e.code === 'BracketRight') {
        projectileOilShotScaleMult = Math.round((projectileOilShotScaleMult + 0.05) * 100) / 100;
        e.preventDefault(); return;
      }
    } else if (projectileOilShotEditMode === 'oilHitbox') {
      if (e.code === 'ArrowUp')    { projectileOilShotHitboxOffsetY -= step; e.preventDefault(); return; }
      if (e.code === 'ArrowDown')  { projectileOilShotHitboxOffsetY += step; e.preventDefault(); return; }
      if (e.code === 'ArrowLeft')  { projectileOilShotHitboxOffsetX -= step; e.preventDefault(); return; }
      if (e.code === 'ArrowRight') { projectileOilShotHitboxOffsetX += step; e.preventDefault(); return; }
      if (e.code === 'BracketLeft')  { projectileOilShotHitboxW = Math.max(10, projectileOilShotHitboxW - 5); e.preventDefault(); return; }
      if (e.code === 'BracketRight') { projectileOilShotHitboxW += 5; e.preventDefault(); return; }
      if (e.code === 'Semicolon')    { projectileOilShotHitboxH = Math.max(10, projectileOilShotHitboxH - 5); e.preventDefault(); return; }
      if (e.code === 'Quote')        { projectileOilShotHitboxH += 5; e.preventDefault(); return; }
    } else if (projectileOilShotEditMode === 'bodyHitbox') {
      if (e.code === 'ArrowUp')    { projectileOrangeBodyHitboxOffsetY -= step; e.preventDefault(); return; }
      if (e.code === 'ArrowDown')  { projectileOrangeBodyHitboxOffsetY += step; e.preventDefault(); return; }
      if (e.code === 'ArrowLeft')  { projectileOrangeBodyHitboxOffsetX -= step; e.preventDefault(); return; }
      if (e.code === 'ArrowRight') { projectileOrangeBodyHitboxOffsetX += step; e.preventDefault(); return; }
      if (e.code === 'BracketLeft')  { projectileOrangeBodyHitboxW = Math.max(10, projectileOrangeBodyHitboxW - 5); e.preventDefault(); return; }
      if (e.code === 'BracketRight') { projectileOrangeBodyHitboxW += 5; e.preventDefault(); return; }
      if (e.code === 'Semicolon')    { projectileOrangeBodyHitboxH = Math.max(10, projectileOrangeBodyHitboxH - 5); e.preventDefault(); return; }
      if (e.code === 'Quote')        { projectileOrangeBodyHitboxH += 5; e.preventDefault(); return; }
    }
    if (e.code === 'KeyS') { saveProjectileOilShotCalibrationSettings();  e.preventDefault(); return; }
    if (e.code === 'KeyR') { resetProjectileOilShotCalibrationSettings(); e.preventDefault(); return; }
    if (e.code === 'KeyC') { copyProjectileOilShotCalibrationSettings();  e.preventDefault(); return; }
  }

  // 測試版：F9 開關 chimney oil calibration mode（開啟時自動關閉 dual oil mode）
  if (ADVENTURE_TEST_TOOLS_ENABLED && e.code === 'F9') {
    chimneyOilCalibrationMode = !chimneyOilCalibrationMode;
    if (chimneyOilCalibrationMode) { dualOilCalibrationMode = false; projectileOilShotCalibrationMode = false; } // 互斥
    showHint(chimneyOilCalibrationMode
      ? '🎯 Oil Align Mode ON（F9 關閉）\n請使用 暫停→測試第二章 進入 2-1'
      : '🎯 Oil Align Mode OFF', 180);
    e.preventDefault();
    return;
  }

  // Calibration mode 方向鍵調整（chimney oil）
  if (ADVENTURE_TEST_TOOLS_ENABLED && chimneyOilCalibrationMode) {
    const step = e.shiftKey ? 10 : 1;
    if (e.code === 'ArrowUp')    { chimneyOilCalibrationOffsetY -= step; e.preventDefault(); return; }
    if (e.code === 'ArrowDown')  { chimneyOilCalibrationOffsetY += step; e.preventDefault(); return; }
    if (e.code === 'ArrowLeft')  { chimneyOilCalibrationOffsetX -= step; e.preventDefault(); return; }
    if (e.code === 'ArrowRight') { chimneyOilCalibrationOffsetX += step; e.preventDefault(); return; }
    if (e.code === 'KeyS') { saveChimneyOilCalibrationSettings(); e.preventDefault(); return; }
    if (e.code === 'KeyR') { resetChimneyOilCalibrationSettings(); e.preventDefault(); return; }
    if (e.code === 'KeyC') { copyChimneyOilCalibrationSettings(); e.preventDefault(); return; }
  }

  // 測試版：F10 開關 dual oil calibration mode（開啟時自動關閉 chimney oil mode）
  if (ADVENTURE_TEST_TOOLS_ENABLED && e.code === 'F10') {
    dualOilCalibrationMode = !dualOilCalibrationMode;
    if (dualOilCalibrationMode) { chimneyOilCalibrationMode = false; projectileOilShotCalibrationMode = false; } // 互斥
    showHint(dualOilCalibrationMode
      ? '🎯 Dual Oil Align Mode ON（F10 關閉）\n請用 暫停→🍊 測試 Dual Orange 進入 2-2'
      : '🎯 Dual Oil Align Mode OFF', 180);
    e.preventDefault();
    return;
  }

  // Dual oil calibration mode：Tab 切換 target，H 切換 editMode，方向鍵調整
  if (ADVENTURE_TEST_TOOLS_ENABLED && dualOilCalibrationMode) {
    const isLeft = dualOilCalibrationTarget === 'left';

    // Tab：切換 left ↔ right
    if (e.code === 'Tab') {
      dualOilCalibrationTarget = isLeft ? 'right' : 'left';
      showHint('🎯 target: ' + dualOilCalibrationTarget, 80);
      e.preventDefault(); return;
    }
    // H：切換 visual ↔ hitbox 編輯模式
    if (e.code === 'KeyH') {
      dualOilEditMode = dualOilEditMode === 'visual' ? 'hitbox' : 'visual';
      showHint('🎯 editMode: ' + dualOilEditMode.toUpperCase(), 80);
      e.preventDefault(); return;
    }

    const step = e.shiftKey ? 10 : 1;

    if (dualOilEditMode === 'visual') {
      // ── Visual mode：調整油圖位置 ──
      if (e.code === 'ArrowUp')    { if (isLeft) dualOilLeftOffsetY  -= step; else dualOilRightOffsetY -= step; e.preventDefault(); return; }
      if (e.code === 'ArrowDown')  { if (isLeft) dualOilLeftOffsetY  += step; else dualOilRightOffsetY += step; e.preventDefault(); return; }
      if (e.code === 'ArrowLeft')  { if (isLeft) dualOilLeftOffsetX  -= step; else dualOilRightOffsetX -= step; e.preventDefault(); return; }
      if (e.code === 'ArrowRight') { if (isLeft) dualOilLeftOffsetX  += step; else dualOilRightOffsetX += step; e.preventDefault(); return; }
    } else {
      // ── Hitbox mode：調整 hitbox offset + 寬高 ──
      if (e.code === 'ArrowUp')    { if (isLeft) dualOilLeftHitboxOffsetY  -= step; else dualOilRightHitboxOffsetY -= step; e.preventDefault(); return; }
      if (e.code === 'ArrowDown')  { if (isLeft) dualOilLeftHitboxOffsetY  += step; else dualOilRightHitboxOffsetY += step; e.preventDefault(); return; }
      if (e.code === 'ArrowLeft')  { if (isLeft) dualOilLeftHitboxOffsetX  -= step; else dualOilRightHitboxOffsetX -= step; e.preventDefault(); return; }
      if (e.code === 'ArrowRight') { if (isLeft) dualOilLeftHitboxOffsetX  += step; else dualOilRightHitboxOffsetX += step; e.preventDefault(); return; }
      // [ ] 調整寬度（最小 10）
      if (e.code === 'BracketLeft')  {
        if (isLeft) dualOilLeftHitboxW  = Math.max(10, dualOilLeftHitboxW  - 5);
        else        dualOilRightHitboxW = Math.max(10, dualOilRightHitboxW - 5);
        e.preventDefault(); return;
      }
      if (e.code === 'BracketRight') {
        if (isLeft) dualOilLeftHitboxW  += 5; else dualOilRightHitboxW += 5;
        e.preventDefault(); return;
      }
      // ; ' 調整高度（最小 10）
      if (e.code === 'Semicolon') {
        if (isLeft) dualOilLeftHitboxH  = Math.max(10, dualOilLeftHitboxH  - 5);
        else        dualOilRightHitboxH = Math.max(10, dualOilRightHitboxH - 5);
        e.preventDefault(); return;
      }
      if (e.code === 'Quote') {
        if (isLeft) dualOilLeftHitboxH  += 5; else dualOilRightHitboxH += 5;
        e.preventDefault(); return;
      }
    }

    if (e.code === 'KeyS') { saveDualOilCalibrationSettings();  e.preventDefault(); return; }
    if (e.code === 'KeyR') { resetDualOilCalibrationSettings(); e.preventDefault(); return; }
    if (e.code === 'KeyC') { copyDualOilCalibrationSettings();  e.preventDefault(); return; }
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
// v0.3.59：RPG 對話期間不接受遊戲按鍵（keys 在開關對話時都會清空）

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
  if (orangeKingInputLocked) return false; // v0.3.35：Boss 登場動畫期間暫時不能操作
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
  // v0.3.23 商店購買補血道具（繃帶 / 急救包），存於背包
  // 未來氣球秘笈製作補血道具可另行擴充此結構
  items: {
    bandage:     0,
    firstAidKit: 0,
  },
  // v0.3.32：重要物品（Boss 弱點筆記、未來的地圖碎片 / 特殊道具）
  // 以物品 id 為 key 的紀錄：{ id, type, name, emoji, title, noteText, acquiredAt }
  keyItems: {},
  // v0.3.11 Chapter1 核心流程旗標（一次性教學 / 保底機制，隨背包存檔）
  chapter1Flow: {
    dogIntroDone:                  false,
    dogCraftIntroDone:             false, // v0.3.18-fix-5：玩家是否已完成「製作氣球小狗」教學步驟
    forcedDogTripDone:             false,
    hammerRecipeGranted:           false,
    hammerMaterialGuaranteeDone:   false,
    hammerCraftIntroShown:         false,
    chapter1LowHpSupplyRescueDone: false,
  },
};

// ── 商店版本號（未來有新商品時遞增）─────────────
const SHOP_CATALOG_VERSION = 1;

// ── 商店商品資料表 ────────────────────────────
// 注意：繃帶 / 急救包不是氣球道具，不要放進氣球秘笈
const SHOP_ITEMS = {
  bandage: {
    id:          'bandage',
    name:        '繃帶',
    icon:        '🩹',
    priceCoins:  10,
    description: '回復 0.5 顆心，可放在背包裡備用。',
    maxCarry:    5,
    type:        'healing',
    healAmount:  0.5,
  },
  firstAidKit: {
    id:          'firstAidKit',
    name:        '急救包',
    icon:        '🚑',
    priceCoins:  25,
    description: '使用後直接補滿生命。最多攜帶 1 箱。',
    maxCarry:    1,
    type:        'healing',
    healFull:    true,
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
    effect:     '現做現吃！做好的當下小V就會吃掉，立刻回復 ❤️ +0.5（不會超過生命上限；生命已滿時不能製作，避免浪費材料）。',
    eatOnCraft: true, // v0.3.57：正式定案「現做現吃」，不再增加庫存
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
// v0.3.18-fix-4：製作關鍵道具（氣球小狗等）後統一刷新冒險進度 UI
// 從任何路徑（氣球秘笈、小V的家、結算頁）製作後都呼叫，確保 result panel 即時切換狀態
function refreshAdventureProgressAfterCraft() {
  // 結算面板（result overlay 顯示中才刷新）
  const resultOverlay = document.getElementById('result-overlay');
  if (resultOverlay && resultOverlay.style.display !== 'none') {
    if (typeof refreshResultDog === 'function')       refreshResultDog();
    if (typeof refreshResultBag === 'function')       refreshResultBag();
    if (typeof updateNextLevelButton === 'function')  updateNextLevelButton();
    if (typeof populateResultPanel === 'function' && document.getElementById('result-panel-body')) {
      populateResultPanel('clear');
    }
  }
  // v0.3.18-fix-5：小V的家用 home-screen（不是 home-overlay）
  const homeScreen = document.getElementById('home-screen');
  if (homeScreen && homeScreen.style.display !== 'none') {
    if (typeof renderHomeDog === 'function')          renderHomeDog();
    if (typeof renderHomeInventory === 'function')    renderHomeInventory();
    if (typeof renderHomeNextStage === 'function')    renderHomeNextStage();
  }
}

function craftItem(recipeId) {
  // 特殊：氣球狗 → 存入 playerHome 結構而非 craftedItems
  if (recipeId === 'balloonDog') {
    const flags = ensureChapter1Flags();
    if (playerInventory.balloonDog?.present) {
      // v0.3.18-fix-5：已有狗時，若教學旗標尚未完成，設定旗標讓流程繼續
      if (!flags.dogCraftIntroDone) {
        flags.dogCraftIntroDone = true;
        saveInventory();
        showHint('氣球小狗已經準備好了！接下來帶牠一起出發吧。', 220);
        refreshAdventureProgressAfterCraft();
        return true;
      }
      return false; // 教學已完成且有狗，不需再做
    }
    const recipe = RECIPES.find(r => r.id === 'balloonDog');
    if (!recipe) return false;
    clearInvalidDogTripPlan('before craft dog'); // v0.3.33-fix-2
    for (const [mat, qty] of Object.entries(recipe.cost)) {
      if ((playerInventory[mat] || 0) < qty) return false;
    }
    for (const [mat, qty] of Object.entries(recipe.cost)) {
      playerInventory[mat] -= qty;
    }
    if (!playerInventory.balloonDog) playerInventory.balloonDog = {};
    playerInventory.balloonDog.present   = true;
    playerInventory.balloonDog.turnsLeft = CONFIG.DOG_INITIAL_TURNS || 3;
    player.hp = Math.min(player.maxHp, player.hp + CONFIG.DOG_HEAL_AMOUNT);
    // v0.3.33-fix-2：製作小狗 ≠ 帶狗出發。新小狗待在小V的家，需另外按「帶狗出發」
    nextBringDog = false;
    if (gameState !== 'playing' && gameState !== 'paused') bringBalloonDog = false; // 上一關的同行狀態不延續到新小狗
    // v0.3.18-fix-5：製作成功後設定教學完成旗標
    flags.dogCraftIntroDone = true;
    saveInventory();
    if (typeof refreshResultHpStatus === 'function') refreshResultHpStatus();
    if (typeof renderHomeSupply === 'function') renderHomeSupply();
    refreshAdventureProgressAfterCraft();
    // v0.3.60：材料已扣、小狗已建立 → 狗狗開心汪汪（等製作成功演出先播一下）
    try { if (typeof rpgRequestUi === 'function') rpgRequestUi('rpg012_dog_crafted', 650); } catch (e) {}
    return true;
  }
// 製作道具（一般）
  const recipe = RECIPES.find(r => r.id === recipeId);
  if (!recipe) return false;
  // v0.3.57：氣球棒棒糖「現做現吃」— 生命已滿不能製作；成功扣材料並立刻 +0.5（不增加庫存）
  if (recipe.eatOnCraft) {
    const maxHp = player.maxHp || CONFIG.PLAYER_MAX_HP || 3;
    if (player.hp >= maxHp) { showHint('生命已經滿了，不用吃棒棒糖！', 160); return false; }
    for (const [mat, qty] of Object.entries(recipe.cost)) { if ((playerInventory[mat] || 0) < qty) return false; }
    for (const [mat, qty] of Object.entries(recipe.cost)) { playerInventory[mat] -= qty; }
    player.hp = Math.min(maxHp, player.hp + LOLLIPOP_HEAL);
    // v0.3.58：冒險中（暫停開秘笈）現做現吃 → 材料是真的用掉了，回滾到進關快照時也不退回
    if ((gameState === 'playing' || gameState === 'paused') && levelStartSnapshot) {
      for (const [mat, qty] of Object.entries(recipe.cost)) { if (typeof levelStartSnapshot[mat] === 'number') levelStartSnapshot[mat] = Math.max(0, levelStartSnapshot[mat] - qty); }
    }
    saveInventory();
    // 失敗畫面做的 → 重試帶著補好的血；材料也要真的扣掉（重試會還原進關快照，避免「補了血、材料又退回」）
    if ((gameState === 'failed' || gameState === 'gameover') && levelStartSnapshot) {
      for (const mat of Object.keys(recipe.cost)) { if (typeof levelStartSnapshot[mat] === 'number') levelStartSnapshot[mat] = playerInventory[mat]; }
    }
    if (typeof syncOutOfAdventureHpToRetry === 'function') syncOutOfAdventureHpToRetry();
    refreshAllHpDisplays();
    if (typeof renderHomeSupply === 'function') renderHomeSupply();
    return true;
  }

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
  // v0.3.35-fix-1：做出劍 / 槌後，結算頁與小V的家的「下一關」狀態要立刻解鎖（2-4 武器檢查）
  if (recipeId === 'basicSword' || recipeId === 'basicHammer') refreshAdventureProgressAfterCraft();
  // v0.3.60：氣球槌真的做好、已加入物品資料 → 星靈教學（一般三段模式）
  if (recipeId === 'basicHammer') { try { if (typeof rpgRequestUi === 'function') rpgRequestUi('rpg011_hammer_crafted', 800); } catch (e) {} }
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
      // v0.3.23 migration：確保 items 欄位存在（舊存檔沒有此欄位）
      merged.items = Object.assign(
        {}, INVENTORY_DEFAULTS.items, parsed.items || {}
      );
      // v0.3.32 migration：舊存檔沒有 keyItems 時補空物件
      merged.keyItems = Object.assign({}, parsed.keyItems || {});
      return merged;
    }
  } catch(e) { /* 存檔損壞時直接用預設值 */ }
  // 深複製 defaults（避免共用同一個 craftedItems 物件參考）
  const d = Object.assign({}, INVENTORY_DEFAULTS);
  d.craftedItems = Object.assign({}, INVENTORY_DEFAULTS.craftedItems);
  d.chapter1Flow = Object.assign({}, INVENTORY_DEFAULTS.chapter1Flow);
  d.items        = Object.assign({}, INVENTORY_DEFAULTS.items);
  d.keyItems     = {};
  return d;
}

// v0.3.27-test-2：橘子家族測試關期間，補給道具是 runtime-only；
// 若期間有任何流程呼叫 saveInventory()，存檔中的 items 會使用進入測試關前的數量。
let testSupplyOriginalItems = null;

function saveInventory() {
  try {
    let data = playerInventory;
    if (testSupplyOriginalItems) {
      data = Object.assign({}, playerInventory, { items: Object.assign({}, testSupplyOriginalItems) });
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch(e) {}
}

function resetInventory() {
  Object.assign(playerInventory, INVENTORY_DEFAULTS);
  playerInventory.craftedItems       = Object.assign({}, INVENTORY_DEFAULTS.craftedItems);
  playerInventory.unlockedRecipes    = Object.assign({}, INVENTORY_DEFAULTS.unlockedRecipes);
  playerInventory.uniqueCollectibles = Object.assign({}, INVENTORY_DEFAULTS.uniqueCollectibles);
  playerInventory.balloonDog         = Object.assign({}, INVENTORY_DEFAULTS.balloonDog);
  playerInventory.chapter1Flow       = Object.assign({}, INVENTORY_DEFAULTS.chapter1Flow);
  playerInventory.items              = Object.assign({}, INVENTORY_DEFAULTS.items);
  playerInventory.keyItems           = {}; // v0.3.32
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
    + (typeof hasValidPrepCheckpoint === 'function' && hasValidPrepCheckpoint()
      ? '<div class="fi-hint">↩ 返回整備：回到' + getChapterDisplayTitle(prepCheckpoint.fromLevelIndex) + '過關後的準備，可以補血、購物、製作，再重新出發</div>'
      : '<div class="fi-hint">重試會回到本關開始狀態</div>');
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
  foundBossNote:            null,  // v0.3.32：本關找到的 Boss 弱點筆記 { title, noteText, name }
  chapter2Complete:         false, // v0.3.35：擊敗 2-4 橘子王
  pendingKeyItems:          {},    // v0.3.33-fix-1：本關找到、通關才正式寫入的重要物品
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
  swordSwingId: 0,      // v0.3.18-test-2：每次揮劍遞增，讓同一次揮劍對同一敵人只命中一次
  hammerSwingId: 0,     // v0.3.18-fix-2：每次槌擊遞增，防同一次槌擊多幀重複命中 heavy
  swordAnimTimer: 0,   // 揮劍視覺動畫獨立計時（與 hitbox 分開）
  hammerAnimTimer: 0,  // 槌子視覺動畫獨立計時
  // Stats
  coinsCollected: 0,
  balloonsCollected: 0,
  enemiesDefeated: 0,
};

// ── Level generation ──────────────────────────
// All positions are in world coordinates.

// v0.3.27-terrain：runtime-only 地面缺口（只在「⛰️ 測試第二章地形」使用）
// 每個缺口 { x, w }：缺口範圍內沒有地面，玩家會掉到坑底平台上（不是落穴，不會死亡）。
// 正式關卡一律是空陣列（loadLevel 會清空），地面行為與原本完全相同。
const groundGaps = [];

// 玩家中心點所在的地面缺口（沒有則回傳 null）
function getGroundGapUnderPlayer() {
  if (groundGaps.length === 0) return null;
  const cxp = player.x + player.w / 2;
  for (const g of groundGaps) {
    if (cxp >= g.x && cxp <= g.x + g.w) return g;
  }
  return null;
}

// v0.3.28：地面缺口的坑底高度（玩家高 80px；坑底需低於 GROUND_Y+59，
// 玩家頭頂才會低於飛行油彈 damage hitbox 底端，+66 留安全空間）
const GROUND_GAP_FLOOR_Y = GROUND_Y + 66;

// v0.3.28：產生坑底平台（延伸到畫面底部），搭配關卡的 buildGroundGaps 使用
function groundGapFloor(x, w) {
  return [{ x, y: GROUND_GAP_FLOOR_Y, w, h: CANVAS_H - GROUND_GAP_FLOOR_Y }];
}

// v0.3.28：第二章正式關卡的敵人建構 helper（欄位與既有橘子邏輯一致）
// surfaceY = 橘子站立面的 y（地面 GROUND_Y 或平台頂端）
function makeChapter2NormalOrange(x, surfaceY) {
  return {
    x, y: surfaceY - CONFIG.ORANGE_H, w: CONFIG.ORANGE_W, h: CONFIG.ORANGE_H,
    sprayDir: -1, phase: 'idle', phaseTimer: 0, sprayActive: false,
    type: 'balloonNemesis', variant: 'straight', tier: 'normal',
  };
}
function makeChapter2ChimneyOrange(x, surfaceY, phaseTimer = 0) {
  return {
    x, y: surfaceY - CONFIG.ORANGE_H, w: CONFIG.ORANGE_W, h: CONFIG.ORANGE_H,
    type: 'chimneyOrange', sprayPhase: 'idle', phaseTimer, sprayActive: false, active: true,
  };
}
function makeChapter2DualOrange(x, surfaceY, phaseTimer = 0) {
  return {
    x, y: surfaceY - CONFIG.ORANGE_H, w: CONFIG.ORANGE_W, h: CONFIG.ORANGE_H,
    type: 'dualNozzleOrange', sprayPhase: 'idle', phaseTimer, sprayActive: false, active: true,
  };
}
function makeChapter2ProjectileOrange(x, surfaceY, phaseTimer = 0) {
  return {
    x, y: surfaceY - CONFIG.ORANGE_H, w: CONFIG.ORANGE_W, h: CONFIG.ORANGE_H,
    active: true, phase: 'idle', phaseTimer, shotSpawned: false,
  };
}
// v0.3.30：第二章蠍子（輔助敵人，讓氣球劍 / 氣球槌在第二章仍有用途）
// 格式與 1-3 的 mkEnemy 相同；hp 由 loadLevel 依 ENEMY_VARIANTS 重新設定（normal 1 / heavyBody 3）
// 注意：蠍子會貼地巡邏，巡邏範圍不可跨過地面缺口（坑道）
function makeChapter2Scorpion(x, patrolRange, variant = 'normal') {
  return {
    x, y: GROUND_Y - CONFIG.ENEMY_H,
    w: CONFIG.ENEMY_W, h: CONFIG.ENEMY_H,
    vx: -CONFIG.ENEMY_SPEED, hp: 2,
    patrol: x, patrolRange,
    active: true, hitFlash: 0,
    type: 'scorpion', variant, tier: 'normal',
    baseVx: CONFIG.ENEMY_SPEED,
  };
}

// v0.3.28：圓氣球依攜帶上限補生成（同 1-2 規則：最多補到 ROUND_BALLOON_CARRY_LIMIT 顆）
// spots = [[x, yOff], ...]，依序取用
function buildChapter2RoundBalloons(spots) {
  const have    = Number(playerInventory.roundBalloon || 0);
  const missing = Math.max(0, ROUND_BALLOON_CARRY_LIMIT - have);
  return spots.slice(0, missing).map(([x, yOff]) => ({
    x, y: GROUND_Y - yOff, collected: false, bobOffset: Math.random() * Math.PI * 2,
  }));
}

// v0.3.28：2-2 改為正式「雙噴嘴封鎖線」後，以 2-2 為底板的測試關（橘子家族 / Projectile Orange）
// 改用舊 2-2 的平台配置，維持原本測試環境不變
function applyLegacy22TestTerrain() {
  platforms.length = 0;
  groundGaps.length = 0;
  [
    { x: 6100, y: GROUND_Y-140, w: 220, h: 20 },
    { x: 6500, y: GROUND_Y-140, w: 220, h: 20 },
    { x: 7300, y: GROUND_Y-140, w: 220, h: 20 },
  ].forEach(p => platforms.push(p));
}

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
      { triggerX: 1700, msg: '⚠️ 尖刺不能攻擊，請跳過！',          shown: false, duration: 240, rpgReplacedBy: 'rpg002_first_spike' },  // v0.3.59
      { triggerX: 3350, msg: '🍊 橘子怪會噴果皮油！等空檔再通過', shown: false, duration: 270, rpgReplacedBy: 'rpg005_first_orange' }, // v0.3.59
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
    buildEnemies: () => {
      // v0.3.16：第一章第 3 節正式三段式蠍子配置
      // 前段：normal scorpion × 2（熟悉槌子節奏）
      // 中段：heavyBody × 1（第一次正式登場，讓玩家觀察並辨識）
      // 後段：normal + heavyBody 混合（實際處理差異）
      // 不使用 fastBody（尚無正式美術，不放進正式關卡流程）
      const mkEnemy = (x, patrol, range, variant, tier) => ({
        x, y: GROUND_Y - CONFIG.ENEMY_H,
        w: CONFIG.ENEMY_W, h: CONFIG.ENEMY_H,
        vx: -CONFIG.ENEMY_SPEED, hp: 2,
        patrol, patrolRange: range,
        active: true, hitFlash: 0,
        type: 'scorpion', variant, tier,
        baseVx: CONFIG.ENEMY_SPEED,
      });
      return [
        // 前段：2 隻 normal，讓玩家先熟悉槌子節奏
        mkEnemy(3200, 3200, 110, 'normal',    'normal'),
        mkEnemy(3700, 3700, 120, 'normal',    'normal'),
        // 中段：1 隻 heavyBody 首次登場，周圍留空讓玩家仔細觀察
        // 放在 4400 平坦區域，遠離尖刺與橘子怪，降低第一次辨識難度
        mkEnemy(4400, 4400, 100, 'heavyBody', 'normal'),
        // 後段：normal + heavyBody 混合，讓玩家實際處理兩種差異
        mkEnemy(5200, 5200, 110, 'normal',    'normal'),
        mkEnemy(5700, 5700, 100, 'heavyBody', 'normal'),
      ];
    },
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

  // ════════════════════════════════════════════════════════════
  //  Chapter 2 正式關卡（v0.3.28）：2-1 / 2-2 / 2-3
  //  ──────────────────────────────────────────────────────────
  //  2-1 橘子油危機入門：普通橘子 + 煙囪橘子
  //  2-2 雙噴嘴封鎖線：雙噴嘴橘子為主，搭配普通 / 煙囪
  //  2-3 飛行油彈訓練場：飛行油彈橘子為主，兼橘子家族總複習
  //  不使用 fan orange；舊「複合挑戰」已移出正式流程。
  //  2-4 保留給下一階段 Boss 關。
  //  地形：平台 { x, y, w, h }（top-only 碰撞）；低處坑道用 buildGroundGaps + 坑底平台
  //        （坑底 GROUND_GAP_FLOOR_Y，不是落穴，不會死亡）
  // ════════════════════════════════════════════════════════════

  // Stage 2-1：橘子油危機入門
  {
    chapterId:   2,
    stageId:     '2-1',
    displayName: '第 2-1 關：橘子油危機',
    name:        '第 2-1 關：橘子油危機',
    shortName:   '2-1 橘子油危機',
    length:      5400,               // FINISH_X = 5200
    scrollSpeed: 1,
    bg:          'stage1',
    hints: [
      { triggerX:   30, msg: '🍊 第二章：橘子油會讓氣球破掉！看準空檔再通過', shown: false, duration: 270 },
      { triggerX: 2250, msg: '🔥 煙囪橘子會往上噴油柱，別在它頭上跳！',       shown: false, duration: 260 },
    ],
    buildPlatforms: () => [
      { x:  380, y: GROUND_Y -  70, w: 200, h: 22 },  // 入口短平台
      { x:  600, y: GROUND_Y - 100, w: 200, h: 22 },  // 普通橘子(850) 前的上路（在噴油範圍上方）
      { x: 1380, y: GROUND_Y - 110, w: 220, h: 22 },  // 普通橘子(1650) 前的上路
      ...groundGapFloor(1950, 220),                    // 小凹洞（低處，有金幣引導）
      { x: 2700, y: GROUND_Y -  60, w: 200, h: 22 },  // 煙囪橘子(2500) 後的安全等待區
      { x: 3130, y: GROUND_Y - 110, w: 220, h: 22 },  // 普通橘子(3400) 前的上路
      { x: 3950, y: GROUND_Y -  70, w: 200, h: 22 },  // 煙囪橘子(4300) 前的等待區
      { x: 4500, y: GROUND_Y -  90, w: 200, h: 22 },  // 煙囪橘子(4300) 後的平台
    ],
    buildGroundGaps: () => [ { x: 1950, w: 220 } ],
    buildSpikes: () => [],
    buildCoins: () => {
      const placements = [
        [250,55],[330,55],
        [420,105],[480,105],[540,105],             // 入口平台
        [640,135],[700,135],[760,135],             // 上路
        [1000,55],[1060,55],
        [1420,145],[1480,145],[1540,145],          // 上路
        [1760,55],
        [2020,-31],[2100,-31],                     // 凹洞底
        [2300,55],[2380,55],                       // 煙囪橘子前（地面安全）
        [2740,95],[2800,95],[2860,95],             // 等待區
        [3050,55],
        [3170,145],[3230,145],[3290,145],          // 上路
        [3550,55],[3620,55],
        [3720,140],[3800,140],[3880,140],          // v0.3.30：蠍子(3800)上方，跳過 / 擊退後的小獎勵
        [3990,105],[4050,105],[4110,105],          // 等待區
        [4540,125],[4600,125],[4660,125],
        [4850,55],[4950,55],
      ];
      return placements.map(([x,yOff]) => ({ x, y: GROUND_Y-yOff, collected:false, bobOffset:Math.random()*Math.PI*2 }));
    },
    buildBalloons: () => [1180, 2240, 3800, 4800].map(x => ({
      x, y: GROUND_Y-85, collected: false, bobOffset: Math.random()*Math.PI*2
    })),
    buildRoundBalloons: () => buildChapter2RoundBalloons([[2800, 160]]),
    // v0.3.30：中後段普通蠍子 x1（普通橘子 3400 之後、煙囪橘子 4300 之前，用氣球劍解決）
    buildEnemies: () => [ makeChapter2Scorpion(3800, 90, 'normal') ],
    buildOranges: () => [850, 1650, 3400].map(x => makeChapter2NormalOrange(x, GROUND_Y)),
    buildChimneyOranges: () => [
      { x: 2500, phaseTimer: 0   },
      { x: 4300, phaseTimer: 900 },
    ].map(d => makeChapter2ChimneyOrange(d.x, GROUND_Y, d.phaseTimer)),
    buildDualNozzleOranges: () => [],
    buildProjectileOranges: () => [],
  },

  // Stage 2-2：雙噴嘴封鎖線
  {
    chapterId:   2,
    stageId:     '2-2',
    displayName: '第 2-2 關：雙噴嘴封鎖線',
    name:        '第 2-2 關：雙噴嘴封鎖線',
    shortName:   '2-2 雙噴嘴封鎖線',
    length:      6400,               // FINISH_X = 6200
    scrollSpeed: 1,
    bg:          'stage1',
    hints: [
      { triggerX:   30, msg: '🍊 第 2-2 關：雙噴嘴封鎖線！',                       shown: false, duration: 240 },
      { triggerX: 2050, msg: '⏳ 雙噴嘴會往左右噴油！在等待區看準冷卻空檔再通過', shown: false, duration: 280 },
    ],
    buildPlatforms: () => [
      { x:  300, y: GROUND_Y -  70, w: 180, h: 22 },  // 入口平台
      { x:  520, y: GROUND_Y - 110, w: 180, h: 22 },  // 普通橘子(750) 前的上路
      { x: 1200, y: GROUND_Y -  70, w: 180, h: 22 },  // 煙囪橘子(1500) 前的等待區
      { x: 2150, y: GROUND_Y -  80, w: 200, h: 22 },  // 雙噴嘴(2500) 前的等待 / 觀察區
      { x: 2420, y: GROUND_Y - 140, w: 220, h: 22 },  // 雙噴嘴(2500) 上方的上路
      { x: 3030, y: GROUND_Y - 110, w: 220, h: 22 },  // 普通橘子(3300) 前的上路
      ...groundGapFloor(3650, 230),                    // 低處安全區
      { x: 3940, y: GROUND_Y -  75, w: 160, h: 22 },  // 雙噴嘴(4200) 前的等待區
      { x: 4130, y: GROUND_Y - 140, w: 220, h: 22 },  // 雙噴嘴(4200) 上方的上路
      { x: 4850, y: GROUND_Y -  70, w: 200, h: 22 },  // 煙囪橘子(5150) 前的等待區
      { x: 5350, y: GROUND_Y -  90, w: 200, h: 22 },  // 煙囪橘子(5150) 後的平台
    ],
    buildGroundGaps: () => [ { x: 3650, w: 230 } ],
    buildSpikes: () => [],
    buildCoins: () => {
      const placements = [
        [200,55],
        [340,105],[400,105],[460,105],             // 入口平台
        [560,145],[620,145],[680,145],             // 上路
        [900,55],[960,55],
        [1240,105],[1300,105],[1360,105],          // 等待區
        [1650,55],[1720,55],[1800,55],
        [2190,115],[2250,115],[2310,115],          // 雙噴嘴前等待區
        [2460,175],[2530,175],[2600,175],          // 雙噴嘴上方上路
        [2850,55],[2920,55],
        [3070,145],[3130,145],[3190,145],          // 上路
        [3420,55],[3480,55],
        [3720,-31],[3810,-31],                     // 低處
        [3980,110],[4060,110],                     // 雙噴嘴前等待區
        [4170,175],[4310,175],                     // 雙噴嘴上方上路
        [4550,55],
        [4620,140],[4680,140],[4740,140],[4800,140], // v0.3.30：重甲蠍子(4680)上方的通過獎勵
        [4890,105],[4950,105],[5010,105],          // 等待區
        [5390,125],[5450,125],[5510,125],
        [5700,55],
      ];
      return placements.map(([x,yOff]) => ({ x, y: GROUND_Y-yOff, collected:false, bobOffset:Math.random()*Math.PI*2 }));
    },
    buildBalloons: () => [
      [1100, 85], [2000, 85], [3560, 85], [4240, 200], [5800, 85],
    ].map(([x, yOff]) => ({ x, y: GROUND_Y-yOff, collected: false, bobOffset: Math.random()*Math.PI*2 })),
    buildRoundBalloons: () => buildChapter2RoundBalloons([[2530, 215], [5450, 185]]),
    // v0.3.30：重甲蠍子 x1（第二隻雙噴嘴 4200 之後、煙囪橘子 5150 之前的平地，用氣球槌處理）
    buildEnemies: () => [ makeChapter2Scorpion(4680, 80, 'heavyBody') ],
    buildOranges: () => [750, 3300].map(x => makeChapter2NormalOrange(x, GROUND_Y)),
    buildChimneyOranges: () => [
      { x: 1500, phaseTimer: 0   },
      { x: 5150, phaseTimer: 700 },
    ].map(d => makeChapter2ChimneyOrange(d.x, GROUND_Y, d.phaseTimer)),
    buildDualNozzleOranges: () => [
      { x: 2500, phaseTimer: 0   },
      { x: 4200, phaseTimer: 800 },
    ].map(d => makeChapter2DualOrange(d.x, GROUND_Y, d.phaseTimer)),
    buildProjectileOranges: () => [],
    // v0.3.31：氣球小狗尋寶 — 隱藏金幣寶箱（只有帶氣球小狗才看得到、拿得到）
    // 放在低處安全區（坑道 3650~3880）裡：遠離雙噴嘴 4200 油線、煙囪 5150、重甲蠍子 4600~4808
    // 拾取判定為以 (x, y) 為中心 ±50px；玩家要走進坑道才碰得到
    hiddenTreasure: {
      type:        'goldChest',
      name:        '隱藏金幣寶箱',
      rewardCoins: 40,
      x:           3790,
      y:           GROUND_Y + 14,
      found:       false,
      emoji:       '🪙',
      foundMsg:    '氣球小狗找到隱藏金幣寶箱！金幣 +40！',
    },
  },

  // Stage 2-3：飛行油彈訓練場（橘子家族總複習）
  {
    chapterId:   2,
    stageId:     '2-3',
    displayName: '第 2-3 關：飛行油彈訓練場',
    name:        '第 2-3 關：飛行油彈訓練場',
    shortName:   '2-3 飛行油彈訓練場',
    length:      7200,               // FINISH_X = 7000
    scrollSpeed: 1,
    bg:          'stage1',
    hints: [
      { triggerX:   30, msg: '🥋 第 2-3 關：飛行油彈訓練場！',             shown: false, duration: 240 },
      { triggerX: 1750, msg: '⬇️ 躲進低處，飛行油彈會從頭上飛過！',      shown: false, duration: 260 },
      { triggerX: 4150, msg: '🎯 前方有高處砲台！走下路比較安全',          shown: false, duration: 260 },
    ],
    buildPlatforms: () => [
      { x:  340, y: GROUND_Y -  70, w: 180, h: 22 },  // 入口平台
      { x:  540, y: GROUND_Y - 110, w: 180, h: 22 },  // 普通橘子(750) 前的上路
      { x: 1150, y: GROUND_Y -  70, w: 180, h: 22 },  // 煙囪橘子(1450) 前的等待區
      ...groundGapFloor(1900, 440),                    // 第一個凹洞：躲飛行油彈
      { x: 2380, y: GROUND_Y - 120, w: 240, h: 22 },  // 飛行油彈橘子(2520) 上方的上路
      { x: 3080, y: GROUND_Y -  80, w: 180, h: 22 },  // 雙噴嘴(3400) 前的等待區
      { x: 3310, y: GROUND_Y - 140, w: 220, h: 22 },  // 雙噴嘴(3400) 上方的上路
      { x: 4250, y: GROUND_Y - 110, w: 200, h: 22 },  // 高風險上路（會被砲台油彈掃到）
      { x: 4600, y: GROUND_Y - 120, w: 300, h: 22 },  // 高處砲台平台（飛行油彈橘子 4700）
      { x: 5230, y: GROUND_Y - 110, w: 200, h: 22 },  // 普通橘子(5500) 前的上路
      ...groundGapFloor(5800, 240),                    // 第二個凹洞
      { x: 6400, y: GROUND_Y -  90, w: 200, h: 22 },  // 煙囪橘子(6200) 後的平台
    ],
    buildGroundGaps: () => [ { x: 1900, w: 440 }, { x: 5800, w: 240 } ],
    buildSpikes: () => [],
    buildCoins: () => {
      const placements = [
        [200,55],
        [380,105],[440,105],[490,105],             // 入口平台
        [580,145],[640,145],[700,145],             // 上路
        [880,55],[950,55],[1020,55],
        [1190,105],[1250,105],[1310,105],          // 等待區
        [1600,55],[1680,55],[1760,55],
        [1980,-31],[2060,-31],[2140,-31],[2220,-31], // 凹洞底（引導玩家知道低處可以走）
        [2420,155],[2480,155],[2600,155],          // 油彈橘子上方上路
        [2750,55],[2820,55],[2890,55],
        [3120,115],[3180,115],[3240,115],          // 雙噴嘴前等待區
        [3350,175],[3490,175],                     // 雙噴嘴上方上路
        [3750,55],[3820,55],
        [4000,55],
        [4290,145],[4350,145],[4410,145],          // 高風險上路
        [4650,55],[4780,55],[4880,55],             // 砲台下方地面（安全）
        [5050,55],[5120,55],
        [5270,145],[5330,145],[5390,145],          // 上路
        [5640,55],[5700,55],
        [5880,-31],[5960,-31],                     // 第二個凹洞底
        [6440,125],[6500,125],[6560,125],
        [6750,55],
        [6810,55],[6870,55],[6930,55],             // v0.3.30：重甲蠍子(6600)後方、終點前的獎勵
      ];
      return placements.map(([x,yOff]) => ({ x, y: GROUND_Y-yOff, collected:false, bobOffset:Math.random()*Math.PI*2 }));
    },
    buildBalloons: () => [
      [1100, 85], [2700, 85], [3420, 205], [3950, 85], [5150, 85], [6300, 85],
    ].map(([x, yOff]) => ({ x, y: GROUND_Y-yOff, collected: false, bobOffset: Math.random()*Math.PI*2 })),
    buildRoundBalloons: () => buildChapter2RoundBalloons([[2500, 215], [4350, 210]]),
    // v0.3.30：普通蠍子 x1（雙噴嘴 3400 前，飛行油彈只往左飛不會掃到這裡）
    //          重甲蠍子 x1（煙囪橘子 6200 之後、終點前的最後戰鬥段）
    buildEnemies: () => [
      makeChapter2Scorpion(3050, 80, 'normal'),
      makeChapter2Scorpion(6600, 70, 'heavyBody'),
    ],
    buildOranges: () => [750, 5500].map(x => makeChapter2NormalOrange(x, GROUND_Y)),
    buildChimneyOranges: () => [
      { x: 1450, phaseTimer: 0   },
      { x: 6200, phaseTimer: 600 },
    ].map(d => makeChapter2ChimneyOrange(d.x, GROUND_Y, d.phaseTimer)),
    buildDualNozzleOranges: () => [
      { x: 3400, phaseTimer: 0 },
    ].map(d => makeChapter2DualOrange(d.x, GROUND_Y, d.phaseTimer)),
    buildProjectileOranges: () => [
      { x: 2520, surfaceY: GROUND_Y,       phaseTimer: 0   },  // 第一隻：地面，凹洞右側
      { x: 4700, surfaceY: GROUND_Y - 120, phaseTimer: 900 },  // 高處砲台
    ].map(d => makeChapter2ProjectileOrange(d.x, d.surfaceY, d.phaseTimer)),
    // v0.3.32：氣球小狗尋寶 — 橘子王弱點筆記（只有帶氣球小狗才看得到、拿得到）
    // 放在上路平台(5230)前的地面：高處砲台 4700 的油彈只往左飛、普通橘子 5500 的噴油區在 5360 以右、
    // 煙囪 6200 / 重甲蠍子 6530 以後都很遠；拾取判定為以 (x, y) 為中心 ±50px
    hiddenTreasure: {
      type:        'bossNote',
      id:          'orangeKingWeaknessNote01',
      name:        '橘子王觀察筆記', // v0.3.62：玩家看到的名稱（ID 不變）
      displayName: '橘子王觀察筆記',
      x:           5200,
      y:           GROUND_Y - 70,
      found:       false,
      emoji:       '📜',
      title:       '橘子王觀察筆記',
      // v0.3.35：改成 2-4 Boss 戰的完整攻略（renderDiscoveryItemModal 以「。」分段顯示）
      // v0.3.61：和正式筆記圖一致的四項情報（使用者確認）；不寫弱點部位，也不提前揭露金色油管環 / 王權劍
      noteText:    '橘子王年紀大了，體力不好，動兩下就要休息。休息時是攻擊的好機會！'
                 + '他身上似乎有神秘的寶物，常常因為亂衝亂撞掉在地上。'
                 + '橘子王每次攻擊前，會先透露攻擊目標和攻擊方式。'
                 + '好好觀察，抓準攻擊和閃避的時機！',
      foundMsg:    '氣球小狗找到橘子王觀察筆記！',
      hintText:    '這可能是前往 2-4 Boss 關的重要線索……', // v0.3.33：發現物品視窗底部提示
    },
  },

  // Stage 2-4：橘子王決戰（v0.3.35 Boss 關）
  // Boss 專用房：length = CANVAS_W → 鏡頭固定不捲動；沒有終點線，橘子王 HP 歸零才過關
  // 左側三層：地面 / 中層平台 / 最高平台（最高平台可躲縮球衝撞，但仍會被高位噴油與拋物線油彈打到）
  {
    chapterId:   2,
    stageId:     '2-4',
    displayName: '第 2-4 關：橘子王決戰',
    name:        '第 2-4 關：橘子王決戰',
    shortName:   '2-4 橘子王',
    length:      CANVAS_W,
    scrollSpeed: 0,
    bg:          'stage1',
    isBossStage: true,
    bossId:      'orangeKing',
    hints:       [],
    // v0.3.35-fix-1：兩層平台左緣貼齊畫面左邊（左側 = 小V躲避 / 觀察 / 換層的安全區）
    //   中層比高層長 110px：從高層往右走會先落到中層，再往右走出中層就回到地面
    buildPlatforms: () => [
      { x: 0, y: GROUND_Y - 220, w: 190, h: 22, artKey: 'high' },  // 最高平台（躲衝撞）；v0.3.39 美術：orange_king_platform_high.png
      { x: 0, y: GROUND_Y - 115, w: 300, h: 22, artKey: 'mid'  },  // 中層平台；v0.3.39 美術：orange_king_platform_mid.png
    ],
    buildSpikes:   () => [],
    buildCoins:    () => [],
    buildBalloons: () => [],
    buildEnemies:  () => [],
    buildOranges:  () => [],
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
// v0.3.28：第二章正式流程（stageId-based）：2-1 → 2-2 → 2-3 → 結束（2-4 保留給 Boss 關）
const CHAPTER2_FLOW_STAGE_IDS = ['2-1', '2-2', '2-3', '2-4']; // v0.3.35：2-3 → 2-4 Boss 關
function getChapter2FlowStep(levelIndex) {
  const lv = LEVELS[levelIndex];
  return lv ? CHAPTER2_FLOW_STAGE_IDS.indexOf(lv.stageId) : -1;
}
function getLevelIndexByStageId(stageId) {
  return LEVELS.findIndex(lv => lv.stageId === stageId);
}

function getNextLevelIndex(levelIndex) {
  // v0.3.28：第二章正式流程
  const ch2Step = getChapter2FlowStep(levelIndex);
  if (ch2Step !== -1) {
    if (ch2Step + 1 < CHAPTER2_FLOW_STAGE_IDS.length) {
      const idx = getLevelIndexByStageId(CHAPTER2_FLOW_STAGE_IDS[ch2Step + 1]);
      return idx >= 0 ? idx : LEVELS.length;
    }
    return LEVELS.length; // v0.3.35：2-4 橘子王擊敗 = 第二章完成
  }

  const step = getChapter1FlowStep(levelIndex);
  if (step === -1) return levelIndex + 1; // 不在第一章流程內：維持舊行為
  if (step + 1 < CHAPTER1_FLOW_LEVEL_INDICES.length) {
    return CHAPTER1_FLOW_LEVEL_INDICES[step + 1];
  }
  // v0.3.28：第一章流程最後一步 → 接第二章正式 2-1
  const ch2Start = getLevelIndexByStageId(CHAPTER2_FLOW_STAGE_IDS[0]);
  return ch2Start >= 0 ? ch2Start : LEVELS.length;
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

  // 情境 A / B / A0：下一步是狗狗尋寶關，依狀態三分流
  if (nextIdx === dogHammerStageIndex) {
    const flags  = ensureChapter1Flags();
    const dog    = playerInventory.balloonDog || {};
    const hasDog = dog.present === true && (dog.turnsLeft || 0) > 0;

    // v0.3.18-fix-6：hasDog 絕對優先於 dogCraftIntroDone
    // 畫面已有狗時，絕對不能顯示「請先製作氣球小狗」

    // 情境 C：已安排帶狗 → 可前往第 2 節
    if (nextBringDog === true) {
      if (ADVENTURE_TEST_TOOLS_ENABLED) {
        console.log('[DogFlow] goNext', { hasDog, dogCraftIntroDone: flags.dogCraftIntroDone, nextBringDog });
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

    // 情境 B：有狗，尚未帶狗
    if (hasDog) {
      // 有狗時自動補正 dogCraftIntroDone 旗標（防止舊存檔/教學跳過造成永久卡 makeDog）
      if (!flags.dogCraftIntroDone) {
        flags.dogCraftIntroDone = true;
        saveInventory();
      }
      if (ADVENTURE_TEST_TOOLS_ENABLED) {
        console.log('[DogFlow] bringDog', { hasDog, dogCraftIntroDone: flags.dogCraftIntroDone, nextBringDog });
      }
      return {
        kind:        'bringDog',
        title:       '下一步：帶氣球小狗出發',
        body:        '氣球小狗準備好了！帶牠一起出發，牠會在第 2 節幫你找到隱藏寶藏。',
        actionLabel: '🐶 帶狗出發',
        actionFn:    'bringDogNextLevel',
        nextBtnText: '請先帶狗出發',
        nextBtnLocked: true,
      };
    }

    // 情境 A：沒有狗 → 引導去氣球秘笈製作
    if (ADVENTURE_TEST_TOOLS_ENABLED) {
      console.log('[DogFlow] makeDog', { hasDog, dogCraftIntroDone: flags.dogCraftIntroDone, nextBringDog });
    }
    return {
      kind:          'makeDog',
      title:         '下一步：製作氣球小狗',
      body:          '第 2 節有隱藏寶藏，需要氣球小狗幫忙尋找。請先到「氣球秘笈」裡製作一隻氣球小狗！',
      actionLabel:   '📖 打開氣球秘笈製作小狗',
      actionFn:      'openGuidebook',
      nextBtnText:   '請先製作氣球小狗',
      nextBtnLocked: true,
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

  // v0.3.28：第一章最後一節通關 → 前往第二章 2-1
  if (getChapter2FlowStep(nextIdx) === 0) {
    return {
      kind:        'goChapter2',
      title:       '第一章完成！',
      body:        '下一站：第二章 2-1 橘子油危機。橘子油會讓氣球破掉，要小心！',
      actionLabel: '前往第二章',
      actionFn:    'goToNextChapter1Level',
      nextBtnText: '前往第二章',
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
// v0.3.35-fix-1：進入 2-4 Boss 關前，背包裡至少要有一把可用的氣球劍或氣球槌
// v0.3.46：改成「只限氣球劍」— 2-4 只能用劍（撿到金色油管環後變成橙煌王權劍），只有槌也不能進
// 以背包（craftedItems）判斷：耐久用完時 consumeXxxDurability 會把數量扣到 0，所以數量 > 0 = 還有可用武器
// （測試版的 runtime 測試武器不寫入背包，不算數）
function hasUsableBossWeapon() {
  const ci = playerInventory.craftedItems || {};
  return (ci.basicSword || 0) > 0;
}
function isBossWeaponGateBlocked(nextIdx) {
  return isBossStageLevel(nextIdx) && !hasUsableBossWeapon();
}
const BOSS_WEAPON_GATE_MSG = '⚔️ 橘子王太危險了！請先製作一把氣球劍，再前往 2-4（2-4 只能使用氣球劍）。';
const BOSS_SWORD_ONLY_MSG  = '🗡️ 橘子王戰只能使用氣球劍！';

function checkChapter1ProgressionGate(nextIdx) {
  // v0.3.35-fix-1：阻擋零 — 沒有武器不能進 2-4 Boss 關（只擋 2-4）
  if (isBossWeaponGateBlocked(nextIdx)) {
    showHint(BOSS_WEAPON_GATE_MSG, 260);
    return false;
  }
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
var rpgDogDepartPending = false; // v0.3.62：只有從結算 / 小V的家按「出發」且帶狗時才為 true，下一次 restart() 取用後清掉
// v0.3.58：失敗 / 時間到時已經把本關暫時成果回滾到快照 → 之後在失敗畫面做的合法交易（補血 / 購買 / 製作）
//          不可再被「重試 / 返回整備」二次還原（否則會退回金幣、材料，形成免費資源）
var levelRolledBackForRetry = false;
// v0.3.58：返回整備節點（上一關正常通關 → 從結算 / 小V的家出發進入下一關時建立；只存在記憶體，重新整理網頁即失效）
//   { fromLevelIndex, toLevelIndex, runStats(JSON), elapsedSec, playerStats, playerKey, armed, active }
var prepCheckpoint = null;

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
    keyItems:           JSON.parse(JSON.stringify(playerInventory.keyItems || {})), // v0.3.32
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
  // v0.3.32：重要物品跟金幣一樣，死亡重試時回到進關前狀態（重試時可再找一次）
  if (levelStartSnapshot.keyItems) playerInventory.keyItems = JSON.parse(JSON.stringify(levelStartSnapshot.keyItems));
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
  if (isOrangeKingStageActive()) { if (hasSword) activeSlot = 'sword'; showHint(BOSS_SWORD_ONLY_MSG, 150); return; } // v0.3.46：2-4 只限劍
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
  // v0.3.35：離開 / 重新載入關卡時，清掉 2-4 橘子王與金色油管環暫時能力（restart 會依關卡重新建立）
  if (orangeKingBoss) clearOrangeKingBoss();

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
  lv.buildEnemies().forEach(e => {
    // v0.3.15：補 type/variant/tier/baseVx 供 variant+tier 系統使用
    if (!e.type)    e.type    = 'scorpion';
    if (!e.variant) e.variant = 'normal';
    if (!e.tier)    e.tier    = 'normal';
    if (!e.baseVx)  e.baseVx  = Math.abs(e.vx ?? CONFIG.ENEMY_SPEED);
    // v0.3.18：從 ENEMY_VARIANTS 讀取 hp / maxHp，讓 heavyBody (3 HP) 與 normal (1 HP) 正確初始化
    const vCfg  = getEnemyVariantConfig(e);
    const initHp = vCfg?.hp ?? 1;
    e.hp    = initHp;
    e.maxHp = vCfg?.maxHp ?? initHp;
    // v0.3.18-test-2：runtime id 供 spinning hit lock 使用
    e.runtimeId    = nextEnemyRuntimeId++;
    e.hurtCooldown = 0;
    e.lastSwordSwingId  = 0;
    e.lastHammerSwingId = 0; // v0.3.18-fix-2：槌子命中鎖
    enemies.push(e);
  });

  orangeNemeses.length = 0;
  lv.buildOranges().forEach(o => {
    // v0.3.15：補 type/variant/tier
    if (!o.type)    o.type    = 'balloonNemesis';
    if (!o.variant) o.variant = 'straight';
    if (!o.tier)    o.tier    = 'normal';
    orangeNemeses.push(o);
  });

  // v0.3.19：Chapter 2 煙囟橘子
  chimneyOranges.length = 0;
  if (typeof lv.buildChimneyOranges === 'function') {
    lv.buildChimneyOranges().forEach(co => {
      if (!co.active) co.active = true;
      chimneyOranges.push(co);
    });
  }

  // v0.3.20：Chapter 2 雙噴嘴橘子
  dualNozzleOranges.length = 0;
  if (typeof lv.buildDualNozzleOranges === 'function') {
    lv.buildDualNozzleOranges().forEach(dn => {
      if (!dn.active) dn.active = true;
      dualNozzleOranges.push(dn);
    });
  }

  // v0.3.27-test-2：橘子家族測試關會暫時把 maxHp 設為 6；任何 loadLevel 都恢復正常上限
  if (player.maxHp !== CONFIG.MAX_HP) {
    player.maxHp = CONFIG.MAX_HP;
    player.hp    = Math.min(player.hp, player.maxHp);
  }

  // v0.3.27-test-2：離開橘子家族測試關（任何 loadLevel）時，結束測試補給的存檔保護
  testSupplyOriginalItems = null;

  // v0.3.28：地面缺口（低處坑道）— 依關卡 buildGroundGaps 建立，沒有就清空
  groundGaps.length = 0;
  if (typeof lv.buildGroundGaps === 'function') {
    lv.buildGroundGaps().forEach(g => groundGaps.push(g));
  }

  // v0.3.28：飛行油彈橘子 — 依關卡 buildProjectileOranges 建立（2-3 正式關卡使用）
  projectileOranges.length = 0;
  projectileOrangeShots.length = 0;
  if (typeof lv.buildProjectileOranges === 'function') {
    lv.buildProjectileOranges().forEach(po => {
      if (!po.active) po.active = true;
      projectileOranges.push(po);
    });
  }

  // v0.3.21：Chapter 2 向上油幕橘子
  fanOranges.length = 0;
  if (typeof lv.buildFanOranges === 'function') {
    lv.buildFanOranges().forEach(fn => {
      if (!fn.active) fn.active = true;
      fanOranges.push(fn);
    });
  }

  // 圓氣球
  roundBalloons.length = 0;
  if (lv.buildRoundBalloons) lv.buildRoundBalloons().forEach(r => roundBalloons.push(r));
  // v0.3.63：計分用穩定 ID（同一關重進不會變；圓氣球用生成位置，因為依背包缺量決定生成幾顆）
  try {
    const _sid = lv.stageId;
    coins.forEach((c, i) => { c.advId = _sid + '#c' + i; });
    balloons260.forEach((b, i) => { b.advId = _sid + '#b' + i; });
    roundBalloons.forEach(r => { r.advId = _sid + '#r@' + Math.round(r.x); });
    enemies.forEach((e, i) => { e.advId = _sid + '#e' + i; e.advKind = (e.variant === 'heavyBody') ? 'big' : 'normal'; });
  } catch (e) {}

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
  // v0.3.33：已取得的重要物品（例如 Boss 弱點筆記）不再出現在關卡中
  const rawTreasure = (lv.hiddenTreasure && isHiddenTreasureAvailable(lv.hiddenTreasure)) ? lv.hiddenTreasure : null;
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
      // v0.3.59：已被本次播放的 RPG 台詞完整取代的舊說明，不再同時跳出
      if (h.rpgReplacedBy && typeof rpgWasShownThisAttempt === 'function' && rpgWasShownThisAttempt(h.rpgReplacedBy)) return;
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

  const bossStage = isOrangeKingStageActive(); // v0.3.35
  // Time up → game over（Boss 房不計時）
  if (!bossStage && elapsedSec >= LEVEL_DURATION) {
    triggerGameOver();
    return;
  }

  if (bossStage) cameraX = 0; // v0.3.35：Boss 房固定鏡頭，不自動捲動
  else updateCamera();
  updatePlayer(dt);
  // v0.3.35；v0.3.36：定位工具開啟時 Boss 暫停動作，方便對位
  if (bossStage && !orangeKingMachineCalibMode) updateOrangeKingBoss(dtMs);
  updateEnemies();
  updateProjectiles();
  updateMeleeAttack();
  updateHammerMelee();
  updateSpinningEnemies(dt);
  updateScorpionDefeatEffects(dt);
  updateTreasurePickupEffects(); // v0.3.12
  updateBreakableTrees(dt);
  updateOrangeNemeses(dtMs);
  updateChimneyOranges(dtMs);     // v0.3.19：Chapter 2 煙囟橘子
  updateDualNozzleOranges(dtMs);  // v0.3.20：Chapter 2 雙噴嘴橘子
  updateFanOranges(dtMs);         // v0.3.21：Chapter 2 向上油幕橘子
  updateProjectileOranges(dtMs);  // v0.3.26：飛行油彈橘子（美術測試，無傷害）
  updateProjectileOrangeShots(dtMs); // v0.3.26：飛行油彈（視覺測試，無傷害）
  checkCollectibles();
  checkHazards();
  checkHints();
  tickHint();
  if (bringBalloonDog) updateDogNose();
  checkHiddenTreasure();
  checkFinish();
  if (gameState === 'playing') { try { rpgUpdate(); } catch (e) { console.warn('[RPG] update error', e); } } // v0.3.59：RPG 事件觸發（只在仍在冒險中時）
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
  try { sfxOnPlayerFrameStart(); } catch (e) {} // v0.3.64
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
    try { sfxPlay('jump'); } catch (e) {} // v0.3.64：真的起跳才播一次
  }

  // Gravity
  player.vy += GRAVITY;
  player.y += player.vy;
  player.onGround = false;

  // Ground collision
  // v0.3.27-terrain：站在地面缺口上方時沒有地面，交給坑底平台接住
  const groundGap = getGroundGapUnderPlayer();
  if (groundGap) {
    // 腳已低於地面＝在坑裡：坑的左右兩側視為牆，只能跳出去
    if (player.y + player.h > GROUND_Y) {
      const minX = groundGap.x;
      const maxX = groundGap.x + groundGap.w - player.w;
      if (player.x < minX) player.x = minX;
      if (player.x > maxX) player.x = maxX;
      // 自動捲軸把玩家推到坑牆外時，直接抬回坑右側地面，避免卡在畫面外
      if (player.x < cameraX + 30) {
        player.x = groundGap.x + groundGap.w;
        player.y = GROUND_Y - player.h;
        player.vy = 0;
        player.onGround = true;
      }
    }
  } else if (player.y + player.h >= GROUND_Y) {
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
  try { sfxOnPlayerFrameEnd(); } catch (e) {} // v0.3.64：從空中落地

  // Attack
  if (player.attackCooldown > 0) player.attackCooldown--;
  if (player.attackActive > 0)   player.attackActive--;
  if (player.meleeActive > 0)    player.meleeActive--;
  if (player.swordAnimTimer > 0)  player.swordAnimTimer--;
  if (player.hammerAnimTimer > 0)  player.hammerAnimTimer--;

  if (player.meleeHammerActive > 0) player.meleeHammerActive--;

  if (inp('attack') && player.attackCooldown === 0) {
    // v0.3.46：2-4 橘子王戰只能用劍（有劍就強制切回劍）
    if (isOrangeKingStageActive() && activeSlot !== 'sword' && equippedSword && equippedSword.id) activeSlot = 'sword';
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
      player.hammerAnimTimer    = HAMMER_ATTACK_ASSETS.length * HAMMER_ATTACK_FRAME_DUR;
      player.hammerSwingId      = (player.hammerSwingId || 0) + 1; // v0.3.18-fix-2：新槌擊 ID
      player.hammerHit          = false;
      try { sfxOnAttackStart('hammer'); } catch (e) {} // v0.3.64
    } else if (activeSlot === 'sword' && equippedSword && equippedSword.id === 'basicSword') {
      player.attackCooldown = CONFIG.BASIC_SWORD_ATTACK_COOLDOWN;
      player.meleeActive    = CONFIG.BASIC_SWORD_ATTACK_DURATION;
      player.meleeHit       = false;
      player.swordSwingId   = (player.swordSwingId || 0) + 1; // v0.3.18-test-2：新揮劍 ID
      player.swordAnimTimer = 30; // 視覺動畫獨立計時（30 幀）
      try { sfxOnAttackStart('sword'); } catch (e) {} // v0.3.64
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
        try { sfxPlay(e.variant === 'heavyBody' ? 'giantScorpionHurt' : 'scorpionHurt'); } catch (er) {} // v0.3.65：沒有武器時的遠距攻擊打中
        if (e.hp <= 0) {
          spawnScorpionDefeatEffect(e);
          e.active = false;
          player.enemiesDefeated++;
          try { advNoteEnemyDefeated(e); } catch (er) {} // v0.3.63
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
// ── v0.3.18-test-2：Enemy runtime identity & damage helper ──
let nextEnemyRuntimeId = 1;

const SCORPION_HURT_COOLDOWN_FRAMES = 8; // 受擊後短暫無敵（防抖），不取代 swordSwingId 鎖

// 統一傷害入口：sword / hammer / spinning 都走這裡
// source: 'sword' | 'hammer' | 'spinning'
// onKill(enemy): 可選 callback，hp 歸零後在呼叫端決定 spinning 或 defeat
// 回傳 true = 造成傷害；'killed' = hp 歸零
function damageScorpionEnemy(e, amount, source, onKillFn) {
  if (!e || !e.active) return false;

  // 補齊 hp/maxHp（萬一還沒設定的舊資料）
  if (!e.maxHp) {
    const vCfg = getEnemyVariantConfig(e);
    e.maxHp = vCfg?.maxHp ?? 1;
  }
  if (e.hp === undefined || e.hp === null) e.hp = e.maxHp;

  // hurtCooldown：防抖（hammer 忽略，讓重擊立刻反應）
  if (source !== 'hammer' && (e.hurtCooldown || 0) > 0) return false;

  e.hp -= amount;
  e.hurtCooldown = SCORPION_HURT_COOLDOWN_FRAMES;
  try { if (source === 'sword') sfxPlay('swordHit'); else if (source === 'hammer') sfxPlay('hammerHit'); } catch (er) {} // v0.3.64：真的打中才播
  try { if (source === 'sword' || source === 'hammer') sfxPlay(e.variant === 'heavyBody' ? 'giantScorpionHurt' : 'scorpionHurt'); } catch (er) {} // v0.3.65：巨蠍 / 一般蠍子各一種（不會同時兩種）

  if (e.hp <= 0) {
    e.hp = 0;
    e.active = false;
    player.enemiesDefeated++;
    try { advNoteEnemyDefeated(e); } catch (er) {} // v0.3.63
    if (typeof onKillFn === 'function') {
      onKillFn(e);
    } else {
      // 預設：sword / spinning 擊殺 → defeat effect
      spawnScorpionDefeatEffect(e);
    }
    return 'killed';
  }

  // 受擊未死
  e.hitFlash = 6;
  return true;
}

function updateMeleeAttack() {
  if (player.meleeActive <= 0) return;

  const atkX = player.facingRight
    ? player.x + player.w
    : player.x - CONFIG.BASIC_SWORD_ATTACK_RANGE;
  const atkY = player.y + (player.h - CONFIG.BASIC_SWORD_ATTACK_HEIGHT) / 2;
  const atkW = CONFIG.BASIC_SWORD_ATTACK_RANGE;
  const atkH = CONFIG.BASIC_SWORD_ATTACK_HEIGHT;
  // v0.3.35：2-4 橘子王（不消耗耐久：金色油管環讓武器實體化）
  if (orangeKingBoss) checkOrangeKingMeleeHit('sword', atkX, atkY, atkW, atkH);

  enemies.forEach(e => {
    if (!e.active) return;
    if (!rectsOverlap(atkX, atkY, atkW, atkH, e.x, e.y, e.w, e.h)) return;

    // v0.3.18-test-2：同一次揮劍對同一敵人只命中一次（swordSwingId per-enemy 鎖）
    if (e.lastSwordSwingId === player.swordSwingId) return;
    e.lastSwordSwingId = player.swordSwingId;

    // 耐久：同一次揮劍只扣一次（無論命中幾隻）
    if (!player.meleeHit) {
      player.meleeHit = true;
      consumeSwordDurability();
    }

    const result = damageScorpionEnemy(e, 1, 'sword', (killed) => {
      // sword kill → defeat effect（不擊飛）
      spawnScorpionDefeatEffect(killed);
    });

    // 受擊未死：knockback
    if (result === true) {
      e.vx = (player.facingRight ? 3.5 : -3.5);
    }
  });
}


// ── Orange Nemesis update ────────────────────
function updateOrangeNemeses(dtMs) {
  orangeNemeses.forEach(o => {
    o.phaseTimer += dtMs;
    // v0.3.15：計時從 variant+tier 取得，normal/straight = v0.3.14 完全相同
    const tm = getOrangeTimings(o);

    switch (o.phase) {
      case 'idle':
        o.sprayActive = false;
        if (o.phaseTimer >= tm.idleMs) {
          o.phase      = 'windup';
          o.phaseTimer = 0;
        }
        break;

      case 'windup':
        o.sprayActive = false;
        if (o.phaseTimer >= tm.windupMs) {
          o.phase      = 'spraying';
          o.phaseTimer = 0;
          o.sprayActive = true;
        }
        break;

      case 'spraying':
        o.sprayActive = true;
        if (o.phaseTimer >= tm.sprayMs) {
          o.phase      = 'cooldown';
          o.phaseTimer = 0;
          o.sprayActive = false;
        }
        break;

      case 'cooldown':
        o.sprayActive = false;
        if (o.phaseTimer >= tm.cooldownMs) {
          o.phase      = 'idle';
          o.phaseTimer = 0;
        }
        break;
    }
  });
}



// ── Chimney Orange（煙囟橘子）─────────────────────────────
//  v0.3.19 Chapter 2 Foundation
//  攻擊方式：向正上方噴出油柱，威脅跳躍中的玩家
//  美術：暫用幾何 placeholder（矩形本體 + 煙囟 + 油幕），後續替換 sprite
// ──────────────────────────────────────────────────────────

const CHIMNEY_ORANGE_IDLE_MS    = 1800; // 靜止等待 (ms)
const CHIMNEY_ORANGE_WINDUP_MS  =  700; // 蓄力預警 (ms)
const CHIMNEY_ORANGE_SPRAY_MS   =  900; // 噴油持續 (ms)
const CHIMNEY_ORANGE_COOLDOWN_MS= 1400; // 冷卻喘氣 (ms)

// 噴油油幕碰撞判定（相對於橘子本體，向上延伸）
const CHIMNEY_OIL_W    = 44;   // 油幕寬度（略等於本體寬度）
const CHIMNEY_OIL_H    = 220;  // 油幕高度（上方危險範圍）
const CHIMNEY_CHIMNEY_H = 30;  // 煙囟繪製高度（placeholder）

let chimneyOranges = []; // runtime array，由 loadLevel 填充

function updateChimneyOranges(dtMs) {
  chimneyOranges.forEach(co => {
    if (!co.active) return;
    co.phaseTimer += dtMs;

    switch (co.sprayPhase) {
      case 'idle':
        co.sprayActive = false;
        if (co.phaseTimer >= CHIMNEY_ORANGE_IDLE_MS) {
          co.sprayPhase = 'windup';
          co.phaseTimer = 0;
        }
        break;

      case 'windup':
        co.sprayActive = false;
        if (co.phaseTimer >= CHIMNEY_ORANGE_WINDUP_MS) {
          co.sprayPhase  = 'spraying';
          co.phaseTimer  = 0;
          co.sprayActive = true;
        }
        break;

      case 'spraying':
        co.sprayActive = true;
        if (co.phaseTimer >= CHIMNEY_ORANGE_SPRAY_MS) {
          co.sprayPhase  = 'cooldown';
          co.phaseTimer  = 0;
          co.sprayActive = false;
        }
        break;

      case 'cooldown':
        co.sprayActive = false;
        if (co.phaseTimer >= CHIMNEY_ORANGE_COOLDOWN_MS) {
          co.sprayPhase = 'idle';
          co.phaseTimer = 0;
        }
        break;
    }
  });
}

function checkChimneyOrangeDamage() {
  if (player.invincible > 0) return;
  const px = player.x, py = player.y, pw = player.w, ph = player.h;

  chimneyOranges.forEach(co => {
    if (!co.active) return;

    // v0.3.19-test-2-fix-1：本體碰撞傷害與 sprayActive 無關，
    // 任何狀態（idle/windup/spraying/cooldown）碰到本體都會受傷，
    // 和一般敵人一樣是持續存在的威脅
    if (rectsOverlap(px, py, pw, ph, co.x, co.y, co.w, co.h)) {
      damagePlayer();
      return; // 同幀只扣一次，invincible 啟動後 oil 判定自然被上方 guard 擋掉
    }

    // 油幕：只在 spraying 狀態才有威脅，從本體頂部向上延伸 CHIMNEY_OIL_H
    if (co.sprayActive) {
      const oilX = co.x + co.w / 2 - CHIMNEY_OIL_W / 2;
      const oilY = co.y - CHIMNEY_OIL_H;
      if (rectsOverlap(px, py, pw, ph, oilX, oilY, CHIMNEY_OIL_W, CHIMNEY_OIL_H)) {
        damagePlayer();
      }
    }
  });
}

// v0.3.22：舊幾何 placeholder — 圖片未載入時 fallback 用
function drawChimneyOrangePlaceholder(co, sx) {
  const isWindup  = co.sprayPhase === 'windup';
  const isCooldown= co.sprayPhase === 'cooldown';

  // ── 本體（橘色矩形）──
  const bodyColor = isWindup ? '#ff6600' : isCooldown ? '#d47000' : '#f57c00';
  ctx.fillStyle = bodyColor;
  ctx.fillRect(sx, co.y, co.w, co.h);

  // Windup 紅色光暈
  if (isWindup) {
    const t = co.phaseTimer / CHIMNEY_ORANGE_WINDUP_MS;
    ctx.save();
    ctx.globalAlpha = 0.3 + 0.2 * Math.sin(t * Math.PI * 6);
    ctx.shadowColor = '#ff2200';
    ctx.shadowBlur  = 12;
    ctx.fillStyle   = '#ff4400';
    ctx.fillRect(sx, co.y, co.w, co.h);
    ctx.restore();
  }

  // ── 煙囟（placeholder）──
  const chimneyW = 10;
  const chimneyX = sx + co.w / 2 - chimneyW / 2;
  const chimneyY = co.y - CHIMNEY_CHIMNEY_H;
  ctx.fillStyle  = '#555';
  ctx.fillRect(chimneyX, chimneyY, chimneyW, CHIMNEY_CHIMNEY_H);
  ctx.fillStyle  = '#333';
  ctx.fillRect(chimneyX - 4, chimneyY, chimneyW + 8, 6);

  // ── 冒煙粒子（cooldown）──
  if (isCooldown) {
    const breath = 0.5 + 0.5 * Math.sin(frameCount * 0.045);
    ctx.globalAlpha = (0.25 + breath * 0.2);
    ctx.fillStyle   = '#aaa';
    const puff = Math.floor(frameCount / 15) % 3;
    for (let i = 0; i < 3; i++) {
      const py2 = chimneyY - 8 - i * 12 - puff * 4;
      const r   = 5 - i;
      ctx.beginPath();
      ctx.arc(chimneyX + chimneyW / 2, py2, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// v0.3.24-fix-2：chimney orange body draw rect helper
// bodyDrawX / bodyDrawY = chimney body 圖片在 canvas 上的左上角（oil 的 local (0,0)）
// bodyScale = bodyDrawW / CHIMNEY_ORANGE_SOURCE_SIZE（讓 oil 使用同一套 512x512 local coord）
function getChimneyOrangeBodyDrawRect(co, sx, img) {
  if (!img) return null;
  const bodyDrawW  = co.w * CHIMNEY_ORANGE_BODY_DRAW_SCALE;
  const bodyDrawH  = img.naturalHeight * (bodyDrawW / img.naturalWidth);
  const footY      = co.y + co.h; // co.y 為 canvas Y（Y 軸無 camera offset）
  const bodyDrawX  = sx + co.w / 2 - bodyDrawW / 2 + CHIMNEY_ORANGE_DRAW_OFFSET_X;
  const bodyDrawY  = footY - bodyDrawH * CHIMNEY_ORANGE_FOOT_ANCHOR_Y + CHIMNEY_ORANGE_DRAW_OFFSET_Y;
  const bodyScale  = bodyDrawW / CHIMNEY_ORANGE_SOURCE_SIZE;
  return { bodyDrawX, bodyDrawY, bodyDrawW, bodyDrawH, bodyScale };
}

// 一次性 debug log 旗標（v0.3.24-fix-2 test only）
let chimneyOilAlignLogged = false;

function drawChimneyOranges(cx) {
  chimneyOranges.forEach(co => {
    if (!co.active) return;
    const sx = co.x - cx;
    if (sx > CANVAS_W + 60 || sx + co.w < -60) return;

    const isSpraying = co.sprayPhase === 'spraying';

    ctx.save();

    // ── 本體圖片 key 決定 ──
    let imgKey = 'idle';
    if (co.sprayPhase === 'windup') {
      imgKey = Math.floor(frameCount / 14) % 2 === 0 ? 'warning01' : 'warning02';
    } else if (co.sprayPhase === 'spraying') {
      imgKey = 'spray';
    } else if (co.sprayPhase === 'cooldown') {
      imgKey = Math.floor(frameCount / 30) % 2 === 0 ? 'cooldown01' : 'cooldown02';
    }
    let img = getChimneyOrangeImg(imgKey);
    if (!img) img = getChimneyOrangeImg('idle');

    // ── 本體 draw rect（供 oil 和 body 共用，以本體圖片左上角為 local (0,0)）──
    const rect = getChimneyOrangeBodyDrawRect(co, sx, img);

    // ── 油柱（spraying 時先畫油柱再畫本體，讓油柱在本體下方）──
    // v0.3.24-fix-2：oilDrawY 以 bodyDrawY 為基準（body 圖片左上角 = local (0,0)）
    // 絕對禁止使用 co.y / footY / co.y+co.h 作為 oil Y 基準
    if (isSpraying && co.sprayActive) {
      const oilSprite = getChimneyOrangeOilImg('spray01');
      if (oilSprite && rect) {
        const { bodyDrawX, bodyDrawY, bodyDrawW, bodyDrawH, bodyScale } = rect;
        // oil 原圖 256×512，bodyScale = bodyDrawW/512
        const oilDrawW = CHIMNEY_ORANGE_OIL_SOURCE_W * bodyScale;
        const oilDrawH = CHIMNEY_ORANGE_OIL_SOURCE_H * bodyScale;
        // oil 水平中心 = body 原圖 x=256（body 中心線）
        // oil 上緣 = body 原圖 y=129
        const oilDrawX = bodyDrawX + CHIMNEY_ORANGE_OIL_LOCAL_X * bodyScale - oilDrawW / 2;
        const oilDrawY = bodyDrawY + CHIMNEY_ORANGE_OIL_LOCAL_Y * bodyScale;

        // calibration tool：選擇有效 offset
        const effectiveOilOffsetX = chimneyOilCalibrationMode
          ? chimneyOilCalibrationOffsetX
          : CHIMNEY_ORANGE_OIL_EXTRA_OFFSET_X;
        const effectiveOilOffsetY = chimneyOilCalibrationMode
          ? chimneyOilCalibrationOffsetY
          : CHIMNEY_ORANGE_OIL_EXTRA_OFFSET_Y;

        const finalOilDrawX = oilDrawX + effectiveOilOffsetX;
        const finalOilDrawY = oilDrawY + effectiveOilOffsetY;

        // 一次性 debug log
        if (!chimneyOilAlignLogged) {
          chimneyOilAlignLogged = true;
          console.log('[ChimneyOilAlign]', {
            bodyDrawX, bodyDrawY, bodyDrawW, bodyDrawH, bodyScale,
            oilDrawX, oilDrawY, finalOilDrawX, finalOilDrawY, oilDrawW, oilDrawH,
            localX: CHIMNEY_ORANGE_OIL_LOCAL_X,
            localY: CHIMNEY_ORANGE_OIL_LOCAL_Y,
            extraOffsetX: CHIMNEY_ORANGE_OIL_EXTRA_OFFSET_X,
            extraOffsetY: CHIMNEY_ORANGE_OIL_EXTRA_OFFSET_Y
          });
        }

        ctx.drawImage(oilSprite, finalOilDrawX, finalOilDrawY, oilDrawW, oilDrawH);

        // calibration mode：輔助線 + HUD
        if (chimneyOilCalibrationMode) {
          ctx.save();
          // 1. oil sprite 外框
          ctx.strokeStyle = 'rgba(255,200,0,0.8)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(finalOilDrawX, finalOilDrawY, oilDrawW, oilDrawH);
          // 2. oil sprite 中心垂直線
          ctx.strokeStyle = 'rgba(255,200,0,0.5)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(finalOilDrawX + oilDrawW / 2, finalOilDrawY);
          ctx.lineTo(finalOilDrawX + oilDrawW / 2, finalOilDrawY + oilDrawH);
          ctx.stroke();
          // 3. oil sprite top 水平輔助線
          ctx.strokeStyle = 'rgba(255,100,100,0.7)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(finalOilDrawX - 20, finalOilDrawY);
          ctx.lineTo(finalOilDrawX + oilDrawW + 20, finalOilDrawY);
          ctx.stroke();
          // 4. chimney body 外框
          ctx.strokeStyle = 'rgba(100,200,255,0.6)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(bodyDrawX, bodyDrawY, bodyDrawW, bodyDrawH);
          // 5. chimney body local x=256 中心線
          const bodyCenterX = bodyDrawX + CHIMNEY_ORANGE_OIL_LOCAL_X * bodyScale;
          ctx.strokeStyle = 'rgba(100,200,255,0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(bodyCenterX, bodyDrawY);
          ctx.lineTo(bodyCenterX, bodyDrawY + bodyDrawH);
          ctx.stroke();
          ctx.restore();

          // HUD
          const hudX = 16;
          const hudY = 90;
          const lineH = 18;
          ctx.save();
          ctx.fillStyle = 'rgba(0,0,0,0.65)';
          ctx.fillRect(hudX - 6, hudY - 16, 270, 175);
          ctx.font = 'bold 13px monospace';
          ctx.fillStyle = '#ffe066';
          ctx.fillText('[Chimney Oil Align Mode]', hudX, hudY);
          ctx.font = '12px monospace';
          ctx.fillStyle = '#cccccc';
          ctx.fillText('F9: 關閉  S: save  R: reset  C: copy', hudX, hudY + lineH);
          ctx.fillText('←/→: X ±1   ↑/↓: Y ±1', hudX, hudY + lineH * 2);
          ctx.fillText('Shift+arrows: ±10', hudX, hudY + lineH * 3);
          ctx.fillStyle = '#80ffcc';
          ctx.fillText(`offsetX: ${chimneyOilCalibrationOffsetX}`, hudX, hudY + lineH * 4);
          ctx.fillText(`offsetY: ${chimneyOilCalibrationOffsetY}`, hudX, hudY + lineH * 5);
          ctx.fillStyle = '#aaaaaa';
          ctx.fillText(`defaultX: ${CHIMNEY_ORANGE_OIL_EXTRA_OFFSET_X}  defaultY: ${CHIMNEY_ORANGE_OIL_EXTRA_OFFSET_Y}`, hudX, hudY + lineH * 6);
          ctx.fillStyle = '#88aaff';
          ctx.fillText(`finalX: ${Math.round(finalOilDrawX)}  finalY: ${Math.round(finalOilDrawY)}`, hudX, hudY + lineH * 7);
          ctx.restore();
        }
      } else if (!oilSprite) {
        // Fallback：幾何 canvas overlay（圖片未載入或失敗時）
        const oilX = sx + co.w / 2 - CHIMNEY_OIL_W / 2;
        const oilY = co.y - CHIMNEY_OIL_H;
        ctx.fillStyle   = 'rgba(210,140,0,0.25)';
        ctx.fillRect(oilX, oilY, CHIMNEY_OIL_W, CHIMNEY_OIL_H);
        ctx.strokeStyle = 'rgba(180,100,0,0.40)';
        ctx.lineWidth   = 1.5;
        ctx.strokeRect(oilX, oilY, CHIMNEY_OIL_W, CHIMNEY_OIL_H);
      }
    }

    // ── 本體：油柱之後繪製（本體在油柱上方）──
    if (rect) {
      ctx.drawImage(img, rect.bodyDrawX, rect.bodyDrawY, rect.bodyDrawW, rect.bodyDrawH);
    } else {
      // 完全 fallback：幾何 placeholder
      drawChimneyOrangePlaceholder(co, sx);
    }

    ctx.restore();
  });
}

// ── Dual Nozzle Orange（雙噴嘴橘子）────────────────────────
//  v0.3.20 Chapter 2 Foundation
//  攻擊方式：本體左右兩側噴嘴同時向左、右噴油，玩家跳到身後仍在範圍內
//  解法：走高處 / 利用平台繞過，而不是直接跳過本體
//  美術：暫用幾何 placeholder（矩形本體 + 左右噴嘴 + 雙向油幕），後續替換 sprite
// ──────────────────────────────────────────────────────────

const DUAL_NOZZLE_IDLE_MS     = 1800; // 靜止等待 (ms)
const DUAL_NOZZLE_WINDUP_MS   =  700; // 蓄力預警 (ms)
const DUAL_NOZZLE_SPRAY_MS    =  900; // 噴油持續 (ms)
const DUAL_NOZZLE_COOLDOWN_MS = 1400; // 冷卻喘氣 (ms)

// 噴油範圍判定（相對於橘子本體，向左右延伸）
const DUAL_NOZZLE_OIL_W = 160; // 單側油幕寬度
const DUAL_NOZZLE_OIL_H =  40; // 油幕高度（與本體同高附近）

let dualNozzleOranges = []; // runtime array，由 loadLevel 填充

function updateDualNozzleOranges(dtMs) {
  dualNozzleOranges.forEach(dn => {
    if (!dn.active) return;
    dn.phaseTimer += dtMs;

    switch (dn.sprayPhase) {
      case 'idle':
        dn.sprayActive = false;
        if (dn.phaseTimer >= DUAL_NOZZLE_IDLE_MS) {
          dn.sprayPhase = 'windup';
          dn.phaseTimer = 0;
        }
        break;

      case 'windup':
        dn.sprayActive = false;
        if (dn.phaseTimer >= DUAL_NOZZLE_WINDUP_MS) {
          dn.sprayPhase  = 'spraying';
          dn.phaseTimer  = 0;
          dn.sprayActive = true;
        }
        break;

      case 'spraying':
        dn.sprayActive = true;
        if (dn.phaseTimer >= DUAL_NOZZLE_SPRAY_MS) {
          dn.sprayPhase  = 'cooldown';
          dn.phaseTimer  = 0;
          dn.sprayActive = false;
        }
        break;

      case 'cooldown':
        dn.sprayActive = false;
        if (dn.phaseTimer >= DUAL_NOZZLE_COOLDOWN_MS) {
          dn.sprayPhase = 'idle';
          dn.phaseTimer = 0;
        }
        break;
    }
  });
}

// ── getDualOrangeOilGeometry：共用 helper，draw 與 damage 用同一套計算 ──────
// 回傳 world coordinate（未減 cameraX），draw 時再減 cx 轉 screen coordinate
function getDualOrangeOilGeometry(dn) {
  // Body draw rect（與 drawDualNozzleOranges 相同計算）
  const bodyDrawW = dn.w * DUAL_ORANGE_BODY_DRAW_SCALE;
  const bodyDrawH = bodyDrawW;
  const bodyDrawX = dn.x + dn.w / 2 - bodyDrawW / 2;
  const bodyDrawY = (dn.y + dn.h) - bodyDrawH * DUAL_ORANGE_FOOT_ANCHOR_Y + DUAL_ORANGE_DRAW_OFFSET_Y;
  const bodyScale = bodyDrawW / DUAL_ORANGE_SOURCE_SIZE;

  // Oil image size：使用 oil 圖自己的 naturalWidth / naturalHeight * bodyScale
  const leftOilImg  = getDualOrangeImg('oil_left_01');
  const rightOilImg = getDualOrangeImg('oil_right_01');
  const leftOilDrawW  = (leftOilImg  && leftOilImg.naturalWidth  > 0) ? leftOilImg.naturalWidth  * bodyScale : bodyDrawW;
  const leftOilDrawH  = (leftOilImg  && leftOilImg.naturalHeight > 0) ? leftOilImg.naturalHeight * bodyScale : bodyDrawH;
  const rightOilDrawW = (rightOilImg && rightOilImg.naturalWidth  > 0) ? rightOilImg.naturalWidth  * bodyScale : bodyDrawW;
  const rightOilDrawH = (rightOilImg && rightOilImg.naturalHeight > 0) ? rightOilImg.naturalHeight * bodyScale : bodyDrawH;

  // Effective visual offsets（calibration tool 可即時覆蓋）
  const effLeftX  = dualOilLeftOffsetX;
  const effLeftY  = dualOilLeftOffsetY;
  const effRightX = dualOilRightOffsetX;
  const effRightY = dualOilRightOffsetY;

  // Oil image draw positions（world coordinate）
  const leftOilX  = bodyDrawX + DUAL_ORANGE_OIL_LEFT_LOCAL_X  * bodyScale - leftOilDrawW  + effLeftX;
  const leftOilY  = bodyDrawY + DUAL_ORANGE_OIL_LEFT_LOCAL_Y  * bodyScale - leftOilDrawH  / 2 + effLeftY;
  const rightOilX = bodyDrawX + DUAL_ORANGE_OIL_RIGHT_LOCAL_X * bodyScale + effRightX;
  const rightOilY = bodyDrawY + DUAL_ORANGE_OIL_RIGHT_LOCAL_Y * bodyScale - rightOilDrawH / 2 + effRightY;

  // Hitbox（跟著 oil 圖走，可用 calibration tool 調整）
  const lhW = dualOilLeftHitboxW;
  const lhH = dualOilLeftHitboxH;
  const lhOX = dualOilLeftHitboxOffsetX;
  const lhOY = dualOilLeftHitboxOffsetY;
  const rhW = dualOilRightHitboxW;
  const rhH = dualOilRightHitboxH;
  const rhOX = dualOilRightHitboxOffsetX;
  const rhOY = dualOilRightHitboxOffsetY;

  // Left hitbox：從左油圖右側往左推
  const leftHitbox = {
    x: leftOilX  + leftOilDrawW  - lhW + lhOX,
    y: leftOilY  + leftOilDrawH  / 2  - lhH / 2 + lhOY,
    w: lhW, h: lhH
  };
  // Right hitbox：從右油圖左側往右推
  const rightHitbox = {
    x: rightOilX + rhOX,
    y: rightOilY + rightOilDrawH / 2  - rhH / 2 + rhOY,
    w: rhW, h: rhH
  };

  return {
    body:       { x: bodyDrawX, y: bodyDrawY, w: bodyDrawW, h: bodyDrawH, scale: bodyScale },
    leftOil:    { x: leftOilX,  y: leftOilY,  w: leftOilDrawW,  h: leftOilDrawH  },
    rightOil:   { x: rightOilX, y: rightOilY, w: rightOilDrawW, h: rightOilDrawH },
    leftHitbox,
    rightHitbox
  };
}

function checkDualNozzleOrangeDamage() {
  if (player.invincible > 0) return;
  const px = player.x, py = player.y, pw = player.w, ph = player.h;

  dualNozzleOranges.forEach(dn => {
    if (!dn.active) return;

    // 本體碰撞：任何狀態都會受傷
    if (rectsOverlap(px, py, pw, ph, dn.x, dn.y, dn.w, dn.h)) {
      damagePlayer();
      return;
    }

    // 雙向油幕：只在 spraying 狀態才有威脅，用新的 geometry hitbox 判定
    if (dn.sprayActive) {
      const geo = getDualOrangeOilGeometry(dn);
      if (rectsOverlap(px, py, pw, ph,
          geo.leftHitbox.x, geo.leftHitbox.y, geo.leftHitbox.w, geo.leftHitbox.h)) {
        damagePlayer(); return;
      }
      if (rectsOverlap(px, py, pw, ph,
          geo.rightHitbox.x, geo.rightHitbox.y, geo.rightHitbox.w, geo.rightHitbox.h)) {
        damagePlayer();
      }
    }
  });
  // 舊常數 DUAL_NOZZLE_OIL_W / DUAL_NOZZLE_OIL_H 保留為歷史參考，不再用於判定
}

function drawDualNozzleOranges(cx) {
  dualNozzleOranges.forEach(dn => {
    if (!dn.active) return;
    const sx = dn.x - cx;
    if (sx > CANVAS_W + 60 + DUAL_NOZZLE_OIL_W || sx + dn.w < -60 - DUAL_NOZZLE_OIL_W) return;

    const isWindup   = dn.sprayPhase === 'windup';
    const isSpraying = dn.sprayPhase === 'spraying';
    const isCooldown = dn.sprayPhase === 'cooldown';

    ctx.save();

    // ── 共用繪製基準（v0.3.25）─────────────────────────────────────────────
    const isIdle = !isWindup && !isSpraying && !isCooldown;
    const bodyDrawW = dn.w * DUAL_ORANGE_BODY_DRAW_SCALE;
    const bodyDrawH = bodyDrawW; // 素材為正方形
    const bodyDrawX = sx + dn.w / 2 - bodyDrawW / 2;
    const bodyDrawY = (dn.y + dn.h) - bodyDrawH * DUAL_ORANGE_FOOT_ANCHOR_Y + DUAL_ORANGE_DRAW_OFFSET_Y;
    const bodyScale = bodyDrawW / DUAL_ORANGE_SOURCE_SIZE;

    let bodySprite = null;

    if (isIdle) {
      // ── idle：5 張序列動畫（01=正中 02=左中 03=看左 04=右中 05=看右）──
      const seqIdx   = Math.floor(frameCount / DUAL_ORANGE_IDLE_FRAME_DUR) % DUAL_ORANGE_IDLE_SEQ.length;
      const frameIdx = DUAL_ORANGE_IDLE_SEQ[seqIdx]; // 0–4
      bodySprite = getDualOrangeImg('idle_0' + (frameIdx + 1));

    } else if (isWindup) {
      // ── warning：2 張快速交替（蓄力緊張感）──
      const wIdx = Math.floor(frameCount / DUAL_ORANGE_WARNING_FRAME_DUR) % 2;
      bodySprite = getDualOrangeImg(wIdx === 0 ? 'warning_01' : 'warning_02');

    } else if (isSpraying) {
      // ── spray：spray_01（本體先畫，油圖在本體之後蓋上）──
      bodySprite = getDualOrangeImg('spray_01');

    } else if (isCooldown) {
      // ── cooldown：2 張慢速交替（疲憊喘氣感）──
      const cIdx = Math.floor(frameCount / DUAL_ORANGE_COOLDOWN_FRAME_DUR) % 2;
      bodySprite = getDualOrangeImg(cIdx === 0 ? 'cooldown_01' : 'cooldown_02');
    }

    if (bodySprite) {
      // ── 正式美術繪製 ──
      // warning 狀態額外加蓄力光暈
      if (isWindup) {
        const t = dn.phaseTimer / DUAL_NOZZLE_WINDUP_MS;
        ctx.save();
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur  = 8 + 8 * Math.sin(t * Math.PI * 5);
        ctx.globalAlpha = 0.85 + 0.15 * Math.sin(t * Math.PI * 5);
        ctx.drawImage(bodySprite, bodyDrawX, bodyDrawY, bodyDrawW, bodyDrawH);
        ctx.restore();
      } else if (isCooldown) {
        // cooldown 加淡淡透明度呼吸感
        const breath = 0.82 + 0.12 * Math.sin(frameCount * 0.04);
        ctx.save();
        ctx.globalAlpha = breath;
        ctx.drawImage(bodySprite, bodyDrawX, bodyDrawY, bodyDrawW, bodyDrawH);
        ctx.restore();
      } else {
        ctx.drawImage(bodySprite, bodyDrawX, bodyDrawY, bodyDrawW, bodyDrawH);
      }

    // ── 左右油圖（spraying 時在本體之後畫，油圖蓋在 spray 本體上方）──────
    if (isSpraying && dn.sprayActive) {
      const geo = getDualOrangeOilGeometry(dn);
      const leftOilImg  = getDualOrangeImg('oil_left_01');
      const rightOilImg = getDualOrangeImg('oil_right_01');
      // screen offset = world - cx（helper 回傳 world coordinate）
      const lOil = geo.leftOil;
      const rOil = geo.rightOil;

      if (leftOilImg && leftOilImg.complete && leftOilImg.naturalWidth > 0) {
        ctx.drawImage(leftOilImg, lOil.x - cx, lOil.y, lOil.w, lOil.h);
      } else {
        // fallback: 幾何左油幕
        const oilY = dn.y + (dn.h - DUAL_NOZZLE_OIL_H) / 2;
        ctx.fillStyle = 'rgba(210,140,0,0.38)';
        ctx.fillRect(sx - DUAL_NOZZLE_OIL_W, oilY, DUAL_NOZZLE_OIL_W, DUAL_NOZZLE_OIL_H);
      }

      if (rightOilImg && rightOilImg.complete && rightOilImg.naturalWidth > 0) {
        ctx.drawImage(rightOilImg, rOil.x - cx, rOil.y, rOil.w, rOil.h);
      } else {
        // fallback: 幾何右油幕
        const oilY = dn.y + (dn.h - DUAL_NOZZLE_OIL_H) / 2;
        ctx.fillStyle = 'rgba(210,140,0,0.38)';
        ctx.fillRect(sx + dn.w, oilY, DUAL_NOZZLE_OIL_W, DUAL_NOZZLE_OIL_H);
      }
    }
    } else {
      // ── fallback：幾何 placeholder（bodySprite 圖片未載入時）──
      const bodyColor = isWindup ? '#ff6600' : isCooldown ? '#d47000' : isSpraying ? '#f57c00' : '#f57c00';
      ctx.fillStyle = bodyColor;
      ctx.fillRect(sx, dn.y, dn.w, dn.h);
      // warning 光暈
      if (isWindup) {
        const t = dn.phaseTimer / DUAL_NOZZLE_WINDUP_MS;
        ctx.save();
        ctx.globalAlpha = 0.3 + 0.2 * Math.sin(t * Math.PI * 6);
        ctx.shadowColor = '#ff2200';
        ctx.shadowBlur  = 12;
        ctx.fillStyle   = '#ff4400';
        ctx.fillRect(sx, dn.y, dn.w, dn.h);
        ctx.restore();
      }
      // 左右噴嘴（fallback 時才畫）
      const nozzleW = 10, nozzleH = 14;
      const nozzleY = dn.y + dn.h / 2 - nozzleH / 2;
      ctx.fillStyle = '#555';
      ctx.fillRect(sx - nozzleW, nozzleY, nozzleW, nozzleH);
      ctx.fillRect(sx + dn.w,    nozzleY, nozzleW, nozzleH);
      ctx.fillStyle = '#333';
      ctx.fillRect(sx - nozzleW - 2, nozzleY - 2, nozzleW + 4, 4);
      ctx.fillRect(sx + dn.w   - 2, nozzleY - 2, nozzleW + 4, 4);
    }

    // ── dual oil calibration debug wireframes（只在 calibration mode 顯示）──
    if (ADVENTURE_TEST_TOOLS_ENABLED && dualOilCalibrationMode && isSpraying && dn.sprayActive) {
      const geo = getDualOrangeOilGeometry(dn);
      const bdy  = geo.body;
      const lOil = geo.leftOil;
      const rOil = geo.rightOil;
      const lHB  = geo.leftHitbox;
      const rHB  = geo.rightHitbox;
      // screen 座標（world - cx）
      const scr = (wx) => wx - cx;

      ctx.save();

      // body draw rect（藍框）
      ctx.strokeStyle = 'rgba(100,200,255,0.6)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(scr(bdy.x), bdy.y, bdy.w, bdy.h);

      // left oil 外框（黃色）
      ctx.strokeStyle = dualOilCalibrationTarget === 'left'
        ? 'rgba(255,220,0,1)' : 'rgba(255,220,0,0.5)';
      ctx.lineWidth = dualOilCalibrationTarget === 'left' ? 2 : 1;
      ctx.strokeRect(scr(lOil.x), lOil.y, lOil.w, lOil.h);
      // left anchor dot
      const leftAnchorX = scr(bdy.x + DUAL_ORANGE_OIL_LEFT_LOCAL_X * bdy.scale + dualOilLeftOffsetX);
      const leftAnchorY = bdy.y + DUAL_ORANGE_OIL_LEFT_LOCAL_Y * bdy.scale + dualOilLeftOffsetY;
      ctx.fillStyle = dualOilCalibrationTarget === 'left' ? '#ffdd00' : 'rgba(255,220,0,0.5)';
      ctx.beginPath(); ctx.arc(leftAnchorX, leftAnchorY, 4, 0, Math.PI * 2); ctx.fill();

      // right oil 外框（綠色）
      ctx.strokeStyle = dualOilCalibrationTarget === 'right'
        ? 'rgba(80,255,120,1)' : 'rgba(80,255,120,0.5)';
      ctx.lineWidth = dualOilCalibrationTarget === 'right' ? 2 : 1;
      ctx.strokeRect(scr(rOil.x), rOil.y, rOil.w, rOil.h);
      // right anchor dot
      const rightAnchorX = scr(bdy.x + DUAL_ORANGE_OIL_RIGHT_LOCAL_X * bdy.scale + dualOilRightOffsetX);
      const rightAnchorY = bdy.y + DUAL_ORANGE_OIL_RIGHT_LOCAL_Y * bdy.scale + dualOilRightOffsetY;
      ctx.fillStyle = dualOilCalibrationTarget === 'right' ? '#50ff78' : 'rgba(80,255,120,0.5)';
      ctx.beginPath(); ctx.arc(rightAnchorX, rightAnchorY, 4, 0, Math.PI * 2); ctx.fill();

      // ── 紅色 damage hitbox preview ──
      ctx.fillStyle   = 'rgba(255,40,40,0.14)';
      ctx.strokeStyle = 'rgba(255,40,40,0.95)';
      ctx.lineWidth   = 2;
      ctx.fillRect  (scr(lHB.x), lHB.y, lHB.w, lHB.h);
      ctx.strokeRect(scr(lHB.x), lHB.y, lHB.w, lHB.h);
      ctx.fillRect  (scr(rHB.x), rHB.y, rHB.w, rHB.h);
      ctx.strokeRect(scr(rHB.x), rHB.y, rHB.w, rHB.h);

      ctx.restore();
    }

    ctx.restore();
  });

  // ── dual oil calibration HUD（全局，calibration mode 開啟時顯示）──
  if (ADVENTURE_TEST_TOOLS_ENABLED && dualOilCalibrationMode) {
    const hudX = 16;
    const hudY = 90;
    const lineH = 18;
    const isVisual = dualOilEditMode === 'visual';
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(hudX - 6, hudY - 16, 330, 420);
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#ffe066';
    ctx.fillText('[Dual Oil Align Mode]', hudX, hudY);
    ctx.font = '12px monospace';
    ctx.fillStyle = '#cccccc';
    ctx.fillText('F10: 關閉  Tab: left/right  H: mode', hudX, hudY + lineH);
    ctx.fillStyle = isVisual ? '#ffe066' : '#888';
    ctx.fillText('Mode: ' + dualOilEditMode.toUpperCase(), hudX, hudY + lineH * 2);
    ctx.fillStyle = '#cccccc';
    ctx.fillText('Target: ' + dualOilCalibrationTarget.toUpperCase(), hudX, hudY + lineH * 3);
    if (isVisual) {
      ctx.fillStyle = '#cccccc';
      ctx.fillText('VISUAL: ←/→ X  ↑/↓ Y  Shift±10', hudX, hudY + lineH * 4);
    } else {
      ctx.fillStyle = '#ff8080';
      ctx.fillText('HITBOX: ←/→ offsetX  ↑/↓ offsetY', hudX, hudY + lineH * 4);
      ctx.fillText('        [ ] width±5   ; \' height±5', hudX, hudY + lineH * 5);
    }
    ctx.fillStyle = '#cccccc';
    ctx.fillText('S: save   R: reset   C: copy', hudX, hudY + lineH * 6);
    ctx.fillText('紅框 = damage hitbox', hudX, hudY + lineH * 7);

    // ── left values ──
    ctx.fillStyle = dualOilCalibrationTarget === 'left' ? '#ffdd00' : '#888888';
    ctx.fillText('── LEFT ──', hudX, hudY + lineH * 9);
    ctx.fillText(`visual  X: ${dualOilLeftOffsetX}  Y: ${dualOilLeftOffsetY}`, hudX, hudY + lineH * 10);
    ctx.fillText(`hitbox  W: ${dualOilLeftHitboxW}  H: ${dualOilLeftHitboxH}`, hudX, hudY + lineH * 11);
    ctx.fillText(`hitbox OX: ${dualOilLeftHitboxOffsetX}  OY: ${dualOilLeftHitboxOffsetY}`, hudX, hudY + lineH * 12);

    // ── right values ──
    ctx.fillStyle = dualOilCalibrationTarget === 'right' ? '#50ff78' : '#888888';
    ctx.fillText('── RIGHT ──', hudX, hudY + lineH * 14);
    ctx.fillText(`visual  X: ${dualOilRightOffsetX}  Y: ${dualOilRightOffsetY}`, hudX, hudY + lineH * 15);
    ctx.fillText(`hitbox  W: ${dualOilRightHitboxW}  H: ${dualOilRightHitboxH}`, hudX, hudY + lineH * 16);
    ctx.fillText(`hitbox OX: ${dualOilRightHitboxOffsetX}  OY: ${dualOilRightHitboxOffsetY}`, hudX, hudY + lineH * 17);
    ctx.restore();
  }
}

// ──────────────────────────────────────────────────────────
//  v0.3.21：Chapter 2 向上油幕橘子（fan orange）
//  油幕方向：往上、左右對稱展開（梯形 hitbox），不依賴 facing。
//  美術：canvas 繪製預警光環 + 油幕梯形，不新增任何圖片素材。
// ──────────────────────────────────────────────────────────

const FAN_ORANGE_IDLE_MS     = 1300; // 靜止等待 (ms)
const FAN_ORANGE_WARNING_MS  =  800; // 預警閃爍 (ms)
const FAN_ORANGE_SPRAY_MS    =  800; // 油幕噴發 (ms)
const FAN_ORANGE_COOLDOWN_MS = 1800; // 冷卻 (ms)

// 向上梯形油幕尺寸（世界座標，px）
const ORANGE_FAN_HEIGHT           = 170; // 油幕從本體頂端往上延伸高度
const ORANGE_FAN_BOTTOM_HALF_WIDTH =  40; // 梯形底端（緊貼橘子頂部）半寬
const ORANGE_FAN_TOP_HALF_WIDTH   = 150; // 梯形頂端半寬
const ORANGE_FAN_ORIGIN_OFFSET_Y  =   0; // 油幕起始點相對於本體 y（0 = 本體頂端）

let fanOranges = []; // runtime array，由 loadLevel 填充

function updateFanOranges(dtMs) {
  fanOranges.forEach(fn => {
    if (!fn.active) return;
    fn.phaseTimer += dtMs;

    switch (fn.sprayPhase) {
      case 'idle':
        fn.sprayActive = false;
        if (fn.phaseTimer >= FAN_ORANGE_IDLE_MS) {
          fn.sprayPhase = 'warning';
          fn.phaseTimer = 0;
        }
        break;

      case 'warning':
        fn.sprayActive = false;
        if (fn.phaseTimer >= FAN_ORANGE_WARNING_MS) {
          fn.sprayPhase  = 'spraying';
          fn.phaseTimer  = 0;
          fn.sprayActive = true;
        }
        break;

      case 'spraying':
        fn.sprayActive = true;
        if (fn.phaseTimer >= FAN_ORANGE_SPRAY_MS) {
          fn.sprayPhase  = 'cooldown';
          fn.phaseTimer  = 0;
          fn.sprayActive = false;
        }
        break;

      case 'cooldown':
        fn.sprayActive = false;
        if (fn.phaseTimer >= FAN_ORANGE_COOLDOWN_MS) {
          fn.sprayPhase = 'idle';
          fn.phaseTimer = 0;
        }
        break;
    }
  });
}

function checkFanOrangeDamage() {
  if (player.invincible > 0) return;
  const px = player.x + player.w / 2;
  const py = player.y + player.h / 2;

  fanOranges.forEach(fn => {
    if (!fn.active) return;

    // 本體碰撞：任何狀態都受傷（不依賴 sprayActive）
    if (rectsOverlap(player.x, player.y, player.w, player.h, fn.x, fn.y, fn.w, fn.h)) {
      damagePlayer(); return;
    }

    // 向上油幕（梯形碰撞，sprayActive 才啟動）
    if (fn.sprayActive) {
      const originX = fn.x + fn.w / 2;
      const originY = fn.y + ORANGE_FAN_ORIGIN_OFFSET_Y; // 本體頂端
      const dyUp = originY - py; // 玩家中心點距油幕起點往上的距離
      if (dyUp > 0 && dyUp <= ORANGE_FAN_HEIGHT) {
        // t=0 在底端（窄），t=1 在頂端（寬）
        const t = dyUp / ORANGE_FAN_HEIGHT;
        const halfWidth = ORANGE_FAN_BOTTOM_HALF_WIDTH
                        + t * (ORANGE_FAN_TOP_HALF_WIDTH - ORANGE_FAN_BOTTOM_HALF_WIDTH);
        if (Math.abs(px - originX) <= halfWidth) {
          damagePlayer();
        }
      }
    }
  });
}

function drawFanOranges(cx) {
  fanOranges.forEach(fn => {
    if (!fn.active) return;
    const sx = fn.x - cx;
    if (sx > CANVAS_W + 60 + ORANGE_FAN_TOP_HALF_WIDTH * 2 || sx + fn.w < -60 - ORANGE_FAN_TOP_HALF_WIDTH * 2) return;

    const isWarning  = fn.sprayPhase === 'warning';
    const isSpraying = fn.sprayPhase === 'spraying';
    const isCooldown = fn.sprayPhase === 'cooldown';

    ctx.save();

    // ── 向上油幕（梯形，畫在本體後方）──
    if (isSpraying && fn.sprayActive) {
      const originX  = sx + fn.w / 2;
      const originY  = fn.y + ORANGE_FAN_ORIGIN_OFFSET_Y; // 本體頂端
      const topY     = originY - ORANGE_FAN_HEIGHT;
      const bHW      = ORANGE_FAN_BOTTOM_HALF_WIDTH;
      const tHW      = ORANGE_FAN_TOP_HALF_WIDTH;

      ctx.beginPath();
      ctx.moveTo(originX - bHW, originY);
      ctx.lineTo(originX + bHW, originY);
      ctx.lineTo(originX + tHW, topY);
      ctx.lineTo(originX - tHW, topY);
      ctx.closePath();

      // 橘色半透明漸層填充
      const grad = ctx.createLinearGradient(0, originY, 0, topY);
      grad.addColorStop(0, 'rgba(255,140,0,0.55)');
      grad.addColorStop(1, 'rgba(255,200,50,0.10)');
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = 'rgba(220,100,0,0.60)';
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    }

    // ── 預警光環（warning 狀態，本體頂端向上閃爍弧線）──
    if (isWarning) {
      const t       = fn.phaseTimer / FAN_ORANGE_WARNING_MS;
      const pulse   = 0.3 + 0.35 * Math.sin(t * Math.PI * 5);
      const originX = sx + fn.w / 2;
      const originY = fn.y + ORANGE_FAN_ORIGIN_OFFSET_Y;

      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = '#ff4400';
      ctx.lineWidth   = 2.5;
      // 三道扇弧，逐漸擴大
      for (let i = 1; i <= 3; i++) {
        const r = (ORANGE_FAN_BOTTOM_HALF_WIDTH + i * 25) * (0.6 + t * 0.4);
        ctx.beginPath();
        ctx.arc(originX, originY, r, Math.PI, 2 * Math.PI); // 上半圓
        ctx.stroke();
      }
      ctx.restore();
    }

    // ── 本體（橘色矩形）──
    const bodyColor = isWarning
      ? '#ff6600'
      : isCooldown
        ? '#d47000'
        : '#f57c00';
    ctx.fillStyle = bodyColor;
    ctx.fillRect(sx, fn.y, fn.w, fn.h);

    // 預警紅色光暈
    if (isWarning) {
      const t = fn.phaseTimer / FAN_ORANGE_WARNING_MS;
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * Math.PI * 6);
      ctx.shadowColor = '#ff2200';
      ctx.shadowBlur  = 14;
      ctx.fillStyle   = '#ff4400';
      ctx.fillRect(sx, fn.y, fn.w, fn.h);
      ctx.restore();
    }

    // ── 頂部噴嘴（本體頂端中央，向上指的圓管）──
    const nozzleW = 14, nozzleH = 12;
    const nozzleX = sx + fn.w / 2 - nozzleW / 2;
    const nozzleY = fn.y - nozzleH;
    ctx.fillStyle = '#555';
    ctx.fillRect(nozzleX, nozzleY, nozzleW, nozzleH);
    // 噴嘴帽（頂端橫條）
    ctx.fillStyle = '#333';
    ctx.fillRect(nozzleX - 3, nozzleY - 3, nozzleW + 6, 4);

    // ── 冷卻冒煙粒子（頂端向上漂浮）──
    if (isCooldown) {
      const breath = 0.5 + 0.5 * Math.sin(frameCount * 0.045);
      ctx.globalAlpha = (0.20 + breath * 0.18);
      ctx.fillStyle   = '#bbb';
      const puff = Math.floor(frameCount / 15) % 3;
      for (let i = 0; i < 3; i++) {
        const r   = 4 - i * 0.8;
        const py2 = puff * 4 + i * 5;
        ctx.beginPath();
        ctx.arc(nozzleX + nozzleW / 2, nozzleY - py2, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  });
}

// ──────────────────────────────────────────────────────────
//  v0.3.26：飛行油彈橘子（projectile orange）— 美術測試版
//  狀態機：idle → warning → release → cooldown → idle
//  本版只顯示角色本體美術：不發射油彈、沒有 hitbox、不會讓玩家受傷、
//  不加入正式關卡（只由暫停選單測試入口產生）
// ──────────────────────────────────────────────────────────

const PROJECTILE_ORANGE_IDLE_MS     = 1600;
const PROJECTILE_ORANGE_WARNING_MS  =  900;
const PROJECTILE_ORANGE_RELEASE_MS  =  450;
const PROJECTILE_ORANGE_COOLDOWN_MS =  900;

let projectileOranges = []; // runtime array，只由 startProjectileOrangeTestLevel 填充

function updateProjectileOranges(dtMs) {
  projectileOranges.forEach(po => {
    if (!po.active) return;
    po.phaseTimer += dtMs;

    switch (po.phase) {
      case 'idle':
        po.shotSpawned = false;
        if (po.phaseTimer >= PROJECTILE_ORANGE_IDLE_MS) { po.phase = 'warning'; po.phaseTimer = 0; }
        break;
      case 'warning':
        po.shotSpawned = false;
        if (po.phaseTimer >= PROJECTILE_ORANGE_WARNING_MS) { po.phase = 'release'; po.phaseTimer = 0; }
        break;
      case 'release':
        // v0.3.26-complete-art：同一次 release 只生一顆油彈（視覺測試，無傷害）
        if (!po.shotSpawned) {
          spawnProjectileOrangeShot(po);
          po.shotSpawned = true;
        }
        if (po.phaseTimer >= PROJECTILE_ORANGE_RELEASE_MS) { po.phase = 'cooldown'; po.phaseTimer = 0; }
        break;
      case 'cooldown':
        po.shotSpawned = false;
        if (po.phaseTimer >= PROJECTILE_ORANGE_COOLDOWN_MS) { po.phase = 'idle'; po.phaseTimer = 0; }
        break;
      default:
        po.phase = 'idle'; po.phaseTimer = 0;
    }
  });
}

function drawProjectileOranges(cx) {
  projectileOranges.forEach(po => {
    if (!po.active) return;
    const sx = po.x - cx;
    if (sx > CANVAS_W + 120 || sx + po.w < -120) return;

    const isIdle     = po.phase === 'idle';
    const isWarning  = po.phase === 'warning';
    const isRelease  = po.phase === 'release';

    // ── 依狀態選圖 ──
    // 每個狀態的候選圖（依序 fallback，最後都退回 idle_01）
    let candidates;
    if (isIdle) {
      const seqIdx = Math.floor(frameCount / PROJECTILE_ORANGE_IDLE_FRAME_DUR) % PROJECTILE_ORANGE_IDLE_SEQ.length;
      candidates = ['idle_0' + (PROJECTILE_ORANGE_IDLE_SEQ[seqIdx] + 1)];
    } else if (isWarning) {
      candidates = [(Math.floor(frameCount / PROJECTILE_ORANGE_WARNING_FRAME_DUR) % 2 === 0) ? 'warning_01' : 'warning_02'];
    } else if (isRelease) {
      candidates = ['shot_01', 'release_01'];          // 優先氣功掌 shot_01，其次 release_01
    } else {
      candidates = [(Math.floor(frameCount / PROJECTILE_ORANGE_COOLDOWN_FRAME_DUR) % 2 === 0) ? 'cooldown_01' : 'cooldown_02'];
    }
    candidates.push('idle_01');
    const key = candidates[0];
    let img = null;
    for (const k of candidates) { img = getProjectileOrangeImg(k); if (img) break; }

    // v0.3.26-debug：畫 fallback 時，每個 phase + key 只 log 一次
    if (!img) {
      const logKey = po.phase + '|' + key;
      if (!projectileOrangeDrawFallbackLogged[logKey]) {
        projectileOrangeDrawFallbackLogged[logKey] = true;
        console.warn('[ProjectileOrangeArt] draw fallback:', {
          phase: po.phase,
          key,
          fallbackIdleExists: !!getProjectileOrangeImg('idle_01'),
          projectileOrangeImgsKeys: Object.keys(projectileOrangeImgs),
        });
      }
    }

    ctx.save();

    if (img) {
      // 保持圖片原始比例，腳底錨點貼地
      const drawW  = po.w * PROJECTILE_ORANGE_BODY_DRAW_SCALE;
      const drawH  = drawW * (img.naturalHeight / img.naturalWidth);
      const idleBobY = isIdle ? Math.sin(frameCount * 0.12) * PROJECTILE_ORANGE_IDLE_BOB_Y : 0;
      const drawX  = sx + po.w / 2 - drawW / 2;
      const drawY  = (po.y + po.h) - drawH * PROJECTILE_ORANGE_FOOT_ANCHOR_Y
                   + PROJECTILE_ORANGE_DRAW_OFFSET_Y + idleBobY;

      if (isWarning) {
        // 輕微橘色集氣光暈（不要太誇張）
        const t = po.phaseTimer / PROJECTILE_ORANGE_WARNING_MS;
        ctx.shadowColor = 'rgba(255,140,0,0.85)';
        ctx.shadowBlur  = 6 + 4 * Math.sin(t * Math.PI * 6);
      }
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    } else {
      // fallback：圖片未載入時畫簡單橘色圓（不 crash）
      ctx.fillStyle = isWarning ? '#ff6600' : isRelease ? '#ffaa33' : '#f57c00';
      ctx.beginPath();
      ctx.arc(sx + po.w / 2, po.y + po.h / 2, po.w / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  });
}

// ── v0.3.26-complete-art：飛行油彈（視覺測試，無傷害、無 hitbox）────────────
// v0.3.26-shot-calibration：尺寸改用 oil_shot_01 原圖 × bodyScale × scaleMult（不再寫死 72px）
// shot.x / shot.y = 油彈「中心點」的 world coordinate
const PROJECTILE_ORANGE_SHOT_SPEED   = -4.5;  // px / frame（@60fps），負值 = 往左飛
const PROJECTILE_ORANGE_SHOT_LIFE_MS = 2500;
const PROJECTILE_ORANGE_SHOT_FALLBACK_W = 120; // oil_shot_01 未載入時的備用尺寸
const PROJECTILE_ORANGE_SHOT_FALLBACK_H = 70;

let projectileOrangeShots = [];

// 發射姿勢本體圖：shot_01 → release_01 → idle_01
function getProjectileOrangeReleaseBodyImg() {
  return getProjectileOrangeImg('shot_01')
      || getProjectileOrangeImg('release_01')
      || getProjectileOrangeImg('idle_01');
}

// 依目前定位參數，算出某隻 projectile orange 的油彈中心點（world）與 bodyScale
function getProjectileOilShotSpawnPoint(po) {
  const rect  = getProjectileOrangeBodyDrawRect(po, getProjectileOrangeReleaseBodyImg());
  const baseX = rect.drawX + projectileOilShotLocalX * rect.bodyScale;
  const baseY = rect.drawY + projectileOilShotLocalY * rect.bodyScale;
  return {
    x: baseX + projectileOilShotOffsetX,
    y: baseY + projectileOilShotOffsetY,
    bodyScale: rect.bodyScale,
    rect,
  };
}

// 油彈繪製尺寸：naturalWidth / naturalHeight × bodyScale × scaleMult
// 規則（v0.3.26 stable）：與角色本體同一比例系統的素材／特效，一律用原圖 natural 尺寸 × bodyScale，
// 再用 scaleMult 微調；不要寫死固定像素寬度（例如舊版 72px 會讓圖被縮得太小）。
function getProjectileOilShotDrawSize(bodyScale) {
  const img = getProjectileOrangeImg('oil_shot_01');
  return {
    img,
    drawW: img ? img.naturalWidth  * bodyScale * projectileOilShotScaleMult
               : PROJECTILE_ORANGE_SHOT_FALLBACK_W * projectileOilShotScaleMult,
    drawH: img ? img.naturalHeight * bodyScale * projectileOilShotScaleMult
               : PROJECTILE_ORANGE_SHOT_FALLBACK_H * projectileOilShotScaleMult,
  };
}

function spawnProjectileOrangeShot(po) {
  const sp = getProjectileOilShotSpawnPoint(po);
  projectileOrangeShots.push({
    x: sp.x,
    y: sp.y,
    vx: PROJECTILE_ORANGE_SHOT_SPEED,
    active: true,
    lifeMs: PROJECTILE_ORANGE_SHOT_LIFE_MS,
    bodyScale: sp.bodyScale,
  });
}

// ── v0.3.26-hitbox：projectile orange 傷害判定 ──────────────────────────
// v0.3.26-hitbox-calibration：油彈 / 本體 hitbox 改用獨立 W / H / offset（不再用 draw rect 內縮）
// 測試版顯示紅色 damage hitbox（red box = damage hitbox）
const PROJECTILE_ORANGE_HITBOX_DEBUG = ADVENTURE_TEST_TOOLS_ENABLED;

// 油彈 draw rect（world coordinate，不扣 cameraX）
function getProjectileOilShotWorldRect(shot) {
  const { drawW, drawH } = getProjectileOilShotDrawSize(shot.bodyScale);
  return { x: shot.x - drawW / 2, y: shot.y - drawH / 2, w: drawW, h: drawH };
}

// 油彈 damage hitbox（world coordinate）：以油彈視覺中心 (shot.x, shot.y) 為基準
// 接受任何帶 x / y 的物件（真正油彈或 F7 預覽點）
function getProjectileOilShotHitbox(shot) {
  return {
    x: shot.x + projectileOilShotHitboxOffsetX - projectileOilShotHitboxW / 2,
    y: shot.y + projectileOilShotHitboxOffsetY - projectileOilShotHitboxH / 2,
    w: projectileOilShotHitboxW,
    h: projectileOilShotHitboxH,
  };
}

// 本體 damage hitbox（world coordinate）：以碰撞框底部中心（腳底）為基準往上
function getProjectileOrangeBodyHitbox(po) {
  const centerX = po.x + po.w / 2;
  const footY   = po.y + po.h;
  return {
    x: centerX + projectileOrangeBodyHitboxOffsetX - projectileOrangeBodyHitboxW / 2,
    y: footY   + projectileOrangeBodyHitboxOffsetY - projectileOrangeBodyHitboxH,
    w: projectileOrangeBodyHitboxW,
    h: projectileOrangeBodyHitboxH,
  };
}

function checkProjectileOrangeDamage() {
  if (player.invincible > 0) return; // 無敵期間不重複扣血
  // 與 checkHazards() 相同的玩家判定框
  const px = player.x + 6, py = player.y + 6, pw = player.w - 12, ph = player.h - 6;

  // 1. 本體接觸傷害（任何狀態都有效）
  for (const po of projectileOranges) {
    if (!po.active) continue;
    const b = getProjectileOrangeBodyHitbox(po);
    if (rectsOverlap(px, py, pw, ph, b.x, b.y, b.w, b.h)) {
      damagePlayer();
      return; // 同幀只扣一次
    }
  }

  // 2. 飛行油彈傷害：命中後油彈消失
  for (const s of projectileOrangeShots) {
    if (!s.active) continue;
    const h = getProjectileOilShotHitbox(s);
    if (rectsOverlap(px, py, pw, ph, h.x, h.y, h.w, h.h)) {
      damagePlayer();
      s.active = false; // 下一次 updateProjectileOrangeShots 會從陣列移除
      return;
    }
  }
}

// 測試版：畫實際 damage hitbox 紅框（本體 + 飛行油彈）
// v0.3.28：projectile orange 紅框預設不顯示；F3 開 / 關，F7 校準模式開啟時也會顯示
let projectileOrangeHitboxDebugVisible = false;

function drawProjectileOrangeHitboxDebug(cx) {
  if (!PROJECTILE_ORANGE_HITBOX_DEBUG) return; // = ADVENTURE_TEST_TOOLS_ENABLED
  if (!projectileOrangeHitboxDebugVisible && !projectileOilShotCalibrationMode) return;
  if (projectileOranges.length === 0 && projectileOrangeShots.length === 0) return;
  ctx.save();
  ctx.lineWidth   = 1.5;
  ctx.strokeStyle = 'rgba(255,40,40,0.95)';
  ctx.fillStyle   = 'rgba(255,40,40,0.12)';
  projectileOranges.forEach(po => {
    if (!po.active) return;
    const b = getProjectileOrangeBodyHitbox(po);
    const sx = b.x - cx;
    if (sx > CANVAS_W + 50 || sx + b.w < -50) return;
    ctx.fillRect(sx, b.y, b.w, b.h);
    ctx.strokeRect(sx, b.y, b.w, b.h);
  });
  projectileOrangeShots.forEach(s => {
    if (!s.active) return;
    const h = getProjectileOilShotHitbox(s);
    const sx = h.x - cx;
    if (sx > CANVAS_W + 50 || sx + h.w < -50) return;
    ctx.fillRect(sx, h.y, h.w, h.h);
    ctx.strokeRect(sx, h.y, h.w, h.h);
  });
  // 圖例（畫面左下）
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const legend = [['red box = damage hitbox', '#ff6060']];
  if (projectileOilShotCalibrationMode) {
    legend.push(['orange box = oil shot draw rect', '#ffb84d']);
    legend.push(['blue box = body draw rect', '#78c8ff']);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(8, CANVAS_H - 150, 250, 16 * legend.length + 4);
  legend.forEach(([txt, col], i) => {
    ctx.fillStyle = col;
    ctx.fillText(txt, 14, CANVAS_H - 137 + i * 16);
  });
  ctx.restore();
}

function updateProjectileOrangeShots(dtMs) {
  const frameMul = dtMs / 16.667;
  for (let i = projectileOrangeShots.length - 1; i >= 0; i--) {
    const s = projectileOrangeShots[i];
    s.x      += s.vx * frameMul;
    s.lifeMs -= dtMs;
    if (s.lifeMs <= 0) s.active = false;
    // 飛出畫面太遠（左側鏡頭外 300px 以上）也結束
    if (s.x < cameraX - 300 || s.x > cameraX + CANVAS_W + 400) s.active = false;
    if (!s.active) projectileOrangeShots.splice(i, 1); // 從陣列移除，不會永久累積
  }
}

// 以中心點畫一顆油彈（真正油彈與 F7 預覽共用）
function drawProjectileOilShotAt(screenCX, worldCY, bodyScale, alpha) {
  const { img, drawW, drawH } = getProjectileOilShotDrawSize(bodyScale);
  const x = screenCX - drawW / 2;
  const y = worldCY  - drawH / 2;
  ctx.save();
  if (alpha !== undefined) ctx.globalAlpha = alpha;
  if (img) {
    ctx.drawImage(img, x, y, drawW, drawH);
  } else {
    ctx.fillStyle = 'rgba(255,150,20,0.9)';
    ctx.beginPath();
    ctx.ellipse(screenCX, worldCY, drawW / 2, drawH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  return { x, y, drawW, drawH };
}

function drawProjectileOrangeShots(cx) {
  projectileOrangeShots.forEach(s => {
    if (!s.active) return;
    const sx = s.x - cx;
    if (sx > CANVAS_W + 300 || sx < -300) return;
    drawProjectileOilShotAt(sx, s.y, s.bodyScale);
  });
}

// v0.3.26-shot-calibration：F7 定位模式 — 不會飛走的預覽油彈 + 輔助框 + HUD
function drawProjectileOilShotCalibrationOverlay(cx) {
  if (!ADVENTURE_TEST_TOOLS_ENABLED || !projectileOilShotCalibrationMode) return;

  let lastSize = null;
  projectileOranges.forEach(po => {
    if (!po.active) return;
    const sp = getProjectileOilShotSpawnPoint(po);
    const r  = sp.rect;
    const bodySX = r.drawX - cx;
    if (bodySX > CANVAS_W + 200 || bodySX + r.drawW < -200) return;

    // 1. 本體 draw rect（藍框）
    ctx.save();
    ctx.strokeStyle = 'rgba(100,200,255,0.8)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bodySX, r.drawY, r.drawW, r.drawH);
    ctx.restore();

    // 2. 預覽油彈（不移動、不進 runtime、不造成傷害）
    const shotSX = sp.x - cx;
    const box = drawProjectileOilShotAt(shotSX, sp.y, sp.bodyScale, 0.9);
    lastSize = box;

    // 3. 預覽油彈 draw rect（橘框；紅框保留給 damage hitbox）
    ctx.save();
    ctx.strokeStyle = 'rgba(255,170,0,0.95)';
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x, box.y, box.drawW, box.drawH);

    // 3b. 預覽油彈的 damage hitbox（紅框；真正油彈飛走前可在這裡對位）
    const ph = getProjectileOilShotHitbox({ x: sp.x, y: sp.y });
    ctx.strokeStyle = 'rgba(255,40,40,0.95)';
    ctx.fillStyle   = 'rgba(255,40,40,0.12)';
    ctx.lineWidth   = projectileOilShotEditMode === 'oilHitbox' ? 3 : 1.5;
    ctx.fillRect  (ph.x - cx, ph.y, ph.w, ph.h);
    ctx.strokeRect(ph.x - cx, ph.y, ph.w, ph.h);
    // bodyHitbox mode：本體紅框加粗強調（本體紅框本身由 drawProjectileOrangeHitboxDebug 畫）
    if (projectileOilShotEditMode === 'bodyHitbox') {
      const bh = getProjectileOrangeBodyHitbox(po);
      ctx.lineWidth = 3;
      ctx.strokeRect(bh.x - cx, bh.y, bh.w, bh.h);
    }

    // 4. local anchor 十字線（黃色）
    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(shotSX - 10, sp.y); ctx.lineTo(shotSX + 10, sp.y);
    ctx.moveTo(shotSX, sp.y - 10); ctx.lineTo(shotSX, sp.y + 10);
    ctx.stroke();
    ctx.restore();
  });

  // HUD（右上，避開左上的 asset status）
  const oilImg = getProjectileOrangeImg('oil_shot_01');
  const hudW = 340, hudX = CANVAS_W - hudW - 10, hudY = 72, lineH = 16;
  const mode = projectileOilShotEditMode;
  const lines = [
    ['[Projectile Oil Shot Align Mode]', '#ffe066'],
    ['F7: off', '#cccccc'],
    ['H: mode = ' + mode, '#ffe066'],
    ['', '#cccccc'],
  ];
  if (mode === 'visual') {
    lines.push(
      ['localX: ' + projectileOilShotLocalX, '#80ffcc'],
      ['localY: ' + projectileOilShotLocalY, '#80ffcc'],
      ['offsetX: ' + projectileOilShotOffsetX, '#80ffcc'],
      ['offsetY: ' + projectileOilShotOffsetY, '#80ffcc'],
      ['scaleMult: ' + projectileOilShotScaleMult.toFixed(2), '#80ffcc'],
      ['drawW: ' + (lastSize ? lastSize.drawW.toFixed(1) : '—'), '#88aaff'],
      ['drawH: ' + (lastSize ? lastSize.drawH.toFixed(1) : '—'), '#88aaff'],
    );
  } else if (mode === 'oilHitbox') {
    lines.push(
      ['oilHitboxW: ' + projectileOilShotHitboxW, '#ff9090'],
      ['oilHitboxH: ' + projectileOilShotHitboxH, '#ff9090'],
      ['oilHitboxOffsetX: ' + projectileOilShotHitboxOffsetX, '#ff9090'],
      ['oilHitboxOffsetY: ' + projectileOilShotHitboxOffsetY, '#ff9090'],
    );
  } else {
    lines.push(
      ['bodyHitboxW: ' + projectileOrangeBodyHitboxW, '#ff9090'],
      ['bodyHitboxH: ' + projectileOrangeBodyHitboxH, '#ff9090'],
      ['bodyHitboxOffsetX: ' + projectileOrangeBodyHitboxOffsetX, '#ff9090'],
      ['bodyHitboxOffsetY: ' + projectileOrangeBodyHitboxOffsetY, '#ff9090'],
    );
  }
  lines.push(
    ['oil_shot_01: ' + (oilImg ? 'OK ' + oilImg.naturalWidth + 'x' + oilImg.naturalHeight : 'missing'),
      oilImg ? '#7dff9a' : '#ff8080'],
    ['', '#cccccc'],
    [mode === 'visual'
      ? 'visual: ↑↓←→ localX/localY, [/] scale'
      : mode + ": ↑↓←→ offset, [/] width, ;/' height", '#cccccc'],
    ['Shift: ×10   S save / R reset / C copy', '#cccccc'],
    ['red = damage hitbox, orange = shot draw rect', '#ffb84d'],
    ['blue = body draw rect', '#78c8ff'],
  );
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(hudX - 6, hudY - 14, hudW, lineH * lines.length + 8);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  lines.forEach(([txt, col], i) => {
    ctx.font = i === 0 ? 'bold 12px monospace' : '11px monospace';
    ctx.fillStyle = col;
    ctx.fillText(txt, hudX, hudY + lineH * i);
  });
  ctx.restore();
}

// ── Spinning enemies（被槌子打飛的小怪）────────
let spinningEnemies = [];
let scorpionDefeatEffects = []; // 純視覺死亡演出（不參與碰撞/攻擊/扣血）

// v0.3.12：隱藏寶藏取得瞬間最小視覺回饋（完全獨立，不共用蠍子特效）
let treasurePickupEffects = [];

// v0.3.17：蠍子擊殺回饋時序常數
// 閃爍（紅/白交替）→ 淡出上彈，整體 18 frames ≈ 0.3s，短促有擊殺感
const SCORPION_DEFEAT_TOTAL_FRAMES = 18;
const SCORPION_DEFEAT_FLASH_FRAMES = 8;

function spawnScorpionDefeatEffect(e) {
  const variantCfg = getEnemyVariantConfig(e);
  const skinKey    = variantCfg?.skinKey || 'scorpion_normal';
  // v0.3.18：鎖定方向快照（死亡瞬間 vx 還是巡邏方向，不受後續 knockback 影響）
  const facingLeft = (e.vx || 0) <= 0;
  // v0.3.18：保留 drawScaleMultiplier，heavyBody 死亡動畫維持 heavy 大小
  const tierCfg    = getEnemyTierConfig(e);
  const scaleMult  = (variantCfg?.drawScaleMultiplier ?? 1.0)
                   * (tierCfg?.drawScaleMultiplier    ?? 1.0);
  scorpionDefeatEffects.push({
    x:           e.x,
    y:           e.y,
    w:           e.w,
    h:           e.h,
    facingLeft,
    skinKey,
    scaleMult,
    timer:       0,
    totalFrames: SCORPION_DEFEAT_TOTAL_FRAMES,
    life:        SCORPION_DEFEAT_TOTAL_FRAMES,
    maxLife:     SCORPION_DEFEAT_TOTAL_FRAMES,
    vx: 0, vy: -0.4,
  });
}

function updateScorpionDefeatEffects(dt) {
  for (let i = scorpionDefeatEffects.length - 1; i >= 0; i--) {
    const fx = scorpionDefeatEffects[i];
    fx.timer++;
    fx.life--;
    fx.y += (fx.vy || 0) * dt;
    if (fx.timer >= fx.totalFrames) scorpionDefeatEffects.splice(i, 1);
  }
}

function drawScorpionDefeatEffects(cx) {
  scorpionDefeatEffects.forEach(fx => {
    const sx = fx.x - cx;
    if (sx > CANVAS_W + 60 || sx + fx.w < -60) return;

    const t       = fx.timer / fx.totalFrames; // 0 → 1
    const inFlash = fx.timer < SCORPION_DEFEAT_FLASH_FRAMES;
    const popY    = -Math.sin(t * Math.PI) * 8; // 上彈弧線，最多 8px
    const scale   = 1 - t * 0.08; // v0.3.17-test-2：縮小幅度降至 8%，不讓蠍子突然縮掉
    const alpha   = inFlash ? 1 : Math.max(0,
      1 - (t - SCORPION_DEFEAT_FLASH_FRAMES / fx.totalFrames)
        / (1 - SCORPION_DEFEAT_FLASH_FRAMES / fx.totalFrames));

    const img = getScorpionHurtImgForSkin(fx.skinKey)
             || getScorpionWalkImgForSkin(fx.skinKey);

    if (!img) {
      // 無圖 fallback：用紅橘 shadow glow，不畫矩形
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = 'rgba(255,60,60,0.8)';
      ctx.shadowBlur  = 14;
      ctx.fillStyle   = 'rgba(255,80,80,0.5)';
      ctx.beginPath();
      ctx.arc(sx + fx.w / 2, fx.y + fx.h / 2 + popY, fx.w * 0.45 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    const drawW   = fx.w * SCORPION_DRAW_SCALE * scale * (fx.scaleMult || 1.0);
    const drawH   = drawW * (img.height / img.width);
    const groundY = fx.y + fx.h + popY;
    const drawX   = sx + fx.w / 2 - drawW / 2 + SCORPION_DRAW_OFFSET_X;
    const drawY   = groundY - drawH * SCORPION_FOOT_ANCHOR_Y + SCORPION_DRAW_OFFSET_Y;

    // v0.3.17-test-2：image draw + source-atop flash overlay 必須在同一個
    // save/restore 區塊內，否則 source-atop 看不到已 drawn 的像素，變成矩形
    // v0.3.17-test-3：白閃 / 紅光暈交替，均依附在蠍子圖片本體上，不畫矩形
    const flashPhase = Math.floor(fx.timer / 2) % 2; // 0=白閃, 1=紅光暈

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (inFlash && flashPhase === 0) {
      // 白閃幀：白色光暈
      ctx.shadowColor = 'rgba(255,255,255,0.9)';
      ctx.shadowBlur  = 10;
    } else if (inFlash && flashPhase === 1) {
      // 紅光暈幀：紅色 shadow glow（不畫矩形，依附在圖片本體上）
      ctx.shadowColor = 'rgba(255,40,40,0.85)';
      ctx.shadowBlur  = 14;
    }

    if (fx.facingLeft) {
      ctx.translate(sx + fx.w / 2, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -drawW / 2, drawY, drawW, drawH);
      // 白閃幀：source-atop 白色疊層，依附在剛才的圖片像素上
      if (inFlash && flashPhase === 0) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.globalAlpha = 0.38 * alpha;
        ctx.fillStyle   = '#ffffff';
        ctx.fillRect(-drawW / 2, drawY, drawW, drawH);
      }
    } else {
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      if (inFlash && flashPhase === 0) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.globalAlpha = 0.38 * alpha;
        ctx.fillStyle   = '#ffffff';
        ctx.fillRect(drawX, drawY, drawW, drawH);
      }
    }

    ctx.restore();
  });
}

function updateHammerMelee() {
  if (player.meleeHammerActive <= 0) return;

  const atkX = player.facingRight
    ? player.x + player.w
    : player.x - CONFIG.HAMMER_ATTACK_RANGE;
  const atkY = player.y + (player.h - CONFIG.HAMMER_ATTACK_HEIGHT) / 2;
  const atkW = CONFIG.HAMMER_ATTACK_RANGE;
  const atkH = CONFIG.HAMMER_ATTACK_HEIGHT;
  // v0.3.35：2-4 橘子王（不消耗耐久：金色油管環讓武器實體化）
  if (orangeKingBoss) checkOrangeKingMeleeHit('hammer', atkX, atkY, atkW, atkH);

  // v0.3.18-test-2：hammer 傷害 = 2；HP 歸零才擊飛（heavyBody 3→1 不飛，1→0 才飛）
  function makeSpinning(e) {
    const variantCfg = getEnemyVariantConfig(e);
    const tierCfg    = getEnemyTierConfig(e);
    const skinKey    = variantCfg?.skinKey || 'scorpion_normal';
    const spinDamage = (e.variant === 'heavyBody') ? 2 : 1;
    spinningEnemies.push({
      x: e.x, y: e.y, w: e.w, h: e.h,
      vx: player.facingRight ? CONFIG.HAMMER_SPIN_SPEED : -CONFIG.HAMMER_SPIN_SPEED,
      life: CONFIG.HAMMER_SPIN_LIFE,
      angle: 0,
      skinKey,
      drawScaleMultiplier: ((variantCfg?.drawScaleMultiplier ?? 1.0)
                          * (tierCfg?.drawScaleMultiplier    ?? 1.0)),
      spinDamage,
      hitTargetIds: new Set(),
    });
  }

  enemies.forEach(e => {
    if (!e.active) return;
    if (!rectsOverlap(atkX, atkY, atkW, atkH, e.x, e.y, e.w, e.h)) return;

    // v0.3.18-fix-2：同一次槌擊對同一 enemy 只命中一次（防 hitbox 多幀重疊連扣 heavy）
    if (e.lastHammerSwingId === player.hammerSwingId) return;
    e.lastHammerSwingId = player.hammerSwingId;

    stageFlowHints.hammerUsedOnScorpion = true;

    const result = damageScorpionEnemy(e, 2, 'hammer', (killed) => {
      makeSpinning(killed);
    });

    // hammer 命中未殺死（heavyBody HP > 0）：重擊 knockback
    if (result === true) {
      e.vx = (player.facingRight ? 2.5 : -2.5);
    }

    if (!player.hammerHit) {
      player.hammerHit = true;
      consumeHammerDurability();
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

    // v0.3.18-test-2：使用 spinDamage + hitTargetIds 鎖，防止多幀重複扣同一目標
    enemies.forEach(e => {
      if (!e.active) return;
      if (!rectsOverlap(s.x, s.y, s.w, s.h, e.x, e.y, e.w, e.h)) return;

      // 每個 spinning 對同一目標只命中一次
      if (!s.hitTargetIds) s.hitTargetIds = new Set();
      const tid = e.runtimeId ?? -1;
      if (tid !== -1 && s.hitTargetIds.has(tid)) return;
      if (tid !== -1) s.hitTargetIds.add(tid);

      const dmg = s.spinDamage || 1;
      damageScorpionEnemy(e, dmg, 'spinning', (killed) => {
        // spinning kill → defeat effect（不連鎖擊飛，避免混亂）
        spawnScorpionDefeatEffect(killed);
      });

      s.life = 0; // spinning projectile 命中後消失
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

// ════════════════════════════════════════════════════════
//  v0.3.33：發現重要物品展示視窗（discovery item modal）
//  ──────────────────────────────────────────────────────
//  共用框架：openDiscoveryItemModal(item)
//    item = { id, type, emoji, name, title, noteText, hintText }
//  目前只有 bossNote 使用；未來 mapFragment / blueprint / specialItem / storyClue 可沿用。
//  資源獎勵（goldChest）不使用這個視窗。
//  開啟時暫停遊戲（gameState = 'paused'，但不顯示一般暫停選單），關閉後恢復。
// ════════════════════════════════════════════════════════
const DISCOVERY_MODAL_TREASURE_TYPES = ['bossNote']; // 會跳出展示視窗的 hiddenTreasure 類型
let discoveryModalWasPlaying = false;
// v0.3.33-fix-1：視窗模式
//   'discovery'：遊戲中找到重要物品 → 暫停遊戲，按鈕「收進背包，繼續冒險」，關閉後恢復
//   'read'     ：從結算頁 / 小V的家再次閱讀 → 不改 gameState，按鈕「關閉」
let discoveryModalMode = 'discovery';

// 重要物品若已在背包裡，就不再出現在關卡中（避免重複取得 / 重複跳視窗）
function isHiddenTreasureAvailable(t) {
  if (!t) return false;
  // v0.3.63：已收藏的觀察筆記仍會出現在 2-3（只列入本趟探索紀錄；不重新發放、不重播發現劇情、背包不變）
  return true;
}

function isDiscoveryItemModalOpen() {
  const el = document.getElementById('discovery-item-overlay');
  return !!(el && el.style.display && el.style.display !== 'none');
}

function escapeDiscoveryText(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderDiscoveryItemModal(item, mode) {
  const titleEl = document.getElementById('discovery-item-title');
  const bodyEl  = document.getElementById('discovery-item-body');
  const btnEl   = document.getElementById('btn-discovery-item-close');
  const isRead  = (mode === 'read');
  if (titleEl) titleEl.textContent = (item.emoji || '📦') + ' '
    + (isRead ? (item.name || '重要物品') : '發現重要物品！');
  if (btnEl) btnEl.textContent = isRead ? '關閉' : '收進背包，繼續冒險';
  if (!bodyEl) return;
  // 內文依「。」分行，方便手機閱讀
  // v0.3.35：保留原本句尾標點（。！？），不再一律補「。」
  const lines = (String(item.noteText || '').match(/[^。！？]+[。！？]?/g) || []).map(s => s.trim()).filter(Boolean);
  bodyEl.innerHTML =
      '<div class="discovery-item-emoji">' + escapeDiscoveryText(item.emoji || '📦') + '</div>'
    + (isRead ? '' : '<div class="discovery-item-name">' + escapeDiscoveryText(item.name || '') + '</div>')
    + '<div class="discovery-item-note">'
    +   (item.title ? '<div class="discovery-item-note-title">' + escapeDiscoveryText(item.title) + '</div>' : '')
    +   lines.map(l => '<p>' + escapeDiscoveryText(/[。！？]$/.test(l) ? l : l + '。') + '</p>').join('')
    + '</div>'
    + (item.hintText ? '<div class="discovery-item-hint">' + escapeDiscoveryText(item.hintText) + '</div>' : '');
}

function openDiscoveryItemModal(item, options = {}) {
  const overlay = document.getElementById('discovery-item-overlay');
  if (!overlay || !item) return;
  if (isDiscoveryItemModalOpen()) return; // 已開啟時不重複開
  const mode = (options.mode === 'read') ? 'read' : 'discovery';
  discoveryModalMode = mode;
  if (mode === 'discovery') {
    discoveryModalWasPlaying = (gameState === 'playing');
    if (discoveryModalWasPlaying) gameState = 'paused'; // 不呼叫 pauseGame()：不顯示一般暫停選單
  } else {
    discoveryModalWasPlaying = false; // 閱讀模式：完全不碰 gameState
  }
  renderDiscoveryItemModal(item, mode);
  // 閱讀模式要能蓋在小V的家(12000) / 氣球秘笈(13000) 之上 → 改成 fixed + 高 z-index
  overlay.classList.toggle('discovery-item-overlay--read', mode === 'read');
  overlay.style.display = 'flex';
  // 重新觸發進場動畫
  overlay.classList.remove('discovery-item-overlay--show');
  void overlay.offsetWidth;
  overlay.classList.add('discovery-item-overlay--show');
  // 開啟時放開所有移動 / 攻擊按鍵，避免關閉後角色自己往前衝
  if (mode === 'discovery') Object.keys(keys).forEach(k => { keys[k] = false; });
  console.log('[Discovery] open modal:', mode, item.id, item.type);
}

// v0.3.33-fix-1：閱讀模式入口（結算頁 / 小V的家）— 只讀取資料，不加入背包、不存檔、不改 gameState
// v0.3.62：玩家看到的名稱統一為「橘子王觀察筆記」（內部 ID orangeKingWeaknessNote01 不變，舊存檔照常讀取）
const KEY_ITEM_DISPLAY = { orangeKingWeaknessNote01: { name: '橘子王觀察筆記', emoji: '📜' } };
function keyItemDisplayName(k) { return (k && KEY_ITEM_DISPLAY[k.id] && KEY_ITEM_DISPLAY[k.id].name) || (k && (k.name || k.id)) || ''; }
function keyItemDisplayEmoji(k) { return (k && KEY_ITEM_DISPLAY[k.id] && KEY_ITEM_DISPLAY[k.id].emoji) || (k && k.emoji) || '📓'; }
// 暫停背包「閱讀」：暫時取得（本關找到、還沒通關）或正式取得都打開同一張筆記圖；關閉後回到暫停背包
function openObservationNoteFromBag() {
  const id = 'orangeKingWeaknessNote01';
  const has = !!((playerInventory.keyItems || {})[id] || (currentRunStats.pendingKeyItems || {})[id]);
  if (!has) return;
  if (typeof rpgAssetState === 'function' && rpgAssetState('orange_king_weakness_note') === 'loaded' && !rpgIsActive()) {
    const sc = rpgBuildScene('rpg016_king_note_show'); sc.next = null;
    const lv = LEVELS.find(l => l.hiddenTreasure && l.hiddenTreasure.id === id);
    sc.fallbackText = lv ? lv.hiddenTreasure.noteText : '';
    rpgOpen(sc, { ui: true }); return;
  }
  // 圖片沒載好 → 文字版
  const lv = LEVELS.find(l => l.hiddenTreasure && l.hiddenTreasure.id === id);
  if (lv) openDiscoveryItemModal({ id, type: 'bossNote', emoji: '📜', name: '橘子王觀察筆記', title: '', noteText: lv.hiddenTreasure.noteText, hintText: '' }, { mode: 'read' });
}
if (typeof window !== 'undefined') window.openObservationNoteFromBag = openObservationNoteFromBag;
function getKeyItemDisplayData(id) {
  const k = (playerInventory.keyItems || {})[id];
  if (!k) return null;
  // 舊版存檔沒有 hintText 時，從關卡資料補上
  let hintText = k.hintText || '';
  if (!hintText) {
    const lv = LEVELS.find(l => l.hiddenTreasure && l.hiddenTreasure.id === id);
    if (lv) hintText = lv.hiddenTreasure.hintText || '';
  }
  // v0.3.35：筆記內容以目前關卡資料為準（舊存檔裡的筆記也會顯示新版攻略）
  const srcLv = LEVELS.find(l => l.hiddenTreasure && l.hiddenTreasure.id === id);
  const latestNote = srcLv && srcLv.hiddenTreasure.noteText;
  return {
    id: k.id, type: k.type, emoji: keyItemDisplayEmoji(k), name: keyItemDisplayName(k),
    title: (srcLv && srcLv.hiddenTreasure.title) || k.title || '', /* v0.3.62：舊存檔的舊標題改用目前名稱 */ noteText: latestNote || k.noteText || '', hintText,
  };
}
function openKeyItemReadModal(id) {
  const item = getKeyItemDisplayData(id);
  if (!item) return;
  // v0.3.61：觀察筆記的閱讀也用同一張正式筆記圖（置中展示）；圖沒載好才用文字版
  if (id === 'orangeKingWeaknessNote01' && typeof rpgAssetState === 'function' && rpgAssetState('orange_king_weakness_note') === 'loaded' && !rpgIsActive()) {
    const sc = rpgBuildScene('rpg016_king_note_show'); sc.next = null; sc.fallbackText = item.noteText;
    rpgOpen(sc, { ui: true }); return;
  }
  openDiscoveryItemModal(item, { mode: 'read' });
}

function closeDiscoveryItemModal() {
  const overlay = document.getElementById('discovery-item-overlay');
  if (overlay) {
    overlay.style.display = 'none';
    overlay.classList.remove('discovery-item-overlay--show');
  }
  // 只有發現模式、且開窗前在遊戲中，才恢復遊戲；閱讀模式不改 gameState
  if (discoveryModalMode === 'discovery' && discoveryModalWasPlaying && gameState === 'paused') {
    gameState = 'playing';
    lastTime = 0; // 避免恢復時 dt 過大
  }
  if (overlay) overlay.classList.remove('discovery-item-overlay--read');
  discoveryModalWasPlaying = false;
  discoveryModalMode = 'discovery';
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
    try { advNoteExplore(t); } catch (e) {} // v0.3.63：本趟探索（和永久解鎖分開）
    try { sfxPlay('secretDiscovered'); } catch (e) {} // v0.3.64：真的找到隱藏寶藏 / 秘笈（鼻子發光不播）

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
      } else if (t.type === 'bossNote') {
        notifTitle    = (t.emoji || '📓') + ' 找到' + (t.name || 'Boss 觀察筆記') + '！';
        notifSubtitle = ((playerInventory.keyItems || {})[t.id]) ? '已經收藏過了（列入本趟探索紀錄）' : '暫時放進背包（通關後才正式帶回）'; // v0.3.62 / v0.3.63
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
      // v0.3.59：RPG 007（只演出；正式解鎖仍等通關）— 播 RPG 時不重複跳舊文字（獲得通知框仍保留）
      const rpgRecipe = (typeof rpgOnTreasureFound === 'function') && rpgOnTreasureFound(t);
      if (!rpgRecipe) showHint(t.foundMsg || ('找到隱藏秘笈：' + (t.recipeName || '') + '！'), 320);
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
      // v0.3.59：RPG 008 小V的簡短反應（真的拿到這次寶箱獎勵才播）；獎勵數字仍由「獲得金幣寶箱！金幣 +N」通知框顯示
      const rpgChest = (typeof rpgOnTreasureFound === 'function') && rpgOnTreasureFound(t);
      if (!rpgChest) showHint(t.foundMsg || ('找到隱藏寶箱！獲得 ' + coins + ' 金幣！'), 320); // v0.3.31：可用關卡 foundMsg
    } else if (t.type === 'bossNote') {
      // v0.3.33-fix-1：Boss 弱點筆記先放在本關 pending，通關（triggerClear）才正式寫入
      // playerInventory.keyItems 並存檔；死亡 / 重試 / 時間到都不會保存，重試時可再找一次
      const noteId = t.id || 'bossNote';
      const isNewNote = !(playerInventory.keyItems || {})[noteId]; // 已正式取得的不會出現在關卡（防呆）
      if (!currentRunStats.pendingKeyItems) currentRunStats.pendingKeyItems = {};
      currentRunStats.pendingKeyItems[noteId] = {
        id:         noteId,
        type:       'bossNote',
        name:       t.name || 'Boss 觀察筆記',
        emoji:      t.emoji || '📓',
        title:      t.title || t.name || 'Boss 觀察筆記',
        noteText:   t.noteText || '',
        hintText:   t.hintText || '',
      };
      currentRunStats.foundHiddenTreasureName = t.name || 'Boss 觀察筆記';
      currentRunStats.foundBossNote = {
        id: noteId, name: t.name || 'Boss 觀察筆記', title: t.title || '', noteText: t.noteText || '',
      };
      console.log('boss note found (pending until clear):', noteId);
      showHint(t.foundMsg || ('找到' + (t.name || 'Boss 觀察筆記') + '！'), 320);
      // v0.3.61：橘子王觀察筆記 → 畫面正中央展示正式筆記圖，接著小V反應（只展示；正式取得仍等通關）
      // v0.3.62：先小V「咦！？這是什麼？」（依顯示模式）→ 中央展示（一定會有）→ 讀完反應（依顯示模式）
      const rpgNoteShow = isNewNote && noteId === 'orangeKingWeaknessNote01' && (typeof rpgRequest === 'function')
        && rpgAssetState('orange_king_weakness_note') !== 'failed'
        && (rpgRequest('rpg019_king_note_find', () => true) || rpgRequest('rpg016_king_note_show', () => true));
      // v0.3.33：重要發現物品 → 展示視窗（資料已先存好，視窗只負責展示）— 有中央展示時不再疊第二個視窗
      if (!rpgNoteShow && isNewNote && DISCOVERY_MODAL_TREASURE_TYPES.includes(t.type)) {
        openDiscoveryItemModal({
          id:       noteId,
          type:     t.type,
          emoji:    t.emoji || '📓',
          name:     t.name || 'Boss 觀察筆記',
          title:    t.title || '',
          noteText: t.noteText || '',
          hintText: t.hintText || '',
        });
      }
    }
  } catch(e) { console.error('checkHiddenTreasure error:', e.message, e.stack); }
}

function updateEnemies() {
  enemies.forEach(e => {
    if (!e.active) return;
    if (e.hitFlash > 0) e.hitFlash--;
    if ((e.hurtCooldown || 0) > 0) e.hurtCooldown--; // v0.3.18-test-2：防抖計時

    // v0.3.15：從 variant+tier 讀取速度倍率；舊資料無 type 時 fallback scorpion/normal/normal
    const variantCfg = getEnemyVariantConfig(e);
    const tierCfg    = getEnemyTierConfig(e);
    const speedMult  = (variantCfg?.baseSpeedMultiplier ?? 1.0) * (tierCfg?.speedMultiplier ?? 1.0);
    // 基礎速度 = 原始 |vx| 大小（已在 buildEnemies 時設為 CONFIG.ENEMY_SPEED）
    const baseSpeed = Math.abs(e.baseVx ?? CONFIG.ENEMY_SPEED);
    const effectiveSpeed = baseSpeed * speedMult;

    // Patrol（方向不變，速度大小依 variant+tier）
    const dir = e.vx >= 0 ? 1 : -1;
    e.vx = dir * effectiveSpeed;
    e.x += e.vx;
    if (e.x < e.patrol - e.patrolRange || e.x > e.patrol + e.patrolRange) {
      e.vx *= -1;
    }

    // Keep on ground
    if (e.y + e.h < GROUND_Y) {
      e.y = GROUND_Y - e.h;
    }
  });
}

function checkCollectibles() {
  const px = player.x, py = player.y, pw = player.w, ph = player.h;

  coins.forEach(c => {
    if (c.collected) return;
    if (rectsOverlap(px, py, pw, ph, c.x - CONFIG.COIN_R, c.y - CONFIG.COIN_R, CONFIG.COIN_R*2, CONFIG.COIN_R*2)) {
      c.collected = true;
      try { advNoteCollect('coin', c); } catch (e) {} // v0.3.63
      try { sfxPlay('coinPickup'); } catch (e) {} // v0.3.65（聲音有短冷卻，金幣一定會加）
      currentRunStats.coins++;
      player.coinsCollected++;      // HUD 顯示用（與 currentRunStats 同步）
      playerInventory.coins++;
    }
  });

  balloons260.forEach(b => {
    if (b.collected) return;
    if (rectsOverlap(px, py, pw, ph, b.x - CONFIG.BALLOON_W/2, b.y - CONFIG.BALLOON_H/2, CONFIG.BALLOON_W, CONFIG.BALLOON_H)) {
      b.collected = true;
      try { advNoteCollect('b260', b); } catch (e) {} // v0.3.63
      try { sfxPlay('balloonPickup'); } catch (e) {} // v0.3.65
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
      const _roundBefore = Number(playerInventory.roundBalloon || 0);
      playerInventory.roundBalloon = Math.min(
        ROUND_BALLOON_CARRY_LIMIT,
        (playerInventory.roundBalloon || 0) + 1
      );
      if (Number(playerInventory.roundBalloon || 0) > _roundBefore) { try { advNoteCollect('round', r); } catch (e) {} try { sfxPlay('balloonPickup'); } catch (e) {} } // v0.3.63：背包真的多了一顆才算拾取 / v0.3.65 才播拾取聲
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
    // 噴油範圍（v0.3.14-test-2：固定使用 oil_spray_03 最遠有效距離，不做三段式 hitbox）
    if (o.sprayActive) {
      const sprayImg = getOrangeEnemyImg && getOrangeEnemyImg('spray');
      if (sprayImg && sprayImg.naturalWidth) {
        // bodyScale = 與 drawOrangeNemesis 完全相同的計算，不重新發明
        const baseW      = o.w * ORANGE_BODY_DRAW_SCALE;
        const baseH      = baseW * (sprayImg.naturalHeight / sprayImg.naturalWidth);
        const bodyScale  = baseW / sprayImg.naturalWidth;
        const footY      = baseH * ORANGE_FOOT_ANCHOR_Y;
        const spImgDrawX = o.x + o.w / 2 - baseW / 2;
        const spImgDrawY = (o.y + o.h) - footY;
        const mouthWorldX = spImgDrawX + ORANGE_SPRAY_MOUTH_X * bodyScale;
        const mouthWorldY = spImgDrawY + ORANGE_SPRAY_MOUTH_Y * bodyScale;

        // 有效噴出距離 = ORANGE_OIL_HITBOX_SOURCE_W * bodyScale
        const hitboxW = ORANGE_OIL_HITBOX_SOURCE_W * bodyScale;
        const hitboxH = CONFIG.ORANGE_SPRAY_H; // 高度沿用原有值，略小於油圖視覺高度
        // 目前橘子怪固定向左噴（sprayDir = -1）
        const hitX = mouthWorldX - hitboxW;
        const hitY = mouthWorldY - hitboxH / 2;
        if (rectsOverlap(px, py, pw, ph, hitX, hitY, hitboxW, hitboxH)) {
          damagePlayer();
        }
      } else {
        // sprayImg 尚未載入：fallback 舊邏輯，避免判定消失
        const sx = o.sprayDir < 0
          ? o.x - CONFIG.ORANGE_SPRAY_W
          : o.x + o.w;
        const sy = o.y + (o.h - CONFIG.ORANGE_SPRAY_H) / 2;
        if (rectsOverlap(px, py, pw, ph, sx, sy, CONFIG.ORANGE_SPRAY_W, CONFIG.ORANGE_SPRAY_H)) {
          damagePlayer();
        }
      }
    }
  });

  // v0.3.19：Chapter 2 煙囟橘子油幕碰撞判定
  checkChimneyOrangeDamage();
  // v0.3.20：Chapter 2 雙噴嘴橘子碰撞判定
  checkDualNozzleOrangeDamage();
  // v0.3.21：Chapter 2 向上油幕橘子碰撞判定
  checkFanOrangeDamage();
  // v0.3.26：飛行油彈橘子（本體 + 飛行油彈）碰撞判定
  checkProjectileOrangeDamage();
}

function damagePlayer() {
  const _hpBefore = player.hp;
  try { sfxOnPlayerHurt(); } catch (e) {} // v0.3.64：實際受傷才播（呼叫端已檢查無敵影格）
  player.hp--;
  try { advNoteDamage(Math.max(0, _hpBefore - Math.max(0, player.hp))); } catch (e) {} // v0.3.63：最多記錄當時真正剩下的 HP
  player.invincible = 90; // 約 1.5 秒無敵（90 幀 @ 60fps）
  currentRunStats.damageTaken++;
  if (player.hp <= 0) triggerFailed();
}

function checkFinish() {
  if (isOrangeKingStageActive()) return; // v0.3.35：Boss 房沒有終點線
  if (player.x + player.w >= FINISH_X) {
    triggerClear();
  }
}


// ════════════════════════════════════════════════════════════════════
//  v0.3.35：第二章 2-4 Boss「橘子王」（foundation：玩法機制可測，美術為簡化 canvas 圖形）
//  ──────────────────────────────────────────────────────────────────
//  ・Boss 專用房：不自動捲動、沒有終點線，橘子王 HP 歸零才過關
//  ・狀態機（orangeKingBoss.phase）：
//      introWait → introDrop → introRoar
//      → [教學衝撞] chargeWarn → chargeCurl → chargeSpin → chargeDash → chargeRecover → leapBack
//      → waitRing（等玩家撿金色油管環）→ idle
//      → 攻擊組合（固定 pattern 輪替）→ cooldown（喘氣，唯一可受傷時段）→ idle → 下一組 …
//      攻擊：sprayWarn → sprayFire（三高度水平噴油）
//            lobAim → lobFire（前景拋物線油彈，不落地、不留油漬）
//            charge*（縮球衝撞，最高平台可躲）
//            slamUp → slamDown（跳起震地，地面短暫油漬）
//      HP 0 → defeated（漏氣、王冠掉落、油管環失去光芒）→ triggerClear()
//  ・金色油管環：只在第一次教學衝撞後掉落一次；撿到後氣球劍 / 槌在 2-4 內暫時實體化
//    （runtime-only，不進 playerInventory，不存檔；restart / 死亡重試 / 離開 2-4 都會重置）
// ════════════════════════════════════════════════════════════════════
const ORANGE_KING = {
  MAX_HP:          8,
  HOME_X:          730,   // 站位（左緣）
  W:               190,
  H:               190,
  BALL_W:          160,   // 縮球後尺寸
  BALL_H:          150,   // 衝撞判定頂端 = GROUND_Y - 150 → 打得到地面 / 中層，打不到最高平台
  DASH_SPEED:      11,    // px / frame（v0.3.35-fix-1：12 → 11）
  TUTORIAL_DASH_SPEED: 8, // （9 → 8）
  DASH_STOP_X:     18,
  COOLDOWN_MS:       3200, // v0.3.35-fix-1：一般喘氣（2300 → 3200）
  FIRST_COOLDOWN_MS: 3900, // 第一次正式喘氣（2800 → 3900）
  CHARGE_COOLDOWN_MS: 3600, // 縮球衝撞（大招）後的喘氣，略長
  // v0.3.35-damage-cap-fix-1：Boss 受傷規則
  HURT_INVULN_MS:  300,   // 被打一下後短暫無敵（450 → 300），避免同一揮砍連續幀重複計算
  MELEE_DAMAGE:    0.5,   // 任何有效近戰（劍 / 槌）每次扣 0.5 格（原本劍 1、槌 2）
  COOLDOWN_DAMAGE_CAP: 2, // 每次喘氣最多扣 2 格；扣滿立即結束喘氣、進入下一組攻擊
  SPRAY_BAND_H:    46,
  LOB_GRAVITY:     0.15,  // v0.3.35-fix-1：0.22 → 0.15（配合較慢的水平速度，弧線不會飛出畫面）
  LOB_RADIUS:      15,
  PUDDLE_W:        100,
  PUDDLE_LIFE_MS:  3200,
  RING_LAND_X:     440,
};
// v0.3.35-fix-1：Boss 節奏（ms）— 預警 → 出招 → 收招 / 停頓 → 下一招 → 整組結束才喘氣
const ORANGE_KING_TIMING = {
  IDLE_BEFORE_PATTERN: 1100, // 喘氣結束 → 下一組攻擊前的站定（900 → 1100）
  BETWEEN_ATTACKS:      650, // 同一組兩招之間的停頓（380 → 650）
  SPRAY_WARN:          1100, // 油管發亮 + 水平預警線（850 → 1100）
  SPRAY_FIRE:           750, // 實際噴油（650 → 750）
  SPRAY_RECOVER:        450, // 噴完收招（新增）
  LOB_AIM:             1250, // 拋物線預測線 + 頭頂油管發亮（950 → 1250）
  LOB_RECOVER:          800, // 發射後收招（450 → 800；油彈仍在飛）
  CHARGE_WARN:          850, // 表情變兇 / 抖動（750 → 850）
  CHARGE_CURL:          600, // 蹲低壓縮（380 → 600）
  CHARGE_SPIN:         1000, // 原地高速旋轉蓄力（650 → 1000）
  CHARGE_STUN:         1000, // 撞牆暈眩（750 → 1000）
  LEAP_BACK:            900, // 跳回右側（750 → 900）
  TUTORIAL_CHARGE_WARN: 1400, // 第一次教學衝撞再慢一點（1300 → 1400）
  TUTORIAL_CHARGE_CURL:  800, // （380 → 800）
  TUTORIAL_CHARGE_SPIN: 1300, // （900 → 1300）
  TUTORIAL_CHARGE_STUN: 1300, // （1100 → 1300）
  SLAM_PREP:            750, // 起跳前搖：蹲低抖動（新增）
  SLAM_UP:              550, // 離地（480 → 550）
  SLAM_DOWN:            300, // 落下（260 → 300）
  SLAM_LAND:            650, // 落地震動後停頓（450 → 650）
};
// 三高度油管（世界座標 y 中心）：高 = 最高平台、中 = 中層平台、低 = 地面
// v0.3.36：實際攻擊高度改由 ORANGE_KING_MACHINE_ART 的 pipeHighY / pipeMidY / pipeLowY 決定（此表保留作參考）
const ORANGE_KING_LANES = {
  high: { y: GROUND_Y - 260, label: '高' },
  mid:  { y: GROUND_Y - 155, label: '中' },
  low:  { y: GROUND_Y - 40,  label: '低' },
};
const ORANGE_KING_LANE_ORDER = ['low', 'high', 'mid', 'high', 'low', 'mid'];
// 拋物線油彈路線（依序輪替）：tx / ty = 路線經過的目標點，vx = 水平速度
const ORANGE_KING_LOB_ROUTES = [
  // v0.3.35-fix-1：水平速度放慢（約 1.5 秒飛完），配合 LOB_GRAVITY 0.15
  // v0.3.41：發射點改到 idle 圖油管口（約 887,156，比原本高 56px）→ 前兩條路線水平速度微調，
  //          讓弧頂仍在 HUD 下方（約 y=77 / 84），飛行時間與上一版相近（約 1.2～1.6 秒）
  { tx: 150, ty: GROUND_Y - 255, vx: -10  },  // 掃過最高平台
  { tx: 200, ty: GROUND_Y - 150, vx: -8   },  // 掃過中層平台
  { tx: 480, ty: GROUND_Y - 35,  vx: -5.5 },  // 打地面中段
  { tx: 120, ty: GROUND_Y - 30,  vx: -8   },  // 打地面左側
];
// 攻擊組合（固定順序輪替，每組結束才進 cooldown）
const ORANGE_KING_PATTERNS = [
  ['spray', 'spray'],
  ['lob', 'lob'],
  ['slam'],
  ['spray', 'lob'],
  ['charge'],
];
const ORANGE_KING_PUDDLE_SETS = [
  [110, 330, 560],
  [200, 450],
];

var orangeKingBoss = null;          // runtime 狀態（只在 2-4 存在）
var orangeKingInputLocked = false;  // 登場動畫期間鎖操作

function isBossStageLevel(index) {
  const lv = LEVELS[index];
  return !!(lv && lv.isBossStage);
}
function isOrangeKingStageActive() {
  return !!orangeKingBoss && isBossStageLevel(currentLevelIndex);
}

function initOrangeKingBoss() {
  if (typeof equippedSword !== 'undefined' && equippedSword.id) activeSlot = 'sword'; // v0.3.46：2-4 只限劍
  orangeKingBoss = {
    hp: ORANGE_KING.MAX_HP, maxHp: ORANGE_KING.MAX_HP,
    x: ORANGE_KING.HOME_X, y: -ORANGE_KING.H - 40,
    w: ORANGE_KING.W, h: ORANGE_KING.H,
    vy: 0,
    phase: 'introWait', phaseMs: 0, totalMs: 0,
    curled: false, spinAngle: 0,
    tutorialDone: false,
    hpBarVisible: false,
    ring: null,                 // { x, y, vx, vy, state: 'onBoss'|'flying'|'grounded'|'collected' }
    ringActive: false,          // 撿到金色油管環 → 氣球武器實體化
    patternIndex: 0, patternStep: 0, currentPattern: null,
    laneCursor: 0, lobCursor: 0, puddleCursor: 0, cooldownCount: 0,
    activeLane: null, activeLob: null,
    lobShots: [], puddles: [], floatTexts: [],
    hurtFlashMs: 0, invulnMs: 0,
    lastSwordSwingId: -1, lastHammerSwingId: -1,
    lastBlockedSwing: '',
    shakeMs: 0, shakePower: 0,
    banner: null,               // { text, sub, ms, dur }
    ringReminderMs: 0,
    dashHitDone: false,
    defeatMs: 0, crownY: 0, crownVy: 0, crownRot: 0,
    clearTriggered: false,
    ringAuraMs: 0, sparks: [],
    victorySafe: false,
    cooldownDamageTaken: 0,      // v0.3.35-damage-cap-fix-1：本次喘氣已受到的傷害（上限 2 格）          // v0.3.35-victory-pose-fix-1：擊敗後的勝利保護（不共用 player.invincible）
  };
  orangeKingInputLocked = true;
  orangeKingBoss.ring = { state: 'onBoss', x: 0, y: 0, vx: 0, vy: 0 };
  currentRunStats.chapter2Complete = false;
}

// 離開 2-4（或重置）時清掉 Boss 與暫時能力
function clearOrangeKingBoss() {
  orangeKingBoss = null;
  orangeKingInputLocked = false;
}

function setOrangeKingPhase(phase) {
  const b = orangeKingBoss;
  b.phase = phase;
  b.phaseMs = 0;
}
function orangeKingShake(ms, power) {
  const b = orangeKingBoss;
  b.shakeMs = Math.max(b.shakeMs, ms);
  b.shakePower = Math.max(b.shakePower, power);
}
function orangeKingBanner(text, sub, dur) {
  orangeKingBoss.banner = { text, sub: sub || '', ms: 0, dur: dur || 1600 };
}
function orangeKingFloatText(text, x, y, color) {
  orangeKingBoss.floatTexts.push({ text, x, y, ms: 0, color: color || '#fff' });
}

// 衝撞 / 縮球時的身體矩形（世界座標）
function getOrangeKingBodyRect() {
  const b = orangeKingBoss;
  if (b.curled) {
    return { x: b.x, y: GROUND_Y - ORANGE_KING.BALL_H, w: ORANGE_KING.BALL_W, h: ORANGE_KING.BALL_H };
  }
  return { x: b.x, y: b.y, w: b.w, h: b.h };
}
// 可受傷 hitbox（站在站位時的身體，四周內縮）
function getOrangeKingHurtRect() {
  const r = getOrangeKingBodyRect();
  return { x: r.x + 10, y: r.y + 10, w: r.w - 20, h: r.h - 20 };
}
// 衝撞 hitbox：只覆蓋地面與中低高度（頂端 = GROUND_Y - BALL_H），不覆蓋最高平台
function getOrangeKingDashHitbox() {
  const r = getOrangeKingBodyRect();
  return { x: r.x + 8, y: r.y + 6, w: r.w - 16, h: r.h - 6 };
}
// v0.3.36：水平噴油改由右側機關的三根油管噴出 — 噴嘴 = 對應油管的左端管口
function getOrangeKingNozzle(laneKey) {
  const pg = getOrangeKingPipeGeom(laneKey);
  return { x: pg.mouthX, y: pg.y };
}
// v0.3.41：發射點 = idle 圖背後油管的管口（跟著 idle 圖定位一起移動；圖沒載好也用同一點，判定一致）
function getOrangeKingLobOrigin() {
  const b = orangeKingBoss;
  const A = ORANGE_KING_MACHINE_ART, S = ORANGE_KING_BOSS_ART_SRC.idle, sc = A.bossIdleScale;
  const ax = b.x + b.w / 2 + A.bossIdleOffsetX, ay = b.y + b.h + A.bossIdleOffsetY;
  return { x: ax + (S.lobMouthX - S.anchorX) * sc + A.arcShotOriginOffsetX, y: ay + (S.lobMouthY - S.anchorY) * sc + A.arcShotOriginOffsetY };
}
// v0.3.45：拋物線油彈碰撞圓（中心可偏移、半徑可調；預設 = 原本半徑 15、無偏移）
function getOrangeKingArcShotHitbox(x, y) {
  const A = ORANGE_KING_MACHINE_ART;
  return { x: x + A.arcShotHitboxOffsetX, y: y + A.arcShotHitboxOffsetY, r: Math.max(2, A.arcShotHitboxRadius) };
}
// 依路線算出拋物線參數（經過目標點），軌跡預測與實際飛行用同一組公式
function buildOrangeKingLob(route) {
  const o  = getOrangeKingLobOrigin();
  const g  = ORANGE_KING.LOB_GRAVITY;
  const T  = (o.x - route.tx) / Math.abs(route.vx);
  const vy0 = (route.ty - o.y - 0.5 * g * T * T) / T;
  return { sx: o.x, sy: o.y, vx: route.vx, vy0, g, t: 0 };
}
function getLobPoint(lob, t) {
  return { x: lob.sx + lob.vx * t, y: lob.sy + lob.vy0 * t + 0.5 * lob.g * t * t };
}

function playerHazardRect() {
  return { x: player.x + 6, y: player.y + 6, w: player.w - 12, h: player.h - 6 };
}
function orangeKingHitPlayer() {
  // v0.3.35-victory-pose-fix-1：擊敗後（勝利保護旗標）Boss 的任何攻擊都不再判定
  const b = orangeKingBoss;
  if (b && (b.victorySafe || b.phase === 'defeated')) return false;
  if (player.invincible > 0 || gameState !== 'playing') return false;
  damagePlayer();
  return true;
}

// ── 每幀更新 ─────────────────────────────────────────
function updateOrangeKingBoss(dtMs) {
  const b = orangeKingBoss;
  if (!b) return;
  const k = dtMs / 16.667;
  b.phaseMs += dtMs;
  b.totalMs += dtMs;
  if (b.shakeMs > 0) { b.shakeMs -= dtMs; if (b.shakeMs <= 0) b.shakePower = 0; }
  if (b.hurtFlashMs > 0) b.hurtFlashMs -= dtMs;
  if (b.invulnMs > 0) b.invulnMs -= dtMs;
  if (b.banner) { b.banner.ms += dtMs; if (b.banner.ms >= b.banner.dur) b.banner = null; }
  b.floatTexts.forEach(f => { f.ms += dtMs; f.y -= 0.6 * k; });
  if (b.ringAuraMs > 0) b.ringAuraMs -= dtMs;
  b.sparks.forEach(sp => { sp.ms += dtMs; sp.x += sp.vx * k; sp.y += sp.vy * k; sp.vy += 0.25 * k; });
  b.sparks = b.sparks.filter(sp => sp.ms < 500);
  b.floatTexts = b.floatTexts.filter(f => f.ms < 900);

  tickOrangeKingPendingHint(dtMs);
  updateOrangeKingPlatformHint(dtMs); // v0.3.40
  updateOrangeKingRing(dtMs, k);
  updateOrangeKingLobShots(k);
  updateOrangeKingPuddles(dtMs);

  switch (b.phase) {
    // ── 登場 ──
    case 'introWait':
      if (b.phaseMs >= 450) { setOrangeKingPhase('introDrop'); b.vy = 2; }
      break;
    case 'introDrop':
      b.vy += 0.9 * k;
      b.y += b.vy * k;
      if (b.y >= GROUND_Y - b.h) {
        b.y = GROUND_Y - b.h;
        orangeKingShake(500, 9);
        b.hpBarVisible = true;
        orangeKingBanner('橘子王 登場！', '', 1500);
        setOrangeKingPhase('introRoar');
      }
      break;
    case 'introRoar':
      if (b.phaseMs >= 1300) {
        orangeKingInputLocked = false;
        showHint('⚠️ 橘子王要衝過來了！快跳上最高的平台躲開！', 260);
        startOrangeKingCharge(true);
      }
      break;

    // ── 縮球衝撞（教學 + 正式共用）──
    case 'chargeWarn':
      if (b.phaseMs >= (b.chargeTutorial ? ORANGE_KING_TIMING.TUTORIAL_CHARGE_WARN : ORANGE_KING_TIMING.CHARGE_WARN)) setOrangeKingPhase('chargeCurl');
      break;
    case 'chargeCurl':
      if (b.phaseMs >= (b.chargeTutorial ? ORANGE_KING_TIMING.TUTORIAL_CHARGE_CURL : ORANGE_KING_TIMING.CHARGE_CURL)) {
        b.curled = true;
        b.x = ORANGE_KING.HOME_X + (ORANGE_KING.W - ORANGE_KING.BALL_W) / 2;
        setOrangeKingPhase('chargeSpin');
      }
      break;
    case 'chargeSpin':
      b.spinAngle += 0.45 * k;
      if (b.phaseMs >= (b.chargeTutorial ? ORANGE_KING_TIMING.TUTORIAL_CHARGE_SPIN : ORANGE_KING_TIMING.CHARGE_SPIN)) { b.dashHitDone = false; setOrangeKingPhase('chargeDash'); }
      break;
    case 'chargeDash': {
      b.spinAngle += 0.6 * k;
      const speed = b.chargeTutorial ? ORANGE_KING.TUTORIAL_DASH_SPEED : ORANGE_KING.DASH_SPEED;
      b.x -= speed * k;
      const hb = getOrangeKingDashHitbox();
      const pr = playerHazardRect();
      if (!b.dashHitDone && rectsOverlap(pr.x, pr.y, pr.w, pr.h, hb.x, hb.y, hb.w, hb.h)) {
        if (orangeKingHitPlayer()) b.dashHitDone = true;
      }
      if (b.x <= ORANGE_KING.DASH_STOP_X) {
        b.x = ORANGE_KING.DASH_STOP_X;
        orangeKingShake(350, 7);
        setOrangeKingPhase('chargeRecover');
      }
      break;
    }
    case 'chargeRecover':
      if (b.chargeTutorial && b.ring.state === 'onBoss' && b.phaseMs >= 250) dropOrangeKingRing();
      if (b.phaseMs >= (b.chargeTutorial ? ORANGE_KING_TIMING.TUTORIAL_CHARGE_STUN : ORANGE_KING_TIMING.CHARGE_STUN)) {
        b.curled = false;
        b.y = GROUND_Y - b.h;
        b.leapFromX = b.x;
        setOrangeKingPhase('leapBack');
      }
      break;
    case 'leapBack': {
      const dur = ORANGE_KING_TIMING.LEAP_BACK;
      const p = Math.min(1, b.phaseMs / dur);
      b.x = b.leapFromX + (ORANGE_KING.HOME_X - b.leapFromX) * p;
      b.y = GROUND_Y - b.h - Math.sin(p * Math.PI) * 230;
      if (p >= 1) {
        b.x = ORANGE_KING.HOME_X;
        b.y = GROUND_Y - b.h;
        orangeKingShake(250, 5);
        if (b.chargeTutorial) {
          b.chargeTutorial = false;
          b.tutorialDone = true;
          b.ringReminderMs = 0;
          setOrangeKingPhase(b.ringActive ? 'idle' : 'waitRing');
        } else {
          finishOrangeKingAttack();
        }
      }
      break;
    }

    // ── 等玩家撿金色油管環 ──
    case 'waitRing':
      b.ringReminderMs += dtMs;
      if (b.ringReminderMs >= 5000) {
        b.ringReminderMs = 0;
        showHint('✨ 撿起地上發光的金色油管環！', 200);
      }
      if (b.ringActive && b.phaseMs >= 300) setOrangeKingPhase('idle');
      break;

    case 'idle':
      if (b.phaseMs >= ORANGE_KING_TIMING.IDLE_BEFORE_PATTERN) startNextOrangeKingPattern();
      break;
    case 'between':
      if (b.phaseMs >= ORANGE_KING_TIMING.BETWEEN_ATTACKS) runOrangeKingPatternStep();
      break;

    // ── 攻擊 A：三高度水平噴油 ──
    case 'sprayWarn':
      if (b.phaseMs >= ORANGE_KING_TIMING.SPRAY_WARN) setOrangeKingPhase('sprayFire');
      break;
    case 'sprayFire': {
      const band = getOrangeKingSprayBand(b.activeLane);
      const pr = playerHazardRect();
      if (rectsOverlap(pr.x, pr.y, pr.w, pr.h, band.x, band.y, band.w, band.h)) orangeKingHitPlayer();
      if (b.phaseMs >= ORANGE_KING_TIMING.SPRAY_FIRE) { b.activeLane = null; setOrangeKingPhase('sprayRecover'); }
      break;
    }
    case 'sprayRecover': // 收招停頓
      if (b.phaseMs >= ORANGE_KING_TIMING.SPRAY_RECOVER) finishOrangeKingAttack();
      break;

    // ── 攻擊 B：前景拋物線油彈 ──
    case 'lobAim':
      if (b.phaseMs >= ORANGE_KING_TIMING.LOB_AIM) {
        const shot = Object.assign({}, b.activeLob, { t: 0, x: b.activeLob.sx, y: b.activeLob.sy });
        b.lobShots.push(shot);
        b.lobMuzzle = { x: b.activeLob.sx, y: b.activeLob.sy, ms: 0 }; // v0.3.46：管口噴出的油花
        setOrangeKingPhase('lobFire');
      }
      break;
    case 'lobFire':
      if (b.phaseMs >= ORANGE_KING_TIMING.LOB_RECOVER) { b.activeLob = null; finishOrangeKingAttack(); }
      break;

    // ── 攻擊 D：跳起震地 ──
    case 'slamPrep': // 起跳前搖：蹲低抖動
      if (b.phaseMs < 100) orangeKingShake(200, 2);
      if (b.phaseMs >= ORANGE_KING_TIMING.SLAM_PREP) setOrangeKingPhase('slamUp');
      break;
    case 'slamUp': {
      const p = Math.min(1, b.phaseMs / ORANGE_KING_TIMING.SLAM_UP);
      b.y = GROUND_Y - b.h - Math.sin(p * Math.PI / 2) * 170;
      if (p >= 1) setOrangeKingPhase('slamDown');
      break;
    }
    case 'slamDown': {
      const p = Math.min(1, b.phaseMs / ORANGE_KING_TIMING.SLAM_DOWN);
      b.y = GROUND_Y - b.h - (1 - p * p) * 170;
      if (p >= 1) {
        b.y = GROUND_Y - b.h;
        orangeKingShake(450, 10);
        spawnOrangeKingPuddles();
        setOrangeKingPhase('slamLand');
      }
      break;
    }
    case 'slamLand':
      if (b.phaseMs >= ORANGE_KING_TIMING.SLAM_LAND) finishOrangeKingAttack();
      break;

    // ── 喘氣（唯一可受傷時段）──
    case 'cooldown':
      if (b.phaseMs >= b.cooldownDur) setOrangeKingPhase('idle');
      break;

    // ── 擊敗 ──
    case 'defeated':
      updateOrangeKingDefeat(dtMs, k);
      break;
  }

  // 站在站位時，身體是實心的：玩家不能穿進橘子王（不造成接觸傷害）
  if (b.phase !== 'defeated' && !b.curled && b.x >= ORANGE_KING.HOME_X - 5 && b.y >= GROUND_Y - b.h - 20) {
    const wall = b.x + 16 - player.w;
    if (player.x > wall && player.y + player.h > b.y + 20) {
      player.x = wall;
      if (player.vx > 0) player.vx = 0;
    }
  }
}

function startOrangeKingCharge(tutorial) {
  const b = orangeKingBoss;
  b.chargeTutorial = !!tutorial;
  setOrangeKingPhase('chargeWarn');
}

function dropOrangeKingRing() {
  const b = orangeKingBoss;
  const r = getOrangeKingBodyRect();
  const sx = r.x + r.w / 2, sy = r.y + 20;
  const T  = 48; // frames
  b.ring = {
    state: 'flying', x: sx, y: sy,
    vx: (ORANGE_KING.RING_LAND_X - sx) / T,
    vy: -9,
  };
  orangeKingFloatText('✨', sx, sy - 10, '#ffe066');
}

function updateOrangeKingRing(dtMs, k) {
  const b = orangeKingBoss;
  const ring = b.ring;
  if (!ring) return;
  if (ring.state === 'flying') {
    ring.vy += 0.38 * k;
    ring.x  += ring.vx * k;
    ring.y  += ring.vy * k;
    const landY = GROUND_Y - 34;
    if (ring.vy > 0 && ring.y >= landY) {
      ring.y = landY; ring.x = ORANGE_KING.RING_LAND_X; ring.state = 'grounded';
      showHint('✨ 金色油管環掉下來了！快去撿起來！', 220);
    }
  } else if (ring.state === 'grounded') {
    const pr = playerHazardRect();
    // 撿取範圍放寬（從平台跳下 / 跑過去都撿得到）
    if (rectsOverlap(pr.x, pr.y, pr.w, pr.h, ring.x - 36, ring.y - 70, 72, 100)) collectOrangeKingRing();
  }
}

function collectOrangeKingRing() {
  const b = orangeKingBoss;
  try { sfxPlay('ringGet'); } catch (e) {} // v0.3.64
  b.ring.state = 'collected';
  b.ringActive = true;
  if (equippedSword && equippedSword.id) activeSlot = 'sword'; // v0.3.46：2-4 只限劍 → 撿到環就是王權劍
  // v0.3.35-fix-1：金色油管環只讓「已經擁有的」氣球劍 / 槌暫時實體化，不會產生武器
  //               （沒有武器的玩家在進入 2-4 前就會被 checkChapter1ProgressionGate 擋下）
  b.ringAuraMs = 1400; // 小V身上的金色光圈
  // v0.3.46：只顯示一句（取代原本的「武器實體化」提示，不重複）
  orangeKingFloatText('👑', player.x + player.w / 2, player.y - 10, '#ffe066');
  showHint('小V的氣球劍變成「橙煌王權劍」了！', 230); // v0.3.61：星靈說明改在油管環落地時播放，撿到時恢復原本提示
  b.pendingHint = { msg: '💡 等橘子王連續攻擊後喘氣，再靠近反擊！', delayMs: 3500 };
}

// v0.3.36：hitbox = 畫面左緣 → 管口（+ oilExtendX），高度 oilBandH（都可用定位工具調）
function getOrangeKingSprayBand(laneKey) {
  const n = getOrangeKingNozzle(laneKey);
  const h = ORANGE_KING_MACHINE_ART.oilBandH;
  return { x: 0, y: n.y - h / 2, w: n.x + ORANGE_KING_MACHINE_ART.oilExtendX, h, mouthX: n.x };
}

function startNextOrangeKingPattern() {
  const b = orangeKingBoss;
  b.currentPattern = ORANGE_KING_PATTERNS[b.patternIndex % ORANGE_KING_PATTERNS.length];
  b.patternIndex++;
  b.patternStep = 0;
  runOrangeKingPatternStep();
}
function runOrangeKingPatternStep() {
  const b = orangeKingBoss;
  const atk = b.currentPattern[b.patternStep];
  if (atk === 'spray') {
    b.activeLane = ORANGE_KING_LANE_ORDER[b.laneCursor % ORANGE_KING_LANE_ORDER.length];
    b.laneCursor++;
    setOrangeKingPhase('sprayWarn');
  } else if (atk === 'lob') {
    b.activeLob = buildOrangeKingLob(ORANGE_KING_LOB_ROUTES[b.lobCursor % ORANGE_KING_LOB_ROUTES.length]);
    b.lobCursor++;
    setOrangeKingPhase('lobAim');
  } else if (atk === 'slam') {
    setOrangeKingPhase('slamPrep');
  } else if (atk === 'charge') {
    startOrangeKingCharge(false);
  }
}
// 一招結束：組合內還有下一招 → 短暫停頓後接著打；整組結束才進 cooldown
function finishOrangeKingAttack() {
  const b = orangeKingBoss;
  b.patternStep++;
  if (b.currentPattern && b.patternStep < b.currentPattern.length) {
    setOrangeKingPhase('between');
    return;
  }
  const lastAtk = b.currentPattern ? b.currentPattern[b.currentPattern.length - 1] : '';
  b.cooldownDur = b.cooldownCount === 0 ? ORANGE_KING.FIRST_COOLDOWN_MS
    : (lastAtk === 'charge' ? ORANGE_KING.CHARGE_COOLDOWN_MS : ORANGE_KING.COOLDOWN_MS);
  if (b.cooldownCount === 0 && b.ringActive) showHint('💦 橘子王在喘氣！快靠近攻擊！', 200);
  b.cooldownCount++;
  b.cooldownDamageTaken = 0; // v0.3.35-damage-cap-fix-1：每次進入喘氣都重置本輪傷害累計
  setOrangeKingPhase('cooldown');
}

function updateOrangeKingLobShots(k) {
  const b = orangeKingBoss;
  const pr = playerHazardRect();
  b.lobShots.forEach(s => {
    s.t += k;
    const p = getLobPoint(s, s.t);
    s.x = p.x; s.y = p.y;
    // 油彈在前景飛行：不被平台擋、不落地、不留油漬，只判定是否碰到小V
    const hc = getOrangeKingArcShotHitbox(p.x, p.y);
    if (!s.hit && circleRectOverlap(hc.x, hc.y, hc.r, pr.x, pr.y, pr.w, pr.h)) {
      if (orangeKingHitPlayer()) s.hit = true;
    }
  });
  b.lobShots = b.lobShots.filter(s => s.x > -60 && s.y < CANVAS_H + 60 && s.x < CANVAS_W + 60);
}
function circleRectOverlap(cx, cy, r, rx, ry, rw, rh) {
  const nx = Math.max(rx, Math.min(cx, rx + rw));
  const ny = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy <= r * r;
}

function spawnOrangeKingPuddles() {
  const b = orangeKingBoss;
  const set = ORANGE_KING_PUDDLE_SETS[b.puddleCursor % ORANGE_KING_PUDDLE_SETS.length];
  b.puddleCursor++;
  set.forEach(x => b.puddles.push({ x, w: ORANGE_KING.PUDDLE_W, ms: 0, life: ORANGE_KING.PUDDLE_LIFE_MS }));
}
function updateOrangeKingPuddles(dtMs) {
  const b = orangeKingBoss;
  const onGround = player.y + player.h >= GROUND_Y - 3;
  b.puddles.forEach(p => {
    p.ms += dtMs;
    // 油漬只影響地面：腳踩在地面且和油漬重疊才受傷（剛出現的 200ms 是擴散動畫，不判定）
    if (p.ms > 200 && onGround && player.x + player.w - 10 > p.x && player.x + 10 < p.x + p.w) {
      orangeKingHitPlayer();
    }
  });
  b.puddles = b.puddles.filter(p => p.ms < p.life);
}

// ── 劍 / 槌命中判定（由 updateMeleeAttack / updateHammerMelee 呼叫）──
function checkOrangeKingMeleeHit(weapon, ax, ay, aw, ah) {
  const b = orangeKingBoss;
  if (!b || b.phase === 'defeated' || b.hp <= 0) return;
  if (weapon === 'hammer') return; // v0.3.46：2-4 只限劍；槌不會對橘子王造成任何判定
  const swingId = weapon === 'hammer' ? player.hammerSwingId : player.swordSwingId;
  const lockKey = weapon === 'hammer' ? 'lastHammerSwingId' : 'lastSwordSwingId';
  const hr = getOrangeKingHurtRect();
  if (!rectsOverlap(ax, ay, aw, ah, hr.x, hr.y, hr.w, hr.h)) return;
  if (b[lockKey] === swingId) return; // 同一次揮擊只判定一次
  b[lockKey] = swingId;
  const fx = hr.x + 10, fy = Math.max(hr.y + 30, ay + ah / 2);
  if (!b.ringActive) {
    try { sfxPlay('bossSwordBlock'); } catch (e) {} // v0.3.64：橘子王擋下氣球劍
    orangeKingFloatText('✦', fx, fy, '#cfe8ff');
    showHint('🎈 氣球武器還不能傷到橘子王！', 150);
    return;
  }
  if (b.phase !== 'cooldown' || b.invulnMs > 0) {
    try { sfxPlay('bossSwordBlock'); } catch (e) {} // v0.3.64：橘子王擋下氣球劍
    orangeKingFloatText('✦ 鏘！', fx, fy, '#cfe8ff');
    if (b.phase !== 'cooldown') showHint('🛡️ 現在打不進去！等牠喘氣再攻擊！', 130);
    return;
  }
  // v0.3.35-damage-cap-fix-1：劍 / 槌一律 0.5 格；累計本次喘氣受到的傷害
  const dmg = ORANGE_KING.MELEE_DAMAGE;
  b.hp = Math.max(0, b.hp - dmg);
  b.cooldownDamageTaken = (b.cooldownDamageTaken || 0) + dmg;
  b.hurtFlashMs = 260;
  b.invulnMs = ORANGE_KING.HURT_INVULN_MS;
  orangeKingFloatText('-' + dmg, fx, fy - 10, '#ff5c5c');
  try { sfxPlay('swordHit'); } catch (e) {} // v0.3.64：劍真的打中橘子王
  for (let i = 0; i < 12; i++) { // 命中點金色火花
    const ang = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 4;
    b.sparks.push({ x: fx, y: fy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 2, ms: 0 });
  }
  orangeKingShake(160, 3);
  if (b.hp <= 0) { startOrangeKingDefeat(); return; }
  // 本次喘氣已扣滿上限 → 立即結束喘氣，橘子王重新振作，進入下一組攻擊
  if (b.cooldownDamageTaken >= ORANGE_KING.COOLDOWN_DAMAGE_CAP) {
    b.cooldownDamageTaken = 0;
    orangeKingFloatText('💢 重新振作！', b.x + b.w / 2, b.y - 70, '#ffb347');
    setOrangeKingPhase('idle');
  }
}

// ── 擊敗流程 ──
function startOrangeKingDefeat() {
  try { advNoteBossDefeated(); } catch (e) {} // v0.3.63：擊敗橘子王（只記一次；有效時間停在這一刻）
  const b = orangeKingBoss;
  setOrangeKingPhase('defeated');
  b.curled = false;
  b.x = Math.max(b.x, 520);
  b.y = GROUND_Y - b.h;
  b.activeLane = null; b.activeLob = null;
  b.lobShots = []; b.puddles = [];
  b.crownY = 0; b.crownVy = -6; b.crownRot = 0;
  // v0.3.61：勝利演出 — 油管環先從小V身上升起、和橘子王一起淡出，之後才變回普通氣球劍（ringActive 留到階段 C 才關）
  b.victoryRing = b.ringActive ? { x: player.x + player.w / 2, y: player.y + player.h * 0.45 } : null;
  if (!b.victoryRing) b.ringActive = false;
  orangeKingShake(600, 8);
  // v0.3.35-victory-pose-fix-1：不再用 player.invincible 保護（會讓小V顯示 hurt 受傷臉並閃爍）
  //   改用 Boss 自己的勝利保護旗標 victorySafe：orangeKingHitPlayer() 直接不判定
  b.victorySafe = true;
  b.dashHitDone = true;
  player.invincible = 0;       // 立刻恢復正常姿勢（idle / 跑步），不顯示受傷臉、不閃爍
  orangeKingBanner('橘子王被打敗了！', '', 1400);
  playOrangeKingVictoryJingle(); // v0.3.45：和 defeat 圖同一瞬間；BGM 由 syncOrangeKingBgm 0.6 秒淡出後停止
}
function updateOrangeKingDefeat(dtMs, k) {
  const b = orangeKingBoss;
  b.crownVy += 0.5 * k;
  b.crownY += b.crownVy * k;
  b.crownRot += 0.08 * k;
  if (b.phaseMs >= 1400 && (!b.banner || b.banner.text !== '第二章完成！')) {
    if (!b.chapterBannerShown) { b.chapterBannerShown = true; orangeKingBanner('第二章完成！', '🏆 小V保護了派對島的氣球！', 1600); }
  }
  // v0.3.61：階段 C — 油管環與橘子王都淡出後，王權劍變回氣球劍，跳出系統確認視窗；按「確認」才進入原本的結算
  if (b.phaseMs >= ORANGE_KING_VICTORY.CONFIRM_AT && !b.clearTriggered && !b.victoryConfirmShown) {
    b.victoryConfirmShown = true;
    b.ringActive = false;          // 王權劍 → 普通氣球劍（只是狀態恢復，不發 / 不扣任何道具）
    b.victoryRing = null;
    showOrangeKingVictoryConfirm();
  }
}
// v0.3.61：勝利演出時間軸（毫秒，從 HP 歸零起算）
const ORANGE_KING_VICTORY = { RING_RISE_MS: 1200, RING_HOLD_UNTIL: 1800, FADE_START: 1800, FADE_END: 3000, CONFIRM_AT: 3200, RING_TOP_Y: 150 };
function getOrangeKingVictoryFade() { // 1 → 0（橘子王與油管環一起淡出）
  const b = orangeKingBoss; if (!b || b.phase !== 'defeated') return 1;
  const V = ORANGE_KING_VICTORY;
  return Math.max(0, Math.min(1, 1 - (b.phaseMs - V.FADE_START) / (V.FADE_END - V.FADE_START)));
}
function drawOrangeKingVictoryRing(cx) {
  const b = orangeKingBoss; if (!b || b.phase !== 'defeated' || !b.victoryRing) return;
  const V = ORANGE_KING_VICTORY, t = b.phaseMs;
  const k = Math.min(1, t / V.RING_RISE_MS), ease = 1 - Math.pow(1 - k, 3);
  const x = b.victoryRing.x - cx, y = b.victoryRing.y + (V.RING_TOP_Y - b.victoryRing.y) * ease + (k >= 1 ? Math.sin(t / 220) * 4 : 0);
  const a = getOrangeKingVictoryFade();
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  const gr = ctx.createRadialGradient(x, y, 4, x, y, 70);
  gr.addColorStop(0, 'rgba(255,245,170,0.85)'); gr.addColorStop(1, 'rgba(255,215,80,0)');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 70, 0, Math.PI * 2); ctx.fill();
  const img = getOrangeKingBossImg('goldenRing');
  if (img) { const w = 86, h = w * img.naturalHeight / img.naturalWidth; ctx.drawImage(img, x - w / 2, y - h / 2, w, h); }
  else drawGoldOilRing(x, y, 1.6, true, t);
  ctx.restore();
}
let orangeKingVictoryConfirmOpen = false;
function showOrangeKingVictoryConfirm() {
  const wrap = document.getElementById('game-wrapper') || document.body;
  let el = document.getElementById('boss-victory-confirm');
  if (!el) {
    el = document.createElement('div'); el.id = 'boss-victory-confirm'; el.className = 'hv-ui-overlay';
    el.innerHTML = '<div class="hv-ui-card boss-victory-card"><div class="boss-victory-icon">🎈⚔️</div><div class="boss-victory-msg">小V的王權劍變回了氣球劍</div>'
      + '<button type="button" class="hv-ui-btn hv-ui-btn--primary hv-ui-btn--big" id="btn-boss-victory-ok">確認</button></div>';
    wrap.appendChild(el);
    const ok = el.querySelector('#btn-boss-victory-ok');
    ok.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); confirmOrangeKingVictory(); });
    ['touchstart', 'pointerdown', 'mousedown'].forEach(ev => el.addEventListener(ev, e => e.stopPropagation(), { passive: true }));
  }
  orangeKingVictoryConfirmOpen = true;
  if (gameState === 'playing') gameState = 'paused';   // 確認前遊戲停住（不開暫停選單）
  Object.keys(keys).forEach(k => { keys[k] = false; });
  Object.keys(mobileBtn).forEach(k => { mobileBtn[k] = false; });
  el.style.display = 'flex';
}
function confirmOrangeKingVictory() {
  if (!orangeKingVictoryConfirmOpen) return;     // 連點 / touch + click 只處理一次
  orangeKingVictoryConfirmOpen = false;
  const el = document.getElementById('boss-victory-confirm'); if (el) el.style.display = 'none';
  const b = orangeKingBoss;
  if (!b || b.clearTriggered) return;
  b.clearTriggered = true;
  currentRunStats.chapter2Complete = true;
  triggerClear();                                // 原本的通關結算（只會執行這一次）
}
function hideOrangeKingVictoryConfirm() { orangeKingVictoryConfirmOpen = false; const el = document.getElementById('boss-victory-confirm'); if (el) el.style.display = 'none'; }
if (typeof window !== 'undefined') window.confirmOrangeKingVictory = confirmOrangeKingVictory;

// 每幀：延遲提示
function tickOrangeKingPendingHint(dtMs) {
  const b = orangeKingBoss;
  if (!b || !b.pendingHint) return;
  b.pendingHint.delayMs -= dtMs;
  if (b.pendingHint.delayMs <= 0) { showHint(b.pendingHint.msg, 230); b.pendingHint = null; }
}

function getOrangeKingShakeOffset() {
  const b = orangeKingBoss;
  if (!b || b.shakeMs <= 0 || gameState !== 'playing') return null;
  const p = b.shakePower;
  return { x: (Math.random() * 2 - 1) * p, y: (Math.random() * 2 - 1) * p * 0.6 };
}

// ════════════════ 繪圖（簡化 canvas 圖形）════════════════
// 背景層：場地裝飾、預警線、拋物線預測、油漬、金色油管環、Boss 本體（畫在小V之前）
function drawOrangeKingBack(cx) {
  const b = orangeKingBoss;
  if (!b) return;
  const t = b.totalMs;
  // 上方洞口（登場用）
  if (b.phase === 'introWait' || b.phase === 'introDrop' || b.phase === 'introRoar') {
    const a = b.phase === 'introRoar' ? Math.max(0, 1 - b.phaseMs / 1300) : 1;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#1a0f22';
    ctx.beginPath();
    ctx.ellipse(ORANGE_KING.HOME_X + ORANGE_KING.W / 2 - cx, 0, 130, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // 左側牆（v0.3.35-fix-1：平台從牆面延伸出來）
  ctx.fillStyle = 'rgba(60,30,20,0.55)';
  ctx.fillRect(0 - cx, 0, 10, GROUND_Y);

  // v0.3.36：右側機關（主裝置 + 三根水平油管），在 Boss 本體後面
  drawOrangeKingMachine(cx);

  // 油漬
  b.puddles.forEach(p => {
    const grow = Math.min(1, p.ms / 200);
    const fade = p.ms > p.life - 600 ? Math.max(0, (p.life - p.ms) / 600) : 1;
    if (drawOrangeKingOilSlickArt(p, cx, grow, fade)) return; // v0.3.44：正式油漬圖（沒載好 → 下面舊橢圓）
    drawOrangeKingOilSlickGlow(p, cx, grow, fade, t); // v0.3.45：舊橢圓也加底光
    ctx.save();
    ctx.globalAlpha = 0.9 * fade;
    ctx.fillStyle = '#e8961c';
    ctx.beginPath();
    ctx.ellipse(p.x + p.w / 2 - cx, GROUND_Y + 2, (p.w / 2) * grow, 9 * grow, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,230,140,0.8)';
    ctx.beginPath();
    ctx.ellipse(p.x + p.w / 2 - cx - 14, GROUND_Y, (p.w / 6) * grow, 3 * grow, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  drawOrangeKingSlickWarnings(cx, t); // v0.3.45：油漬出現前的小驚嘆號

  // 水平噴油預警線
  if (b.phase === 'sprayWarn' && b.activeLane) {
    const band = getOrangeKingSprayBand(b.activeLane);
    const blink = Math.floor(b.phaseMs / 120) % 2 === 0;
    ctx.save();
    // v0.3.42：改成暖白半透明（呼吸閃爍），融入橘金工業 Boss 房
    ctx.fillStyle = 'rgba(255,245,220,0.07)';
    ctx.fillRect(band.x - cx, band.y, band.w, band.h);
    ctx.shadowColor = 'rgba(255,230,180,0.6)';
    ctx.shadowBlur = 6;
    ctx.strokeStyle = blink ? 'rgba(255,245,220,0.8)' : 'rgba(255,245,220,0.5)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.moveTo(band.x - cx, band.y + band.h / 2);
    ctx.lineTo(band.x + band.w - cx, band.y + band.h / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'left';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(60,30,10,0.6)';
    ctx.strokeText('⚠', 22 - cx, band.y + band.h / 2 + 9);
    ctx.fillStyle = blink ? 'rgba(255,245,220,0.9)' : 'rgba(255,245,220,0.6)';
    ctx.fillText('⚠', 22 - cx, band.y + band.h / 2 + 9);
    ctx.restore();
  }

  // 拋物線預測軌跡
  if (b.phase === 'lobAim' && b.activeLob) {
    ctx.save();
    const blink = Math.floor(b.phaseMs / 140) % 2 === 0;
    // v0.3.42：暖白半透明點線（淡淡外光），位置與實際油彈路徑相同
    ctx.fillStyle = blink ? 'rgba(255,245,220,0.85)' : 'rgba(255,245,220,0.55)';
    ctx.shadowColor = 'rgba(255,230,180,0.7)';
    ctx.shadowBlur = 5;
    for (let tt = 0; tt < 400; tt += 3) {
      const p = getLobPoint(b.activeLob, tt);
      if (p.x < -20 || p.y > CANVAS_H + 20) break;
      ctx.beginPath();
      ctx.arc(p.x - cx, p.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 地上的金色油管環
  const ring = b.ring;
  if (ring && (ring.state === 'flying' || ring.state === 'grounded')) {
    const bob = ring.state === 'grounded' ? Math.sin(t / 220) * 4 : 0;
    // v0.3.45：正式金色油管環圖（沒載好 → 舊的簡易圓環）；飛行中慢慢翻轉
    if (!drawOrangeKingGoldenRingArt(ring.x - cx, ring.y + bob, ring.state === 'flying' ? Math.sin(t / 90) * 0.5 : 0, t, true)) {
      drawGoldOilRing(ring.x - cx, ring.y + bob, 1, true, t);
    }
  }

  { const vf = getOrangeKingVictoryFade(); if (vf < 1) { ctx.save(); ctx.globalAlpha = vf; drawOrangeKingBody(cx); ctx.restore(); } else drawOrangeKingBody(cx); } // v0.3.61：勝利時淡出
}

// v0.3.45：金色油管環正式圖；(x, y) = 畫面座標的環中心
function getOrangeKingGoldenRingGeom(x, y) {
  const A = ORANGE_KING_MACHINE_ART, S = ORANGE_KING_GOLDEN_RING_SRC, sc = A.goldenRingScale;
  const cx = x + A.goldenRingOffsetX, cy = y + A.goldenRingOffsetY;
  return { cx, cy, sc, drawX: cx - S.cx * sc, drawY: cy - S.cy * sc, drawW: S.w * sc, drawH: S.h * sc,
           opaque: { x: cx - (S.cx - S.opaque[0]) * sc, y: cy - (S.cy - S.opaque[1]) * sc, w: (S.opaque[2] - S.opaque[0]) * sc, h: (S.opaque[3] - S.opaque[1]) * sc } };
}
function drawOrangeKingGoldenRingArt(x, y, rot, t, glowing) {
  const img = getOrangeKingBossImg('goldenRing');
  if (!img) return false;
  const A = ORANGE_KING_MACHINE_ART;
  const g = getOrangeKingGoldenRingGeom(x, y);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, A.goldenRingAlpha));
  if (glowing) { // 背後柔和金光（呼吸）
    const pulse = 0.45 + 0.3 * Math.sin(t / 160);
    const rr = Math.max(g.opaque.w, g.opaque.h) * 0.75;
    const gr = ctx.createRadialGradient(g.cx, g.cy, 4, g.cx, g.cy, rr);
    gr.addColorStop(0, `rgba(255,240,150,${pulse})`);
    gr.addColorStop(1, 'rgba(255,220,80,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(g.cx, g.cy, rr, 0, Math.PI * 2); ctx.fill();
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(g.cx, g.cy);
  if (rot) ctx.rotate(rot);
  ctx.drawImage(img, g.drawX - g.cx, g.drawY - g.cy, g.drawW, g.drawH);
  ctx.restore();
  return true;
}

function drawGoldOilRing(x, y, scale, glowing, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  if (glowing) {
    const pulse = 0.55 + 0.35 * Math.sin(t / 160);
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 40);
    g.addColorStop(0, `rgba(255,240,150,${pulse})`);
    g.addColorStop(1, 'rgba(255,220,80,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.fill();
  }
  ctx.lineWidth = 7;
  ctx.strokeStyle = glowing ? '#ffd23f' : '#8a7a4a';
  ctx.beginPath(); ctx.ellipse(0, 0, 20, 14, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = glowing ? '#fff3b0' : '#b0a27a';
  ctx.beginPath(); ctx.ellipse(0, -2, 16, 10, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  ctx.restore();
}

function drawOrangeKingPipe(x1, y1, x2, y2, glow, t) {
  ctx.save();
  ctx.lineCap = 'round';
  if (glow) {
    ctx.strokeStyle = `rgba(255,230,90,${0.45 + 0.35 * Math.sin(t / 70)})`;
    ctx.lineWidth = 22;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  ctx.strokeStyle = '#4b5a3a';
  ctx.lineWidth = 13;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.strokeStyle = '#7d9460';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x1, y1 - 3); ctx.lineTo(x2, y2 - 3); ctx.stroke();
  ctx.restore();
}
function drawOrangeKingNozzle(x, y, glow, t) {
  ctx.save();
  if (glow) {
    const g = ctx.createRadialGradient(x, y, 2, x, y, 30);
    g.addColorStop(0, 'rgba(255,255,180,0.95)');
    g.addColorStop(1, 'rgba(255,200,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, 30, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = glow ? '#ffe066' : '#39452c';
  ctx.beginPath(); ctx.roundRect(x - 10, y - 10, 20, 20, 5); ctx.fill();
  ctx.fillStyle = '#1d2416';
  ctx.beginPath(); ctx.arc(x - 6, y, 5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawOrangeKingBody(cx) {
  const b = orangeKingBoss;
  // v0.3.41：優先用正式美術；任何一張圖沒載好就退回下方原本的簡易畫法
  if (drawOrangeKingBossArt(cx)) return;
  const t = b.totalMs;
  const flash = b.hurtFlashMs > 0 && Math.floor(b.hurtFlashMs / 60) % 2 === 0;

  // 衝撞 / 縮球：畫成旋轉的橘子球
  if (b.curled) {
    const r = getOrangeKingBodyRect();
    const ccx = r.x + r.w / 2 - cx, ccy = r.y + r.h / 2;
    const rad = r.h / 2;
    ctx.save();
    if (b.phase === 'chargeDash') {
      for (let i = 1; i <= 3; i++) {
        ctx.globalAlpha = 0.18 / i;
        ctx.fillStyle = '#ff9a1f';
        ctx.beginPath(); ctx.arc(ccx + i * 34, ccy, rad, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        const ly = ccy - rad * 0.6 + i * rad * 0.4;
        ctx.beginPath(); ctx.moveTo(ccx + rad + 10, ly); ctx.lineTo(ccx + rad + 60 + (i % 2) * 20, ly); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    ctx.translate(ccx, ccy);
    ctx.rotate(-b.spinAngle);
    const g = ctx.createRadialGradient(-rad * 0.3, -rad * 0.3, rad * 0.2, 0, 0, rad);
    g.addColorStop(0, flash ? '#ffffff' : '#ffc24d');
    g.addColorStop(1, flash ? '#ffd0a0' : '#e8730c');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(150,60,0,0.6)';
    ctx.lineWidth = 5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(0, 0, rad * (0.35 + i * 0.22), i, i + Math.PI * 1.2); ctx.stroke();
    }
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath(); ctx.moveTo(-14, -rad + 4); ctx.lineTo(0, -rad - 14); ctx.lineTo(14, -rad + 4); ctx.fill();
    ctx.restore();
    return;
  }

  const defeated = b.phase === 'defeated';
  const deflate = defeated ? Math.max(0.45, 1 - b.phaseMs / 1600) : 1;
  if (defeated && b.phaseMs > 1600 && Math.floor(b.phaseMs / 90) % 2 === 0) return; // 閃爍消失

  let wobbleX = 0, squashY = 1;
  if (b.phase === 'chargeWarn') wobbleX = Math.sin(t / 25) * 4;
  if (b.phase === 'chargeCurl') squashY = 1 - Math.min(1, b.phaseMs / (b.chargeTutorial ? ORANGE_KING_TIMING.TUTORIAL_CHARGE_CURL : ORANGE_KING_TIMING.CHARGE_CURL)) * 0.2;
  if (b.phase === 'slamPrep')  { squashY = 1 - Math.min(1, b.phaseMs / ORANGE_KING_TIMING.SLAM_PREP) * 0.14; wobbleX = Math.sin(t / 30) * 3; }
  if (b.phase === 'cooldown')   squashY = 1 + Math.sin(t / 160) * 0.03;
  if (defeated)                 wobbleX = Math.sin(t / 40) * 6 * deflate;

  const bw = b.w * deflate, bh = b.h * deflate * squashY;
  const bx = b.x + (b.w - bw) / 2 - cx + wobbleX;
  const by = b.y + b.h - bh;
  const ccx = bx + bw / 2, ccy = by + bh / 2;
  const lane = b.activeLane;
  const sprayGlow = (b.phase === 'sprayWarn' || b.phase === 'sprayFire');

  ctx.save();
  // 油管（身體後方）
  if (!defeated) {
    // v0.3.36：高 / 中 / 低三根噴油管改由右側機關負責（drawOrangeKingMachine），本體只留頭頂拋物線油管
    void sprayGlow; void lane;
    const lo = getOrangeKingLobOrigin();
    drawOrangeKingPipe(bx + bw * 0.62, by + 14, lo.x - cx, lo.y, b.phase === 'lobAim', t);
  }

  // 身體
  const g = ctx.createRadialGradient(ccx - bw * 0.2, ccy - bh * 0.25, bw * 0.08, ccx, ccy, bw * 0.55);
  g.addColorStop(0, flash ? '#ffffff' : '#ffc95a');
  g.addColorStop(0.6, flash ? '#ffe2c0' : '#ff9a1f');
  g.addColorStop(1, flash ? '#ffc8a0' : '#d9620a');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(ccx, ccy, bw / 2, bh / 2, 0, 0, Math.PI * 2); ctx.fill();
  // 果皮紋
  ctx.fillStyle = 'rgba(160,70,0,0.18)';
  for (let i = 0; i < 9; i++) {
    ctx.beginPath(); ctx.arc(ccx + Math.cos(i * 1.7) * bw * 0.32, ccy + Math.sin(i * 2.3) * bh * 0.3, 3, 0, Math.PI * 2); ctx.fill();
  }

  // 金色油管環（掉落前套在身上）
  if (b.ring && b.ring.state === 'onBoss') {
    ctx.save();
    ctx.lineWidth = 9;
    ctx.strokeStyle = '#ffd23f';
    ctx.shadowColor = 'rgba(255,220,80,0.9)';
    ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.ellipse(ccx, ccy + bh * 0.12, bw * 0.5, bh * 0.1, 0, 0, Math.PI); ctx.stroke();
    ctx.restore();
  }

  // 三根油管的噴嘴（畫在身體前面，攻擊前會發亮）
  if (!defeated) {
    const lo = getOrangeKingLobOrigin();
    drawOrangeKingNozzle(lo.x - cx + wobbleX, lo.y, b.phase === 'lobAim', t);
  }

  // 臉
  const eyeY = ccy - bh * 0.08;
  const angry = ['chargeWarn', 'chargeCurl', 'sprayWarn', 'sprayFire', 'lobAim', 'slamPrep', 'slamUp', 'slamDown', 'introRoar'].includes(b.phase);
  const tired = b.phase === 'cooldown' || b.phase === 'chargeRecover' || defeated;
  ctx.fillStyle = '#2a1205';
  ctx.strokeStyle = '#2a1205';
  ctx.lineWidth = 5;
  if (tired) {
    // > < 眼
    [-1, 1].forEach(s => {
      const ex = ccx + s * bw * 0.17;
      ctx.beginPath();
      ctx.moveTo(ex - 10, eyeY - 8); ctx.lineTo(ex + (s < 0 ? 4 : -4), eyeY); ctx.lineTo(ex - 10 + (s < 0 ? 0 : 20), eyeY + 8);
      ctx.stroke();
    });
    ctx.beginPath(); ctx.ellipse(ccx, ccy + bh * 0.2, 16, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff6f8a';
    ctx.beginPath(); ctx.ellipse(ccx, ccy + bh * 0.26, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    [-1, 1].forEach(s => {
      const ex = ccx + s * bw * 0.17;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(ex, eyeY, 15, 17, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a1205';
      ctx.beginPath(); ctx.arc(ex - 4, eyeY + 2, 7, 0, Math.PI * 2); ctx.fill();
      if (angry) {
        // 兇眉：內側往下壓
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(ex - 16, eyeY - (s < 0 ? 28 : 18));
        ctx.lineTo(ex + 16, eyeY - (s < 0 ? 18 : 28));
        ctx.stroke();
      }
    });
    ctx.lineWidth = 5;
    ctx.beginPath();
    if (angry) { ctx.moveTo(ccx - 26, ccy + bh * 0.24); ctx.lineTo(ccx + 26, ccy + bh * 0.2); }
    else { ctx.arc(ccx, ccy + bh * 0.14, 22, 0.15 * Math.PI, 0.85 * Math.PI); }
    ctx.stroke();
  }

  // 皇冠
  const crownLift = defeated ? b.crownY : 0;
  ctx.save();
  ctx.translate(ccx + (defeated ? b.crownY * 0.6 : 0), by + 6 + crownLift);
  if (defeated) ctx.rotate(b.crownRot);
  ctx.fillStyle = '#ffd23f';
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-42, 0); ctx.lineTo(-46, -40); ctx.lineTo(-22, -18); ctx.lineTo(0, -50); ctx.lineTo(22, -18); ctx.lineTo(46, -40); ctx.lineTo(42, 0);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#e8414f';
  ctx.beginPath(); ctx.arc(0, -14, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4fc3f7';
  ctx.beginPath(); ctx.arc(-28, -10, 4, 0, Math.PI * 2); ctx.arc(28, -10, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // 蓄力警示 / 喘氣汗滴
  if (b.phase === 'chargeWarn' || b.phase === 'slamPrep') {
    ctx.fillStyle = Math.floor(b.phaseMs / 120) % 2 ? '#ff4d4d' : '#ffe066';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('！', ccx, by - 60);
  }
  if (b.phase === 'cooldown') {
    ctx.fillStyle = '#7fd3ff';
    const dy = (t / 6) % 30;
    ctx.beginPath(); ctx.ellipse(ccx - bw * 0.42, by + 40 + dy, 6, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(ccx + bw * 0.44, by + 60 + ((dy + 15) % 30), 6, 9, 0, 0, Math.PI * 2); ctx.fill();
    // 可攻擊提示框
    // v0.3.43：與正式圖相同的白色虛線呼吸閃爍
    const breath = getOrangeKingCooldownBreath(t);
    ctx.save();
    ctx.shadowColor = `rgba(255,235,190,${0.35 + 0.35 * breath})`;
    ctx.shadowBlur = 6 + 6 * breath;
    ctx.lineDashOffset = -t / 45;
    ctx.strokeStyle = b.ringActive ? `rgba(255,255,255,${0.55 + 0.35 * breath})` : `rgba(255,255,255,${0.25 + 0.2 * breath})`;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.setLineDash([12, 9]);
    ctx.beginPath(); ctx.ellipse(ccx, ccy, bw / 2 + 10, bh / 2 + 10, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = b.ringActive ? 'rgba(255,240,180,0.95)' : 'rgba(255,255,255,0.75)';
    ctx.fillText(b.ringActive ? '💦 喘氣中！快攻擊！' : '💦 喘氣中', ccx, by - 58);
  }
  ctx.restore();
}

// 前景層：水平油柱、拋物線油彈、浮動文字（畫在小V與平台之上）
function drawOrangeKingFront(cx) {
  const b = orangeKingBoss;
  if (!b) return;
  const t = b.totalMs;
  // v0.3.37：優先用正式水平噴油圖（只是視覺；傷害仍由 getOrangeKingSprayBand 判定）
  const usedOilArt = (b.phase === 'sprayFire' && b.activeLane)
    && drawOrangeKingOilStreamArt(b.activeLane, cx, Math.min(1, b.phaseMs / 140),
         b.phaseMs > ORANGE_KING_TIMING.SPRAY_FIRE - 120 ? Math.max(0, (ORANGE_KING_TIMING.SPRAY_FIRE - b.phaseMs) / 120) : 1, t);
  if (b.phase === 'sprayFire' && b.activeLane && !usedOilArt) {
    // v0.3.36：油流視覺從油管管口噴出（hitbox 另外由 getOrangeKingSprayBand 決定）— v0.3.37 起為圖片載入失敗時的 fallback
    const hb = getOrangeKingSprayBand(b.activeLane);
    const band = { x: 0, y: hb.y, w: hb.mouthX, h: hb.h };
    const grow = Math.min(1, b.phaseMs / 120);
    const x0 = band.x + band.w * (1 - grow);
    ctx.save();
    const g = ctx.createLinearGradient(0, band.y, 0, band.y + band.h);
    g.addColorStop(0, 'rgba(255,200,60,0.85)');
    g.addColorStop(0.5, 'rgba(255,150,20,0.95)');
    g.addColorStop(1, 'rgba(210,100,0,0.85)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(band.x + band.w - cx, band.y + 8);
    for (let x = band.x + band.w; x >= x0; x -= 24) {
      ctx.lineTo(x - cx, band.y + 2 + Math.sin((x + t * 0.8) / 30) * 4);
    }
    ctx.lineTo(x0 - cx, band.y + band.h / 2);
    for (let x = x0; x <= band.x + band.w; x += 24) {
      ctx.lineTo(x - cx, band.y + band.h - 2 + Math.sin((x - t * 0.8) / 26) * 4);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,245,200,0.6)';
    ctx.fillRect(x0 - cx, band.y + band.h * 0.35, band.w * grow, 5);
    ctx.restore();
  }
  drawOrangeKingLobMuzzle(cx);
  b.lobShots.forEach(s => {
    // v0.3.44：正式油彈圖（依飛行方向旋轉；剛從管口射出時由小變大）— 沒載好 → 下面舊的漸層圓球
    // v0.3.46：從管口「擠出來」— 一開始只有 35% 大小，約 0.2 秒長到原尺寸
    if (drawOrangeKingOilShotArt(s.x, s.y, getOrangeKingOilShotRot(s), Math.min(1, 0.35 + s.t / 12), cx)) return;
    ctx.save();
    ctx.fillStyle = 'rgba(255,160,30,0.35)';
    ctx.beginPath(); ctx.arc(s.x - cx + 10, s.y - 4, ORANGE_KING.LOB_RADIUS * 0.7, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(s.x - cx - 5, s.y - 5, 2, s.x - cx, s.y, ORANGE_KING.LOB_RADIUS);
    g.addColorStop(0, '#fff2b0');
    g.addColorStop(0.5, '#ffa31a');
    g.addColorStop(1, '#c75b00');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(s.x - cx, s.y, ORANGE_KING.LOB_RADIUS, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });
  drawOrangeKingVictoryRing(cx); // v0.3.61：勝利 — 油管環從小V身上升起、淡出
  // 撿到金色油管環：小V身上短暫金色光圈
  if (b.ringAuraMs > 0) {
    const a = Math.min(1, b.ringAuraMs / 400);
    const px = player.x + player.w / 2 - cx, py = player.y + player.h / 2;
    const rr = 50 + (1400 - b.ringAuraMs) / 40;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = 5;
    ctx.shadowColor = 'rgba(255,220,80,0.9)';
    ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.ellipse(px, py, rr * 0.7, rr, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  // 命中金色火花
  b.sparks.forEach(sp => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - sp.ms / 500);
    ctx.fillStyle = sp.ms < 150 ? '#fff6c2' : '#ffd23f';
    ctx.beginPath(); ctx.arc(sp.x - cx, sp.y, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });
  b.floatTexts.forEach(f => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - f.ms / 900);
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.strokeText(f.text, f.x - cx, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x - cx, f.y);
    ctx.restore();
  });
}

// HUD：Boss 名稱 + 8 格血條（取代一般關卡的倒數 / 進度條）
function drawOrangeKingHpBar() {
  const b = orangeKingBoss;
  if (!b || !b.hpBarVisible) return;
  const segW = 26, gap = 4, n = b.maxHp;
  const totalW = n * segW + (n - 1) * gap;
  const x0 = CANVAS_W / 2 - totalW / 2;
  const y0 = 24;
  ctx.save();
  ctx.fillStyle = 'rgba(20,10,30,0.65)';
  ctx.beginPath(); ctx.roundRect(x0 - 10, y0 - 4, totalW + 20, 22, 8); ctx.fill();
  for (let i = 0; i < n; i++) {
    // v0.3.35-damage-cap-fix-1：支援半格 — 先畫空格，再依剩餘血量畫滿格或半格
    const fillRatio = Math.max(0, Math.min(1, b.hp - i)); // 1 = 滿、0.5 = 半格、0 = 空
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.roundRect(x0 + i * (segW + gap), y0, segW, 14, 4); ctx.fill();
    if (fillRatio > 0) {
      ctx.fillStyle = b.hurtFlashMs > 0 ? '#ffffff' : '#ff8a1f';
      ctx.beginPath(); ctx.roundRect(x0 + i * (segW + gap), y0, segW * fillRatio, 14, 4); ctx.fill();
    }
  }
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23f';
  const ringTxt = b.ringActive ? '  👑 橙煌王權劍' : '';
  ctx.fillText('👑 橘子王  ' + b.hp + ' / ' + b.maxHp + ringTxt, CANVAS_W / 2, y0 + 34);
  ctx.restore();
}

// 畫面中央大字（登場 / 擊敗 / 第二章完成）
function drawOrangeKingBanner() {
  const b = orangeKingBoss;
  if (!b || !b.banner) return;
  const bn = b.banner;
  const inA = Math.min(1, bn.ms / 200);
  const outA = Math.min(1, (bn.dur - bn.ms) / 300);
  const a = Math.max(0, Math.min(inA, outA));
  const scale = 0.85 + 0.15 * inA;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(CANVAS_W / 2, CANVAS_H * 0.36);
  ctx.scale(scale, scale);
  ctx.font = 'bold 54px sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(60,20,0,0.85)';
  ctx.strokeText(bn.text, 0, 0);
  ctx.fillStyle = '#ffd23f';
  ctx.fillText(bn.text, 0, 0);
  if (bn.sub) {
    ctx.font = 'bold 22px sans-serif';
    ctx.lineWidth = 5;
    ctx.strokeText(bn.sub, 0, 40);
    ctx.fillStyle = '#fff';
    ctx.fillText(bn.sub, 0, 40);
  }
  ctx.restore();
}


// ════════════════════════════════════════════════════════════════════
//  v0.3.36：橘子王 Boss 房右側機關美術（主裝置 + 三根水平油管）＋ 定位工具
//  ・主裝置 orange_king_machine_base.png（512×512）畫在右側，Boss 站在它前面
//  ・水平油管 orange_king_oil_pipe_horizontal.png（1024×256）同一張圖畫三次（高 / 中 / 低）
//    油管右端接在主裝置左側的垂直主管上；油從油管左端的管口噴出
//  ・水平噴油的高度與 hitbox 由三根油管的 Y（pipeHighY / pipeMidY / pipeLowY）決定
//    → 用定位工具移動油管時，攻擊高度會一起移動（工具會畫出平台與玩家框方便對照）
//  ・圖片載入失敗時，退回簡單 canvas 幾何圖形，不影響攻擊判定
// ════════════════════════════════════════════════════════════════════
const ORANGE_KING_BOSS_ASSETS = {
  machineBase:       'assets/bosses/orange-king/orange_king_machine_base.png',
  oilPipeHorizontal: 'assets/bosses/orange-king/orange_king_oil_pipe_horizontal.png',
  oilStreamHorizontal: 'assets/bosses/orange-king/orange_king_oil_stream_horizontal.png', // v0.3.37：水平噴油特效圖
  bossRoomBg: 'assets/bosses/orange-king/orange_king_boss_room_bg.png', // v0.3.38：Boss 房背景（只用正式路徑，沒有備用路徑）
  platformHigh: 'assets/bosses/orange-king/orange_king_platform_high.png', // v0.3.39：高平台（短）專用
  platformMid:  'assets/bosses/orange-king/orange_king_platform_mid.png',  // v0.3.39：中平台（長）專用
  bossIdle:     'assets/bosses/orange-king/orange_king_idle_01.png',       // v0.3.41：一般 / 預警 / 瞄準
  bossCooldown: 'assets/bosses/orange-king/orange_king_cooldown_01.png',   // v0.3.41：喘氣 / 撞牆暈眩 / 擊敗
  bossDashBall: 'assets/bosses/orange-king/orange_king_dash_ball_01.png',  // v0.3.41：縮球旋轉 / 衝撞
  bossDashWarn:  'assets/bosses/orange-king/orange_king_dash_warn_01.png', // v0.3.43：衝撞預警（鎖定）
  bossDashPrep1: 'assets/bosses/orange-king/orange_king_dash_prep_01.png', // v0.3.43：蓄力
  bossDashPrep2: 'assets/bosses/orange-king/orange_king_dash_prep_02.png', // v0.3.43：蹲下抱腿、準備縮球
  // v0.3.44：拋物線油彈 / 地面油漬 / 擊敗圖（檔名以 repo 內實際存在的為準）
  oilShot:    'assets/bosses/orange-king/orange_king_oil_shot_arc_01.png',
  oilSlick:   'assets/bosses/orange-king/orange_king_oil_slick_ground_01.png',
  bossDefeat: 'assets/bosses/orange-king/orange_king_defeat_01.png',
  goldenRing: 'assets/bosses/orange-king/orange_king_golden_oil_ring.png', // v0.3.45：金色油管環
};
// v0.3.39：平台圖（1024×256）中實際有畫面的範圍（原圖像素）— X / Y 定位值 = 這個範圍的左上角
const ORANGE_KING_PLATFORM_SRC = {
  high: { w: 1024, h: 256, opaqueX: 590, opaqueY: 112, opaqueW: 433, opaqueH: 55 },
  mid:  { w: 1024, h: 256, opaqueX: 495, opaqueY: 110, opaqueW: 527, opaqueH: 73 },
};
// v0.3.38：Boss 房背景
const ORANGE_KING_BG_DIM_ALPHA = 0.0;       // 背景上疊的暗色遮罩（0 = 不調暗；背景太搶時可調 0.1～0.3）
// 背景圖底部自帶金屬地板，前緣剛好在 GROUND_Y（y=460）；
// false = 背景載入成功時不再畫舊的草地 / 泥土地面（碰撞不變），true = 舊地面照畫、蓋在背景圖上
const ORANGE_KING_BG_DRAW_OLD_GROUND = false;
// v0.3.37：主路徑載入失敗時依序嘗試的備用路徑
// （目前 GitHub 上這張圖放在 repo 根目錄；之後搬到 assets/bosses/orange-king/ 就會直接用主路徑）
const ORANGE_KING_BOSS_ASSET_FALLBACKS = {
  oilStreamHorizontal: ['orange_king_oil_stream_horizontal.png'],
};
// v0.3.37：水平噴油圖（1024×256，油從右端噴口往左噴）— 原圖中的噴口錨點
const ORANGE_KING_OIL_STREAM_SRC = { w: 1024, h: 256, anchorX: 1015, anchorY: 126, opaqueX: 212 };
// 素材內的關鍵位置（原圖像素）：油管左端管口 / 右端接頭 / 管身中心線；主裝置左側垂直主管中心
const ORANGE_KING_PIPE_SRC    = { w: 1024, h: 256, mouthX: 634, rightX: 1021, centerY: 120 };
const ORANGE_KING_MACHINE_SRC = { w: 512,  h: 512, vPipeX: 262, vPipeTopY: 140, vPipeBottomY: 430 };

// 初始定位（之後用定位工具微調，按 C 輸出數值）
const ORANGE_KING_MACHINE_ART_DEFAULTS = {
  baseX:     646,    // 主裝置繪製左緣（右側略超出畫面）
  baseY:     111,    // 主裝置繪製上緣（底部約在地面下 20px）
  baseScale: 0.72,   // 512 → 約 369px
  pipeX:     840,    // 三根油管共用：右端接頭的 x（接到主裝置左側垂直主管）
  pipeScale: 0.58,   // 1024×256 → 594×148（實際管身約 226px 長）
  pipeHighY: GROUND_Y - 260, // 200：管身中心線 = 高位噴油高度（最高平台）
  pipeMidY:  GROUND_Y - 155, // 305：中位（中層平台）
  pipeLowY:  GROUND_Y - 40,  // 420：低位（地面）
  oilBandH:  46,     // 噴油 hitbox 高度
  oilExtendX: 100,   // 噴油 hitbox 從管口再往右延伸（100 → 約到 x=715，和上一版一樣涵蓋到貼著橘子王的位置；設 0 = 只到管口）
  // v0.3.37：水平噴油特效圖（只管視覺，不影響 hitbox）
  //   原圖噴口錨點 (1015,126) 對齊油管管口 + offset；scaleX / scaleY 是對原圖的縮放
  oilStreamOffsetX: 0,
  oilStreamOffsetY: 0,
  oilStreamScaleX:  0.77, // 油流長度約 618px：從管口一路噴到畫面左緣
  oilStreamScaleY:  0.42, // 高度約 108px（噴口油團約 102px、油身約 30～40px）；油團太大可再調小
  // v0.3.39：平台美術（只管視覺；碰撞仍是 buildPlatforms 的 x0/y240/w190 與 x0/y345/w300）
  //   X / Y = 平台圖實際畫面範圍的左上角（Y ≈ 平台表面），預設對齊碰撞框左上角
  //   scale 預設 X、Y 相同（等比例，不變形）：高平台 433px → 190px、中平台 527px → 300px
  platformHighX: 0,
  platformHighY: GROUND_Y - 220,  // 240
  platformHighScaleX: 0.44,
  platformHighScaleY: 0.44,
  platformMidX: 0,
  platformMidY: GROUND_Y - 115,   // 345
  platformMidScaleX: 0.57,
  platformMidScaleY: 0.57,
  // v0.3.41：Boss 本體三張圖（offset = 相對於量測錨點的微調；scale = 對 512×512 原圖）
  bossIdleOffsetX: 0, bossIdleOffsetY: 0, bossIdleScale: 0.73,
  bossCooldownOffsetX: 0, bossCooldownOffsetY: 0, bossCooldownScale: 0.73,
  bossDashOffsetX: 0, bossDashOffsetY: -22, bossDashScale: 0.55, // v0.3.42：Vash 用 F4 調好的值
  // v0.3.42：衝撞撞牆後的暈眩（同一張 cooldown 圖，縮成接近 dash_ball 的大小）
  //   錨點 = 腳底踩在地面、身體中心對齊衝撞球中心；offsetY 0 = 剛好坐在地板上（不用 -22，否則會懸空）
  bossDashCooldownOffsetX: 0, bossDashCooldownOffsetY: 0, bossDashCooldownScale: 0.55,
  // v0.3.43：衝撞前三張圖（都以「腳底踩地、身體中心對齊」對位；縮放讓橘子身體和 idle 一樣約 190px，prep_02 略小、銜接 dash_ball）
  bossDashWarnOffsetX: 0,  bossDashWarnOffsetY: 0,  bossDashWarnScale: 0.70,
  bossDashPrep1OffsetX: 0, bossDashPrep1OffsetY: 0, bossDashPrep1Scale: 0.66,
  bossDashPrep2OffsetX: 0, bossDashPrep2OffsetY: 0, bossDashPrep2Scale: 0.60,
  // v0.3.44：拋物線油彈圖 — offset = 圖中球心相對碰撞圓心；scale 0.12 → 球體直徑約 35px（碰撞直徑 30px，略大一點好辨識）
  oilShotOffsetX: 0, oilShotOffsetY: 0, oilShotScale: 0.14,
  // v0.3.44：地面油漬圖 — 依 hitbox 寬度自動等比縮放（主體寬 = 100px），ScaleX/Y 是額外倍率；貼地線對齊地面
  oilSlickOffsetX: 0, oilSlickOffsetY: 0, oilSlickScaleX: 1, oilSlickScaleY: 1, oilSlickAlpha: 0.95,
  // v0.3.44：擊敗圖 — 坐地、身體中心對齊站位中心；0.73 與 idle / cooldown 同比例
  bossDefeatOffsetX: 0, bossDefeatOffsetY: 0, bossDefeatScale: 0.73,
  // v0.3.45：油彈圖旋轉校正（度）；發射起點微調；碰撞圓（中心偏移 + 半徑，半徑 15 = 原本 LOB_RADIUS）
  oilShotRotationOffset: 0,
  arcShotOriginOffsetX: 3, arcShotOriginOffsetY: -9,
  arcShotHitboxOffsetX: 0, arcShotHitboxOffsetY: 0, arcShotHitboxRadius: 17, // v0.3.46：油彈圖 0.14 時球體半徑約 20px；碰撞取約 85%（不算皇冠 / 尾巴）較公平
  // v0.3.45：地面油漬底光（橘金色，隨時間輕微呼吸）
  oilSlickGlowAlpha: 0.7, oilSlickGlowScale: 1.35,
  // v0.3.45：金色油管環正式圖 — 以圖中「環＋皇冠」的中心對準環的位置；0.15 → 約 59×63px
  goldenRingOffsetX: 0, goldenRingOffsetY: 0, goldenRingScale: 0.15, goldenRingAlpha: 1,
  // v0.3.46：橙煌王權劍（小V攻擊 4 張 royal 圖）— offset 單位 = 畫面 px（往角色面向的方向為 +X）；
  //   scale = 相對原本氣球劍圖的倍率（1 = 每個原圖像素和原本 hero_sword_attack（420×420）一樣大）
  //   實測（royal 圖皆 500×500；原圖 420 / 485 / 485 / 521）：以頭髮頂端、頭髮中心、鞋底對齊原本 frame 算出，再用頭髮＋皮膚區域微調
  royalSwordAttack1OffsetX: 0,  royalSwordAttack1OffsetY: 6,  royalSwordAttack1Scale: 0.97,
  royalSwordAttack2OffsetX: 1,  royalSwordAttack2OffsetY: 2,  royalSwordAttack2Scale: 0.99,
  royalSwordAttack3OffsetX: -1, royalSwordAttack3OffsetY: 7,  royalSwordAttack3Scale: 1.03,
  royalSwordAttack4OffsetX: -2, royalSwordAttack4OffsetY: -4, royalSwordAttack4Scale: 1,
};
const ORANGE_KING_MACHINE_ART = Object.assign({}, ORANGE_KING_MACHINE_ART_DEFAULTS);

const orangeKingBossImgs = {};
const orangeKingBossImgStatus = {}; // key → 'loading' | 'ok' | 'error'
function initOrangeKingBossArt() {
  if (typeof Image === 'undefined') return;
  Object.entries(ORANGE_KING_BOSS_ASSETS).forEach(([key, path]) => {
    if (orangeKingBossImgs[key]) return;
    try {
      const img = new Image();
      const candidates = [path].concat(ORANGE_KING_BOSS_ASSET_FALLBACKS[key] || []);
      let tryIdx = 0;
      orangeKingBossImgStatus[key] = 'loading';
      img.onload  = () => { orangeKingBossImgStatus[key] = tryIdx === 0 ? 'ok' : 'ok(備用路徑)'; };
      img.onerror = () => {
        if (key === 'bossRoomBg') console.warn('Orange King boss room background failed to load:', candidates[tryIdx]);
        else console.warn('[OrangeKingArt] load failed:', candidates[tryIdx]);
        tryIdx++;
        if (tryIdx < candidates.length) {
          img.src = resolveAdventureAssetSrc(candidates[tryIdx]) + '?v=' + encodeURIComponent(GAME_VERSION);
        } else {
          orangeKingBossImgStatus[key] = 'error';
        }
      };
      img.src = resolveAdventureAssetSrc(path) + '?v=' + encodeURIComponent(GAME_VERSION);
      orangeKingBossImgs[key] = img;
    } catch (e) { orangeKingBossImgStatus[key] = 'error'; }
  });
}
// 回傳已載入完成的圖片；沒載好 / 失敗回傳 null（呼叫端改畫幾何 fallback）
function getOrangeKingBossImg(key) {
  const img = orangeKingBossImgs[key];
  return (img && img.complete && img.naturalWidth > 0) ? img : null;
}
// v0.3.51：不再於頁面載入時預載 Boss 素材 — 由 preloadAssetGroup('orangeKingBoss') 在進 2-4 前載入

function getOrangeKingPipeY(laneKey) {
  const A = ORANGE_KING_MACHINE_ART;
  return laneKey === 'high' ? A.pipeHighY : (laneKey === 'mid' ? A.pipeMidY : A.pipeLowY);
}
// 油管繪製矩形（整張圖）＋ 管口 / 接頭位置（世界座標）
function getOrangeKingPipeGeom(laneKey) {
  const A = ORANGE_KING_MACHINE_ART, S = ORANGE_KING_PIPE_SRC, s = A.pipeScale;
  const y = getOrangeKingPipeY(laneKey);
  const drawX = A.pipeX - S.rightX * s;
  const drawY = y - S.centerY * s;
  return {
    drawX, drawY, drawW: S.w * s, drawH: S.h * s,
    mouthX: drawX + S.mouthX * s, joinX: A.pipeX, y,
    opaqueX: drawX + 632 * s, opaqueY: drawY + 74 * s, opaqueW: (1021 - 632) * s, opaqueH: (190 - 74) * s,
  };
}
// ════════════════════════════════════════════════════════════════════
//  v0.3.40：教學衝撞時的「安全平台」發光提示（只在第一次教學衝撞）
//  ・從教學衝撞預警（chargeWarn）開始亮起，蹲低 / 旋轉 / 衝撞全程維持，撞牆後 0.6 秒淡出
//  ・橙金色暖光：外圈光暈（呼吸脈衝）+ 平台表面掃光 + 上方小箭頭
//  ・節奏：每 1.1 秒一拍 — 中平台先亮（較弱）→ 高平台接著亮（較強），引導「往上跳」
//  ・只是視覺：不改平台碰撞、不改 Boss 節奏
// ════════════════════════════════════════════════════════════════════
const ORANGE_KING_PLATFORM_HINT = {
  FADE_IN_MS:  250,   // 亮起
  FADE_OUT_MS: 600,   // 教學衝撞撞牆後淡出
  BEAT_MS:     1100,  // 一拍：中平台 → 高平台
  BASE:        0.35,  // 提示期間兩個平台的底光
  MID_PEAK:    0.75,  // 中平台脈衝峰值
  HIGH_PEAK:   1.0,   // 高平台脈衝峰值（較強，引導往上）
  HALO_BLUR:   26,    // 外圈光暈模糊半徑
};
const ORANGE_KING_PLATFORM_HINT_PHASES = ['chargeWarn', 'chargeCurl', 'chargeSpin', 'chargeDash'];

// 每幀更新提示強度（由 updateOrangeKingBoss 呼叫）
function updateOrangeKingPlatformHint(dtMs) {
  const b = orangeKingBoss;
  if (!b) return;
  const active = b.chargeTutorial && ORANGE_KING_PLATFORM_HINT_PHASES.includes(b.phase);
  if (active) {
    b.platformHintMs = (b.platformHintMs || 0) + dtMs;
    b.platformHintAlpha = Math.min(1, (b.platformHintAlpha || 0) + dtMs / ORANGE_KING_PLATFORM_HINT.FADE_IN_MS);
  } else if (b.platformHintAlpha > 0) {
    b.platformHintMs = (b.platformHintMs || 0) + dtMs;
    b.platformHintAlpha = Math.max(0, b.platformHintAlpha - dtMs / ORANGE_KING_PLATFORM_HINT.FADE_OUT_MS);
  }
}
// 某個平台目前的提示亮度 0~1（kind = 'high' | 'mid'）
function getOrangeKingPlatformHintLevel(kind) {
  const b = orangeKingBoss;
  if (!b || !(b.platformHintAlpha > 0) || !isOrangeKingStageActive()) return 0;
  const H = ORANGE_KING_PLATFORM_HINT;
  const ph = ((b.platformHintMs || 0) % H.BEAT_MS) / H.BEAT_MS;           // 0~1
  const bell = (c, w) => { const d = Math.abs(ph - c); return d > w ? 0 : 0.5 + 0.5 * Math.cos(d / w * Math.PI); };
  const pulse = kind === 'mid' ? H.MID_PEAK * bell(0.22, 0.22) : H.HIGH_PEAK * bell(0.55, 0.26);
  return b.platformHintAlpha * Math.min(1, H.BASE + (1 - H.BASE) * pulse);
}
// 平台提示的對象矩形：有正式平台圖就用圖的畫面範圍，否則用碰撞框
function getOrangeKingPlatformHintRect(p) {
  if (p.artKey && getOrangeKingBossImg(p.artKey === 'high' ? 'platformHigh' : 'platformMid')) {
    const g = getOrangeKingPlatformArtGeom(p.artKey);
    return { x: g.artX, y: g.artY, w: g.artW, h: g.artH };
  }
  return { x: p.x, y: p.y, w: p.w, h: p.h };
}
// layer = 'back'（平台後方的光暈）| 'front'（平台表面掃光 + 箭頭）
function drawOrangeKingPlatformHint(p, cx, layer) {
  if (!p.artKey) return;
  const lv = getOrangeKingPlatformHintLevel(p.artKey);
  if (lv <= 0.01) return;
  const r = getOrangeKingPlatformHintRect(p);
  const x = r.x - cx;
  ctx.save();
  if (layer === 'back') {
    ctx.shadowColor = `rgba(255,190,60,${0.95 * lv})`;
    ctx.shadowBlur = ORANGE_KING_PLATFORM_HINT.HALO_BLUR * (0.6 + 0.4 * lv);
    ctx.fillStyle = `rgba(255,170,40,${0.7 * lv})`;
    ctx.beginPath(); ctx.roundRect(x - 5, r.y - 5, r.w + 10, r.h + 10, 8); ctx.fill();
  } else {
    ctx.globalCompositeOperation = 'lighter';
    // 表面亮線（可站立的那一面）
    const top = ctx.createLinearGradient(0, r.y - 6, 0, r.y + 8);
    top.addColorStop(0, 'rgba(255,220,120,0)');
    top.addColorStop(0.5, `rgba(255,215,110,${0.75 * lv})`);
    top.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = top;
    ctx.fillRect(x, r.y - 6, r.w, 14);
    // 掃光：由左往右掃過平台表面
    const sweepT = ((orangeKingBoss.platformHintMs || 0) % 900) / 900;
    const sx = x - 60 + (r.w + 120) * sweepT;
    const sg = ctx.createLinearGradient(sx - 40, 0, sx + 40, 0);
    sg.addColorStop(0, 'rgba(255,230,150,0)');
    sg.addColorStop(0.5, `rgba(255,240,170,${0.45 * lv})`);
    sg.addColorStop(1, 'rgba(255,230,150,0)');
    ctx.fillStyle = sg;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, r.y - 2, r.w, r.h + 2); ctx.clip();
    ctx.fillRect(sx - 40, r.y - 2, 80, r.h + 2);
    ctx.restore();
    // 亮金色描邊：背景偏橘時仍能一眼分辨「這裡可以站」
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowColor = `rgba(255,200,70,${lv})`;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = `rgba(255,236,150,${0.9 * lv})`;
    ctx.lineWidth = 1.5 + 2 * lv;
    ctx.beginPath(); ctx.roundRect(x - 2, r.y - 2, r.w + 4, r.h + 4, 6); ctx.stroke();
    ctx.restore();
    ctx.save();
    // 上方小箭頭（往上跳）
    const bob = Math.sin((orangeKingBoss.platformHintMs || 0) / 160) * 4;
    ctx.globalAlpha = Math.min(1, lv * 1.1);
    ctx.fillStyle = '#ffd23f';
    ctx.strokeStyle = 'rgba(90,40,0,0.85)';
    ctx.lineWidth = 2;
    const ax = x + Math.min(r.w * 0.55, r.w - 30), ay = r.y - 30 + bob;
    ctx.shadowColor = 'rgba(255,200,60,0.9)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(ax, ay - 16); ctx.lineTo(ax + 16, ay + 3); ctx.lineTo(ax + 7, ay + 3);
    ctx.lineTo(ax + 7, ay + 16); ctx.lineTo(ax - 7, ay + 16); ctx.lineTo(ax - 7, ay + 3); ctx.lineTo(ax - 16, ay + 3);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════
//  v0.3.41：橘子王本體正式美術（idle / cooldown / dash_ball）
//  ・三張圖都是 512×512，以「素材上的實際部位」對位（量自原圖）：
//      idle      ：雙腳底 (225,462) 對齊 Boss 站立點；橘子身體寬約 260px（x 95~355）
//      cooldown  ：屁股 / 腳底 (230,472) 對齊 Boss 站立點；身體寬約 260px（x 100~360）
//      dash_ball ：球心 (225,275) 對齊衝撞球判定框中心；球體直徑約 330px（x 60~390）
//  ・縮放：idle / cooldown 0.73 → 橘子身體約 190px = Boss 身體判定寬；dash 0.47 → 球約 155px = 衝撞球判定（160×150）
//  ・圖片只負責視覺；hitbox / 衝撞判定 / 受傷判定沿用原本的 getOrangeKingBodyRect 等
//  ・拋物線油彈的發射點 = idle 圖背後油管的管口 (310,45)
// ════════════════════════════════════════════════════════════════════
const ORANGE_KING_BOSS_ART_SRC = {
  idle:     { w: 512, h: 512, anchorX: 225, anchorY: 462, opaque: [30, 6, 494, 468],  sphere: [95, 135, 355, 405], beltY: 333, lobMouthX: 310, lobMouthY: 45 },
  cooldown: { w: 512, h: 512, anchorX: 230, anchorY: 472, opaque: [15, 25, 493, 485], sphere: [100, 190, 360, 450], beltY: 395 },
  dash:     { w: 512, h: 512, anchorX: 225, anchorY: 275, opaque: [30, 55, 512, 495], sphere: [60, 110, 390, 440] },
};
// v0.3.42：dashCooldown = 衝撞撞牆後暈眩，沿用 cooldown 圖與量測點，只是尺寸 / 定位參數獨立
ORANGE_KING_BOSS_ART_SRC.dashCooldown = ORANGE_KING_BOSS_ART_SRC.cooldown;
// v0.3.43：衝撞前三張圖（量自原圖：anchor = 身體中心 x / 腳底 y；sphere = 橘子身體範圍）
ORANGE_KING_BOSS_ART_SRC.dashWarn  = { w: 512, h: 512, anchorX: 210, anchorY: 466, opaque: [5, 12, 487, 469], sphere: [75, 160, 345, 390] };
ORANGE_KING_BOSS_ART_SRC.dashPrep1 = { w: 512, h: 512, anchorX: 245, anchorY: 486, opaque: [2, 1, 509, 490],  sphere: [100, 120, 390, 410] };
ORANGE_KING_BOSS_ART_SRC.dashPrep2 = { w: 512, h: 512, anchorX: 255, anchorY: 490, opaque: [36, 30, 483, 492], sphere: [85, 160, 385, 420] };
// v0.3.44：擊敗圖（量自原圖：anchor = 身體中心 x / 坐地接觸線 y；右腳尖到 499 會比地面線低幾 px，看起來是坐在地板上）
ORANGE_KING_BOSS_ART_SRC.defeat = { w: 512, h: 512, anchorX: 250, anchorY: 490, opaque: [15, 37, 494, 500], sphere: [140, 150, 385, 445] };
const ORANGE_KING_BOSS_ART_KEYS = { idle: 'bossIdle', cooldown: 'bossCooldown', dash: 'bossDashBall', dashCooldown: 'bossCooldown',
                                    dashWarn: 'bossDashWarn', dashPrep1: 'bossDashPrep1', dashPrep2: 'bossDashPrep2', defeat: 'bossDefeat' };
const ORANGE_KING_BOSS_ART_PARAM = { idle: 'bossIdle', cooldown: 'bossCooldown', dash: 'bossDash', dashCooldown: 'bossDashCooldown',
                                     dashWarn: 'bossDashWarn', dashPrep1: 'bossDashPrep1', dashPrep2: 'bossDashPrep2', defeat: 'bossDefeat' };
// 新圖沒載好時退回的狀態（退回 idle 時沿用原本的抖動 / 壓扁演出；defeat 退回 cooldown = 舊的縮小閃爍擊敗演出）
const ORANGE_KING_BOSS_ART_FALLBACK = { dashWarn: 'idle', dashPrep1: 'idle', dashPrep2: 'idle', defeat: 'cooldown' };

// v0.3.44：拋物線油彈圖（512×512，量自原圖）— 球心 (193,262)、球半徑約 145；皇冠在左上、油花尾巴往右 → 原圖朝左飛
const ORANGE_KING_OIL_SHOT_SRC = { w: 512, h: 512, cx: 193, cy: 262, sphereR: 145, opaque: [33, 105, 503, 411] };
// v0.3.44：地面油漬圖（512×512，量自原圖）— 主體左右 50~465（不含兩端細尖 / 小油滴），貼地線 = 油漬上下中心 y 432
const ORANGE_KING_OIL_SLICK_SRC = { w: 512, h: 512, anchorX: 257, groundY: 432, coreL: 50, coreR: 465, opaque: [29, 389, 481, 475] };
// v0.3.45：金色油管環圖（512×512，量自原圖）— 有畫面範圍 61~454 × 34~453，中心 (257,243)
const ORANGE_KING_GOLDEN_RING_SRC = { w: 512, h: 512, cx: 257, cy: 243, opaque: [61, 34, 454, 453] };
const ORANGE_KING_OIL_SLICK_GROUND_Y_OFFSET = -6; // 實測：地面線剛好是走道前緣，貼地線往上 6px 才會躺在走道表面（不會垂出前緣）

// v0.3.43：喘氣虛線框呼吸（0~1，1.2 秒一循環，柔和 cos 曲線）
const ORANGE_KING_COOLDOWN_BREATH_MS = 1200;
// v0.3.45：共用呼吸曲線（0~1，柔和 cos）；cooldown 虛線用 1.2 秒，idle 本體用 3.4 秒（又慢又穩）
function getOrangeKingBreath(t, periodMs) {
  return 0.5 - 0.5 * Math.cos((t % periodMs) / periodMs * Math.PI * 2);
}
function getOrangeKingCooldownBreath(t) { return getOrangeKingBreath(t, ORANGE_KING_COOLDOWN_BREATH_MS); }
// v0.3.45：idle 呼吸（只影響 idle 圖的繪製；判定不變）
const ORANGE_KING_IDLE_BREATH = { periodMs: 3400, scaleY: 0.012, scaleX: 0.005, liftPx: 1.5 };
// v0.3.45：dash 流程 — prep_02 撐到衝出前最後這段時間才換成 dash_ball
const ORANGE_KING_DASH_BALL_LEAD_MS = 180;
const ORANGE_KING_DASH_BALL_LEAD_MS_TUTORIAL = 240;

// ════════════════════════════════════════════════════════════════════
//  v0.3.43：2-4 橘子王 Boss 戰 BGM（只用在 2-4；單一 Audio 元件，不會疊播）
//  ・每幀由 draw() 呼叫 syncOrangeKingBgm()，依「現在該不該播」決定 play / pause：
//      2-4 且 gameState === 'playing' → 播放（暫停後繼續 = 接著播，不重開）
//      暫停 → pause；死亡（failed）/ 通關（clear）/ 離開 2-4 / 回小V的家 → 停止並回到開頭
//      死亡重試 / 重新進入 2-4（restart 建立新 Boss）→ 從頭播放
//      擊敗橘子王後的勝利演出 3 秒內慢慢淡出
//  ・載入失敗 / 瀏覽器擋自動播放 都不會報錯，只在 console 提示
// ════════════════════════════════════════════════════════════════════
const ORANGE_KING_BGM_PATH = 'assets/audio/bgm/orange_king_boss_bgm.mp3';
// 暫時備用：目前 GitHub 上資料夾名稱多了空白（「assets/ audio/     bgm/」），正式路徑找不到時先用這個
const ORANGE_KING_BGM_FALLBACK_PATHS = ['assets/%20audio/%20%20%20%20%20bgm/orange_king_boss_bgm.mp3'];
// v0.3.45：0.6 → 0.42（× 0.7）；實測 BGM 與 jingle 原檔響度相近（約 -21 dBFS），jingle 以 0.7 播放會比 BGM 清楚
const ORANGE_KING_BGM_VOLUME = 0.42;
const ORANGE_KING_BGM_DEFEAT_FADE_MS = 600; // 擊敗時 BGM 0.6 秒內淡出，讓勝利音效乾淨地出來
// v0.3.45：擊敗勝利短音效（只播一次、不 loop）
const ORANGE_KING_VICTORY_JINGLE_PATH = 'assets/audio/sfx/orange_king_victory_jingle.mp3';
const ORANGE_KING_VICTORY_JINGLE_VOLUME = 0.7;
let orangeKingJingle = null;
let orangeKingJingleStatus = '-';
let orangeKingBgm = null;
let orangeKingBgmStatus = '-';      // 'loading' | 'ok' | 'ok(備用路徑)' | 'error' | 'blocked'
let orangeKingBgmWantRestart = false;
let orangeKingBgmBlocked = false;
function initOrangeKingBgm() {
  if (orangeKingBgm || typeof Audio === 'undefined') return;
  try {
    const a = new Audio();
    const candidates = [ORANGE_KING_BGM_PATH].concat(ORANGE_KING_BGM_FALLBACK_PATHS);
    let idx = 0;
    a.loop = true;
    a.preload = 'auto';
    a.volume = ORANGE_KING_BGM_VOLUME;
    orangeKingBgmStatus = 'loading';
    a.addEventListener('canplaythrough', () => { if (orangeKingBgmStatus === 'loading') orangeKingBgmStatus = idx === 0 ? 'ok' : 'ok(備用路徑)'; });
    a.addEventListener('error', () => {
      console.warn('[OrangeKingBGM] load failed:', candidates[idx]);
      idx++;
      if (idx < candidates.length) { a.src = resolveAdventureAssetSrc(candidates[idx]) + '?v=' + encodeURIComponent(GAME_VERSION); a.load(); }
      else orangeKingBgmStatus = 'error';
    });
    a.src = resolveAdventureAssetSrc(candidates[0]) + '?v=' + encodeURIComponent(GAME_VERSION);
    orangeKingBgm = a;
  } catch (e) { orangeKingBgmStatus = 'error'; }
  initOrangeKingVictoryJingle(); // 進 2-4 時一起預載，擊敗瞬間才不會延遲
}
function initOrangeKingVictoryJingle() {
  if (orangeKingJingle || typeof Audio === 'undefined') return;
  try {
    const j = new Audio();
    j.loop = false;
    j.preload = 'auto';
    j.volume = ORANGE_KING_VICTORY_JINGLE_VOLUME;
    orangeKingJingleStatus = 'loading';
    j.addEventListener('canplaythrough', () => { if (orangeKingJingleStatus === 'loading') orangeKingJingleStatus = 'ok'; });
    j.addEventListener('error', () => { orangeKingJingleStatus = 'error'; console.warn('[OrangeKingJingle] load failed'); });
    j.src = resolveAdventureAssetSrc(ORANGE_KING_VICTORY_JINGLE_PATH) + '?v=' + encodeURIComponent(GAME_VERSION);
    orangeKingJingle = j;
  } catch (e) { orangeKingJingleStatus = 'error'; }
}
// 擊敗瞬間呼叫一次（同一場戰鬥由 b.victoryJinglePlayed 擋重複）
function playOrangeKingVictoryJingle() {
  const b = orangeKingBoss;
  if (!b || b.victoryJinglePlayed) return;
  b.victoryJinglePlayed = true;
  if (!orangeKingJingle) initOrangeKingVictoryJingle();
  const j = orangeKingJingle;
  if (!j || orangeKingJingleStatus === 'error') return; // 載入失敗：直接跳過
  try {
    j.currentTime = 0;
    j.volume = ORANGE_KING_VICTORY_JINGLE_VOLUME;
    const pr = j.play();
    if (pr && typeof pr.catch === 'function') pr.catch(() => {});
  } catch (e) {}
}
function stopOrangeKingVictoryJingle() {
  const j = orangeKingJingle;
  if (!j) return;
  try { if (!j.paused) j.pause(); if (j.currentTime > 0) j.currentTime = 0; } catch (e) {}
}
function stopOrangeKingBgm() {
  const a = orangeKingBgm;
  if (!a) return;
  try { if (!a.paused) a.pause(); if (a.currentTime > 0) a.currentTime = 0; a.volume = ORANGE_KING_BGM_VOLUME; } catch (e) {}
}
function syncOrangeKingBgm() {
  const inBoss = isOrangeKingStageActive();
  if (!inBoss) { stopOrangeKingBgm(); stopOrangeKingVictoryJingle(); return; }
  if (!orangeKingBgm) initOrangeKingBgm();
  const a = orangeKingBgm;
  if (!a || orangeKingBgmStatus === 'error') return;
  if (gameState === 'failed' || gameState === 'clear' || gameState === 'gameover') { stopOrangeKingBgm(); return; }
  if (gameState !== 'playing' && !isRpgDialogKeepingBgm()) { try { if (!a.paused) a.pause(); } catch (e) {} return; } // 暫停：只 pause，不重開（v0.3.60：RPG 對話中照常播放）
  if (orangeKingBgmWantRestart) {
    orangeKingBgmWantRestart = false;
    try { a.currentTime = 0; } catch (e) {}
  }
  // 勝利演出：音量慢慢降到 0
  const b = orangeKingBoss;
  try {
    a.volume = (b && b.phase === 'defeated')
      ? Math.max(0, ORANGE_KING_BGM_VOLUME * (1 - b.phaseMs / ORANGE_KING_BGM_DEFEAT_FADE_MS))
      : ORANGE_KING_BGM_VOLUME;
  } catch (e) {}
  if (b && b.phase === 'defeated' && b.phaseMs >= ORANGE_KING_BGM_DEFEAT_FADE_MS) { try { if (!a.paused) a.pause(); } catch (e) {} return; } // 淡出完就停
  if (a.paused && !orangeKingBgmBlocked) {
    try {
      const pr = a.play();
      if (pr && typeof pr.catch === 'function') {
        pr.catch(err => {
          if (err && err.name === 'NotAllowedError') {
            // 瀏覽器擋自動播放：等玩家下一次點擊 / 按鍵再播
            orangeKingBgmBlocked = true;
            orangeKingBgmStatus = 'blocked';
            const resume = () => { orangeKingBgmBlocked = false; if (orangeKingBgmStatus === 'blocked') orangeKingBgmStatus = 'ok'; };
            window.addEventListener('pointerdown', resume, { once: true });
            window.addEventListener('keydown', resume, { once: true });
          }
        });
      }
    } catch (e) {}
  }
}

// 目前要畫哪一張（純視覺；與判定無關）
function getOrangeKingArtState(b) {
  if (orangeKingMachineCalibMode) {
    const pv = { bossIdle: 'idle', bossCooldown: 'cooldown', bossDash: 'dash', bossDashCooldown: 'dashCooldown',
                 bossDashWarn: 'dashWarn', bossDashPrep1: 'dashPrep1', bossDashPrep2: 'dashPrep2', bossDefeat: 'defeat' }[orangeKingMachineCalibTarget];
    if (pv) return pv;
  }
  if (b.phase === 'defeated') return 'defeat'; // v0.3.44：擊敗圖（沒載好 → 退回 cooldown 舊演出）
  // v0.3.45：縮球原地蓄力（chargeSpin）大部分時間仍是 prep_02 抖動，衝出前最後一瞬間才換 dash_ball
  if (b.curled && b.phase === 'chargeSpin') {
    const dur  = b.chargeTutorial ? ORANGE_KING_TIMING.TUTORIAL_CHARGE_SPIN : ORANGE_KING_TIMING.CHARGE_SPIN;
    const lead = b.chargeTutorial ? ORANGE_KING_DASH_BALL_LEAD_MS_TUTORIAL : ORANGE_KING_DASH_BALL_LEAD_MS;
    return b.phaseMs < dur - lead ? 'dashPrep2' : 'dash';
  }
  if (b.curled) return b.phase === 'chargeDash' ? 'dash' : 'dashCooldown'; // v0.3.42：撞牆暈眩用小尺寸
  if (b.phase === 'cooldown') return 'cooldown';
  // v0.3.43：衝撞前演出 dash_warn → dash_prep_01 → dash_prep_02（蹲低時間前半 / 後半）
  if (b.phase === 'chargeWarn') return 'dashWarn';
  if (b.phase === 'chargeCurl') {
    const dur = b.chargeTutorial ? ORANGE_KING_TIMING.TUTORIAL_CHARGE_CURL : ORANGE_KING_TIMING.CHARGE_CURL;
    return b.phaseMs < dur * 0.5 ? 'dashPrep1' : 'dashPrep2';
  }
  return 'idle';
}
// 某個狀態的繪製矩形（世界座標）；anchor：idle/cooldown = 站立點（身體中心 x、腳底 y），dash = 球心
function getOrangeKingBossArtGeom(state, b) {
  const A = ORANGE_KING_MACHINE_ART, S = ORANGE_KING_BOSS_ART_SRC[state];
  const pre = ORANGE_KING_BOSS_ART_PARAM[state];
  const sc = A[pre + 'Scale'];
  let ax, ay;
  const previewDash = (state === 'dash' || state === 'dashCooldown') && !b.curled; // 定位工具預覽：放在站位上的衝撞球位置
  if (state === 'dashCooldown') {
    const bx = previewDash ? ORANGE_KING.HOME_X + (ORANGE_KING.W - ORANGE_KING.BALL_W) / 2 : b.x;
    ax = bx + ORANGE_KING.BALL_W / 2;
    ay = GROUND_Y;
  } else if (state === 'dash') {
    const bx = previewDash ? ORANGE_KING.HOME_X + (ORANGE_KING.W - ORANGE_KING.BALL_W) / 2 : b.x;
    ax = bx + ORANGE_KING.BALL_W / 2;
    ay = GROUND_Y - ORANGE_KING.BALL_H / 2;
  } else {
    const r = getOrangeKingBodyRect();
    ax = r.x + r.w / 2;
    ay = b.curled ? GROUND_Y : b.y + b.h;
  }
  ax += A[pre + 'OffsetX'];
  ay += A[pre + 'OffsetY'];
  const drawX = ax - S.anchorX * sc, drawY = ay - S.anchorY * sc;
  const box = arr => ({ x: drawX + arr[0] * sc, y: drawY + arr[1] * sc, w: (arr[2] - arr[0]) * sc, h: (arr[3] - arr[1]) * sc });
  return { state, sc, ax, ay, drawX, drawY, drawW: S.w * sc, drawH: S.h * sc, opaque: box(S.opaque), sphere: box(S.sphere),
           beltY: S.beltY != null ? drawY + S.beltY * sc : null, previewDash };
}

// v0.3.46：油彈發射瞬間，管口的橘金色噴濺光（0.22 秒）
function drawOrangeKingLobMuzzle(cx) {
  const b = orangeKingBoss;
  const m = b && b.lobMuzzle;
  if (!m) return;
  m.ms += 16.667;
  if (m.ms > 220) { b.lobMuzzle = null; return; }
  const p = m.ms / 220;
  const x = m.x - cx, y = m.y;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const r = 10 + 18 * p;
  const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(255,250,200,${0.9 * (1 - p)})`);
  gr.addColorStop(0.5, `rgba(255,190,60,${0.6 * (1 - p)})`);
  gr.addColorStop(1, 'rgba(255,140,20,0)');
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = `rgba(255,170,30,${0.9 * (1 - p)})`;
  [[-0.9, 0.6], [-0.5, -0.7], [0.2, -0.9], [-1, -0.1]].forEach(([dx, dy]) => {
    ctx.beginPath(); ctx.arc(x + dx * 22 * p, y + dy * 18 * p + 10 * p * p, 2.6 * (1 - p * 0.5), 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
}

// ── v0.3.44：拋物線油彈圖 ──
// 油彈目前的速度方向（原圖朝左飛，所以旋轉角 = 速度角 − π）
function getOrangeKingOilShotRot(s) {
  const vy = s.vy0 + s.g * s.t;
  let r = Math.atan2(vy, s.vx) - Math.PI + (ORANGE_KING_MACHINE_ART.oilShotRotationOffset || 0) * Math.PI / 180;
  while (r < -Math.PI) r += Math.PI * 2;
  while (r > Math.PI) r -= Math.PI * 2;
  return r;
}
// 世界座標下的繪製資訊；x,y = 碰撞圓心
function getOrangeKingOilShotGeom(x, y, rot, grow) {
  const A = ORANGE_KING_MACHINE_ART, S = ORANGE_KING_OIL_SHOT_SRC;
  const sc = A.oilShotScale * (grow == null ? 1 : grow);
  return { cx: x + A.oilShotOffsetX, cy: y + A.oilShotOffsetY, sc, rot: rot || 0,
           drawX: -S.cx * sc, drawY: -S.cy * sc, drawW: S.w * sc, drawH: S.h * sc, sphereR: S.sphereR * sc,
           opaque: { x: (S.opaque[0] - S.cx) * sc, y: (S.opaque[1] - S.cy) * sc, w: (S.opaque[2] - S.opaque[0]) * sc, h: (S.opaque[3] - S.opaque[1]) * sc } };
}
// 回傳 false = 圖沒載好（呼叫端畫原本的漸層圓球）
function drawOrangeKingOilShotArt(x, y, rot, grow, cx, alpha) {
  const img = getOrangeKingBossImg('oilShot');
  if (!img) return false;
  const g = getOrangeKingOilShotGeom(x, y, rot, grow);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (alpha != null) ctx.globalAlpha = alpha;
  ctx.translate(g.cx - cx, g.cy);
  ctx.rotate(g.rot);
  ctx.drawImage(img, g.drawX, g.drawY, g.drawW, g.drawH);
  ctx.restore();
  return true;
}

// ── v0.3.44：地面油漬圖 ──
// p = 油漬（x, w）；grow 0→1 = 擴散；回傳世界座標繪製矩形（依 hitbox 寬度自動等比縮放）
function getOrangeKingOilSlickGeom(p, grow) {
  const A = ORANGE_KING_MACHINE_ART, S = ORANGE_KING_OIL_SLICK_SRC;
  const base = p.w / (S.coreR - S.coreL);
  const gr = grow == null ? 1 : grow;
  const sx = base * A.oilSlickScaleX * gr, sy = base * A.oilSlickScaleY * gr;
  const ax = p.x + p.w / 2 + A.oilSlickOffsetX;
  const ay = GROUND_Y + ORANGE_KING_OIL_SLICK_GROUND_Y_OFFSET + A.oilSlickOffsetY;
  return { ax, ay, sx, sy, drawX: ax - S.anchorX * sx, drawY: ay - S.groundY * sy, drawW: S.w * sx, drawH: S.h * sy,
           coreX: ax - (S.anchorX - S.coreL) * sx, coreW: (S.coreR - S.coreL) * sx,
           opaque: { x: ax - (S.anchorX - S.opaque[0]) * sx, y: ay - (S.groundY - S.opaque[1]) * sy,
                     w: (S.opaque[2] - S.opaque[0]) * sx, h: (S.opaque[3] - S.opaque[1]) * sy } };
}
// v0.3.45：油漬底光（橘金色橢圓光暈，隨存在時間輕微呼吸）— 只是視覺
function drawOrangeKingOilSlickGlow(p, cx, grow, fade, t) {
  const A = ORANGE_KING_MACHINE_ART;
  if (A.oilSlickGlowAlpha <= 0) return;
  const g = getOrangeKingOilSlickGeom(p, 1);
  const breath = getOrangeKingBreath(t + p.x * 7, 1100);
  const rx = (g.coreW / 2) * A.oilSlickGlowScale * Math.max(0.2, grow);
  const ry = 13 * A.oilSlickGlowScale * Math.max(0.2, grow);
  const alpha = A.oilSlickGlowAlpha * (0.7 + 0.3 * breath) * fade;
  // 深色接觸陰影：把油漬和同樣偏橘的地板分開（不是黑油，只是很淡的暗邊）
  ctx.save();
  ctx.translate(g.ax - cx, g.ay + 2);
  ctx.scale(1, (ry * 0.75) / (rx * 0.62));
  const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * 0.62);
  sh.addColorStop(0,   `rgba(50,18,0,${0.5 * Math.min(1, A.oilSlickGlowAlpha * 1.6) * fade})`);
  sh.addColorStop(0.7, `rgba(50,18,0,${0.3 * Math.min(1, A.oilSlickGlowAlpha * 1.6) * fade})`);
  sh.addColorStop(1,   'rgba(50,18,0,0)');
  ctx.fillStyle = sh;
  ctx.beginPath(); ctx.arc(0, 0, rx * 0.62, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(g.ax - cx, g.ay);
  ctx.scale(1, ry / rx);
  const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  gr.addColorStop(0,    `rgba(255,200,80,${0.55 * alpha})`);
  gr.addColorStop(0.55, `rgba(255,160,40,${0.35 * alpha})`);
  gr.addColorStop(1,    'rgba(255,140,20,0)');
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
// v0.3.45：油漬出現前的小驚嘆號（震地落下 slamDown 的 0.3 秒 + 出現後 0.25 秒淡出）
function drawOrangeKingSlickWarnings(cx, t) {
  const b = orangeKingBoss;
  let xs = null, alpha = 0;
  if (b.phase === 'slamDown') {
    xs = ORANGE_KING_PUDDLE_SETS[b.puddleCursor % ORANGE_KING_PUDDLE_SETS.length];
    alpha = Math.min(1, b.phaseMs / 80);
  } else if (b.phase === 'slamLand' && b.phaseMs < 250) {
    xs = ORANGE_KING_PUDDLE_SETS[(b.puddleCursor + ORANGE_KING_PUDDLE_SETS.length - 1) % ORANGE_KING_PUDDLE_SETS.length];
    alpha = 1 - b.phaseMs / 250;
  }
  if (!xs || alpha <= 0) return;
  ctx.save();
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 4;
  xs.forEach(x => {
    const px = x + ORANGE_KING.PUDDLE_W / 2 - cx;
    const blink = 0.75 + 0.25 * Math.sin(t / 50);
    ctx.globalAlpha = alpha * blink;
    // 地面小光點
    const gr = ctx.createRadialGradient(px, GROUND_Y - 4, 0, px, GROUND_Y - 4, 34);
    gr.addColorStop(0, 'rgba(255,230,140,0.55)');
    gr.addColorStop(1, 'rgba(255,170,40,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.ellipse(px, GROUND_Y - 4, 34, 10, 0, 0, Math.PI * 2); ctx.fill();
    // 小警示三角（金色底、深色驚嘆號）
    const ty = GROUND_Y - 34;
    ctx.beginPath();
    ctx.moveTo(px, ty - 14); ctx.lineTo(px + 14, ty + 11); ctx.lineTo(px - 14, ty + 11); ctx.closePath();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(70,30,0,0.85)'; ctx.stroke();
    ctx.fillStyle = '#ffd84a'; ctx.fill();
    ctx.fillStyle = '#4a1e00';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText('!', px, ty + 9);
  });
  ctx.restore();
}
function drawOrangeKingOilSlickArt(p, cx, grow, fade) {
  const img = getOrangeKingBossImg('oilSlick');
  if (!img) return false;
  const g = getOrangeKingOilSlickGeom(p, grow);
  drawOrangeKingOilSlickGlow(p, cx, grow, fade, orangeKingBoss ? orangeKingBoss.totalMs : 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.globalAlpha = Math.max(0, Math.min(1, ORANGE_KING_MACHINE_ART.oilSlickAlpha * fade));
  ctx.drawImage(img, g.drawX - cx, g.drawY, g.drawW, g.drawH);
  // v0.3.45：油漬本身慢慢「發亮呼吸」（再疊一次 lighter），讓地面危險區更搶眼
  const br = getOrangeKingBreath((orangeKingBoss ? orangeKingBoss.totalMs : 0) + p.x * 7, 1100);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.max(0, Math.min(1, ORANGE_KING_MACHINE_ART.oilSlickGlowAlpha * (0.25 + 0.45 * br) * fade));
  ctx.drawImage(img, g.drawX - cx, g.drawY, g.drawW, g.drawH);
  ctx.restore();
  return true;
}

// 回傳 true = 已用正式圖畫好 Boss；false = 圖沒載好，呼叫端畫原本的簡易 Boss
function drawOrangeKingBossArt(cx) {
  const b = orangeKingBoss;
  let state = getOrangeKingArtState(b);
  let img = getOrangeKingBossImg(ORANGE_KING_BOSS_ART_KEYS[state]);
  if (!img && ORANGE_KING_BOSS_ART_FALLBACK[state]) { // v0.3.43：新圖沒載好 → 退回 idle
    state = ORANGE_KING_BOSS_ART_FALLBACK[state];
    img = getOrangeKingBossImg(ORANGE_KING_BOSS_ART_KEYS[state]);
  }
  if (!img) return false;
  const t = b.totalMs;
  const g = getOrangeKingBossArtGeom(state, b);
  const defeated = b.phase === 'defeated';
  // 舊演出（沒有 defeat 圖時）：縮小後閃爍消失；有 defeat 圖時保持坐地，直到結算
  if (defeated && state !== 'defeat' && b.phaseMs > 1600 && Math.floor(b.phaseMs / 90) % 2 === 0) return true;

  // 動作感（只是繪製變形，不影響判定）
  let wobbleX = 0, squashY = 1, scaleAll = 1, rot = 0, stretchX = 1, liftY = 0, jitterY = 0;
  if (b.phase === 'chargeWarn' || b.phase === 'slamPrep') wobbleX = Math.sin(t / 28) * 4;
  // v0.3.43：有 prep 圖時不再壓扁（圖本身就是蹲低動作）；退回 idle 時才用壓扁演出
  if (b.phase === 'chargeCurl' && state === 'idle') squashY = 1 - Math.min(1, b.phaseMs / (b.chargeTutorial ? ORANGE_KING_TIMING.TUTORIAL_CHARGE_CURL : ORANGE_KING_TIMING.CHARGE_CURL)) * 0.18;
  if (state === 'dashPrep2') wobbleX = Math.sin(t / 22) * 2; // 蓄力顫動
  // v0.3.45：prep_02 停在原地蓄力到臨界點 — 震幅 2px → 4px 漸強，加一點上下顫動
  if (state === 'dashPrep2' && b.phase === 'chargeSpin') {
    const dur  = b.chargeTutorial ? ORANGE_KING_TIMING.TUTORIAL_CHARGE_SPIN : ORANGE_KING_TIMING.CHARGE_SPIN;
    const p = Math.min(1, b.phaseMs / Math.max(1, dur - (b.chargeTutorial ? ORANGE_KING_DASH_BALL_LEAD_MS_TUTORIAL : ORANGE_KING_DASH_BALL_LEAD_MS)));
    const amp = 2 + 2 * p;
    wobbleX = Math.sin(t / 16) * amp;
    jitterY = Math.sin(t / 23) * 0.8 * (0.5 + 0.5 * p);
  }
  // v0.3.45：idle 呼吸（又慢又穩：3.4 秒一循環；scaleY 最多 +1.2%、scaleX 反向 −0.5%、整體上移最多 1.5px）
  if (state === 'idle' && !defeated) {
    const br = getOrangeKingBreath(t, ORANGE_KING_IDLE_BREATH.periodMs);
    squashY *= 1 + ORANGE_KING_IDLE_BREATH.scaleY * br;
    stretchX = 1 - ORANGE_KING_IDLE_BREATH.scaleX * br;
    liftY = -ORANGE_KING_IDLE_BREATH.liftPx * br;
  }
  if (b.phase === 'slamPrep')   squashY = 1 - Math.min(1, b.phaseMs / ORANGE_KING_TIMING.SLAM_PREP) * 0.12;
  if (b.phase === 'cooldown')   squashY = 1 + Math.sin(t / 160) * 0.025;
  if (state === 'dash' && b.phase === 'chargeSpin') { rot = Math.sin(t / 45) * 0.08; wobbleX = Math.sin(t / 30) * 3; }
  if (defeated && state !== 'defeat') { scaleAll = Math.max(0.45, 1 - b.phaseMs / 1600); wobbleX = Math.sin(t / 40) * 6 * scaleAll; }
  if (defeated && state === 'defeat') {
    // v0.3.44：跌坐落地的小彈跳 + 前 0.9 秒搖晃慢慢停下
    const shake = Math.max(0, 1 - b.phaseMs / 900);
    wobbleX = Math.sin(t / 40) * 5 * shake;
    if (b.phaseMs < 350) squashY = 1 - 0.08 * (1 - b.phaseMs / 350);
  }

  // v0.3.62：勝利淡出 — drawOne 原本直接設 ctx.globalAlpha = alpha，會蓋掉外層的淡出透明度 → 改成相乘
  const victoryFade = (typeof getOrangeKingVictoryFade === 'function') ? getOrangeKingVictoryFade() : 1;
  if (victoryFade <= 0) return true; // 完全淡出：不再畫本體（確認視窗後也不會再出現）
  const drawOne = (dx, alpha, comp) => {
    ctx.save();
    ctx.globalAlpha = alpha * victoryFade;
    if (comp) ctx.globalCompositeOperation = comp;
    ctx.translate(g.ax - cx + wobbleX + dx, g.ay + liftY + jitterY);
    if (rot) ctx.rotate(rot);
    ctx.scale(scaleAll * stretchX, scaleAll * squashY);
    ctx.drawImage(img, g.drawX - g.ax, g.drawY - g.ay, g.drawW, g.drawH);
    ctx.restore();
  };
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  // 衝撞殘影（往右拖）
  if (b.phase === 'chargeDash' && state === 'dash') { drawOne(46, 0.16); drawOne(24, 0.28); }
  drawOne(0, 1);
  // 受傷閃白
  if (b.hurtFlashMs > 0 && Math.floor(b.hurtFlashMs / 60) % 2 === 0) drawOne(0, 0.55, 'lighter');
  ctx.restore();

  const sph = g.sphere;
  const scx = sph.x + sph.w / 2 - cx + wobbleX, scy = g.ay - (g.ay - (sph.y + sph.h / 2)) * squashY * scaleAll;
  const topY = g.ay - (g.ay - g.opaque.y) * squashY * scaleAll;
  ctx.save();
  // 金色油管環（掉落前）：身上的金色腰帶發光
  if (b.ring && b.ring.state === 'onBoss' && g.beltY != null && !defeated) {
    const by = g.ay - (g.ay - g.beltY) * squashY;
    const pulse = 0.55 + 0.35 * Math.sin(t / 140);
    ctx.strokeStyle = `rgba(255,220,80,${pulse})`;
    ctx.lineWidth = 6;
    ctx.shadowColor = 'rgba(255,220,80,0.9)';
    ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.ellipse(scx, by, sph.w * 0.52, sph.h * 0.1, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
  }
  // 拋物線油彈瞄準：背後油管管口發亮
  if (b.phase === 'lobAim' && state === 'idle') {
    const lo = getOrangeKingLobOrigin();
    const pulse = 0.5 + 0.5 * Math.sin(t / 45);
    const gr = ctx.createRadialGradient(lo.x - cx, lo.y, 2, lo.x - cx, lo.y, 32);
    gr.addColorStop(0, 'rgba(255,255,200,0.95)');
    gr.addColorStop(0.45, `rgba(255,210,70,${0.5 + 0.4 * pulse})`);
    gr.addColorStop(1, 'rgba(255,170,30,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(lo.x - cx, lo.y, 32, 0, Math.PI * 2); ctx.fill();
  }
  // 衝撞 / 震地預警「！」
  if (b.phase === 'chargeWarn' || b.phase === 'slamPrep') {
    ctx.fillStyle = Math.floor(b.phaseMs / 120) % 2 ? '#ff4d4d' : '#ffe066';
    ctx.strokeStyle = 'rgba(60,20,0,0.85)';
    ctx.lineWidth = 5;
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeText('！', scx, topY - 8);
    ctx.fillText('！', scx, topY - 8);
  }
  // 喘氣：可攻擊提示框 + 文字
  if (b.phase === 'cooldown') {
    // v0.3.43：白色虛線「呼吸閃爍」— 1.2 秒一循環，透明度 0.55~0.9（平均約 0.75）＋虛線緩慢流動
    const breath = getOrangeKingCooldownBreath(t);
    ctx.save();
    ctx.shadowColor = `rgba(255,235,190,${0.35 + 0.35 * breath})`;
    ctx.shadowBlur = 6 + 6 * breath;
    ctx.strokeStyle = b.ringActive ? `rgba(255,255,255,${0.55 + 0.35 * breath})` : `rgba(255,255,255,${0.25 + 0.2 * breath})`;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.setLineDash([12, 9]);
    ctx.lineDashOffset = -t / 45;
    ctx.beginPath(); ctx.ellipse(scx, scy, sph.w / 2 + 14, sph.h / 2 + 14, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    const txt = b.ringActive ? '💦 喘氣中！快攻擊！' : '💦 喘氣中';
    ctx.strokeText(txt, scx, topY - 6);
    ctx.fillStyle = b.ringActive ? `rgba(255,240,180,${0.82 + 0.15 * breath})` : 'rgba(255,255,255,0.75)'; // 文字輕微呼吸（不影響閱讀）
    ctx.fillText(txt, scx, topY - 6);
  }
  ctx.restore();
  return true;
}

// v0.3.39：平台美術繪製矩形（kind = 'high' | 'mid'）— 高平台只用 high 圖、中平台只用 mid 圖
function getOrangeKingPlatformArtGeom(kind) {
  const A = ORANGE_KING_MACHINE_ART, S = ORANGE_KING_PLATFORM_SRC[kind];
  const isHigh = kind === 'high';
  const x = isHigh ? A.platformHighX : A.platformMidX;
  const y = isHigh ? A.platformHighY : A.platformMidY;
  const sx = isHigh ? A.platformHighScaleX : A.platformMidScaleX;
  const sy = isHigh ? A.platformHighScaleY : A.platformMidScaleY;
  return {
    drawX: x - S.opaqueX * sx, drawY: y - S.opaqueY * sy, drawW: S.w * sx, drawH: S.h * sy,
    artX: x, artY: y, artW: S.opaqueW * sx, artH: S.opaqueH * sy,
  };
}
// 回傳 true = 已畫正式平台圖；false = 圖還沒載好 / 失敗，呼叫端改畫原本色塊
function drawOrangeKingPlatformArt(p, cx) {
  if (!p.artKey || !isOrangeKingStageActive()) return false;
  const img = getOrangeKingBossImg(p.artKey === 'high' ? 'platformHigh' : 'platformMid');
  if (!img) return false;
  const g = getOrangeKingPlatformArtGeom(p.artKey);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, g.drawX - cx, g.drawY, g.drawW, g.drawH);
  ctx.restore();
  return true;
}

// v0.3.37：水平噴油圖的繪製矩形（世界座標）— 錨點 = 原圖噴口對齊油管管口
function getOrangeKingOilStreamGeom(laneKey) {
  const A = ORANGE_KING_MACHINE_ART, S = ORANGE_KING_OIL_STREAM_SRC;
  const pg = getOrangeKingPipeGeom(laneKey);
  const anchorX = pg.mouthX + A.oilStreamOffsetX;
  const anchorY = pg.y + A.oilStreamOffsetY;
  const drawW = S.w * A.oilStreamScaleX, drawH = S.h * A.oilStreamScaleY;
  const drawX = anchorX - S.anchorX * A.oilStreamScaleX;
  const drawY = anchorY - S.anchorY * A.oilStreamScaleY;
  return { anchorX, anchorY, drawX, drawY, drawW, drawH, tipX: drawX + S.opaqueX * A.oilStreamScaleX, mouthX: pg.mouthX, mouthY: pg.y };
}
// v0.3.37：畫正式水平噴油圖；grow 0→1 = 從噴口往左長出來。圖片沒載好回傳 false（呼叫端改畫 canvas 油流）
function drawOrangeKingOilStreamArt(laneKey, cx, grow, alpha, t) {
  const img = getOrangeKingBossImg('oilStreamHorizontal');
  if (!img) return false;
  const g = getOrangeKingOilStreamGeom(laneKey);
  const wobble = 1 + Math.sin(t / 55) * 0.04; // 油柱輕微脈動
  const h = g.drawH * wobble;
  const y = g.anchorY - (g.anchorY - g.drawY) * wobble;
  ctx.save();
  ctx.globalAlpha = alpha;
  // 從噴口往左裁切，做出「噴出去」的感覺
  const visibleLeft = g.anchorX - (g.anchorX - g.tipX) * grow;
  ctx.beginPath();
  ctx.rect(visibleLeft - cx, y - 4, g.drawX + g.drawW - visibleLeft + 4, h + 8);
  ctx.clip();
  ctx.drawImage(img, g.drawX - cx, y, g.drawW, h);
  ctx.restore();
  return true;
}

function getOrangeKingMachineGeom() {
  const A = ORANGE_KING_MACHINE_ART, M = ORANGE_KING_MACHINE_SRC, s = A.baseScale;
  return {
    drawX: A.baseX, drawY: A.baseY, drawW: M.w * s, drawH: M.h * s,
    vPipeX: A.baseX + M.vPipeX * s, vPipeTop: A.baseY + M.vPipeTopY * s, vPipeBottom: A.baseY + M.vPipeBottomY * s,
  };
}

// 主裝置 + 三根油管（畫在 Boss 後面）
function drawOrangeKingMachine(cx) {
  const b = orangeKingBoss;
  const t = b ? b.totalMs : 0;
  const mg = getOrangeKingMachineGeom();
  const baseImg = getOrangeKingBossImg('machineBase');
  ctx.save();
  if (baseImg) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(baseImg, mg.drawX - cx, mg.drawY, mg.drawW, mg.drawH);
  } else {
    // fallback：簡單機台 + 垂直主管
    ctx.fillStyle = '#3d3d44';
    ctx.fillRect(mg.vPipeX - 10 - cx, mg.vPipeTop, 20, mg.vPipeBottom - mg.vPipeTop);
    ctx.fillStyle = '#55555e';
    ctx.fillRect(mg.vPipeX + 14 - cx, mg.drawY + mg.drawH * 0.2, mg.drawW * 0.5, mg.drawH * 0.75);
    ctx.fillStyle = 'rgba(255,160,30,0.75)';
    ctx.fillRect(mg.vPipeX + 34 - cx, mg.drawY + mg.drawH * 0.3, mg.drawW * 0.3, mg.drawH * 0.4);
  }
  const pipeImg = getOrangeKingBossImg('oilPipeHorizontal');
  const sprayLane = b && (b.phase === 'sprayWarn' || b.phase === 'sprayFire') ? b.activeLane : null;
  const calibLane = orangeKingMachineCalibMode ? ['high', 'mid', 'low'][['pipeHigh', 'pipeMid', 'pipeLow'].indexOf(orangeKingMachineCalibTarget)] : null;
  ['high', 'mid', 'low'].forEach(key => {
    const pg = getOrangeKingPipeGeom(key);
    const warn = sprayLane === key;
    // 預警光效：管身外圈 glow（略閃爍），管口亮光
    if (warn) {
      const pulse = 0.55 + 0.45 * Math.sin(t / 60);
      ctx.save();
      ctx.shadowColor = `rgba(255,230,90,${0.9 * pulse})`;
      ctx.shadowBlur = 26;
      ctx.fillStyle = `rgba(255,220,80,${0.28 * pulse})`;
      ctx.beginPath();
      ctx.roundRect(pg.opaqueX - 6 - cx, pg.opaqueY - 4, pg.opaqueW + 12, pg.opaqueH + 8, 16);
      ctx.fill();
      ctx.restore();
    }
    if (pipeImg) {
      ctx.drawImage(pipeImg, pg.drawX - cx, pg.drawY, pg.drawW, pg.drawH);
    } else {
      // fallback：簡單管子
      ctx.fillStyle = '#c98a1a';
      ctx.fillRect(pg.mouthX - cx, pg.y - 9, pg.joinX - pg.mouthX, 18);
      ctx.fillStyle = '#4b4b52';
      ctx.fillRect(pg.mouthX - 4 - cx, pg.y - 13, 16, 26);
    }
    if (warn) {
      const pulse = 0.5 + 0.5 * Math.sin(t / 45);
      const g = ctx.createRadialGradient(pg.mouthX - cx, pg.y, 2, pg.mouthX - cx, pg.y, 34);
      g.addColorStop(0, `rgba(255,255,200,${0.95})`);
      g.addColorStop(0.4, `rgba(255,210,70,${0.55 + 0.4 * pulse})`);
      g.addColorStop(1, 'rgba(255,170,30,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(pg.mouthX - cx, pg.y, 34, 0, Math.PI * 2); ctx.fill();
    } else if (calibLane === key) {
      ctx.strokeStyle = 'rgba(0,255,200,0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(pg.opaqueX - cx, pg.opaqueY, pg.opaqueW, pg.opaqueH);
    }
  });
  ctx.restore();
}

// ── 定位工具（測試版 F4）──────────────────────────────
// v0.3.45：每一版專屬 key（再加上版本檢查），不會吃到舊版定位暫存
const ORANGE_KING_MACHINE_CALIB_LS_KEY = 'balloonV_orangeKingMachineArtCalib__' + GAME_VERSION;
const ORANGE_KING_MACHINE_CALIB_TARGETS = [
  { key: 'base',    label: '1 Machine Base（方向鍵 X/Y、[ ] scale）' },
  { key: 'pipe',    label: '2 Pipe 共用（← → pipeX、[ ] pipeScale）' },
  { key: 'pipeHigh', label: '3 High Pipe Y（↑ ↓）' },
  { key: 'pipeMid',  label: '4 Mid Pipe Y（↑ ↓）' },
  { key: 'pipeLow',  label: '5 Low Pipe Y（↑ ↓）' },
  { key: 'oil',     label: '6 Oil hitbox（↑ ↓ 高度、← → 往右延伸）' },
  { key: 'oilStream', label: '7 水平噴油特效圖（方向鍵 X/Y、[ ] 寬度、; \' 高度）' },
  { key: 'platHigh', label: '8 高平台美術（方向鍵 X/Y、[ ] scaleX、; \' scaleY）' },
  { key: 'platMid',  label: '9 中平台美術（方向鍵 X/Y、[ ] scaleX、; \' scaleY）' },
  { key: 'bossIdle',     label: '0 Boss idle 圖（方向鍵 X/Y、[ ] scale）' },
  { key: 'bossCooldown', label: '- Boss cooldown 圖（方向鍵 X/Y、[ ] scale）' },
  { key: 'bossDash',     label: '= Boss dash_ball 圖（方向鍵 X/Y、[ ] scale）' },
  { key: 'bossDashCooldown', label: '\\ Boss 撞牆暈眩圖（cooldown 小尺寸；方向鍵 X/Y、[ ] scale）' },
  { key: 'bossDashWarn',  label: ', Boss dash_warn_01（方向鍵 X/Y、[ ] scale）' },
  { key: 'bossDashPrep1', label: '. Boss dash_prep_01（方向鍵 X/Y、[ ] scale）' },
  { key: 'bossDashPrep2', label: '/ Boss dash_prep_02（方向鍵 X/Y、[ ] scale）' },
  { key: 'oilShot',    label: 'O 拋物線油彈圖（方向鍵 X/Y、[ ] scale、; \' 旋轉校正；T 換路線）' },
  { key: 'arcOrigin',  label: 'Y 油彈發射起點（方向鍵 X/Y；T 換路線）' },
  { key: 'arcHitbox',  label: 'U 油彈碰撞圓（方向鍵 中心 X/Y、[ ] 半徑；T 換路線）' },
  { key: 'oilSlick',   label: 'L 地面油漬圖（方向鍵 X/Y、[ ] scaleX、; \' scaleY、Q E 透明度、N M 底光亮度、V B 底光大小）' },
  { key: 'goldenRing', label: 'G 金色油管環（方向鍵 X/Y、[ ] scale、Q E 透明度）' },
  { key: 'royal1', label: 'A 王權劍 attack_01（方向鍵 X/Y、[ ] scale；X 切換 對照 / 只看王權劍 / 只看原圖）' },
  { key: 'royal2', label: 'S 王權劍 attack_02（方向鍵 X/Y、[ ] scale；X 切換 對照 / 只看王權劍 / 只看原圖）' },
  { key: 'royal3', label: 'D 王權劍 attack_03（方向鍵 X/Y、[ ] scale；X 切換 對照 / 只看王權劍 / 只看原圖）' },
  { key: 'royal4', label: 'F 王權劍 attack_04（方向鍵 X/Y、[ ] scale；X 切換 對照 / 只看王權劍 / 只看原圖）' },
  { key: 'bossDefeat', label: 'K Boss defeat 擊敗圖（方向鍵 X/Y、[ ] scale）' },
];
var orangeKingMachineCalibMode   = false;
var orangeKingRoyalPreviewMode   = 0; // v0.3.46：0 = 王權劍＋原圖半透明對照、1 = 只看王權劍、2 = 只看原圖
var orangeKingOilShotCalibRoute  = 0; // v0.3.44：F4 油彈預覽用的路線（再按一次 O 切換）
var orangeKingMachineCalibTarget = 'base';

// 只讀取同版本存下來的定位值（版本不同就用程式內的預設值）
function loadOrangeKingMachineCalib() {
  try {
    const raw = localStorage.getItem(ORANGE_KING_MACHINE_CALIB_LS_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data || data.version !== GAME_VERSION || !data.values) return;
    Object.keys(ORANGE_KING_MACHINE_ART_DEFAULTS).forEach(k => {
      if (typeof data.values[k] === 'number' && isFinite(data.values[k])) ORANGE_KING_MACHINE_ART[k] = data.values[k];
    });
  } catch (e) {}
}
function saveOrangeKingMachineCalib() {
  try {
    localStorage.setItem(ORANGE_KING_MACHINE_CALIB_LS_KEY,
      JSON.stringify({ version: GAME_VERSION, values: ORANGE_KING_MACHINE_ART }));
  } catch (e) {}
}
if (typeof ADVENTURE_TEST_TOOLS_ENABLED !== 'undefined' && ADVENTURE_TEST_TOOLS_ENABLED) loadOrangeKingMachineCalib();

function getOrangeKingMachineCalibText() {
  const A = ORANGE_KING_MACHINE_ART;
  const r2 = v => Math.round(v * 100) / 100;
  return 'const ORANGE_KING_MACHINE_ART = {\n'
    + `  baseX: ${r2(A.baseX)},\n  baseY: ${r2(A.baseY)},\n  baseScale: ${r2(A.baseScale)},\n`
    + `  pipeX: ${r2(A.pipeX)},\n  pipeScale: ${r2(A.pipeScale)},\n`
    + `  pipeHighY: ${r2(A.pipeHighY)},\n  pipeMidY: ${r2(A.pipeMidY)},\n  pipeLowY: ${r2(A.pipeLowY)},\n`
    + `  oilBandH: ${r2(A.oilBandH)},\n  oilExtendX: ${r2(A.oilExtendX)},\n`
    + `  oilStreamOffsetX: ${r2(A.oilStreamOffsetX)},\n  oilStreamOffsetY: ${r2(A.oilStreamOffsetY)},\n`
    + `  oilStreamScaleX: ${r2(A.oilStreamScaleX)},\n  oilStreamScaleY: ${r2(A.oilStreamScaleY)},\n`
    + `  platformHighX: ${r2(A.platformHighX)},\n  platformHighY: ${r2(A.platformHighY)},\n`
    + `  platformHighScaleX: ${r2(A.platformHighScaleX)},\n  platformHighScaleY: ${r2(A.platformHighScaleY)},\n`
    + `  platformMidX: ${r2(A.platformMidX)},\n  platformMidY: ${r2(A.platformMidY)},\n`
    + `  platformMidScaleX: ${r2(A.platformMidScaleX)},\n  platformMidScaleY: ${r2(A.platformMidScaleY)},\n`
    + `  bossIdleOffsetX: ${r2(A.bossIdleOffsetX)}, bossIdleOffsetY: ${r2(A.bossIdleOffsetY)}, bossIdleScale: ${r2(A.bossIdleScale)},\n`
    + `  bossCooldownOffsetX: ${r2(A.bossCooldownOffsetX)}, bossCooldownOffsetY: ${r2(A.bossCooldownOffsetY)}, bossCooldownScale: ${r2(A.bossCooldownScale)},\n`
    + `  bossDashOffsetX: ${r2(A.bossDashOffsetX)}, bossDashOffsetY: ${r2(A.bossDashOffsetY)}, bossDashScale: ${r2(A.bossDashScale)},\n`
    + `  bossDashCooldownOffsetX: ${r2(A.bossDashCooldownOffsetX)}, bossDashCooldownOffsetY: ${r2(A.bossDashCooldownOffsetY)}, bossDashCooldownScale: ${r2(A.bossDashCooldownScale)},\n`
    + `  bossDashWarnOffsetX: ${r2(A.bossDashWarnOffsetX)}, bossDashWarnOffsetY: ${r2(A.bossDashWarnOffsetY)}, bossDashWarnScale: ${r2(A.bossDashWarnScale)},\n`
    + `  bossDashPrep1OffsetX: ${r2(A.bossDashPrep1OffsetX)}, bossDashPrep1OffsetY: ${r2(A.bossDashPrep1OffsetY)}, bossDashPrep1Scale: ${r2(A.bossDashPrep1Scale)},\n`
    + `  bossDashPrep2OffsetX: ${r2(A.bossDashPrep2OffsetX)}, bossDashPrep2OffsetY: ${r2(A.bossDashPrep2OffsetY)}, bossDashPrep2Scale: ${r2(A.bossDashPrep2Scale)},\n`
    + `  oilShotOffsetX: ${r2(A.oilShotOffsetX)}, oilShotOffsetY: ${r2(A.oilShotOffsetY)}, oilShotScale: ${Math.round(A.oilShotScale * 1000) / 1000},\n`
    + `  oilSlickOffsetX: ${r2(A.oilSlickOffsetX)}, oilSlickOffsetY: ${r2(A.oilSlickOffsetY)}, oilSlickScaleX: ${r2(A.oilSlickScaleX)}, oilSlickScaleY: ${r2(A.oilSlickScaleY)}, oilSlickAlpha: ${r2(A.oilSlickAlpha)},\n`
    + `  bossDefeatOffsetX: ${r2(A.bossDefeatOffsetX)}, bossDefeatOffsetY: ${r2(A.bossDefeatOffsetY)}, bossDefeatScale: ${r2(A.bossDefeatScale)},\n`
    + `  oilShotRotationOffset: ${r2(A.oilShotRotationOffset)},\n`
    + `  arcShotOriginOffsetX: ${r2(A.arcShotOriginOffsetX)}, arcShotOriginOffsetY: ${r2(A.arcShotOriginOffsetY)},\n`
    + `  arcShotHitboxOffsetX: ${r2(A.arcShotHitboxOffsetX)}, arcShotHitboxOffsetY: ${r2(A.arcShotHitboxOffsetY)}, arcShotHitboxRadius: ${r2(A.arcShotHitboxRadius)},\n`
    + `  oilSlickGlowAlpha: ${r2(A.oilSlickGlowAlpha)}, oilSlickGlowScale: ${r2(A.oilSlickGlowScale)},\n`
    + `  goldenRingOffsetX: ${r2(A.goldenRingOffsetX)}, goldenRingOffsetY: ${r2(A.goldenRingOffsetY)}, goldenRingScale: ${Math.round(A.goldenRingScale * 1000) / 1000}, goldenRingAlpha: ${r2(A.goldenRingAlpha)},\n`
    + [1, 2, 3, 4].map(n => `  royalSwordAttack${n}OffsetX: ${r2(A['royalSwordAttack' + n + 'OffsetX'])}, royalSwordAttack${n}OffsetY: ${r2(A['royalSwordAttack' + n + 'OffsetY'])}, royalSwordAttack${n}Scale: ${r2(A['royalSwordAttack' + n + 'Scale'])},\n`).join('')
    + '};';
}
function resetOrangeKingMachineCalibTarget() {
  const D = ORANGE_KING_MACHINE_ART_DEFAULTS, A = ORANGE_KING_MACHINE_ART;
  const keysByTarget = {
    base: ['baseX', 'baseY', 'baseScale'], pipe: ['pipeX', 'pipeScale'],
    pipeHigh: ['pipeHighY'], pipeMid: ['pipeMidY'], pipeLow: ['pipeLowY'], oil: ['oilBandH', 'oilExtendX'],
    oilStream: ['oilStreamOffsetX', 'oilStreamOffsetY', 'oilStreamScaleX', 'oilStreamScaleY'],
    platHigh: ['platformHighX', 'platformHighY', 'platformHighScaleX', 'platformHighScaleY'],
    platMid:  ['platformMidX', 'platformMidY', 'platformMidScaleX', 'platformMidScaleY'],
    bossIdle:     ['bossIdleOffsetX', 'bossIdleOffsetY', 'bossIdleScale'],
    bossCooldown: ['bossCooldownOffsetX', 'bossCooldownOffsetY', 'bossCooldownScale'],
    bossDash:     ['bossDashOffsetX', 'bossDashOffsetY', 'bossDashScale'],
    bossDashCooldown: ['bossDashCooldownOffsetX', 'bossDashCooldownOffsetY', 'bossDashCooldownScale'],
    bossDashWarn:  ['bossDashWarnOffsetX', 'bossDashWarnOffsetY', 'bossDashWarnScale'],
    bossDashPrep1: ['bossDashPrep1OffsetX', 'bossDashPrep1OffsetY', 'bossDashPrep1Scale'],
    bossDashPrep2: ['bossDashPrep2OffsetX', 'bossDashPrep2OffsetY', 'bossDashPrep2Scale'],
    oilShot:    ['oilShotOffsetX', 'oilShotOffsetY', 'oilShotScale', 'oilShotRotationOffset'],
    arcOrigin:  ['arcShotOriginOffsetX', 'arcShotOriginOffsetY'],
    arcHitbox:  ['arcShotHitboxOffsetX', 'arcShotHitboxOffsetY', 'arcShotHitboxRadius'],
    oilSlick:   ['oilSlickOffsetX', 'oilSlickOffsetY', 'oilSlickScaleX', 'oilSlickScaleY', 'oilSlickAlpha', 'oilSlickGlowAlpha', 'oilSlickGlowScale'],
    goldenRing: ['goldenRingOffsetX', 'goldenRingOffsetY', 'goldenRingScale', 'goldenRingAlpha'],
    royal1: ['royalSwordAttack1OffsetX', 'royalSwordAttack1OffsetY', 'royalSwordAttack1Scale'],
    royal2: ['royalSwordAttack2OffsetX', 'royalSwordAttack2OffsetY', 'royalSwordAttack2Scale'],
    royal3: ['royalSwordAttack3OffsetX', 'royalSwordAttack3OffsetY', 'royalSwordAttack3Scale'],
    royal4: ['royalSwordAttack4OffsetX', 'royalSwordAttack4OffsetY', 'royalSwordAttack4Scale'],
    bossDefeat: ['bossDefeatOffsetX', 'bossDefeatOffsetY', 'bossDefeatScale'],
  };
  (keysByTarget[orangeKingMachineCalibTarget] || []).forEach(k => { A[k] = D[k]; });
  saveOrangeKingMachineCalib();
  showHint('↺ 已重置：' + orangeKingMachineCalibTarget, 120);
}

// 回傳 true = 這個按鍵已被定位工具處理（不要再傳給遊戲）
function handleOrangeKingMachineCalibKey(e) {
  if (!ADVENTURE_TEST_TOOLS_ENABLED) return false;
  if (e.code === 'F4') {
    orangeKingMachineCalibMode = !orangeKingMachineCalibMode;
    if (orangeKingMachineCalibMode) {
      try { const _d = advLoad(); if (_d.active && advAttempt && !advAttempt.ended) { advTaint(_d.active, 'F4-calibration'); advSave(_d); } } catch (e) {} // v0.3.63：關卡中開定位工具 → 測試紀錄
      // 與其他定位工具互斥
      chimneyOilCalibrationMode = false;
      dualOilCalibrationMode = false;
      projectileOilShotCalibrationMode = false;
      for (const k in keys) keys[k] = false;
    }
    showHint(orangeKingMachineCalibMode
      ? (isChapter2ParallaxStage() ? '🎯 第二章背景調整 ON（F4 關閉）' : isChapter1ParallaxStage() ? '🎯 第一章背景調整 ON（F4 關閉）' : '🎯 Orange King Machine Calibration ON（F4 關閉）' + (isOrangeKingStageActive() ? '' : '　請用 暫停→🍊 測試 2-4 橘子王 進入'))
      : '🎯 Orange King Machine Calibration OFF', 200);
    e.preventDefault();
    return true;
  }
  if (!orangeKingMachineCalibMode) return false;
  if (isChapter2ParallaxStage()) return handleChapter2BgCalibKey(e); // v0.3.47：2-1～2-3 → 第二章背景調整
  if (isChapter1ParallaxStage()) return handleChapter1BgCalibKey(e); // v0.3.52：1-1～1-3 → 第一章背景調整
  const A = ORANGE_KING_MACHINE_ART;
  const tg = orangeKingMachineCalibTarget;
  const step = e.shiftKey ? 10 : 1;
  const sStep = e.shiftKey ? 0.05 : 0.01;
  const digit = { Digit1: 'base', Digit2: 'pipe', Digit3: 'pipeHigh', Digit4: 'pipeMid', Digit5: 'pipeLow', Digit6: 'oil', Digit7: 'oilStream', Digit8: 'platHigh', Digit9: 'platMid',
                  Digit0: 'bossIdle', Minus: 'bossCooldown', Equal: 'bossDash', Backslash: 'bossDashCooldown',
                  Comma: 'bossDashWarn', Period: 'bossDashPrep1', Slash: 'bossDashPrep2',
                  KeyO: 'oilShot', KeyL: 'oilSlick', KeyK: 'bossDefeat', KeyY: 'arcOrigin', KeyU: 'arcHitbox', KeyG: 'goldenRing',
                  KeyA: 'royal1', KeyS: 'royal2', KeyD: 'royal3', KeyF: 'royal4' }[e.code];
  // v0.3.46：X = 王權劍預覽切換（對照 / 只看王權劍 / 只看原圖）
  if (e.code === 'KeyX') { orangeKingRoyalPreviewMode = (orangeKingRoyalPreviewMode + 1) % 3; e.preventDefault(); return true; }
  // v0.3.45：T = 換預覽的拋物線路線（O / Y / U 都能用）
  if (e.code === 'KeyT') { orangeKingOilShotCalibRoute = (orangeKingOilShotCalibRoute + 1) % ORANGE_KING_LOB_ROUTES.length; e.preventDefault(); return true; }
  if (digit) {
    // v0.3.44：O 已選中時再按 O → 切換預覽的拋物線路線（4 條輪流）
    if (digit === 'oilShot' && tg === 'oilShot') orangeKingOilShotCalibRoute = (orangeKingOilShotCalibRoute + 1) % ORANGE_KING_LOB_ROUTES.length;
    orangeKingMachineCalibTarget = digit; e.preventDefault(); return true;
  }
  let changed = false;
  const dx = e.code === 'ArrowLeft' ? -step : (e.code === 'ArrowRight' ? step : 0);
  const dy = e.code === 'ArrowUp' ? -step : (e.code === 'ArrowDown' ? step : 0);
  const ds = e.code === 'BracketLeft' ? -sStep : (e.code === 'BracketRight' ? sStep : 0);
  const dsy = e.code === 'Semicolon' ? -sStep : (e.code === 'Quote' ? sStep : 0); // v0.3.37：; ' 調 Y scale
  // v0.3.46：王權劍 4 張（方向鍵 X/Y、[ ] scale；X 方向 = 角色面向的方向）
  const rm = /^royal([1-4])$/.exec(tg);
  if (rm && (dx || dy || ds)) {
    const pre = 'royalSwordAttack' + rm[1];
    A[pre + 'OffsetX'] += dx; A[pre + 'OffsetY'] += dy;
    A[pre + 'Scale'] = Math.max(0.2, Math.round((A[pre + 'Scale'] + ds) * 100) / 100);
    saveOrangeKingMachineCalib(); e.preventDefault(); return true;
  }
  // v0.3.45：發射起點 / 碰撞圓
  if (tg === 'arcOrigin' && (dx || dy)) {
    A.arcShotOriginOffsetX += dx; A.arcShotOriginOffsetY += dy;
    saveOrangeKingMachineCalib(); e.preventDefault(); return true;
  }
  if (tg === 'arcHitbox' && (dx || dy || ds)) {
    A.arcShotHitboxOffsetX += dx; A.arcShotHitboxOffsetY += dy;
    if (ds) A.arcShotHitboxRadius = Math.max(4, Math.min(60, A.arcShotHitboxRadius + (ds > 0 ? 1 : -1) * (e.shiftKey ? 5 : 1)));
    saveOrangeKingMachineCalib(); e.preventDefault(); return true;
  }
  if (tg === 'goldenRing' && (dx || dy || ds || e.code === 'KeyQ' || e.code === 'KeyE')) {
    A.goldenRingOffsetX += dx; A.goldenRingOffsetY += dy;
    if (ds) A.goldenRingScale = Math.max(0.03, Math.round((A.goldenRingScale + (ds > 0 ? 1 : -1) * (e.shiftKey ? 0.02 : 0.005)) * 1000) / 1000);
    if (e.code === 'KeyQ' || e.code === 'KeyE') A.goldenRingAlpha = Math.max(0.1, Math.min(1, Math.round((A.goldenRingAlpha + (e.code === 'KeyQ' ? -0.05 : 0.05)) * 100) / 100));
    saveOrangeKingMachineCalib(); e.preventDefault(); return true;
  }
  // v0.3.44：拋物線油彈（scale 很小，用較細的步進 0.005 / Shift 0.02）；v0.3.45：; ' 旋轉校正（1° / Shift 5°）
  if (tg === 'oilShot' && (dx || dy || ds || dsy)) {
    A.oilShotOffsetX += dx;
    A.oilShotOffsetY += dy;
    if (dsy) A.oilShotRotationOffset += (dsy > 0 ? 1 : -1) * (e.shiftKey ? 5 : 1);
    if (ds) A.oilShotScale = Math.max(0.02, Math.round((A.oilShotScale + (ds > 0 ? 1 : -1) * (e.shiftKey ? 0.02 : 0.005)) * 1000) / 1000);
    saveOrangeKingMachineCalib(); e.preventDefault(); return true;
  }
  // v0.3.44：地面油漬（scaleX / scaleY 分開；Q E 透明度）
  const da = e.code === 'KeyQ' ? -0.05 : (e.code === 'KeyE' ? 0.05 : 0);
  const dga = e.code === 'KeyN' ? -0.05 : (e.code === 'KeyM' ? 0.05 : 0);
  const dgs = e.code === 'KeyV' ? -0.05 : (e.code === 'KeyB' ? 0.05 : 0);
  if (tg === 'oilSlick' && (dga || dgs)) {
    A.oilSlickGlowAlpha = Math.max(0, Math.min(1, Math.round((A.oilSlickGlowAlpha + dga) * 100) / 100));
    A.oilSlickGlowScale = Math.max(0.5, Math.min(3, Math.round((A.oilSlickGlowScale + dgs) * 100) / 100));
    saveOrangeKingMachineCalib(); e.preventDefault(); return true;
  }
  if (tg === 'oilSlick' && (dx || dy || ds || dsy || da)) {
    A.oilSlickOffsetX += dx;
    A.oilSlickOffsetY += dy;
    A.oilSlickScaleX = Math.max(0.1, Math.round((A.oilSlickScaleX + ds) * 100) / 100);
    A.oilSlickScaleY = Math.max(0.1, Math.round((A.oilSlickScaleY + dsy) * 100) / 100);
    A.oilSlickAlpha  = Math.max(0.1, Math.min(1, Math.round((A.oilSlickAlpha + da) * 100) / 100));
    saveOrangeKingMachineCalib(); e.preventDefault(); return true;
  }
  if (/^boss/.test(tg) && (dx || dy || ds)) {
    A[tg + 'OffsetX'] += dx;
    A[tg + 'OffsetY'] += dy;
    A[tg + 'Scale'] = Math.max(0.05, Math.round((A[tg + 'Scale'] + ds) * 100) / 100);
    saveOrangeKingMachineCalib(); e.preventDefault(); return true;
  }
  if ((tg === 'platHigh' || tg === 'platMid') && (dx || dy || ds || dsy)) {
    const pre = tg === 'platHigh' ? 'platformHigh' : 'platformMid';
    A[pre + 'X'] += dx;
    A[pre + 'Y'] += dy;
    A[pre + 'ScaleX'] = Math.max(0.05, Math.round((A[pre + 'ScaleX'] + ds) * 100) / 100);
    A[pre + 'ScaleY'] = Math.max(0.05, Math.round((A[pre + 'ScaleY'] + dsy) * 100) / 100);
    saveOrangeKingMachineCalib(); e.preventDefault(); return true;
  }
  if (tg === 'oilStream' && (dx || dy || ds || dsy)) {
    A.oilStreamOffsetX += dx;
    A.oilStreamOffsetY += dy;
    A.oilStreamScaleX = Math.max(0.05, Math.round((A.oilStreamScaleX + ds) * 100) / 100);
    A.oilStreamScaleY = Math.max(0.05, Math.round((A.oilStreamScaleY + dsy) * 100) / 100);
    saveOrangeKingMachineCalib(); e.preventDefault(); return true;
  }
  if (dx || dy || ds) {
    if (tg === 'base')      { A.baseX += dx; A.baseY += dy; A.baseScale = Math.max(0.1, Math.round((A.baseScale + ds) * 100) / 100); }
    else if (tg === 'pipe') { A.pipeX += dx; A.pipeScale = Math.max(0.1, Math.round((A.pipeScale + ds) * 100) / 100); }
    else if (tg === 'pipeHigh') A.pipeHighY += dy;
    else if (tg === 'pipeMid')  A.pipeMidY  += dy;
    else if (tg === 'pipeLow')  A.pipeLowY  += dy;
    else if (tg === 'oil')  { A.oilBandH = Math.max(6, A.oilBandH - dy); A.oilExtendX = Math.max(0, A.oilExtendX + dx); }
    changed = true;
  }
  if (e.code === 'KeyR') { resetOrangeKingMachineCalibTarget(); e.preventDefault(); return true; }
  if (e.code === 'KeyC') {
    const text = getOrangeKingMachineCalibText();
    console.log('[OrangeKingMachineCalib]\n' + text);
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(() => {}); } catch (err) {}
    showHint('📋 定位數值已輸出到 console（也嘗試複製到剪貼簿）', 180);
    e.preventDefault();
    return true;
  }
  if (changed) { saveOrangeKingMachineCalib(); e.preventDefault(); return true; }
  // 定位模式開啟時，方向鍵 / 數字鍵 / [ ] 都不傳給遊戲
  if (/^(Arrow|Digit|Bracket)/.test(e.code) || ['Semicolon', 'Quote', 'Minus', 'Equal', 'Backslash', 'Comma', 'Period', 'Slash', 'KeyO', 'KeyL', 'KeyK', 'KeyQ', 'KeyE', 'KeyY', 'KeyU', 'KeyG', 'KeyT', 'KeyN', 'KeyM', 'KeyV', 'KeyB', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyX'].includes(e.code)) { e.preventDefault(); return true; }
  return false;
}

// v0.3.44：F4 油彈 / 油漬輔助框
//   ・飛行中的油彈：紅圈 = 碰撞範圍（任何目標都顯示）
//   ・選到 O：目前路線的拋物線、發射起點、3 顆範例油彈（白虛線 = 整張圖、黃虛線 = 有畫面範圍、黃圈 = 圖中球體、紅圈 = 碰撞）
//   ・場上的油漬：紅框 = 傷害範圍（任何目標都顯示）
//   ・選到 L：固定顯示一組範例油漬（不會消失）＋ 貼地線 / 主體寬 / 傷害範圍
function drawOrangeKingShotSlickCalibOverlay(cx) {
  const b = orangeKingBoss;
  if (!b) return;
  const tg = orangeKingMachineCalibTarget;
  // v0.3.46：王權劍對位輔助 — 腳底線、身體中心線、小V hitbox、王權劍圖範圍
  const rN = getRoyalSwordCalibFrame();
  if (rN) {
    const px = player.x - cx;
    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#00ffc8'; ctx.setLineDash([8, 5]);
    ctx.beginPath(); ctx.moveTo(px - 120, player.y + player.h); ctx.lineTo(px + player.w + 120, player.y + player.h); ctx.stroke(); // 腳底線
    ctx.strokeStyle = '#ff2bd6';
    ctx.beginPath(); ctx.moveTo(px + player.w / 2, player.y - 70); ctx.lineTo(px + player.w / 2, player.y + player.h + 10); ctx.stroke(); // 身體中心線
    ctx.setLineDash([]);
    ctx.strokeStyle = '#3dff6a'; ctx.strokeRect(px, player.y, player.w, player.h); // 小V hitbox
    const rImg = getAdventureImage('royalSwordAttack0' + rN);
    if (rImg) {
      const r = getHeroDrawRect(rImg, 1, rN);
      const x0 = player.facingRight ? px + r.dX : px + player.w - r.dX - r.dW;
      ctx.setLineDash([4, 3]); ctx.strokeStyle = '#ffe066';
      ctx.strokeRect(x0, player.y + r.dY, r.dW, r.dH); // 王權劍整張圖範圍（看會不會超出畫面）
      ctx.setLineDash([]);
    }
    ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#ffe066';
    const modeTxt = ['王權劍＋原圖半透明對照', '只看王權劍', '只看原本氣球劍'][orangeKingRoyalPreviewMode];
    ctx.fillText('王權劍 attack_0' + rN + '：' + modeTxt + '（X 切換）　青線 = 腳底　粉線 = 身體中心　綠框 = 小V hitbox　黃虛線 = 圖片範圍'
      + (rImg ? '' : '　⚠️ royal 圖未載入'), 14, 56);
    ctx.restore();
  }
  ctx.save();
  ctx.lineWidth = 2;
  b.lobShots.forEach(s => {
    const hc = getOrangeKingArcShotHitbox(s.x, s.y);
    ctx.strokeStyle = '#ff3b3b';
    ctx.beginPath(); ctx.arc(hc.x - cx, hc.y, hc.r, 0, Math.PI * 2); ctx.stroke();
  });
  // v0.3.45：金色油管環 — 選到 G 時在落地點固定顯示一個（含撿取範圍）
  if (tg === 'goldenRing') {
    const rx = ORANGE_KING.RING_LAND_X, ry = GROUND_Y - 34;
    if (!drawOrangeKingGoldenRingArt(rx - cx, ry, 0, b.totalMs, true)) drawGoldOilRing(rx - cx, ry, 1, true, b.totalMs);
    const rg = getOrangeKingGoldenRingGeom(rx - cx, ry);
    ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
    ctx.strokeRect(rg.drawX, rg.drawY, rg.drawW, rg.drawH);
    ctx.setLineDash([6, 3]); ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 1.5;
    ctx.strokeRect(rg.opaque.x, rg.opaque.y, rg.opaque.w, rg.opaque.h);
    ctx.setLineDash([]); ctx.strokeStyle = '#3dff6a'; ctx.lineWidth = 2;
    ctx.strokeRect(rx - 36 - cx, ry - 70, 72, 100); // 撿取範圍
    ctx.strokeStyle = '#ff2bd6';
    ctx.beginPath(); ctx.moveTo(rx - 8 - cx, ry); ctx.lineTo(rx + 8 - cx, ry); ctx.moveTo(rx - cx, ry - 8); ctx.lineTo(rx - cx, ry + 8); ctx.stroke();
    ctx.font = 'bold 12px monospace'; ctx.fillStyle = '#ffe066'; ctx.textAlign = 'left';
    ctx.fillText('金色油管環（落地點預覽）　綠框 = 撿取範圍　粉十字 = 環的位置', 14, GROUND_Y + 30);
  }
  const drawSlickBoxes = (p, g) => {
    ctx.fillStyle = 'rgba(255,60,60,0.18)';
    ctx.fillRect(p.x - cx, GROUND_Y - 10, p.w, 14);
    ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = 2; ctx.setLineDash([]);
    ctx.strokeRect(p.x - cx, GROUND_Y - 10, p.w, 14);                     // 傷害範圍（腳踩地面 + 左右重疊）
    if (g) {
      ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
      ctx.strokeRect(g.drawX - cx, g.drawY, g.drawW, g.drawH);              // 整張圖
      ctx.setLineDash([6, 3]); ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 1.5;
      ctx.strokeRect(g.opaque.x - cx, g.opaque.y, g.opaque.w, g.opaque.h); // 有畫面範圍
      ctx.setLineDash([]); ctx.strokeStyle = '#ff2bd6'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(g.coreX - cx, g.ay); ctx.lineTo(g.coreX + g.coreW - cx, g.ay); ctx.stroke(); // 貼地線（主體寬）
      ctx.beginPath(); ctx.moveTo(g.ax - cx, g.ay - 8); ctx.lineTo(g.ax - cx, g.ay + 8); ctx.stroke();
    }
  };
  b.puddles.forEach(p => drawSlickBoxes(p, null));
  if (tg === 'oilSlick') {
    ctx.strokeStyle = 'rgba(0,255,200,0.8)'; ctx.lineWidth = 1; ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(CANVAS_W, GROUND_Y); ctx.stroke(); // 地面線
    ctx.setLineDash([]);
    ORANGE_KING_PUDDLE_SETS[0].forEach(x => {
      const p = { x, w: ORANGE_KING.PUDDLE_W };
      const ok = drawOrangeKingOilSlickArt(p, cx, 1, 1);
      if (!ok) { ctx.fillStyle = 'rgba(232,150,28,0.8)'; ctx.beginPath(); ctx.ellipse(x + p.w / 2 - cx, GROUND_Y + 2, p.w / 2, 9, 0, 0, Math.PI * 2); ctx.fill(); }
      drawSlickBoxes(p, getOrangeKingOilSlickGeom(p, 1));
    });
    ctx.font = 'bold 12px monospace'; ctx.fillStyle = '#ffe066'; ctx.textAlign = 'left';
    ctx.fillText('油漬範例（固定顯示）：紅框 = 傷害範圍　粉線 = 貼地線 / 主體寬　黃虛線 = 圖片畫面範圍', 14, GROUND_Y + 30);
  }
  if (tg === 'oilShot' || tg === 'arcOrigin' || tg === 'arcHitbox') {
    const lob = buildOrangeKingLob(ORANGE_KING_LOB_ROUTES[orangeKingOilShotCalibRoute % ORANGE_KING_LOB_ROUTES.length]);
    // 拋物線路徑
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
    ctx.beginPath();
    let tEnd = 0;
    for (let tt = 0; tt < 400; tt += 2) {
      const pt = getLobPoint(lob, tt);
      if (tt === 0) ctx.moveTo(pt.x - cx, pt.y); else ctx.lineTo(pt.x - cx, pt.y);
      tEnd = tt;
      if (pt.x < -60 || pt.y > CANVAS_H + 60) break;
    }
    ctx.stroke(); ctx.setLineDash([]);
    // 發射起點
    ctx.strokeStyle = '#00ffc8'; ctx.lineWidth = 2;
    ctx.lineWidth = tg === 'arcOrigin' ? 3 : 2;
    ctx.beginPath(); ctx.arc(lob.sx - cx, lob.sy, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lob.sx - 14 - cx, lob.sy); ctx.lineTo(lob.sx + 14 - cx, lob.sy); ctx.moveTo(lob.sx - cx, lob.sy - 14); ctx.lineTo(lob.sx - cx, lob.sy + 14); ctx.stroke();
    ctx.font = 'bold 12px monospace'; ctx.fillStyle = '#00ffc8'; ctx.textAlign = 'right';
    ctx.fillText('發射起點', lob.sx - 14 - cx, lob.sy - 12);
    ctx.textAlign = 'left'; ctx.fillStyle = '#ffffff';
    ctx.fillText('路線 ' + (orangeKingOilShotCalibRoute + 1) + ' / ' + ORANGE_KING_LOB_ROUTES.length + '（T 切換）　白虛線 = 拋物線　青十字 = 發射起點　紅圈 = 碰撞（半徑 ' + ORANGE_KING_MACHINE_ART.arcShotHitboxRadius + '）　黃圈 = 圖中球體', 14, 56);
    // 3 顆範例油彈（路徑 25% / 50% / 75%）
    [0.25, 0.5, 0.75].forEach(f => {
      const tt = tEnd * f;
      const pt = getLobPoint(lob, tt);
      const s = { vx: lob.vx, vy0: lob.vy0, g: lob.g, t: tt };
      const rot = getOrangeKingOilShotRot(s);
      const ok = drawOrangeKingOilShotArt(pt.x, pt.y, rot, 1, cx);
      if (!ok) { ctx.fillStyle = '#ffa31a'; ctx.beginPath(); ctx.arc(pt.x - cx, pt.y, ORANGE_KING.LOB_RADIUS, 0, Math.PI * 2); ctx.fill(); }
      const g = getOrangeKingOilShotGeom(pt.x, pt.y, rot, 1);
      ctx.save();
      ctx.translate(g.cx - cx, g.cy); ctx.rotate(g.rot);
      ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
      ctx.strokeRect(g.drawX, g.drawY, g.drawW, g.drawH);
      ctx.setLineDash([5, 3]); ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 1.5;
      ctx.strokeRect(g.opaque.x, g.opaque.y, g.opaque.w, g.opaque.h);
      ctx.beginPath(); ctx.arc(0, 0, g.sphereR, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      const hc = getOrangeKingArcShotHitbox(pt.x, pt.y);
      ctx.setLineDash([]); ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = tg === 'arcHitbox' ? 3 : 2;
      ctx.fillStyle = 'rgba(255,60,60,0.18)';
      ctx.beginPath(); ctx.arc(hc.x - cx, hc.y, hc.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
  }
  ctx.restore();
}

// 最上層的輔助框與數值面板
function drawOrangeKingMachineCalibOverlay() {
  if (!ADVENTURE_TEST_TOOLS_ENABLED || !orangeKingMachineCalibMode) return;
  if (isChapter2ParallaxStage()) { drawChapter2BgCalibOverlay(); return; } // v0.3.47
  if (isChapter1ParallaxStage()) { drawChapter1BgCalibOverlay(); return; } // v0.3.52
  const cx = cameraX;
  const A = ORANGE_KING_MACHINE_ART;
  ctx.save();
  if (isOrangeKingStageActive()) {
    const mg = getOrangeKingMachineGeom();
    // 主裝置 draw rect + 垂直主管
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(mg.drawX - cx, mg.drawY, mg.drawW, mg.drawH);
    ctx.strokeStyle = 'rgba(0,200,255,0.9)';
    ctx.beginPath(); ctx.moveTo(mg.vPipeX - cx, mg.vPipeTop); ctx.lineTo(mg.vPipeX - cx, mg.vPipeBottom); ctx.stroke();
    ctx.setLineDash([]);
    // 平台：碰撞框（綠）+ 可站立線（亮綠粗線）；v0.3.39 平台美術外框（黃虛線 = 畫面範圍、白虛線 = 整張圖）
    platforms.forEach(p => {
      if (p.artKey) {
        const ag = getOrangeKingPlatformArtGeom(p.artKey);
        const sel = (orangeKingMachineCalibTarget === 'platHigh' && p.artKey === 'high')
                 || (orangeKingMachineCalibTarget === 'platMid'  && p.artKey === 'mid');
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(ag.drawX - cx, ag.drawY, ag.drawW, ag.drawH);
        ctx.strokeStyle = sel ? '#ffe066' : 'rgba(255,224,102,0.7)';
        ctx.lineWidth = sel ? 2 : 1;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(ag.artX - cx, ag.artY, ag.artW, ag.artH);
        ctx.setLineDash([]);
      }
      ctx.strokeStyle = 'rgba(120,255,120,0.9)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(p.x - cx, p.y, p.w, p.h);
      ctx.strokeStyle = '#3dff6a';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(p.x - cx, p.y); ctx.lineTo(p.x + p.w - cx, p.y); ctx.stroke();
    });
    // 三根油管 / 攻擊高度 / hitbox
    const colors = { high: '#ff5c8a', mid: '#ffb347', low: '#7fd3ff' };
    ['high', 'mid', 'low'].forEach(key => {
      const pg = getOrangeKingPipeGeom(key);
      const band = getOrangeKingSprayBand(key);
      const col = colors[key];
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(pg.drawX - cx, pg.drawY, pg.drawW, pg.drawH);              // 油管整張圖 draw rect
      ctx.setLineDash([10, 6]);
      ctx.beginPath(); ctx.moveTo(0, pg.y); ctx.lineTo(CANVAS_W, pg.y); ctx.stroke(); // 攻擊高度線
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = col;
      ctx.fillRect(band.x - cx, band.y, band.w, band.h);                          // 油流 hitbox
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2;
      ctx.strokeRect(band.x - cx, band.y, band.w, band.h);
      // 右端接合點 / 管口
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(pg.joinX - cx, pg.y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(pg.mouthX - cx, pg.y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(key + ' y=' + Math.round(pg.y), 14, pg.y - 6);
    });
    // v0.3.37：水平噴油特效圖 — 選到 7 時三層都預覽；外框 / 噴口錨點 / 管口對位點
    ['high', 'mid', 'low'].forEach(key => {
      const og = getOrangeKingOilStreamGeom(key);
      if (orangeKingMachineCalibTarget === 'oilStream') {
        if (!drawOrangeKingOilStreamArt(key, cx, 1, 0.85, 0)) {
          ctx.fillStyle = 'rgba(255,150,20,0.5)';
          ctx.fillRect(0 - cx, og.mouthY - 10, og.mouthX, 20);
        }
      }
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.strokeRect(og.drawX - cx, og.drawY, og.drawW, og.drawH);       // 噴油圖 draw rect
      ctx.setLineDash([]);
      ctx.strokeStyle = '#ff2bd6';                                         // 噴口錨點（十字）
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(og.anchorX - 9 - cx, og.anchorY); ctx.lineTo(og.anchorX + 9 - cx, og.anchorY);
      ctx.moveTo(og.anchorX - cx, og.anchorY - 9); ctx.lineTo(og.anchorX - cx, og.anchorY + 9);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(og.mouthX - cx, og.mouthY, 8, 0, Math.PI * 2); ctx.stroke(); // 管口對位圈
    });
    // v0.3.41：Boss 本體 — 判定框（紅 = 可受傷、橘 = 衝撞判定）+ 圖片繪製範圍 / 實際畫面範圍 + 錨點
    if (orangeKingBoss) {
      const b = orangeKingBoss;
      const st = getOrangeKingArtState(b);
      const bg = getOrangeKingBossArtGeom(st, b);
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bg.drawX - cx, bg.drawY, bg.drawW, bg.drawH);
      ctx.setLineDash([6, 3]);
      ctx.strokeStyle = '#ffe066';
      ctx.lineWidth = 2;
      ctx.strokeRect(bg.opaque.x - cx, bg.opaque.y, bg.opaque.w, bg.opaque.h);
      ctx.setLineDash([]);
      const hr = getOrangeKingHurtRect();
      ctx.strokeStyle = '#ff3b3b';
      ctx.strokeRect(hr.x - cx, hr.y, hr.w, hr.h);
      if (st === 'dash' || st === 'dashCooldown') {
        const dh = bg.previewDash
          ? { x: ORANGE_KING.HOME_X + (ORANGE_KING.W - ORANGE_KING.BALL_W) / 2 + 8, y: GROUND_Y - ORANGE_KING.BALL_H + 6, w: ORANGE_KING.BALL_W - 16, h: ORANGE_KING.BALL_H - 6 }
          : getOrangeKingDashHitbox();
        ctx.strokeStyle = '#ff9a1f';
        ctx.strokeRect(dh.x - cx, dh.y, dh.w, dh.h);
      }
      ctx.strokeStyle = '#ff2bd6';
      ctx.beginPath();
      ctx.moveTo(bg.ax - 10 - cx, bg.ay); ctx.lineTo(bg.ax + 10 - cx, bg.ay);
      ctx.moveTo(bg.ax - cx, bg.ay - 10); ctx.lineTo(bg.ax - cx, bg.ay + 10);
      ctx.stroke();
      const lo = getOrangeKingLobOrigin();
      ctx.beginPath(); ctx.arc(lo.x - cx, lo.y, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#ffe066';
      ctx.textAlign = 'left';
      ctx.fillText('Boss 圖：' + st + '（' + b.phase + '）', bg.opaque.x - cx, bg.opaque.y - 6);
    }
    // v0.3.44：拋物線油彈 / 地面油漬 輔助
    drawOrangeKingShotSlickCalibOverlay(cx);
    // 玩家 hitbox
    const pr = playerHazardRect();
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 2;
    ctx.strokeRect(pr.x - cx, pr.y, pr.w, pr.h);
  }
  // 數值面板
  const lines = [
    'Orange King Machine Calibration ON（F4 關閉）',
    'Target: ' + (ORANGE_KING_MACHINE_CALIB_TARGETS.find(x => x.key === orangeKingMachineCalibTarget) || {}).label,
    'baseX: ' + A.baseX + '   baseY: ' + A.baseY + '   baseScale: ' + A.baseScale,
    'pipeX: ' + A.pipeX + '   pipeScale: ' + A.pipeScale,
    'pipeHighY: ' + A.pipeHighY + '   pipeMidY: ' + A.pipeMidY + '   pipeLowY: ' + A.pipeLowY,
    'oilBandH: ' + A.oilBandH + '   oilExtendX: ' + A.oilExtendX,
    'oilStream: offsetX ' + A.oilStreamOffsetX + '  offsetY ' + A.oilStreamOffsetY + '  scaleX ' + A.oilStreamScaleX + '  scaleY ' + A.oilStreamScaleY,
    'platHigh: X ' + A.platformHighX + '  Y ' + A.platformHighY + '  scaleX ' + A.platformHighScaleX + '  scaleY ' + A.platformHighScaleY,
    'platMid:  X ' + A.platformMidX + '  Y ' + A.platformMidY + '  scaleX ' + A.platformMidScaleX + '  scaleY ' + A.platformMidScaleY,
    'boss idle: ' + A.bossIdleOffsetX + ',' + A.bossIdleOffsetY + ' ×' + A.bossIdleScale
      + '  cooldown: ' + A.bossCooldownOffsetX + ',' + A.bossCooldownOffsetY + ' ×' + A.bossCooldownScale
      + '  dash: ' + A.bossDashOffsetX + ',' + A.bossDashOffsetY + ' ×' + A.bossDashScale
      + '  dashCD: ' + A.bossDashCooldownOffsetX + ',' + A.bossDashCooldownOffsetY + ' ×' + A.bossDashCooldownScale,
    'boss warn: ' + A.bossDashWarnOffsetX + ',' + A.bossDashWarnOffsetY + ' ×' + A.bossDashWarnScale
      + '  prep1: ' + A.bossDashPrep1OffsetX + ',' + A.bossDashPrep1OffsetY + ' ×' + A.bossDashPrep1Scale
      + '  prep2: ' + A.bossDashPrep2OffsetX + ',' + A.bossDashPrep2OffsetY + ' ×' + A.bossDashPrep2Scale
      + '  defeat: ' + A.bossDefeatOffsetX + ',' + A.bossDefeatOffsetY + ' ×' + A.bossDefeatScale,
    'oilShot: ' + A.oilShotOffsetX + ',' + A.oilShotOffsetY + ' ×' + A.oilShotScale + ' rot ' + A.oilShotRotationOffset + '°'
      + '   origin: ' + A.arcShotOriginOffsetX + ',' + A.arcShotOriginOffsetY
      + '   hitbox: ' + A.arcShotHitboxOffsetX + ',' + A.arcShotHitboxOffsetY + ' r' + A.arcShotHitboxRadius,
    'oilSlick: ' + A.oilSlickOffsetX + ',' + A.oilSlickOffsetY + '  scaleX ' + A.oilSlickScaleX + '  scaleY ' + A.oilSlickScaleY + '  alpha ' + A.oilSlickAlpha
      + '  glow ' + A.oilSlickGlowAlpha + ' ×' + A.oilSlickGlowScale
      + '   ring: ' + A.goldenRingOffsetX + ',' + A.goldenRingOffsetY + ' ×' + A.goldenRingScale + ' α' + A.goldenRingAlpha,
    'royal: ' + [1, 2, 3, 4].map(n => n + '=' + A['royalSwordAttack' + n + 'OffsetX'] + ',' + A['royalSwordAttack' + n + 'OffsetY'] + ' ×' + A['royalSwordAttack' + n + 'Scale']
      + (getAdventureImage('royalSwordAttack0' + n) ? '' : '(未載入)')).join('  '),
    'art: base=' + (orangeKingBossImgStatus.machineBase || '-') + '  pipe=' + (orangeKingBossImgStatus.oilPipeHorizontal || '-')
      + '  stream=' + (orangeKingBossImgStatus.oilStreamHorizontal || '-')
      + '  bg=' + (orangeKingBossImgStatus.bossRoomBg || '-')
      + '  platHigh=' + (orangeKingBossImgStatus.platformHigh || '-') + '  platMid=' + (orangeKingBossImgStatus.platformMid || '-'),
    'boss art: idle=' + (orangeKingBossImgStatus.bossIdle || '-') + '  cooldown=' + (orangeKingBossImgStatus.bossCooldown || '-')
      + '  dash=' + (orangeKingBossImgStatus.bossDashBall || '-') + '  warn=' + (orangeKingBossImgStatus.bossDashWarn || '-')
      + '  prep1=' + (orangeKingBossImgStatus.bossDashPrep1 || '-') + '  prep2=' + (orangeKingBossImgStatus.bossDashPrep2 || '-')
      + '  defeat=' + (orangeKingBossImgStatus.bossDefeat || '-')
      + '  shot=' + (orangeKingBossImgStatus.oilShot || '-') + '  slick=' + (orangeKingBossImgStatus.oilSlick || '-')
      + '  ring=' + (orangeKingBossImgStatus.goldenRing || '-')
      + '  bgm=' + orangeKingBgmStatus + '(vol ' + ORANGE_KING_BGM_VOLUME + ')  jingle=' + orangeKingJingleStatus,
    '1~9、0 - = \\ , . / O Y U L G K A S D F 選目標｜方向鍵 1px（Shift 10px）｜[ ] scale｜; \' scaleY / 旋轉｜Q E 透明度｜T 換路線｜R 重置｜C 輸出',
  ];
  if (!isOrangeKingStageActive()) lines.push('（目前不在 2-4：暫停 → 🍊 測試 2-4 橘子王）');
  const w = 780, lh = 17, h = lines.length * lh + 12; // v0.3.45：560 → 780（狀態列變長）
  // v0.3.39：調高平台（8）時面板移到畫面下方，避免蓋住左上的高平台
  const panelY = ['platHigh', 'oilShot', 'arcOrigin', 'arcHitbox'].includes(orangeKingMachineCalibTarget) ? CANVAS_H - h - 8 : 64;
  ctx.fillStyle = 'rgba(0,0,0,0.78)';
  ctx.fillRect(10, panelY, w, h);
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'left';
  lines.forEach((ln, i) => {
    ctx.fillStyle = i === 0 ? '#00ffc8' : (i === 1 ? '#ffe066' : '#ffffff');
    ctx.fillText(ln, 18, panelY + 18 + i * lh);
  });
  ctx.restore();
}

// 測試版：🍊 直接進入 2-4 Boss 關（不清背包，只換關卡）
// v0.3.51：測試入口也走 preload gate（跳到哪、載哪；載完才開始）
function startOrangeKingBossTestLevel() { return runWithAssetGate(['common', 'chapter2', 'orangeKingBoss'], '橘子王 Boss 戰準備中...', () => startOrangeKingBossTestLevel__impl()); }
function startOrangeKingBossTestLevel__impl() {
  try { advMarkTestEntry('startOrangeKingBossTestLevel'); } catch (e) {} // v0.3.63：測試捷徑 → 只能是測試紀錄
  if (!ADVENTURE_TEST_TOOLS_ENABLED) return;
  const idx = LEVELS.findIndex(lv => lv.stageId === '2-4');
  if (idx < 0) { showHint('找不到 2-4 關卡', 160); return; }
  bringBalloonDog = false;
  nextBringDog = false;
  currentLevelIndex = idx;
  loadLevel(idx);
  restart({ keepHp: false, preserveBringDog: false });
  const pauseEl = document.getElementById('pause-overlay');
  if (pauseEl) { pauseEl.style.display = 'none'; pauseEl.classList.remove('active'); }
  if (typeof closePauseBag === 'function') closePauseBag();
  gameState = 'playing';
  lastTime = 0;
}


// ══ v0.3.57：手機開始流程（載入 → 橫向 + 全螢幕 → 按「開始冒險」才真的開始）══
// 手機 / 觸控裝置：開機載入完成後先停在「準備畫面」，遊戲邏輯完全不推進（loop 不呼叫 update）
// 桌機：維持原本習慣（載入完成直接開始）
function isTouchPlayDevice() {
  try { return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches) && (navigator.maxTouchPoints || 0) > 0; } catch (e) { return false; }
}
function isPortraitNow() { try { return window.innerHeight > window.innerWidth; } catch (e) { return false; } }
function isFullscreenNow() { try { return !!(document.fullscreenElement || document.webkitFullscreenElement); } catch (e) { return false; } }
function isFullscreenSupported() {
  try { const el = document.documentElement; return !!(el.requestFullscreen || el.webkitRequestFullscreen) && (document.fullscreenEnabled !== false || document.webkitFullscreenEnabled); } catch (e) { return false; }
}
let gameStartGateActive = (typeof window !== 'undefined') ? isTouchPlayDevice() : false;
let gameStartFsAttempted = false; // 按過「進入全螢幕」但瀏覽器不給（例如 iPhone Safari）→ 允許直接開始
function isGameStartGateActive() { return !!gameStartGateActive; }
function getStartGateStep() {
  if (isPortraitNow()) return 'rotate';
  if (!isFullscreenNow() && isFullscreenSupported() && !gameStartFsAttempted) return 'fullscreen';
  return 'start';
}
function requestGameFullscreen() {
  gameStartFsAttempted = false;
  try {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) { const p = req.call(el); if (p && p.catch) p.catch(() => { gameStartFsAttempted = true; renderStartGate(); }); }
    else gameStartFsAttempted = true;
  } catch (e) { gameStartFsAttempted = true; }
  try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (e) {}
  // 1.2 秒後還沒進入全螢幕（瀏覽器不支援 / 被拒絕）→ 讓玩家可以直接開始
  setTimeout(() => { if (!isFullscreenNow()) gameStartFsAttempted = true; renderStartGate(); }, 1200);
}
function renderStartGate() {
  if (typeof document === 'undefined' || !document.body) return;
  let el = document.getElementById('start-gate-overlay');
  if (!gameStartGateActive || !assetBootReady) { if (el) el.style.display = 'none'; return; }
  if (!el) {
    el = document.createElement('div');
    el.id = 'start-gate-overlay';
    el.className = 'hv-ui-overlay';
    document.body.appendChild(el);
  }
  const step = getStartGateStep();
  const lv = LEVELS[currentLevelIndex] || {};
  let inner = '<div class="hv-ui-card start-gate-card"><div class="start-gate-title">🎈 氣球小V：派對島大作戰</div>'
    + '<div class="start-gate-stage">' + (typeof getChapterDisplayTitle === 'function' ? getChapterDisplayTitle(currentLevelIndex) : (lv.name || '')) + '</div>';
  if (step === 'rotate') {
    inner += '<div class="start-gate-icon">📱↔️</div><div class="start-gate-msg">請把手機轉成<b>橫向</b></div>'
      + '<div class="start-gate-sub">轉好之前，冒險不會開始、也不會計時</div>';
  } else if (step === 'fullscreen') {
    inner += '<div class="start-gate-msg">先進入全螢幕，畫面會更大更好玩！</div>'
      + '<button class="hv-ui-btn hv-ui-btn--primary" id="btn-start-gate-fs">⛶ 進入全螢幕</button>'
      + '<div class="start-gate-sub">準備好之前，冒險不會開始、也不會計時</div>';
  } else {
    inner += '<div class="start-gate-msg">準備好了嗎？</div>'
      + '<button class="hv-ui-btn hv-ui-btn--primary hv-ui-btn--big" id="btn-start-gate-go">▶ 開始冒險</button>'
      + (isFullscreenNow() ? '' : '<div class="start-gate-sub">（這個瀏覽器不支援全螢幕，也可以直接開始）</div>');
  }
  inner += '</div>';
  el.innerHTML = inner;
  el.style.display = 'flex';
  const fsb = document.getElementById('btn-start-gate-fs');
  if (fsb) fsb.onclick = (e) => { e.preventDefault(); requestGameFullscreen(); };
  const go = document.getElementById('btn-start-gate-go');
  if (go) go.onclick = (e) => { e.preventDefault(); startAdventureFromGate(); };
}
function startAdventureFromGate() {
  if (!gameStartGateActive) return;
  if (isTouchPlayDevice() && isPortraitNow()) { renderStartGate(); return; }
  gameStartGateActive = false;
  lastTime = 0; fixedStepAccumulator = 0;
  if (gameState === 'paused') resumeGame();
  const el = document.getElementById('start-gate-overlay');
  if (el) el.style.display = 'none';
  console.log('[StartGate] 開始冒險（從這一刻起才開始計時）');
}
if (typeof window !== 'undefined') window.startAdventureFromGate = startAdventureFromGate;
// ── 自動暫停：切到背景 / 鎖螢幕 / 來電 / 離開全螢幕 / 轉回直向 → 停在暫停選單，回來時由玩家按「繼續冒險」──
let lastKnownFullscreen = false;
function autoPauseGame(reason) {
  if (gameStartGateActive) { renderStartGate(); return; }
  if (typeof rpgIsActive === 'function' && rpgIsActive() && !rpgActive.ui) { rpgPauseAfterClose = true; return; } // v0.3.59：對話中切背景 → 對話結束後停在暫停選單
  if (gameState !== 'playing') return;
  if (typeof isDiscoveryItemModalOpen === 'function' && isDiscoveryItemModalOpen()) return;
  pauseGame();
  console.log('[AutoPause] ' + reason);
}
if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('visibilitychange', () => { if (document.hidden) autoPauseGame('切到背景 / 鎖螢幕'); else { lastTime = 0; fixedStepAccumulator = 0; } });
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => document.addEventListener(ev, () => {
    const fs = isFullscreenNow();
    if (lastKnownFullscreen && !fs) autoPauseGame('離開全螢幕');
    lastKnownFullscreen = fs;
    renderStartGate();
  }));
}
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('pagehide', () => autoPauseGame('離開頁面'));
  window.addEventListener('blur', () => { if (isTouchPlayDevice()) autoPauseGame('切到其他 App'); });
  const onOrient = () => { if (isTouchPlayDevice() && isPortraitNow()) autoPauseGame('轉成直向'); renderStartGate(); };
  window.addEventListener('resize', onOrient);
  window.addEventListener('orientationchange', () => setTimeout(onOrient, 200));
}

// ── Pause / Resume ────────────────────────────
function pauseGame() {
  if (gameStartGateActive) return; // v0.3.57：還沒開始冒險，不需要暫停
  if (typeof rpgIsActive === 'function' && rpgIsActive()) return; // v0.3.59：RPG 對話中（遊戲已暫停）不疊暫停選單
  if (gameState !== 'playing') return; // paused / failed / gameover / clear 都停
  gameState = 'paused';
  updatePrepReturnButtons(); // v0.3.58
  try { rpgRefreshModeButton(); } catch (e) {} // v0.3.59
  const el = document.getElementById('pause-overlay');
  if (el) el.style.display = 'flex';
}

function resumeGame() {
  if (gameState !== 'paused') return;
  if (typeof orangeKingVictoryConfirmOpen !== 'undefined' && orangeKingVictoryConfirmOpen) return; // v0.3.61：勝利確認視窗由「確認」鍵結束
  if (typeof rpgIsActive === 'function' && rpgIsActive()) return; // v0.3.59：RPG 對話由對話框自己結束
  // v0.3.57：手機直向時不恢復（先轉回橫向）；秘笈 / 背包開著時先關掉
  if (isTouchPlayDevice() && isPortraitNow()) { showHint('請先把手機轉回橫向再繼續冒險', 160); return; }
  if (typeof closeGuidebook === 'function') { guidebookFromPause = false; closeGuidebook(); }
  gameState = 'playing';
  fixedStepAccumulator = 0;
  const el = document.getElementById('pause-overlay');
  if (el) el.style.display = 'none';
  closePauseBag(); // v0.3.29-fix-1：保險 — 遊戲繼續時暫停背包一定不留在畫面上
  // lastTime 重置，避免暫停後 dt 爆炸大
  lastTime = 0;
}


// ── 挑戰失敗（死亡）─────────────────────────
// 規則：死亡時回滾本局收集到的材料（未帶走）
function triggerFailed() {
  try { advEndLiveAttempt('death'); } catch (e) {} // v0.3.63：先封存本次失敗（傷害 / 耗時），再回復快照
  try { rpgHideDogFloat(true); } catch (e) {} // v0.3.59
  // 用進關前快照完整還原（含隱藏秘笈/寶箱/材料）
  restoreLevelStartSnapshot();
  levelRolledBackForRetry = true; // v0.3.58：已回滾；失敗畫面之後的合法交易要保留
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
  gameState = 'failed';
  updateFailedPanelInfo();
  updatePrepReturnButtons(); // v0.3.58
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
  try { advEndLiveAttempt('timeout'); } catch (e) {} // v0.3.63：時間到 = 失敗一次（先封存，再回復快照）
  // 時間到：同樣回滾本局材料（沒成功帶走）
  // v0.3.58：改成和「挑戰失敗」同一套 — 直接回到進關快照（原本只扣本關金幣 / 材料，之後重試時又整包還原快照，
  //          導致在時間到畫面花掉的金幣 / 材料在重試時被退回）。最終重試狀態和以前相同。
  if (levelStartSnapshot) {
    restoreLevelStartSnapshot();
    bringBalloonDog = levelStartBringDog;
    if (player.hp <= 0) player.hp = levelStartHp > 0 ? levelStartHp : player.maxHp;
    levelRolledBackForRetry = true;
  } else {
    playerInventory.coins        = Math.max(0, playerInventory.coins        - currentRunStats.coins);
    playerInventory.balloon260   = Math.max(0, playerInventory.balloon260   - currentRunStats.balloon260);
    playerInventory.roundBalloon = Math.max(0, playerInventory.roundBalloon - currentRunStats.roundBalloon);
  }
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
  try { advOnAttemptCleared(); } catch (e) { console.warn('[Score] 通關提交失敗', e); } // v0.3.63：本關有效成果
  try { sfxOnLevelClear(); } catch (e) {} // v0.3.65：每一次正式過關播一次（不延遲結算畫面）
  try { rpgHideDogFloat(true); } catch (e) {} // v0.3.59
  currentRunStats.enemiesDefeated = player.enemiesDefeated;
  prepCheckpoint = null; // v0.3.58：本關已通關 → 不能再返回上一關的整備
  levelRolledBackForRetry = false;

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

  // v0.3.33-fix-1：重要物品（Boss 弱點筆記等）通關才正式收進背包並存檔
  const pendingKeyItems = currentRunStats.pendingKeyItems || {};
  if (Object.keys(pendingKeyItems).length) {
    if (!playerInventory.keyItems) playerInventory.keyItems = {};
    Object.values(pendingKeyItems).forEach(k => {
      if (!playerInventory.keyItems[k.id]) {
        playerInventory.keyItems[k.id] = Object.assign({}, k, { acquiredAt: Date.now() });
      }
    });
    currentRunStats.pendingKeyItems = {};
    saveInventory();
    console.log('key items committed on clear:', Object.keys(playerInventory.keyItems));
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
    const _hpBeforeDogHeal = player.hp;
    player.hp = Math.min(player.maxHp, player.hp + 0.5);
    currentRunStats.dogHealed = true;
    try { sfxOnHeal(player.hp - _hpBeforeDogHeal); } catch (e) {} // v0.3.64：小狗通關療癒（滿血時不播）
    dog.turnsLeft = Math.max(0, (dog.turnsLeft || 1) - 1);
    if (dog.turnsLeft <= 0) {
      dog.present   = false;
      dog.turnsLeft = 0;
      currentRunStats.dogGoneThisClear = true;
      // v0.3.33-fix-2：小狗消氣 → 本關同行狀態結束、清除任何殘留安排
      nextBringDog    = false;
      bringBalloonDog = false;
    }
    playerInventory.balloonDog = dog;
  }
  clearInvalidDogTripPlan('clear');

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
  // v0.3.60：小狗陪伴次數在這次結算正式用完而離開 → 存檔與結算畫面都完成後，再由星靈提醒（一生一次）
  if (currentRunStats.dogGoneThisClear) { try { if (typeof rpgRequestUi === 'function') rpgRequestUi('rpg010_dog_left', 500); } catch (e) {} }
  try { advAfterClear(); } catch (e) { console.warn('[Score] 結算失敗', e); } // v0.3.63：整備恢復點；2-4 → 完整冒險總結算
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
    const bossGate = isBossWeaponGateBlocked(nextIdx); // v0.3.35-fix-1
    const btnText = bossGate ? '請先製作武器' : (nextStepInfo ? nextStepInfo.nextBtnText : '下一關');
    const isLocked = bossGate || (nextStepInfo ? nextStepInfo.nextBtnLocked : false);
    if (ADVENTURE_TEST_TOOLS_ENABLED && nextStepInfo) {
      console.log('[DogFlow] updateNextLevelButton', { kind: nextStepInfo.kind, btnText, isLocked, nextBringDog,
        hasDog: !!(playerInventory.balloonDog?.present), turnsLeft: playerInventory.balloonDog?.turnsLeft });
    }

    btn.childNodes[0].textContent = btnText;
    const sub = btn.querySelector('.result-btn-sub');
    if (sub) sub.textContent = isLocked ? 'Locked' : 'Next Level';
    // v0.3.18-fix-5：Locked 時明確設 _nextLevel=false，防止點擊真的進下一關
    btn._nextLevel = !isLocked;
    btn.dataset.lockedReason = isLocked ? (bossGate ? 'bossWeapon' : (nextStepInfo?.kind || 'locked')) : '';

    btn.style.opacity = isLocked ? '0.45' : '';
    btn.disabled = bossGate; // v0.3.35-fix-1：沒有武器時「下一關」直接 disabled（不會誤觸再玩一次）
  } else {
    btn.disabled = false;
    // v0.3.58：時間到且有整備節點 → 「返回整備」
    const toPrep = gameState === 'gameover' && typeof hasValidPrepCheckpoint === 'function' && hasValidPrepCheckpoint();
    btn.childNodes[0].textContent = toPrep ? '↩ 返回整備' : '再玩一次';
    const sub = btn.querySelector('.result-btn-sub');
    if (sub) sub.textContent = toPrep ? 'Back to Prep' : 'Play Again';
    btn._nextLevel = false;
    btn.style.opacity = '';
  }
}

// ── Draw ──────────────────────────────────────
function draw() {
  if (!isGameStartGateActive()) { // v0.3.57：按「開始冒險」之前不播 BGM
  try { syncOrangeKingBgm(); } catch (e) {} // v0.3.43：2-4 Boss BGM（依目前狀態播放 / 暫停 / 停止）
  try { syncChapter1Bgm(); } catch (e) {}   // v0.3.53：1-1～1-3 第一章 BGM（離開第一章立刻停止，不疊播）
  try { syncChapter2Bgm(); } catch (e) {}   // v0.3.49：2-1～2-3 第二章 BGM（和 Boss BGM 互斥，不疊播）
  }
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  if (gameState === 'playing') {
    drawWorld();
    drawHUD();
    drawOrangeKingBanner(); // v0.3.35
    drawHintBox();
    drawOrangeKingMachineCalibOverlay(); // v0.3.36：定位工具（測試版 F4，最上層）
    drawTreasurePickupEffects(); // v0.3.12-test-2：screen-space 通知框，在 HUD 上方
    drawProjectileOrangeAssetStatusHud(); // v0.3.26-debug：projectile orange 載入狀態（測試版）
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

// ════════════════════════════════════════════════════════════════════
//  v0.3.47：第二章 2-1～2-3 正式 parallax 背景（far / mid / near）＋ 前景點綴（foreground props）
//  ・只用上傳的 PNG，不用 canvas 畫背景；只套用 2-1 / 2-2 / 2-3（2-4 Boss 房、第一章、UI 都不變）
//  ・純視覺：地板 / 凹洞 / 平台 / 碰撞 / 關卡長度都不動（地面、凹洞仍由原本程式畫在背景之上）
//  ・三層皆 1672×941，左右邊緣不能無縫接 → 用「鏡像平鋪」（每隔一張左右翻轉），接縫完全吻合、不會留白、不變形
//  ・縮放好的圖塊先畫到離屏 canvas 快取（scale 改變才重建），每幀只做無縮放貼圖，手機效能較穩
// ════════════════════════════════════════════════════════════════════
const CHAPTER2_BG_STAGE_IDS = ['2-1', '2-2', '2-3'];
const CHAPTER2_BG_ASSETS = {
  far:      'assets/adventure/backgrounds/chapter2/chapter2_orange_bg_far.png',
  mid:      'assets/adventure/backgrounds/chapter2/chapter2_orange_bg_mid.png',
  near:     'assets/adventure/backgrounds/chapter2/chapter2_orange_bg_near.png',
  fgBoiler:  'assets/adventure/backgrounds/chapter2/foreground/chapter2_orange_fg_boiler_01.png',
  fgMachine: 'assets/adventure/backgrounds/chapter2/foreground/chapter2_orange_fg_machine_01.png',
  fgTree:    'assets/adventure/backgrounds/chapter2/foreground/chapter2_orange_fg_orange_tree_crates_01.png',
  fgCrates:  'assets/adventure/backgrounds/chapter2/foreground/chapter2_orange_fg_crates_01.png',
  // v0.3.49：第二章地形 / 平台正式素材
  groundTile:    'assets/adventure/tiles/chapter2/chapter2_orange_ground_tile.png',
  pitEdgeLeft:   'assets/adventure/tiles/chapter2/chapter2_orange_pit_edge_left.png',
  pitEdgeRight:  'assets/adventure/tiles/chapter2/chapter2_orange_pit_edge_right.png',
  pitShadow:     'assets/adventure/tiles/chapter2/chapter2_orange_pit_shadow.png',
  platformShort: 'assets/adventure/platforms/chapter2/chapter2_platform_short.png',
  platformLong:  'assets/adventure/platforms/chapter2/chapter2_platform_long.png',
};
// v0.3.49：量自原圖的對齊點（原圖像素）
const CHAPTER2_TILE_SRC = {
  // 地面帶 2172×724：土壤上緣 y 50；左右兩端是圓角收邊 → 只取中段 x 200～1960 鏡像平鋪（接縫吻合）
  ground: { w: 2172, h: 724, topY: 50, cropX0: 200, cropX1: 1960 },
  // 凹洞左邊緣 1254²：地塊頂 y 165、崖壁（右緣）x 1130；只取右側 x 760～1254（崖壁那一段）
  edgeLeft:  { topY: 165, cliffX: 1130, cropX0: 760, cropX1: 1254 },
  // 凹洞右邊緣 1254²：右側地塊頂 y 209、崖壁（左緣）x 622；左下的低台階不用（坑底另外畫）→ 只取 x 600～1100
  edgeRight: { topY: 209, cliffX: 622, cropX0: 600, cropX1: 1100 },
  // 坑洞陰影 1254²：U 形內容 x 17～1235、y 193～1154
  shadow: { x0: 17, x1: 1235, y0: 193, y1: 1154 },
  // 平台：頂面 y、內容左右（短 1774×887、長 2172×724）
  platformShort: { topY: 274, x0: 64, x1: 1709 },
  platformLong:  { topY: 245, x0: 5,  x1: 2159 },
};
const CHAPTER2_PLATFORM_SHORT_MAX_W = 210; // 平台寬 ≤ 210 用 short 圖，> 210 用 long 圖（依目前關卡平台寬 160～300）
// v0.3.49：第二章一般關卡 BGM（2-1～2-3；2-4 仍是橘子王 BGM）
const CHAPTER2_BGM_PATH = 'assets/audio/bgm/chapter2_orange_factory_bgm.mp3';
let chapter2Bgm = null, chapter2BgmStatus = '-', chapter2BgmWantRestart = false, chapter2BgmBlocked = false;
// 量自原圖：前景圖（1254×1254）有畫面的範圍 [x0, y0, x1, y1]
const CHAPTER2_FG_SRC = {
  boiler:  { key: 'fgBoiler',  opaque: [114, 56, 1164, 1157] },
  machine: { key: 'fgMachine', opaque: [58, 66, 1238, 1162] },
  tree:    { key: 'fgTree',    opaque: [60, 32, 1212, 1202] },
  crates:  { key: 'fgCrates',  opaque: [56, 115, 1197, 1139] },
};
const CHAPTER2_FG_TYPES = ['boiler', 'machine', 'tree', 'crates'];
const CHAPTER2_BG_DEFAULTS = {
  // far：cover 960×540（1672×941 × 0.575 = 961×541），最慢
  chapter2FarOffsetY: 0,  chapter2FarScale: 0.575, chapter2FarParallax: 0.15,
  // mid：× 0.42（702×395），建築底部（原圖 y 737）≈ y 400，從近景的空隙露出
  chapter2MidOffsetY: 90, chapter2MidScale: 0.42,  chapter2MidParallax: 0.38,
  // near：× 0.38（635×358），欄杆底部（原圖 y 927）≈ y 464，藏在地面線（460）後面；上方留出天空，主要遊戲區不會太滿
  chapter2NearOffsetY: 112, chapter2NearScale: 0.38, chapter2NearParallax: 0.68,
  // v0.3.48：背景退後（可讀性）— alpha / blur(px) / saturation / brightness（濾鏡在快取圖塊時套用一次，不是每幀算）
  chapter2FarAlpha: 0.85,  chapter2FarBlur: 2,    chapter2FarSaturation: 0.80,  chapter2FarBrightness: 0.95,
  chapter2MidAlpha: 0.88,  chapter2MidBlur: 1,    chapter2MidSaturation: 0.85,  chapter2MidBrightness: 0.96,
  chapter2NearAlpha: 0.90, chapter2NearBlur: 0.5, chapter2NearSaturation: 0.90, chapter2NearBrightness: 0.97,
  // v0.3.48：可讀性霧幕（背景畫完後、地形 / 角色之前），顏色 rgba(255,245,230, alpha)
  chapter2ReadabilityVeilEnabled: 1, chapter2ReadabilityVeilAlpha: 0.12,
  // 前景點綴：和地形同速（1.0）；v0.3.48 起底部對齊地面線 GROUND_Y（+ groundOffsetY 往下壓一點），約 95px 高
  chapter2FgEnabled: 1, chapter2FgParallax: 1.0, chapter2FgGroundOffsetY: 8,
  chapter2FgGlobalScale: 1, chapter2FgGlobalAlpha: 0.85,
  chapter2FgBoilerScale: 0.085,  chapter2FgBoilerAlpha: 1,
  chapter2FgMachineScale: 0.085, chapter2FgMachineAlpha: 1,
  chapter2FgTreeScale: 0.08,     chapter2FgTreeAlpha: 1,
  chapter2FgCratesScale: 0.088,  chapter2FgCratesAlpha: 1,
  // v0.3.48：地面暫時處理 — v0.3.49 起只在地面帶圖片沒載好時當 fallback
  chapter2GroundBlendEnabled: 1, chapter2GroundEdgeHighlightAlpha: 0.55, chapter2GroundShadowAlpha: 0.45,
  // v0.3.49：正式地面帶（× 0.15 → 中段一塊 264×109；土壤上緣對齊 GROUND_Y，offsetY -4 讓小V腳踩在土壤上）
  chapter2GroundTileOffsetY: -4, chapter2GroundTileScale: 0.15, chapter2GroundTileAlpha: 1, chapter2GroundTileRepeatOffsetX: 0,
  // v0.3.49：凹洞邊緣（和地面帶同比例 0.15，地塊頂對齊地面帶頂、崖壁對齊凹洞左右邊界）
  chapter2PitEdgeLeftOffsetX: 0,  chapter2PitEdgeLeftOffsetY: 0,  chapter2PitEdgeLeftScale: 0.15,
  chapter2PitEdgeRightOffsetX: 0, chapter2PitEdgeRightOffsetY: 0, chapter2PitEdgeRightScale: 0.15,
  // v0.3.49：坑洞陰影（U 形自動拉成凹洞寬 × 地面到坑底深度；ScaleX / ScaleY 是額外倍率）
  chapter2PitShadowOffsetY: 0, chapter2PitShadowScaleX: 1, chapter2PitShadowScaleY: 1, chapter2PitShadowAlpha: 0.75,
  // v0.3.49：平台圖（自動依平台寬等比縮放，頂面對齊可踩 y；ScaleX / ScaleY 是額外倍率）
  chapter2PlatformShortOffsetX: 0, chapter2PlatformShortOffsetY: 0, chapter2PlatformShortScaleX: 1, chapter2PlatformShortScaleY: 1,
  chapter2PlatformLongOffsetX: 0,  chapter2PlatformLongOffsetY: 0,  chapter2PlatformLongScaleX: 1,  chapter2PlatformLongScaleY: 1,
  // v0.3.49：第二章 BGM 音量（原檔約 -19 dBFS，比 Boss BGM 大約 2.5 dB → 0.26，實際響度和 Boss 0.42 接近）
  chapter2BgmVolume: 0.26,
};
// 每關固定配置（x = 世界座標中心）：避開凹洞 ±120、敵人 ±90、地面高度的金幣 / 氣球、狗狗寶物點 ±150、起點與終點旗
// v0.3.48：前景改成「站在地面上」（約 95px 高），重新避讓：凹洞 ±140、敵人 ±110、地面高度金幣 / 氣球 ±40、
//          低平台（y ≥ 380）整段 ±40、其他平台邊緣 ±35、寶物 / 筆記點 ±170、出生點 x < 650、終點旗前 260 → 每關 2～3 個
const CHAPTER2_FG_PROPS = {
  '2-1': [{ type: 'crates', x: 1290 }, { type: 'machine', x: 4600 }],
  '2-2': [{ type: 'boiler', x: 2740 }, { type: 'tree', x: 4448 }, { type: 'crates', x: 5450 }],
  '2-3': [{ type: 'machine', x: 3638 }, { type: 'crates', x: 4350 }],
};
const CHAPTER2_BG = Object.assign({}, CHAPTER2_BG_DEFAULTS);
let chapter2FgOverrides = {}; // 'stageId:index' → { dx, dy, s }（F4 單一 prop 微調）
const CHAPTER2_BG_LS_KEY = 'balloonV_chapter2BgCalib__' + GAME_VERSION;
const chapter2BgImgs = {}, chapter2BgImgStatus = {};
const chapter2BgTileCache = {};
let chapter2BgDrawn = false;

function isChapter2ParallaxStage() {
  const lv = LEVELS[currentLevelIndex];
  return !!(lv && !lv.isBossStage && CHAPTER2_BG_STAGE_IDS.includes(lv.stageId));
}
function initChapter2BgArt() {
  if (typeof Image === 'undefined') return;
  Object.entries(CHAPTER2_BG_ASSETS).forEach(([key, path]) => {
    if (chapter2BgImgStatus[key]) return;
    chapter2BgImgStatus[key] = 'loading';
    try {
      const img = new Image();
      img.onload = () => { chapter2BgImgs[key] = img; chapter2BgImgStatus[key] = 'ok'; };
      img.onerror = () => { chapter2BgImgStatus[key] = 'error'; console.warn('[Chapter2BG] 圖片載入失敗：' + key + ' → ' + path); };
      img.src = resolveAdventureAssetSrc(path) + '?v=' + encodeURIComponent(GAME_VERSION);
    } catch (e) { chapter2BgImgStatus[key] = 'error'; console.warn('[Chapter2BG] 圖片載入失敗：' + key, e); }
  });
}
function getChapter2BgImg(key) {
  const img = chapter2BgImgs[key];
  return (img && img.complete && img.naturalWidth > 0) ? img : null;
}
// v0.3.48：canvas filter 支援偵測（不支援的瀏覽器：跳過 blur / saturate，brightness 改用半透明黑色疊色近似）
let chapter2CanvasFilterOk = null;
function isChapter2CanvasFilterOk() {
  if (chapter2CanvasFilterOk !== null) return chapter2CanvasFilterOk;
  try {
    const c = document.createElement('canvas').getContext('2d');
    c.filter = 'blur(1px)';
    chapter2CanvasFilterOk = !!c && c.filter === 'blur(1px)';
  } catch (e) { chapter2CanvasFilterOk = false; }
  return chapter2CanvasFilterOk;
}
function getChapter2LayerFilter(lay) {
  const A = CHAPTER2_BG, cap = lay.charAt(0).toUpperCase() + lay.slice(1);
  return { blur: Math.max(0, A['chapter2' + cap + 'Blur'] || 0), sat: A['chapter2' + cap + 'Saturation'], bri: A['chapter2' + cap + 'Brightness'] };
}
// 縮放 + 鏡像好的圖塊（快取）；v0.3.48：同時烘焙 blur / saturate / brightness（兩側先畫鏡像鄰居，blur 不會在接縫留淡邊）
function getChapter2BgTile(key, scale, mirrored) {
  const img = getChapter2BgImg(key);
  if (!img) return null;
  const isLayer = key === 'far' || key === 'mid' || key === 'near';
  const fl = isLayer ? getChapter2LayerFilter(key) : null;
  const flKey = fl ? [fl.blur, fl.sat, fl.bri].join(',') : '';
  const ck = key + '|' + scale + '|' + (mirrored ? 1 : 0) + '|' + flKey;
  if (chapter2BgTileCache[ck]) return chapter2BgTileCache[ck];
  const w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
  let tile = img;
  try {
    if (typeof document !== 'undefined' && document.createElement) {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d');
      if (g && typeof g.drawImage === 'function') {
        g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
        if (fl && isChapter2CanvasFilterOk()) {
          // 先把「左鄰 + 本張 + 右鄰」（和鏡像平鋪一致）拼成一條 3 倍寬的圖，再整條一次套 filter、裁中間那張
          // → blur 在接縫處取樣到的就是實際相鄰畫面，不會出現半透明接縫線
          const strip = document.createElement('canvas');
          strip.width = w * 3; strip.height = h;
          const sg = strip.getContext('2d');
          sg.imageSmoothingEnabled = true; sg.imageSmoothingQuality = 'high';
          for (let k = 0; k < 3; k++) {
            const flip = (k === 1) ? mirrored : !mirrored; // 鄰居和本張鏡像狀態相反
            sg.save();
            if (flip) { sg.translate((k + 1) * w, 0); sg.scale(-1, 1); } else { sg.translate(k * w, 0); }
            sg.drawImage(img, 0, 0, w, h);
            sg.restore();
          }
          g.filter = (fl.blur > 0 ? 'blur(' + fl.blur + 'px) ' : '') + 'saturate(' + fl.sat + ') brightness(' + fl.bri + ')';
          g.drawImage(strip, -w, 0);
          g.filter = 'none';
        } else {
          if (mirrored) { g.translate(w, 0); g.scale(-1, 1); }
          g.drawImage(img, 0, 0, w, h);
          if (fl && fl.bri < 1) { // fallback：brightness 用疊色近似；不支援 filter 時 blur / saturate 直接略過
            g.setTransform(1, 0, 0, 1, 0, 0);
            g.globalCompositeOperation = 'source-atop';
            g.fillStyle = 'rgba(0,0,0,' + (1 - fl.bri) + ')';
            g.fillRect(0, 0, w, h);
            g.globalCompositeOperation = 'source-over';
          }
        }
        tile = c;
      }
    }
  } catch (e) { tile = img; }
  const out = { src: tile, w, h, mirroredBaked: tile !== img && mirrored };
  // 舊的同 key 快取（scale 改變時）清掉，避免記憶體累積
  Object.keys(chapter2BgTileCache).forEach(k => { if (k.startsWith(key + '|') && (k.split('|')[1] !== String(scale) || k.split('|')[3] !== flKey)) delete chapter2BgTileCache[k]; });
  chapter2BgTileCache[ck] = out;
  return out;
}
// 單一層：依 cameraX × parallax 水平捲動，鏡像平鋪補滿畫面寬度
function drawChapter2BgLayer(key, scale, offY, ratio, alpha) {
  const t0 = getChapter2BgTile(key, scale, false);
  if (!t0) return false;
  ctx.save();
  ctx.globalAlpha = alpha == null ? 1 : Math.max(0, Math.min(1, alpha));
  const t1 = getChapter2BgTile(key, scale, true) || t0;
  const w = t0.w;
  const shift = Math.max(0, cameraX) * ratio;
  let i = Math.floor(shift / w);
  for (let x = Math.round(i * w - shift); x < CANVAS_W; x += w, i++) {
    const t = (i % 2 === 1) ? t1 : t0;
    if (t.src === getChapter2BgImg(key) && i % 2 === 1) { // 沒有離屏 canvas 時：即時鏡像
      ctx.save(); ctx.translate(x + w, Math.round(offY)); ctx.scale(-1, 1); ctx.drawImage(t.src, 0, 0, w, t.h); ctx.restore();
    } else if (t.src === getChapter2BgImg(key)) {
      ctx.drawImage(t.src, x, Math.round(offY), w, t.h);
    } else {
      ctx.drawImage(t.src, x, Math.round(offY));
    }
  }
  ctx.restore();
  return true;
}
// 背景三層（在 drawWorldInner 最前面呼叫）；回傳 true = far 層已蓋滿畫面（不用再畫藍天）
function drawChapter2ParallaxBg() {
  if (!isChapter2ParallaxStage()) return false; // v0.3.51：素材由 preloadAssetGroup('chapter2') 在進關前載好（這裡不再偷偷觸發載入）
  const A = CHAPTER2_BG;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  // 暖色漸層墊底：far 沒載好時的 fallback，也是 far alpha < 1 時透出來的底色（不是藍天，避免和第二章色調衝突）
  const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  g.addColorStop(0, '#f3c08e'); g.addColorStop(1, '#ffe2bd');
  ctx.fillStyle = g; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  drawChapter2BgLayer('far',  A.chapter2FarScale,  A.chapter2FarOffsetY,  A.chapter2FarParallax,  A.chapter2FarAlpha);
  drawChapter2BgLayer('mid',  A.chapter2MidScale,  A.chapter2MidOffsetY,  A.chapter2MidParallax,  A.chapter2MidAlpha);
  drawChapter2BgLayer('near', A.chapter2NearScale, A.chapter2NearOffsetY, A.chapter2NearParallax, A.chapter2NearAlpha);
  // v0.3.48：可讀性霧幕 — 讓背景整體退後一點（只到地面線，地面另外處理）
  if (A.chapter2ReadabilityVeilEnabled && A.chapter2ReadabilityVeilAlpha > 0) {
    ctx.fillStyle = 'rgba(255,245,230,' + A.chapter2ReadabilityVeilAlpha + ')';
    ctx.fillRect(0, 0, CANVAS_W, GROUND_Y);
  }
  ctx.restore();
  return true;
}
// v0.3.48：第二章地面暫時處理（之後換正式地面 tile）— 只改顏色 / 亮邊 / 陰影，地面高度與凹洞判定完全不變
function drawChapter2GroundBlend() {
  const A = CHAPTER2_BG;
  ctx.save();
  // 地面主體：深暖棕 → 暗橙棕（取代原本綠草 + 土黃）
  const gg = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_H);
  gg.addColorStop(0, '#7a4a28'); gg.addColorStop(1, '#4e2c17');
  ctx.fillStyle = gg; ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);
  // 地平線上方 10px 暖色柔光（背景 → 地面的過渡）
  const hz = ctx.createLinearGradient(0, GROUND_Y - 10, 0, GROUND_Y);
  hz.addColorStop(0, 'rgba(255,200,130,0)'); hz.addColorStop(1, 'rgba(255,200,130,0.28)');
  ctx.fillStyle = hz; ctx.fillRect(0, GROUND_Y - 10, CANVAS_W, 10);
  // 地表下方 18px 漸層陰影
  if (A.chapter2GroundShadowAlpha > 0) {
    const sh = ctx.createLinearGradient(0, GROUND_Y, 0, GROUND_Y + 18);
    sh.addColorStop(0, 'rgba(35,12,0,' + A.chapter2GroundShadowAlpha + ')'); sh.addColorStop(1, 'rgba(35,12,0,0)');
    ctx.fillStyle = sh; ctx.fillRect(0, GROUND_Y, CANVAS_W, 18);
  }
  // 地表上緣 3px 橘金亮邊
  if (A.chapter2GroundEdgeHighlightAlpha > 0) {
    ctx.fillStyle = 'rgba(255,190,90,' + A.chapter2GroundEdgeHighlightAlpha + ')';
    ctx.fillRect(0, GROUND_Y, CANVAS_W, 3);
  }
  ctx.restore();
}
// v0.3.48：互動物件可讀性（只在第二章 parallax 背景時）— 都只是視覺，判定不變
function drawChapter2ItemGlow(x, y, r, strong) {
  const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, strong ? 'rgba(255,255,235,0.75)' : 'rgba(255,255,240,0.55)');
  gr.addColorStop(0.55, 'rgba(255,250,220,0.28)');
  gr.addColorStop(1, 'rgba(255,250,220,0)');
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}
// 小怪落地陰影（畫在小怪之前）
function drawChapter2EnemyShadows(cx) {
  const shadow = (o) => {
    if (!o || o.active === false || o.dead) return;
    const sx = o.x - cx;
    if (sx > CANVAS_W + 60 || sx + (o.w || 40) < -60) return;
    const bx = sx + (o.w || 40) / 2, by = (o.y || 0) + (o.h || 40);
    if (by < 0 || by > CANVAS_H + 10) return;
    const rw = (o.w || 40) * 0.62;
    ctx.beginPath(); ctx.ellipse(bx, by - 1, rw, 6, 0, 0, Math.PI * 2); ctx.fill();
  };
  ctx.save();
  ctx.fillStyle = 'rgba(35,12,0,0.38)';
  [enemies, orangeNemeses, chimneyOranges, dualNozzleOranges, fanOranges, projectileOranges].forEach(arr => { if (Array.isArray(arr)) arr.forEach(shadow); });
  ctx.restore();
}
// ── v0.3.49：正式地面帶 / 凹洞 / 平台 ──
const chapter2CropCache = {};
// 原圖某段（cropX0~cropX1，全高）縮放後的圖塊（可鏡像），快取
function getChapter2CropTile(key, cropX0, cropX1, scale, mirrored) {
  const img = getChapter2BgImg(key);
  if (!img) return null;
  const ck = key + '|' + cropX0 + '|' + cropX1 + '|' + scale + '|' + (mirrored ? 1 : 0);
  if (chapter2CropCache[ck]) return chapter2CropCache[ck];
  const sw = cropX1 - cropX0;
  const w = Math.max(1, Math.round(sw * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
  let out = null;
  try {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    if (mirrored) { g.translate(w, 0); g.scale(-1, 1); }
    g.drawImage(img, cropX0, 0, sw, img.naturalHeight, 0, 0, w, h);
    out = { src: c, w, h };
  } catch (e) { out = null; }
  Object.keys(chapter2CropCache).forEach(k => { if (k.startsWith(key + '|') && k.split('|')[3] !== String(scale)) delete chapter2CropCache[k]; });
  if (out) chapter2CropCache[ck] = out;
  return out;
}
// 地面帶：只畫在 [x0, x1)（世界座標）且土壤上緣在 topY；鏡像平鋪、世界座標固定（和地形同速）
function drawChapter2GroundStrip(x0, x1, topY, cx) {
  const A = CHAPTER2_BG, S = CHAPTER2_TILE_SRC.ground, sc = A.chapter2GroundTileScale;
  const t0 = getChapter2CropTile('groundTile', S.cropX0, S.cropX1, sc, false);
  if (!t0) return false;
  const t1 = getChapter2CropTile('groundTile', S.cropX0, S.cropX1, sc, true) || t0;
  const sx0 = Math.max(x0 - cx, -2), sx1 = Math.min(x1 - cx, CANVAS_W + 2);
  if (sx1 <= sx0) return true;
  const y = Math.round(topY - S.topY * sc);
  ctx.save();
  ctx.beginPath(); ctx.rect(sx0, topY - 30, sx1 - sx0, CANVAS_H - topY + 60); ctx.clip();
  ctx.globalAlpha = Math.max(0, Math.min(1, A.chapter2GroundTileAlpha));
  const w = t0.w, origin = A.chapter2GroundTileRepeatOffsetX;
  let i = Math.floor((sx0 + cx - origin) / w);
  for (let x = Math.round(i * w + origin - cx); x < sx1; x += w, i++) {
    ctx.drawImage((((i % 2) + 2) % 2 === 1) ? t1.src : t0.src, x, y);
  }
  ctx.restore();
  return true;
}
// 地面帶 + 凹洞（取代純色地面）；回傳 false = 地面帶圖沒載好（呼叫端用上一版暫時地面）
function drawChapter2GroundAndPits(cx) {
  if (!getChapter2BgImg('groundTile')) return false;
  const A = CHAPTER2_BG;
  const topY = GROUND_Y + A.chapter2GroundTileOffsetY;
  // 1) 有實體地面的區段（扣掉凹洞）
  const vis0 = cx - 40, vis1 = cx + CANVAS_W + 40;
  const gaps = groundGaps.filter(g => g.x + g.w > vis0 && g.x < vis1).sort((a, b) => a.x - b.x);
  let cur = vis0;
  gaps.forEach(g => { if (g.x > cur) drawChapter2GroundStrip(cur, g.x, topY, cx); cur = Math.max(cur, g.x + g.w); });
  if (cur < vis1) drawChapter2GroundStrip(cur, vis1, topY, cx);
  // 2) 凹洞：坑內底色 → 坑底（地面帶，頂在坑底平台高度）→ 左右邊緣 → U 形陰影
  gaps.forEach(g => {
    const gx = g.x - cx;
    ctx.fillStyle = '#3a2214';
    ctx.fillRect(gx, topY, g.w, CANVAS_H - topY);
    const floorY = (typeof GROUND_GAP_FLOOR_Y !== 'undefined' ? GROUND_GAP_FLOOR_Y : GROUND_Y + 66) + A.chapter2GroundTileOffsetY;
    drawChapter2GroundStrip(g.x, g.x + g.w, floorY, cx);
    drawChapter2PitEdge('left', g, cx, topY);
    drawChapter2PitEdge('right', g, cx, topY);
    drawChapter2PitShadow(g, cx, topY, floorY);
  });
  return true;
}
function drawChapter2PitEdge(side, g, cx, topY) {
  const A = CHAPTER2_BG, left = side === 'left';
  const S = left ? CHAPTER2_TILE_SRC.edgeLeft : CHAPTER2_TILE_SRC.edgeRight;
  const pre = left ? 'chapter2PitEdgeLeft' : 'chapter2PitEdgeRight';
  const sc = A[pre + 'Scale'];
  const t = getChapter2CropTile(left ? 'pitEdgeLeft' : 'pitEdgeRight', S.cropX0, S.cropX1, sc, false);
  if (!t) return; // 載入失敗：跳過邊緣裝飾
  // 崖壁（原圖 cliffX）對齊凹洞邊界，地塊頂（原圖 topY）對齊地面帶頂
  const wallX = left ? g.x : g.x + g.w;
  const x = Math.round(wallX - cx - (S.cliffX - S.cropX0) * sc + A[pre + 'OffsetX']);
  const y = Math.round(topY - S.topY * sc + A[pre + 'OffsetY']);
  ctx.drawImage(t.src, x, y);
}
function drawChapter2PitShadow(g, cx, topY, floorY) {
  const A = CHAPTER2_BG, img = getChapter2BgImg('pitShadow');
  if (!img || A.chapter2PitShadowAlpha <= 0) return;
  const S = CHAPTER2_TILE_SRC.shadow;
  const w = g.w * A.chapter2PitShadowScaleX, h = (floorY - topY + 14) * A.chapter2PitShadowScaleY;
  const x = g.x - cx + (g.w - w) / 2, y = topY + A.chapter2PitShadowOffsetY;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, A.chapter2PitShadowAlpha));
  ctx.drawImage(img, S.x0, S.y0, S.x1 - S.x0, S.y1 - S.y0, x, y, w, h);
  ctx.restore();
}
function isChapter2PitFloorPlatform(p) { return p.y >= GROUND_Y; }
// 平台圖：寬 ≤ 210 用 short、> 210 用 long；等比縮放到平台寬，頂面對齊可踩 y（碰撞不變）
function getChapter2PlatformArtGeom(p) {
  const A = CHAPTER2_BG, isShort = p.w <= CHAPTER2_PLATFORM_SHORT_MAX_W;
  const key = isShort ? 'platformShort' : 'platformLong', pre = isShort ? 'chapter2PlatformShort' : 'chapter2PlatformLong';
  const S = CHAPTER2_TILE_SRC[key];
  const base = p.w / (S.x1 - S.x0);
  const sx = base * A[pre + 'ScaleX'], sy = base * A[pre + 'ScaleY'];
  return { key, isShort, sx, sy, x: p.x - S.x0 * sx + A[pre + 'OffsetX'] + (p.w - (S.x1 - S.x0) * sx) / 2, y: p.y - S.topY * sy + A[pre + 'OffsetY'] };
}
function drawChapter2PlatformArt(p, cx) {
  const g = getChapter2PlatformArtGeom(p);
  const img = getChapter2BgImg(g.key);
  if (!img) return false; // 載入失敗：呼叫端畫原本平台
  ctx.save();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, g.x - cx, g.y, img.naturalWidth * g.sx, img.naturalHeight * g.sy);
  ctx.restore();
  return true;
}
// ── v0.3.49：第二章 BGM（2-1～2-3；單一 Audio，不疊播；和橘子王 BGM 互斥）──
function initChapter2Bgm() {
  if (chapter2Bgm || typeof Audio === 'undefined') return;
  try {
    const a = new Audio();
    a.loop = true; a.preload = 'auto'; a.volume = CHAPTER2_BG.chapter2BgmVolume;
    chapter2BgmStatus = 'loading';
    a.addEventListener('canplaythrough', () => { if (chapter2BgmStatus === 'loading') chapter2BgmStatus = 'ok'; });
    a.addEventListener('error', () => { chapter2BgmStatus = 'error'; console.warn('[Chapter2BGM] 音檔載入失敗：' + CHAPTER2_BGM_PATH); });
    a.src = resolveAdventureAssetSrc(CHAPTER2_BGM_PATH) + '?v=' + encodeURIComponent(GAME_VERSION);
    chapter2Bgm = a;
  } catch (e) { chapter2BgmStatus = 'error'; }
}
function stopChapter2Bgm() {
  const a = chapter2Bgm;
  if (!a) return;
  try { if (!a.paused) a.pause(); if (a.currentTime > 0) a.currentTime = 0; } catch (e) {}
}
function syncChapter2Bgm() {
  if (!isChapter2ParallaxStage()) { stopChapter2Bgm(); return; }
  if (!chapter2Bgm) initChapter2Bgm();
  const a = chapter2Bgm;
  if (!a || chapter2BgmStatus === 'error') return;
  if (gameState === 'failed' || gameState === 'clear' || gameState === 'gameover') { stopChapter2Bgm(); return; }
  if (gameState !== 'playing' && !isRpgDialogKeepingBgm()) { try { if (!a.paused) a.pause(); } catch (e) {} return; } // 暫停：只 pause（v0.3.60：RPG 對話中照常播放）
  if (chapter2BgmWantRestart) { chapter2BgmWantRestart = false; try { a.currentTime = 0; } catch (e) {} }
  try { a.volume = Math.max(0, Math.min(1, CHAPTER2_BG.chapter2BgmVolume)); } catch (e) {}
  if (a.paused && !chapter2BgmBlocked) {
    try {
      const pr = a.play();
      if (pr && typeof pr.catch === 'function') pr.catch(err => {
        if (err && err.name === 'NotAllowedError') {
          chapter2BgmBlocked = true; chapter2BgmStatus = 'blocked';
          const resume = () => { chapter2BgmBlocked = false; if (chapter2BgmStatus === 'blocked') chapter2BgmStatus = 'ok'; };
          window.addEventListener('pointerdown', resume, { once: true });
          window.addEventListener('keydown', resume, { once: true });
        }
      });
    } catch (e) {}
  }
}
function getCurrentBgmName() {
  if (typeof chapter1Bgm !== 'undefined' && chapter1Bgm && !chapter1Bgm.paused) return 'chapter1_balloon_forest_bgm';
  if (chapter2Bgm && !chapter2Bgm.paused) return 'chapter2_orange_factory_bgm';
  if (typeof orangeKingBgm !== 'undefined' && orangeKingBgm && !orangeKingBgm.paused) return 'orange_king_boss_bgm';
  return '（無）';
}

// 單一 prop 的畫面矩形（screen 座標）
function getChapter2FgPropGeom(sid, i, prop) {
  const A = CHAPTER2_BG, S = CHAPTER2_FG_SRC[prop.type];
  const cap = prop.type.charAt(0).toUpperCase() + prop.type.slice(1);
  const ov = chapter2FgOverrides[sid + ':' + i] || {};
  const sc = A['chapter2Fg' + cap + 'Scale'] * A.chapter2FgGlobalScale * (ov.s || 1);
  const cxs = prop.x + (ov.dx || 0) - Math.max(0, cameraX) * A.chapter2FgParallax;
  const baseY = GROUND_Y + A.chapter2FgGroundOffsetY + (ov.dy || 0); // v0.3.48：圖中物件底部對齊地面線（再往下壓一點）
  const o = S.opaque;
  const drawX = cxs - ((o[0] + o[2]) / 2) * sc, drawY = baseY - o[3] * sc;
  return { sc, cxs, baseY, drawX, drawY, drawW: 1254 * sc, drawH: 1254 * sc,
           box: { x: drawX + o[0] * sc, y: drawY + o[1] * sc, w: (o[2] - o[0]) * sc, h: (o[3] - o[1]) * sc },
           alpha: A['chapter2Fg' + cap + 'Alpha'] * A.chapter2FgGlobalAlpha, key: S.key };
}
// 前景點綴（在小V / 敵人之後、HUD 之前）；小V走到後面時自動變淡，保持可讀性
function drawChapter2ForegroundProps() {
  if (!isChapter2ParallaxStage() || !CHAPTER2_BG.chapter2FgEnabled) return;
  const sid = LEVELS[currentLevelIndex].stageId;
  const list = CHAPTER2_FG_PROPS[sid] || [];
  const px = player.x - cameraX, py = player.y;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  list.forEach((prop, i) => {
    const img = getChapter2BgImg(CHAPTER2_FG_SRC[prop.type].key);
    if (!img) return; // 載入失敗就不畫
    const g = getChapter2FgPropGeom(sid, i, prop);
    if (g.drawX > CANVAS_W + 20 || g.drawX + g.drawW < -20) return;
    const behind = px + player.w > g.box.x && px < g.box.x + g.box.w && py + player.h > g.box.y;
    prop._fade = prop._fade == null ? 1 : prop._fade + ((behind ? 0.4 : 1) - prop._fade) * 0.2;
    // 地面接觸陰影（讓物件「站」在地上）
    ctx.globalAlpha = 0.35 * prop._fade;
    ctx.fillStyle = 'rgba(35,12,0,1)';
    ctx.beginPath(); ctx.ellipse(g.box.x + g.box.w / 2, GROUND_Y + 4, g.box.w * 0.5, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = Math.max(0, Math.min(1, g.alpha * prop._fade));
    ctx.drawImage(img, g.drawX, g.drawY, g.drawW, g.drawH);
  });
  ctx.restore();
}

// ── F4（在 2-1～2-3 時切換成第二章背景調整）──
var chapter2BgCalibTarget = 'far';   // far | mid | near | fg | boiler | machine | tree | crates | prop
var chapter2BgCalibPropIdx = 0;
function loadChapter2BgCalib() {
  try {
    const raw = localStorage.getItem(CHAPTER2_BG_LS_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (!d || d.version !== GAME_VERSION) return;
    Object.keys(CHAPTER2_BG_DEFAULTS).forEach(k => { if (d.values && typeof d.values[k] === 'number' && isFinite(d.values[k])) CHAPTER2_BG[k] = d.values[k]; });
    if (d.props && typeof d.props === 'object') chapter2FgOverrides = d.props;
  } catch (e) {}
}
function saveChapter2BgCalib() {
  try { localStorage.setItem(CHAPTER2_BG_LS_KEY, JSON.stringify({ version: GAME_VERSION, values: CHAPTER2_BG, props: chapter2FgOverrides })); } catch (e) {}
}
if (typeof ADVENTURE_TEST_TOOLS_ENABLED !== 'undefined' && ADVENTURE_TEST_TOOLS_ENABLED) loadChapter2BgCalib();
function getChapter2BgCalibText() {
  const A = CHAPTER2_BG, r = v => Math.round(v * 1000) / 1000;
  let t = 'const CHAPTER2_BG_DEFAULTS = {\n';
  Object.keys(CHAPTER2_BG_DEFAULTS).forEach(k => { t += `  ${k}: ${r(A[k])},\n`; });
  t += '};\n// 單一 prop 微調（stage:index → dx / dy / s）\nconst CHAPTER2_FG_OVERRIDES = ' + JSON.stringify(chapter2FgOverrides) + ';';
  t += '\n// v0.3.50：道具圖示 / 通用過關旗\nconst ADVENTURE_ITEM_ICON_DEFAULTS = {\n';
  Object.keys(ADVENTURE_ITEM_ICON_DEFAULTS).forEach(k => { t += `  ${k}: ${Math.round(ADVENTURE_ITEM_ICON[k] * 10000) / 10000},\n`; });
  t += '};';
  return t;
}
function handleChapter2BgCalibKey(e) {
  const A = CHAPTER2_BG, D = CHAPTER2_BG_DEFAULTS;
  const step = e.shiftKey ? 10 : 1, sStep = e.shiftKey ? 0.05 : 0.01;
  const sel = { Digit1: 'far', Digit2: 'mid', Digit3: 'near', Digit4: 'fg', Digit5: 'boiler', Digit6: 'machine', Digit7: 'tree', Digit8: 'crates', Digit9: 'prop',
                Digit0: 'veil', KeyG: 'ground',
                KeyT: 'tile', KeyJ: 'edgeL', KeyK: 'edgeR', KeyL: 'pitShadow', KeyU: 'platShort', KeyO: 'platLong', KeyM: 'bgm',
                KeyY: 'icoCoin', KeyI: 'ico260', KeyP: 'icoRound', KeyF: 'icoFlag' }[e.code];
  const done = () => { saveChapter2BgCalib(); e.preventDefault(); return true; };
  if (sel) { chapter2BgCalibTarget = sel; e.preventDefault(); return true; }
  const tg = chapter2BgCalibTarget;
  const sid = (LEVELS[currentLevelIndex] || {}).stageId;
  const props = CHAPTER2_FG_PROPS[sid] || [];
  if (e.code === 'KeyN') { chapter2BgCalibPropIdx = (chapter2BgCalibPropIdx + 1) % Math.max(1, props.length); chapter2BgCalibTarget = 'prop'; e.preventDefault(); return true; }
  if (e.code === 'KeyH') { A.chapter2FgEnabled = A.chapter2FgEnabled ? 0 : 1; return done(); }
  // v0.3.48：X = 目前項目開 / 關（霧幕 / 地面處理 / 前景）
  if (e.code === 'KeyX') {
    if (tg === 'veil') A.chapter2ReadabilityVeilEnabled = A.chapter2ReadabilityVeilEnabled ? 0 : 1;
    else if (tg === 'ground') A.chapter2GroundBlendEnabled = A.chapter2GroundBlendEnabled ? 0 : 1;
    else A.chapter2FgEnabled = A.chapter2FgEnabled ? 0 : 1;
    return done();
  }
  const dy = e.code === 'KeyW' ? -step : (e.code === 'KeyS' ? step : 0);
  const dxp = e.code === 'KeyA' ? -1 : (e.code === 'KeyD' ? 1 : 0);
  const ds = e.code === 'BracketLeft' ? -sStep : (e.code === 'BracketRight' ? sStep : 0);
  const da = e.code === 'KeyQ' ? -0.05 : (e.code === 'KeyE' ? 0.05 : 0);
  const lay = { far: 'Far', mid: 'Mid', near: 'Near' }[tg];
  // v0.3.48：; ' blur、, . saturation、- = brightness（每次 0.5px / 0.05）
  const dbl = e.code === 'Semicolon' ? -0.5 : (e.code === 'Quote' ? 0.5 : 0);
  const dsat = e.code === 'Comma' ? -0.05 : (e.code === 'Period' ? 0.05 : 0);
  const dbri = e.code === 'Minus' ? -0.01 : (e.code === 'Equal' ? 0.01 : 0);
  const r2 = v => Math.round(v * 100) / 100;
  if (lay && (da || dbl || dsat || dbri)) {
    if (da)   A['chapter2' + lay + 'Alpha'] = Math.max(0.1, Math.min(1, r2(A['chapter2' + lay + 'Alpha'] + da)));
    if (dbl)  A['chapter2' + lay + 'Blur'] = Math.max(0, Math.min(8, r2(A['chapter2' + lay + 'Blur'] + dbl)));
    if (dsat) A['chapter2' + lay + 'Saturation'] = Math.max(0, Math.min(2, r2(A['chapter2' + lay + 'Saturation'] + dsat)));
    if (dbri) A['chapter2' + lay + 'Brightness'] = Math.max(0.3, Math.min(1.5, r2(A['chapter2' + lay + 'Brightness'] + dbri)));
    return done();
  }
  // v0.3.50：道具圖示 / 過關旗（全章節通用；在 2-1～2-3 的 F4 調，數值所有關卡共用）
  const icoPre = { icoCoin: 'coinIcon', ico260: 'balloon260Icon', icoRound: 'balloonRoundIcon', icoFlag: 'goalFlag' }[tg];
  if (icoPre && (dy || dxp || ds || da)) {
    const I = ADVENTURE_ITEM_ICON;
    I[icoPre + 'OffsetY'] += dy; I[icoPre + 'OffsetX'] += dxp * step;
    if (ds) I[icoPre + 'Scale'] = Math.max(0.002, Math.round((I[icoPre + 'Scale'] + (ds > 0 ? 1 : -1) * (e.shiftKey ? 0.005 : 0.001)) * 10000) / 10000);
    if (da) {
      if (icoPre === 'coinIcon') I.coinIconGlowAlpha = Math.max(0, Math.min(1, r2(I.coinIconGlowAlpha + da)));
      if (icoPre === 'goalFlag') I.goalFlagAlpha = Math.max(0.1, Math.min(1, r2(I.goalFlagAlpha + da)));
    }
    saveAdventureItemIconCalib(); e.preventDefault(); return true;
  }
  // v0.3.49：地面帶 / 凹洞 / 平台 / BGM
  if (tg === 'tile' && (dy || dxp || ds || da)) {
    A.chapter2GroundTileOffsetY += dy;
    if (dxp) A.chapter2GroundTileRepeatOffsetX += dxp * step;
    if (ds) A.chapter2GroundTileScale = Math.max(0.03, Math.round((A.chapter2GroundTileScale + ds / 5) * 1000) / 1000);
    if (da) A.chapter2GroundTileAlpha = Math.max(0.1, Math.min(1, r2(A.chapter2GroundTileAlpha + da)));
    return done();
  }
  const ePre = { edgeL: 'chapter2PitEdgeLeft', edgeR: 'chapter2PitEdgeRight' }[tg];
  if (ePre && (dy || dxp || ds)) {
    A[ePre + 'OffsetY'] += dy; A[ePre + 'OffsetX'] += dxp * step;
    if (ds) A[ePre + 'Scale'] = Math.max(0.03, Math.round((A[ePre + 'Scale'] + ds / 5) * 1000) / 1000);
    return done();
  }
  if (tg === 'pitShadow' && (dy || ds || dbl || da)) {
    A.chapter2PitShadowOffsetY += dy;
    if (ds) A.chapter2PitShadowScaleX = Math.max(0.2, r2(A.chapter2PitShadowScaleX + ds));
    if (dbl) A.chapter2PitShadowScaleY = Math.max(0.2, r2(A.chapter2PitShadowScaleY + (dbl > 0 ? 0.01 : -0.01) * (e.shiftKey ? 5 : 1)));
    if (da) A.chapter2PitShadowAlpha = Math.max(0, Math.min(1, r2(A.chapter2PitShadowAlpha + da)));
    return done();
  }
  const pPre = { platShort: 'chapter2PlatformShort', platLong: 'chapter2PlatformLong' }[tg];
  if (pPre && (dy || dxp || ds || dbl)) {
    A[pPre + 'OffsetY'] += dy; A[pPre + 'OffsetX'] += dxp * step;
    if (ds) A[pPre + 'ScaleX'] = Math.max(0.2, r2(A[pPre + 'ScaleX'] + ds));
    if (dbl) A[pPre + 'ScaleY'] = Math.max(0.2, r2(A[pPre + 'ScaleY'] + (dbl > 0 ? 0.01 : -0.01) * (e.shiftKey ? 5 : 1)));
    return done();
  }
  if (tg === 'bgm' && da) { A.chapter2BgmVolume = Math.max(0, Math.min(1, r2(A.chapter2BgmVolume + da / 2.5))); return done(); }
  if (tg === 'veil' && da) { A.chapter2ReadabilityVeilAlpha = Math.max(0, Math.min(0.6, r2(A.chapter2ReadabilityVeilAlpha + da / 5))); return done(); }
  if (tg === 'ground' && (da || dbl)) {
    if (da)  A.chapter2GroundEdgeHighlightAlpha = Math.max(0, Math.min(1, r2(A.chapter2GroundEdgeHighlightAlpha + da)));
    if (dbl) A.chapter2GroundShadowAlpha = Math.max(0, Math.min(1, r2(A.chapter2GroundShadowAlpha + (dbl > 0 ? 0.05 : -0.05))));
    return done();
  }
  if (lay && (dy || dxp || ds)) {
    A['chapter2' + lay + 'OffsetY'] += dy;
    if (dxp) A['chapter2' + lay + 'Parallax'] = Math.max(0, Math.min(1.5, Math.round((A['chapter2' + lay + 'Parallax'] + dxp * (e.shiftKey ? 0.05 : 0.01)) * 100) / 100));
    if (ds) A['chapter2' + lay + 'Scale'] = Math.max(0.1, Math.round((A['chapter2' + lay + 'Scale'] + ds) * 1000) / 1000);
    return done();
  }
  if (tg === 'fg' && (dy || dxp || ds || da)) { // v0.3.48：前景全域（地面偏移 / 全域 scale / 全域 alpha / 視差）
    A.chapter2FgGroundOffsetY += dy;
    if (dxp) A.chapter2FgParallax = Math.max(0.5, Math.min(1.5, Math.round((A.chapter2FgParallax + dxp * 0.01) * 100) / 100));
    if (ds) A.chapter2FgGlobalScale = Math.max(0.2, Math.round((A.chapter2FgGlobalScale + ds) * 100) / 100);
    if (da) A.chapter2FgGlobalAlpha = Math.max(0.1, Math.min(1, Math.round((A.chapter2FgGlobalAlpha + da) * 100) / 100));
    return done();
  }
  if (CHAPTER2_FG_TYPES.includes(tg) && (ds || da)) {
    const cap = tg.charAt(0).toUpperCase() + tg.slice(1);
    if (ds) A['chapter2Fg' + cap + 'Scale'] = Math.max(0.02, Math.round((A['chapter2Fg' + cap + 'Scale'] + ds / 10) * 1000) / 1000);
    if (da) A['chapter2Fg' + cap + 'Alpha'] = Math.max(0.1, Math.min(1, Math.round((A['chapter2Fg' + cap + 'Alpha'] + da) * 100) / 100));
    return done();
  }
  if (tg === 'prop' && props.length && (dy || dxp || ds)) {
    const k = sid + ':' + chapter2BgCalibPropIdx;
    const ov = chapter2FgOverrides[k] || (chapter2FgOverrides[k] = { dx: 0, dy: 0, s: 1 });
    ov.dy += dy; ov.dx += dxp * step;
    if (ds) ov.s = Math.max(0.2, Math.round((ov.s + ds) * 100) / 100);
    return done();
  }
  if (e.code === 'KeyR') {
    const keysBy = { far: Object.keys(D).filter(k => k.startsWith('chapter2Far')), mid: Object.keys(D).filter(k => k.startsWith('chapter2Mid')),
      near: Object.keys(D).filter(k => k.startsWith('chapter2Near')),
      fg: ['chapter2FgEnabled', 'chapter2FgParallax', 'chapter2FgGroundOffsetY', 'chapter2FgGlobalScale', 'chapter2FgGlobalAlpha'],
      veil: ['chapter2ReadabilityVeilEnabled', 'chapter2ReadabilityVeilAlpha'],
      ground: ['chapter2GroundBlendEnabled', 'chapter2GroundEdgeHighlightAlpha', 'chapter2GroundShadowAlpha'],
      tile: Object.keys(D).filter(k => k.startsWith('chapter2GroundTile')), edgeL: Object.keys(D).filter(k => k.startsWith('chapter2PitEdgeLeft')),
      edgeR: Object.keys(D).filter(k => k.startsWith('chapter2PitEdgeRight')), pitShadow: Object.keys(D).filter(k => k.startsWith('chapter2PitShadow')),
      platShort: Object.keys(D).filter(k => k.startsWith('chapter2PlatformShort')), platLong: Object.keys(D).filter(k => k.startsWith('chapter2PlatformLong')),
      bgm: ['chapter2BgmVolume'] };
    CHAPTER2_FG_TYPES.forEach(ty => { const cap = ty.charAt(0).toUpperCase() + ty.slice(1); keysBy[ty] = ['chapter2Fg' + cap + 'Scale', 'chapter2Fg' + cap + 'Alpha']; });
    const icoReset = { icoCoin: 'coinIcon', ico260: 'balloon260Icon', icoRound: 'balloonRoundIcon', icoFlag: 'goalFlag' }[tg];
    if (icoReset) { Object.keys(ADVENTURE_ITEM_ICON_DEFAULTS).filter(k => k.startsWith(icoReset)).forEach(k => { ADVENTURE_ITEM_ICON[k] = ADVENTURE_ITEM_ICON_DEFAULTS[k]; }); saveAdventureItemIconCalib(); }
    if (tg === 'prop') delete chapter2FgOverrides[sid + ':' + chapter2BgCalibPropIdx];
    else (keysBy[tg] || []).forEach(k => { A[k] = D[k]; });
    showHint('↺ 已重置：' + tg, 120);
    return done();
  }
  if (e.code === 'KeyC') {
    const text = getChapter2BgCalibText();
    console.log('[Chapter2BgCalib]\n' + text);
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(() => {}); } catch (err) {}
    showHint('📋 第二章背景數值已輸出到 console（也嘗試複製到剪貼簿）', 180);
    e.preventDefault(); return true;
  }
  // 方向鍵 / 空白鍵 / Z 留給小V（可邊跑邊看視差）；其他調整鍵不傳給遊戲
  if (/^Digit/.test(e.code) || ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ', 'KeyE', 'KeyN', 'KeyH', 'KeyX', 'KeyG', 'KeyT', 'KeyJ', 'KeyK', 'KeyL', 'KeyU', 'KeyO', 'KeyM', 'KeyY', 'KeyI', 'KeyP', 'KeyF', 'BracketLeft', 'BracketRight',
       'Semicolon', 'Quote', 'Comma', 'Period', 'Minus', 'Equal'].includes(e.code)) { e.preventDefault(); return true; }
  return false;
}
function drawChapter2BgCalibOverlay() {
  const A = CHAPTER2_BG;
  const sid = (LEVELS[currentLevelIndex] || {}).stageId;
  const props = CHAPTER2_FG_PROPS[sid] || [];
  ctx.save();
  // 前景 prop 外框（選中的 prop 用黃色）
  props.forEach((prop, i) => {
    const g = getChapter2FgPropGeom(sid, i, prop);
    if (g.drawX > CANVAS_W + 20 || g.drawX + g.drawW < -20) return;
    const selP = chapter2BgCalibTarget === 'prop' && i === chapter2BgCalibPropIdx;
    const selT = chapter2BgCalibTarget === prop.type || chapter2BgCalibTarget === 'fg';
    ctx.setLineDash([6, 3]);
    ctx.strokeStyle = selP ? '#ffe066' : (selT ? '#00ffc8' : 'rgba(255,255,255,0.6)');
    ctx.lineWidth = selP ? 3 : 1.5;
    ctx.strokeRect(g.box.x, g.box.y, g.box.w, g.box.h);
    ctx.setLineDash([]);
    ctx.font = 'bold 11px monospace'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText('#' + i + ' ' + prop.type, g.cxs, g.box.y - 4);
  });
  // v0.3.50：道具 / 過關旗預覽（固定畫在畫面中央；綠框 = 原本的拾取 / 過關判定範圍）
  const icoT = chapter2BgCalibTarget;
  if (icoT === 'icoCoin' || icoT === 'ico260' || icoT === 'icoRound' || icoT === 'icoFlag') {
    const px0 = 560, py0 = 330;
    ctx.save();
    ctx.strokeStyle = '#3dff6a'; ctx.lineWidth = 2;
    if (icoT === 'icoCoin')  { drawCoin(px0, py0); ctx.strokeRect(px0 - CONFIG.COIN_R, py0 - CONFIG.COIN_R, CONFIG.COIN_R * 2, CONFIG.COIN_R * 2); }
    if (icoT === 'ico260')   { drawBalloon260(px0, py0); ctx.strokeRect(px0 - CONFIG.BALLOON_W / 2, py0 - CONFIG.BALLOON_H / 2, CONFIG.BALLOON_W, CONFIG.BALLOON_H); }
    if (icoT === 'icoRound') { drawRoundBalloon(px0, py0); ctx.strokeRect(px0 - 16, py0 - 16, 32, 32); }
    if (icoT === 'icoFlag')  {
      const fx = 700;
      drawFinishFlag(FINISH_X - fx); // 以 cx = FINISH_X - fx 呼叫 → 旗子畫在畫面 x = fx
      ctx.beginPath(); ctx.moveTo(fx, GROUND_Y - 200); ctx.lineTo(fx, GROUND_Y + 10); ctx.stroke(); // 過關判定線（FINISH_X）
      ctx.strokeStyle = '#ff2bd6'; ctx.beginPath(); ctx.moveTo(fx - 60, GROUND_Y); ctx.lineTo(fx + 140, GROUND_Y); ctx.stroke(); // 地面線
    }
    ctx.strokeStyle = '#ff2bd6'; ctx.lineWidth = 1;
    if (icoT !== 'icoFlag') { ctx.beginPath(); ctx.moveTo(px0 - 30, py0); ctx.lineTo(px0 + 30, py0); ctx.moveTo(px0, py0 - 30); ctx.lineTo(px0, py0 + 30); ctx.stroke(); }
    ctx.restore();
  }
  // v0.3.49：平台碰撞框（綠）＋ 平台圖頂面（粉線）— 選到 U / O 時
  if (chapter2BgCalibTarget === 'platShort' || chapter2BgCalibTarget === 'platLong') {
    platforms.forEach(p => {
      if (isChapter2PitFloorPlatform(p)) return;
      const sx = p.x - cameraX;
      if (sx > CANVAS_W || sx + p.w < 0) return;
      const g = getChapter2PlatformArtGeom(p);
      const sel = (chapter2BgCalibTarget === 'platShort') === g.isShort;
      ctx.strokeStyle = sel ? '#3dff6a' : 'rgba(61,255,106,0.4)'; ctx.lineWidth = sel ? 2 : 1;
      ctx.strokeRect(sx, p.y, p.w, p.h);
      ctx.font = 'bold 11px monospace'; ctx.fillStyle = sel ? '#3dff6a' : 'rgba(255,255,255,0.6)'; ctx.textAlign = 'left';
      ctx.fillText((g.isShort ? 'short' : 'long') + ' w' + p.w, sx, p.y - 4);
    });
  }
  // 凹洞範圍（確認前景沒擋到）
  groundGaps.forEach(gp => {
    const gx = gp.x - cameraX;
    if (gx > CANVAS_W || gx + gp.w < 0) return;
    ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = 2; ctx.strokeRect(gx, GROUND_Y, gp.w, CANVAS_H - GROUND_Y);
  });
  ctx.strokeStyle = 'rgba(0,255,200,0.7)'; ctx.setLineDash([8, 6]);
  ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(CANVAS_W, GROUND_Y); ctx.stroke(); ctx.setLineDash([]);
  const shiftOf = (lay) => { const img = getChapter2BgImg(lay); const w = img ? Math.round(img.naturalWidth * A['chapter2' + lay.charAt(0).toUpperCase() + lay.slice(1) + 'Scale']) : 0;
    return w ? Math.round((Math.max(0, cameraX) * A['chapter2' + lay.charAt(0).toUpperCase() + lay.slice(1) + 'Parallax']) % w) : '-'; };
  const st = k => chapter2BgImgStatus[k] || '-';
  const fgN = props.filter(p => getChapter2BgImg(CHAPTER2_FG_SRC[p.type].key)).length;
  const tLabel = { far: '1 遠景 far', mid: '2 中景 mid', near: '3 近景 near', fg: '4 前景全域', boiler: '5 前景 boiler', machine: '6 前景 machine', tree: '7 前景 tree', crates: '8 前景 crates', prop: '9 單一 prop #' + chapter2BgCalibPropIdx,
                   veil: '0 可讀性霧幕', ground: 'G 地面暫時處理（fallback）', tile: 'T 地面帶', edgeL: 'J 凹洞左邊緣', edgeR: 'K 凹洞右邊緣',
                   pitShadow: 'L 坑洞陰影', platShort: 'U 短平台圖', platLong: 'O 長平台圖', bgm: 'M 第二章 BGM 音量',
                   icoCoin: 'Y 金幣圖示（全關卡）', ico260: 'I 260 氣球圖示（全關卡）', icoRound: 'P 圓氣球圖示（全關卡）', icoFlag: 'F 通用過關旗（全關卡）' }[chapter2BgCalibTarget];
  const fx = l => { const c = l.charAt(0).toUpperCase() + l.slice(1); return '  α' + A['chapter2' + c + 'Alpha'] + ' blur ' + A['chapter2' + c + 'Blur'] + ' sat ' + A['chapter2' + c + 'Saturation'] + ' bri ' + A['chapter2' + c + 'Brightness']; };
  const ov = chapter2FgOverrides[sid + ':' + chapter2BgCalibPropIdx] || { dx: 0, dy: 0, s: 1 };
  const lines = [
    'Chapter 2 Parallax BG Calibration ON（F4 關閉）　parallax 啟用：' + (isChapter2ParallaxStage() ? 'YES' : 'NO') + '　' + sid + '　cameraX ' + Math.round(cameraX),
    'Target: ' + tLabel,
    'far : offsetY ' + A.chapter2FarOffsetY + '  scale ' + A.chapter2FarScale + '  parallax ' + A.chapter2FarParallax + '  位移 ' + shiftOf('far') + fx('far'),
    'mid : offsetY ' + A.chapter2MidOffsetY + '  scale ' + A.chapter2MidScale + '  parallax ' + A.chapter2MidParallax + '  位移 ' + shiftOf('mid') + fx('mid'),
    'near: offsetY ' + A.chapter2NearOffsetY + '  scale ' + A.chapter2NearScale + '  parallax ' + A.chapter2NearParallax + '  位移 ' + shiftOf('near') + fx('near'),
    '霧幕 ' + (A.chapter2ReadabilityVeilEnabled ? 'ON' : 'OFF') + ' α' + A.chapter2ReadabilityVeilAlpha + '　地面處理 ' + (A.chapter2GroundBlendEnabled ? 'ON' : 'OFF') + ' 亮邊α' + A.chapter2GroundEdgeHighlightAlpha + ' 陰影α' + A.chapter2GroundShadowAlpha
      + '　canvas filter ' + (isChapter2CanvasFilterOk() ? '支援' : '不支援（fallback）'),
    'fg  : ' + (A.chapter2FgEnabled ? '顯示' : '隱藏') + '  數量 ' + fgN + '/' + props.length + '  parallax ' + A.chapter2FgParallax + '  地面偏移 +' + A.chapter2FgGroundOffsetY + '  全域 ×' + A.chapter2FgGlobalScale + ' α' + A.chapter2FgGlobalAlpha
      + '  prop#' + chapter2BgCalibPropIdx + ' dx ' + ov.dx + ' dy ' + ov.dy + ' ×' + ov.s,
    '      boiler ×' + A.chapter2FgBoilerScale + ' α' + A.chapter2FgBoilerAlpha + '  machine ×' + A.chapter2FgMachineScale + ' α' + A.chapter2FgMachineAlpha
      + '  tree ×' + A.chapter2FgTreeScale + ' α' + A.chapter2FgTreeAlpha + '  crates ×' + A.chapter2FgCratesScale + ' α' + A.chapter2FgCratesAlpha,
    '地面帶 offY ' + A.chapter2GroundTileOffsetY + ' ×' + A.chapter2GroundTileScale + ' α' + A.chapter2GroundTileAlpha + ' repX ' + A.chapter2GroundTileRepeatOffsetX
      + '｜邊緣L ' + A.chapter2PitEdgeLeftOffsetX + ',' + A.chapter2PitEdgeLeftOffsetY + ' ×' + A.chapter2PitEdgeLeftScale
      + '  R ' + A.chapter2PitEdgeRightOffsetX + ',' + A.chapter2PitEdgeRightOffsetY + ' ×' + A.chapter2PitEdgeRightScale
      + '｜陰影 offY ' + A.chapter2PitShadowOffsetY + ' ×' + A.chapter2PitShadowScaleX + '/' + A.chapter2PitShadowScaleY + ' α' + A.chapter2PitShadowAlpha,
    '平台 short ' + A.chapter2PlatformShortOffsetX + ',' + A.chapter2PlatformShortOffsetY + ' ×' + A.chapter2PlatformShortScaleX + '/' + A.chapter2PlatformShortScaleY
      + '  long ' + A.chapter2PlatformLongOffsetX + ',' + A.chapter2PlatformLongOffsetY + ' ×' + A.chapter2PlatformLongScaleX + '/' + A.chapter2PlatformLongScaleY
      + '｜BGM vol ' + A.chapter2BgmVolume + '  ' + chapter2BgmStatus + '  播放中：' + getCurrentBgmName(),
    (() => { const I = ADVENTURE_ITEM_ICON, s2 = k => adventureItemIconStatus[k] || '-';
      return '道具圖：coin=' + s2('coin') + ' ×' + I.coinIconScale + ' ' + I.coinIconOffsetX + ',' + I.coinIconOffsetY + ' glow' + I.coinIconGlowAlpha
        + '｜260=' + s2('b260') + ' ×' + I.balloon260IconScale + ' ' + I.balloon260IconOffsetX + ',' + I.balloon260IconOffsetY
        + '｜round=' + s2('round') + ' ×' + I.balloonRoundIconScale + ' ' + I.balloonRoundIconOffsetX + ',' + I.balloonRoundIconOffsetY
        + '｜flag=' + s2('goalFlag') + ' ×' + I.goalFlagScale + ' ' + I.goalFlagOffsetX + ',' + I.goalFlagOffsetY + ' α' + I.goalFlagAlpha; })(),
    ...Object.keys(ADVENTURE_ITEM_ICON_PATHS).map(k => { const i = adventureItemIconInfo[k] || {}; // v0.3.50-fix-1：完整網址 / 狀態 / 尺寸
      const last = (i.tried || []).slice(-1)[0];
      return '  ' + k + '：' + (adventureItemIconStatus[k] || '-') + (i.w ? ' ' + i.w + '×' + i.h : '') + '  ' + (i.url || (last ? last.url : getAdventureItemIconCandidates(k)[0])); }),
    '素材：ground=' + st('groundTile') + ' edgeL=' + st('pitEdgeLeft') + ' edgeR=' + st('pitEdgeRight') + ' shadow=' + st('pitShadow')
      + ' platShort=' + st('platformShort') + ' platLong=' + st('platformLong') + ' bgm=' + chapter2BgmStatus,
    '圖片：far=' + st('far') + ' mid=' + st('mid') + ' near=' + st('near') + '  boiler=' + st('fgBoiler') + ' machine=' + st('fgMachine') + ' tree=' + st('fgTree') + ' crates=' + st('fgCrates'),
    '1 2 3 層｜4 前景全域｜5~8 前景種類｜9 / N 單一 prop｜0 霧幕｜G 地面｜W S 上下｜A D 視差 / prop 左右｜[ ] scale｜Q E 透明度',
    '層：; \' blur　, . 飽和度　- = 亮度｜X 開關（霧幕 / 地面 / 前景）｜H 前景｜R 重置｜C 輸出',
    'T 地面帶（W S 上下　A D 平鋪起點　[ ] scale　Q E α）｜J K 凹洞左 / 右邊緣（W S A D　[ ] scale）',
    'L 坑洞陰影（W S　[ ] 寬　; \' 高　Q E α）｜U O 短 / 長平台（W S A D　[ ] 寬　; \' 高）｜M BGM 音量（Q E）',
    'Y 金幣　I 260　P 圓氣球　F 過關旗（W S A D 位置　[ ] scale　Q E 金幣外光 / 旗透明度）— 預覽：畫面中央固定顯示 ＋ 綠框 = 拾取 / 過關判定',
    '方向鍵 / 空白 / Z 仍可操作小V（邊跑邊看視差）　紅框 = 凹洞　青虛線 = 地面線',
  ];
  // v0.3.50：選道具圖示 / 過關旗時，面板只留相關的幾行（不擋住中間的預覽）
  if (/^ico/.test(chapter2BgCalibTarget)) {
    const keep = lines.filter((ln, i) => i < 2 || /^道具圖|^Y 金幣|^  (coin|b260|round|goalFlag)：/.test(ln));
    lines.length = 0; keep.forEach(l => lines.push(l));
  }
  const w = 920, lh = 17, h = lines.length * lh + 12;
  ctx.fillStyle = 'rgba(0,0,0,0.78)';
  ctx.fillRect(10, 64, w, h);
  ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left';
  lines.forEach((ln, i) => { ctx.fillStyle = i === 0 ? '#00ffc8' : (i === 1 ? '#ffe066' : '#ffffff'); ctx.fillText(ln, 18, 64 + 18 + i * lh); });
  ctx.restore();
}

// ══ v0.3.52：第一章正式背景（1-1～1-3）— far / mid / near 三層 parallax + 地面裝飾小物件 ══
// 素材由 preloadAssetGroup('chapter1') 在開機 / 進關前載好（3 層背景 critical、4 個小物件 optional）
// v0.3.54-fix-1：正式第一章流程的「第 2 節」是 stageId '1-2b'（氣球小狗尋寶，見 CHAPTER1_FLOW_LEVEL_INDICES），
//   之前只寫了 '1-2'（舊的橘子果園關，不在正式流程裡）→ 玩家玩到的 1-2 沒套到第一章美術 / BGM
const CHAPTER1_BG_STAGE_IDS = ['1-1', '1-2', '1-2b', '1-3'];
// 第一章正式關卡（流程表裡的 1-1 / 1-2b / 1-3，加上舊 1-2）；不含 1-4、測試關、第二章、Boss
function isChapter1MainStage(stageId) {
  return CHAPTER1_BG_STAGE_IDS.includes(stageId);
}
const CHAPTER1_BG_ASSETS = {
  far:  'assets/adventure/backgrounds/chapter1/chapter1_bg_far.png',   // 1774×887 不透明
  mid:  'assets/adventure/backgrounds/chapter1/chapter1_bg_mid.png',   // 1774×887 透明（有畫面 y 148～744）
  near: 'assets/adventure/backgrounds/chapter1/chapter1_bg_near.png',  // 1774×887 透明（左右兩側大樹框景、中間空、底部籬笆花叢）
};
const CHAPTER1_FG_ASSETS = {
  fgFlowerHill:    'assets/adventure/backgrounds/chapter1/foreground/chapter1_fg_flower_hill.png',
  fgBalloonRabbit: 'assets/adventure/backgrounds/chapter1/foreground/chapter1_fg_balloon_rabbit_blue.png',
  fgGiftPile:      'assets/adventure/backgrounds/chapter1/foreground/chapter1_fg_gift_pile.png',
  fgArrowSign:     'assets/adventure/backgrounds/chapter1/foreground/chapter1_fg_arrow_sign.png',
};
// 量自原圖：小物件（1254×1254）有畫面的範圍 [x0, y0, x1, y1]（alpha > 16）
const CHAPTER1_FG_SRC = {
  flowerHill:    { key: 'fgFlowerHill',    scaleKey: 'fgFlowerHillScale',    opaque: [58, 54, 1212, 1207] },
  balloonRabbit: { key: 'fgBalloonRabbit', scaleKey: 'fgBalloonRabbitScale', opaque: [74, 54, 1180, 1211] },
  giftPile:      { key: 'fgGiftPile',      scaleKey: 'fgGiftPileScale',      opaque: [45, 72, 1226, 1192] },
  arrowSign:     { key: 'fgArrowSign',     scaleKey: 'fgArrowSignScale',     opaque: [178, 34, 1173, 1209] },
};
const CHAPTER1_FG_TYPES = ['flowerHill', 'balloonRabbit', 'giftPile', 'arrowSign'];
// scale = 相對原圖像素（1774×887 / 1254×1254）的倍率
const CHAPTER1_BG_DEFAULTS = {
  // v0.3.52-fix-1：背景退後（靠 alpha / 飽和度 / 暖白霧幕，不靠 blur），玩法物件更清楚
  // far：cover 畫面高 540（887 × 0.609 = 540 → 1080×540），鏡像平鋪，最慢
  // v0.3.54：視差必須「越近越快」：far 0.03 < mid 0.06 < near（≈0.084）< 玩法層 1.0
  //   之前 far 0.12 / mid 0.32 都比 near（0.068）快 → 近景框看起來像「跟著小V往右、又慢慢往左」（深度順序顛倒的錯覺）
  farParallax: 0.03, farScale: 0.609, farOffsetY: 0,
  // mid：× 0.36（639×319），浮島主體在 y 203～418，雲朵底部藏在地面線附近，上半畫面留給天空
  midParallax: 0.06, midScale: 0.36, midOffsetY: 150,
  // v0.3.53：near = 大型樹洞 / 樹冠框景（單張、不平鋪）。× 0.75（1331×665），offsetY -60 → 畫面 y -60～605，上下緣都蓋滿（不會露出切口）
  //   框景模式：整關從起點到終點只橫移「圖寬 − 畫面寬」= 371px；實際移動率 = min(nearParallax, 371 ÷ 鏡頭最大位移)
  //   （6400 長的關卡 ≈ 0.068；要真的到 0.10 需要 nearScale ≥ 0.85，上下會被裁掉更多樹冠 / 籬笆）
  // v0.3.54：near = 單張不平鋪的前框景。× 0.80（1419×710），offsetY -85 → 畫面 y -85～625，上下緣完整蓋滿
  //   X 位移只看「關卡進度」：nearX = −(cameraX ÷ 鏡頭最大位移) × (圖寬 − 畫面寬)，只會往左、單調、不反轉，clamp 不露邊
  //   6400 長的關卡整關只左移 459px（≈ 0.084 倍鏡頭速度）；nearParallax 只當上限（0 = 完全固定）
  nearParallax: 0.10, nearScale: 0.80, nearOffsetY: -85, nearFrameMode: 1,
  // 濾鏡（快取圖塊時套用一次）：blur 全部 0（避免整片糊）
  // v0.3.53-fix-1：三層都不再整張變淡 / 降飽和（畫面恢復飽和、明亮），退後只靠很輕的暖白霧幕 + 玩法物件外光
  farAlpha: 1,  farBlur: 0, farSaturation: 1,    farBrightness: 1,
  midAlpha: 1,  midBlur: 0, midSaturation: 0.95, midBrightness: 1,
  nearAlpha: 1, nearBlur: 0, nearSaturation: 1,    nearBrightness: 1,
  // 可讀性霧幕（暖白 rgba(255,245,230, α)，只蓋到地面線 GROUND_Y）
  veilEnabled: 1, veilAlpha: 0.06, // v0.3.53-fix-1：0.16 → 0.06（建議上限 0.10）
  // near 上緣淡出：fix-1 關閉（0，避免上方被挖空的感覺）；需要時可用 console：setChapter1Bg({ nearTopFade: 0.1 })
  nearTopFade: 0,
  // 地面小物件：behind（背景之後、玩法物件之前）＋ front（小V / 敵人 / 道具之後、HUD 之前）；底部壓進地面線 groundOffsetY px
  // foregroundParallax：fix-1 改 1.0（和地面同速）。實測 0.88 時物件會在地面上「滑動」，捲動中會滑到金幣 / 尖刺 / 蠍子後面；
  //   1.0 時 1-1～1-3 全程 0 重疊（以畫面中心為基準計算，可在 F4 4 → A D 或 setChapter1Bg 改回 0.88）
  fgEnabled: 1, foregroundParallax: 1.0, fgGroundOffsetY: 10, fgGlobalScale: 1, fgAlpha: 1,
  // 實際高度（全域 ×1）：花叢 ≈ 86px、兔 ≈ 81px、禮物 ≈ 78px、箭牌 ≈ 88px（前方物件再 ×1.12）；小V 約 160px
  fgFlowerHillScale: 0.075,
  fgBalloonRabbitScale: 0.070,
  fgGiftPileScale: 0.070,
  fgArrowSignScale: 0.075,
  // v0.3.53：前景（front）物件 — 比後方物件大一點、底部更低（更靠近鏡頭），小V靠近 / 重疊時平滑半透明
  fgFrontScale: 1.12, fgFrontGroundOffsetY: 22,
  // v0.3.53-fix-1：前方物件平常完全不透明，只有小V靠近 / 重疊才變淡
  frontPropBaseAlpha: 1, frontPropNearPlayerAlpha: 0.75, frontPropOverlapPlayerAlpha: 0.45, fgFrontObjectAlpha: 0.75,
  fgFrontNearDist: 60, fgFrontFadeSpeed: 0.15,
  // v0.3.53：第一章 BGM 音量（原檔約 -17.8 dBFS，和第二章 -18.0 dBFS 接近 → 0.24 略小於第二章 0.26）
  chapter1BgmVolume: 0.24,
};
// v0.3.53：第一章平台圖（只換視覺，hitbox / 碰撞不變）
const CHAPTER1_PLATFORM_ART = {
  long:       'assets/adventure/platforms/chapter1/chapter1_platform_long.png',        // 1774×887
  shortWood:  'assets/adventure/platforms/chapter1/chapter1_platform_short_wood.png',  // 1254×1254
  shortCloud: 'assets/adventure/platforms/chapter1/chapter1_platform_short_cloud.png', // 1254×1254
};
// 量自原圖：可站立面 topY、對齊平台 hitbox 左右的範圍 x0～x1（其餘花草 / 氣球 / 藤蔓可略超出）
const CHAPTER1_PLATFORM_SRC = {
  long:       { topY: 380, x0: 40,  x1: 1735 },  // 草皮上緣 y≈376～382；土塊 + 藤蔓到 y 763
  shortWood:  { topY: 519, x0: 180, x1: 1090 },  // 木板上緣 y≈519；兩端木樁（含）對齊 hitbox 左右，花叢 / 氣球略超出
  shortCloud: { topY: 472, x0: 110, x1: 1150 },  // 雲朵上緣 y≈454～486（取 472）；藤蔓往下垂
};
// 目前 1-1～1-3 平台寬度只有 110～180 → 寬 ≥ 160 當長平台（每關 2～4 個），其他是短平台
const CHAPTER1_PLATFORM_LONG_MIN_W = 160;
const CHAPTER1_PLATFORM_CLOUD_RATIO = 0.4; // 短平台：40% 雲朵、60% 木橋（每關固定，用 stageId + x 雜湊，不用亂數）
const CHAPTER1_PLATFORM_DRAW_DEFAULTS = {
  enabled: 1,
  longScaleX: 1, longScaleY: 1, longOffsetY: 0,
  shortWoodScaleX: 1, shortWoodScaleY: 1, shortWoodOffsetY: 0,
  shortCloudScaleX: 1, shortCloudScaleY: 1, shortCloudOffsetY: 0,
  alpha: 1,
  shadowAlpha: 0.5, shadowBlur: 7, // 平台外陰影（可讀性）
};
const CHAPTER1_PLATFORM_DRAW = Object.assign({}, CHAPTER1_PLATFORM_DRAW_DEFAULTS);
const CHAPTER1_BGM_PATH = 'assets/audio/bgm/chapter1_balloon_forest_bgm.mp3';
// v0.3.54：第一章地面 / 凹洞 / 尖刺（用 repo 實際檔名；凹洞邊緣與陰影的檔名前面多了 assetsadventuretileschapter1）
const CHAPTER1_TILE_ASSETS = {
  groundTile:   'assets/adventure/tiles/chapter1/chapter1_ground_tile.png',                                   // 2172×724
  pitEdgeLeft:  'assets/adventure/tiles/chapter1/assetsadventuretileschapter1chapter1_pit_edge_left.png',      // 1254×1254
  pitEdgeRight: 'assets/adventure/tiles/chapter1/assetsadventuretileschapter1chapter1_pit_edge_right.png',     // 1254×1254
  pitShadow:    'assets/adventure/tiles/chapter1/assetsadventuretileschapter1chapter1_pit_shadow.png',         // 2172×724
  spike:        'assets/adventure/hazards/chapter1/chapter1_spike.png',                                      // 1254×1254
};
// 量自原圖：
//   地面帶：草皮上緣 y≈250（花朵往上冒到 y 141）、土層到 y≈520、藤蔓到 600；左右可鏡像平鋪
//   pit_edge_left 圖：右邊是切齊的地面、崖壁在「左側」（x≈260）→ 實際是凹洞的「右壁」
//   pit_edge_right 圖：左邊是切齊的地面、崖壁在「右側」（x≈1150）→ 實際是凹洞的「左壁」
//   （依圖的方向對位，不依檔名；崖壁對齊凹洞邊界、草皮上緣對齊地面帶）
const CHAPTER1_TILE_SRC = {
  ground:   { topY: 250, cropX0: 0, cropX1: 2172 },
  wallOfPitRight: { key: 'pitEdgeLeft',  topY: 280, cliffX: 260,  cropX0: 214, cropX1: 1254 },
  wallOfPitLeft:  { key: 'pitEdgeRight', topY: 235, cliffX: 1150, cropX0: 0,   cropX1: 1206 },
  shadow:   { x0: 67, y0: 214, x1: 2105, y1: 625 },
  spike:    { x0: 70, y0: 232, x1: 1210, y1: 1039 }, // 底座底部 y 1039
};
const CHAPTER1_TILE_DEFAULTS = {
  groundScale: 0.32, groundOffsetY: 0,      // 地面帶 × 0.32（695×232）：草皮對齊 GROUND_Y，土層蓋到 y≈546
  groundFillColor: 0,                        // （保留）地面帶下方補色用固定土色
  pitEdgeScale: 0.32, pitEdgeOffsetY: 0,
  pitShadowAlpha: 0.75,
  spikeWidthScale: 1.9, spikeOffsetY: 8,     // 尖刺圖寬 = hitbox 寬 × 1.9（40 → 76px，尖端高約 50px），底座往地面壓 8px（藏進草皮）
  spikeGlowAlpha: 1, spikeGlowBlur: 9,       // （v0.3.54 舊參數；fix-1 起改用 CHAPTER1_SPIKE_DRAW）   // 第一章尖刺用「紅色」危險外光（綠色底座在花草地面上才看得出來）
};
const CHAPTER1_TILE = Object.assign({}, CHAPTER1_TILE_DEFAULTS);
// v0.3.54-fix-1：尖刺可讀性（只是畫面效果，hitbox / 傷害判定不變）
//   ① 底部紅橘色 warning halo（半透明橢圓，寬 = 尖刺圖寬 × 1.35、高 = 寬 × 0.45）
//   ② 白色細描邊（剪影往 8 個方向偏 1.5px）→ 從花草背景裡跳出來
//   ③ 紅橘色 glow（shadowBlur 14）
const CHAPTER1_SPIKE_DRAW = {
  glowEnabled: 1,
  glowColor: 'rgba(255,70,40,0.55)',
  glowBlur: 14,
  warningAuraEnabled: 1,
  warningAuraColor: 'rgba(255,60,40,0.22)',
  warningAuraScaleX: 1.35,
  warningAuraScaleY: 0.45,
  outlineEnabled: 1,
  outlineColor: 'rgba(255,255,255,0.95)',
  outlineWidth: 1.5,
  pulse: 0.15, // halo 透明度輕微呼吸（±15%）
};
const chapter1SpikeSilhouetteCache = {};
function getChapter1SpikeSilhouette(img, w, h, color) {
  const k = Math.round(w) + 'x' + Math.round(h) + '|' + color;
  if (chapter1SpikeSilhouetteCache[k]) return chapter1SpikeSilhouetteCache[k];
  let out = null;
  try {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, c.width, c.height);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    out = c;
  } catch (e) { out = null; }
  Object.keys(chapter1SpikeSilhouetteCache).forEach(kk => { if (kk.split('|')[1] === color && kk !== k) delete chapter1SpikeSilhouetteCache[kk]; });
  chapter1SpikeSilhouetteCache[k] = out;
  return out;
}
let chapter1Bgm = null, chapter1BgmStatus = '-', chapter1BgmWantRestart = false, chapter1BgmBlocked = false;
let chapter1FrontPropDebug = false; // F4 → B：前景物件外框 / 透明狀態
// 每關配置（x = 世界座標中心）：避開地面高度的金幣 ±25、260 / 圓氣球 ±30、尖刺 ±50、小怪巡邏範圍 ±30、
// 橘子噴油怪 ±230、低平台（y ≥ 340）±20、出生點 x < 180、終點旗 6080 之後（箭牌例外：放旗子前、指向旗子）
// v0.3.53：layer 'back' = 小V後方（場景豐富度）、'front' = 小V前方（立體感，小V靠近時半透明）
const CHAPTER1_FG_PROPS = {
  '1-1': [{ type: 'flowerHill', x: 1852, layer: 'front' }, { type: 'balloonRabbit', x: 3512, layer: 'back' }, { type: 'flowerHill', x: 4700, layer: 'back' }, { type: 'arrowSign', x: 5962, layer: 'front' }],
  // v0.3.54-fix-1：正式流程的第 2 節（1-2b，長 5200、終點 5000）— 同樣的避讓規則（另避開寶物點 2380 ±150）
  '1-2b': [{ type: 'flowerHill', x: 955, layer: 'front' }, { type: 'giftPile', x: 1700, layer: 'back' }, { type: 'flowerHill', x: 2150, layer: 'back' },
           { type: 'balloonRabbit', x: 2605, layer: 'back' }, { type: 'flowerHill', x: 3670, layer: 'front' }, { type: 'arrowSign', x: 4600, layer: 'front' }],
  '1-2': [{ type: 'flowerHill', x: 1635, layer: 'front' }, { type: 'giftPile', x: 2612, layer: 'back' }, { type: 'flowerHill', x: 4027, s: 0.9, layer: 'back' }, { type: 'flowerHill', x: 5610, layer: 'front' }, { type: 'arrowSign', x: 5912, layer: 'front' }],
  '1-3': [{ type: 'flowerHill', x: 690, layer: 'back' }, { type: 'giftPile', x: 1287, layer: 'back' }, { type: 'balloonRabbit', x: 2028, layer: 'back' }, { type: 'flowerHill', x: 2450, layer: 'front' }, { type: 'arrowSign', x: 6128, s: 0.9, layer: 'front' }],
};
const CHAPTER1_BG = Object.assign({}, CHAPTER1_BG_DEFAULTS);
let chapter1FgOverrides = {}; // 'stageId:index' → { dx, dy, s }（F4 單一 prop 微調）
const CHAPTER1_BG_LS_KEY = 'balloonV_chapter1BgCalib__' + GAME_VERSION;
const chapter1BgImgs = {}, chapter1BgImgStatus = {};
const chapter1BgTileCache = {};
let chapter1BgDrawn = false;

function isChapter1ParallaxStage() {
  const lv = LEVELS[currentLevelIndex];
  return !!(lv && !lv.isBossStage && lv.chapterId === 1 && isChapter1MainStage(lv.stageId));
}
function getChapter1BgImg(key) {
  const img = chapter1BgImgs[key];
  return (img && img.complete !== false && img.naturalWidth > 0) ? img : null;
}
// 縮放 + 鏡像 + 濾鏡烘焙好的圖塊（快取）；作法同第二章（左鄰 + 本張 + 右鄰拼條再 blur，接縫不會有淡邊）
// v0.3.61：第一章背景「可視性霧層」— 只影響遠景 / 中景背景圖（小V、敵人、道具、金幣、尖刺、HUD 都不受影響）
//   數值集中在這裡，實機微調只改這幾個：saturation 飽和度、contrast 對比、fogAlpha / fogColor 淡紫灰霧
const CHAPTER1_VISIBILITY = {
  enabled: true,
  farSaturation: 0.82, midSaturation: 0.85,   // 原本的 80%～85%
  farContrast: 0.86,   midContrast: 0.90,     // 遠景對比 85%～90%
  fogAlpha: 0.12,      fogColor: '196,186,222', // 淡紫灰霧 10%～15%（蓋在遠景 + 中景上、近景樹洞框之前）
};
function setChapter1Visibility(o) { Object.assign(CHAPTER1_VISIBILITY, o || {}); try { for (const k in chapter1BgTileCache) delete chapter1BgTileCache[k]; } catch (e) {} console.log('[Ch1Fog]', JSON.stringify(CHAPTER1_VISIBILITY)); return CHAPTER1_VISIBILITY; }
if (typeof window !== 'undefined') window.setChapter1Visibility = setChapter1Visibility;
function getChapter1BgTile(key, scale, mirrored) {
  const img = getChapter1BgImg(key);
  if (!img) return null;
  const A = CHAPTER1_BG, V = CHAPTER1_VISIBILITY;
  const vOn = V.enabled && (key === 'far' || key === 'mid');
  const fl = { blur: Math.max(0, A[key + 'Blur'] || 0), sat: A[key + 'Saturation'] * (vOn ? V[key + 'Saturation'] : 1), bri: A[key + 'Brightness'], con: vOn ? V[key + 'Contrast'] : 1 };
  const flKey = [fl.blur, fl.sat, fl.bri, fl.con, key === 'near' ? A.nearTopFade : 0].join(',');
  const ck = key + '|' + scale + '|' + (mirrored ? 1 : 0) + '|' + flKey;
  if (chapter1BgTileCache[ck]) return chapter1BgTileCache[ck];
  const w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
  let tile = img;
  try {
    if (typeof document !== 'undefined' && document.createElement) {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d');
      if (g && typeof g.drawImage === 'function') {
        g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
        const needFilter = fl.blur > 0 || fl.sat !== 1 || fl.bri !== 1 || fl.con !== 1;
        if (needFilter && isChapter2CanvasFilterOk()) {
          const strip = document.createElement('canvas');
          strip.width = w * 3; strip.height = h;
          const sg = strip.getContext('2d');
          sg.imageSmoothingEnabled = true; sg.imageSmoothingQuality = 'high';
          for (let k = 0; k < 3; k++) {
            const flip = (k === 1) ? mirrored : !mirrored;
            sg.save();
            if (flip) { sg.translate((k + 1) * w, 0); sg.scale(-1, 1); } else { sg.translate(k * w, 0); }
            sg.drawImage(img, 0, 0, w, h);
            sg.restore();
          }
          g.filter = (fl.blur > 0 ? 'blur(' + fl.blur + 'px) ' : '') + 'saturate(' + fl.sat + ') brightness(' + fl.bri + ')' + (fl.con !== 1 ? ' contrast(' + fl.con + ')' : '');
          g.drawImage(strip, -w, 0);
          g.filter = 'none';
        } else {
          if (mirrored) { g.translate(w, 0); g.scale(-1, 1); }
          g.drawImage(img, 0, 0, w, h);
          if (fl.bri < 1) {
            g.setTransform(1, 0, 0, 1, 0, 0);
            g.globalCompositeOperation = 'source-atop';
            g.fillStyle = 'rgba(0,0,0,' + (1 - fl.bri) + ')';
            g.fillRect(0, 0, w, h);
            g.globalCompositeOperation = 'source-over';
          }
        }
        // v0.3.52：near 上緣淡出（原圖頂端樹冠被切平）
        const fade = key === 'near' ? Math.max(0, Math.min(0.6, A.nearTopFade || 0)) : 0;
        if (fade > 0) {
          g.setTransform(1, 0, 0, 1, 0, 0);
          g.globalCompositeOperation = 'destination-out'; // 只擦上緣那一段（範圍外完全不動）
          const gr = g.createLinearGradient(0, 0, 0, h * fade);
          gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = gr; g.fillRect(0, 0, w, h * fade);
          g.globalCompositeOperation = 'source-over';
        }
        tile = c;
      }
    }
  } catch (e) { tile = img; }
  const out = { src: tile, w, h };
  Object.keys(chapter1BgTileCache).forEach(k => { if (k.startsWith(key + '|') && (k.split('|')[1] !== String(scale) || k.split('|')[3] !== flKey)) delete chapter1BgTileCache[k]; });
  chapter1BgTileCache[ck] = out;
  return out;
}
// 單一層：依 cameraX × parallax 水平捲動，鏡像平鋪補滿畫面寬度
// v0.3.53：near 框景的實際位置（單張、不平鋪）
function getChapter1NearFrameGeom() {
  const A = CHAPTER1_BG, img = getChapter1BgImg('near');
  const w = img ? Math.round(img.naturalWidth * A.nearScale) : 0, h = img ? Math.round(img.naturalHeight * A.nearScale) : 0;
  const spare = Math.max(0, w - CANVAS_W);
  const maxCam = Math.max(1, (typeof LEVEL_LENGTH !== 'undefined' ? LEVEL_LENGTH : 6400) - CANVAS_W);
  // v0.3.54：進度制（camera progress 0～1）→ 位移 = 進度 × 可移動範圍；cameraX 只增不減 → near 只往左、不反轉
  const travel = Math.min(spare, Math.max(0, A.nearParallax) * maxCam);
  const progress = Math.max(0, Math.min(1, Math.max(0, cameraX) / maxCam));
  const shift = progress * travel;
  const rate = travel / maxCam;
  const x = -Math.round(shift), y = Math.round(A.nearOffsetY);
  return { x, y, w, h, spare, rate: Math.round(rate * 1000) / 1000, shift: Math.round(shift),
           coversTop: y <= 0, coversBottom: y + h >= CANVAS_H, coversLeft: x <= 0, coversRight: x + w >= CANVAS_W };
}
function drawChapter1BgLayer(key) {
  const A = CHAPTER1_BG, scale = A[key + 'Scale'];
  const t0 = getChapter1BgTile(key, scale, false);
  if (!t0) return false;
  if (key === 'near' && A.nearFrameMode) { // v0.3.53：大型樹洞 / 樹冠框景 — 單張，只微微橫移
    const g = getChapter1NearFrameGeom();
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, A.nearAlpha));
    if (t0.src === getChapter1BgImg('near')) ctx.drawImage(t0.src, g.x, g.y, g.w, g.h); else ctx.drawImage(t0.src, g.x, g.y);
    ctx.restore();
    return true;
  }
  const t1 = getChapter1BgTile(key, scale, true) || t0;
  const raw = getChapter1BgImg(key), w = t0.w, y = Math.round(A[key + 'OffsetY']);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, A[key + 'Alpha'] == null ? 1 : A[key + 'Alpha']));
  const shift = Math.max(0, cameraX) * A[key + 'Parallax'];
  let i = Math.floor(shift / w);
  for (let x = Math.round(i * w - shift); x < CANVAS_W; x += w, i++) {
    const t = (i % 2 === 1) ? t1 : t0;
    if (t.src === raw) { // 沒有離屏 canvas 時：即時縮放 / 鏡像
      if (i % 2 === 1) { ctx.save(); ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(raw, 0, 0, w, t.h); ctx.restore(); }
      else ctx.drawImage(raw, x, y, w, t.h);
    } else ctx.drawImage(t.src, x, y);
  }
  ctx.restore();
  return true;
}
// 單一小物件的畫面矩形（screen 座標）
function getChapter1FgPropGeom(sid, i, prop) {
  const A = CHAPTER1_BG, S = CHAPTER1_FG_SRC[prop.type];
  const ov = chapter1FgOverrides[sid + ':' + i] || {};
  const front = prop.layer === 'front';
  const sc = A[S.scaleKey] * A.fgGlobalScale * (prop.s || 1) * (ov.s || 1) * (front ? A.fgFrontScale : 1);
  const wx = prop.x + (ov.dx || 0);
  const cxs = CANVAS_W / 2 + (wx - Math.max(0, cameraX) - CANVAS_W / 2) * A.foregroundParallax;
  const baseY = GROUND_Y + (front ? A.fgFrontGroundOffsetY : A.fgGroundOffsetY) + (ov.dy || 0);
  const o = S.opaque;
  const drawX = cxs - ((o[0] + o[2]) / 2) * sc, drawY = baseY - o[3] * sc;
  return { sc, cxs, baseY, drawX, drawY, drawW: 1254 * sc, drawH: 1254 * sc,
           box: { x: drawX + o[0] * sc, y: drawY + o[1] * sc, w: (o[2] - o[0]) * sc, h: (o[3] - o[1]) * sc }, key: S.key };
}
// 後方小物件（背景三層之後、地面之前 → 在所有玩法物件與小V後方；底部被地面蓋住一點）
function drawChapter1BackgroundProps() {
  const A = CHAPTER1_BG;
  if (!A.fgEnabled) return;
  const sid = LEVELS[currentLevelIndex].stageId;
  const list = CHAPTER1_FG_PROPS[sid] || [];
  ctx.save();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  list.forEach((prop, i) => {
    if (prop.layer === 'front') return;
    const g = getChapter1FgPropGeom(sid, i, prop);
    const img = getChapter1BgImg(g.key);
    if (!img) return; // optional：沒載好 / 載入失敗就不畫
    if (g.drawX > CANVAS_W + 20 || g.drawX + g.drawW < -20) return;
    ctx.globalAlpha = Math.max(0, Math.min(1, A.fgAlpha));
    ctx.drawImage(img, g.drawX, g.drawY, g.drawW, g.drawH);
  });
  ctx.restore();
}
// 小V的畫面矩形（約略的角色圖範圍：寬 = player.w × HERO_DRAW_SCALE、腳底對齊 hitbox 底）
function getChapter1PlayerScreenRect() {
  const dW = player.w * HERO_DRAW_SCALE, dH = dW;
  return { x: player.x - cameraX + (player.w - dW) / 2, y: player.y + player.h - dH * HERO_FOOT_ANCHOR_Y, w: dW, h: dH };
}
function chapter1RectOverlap(a, b, pad) {
  pad = pad || 0;
  return a.x - pad < b.x + b.w && a.x + a.w + pad > b.x && a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;
}
// 前方物件目標透明度（fix-1）：與小V重疊 → 0.45、靠近（60px 內）→ 0.75、其他 → 1
//   保險：若移動中的敵人 / 道具剛好和前方物件重疊 → 0.75（目前擺位實測 0 重疊，平常不會觸發）
function getChapter1FrontPropTargetAlpha(box) {
  const A = CHAPTER1_BG, cx = cameraX;
  const pr = getChapter1PlayerScreenRect();
  if (chapter1RectOverlap(box, pr)) return { a: A.frontPropOverlapPlayerAlpha, why: 'player' };
  let objHit = false;
  const hit = (x, y, w, h) => { if (!objHit && chapter1RectOverlap(box, { x: x - cx, y, w, h })) objHit = true; };
  enemies.forEach(e => { if (e.active !== false) hit(e.x, e.y, e.w, e.h); });
  orangeNemeses.forEach(o => hit(o.x, o.y, o.w, o.h));
  coins.forEach(c => { if (!c.collected) hit(c.x - 12, c.y - 12, 24, 24); });
  balloons260.forEach(b => { if (!b.collected) hit(b.x - 14, b.y - 22, 28, 44); });
  roundBalloons.forEach(r => { if (!r.collected) hit(r.x - 16, r.y - 16, 32, 32); });
  spikes.forEach(sp => hit(sp.x, sp.y, sp.w, sp.h));
  hit(FINISH_X - 20, GROUND_Y - 140, 120, 140);
  if (objHit) return { a: A.fgFrontObjectAlpha, why: 'object' };
  if (chapter1RectOverlap(box, pr, A.fgFrontNearDist)) return { a: A.frontPropNearPlayerAlpha, why: 'near' };
  return { a: A.frontPropBaseAlpha, why: '' };
}
// 前方小物件（drawWorldInner 最後：小V / 敵人 / 道具之後，HUD 之前）
function drawChapter1FrontForegroundProps() {
  const A = CHAPTER1_BG;
  if (!chapter1BgDrawn || !A.fgEnabled) return;
  const sid = LEVELS[currentLevelIndex].stageId;
  const list = CHAPTER1_FG_PROPS[sid] || [];
  ctx.save();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  list.forEach((prop, i) => {
    if (prop.layer !== 'front') return;
    const g = getChapter1FgPropGeom(sid, i, prop);
    const img = getChapter1BgImg(g.key);
    if (!img) return;
    if (g.drawX > CANVAS_W + 20 || g.drawX + g.drawW < -20) { prop._fade = A.frontPropBaseAlpha; prop._why = ''; return; }
    const t = getChapter1FrontPropTargetAlpha(g.box);
    prop._why = t.why;
    prop._fade = prop._fade == null ? t.a : prop._fade + (t.a - prop._fade) * Math.max(0.01, Math.min(1, A.fgFrontFadeSpeed)); // 平滑，不閃爍
    ctx.globalAlpha = Math.max(0, Math.min(1, prop._fade));
    ctx.drawImage(img, g.drawX, g.drawY, g.drawW, g.drawH);
    if (chapter1FrontPropDebug) {
      ctx.globalAlpha = 1; ctx.setLineDash([5, 3]); ctx.lineWidth = 2;
      ctx.strokeStyle = t.why === 'player' ? '#ff3b3b' : (t.why === 'object' ? '#ffb000' : (t.why === 'near' ? '#ffe066' : '#00ffc8'));
      ctx.strokeRect(g.box.x, g.box.y, g.box.w, g.box.h); ctx.setLineDash([]);
      ctx.font = 'bold 11px monospace'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.fillText('front #' + i + ' α' + prop._fade.toFixed(2) + (t.why ? ' (' + t.why + ')' : ''), g.cxs, g.box.y - 4);
    }
  });
  if (chapter1FrontPropDebug) {
    const pr = getChapter1PlayerScreenRect();
    ctx.globalAlpha = 1; ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = 1; ctx.strokeRect(pr.x, pr.y, pr.w, pr.h);
  }
  ctx.restore();
}
// ── v0.3.53：第一章平台圖 ──
function chapter1Hash01(str) { // 穩定的 0～1 雜湊（FNV-1a）
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}
const chapter1PlatformKindCache = {}; // stageId → Map(platform → kind)
// 每關固定分配：寬 ≥ 160 → long；短平台先排高的（y ≤ 335）、同一組內依雜湊排序，取前 40% 當雲朵、其他木橋
function getChapter1PlatformKind(p) {
  const lv = LEVELS[currentLevelIndex];
  const sid = lv ? lv.stageId : '';
  let m = chapter1PlatformKindCache[sid];
  if (!m || m.list !== platforms || !m.kinds.has(p)) {
    m = { list: platforms, kinds: new Map() };
    const shorts = [];
    // v0.3.54-fix-1：上下疊在一起的兩層平台（水平有重疊、站立面上下差 < 110px，例如 1-3 的 3 組雙層路線）
    //   短平台圖（木橋 / 雲朵）往下垂 45～75px、木樁氣球往上冒 27px → 上下兩張會疊在一起
    //   → 這種平台一律用「長平台圖」（草皮土塊只往下 ≈ 36px、上面不冒東西），上下之間留出約 30px 空隙
    const stacked = new Set();
    platforms.forEach(a => platforms.forEach(b => {
      if (a === b || a.y >= GROUND_Y || b.y >= GROUND_Y) return;
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      if (ox > 0 && Math.abs(a.y - b.y) < 110) { stacked.add(a); stacked.add(b); }
    }));
    platforms.forEach(q => {
      if (q.w >= CHAPTER1_PLATFORM_LONG_MIN_W || stacked.has(q)) m.kinds.set(q, 'long');
      else shorts.push(q);
    });
    m.stacked = stacked;
    const score = q => chapter1Hash01(sid + ':' + q.x + ':' + q.y) + (q.y <= 335 ? 0 : 1); // 高的平台（y ≤ 335）一律優先當雲朵，其餘依雜湊補滿 40%
    const sorted = shorts.slice().sort((a, b) => score(a) - score(b));
    const nCloud = Math.round(shorts.length * CHAPTER1_PLATFORM_CLOUD_RATIO);
    sorted.forEach((q, i) => m.kinds.set(q, i < nCloud ? 'shortCloud' : 'shortWood'));
    chapter1PlatformKindCache[sid] = m;
  }
  return m.kinds.get(p) || 'shortWood';
}
function getChapter1PlatformArtGeom(p) {
  const D = CHAPTER1_PLATFORM_DRAW, kind = getChapter1PlatformKind(p), S = CHAPTER1_PLATFORM_SRC[kind];
  const base = p.w / (S.x1 - S.x0);
  const sx = base * D[kind + 'ScaleX'], sy = base * D[kind + 'ScaleY'];
  const img = getChapter1BgImg('plat_' + kind);
  const iw = img ? img.naturalWidth : (kind === 'long' ? 1774 : 1254), ih = img ? img.naturalHeight : (kind === 'long' ? 887 : 1254);
  const x = p.x + p.w / 2 - ((S.x0 + S.x1) / 2) * sx;  // 對齊範圍的中心 = hitbox 中心
  const y = p.y - S.topY * sy + D[kind + 'OffsetY'];    // 可站立面 = hitbox 上緣
  return { kind, sx, sy, x, y, w: iw * sx, h: ih * sy, img };
}
// 回傳 true = 已畫平台圖（呼叫端不要再畫舊矩形）；圖沒載好 → false → 舊矩形 fallback
function drawChapter1PlatformArt(p, cx) {
  if (!chapter1BgDrawn || !CHAPTER1_PLATFORM_DRAW.enabled) return false;
  const g = getChapter1PlatformArtGeom(p);
  if (!g.img) return false;
  ctx.save();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.globalAlpha = Math.max(0, Math.min(1, CHAPTER1_PLATFORM_DRAW.alpha));
  // 輕微藍灰外陰影：白色雲朵平台在雲朵背景上也看得出輪廓（只是視覺，hitbox 不變）
  if (CHAPTER1_PLATFORM_DRAW.shadowAlpha > 0) {
    ctx.shadowColor = 'rgba(30,45,90,' + CHAPTER1_PLATFORM_DRAW.shadowAlpha + ')';
    ctx.shadowBlur = CHAPTER1_PLATFORM_DRAW.shadowBlur; ctx.shadowOffsetY = 3;
  }
  ctx.drawImage(g.img, g.x - cx, g.y, g.w, g.h);
  ctx.restore();
  return true;
}
// ── v0.3.54：第一章地面帶 / 凹洞 / 尖刺 ──
const chapter1CropCache = {};
function getChapter1CropTile(key, cropX0, cropX1, scale, mirrored) {
  const img = getChapter1BgImg(key);
  if (!img) return null;
  const ck = key + '|' + cropX0 + '|' + cropX1 + '|' + scale + '|' + (mirrored ? 1 : 0);
  if (chapter1CropCache[ck]) return chapter1CropCache[ck];
  const sw = cropX1 - cropX0;
  const w = Math.max(1, Math.round(sw * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
  let out = null;
  try {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    if (mirrored) { g.translate(w, 0); g.scale(-1, 1); }
    g.drawImage(img, cropX0, 0, sw, img.naturalHeight, 0, 0, w, h);
    out = { src: c, w, h };
  } catch (e) { out = { src: img, w, h, raw: true, cropX0, sw, mirrored }; }
  Object.keys(chapter1CropCache).forEach(k => { if (k.startsWith(key + '|') && k.split('|')[3] !== String(scale)) delete chapter1CropCache[k]; });
  chapter1CropCache[ck] = out;
  return out;
}
// 地面帶：只畫在 [x0, x1)（世界座標），草皮上緣在 topY；鏡像平鋪、和地形同速
function drawChapter1GroundStrip(x0, x1, topY, cx) {
  const T = CHAPTER1_TILE, S = CHAPTER1_TILE_SRC.ground, sc = T.groundScale;
  const t0 = getChapter1CropTile('groundTile', S.cropX0, S.cropX1, sc, false);
  if (!t0 || t0.raw) return false;
  const t1 = getChapter1CropTile('groundTile', S.cropX0, S.cropX1, sc, true) || t0;
  const sx0 = Math.max(x0 - cx, -2), sx1 = Math.min(x1 - cx, CANVAS_W + 2);
  if (sx1 <= sx0) return true;
  const y = Math.round(topY - S.topY * sc);
  ctx.save();
  ctx.beginPath(); ctx.rect(sx0, y, sx1 - sx0, CANVAS_H - y + 60); ctx.clip();
  // 地面帶下方先補土色（地面帶土層約到 y 546，保險起見整段補滿到畫面底）
  ctx.fillStyle = '#7a4d2b'; ctx.fillRect(sx0, topY + 30, sx1 - sx0, CANVAS_H - topY);
  const w = t0.w;
  let i = Math.floor((sx0 + cx) / w);
  for (let x = Math.round(i * w - cx); x < sx1; x += w, i++) ctx.drawImage((((i % 2) + 2) % 2 === 1) ? t1.src : t0.src, x, y);
  ctx.restore();
  return true;
}
// 地面帶 + 凹洞（取代舊的純色地面）；回傳 false = 地面帶圖沒載好 → 呼叫端照舊畫純色地面
function drawChapter1GroundAndPits(cx) {
  if (!chapter1BgDrawn || !getChapter1BgImg('groundTile')) return false;
  const T = CHAPTER1_TILE;
  const topY = GROUND_Y + T.groundOffsetY;
  const vis0 = cx - 60, vis1 = cx + CANVAS_W + 60;
  const gaps = groundGaps.filter(g => g.x + g.w > vis0 && g.x < vis1).sort((a, b) => a.x - b.x);
  let cur = vis0;
  gaps.forEach(g => { if (g.x > cur) drawChapter1GroundStrip(cur, g.x, topY, cx); cur = Math.max(cur, g.x + g.w); });
  if (cur < vis1) drawChapter1GroundStrip(cur, vis1, topY, cx);
  gaps.forEach(g => {
    const gx = g.x - cx;
    ctx.fillStyle = '#3d2614';
    ctx.fillRect(gx, topY, g.w, CANVAS_H - topY);
    const floorY = (typeof GROUND_GAP_FLOOR_Y !== 'undefined' ? GROUND_GAP_FLOOR_Y : GROUND_Y + 66) + T.groundOffsetY;
    drawChapter1GroundStrip(g.x, g.x + g.w, floorY, cx);
    drawChapter1PitShadow(g, cx, topY, floorY);
    drawChapter1PitWall('left', g, cx, topY);
    drawChapter1PitWall('right', g, cx, topY);
  });
  return true;
}
function drawChapter1PitWall(side, g, cx, topY) {
  const T = CHAPTER1_TILE, S = side === 'left' ? CHAPTER1_TILE_SRC.wallOfPitLeft : CHAPTER1_TILE_SRC.wallOfPitRight;
  const sc = T.pitEdgeScale;
  const t = getChapter1CropTile(S.key, S.cropX0, S.cropX1, sc, false);
  if (!t || t.raw) return; // optional：沒載好就不畫邊緣
  const wallX = side === 'left' ? g.x : g.x + g.w;
  const x = Math.round(wallX - cx - (S.cliffX - S.cropX0) * sc);
  const y = Math.round(topY - S.topY * sc + T.pitEdgeOffsetY);
  ctx.drawImage(t.src, x, y);
}
function drawChapter1PitShadow(g, cx, topY, floorY) {
  const T = CHAPTER1_TILE, img = getChapter1BgImg('pitShadow');
  if (!img || T.pitShadowAlpha <= 0) return;
  const S = CHAPTER1_TILE_SRC.shadow;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, T.pitShadowAlpha));
  ctx.drawImage(img, S.x0, S.y0, S.x1 - S.x0, S.y1 - S.y0, g.x - cx, topY, g.w, floorY - topY + 14);
  ctx.restore();
}
// 尖刺圖：hitbox 不變；圖寬 = hitbox 寬 × spikeWidthScale、置中，底座底部壓在 hitbox 底 + spikeOffsetY
function getChapter1SpikeGeom(sx, s) {
  const T = CHAPTER1_TILE, S = CHAPTER1_TILE_SRC.spike;
  const sc = (s.w * T.spikeWidthScale) / (S.x1 - S.x0);
  const x = sx + s.w / 2 - ((S.x0 + S.x1) / 2) * sc;
  const y = s.y + s.h + T.spikeOffsetY - S.y1 * sc;
  return { sc, x, y, w: 1254 * sc, h: 1254 * sc, artTop: y + S.y0 * sc };
}
function drawChapter1SpikeArt(sx, s) {
  if (!chapter1BgDrawn) return false;
  const img = getChapter1BgImg('spike');
  if (!img) return false;
  const g = getChapter1SpikeGeom(sx, s), D = CHAPTER1_SPIKE_DRAW, S = CHAPTER1_TILE_SRC.spike;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0)'; ctx.shadowBlur = 0; // 不吃外層的白光設定，下面自己控制
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  const artW = (S.x1 - S.x0) * g.sc;
  // ① warning halo（地面上的紅橘色橢圓光）
  if (D.warningAuraEnabled) {
    const cxh = sx + s.w / 2, cyh = s.y + s.h - 2;
    const rx = artW * D.warningAuraScaleX / 2, ry = artW * D.warningAuraScaleY / 2;
    const k = 1 + D.pulse * Math.sin((typeof frameCount !== 'undefined' ? frameCount : 0) * 0.08);
    ctx.save();
    ctx.translate(cxh, cyh); ctx.scale(1, ry / rx);
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    gr.addColorStop(0, D.warningAuraColor); gr.addColorStop(0.65, D.warningAuraColor); gr.addColorStop(1, 'rgba(255,60,40,0)');
    ctx.globalAlpha = Math.max(0, Math.min(1, k));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // ② 白色描邊（剪影 8 方向偏移）＋ ③ 紅橘 glow（只加在描邊那一層，尖刺本體保持原色）
  if (D.outlineEnabled) {
    const sil = getChapter1SpikeSilhouette(img, g.w, g.h, D.outlineColor);
    if (sil) {
      if (D.glowEnabled) { ctx.shadowColor = D.glowColor; ctx.shadowBlur = D.glowBlur; }
      const o = D.outlineWidth;
      [[-o, 0], [o, 0], [0, -o], [0, o], [-o, -o], [o, -o], [-o, o], [o, o]].forEach(([dx, dy]) => ctx.drawImage(sil, g.x + dx, g.y + dy, g.w, g.h));
      ctx.shadowColor = 'rgba(0,0,0,0)'; ctx.shadowBlur = 0;
    }
  } else if (D.glowEnabled) { ctx.shadowColor = D.glowColor; ctx.shadowBlur = D.glowBlur; }
  ctx.drawImage(img, g.x, g.y, g.w, g.h);
  ctx.restore();
  return true;
}
function debugChapter1Tiles() {
  const st = k => chapter1BgImgStatus[k] || (getChapter1BgImg(k) ? 'ok' : '-');
  const info = { stage: (LEVELS[currentLevelIndex] || {}).stageId, active: isChapter1ParallaxStage(),
    images: Object.fromEntries(Object.keys(CHAPTER1_TILE_ASSETS).map(k => [k, st(k)])), values: Object.assign({}, CHAPTER1_TILE),
    gapsThisStage: groundGaps.length, spikes: spikes.map(sp => { const g = getChapter1SpikeGeom(sp.x, sp);
      return { hitbox: [sp.x, sp.y, sp.w, sp.h].join(','), art: [Math.round(g.x), Math.round(g.artTop), Math.round((CHAPTER1_TILE_SRC.spike.x1 - CHAPTER1_TILE_SRC.spike.x0) * g.sc), Math.round(sp.y + sp.h + CHAPTER1_TILE.spikeOffsetY - g.artTop)].join(',') }; }) };
  console.log('[Chapter1Tiles] ' + info.stage + '　ground=' + info.images.groundTile + ' edgeL=' + info.images.pitEdgeLeft + ' edgeR=' + info.images.pitEdgeRight + ' shadow=' + info.images.pitShadow + ' spike=' + info.images.spike + '　凹洞 ' + info.gapsThisStage + ' 個　尖刺 ' + info.spikes.length + ' 個');
  if (console.table) console.table(info.spikes);
  return info;
}
if (typeof window !== 'undefined') window.debugChapter1Tiles = debugChapter1Tiles;
function debugChapter1Platforms() {
  const sid = (LEVELS[currentLevelIndex] || {}).stageId;
  const st = k => chapter1BgImgStatus['plat_' + k] || (getChapter1BgImg('plat_' + k) ? 'ok' : '-');
  const rows = platforms.map((p, i) => {
    const g = getChapter1PlatformArtGeom(p);
    return { i, kind: g.kind, stackedPair: !!(chapter1PlatformKindCache[sid] && chapter1PlatformKindCache[sid].stacked && chapter1PlatformKindCache[sid].stacked.has(p)), hitbox: [p.x, p.y, p.w, p.h].join(','), drawRect: [g.x, g.y, g.w, g.h].map(v => Math.round(v)).join(','),
             scale: Math.round(g.sx * 10000) / 10000 + (g.sy !== g.sx ? '/' + Math.round(g.sy * 10000) / 10000 : ''),
             offsetY: CHAPTER1_PLATFORM_DRAW[g.kind + 'OffsetY'], art: (isChapter1ParallaxStage() && CHAPTER1_PLATFORM_DRAW.enabled && g.img) ? 'image' : 'fallback 舊矩形' };
  });
  const cnt = k => rows.filter(r => r.kind === k).length;
  console.log('[Chapter1Platforms] ' + sid + '（第一章平台圖' + (isChapter1ParallaxStage() ? '啟用' : '未啟用：不是 1-1～1-3') + '）　long=' + st('long') + ' shortWood=' + st('shortWood') + ' shortCloud=' + st('shortCloud')
    + '　數量 long ' + cnt('long') + ' / wood ' + cnt('shortWood') + ' / cloud ' + cnt('shortCloud') + '　draw ' + JSON.stringify(CHAPTER1_PLATFORM_DRAW));
  if (console.table) console.table(rows);
  return { stage: sid, active: isChapter1ParallaxStage(), images: { long: st('long'), shortWood: st('shortWood'), shortCloud: st('shortCloud') }, draw: Object.assign({}, CHAPTER1_PLATFORM_DRAW), platforms: rows };
}
if (typeof window !== 'undefined') window.debugChapter1Platforms = debugChapter1Platforms;
// ── v0.3.53：第一章 BGM（1-1～1-3；單一 Audio，不疊播；和第二章 / Boss BGM 互斥）──
function initChapter1Bgm() {
  if (chapter1Bgm || typeof Audio === 'undefined') return;
  try {
    const a = new Audio();
    a.loop = true; a.preload = 'auto'; a.volume = CHAPTER1_BG.chapter1BgmVolume;
    chapter1BgmStatus = 'loading';
    a.addEventListener('canplaythrough', () => { if (chapter1BgmStatus === 'loading') chapter1BgmStatus = 'ok'; });
    a.addEventListener('error', () => { chapter1BgmStatus = 'error'; console.warn('[Chapter1BGM] 音檔載入失敗：' + CHAPTER1_BGM_PATH); });
    a.src = resolveAdventureAssetSrc(CHAPTER1_BGM_PATH) + '?v=' + encodeURIComponent(GAME_VERSION);
    chapter1Bgm = a;
  } catch (e) { chapter1BgmStatus = 'error'; }
}
function stopChapter1Bgm() {
  const a = chapter1Bgm;
  if (!a) return;
  try { if (!a.paused) a.pause(); if (a.currentTime > 0) a.currentTime = 0; } catch (e) {}
}
function syncChapter1Bgm() {
  if (!isChapter1ParallaxStage()) { stopChapter1Bgm(); return; }
  if (!chapter1Bgm) initChapter1Bgm();
  const a = chapter1Bgm;
  if (!a || chapter1BgmStatus === 'error') return;
  if (gameState === 'failed' || gameState === 'clear' || gameState === 'gameover') { stopChapter1Bgm(); return; }
  if (gameState !== 'playing' && !isRpgDialogKeepingBgm()) { try { if (!a.paused) a.pause(); } catch (e) {} return; } // 暫停：只 pause（v0.3.60：RPG 對話中照常播放）
  if (chapter1BgmWantRestart) { chapter1BgmWantRestart = false; try { a.currentTime = 0; } catch (e) {} }
  try { a.volume = Math.max(0, Math.min(1, CHAPTER1_BG.chapter1BgmVolume)); } catch (e) {}
  if (a.paused && !chapter1BgmBlocked) {
    try {
      const pr = a.play();
      if (pr && typeof pr.catch === 'function') pr.catch(err => {
        if (err && err.name === 'NotAllowedError') { // 手機：要等玩家點一下 / 按鍵才能播（不擋進關）
          chapter1BgmBlocked = true; chapter1BgmStatus = 'blocked';
          const resume = () => { chapter1BgmBlocked = false; if (chapter1BgmStatus === 'blocked') chapter1BgmStatus = 'ok'; };
          window.addEventListener('pointerdown', resume, { once: true });
          window.addEventListener('keydown', resume, { once: true });
        }
      });
    } catch (e) {}
  }
}
// 第一章背景（drawWorldInner 最前面呼叫）；回傳 true = 已畫好背景（不用再畫舊的藍天漸層）
// far 沒有 ready（理論上 gate 會擋住）→ 回傳 false，沿用舊藍天，不會半套顯示
function drawChapter1ParallaxBackground() {
  if (!isChapter1ParallaxStage()) return false;
  if (!getChapter1BgImg('far')) return false;
  const A = CHAPTER1_BG;
  ctx.save();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  // 天空色墊底（far alpha < 1 時透出）
  const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  g.addColorStop(0, '#5aa8f0'); g.addColorStop(1, '#cfe9ff');
  ctx.fillStyle = g; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  drawChapter1BgLayer('far');
  drawChapter1BgLayer('mid');
  // v0.3.61：可視性霧層（只蓋遠景 + 中景，畫在近景樹洞框與所有前景物件之前）
  if (CHAPTER1_VISIBILITY.enabled && CHAPTER1_VISIBILITY.fogAlpha > 0) {
    ctx.fillStyle = 'rgba(' + CHAPTER1_VISIBILITY.fogColor + ',' + CHAPTER1_VISIBILITY.fogAlpha + ')';
    ctx.fillRect(0, 0, CANVAS_W, GROUND_Y);
  }
  drawChapter1BgLayer('near');
  if (A.veilEnabled && A.veilAlpha > 0) {
    ctx.fillStyle = 'rgba(255,245,230,' + A.veilAlpha + ')'; // v0.3.52-fix-1：暖白霧幕（不是純白），只蓋到地面線
    ctx.fillRect(0, 0, CANVAS_W, GROUND_Y);
  }
  ctx.restore();
  drawChapter1BackgroundProps(); // v0.3.53：只畫 layer 'back'；'front' 在 drawWorldInner 最後畫
  return true;
}
// console 檢查：debugChapter1Bg()
function debugChapter1Bg() {
  const A = CHAPTER1_BG, st = k => chapter1BgImgStatus[k] || (getChapter1BgImg(k) ? 'ok' : '-');
  const sid = (LEVELS[currentLevelIndex] || {}).stageId;
  const fgKeys = Object.keys(CHAPTER1_FG_ASSETS);
  const fgLoaded = fgKeys.filter(k => getChapter1BgImg(k)).length;
  const info = {
    stage: sid, active: isChapter1ParallaxStage(), drawnLastFrame: chapter1BgDrawn,
    far: st('far'), mid: st('mid'), near: st('near'),
    foregroundLoaded: fgLoaded + '/' + fgKeys.length,
    foreground: Object.fromEntries(fgKeys.map(k => [k, st(k)])),
    parallax: { far: A.farParallax, mid: A.midParallax, near: A.nearParallax, foreground: A.foregroundParallax },
    alpha: { far: A.farAlpha, mid: A.midAlpha, near: A.nearAlpha, fg: A.fgAlpha },
    blur: { far: A.farBlur, mid: A.midBlur, near: A.nearBlur },
    saturation: { far: A.farSaturation, mid: A.midSaturation, near: A.nearSaturation },
    brightness: { far: A.farBrightness, mid: A.midBrightness, near: A.nearBrightness },
    veil: (A.veilEnabled ? 'ON' : 'OFF') + ' rgba(255,245,230,' + A.veilAlpha + ')', nearTopFade: A.nearTopFade,
    offsetY: { far: A.farOffsetY, mid: A.midOffsetY, near: A.nearOffsetY, fgGround: A.fgGroundOffsetY },
    scale: { far: A.farScale, mid: A.midScale, near: A.nearScale, fgFlowerHill: A.fgFlowerHillScale, fgBalloonRabbit: A.fgBalloonRabbitScale, fgGiftPile: A.fgGiftPileScale, fgArrowSign: A.fgArrowSignScale, fgGlobal: A.fgGlobalScale },
    sizes: Object.fromEntries(Object.keys(Object.assign({}, CHAPTER1_BG_ASSETS, CHAPTER1_FG_ASSETS)).map(k => { const im = getChapter1BgImg(k); return [k, im ? im.naturalWidth + '×' + im.naturalHeight : '-']; })),
    near: Object.assign({ status: st('near'), frameMode: !!A.nearFrameMode, drawW: 0, drawH: 0, offsetY: A.nearOffsetY, parallaxSetting: A.nearParallax }, (() => {
      const g = getChapter1NearFrameGeom();
      return { drawW: g.w, drawH: g.h, drawX: g.x, effectiveParallax: g.rate, shiftNow: g.shift, maxShift: g.spare,
               coversCanvasTop: g.coversTop, coversCanvasBottom: g.coversBottom, coversLeftRight: g.coversLeft && g.coversRight };
    })()),
    frontProps: (CHAPTER1_FG_PROPS[sid] || []).filter(p => p.layer === 'front').length,
    behindProps: (CHAPTER1_FG_PROPS[sid] || []).filter(p => p.layer !== 'front').length,
    bgm: { status: chapter1BgmStatus, volume: A.chapter1BgmVolume, playing: !!(chapter1Bgm && !chapter1Bgm.paused), nowPlaying: getCurrentBgmName() },
    propsThisStage: (CHAPTER1_FG_PROPS[sid] || []).map((p, i) => {
      const g = getChapter1FgPropGeom(sid, i, p);
      return { i, type: p.type, layer: p.layer || 'back',
               fadingForPlayer: p.layer === 'front' ? (p._why === 'player' || p._why === 'near') : '-', alphaNow: p.layer === 'front' ? Math.round((p._fade == null ? A.frontPropBaseAlpha : p._fade) * 100) / 100 : A.fgAlpha,
               worldX: p.x + ((chapter1FgOverrides[sid + ':' + i] || {}).dx || 0), loaded: !!getChapter1BgImg(g.key),
               screenX: Math.round(g.box.x), screenY: Math.round(g.box.y), w: Math.round(g.box.w), h: Math.round(g.box.h), scale: Math.round(g.sc * 10000) / 10000,
               onScreen: g.box.x < CANVAS_W && g.box.x + g.box.w > 0 };
    }),
  };
  console.log('[Chapter1BG] near 框景 ' + info.near.drawW + '×' + info.near.drawH + ' offsetY ' + A.nearOffsetY + ' 實際視差 ' + info.near.effectiveParallax
    + ' 蓋滿上緣 ' + info.near.coversCanvasTop + ' / 下緣 ' + info.near.coversCanvasBottom + '　front ' + info.frontProps + ' / behind ' + info.behindProps
    + '　BGM ' + chapter1BgmStatus + ' vol ' + A.chapter1BgmVolume);
  console.log('[Chapter1BG] far ' + info.far + ' / mid ' + info.mid + ' / near ' + info.near.status + '　foreground ' + info.foregroundLoaded
    + '　parallax ' + A.farParallax + ' / ' + A.midParallax + ' / ' + A.nearParallax + ' / fg ' + A.foregroundParallax
    + '　offsetY ' + A.farOffsetY + ' / ' + A.midOffsetY + ' / ' + A.nearOffsetY
    + '　scale ' + A.farScale + ' / ' + A.midScale + ' / ' + A.nearScale
    + '　alpha ' + A.farAlpha + ' / ' + A.midAlpha + ' / ' + A.nearAlpha
    + '　blur ' + A.farBlur + ' / ' + A.midBlur + ' / ' + A.nearBlur
    + '　sat ' + A.farSaturation + ' / ' + A.midSaturation + ' / ' + A.nearSaturation
    + '　bri ' + A.farBrightness + ' / ' + A.midBrightness + ' / ' + A.nearBrightness
    + '　veil ' + A.veilAlpha + '　fg ×' + A.fgGlobalScale + ' α' + A.fgAlpha);
  if (console.table) console.table(info.propsThisStage);
  console.log(info);
  return info;
}
if (typeof window !== 'undefined') window.debugChapter1Bg = debugChapter1Bg;
// v0.3.52-fix-1：console 直接調數值，例如 setChapter1Bg({ nearScale: 0.26, veilAlpha: 0.18 })（測試版會存到瀏覽器）
function setChapter1Bg(values) {
  if (!values || typeof values !== 'object') { console.log('[Chapter1BG] 可調的 key：', Object.keys(CHAPTER1_BG_DEFAULTS).join(', ')); return CHAPTER1_BG; }
  Object.keys(values).forEach(k => {
    const ok = typeof values[k] === 'number' && isFinite(values[k]);
    if (ok && k in CHAPTER1_BG_DEFAULTS) CHAPTER1_BG[k] = values[k];
    else if (ok && k.startsWith('platform.') && k.slice(9) in CHAPTER1_PLATFORM_DRAW_DEFAULTS) CHAPTER1_PLATFORM_DRAW[k.slice(9)] = values[k]; // 例：'platform.longOffsetY'
    else console.warn('[Chapter1BG] 略過：' + k);
  });
  if (typeof ADVENTURE_TEST_TOOLS_ENABLED !== 'undefined' && ADVENTURE_TEST_TOOLS_ENABLED) saveChapter1BgCalib();
  return debugChapter1Bg();
}
if (typeof window !== 'undefined') window.setChapter1Bg = setChapter1Bg;

// ── F4（在 1-1～1-3 時切換成第一章背景調整）──
var chapter1BgCalibTarget = 'far';   // far | mid | near | fg | flowerHill | balloonRabbit | giftPile | arrowSign | prop | veil
var chapter1BgCalibPropIdx = 0;
function loadChapter1BgCalib() {
  try {
    const raw = localStorage.getItem(CHAPTER1_BG_LS_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (!d || d.version !== GAME_VERSION) return;
    Object.keys(CHAPTER1_BG_DEFAULTS).forEach(k => { if (d.values && typeof d.values[k] === 'number' && isFinite(d.values[k])) CHAPTER1_BG[k] = d.values[k]; });
    if (d.props && typeof d.props === 'object') chapter1FgOverrides = d.props;
    Object.keys(CHAPTER1_PLATFORM_DRAW_DEFAULTS).forEach(k => { if (d.platform && typeof d.platform[k] === 'number' && isFinite(d.platform[k])) CHAPTER1_PLATFORM_DRAW[k] = d.platform[k]; });
  } catch (e) {}
}
function saveChapter1BgCalib() {
  try { localStorage.setItem(CHAPTER1_BG_LS_KEY, JSON.stringify({ version: GAME_VERSION, values: CHAPTER1_BG, props: chapter1FgOverrides, platform: CHAPTER1_PLATFORM_DRAW })); } catch (e) {}
}
if (typeof ADVENTURE_TEST_TOOLS_ENABLED !== 'undefined' && ADVENTURE_TEST_TOOLS_ENABLED) loadChapter1BgCalib();
function getChapter1BgCalibText() {
  const A = CHAPTER1_BG, r = v => Math.round(v * 1000) / 1000;
  let t = 'const CHAPTER1_BG_DEFAULTS = {\n';
  Object.keys(CHAPTER1_BG_DEFAULTS).forEach(k => { t += `  ${k}: ${r(A[k])},\n`; });
  t += '};\n// 單一 prop 微調（stage:index → dx / dy / s）\nconst CHAPTER1_FG_OVERRIDES = ' + JSON.stringify(chapter1FgOverrides) + ';';
  t += '\nconst CHAPTER1_PLATFORM_DRAW_DEFAULTS = ' + JSON.stringify(CHAPTER1_PLATFORM_DRAW) + ';';
  return t;
}
function handleChapter1BgCalibKey(e) {
  const A = CHAPTER1_BG, D = CHAPTER1_BG_DEFAULTS;
  const step = e.shiftKey ? 10 : 1, sStep = e.shiftKey ? 0.05 : 0.01;
  const sel = { Digit1: 'far', Digit2: 'mid', Digit3: 'near', Digit4: 'fg', Digit5: 'flowerHill', Digit6: 'balloonRabbit', Digit7: 'giftPile', Digit8: 'arrowSign',
                Digit9: 'prop', Digit0: 'veil', KeyU: 'platLong', KeyI: 'platWood', KeyO: 'platCloud' }[e.code];
  const done = () => { saveChapter1BgCalib(); e.preventDefault(); return true; };
  if (e.code === 'KeyB') { chapter1FrontPropDebug = !chapter1FrontPropDebug; e.preventDefault(); return true; } // v0.3.53：前景物件透明化外框
  if (sel) { chapter1BgCalibTarget = sel; e.preventDefault(); return true; }
  const tg = chapter1BgCalibTarget;
  const sid = (LEVELS[currentLevelIndex] || {}).stageId;
  const props = CHAPTER1_FG_PROPS[sid] || [];
  if (e.code === 'KeyN') { chapter1BgCalibPropIdx = (chapter1BgCalibPropIdx + 1) % Math.max(1, props.length); chapter1BgCalibTarget = 'prop'; e.preventDefault(); return true; }
  if (e.code === 'KeyH') { A.fgEnabled = A.fgEnabled ? 0 : 1; return done(); }
  if (e.code === 'KeyX') { if (tg === 'veil') A.veilEnabled = A.veilEnabled ? 0 : 1; else A.fgEnabled = A.fgEnabled ? 0 : 1; return done(); }
  const dy = e.code === 'KeyW' ? -step : (e.code === 'KeyS' ? step : 0);
  const dxp = e.code === 'KeyA' ? -1 : (e.code === 'KeyD' ? 1 : 0);
  const ds = e.code === 'BracketLeft' ? -sStep : (e.code === 'BracketRight' ? sStep : 0);
  const da = e.code === 'KeyQ' ? -0.05 : (e.code === 'KeyE' ? 0.05 : 0);
  const dbl = e.code === 'Semicolon' ? -0.5 : (e.code === 'Quote' ? 0.5 : 0);
  const dsat = e.code === 'Comma' ? -0.05 : (e.code === 'Period' ? 0.05 : 0);
  const dbri = e.code === 'Minus' ? -0.01 : (e.code === 'Equal' ? 0.01 : 0);
  const r2 = v => Math.round(v * 100) / 100, r3 = v => Math.round(v * 1000) / 1000;
  const lay = ['far', 'mid', 'near'].includes(tg) ? tg : null;
  if (lay && (dy || dxp || ds || da || dbl || dsat || dbri)) {
    A[lay + 'OffsetY'] += dy;
    if (dxp) A[lay + 'Parallax'] = Math.max(0, Math.min(1.5, r2(A[lay + 'Parallax'] + dxp * (e.shiftKey ? 0.05 : 0.01))));
    if (ds) A[lay + 'Scale'] = Math.max(0.1, r3(A[lay + 'Scale'] + ds));
    if (da) A[lay + 'Alpha'] = Math.max(0.1, Math.min(1, r2(A[lay + 'Alpha'] + da)));
    if (dbl) A[lay + 'Blur'] = Math.max(0, Math.min(8, r2(A[lay + 'Blur'] + dbl)));
    if (dsat) A[lay + 'Saturation'] = Math.max(0, Math.min(2, r2(A[lay + 'Saturation'] + dsat)));
    if (dbri) A[lay + 'Brightness'] = Math.max(0.3, Math.min(1.5, r2(A[lay + 'Brightness'] + dbri)));
    return done();
  }
  if (tg === 'veil' && da) { A.veilAlpha = Math.max(0, Math.min(0.6, r2(A.veilAlpha + da / 5))); return done(); }
  // v0.3.53：平台圖（W S 上下、[ ] 寬、; ' 高、Q E 全部平台透明度）
  const plk = { platLong: 'long', platWood: 'shortWood', platCloud: 'shortCloud' }[tg];
  if (plk && (dy || ds || dbl || da)) {
    const PD = CHAPTER1_PLATFORM_DRAW;
    PD[plk + 'OffsetY'] += dy;
    if (ds) PD[plk + 'ScaleX'] = Math.max(0.3, r2(PD[plk + 'ScaleX'] + ds));
    if (dbl) PD[plk + 'ScaleY'] = Math.max(0.3, r2(PD[plk + 'ScaleY'] + (dbl > 0 ? 0.01 : -0.01) * (e.shiftKey ? 5 : 1)));
    if (da) PD.alpha = Math.max(0.1, Math.min(1, r2(PD.alpha + da)));
    return done();
  }
  if (tg === 'fg' && (dy || dxp || ds || da)) {
    A.fgGroundOffsetY += dy;
    if (dxp) A.foregroundParallax = Math.max(0.5, Math.min(1.5, r2(A.foregroundParallax + dxp * 0.01)));
    if (ds) A.fgGlobalScale = Math.max(0.2, r2(A.fgGlobalScale + ds));
    if (da) A.fgAlpha = Math.max(0.1, Math.min(1, r2(A.fgAlpha + da)));
    return done();
  }
  if (CHAPTER1_FG_TYPES.includes(tg) && ds) {
    const k = CHAPTER1_FG_SRC[tg].scaleKey;
    A[k] = Math.max(0.02, r3(A[k] + ds / 10));
    return done();
  }
  if (tg === 'prop' && props.length && (dy || dxp || ds)) {
    const k = sid + ':' + chapter1BgCalibPropIdx;
    const ov = chapter1FgOverrides[k] || (chapter1FgOverrides[k] = { dx: 0, dy: 0, s: 1 });
    ov.dy += dy; ov.dx += dxp * step;
    if (ds) ov.s = Math.max(0.2, r2(ov.s + ds));
    return done();
  }
  if (e.code === 'KeyR') {
    const keysBy = { far: Object.keys(D).filter(k => k.startsWith('far')), mid: Object.keys(D).filter(k => k.startsWith('mid')),
      near: Object.keys(D).filter(k => k.startsWith('near')), veil: ['veilEnabled', 'veilAlpha'],
      fg: ['fgEnabled', 'foregroundParallax', 'fgGroundOffsetY', 'fgGlobalScale', 'fgAlpha'] };
    CHAPTER1_FG_TYPES.forEach(ty => { keysBy[ty] = [CHAPTER1_FG_SRC[ty].scaleKey]; });
    const plr = { platLong: 'long', platWood: 'shortWood', platCloud: 'shortCloud' }[tg];
    if (plr) ['ScaleX', 'ScaleY', 'OffsetY'].forEach(sfx => { CHAPTER1_PLATFORM_DRAW[plr + sfx] = CHAPTER1_PLATFORM_DRAW_DEFAULTS[plr + sfx]; });
    if (tg === 'prop') delete chapter1FgOverrides[sid + ':' + chapter1BgCalibPropIdx];
    else (keysBy[tg] || []).forEach(k => { A[k] = D[k]; });
    showHint('↺ 已重置：' + tg, 120);
    return done();
  }
  if (e.code === 'KeyC') {
    const text = getChapter1BgCalibText();
    console.log('[Chapter1BgCalib]\n' + text);
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(() => {}); } catch (err) {}
    showHint('📋 第一章背景數值已輸出到 console（也嘗試複製到剪貼簿）', 180);
    e.preventDefault(); return true;
  }
  // 方向鍵 / 空白鍵 / Z 留給小V（可邊跑邊看視差）；其他調整鍵不傳給遊戲
  if (/^Digit/.test(e.code) || ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ', 'KeyE', 'KeyN', 'KeyH', 'KeyX', 'BracketLeft', 'BracketRight',
       'Semicolon', 'Quote', 'Comma', 'Period', 'Minus', 'Equal', 'KeyU', 'KeyI', 'KeyO', 'KeyB'].includes(e.code)) { e.preventDefault(); return true; }
  return false;
}
function drawChapter1BgCalibOverlay() {
  const A = CHAPTER1_BG;
  const sid = (LEVELS[currentLevelIndex] || {}).stageId;
  const props = CHAPTER1_FG_PROPS[sid] || [];
  ctx.save();
  props.forEach((prop, i) => {
    const g = getChapter1FgPropGeom(sid, i, prop);
    if (g.drawX > CANVAS_W + 20 || g.drawX + g.drawW < -20) return;
    const selP = chapter1BgCalibTarget === 'prop' && i === chapter1BgCalibPropIdx;
    const selT = chapter1BgCalibTarget === prop.type || chapter1BgCalibTarget === 'fg';
    ctx.setLineDash([6, 3]);
    ctx.strokeStyle = selP ? '#ffe066' : (selT ? '#00ffc8' : 'rgba(255,255,255,0.7)');
    ctx.lineWidth = selP ? 3 : 1.5;
    ctx.strokeRect(g.box.x, g.box.y, g.box.w, g.box.h);
    ctx.setLineDash([]);
    ctx.font = 'bold 11px monospace'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText('#' + i + ' ' + prop.type, g.cxs, g.box.y - 4);
  });
  ctx.strokeStyle = 'rgba(0,255,200,0.7)'; ctx.setLineDash([8, 6]);
  ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(CANVAS_W, GROUND_Y); ctx.stroke(); ctx.setLineDash([]);
  const st = k => chapter1BgImgStatus[k] || '-';
  const fgN = props.filter(p => getChapter1BgImg(CHAPTER1_FG_SRC[p.type].key)).length;
  const tLabel = { far: '1 遠景 far', mid: '2 中景 mid', near: '3 近景 near', fg: '4 小物件全域', flowerHill: '5 花叢小丘', balloonRabbit: '6 藍色氣球兔',
                   giftPile: '7 禮物堆', arrowSign: '8 指路箭牌', prop: '9 單一 prop #' + chapter1BgCalibPropIdx, veil: '0 可讀性霧幕',
                   platLong: 'U 長平台圖', platWood: 'I 短木橋平台圖', platCloud: 'O 短雲朵平台圖' }[chapter1BgCalibTarget];
  const lf = l => l + ': offsetY ' + A[l + 'OffsetY'] + '  scale ' + A[l + 'Scale'] + '  parallax ' + A[l + 'Parallax'] + '  α' + A[l + 'Alpha'] + ' blur ' + A[l + 'Blur'] + ' sat ' + A[l + 'Saturation'] + ' bri ' + A[l + 'Brightness'] + '  圖=' + st(l);
  const ov = chapter1FgOverrides[sid + ':' + chapter1BgCalibPropIdx] || { dx: 0, dy: 0, s: 1 };
  const lines = [
    'Chapter 1 Parallax BG Calibration ON（F4 關閉）　' + sid + '　cameraX ' + Math.round(cameraX),
    'Target: ' + tLabel,
    lf('far'), lf('mid'), lf('near'),
    '霧幕 ' + (A.veilEnabled ? 'ON' : 'OFF') + ' α' + A.veilAlpha + '　canvas filter ' + (isChapter2CanvasFilterOk() ? '支援' : '不支援（fallback）'),
    '小物件：' + (A.fgEnabled ? '顯示' : '隱藏') + '  已載入 ' + fgN + '/' + props.length + '  parallax ' + A.foregroundParallax + '  地面偏移 +' + A.fgGroundOffsetY + '  全域 ×' + A.fgGlobalScale + ' α' + A.fgAlpha
      + '  prop#' + chapter1BgCalibPropIdx + ' dx ' + ov.dx + ' dy ' + ov.dy + ' ×' + ov.s,
    '  花叢 ×' + A.fgFlowerHillScale + '=' + st('fgFlowerHill') + '  兔 ×' + A.fgBalloonRabbitScale + '=' + st('fgBalloonRabbit')
      + '  禮物 ×' + A.fgGiftPileScale + '=' + st('fgGiftPile') + '  箭牌 ×' + A.fgArrowSignScale + '=' + st('fgArrowSign'),
    (() => { const PD = CHAPTER1_PLATFORM_DRAW, ng = getChapter1NearFrameGeom();
      return '平台圖 long ×' + PD.longScaleX + '/' + PD.longScaleY + ' offY ' + PD.longOffsetY + '  wood ×' + PD.shortWoodScaleX + '/' + PD.shortWoodScaleY + ' offY ' + PD.shortWoodOffsetY
        + '  cloud ×' + PD.shortCloudScaleX + '/' + PD.shortCloudScaleY + ' offY ' + PD.shortCloudOffsetY + '  α' + PD.alpha
        + '｜near 框景 ' + ng.w + '×' + ng.h + ' 實際視差 ' + ng.rate + ' 位移 ' + ng.shift + '/' + ng.spare + '｜BGM ' + chapter1BgmStatus; })(),
    '1 2 3 層｜4 小物件全域｜5~8 小物件種類｜9 / N 單一 prop｜0 霧幕｜W S 上下｜A D 視差 / prop 左右｜[ ] scale｜Q E 透明度',
    'U I O 長 / 木橋 / 雲朵平台（W S 上下　[ ] 寬　; \' 高　Q E 透明度）｜B 前景物件透明化外框 ' + (chapter1FrontPropDebug ? 'ON' : 'OFF'),
    '層：; \' blur　, . 飽和度　- = 亮度｜X 開關（霧幕 / 小物件）｜H 小物件｜R 重置｜C 輸出　方向鍵 / 空白 / Z 仍可操作小V',
  ];
  const w = 900, lh = 17, h = lines.length * lh + 12;
  ctx.fillStyle = 'rgba(0,0,0,0.78)';
  ctx.fillRect(10, 64, w, h);
  ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left';
  lines.forEach((ln, i) => { ctx.fillStyle = i === 0 ? '#00ffc8' : (i === 1 ? '#ffe066' : '#ffffff'); ctx.fillText(ln, 18, 64 + 18 + i * lh); });
  ctx.restore();
}

// v0.3.35：Boss 震動時整個世界一起晃（HUD 不晃）
function drawWorld() {
  // v0.3.38：2-4 Boss 房背景畫在最底層、固定在畫面上（不跟 cameraX、不跟震動一起晃，避免震動時露出黑邊）
  orangeKingBgDrawn = drawOrangeKingBossBg();
  const shake = getOrangeKingShakeOffset();
  if (shake) { ctx.save(); ctx.translate(shake.x, shake.y); }
  drawWorldInner();
  if (shake) ctx.restore();
}

// v0.3.38：橘子王 Boss 房背景（只在 2-4；圖片沒載好回傳 false → 照舊畫藍天）
var orangeKingBgDrawn = false;
function drawOrangeKingBossBg() {
  if (!isOrangeKingStageActive()) return false;
  const img = getOrangeKingBossImg('bossRoomBg');
  if (!img) return false;
  // cover：等比例縮放到完全蓋滿 960×540（1920×1081 → ×0.5），置中，不變形、不留黑邊
  const scale = Math.max(CANVAS_W / img.naturalWidth, CANVAS_H / img.naturalHeight);
  const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, (CANVAS_W - w) / 2, (CANVAS_H - h) / 2, w, h);
  if (ORANGE_KING_BG_DIM_ALPHA > 0) {
    ctx.fillStyle = 'rgba(0,0,0,' + ORANGE_KING_BG_DIM_ALPHA + ')';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
  ctx.restore();
  return true;
}

function drawWorldInner() {
  // v0.3.47：第二章 2-1～2-3 正式 parallax 背景（far / mid / near）
  chapter2BgDrawn = drawChapter2ParallaxBg();
  // v0.3.52：第一章 1-1～1-3 正式 parallax 背景（far / mid / near + 地面小物件，都在玩法物件後方）
  chapter1BgDrawn = drawChapter1ParallaxBackground();
  // Sky gradient（v0.3.38：2-4 已畫 Boss 房背景時跳過；v0.3.47：第二章背景已畫時也跳過；v0.3.52：第一章同）
  if (!orangeKingBgDrawn && !chapter2BgDrawn && !chapter1BgDrawn) {
  const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  grad.addColorStop(0, COLORS.sky);
  grad.addColorStop(1, COLORS.skyGrad2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  const cx = cameraX;

  // Ground（v0.3.38：Boss 房背景自帶地板，預設不再蓋舊地面；碰撞仍是 GROUND_Y）
  let chapter2TilesDrawn = false;
  if (chapter1BgDrawn && drawChapter1GroundAndPits(cx)) {
    chapter2TilesDrawn = true; // v0.3.54：第一章正式地面帶 + 凹洞（沿用同一個旗標：不再畫舊凹洞 / 坑底平台色塊）
  } else if (chapter2BgDrawn && drawChapter2GroundAndPits(cx)) {
    chapter2TilesDrawn = true; // v0.3.49：正式地面帶 + 凹洞邊緣 / 陰影（只畫在實體地面；凹洞不填）
  } else if (chapter2BgDrawn && CHAPTER2_BG.chapter2GroundBlendEnabled) {
    drawChapter2GroundBlend(); // v0.3.48：第二章暫時地面（v0.3.49 起為地面帶圖沒載好時的 fallback）
  } else if (!orangeKingBgDrawn || ORANGE_KING_BG_DRAW_OLD_GROUND) {
  ctx.fillStyle = COLORS.ground;
  ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);
  ctx.fillStyle = COLORS.groundDark;
  ctx.fillRect(0, GROUND_Y, CANVAS_W, 8);
  ctx.fillStyle = COLORS.dirt;
  ctx.fillRect(0, GROUND_Y + 8, CANVAS_W, CANVAS_H - GROUND_Y - 8);
  }

  // v0.3.27-terrain：地面缺口（低處坑道）— 挖掉地面，坑底由平台繪製（v0.3.49：第二章正式地面帶已畫好凹洞時跳過）
  if (!chapter2TilesDrawn) groundGaps.forEach(g => {
    const gx = g.x - cx;
    if (gx > CANVAS_W + 10 || gx + g.w < -10) return;
    ctx.fillStyle = '#4a3220';                       // 坑內陰影
    ctx.fillRect(gx, GROUND_Y, g.w, CANVAS_H - GROUND_Y);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';              // 左右坑壁
    ctx.fillRect(gx, GROUND_Y, 6, CANVAS_H - GROUND_Y);
    ctx.fillRect(gx + g.w - 6, GROUND_Y, 6, CANVAS_H - GROUND_Y);
  });

  // Finish flag（v0.3.35：Boss 房沒有終點線）
  if (!isOrangeKingStageActive()) {
    if (chapter2BgDrawn || chapter1BgDrawn) { // v0.3.48：終點旗加白色外光，橘色背景上也看得清楚（v0.3.52-fix-1：第一章也套用）
      ctx.save(); ctx.shadowColor = 'rgba(255,255,255,0.95)'; ctx.shadowBlur = 10;
      drawFinishFlag(cx);
      ctx.restore();
    } else drawFinishFlag(cx);
  }

  // Platforms
  platforms.forEach(p => {
    const sx = p.x - cx;
    if (sx > CANVAS_W + 10 || sx + p.w < -10) return;
    // v0.3.40：教學衝撞時的安全平台提示（光暈在平台後、掃光 / 箭頭在平台上）
    if (orangeKingBoss) drawOrangeKingPlatformHint(p, cx, 'back');
    // v0.3.39：2-4 平台改畫正式美術（碰撞不變）；圖片沒載好就照舊畫色塊
    if (drawOrangeKingPlatformArt(p, cx)) { if (orangeKingBoss) drawOrangeKingPlatformHint(p, cx, 'front'); return; }
    // v0.3.49：第二章 — 坑底已由地面帶畫好；一般平台換正式平台圖（碰撞不變；圖沒載好照舊畫色塊）
    if (chapter2TilesDrawn && isChapter2PitFloorPlatform(p)) return;
    if (chapter2BgDrawn && !isChapter2PitFloorPlatform(p) && drawChapter2PlatformArt(p, cx)) return;
    // v0.3.53：第一章平台圖（可站立面對齊 hitbox 上緣；圖沒載好 → 照舊畫矩形）
    if (chapter1BgDrawn && drawChapter1PlatformArt(p, cx)) return;
    ctx.fillStyle = COLORS.platform;
    ctx.fillRect(sx, p.y, p.w, p.h);
    ctx.fillStyle = COLORS.platformTop;
    ctx.fillRect(sx, p.y, p.w, 6);
    // v0.3.38：Boss 房背景較複雜，平台加深色描邊，維持可讀性（位置 / 碰撞不變）
    // v0.3.47：第二章 parallax 背景也是橘色調 → 同樣加深色描邊 + 下緣陰影，平台才不會和背景混在一起
    if (chapter2BgDrawn) {
      ctx.fillStyle = 'rgba(40,18,5,0.35)';
      ctx.fillRect(sx + 3, p.y + p.h, p.w - 6, 5);
      ctx.fillStyle = 'rgba(255,240,200,0.75)'; // v0.3.48：頂面亮線，可站的那一面更好辨識
      ctx.fillRect(sx + 2, p.y + 1, p.w - 4, 2);
    }
    // v0.3.52-fix-1：第一章背景上 — 非常輕微的下緣陰影 + 深色細描邊（位置 / 碰撞不變）
    if (chapter1BgDrawn) {
      ctx.fillStyle = 'rgba(40,18,5,0.22)';
      ctx.fillRect(sx + 3, p.y + p.h, p.w - 6, 4);
      ctx.strokeStyle = 'rgba(60,30,10,0.55)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(sx + 0.75, p.y + 0.75, p.w - 1.5, p.h - 1.5);
    }
    if (orangeKingBgDrawn || chapter2BgDrawn) {
      ctx.strokeStyle = 'rgba(30,15,5,0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + 1, p.y + 1, p.w - 2, p.h - 2);
    }
    if (orangeKingBoss) drawOrangeKingPlatformHint(p, cx, 'front'); // v0.3.40（色塊 fallback 也有提示）
  });

  // Coins
  const bobT = frameCount * 0.07;
  coins.forEach(c => {
    if (c.collected) return;
    const sx = c.x - cx;
    if (sx < -20 || sx > CANVAS_W + 20) return;
    const sy = c.y + Math.sin(bobT + c.bobOffset) * 5;
    if (chapter2BgDrawn || chapter1BgDrawn) drawChapter2ItemGlow(sx, sy, 15, true); // v0.3.48：金幣淡白外光（v0.3.52-fix-1：第一章也套用）
    drawCoin(sx, sy);
  });

  // 260 Balloons
  balloons260.forEach(b => {
    if (b.collected) return;
    const sx = b.x - cx;
    if (sx < -20 || sx > CANVAS_W + 20) return;
    const sy = b.y + Math.sin(bobT * 0.7 + b.bobOffset) * 6;
    if (chapter2BgDrawn || chapter1BgDrawn) drawChapter2ItemGlow(sx, sy, 20, false); // v0.3.48：道具輕微外光（v0.3.52-fix-1：第一章也套用）
    drawBalloon260(sx, sy);
  });

  // Spikes
  // v0.3.52-fix-1：第一章背景上尖刺加白色外光，不融進背景（判定不變）
  if (chapter1BgDrawn) { ctx.save(); ctx.shadowColor = 'rgba(255,255,255,0.95)'; ctx.shadowBlur = 8; }
  spikes.forEach(s => {
    const sx = s.x - cx;
    if (sx > CANVAS_W + 10 || sx + s.w < -10) return;
    if (drawChapter1SpikeArt(sx, s)) return; // v0.3.54：第一章尖刺圖（hitbox / 傷害判定不變；圖沒載好照舊畫三角形）
    drawSpike(sx, s.y, s.w, s.h);
  });
  if (chapter1BgDrawn) ctx.restore();

  // v0.3.48：第二章小怪落地陰影（畫在小怪之前；不改 hitbox）
  if (chapter2BgDrawn || chapter1BgDrawn) drawChapter2EnemyShadows(cx); // v0.3.52-fix-1：第一章也有小怪落地陰影
  // Enemies
  enemies.forEach(e => {
    if (!e.active) return;
    const sx = e.x - cx;
    if (sx > CANVAS_W + 10 || sx + e.w < -10) return;
    // v0.3.53-fix-1：第一章背景恢復飽和後，小怪加白色外光（粉紅蠍子在粉紅氣球前也看得清楚；hitbox 不變）
    if (chapter1BgDrawn) { ctx.save(); ctx.shadowColor = 'rgba(255,255,255,0.95)'; ctx.shadowBlur = 10; }
    drawEnemy(sx, e.y, e.w, e.h, e.hitFlash > 0, e.vx, e); // v0.3.15：pass e for variant/tier
    if (chapter1BgDrawn) ctx.restore();
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
    if (chapter2BgDrawn || chapter1BgDrawn) drawChapter2ItemGlow(sx, sy, 20, false); // v0.3.48：道具輕微外光（v0.3.52-fix-1：第一章也套用）
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
    // v0.3.15-test-2：使用 spinning enemy 保存的 skinKey 畫正確 hurt 圖
    const hurtImg = getScorpionHurtImgForSkin(s.skinKey || 'scorpion_normal');
    ctx.save();
    ctx.translate(sx + s.w/2, s.y + s.h/2);
    ctx.rotate(s.angle);
    if (hurtImg) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      // v0.3.17-test-2：套用 drawScaleMultiplier，heavyBody (1.18×) 打飛後維持 heavy 尺寸
      const spinScaleMult = s.drawScaleMultiplier || 1.0;
      const drawW = s.w * SCORPION_DRAW_SCALE * spinScaleMult;
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
    if (chapter1BgDrawn) { ctx.save(); ctx.shadowColor = 'rgba(255,255,255,0.9)'; ctx.shadowBlur = 10; } // v0.3.53-fix-1：第一章橘子怪外光
    drawOrangeNemesis(sx, o);
    if (chapter1BgDrawn) ctx.restore();
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

  // v0.3.35：2-4 橘子王（預警線 / 油漬 / 金色油管環 / 本體，畫在小V之前）
  if (orangeKingBoss) drawOrangeKingBack(cx);

  // v0.3.55：氣球狗改成正式動作圖，固定在小V後方腳邊同步跟隨
  // v0.3.58：所有動作（idle / run / jump / sad / angry）小狗一律畫在小V「上面」；取消 v0.3.57 揮劍 / 揮槌時躲到後面的例外
  //          小狗位在小V背後腳邊，劍 / 槌 / 王權劍都往面向的前方揮，兩者不重疊 → 武器不會被擋（實測截圖確認）
  // v0.3.55：補血光暈畫在小V後面（不會把小V洗白），愛心 / 數字畫在小V前面
  try { drawHealFx(cx, 'back'); } catch (e) {}
  // Player
  drawPlayer(cx);
  if (bringBalloonDog) {
    try { drawCompanionDog(cx); } catch (e) { console.warn('[DogArt] draw error', e); }
  }
  try { drawHealFx(cx, 'front'); } catch (e) {}

  // v0.3.14-test-2：oil sprite overlay — 畫在玩家上方，讓油圖覆蓋玩家
  orangeNemeses.forEach(o => {
    const sx = o.x - cx;
    if (sx > CANVAS_W + 60 || sx + o.w < -CONFIG.ORANGE_SPRAY_W) return;
    drawOrangeOilOverlay(sx, o);
  });

  // v0.3.19：Chapter 2 煙囟橘子（本體畫在玩家之前，油幕也在同一 call 裡）
  drawChimneyOranges(cx);
  // v0.3.20：Chapter 2 雙噴嘴橘子
  drawDualNozzleOranges(cx);
  // v0.3.21：Chapter 2 向上油幕橘子
  drawFanOranges(cx);
  // v0.3.26：飛行油彈橘子（美術測試）
  drawProjectileOranges(cx);
  drawProjectileOrangeShots(cx); // v0.3.26：油彈畫在本體之上
  drawProjectileOrangeHitboxDebug(cx);         // v0.3.26：damage hitbox 紅框（測試版）
  drawProjectileOilShotCalibrationOverlay(cx); // v0.3.26：F7 定位模式（測試版）
  // v0.3.35：橘子王前景層（水平油柱、拋物線油彈在平台與角色前方）
  if (orangeKingBoss) drawOrangeKingFront(cx);
  // v0.3.47：第二章前景點綴（在小V / 敵人之後，HUD 之前）
  drawChapter2ForegroundProps();
  // v0.3.53：第一章前方小物件（小V靠近時半透明）
  drawChapter1FrontForegroundProps();
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

  // v0.3.46：橙煌王權劍（2-4 撿到金色油管環後）；F4 預覽時可切換 王權劍＋原圖 ghost / 只看王權劍 / 只看原圖
  let royalN = 0, ghostImg = null;
  const swordFrame = /^swordAttack0([1-4])$/.exec(heroKey);
  if (swordFrame) {
    const calibRoyal = getRoyalSwordCalibFrame();
    const wantRoyal = calibRoyal ? orangeKingRoyalPreviewMode !== 2 : isRoyalSwordActive();
    const rImg = wantRoyal ? getAdventureImage('royalSwordAttack0' + swordFrame[1]) : null;
    if (rImg) {
      if (calibRoyal && orangeKingRoyalPreviewMode === 0) ghostImg = heroImg; // 原本氣球劍 frame 半透明對照
      heroImg = rImg;
      royalN = Number(swordFrame[1]);
    }
  }

  const effectiveScale = useHammerScale ? HAMMER_ATTACK_SCALE_MULTIPLIER : 1;

  if (!player.facingRight) {
    ctx.translate(sx + player.w, sy);
    ctx.scale(-1, 1);
    if (heroImg) {
      // Foot anchor 對齊：圖片 88.3% 高度處對齊 hitbox 底部（local 座標）
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const hr = getHeroDrawRect(heroImg, effectiveScale, royalN); // v0.3.46：hammer 補償倍率 / 王權劍定位
      ctx.drawImage(heroImg, hr.dX, hr.dY, hr.dW, hr.dH);
      if (ghostImg) { // F4：原本氣球劍 frame 半透明對照
        const gr = getHeroDrawRect(ghostImg, 1, 0);
        ctx.save(); ctx.globalAlpha = 0.4; ctx.drawImage(ghostImg, gr.dX, gr.dY, gr.dW, gr.dH); ctx.restore();
      }
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
      const hr = getHeroDrawRect(heroImg, effectiveScale, royalN); // v0.3.46：hammer 補償倍率 / 王權劍定位
      ctx.drawImage(heroImg, hr.dX, hr.dY, hr.dW, hr.dH);
      if (ghostImg) { // F4：原本氣球劍 frame 半透明對照
        const gr = getHeroDrawRect(ghostImg, 1, 0);
        ctx.save(); ctx.globalAlpha = 0.4; ctx.drawImage(ghostImg, gr.dX, gr.dY, gr.dW, gr.dH); ctx.restore();
      }
    } else if (playerImg.complete && playerImg.naturalWidth > 0) {
      ctx.drawImage(playerImg, 0, 0, player.w, player.h);
    } else {
      drawPlayerFallback(0, 0, player.w, player.h);
    }
  }

  // Attack effect
  // v0.3.35：劍 / 槌攻擊判定框只在 hitbox debug（測試版 F3）開啟時畫；正式遊玩不顯示（實際 hitbox 不變）
  const showWeaponHitbox = ADVENTURE_TEST_TOOLS_ENABLED && projectileOrangeHitboxDebugVisible;
  if (player.meleeActive > 0 && showWeaponHitbox) {
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
  } else if (player.meleeHammerActive > 0 && showWeaponHitbox) {
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
  } else if (player.attackActive > 0 && player.meleeActive <= 0 && player.meleeHammerActive <= 0) {
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

// ════════════════════════════════════════════════════════════════════
//  v0.3.50：道具 / 過關旗正式圖（全章節通用）— 金幣、260 長條氣球、圓氣球、通用過關旗
//  ・只換外觀：數量、拾取判定（COIN_R / BALLOON_W×H / 圓氣球 R16）、過關判定（FINISH_X）完全不變
//  ・圖片沒載好 → 自動退回原本的簡易畫法；UI 圖示退回原本 emoji
// ════════════════════════════════════════════════════════════════════
const ADVENTURE_ITEM_ICON_PATHS = {
  coin:     'assets/adventure/items/coin_gold.png',
  b260:     'assets/adventure/items/balloon_260_blue.png',
  round:    'assets/adventure/items/balloon_round_red.png',
  goalFlag: 'assets/adventure/items/adventure_goal_flag.png',
};
// 量自原圖（1254×1254）：對齊點 [x, y]
const ADVENTURE_ITEM_ICON_SRC = {
  coin:     { anchor: [629.5, 622.5] },   // 圓幣中心（幣面寬 1078）
  b260:     { anchor: [631.5, 632] },     // 斜放長條的中心（內容框 1183×1178）
  round:    { anchor: [626.5, 544] },     // 球體中心（球寬 919，結在下方 y 1170）
  goalFlag: { anchor: [352, 1246] },      // 旗桿中心 x / 石座底 y（整支旗高 1239）
};
const ADVENTURE_ITEM_ICON_DEFAULTS = {
  // 金幣：幣面直徑 ≈ 24px（原本 20px，略大更清楚；拾取判定仍是 COIN_R 10）
  coinIconScale: 0.0223, coinIconOffsetX: 0, coinIconOffsetY: 0, coinIconGlowAlpha: 0.3,
  // 260：內容框 ≈ 51px（原本畫在 x, y+15 的長條，約 14×44；斜放所以框稍大才不會太細），中心對齊原本長條中心
  balloon260IconScale: 0.043, balloon260IconOffsetX: 0, balloon260IconOffsetY: 15,
  // 圓氣球：球體直徑 ≈ 34px（原本 R16 = 32px），球心對齊原本圓心
  balloonRoundIconScale: 0.037, balloonRoundIconOffsetX: 0, balloonRoundIconOffsetY: 0,
  // 過關旗：整支 ≈ 150px 高（原本旗桿 120px），旗桿對齊 FINISH_X + 3（原本旗桿中心），石座底略壓進地面 3px
  goalFlagScale: 0.121, goalFlagOffsetX: 3, goalFlagOffsetY: 3, goalFlagAlpha: 1,
};
const ADVENTURE_ITEM_ICON = Object.assign({}, ADVENTURE_ITEM_ICON_DEFAULTS);
const ADVENTURE_ITEM_ICON_LS_KEY = 'balloonV_itemIconCalib__' + GAME_VERSION;
const adventureItemIconImgs = {}, adventureItemIconStatus = {};
// v0.3.50-fix-1：載入來源依序嘗試（任一成功就用）：
//   1. GitHub Pages（resolveAdventureAssetSrc，正式部署位置）
//   2. 和目前網頁同一個網站的相對路徑（遊戲放在別的網址 / 本機測試時）
//   3. raw.githubusercontent.com（repo 一 push 就有，不用等 Pages 重新部署）
// 每張圖都記錄：每個嘗試的完整網址與結果、最後成功的網址、naturalWidth / naturalHeight
const ADVENTURE_ITEM_ICON_RAW_BASE = 'https://raw.githubusercontent.com/vashyang1120/balloon-v-rush/main/';
const adventureItemIconInfo = {}; // key → { status, url, w, h, tried: [{ url, result }] }
function getAdventureItemIconCandidates(key) {
  const p = ADVENTURE_ITEM_ICON_PATHS[key];
  const q = '?v=' + encodeURIComponent(GAME_VERSION);
  const list = [resolveAdventureAssetSrc(p) + q];
  try {
    if (typeof location !== 'undefined' && location.href) list.push(new URL(p, location.href).href + q);
  } catch (e) {}
  list.push(ADVENTURE_ITEM_ICON_RAW_BASE + p + q);
  return list.filter((u, i) => u && list.indexOf(u) === i);
}
function initAdventureItemIcons() {
  if (typeof Image === 'undefined') return;
  Object.keys(ADVENTURE_ITEM_ICON_PATHS).forEach(key => {
    if (adventureItemIconStatus[key]) return;
    adventureItemIconStatus[key] = 'loading';
    const info = adventureItemIconInfo[key] = { status: 'loading', url: '', w: 0, h: 0, tried: [] };
    const cands = getAdventureItemIconCandidates(key);
    const tryAt = (i) => {
      if (i >= cands.length) {
        adventureItemIconStatus[key] = 'error'; info.status = 'error';
        console.error('[ItemIcon] ❌ ' + key + ' 全部來源都載入失敗（改用舊畫法 / emoji）：\n'
          + info.tried.map(t => '   ' + t.result + '  ' + t.url).join('\n'));
        return;
      }
      const url = cands[i];
      try {
        const img = new Image();
        img.onload = () => {
          if (!img.naturalWidth) { info.tried.push({ url, result: 'error（naturalWidth 0）' }); tryAt(i + 1); return; }
          adventureItemIconImgs[key] = img;
          adventureItemIconStatus[key] = 'ok';
          Object.assign(info, { status: 'ok', url, w: img.naturalWidth, h: img.naturalHeight });
          info.tried.push({ url, result: 'ok' });
          console.info('[ItemIcon] ✅ ' + key + ' 載入成功 ' + img.naturalWidth + '×' + img.naturalHeight + '（第 ' + (i + 1) + ' 個來源）\n   ' + url
            + (i > 0 ? '\n   前面失敗的來源：\n' + info.tried.slice(0, -1).map(t => '   ' + t.result + '  ' + t.url).join('\n') : ''));
        };
        img.onerror = () => { info.tried.push({ url, result: 'error' }); console.warn('[ItemIcon] ' + key + ' 來源載入失敗，改試下一個：' + url); tryAt(i + 1); };
        img.src = url;
      } catch (e) { info.tried.push({ url, result: 'exception ' + e.message }); tryAt(i + 1); }
    };
    tryAt(0);
  });
}
// console 手動查詢：debugItemIcons()
function debugItemIcons() {
  const rows = Object.keys(ADVENTURE_ITEM_ICON_PATHS).map(k => {
    const i = adventureItemIconInfo[k] || {};
    return { key: k, status: adventureItemIconStatus[k] || '-', url: i.url || '(none)', naturalWidth: i.w || 0, naturalHeight: i.h || 0,
             tried: (i.tried || []).map(t => t.result + ' ' + t.url).join(' | ') };
  });
  try { console.table(rows); } catch (e) { console.log(rows); }
  return rows;
}
if (typeof window !== 'undefined') window.debugItemIcons = debugItemIcons;
function getAdventureItemIconImg(key) { // v0.3.51：不再於繪製時觸發載入（common 群組開機時已載好）
  const img = adventureItemIconImgs[key];
  return (img && img.complete && img.naturalWidth > 0) ? img : null;
}
function getAdventureItemIconSrc(key) {
  const info = adventureItemIconInfo[key];
  return (info && info.url) ? info.url : getAdventureItemIconCandidates(key)[0];
}
// 畫面上畫一個道具圖（以對齊點對準 (x, y)）；回傳 false = 圖沒載好
function drawAdventureItemIcon(key, x, y, scale, alpha) {
  const img = getAdventureItemIconImg(key);
  if (!img) return false;
  const a = ADVENTURE_ITEM_ICON_SRC[key].anchor;
  const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
  ctx.save();
  if (alpha != null) ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, x - a[0] * scale, y - a[1] * scale, w, h);
  ctx.restore();
  return true;
}
// UI（HTML）用的小圖示：統一 1.15em；圖片失敗 → 退回原本 emoji
function itemIconHtml(key, emoji) {
  if (adventureItemIconStatus[key] === 'error' || typeof document === 'undefined') return emoji;
  if (!adventureItemIconStatus[key]) return emoji; // v0.3.51：還沒進入載入流程 → 先用 emoji（不觸發載入）
  const e = String(emoji).replace(/'/g, '');
  // 已載入 → 用成功的網址；還在載入 → 先用第一個來源，失敗時改用 raw.githubusercontent，再失敗才換回 emoji
  const raw = ADVENTURE_ITEM_ICON_RAW_BASE + ADVENTURE_ITEM_ICON_PATHS[key] + '?v=' + encodeURIComponent(GAME_VERSION);
  return '<img class="adv-item-icon" src="' + getAdventureItemIconSrc(key) + '" alt="' + e + '"'
    + ' style="width:1.15em;height:1.15em;object-fit:contain;vertical-align:-0.2em;display:inline-block"'
    + ' onerror="if(!this.dataset.rawTried){this.dataset.rawTried=1;this.src=\'' + raw + '\';}else{this.replaceWith(document.createTextNode(\'' + e + '\'));}">';
}
function loadAdventureItemIconCalib() {
  try {
    const raw = localStorage.getItem(ADVENTURE_ITEM_ICON_LS_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (!d || d.version !== GAME_VERSION || !d.values) return;
    Object.keys(ADVENTURE_ITEM_ICON_DEFAULTS).forEach(k => { if (typeof d.values[k] === 'number' && isFinite(d.values[k])) ADVENTURE_ITEM_ICON[k] = d.values[k]; });
  } catch (e) {}
}
function saveAdventureItemIconCalib() {
  try { localStorage.setItem(ADVENTURE_ITEM_ICON_LS_KEY, JSON.stringify({ version: GAME_VERSION, values: ADVENTURE_ITEM_ICON })); } catch (e) {}
}
// v0.3.50-fix-1：初始化不依賴任何後面才宣告的常數（定位暫存只有測試版會寫入，正式版讀不到也不影響）
try { loadAdventureItemIconCalib(); } catch (e) {}
// v0.3.51：道具圖改由 preloadAssetGroup('common') 載入（多來源 Pages → 相對路徑 → raw 的策略保留在共用載入器）

function drawCoin(x, y) {
  // v0.3.50：正式金幣圖（淡金外光 + 圖）；沒載好 → 原本畫法
  const A = ADVENTURE_ITEM_ICON;
  if (getAdventureItemIconImg('coin')) {
    const cx0 = x + A.coinIconOffsetX, cy0 = y + A.coinIconOffsetY;
    if (A.coinIconGlowAlpha > 0) {
      const r = 1078 * A.coinIconScale * 0.75;
      const gr = ctx.createRadialGradient(cx0, cy0, 0, cx0, cy0, r);
      gr.addColorStop(0, 'rgba(255,240,170,' + A.coinIconGlowAlpha + ')'); gr.addColorStop(1, 'rgba(255,230,140,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx0, cy0, r, 0, Math.PI * 2); ctx.fill();
    }
    if (drawAdventureItemIcon('coin', cx0, cy0, A.coinIconScale)) return;
  }
  drawCoinFallback(x, y);
}
function drawCoinFallback(x, y) {
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
  // v0.3.50：正式 260 長條氣球圖（中心對齊原本長條中心 x, y+15）；沒載好 → 原本畫法
  const A = ADVENTURE_ITEM_ICON;
  if (drawAdventureItemIcon('b260', x + A.balloon260IconOffsetX, y + A.balloon260IconOffsetY, A.balloon260IconScale)) return;
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
  // v0.3.50：正式圓氣球圖（球心對齊原本圓心）；沒載好 → 原本畫法
  const IA = ADVENTURE_ITEM_ICON;
  if (drawAdventureItemIcon('round', x + IA.balloonRoundIconOffsetX, y + IA.balloonRoundIconOffsetY, IA.balloonRoundIconScale)) return;
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

// ══ v0.3.55：氣球小狗正式動作圖（idle + run 01～04）══
// 實際檔案：idle 512×512；run_01 448×448、run_02 434×434、run_03 446×446、run_04 480×480（畫布大小不同，但狗本身像素比例相同）
// 量自原圖（每格的穩定錨點）：collar = 黃色蝴蝶結中心 x、feet = 最低的腳底 y、nose = 粉紅鼻子中心
//   → 每格都以「蝴蝶結 x + 腳底 y」對齊，同一個顯示倍率，換格時狗不會忽大忽小或左右跳動
const DOG_ART_ASSETS = {
  idle: 'assets/adventure/companions/dog/dog_idle.png',
  run1: 'assets/adventure/companions/dog/dog_run_01.png',
  run2: 'assets/adventure/companions/dog/dog_run_02.png',
  run3: 'assets/adventure/companions/dog/dog_run_03.png',
  run4: 'assets/adventure/companions/dog/dog_run_04.png',
  // v0.3.56：跳躍上升 / 下落（repo 實際檔名；兩張都是 448×448）
  jumpUp:   'assets/adventure/companions/dog/dog_jump_up.png',
  jumpFall: 'assets/adventure/companions/dog/dog_jump_fall.png',
  // v0.3.57：受傷 / 攻擊助威（repo 實際檔名；兩張都是 448×448）
  sad:   'assets/adventure/companions/dog/dog_sad.png',
  angry: 'assets/adventure/companions/dog/dog_angry.png',
};
const DOG_ART_SRC = {
  idle: { collarX: 324, feetY: 460, noseX: 397, noseY: 267 },
  run1: { collarX: 308, feetY: 384, noseX: 399, noseY: 205 },
  run2: { collarX: 267, feetY: 390, noseX: 367, noseY: 214 },
  run3: { collarX: 307, feetY: 389, noseX: 396, noseY: 194 },
  run4: { collarX: 347, feetY: 402, noseX: 431, noseY: 214 },
  // v0.3.56：量自 dog_jump_up.png / dog_jump_fall.png（蝴蝶結中心、最低腳底、粉紅鼻子中心）
  jumpUp:   { collarX: 320, feetY: 409, noseX: 382, noseY: 160 },
  jumpFall: { collarX: 246, feetY: 395, noseX: 371, noseY: 265 },
  // v0.3.57：量自 dog_sad.png（蜷縮、雙眼緊閉）/ dog_angry.png（前腳伸直、屁股抬高、呲牙）
  sad:   { collarX: 275, feetY: 375, noseX: 360, noseY: 274 },
  angry: { collarX: 273, feetY: 396, noseX: 375, noseY: 222, angerX: 318, angerY: 88 }, // v0.3.58：怒氣符號移到頭頂（原本在頭的前上方，會壓到小V揮劍時的手 / 劍柄）
};
// v0.3.57：每張圖頭頂的高度（量自原圖最上緣，用來放尋寶 L3 的驚嘆號）
const DOG_ART_HEAD_TOP = { idle: 142, run1: 68, run2: 72, run3: 54, run4: 77, jumpUp: 43, jumpFall: 86, sad: 109, angry: 70 };
// v0.3.56：使用者實測後的建議初值（測試版可用 ` 鍵開「狗狗校準」即時調整）
const DOG_ART_DEFAULTS = {
  scale: 0.16,          // 原圖像素 × 0.16：站姿約 60×51px、跑姿約 68×51px
  behindX: 45,          // 蝴蝶結距離小V中心（往後方）45px
  footOffsetY: 6,       // v0.3.57：2 → 6，腳底稍微壓進草皮（實測 2px 看起來有點浮空）；另外加貼地陰影
  runFrameMs: 150,      // 跑步 4 格循環，每格 150ms（整圈 0.6 秒）
};
const DOG_ART = Object.assign({}, DOG_ART_DEFAULTS, {
  jumpFrame: 'jumpUp',    // v0.3.56：跳躍上升 → dog_jump_up
  fallFrame: 'jumpFall',  // v0.3.56：下落 → dog_jump_fall
  attackFrame: 'angry',   // v0.3.57：小V揮劍 / 揮槌 → dog_angry（助威，沒有攻擊判定）
  hurtFrame: 'sad',       // v0.3.57：小V受傷 → dog_sad（蜷縮、雙眼緊閉）
  hurtShakeFrames: 20,    // 受傷後前 20 步（約 0.33 秒）狗狗左右抖動（只影響畫面）
  hurtShakePx: 2,
  attackBackX: 14,        // v0.3.58：小狗改畫在小V上層後，揮劍（含王權劍）時 dog_angry 往小V背後多退 14px（只是畫面位置，跟隨 / 碰撞不變），讓開劍柄與揮劍的手
  attackBackXHammer: 8,   // v0.3.58：揮槌時退 8px（槌子舉高時會往後揮，退太多反而壓到槌子；實測 8px 最少重疊）
});
const DOG_ART_LS_KEY = 'balloonV_dogArtCalib__' + GAME_VERSION; // 只存狗狗視覺校準 4 個數字（測試版）
const dogArtImgs = {}, dogArtStatus = {};
let dogArtModeLock = null;   // 'sprite' | 'vector'：每關開始時決定一次（遊玩中不換圖）
let dogRunAnimStart = 0, dogWasRunning = false, dogLastDraw = null;
function getDogArtImg(key) { const im = dogArtImgs[key]; return (im && im.complete !== false && im.naturalWidth > 0) ? im : null; }
function isDogArtReady() { return Object.keys(DOG_ART_ASSETS).every(k => getDogArtImg(k)); }
function dogNowMs() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }
// 小V目前狀態 → 小狗動作
// v0.3.56：和小V完全相同的受傷判定（damagePlayer 設的 player.invincible；Boss 勝利保護不使用它）
function isPlayerHurtFlashing() { return player.invincible > 0; }
function isPlayerHurtBlinkHidden() { return player.invincible > 0 && frameCount % 6 < 3; } // 和 drawPlayer 同一條閃爍規則
function getDogFrameKey(key) { return DOG_ART_ASSETS[key] && DOG_ART_SRC[key] ? key : 'idle'; }
function getDogPoseKey() {
  const heroKey = (typeof _heroLastArtKey === 'string') ? _heroLastArtKey : '';
  // 受傷閃爍優先於跑步 / 跳躍 / 攻擊；閃爍結束立刻回到正確動作
  if (isPlayerHurtFlashing()) { dogWasRunning = false; return { key: getDogFrameKey(DOG_ART.hurtFrame), state: 'hurt' }; }
  if (heroKey.startsWith('swordAttack') || heroKey.startsWith('hammerAttack')) { dogWasRunning = false; return { key: getDogFrameKey(DOG_ART.attackFrame), state: 'attack' }; }
  if (!player.onGround) { dogWasRunning = false; return player.vy < 0 ? { key: getDogFrameKey(DOG_ART.jumpFrame), state: 'jump' } : { key: getDogFrameKey(DOG_ART.fallFrame), state: 'fall' }; }
  const moving = Math.abs(player.vx || 0) > 0.1;
  if (!moving) { dogWasRunning = false; return { key: 'idle', state: 'idle' }; }
  const now = dogNowMs();
  if (!dogWasRunning) { dogWasRunning = true; dogRunAnimStart = now; } // 從 01 開始
  const idx = Math.floor((now - dogRunAnimStart) / Math.max(30, DOG_ART.runFrameMs)) % 4;
  return { key: 'run' + (idx + 1), state: 'run', frame: idx + 1 };
}
// 小狗位置：由小V「世界座標」推算，最後才統一減 cameraX（不會因鏡頭捲動漂移）
function getDogWorldAnchor() {
  const right = player.facingRight !== false;
  const cxWorld = player.x + player.w / 2 + (right ? -DOG_ART.behindX : DOG_ART.behindX);
  return { x: cxWorld, y: player.y + player.h + DOG_ART.footOffsetY, right };
}
// 每關開始時決定用正式圖或舊的向量小狗（不會一關裡新舊混用、也不會中途換圖）
function getDogArtMode() {
  if (!dogArtModeLock) {
    // 載入畫面 / 結算畫面背後（還沒真的開始玩）：圖沒好就先不畫、也不鎖定，等關卡真正開始再決定
    if (!isDogArtReady() && (gameState !== 'playing' || (typeof assetGateActive !== 'undefined' && assetGateActive))) return 'none';
    dogArtModeLock = isDogArtReady() ? 'sprite' : 'vector';
    if (dogArtModeLock === 'vector') console.warn('[DogArt] 小狗正式圖沒有全部載好 → 本關使用舊的小狗畫法（fallback）', JSON.stringify(dogArtStatus));
  }
  return dogArtModeLock;
}
function drawCompanionDog(cx) {
  const a = getDogWorldAnchor();
  const mode = getDogArtMode();
  if (mode === 'none') return;
  if (mode !== 'sprite') { // fallback：原本的向量小狗（同樣跟在小V腳邊）
    if (isPlayerHurtBlinkHidden()) return; // v0.3.56：fallback 也同步閃爍
    drawBalloonDog(a.x - cx, a.y - 12);
    dogLastDraw = { mode: 'vector', x: a.x - cx, y: a.y };
    return;
  }
  const pose = getDogPoseKey();
  if (pose.state === 'hurt' && isPlayerHurtBlinkHidden()) { // 小V閃爍消失的那幾幀，狗也一起消失
    dogLastDraw = { mode: 'sprite', pose: pose.key, state: 'hurt', hiddenBlink: true };
    return;
  }
  const img = getDogArtImg(pose.key), S = DOG_ART_SRC[pose.key], k = DOG_ART.scale;
  const dir = a.right ? 1 : -1;
  // v0.3.57：受傷剛發生時短暫抖動（只是畫面，狗狗跟隨位置 / 小V座標 / 碰撞都不變）
  const hurtAge = 90 - (player.invincible || 0);
  const shake = (pose.state === 'hurt' && hurtAge >= 0 && hurtAge < DOG_ART.hurtShakeFrames) ? ((frameCount % 4 < 2) ? 1 : -1) * DOG_ART.hurtShakePx : 0;
  const backX = (pose.state === 'attack') ? ((typeof _heroLastArtKey === 'string' && _heroLastArtKey.startsWith('hammerAttack')) ? (DOG_ART.attackBackXHammer || 0) : (DOG_ART.attackBackX || 0)) : 0; // v0.3.58
  const sx = a.x - cx + shake - dir * backX, sy = a.y;
  const w = img.naturalWidth * k, h = img.naturalHeight * k;
  ctx.save();
  // 貼地陰影（站在地上時才畫，讓腳底看起來踩在地面）
  if (player.onGround) {
    ctx.fillStyle = 'rgba(40,20,10,0.28)';
    ctx.beginPath(); ctx.ellipse(sx + dir * 4 * (k / 0.16), sy - 1, 26 * (k / 0.16), 4.5 * (k / 0.16), 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.translate(sx, sy);
  if (!a.right) ctx.scale(-1, 1); // 原圖朝右；小V向左時整張翻轉
  ctx.drawImage(img, -S.collarX * k, -S.feetY * k, w, h);
  ctx.restore();
  // 鼻子 / 頭頂位置（螢幕座標，含翻轉）
  const nx = sx + dir * (S.noseX - S.collarX) * k;
  const ny = sy + (S.noseY - S.feetY) * k;
  const headTopY = sy + ((DOG_ART_HEAD_TOP[pose.key] != null ? DOG_ART_HEAD_TOP[pose.key] : S.noseY - 120) - S.feetY) * k;
  // v0.3.57：生氣記號（程式動態繪製在頭部附近，會抖動 / 轉動，跟著左右翻轉）
  if (pose.state === 'attack' && S.angerX != null) {
    drawDogAngerMark(sx + dir * (S.angerX - S.collarX) * k, sy + (S.angerY - S.feetY) * k, 15 * (k / 0.16));
  }
  drawDogNoseGlow(nx, ny, headTopY, k);
  dogLastDraw = { mode: 'sprite', pose: pose.key, state: pose.state, x: Math.round(sx), y: Math.round(sy), w: Math.round(w), h: Math.round(h), noseX: Math.round(nx), noseY: Math.round(ny), facingRight: a.right, shake };
}
// v0.3.57：生氣記號（漫畫常見的紅色「十字青筋」— 四個弧形角），會輕微抖動 / 轉動
function drawDogAngerMark(x, y, size) {
  const t = dogNowMs() / 1000;
  const rot = Math.sin(t * 9) * 0.18;
  const sc = 1 + Math.sin(t * 13) * 0.08;
  ctx.save();
  ctx.translate(x + Math.sin(t * 23) * 0.8, y + Math.cos(t * 19) * 0.8);
  ctx.rotate(rot); ctx.scale(sc, sc);
  const r = size / 2;
  ctx.lineCap = 'round';
  for (let pass = 0; pass < 2; pass++) {
    ctx.strokeStyle = pass === 0 ? 'rgba(255,255,255,0.95)' : '#e8132f';
    ctx.lineWidth = pass === 0 ? size * 0.34 : size * 0.18;
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate(i * Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(r * 0.22, -r * 0.95);
      ctx.quadraticCurveTo(r * 0.22, -r * 0.22, r * 0.95, -r * 0.22);
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
}
// v0.3.57：尋寶鼻子提示（方案 B）— 距離門檻 / 等級判定完全沿用原本的 dogNoseLevel，只改畫法
//   L0 無提示｜L1 明顯金黃光圈｜L2 更強光圈 + 緩慢脈動 + 星光｜L3 最強光圈 + 明顯脈動閃爍 + 頭頂驚嘆號
//   （只提示「附近有寶物」，不指出寶物的精確位置）
function drawDogSparkle(x, y, r, rot, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = '#fff6c0';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const rr = i % 2 === 0 ? r : r * 0.32; const a = i * Math.PI / 4; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill();
  ctx.restore();
}
// v0.3.58：鼻子閃爍參數（距離門檻不變，只改畫法）
//   hz 閃爍頻率；r0→r1 光圈半徑（暗→亮）；a0→a1 光暈透明度；s0 描邊最暗透明度；w0+w1 描邊粗細
const DOG_NOSE_BLINK = {
  1: { hz: 1.1, r0: 10, r1: 16, a0: 0.15, a1: 0.95, s0: 0.10, w0: 1.2, w1: 1.6 },
  2: { hz: 1.8, r0: 13, r1: 22, a0: 0.10, a1: 1.00, s0: 0.05, w0: 1.4, w1: 2.0 },
  3: { hz: 2.6, r0: 17, r1: 29, a0: 0.10, a1: 1.00, s0: 0.05, w0: 1.6, w1: 2.6 },
};
function drawDogNoseGlow(nx, ny, headTopY, k) {
  const level = dogNoseLevel || 0;
  if (level <= 0) return; // L0：不發光
  // v0.3.58：三個等級都會「亮—暗」閃爍（亮度 / 透明度 / 光圈描邊一起變），越近越大、越快、亮暗差越大
  //   L1 1.1 次/秒、L2 1.8 次/秒、L3 2.6 次/秒（都低於 3 次/秒，避免刺眼的高頻閃光）
  //   小狗縮小時光圈仍保有最小像素大小，亮暗變化看得出來
  const z = Math.max(0.85, (k || DOG_ART.scale) / 0.16);
  const t = dogNowMs() / 1000;
  const spec = DOG_NOSE_BLINK[level] || DOG_NOSE_BLINK[3];
  const wave = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * spec.hz); // 0～1
  const p = Math.pow(wave, 1.6);                                  // 亮的時間短、暗的時間長 → 看起來是「一閃一閃」
  ctx.save();
  const R = (spec.r0 + (spec.r1 - spec.r0) * p) * z;
  const a = spec.a0 + (spec.a1 - spec.a0) * p;
  const g = ctx.createRadialGradient(nx, ny, 1, nx, ny, R);
  g.addColorStop(0, 'rgba(255,255,225,' + a + ')');
  g.addColorStop(0.35, 'rgba(255,212,50,' + (a * 0.85) + ')');
  g.addColorStop(1, 'rgba(255,165,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(nx, ny, R, 0, Math.PI * 2); ctx.fill();
  // 金色光圈線（亮的時候更粗更亮，暗的時候幾乎看不見 → 明顯的閃爍）
  ctx.strokeStyle = 'rgba(255,215,70,' + Math.min(1, spec.s0 + (1 - spec.s0) * p) + ')';
  ctx.lineWidth = (spec.w0 + spec.w1 * p) * z;
  ctx.beginPath(); ctx.arc(nx, ny, R * 0.62, 0, Math.PI * 2); ctx.stroke();
  // 亮點（鼻尖小白光，亮的時候才出現）
  if (p > 0.35) { ctx.fillStyle = 'rgba(255,255,255,' + ((p - 0.35) / 0.65 * 0.95) + ')'; ctx.beginPath(); ctx.arc(nx, ny, (1.6 + level * 0.5) * z, 0, Math.PI * 2); ctx.fill(); }
  // L2 / L3：星光繞著鼻子轉
  if (level >= 2) {
    const n = level === 3 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const ang = t * (level === 3 ? 2.6 : 1.6) + i * Math.PI * 2 / n;
      drawDogSparkle(nx + Math.cos(ang) * R * 0.95, ny + Math.sin(ang) * R * 0.75, (level === 3 ? 5 : 4) * z, ang, 0.45 + 0.5 * p);
    }
  }
  // L3：頭頂驚嘆號（尋寶專用，不是受傷）
  if (level === 3 && headTopY != null) {
    const bob = Math.sin(t * Math.PI * 2 * 1.3) * 2;
    const ex = nx - 6 * z, ey = headTopY - 10 * z + bob;
    ctx.font = 'bold ' + Math.round(20 * z) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4 * z; ctx.strokeStyle = 'rgba(120,40,0,0.85)'; ctx.fillStyle = '#ffd23a';
    ctx.strokeText('!', ex, ey); ctx.fillText('!', ex, ey);
  }
  // 測試版才顯示等級文字
  if (typeof ADVENTURE_TEST_TOOLS_ENABLED !== 'undefined' && ADVENTURE_TEST_TOOLS_ENABLED) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '8px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('L' + level, nx, ny + 14 * z);
  }
  ctx.restore();
}
// ── v0.3.56：狗狗視覺校準（測試版限定；` 鍵開關；只存 4 個數字到 DOG_ART_LS_KEY）──
function loadDogArtCalib() {
  try {
    const raw = localStorage.getItem(DOG_ART_LS_KEY); if (!raw) return;
    const d = JSON.parse(raw);
    Object.keys(DOG_ART_DEFAULTS).forEach(k => { if (d && typeof d[k] === 'number' && isFinite(d[k])) DOG_ART[k] = d[k]; });
  } catch (e) {}
}
function saveDogArtCalib() {
  try { const o = {}; Object.keys(DOG_ART_DEFAULTS).forEach(k => { o[k] = DOG_ART[k]; }); localStorage.setItem(DOG_ART_LS_KEY, JSON.stringify(o)); } catch (e) {}
}
if (typeof ADVENTURE_TEST_TOOLS_ENABLED !== 'undefined' && ADVENTURE_TEST_TOOLS_ENABLED) loadDogArtCalib();
const DOG_CALIB_FIELDS = [
  { k: 'scale',       label: '狗狗大小 scale',      min: 0.08, max: 0.30, step: 0.005 },
  { k: 'behindX',     label: '與小V距離 behindX',  min: 0,    max: 100,  step: 1 },
  { k: 'footOffsetY', label: '腳底上下 footOffsetY', min: -20, max: 20,   step: 1 },
  { k: 'runFrameMs',  label: '跑步每格 ms',          min: 60,   max: 300,  step: 5 },
];
function getDogArtCalibText() {
  return 'const DOG_ART_DEFAULTS = { scale: ' + DOG_ART.scale + ', behindX: ' + DOG_ART.behindX + ', footOffsetY: ' + DOG_ART.footOffsetY + ', runFrameMs: ' + DOG_ART.runFrameMs + ' };';
}
function toggleDogCalibPanel(force) {
  if (typeof ADVENTURE_TEST_TOOLS_ENABLED === 'undefined' || !ADVENTURE_TEST_TOOLS_ENABLED) return false; // 正式版不顯示
  let el = document.getElementById('dog-calib-panel');
  const show = (force != null) ? !!force : !(el && el.style.display !== 'none');
  if (!show) { if (el) el.style.display = 'none'; return true; }
  if (!el) {
    el = document.createElement('div');
    el.id = 'dog-calib-panel';
    el.style.cssText = 'position:fixed;top:8px;right:8px;z-index:100200;width:250px;max-width:70vw;background:rgba(10,8,30,.9);color:#fff;'
      + 'font:12px/1.4 sans-serif;padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.25);box-shadow:0 4px 14px rgba(0,0,0,.4)';
    document.body.appendChild(el);
  }
  el.style.display = 'block';
  el.innerHTML = '<div style="font-weight:bold;color:#ffe066;margin-bottom:4px">🐶 狗狗校準（測試版，` 鍵關閉）</div>'
    + DOG_CALIB_FIELDS.map(f => '<div style="margin:4px 0"><div style="display:flex;justify-content:space-between"><span>' + f.label + '</span><b id="dogcal-v-' + f.k + '">' + DOG_ART[f.k] + '</b></div>'
      + '<input type="range" id="dogcal-' + f.k + '" min="' + f.min + '" max="' + f.max + '" step="' + f.step + '" value="' + DOG_ART[f.k] + '" style="width:100%"></div>').join('')
    + '<div style="display:flex;gap:6px;margin-top:6px"><button id="dogcal-reset" style="flex:1">回復預設</button><button id="dogcal-copy" style="flex:1">複製參數</button></div>'
    + '<div id="dogcal-msg" style="color:#9ff;margin-top:4px;min-height:14px"></div>';
  DOG_CALIB_FIELDS.forEach(f => {
    const inp = document.getElementById('dogcal-' + f.k);
    inp.addEventListener('input', () => { DOG_ART[f.k] = Number(inp.value); document.getElementById('dogcal-v-' + f.k).textContent = DOG_ART[f.k]; saveDogArtCalib(); });
    ['keydown', 'keyup'].forEach(ev => inp.addEventListener(ev, e => e.stopPropagation())); // 方向鍵調滑桿時不要讓小V移動
  });
  document.getElementById('dogcal-reset').onclick = () => { Object.assign(DOG_ART, DOG_ART_DEFAULTS); try { localStorage.removeItem(DOG_ART_LS_KEY); } catch (e) {} toggleDogCalibPanel(true); };
  document.getElementById('dogcal-copy').onclick = () => {
    const t = getDogArtCalibText(); console.log('[DogArtCalib] ' + t);
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).catch(() => {}); } catch (e) {}
    const m = document.getElementById('dogcal-msg'); if (m) m.textContent = '已複製（也印在 console）';
  };
  return true;
}
if (typeof window !== 'undefined') { window.toggleDogCalibPanel = toggleDogCalibPanel; window.openDogCalib = () => toggleDogCalibPanel(true); }
function debugDog() {
  const info = { bringBalloonDog, nextBringDog, dog: playerInventory.balloonDog, mode: dogArtModeLock || '(本關尚未畫過)', allLoaded: isDogArtReady(),
    images: Object.fromEntries(Object.keys(DOG_ART_ASSETS).map(k => { const im = getDogArtImg(k); return [k, (dogArtStatus[k] || '-') + (im ? ' ' + im.naturalWidth + '×' + im.naturalHeight : '')]; })),
    settings: Object.assign({}, DOG_ART), lastDraw: dogLastDraw, noseLevel: dogNoseLevel, hurtFlashing: isPlayerHurtFlashing() };
  console.log('[DogArt] 模式 ' + info.mode + '　圖片全部載好 ' + info.allLoaded + '　' + JSON.stringify(info.images));
  console.log(info);
  return info;
}
if (typeof window !== 'undefined') window.debugDog = debugDog;

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

function drawEnemy(x, y, w, h, flashing, enemyVx, enemyObj) {
  // v0.3.15-test-2-fix-1：宣告順序修正（variantCfg 必須在 skinKey 之前）
  const variantCfg = enemyObj ? getEnemyVariantConfig(enemyObj) : null;
  const tierCfg    = enemyObj ? getEnemyTierConfig(enemyObj)    : null;
  const scaleMult  = (variantCfg?.drawScaleMultiplier ?? 1.0)
                   * (tierCfg?.drawScaleMultiplier    ?? 1.0);
  const tintMode   = tierCfg?.tintMode ?? 'none';

  const skinKey = variantCfg?.skinKey || 'scorpion_normal';
  const img = flashing
    ? (getScorpionHurtImgForSkin(skinKey) || getScorpionWalkImgForSkin(skinKey))
    : getScorpionWalkImgForSkin(skinKey);

  if (img) {
    // ── Foot anchor 對齊：讓圖片 88.3% 高度處對齊 hitbox 底部 ──
    const drawW  = w * SCORPION_DRAW_SCALE * scaleMult;
    const drawH  = drawW * (img.height / img.width); // 保持圖片比例（512×512 → 正方形）
    const groundY  = y + h;                          // hitbox 底部（地面）
    const centerX  = x + w / 2;
    const drawX    = centerX - drawW / 2 + SCORPION_DRAW_OFFSET_X;
    const drawY    = groundY - drawH * SCORPION_FOOT_ANCHOR_Y + SCORPION_DRAW_OFFSET_Y;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (flashing) ctx.globalAlpha = 0.5;

    const goingLeft = (enemyVx !== undefined ? enemyVx : 0) < 0;
    if (goingLeft) {
      ctx.translate(drawX + drawW / 2, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -drawW / 2, drawY, drawW, drawH);
    } else {
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    }

    if (flashing) ctx.globalAlpha = 1;
    ctx.restore();

    // 受擊白閃
    if (flashing) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(drawX, drawY, drawW, drawH);
      ctx.restore();
    }

    // v0.3.15-test-2：fast tier 紅橘 tint（柔和光暈，不畫粗框，不遮蓋美術細節）
    if (tintMode === 'red-orange') {
      // 僅加輕微外發光陰影，讓玩家感覺「更急、更危險」，不改圖片本身
      ctx.save();
      ctx.globalAlpha = 0.28 + 0.12 * Math.sin(frameCount * 0.15);
      ctx.shadowColor = '#ff4400';
      ctx.shadowBlur  = 14;
      // 用 fillRect 塊配合 source-atop 讓 tint 只蓋在圖片非透明區域
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(255,70,0,0.22)';
      ctx.fillRect(drawX, drawY, drawW, drawH);
      ctx.restore();
    }
  } else {
    // ── 幾何 fallback ──
    drawEnemyFallback(x, y, w, h, flashing);
  }

  // v0.3.18：heavyBody HP 血條（只在 maxHp > 1 時顯示，normal 不顯示）
  const maxHp = enemyObj?.maxHp ?? 1;
  const curHp = enemyObj?.hp   ?? maxHp;
  if (maxHp > 1) {
    // 血條位置：蠍子頭上方 6px，寬度與 hitbox 同寬
    const barW   = w * 1.1;        // 略寬於 hitbox 讓視覺更清楚
    const barH   = 5;
    const barX   = x + (w - barW) / 2;
    const barY   = y - 9;
    const cellW  = barW / maxHp;
    const gap    = 2;

    // 黑色底
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

    for (let i = 0; i < maxHp; i++) {
      const filled = i < curHp;
      const cx     = barX + i * cellW + (i > 0 ? gap : 0);
      const cw     = cellW - (i > 0 ? gap : 0);
      // 血量顏色：3=綠, 2=橘, 1=紅（依剩餘 HP 決定最後一格）
      ctx.fillStyle = filled
        ? (curHp === 1 ? '#ff3333' : curHp === 2 ? '#ff9900' : '#55ee44')
        : 'rgba(80,80,80,0.7)';
      ctx.fillRect(cx, barY, cw, barH);
    }
    ctx.restore();
  }
}


function drawOrangeNemesis(sx, o) {
  // ── 判斷素材是否就緒，決定走 skin 路徑還是 fallback 幾何路徑 ──
  const useSkin = orangeEnemyCoreReady;

  // ── v0.3.13-test-2：helper — 用 hitbox 寬度決定顯示尺寸，不再用 naturalWidth*scale ──
  // baseDrawW = o.w * ORANGE_BODY_DRAW_SCALE ≈ 44 * 2.4 = 106px（小怪尺寸）
  // baseDrawH = baseDrawW * (img.naturalHeight / img.naturalWidth)（保持圖片比例）
  // bodyScale = baseDrawW / img.naturalWidth（用於素材座標 → 遊戲世界座標換算）
  function getHitboxDrawInfo(img, pulse) {
    if (!img || !img.naturalWidth) return null;
    const p        = pulse || 1;
    const baseW    = o.w * ORANGE_BODY_DRAW_SCALE * p;
    const baseH    = baseW * (img.naturalHeight / img.naturalWidth);
    const bodyScale = baseW / img.naturalWidth;
    const footY    = baseH * ORANGE_FOOT_ANCHOR_Y;
    const drawX    = sx + o.w / 2 - baseW / 2;
    const drawY    = (o.y + o.h) - footY;
    return { drawX, drawY, drawW: baseW, drawH: baseH, bodyScale };
  }

  ctx.save();

  // ─────────────────────────────────────────────
  //  1. 噴油效果
  //  v0.3.14-test-2：oil sprite 已移至 drawOrangeOilOverlay()，
  //  在 drawPlayer() 之後呼叫，確保油圖畫在玩家上方。
  //  此處只保留 fallback 幾何（skin 路徑的油圖不在這裡畫）。
  // ─────────────────────────────────────────────
  if (o.phase === 'spraying' && o.sprayActive && !orangeEnemyCoreReady) {
    _drawOrangeSprayGeometry(sx, o);
  }

  // ─────────────────────────────────────────────
  //  2. 本體繪製
  // ─────────────────────────────────────────────
  if (useSkin) {
    if (o.phase === 'windup') {
      const warnImg = getOrangeEnemyImg('warning');
      const t     = o.phaseTimer / CONFIG.ORANGE_WINDUP_MS;
      const pulse = 1.0 + Math.sin(t * Math.PI * 4) * 0.06; // 吸氣蓄力，0.94~1.06

      if (warnImg) {
        const info = getHitboxDrawInfo(warnImg, pulse);
        if (info) {
          // v0.3.14：強化警示 — 紅色外圈光環（較大、較亮，玩家一眼看到）
          const ringAlpha = 0.4 + Math.sin(t * Math.PI * 6) * 0.3; // 0.1~0.7 閃動
          ctx.save();
          ctx.globalAlpha = Math.max(0.08, ringAlpha);
          ctx.shadowColor = '#ff2200';
          ctx.shadowBlur  = 22;
          ctx.strokeStyle = '#ff4400';
          ctx.lineWidth   = 3.5;
          const cx = sx + o.w / 2;
          const cy = o.y + o.h / 2;
          ctx.beginPath();
          ctx.arc(cx, cy, o.w * 0.72 * pulse, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // 紅色底層光暈疊在圖片後方
          const glowAlpha = (Math.sin(t * Math.PI * 6) * 0.5 + 0.5) * 0.45;
          if (glowAlpha > 0.05) {
            ctx.save();
            ctx.globalAlpha = glowAlpha;
            ctx.shadowColor = '#ff2200';
            ctx.shadowBlur  = 26;
            ctx.drawImage(warnImg, info.drawX, info.drawY, info.drawW, info.drawH);
            ctx.restore();
          }
          ctx.globalAlpha = 1;
          ctx.drawImage(warnImg, info.drawX, info.drawY, info.drawW, info.drawH);
        }
      } else {
        _drawOrangeBodyGeometry(sx, o, true);
      }

    } else if (o.phase === 'spraying') {
      const sprayImg = getOrangeEnemyImg('spray');
      const info = sprayImg ? getHitboxDrawInfo(sprayImg) : null;
      if (info) {
        ctx.drawImage(sprayImg, info.drawX, info.drawY, info.drawW, info.drawH);
      } else {
        _drawOrangeBodyGeometry(sx, o, false);
      }

    } else if (o.phase === 'cooldown') {
      // v0.3.14-test-3：
      // 1. ORANGE_COOLDOWN_FRAME_DUR=30 → 每 30 frames 換一張，避免閃爍
      // 2. info.drawY + ORANGE_COOLDOWN_DRAW_OFFSET_Y → 讓腳底貼近地平線
      // 3. 慢速透明度呼吸（0.82~1.00），呈現疲憊喘氣感，不是受傷閃爍
      const useFirst = (Math.floor(frameCount / ORANGE_COOLDOWN_FRAME_DUR) % 2 === 0);
      const cdImg = getOrangeEnemyImg(useFirst ? 'cooldown01' : 'cooldown02')
                 || getOrangeEnemyImg('cooldown01')
                 || getOrangeEnemyImg('idle');
      if (cdImg) {
        const info = getHitboxDrawInfo(cdImg);
        if (info) {
          const breath       = 0.5 + 0.5 * Math.sin(frameCount * 0.045); // 慢速 0→1
          const cooldownAlpha = 0.82 + breath * 0.18;                   // 0.82~1.00
          ctx.save();
          ctx.globalAlpha = cooldownAlpha;
          ctx.drawImage(cdImg,
            info.drawX,
            info.drawY + ORANGE_COOLDOWN_DRAW_OFFSET_Y,
            info.drawW,
            info.drawH);
          ctx.restore();
        }
      } else {
        _drawOrangeBodyGeometry(sx, o, false);
      }

    } else {
      // idle
      const idleImg = getOrangeEnemyImg('idle');
      const info = idleImg ? getHitboxDrawInfo(idleImg) : null;
      if (info) {
        ctx.drawImage(idleImg, info.drawX, info.drawY, info.drawW, info.drawH);
      } else {
        _drawOrangeBodyGeometry(sx, o, false);
      }
    }
  } else {
    _drawOrangeBodyGeometry(sx, o, o.phase === 'windup');
  }

  ctx.restore();
}

// v0.3.14-test-2：oil sprite overlay — 畫在 drawPlayer() 之後，讓油圖覆蓋在玩家上方
// 使用與 drawOrangeNemesis 完全相同的 mouth anchor / oil anchor / bodyScale 計算
// sx = o.x - cameraX（呼叫端傳入）
function drawOrangeOilOverlay(sx, o) {
  if (o.phase !== 'spraying' || !o.sprayActive) return;
  if (!orangeEnemyCoreReady) return; // fallback 幾何已在 drawOrangeNemesis 畫過

  const ratio  = Math.min(o.phaseTimer / CONFIG.ORANGE_SPRAY_MS, 1.0);
  const oilKey = ratio < 1/3 ? 'oil01' : ratio < 2/3 ? 'oil02' : 'oil03';
  const oilImg   = getOrangeEnemyImg(oilKey);
  const sprayImg = getOrangeEnemyImg('spray');
  if (!sprayImg || !oilImg || !sprayImg.naturalWidth) return;

  // 與 drawOrangeNemesis 的 getHitboxDrawInfo 完全相同的計算（此處 inline 以避免閉包相依）
  const baseW     = o.w * ORANGE_BODY_DRAW_SCALE;
  const baseH     = baseW * (sprayImg.naturalHeight / sprayImg.naturalWidth);
  const bodyScale = baseW / sprayImg.naturalWidth;
  const footY     = baseH * ORANGE_FOOT_ANCHOR_Y;
  const drawX     = sx + o.w / 2 - baseW / 2;
  const drawY     = (o.y + o.h) - footY;

  const bs          = bodyScale;
  const mouthWorldX = drawX + ORANGE_SPRAY_MOUTH_X * bs;
  const mouthWorldY = drawY + ORANGE_SPRAY_MOUTH_Y * bs;

  const oilScale = bs; // oilScale = bodyScale
  const oilW     = oilImg.naturalWidth  * oilScale;
  const oilH     = oilImg.naturalHeight * oilScale;
  const oilDrawX = mouthWorldX - ORANGE_OIL_ANCHOR_X * oilScale;
  const oilDrawY = mouthWorldY - ORANGE_OIL_ANCHOR_Y * oilScale;

  // 不水平翻轉（v0.3.13-test-4 已停用翻轉，素材本身已是向左噴）
  ctx.drawImage(oilImg, oilDrawX, oilDrawY, oilW, oilH);
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
  if (sx < -160 || sx > CANVAS_W + 60) return;
  // v0.3.50：全章節通用過關旗（旗桿對齊原本旗桿、石座站在地面上；過關判定 FINISH_X 不變）；沒載好 → 原本畫法
  const A = ADVENTURE_ITEM_ICON;
  if (drawAdventureItemIcon('goalFlag', sx + A.goalFlagOffsetX, GROUND_Y + A.goalFlagOffsetY, A.goalFlagScale, A.goalFlagAlpha)) return;
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

// v0.3.57：HUD 愛心（canvas）— full 紅心、half 左半紅 + 右半空心框、empty 空心框
function drawHudHeart(cx, cy, size, kind) {
  const s = size / 24;
  const heartPath = () => {
    ctx.beginPath();
    ctx.moveTo(12, 21);
    ctx.bezierCurveTo(4.5, 16.4, 0.6, 11.8, 2.2, 8.4);
    ctx.bezierCurveTo(3.4, 5.6, 6.1, 4.1, 8, 4.1);
    ctx.bezierCurveTo(9.6, 4.1, 11, 5, 12, 7.2);
    ctx.bezierCurveTo(13, 5, 14.4, 4.1, 16, 4.1);
    ctx.bezierCurveTo(17.9, 4.1, 20.6, 5.6, 21.8, 8.4);
    ctx.bezierCurveTo(23.4, 11.8, 19.5, 16.4, 12, 21);
    ctx.closePath();
  };
  ctx.save();
  ctx.translate(cx - 12 * s, cy - 12 * s); ctx.scale(s, s);
  heartPath();
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
  if (kind !== 'empty') {
    ctx.save();
    if (kind === 'half') { ctx.beginPath(); ctx.rect(0, 0, 12, 24); ctx.clip(); }
    heartPath(); ctx.fillStyle = '#ff3d6e'; ctx.fill();
    ctx.restore();
  }
  heartPath();
  ctx.lineWidth = 1.6; ctx.strokeStyle = kind === 'full' ? '#ffd0dc' : '#ff8fb0'; ctx.stroke();
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
  // v0.3.57：HUD 愛心改成清楚的滿心 / 半心 / 空心（和結算頁、小V的家同一套規則），數字放大
  const heartY = 22;
  const heartSize = 22;
  const _healBounce = getHealHudBounceScale(); // v0.3.55：補血時心心短暫放大回彈
  const _kinds = getHeartKinds(Math.max(0, Math.min(player.maxHp, Number(player.hp) || 0)), player.maxHp);
  _kinds.forEach((kind, i) => drawHudHeart(pad + 11 + i * (heartSize + 5), heartY, heartSize * _healBounce, kind));
  ctx.globalAlpha = 1.0;
  ctx.font = 'bold 13px sans-serif';
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.fillStyle = player.hp % 1 > 0 ? '#FDCB6E' : '#ffd6e2';
  const _hpTxt = (Number(player.hp) || 0) + ' / ' + player.maxHp;
  const _hpX = pad + _kinds.length * (heartSize + 5) + 6;
  ctx.strokeText(_hpTxt, _hpX, heartY); ctx.fillText(_hpTxt, _hpX, heartY);

  // ── 右上：收集資料（金幣、氣球） ──
  ctx.textAlign = 'right';
  ctx.font = 'bold 13px sans-serif';
  const showRound  = roundBalloons.length > 0;
  let rx = CANVAS_W - pad;
  // v0.3.50：HUD 圖示改用正式道具圖（約 18px，數字在右邊）；圖沒載好 → 原本 emoji
  const hudIcon = (key, emoji, num, color) => {
    ctx.fillStyle = color;
    const img = getAdventureItemIconImg(key);
    if (img) {
      const tw = ctx.measureText(String(num)).width;
      ctx.fillText(String(num), rx, 18);
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, rx - tw - 21, 3, 19, 19);
      ctx.restore();
    } else {
      ctx.fillText(emoji + num, rx, 18);
    }
  };
  if (showRound) {
    hudIcon('round', '⚪', currentRunStats.roundBalloon, '#A29BFE');
    rx -= 56;
  }
  hudIcon('b260', '🎈', player.balloonsCollected, '#FF6B9D');
  rx -= 60;
  hudIcon('coin', '🪙', player.coinsCollected, '#FFD93D');

  // ── 中央：關卡名稱 + 計時器（正式 UI，非 debug）──
  ctx.textAlign = 'center';
  const lv      = LEVELS[currentLevelIndex] || {};
  // v0.3.11-test-2：HUD 不再顯示工程用 stageId，改用章節標題
  const stageLabel = getChapterDisplayTitle(currentLevelIndex);
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = 'rgba(200,195,255,0.85)';
  ctx.fillText(stageLabel, CANVAS_W / 2, 13);

  // v0.3.35：Boss 房不顯示倒數 / 進度條，改顯示橘子王 8 格血條
  if (isOrangeKingStageActive()) {
    drawOrangeKingHpBar();
  } else {
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
  } // end v0.3.35 非 Boss 房

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

// v0.3.17-test-3：手機版短版版本標籤，避免和右上暫停/離開全螢幕按鈕重疊
// 例：adventure-v0.3.17-scorpion-defeat-feedback-test-3 → v0.3.17 test-3
function getShortVersionLabel() {
  if (!GAME_VERSION) return '';
  const vMatch = GAME_VERSION.match(/v(\d+\.\d+\.\d+)/);
  const vPart  = vMatch ? 'v' + vMatch[1] : '';
  let tPart = '';
  // v0.3.65+：additional-sfx → more-sfx（test-N > 1 時加上 -N）
  if (GAME_VERSION.includes('additional-sfx')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'more-sfx' + (tN === '1' ? '' : '-' + tN);
  } else
  // v0.3.64+：sfx-and-scoring-fixes → sfx-scoring（test-N > 1 時加上 -N）
  if (GAME_VERSION.includes('sfx-and-scoring-fixes')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'sfx-scoring' + (tN === '1' ? '' : '-' + tN);
  } else
  // v0.3.63+：adventure-final-results → final-results（test-N > 1 時加上 -N）
  if (GAME_VERSION.includes('adventure-final-results')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'final-results' + (tN === '1' ? '' : '-' + tN);
  } else
  // v0.3.62+：rpg-dialogue-fixes → rpg-fixes（test-N > 1 時加上 -N）
  if (GAME_VERSION.includes('rpg-dialogue-fixes')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'rpg-fixes' + (tN === '1' ? '' : '-' + tN);
  } else
  // v0.3.61+：rpg-dialogue-and-boss-polish → rpg-boss-polish（test-N > 1 時加上 -N）
  if (GAME_VERSION.includes('rpg-dialogue-and-boss-polish')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'rpg-boss-polish' + (tN === '1' ? '' : '-' + tN);
  } else
  // v0.3.60+：rpg-dialogue-polish → rpg-polish（test-N > 1 時加上 -N）
  if (GAME_VERSION.includes('rpg-dialogue-polish')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'rpg-polish' + (tN === '1' ? '' : '-' + tN);
  } else
  // v0.3.59+：rpg-dialogue-v1 → rpg-v1（test-N > 1 時加上 -N）
  if (GAME_VERSION.includes('rpg-dialogue-v1')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'rpg-v1' + (tN === '1' ? '' : '-' + tN);
  } else
  // v0.3.58+：gameplay-logic-polish → logic-polish（test-N > 1 時加上 -N）
  if (GAME_VERSION.includes('gameplay-logic-polish')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'logic-polish' + (tN === '1' ? '' : '-' + tN);
  } else
  // v0.3.57+：mobile-timing-ui-pause-dog → mobile-pause-dog（test-N > 1 時加上 -N）
  if (GAME_VERSION.includes('mobile-timing-ui-pause-dog')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'mobile-pause-dog' + (tN === '1' ? '' : '-' + tN);
  } else
  // v0.3.56+：dog-polish-lollipop-craft-feedback → dog-candy-craft（test-N > 1 時加上 -N）
  if (GAME_VERSION.includes('dog-polish-lollipop-craft-feedback')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'dog-candy-craft' + (tN === '1' ? '' : '-' + tN);
  } else
  // v0.3.55+：dog-animation-heal-feedback → dog-heal（test-N > 1 時加上 -N）
  if (GAME_VERSION.includes('dog-animation-heal-feedback')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'dog-heal' + (tN === '1' ? '' : '-' + tN);
  } else
  // v0.3.54-fix：chapter1-ground-spike-stage-fix-N → ch1-stage-fix-N
  if (GAME_VERSION.includes('chapter1-ground-spike-stage-fix')) {
    tPart = 'ch1-stage-fix-' + (GAME_VERSION.match(/-fix-(\d+)/)?.[1] || '1');
  } else
  // v0.3.54+：chapter1-ground-spike-near-frame → ch1-ground-near（test-N > 1 時加上 -N）
  if (GAME_VERSION.includes('chapter1-ground-spike-near-frame')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'ch1-ground-near' + (tN === '1' ? '' : '-' + tN);
  } else
  // v0.3.53-fix：chapter1-opacity-depth-fix-N → ch1-opacity-fix-N
  if (GAME_VERSION.includes('chapter1-opacity-depth-fix')) {
    tPart = 'ch1-opacity-fix-' + (GAME_VERSION.match(/-fix-(\d+)/)?.[1] || '1');
  } else
  // v0.3.53+：chapter1-platforms-bgm-near-fg-depth → ch1-platform-bgm-depth（test-N > 1 時加上 -N）
  if (GAME_VERSION.includes('chapter1-platforms-bgm-near-fg-depth')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'ch1-platform-bgm-depth' + (tN === '1' ? '' : '-' + tN);
  // v0.3.52-fix：chapter1-bg-readability-layout-fix-N → ch1-bg-fix-N
  } else if (GAME_VERSION.includes('chapter1-bg-readability-layout-fix')) {
    tPart = 'ch1-bg-fix-' + (GAME_VERSION.match(/-fix-(\d+)/)?.[1] || '1');
  // v0.3.52+：chapter1-parallax-bg-assets → ch1-bg（test-N > 1 時加上 -N）
  } else if (GAME_VERSION.includes('chapter1-parallax-bg-assets')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'ch1-bg' + (tN === '1' ? '' : '-' + tN);
  // v0.3.51+：asset-preload-gate → asset-gate（test-N > 1 時加上 -N）
  } else if (GAME_VERSION.includes('asset-preload-gate')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'asset-gate' + (tN === '1' ? '' : '-' + tN);
  // v0.3.50+：item-icons-goal-flag → item-icons-flag（test-N > 1 時加上 -N）
  } else if (GAME_VERSION.includes('item-icons-goal-flag')) {
    const fN = GAME_VERSION.match(/-fix-(\d+)/)?.[1];
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'item-icons-flag' + (fN ? '-fix' + fN : (tN === '1' ? '' : '-' + tN));
  // v0.3.49+：chapter2-ground-platform-bgm → ch2-ground-bgm（test-N > 1 時加上 -N）
  } else if (GAME_VERSION.includes('chapter2-ground-platform-bgm')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'ch2-ground-bgm' + (tN === '1' ? '' : '-' + tN);
  // v0.3.48+：chapter2-bg-readability-polish → ch2-bg-readable（test-N > 1 時加上 -N）
  } else if (GAME_VERSION.includes('chapter2-bg-readability-polish')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'ch2-bg-readable' + (tN === '1' ? '' : '-' + tN);
  // v0.3.47+：chapter2-parallax-bg-assets → ch2-parallax-bg（test-N > 1 時加上 -N）
  } else if (GAME_VERSION.includes('chapter2-parallax-bg-assets')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'ch2-parallax-bg' + (tN === '1' ? '' : '-' + tN);
  // v0.3.46+：orange-king-royal-sword-arcshot-fix → orange-royal-sword（test-N > 1 時加上 -N）
  } else if (GAME_VERSION.includes('orange-king-royal-sword-arcshot-fix')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'orange-royal-sword' + (tN === '1' ? '' : '-' + tN);
  // v0.3.45+：orange-king-polish-ring-sfx → orange-ring-sfx（test-N > 1 時加上 -N）
  } else if (GAME_VERSION.includes('orange-king-polish-ring-sfx')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'orange-ring-sfx' + (tN === '1' ? '' : '-' + tN);
  // v0.3.44+：orange-king-shot-slick-defeat → orange-shot-slick-ko（test-N > 1 時加上 -N）
  } else if (GAME_VERSION.includes('orange-king-shot-slick-defeat')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'orange-shot-slick-ko' + (tN === '1' ? '' : '-' + tN);
  // v0.3.43+：orange-king-dash-bgm → orange-dash-bgm（test-N > 1 時加上 -N）
  } else if (GAME_VERSION.includes('orange-king-dash-bgm')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'orange-dash-bgm' + (tN === '1' ? '' : '-' + tN);
  // v0.3.42+：orange-king-boss-art-polish → orange-boss-art-polish（test-N > 1 時加上 -N）
  } else if (GAME_VERSION.includes('orange-king-boss-art-polish')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'orange-boss-art-polish' + (tN === '1' ? '' : '-' + tN);
  // v0.3.41+：orange-king-boss-art → orange-boss-art（test-N > 1 時加上 -N）
  } else if (GAME_VERSION.includes('orange-king-boss-art')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'orange-boss-art' + (tN === '1' ? '' : '-' + tN);
  // v0.3.40+：orange-king-platform-hint → orange-platform-hint（test-N > 1 時加上 -N）
  } else if (GAME_VERSION.includes('orange-king-platform-hint')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'orange-platform-hint' + (tN === '1' ? '' : '-' + tN);
  // v0.3.39+：orange-king-platform-art → orange-platform-art（test-N > 1 時加上 -N）
  } else if (GAME_VERSION.includes('orange-king-platform-art')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'orange-platform-art' + (tN === '1' ? '' : '-' + tN);
  // v0.3.38+：orange-king-boss-bg → orange-boss-bg（test-N > 1 時加上 -N）
  } else if (GAME_VERSION.includes('orange-king-boss-bg')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'orange-boss-bg' + (tN === '1' ? '' : '-' + tN);
  // v0.3.37+：orange-king-oil-stream-art → orange-oil-stream-art（test-N > 1 時加上 -N）
  } else if (GAME_VERSION.includes('orange-king-oil-stream-art')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'orange-oil-stream-art' + (tN === '1' ? '' : '-' + tN);
  // v0.3.36+：orange-king-machine-art-integration → orange-machine-art（test-N > 1 時加上 -N）
  } else if (GAME_VERSION.includes('orange-king-machine-art-integration')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'orange-machine-art' + (tN === '1' ? '' : '-' + tN);
  // v0.3.35-fix：orange-king-boss-damage-cap-fix-N → boss-dmgcap-fixN
  } else if (GAME_VERSION.includes('orange-king-boss-damage-cap-fix')) {
    const fN = GAME_VERSION.match(/-fix-(\d+)/)?.[1] || '1';
    tPart = 'boss-dmgcap-fix' + fN;
  // v0.3.35-fix：orange-king-boss-victory-pose-fix-N → boss-victory-fixN
  } else if (GAME_VERSION.includes('orange-king-boss-victory-pose-fix')) {
    const fN = GAME_VERSION.match(/-fix-(\d+)/)?.[1] || '1';
    tPart = 'boss-victory-fix' + fN;
  // v0.3.35-fix：orange-king-boss-timing-and-platform-fix-N → boss-timing-fixN
  } else if (GAME_VERSION.includes('orange-king-boss-timing-and-platform-fix')) {
    const fN = GAME_VERSION.match(/-fix-(\d+)/)?.[1] || '1';
    tPart = 'boss-timing-fix' + fN;
  // v0.3.35+：chapter2-orange-king-boss-foundation → orange-king-boss（test-N > 1 時加上 -N）
  } else if (GAME_VERSION.includes('chapter2-orange-king-boss-foundation')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'orange-king-boss' + (tN === '1' ? '' : '-' + tN);
  // v0.3.34+：result-home-sticky-status-and-supply → sticky-status（test-N > 1 時加上 -N）
  } else if (GAME_VERSION.includes('result-home-sticky-status')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'sticky-status' + (tN === '1' ? '' : '-' + tN);
  // v0.3.33+：discovery-item-modal-fix-N → discovery-fixN
  } else if (GAME_VERSION.includes('discovery-item-modal-fix')) {
    const fN = GAME_VERSION.match(/-fix-(\d+)/)?.[1] || '1';
    tPart = 'discovery-fix' + fN;
  // v0.3.33+：discovery-item-modal → discovery-modal（test-N > 1 時加上 -N）
  } else if (GAME_VERSION.includes('discovery-item-modal')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'discovery-modal' + (tN === '1' ? '' : '-' + tN);
  // v0.3.32+：chapter2-boss-note-foundation → ch2-boss-note（test-N > 1 時加上 -N）
  } else if (GAME_VERSION.includes('chapter2-boss-note-foundation')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'ch2-boss-note' + (tN === '1' ? '' : '-' + tN);
  // v0.3.31+：chapter2-dog-gold-chest → ch2-dog-chest（test-N > 1 時加上 -N）
  } else if (GAME_VERSION.includes('chapter2-dog-gold-chest')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'ch2-dog-chest' + (tN === '1' ? '' : '-' + tN);
  // v0.3.30+：chapter2-scorpion-balance → ch2-scorpion（test-N > 1 時加上 -N）
  } else if (GAME_VERSION.includes('chapter2-scorpion-balance')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'ch2-scorpion' + (tN === '1' ? '' : '-' + tN);
  // v0.3.29+：inventory-summary-ui-fix → inventory-summary-fix（fix-N > 1 時加上 -N）
  } else if (GAME_VERSION.includes('inventory-summary-ui-fix')) {
    const fN = GAME_VERSION.match(/-fix-(\d+)/)?.[1] || '1';
    tPart = 'inventory-summary-fix' + (fN === '1' ? '' : fN); // fix-3 → inventory-summary-fix3
  // v0.3.29+：inventory-summary-ui → inventory-summary（test-N > 1 時加上 -N）
  } else if (GAME_VERSION.includes('inventory-summary-ui')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'inventory-summary' + (tN === '1' ? '' : '-' + tN);
  // v0.3.28+：chapter2-formal-polish → ch2-formal-polish（test-N > 1 時加上 -N）
  } else if (GAME_VERSION.includes('chapter2-formal-polish')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'ch2-formal-polish' + (tN === '1' ? '' : '-' + tN);
  // v0.3.28+：chapter2-formal-2-1-to-2-3 → ch2-formal-N
  } else if (GAME_VERSION.includes('chapter2-formal-2-1-to-2-3')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'ch2-formal-' + tN;
  // v0.3.27+：chapter2-terrain-prototype → ch2-terrain-N
  } else if (GAME_VERSION.includes('chapter2-terrain-prototype')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'ch2-terrain-' + tN;
  // v0.3.27+：test-menu-cleanup → menu-cleanup-N
  } else if (GAME_VERSION.includes('test-menu-cleanup')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'menu-cleanup-' + tN;
  // v0.3.27+：chapter2-orange-family-mix → orange-family-N（test-N 自動帶入）
  } else if (GAME_VERSION.includes('chapter2-orange-family-mix')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'orange-family-' + tN;
  // v0.3.26+：projectile-orange-stable → proj-stable-N
  } else if (GAME_VERSION.includes('projectile-orange-stable')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'proj-stable-' + tN;
  // v0.3.26+：projectile-orange-hitbox-final → proj-hitbox-final-N
  } else if (GAME_VERSION.includes('projectile-orange-hitbox-final')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'proj-hitbox-final-' + tN;
  // v0.3.26+：projectile-orange-hitbox-calibration → proj-hitbox-calib-N
  } else if (GAME_VERSION.includes('projectile-orange-hitbox-calibration')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'proj-hitbox-calib-' + tN;
  // v0.3.26+：projectile-orange-hitbox → proj-hitbox-N
  } else if (GAME_VERSION.includes('projectile-orange-hitbox')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'proj-hitbox-' + tN;
  // v0.3.26+：projectile-orange-shot-calibration → proj-shot-calib-N
  } else if (GAME_VERSION.includes('projectile-orange-shot-calibration')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'proj-shot-calib-' + tN;
  // v0.3.26+：projectile-orange-complete-art → proj-complete-art-N
  } else if (GAME_VERSION.includes('projectile-orange-complete-art')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'proj-complete-art-' + tN;
  // v0.3.26+：projectile-orange-image-cache-fix → proj-img-cache-fix-N
  } else if (GAME_VERSION.includes('projectile-orange-image-cache-fix')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'proj-img-cache-fix-' + tN;
  // v0.3.26+：projectile-orange-art-debug → proj-art-debug-N
  } else if (GAME_VERSION.includes('projectile-orange-art-debug')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'proj-art-debug-' + tN;
  // v0.3.26+：projectile-orange-art → proj-art-N
  } else if (GAME_VERSION.includes('projectile-orange-art')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'proj-art-' + tN;
  // v0.3.25+：dual-orange-stable → dual-stable-N
  } else if (GAME_VERSION.includes('dual-orange-stable')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'dual-stable-' + tN;
  // v0.3.25+：dual-orange-oil-localstorage-fix → dual-oil-ls-fix-N
  } else if (GAME_VERSION.includes('dual-orange-oil-localstorage-fix')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'dual-oil-ls-fix-' + tN;
  // v0.3.25+：dual-orange-oil-hitbox-final → dual-oil-hitbox-final-N
  } else if (GAME_VERSION.includes('dual-orange-oil-hitbox-final')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'dual-oil-hitbox-final-' + tN;
  // v0.3.25+：dual-orange-oil-size-formula-fix → dual-oil-size-fix-N
  } else if (GAME_VERSION.includes('dual-orange-oil-size-formula-fix')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'dual-oil-size-fix-' + tN;
  // v0.3.25+：dual-orange-oil-hitbox-calibration → dual-oil-hitbox-N
  } else if (GAME_VERSION.includes('dual-orange-oil-hitbox-calibration')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'dual-oil-hitbox-' + tN;
  // v0.3.25+：dual-orange-oil-position-final → dual-oil-pos-final-N
  } else if (GAME_VERSION.includes('dual-orange-oil-position-final')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'dual-oil-pos-final-' + tN;
  // v0.3.25+：dual-orange-oil-layer-fix → dual-oil-layer-fix-N
  } else if (GAME_VERSION.includes('dual-orange-oil-layer-fix')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'dual-oil-layer-fix-' + tN;
  // v0.3.25+：dual-orange-oil-calibration → dual-oil-align
  } else if (GAME_VERSION.includes('dual-orange-oil-calibration')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'dual-oil-align-' + tN;
  // v0.3.25+：dual-orange-art-integration → dual-art-test-N
  } else if (GAME_VERSION.includes('dual-orange-art-integration')) {
    const tN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = 'dual-art-test-' + tN;
  // v0.3.25+：dual-orange-idle-art → dual-idle-art
  } else if (GAME_VERSION.includes('dual-orange-idle-art')) {
    tPart = 'dual-idle-art';
  // v0.3.24+：shop-and-chimney-oil-stable → shop+oil-stable
  } else if (GAME_VERSION.includes('shop-and-chimney-oil-stable')) {
    tPart = 'shop+oil-stable';
  // v0.3.24+：chimney-oil-offset-final → oil-offset-final
  } else if (GAME_VERSION.includes('chimney-oil-offset-final')) {
    tPart = 'oil-offset-final';
  // v0.3.24+：chimney-oil-calibration-tool → oil-align-tool
  } else if (GAME_VERSION.includes('chimney-oil-calibration-tool')) {
    tPart = 'oil-align-tool';
  // v0.3.24+：shop-hint-and-chimney-oil → shop+oil-test-N or shop+oil-fix-N
  } else if (GAME_VERSION.includes('shop-hint-and-chimney-oil')) {
    const fixM  = GAME_VERSION.match(/-fix-(\d+)$/)?.[1];
    const testN = GAME_VERSION.match(/-test-(\d+)/)?.[1] || '1';
    tPart = fixM ? 'shop+oil-fix-' + fixM : 'shop+oil-test-' + testN;
  // v0.3.23：shop-healing-items-foundation → shop-heal-test-N
  } else if (GAME_VERSION.includes('shop-healing-items')) {
    const tN = GAME_VERSION.match(/-test-(\d+)$/)?.[1] || '1';
    tPart = 'shop-heal-test-' + tN;
  // v0.3.22：chimney-orange-art-integration → chimney-art-test-N
  } else if (GAME_VERSION.includes('chimney-orange-art')) {
    const tN = GAME_VERSION.match(/-test-(\d+)$/)?.[1] || '1';
    tPart = 'chimney-art-test-' + tN;
  } else {
    const tMatch = GAME_VERSION.match(/([a-z]+-[a-z]+)-test-(\d+)$/) ||
                   GAME_VERSION.match(/([a-z]+)-test-(\d+)$/);
    tPart = tMatch ? tMatch[1] + '-test-' + tMatch[2] : '';
  }
  return [vPart, tPart].filter(Boolean).join(' ');
}

function drawVersionInfo() {
  // 判斷是否為小螢幕 / 手機橫向（canvas clientWidth 或 window.innerWidth 較小）
  const compactUi = (typeof canvas !== 'undefined' && canvas.clientWidth > 0 && canvas.clientWidth < 900)
                  || window.innerWidth < 900;

  if (ADVENTURE_TEST_TOOLS_ENABLED) {
    ctx.save();
    ctx.textAlign = 'left';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = 'rgba(255,230,120,0.95)';

    if (compactUi) {
      // 手機版：短版版本號放在左側，避開右側按鈕
      ctx.fillText('[TEST] ' + getShortVersionLabel(), 8, 44);
    } else {
      ctx.textAlign = 'right';
      ctx.fillText(
        '[TEST MODE] F8 畫面暫停｜runtime hammer: ' + (HAMMER_ATTACK_VISUAL_TEST_LOADOUT ? 'ON' : 'OFF'),
        CANVAS_W - 14,
        32
      );
    }
    ctx.restore();
  }

  // 版本字串（右上角）
  const vText = compactUi
    ? getShortVersionLabel()            // 手機：短版
    : GAME_VERSION + '  Build: ' + BUILD_TIME; // 桌機：完整版
  ctx.font = '10px monospace';
  const tw  = ctx.measureText(vText).width;

  // 手機版：避開右側按鈕（約佔 120px），改放左側上方
  const px = compactUi ? 8 : CANVAS_W - tw - 10;
  const py = compactUi ? 4 : 4;

  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(px - 4, py, tw + 8, 18);
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
    [itemIconHtml('coin', '🪙') + ' 金幣總計',         `${playerInventory.coins} 枚`,          'result-gold'],
    [itemIconHtml('b260', '🎈') + ' 260 長條氣球總計', `${playerInventory.balloon260} 條`,     'result-pink'],
  ];
  if (playerInventory.roundBalloon > 0) {
    rows.push([itemIconHtml('round', '⚪') + ' 圓氣球總計', `${playerInventory.roundBalloon} 顆`, 'result-purple']);
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

// v0.3.33-fix-2：小狗消氣 — 狗狗區塊內只留簡短狀態
// v0.3.34：完整通知改成結算頁上方的提醒卡（buildDogGoneReminderHtml），這裡不再放長文
function buildDogGoneNoticeHtml() {
  return '<div class="rp-section-title">🐶 氣球小狗</div>'
    + '<div class="rp-row"><span class="rp-label">狀態</span><span class="rp-val" style="color:#ff9a9a">已消氣，下一關不會同行</span></div>';
}
// v0.3.34：結算頁「重要提醒」區的小狗消氣卡（在「本關獲取」上方）
function buildDogGoneReminderHtml() {
  return '<div class="rp-guidebook-hint rp-dog-gone-card" id="rp-dog-gone-card">'
    + '<div class="rp-guidebook-hint__title">🐶 氣球小狗消氣了</div>'
    + '<div class="rp-dog-gone-card__status">已消氣，下一關不會同行</div>'
    + '<div class="rp-guidebook-hint__body">'
    + '小狗陪你完成最後一次冒險，已經消氣了。<br>'
    + '下一關不會自動同行。<br>'
    + '如果還想帶牠，請先重新製作小狗，再按「帶狗出發」。'
    + '</div></div>';
}
// 本關小狗消氣、但玩家已在結算後重新製作新小狗
function buildDogRecraftedNoticeHtml() {
  return '<div class="rp-supply-hp" style="color:#ffe0a0">'
    + '原本的氣球小狗已消氣，新的氣球小狗已入住小V的家。要讓牠同行，請再按「帶狗出發」。'
    + '</div>';
}

// ── refreshResultDog：製作狗後即時更新狗區塊（含帶狗出門提示）──
function refreshResultDog() {
  const sec = document.getElementById('dog-section');
  if (!sec) return;
  const dog    = playerInventory.balloonDog || {};
  const hasDog = dog.present;
  const turns  = dog.turnsLeft || 0;
  const nextLvIndex       = getNextLevelIndex(currentLevelIndex);
  const nextLvHasTreasure = nextLvIndex < LEVELS.length && isHiddenTreasureAvailable(LEVELS[nextLvIndex]?.hiddenTreasure); // v0.3.33
  clearInvalidDogTripPlan('refreshResultDog'); // v0.3.33-fix-2
  const canBringDog       = canBringDogNextLevel(); // v0.3.18-fix-1：用共用 helper（含教學保底）

  let inner = '';
  if (hasDog) {
    inner += '<div class="rp-section-title">🐶 氣球小狗</div>';
    const ds = getDogStatusText();
    inner += '<div class="rp-row"><span class="rp-label">狀態</span><span class="rp-val result-gold">' + ds.status + '</span></div>';
    inner += '<div class="rp-row"><span class="rp-label">陪伴</span><span class="rp-val result-blue">' + ds.turns + '</span></div>';
    if (currentRunStats.dogHealed) {
      inner += '<div class="rp-row"><span class="rp-label">🐶 療癒</span><span class="rp-val result-red">❤️ +' + CONFIG.DOG_HEAL_AMOUNT + '</span></div>';
    }
    if (currentRunStats.dogGoneThisClear && !nextBringDog) inner += buildDogRecraftedNoticeHtml(); // v0.3.33-fix-2
    // 帶狗按鈕（不論下一關是否有隱藏物）
    // v0.3.33-fix-2：本關小狗消氣後若已重新製作，新小狗也要能按「帶狗出發」
    if (turns > 0) {
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
  } else if (currentRunStats.dogGoneThisClear) {
    inner += buildDogGoneNoticeHtml(); // v0.3.33-fix-2
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
  refreshInventorySummary(); // v0.3.29
}

function populateResultPanel() {
  clearInvalidDogTripPlan('populateResultPanel'); // v0.3.33-fix-2
  const timeLeft = Math.max(0, LEVEL_DURATION - Math.floor(elapsedSec));
  const ci       = playerInventory.craftedItems || {}; // 供 hammerHint 等使用
  // v0.3.11-test-3：「下一步」狀態提早算好，整個函式內都可參考，
  // 避免結算畫面各區塊（狗狗區塊等）各自重複判斷同一組條件
  const nextStepInfo = (gameState === 'clear') ? getChapter1NextStepInfo() : null;

  // 本關成果：主要圖示磚（emoji, 數值, css class, 標籤）
  const runRowsMain = [
    [itemIconHtml('coin', '🪙'), String(currentRunStats.coins),                 'result-gold',   '本關金幣'],
    [itemIconHtml('b260', '🎈'), String(currentRunStats.balloon260),            'result-pink',   '260 氣球'],
    ...(currentRunStats.roundBalloon > 0
      ? [[itemIconHtml('round', '⚪'), String(currentRunStats.roundBalloon),     'result-purple', '圓氣球']]
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
  // v0.3.32：Boss 弱點筆記有專屬提示卡；其他隱藏物沿用原本提示
  const bossNoteFound = (gameState === 'clear' && currentRunStats.foundBossNote) ? currentRunStats.foundBossNote : null;
  const bossNoteFirstLine = bossNoteFound ? String(bossNoteFound.noteText || '').split('。')[0] : '';
  const treasureHint = bossNoteFound
    ? ('<div class="rp-guidebook-hint" style="border-color:rgba(255,220,80,0.5);background:rgba(80,60,0,0.2)">'
      + '<div class="rp-guidebook-hint__title">📜 找到橘子王觀察筆記！</div>'
      + '<div class="rp-guidebook-hint__body">'
      + '氣球小狗找到了一張沾滿橘子油的筆記：<br>'
      + (bossNoteFirstLine ? '「' + bossNoteFirstLine + '。」<br>' : '')
      + '已收進背包「其他物品」。這可能是前往 2-4 Boss 關的重要線索……'
      + '</div>'
      + (bossNoteFound.id && (playerInventory.keyItems || {})[bossNoteFound.id]
          ? '<button class="rp-next-step-btn" style="margin-top:8px" onclick="openKeyItemReadModal(\'' + bossNoteFound.id + '\')">📖 閱讀筆記</button>'
          : '')
      + '</div>')
    : (gameState === 'clear' && currentRunStats.foundHiddenTreasure)
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
    && isHiddenTreasureAvailable(LEVELS[nextLvIndex].hiddenTreasure); // v0.3.33
  const canBringDog   = canBringDogNextLevel(); // v0.3.18-fix-1

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
    if (currentRunStats.dogGoneThisClear && !nextBringDog) {
      dogInner += buildDogRecraftedNoticeHtml(); // v0.3.33-fix-2：消氣後已重新製作
    }
    // v0.3.11-test-3：結算畫面資訊減量 — 帶狗出發的主要行動已移到上方「下一步」區塊，
    // 這裡只在「下一步」沒有顯示帶狗行動時才補完整的提示+按鈕（例如已經安排好帶狗、
    // 或不在第一章流程內但仍有 hiddenTreasure 的情況），避免同一個按鈕重複出現兩次
    const nextStepAlreadyHandlesBringDog = nextStepInfo && nextStepInfo.kind === 'bringDog';
    // v0.3.56：帶狗出發不再綁定「下一關有沒有隱藏寶物」— 有狗、沒消氣、還有下一關就能自由選擇；寶物只是額外提示
    if (dogTurns > 0 && nextLvIndex < LEVELS.length && !nextStepAlreadyHandlesBringDog) {
      dogInner += '<div class="rp-supply-hp" style="color:#ffe080">'
        + (nextLvHasTreasure
          ? '🐶 氣球小狗好像聞到了什麼……下一關也許藏著寶物！'
          : '🐶 帶氣球小狗一起冒險！通關時牠還會療癒 ❤️ +' + CONFIG.DOG_HEAL_AMOUNT + '。')
        + '</div>';
      if (!nextBringDog) {
        const btnLabel  = canBringDog ? '帶狗出發 -1 🎈' : '260 氣球不足';
        const btnDisStr = canBringDog ? '' : 'disabled';
        const btnCls    = canBringDog ? '' : 'rp-supply-btn--disabled';
        dogInner += '<div class="rp-supply-item" style="margin-top:6px">'
          + '<div class="rp-supply-info">'
          + '<span class="rp-supply-name">帶氣球小狗出發</span>'
          + '<span class="rp-supply-price">消耗 260 長條氣球 x1 作為牽繩</span>'
          + '</div>'
          + '<button id="btn-bring-dog" class="rp-supply-btn ' + btnCls + '" ' + btnDisStr + ' onclick="bringDogNextLevel()">'
          + btnLabel + '</button></div>';
      } else {
        // v0.3.33-fix-2：按下「帶狗出發」後明確顯示已安排
        dogInner += '<div class="rp-supply-item" style="margin-top:6px">'
          + '<button class="rp-supply-btn rp-supply-btn--disabled" disabled>✅ 已安排帶狗出發</button></div>';
      }
    }
    dogSectionHtml = '<div class="rp-section" id="dog-section">' + dogInner + '</div>';
  } else if (currentRunStats.dogGoneThisClear) {
    // v0.3.33-fix-2：小狗已消氣（present=false）仍要顯示明確通知，不可直接略過
    dogSectionHtml = '<div class="rp-section" id="dog-section">' + buildDogGoneNoticeHtml() + '</div>';
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
  if (currentRunStats.foundBossNote) // v0.3.32
    foundBadges.push('<div class="rp-award-badge rp-award-badge--recipe"><span>📜</span>橘子王觀察筆記！</div>');
  if (currentRunStats.foundHiddenTreasureName === '金幣寶箱')
    foundBadges.push('<div class="rp-award-badge rp-award-badge--chest"><span>🎁</span>隱藏寶箱 +' + (currentRunStats.foundTreasureCoins || 30) + ' 🪙</div>');
  if (currentRunStats.dogHealed)
    foundBadges.push('<div class="rp-award-badge rp-award-badge--dog"><span>🐶</span>氣球小狗療癒 ❤️ +' + CONFIG.DOG_HEAL_AMOUNT + '</div>');
  const badgesHtml = foundBadges.join('');

  // 【第二層】目前背包（預設收合）—— onclick 用 data-target，避免字串引號衝突
  const bagHtml = '<div class="rp-fold-card" id="rp-inventory-section">'
    + '<div class="rp-fold-btn" data-target="rp-inventory-body" onclick="rpToggle(this)">'
    + '<span class="rp-fold-icon">🎒</span><span>背包明細</span><span class="rp-toggle-arrow">▶</span></div>'
    + '<div id="rp-inventory-body" style="display:none">' + makeTable(buildBagRows()) + '</div></div>';

  // 【第三層】詳細紀錄（預設收合）
  const detailHtml = '<div class="rp-fold-card" id="rp-run-section">'
    + '<div class="rp-fold-btn" data-target="rp-detail-body" onclick="rpToggle(this)">'
    + '<span class="rp-fold-icon">📋</span><span>詳細紀錄</span><span class="rp-toggle-arrow">▶</span></div>'
    + '<div id="rp-detail-body" style="display:none">' + makeTable(runRows) + '</div></div>';

  // 【第四層】補給（預設收合；v0.3.34：受傷且背包有繃帶 / 急救包時自動展開）
  const _healItems     = playerInventory.items || {};
  // v0.3.57：補給是重點資訊 → 受傷時就展開（不論有沒有補血道具，愛心貼布也在這裡）
  const supplyAutoOpen = player.hp < player.maxHp;
  void _healItems;
  const supplyHtml = '<div class="rp-fold-card" id="supply-section">'
    + '<div class="rp-fold-btn" data-target="rp-supply-body" onclick="rpToggle(this)">'
    + '<span class="rp-fold-icon">🏥</span><span>補給</span><span class="rp-toggle-arrow">' + (supplyAutoOpen ? '▼' : '▶') + '</span></div>'
    + '<div id="rp-supply-body" style="display:' + (supplyAutoOpen ? 'block' : 'none') + '">'
    + buildResultSupplyHpRowHtml()
    + '<div id="rp-heal-items">' + buildHealingItemRowsHtml('result') + '</div>'
    + '<div class="rp-supply-bandage-row"><div class="rp-supply-bandage-info"><span class="rp-supply-name">🩹 愛心貼布</span><span class="rp-supply-price">−20 ' + itemIconHtml('coin', '🪙') + '　+1 ❤️</span></div>'
    + '<button id="btn-buy-bandage" class="rp-supply-btn rp-supply-btn--'
    + (player.hp>=player.maxHp||(playerInventory.coins||0)<BANDAGE_PRICE ? 'disabled' : 'active')
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
  // v0.3.57：重要獎勵（新秘笈 / 寶箱 / 小狗療癒 / V幣）放在標題下面，一眼看到
  if (badgesHtml) html += '<div class="rp-awards rp-awards--top">' + badgesHtml + '</div>';
  html += '<div id="rp-vcoin-section" style="display:none"></div>';
  // v0.3.34：置頂狀態列（血量 + 背包）— 往下滑時釘在結算內容區頂部
  html += '<div id="rp-sticky-status" class="sticky-status">' + buildStickyStatusBarHtml() + '</div>';
  // v0.3.29：目前背包總量（v0.3.34：加入血量）
  html += '<div id="rp-inventory-summary">' + buildInventorySummaryHtml({ showHp: true }) + '</div>';
  html += buildResultHpHtml(); // v0.3.34：只剩低血量警告（血量已在上方狀態列）

  // v0.3.35：擊敗橘子王 → 第二章完成
  if (gameState === 'clear' && currentRunStats.chapter2Complete) {
    html += '<div class="rp-guidebook-hint rp-chapter-complete-card">'
      + '<div class="rp-guidebook-hint__title">🏆 第二章完成！</div>'
      + '<div class="rp-guidebook-hint__body">橘子王被打敗了！小V保護了派對島的氣球。</div>'
      + '</div>';
  }
  // v0.3.35-fix-1：下一關是 Boss 關但沒有武器 → Boss 戰前準備（下一關按鈕鎖住）
  if (gameState === 'clear' && isBossWeaponGateBlocked(getNextLevelIndex(currentLevelIndex))) {
    html += '<div class="rp-guidebook-hint rp-boss-next-card" id="rp-boss-weapon-gate">'
      + '<div class="rp-guidebook-hint__title">⚔️ Boss 戰前準備</div>'
      + '<div class="rp-guidebook-hint__body">橘子王太危險了！<br>請先製作一把氣球劍，再前往 2-4。<br>（2-4 只能使用氣球劍）</div>'
      + '<button class="rp-next-step-btn" style="margin-top:8px" onclick="openGuidebook()">📖 打開氣球秘笈製作武器</button>'
      + '</div>';
  } else
  // v0.3.35：下一關是 Boss 關 → 出發前提醒
  if (gameState === 'clear' && isBossStageLevel(getNextLevelIndex(currentLevelIndex))) {
    const hasNote = !!(playerInventory.keyItems || {}).orangeKingWeaknessNote01;
    html += '<div class="rp-guidebook-hint rp-boss-next-card">'
      + '<div class="rp-guidebook-hint__title">👑 下一關：橘子王決戰！</div>'
      + '<div class="rp-guidebook-hint__body">出發前先補滿血量'
      + (hasNote ? '，也可以再讀一次觀察筆記。' : '。') + '</div>'
      + (hasNote ? '<button class="rp-next-step-btn" style="margin-top:8px" onclick="openKeyItemReadModal(\'orangeKingWeaknessNote01\')">📖 閱讀觀察筆記</button>' : '')
      + '</div>';
  }
  // v0.3.34：重要提醒區（在「本關獲取」之前）— 小狗消氣
  if (currentRunStats.dogGoneThisClear && !(playerInventory.balloonDog || {}).present) {
    html += buildDogGoneReminderHtml();
  }

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

  // v0.3.24：Shopping 提示（移到本關獎勵之前，讓玩家在手機上更容易看到）
  html += buildResultShopHintHtml();
  // v0.3.34：秘笈 / 新秘笈 / 受傷提醒也屬於重要提醒，移到「本關獲取」之前
  html += hammerHint;
  html += guideBookHint;
  html += lowHpRescueHint;

  // v0.3.57：結算資訊減量 — 先看重要的（下一關準備 / 小狗 / 補給），明細預設收合
  html += treasureHint;
  // 氣球小狗（帶狗出發）
  html += dogSectionHtml;
  // 補給（受傷時自動展開）
  html += supplyHtml;
  // 本關獲取明細（預設收合）
  html += '<div class="rp-fold-card" id="rp-hero-fold">'
    + '<div class="rp-fold-btn" data-target="rp-hero-section" onclick="rpToggle(this)">'
    + '<span class="rp-fold-icon">📦</span><span>本關獲取明細</span><span class="rp-toggle-arrow">▶</span></div>'
    + '<div class="rp-hero-section" id="rp-hero-section" style="display:none">'
    + '<div class="rp-reward-grid">' + mainTiles + '</div>'
    + '</div></div>';
  // 背包明細 / 詳細紀錄（預設收合）
  html += bagHtml;
  html += detailHtml;
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
  updateStickyStatusVisibility(); // v0.3.34
}


// ── 愛心貼布購買（結算畫面補給區）────────────
// TODO: 正式版改為在「小V的家」購買，放進背包，關卡中按暫停使用，每關最多一次

const BANDAGE_PRICE = 20;
const BANDAGE_HEAL  = 1;

function buyBandage() {
  const _hpBefore = player.hp; // v0.3.55：愛心貼布（結算補給）成功才播演出
  buyBandageCore();
  const gained = player.hp - _hpBefore;
  if (gained > 0) { try { playHealFeedbackDom(gained, false); } catch (e) {} }
}
function buyBandageCore() {
  // v0.3.58：取消「每關限一次」— 只要生命未滿、金幣足夠就能再買再用
  if (player.hp >= player.maxHp) return;
  if (playerInventory.coins < BANDAGE_PRICE) return;
  const _now = Date.now(); // 手機 touchstart + click / 快速連點：同一次點擊只交易一次
  if (_now - (buyBandageCore._lastAt || 0) < 350) return;
  buyBandageCore._lastAt = _now;
  playerInventory.coins -= BANDAGE_PRICE;
  player.hp = Math.min(player.maxHp, player.hp + BANDAGE_HEAL);
  currentRunStats.usedHeartPatch = true; // 只當統計紀錄（本關有用過），不再限制購買
  saveInventory();
  if (typeof syncOutOfAdventureHpToRetry === 'function') syncOutOfAdventureHpToRetry(); // 失敗 / 時間到畫面補的血，重試時保留
  try { refreshAfterOutOfAdventureHeal(); } catch (e) {}

  // 更新補給區目前生命
  refreshAllHpDisplays(); // v0.3.57：數字 + 愛心一起更新（之前只改數字，愛心沒跟著變）
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


// =============================================
//  商店補給系統（v0.3.23）
//  buyShopItem(itemId)   — 在小V的家商店購買道具
//  useHealingItem(itemId) — 暫停背包中使用補血道具
//  renderHomeShop()       — 渲染商店 UI
//  openHomeShopFromResult() — 從結算頁直接跳到商店
//
//  未來擴充：氣球秘笈製作補血道具（棒棒糖、氣球食物）可另行加入
//  本版只做商店購買路徑，不做秘笈補血
// =============================================

function ensureInventoryItems() {
  if (!playerInventory.items) {
    playerInventory.items = Object.assign({}, INVENTORY_DEFAULTS.items);
  }
}

function buyShopItem(itemId) {
  const item = SHOP_ITEMS[itemId];
  if (!item) return;
  // v0.3.57：同一次點擊 / 快速連點只買一次（不重複扣金幣、不重複發物品）
  const _now = Date.now();
  if (_now - (buyShopItem._lastAt || 0) < 350) return;
  buyShopItem._lastAt = _now;
  ensureInventoryItems();
  const coins   = playerInventory.coins || 0;
  const have    = playerInventory.items[itemId] || 0;
  const max     = item.maxCarry;

  if (coins < item.priceCoins) {
    showHint('金幣不夠，先去冒險收集更多金幣吧！', 200);
    renderHomeShop();
    return;
  }
  if (have >= max) {
    if (itemId === 'bandage')     showHint('繃帶已經帶滿了！', 160);
    else if (itemId === 'firstAidKit') showHint('急救包最多只能帶 1 箱！', 160);
    else showHint('已達攜帶上限！', 160);
    return;
  }

  playerInventory.coins       -= item.priceCoins;
  playerInventory.items[itemId] = have + 1;
  saveInventory();

  renderHomeShop();
  if (typeof renderHomeInventory === 'function') renderHomeInventory();
  if (typeof renderHomeSupply    === 'function') renderHomeSupply();
  if (typeof refreshInventorySummary === 'function') refreshInventorySummary();
  showHint(item.icon + ' ' + item.name + ' 購買成功！', 180);
  // v0.3.57：交易真正成功後才播購買演出（卡片已被重畫 → 套在新卡片上）
  try {
    const card = document.querySelector('#home-shop-body .home-shop-card[data-shop-id="' + itemId + '"]');
    playCraftSuccessFx(card, { name: item.name, emoji: item.icon, shopBuy: true });
  } catch (e) {}
}

// ══ v0.3.55：補血成功演出（只在 HP 真的增加之後觸發；不改補血數值 / 道具消耗）══
let healFx = null; // 冒險中：{ strong, amount, start(ms 或 null = 等回到遊戲才開始) }
const HEAL_FX_MS = 900;
function formatHealAmount(v) { const r = Math.round(v * 100) / 100; return (r % 1 === 0 ? String(r) : String(r)); }
function triggerAdventureHealFx(amount, strong) {
  try { sfxOnHeal(amount); } catch (e) {} // v0.3.64：實際恢復 HP（同一次補血的兩個演出只播一次）
  if (!(amount > 0)) return;
  healFx = { strong: !!strong, amount, start: null, seed: Math.random() * 1000 }; // 暫停背包裡使用 → 回到遊戲畫面時才開始播
}
function drawCanvasHeart(x, y, size, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.translate(x, y); ctx.scale(size / 16, size / 16);
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(-8, -1, -8, -9, -2, -9);
  ctx.bezierCurveTo(0, -9, 0, -7, 0, -6);
  ctx.bezierCurveTo(0, -7, 0, -9, 2, -9);
  ctx.bezierCurveTo(8, -9, 8, -1, 0, 5);
  ctx.fill();
  ctx.restore();
}
function getHealFxProgress() {
  if (!healFx) return -1;
  if (healFx.start == null) {
    if (gameState !== 'playing') return -1;
    healFx.start = dogNowMs();
  }
  const t = (dogNowMs() - healFx.start) / HEAL_FX_MS;
  if (t >= 1) { healFx = null; return -1; }
  return t;
}
function drawHealFx(cx, layer) {
  const t = getHealFxProgress();
  if (t < 0) return;
  const f = healFx, strong = f.strong;
  const px = player.x - cx + player.w / 2, py = player.y + player.h / 2;
  ctx.save();
  if (layer === 'back') {
  // 恢復光暈（繃帶：淡粉紅；急救包：粉紅 + 淡綠，較強）
  const ga = Math.sin(Math.min(1, t) * Math.PI) * (strong ? 0.75 : 0.5);
  const R = (strong ? 70 : 52) * (0.85 + t * 0.3);
  const gr = ctx.createRadialGradient(px, py, 4, px, py, R);
  gr.addColorStop(0, strong ? 'rgba(255,170,210,' + ga + ')' : 'rgba(255,190,220,' + ga + ')');
  gr.addColorStop(0.55, strong ? 'rgba(170,255,190,' + (ga * 0.55) + ')' : 'rgba(255,200,225,' + (ga * 0.4) + ')');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.arc(px, py, R, 0, Math.PI * 2); ctx.fill();
  // 急救包：往外擴散的光圈（短暫的正向恢復動畫）
  if (strong) {
    ctx.strokeStyle = 'rgba(140,255,170,' + (0.8 * (1 - t)) + ')';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(px, py, 20 + t * 60, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
  return;
  }
  // 往上飄的愛心（繃帶 4 顆、急救包 7 顆）
  const n = strong ? 7 : 4;
  for (let i = 0; i < n; i++) {
    const delay = (i / n) * 0.35;
    const tt = (t - delay) / (1 - delay);
    if (tt <= 0) continue;
    const ox = Math.sin(f.seed + i * 2.3) * (strong ? 34 : 24) + Math.sin(tt * 6 + i) * 4;
    const hy = py + 10 - tt * (strong ? 95 : 75);
    const size = (strong ? 15 : 13) * (0.75 + 0.25 * Math.sin(i * 1.7 + 1));
    drawCanvasHeart(px + ox, hy, size, i % 3 === 2 && strong ? '#7dffa0' : '#ff5f9a', Math.max(0, 1 - tt * tt));
  }
  // 實際恢復量
  ctx.globalAlpha = Math.max(0, Math.min(1, (1 - t) * 1.6));
  ctx.font = 'bold ' + (strong ? 18 : 16) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(80,0,40,0.75)'; ctx.fillStyle = '#ffd6e8';
  const txt = '+' + formatHealAmount(f.amount) + ' ❤️';
  const ty = player.y - 34 - t * 22;
  ctx.strokeText(txt, px, ty); ctx.fillText(txt, px, ty);
  ctx.restore();
}
// HUD 心心回彈（補血演出前段 0.35 秒放大 → 回彈）
function getHealHudBounceScale() {
  if (!healFx || healFx.start == null) return 1;
  const t = (dogNowMs() - healFx.start) / 350;
  if (t < 0 || t >= 1) return 1;
  return 1 + Math.sin(t * Math.PI) * (healFx.strong ? 0.35 : 0.25);
}
// ── 結算頁 / 小V的家 / 暫停背包：DOM 愛心 + 局部震動 + 生命回彈 ──
function ensureHealFxStyles() {
  if (typeof document === 'undefined' || document.getElementById('hv-heal-fx-style')) return;
  const st = document.createElement('style');
  st.id = 'hv-heal-fx-style';
  st.textContent =
    '@keyframes hvHealFloat{0%{transform:translate(0,0) scale(.6);opacity:0}15%{opacity:1;transform:translate(0,-8px) scale(1)}100%{transform:translate(var(--dx),-70px) scale(.9);opacity:0}}'
    + '@keyframes hvHealShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-3px)}40%{transform:translateX(3px)}60%{transform:translateX(-2px)}80%{transform:translateX(2px)}}'
    + '@keyframes hvHealBounce{0%{transform:scale(1)}40%{transform:scale(1.18)}70%{transform:scale(.96)}100%{transform:scale(1)}}'
    + '@keyframes hvHealText{0%{opacity:0;transform:translate(-50%,6px)}20%{opacity:1;transform:translate(-50%,0)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-26px)}}'
    + '.hv-heal-fx{position:fixed;pointer-events:none;z-index:100500;font-size:20px;line-height:1;animation:hvHealFloat .95s ease-out forwards}'
    + '.hv-heal-fx-text{position:fixed;pointer-events:none;z-index:100501;font:bold 16px sans-serif;color:#fff;background:rgba(255,80,140,.92);padding:4px 10px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.35);white-space:nowrap;animation:hvHealText 1.1s ease-out forwards}'
    + '.hv-heal-shake{animation:hvHealShake .2s ease-in-out 1}'
    + '.hv-heal-bounce{display:inline-block;animation:hvHealBounce .38s ease-out 1}';
  document.head.appendChild(st);
}
function clearHealFxDom() {
  if (typeof document === 'undefined' || !document.querySelectorAll) return;
  document.querySelectorAll('.hv-heal-fx, .hv-heal-fx-text, .hv-craft-fx, .hv-craft-fx-text').forEach(e => { try { e.remove(); } catch (er) {} }); // v0.3.56：製作演出一起清
}
function isElVisible(el) {
  if (!el || !el.getBoundingClientRect) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && el.offsetParent !== null;
}
function findHealAnchorEl() {
  const ids = ['rp-supply-hp-row', 'supply-hp', 'home-supply-body', 'home-heal-items', 'pause-bag-panel'];
  for (const id of ids) { const el = document.getElementById(id); if (isElVisible(el)) return el; }
  const ae = document.activeElement; // 剛按下的按鈕（例如其他分頁裡的「使用」）
  if (ae && ae !== document.body && isElVisible(ae)) return ae;
  return null;
}
function playHealFeedbackDom(amount, strong, anchorEl) {
  try { sfxOnHeal(amount); } catch (e) {} // v0.3.64
  if (typeof document === 'undefined' || !document.body || !(amount > 0)) return;
  ensureHealFxStyles();
  const el = anchorEl || findHealAnchorEl();
  const r = el ? el.getBoundingClientRect() : { left: window.innerWidth / 2 - 40, top: window.innerHeight / 2, width: 80, height: 20 };
  const n = strong ? 7 : 5;
  for (let i = 0; i < n; i++) {
    const h = document.createElement('div');
    h.className = 'hv-heal-fx';
    h.textContent = (strong && i % 3 === 2) ? '💚' : '💖';
    h.style.left = (r.left + Math.min(r.width, 160) * (0.15 + 0.7 * (i / Math.max(1, n - 1)))) + 'px';
    h.style.top = (r.top + r.height / 2 - 10) + 'px';
    h.style.setProperty('--dx', (Math.round((Math.random() - 0.5) * 30)) + 'px');
    h.style.animationDelay = (i * 0.06) + 's';
    document.body.appendChild(h);
    setTimeout(() => { try { h.remove(); } catch (e) {} }, 1300);
  }
  const tx = document.createElement('div');
  tx.className = 'hv-heal-fx-text';
  tx.textContent = '💗 恢復 +' + formatHealAmount(amount) + ' ❤️';
  tx.style.left = (r.left + Math.min(r.width, 200) / 2) + 'px';
  tx.style.top = (r.top - 30) + 'px';
  document.body.appendChild(tx);
  setTimeout(() => { try { tx.remove(); } catch (e) {} }, 1300);
  // 生命數字回彈 + 補血區局部震動（2～3px、200ms）
  if (el) {
    const num = el.querySelector ? (el.querySelector('#supply-hp, .rp-supply-hp-num, .result-red') || el) : el;
    num.classList.remove('hv-heal-bounce'); void num.offsetWidth; num.classList.add('hv-heal-bounce');
    setTimeout(() => { try { num.classList.remove('hv-heal-bounce'); } catch (e) {} }, 450);
    const box = (el.closest && el.closest('.rp-section, .home-section, .home-card, #home-supply-body, #pause-bag-panel')) || el.parentElement || el;
    box.classList.remove('hv-heal-shake'); void box.offsetWidth; box.classList.add('hv-heal-shake');
    setTimeout(() => { try { box.classList.remove('hv-heal-shake'); } catch (e) {} }, 260);
  }
}
function useHealingItem(itemId) {
  const _hpBefore = player.hp; // v0.3.55：成功（HP 真的增加）才播演出
  useHealingItemCore(itemId);
  const gained = player.hp - _hpBefore;
  if (gained > 0) {
    const strong = !!(SHOP_ITEMS[itemId] && SHOP_ITEMS[itemId].healFull);
    triggerAdventureHealFx(gained, strong);
    try { playHealFeedbackDom(gained, strong, document.getElementById('pause-bag-panel')); } catch (e) {}
  }
}
function useHealingItemCore(itemId) {
  const item = SHOP_ITEMS[itemId];
  if (!item) return;
  ensureInventoryItems();
  const have = playerInventory.items[itemId] || 0;
  if (have <= 0) return;

  const maxHp = player.maxHp || CONFIG.PLAYER_MAX_HP || 3;
  if (player.hp >= maxHp) {
    showHint('生命已經滿了！', 140);
    // 不消耗道具
    return;
  }

  if (item.healFull) {
    player.hp = maxHp;
  } else if (item.healAmount) {
    player.hp = Math.min(maxHp, player.hp + item.healAmount);
  }
  playerInventory.items[itemId] = have - 1;
  saveInventory();

  // 刷新暫停背包 UI
  openPauseBag();

  if (item.healFull) {
    showHint('🚑 使用急救包，生命補滿！', 200);
  } else {
    showHint('🩹 使用繃帶，回復 0.5 顆心！', 200);
  }
}

function renderHomeShop() {
  const body = document.getElementById('home-shop-body');
  if (!body) return;
  ensureInventoryItems();
  const coins = playerInventory.coins || 0;

  let html = '<div class="home-shop-desc" style="color:#ffe080;margin-bottom:10px">出發前可以 Shopping！看看有什麼好買的吧！</div>';
  html += '<div class="home-shop-grid" style="display:flex;flex-direction:column;gap:12px">';

  Object.values(SHOP_ITEMS).forEach(item => {
    const have     = (playerInventory.items || {})[item.id] || 0;
    const canBuy   = coins >= item.priceCoins && have < item.maxCarry;
    const btnCls   = canBuy ? 'home-btn home-btn--blue' : 'home-btn home-btn--blue home-btn--disabled';
    const btnDisbl = canBuy ? '' : 'disabled';
    html += '<div class="home-shop-card" data-shop-id="' + item.id + '" style="background:rgba(255,255,255,0.06);border-radius:10px;padding:10px 12px">';
    html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">';
    html += '<span style="font-size:1.5em">' + item.icon + '</span>';
    html += '<span style="font-weight:bold;font-size:1.05em">' + item.name + '</span>';
    html += '<span style="margin-left:auto;color:#ffe080;font-size:0.95em">' + itemIconHtml('coin', '🪙') + ' ' + item.priceCoins + ' 金幣</span>';
    html += '</div>';
    html += '<div style="color:#aaa;font-size:0.88em;margin-bottom:6px">' + item.description + '</div>';
    html += '<div style="display:flex;align-items:center;justify-content:space-between">';
    html += '<span style="font-size:0.9em;color:#ccc;white-space:nowrap;flex-shrink:0">持有：<b>' + have + ' / ' + item.maxCarry + '</b></span>';
    html += '<button class="' + btnCls + '" ' + btnDisbl + ' style="padding:5px 14px;font-size:0.92em" '
          + 'onclick="buyShopItem(\'' + item.id + '\')">購買</button>';
    html += '</div>';
    html += '</div>';
  });

  html += '</div>';
  html += '<div style="margin-top:8px;color:#888;font-size:0.82em">目前金幣：' + itemIconHtml('coin', '🪙') + ' ' + coins + '</div>';
  body.innerHTML = html;
}

// v0.3.24：Shopping 提示 HTML helper（明顯外框，與下一步提示同視覺層級）
function buildResultShopHintHtml() {
  return '<div class="rp-guidebook-hint rp-shop-hint" id="rp-shop-hint">'
    + '<div class="rp-guidebook-hint__title">🛒 出發前可以 Shopping！</div>'
    + '<div class="rp-guidebook-hint__body">看看小V的家裡有什麼好買的吧！出發前準備一下，冒險會更安心。</div>'
    + '<button class="rp-next-step-btn" onclick="openHomeShopFromResult()">🛒 去 Shopping</button>'
    + '</div>';
}

// v0.3.29-fix-1：從結算頁 Shopping 進來時，把商店區塊搬到「目前背包摘要」正下方；
// 其他入口則把商店放回 #home-body 原本的位置（一般模式順序不變）
let homeShopOriginalPlace = null; // { parent, next }
function setHomeShopPriority(on) {
  const shop    = document.getElementById('home-shop-section');
  const summary = document.getElementById('home-inventory-summary');
  if (!shop || !summary || !summary.parentNode) return;
  if (!homeShopOriginalPlace) {
    homeShopOriginalPlace = { parent: shop.parentNode, next: shop.nextSibling };
  }
  if (on) {
    summary.parentNode.insertBefore(shop, summary.nextSibling);
  } else if (shop.parentNode !== homeShopOriginalPlace.parent) {
    homeShopOriginalPlace.parent.insertBefore(shop, homeShopOriginalPlace.next);
    shop.style.display = 'none'; // 一般模式：商店維持收合，由卡片展開
  }
}

// v0.3.29-fix-3：「目前背包摘要」與 result-shop 模式下搬到上方的商店區塊，
// 左右間距改由 style.css 控制（與 #home-next-stage-fixed 相同的 14px / 橫向精簡 10px）

function openHomeShopFromResult() {
  // v0.3.24-fix-1：用 'result-shop' 來源開啟，讓 homeGoBack() 能回到結算頁
  if (typeof openHomeScreen === 'function') openHomeScreen('result-shop');
  // 展開商店區塊（沿用 initHomeCards 的展開邏輯）
  setTimeout(() => {
    const shopSection = document.getElementById('home-shop-section');
    const shopCard    = document.getElementById('hcard-shop');
    if (!shopSection) return;
    // 收合所有區塊
    document.querySelectorAll('#home-body .home-section').forEach(s => { s.style.display = 'none'; });
    document.querySelectorAll('.hcard').forEach(c => c.classList.remove('hcard--open'));
    // 展開商店
    shopSection.style.display = 'block';
    if (shopCard) shopCard.classList.add('hcard--open');
    renderHomeShop();
    // v0.3.29-fix-1：商店已在背包摘要正下方，捲到最上方即可同時看到摘要與商店
    const scrollBody = document.getElementById('home-scroll-body');
    if (scrollBody) scrollBody.scrollTop = 0;
  }, 80);
}

// ── 帶氣球小狗出門（結算畫面按鈕）────────────
// v0.3.18-test-2-fix-1：判斷是否可帶狗出發（含第一章教學保底）
// 三個 UI 路徑（renderHomeDog / refreshResultDog / populateResultPanel）共用此函式
// v0.3.33-fix-2：小狗不存在 / 已消氣時，清掉殘留的「帶狗出發」安排
// nextBringDog 只能由 bringDogNextLevel() 成功後設為 true
function clearInvalidDogTripPlan(reason) {
  const dog = playerInventory.balloonDog || {};
  if (!dog.present || (dog.turnsLeft || 0) <= 0) {
    if (nextBringDog) console.log('[DogFlow] clear stale nextBringDog:', reason);
    nextBringDog = false;
  }
}

function canBringDogNextLevel() {
  const dog  = playerInventory.balloonDog || {};
  if (!dog.present || (dog.turnsLeft || 0) <= 0 || nextBringDog) return false;
  if ((playerInventory.balloon260 || 0) >= 1) return true;
  // 260 不足：若是第一章必要狗狗關，且保底尚未使用，仍允許點擊（bringDogNextLevel 會補發）
  const nextIdx = getNextLevelIndex(currentLevelIndex);
  const flags   = ensureChapter1Flags();
  return nextIdx === dogHammerStageIndex && !flags.forcedDogTripDone;
}

function bringDogNextLevel() {
  // v0.3.18-test-2-fix-1：按鈕 disabled 判斷已移至 canBringDogNextLevel()；此處處理實際扣資源與保底補發
  const dog = playerInventory.balloonDog || {};
  console.log('prepare bring dog:', {
    present: dog.present,
    turnsLeft: dog.turnsLeft,
    balloon260: playerInventory.balloon260,
    nextBringDog
  });
  if (!dog.present) { console.warn('no dog'); return; }
  // v0.3.54-fix-1：已經安排過 → 不再扣 260（之前小V的家「下一步」區塊的按鈕沒刷新，可以一直按、一直扣）
  if (nextBringDog) { showHint('✅ 已安排帶狗出發', 120); refreshDogTripUi(); return; }
  if ((dog.turnsLeft || 0) <= 0) { showHint('氣球小狗已消氣，無法帶出門', 160); return; }
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
  refreshDogTripUi(); // v0.3.54-fix-1：小V的家（含從結算頁進來的 Shopping）也立刻刷新
  try { onDogDepartArranged(); } catch (e) {} // v0.3.63：真的扣了 1 條 260 → 向下飄的「260 氣球 −1」→ 狗狗汪汪 RPG
}
// v0.3.54-fix-1：帶狗出發後，所有相關 UI 一起刷新（下一步區塊 / 出發按鈕 / 狗狗卡 / 背包數量）
function refreshDogTripUi() {
  const fns = ['renderHomeNextStage', 'renderHomeDog', 'renderHomeInventory', 'renderHomeInventorySummary', 'renderHomeSupply', 'renderHomeShop', 'refreshResultDog', 'refreshResultBag'];
  fns.forEach(n => { try { const f = (typeof window !== 'undefined' && window[n]) || (typeof globalThis !== 'undefined' && globalThis[n]); if (typeof f === 'function') f(); } catch (e) {} });
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
      else if (targetId === 'home-shop-section')  renderHomeShop();
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
  try { clearHealFxDom(); } catch (e) {} // v0.3.55
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
    if (homeEntryMode === 'result-shop') {
      // v0.3.24-fix-2：從結算頁 Shopping 來 → 清楚可點擊的次要導航按鈕（深紫色，非 disabled 感）
      backBtn.textContent = '← 回到結算畫面';
      backBtn.style.display = 'inline-block';
      backBtn.classList.remove('home-btn--dim');
      backBtn.classList.add('home-btn--purple', 'home-back-btn--result');
    } else if (homeEntryMode === 'clear') {
      backBtn.textContent = '← 返回結算畫面';
      backBtn.style.display = 'inline-block';
      backBtn.classList.remove('home-btn--purple', 'home-back-btn--result');
      backBtn.classList.add('home-btn--dim');
    } else if (homeEntryMode === 'failed') {
      backBtn.textContent = '← 返回失敗畫面';
      backBtn.style.display = 'inline-block';
      backBtn.classList.remove('home-btn--purple', 'home-back-btn--result');
      backBtn.classList.add('home-btn--dim');
    } else {
      backBtn.style.display = 'none';
      backBtn.classList.remove('home-btn--purple', 'home-back-btn--result');
      backBtn.classList.add('home-btn--dim');
    }
  }

  // v0.3.29-fix-1：只有 result-shop 模式把商店放在背包摘要下方，其他入口維持一般順序
  setHomeShopPriority(homeEntryMode === 'result-shop');

  // 渲染各區塊
  renderHomeInventory();
  renderHomeInventorySummary(); // v0.3.29：置頂背包摘要
  renderHomeSupply();
  renderHomeDog();
  renderHomeNextStage();
  renderHomeChallenge();
  renderHomeShop();     // v0.3.23
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
  try { clearHealFxDom(); } catch (e) {} // v0.3.55
  document.getElementById('home-screen').style.display = 'none';
}

// ── 目前背包 ────────────────────────────────
// ════════════════════════════════════════════════════════
//  v0.3.29：背包摘要（結算頁 + 小V的家共用）
//  ──────────────────────────────────────────────────────
//  三張卡：🪙 金幣 / 🎈 氣球材料 / 📦 其他物品
//  顯示的是 playerInventory 目前「總持有量」（不是本關獲得）。
//  其他物品預設最多顯示 3 項，超過時可展開 / 收合（inventoryOtherExpanded）。
//  樣式由 ensureInventorySummaryStyles() 注入（不需要修改 style.css）。
// ════════════════════════════════════════════════════════
const INVENTORY_OTHER_PREVIEW_COUNT = 3;
let inventoryOtherExpanded = false;

// 其他物品清單（非金幣、非氣球材料）；未來的弱點筆記 / 地圖碎片 / 特殊道具可加在這裡
function getInventoryOtherItems() {
  const ci    = playerInventory.craftedItems || {};
  const items = playerInventory.items || {};
  const list  = [];
  const swordQty = Math.max(ci.basicSword || 0, (equippedSword && equippedSword.id === 'basicSword') ? 1 : 0);
  if (swordQty > 0)                  list.push({ icon: '⚔️', label: '基礎氣球劍', count: swordQty });
  if ((ci.basicHammer || 0) > 0)     list.push({ icon: '🔨', label: '基礎氣球槌', count: ci.basicHammer });
  if ((ci.balloonLollipop || 0) > 0) list.push({ icon: '🍭', label: '氣球棒棒糖', count: ci.balloonLollipop });
  if ((items.bandage || 0) > 0)      list.push({ icon: '🩹', label: '繃帶',       count: items.bandage });
  if ((items.firstAidKit || 0) > 0)  list.push({ icon: '🚑', label: '急救包',     count: items.firstAidKit });
  // v0.3.32：重要物品（Boss 弱點筆記等），每個 id 一件
  Object.values(playerInventory.keyItems || {}).forEach(k => {
    if (k && k.id) list.push({ icon: keyItemDisplayEmoji(k), label: keyItemDisplayName(k), count: 1, readId: k.noteText ? k.id : null });
  });
  return list;
}

function ensureInventorySummaryStyles() {
  if (document.getElementById('inv-summary-styles')) return;
  const style = document.createElement('style');
  style.id = 'inv-summary-styles';
  style.textContent = `
    .inv-sum { margin: 8px 0 10px; }
    .inv-sum__title { font-weight: bold; font-size: 14px; color: #ffe9a8; margin: 0 0 6px 2px; }
    .inv-sum__grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
    .inv-sum__card { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.16);
      border-radius: 10px; padding: 7px 8px; min-width: 0; text-align: left; }
    .inv-sum__head { font-size: 12px; color: #ddd; margin-bottom: 4px; white-space: nowrap; }
    .inv-sum__big { font-size: 22px; font-weight: bold; color: #ffd84a; line-height: 1.1; }
    .inv-sum__line { font-size: 12px; color: #f2f2f2; line-height: 1.5; white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis; }
    .inv-sum__line b { color: #ff9fd0; }
    .inv-sum__line--read { cursor: pointer; color: #ffe9a8; text-decoration: underline dotted rgba(255,233,168,0.6); }
    .inv-sum__line--read:hover { color: #fff; }
    .inv-sum__empty { font-size: 12px; color: #999; }
    .inv-sum__toggle { margin-top: 4px; font-size: 11px; padding: 2px 8px; border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.1); color: #fff; cursor: pointer; }
    @media (max-width: 380px) { .inv-sum__big { font-size: 18px; } .inv-sum__line { font-size: 11px; } }
  `;
  document.head.appendChild(style);
}

// ════════════════════════════════════════════════
//  v0.3.34：置頂狀態列（血量 + 背包）
//  血量唯一來源：player.hp / player.maxHp（跨關 restart({keepHp:true}) 也是讀這個）
// ════════════════════════════════════════════════
// v0.3.57：所有畫面共用同一套愛心（SVG：滿心 / 半心 / 空心），和數字一定一致
//   之前用 ❤️ emoji + clip-path 切半，半心和下一顆心會疊在一起 → 1.5 → 2.5 看起來像只補了半顆
function getHeartKinds(hp, maxHp) {
  const out = [];
  for (let i = 0; i < maxHp; i++) out.push(hp >= i + 1 ? 'full' : (hp >= i + 0.5 ? 'half' : 'empty'));
  return out;
}
function buildHeartSvg(kind) {
  const path = 'M12 21s-7.5-4.6-9.8-9.2C0.6 8.4 2.4 4.5 6.1 4.1c2.2-.2 4 1 5.9 3.1 1.9-2.1 3.7-3.3 5.9-3.1 3.7.4 5.5 4.3 3.9 7.7C19.5 16.4 12 21 12 21z';
  const empty = '<path d="' + path + '" fill="rgba(255,255,255,0.10)" stroke="#ff8fb0" stroke-width="1.6"/>';
  if (kind === 'full') return '<svg class="hv-heart hv-heart--full" viewBox="0 0 24 24" aria-hidden="true"><path d="' + path + '" fill="#ff3d6e" stroke="#ffd0dc" stroke-width="1.2"/></svg>';
  if (kind === 'half') return '<svg class="hv-heart hv-heart--half" viewBox="0 0 24 24" aria-hidden="true">' + empty
    + '<path d="' + path + '" fill="#ff3d6e" clip-path="inset(0 50% 0 0)" style="clip-path:inset(0 50% 0 0)"/></svg>';
  return '<svg class="hv-heart hv-heart--empty" viewBox="0 0 24 24" aria-hidden="true">' + empty + '</svg>';
}
function buildHpHeartsHtml() {
  const maxHp = player.maxHp || CONFIG.PLAYER_MAX_HP || 3;
  const hp    = Math.max(0, Math.min(maxHp, Number(player.hp) || 0));
  return '<span class="hv-hearts" data-hp="' + hp + '">' + getHeartKinds(hp, maxHp).map(buildHeartSvg).join('') + '</span>';
}
// v0.3.57：所有 DOM 上的生命顯示一起刷新（結算補給列 / 小V的家補給 / 暫停背包 / 置頂卡 / 背包大卡片）
function refreshAllHpDisplays() {
  if (typeof document === 'undefined') return;
  try {
    const row = document.getElementById('rp-supply-hp-row');
    if (row) row.outerHTML = buildResultSupplyHpRowHtml();
    const hs = document.getElementById('home-supply-hp');
    if (hs) hs.innerHTML = buildHpHeartsHtml() + ' <b>' + formatHpText() + '</b>';
    const pb = document.getElementById('pause-bag-hp');
    if (pb) pb.innerHTML = buildHpHeartsHtml() + '<b>' + formatHpText() + '</b>';
    if (typeof refreshInventorySummary === 'function') refreshInventorySummary();
    if (typeof refreshResultHpStatus === 'function') { const el = document.getElementById('rp-hp-status'); if (el) el.outerHTML = buildResultHpHtml(); }
  } catch (e) {}
}
function formatHpText() {
  const maxHp = player.maxHp || CONFIG.PLAYER_MAX_HP || 3;
  return (Number(player.hp) || 0) + ' / ' + maxHp;
}
function buildStickyStatusBarHtml() {
  const others = getInventoryOtherItems();
  const low    = (Number(player.hp) || 0) <= 1;
  // v0.3.57：置頂時也用「大卡片」風格（標題列 + 生命 + 3 張數字卡），不再縮成一排小 emoji
  return '<div class="sticky-status__bar sticky-card">'
    + '<div class="sticky-card__top"><span class="sticky-card__title">🎒 目前背包</span>'
    +   '<span class="sticky-card__hp' + (low ? ' sticky-card__hp--low' : '') + '">' + buildHpHeartsHtml() + '<b>' + formatHpText() + '</b></span></div>'
    + '<div class="sticky-card__grid">'
    +   '<div class="sticky-card__cell"><span class="sticky-card__lbl">' + itemIconHtml('coin', '🪙') + ' 金幣</span><b>' + Number(playerInventory.coins || 0) + '</b></div>'
    +   '<div class="sticky-card__cell"><span class="sticky-card__lbl">' + itemIconHtml('b260', '🎈') + ' 260</span><b>×' + Number(playerInventory.balloon260 || 0) + '</b></div>'
    +   '<div class="sticky-card__cell"><span class="sticky-card__lbl">' + itemIconHtml('round', '⚪') + ' 圓氣球</span><b>×' + Number(playerInventory.roundBalloon || 0) + '</b></div>'
    +   '<div class="sticky-card__cell"><span class="sticky-card__lbl">📦 其他</span><b>' + others.length + '</b></div>'
    + '</div></div>';
}
function buildStickyStatusBarHtml_legacy() {
  const others = getInventoryOtherItems();
  const low    = (Number(player.hp) || 0) <= 1;
  return '<div class="sticky-status__bar">'
    + '<span class="ss-item ss-hp' + (low ? ' ss-hp--low' : '') + '">' + buildHpHeartsHtml()
    +   '<b>' + formatHpText() + '</b></span>'
    + '<span class="ss-item">' + itemIconHtml('coin', '🪙') + ' <b>' + Number(playerInventory.coins || 0) + '</b></span>'
    + '<span class="ss-item">' + itemIconHtml('b260', '🎈') + '<span class="ss-lbl"> 260</span> <b>×' + Number(playerInventory.balloon260 || 0) + '</b></span>'
    + '<span class="ss-item">' + itemIconHtml('round', '⚪') + ' <b>×' + Number(playerInventory.roundBalloon || 0) + '</b></span>'
    + '<span class="ss-item">📦 <b>' + others.length + '</b><span class="ss-lbl"> 項</span></span>'
    + '</div>';
}
function ensureHomeStickyStatusEl() {
  let el = document.getElementById('home-sticky-status');
  if (el) return el;
  const summary = document.getElementById('home-inventory-summary');
  if (!summary || !summary.parentNode || typeof document.createElement !== 'function') return null;
  el = document.createElement('div');
  el.id = 'home-sticky-status';
  el.className = 'sticky-status';
  summary.parentNode.insertBefore(el, summary);
  return el;
}
// 狀態列在「完整背包摘要」捲出畫面後才浮現（不佔版面、不會讓內容跳動）
function updateStickyStatusVisibility() {
  [['result-panel-body', 'rp-sticky-status',   'rp-inventory-summary'],
   ['home-scroll-body',  'home-sticky-status', 'home-inventory-summary']].forEach(([cId, bId, sId]) => {
    try {
      const ce = document.getElementById(cId);
      const be = document.getElementById(bId);
      const se = document.getElementById(sId);
      if (!ce || !be || !se || !be.classList) return;
      if (!ce._stickyStatusBound && typeof ce.addEventListener === 'function') {
        ce.addEventListener('scroll', updateStickyStatusVisibility, { passive: true });
        ce._stickyStatusBound = true;
      }
      let show = false;
      if ((ce.scrollTop || 0) > 0 && ce.clientHeight > 0 && typeof se.getBoundingClientRect === 'function') {
        // 摘要的標題列（含血量）一捲出畫面就顯示狀態列
        show = se.getBoundingClientRect().top < ce.getBoundingClientRect().top - 4;
      }
      be.classList.toggle('sticky-status--show', show);
    } catch (e) {}
  });
}
function refreshStickyStatus() {
  const rp = document.getElementById('rp-sticky-status');
  if (rp) rp.innerHTML = buildStickyStatusBarHtml();
  const hm = ensureHomeStickyStatusEl();
  if (hm) hm.innerHTML = buildStickyStatusBarHtml();
  updateStickyStatusVisibility();
}

// ════════════════════════════════════════════════
//  v0.3.34：非冒險中使用補給（結算頁 / 小V的家）
//  規則沿用 SHOP_ITEMS：繃帶 +0.5、急救包補滿；滿血不消耗
// ════════════════════════════════════════════════
function buildHealingItemRowsHtml(ctx) {
  ensureInventoryItems();
  const maxHp  = player.maxHp || CONFIG.PLAYER_MAX_HP || 3;
  const isFull = player.hp >= maxHp;
  return ['bandage', 'firstAidKit'].map(id => {
    const it      = SHOP_ITEMS[id];
    const have    = playerInventory.items[id] || 0;
    const disable = have <= 0 || isFull;
    const label   = have <= 0 ? (id === 'bandage' ? '沒有繃帶' : '沒有急救包')
                  : isFull    ? '生命已滿'
                  : '使用';
    const effect  = it.healFull ? '補滿生命' : '+' + it.healAmount + ' ❤️';
    const btnId   = 'btn-' + ctx + '-use-' + id;
    if (ctx === 'home') {
      return '<div class="home-supply-item heal-item-row">'
        + '<div><span class="home-row-label">' + it.icon + ' ' + it.name + ' ×' + have + '</span>'
        + '<span style="color:#888;font-size:11px;margin-left:6px">' + effect + '</span></div>'
        + '<button id="' + btnId + '" class="home-btn ' + (disable ? 'home-btn--dim' : 'home-btn--red') + '" '
        + (disable ? 'disabled' : '') + ' onclick="useHealingItemOutOfAdventure(\'' + id + '\')">'
        + label + '</button></div>';
    }
    return '<div class="rp-supply-bandage-row heal-item-row"><div class="rp-supply-bandage-info">'
      + '<span class="rp-supply-name">' + it.icon + ' ' + it.name + ' ×' + have + '</span>'
      + '<span class="rp-supply-price">' + effect + '</span></div>'
      + '<button id="' + btnId + '" class="rp-supply-btn rp-supply-btn--' + (disable ? 'disabled' : 'active') + '" '
      + (disable ? 'disabled' : '') + ' onclick="useHealingItemOutOfAdventure(\'' + id + '\')">'
      + label + '</button></div>';
  }).join('') + buildLollipopRowHtml(ctx); // v0.3.56：氣球棒棒糖
}

// ── v0.3.56：氣球棒棒糖（氣球秘笈製作的物品；數量沿用 playerInventory.craftedItems.balloonLollipop）──
const LOLLIPOP_HEAL = 0.5;
function getLollipopCount() { return (playerInventory.craftedItems && playerInventory.craftedItems.balloonLollipop) || 0; }
// 成功才扣 1 個、HP 才增加；回傳實際恢復量（0 = 沒用掉）
function useBalloonLollipopCore() {
  const have = getLollipopCount();
  if (have <= 0) { showHint('沒有氣球棒棒糖，可以到氣球秘笈製作！', 160); return 0; }
  const maxHp = player.maxHp || CONFIG.PLAYER_MAX_HP || 3;
  if (player.hp >= maxHp) { showHint('生命已經滿了！', 140); return 0; } // 不消耗
  const before = player.hp;
  player.hp = Math.min(maxHp, player.hp + LOLLIPOP_HEAL);
  playerInventory.craftedItems.balloonLollipop = have - 1;
  // v0.3.58：冒險中（暫停背包）吃掉的舊庫存，返回整備 / 失敗回滾後也不會再冒出來（和繃帶、急救包同規則）
  if ((gameState === 'playing' || gameState === 'paused') && levelStartSnapshot && levelStartSnapshot.craftedItems) {
    levelStartSnapshot.craftedItems.balloonLollipop = Math.max(0, (levelStartSnapshot.craftedItems.balloonLollipop || 0) - 1);
  }
  saveInventory();
  showHint('🍭 吃了氣球棒棒糖，回復 ' + formatHealAmount(player.hp - before) + ' 顆心！', 200);
  return player.hp - before;
}
// 冒險中（暫停背包）
function useBalloonLollipop() {
  const gained = useBalloonLollipopCore();
  if (gained > 0) {
    openPauseBag(); // 刷新背包數量
    triggerAdventureHealFx(gained, false);
    try { playHealFeedbackDom(gained, false, document.getElementById('pause-bag-panel')); } catch (e) {}
  }
  return gained > 0;
}
// 結算頁 / 失敗畫面 / 小V的家
function useBalloonLollipopOutOfAdventure() {
  const gained = useBalloonLollipopCore();
  if (gained > 0) {
    syncOutOfAdventureHpToRetry(); // 失敗 / 時間到 → 重試時帶著補好的血量（不被舊快照倒回）
    refreshAfterOutOfAdventureHeal();
    try { playHealFeedbackDom(gained, false); } catch (e) {}
  } else {
    refreshAfterOutOfAdventureHeal();
  }
  return gained > 0;
}
function buildLollipopRowHtml(ctx) {
  const have = getLollipopCount();
  if (have <= 0) return ''; // v0.3.57：棒棒糖改成現做現吃，只剩舊版庫存才顯示（用完自然消失）
  const maxHp = player.maxHp || CONFIG.PLAYER_MAX_HP || 3;
  const isFull = player.hp >= maxHp;
  const disable = have <= 0 || isFull;
  const label = have <= 0 ? '沒有棒棒糖' : isFull ? '生命已滿' : '使用';
  if (ctx === 'home') {
    return '<div class="home-supply-item heal-item-row">'
      + '<div><span class="home-row-label">🍭 氣球棒棒糖（舊庫存）×' + have + '</span>'
      + '<span style="color:#888;font-size:11px;margin-left:6px">+' + LOLLIPOP_HEAL + ' ❤️</span></div>'
      + '<button id="btn-home-use-lollipop" class="home-btn ' + (disable ? 'home-btn--dim' : 'home-btn--red') + '" '
      + (disable ? 'disabled' : '') + ' onclick="useBalloonLollipopOutOfAdventure()">' + label + '</button></div>';
  }
  return '<div class="rp-supply-bandage-row heal-item-row"><div class="rp-supply-bandage-info">'
    + '<span class="rp-supply-name">🍭 氣球棒棒糖（舊庫存）×' + have + '</span>'
    + '<span class="rp-supply-price">+' + LOLLIPOP_HEAL + ' ❤️</span></div>'
    + '<button id="btn-result-use-lollipop" class="rp-supply-btn rp-supply-btn--' + (disable ? 'disabled' : 'active') + '" '
    + (disable ? 'disabled' : '') + ' onclick="useBalloonLollipopOutOfAdventure()">' + label + '</button></div>';
}
function buildResultSupplyHpRowHtml() {
  return '<div class="rp-supply-hp-row" id="rp-supply-hp-row">' + buildHpHeartsHtml()
    + '<span class="rp-supply-hp-num" id="supply-hp">' + formatHpText() + '</span></div>';
}

// 結算頁 / 小V的家使用繃帶、急救包（冒險中仍走暫停背包 useHealingItem）
function useHealingItemOutOfAdventure(itemId) {
  const _hpBefore = player.hp; // v0.3.55：真的補到血（HP 增加）才播愛心 / 震動
  const ok = useHealingItemOutOfAdventureCore(itemId);
  const gained = player.hp - _hpBefore;
  if (ok && gained > 0) { try { playHealFeedbackDom(gained, !!(SHOP_ITEMS[itemId] && SHOP_ITEMS[itemId].healFull)); } catch (e) {} }
  return ok;
}
function useHealingItemOutOfAdventureCore(itemId) {
  const item = SHOP_ITEMS[itemId];
  if (!item) return false;
  ensureInventoryItems();
  const have = playerInventory.items[itemId] || 0;
  if (have <= 0) {
    showHint(itemId === 'bandage' ? '沒有繃帶，可以到商店購買！' : '沒有急救包，可以到商店購買！', 160);
    refreshAfterOutOfAdventureHeal();
    return false;
  }
  const maxHp = player.maxHp || CONFIG.PLAYER_MAX_HP || 3;
  if (player.hp >= maxHp) {
    showHint('生命已經滿了！', 140); // 不消耗道具
    refreshAfterOutOfAdventureHeal();
    return false;
  }
  if (item.healFull) player.hp = maxHp;
  else if (item.healAmount) player.hp = Math.min(maxHp, player.hp + item.healAmount);
  playerInventory.items[itemId] = have - 1;
  saveInventory();
  syncOutOfAdventureHpToRetry();
  refreshAfterOutOfAdventureHeal();
  showHint(item.healFull ? '🚑 使用急救包，生命補滿！' : '🩹 使用繃帶，回復 0.5 顆心！', 200);
  return true;
}

// 失敗 / 時間到畫面補血後，重試本關要帶著補好的血量（道具已消耗，不可被快照倒回）
function syncOutOfAdventureHpToRetry() {
  if (gameState !== 'failed' && gameState !== 'gameover') return;
  if (levelStartSnapshot) levelStartSnapshot.hp = player.hp;
  levelStartHp = player.hp;
  if (gameState === 'failed' && typeof updateFailedPanelInfo === 'function') {
    try { updateFailedPanelInfo(); } catch (e) {}
  }
}

function refreshAfterOutOfAdventureHeal() {
  refreshAllHpDisplays(); // v0.3.57
  // 結算頁
  const rpHeal = document.getElementById('rp-heal-items');
  if (rpHeal) rpHeal.innerHTML = buildHealingItemRowsHtml('result');
  const rpHpRow = document.getElementById('rp-supply-hp-row');
  if (rpHpRow) rpHpRow.outerHTML = buildResultSupplyHpRowHtml();
  if (typeof updateBandageBtn === 'function') updateBandageBtn();
  if (typeof refreshResultBag === 'function') { try { refreshResultBag(); } catch (e) {} }
  if (typeof refreshResultHpStatus === 'function') refreshResultHpStatus();
  // 小V的家
  if (typeof renderHomeSupply === 'function')    renderHomeSupply();
  if (typeof renderHomeInventory === 'function') renderHomeInventory();
  if (typeof renderHomeShop === 'function' && document.getElementById('home-shop-body')) renderHomeShop();
  // 置頂狀態列 + 背包摘要（兩處）
  refreshInventorySummary();
}

function buildInventorySummaryHtml(options = {}) {
  ensureInventorySummaryStyles();
  const title  = options.title || '🎒 目前背包';
  const coins  = Number(playerInventory.coins || 0);
  const b260   = Number(playerInventory.balloon260 || 0);
  const round  = Number(playerInventory.roundBalloon || 0);
  const others = getInventoryOtherItems();
  const shown  = inventoryOtherExpanded ? others : others.slice(0, INVENTORY_OTHER_PREVIEW_COUNT);

  let otherInner;
  if (others.length === 0) {
    otherInner = '<div class="inv-sum__empty">目前沒有其他物品</div>';
  } else {
    otherInner = shown.map(o => o.readId
      // v0.3.33-fix-1：可閱讀的重要物品 → 點一下打開閱讀視窗
      ? '<div class="inv-sum__line inv-sum__line--read" title="閱讀" onclick="openKeyItemReadModal(\'' + o.readId + '\')">'
        + o.icon + ' ' + o.label + ' <b>📖</b></div>'
      : '<div class="inv-sum__line">' + o.icon + ' ' + o.label + ' <b>×' + o.count + '</b></div>'
    ).join('');
    if (others.length > INVENTORY_OTHER_PREVIEW_COUNT) {
      otherInner += '<button class="inv-sum__toggle" onclick="toggleInventoryOtherExpanded(event)">'
        + (inventoryOtherExpanded ? '收合 ▲' : '展開（共 ' + others.length + ' 項）▼') + '</button>';
    }
  }

  // v0.3.34：showHp → 標題列右側顯示目前血量
  const titleHtml = options.showHp
    ? '<div class="inv-sum__titlerow"><div class="inv-sum__title">' + title + '</div>'
      + '<div class="inv-sum__hp">' + buildHpHeartsHtml() + '<b>' + formatHpText() + '</b></div></div>'
    : '<div class="inv-sum__title">' + title + '</div>';
  return '<div class="inv-sum">'
    + titleHtml
    + '<div class="inv-sum__grid">'
    +   '<div class="inv-sum__card"><div class="inv-sum__head">' + itemIconHtml('coin', '🪙') + ' 金幣</div>'
    +     '<div class="inv-sum__big">' + coins + '</div></div>'
    +   '<div class="inv-sum__card"><div class="inv-sum__head">🎈 氣球材料</div>'
    +     '<div class="inv-sum__line">' + itemIconHtml('b260', '') + ' 260 <b>×' + b260 + '</b></div>'
    +     '<div class="inv-sum__line">' + itemIconHtml('round', '') + ' 圓氣球 <b>×' + round + '</b></div></div>'
    +   '<div class="inv-sum__card"><div class="inv-sum__head">📦 其他物品</div>' + otherInner + '</div>'
    + '</div></div>';
}

// v0.3.57：小V的家「背包」功能卡和最上方的背包大卡片重複 → 隱藏功能卡，改在大卡片下方放「查看完整背包」
function openHomeFullInventory() {
  const card = document.getElementById('hcard-inv');
  if (card) card.click();
  const sec = document.getElementById('home-inventory-section');
  if (sec && sec.scrollIntoView) setTimeout(() => { try { sec.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) {} }, 50);
}
if (typeof window !== 'undefined') window.openHomeFullInventory = openHomeFullInventory;
// 小V的家最上方的背包摘要
function renderHomeInventorySummary() {
  const el = document.getElementById('home-inventory-summary');
  if (!el) return;
  try { const c = document.getElementById('hcard-inv'); if (c) c.style.display = 'none'; } catch (e) {}
  el.innerHTML = buildInventorySummaryHtml({ showHp: true }) // v0.3.34：含血量
    + '<button class="inv-sum__more" onclick="openHomeFullInventory()">查看完整背包 ▸</button>';
}

// 結算頁置頂的背包摘要（populateResultPanel 會先建立容器）
function renderResultInventorySummary() {
  const el = document.getElementById('rp-inventory-summary');
  if (!el) return;
  el.innerHTML = buildInventorySummaryHtml({ showHp: true }); // v0.3.34：含血量
}

// 兩處摘要一起刷新（有容器才會畫）；v0.3.34：置頂狀態列一起刷新
function refreshInventorySummary() {
  try { renderHomeInventorySummary(); } catch (e) {}
  try { renderResultInventorySummary(); } catch (e) {}
  try { refreshStickyStatus(); } catch (e) {}
}

function toggleInventoryOtherExpanded(ev) {
  if (ev && ev.stopPropagation) ev.stopPropagation();
  inventoryOtherExpanded = !inventoryOtherExpanded;
  refreshInventorySummary();
}

function renderHomeInventory() {
  const el = document.getElementById('home-inventory-body');
  if (!el) return;
  const ci = playerInventory.craftedItems || {};
  const eqSword  = (equippedSword.id && equippedSword.currentDur) ? equippedSword.currentDur + '/' + equippedSword.maxDur : null;
  const eqHammer = (equippedHammer.id && equippedHammer.currentDur) ? equippedHammer.currentDur + '/' + equippedHammer.maxDur : null;
  const items = [
    { e:itemIconHtml('coin', '🪙'),  v: playerInventory.coins,       lbl:'金幣',    cls:'inv-coin',   dur:null },
    { e:itemIconHtml('b260', '🎈'),  v: playerInventory.balloon260,  lbl:'260 氣球',cls:'inv-balloon',dur:null },
    { e:itemIconHtml('round', '⚪'), v: playerInventory.roundBalloon,lbl:'圓氣球',  cls:'inv-round',  dur:null },
    { e:'⚔️', v: ci.basicSword     ||0,        lbl:'氣球劍',  cls:'inv-sword',  dur:eqSword },
    { e:'🔨', v: ci.basicHammer    ||0,        lbl:'氣球槌',  cls:'inv-hammer', dur:eqHammer },
    { e:'🍭', v: ci.balloonLollipop||0,        lbl:'棒棒糖',  cls:'inv-candy',  dur:null },
    // v0.3.32：重要物品（Boss 弱點筆記等）；v0.3.33-fix-1：可點擊閱讀
    ...Object.values(playerInventory.keyItems || {}).filter(k => k && k.id).map(k =>
      ({ e: keyItemDisplayEmoji(k), v: 1, lbl: keyItemDisplayName(k), cls: 'inv-key', dur: null, readId: k.noteText ? k.id : null })),
  ].filter(i => i.v > 0);
  if (!items.length) { el.innerHTML = '<div class="inv-empty">背包空空如也 🎈</div>'; refreshInventorySummary(); return; }
  el.innerHTML = '<div class="inv-grid">'
    + items.map(i =>
        '<div class="inv-item ' + i.cls + '"'
        + (i.readId ? ' style="cursor:pointer" onclick="openKeyItemReadModal(\'' + i.readId + '\')"' : '') + '>'
        + '<div class="inv-item__icon">' + i.e + '</div>'
        + '<div class="inv-item__count">' + i.v + '</div>'
        + '<div class="inv-item__name">' + i.lbl + '</div>'
        + (i.dur ? '<div class="inv-item__dur">' + i.dur + '</div>' : '')
        + (i.readId ? '<div class="inv-item__dur" style="color:#ffe066">📖 閱讀筆記</div>' : '')
        + '</div>'
      ).join('')
    + '</div>';
  refreshInventorySummary(); // v0.3.29：完整背包更新時，置頂摘要也一起更新
}

// ── 補給與生命 ──────────────────────────────
function renderHomeSupply() {
  const el = document.getElementById('home-supply-body');
  if (!el) return;

  const bandageBtnText = player.hp >= player.maxHp  ? '生命已滿'
    : (playerInventory.coins || 0) < CONFIG.HEART_PATCH_COST ? '金幣不足'
    : '購買並使用 -' + CONFIG.HEART_PATCH_COST + ' 🪙';
  const bandageDisabled = (player.hp >= player.maxHp
    || (playerInventory.coins || 0) < CONFIG.HEART_PATCH_COST);

  el.innerHTML =
    '<div class="home-row"><span class="home-row-label">目前生命</span>'
    + '<span class="home-row-val result-red hv-hp-inline" id="home-supply-hp">' + buildHpHeartsHtml() + ' <b>' + formatHpText() + '</b></span></div>'
    + '<div class="home-supply-item">'
    + '<div><span class="home-row-label">🩹 愛心貼布</span>'
    + '<span style="color:#888;font-size:11px;margin-left:6px">20 ' + itemIconHtml('coin', '🪙') + ' +1 ❤️</span></div>'
    + '<button id="btn-home-bandage" class="home-btn '
    + (bandageDisabled ? 'home-btn--dim' : 'home-btn--red') + '" '
    + (bandageDisabled ? 'disabled' : '') + ' onclick="homeUseBandage()">'
    + bandageBtnText + '</button></div>'
    + '<div id="home-heal-items">' + buildHealingItemRowsHtml('home') + '</div>' // v0.3.34
    + '<div id="home-bandage-msg" class="home-msg"></div>';
}

function homeUseBandage() {
  if (typeof buyBandageCore === 'function') {
    const _hpBefore = player.hp;
    buyBandageCore(); // 共用現有邏輯
    renderHomeSupply();     // 更新補給區
    renderHomeInventory();  // 更新背包金幣
    const gained = player.hp - _hpBefore; // v0.3.55：重畫之後再播（愛心 / 回彈作用在新的元素上）
    if (gained > 0) { try { playHealFeedbackDom(gained, false, document.getElementById('home-supply-body')); } catch (e) {} }
  }
}

// ── 氣球小狗 ────────────────────────────────
function renderHomeDog() {
  clearInvalidDogTripPlan('renderHomeDog'); // v0.3.33-fix-2
  const el = document.getElementById('home-dog-body');
  if (!el) return;
  const dog             = playerInventory.balloonDog || {};
  const hasDog          = dog.present;
  const turns           = dog.turnsLeft || 0;
  const nextLvIdx       = getNextLevelIndex(currentLevelIndex);
  const nextHasTreasure = nextLvIdx < LEVELS.length && isHiddenTreasureAvailable(LEVELS[nextLvIdx]?.hiddenTreasure); // v0.3.33
  const canBringDog     = canBringDogNextLevel(); // v0.3.18-fix-1：含教學保底

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
    const canBring = canBringDogNextLevel(); // v0.3.18-fix-1
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
  const _hpBeforeCraft = player.hp;
  const ok = craftItem('balloonDog');
  if (ok) {
    // v0.3.56：製作成功演出（+ 原本就有的製作療癒，HP 真的增加才播愛心）
    setTimeout(() => {
      try {
        const anchor = document.getElementById('home-dog-body');
        playCraftSuccessFx(anchor, RECIPES.find(r => r.id === 'balloonDog'));
        const healed = player.hp - _hpBeforeCraft;
        if (healed > 0) playHealFeedbackDom(healed, false, anchor);
      } catch (er) {}
    }, 0);
    showCraftMessage('🐶 氣球小狗入住小V的家，療癒了小V ❤️ +0.5');
    renderHomeDog();
    renderHomeInventory();
    renderHomeSupply();
    // v0.3.18-fix-3：製作小狗後刷新下一步區塊，從「製作小狗」變成「帶狗出發」
    renderHomeNextStage();
    refreshResultDog();
    refreshResultBag();
    if (typeof updateNextLevelButton === 'function') updateNextLevelButton();
    if (typeof populateResultPanel === 'function' && document.getElementById('result-panel-body')) {
      populateResultPanel();
    }
    refreshAllHpDisplays(); // v0.3.57
    if (typeof refreshResultHpStatus === 'function') refreshResultHpStatus();
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
    renderHomeNextStage();  // v0.3.54-fix-1：「請先帶狗出發」→ 立刻變成「前往第 2 節」
  }
}

// ── 下一關資訊 ──────────────────────────────
function renderHomeNextStage() {
  clearInvalidDogTripPlan('renderHomeNextStage'); // v0.3.33-fix-2
  const el  = document.getElementById('home-next-stage-body');
  const btn = document.getElementById('btn-home-next-level');
  if (!el) return;

  if (homeEntryMode === 'failed' || gameState === 'failed' || gameState === 'gameover') { // v0.3.58：時間到 / 失敗不論從哪個入口進來都不能前往下一關
    const lv = LEVELS[currentLevelIndex];
    // v0.3.11-test-2：不顯示工程用 stageId，改用章節標題（橘子果園等非第一章流程關卡仍 fallback 原名稱）
    el.innerHTML =
      '<div class="hns-badge hns-badge--warn">本關尚未完成</div>'
      + '<div class="hns-name">' + getChapterDisplayTitle(currentLevelIndex) + '</div>'
      + '<div class="hns-hint">擊退所有挑戰，帶著收穫回家吧！</div>';
    if (btn) { btn.textContent = (typeof hasValidPrepCheckpoint === 'function' && hasValidPrepCheckpoint()) ? '↩ 返回整備' : '↺ 重試本關'; btn.disabled = false; btn.className = btn.className.replace('home-btn--green','home-btn--red'); }
    return;
  }

  const nextIdx = getNextLevelIndex(currentLevelIndex);
  if (nextIdx >= LEVELS.length) {
    // v0.3.35：2-4 橘子王擊敗 = 第二章完成
    if (getChapter2FlowStep(currentLevelIndex) === CHAPTER2_FLOW_STAGE_IDS.length - 1) {
      el.innerHTML = '<div class="hns-badge hns-badge--clear">🏆 第二章完成！</div>'
        + '<div class="hns-hint">👑 橘子王被打敗了！可以重玩 Boss 戰或整理背包。</div>';
      if (btn) { btn.textContent = '🔄 再玩一次'; btn.className = btn.className.replace('home-btn--red','home-btn--green'); }
      return;
    }
    el.innerHTML = '<div class="hns-badge hns-badge--clear">🎉 全部關卡完成！</div><div class="hns-hint">可以重玩或等待更多冒險！</div>';
    if (btn) { btn.textContent = '🔄 再玩一次'; btn.className = btn.className.replace('home-btn--red','home-btn--green'); }
    return;
  }
  const lv = LEVELS[nextIdx];
  const hasSecret = lv.hiddenTreasure && playerInventory.balloonDog?.present;

  // v0.3.35-fix-1：下一關是 2-4 Boss 關但沒有武器 → 鎖住「出發冒險」，引導去氣球秘笈
  if (isBossWeaponGateBlocked(nextIdx)) {
    el.innerHTML =
      '<div class="hns-badge hns-badge--warn">⚔️ Boss 戰前準備</div>'
      + '<div class="hns-name">' + getChapterDisplayInfo(nextIdx).title + '</div>'
      + '<div class="hns-hint" style="margin-top:8px">橘子王太危險了！</div>'
      + '<div class="hns-hint">請先製作一把氣球劍，再前往 2-4（2-4 只能使用氣球劍）。</div>'
      + '<button class="rp-next-step-btn" style="margin-top:10px" onclick="openGuidebook()">📖 打開氣球秘笈製作武器</button>';
    if (btn) { btn.textContent = '請先製作武器'; btn.disabled = true; btn.className = btn.className.replace('home-btn--green','home-btn--red'); }
    return;
  }
  if (btn) btn.disabled = false; // v0.3.35-fix-1：離開阻擋狀態時恢復可按

  // v0.3.18-fix-3：下一關是狗狗尋寶關時，依狗狗狀態顯示正確引導
  if (nextIdx === dogHammerStageIndex) {
    const dog    = playerInventory.balloonDog || {};
    const hasDog = dog.present && (dog.turnsLeft || 0) > 0;
    if (!hasDog) {
      el.innerHTML =
        '<div class="hns-badge hns-badge--warn">🐶 需要氣球小狗</div>'
        + '<div class="hns-hint" style="margin-top:8px">第 2 節有隱藏寶藏，需要氣球小狗幫忙尋找。</div>'
        + '<div class="hns-hint">請先到「氣球秘笈」裡製作一隻氣球小狗！</div>'
        + '<button class="rp-next-step-btn" style="margin-top:10px" onclick="openGuidebook()">'
        + '📖 打開氣球秘笈製作小狗</button>';
      if (btn) { btn.textContent = '請先製作氣球小狗'; btn.disabled = true; btn.className = btn.className.replace('home-btn--green','home-btn--red'); }
      return;
    }
    if (!nextBringDog) {
      el.innerHTML =
        '<div class="hns-badge hns-badge--clear">🐶 帶氣球小狗出發</div>'
        + '<div class="hns-hint" style="margin-top:8px">氣球小狗準備好了！帶牠出發，牠會幫你找到隱藏寶藏。</div>'
        + '<button class="rp-next-step-btn" style="margin-top:10px" onclick="homeBringDog()">'
        + '🐾 帶狗出發 -1 🎈</button>';
      if (btn) { btn.textContent = '請先帶狗出發'; btn.disabled = true; btn.className = btn.className.replace('home-btn--green','home-btn--red'); }
      return;
    }
    // 已安排帶狗：正常顯示下一關資訊
    el.innerHTML =
      '<div class="hns-badge hns-badge--clear">✅ 氣球小狗已安排出發</div>'
      + '<div class="hns-hint" style="margin-top:8px">準備好一起尋找隱藏寶藏了！</div>';
    if (btn) { btn.disabled = false; btn.textContent = '前往第 2 節 🚀'; btn.className = btn.className.replace('home-btn--red','home-btn--green'); }
    return;
  }

  // v0.3.11-test-3：改用 getChapterDisplayInfo，副標統一成「第 N 節｜...」，與結算畫面一致
  const nextDisplayInfo = getChapterDisplayInfo(nextIdx);
  // v0.3.31：下一關有隱藏寶物時，提示帶氣球小狗（不強制，只是建議）
  let secretHtml = '';
  if (isHiddenTreasureAvailable(lv.hiddenTreasure)) { // v0.3.33：已取得的重要物品不再提示
    const dog    = playerInventory.balloonDog || {};
    const hasDog = dog.present && (dog.turnsLeft || 0) > 0;
    if (!hasDog) {
      secretHtml = '<div class="hns-hint hns-hint--secret">🔮 這一關似乎藏著神秘寶物……需要氣球小狗才找得到！</div>';
    } else if (nextBringDog) {
      secretHtml = '<div class="hns-hint hns-hint--secret">🔮 這一關似乎藏著神秘寶物……</div>'
        + '<div class="hns-badge hns-badge--clear" style="margin-top:6px">✅ 氣球小狗已安排出發</div>';
    } else {
      const canBring = canBringDogNextLevel();
      secretHtml = '<div class="hns-hint hns-hint--secret">🔮 這一關似乎藏著神秘寶物……帶氣球小狗一起去找找！</div>'
        + '<button class="rp-next-step-btn" style="margin-top:8px" '
        + (canBring ? '' : 'disabled ')
        + 'onclick="homeBringDog(); renderHomeNextStage();">'
        + (canBring ? '🐾 帶狗出發 -1 🎈' : '🐾 帶狗出發（260 氣球不足）') + '</button>';
    }
  }
  // v0.3.56：下一關沒有隱藏寶物也能帶狗（自由選擇陪伴；寶物提示只是額外資訊）
  if (!secretHtml) {
    const dog    = playerInventory.balloonDog || {};
    const hasDog = dog.present && (dog.turnsLeft || 0) > 0;
    if (hasDog && nextBringDog) {
      secretHtml = '<div class="hns-badge hns-badge--clear" style="margin-top:6px">✅ 氣球小狗已安排出發</div>';
    } else if (hasDog) {
      const canBring = canBringDogNextLevel();
      secretHtml = '<div class="hns-hint" style="margin-top:6px">🐶 帶氣球小狗一起冒險</div>'
        + '<button class="rp-next-step-btn" style="margin-top:8px" ' + (canBring ? '' : 'disabled ')
        + 'onclick="homeBringDog(); renderHomeNextStage();">'
        + (canBring ? '🐾 帶狗出發 -1 🎈' : '🐾 帶狗出發（260 氣球不足）') + '</button>';
    }
  }
  el.innerHTML =
    '<div class="hns-stage-id">' + nextDisplayInfo.subtitle + '</div>'
    + '<div class="hns-name">' + nextDisplayInfo.title + '</div>'
    + secretHtml;
  if (btn) { btn.textContent = '🚀 出發冒險！'; btn.className = btn.className.replace('home-btn--red','home-btn--green'); }
}

// ── 本次挑戰 ────────────────────────────────
function renderHomeChallenge() {
  const el = document.getElementById('home-challenge-body');
  if (!el) return;
  const c = currentChallenge;
  const stats = [
    { e:'🗺️', v: c.stagesCleared,      lbl:'完成關卡' },
    { e:itemIconHtml('coin', '🪙'),  v: c.totalCoinsCollected,lbl:'金幣' },
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
  // v0.3.34：血量改顯示在置頂狀態列（sticky status），這裡只保留低血量警告
  void hearts;
  return '<div class="rp-hp-status" id="rp-hp-status"' + (warn ? '' : ' style="display:none"') + '>'
    + warn + '</div>';
}

function refreshResultHpStatus() {
  const el = document.getElementById('rp-hp-status');
  if (el) el.outerHTML = buildResultHpHtml();
  refreshInventorySummary(); // v0.3.34：置頂狀態列的血量一起刷新
}

// ══ v0.3.58：返回整備（回到上一節「過關後、出發前」的準備階段）══
// ・節點：上一節正常通關 → 按「下一關 / 出發冒險」時 armPrepCheckpoint()，下一關 restart() 時正式生效
// ・返回：本關暫時成果回滾到進關快照（＝離開整備那一刻的背包 / HP / 裝備，含整備時合法的購買、製作、帶狗）
//         再顯示上一節「原本的」結算內容；不重新執行 triggerClear() → 通關獎勵 / V幣 / 成就 / 隱藏寶物都不會再發
// ・沒有有效節點（1-1、測試入口、重新整理網頁後）→ 維持原本的「重試本關」
function armPrepCheckpoint(nextIdx) {
  try {
    if (gameState !== 'clear') { prepCheckpoint = null; return; }
    prepCheckpoint = {
      fromLevelIndex: currentLevelIndex,
      toLevelIndex:   nextIdx,
      runStats:       JSON.stringify(currentRunStats),
      elapsedSec:     elapsedSec,
      playerStats:    { coinsCollected: player.coinsCollected, balloonsCollected: player.balloonsCollected, enemiesDefeated: player.enemiesDefeated, x: player.x, y: player.y, facingRight: player.facingRight },
      cameraX:        cameraX,
      playerKey:      (getPlayerIdentityForResult() || {}).playerKey || null,
      armed:          true,
      active:         false,
    };
    console.log('[Prep] 建立返回整備節點', LEVELS[currentLevelIndex] && LEVELS[currentLevelIndex].stageId, '→', LEVELS[nextIdx] && LEVELS[nextIdx].stageId);
  } catch (e) { prepCheckpoint = null; }
}
function hasValidPrepCheckpoint() {
  const pc = prepCheckpoint;
  if (!pc || !pc.active || pc.armed) return false;
  if (pc.toLevelIndex !== currentLevelIndex) return false;
  if (!LEVELS[pc.fromLevelIndex] || getNextLevelIndex(pc.fromLevelIndex) !== pc.toLevelIndex) return false;
  try { if (pc.playerKey && (getPlayerIdentityForResult() || {}).playerKey !== pc.playerKey) return false; } catch (e) { return false; }
  return ['playing', 'paused', 'failed', 'gameover'].includes(gameState);
}
function updatePrepReturnButtons() {
  const ok = hasValidPrepCheckpoint();
  const a = document.getElementById('btn-pause-restart');
  if (a) a.textContent = ok ? '↩ 返回整備' : '↺ 重試本關';
  const b = document.getElementById('btn-retry');
  if (b) b.textContent = ok ? '↩ 返回整備' : '↺ 重試本關';
}
// 所有「重試本關」入口共用：有整備節點 → 返回整備；沒有 → 原本的重試本關
function retryOrReturnToPrep(source) {
  const now = Date.now(); // 手機 touchstart + click（同一個按鈕）只執行一次
  const last = retryOrReturnToPrep._last || (retryOrReturnToPrep._last = {});
  if (now - (last[source] || 0) < 400) return;
  last[source] = now;
  if (source === 'pause') { try { advEndLiveAttempt('manualRetry'); } catch (e) {} } // v0.3.64：關卡進行中從暫停選單主動重新挑戰 → 主動重試 +1（戰敗後的畫面不會走到這裡）
  if (hasValidPrepCheckpoint()) { returnToPrep(source); return; }
  if (gameState === 'paused') gameState = 'playing'; // 原本暫停選單的寫法：先設回 playing 讓 restart() 不被擋
  retryCurrentLevelFromStart();
}
function returnToPrep(source, opts) {
  try { advEndLiveAttempt('discard'); } catch (e) {} // v0.3.64：暫停選單來的已在 retryOrReturnToPrep 記為主動重試；死亡後返回不會重複計算
  if (!hasValidPrepCheckpoint()) { console.warn('[Prep] 沒有有效的整備節點，改用重試本關'); retryCurrentLevelFromStart(); return false; }
  const pc = prepCheckpoint;
  // 1. 本關暫時成果回滾到進關快照（失敗 / 時間到已回滾過 → 不重複，保留失敗畫面上的合法交易）
  if (!levelRolledBackForRetry) restoreLevelStartSnapshot();
  if (!(player.hp > 0)) player.hp = levelStartHp > 0 ? levelStartHp : player.maxHp;
  // 2. 出發前已付費的「帶狗同行」安排帶回整備（不重複扣 260，也不會退回）
  const dog = playerInventory.balloonDog || {};
  const paidDog = levelStartBringDog === true && !!dog.present && (dog.turnsLeft || 0) > 0;
  bringBalloonDog = false;
  nextBringDog = paidDog;
  // 3. 關掉關卡中的畫面
  try { if (typeof closePauseBag === 'function') closePauseBag(); } catch (e) {}
  try { guidebookFromPause = false; const g = document.getElementById('guidebook-overlay'); if (g) g.style.display = 'none'; } catch (e) {}
  ['pause-overlay', 'failed-overlay'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
  try { if (typeof stopOrangeKingVictoryJingle === 'function') stopOrangeKingVictoryJingle(); } catch (e) {}
  healFx = null; try { clearHealFxDom(); } catch (e) {}
  // 4. 回到上一節（只換回場景與結算資料，不重跑通關結算）
  currentLevelIndex = pc.fromLevelIndex;
  loadLevel(pc.fromLevelIndex); // 會清掉 2-4 橘子王
  try {
    const rs = JSON.parse(pc.runStats);
    Object.keys(currentRunStats).forEach(k => { if (!(k in rs)) delete currentRunStats[k]; });
    Object.assign(currentRunStats, rs);
  } catch (e) {}
  elapsedSec = pc.elapsedSec || 0;
  Object.assign(player, { coinsCollected: pc.playerStats.coinsCollected, balloonsCollected: pc.playerStats.balloonsCollected, enemiesDefeated: pc.playerStats.enemiesDefeated,
    x: pc.playerStats.x, y: pc.playerStats.y, facingRight: pc.playerStats.facingRight, vx: 0, vy: 0, invincible: 0 });
  cameraX = pc.cameraX || 0;
  dogArtModeLock = null; dogNoseLevel = 0;
  levelStartSnapshot = null;      // 和通關後一樣：快照在出發時重新建立
  levelRolledBackForRetry = false;
  prepCheckpoint = null;          // 再次出發時重新建立（同一個上一節）
  gameState = 'clear';
  saveInventory();
  populateResultPanel();
  // 結算畫面最上方提示：這是返回的整備，不是新的結算
  try {
    const body = document.getElementById('result-panel-body');
    if (body) {
      const note = document.createElement('div');
      note.className = 'rp-prep-return-note';
      note.innerHTML = '↩ 已返回 <b>' + getChapterDisplayTitle(pc.fromLevelIndex) + '</b> 過關後的整備<br><span>本節獎勵先前已領取，不會重複發放。準備好再出發吧！</span>';
      body.insertBefore(note, body.firstChild);
      body.scrollTop = 0;
    }
  } catch (e) {}
  updateNextLevelButton();
  showResultButtons();
  if (typeof window.hidePauseBtn === 'function') window.hidePauseBtn();
  console.log('[Prep] 返回整備', { from: LEVELS[pc.fromLevelIndex].stageId, to: LEVELS[pc.toLevelIndex].stageId, source, hp: player.hp, coins: playerInventory.coins, b260: playerInventory.balloon260, nextBringDog });
  if (opts && opts.toHome && typeof openHomeScreen === 'function') openHomeScreen('clear');
  return true;
}
if (typeof window !== 'undefined') { window.returnToPrep = returnToPrep; window.retryOrReturnToPrep = retryOrReturnToPrep; window.hasValidPrepCheckpoint = hasValidPrepCheckpoint; }

function retryCurrentLevelFromStart() {
  // 1. restore snapshot
  // v0.3.58：失敗 / 時間到時已經回滾過 → 不再二次還原（保留失敗畫面上合法的補血 / 購買 / 製作 / 消耗）
  if (!levelRolledBackForRetry && typeof restoreLevelStartSnapshot === 'function') restoreLevelStartSnapshot();
  else if (levelRolledBackForRetry && levelStartSnapshot) levelStartSnapshot.hp = player.hp > 0 ? player.hp : levelStartSnapshot.hp;

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
  const prevMode = homeEntryMode;
  closeHomeScreen();
  if (typeof window.showPauseBtn === 'function') window.showPauseBtn();
  if (prevMode === 'result-shop') {
    // v0.3.24-fix-1：從結算頁 Shopping 提示進來 → 回到結算頁，不開始下一關
    const resultEl = document.getElementById('result-overlay');
    if (resultEl) resultEl.style.display = 'flex';
    homeEntryMode = 'normal'; // 清除來源標記
  } else if (prevMode === 'clear') {
    const resultEl = document.getElementById('result-overlay');
    if (resultEl) resultEl.style.display = 'flex';
  } else if (prevMode === 'failed') {
    // v0.3.58：時間到（gameover）的結算畫面進來 → 回到結算畫面
    const backEl = document.getElementById(gameState === 'gameover' ? 'result-overlay' : 'failed-overlay');
    if (backEl) backEl.style.display = 'flex';
  }
}

function homeGoNextLevel() {
  try {
    // 失敗模式：只能重試本關，不能前往下一關
    if (homeEntryMode === 'failed' || gameState === 'failed' || gameState === 'gameover') {
      if (typeof hasValidPrepCheckpoint === 'function' && hasValidPrepCheckpoint()) { closeHomeScreen(); returnToPrep('home-failed', { toHome: true }); return; }
      closeHomeScreen();
      if (typeof window.showPauseBtn === 'function') window.showPauseBtn();
      retryOrReturnToPrep('home-failed'); // v0.3.58：與失敗畫面同一套判斷
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
    if (gameState !== 'clear') { console.warn('[Home] 不是通關狀態，不能前往下一關', gameState); return; } // v0.3.58：時間到 / 失敗時不能跳關
    bringBalloonDog = (nextBringDog === true);
    nextBringDog    = false;
    armPrepCheckpoint(nextIdx); // v0.3.58：建立「返回整備」節點
              // v0.3.63：帶狗出發 RPG 改在「帶狗出發」安排成功的當下播放（bringDogNextLevel），進關時不再播
              try { rpgUiQueue = rpgUiQueue.filter(q => q.scene.id !== 'rpg018_dog_depart'); } catch (e) {} // 很快就按出發 → 還沒播的汪汪不帶進關卡
    closeHomeScreen();
    if (typeof window.showPauseBtn === 'function') window.showPauseBtn();
    // v0.3.51：下一關的 critical 素材載好才開始
    runWithAssetGate(getAssetGroupsForLevel(nextIdx), getAssetGateTitleForLevel(nextIdx), () => {
      loadLevel(nextIdx);
      restart({ keepHp: true });
    });
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
  // v0.3.29-fix-1：背包只在暫停中開啟，不讓遊戲回到 playing
  if (gameState === 'playing') pauseGame();
  const ci = playerInventory.craftedItems || {};
  const eqSword  = (equippedSword.id  && equippedSword.currentDur)  ? equippedSword.currentDur  + '/' + equippedSword.maxDur  : null;
  const eqHammer = (equippedHammer.id && equippedHammer.currentDur) ? equippedHammer.currentDur + '/' + equippedHammer.maxDur : null;
  const items = [
    { e:itemIconHtml('coin', '🪙'),  v:playerInventory.coins,        lbl:'金幣',   cls:'inv-coin',    dur:null },
    { e:itemIconHtml('b260', '🎈'),  v:playerInventory.balloon260,   lbl:'260氣球',cls:'inv-balloon', dur:null },
    { e:itemIconHtml('round', '⚪'), v:playerInventory.roundBalloon, lbl:'圓氣球', cls:'inv-round',   dur:null },
    { e:'⚔️', v:ci.basicSword     ||0,         lbl:'氣球劍', cls:'inv-sword',   dur:eqSword },
    { e:'🔨', v:ci.basicHammer    ||0,         lbl:'氣球槌', cls:'inv-hammer',  dur:eqHammer },
    { e:'🍭', v:ci.balloonLollipop||0,         lbl:'棒棒糖', cls:'inv-candy',   dur:null },
    // v0.3.32：重要物品
    ...Object.values(playerInventory.keyItems || {}).filter(k => k && k.id && k.id !== 'orangeKingWeaknessNote01').map(k => /* v0.3.62：觀察筆記改用下方可閱讀的專用列 */
      ({ e: keyItemDisplayEmoji(k), v: 1, lbl: keyItemDisplayName(k), cls: 'inv-key', dur: null })),
  ].filter(i => i.v > 0);

  const dog = playerInventory.balloonDog || {};
  let dogHtml = '';
  if (dog.present) {
    const ds = getDogStatusText();
    dogHtml = '<div class="pause-bag-dog">' + ds.status + '　' + ds.turns + '</div>';
  }

  // v0.3.23：補血道具顯示
  ensureInventoryItems();
  const invItems = playerInventory.items || {};
  let healHtml = '';
  Object.values(SHOP_ITEMS).forEach(item => {
    const have = invItems[item.id] || 0;
    if (have <= 0) return;
    const effect = item.healFull ? '補滿生命' : ('回復 ' + (item.healAmount || 0) + ' 心');
    healHtml += '<div class="pause-bag-heal-item" style="display:flex;align-items:center;gap:8px;margin:6px 0;padding:7px 10px;background:rgba(255,255,255,0.06);border-radius:8px">'
      + '<span style="font-size:1.3em">' + item.icon + '</span>'
      + '<span style="flex:1">'
      + '<b>' + item.name + '</b> x' + have
      + '<span style="color:#aaa;font-size:0.85em;display:block">效果：' + effect + '</span>'
      + '</span>'
      + '<button style="padding:4px 12px;border-radius:6px;background:#4caf7d;color:#fff;border:none;cursor:pointer;font-size:0.9em" '
      + 'onclick="useHealingItem(\'' + item.id + '\')">使用</button>'
      + '</div>';
  });
  // v0.3.56：氣球棒棒糖（氣球秘笈製作，數量在 craftedItems）
  if (getLollipopCount() > 0) {
    healHtml += '<div class="pause-bag-heal-item" style="display:flex;align-items:center;gap:8px;margin:6px 0;padding:7px 10px;background:rgba(255,255,255,0.06);border-radius:8px">'
      + '<span style="font-size:1.3em">🍭</span>'
      + '<span style="flex:1"><b>氣球棒棒糖（舊庫存）</b> x' + getLollipopCount()
      + '<span style="color:#aaa;font-size:0.85em;display:block">效果：回復 ' + LOLLIPOP_HEAL + ' 心</span></span>'
      + '<button style="padding:4px 12px;border-radius:6px;background:#4caf7d;color:#fff;border:none;cursor:pointer;font-size:0.9em" '
      + 'onclick="useBalloonLollipop()">使用</button></div>';
  }

  // v0.3.57：暫停背包最上方顯示目前生命（和其他畫面同一套愛心），可直接使用補血道具
  const hpHtml = '<div class="pause-bag-hp" id="pause-bag-hp">' + buildHpHeartsHtml() + '<b>' + formatHpText() + '</b></div>';
  if (!healHtml) healHtml = '<div style="color:#aaa;font-size:0.85em;padding:4px 2px">目前沒有補血道具（可以在小V的家商店購買繃帶、急救包）</div>';
  const body = document.getElementById('pause-bag-body');
  body.innerHTML = hpHtml + (items.length
    ? '<div class="inv-grid">' + items.map(i =>
        '<div class="inv-item ' + i.cls + '">'
        + '<div class="inv-item__icon">' + i.e + '</div>'
        + '<div class="inv-item__count">' + i.v + '</div>'
        + '<div class="inv-item__name">' + i.lbl + '</div>'
        + (i.dur ? '<div class="inv-item__dur">' + i.dur + '</div>' : '')
        + '</div>'
      ).join('') + '</div>'
    : '<div class="inv-empty">背包空空如也 🎈</div>')
    + (healHtml ? '<div style="margin-top:8px"><div style="color:#ffe080;font-size:0.85em;margin-bottom:4px">🩹 補血道具</div>' + healHtml + '</div>' : '')
    + dogHtml
    + buildPauseBagNoteHtml();
  panel.style.display = 'flex';
}

// v0.3.62：暫停背包的觀察筆記列（暫時取得 → 「（暫時取得）」；正式取得 → 一般名稱）— 點擊打開筆記圖
function buildPauseBagNoteHtml() {
  const id = 'orangeKingWeaknessNote01';
  const owned = !!(playerInventory.keyItems || {})[id];
  const pending = !owned && !!(currentRunStats.pendingKeyItems || {})[id];
  if (!owned && !pending) return '';
  return '<div class="pause-bag-note" id="pause-bag-note" onclick="openObservationNoteFromBag()" role="button">'
    + '<span class="pause-bag-note__name">📜 橘子王觀察筆記' + (pending ? '（暫時取得）' : '') + '</span>'
    + '<span class="pause-bag-note__btn">📖 閱讀</span></div>'
    + (pending ? '<div class="pause-bag-note__hint">通關後才會正式帶回；失敗或返回整備要重新尋找。</div>' : '');
}
// 只關閉暫停背包，不改 gameState、不關閉暫停選單
function closePauseBag() {
  const panel = document.getElementById('pause-bag-panel');
  if (panel) {
    panel.style.display = 'none';
    panel.classList.remove('active');
  }
}

// v0.3.29-fix-1：暫停背包是否正在顯示
function isPauseBagOpen() {
  const panel = document.getElementById('pause-bag-panel');
  return !!(panel && panel.style.display && panel.style.display !== 'none');
}

// v0.3.29-fix-1：關閉暫停背包並回到暫停選單（ESC / 手機右上暫停鍵共用）
function closePauseBagBackToPauseMenu() {
  closePauseBag();
  if (gameState === 'playing') gameState = 'paused';
  const pauseEl = document.getElementById('pause-overlay');
  if (pauseEl && gameState === 'paused') pauseEl.style.display = 'flex';
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
  try { sfxStopLevelClear(); sfxStopEnemyVoices(); } catch (e) {} // v0.3.65：開始下一關 / 重試 / 新冒險 → 過關音效立刻停
  try { advEndLiveAttempt('discard'); } catch (e) {} // v0.3.64：其他原因重新開始（測試捷徑等）→ 不計次數，但已受傷害保留
  try { if (typeof flushPendingAssetApplies === 'function') flushPendingAssetApplies(); } catch (e) {} // v0.3.51：關卡開始時才套用晚到的素材
  dogArtModeLock = null; dogWasRunning = false; // v0.3.55：每關重新決定小狗用正式圖或 fallback
  healFx = null; try { clearHealFxDom(); } catch (e) {} // v0.3.55：補血演出不帶到下一關
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
  try { rpgOnAttemptStart(); } catch (e) {} // v0.3.59：每次關卡嘗試重設 RPG 觸發狀態（不影響已觀看紀錄）
  try { hideOrangeKingVictoryConfirm(); } catch (e) {} // v0.3.61
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
  currentRunStats.foundBossNote           = null; // v0.3.32
  currentRunStats.pendingKeyItems         = {};   // v0.3.33-fix-1：死亡 / 重試時清掉未通關取得的重要物品
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

  // v0.3.35：2-4 Boss 房 — 每次開始 / 重試都重新建立橘子王（HP、金色油管環、登場流程全部重置）
  if (orangeKingBoss) clearOrangeKingBoss();
  currentRunStats.chapter2Complete = false;
  if (typeof stopOrangeKingVictoryJingle === 'function') stopOrangeKingVictoryJingle(); // v0.3.45：新的一場不帶上一場的勝利音效
  if (typeof chapter2BgmWantRestart !== 'undefined') chapter2BgmWantRestart = true;
  if (typeof chapter1BgmWantRestart !== 'undefined') chapter1BgmWantRestart = true; // v0.3.53：重試 / 換關 → 第一章 BGM 從頭 // v0.3.49：重試 / 換關 → 第二章 BGM 從頭
  if (isBossStageLevel(currentLevelIndex)) { initOrangeKingBoss(); orangeKingBgmWantRestart = true; } // v0.3.43：重試 / 重新進入 → BGM 從頭

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
  levelRolledBackForRetry = false; // v0.3.58：新的一次挑戰開始
  // v0.3.58：返回整備節點 — 正常「出發下一關」才啟用；同一關的重試 / 返回後再出發保留；其他入口（測試跳關等）一律作廢
  if (prepCheckpoint) {
    if (prepCheckpoint.armed && currentLevelIndex === prepCheckpoint.toLevelIndex) { prepCheckpoint.armed = false; prepCheckpoint.active = true; }
    else if (!(prepCheckpoint.active && !prepCheckpoint.armed && currentLevelIndex === prepCheckpoint.toLevelIndex && keepHp)) { prepCheckpoint = null; }
  }
  console.log('snapshot created: bringBalloonDog=' + bringBalloonDog + ' hp=' + player.hp);

  gameState  = 'playing';

  coins.forEach(c => { c.collected = false; });
  balloons260.forEach(b => { b.collected = false; });
  enemies.forEach(e => {
    e.active = true;
    // v0.3.18：重試時回到 variant 定義的初始 HP（heavyBody=3, normal=1）
    const vCfg = getEnemyVariantConfig(e);
    e.hp    = vCfg?.hp    ?? e.maxHp ?? 1;
    e.maxHp = vCfg?.maxHp ?? e.maxHp ?? 1;
    e.x = e.patrol;
    e.hitFlash     = 0;
    e.hurtCooldown = 0;
    e.lastSwordSwingId  = 0;
    e.lastHammerSwingId = 0; // v0.3.18-fix-2
    // runtimeId 保持不變（loadLevel 時已分配）
  });
  orangeNemeses.forEach(o => { o.phase = 'idle'; o.phaseTimer = 0; o.sprayActive = false; });
  chimneyOranges.forEach(co => { co.sprayPhase = 'idle'; co.phaseTimer = 0; co.sprayActive = false; co.active = true; });
  dualNozzleOranges.forEach(dn => { dn.sprayPhase = 'idle'; dn.phaseTimer = 0; dn.sprayActive = false; dn.active = true; });
  fanOranges.forEach(fn => { fn.sprayPhase = 'idle'; fn.phaseTimer = 0; fn.sprayActive = false; fn.active = true; }); // v0.3.21
  projectileOranges.forEach(po => { po.phase = 'idle'; po.phaseTimer = 0; po.active = true; po.shotSpawned = false; }); // v0.3.26
  projectileOrangeShots.length = 0; // v0.3.26
  roundBalloons.forEach(r => { r.collected = false; });
  spinningEnemies.length = 0;
  scorpionDefeatEffects.length = 0;
  treasurePickupEffects.length = 0; // v0.3.12
  breakableTrees.forEach(t => { t.state = 'standing'; t.fallTimer = 0; t.safeZone = null; });
  projectiles.length = 0;
  resetHints();
  try { advOnAttemptStart(); } catch (e) { console.warn('[Score] 嘗試開始失敗', e); } // v0.3.63
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
        // v0.3.35-fix-1：2-4 武器檢查鎖住時，按了只提示，不做任何事（不會變成再玩一次）
        if (gameState === 'clear' && btnPlay.dataset && btnPlay.dataset.lockedReason === 'bossWeapon') {
          showHint(BOSS_WEAPON_GATE_MSG, 220);
          return;
        }
        if (gameState !== 'playing') {
          try {
            if (btnPlay._nextLevel && gameState === 'clear') { // 防呆：只有 clear 才能進下一關
              // v0.3.18-fix-5：第二道防線，防止 Locked 按鈕仍進入下一關
              const _guard = getChapter1NextStepInfo();
              if (_guard && _guard.nextBtnLocked) {
                showHint(_guard.nextBtnText || '請先完成下一步', 220);
                return;
              }
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
              armPrepCheckpoint(nextIdx); // v0.3.58：建立「返回整備」節點
              // v0.3.63：帶狗出發 RPG 改在「帶狗出發」安排成功的當下播放（bringDogNextLevel），進關時不再播
              try { rpgUiQueue = rpgUiQueue.filter(q => q.scene.id !== 'rpg018_dog_depart'); } catch (e) {} // 很快就按出發 → 還沒播的汪汪不帶進關卡
              // v0.3.51：下一關的 critical 素材載好才開始（第二章 / Boss 素材在這時才載）
              runWithAssetGate(getAssetGroupsForLevel(nextIdx), getAssetGateTitleForLevel(nextIdx), () => {
                console.log('BEFORE loadLevel', nextIdx);
                loadLevel(nextIdx);
                console.log('AFTER loadLevel, hiddenTreasure:', currentHiddenTreasure);
                console.log('BEFORE restart, bringBalloonDog:', bringBalloonDog);
                restart({ keepHp: true }); // 跨關保留 HP
                console.log('AFTER restart');
              });
            } else if (gameState === 'gameover') {
              // Game Over 再玩一次：走同一套穩定還原流程（含 HP / 狗 / 背包）
              // v0.3.58：有返回整備節點 → 返回上一節的整備；沒有 → 原本的重試
              if (typeof retryOrReturnToPrep === 'function') {
                retryOrReturnToPrep('gameover');
              } else if (typeof retryCurrentLevelFromStart === 'function') {
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
        retryOrReturnToPrep('pause'); // v0.3.58：有整備節點 → 返回整備；沒有 → 原本的重試本關
      })
    );
  }
  // 外部 #btn-pause 與 #btn-pause-ingame 的事件已在 index.html 綁定，勿重複
})();

// ── Guidebook (氣球秘笈) HTML overlay ────────
function openGuidebook() {
  try { sfxOnRecipeOpen(); } catch (e) {} // v0.3.64：開啟氣球秘笈（不是找到秘笈的音效）
  renderGuidebook();
  const el = document.getElementById('guidebook-overlay');
  if (el) el.style.display = 'flex';
}

// v0.3.57：暫停選單 → 氣球秘笈（遊戲維持暫停；關閉秘笈回到暫停選單，不會直接恢復冒險）
var guidebookFromPause = false;
function openGuidebookFromPause() {
  if (gameState === 'playing') pauseGame();
  if (gameState !== 'paused') return;
  guidebookFromPause = true;
  if (typeof closePauseBag === 'function') closePauseBag();
  const pauseEl = document.getElementById('pause-overlay');
  if (pauseEl) pauseEl.style.display = 'none';
  openGuidebook();
}
function isGuidebookOpen() {
  const el = document.getElementById('guidebook-overlay');
  return !!(el && el.style.display && el.style.display !== 'none');
}
function closeGuidebook() {
  const el = document.getElementById('guidebook-overlay');
  if (el) el.style.display = 'none';
  if (guidebookFromPause) {
    guidebookFromPause = false;
    if (gameState === 'paused') { const pauseEl = document.getElementById('pause-overlay'); if (pauseEl) pauseEl.style.display = 'flex'; }
  }
}
if (typeof window !== 'undefined') window.openGuidebookFromPause = openGuidebookFromPause;

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
    if (recipe.eatOnCraft && canCraft && player.hp >= (player.maxHp || 3)) { craftBtnText = '生命已滿'; craftDisabled = true; } // v0.3.57
    if (recipe.comingSoon)            { craftBtnText = '即將開放'; craftDisabled = true; }

    const durLine = recipe.durability > 0
      ? `<div class="recipe-card__dur">耐久：可攻擊 ${recipe.durability} 次</div>` : '';
    const ownedLabel = isDog
      ? (owned > 0 ? '<span class="recipe-card__owned">已在小V的家</span>' : '')
      : recipe.eatOnCraft
        ? (owned > 0 ? `<span class="recipe-card__owned">背包舊庫存 ${owned} 支</span>` : '') // v0.3.57：舊版做的棒棒糖仍可在背包使用
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
    if (btn && !craftDisabled) {
      ['click', 'touchstart'].forEach(ev =>
        btn.addEventListener(ev, e => {
          e.preventDefault();
          // v0.3.56：同一次點擊（touchstart + click）/ 快速連點只製作一次
          const nowT = Date.now();
          if (nowT - (renderGuidebook._lastCraftAt || 0) < 400) return;
          renderGuidebook._lastCraftAt = nowT;
          const _hpBeforeCraft = player.hp;
          const ok = craftItem(recipe.id);
          if (ok) {
            let craftMsg = `成功製作 ${recipe.name}！`;
            if (recipe.id === 'balloonDog') craftMsg = '🐶 氣球小狗入住小V的家，療癒了小V ❤️ +0.5';
            if (recipe.eatOnCraft) craftMsg = '🍭 氣球棒棒糖完成！小V開心地吃掉了棒棒糖！💗 生命恢復 +' + formatHealAmount(player.hp - _hpBeforeCraft); // v0.3.57
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
            refreshAllHpDisplays(); // v0.3.57
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
            // v0.3.56：製作成功演出（卡片已被 renderGuidebook 重建 → 套在新卡片 + 固定位置的動畫層）
            try {
              const newBtn = document.querySelector('#guidebook-recipe-list .recipe-card__btn[data-id="' + recipe.id + '"]');
              playCraftSuccessFx(newBtn ? newBtn.closest('.recipe-card') : null, recipe);
              const healed = player.hp - _hpBeforeCraft; // 氣球小狗：原本就有的製作療癒 +0.5／棒棒糖：現做現吃 +0.5（不重複補）
              if (healed > 0 && gameState === 'paused' && typeof triggerAdventureHealFx === 'function') triggerAdventureHealFx(healed, false); // 暫停中做的 → 回到冒險時小V身上也播
              // 補血愛心從秘笈上方的訊息列飄出（和製作成功的星星分開，不疊在一起）
              if (healed > 0) setTimeout(() => { try { const cm = document.getElementById('craft-message'); playHealFeedbackDom(healed, false, (cm && isElVisible(cm)) ? cm : null); } catch (er) {} }, 250);
            } catch (er) {}
          }
        })
      );
    }

    list.appendChild(card);
  });
}

// ── v0.3.56：氣球秘笈製作成功演出（卡片回彈 + 柔光 + 星星 / 氣球往上飄 + 局部震動 + 「🎈 製作成功！」）──
function ensureCraftFxStyles() {
  ensureHealFxStyles();
  if (document.getElementById('hv-craft-fx-style')) return;
  const st = document.createElement('style');
  st.id = 'hv-craft-fx-style';
  st.textContent =
    '@keyframes hvCraftPop{0%{transform:scale(1)}35%{transform:scale(1.06)}65%{transform:scale(.985)}100%{transform:scale(1)}}'
    + '@keyframes hvCraftGlow{0%{box-shadow:0 0 0 rgba(255,220,120,0)}30%{box-shadow:0 0 18px 4px rgba(255,220,120,.85)}100%{box-shadow:0 0 0 rgba(255,220,120,0)}}'
    + '@keyframes hvCraftFloat{0%{transform:translate(0,0) scale(.5) rotate(0);opacity:0}15%{opacity:1}100%{transform:translate(var(--dx),-80px) scale(1) rotate(var(--rot));opacity:0}}'
    + '.hv-craft-pop{animation:hvCraftPop .45s ease-out 1, hvCraftGlow .9s ease-out 1}'
    + '.hv-craft-fx{position:fixed;pointer-events:none;z-index:100500;font-size:18px;line-height:1;animation:hvCraftFloat .9s ease-out forwards}'
    + '.hv-craft-fx-text{position:fixed;pointer-events:none;z-index:100501;font:bold 15px sans-serif;color:#3a2200;background:linear-gradient(#fff3a8,#ffd25e);padding:5px 12px;border-radius:14px;'
    + 'box-shadow:0 2px 10px rgba(0,0,0,.35);white-space:nowrap;animation:hvHealText 1.1s ease-out forwards}';
  document.head.appendChild(st);
}
function clearCraftFxDom() {
  if (typeof document === 'undefined' || !document.querySelectorAll) return;
  document.querySelectorAll('.hv-craft-fx, .hv-craft-fx-text').forEach(e => { try { e.remove(); } catch (er) {} });
}
function playCraftSuccessFx(cardEl, recipe) {
  if (typeof document === 'undefined' || !document.body) return;
  ensureCraftFxStyles();
  const el = (cardEl && isElVisible(cardEl)) ? cardEl : document.getElementById((recipe && recipe.shopBuy) ? 'home-shop-body' : 'guidebook-recipe-list');
  const r0 = el ? el.getBoundingClientRect() : { left: window.innerWidth / 2 - 100, top: window.innerHeight / 2, width: 200, height: 60 };
  // 卡片若在捲動區外（被捲走），演出位置夾在秘笈清單看得到的範圍內，不會跑到面板外
  const list = (recipe && recipe.shopBuy) ? null : document.getElementById('guidebook-recipe-list');
  const lb = (list && isElVisible(list)) ? list.getBoundingClientRect() : null;
  const r = { left: r0.left, width: r0.width, height: Math.min(r0.height, 120),
              top: lb ? Math.max(lb.top + 10, Math.min(r0.top, lb.bottom - 70)) : r0.top };
  // 卡片回彈 + 柔光
  if (cardEl) { cardEl.classList.remove('hv-craft-pop'); void cardEl.offsetWidth; cardEl.classList.add('hv-craft-pop'); setTimeout(() => { try { cardEl.classList.remove('hv-craft-pop'); } catch (e) {} }, 950); }
  // 製作區局部震動（2～3px、0.2 秒）
  const box = (recipe && recipe.shopBuy) ? document.getElementById('home-shop-body') : document.getElementById('guidebook-recipe-list');
  if (box) { box.classList.remove('hv-heal-shake'); void box.offsetWidth; box.classList.add('hv-heal-shake'); setTimeout(() => { try { box.classList.remove('hv-heal-shake'); } catch (e) {} }, 260); }
  // 星星 / 氣球 / 亮點往上飄（固定位置的動畫層，不受卡片重建影響）
  const icons = ['⭐', '🎈', '✨', '🎈', '⭐', '✨', '🎈'];
  const w = Math.min(r.width, 260);
  icons.forEach((ic, i) => {
    const p = document.createElement('div');
    p.className = 'hv-craft-fx';
    p.textContent = ic;
    p.style.left = (r.left + w * (0.1 + 0.8 * (i / (icons.length - 1)))) + 'px';
    p.style.top = (r.top + Math.min(r.height, 120) * 0.45) + 'px';
    p.style.setProperty('--dx', Math.round((Math.random() - 0.5) * 40) + 'px');
    p.style.setProperty('--rot', Math.round((Math.random() - 0.5) * 60) + 'deg');
    p.style.animationDelay = (i * 0.05) + 's';
    document.body.appendChild(p);
    setTimeout(() => { try { p.remove(); } catch (e) {} }, 1300);
  });
  const tx = document.createElement('div');
  tx.className = 'hv-craft-fx-text';
  tx.textContent = (recipe && recipe.shopBuy) ? ('🛒 購買成功！' + (recipe.emoji || '') + ' ' + recipe.name) : (recipe && recipe.eatOnCraft) ? '🍭 氣球棒棒糖完成！小V開心地吃掉了！' : ('🎈 製作成功！' + (recipe ? (recipe.emoji || '') + ' ' + recipe.name : ''));
  tx.style.left = (r.left + w / 2) + 'px';
  tx.style.top = Math.max(4, r.top - 30) + 'px';
  document.body.appendChild(tx);
  if (!(recipe && recipe.shopBuy)) { try { sfxStartCrafting(tx); } catch (e) {} } // v0.3.65：製作音效只跟著這個提示（提示淡出就停；商店購買不播）
  setTimeout(() => { try { tx.remove(); } catch (e) {} }, 1300);
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
const ART_READY_TIMEOUT_MS = 12000; // 延長到 12 秒，避免卡死，但 timeout 不再放行遊戲

// v0.3.18-fix-5：蠍子核心素材就緒判斷（包含 normal + heavy 的 walk + hurt）
function isScorpionCoreArtReady() {
  const normal = scorpionSkinImgs['scorpion_normal'];
  const heavy  = scorpionSkinImgs['scorpion_heavy'];
  // 最低要求：normal walk 就緒（heavy 若尚未完成，允許繼續等）
  // 若 heavy 一直載入失敗（404），也算就緒（靠 fallback normal）
  const normalOk = normal && normal.walkReady;
  // heavy：若 cache 中沒有 key（initScorpionSkinArt 尚未跑），用舊 scorpionWalkReady 兜底
  const heavyOk  = !heavy ? scorpionWalkReady : (heavy.walkReady || heavy.hurtReady);
  return normalOk && heavyOk;
}

// v0.3.18-fix-5：橘子怪核心素材就緒判斷（含 cooldown / oil sprites）
function isOrangeCoreArtReady() {
  const coreKeys = ['idle', 'warning', 'spray', 'cooldown01', 'cooldown02', 'oil01', 'oil02', 'oil03'];
  return coreKeys.every(k => {
    const img = orangeEnemyImgs[k];
    return img && img.complete && img.naturalWidth > 0;
  });
}

// v0.3.51：開機 gate 改成「common + chapter1 群組完成」（原本的 hero / 蠍子 / 橘子判斷保留在下方，已不再使用）
var assetBootReady = false;
function isAdventureCoreArtReady() {
  return assetBootReady;
}
function isAdventureCoreArtReady_legacy() {
  if (_artReadyConfirmed) return true;
  const heroOk = CORE_ART_KEYS.every(k => {
    const img = adventureImages[k];
    return img && img.complete && img.naturalWidth > 0;
  });
  const scorpionOk = isScorpionCoreArtReady();
  const orangeOk   = isOrangeCoreArtReady();
  if (heroOk && scorpionOk && orangeOk) {
    _artReadyConfirmed = true;
    return true;
  }
  // v0.3.18-fix-5：timeout 不再放行遊戲（不再設 _artReadyConfirmed=true）
  // 只更新 loading 文字，繼續等待素材
  return false;
}

// ════════════════════════════════════════════════════════════════════
//  v0.3.51：Asset manifest + preload gate（章節 / 關卡為單位載入素材）
//  ・common：主角、共用道具、通用過關旗、蠍子（第一章與通用敵人）— 開機就載
//  ・chapter1：第一章需要的橘子怪基本圖（1-1～1-3 都有橘子怪）— 開機就載；第一章背景 / 地面 / 平台目前仍是 canvas 畫法
//  ・chapter2：第二章背景 / 前景 / 地面 / 凹洞 / 平台 / 煙囪・雙噴嘴・飛行油彈橘子 / 第二章 BGM — 進第二章前才載
//  ・orangeKingBoss：Boss 房 / 橘子王 / 油彈・油漬・金色油管環 / 王權劍 / Boss BGM・勝利音效 — 進 2-4 前才載
//  ・critical 沒載好不准開始該關；optional 失敗不擋（本關不顯示）；音訊為 soft-critical（失敗只警告、不擋）
//  ・每張圖依序嘗試 GitHub Pages → 同網站相對路徑 → raw.githubusercontent（每個來源 12 秒 timeout）；
//    在 gate 期間就決定用哪個來源，遊戲開始後不會再偷偷換來源
//  ・載好的圖片放進原本各自的快取（adventureImages / scorpionSkinImgs / chapter2BgImgs / orangeKingBossImgs …），
//    所以原有的 getXXXImg() 與繪製程式完全不用改
//  ・gate 結束後才到的圖片（例如 timeout 後才成功）先暫存，下一次關卡開始（restart）才套用 → 不會中途跳圖
// ════════════════════════════════════════════════════════════════════
const ASSET_SOURCE_TIMEOUT_MS = 12000;
const ASSET_AUDIO_TIMEOUT_MS  = 8000;
const ASSET_RAW_BASE = 'https://raw.githubusercontent.com/vashyang1120/balloon-v-rush/main/';
const ASSET_REGISTRY = {};          // path → record
const ASSET_GROUP_STATE = {};       // group → { promise, settled, summary }
const ASSET_PENDING_APPLIES = [];   // gate 結束後才載好的圖片（下次關卡開始才套用）
let assetGateActive = false;        // gate（loading 畫面）進行中 → 可以直接套用到快取
let assetGateProgress = { title: '', loaded: 0, failed: 0, total: 0, current: '', groups: [], audio: '' };

const ASSET_LOADING_TIPS = [
  '你知道嗎？第一章的小怪是蠍子，因為牠有刺，也因為氣球小V是天蠍座！',
  '撿到圓氣球和 260 長條氣球，回小V的家可以做出氣球武器！',
  '橘子油會讓氣球破掉，看準橘子怪噴油的空檔再通過！',
  '帶著氣球小狗出發，牠會幫你找到藏起來的寶物！',
];

function assetCap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
// 建立 manifest：每筆 { path, type, critical, apply(img), fail(), altPaths, label }
function buildAssetManifest() {
  const M = { common: [], chapter1: [], chapter2: [], orangeKingBoss: [], dog: [], rpgBoot: [], rpg: [] };
  // v0.3.59：RPG 對話立繪（optional：載入失敗不擋進關；對話框會顯示可辨識的錯誤訊息與路徑）
  Object.keys(RPG_ASSETS).filter(key => !RPG_EXTERNAL_ASSET_KEYS.includes(key))
    .sort((a, b) => (RPG_ASSET_LOAD_ORDER.indexOf(a) + 1 || 99) - (RPG_ASSET_LOAD_ORDER.indexOf(b) + 1 || 99))
    .forEach(key => M[RPG_BOOT_ASSET_KEYS.includes(key) ? 'rpgBoot' : 'rpg'].push({ path: RPG_ASSETS[key], type: 'image', critical: false, label: 'rpg:' + key, timeoutMs: RPG_ASSET_TIMEOUT_MS,
      apply: im => { rpgImgs[key] = im; rpgImgStatus[key] = 'ok'; }, fail: () => { rpgImgStatus[key] = 'error'; }, altPaths: RPG_ASSET_ALT_PATHS[key] || [] }));
  // v0.3.55：氣球小狗動作圖（optional：載入失敗不擋進關 → 本關用舊小狗畫法；只有帶狗出發的關卡才會等它）
  Object.entries(DOG_ART_ASSETS).forEach(([key, path]) => M.dog.push({ path, type: 'image', critical: false, label: 'dog:' + key,
    apply: im => { dogArtImgs[key] = im; dogArtStatus[key] = 'ok'; }, fail: () => { dogArtStatus[key] = 'error'; }, altPaths: [] }));
  const img = (group, path, critical, label, apply, fail, altPaths) => M[group].push({ path, type: 'image', critical, label, apply, fail: fail || (() => {}), altPaths: altPaths || [] });
  // ── common：主角（不含王權劍）
  Object.entries(ADVENTURE_HERO_ASSETS).forEach(([key, path]) => {
    if (ROYAL_SWORD_HERO_KEYS.includes(key)) return;
    img('common', path, true, 'hero:' + key, im => { adventureImages[key] = im; adventureHeroLoaded = true; });
  });
  HAMMER_ATTACK_ASSETS.forEach((path, i) => img('common', path, true, 'hammer:' + (i + 1), im => { hammerAttackImgs[i] = im; hammerAttackReady = true; }));
  // 共用道具 + 通用過關旗
  Object.entries(ADVENTURE_ITEM_ICON_PATHS).forEach(([key, path]) => img('common', path, true, 'item:' + key,
    im => { adventureItemIconImgs[key] = im; adventureItemIconStatus[key] = 'ok'; },
    () => { adventureItemIconStatus[key] = 'error'; }));
  // 蠍子（normal + heavy；同時填舊的全域快取）
  Object.entries(SCORPION_SKIN_ASSETS).forEach(([skin, a]) => {
    const cache = () => (scorpionSkinImgs[skin] = scorpionSkinImgs[skin] || { walk: [], walkReady: false, hurt: null, hurtReady: false });
    a.walk.forEach((path, i) => img('common', path, true, skin + ':walk' + (i + 1), im => {
      const c = cache(); c.walk[i] = im; c.walkReady = true;
      if (skin === 'scorpion_normal') { scorpionWalkImgs[i] = im; scorpionWalkReady = true; }
    }));
    if (a.hurt) img('common', a.hurt, true, skin + ':hurt', im => {
      const c = cache(); c.hurt = im; c.hurtReady = true;
      if (skin === 'scorpion_normal') { scorpionHurtImg = im; scorpionHurtReady = true; }
    });
  });
  // ── chapter1：第一章 1-1～1-3 的橘子怪（基本款）
  Object.entries(ORANGE_ENEMY_ASSETS).forEach(([key, path]) => img('chapter1', path, true, 'orange:' + key, im => {
    orangeEnemyImgs[key] = im;
    orangeEnemyCoreReady = ORANGE_CORE_KEYS.every(k => orangeEnemyImgs[k]);
  }));
  // v0.3.52：第一章背景三層（critical）＋ 地面小物件（optional）
  Object.entries(CHAPTER1_BG_ASSETS).forEach(([key, path]) => img('chapter1', path, true, 'ch1:' + key,
    im => { chapter1BgImgs[key] = im; chapter1BgImgStatus[key] = 'ok'; },
    () => { chapter1BgImgStatus[key] = 'error'; }));
  Object.entries(CHAPTER1_FG_ASSETS).forEach(([key, path]) => img('chapter1', path, false, 'ch1:' + key,
    im => { chapter1BgImgs[key] = im; chapter1BgImgStatus[key] = 'ok'; },
    () => { chapter1BgImgStatus[key] = 'error'; }));
  // v0.3.53：第一章平台圖（critical）＋ 第一章 BGM（soft：失敗不擋進關）
  Object.entries(CHAPTER1_PLATFORM_ART).forEach(([key, path]) => img('chapter1', path, true, 'ch1:plat_' + key,
    im => { chapter1BgImgs['plat_' + key] = im; chapter1BgImgStatus['plat_' + key] = 'ok'; },
    () => { chapter1BgImgStatus['plat_' + key] = 'error'; }));
  // v0.3.54：地面帶 + 尖刺（critical）；凹洞邊緣 / 陰影（optional：1-1～1-3 目前沒有凹洞）
  Object.entries(CHAPTER1_TILE_ASSETS).forEach(([key, path]) => img('chapter1', path, key === 'groundTile' || key === 'spike', 'ch1:' + key,
    im => { chapter1BgImgs[key] = im; chapter1BgImgStatus[key] = 'ok'; },
    () => { chapter1BgImgStatus[key] = 'error'; }));
  M.chapter1.push({ path: CHAPTER1_BGM_PATH, type: 'audio', critical: false, soft: true, label: 'bgm:chapter1',
    start: () => initChapter1Bgm(), status: () => chapter1BgmStatus });
  // ── chapter2：背景 / 地形 / 平台（critical）；前景與凹洞裝飾（optional）
  const ch2Critical = ['far', 'mid', 'near', 'groundTile', 'platformShort', 'platformLong'];
  Object.entries(CHAPTER2_BG_ASSETS).forEach(([key, path]) => img('chapter2', path, ch2Critical.includes(key), 'ch2:' + key,
    im => { chapter2BgImgs[key] = im; chapter2BgImgStatus[key] = 'ok'; },
    () => { chapter2BgImgStatus[key] = 'error'; }));
  Object.entries(CHIMNEY_ORANGE_ASSETS).forEach(([key, path]) => img('chapter2', path, true, 'chimney:' + key, im => {
    chimneyOrangeImgs[key] = im;
    chimneyOrangeCoreReady = Object.keys(CHIMNEY_ORANGE_ASSETS).every(k => chimneyOrangeImgs[k]);
  }));
  Object.entries(CHIMNEY_ORANGE_OIL_ASSETS).forEach(([key, path]) => img('chapter2', path, true, 'chimneyOil:' + key, im => { chimneyOrangeOilImgs[key] = im; chimneyOrangeOilReady = true; }));
  Object.entries(DUAL_ORANGE_ASSETS).forEach(([key, path]) => img('chapter2', path, true, 'dual:' + key,
    im => { if (!dualOrangeImgs[key]) dualOrangeLoadedCount++; dualOrangeImgs[key] = im; dualOrangeLoadStatus[key] = 'LOADED'; },
    () => { dualOrangeLoadStatus[key] = 'ERROR'; }));
  Object.entries(PROJECTILE_ORANGE_ASSETS).forEach(([key, path]) => img('chapter2', path, true, 'projectile:' + key,
    im => { projectileOrangeImgs[key] = im; projectileOrangeLoadStatus[key] = 'LOADED'; projectileOrangeResolvedSrc[key] = im.src; },
    () => { projectileOrangeLoadStatus[key] = 'ERROR'; }));
  M.chapter2.push({ path: CHAPTER2_BGM_PATH, type: 'audio', critical: false, soft: true, label: 'bgm:chapter2',
    start: () => initChapter2Bgm(), status: () => chapter2BgmStatus });
  // ── orangeKingBoss
  Object.entries(ORANGE_KING_BOSS_ASSETS).forEach(([key, path]) => img('orangeKingBoss', path, true, 'boss:' + key,
    im => { orangeKingBossImgs[key] = im; orangeKingBossImgStatus[key] = 'ok'; },
    () => { orangeKingBossImgStatus[key] = 'error'; },
    (ORANGE_KING_BOSS_ASSET_FALLBACKS[key] || [])));
  ROYAL_SWORD_HERO_KEYS.forEach(key => img('orangeKingBoss', ADVENTURE_HERO_ASSETS[key], true, 'royal:' + key, im => { adventureImages[key] = im; }));
  M.orangeKingBoss.push({ path: ORANGE_KING_BGM_PATH, type: 'audio', critical: false, soft: true, label: 'bgm:orangeKing',
    start: () => initOrangeKingBgm(), status: () => (orangeKingBgmStatus === 'ok(備用路徑)' ? 'ok' : orangeKingBgmStatus) });
  M.orangeKingBoss.push({ path: ORANGE_KING_VICTORY_JINGLE_PATH, type: 'audio', critical: false, soft: true, label: 'sfx:victoryJingle',
    start: () => initOrangeKingVictoryJingle(), status: () => orangeKingJingleStatus });
  return M;
}
let ASSET_MANIFEST = null;
function getAssetManifest() { if (!ASSET_MANIFEST) ASSET_MANIFEST = buildAssetManifest(); return ASSET_MANIFEST; }

function getAssetSourceCandidates(path, altPaths) {
  const q = '?v=' + encodeURIComponent(GAME_VERSION);
  const out = [];
  [path].concat(altPaths || []).forEach(p => {
    out.push({ src: 'pages', url: resolveAdventureAssetSrc(p) + q });
    try { if (typeof location !== 'undefined' && location.href) out.push({ src: 'relative', url: new URL(p, location.href).href + q }); } catch (e) {}
    out.push({ src: 'raw', url: ASSET_RAW_BASE + p.replace(/^\//, '') + q });
  });
  return out.filter((c, i) => out.findIndex(x => x.url === c.url) === i);
}
function getAssetRecord(entry) {
  let r = ASSET_REGISTRY[entry.path];
  if (!r) r = ASSET_REGISTRY[entry.path] = { path: entry.path, type: entry.type, label: entry.label, critical: false, groups: [], status: 'idle', url: '', source: '', w: 0, h: 0, tried: [], img: null, entries: [], promise: null, applied: false };
  if (!r.entries.includes(entry)) r.entries.push(entry);
  if (entry.critical) r.critical = true;
  if (entry.timeoutMs) r.timeoutMs = Math.max(r.timeoutMs || 0, entry.timeoutMs); // v0.3.61：RPG 立繪可等久一點
  return r;
}
function applyAssetRecord(r) {
  if (r.applied || !r.img) return;
  r.applied = true;
  r.entries.forEach(e => { try { e.apply && e.apply(r.img); } catch (err) { console.warn('[AssetPreload] apply 失敗', r.path, err); } });
}
// 載好的圖片：gate 進行中 / 尚未開始遊玩 → 立即套用；遊玩中才到 → 暫存，下次關卡開始才套用（避免中途跳圖）
function onAssetImageReady(r) {
  // v0.3.59：RPG 立繪只用在對話框（DOM），不是遊戲畫面上的圖 → 載好就可以用，不必等下一關
  if (assetGateActive || !assetBootReady || String(r.label || '').startsWith('rpg:')) applyAssetRecord(r);
  else if (!ASSET_PENDING_APPLIES.includes(r)) ASSET_PENDING_APPLIES.push(r);
}
function flushPendingAssetApplies() {
  while (ASSET_PENDING_APPLIES.length) applyAssetRecord(ASSET_PENDING_APPLIES.shift());
}
function loadImageRecord(r) {
  if (r.promise) return r.promise;
  r.status = 'loading';
  const cands = getAssetSourceCandidates(r.path, r.entries.reduce((a, e) => a.concat(e.altPaths || []), []));
  r.promise = new Promise(resolve => {
    const tryAt = (i) => {
      if (i >= cands.length) {
        r.status = 'failed';
        r.entries.forEach(e => { try { e.fail && e.fail(); } catch (err) {} });
        console.error('[AssetPreload] ❌ 載入失敗' + (r.critical ? '（critical）' : '（optional）') + '：' + r.path + '\n'
          + r.tried.map(t => '   ' + t.result + '  ' + t.url).join('\n'));
        resolve(r); return;
      }
      const c = cands[i];
      r.current = c.url;
      let done = false;
      const im = new Image();
      const timer = setTimeout(() => { if (done) return; done = true; r.tried.push({ url: c.url, result: 'timeout' }); try { im.src = ''; } catch (e) {} tryAt(i + 1); }, r.timeoutMs || ASSET_SOURCE_TIMEOUT_MS);
      im.onload = () => {
        if (done) return; done = true; clearTimeout(timer);
        if (!im.naturalWidth) { r.tried.push({ url: c.url, result: 'error（naturalWidth 0）' }); tryAt(i + 1); return; }
        Object.assign(r, { status: 'loaded', img: im, url: c.url, source: c.src, w: im.naturalWidth, h: im.naturalHeight });
        r.tried.push({ url: c.url, result: 'ok' });
        if (r.label && r.label.startsWith('item:')) { // 保留 v0.3.50-fix-1 的 debugItemIcons 資訊
          const k = r.label.slice(5);
          adventureItemIconInfo[k] = { status: 'ok', url: c.url, w: im.naturalWidth, h: im.naturalHeight, tried: r.tried.slice() };
        }
        onAssetImageReady(r);
        resolve(r);
      };
      im.onerror = () => { if (done) return; done = true; clearTimeout(timer); r.tried.push({ url: c.url, result: 'error' }); tryAt(i + 1); };
      try { im.src = c.url; } catch (e) { done = true; clearTimeout(timer); r.tried.push({ url: c.url, result: 'exception' }); tryAt(i + 1); }
    };
    tryAt(0);
  });
  return r.promise;
}
// 音訊：沿用原本的 Audio 物件（initChapter2Bgm / initOrangeKingBgm / initOrangeKingVictoryJingle），等到 ok / error / timeout
function loadAudioRecord(r, entry) {
  if (r.promise) return r.promise;
  r.status = 'loading';
  r.promise = new Promise(resolve => {
    try { entry.start(); } catch (e) {}
    const t0 = Date.now();
    const poll = () => {
      const st = entry.status();
      if (st === 'ok') { r.status = 'loaded'; r.url = r.path; return resolve(r); }
      if (st === 'error') { r.status = 'failed'; console.warn('[AssetPreload] 音訊載入失敗（soft-critical，不擋進關）：' + r.path); return resolve(r); }
      if (Date.now() - t0 > ASSET_AUDIO_TIMEOUT_MS) { r.status = 'loaded'; r.note = 'timeout（繼續在背景載入）'; return resolve(r); }
      setTimeout(poll, 100);
    };
    poll();
  });
  return r.promise;
}

// 1. preloadAssetGroup(groupName, options) → Promise<summary>
function preloadAssetGroup(groupName, options) {
  const opts = options || {};
  const st = ASSET_GROUP_STATE[groupName] || (ASSET_GROUP_STATE[groupName] = { promise: null, settled: false, summary: null });
  if (st.promise && !opts.force) return st.promise;
  const entries = getAssetManifest()[groupName] || [];
  if (opts.force) entries.forEach(e => { const r = ASSET_REGISTRY[e.path]; if (r && r.status === 'failed') { r.promise = null; r.tried = []; r.status = 'idle'; r.applied = false; } });
  const recs = entries.map(e => { const r = getAssetRecord(e); if (!r.groups.includes(groupName)) r.groups.push(groupName); return { r, e }; });
  st.settled = false;
  const loadOne = ({ r, e }) => (e.type === 'audio' ? loadAudioRecord(r, e) : loadImageRecord(r)).then(() => { if (opts.onProgress) opts.onProgress(groupName); });
  // v0.3.61：RPG 立繪群組一張一張依序載入（避免手機上同時下載太多張而逾時）
  const allDone = (groupName === 'rpg')
    ? recs.reduce((p, x) => p.then(() => loadOne(x)), Promise.resolve())
    : Promise.all(recs.map(loadOne));
  st.promise = allDone.then(() => {
    const sum = summarizeAssetGroup(groupName);
    st.settled = true; st.summary = sum;
    console.info('[AssetPreload] 群組完成：' + groupName + '　' + sum.loaded + '/' + sum.total + ' 載入，' + sum.failed + ' 失敗（critical 失敗 ' + sum.criticalFailed + '）');
    return sum;
  });
  return st.promise;
}
function summarizeAssetGroup(groupName) {
  const entries = getAssetManifest()[groupName] || [];
  const recs = entries.map(e => ASSET_REGISTRY[e.path]).filter(Boolean);
  const s = { group: groupName, total: entries.length, loaded: 0, failed: 0, pending: 0, criticalFailed: 0, criticalFailedPaths: [] };
  entries.forEach(e => {
    const r = ASSET_REGISTRY[e.path];
    const st = r ? r.status : 'idle';
    if (st === 'loaded') s.loaded++;
    else if (st === 'failed') { s.failed++; if (e.critical) { s.criticalFailed++; s.criticalFailedPaths.push(e.path); } }
    else s.pending++;
  });
  return s;
}
// 4. isAssetGroupReady(groupName)：群組已載完，且 critical 全部成功
function isAssetGroupReady(groupName) {
  const st = ASSET_GROUP_STATE[groupName];
  return !!(st && st.settled && st.summary && st.summary.criticalFailed === 0);
}
function isAssetGroupSettled(groupName) { const st = ASSET_GROUP_STATE[groupName]; return !!(st && st.settled); }
// 3. getAssetStatus(path 或 key) → loading / loaded / failed / skipped
function getAssetStatus(pathOrKey) {
  let r = ASSET_REGISTRY[pathOrKey];
  if (!r) r = Object.values(ASSET_REGISTRY).find(x => x.label === pathOrKey || (x.label || '').endsWith(':' + pathOrKey) || x.path.endsWith('/' + pathOrKey));
  if (!r || r.status === 'idle') return 'skipped';
  return r.status;
}
// 關卡 → 需要的群組
function getAssetGroupsForLevel(levelIndex) {
  const base = getAssetGroupsForLevelBase(levelIndex);
  // v0.3.55：有帶狗出發 → 進關前也確保小狗動作圖已載好（沒帶狗就不等）
  if ((typeof nextBringDog !== 'undefined' && nextBringDog) || (typeof bringBalloonDog !== 'undefined' && bringBalloonDog)) return base.concat(['dog']);
  return base;
}
function getAssetGroupsForLevelBase(levelIndex) {
  const lv = LEVELS[levelIndex];
  // v0.3.59：RPG 立繪（optional）— 開機後已在背景載入；之後進關時若還沒載完就一起等（載入失敗不擋）
  if (!lv) return ['common', 'chapter1', 'rpgBoot', 'rpg'];
  if (lv.isBossStage) return ['common', 'chapter2', 'orangeKingBoss', 'rpgBoot', 'rpg'];
  if (lv.chapterId === 2) return ['common', 'chapter1', 'chapter2', 'rpgBoot', 'rpg'];
  return ['common', 'chapter1', 'rpgBoot', 'rpg'];
}
function getAssetGateTitleForLevel(levelIndex) {
  const lv = LEVELS[levelIndex] || {};
  if (lv.isBossStage) return '橘子王 Boss 戰準備中...';
  if (lv.chapterId === 2) return '第二章素材載入中...';
  return '派對島準備中...';
}
// 2. ensureAssetsForStage(stageId) → Promise<{ ok, groups, summaries, criticalFailedPaths }>
function ensureAssetsForStage(stageIdOrIndex, onProgress) {
  const idx = typeof stageIdOrIndex === 'number' ? stageIdOrIndex : LEVELS.findIndex(l => l.stageId === stageIdOrIndex);
  return ensureAssetGroups(getAssetGroupsForLevel(idx), onProgress);
}
function ensureAssetGroups(groups, onProgress, force) {
  return Promise.all(groups.map(g => preloadAssetGroup(g, { onProgress, force }))).then(sums => {
    const failed = sums.reduce((a, s) => a.concat(s.criticalFailedPaths), []);
    return { ok: failed.length === 0, groups, summaries: sums, criticalFailedPaths: failed };
  });
}
function getAssetGateProgress() {
  const groups = assetGateProgress.groups || [];
  let total = 0, loaded = 0, failed = 0; let current = '';
  const audio = [];
  groups.forEach(g => {
    (getAssetManifest()[g] || []).forEach(e => {
      total++;
      const r = ASSET_REGISTRY[e.path];
      const st = r ? r.status : 'idle';
      if (st === 'loaded') loaded++; else if (st === 'failed') failed++; else if (!current) current = e.path.split('/').pop();
      if (e.type === 'audio') audio.push(e.path.split('/').pop() + '：' + (st === 'loaded' ? (r && r.note ? '背景載入中' : '✓') : st === 'failed' ? '✗（不影響遊玩）' : '載入中'));
    });
  });
  return Object.assign(assetGateProgress, { total, loaded, failed, current, audio: audio.join('　') });
}

// ── Loading 畫面（HTML overlay，蓋在結算頁 / 小V的家 / 暫停畫面之上）──
let assetLoadingEl = null, assetLoadingTimer = 0, assetLoadingTipIdx = 0;
function ensureAssetLoadingOverlay() {
  if (assetLoadingEl || typeof document === 'undefined' || !document.createElement || !document.body) return assetLoadingEl;
  const d = document.createElement('div');
  d.id = 'asset-loading-overlay';
  d.setAttribute('style', 'position:fixed;inset:0;z-index:100000;display:none;align-items:center;justify-content:center;'
    + 'background:rgba(20,14,40,0.94);font-family:sans-serif;color:#f4ecff;padding:16px;box-sizing:border-box');
  d.innerHTML = '<div style="width:min(520px,100%);text-align:center">'
    + '<div data-k="title" style="font-size:22px;font-weight:bold;margin-bottom:14px">派對島準備中...</div>'
    + '<div style="height:14px;border-radius:7px;background:rgba(255,255,255,0.15);overflow:hidden"><div data-k="bar" style="height:100%;width:0%;background:linear-gradient(90deg,#ffb347,#ffe066);transition:width .15s"></div></div>'
    + '<div style="display:flex;justify-content:space-between;font-size:13px;margin-top:8px;opacity:.9"><span data-k="count">0 / 0</span><span data-k="pct">0%</span></div>'
    + '<div data-k="file" style="font-size:12px;opacity:.65;margin-top:6px;word-break:break-all;min-height:16px"></div>'
    + '<div data-k="audio" style="font-size:12px;opacity:.65;margin-top:4px;min-height:16px"></div>'
    + '<div data-k="err" style="display:none;margin-top:14px;padding:10px;border-radius:8px;background:rgba(255,80,80,0.18);font-size:13px;text-align:left"></div>'
    + '<div data-k="tip" style="font-size:13px;margin-top:18px;color:#ffe9a8;line-height:1.5"></div>'
    + '</div>';
  document.body.appendChild(d);
  assetLoadingEl = d;
  return d;
}
function updateAssetLoadingOverlay() {
  const el = assetLoadingEl;
  if (!el) return;
  const p = getAssetGateProgress();
  const done = p.loaded + p.failed;
  const pct = p.total ? Math.floor(done / p.total * 100) : 0;
  const q = k => el.querySelector('[data-k="' + k + '"]');
  q('title').textContent = p.title;
  q('bar').style.width = pct + '%';
  q('count').textContent = '已載入 ' + done + ' / ' + p.total + (p.failed ? '（失敗 ' + p.failed + '）' : '');
  q('pct').textContent = pct + '%';
  q('file').textContent = p.current ? '正在載入：' + p.current : '';
  q('audio').textContent = p.audio ? '音樂：' + p.audio : '';
}
function showAssetLoadingOverlay(title, groups) {
  // 進度只算這次真的要載的群組（已載好的群組不重複計入）
  const fresh = groups.filter(g => !isAssetGroupSettled(g));
  assetGateProgress.title = title; assetGateProgress.groups = fresh.length ? fresh : groups;
  const el = ensureAssetLoadingOverlay();
  if (!el) return;
  el.querySelector('[data-k="err"]').style.display = 'none';
  el.querySelector('[data-k="tip"]').textContent = '💡 ' + ASSET_LOADING_TIPS[assetLoadingTipIdx++ % ASSET_LOADING_TIPS.length];
  el.style.display = 'flex';
  updateAssetLoadingOverlay();
  clearInterval(assetLoadingTimer);
  assetLoadingTimer = setInterval(updateAssetLoadingOverlay, 120);
}
function hideAssetLoadingOverlay() {
  clearInterval(assetLoadingTimer);
  if (assetLoadingEl) assetLoadingEl.style.display = 'none';
}
function showAssetLoadingError(result, onRetry, onContinue) {
  const el = assetLoadingEl;
  if (!el) { onContinue(); return; }
  clearInterval(assetLoadingTimer); updateAssetLoadingOverlay();
  const box = el.querySelector('[data-k="err"]');
  const list = result.criticalFailedPaths.slice(0, 8).map(p => '・' + p.split('/').pop()).join('<br>') + (result.criticalFailedPaths.length > 8 ? '<br>…共 ' + result.criticalFailedPaths.length + ' 個' : '');
  box.innerHTML = '<b>⚠️ 有 ' + result.criticalFailedPaths.length + ' 個必要素材載入失敗</b>（完整網址已列在 console）<br>' + list
    + '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">'
    + '<button data-k="retry" style="flex:1;padding:8px;border-radius:6px;border:0;background:#ffe066;font-weight:bold">重新載入</button>'
    + '<button data-k="cont" style="flex:1;padding:8px;border-radius:6px;border:0;background:#ccc">' + (ADVENTURE_TEST_TOOLS_ENABLED ? '測試版：用 fallback 繼續' : '仍要繼續（部分畫面會簡化）') + '</button></div>';
  box.style.display = 'block';
  box.querySelector('[data-k="retry"]').onclick = () => { box.style.display = 'none'; onRetry(); };
  box.querySelector('[data-k="cont"]').onclick = () => { console.warn('[AssetPreload] 使用者選擇以 fallback 繼續，缺少：', result.criticalFailedPaths); onContinue(); };
}
// 5. drawLoadingScreen(progress)：canvas 版（開機 gate 時畫在遊戲畫面上）
function drawLoadingScreen(progress) {
  const p = progress || getAssetGateProgress();
  const done = p.loaded + p.failed, pct = p.total ? done / p.total : 0;
  ctx.save();
  ctx.fillStyle = '#1a1230'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f4ecff'; ctx.font = 'bold 24px sans-serif';
  ctx.fillText(p.title || '派對島準備中...', CANVAS_W / 2, CANVAS_H / 2 - 50);
  const bw = 440, bx = (CANVAS_W - bw) / 2, by = CANVAS_H / 2 - 20;
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(bx, by, bw, 14);
  ctx.fillStyle = '#ffd36b'; ctx.fillRect(bx, by, bw * pct, 14);
  ctx.font = '14px sans-serif'; ctx.fillStyle = 'rgba(244,236,255,0.9)';
  ctx.fillText('已載入 ' + done + ' / ' + p.total + '　' + Math.floor(pct * 100) + '%', CANVAS_W / 2, by + 36);
  ctx.font = '12px sans-serif'; ctx.fillStyle = 'rgba(244,236,255,0.6)';
  if (p.current) ctx.fillText('正在載入：' + p.current, CANVAS_W / 2, by + 56);
  ctx.fillStyle = '#ffe9a8'; ctx.font = '13px sans-serif';
  ctx.fillText('💡 ' + ASSET_LOADING_TIPS[0], CANVAS_W / 2, by + 96);
  ctx.restore();
}

// 進關閘門：該關 critical 素材 ready 才執行 fn；沒 ready → loading 畫面 → 載完才開始（不會先 fallback 再跳圖）
let assetGateBusy = false;
function runWithAssetGate(groups, title, fn) {
  if (typeof globalThis !== 'undefined' && globalThis.__ASSET_GATE_BYPASS) { fn(); return; } // 只給無頭測試用
  if (groups.every(isAssetGroupSettled) && groups.every(g => !ASSET_GROUP_STATE[g].needsRetry)) { flushPendingAssetApplies(); fn(); return; }
  if (assetGateBusy) { console.warn('[AssetPreload] 已在載入中，忽略重複的進關要求'); return; }
  assetGateBusy = true; assetGateActive = true;
  showAssetLoadingOverlay(title, groups);
  const attempt = (force) => ensureAssetGroups(groups, null, force).then(res => {
    if (!res.ok) {
      groups.forEach(g => { if (ASSET_GROUP_STATE[g]) ASSET_GROUP_STATE[g].needsRetry = true; });
      showAssetLoadingError(res, () => { clearInterval(assetLoadingTimer); assetLoadingTimer = setInterval(updateAssetLoadingOverlay, 120); attempt(true); },
        () => { groups.forEach(g => { if (ASSET_GROUP_STATE[g]) ASSET_GROUP_STATE[g].needsRetry = false; }); finish(); });
      return;
    }
    groups.forEach(g => { if (ASSET_GROUP_STATE[g]) ASSET_GROUP_STATE[g].needsRetry = false; });
    finish();
  });
  const finish = () => {
    flushPendingAssetApplies();
    hideAssetLoadingOverlay();
    assetGateBusy = false;
    try { fn(); } finally { assetGateActive = false; }
  };
  attempt(false);
}

// ── debug 指令 ──
function debugAssetGroup(groupName) {
  const rows = (getAssetManifest()[groupName] || []).map(e => {
    const r = ASSET_REGISTRY[e.path] || {};
    return { file: e.path.split('/').pop(), critical: e.critical ? 'critical' : (e.soft ? 'soft' : 'optional'), status: r.status || 'skipped',
             source: r.source || '', size: r.w ? r.w + '×' + r.h : '', url: r.url || '', note: r.note || '' };
  });
  try { console.table(rows); } catch (e) { console.log(rows); }
  return rows;
}
function debugAssetPreload() {
  const lv = LEVELS[currentLevelIndex] || {};
  const rows = Object.keys(getAssetManifest()).map(g => {
    const s = summarizeAssetGroup(g), st = ASSET_GROUP_STATE[g];
    return { group: g, requested: !!st, ready: isAssetGroupReady(g), total: s.total, loaded: s.loaded, failed: s.failed, pending: s.pending, criticalFailed: s.criticalFailed };
  });
  console.log('[AssetPreload] 目前關卡 ' + (lv.stageId || '?') + ' 需要群組：' + getAssetGroupsForLevel(currentLevelIndex).join(' + '));
  try { console.table(rows); } catch (e) { console.log(rows); }
  const sources = {};
  Object.values(ASSET_REGISTRY).forEach(r => { if (r.source) sources[r.source] = (sources[r.source] || 0) + 1; });
  console.log('[AssetPreload] 實際成功來源統計：', sources, '　待套用（下次關卡開始）：', ASSET_PENDING_APPLIES.length);
  return rows;
}
if (typeof window !== 'undefined') {
  Object.assign(window, { debugAssetPreload, debugAssetGroup, preloadAssetGroup, ensureAssetsForStage, getAssetStatus, isAssetGroupReady });
}

// ── Game loop ─────────────────────────────────
// v0.3.57：固定時間步長（fixed timestep）— 遊戲邏輯一律以 1/60 秒為一步推進：
//   很多系統（鏡頭前進、敵人移動、攻擊冷卻、無敵時間、受傷閃爍、投射物…）原本是「每幀 +固定值」，
//   在 90 / 120Hz 螢幕上會變快 1.5～2 倍。改成依真實經過時間累積，每滿 16.67ms 才跑一次 update(1, 16.667)，
//   60 / 90 / 120Hz 裝置的遊戲速度完全一致。回到前景時最多補 5 步（約 83ms），避免 dt 太大造成瞬移。
const FIXED_STEP_MS = 1000 / 60;
const FIXED_MAX_STEPS = 5;
let fixedStepAccumulator = 0;
let fixedStepCount = 0; // debug：累計邏輯步數
function loop(timestamp) {
  const rawDelta = lastTime ? (timestamp - lastTime) : FIXED_STEP_MS;
  lastTime   = timestamp;
  try { sfxSyncFrame(); } catch (e) {} // v0.3.64：循環音效跟著目前狀態開 / 關

  // v0.3.12-test-2：核心素材尚未就緒時，只繪製等待畫面，不跑 update/draw，
  // 避免 hero / 蠍子在幾何 fallback 與正式圖片之間閃爍
  if (!isAdventureCoreArtReady()) {
    // v0.3.51：開機載入中 → 畫 loading 畫面（進度條 / 百分比 / 檔名 / tips），HTML overlay 同時顯示
    drawLoadingScreen(getAssetGateProgress());
    requestAnimationFrame(loop);
    return;
  }
  if (false) {
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
    // v0.3.18-fix-5：顯示正在等待哪些素材
    const waiting = [];
    const heroOk = CORE_ART_KEYS.every(k => { const img = adventureImages[k]; return img && img.complete && img.naturalWidth > 0; });
    if (!heroOk)                    waiting.push('小V');
    if (!isScorpionCoreArtReady()) waiting.push('氣球蠍子');
    if (!isOrangeCoreArtReady())   waiting.push('橘子怪');
    const waitTxt = waiting.length ? '素材準備中：' + waiting.join('、') : '素材準備中…';
    ctx.fillText(waitTxt + ' (' + elapsed + 's)', CANVAS_W / 2, CANVAS_H / 2 + 28);
    if (elapsed >= 12) {
      ctx.fillStyle = 'rgba(255,200,100,0.8)';
      ctx.fillText('素材讀取比較久，請稍等…', CANVAS_W / 2, CANVAS_H / 2 + 52);
    }
    requestAnimationFrame(loop);
    return;
  }

  fixedStepAccumulator += Math.max(0, Math.min(rawDelta, 250));
  let steps = 0;
  // 容許 1ms 誤差：60Hz 螢幕的 rAF 間隔在 16.6～16.8ms 之間跳動，不會出現「這幀 0 步、下幀 2 步」的抖動
  while (fixedStepAccumulator >= FIXED_STEP_MS - 1 && steps < FIXED_MAX_STEPS) {
    // v0.3.57：手機「開始冒險」之前不推進遊戲（不扣時間、鏡頭不前進、敵人不動、不會受傷）
    if (!screenFreezeForTest && !isGameStartGateActive() && !(typeof advIsBlockingGame === 'function' && advIsBlockingGame())) update(1, FIXED_STEP_MS); // 測試版 F8 凍結時跳過 update
    fixedStepAccumulator -= FIXED_STEP_MS;
    steps++; fixedStepCount++;
  }
  if (steps >= FIXED_MAX_STEPS) fixedStepAccumulator = 0; // 落後太多（切回前景 / 卡頓）→ 直接丟掉，不追趕
  // 有推進邏輯才重畫（畫面內也有依幀推進的動畫計時，120Hz 不會因為多畫一次而變快）
  if (steps > 0) draw();

  requestAnimationFrame(loop);
}
if (typeof window !== 'undefined') window.debugTiming = () => { const o = { fixedStepMs: FIXED_STEP_MS, steps: fixedStepCount, accumulator: fixedStepAccumulator, startGate: isGameStartGateActive(), gameState }; console.log('[Timing]', o); return o; };


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
// v0.3.51：開機只載 common + chapter1（第二章 / Boss 素材留到進關前才載）
//   原本的 initAdventureHeroArt / initScorpion* / initHammerAttackArt / initOrangeEnemyArt / initChimney* / initDualOrangeArt /
//   initProjectileOrangeArt / initOrangeKingBossArt / initChapter2BgArt / initAdventureItemIcons 不再於開機時呼叫，
//   全部改由 asset manifest + preloadAssetGroup() 控制；載好的圖片會放進原本的快取，原有的 getXXXImg() 照常使用

// ════════════════════════════════════════════════════════════════════
//  RPG 對話系統 v1.0（第一輪整合測試）
//  ──────────────────────────────────────────────────────────────────
//  ・只負責：對話演出、觀看紀錄、顯示模式；所有獎勵 / 損失仍由原本遊戲邏輯處理（RPG 不改背包、配方、V幣）
//  ・完整對話時用 gameState = 'paused'（不顯示暫停選單，與「發現重要物品」視窗同一招）→ 玩法、怪物、物理、時間、鏡頭全部停住
//  ・資料：localStorage「balloonV_adventureRpg_v1__<playerKey>」（只新增這個 key，不改 playerKey 產生方式）
//  ・顯示模式：full 完整提示 / first 僅首次顯示（預設）/ off 全部關閉
// ════════════════════════════════════════════════════════════════════
const RPG_DATA_VERSION = 2; // v0.3.61：v1 → v2（加入 notes / story；舊 seen 保留）
const RPG_LS_PREFIX = 'balloonV_adventureRpg_v1__';
const RPG_TEXT_CPS = 40;          // 逐字速度：每秒 40 個字（規格 35～45）
const RPG_HISTORY_MAX = 60;
const RPG_ASSETS = {
  balloonv_thinking:  'assets/adventure/rpg/portraits/balloonv/balloonv_thinking.png',
  balloonv_surprised: 'assets/adventure/rpg/portraits/balloonv/balloonv_surprised.png',
  balloonv_shocked:   'assets/adventure/rpg/portraits/balloonv/balloonv_shocked.png',
  balloonv_confused:  'assets/adventure/rpg/portraits/balloonv/balloonv_confused.png',
  balloonv_happy:     'assets/adventure/rpg/portraits/balloonv/balloonv_happy.png',
  star_spirit_normal: 'assets/adventure/rpg/portraits/star-spirit/star_spirit_normal.png',
  star_spirit_angry:  'assets/adventure/rpg/portraits/star-spirit/star_spirit_angry.png',
  dog_treasure_alert: 'assets/adventure/rpg/portraits/dog/dog_treasure_alert.png',
  balloon_recipe_book:'assets/adventure/rpg/objects/balloon_recipe_book.png',
  // v0.3.61：正式 RPG 立繪（使用者已上傳）
  balloonv_angry:     'assets/adventure/rpg/portraits/balloonv/balloonv_angry.png',
  balloonv_heroic:    'assets/adventure/rpg/portraits/balloonv/balloonv_heroic.png',
  orange_king_taunt:  'assets/adventure/rpg/portraits/boss/orange_king_taunt.png',
  orange_king_angry:  'assets/adventure/rpg/portraits/boss/orange_king_angry.png',
  orange_king_weakness_note: 'assets/adventure/rpg/objects/orange_king_weakness_note.png',
};
// v0.3.62：Boss 對話立繪專用比例（960×540 畫面座標）— size 立繪方框邊長、right / bottom 與畫面右下的距離（負數 = 超出畫面、被安全裁切）
//   taunt：巨大、囂張；angry：更近、更有壓迫感。腳部藏到對話框後面，優先看到王冠、臉、白鬍子、拳頭、裝甲與油管炮
const RPG_BOSS_PORTRAIT = {
  // v0.3.63：再放大；立繪頂端對齊方框頂端，下半身由畫面下緣裁掉（王冠 / 臉 / 白鬍子 / 拳頭 / 油管保留）
  // v0.3.64：大小不變，只往上移（taunt 上移 55、angry 上移 70，960×540 座標）讓王冠 / 臉 / 白鬍子 / 拳頭 / 油管露在對話框上方
  orange_king_taunt: { size: 640, right: -80, bottom: -45 },
  orange_king_angry: { size: 660, right: -100, bottom: -50 },
};
// v0.3.61：GitHub 上目前的檔名是 balloonv_angry.png.png（多了一個 .png）→ 先試正確檔名，找不到再試這個；改名後自動用正確檔名
const RPG_ASSET_ALT_PATHS = { balloonv_angry: ['assets/adventure/rpg/portraits/balloonv/balloonv_angry.png.png'] };
const RPG_EXTERNAL_ASSET_KEYS = []; // 由其他素材群組載入的立繪（目前沒有）
// v0.3.61：RPG 立繪改成「一張一張依序載入」（手機上 13 張同時下載容易逾時失敗），常用的先載；每個來源最多等 30 秒
const RPG_ASSET_LOAD_ORDER = ['balloonv_surprised', 'balloonv_thinking', 'balloonv_shocked', 'balloonv_confused', 'balloonv_happy', 'dog_treasure_alert',
  'balloon_recipe_book', 'star_spirit_angry', 'orange_king_weakness_note', 'balloonv_angry', 'balloonv_heroic', 'orange_king_taunt', 'orange_king_angry'];
const RPG_ASSET_TIMEOUT_MS = 30000;
const RPG_ASSET_MAX_RETRY = 2;
const RPG_BOOT_ASSET_KEYS = ['star_spirit_normal']; // 1-1 一開場就要用 → 跟開機一起載；其他立繪開機後在背景載
const rpgImgs = {}, rpgImgStatus = {};
// dog_treasure_alert.png 鼻子位置（量自原圖 1254×1254：粉紅鼻子中心 x 262, y 433）
const RPG_DOG_NOSE = { x: 262 / 1254, y: 433 / 1254 };
const RPG_SPEAKERS = {
  balloonv: { name: '小V',     side: 'left'  },
  spirit:   { name: '星靈',    side: 'right' },
  dog:      { name: '氣球小狗', side: 'right' },
  book:     { name: '氣球秘笈', side: 'right' },
  king:     { name: '橘子王',   side: 'right' },
  note:     { name: '',         side: 'right' },
};
// 003：武器碰到天敵爆裂 — 依「危險類型」區分首次教學（不依劍 / 槌區分）
//   name / danger 只填目前規格已確認的內容；其他危險類型請先確認台詞再加入
const RPG_POP_TARGETS = {
  orangeOil: { name: '橘子怪', danger: '橘子皮的油' },
};
// 007：秘笈台詞依配方區分（同一張書本圖）；沒有確認台詞的配方不播 RPG，維持原本通知
// v0.3.62：判斷「現在是不是用手機觸控按鈕在玩」— 看手機操作鍵是否真的顯示在畫面上（不只看螢幕寬度）
function rpgIsTouchControlsShown() {
  try {
    const mc = document.getElementById('mobile-controls'), b = document.getElementById('btn-switch-weapon');
    if (!mc || !b) return false;
    if (getComputedStyle(mc).display === 'none' || getComputedStyle(b).display === 'none' || getComputedStyle(b).visibility === 'hidden') return false;
    const r = b.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  } catch (e) { return false; }
}
const RPG_RECIPE_LINES = {
  basicHammer: [
    { sp: 'balloonv', face: 'balloonv_surprised', text: '咦？！這裡又藏著一本{g:氣球秘笈}！' },
    { sp: 'balloonv', face: 'balloonv_thinking',  text: '原來是{g:氣球槌}的製作秘笈啊！' },
    // 第三頁依操作方式：電腦鍵盤 / 手機觸控（手機時圈出真正的換武器鍵）
    { sp: 'balloonv', face: 'balloonv_happy', text: () => rpgIsTouchControlsShown() ? '原來按這裡就能使用槌子了!' : '原來做出來後按2就能使用槌子了!', focusSwitchBtn: true },
  ],
  balloonLollipop: [
    { sp: 'balloonv', face: 'balloonv_happy',    text: '咦？！這裡竟然藏著一本{g:氣球秘笈}！' },
    { sp: 'balloonv', face: 'balloonv_thinking', text: '太好了，現在我能用{g:260氣球}做{g:棒棒糖}了！' },
    { sp: 'balloonv', face: 'balloonv_happy',    text: '它的功用是……做出來就能馬上吃掉，{b:恢復0.5點HP}！' }, // v0.3.60：第三頁改開心
  ],
};
// 008：資源寶箱的簡短反應（未來不同資源可對應不同台詞）
const RPG_CHEST_LINES = {
  goldChest: [{ sp: 'balloonv', face: 'balloonv_happy', text: '哇！！找到金幣寶箱！！' }],
};
// ── v0.3.60：可調整的台詞資料（集中在這裡，之後換正式台詞只改這一段）──
const RPG_TEXT = {
  dogWoofTreasure: '汪！汪汪！',
  dogWoofCrafted:  '汪！汪汪～！',
  dogWoofDepart:   '汪！汪汪～！',
  // v0.3.62：正式台詞（氣球會消氣，請好好珍惜）
  dogLeft: [
    '小V！你有沒有發現，氣球小狗不見了？',
    '氣球很有趣，但它會{b:消氣}，請好好珍惜！',
    '這次我先提醒你，以後要自己注意狗狗還在不在身邊喔！',
  ],
  // 本輪暫用教學文字（使用者指定，之後可再調整）
  hammerCrafted: [
    '小V！你做出氣球槌了耶！',
    '{g:氣球槌}不只能攻擊，還可以把氣球蠍子{b:打飛}喔！',
  ],
  goldenRing: [
    '小V！{g:金色油管環}的力量能讓你的氣球劍變成{g:王權劍}！不過{r:其他氣球武器}可沒有這種保護喔！',
  ],
  // v0.3.61：橘子王登場互嗆「正式台詞」（使用者定稿，不可自行修改）— 每頁一位角色、對應立繪
  bossTaunt: [
    { sp: 'king',     face: 'orange_king_taunt', text: '哼哼！又來一個拿氣球當武器的傢伙！' },
    { sp: 'balloonv', face: 'balloonv_angry',    text: '喂！你不要小看氣球啊！' },
    { sp: 'king',     face: 'orange_king_angry', text: '哈哈哈！你的氣球碰到我的橘子油，可是會直接爆掉的！' },
    { sp: 'balloonv', face: 'balloonv_heroic',   text: '那我就想辦法，讓你知道氣球的厲害！' },
  ],
  // v0.3.62：2-3 觀察筆記 — 先發現（一句）→ 中央展示 → 讀完的反應（兩句）
  kingNoteFind: [
    { sp: 'balloonv', face: 'balloonv_surprised', text: '咦！？這是什麼？' },
  ],
  kingNoteReaction: [
    { sp: 'balloonv', face: 'balloonv_thinking',  text: '原來如此……他的攻擊似乎都{b:有跡可循}！' },
    { sp: 'balloonv', face: 'balloonv_happy',     text: '太好了！這些情報說不定能派上用場！' },
  ],
};
// 場景定義：pages = [{ sp, face, text, left?, right? }]；left / right 指定當頁兩側要顯示的立繪（沿用到下一頁）
function rpgBuildScene(id, extra) {
  const S = {
    'rpg001_stage11_intro': { title: '1-1 開場：星靈', modeControlled: true, saveHistory: true, left: null, right: 'star_spirit_normal', pages: [
      { sp: 'spirit', face: 'star_spirit_normal', text: '小V，你背包裡有一把{g:氣球劍}！' },
      { sp: 'spirit', face: 'star_spirit_normal', text: '在派對島的世界裡，{g:氣球武器}可是能拿來攻擊的喔！' },
      { sp: 'spirit', face: 'star_spirit_normal', text: '不過，{b:氣球本身的特性}還是存在，所以使用的時候要多注意喔！' },
      // v0.3.62：介紹一開始就有的氣球小狗
      { sp: 'spirit', face: 'star_spirit_normal', text: '對了！你還有一隻{g:氣球小狗}喔！之後可以帶牠一起冒險！' },
      { sp: 'spirit', face: 'star_spirit_normal', text: '有牠陪伴，每次通關都能{b:恢復 0.5 點 HP}，還能幫你發現{g:隱藏的寶物}！' } ] },
    'rpg002_first_spike': { title: '第一次看到尖刺', modeControlled: true, saveHistory: true, left: 'balloonv_surprised', right: null, pages: [
      { sp: 'balloonv', face: 'balloonv_surprised', text: '哇！前面有{r:尖刺}耶！' },
      { sp: 'balloonv', face: 'balloonv_thinking',  text: '嗯……氣球武器應該{r:沒辦法破壞}它……' },
      { sp: 'balloonv', face: 'balloonv_thinking',  text: '看來只能{b:小心跳過去}了！' } ] },
    'rpg004_first_scorpion': { title: '第一次看到蠍子', modeControlled: true, saveHistory: true, left: 'balloonv_surprised', right: null, pages: [
      { sp: 'balloonv', face: 'balloonv_surprised', text: '咦！？前面有一隻氣球蠍子！' },
      { sp: 'balloonv', face: 'balloonv_thinking',  text: '它也是氣球做的……不知道我的氣球劍能不能對付它？' } ] },
    'rpg005_first_orange': { title: '第一次看到橘子怪', modeControlled: true, saveHistory: true, left: 'balloonv_surprised', right: null, pages: [
      { sp: 'balloonv', face: 'balloonv_surprised', text: '咦！？前面竟然有橘子怪！' },
      { sp: 'balloonv', face: 'balloonv_thinking',  text: '等等……{r:橘子皮的油}會讓氣球破掉！' },
      { sp: 'balloonv', face: 'balloonv_thinking',  text: '那我的氣球武器可不能隨便碰到牠……得想辦法{b:繞過去}才行！' } ] },
    'rpg006a_dog_treasure': { title: '小狗尋寶', modeControlled: true, saveHistory: true, left: 'balloonv_confused', right: 'dog_treasure_alert', dogAlert: true, pages: [
      { sp: 'balloonv', face: 'balloonv_confused', text: '咦？怎麼了？你的鼻子好像在發光耶！' },
      { sp: 'balloonv', face: 'balloonv_confused', text: '難道……附近藏著什麼寶物嗎？' } ] },
  };
  // ── v0.3.60 新增 ──
  Object.assign(S, {
    // 006B：之後每次重新感應寶物 → 一樣用完整對話框，只有狗狗一頁，點一下就關（不受顯示模式限制、不寫歷史）
    'rpg006b_dog_woof': { title: '小狗尋寶提醒', modeControlled: false, saveHistory: false, repeatable: true, oneClick: true, left: null, right: 'dog_treasure_alert', dogAlert: true, pages: [
      { sp: 'dog', face: 'dog_treasure_alert', text: RPG_TEXT.dogWoofTreasure } ] },
    // 成功製作氣球小狗（每次真的做出來都播；愛心、不發光；點一下就關）
    // v0.3.62：真的帶狗出發、冒險開始時 — 狗狗汪汪＋小肉球上飄（不發光；不受顯示模式限制；不寫歷史 / 筆記）
    'rpg018_dog_depart': { title: '帶氣球小狗出發', modeControlled: false, saveHistory: false, repeatable: true, oneClick: true, left: null, right: 'dog_treasure_alert', dogPaw: true, pages: [
      { sp: 'dog', face: 'dog_treasure_alert', text: RPG_TEXT.dogWoofDepart } ] },
    'rpg012_dog_crafted': { title: '氣球小狗做好了', modeControlled: false, saveHistory: false, repeatable: true, oneClick: true, left: null, right: 'dog_treasure_alert', dogHeart: true, pages: [
      { sp: 'dog', face: 'dog_treasure_alert', text: RPG_TEXT.dogWoofCrafted } ] },
    // 狗狗陪伴次數用完、消氣 → 星靈一生只提醒一次（顯示模式「全部關閉」也會提醒）（事件 ID 沿用，保護舊觀看紀錄）
    'rpg010_dog_left': { title: '氣球小狗消氣了', policy: 'oncePerPlayer', saveHistory: true, left: null, right: 'star_spirit_normal', pages: RPG_TEXT.dogLeft.map(t => ({ sp: 'spirit', face: 'star_spirit_normal', text: t })) },
    // 1-2：真的做出氣球槌（一般教學，三段模式）
    'rpg011_hammer_crafted': { title: '做出氣球槌', modeControlled: true, saveHistory: true, left: null, right: 'star_spirit_normal', pages: RPG_TEXT.hammerCrafted.map(t => ({ sp: 'spirit', face: 'star_spirit_normal', text: t })) },
    // 2-4：撿到金色油管環、變成王權劍之後（一般教學，三段模式）
    'rpg013_golden_ring': { title: '金色油管環', modeControlled: true, saveHistory: true, left: null, right: 'star_spirit_normal', pages: RPG_TEXT.goldenRing.map(t => ({ sp: 'spirit', face: 'star_spirit_normal', text: t })) },
    // 2-4：橘子王登場互嗆（DRAFT 台詞；重要 Boss 登場：僅首次 = 一生一次、完整提示 = 每次開啟網頁一次、全部關閉 = 不播）
    'rpg014_boss_taunt': { title: '橘子王登場', policy: 'bossIntro', saveHistory: true, left: null /* v0.3.63：第一句只有橘子王 */, right: 'orange_king_taunt', pages: RPG_TEXT.bossTaunt.map(l => Object.assign({}, l)) },
    // v0.3.61：2-3 橘子王觀察筆記 — 畫面正中央展示（必要的發現演出，不受顯示模式限制）→ 接著小V反應
    'rpg016_king_note_show': { title: '橘子王觀察筆記', modeControlled: false, saveHistory: false, repeatable: true, oneClick: true, showcase: 'orange_king_weakness_note', next: 'rpg017_king_note_reaction', pages: [
      { sp: 'note', face: 'orange_king_weakness_note', text: '' } ] },
    'rpg019_king_note_find': { title: '咦！？這是什麼？', modeControlled: true, saveHistory: true, left: 'balloonv_surprised', right: null, next: 'rpg016_king_note_show', pages: RPG_TEXT.kingNoteFind.map(l => Object.assign({}, l)) },
    'rpg017_king_note_reaction': { title: '讀完橘子王觀察筆記', modeControlled: true, saveHistory: true, left: 'balloonv_thinking', right: null, pages: RPG_TEXT.kingNoteReaction.map(l => Object.assign({}, l)) },
  });
  if (S[id]) return Object.assign({ id }, S[id]);
  if (id.startsWith('rpg003_weapon_pop:')) {
    const key = id.split(':')[1]; const t = RPG_POP_TARGETS[key]; if (!t) return null;
    return { id, title: '武器爆了：' + t.name, modeControlled: true, saveHistory: true, left: 'balloonv_shocked', right: null, pages: [
      { sp: 'balloonv', face: 'balloonv_shocked', text: '啊啊啊！！！我的武器爆了！' },
      { sp: 'spirit', face: 'star_spirit_angry', right: 'star_spirit_angry', text: '你怎麼認為可以攻擊' + t.name + '？！它的' + t.danger + '會把氣球弄爆啊！！' } ] };
  }
  if (id.startsWith('rpg007_recipe:')) {
    const key = id.split(':')[1]; const lines = RPG_RECIPE_LINES[key]; if (!lines) return null;
    return { id, title: '發現秘笈：' + ((extra && extra.recipeName) || key), modeControlled: true, saveHistory: true, left: lines[0].face, right: 'balloon_recipe_book', pages: lines.map(l => Object.assign({}, l)) };
  }
  if (id.startsWith('rpg008_chest:')) {
    const key = id.split(':')[1]; const lines = RPG_CHEST_LINES[key]; if (!lines) return null;
    // 簡短獲得反應：不受顯示模式限制、不寫入歷史、不用「已看過」旗標
    return { id, title: '寶箱', modeControlled: false, saveHistory: false, left: lines[0].face, right: null, pages: lines.map(l => Object.assign({}, l)) };
  }
  return null;
}

// ── 存檔（版本化；依 playerKey 分開）──
function rpgPlayerKey() { try { return (getPlayerIdentityForResult() || {}).playerKey || 'guest'; } catch (e) { return 'guest'; } }
function rpgStorageKey() { return RPG_LS_PREFIX + rpgPlayerKey(); }
let rpgDataCache = null, rpgDataCacheKey = null;
function rpgLoad() {
  const k = rpgStorageKey();
  if (rpgDataCache && rpgDataCacheKey === k) return rpgDataCache;
  let d = null;
  try { d = JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { d = null; }
  if (!d || typeof d !== 'object' || (d.v !== 1 && d.v !== 2)) d = { v: RPG_DATA_VERSION, mode: 'first', seen: {}, notes: {}, story: {}, history: [] };
  if (!['full', 'first', 'off'].includes(d.mode)) d.mode = 'first';
  d.seen = d.seen || {}; d.history = Array.isArray(d.history) ? d.history : [];
  d.notes = d.notes || {}; d.story = d.story || {};
  if (d.v === 1) { rpgMigrateV1(d); }                // v0.3.61：舊資料非破壞性轉換（只做一次）
  rpgDataCache = d; rpgDataCacheKey = k;
  if (d.__migrated) { delete d.__migrated; try { localStorage.setItem(k, JSON.stringify(d)); } catch (e) {} }
  return d;
}
// ── v0.3.61：冒險提示筆記（知識項目每種最多一筆）＋ 劇情紀錄（每段最多一筆）──
//   notes[noteId] = { id, title, summary, firstAt, sourceEventId, stageId, category: 'tip' }
//   story[eventId] = { id, title, firstAt, stageId, lines: [{ speaker, text }] }
const RPG_NOTE_DEFS = {
  balloonWeapon: { title: '氣球武器', summary: '在派對島，氣球武器可以用來攻擊；但氣球本身的特性還在，使用時要多注意。', from: ['rpg001_stage11_intro'] },
  spike:         { title: '尖刺', summary: '氣球武器沒辦法破壞尖刺，只能小心跳過去。', from: ['rpg002_first_spike'] },
  orangeOil:     { title: '橘子怪', summary: '橘子皮的油會讓氣球破掉，氣球武器不要隨便碰到牠，想辦法繞過去。', from: ['rpg005_first_orange'] },
  dogNose:       { title: '氣球小狗尋寶', summary: '帶氣球小狗出發時，牠的鼻子會發光提醒附近藏著寶物；越靠近越亮。', from: ['rpg006a_dog_treasure'] },
  lollipop:      { title: '氣球棒棒糖', summary: '用 260 氣球製作，做出來就馬上吃掉，恢復 0.5 點 HP。', from: ['rpg007_recipe:balloonLollipop'] },
  dogTurns:      { title: '氣球小狗會消氣', summary: '氣球小狗會隨著冒險逐漸耗損、消氣。要留意陪伴次數，好好珍惜牠！', from: ['rpg010_dog_left'] },
  dogStart:      { title: '氣球小狗', summary: '你一開始就有一隻氣球小狗，可以帶牠一起冒險；有牠陪伴，每次通關都能恢復 0.5 點 HP，還能幫你發現隱藏的寶物。', from: ['rpg001_stage11_intro'] },
  hammerSwitch:  { title: '使用氣球槌', summary: '找到氣球槌秘笈、做出氣球槌後：電腦按 2，手機按換武器鍵（🔁），就能切換成槌子。', from: ['rpg007_recipe:basicHammer'] },
  hammer:        { title: '氣球槌', summary: '氣球槌不只能攻擊，還可以把氣球蠍子打飛。', from: ['rpg011_hammer_crafted'] },
  royalSword:    { title: '王權劍', summary: '金色油管環的力量能讓氣球劍變成王權劍；其他氣球武器（例如氣球槌）沒有這種保護。', from: ['rpg013_golden_ring'] },
  popOrangeOil:  { title: '武器碰到橘子怪', summary: '橘子怪的橘子皮油會把氣球武器弄爆。', from: ['rpg003_weapon_pop:orangeOil'] },
};
const RPG_STORY_EVENTS = ['rpg014_boss_taunt', 'rpg019_king_note_find', 'rpg017_king_note_reaction']; // 純劇情 / 反應：只留劇情紀錄，不算玩法知識
function rpgNoteIdsForEvent(eventId) { return Object.keys(RPG_NOTE_DEFS).filter(k => RPG_NOTE_DEFS[k].from.includes(eventId)); }
function rpgNoteIdForEvent(eventId) { return rpgNoteIdsForEvent(eventId)[0] || null; }
function rpgGrantNote(eventId, at, stageId) {
  const d = rpgLoad(); let changed = false;
  rpgNoteIdsForEvent(eventId).forEach(nid => {
    if (d.notes[nid]) return;
    const def = RPG_NOTE_DEFS[nid];
    d.notes[nid] = { id: nid, title: def.title, summary: def.summary, firstAt: at || Date.now(), sourceEventId: eventId, stageId: stageId || '', category: 'tip' };
    changed = true;
  });
  return changed;
}
function rpgLearnFromScene(scene, how) {
  const d = rpgLoad(); const now = Date.now(); const sid = (LEVELS[currentLevelIndex] || {}).stageId || '';
  let changed = rpgGrantNote(scene.id, now, sid);
  if (RPG_STORY_EVENTS.includes(scene.id) && !d.story[scene.id]) {
    d.story[scene.id] = { id: scene.id, title: scene.title || scene.id, firstAt: now, stageId: sid,
      lines: scene.pages.map(p => ({ speaker: RPG_SPEAKERS[p.sp].name, text: rpgPlainText(rpgPageText(p)) })) };
    changed = true;
  }
  if (changed) rpgSave();
}
function rpgMigrateV1(d) {
  // seen（看過 / 略過）＋ 舊 history → 轉成知識筆記與劇情紀錄；舊 history 依事件去重後保留，不刪任何已看過狀態
  const firstAt = {};
  d.history.forEach(h => { if (h && h.id && (!firstAt[h.id] || h.at < firstAt[h.id].at)) firstAt[h.id] = h; });
  Object.keys(d.seen).forEach(id => rpgGrantNoteRaw(d, id, (firstAt[id] && firstAt[id].at) || d.seen[id].firstAt, firstAt[id] && firstAt[id].stageId));
  Object.values(firstAt).forEach(h => {
    rpgGrantNoteRaw(d, h.id, h.at, h.stageId);
    if (RPG_STORY_EVENTS.includes(h.id) && !d.story[h.id]) d.story[h.id] = { id: h.id, title: h.title || h.id, firstAt: h.at, stageId: h.stageId || '', lines: h.lines || [] };
  });
  d.history = Object.values(firstAt).sort((a, b) => a.at - b.at); // 去重：每個事件只留第一次
  d.v = 2; d.__migrated = true;
}
function rpgGrantNoteRaw(d, eventId, at, stageId) {
  rpgNoteIdsForEvent(eventId).forEach(nid => {
    if (d.notes[nid]) return;
    const def = RPG_NOTE_DEFS[nid];
    d.notes[nid] = { id: nid, title: def.title, summary: def.summary, firstAt: at || Date.now(), sourceEventId: eventId, stageId: stageId || '', category: 'tip' };
  });
}
// 重點字標示：{g:金色道具} {r:紅色危險} {b:藍色提示}（逐字速度照算可見字數；用 DOM 文字節點，不用 innerHTML）
function rpgParseMarkup(text) {
  const out = []; const re = /\{([grb]):([^}]*)\}/g; let last = 0, m;
  const str = String(text || '');
  while ((m = re.exec(str))) {
    if (m.index > last) out.push({ cls: '', chars: Array.from(str.slice(last, m.index)) });
    out.push({ cls: 'rpg-hl-' + m[1], chars: Array.from(m[2]) });
    last = re.lastIndex;
  }
  if (last < str.length) out.push({ cls: '', chars: Array.from(str.slice(last)) });
  return out;
}
function rpgPageText(p) { return (p && typeof p.text === 'function') ? p.text() : (p ? p.text : ''); }
// v0.3.62：在對話上層圈出真正的按鈕（量按鈕當下的實際畫面位置；複製外觀，不會真的觸發按鈕功能）
let rpgFocusBtnId = null;
function rpgSetButtonFocus(btnId) {
  const ov = document.getElementById('rpg-overlay'); if (!ov) return;
  let el = ov.querySelector('.rpg-btnfocus');
  rpgFocusBtnId = btnId || null;
  if (!btnId) { if (el) el.style.display = 'none'; return; }
  const btn = document.getElementById(btnId); if (!btn) return;
  if (!el) {
    el = document.createElement('div'); el.className = 'rpg-btnfocus';
    el.innerHTML = '<div class="rpg-btnfocus-glow"></div><div class="rpg-btnfocus-clone"></div><div class="rpg-btnfocus-arrow">▼</div>';
    ov.appendChild(el);
  }
  const holder = el.querySelector('.rpg-btnfocus-clone');
  while (holder.firstChild) holder.removeChild(holder.firstChild);
  const cl = btn.cloneNode(true); cl.removeAttribute('id'); cl.removeAttribute('onclick'); cl.tabIndex = -1; cl.setAttribute('aria-hidden', 'true');
  holder.appendChild(cl);
  rpgPositionButtonFocus();
  el.style.display = 'block';
}
function rpgPositionButtonFocus() {
  if (!rpgFocusBtnId) return;
  const ov = document.getElementById('rpg-overlay'); const btn = document.getElementById(rpgFocusBtnId);
  const el = ov && ov.querySelector('.rpg-btnfocus'); if (!el || !btn) return;
  const r = btn.getBoundingClientRect(), o = ov.getBoundingClientRect();
  el.style.left = (r.left - o.left) + 'px'; el.style.top = (r.top - o.top) + 'px';
  el.style.width = r.width + 'px'; el.style.height = r.height + 'px';
  const cl = el.querySelector('.rpg-btnfocus-clone > *'); if (cl) { cl.style.width = r.width + 'px'; cl.style.height = r.height + 'px'; cl.style.margin = '0'; }
}
if (typeof window !== 'undefined') ['resize', 'orientationchange', 'fullscreenchange'].forEach(ev => (ev === 'fullscreenchange' ? document : window).addEventListener(ev, () => setTimeout(() => { try { rpgPositionButtonFocus(); } catch (e) {} }, 120)));
function rpgPlainText(text) { return String(text || '').replace(/\{[grb]:([^}]*)\}/g, '$1'); }
function rpgRenderMarkup(el, segs, n) {
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
  let left = n;
  for (const sg of segs) {
    if (left <= 0) break;
    const t = sg.chars.slice(0, left).join(''); left -= sg.chars.length;
    if (!sg.cls) el.appendChild(document.createTextNode(t));
    else { const sp = document.createElement('span'); sp.className = sg.cls; sp.textContent = t; el.appendChild(sp); }
  }
}
// 「重新開始測試」：只清目前 playerKey 的 RPG 觀看紀錄 / 筆記 / 佇列；保留顯示模式與其他玩家資料
function rpgResetForTest() {
  const d = rpgLoad();
  d.seen = {}; d.notes = {}; d.story = {}; d.history = [];
  rpgSave();
  rpgSessionShown.clear();
  rpgQueue = []; rpgUiQueue = [];
  rpgAttempt = { shown: new Set(), queued: new Set(), dogInRange: false };
  if (rpgActive) rpgClose('reset');
  console.log('[RPG] 測試重置：已清除 ' + rpgStorageKey() + ' 的觀看紀錄與提示筆記（顯示模式保留：' + d.mode + '）');
}
function rpgSave() { try { localStorage.setItem(rpgStorageKey(), JSON.stringify(rpgLoad())); } catch (e) { console.warn('[RPG] 存檔失敗', e.message); } }
function rpgGetMode() { return rpgLoad().mode; }
function rpgSetMode(m) { if (!['full', 'first', 'off'].includes(m)) return; rpgLoad().mode = m; rpgSave(); rpgRefreshModeButton(); console.log('[RPG] 顯示模式 →', m); }
const RPG_MODE_LABEL = { full: '完整提示', first: '僅首次顯示', off: '全部關閉' };
function rpgCycleMode() { const order = ['first', 'full', 'off']; const m = rpgGetMode(); rpgSetMode(order[(order.indexOf(m) + 1) % order.length]); }
function rpgRefreshModeButton() { const b = document.getElementById('btn-pause-rpg-mode'); if (b) b.textContent = '💬 目前模式：' + RPG_MODE_LABEL[rpgGetMode()] + ' ⇄'; } // v0.3.60：顯示「目前」狀態
function rpgIsSeen(id) { return !!rpgLoad().seen[id]; }
function rpgMarkSeen(id, how) {
  const d = rpgLoad(); const now = Date.now();
  const s = d.seen[id] || { firstAt: now, count: 0 };
  s.lastAt = now; s.count = (s.count || 0) + 1; s.how = how;
  d.seen[id] = s; rpgSave();
}
function rpgPushHistory(scene, how, pagesViewed) { // v0.3.61 起不再呼叫（保留給舊程式相容）
  const d = rpgLoad();
  d.history.push({ id: scene.id, title: scene.title || scene.id, at: Date.now(), stageId: (LEVELS[currentLevelIndex] || {}).stageId || '', how,
    lines: scene.pages.slice(0, Math.max(1, pagesViewed)).map(p => ({ speaker: RPG_SPEAKERS[p.sp].name, text: p.text })) });
  if (d.history.length > RPG_HISTORY_MAX) d.history.splice(0, d.history.length - RPG_HISTORY_MAX);
  rpgSave();
}

// ── 本次關卡嘗試的狀態（restart() 重設）──
let rpgAttempt = { shown: new Set(), queued: new Set(), dogInRange: false };
let rpgQueue = [];      // [{ scene, valid: () => bool, at }]
let rpgActive = null;   // 目前開著的場景
let rpgPauseAfterClose = false;
function rpgOnAttemptStart() {
  if (rpgActive) rpgClose('reset');
  rpgAttempt = { shown: new Set(), queued: new Set(), dogInRange: false };
  rpgQueue = [];
  rpgHideDogFloat(true);
}
function rpgIsActive() { return !!rpgActive; }
const rpgSessionShown = new Set(); // 本次開啟網頁已播過的場景（Boss 登場「完整提示」用）
function rpgShouldShowScene(scene) {
  if (!scene) return false;
  if (scene.policy === 'oncePerPlayer') return !rpgIsSeen(scene.id);              // 一生一次，不受顯示模式影響
  if (scene.showcase) return true;                                                 // v0.3.61：必要的發現展示（例如觀察筆記）
  if (scene.policy === 'bossIntro') {
    const m = rpgGetMode();
    if (m === 'off') return false;
    if (m === 'first') return !rpgIsSeen(scene.id);
    return !rpgSessionShown.has(scene.id);                                          // 完整提示：每次開網頁一次，死亡重試不強制重播
  }
  if (!scene.modeControlled) return true;
  const m = rpgGetMode();
  if (m === 'off') return false;
  if (m === 'first' && rpgIsSeen(scene.id)) return false;
  return true;
}
// 要求播放：回傳 true = 會播放（呼叫端可以省略被取代的舊提示）
function rpgRequest(id, valid, extra) {
  if (rpgAttempt.queued.has(id)) return true;
  const scene = rpgBuildScene(id, extra);
  if (!scene) return false;
  if (rpgAttempt.shown.has(id) && !scene.repeatable) return false;
  if (!rpgShouldShowScene(scene)) return false;
  if (extra && typeof extra.target === 'function') scene.targetFn = extra.target;
  rpgAttempt.queued.add(id);
  rpgQueue.push({ scene, valid: valid || (() => true), at: Date.now() });
  return true;
}
// v0.3.60：非冒險畫面（小V的家 / 結算 / 秘笈）觸發的對話 — 蓋在最上層，不改 gameState，關閉後回到原畫面
let rpgUiQueue = [];
function rpgRequestUi(id, delayMs) {
  const scene = rpgBuildScene(id);
  if (!scene || !rpgShouldShowScene(scene)) return false;
  if (rpgUiQueue.some(q => q.scene.id === id) && !scene.repeatable) return true;
  const q = { scene, at: Date.now() + (delayMs || 0), deadline: Date.now() + (delayMs || 0) + 6000 };
  rpgUiQueue.push(q);
  rpgPumpUiQueue();
  return true;
}
let rpgUiPumpTimer = 0;
function rpgPumpUiQueue() {
  clearTimeout(rpgUiPumpTimer);
  if (!rpgUiQueue.length) return;
  const q = rpgUiQueue[0];
  const wait = () => { rpgUiPumpTimer = setTimeout(rpgPumpUiQueue, 120); };
  if (Date.now() < q.at || rpgActive) return wait();
  if (!rpgSceneAssetsSettled(q.scene) && Date.now() < q.deadline) return wait(); // 等立繪；最多 6 秒，之後顯示錯誤訊息版
  rpgUiQueue.shift();
  // 這時玩家已經回到冒險中（例如很快按了下一關）→ 改用一般冒險對話（暫停遊戲）
  if (gameState === 'playing') rpgOpen(q.scene);
  else rpgOpen(q.scene, { ui: true });
  if (rpgUiQueue.length) wait();
}
function rpgWasShownThisAttempt(id) { return rpgAttempt.shown.has(id) || rpgAttempt.queued.has(id); }

// ── 素材 ──
// v0.3.61：載入失敗 → 背景有限次重試（3 秒、6 秒後），失敗原因保留在 debugRpg() / console
function rpgScheduleRetry(key) {
  const r = (typeof ASSET_REGISTRY !== 'undefined') ? ASSET_REGISTRY[RPG_ASSETS[key]] : null;
  if (!r || r.status !== 'failed' || r.rpgRetryTimer || (r.rpgRetries || 0) >= RPG_ASSET_MAX_RETRY) return;
  r.rpgRetryTimer = setTimeout(() => {
    r.rpgRetryTimer = null;
    r.rpgRetries = (r.rpgRetries || 0) + 1;
    r.rpgFailLog = (r.rpgFailLog || []).concat(r.tried.map(t => t.result + ' ' + t.url));
    r.promise = null; r.tried = []; r.status = 'idle'; r.applied = false;
    rpgImgStatus[key] = 'retry';
    console.warn('[RPG] 立繪重試第 ' + r.rpgRetries + ' 次：' + RPG_ASSETS[key]);
    try { loadImageRecord(r); } catch (e) {}
  }, 3000 * ((r.rpgRetries || 0) + 1));
}
// 同一角色的表情備援順序（只在同一角色內回退，不會換成別的角色）
const RPG_FACE_FALLBACK = {
  balloonv_: ['balloonv_thinking', 'balloonv_happy', 'balloonv_surprised', 'balloonv_confused', 'balloonv_shocked', 'balloonv_heroic', 'balloonv_angry'],
  star_spirit_: ['star_spirit_normal', 'star_spirit_angry'],
  orange_king_: ['orange_king_taunt', 'orange_king_angry'],
};
function rpgResolveFace(key) {
  if (!key || rpgAssetState(key) === 'loaded') return key;
  const pre = Object.keys(RPG_FACE_FALLBACK).find(p => key.startsWith(p) && key !== 'orange_king_weakness_note');
  if (!pre) return key;
  return RPG_FACE_FALLBACK[pre].find(k => k !== key && rpgAssetState(k) === 'loaded') || key;
}
function rpgAssetState(key) {
  if (rpgImgs[key]) return 'loaded';
  const r = (typeof ASSET_REGISTRY !== 'undefined') ? ASSET_REGISTRY[RPG_ASSETS[key]] : null;
  if (r && r.status === 'loaded' && r.img) return 'loaded'; // 例如橘子王：已由 Boss 素材群組載好
  if (rpgImgStatus[key] === 'error' || (r && r.status === 'failed')) { rpgScheduleRetry(key); return 'failed'; }
  if (RPG_EXTERNAL_ASSET_KEYS.includes(key) && !r) return 'failed'; // 不在任何群組裡 → 不要無限等待
  return 'pending';
}
function rpgSceneAssetKeys(scene) {
  const ks = new Set(); if (scene.left) ks.add(scene.left); if (scene.right) ks.add(scene.right);
  scene.pages.forEach(p => { ks.add(p.face); if (p.left) ks.add(p.left); if (p.right) ks.add(p.right); });
  return [...ks].filter(Boolean);
}
function rpgSceneAssetsSettled(scene) {
  const keys = rpgSceneAssetKeys(scene);
  if (keys.some(k => rpgAssetState(k) === 'pending')) {
    try { if (typeof preloadAssetGroup === 'function') { preloadAssetGroup('rpgBoot'); preloadAssetGroup('rpg'); } } catch (e) {}
    return false;
  }
  return true;
}
function rpgAssetFailInfo(key) {
  const r = (typeof ASSET_REGISTRY !== 'undefined') ? ASSET_REGISTRY[RPG_ASSETS[key]] : null;
  if (!r) return { path: RPG_ASSETS[key], status: 'not-registered' };
  return { path: RPG_ASSETS[key], status: r.status, retries: r.rpgRetries || 0, tried: (r.rpgFailLog || []).concat(r.tried.map(t => t.result + ' ' + t.url)) };
}
function rpgImgUrl(key) {
  const im = rpgImgs[key] || (((typeof ASSET_REGISTRY !== 'undefined') && ASSET_REGISTRY[RPG_ASSETS[key]]) || {}).img;
  return im ? im.src : '';
}

// ── 觸發檢查（每次 update 最後、仍在 playing 時呼叫）──
function rpgEntityAheadOnScreen(x, w, maxAhead) {
  const sx = x - cameraX;
  if (sx < 0 || sx > CANVAS_W - Math.min(40, (w || 40) * 0.5)) return false;  // 真的出現在畫面上
  const ahead = x - (player.x + player.w);
  return ahead >= -10 && ahead <= maxAhead;                                   // 在小V前方、距離夠近
}
function rpgUpdate() {
  if (gameState !== 'playing' || rpgActive) return;
  if (typeof isDiscoveryItemModalOpen === 'function' && isDiscoveryItemModalOpen()) return;
  const lv = LEVELS[currentLevelIndex] || {};
  // 001：1-1 開始（小V在起點、本次嘗試的開頭幾秒）
  if (lv.stageId === '1-1' && elapsedSec < 3) rpgRequest('rpg001_stage11_intro', () => LEVELS[currentLevelIndex].stageId === '1-1' && elapsedSec < 8);
  // 002：第一次看到尖刺（實際尖刺出現在畫面上、在小V前方 420px 內）
  if (!rpgWasShownThisAttempt('rpg002_first_spike')) {
    const sp = spikes.find(s => rpgEntityAheadOnScreen(s.x, s.w, 420));
    if (sp) rpgRequest('rpg002_first_spike', () => spikes.some(s => rpgEntityAheadOnScreen(s.x, s.w, 480)),
      { target: () => spikes.find(s => rpgEntityAheadOnScreen(s.x, s.w, 480)) }); // v0.3.60：開啟時指向真正在畫面上的那個尖刺
  }
  // 004：第一次看到蠍子（實際活著的蠍子出現在畫面上、在小V前方 520px 內）
  if (!rpgWasShownThisAttempt('rpg004_first_scorpion')) {
    const isScorp = e => e.active && (!e.type || e.type === 'scorpion');
    if (enemies.some(e => isScorp(e) && rpgEntityAheadOnScreen(e.x, e.w, 520)))
      rpgRequest('rpg004_first_scorpion', () => enemies.some(e => isScorp(e) && rpgEntityAheadOnScreen(e.x, e.w, 600)),
        { target: () => enemies.filter(e => isScorp(e) && rpgEntityAheadOnScreen(e.x, e.w, 600)).sort((a, b) => a.x - b.x)[0] });
  }
  // 005：第一次看到橘子怪（實際橘子怪出現在畫面上、在小V前方 560px 內）
  if (!rpgWasShownThisAttempt('rpg005_first_orange')) {
    if (orangeNemeses.some(o => rpgEntityAheadOnScreen(o.x, o.w, 560)))
      rpgRequest('rpg005_first_orange', () => orangeNemeses.some(o => rpgEntityAheadOnScreen(o.x, o.w, 640)),
        { target: () => orangeNemeses.filter(o => rpgEntityAheadOnScreen(o.x, o.w, 640)).sort((a, b) => a.x - b.x)[0] });
  }
  // 006：小狗尋寶（沿用 dogNoseLevel：L1 = 400px 內就觸發）
  const sensing = bringBalloonDog && dogNoseLevel >= 1 && !!currentHiddenTreasure && !currentHiddenTreasure.found;
  if (sensing && !rpgAttempt.dogInRange) {
    rpgAttempt.dogInRange = true; // 進入感應範圍（同一次停留只觸發一次）
    const stillSensing = () => bringBalloonDog && dogNoseLevel >= 1 && !!currentHiddenTreasure && !currentHiddenTreasure.found;
    const willTutorial = !rpgWasShownThisAttempt('rpg006a_dog_treasure') && rpgRequest('rpg006a_dog_treasure', stillSensing);
    // v0.3.60：之後的感應 → 完整對話框的狗狗汪汪一頁（取代 v0.3.59 的小型浮動提示；不受顯示模式限制）
    if (!willTutorial) rpgRequest('rpg006b_dog_woof', stillSensing);
  } else if (!sensing && rpgAttempt.dogInRange) {
    rpgAttempt.dogInRange = false; // 離開範圍 → 下次重新進入可以再提示
    ['rpg006a_dog_treasure', 'rpg006b_dog_woof'].forEach(id => {
      if (rpgAttempt.queued.has(id)) { // 還沒開始播就離開了 → 取消（不算看過）
        rpgAttempt.queued.delete(id);
        rpgQueue = rpgQueue.filter(q => q.scene.id !== id);
      }
    });
  }
  // v0.3.61：rpg013 金色油管環 — 掉落演出完成、落地並清楚出現在畫面上（還沒被撿起）時播放；不會幫玩家撿
  if (typeof isOrangeKingStageActive === 'function' && isOrangeKingStageActive() && orangeKingBoss && orangeKingBoss.phase !== 'defeated'
      && orangeKingBoss.ring && orangeKingBoss.ring.state === 'grounded' && !orangeKingBoss.ringActive && !rpgWasShownThisAttempt('rpg013_golden_ring')) {
    const rg = orangeKingBoss.ring, rsx = rg.x - cameraX;
    if (rsx > 20 && rsx < CANVAS_W - 20)
      rpgRequest('rpg013_golden_ring', () => !!orangeKingBoss && !!orangeKingBoss.ring && orangeKingBoss.ring.state === 'grounded' && !orangeKingBoss.ringActive,
        { target: () => (orangeKingBoss && orangeKingBoss.ring) ? { x: orangeKingBoss.ring.x - 30, y: orangeKingBoss.ring.y - 30, w: 60, h: 50 } : null });
  }
  // v0.3.60：2-4 橘子王登場互嗆 — 橘子王落地吼叫（introRoar）時、正式開打之前
  if (typeof isOrangeKingStageActive === 'function' && isOrangeKingStageActive() && orangeKingBoss
      && orangeKingBoss.phase === 'introRoar' && orangeKingBoss.phaseMs >= 300 && !rpgWasShownThisAttempt('rpg014_boss_taunt')) {
    rpgRequest('rpg014_boss_taunt', () => !!orangeKingBoss && orangeKingBoss.phase === 'introRoar');
  }
  // 依序播放佇列（素材還沒載好就等；條件已不成立就取消，且不記成已觀看）
  while (rpgQueue.length) {
    const q = rpgQueue[0];
    let ok = false; try { ok = q.valid(); } catch (e) { ok = false; }
    if (!ok) { rpgQueue.shift(); rpgAttempt.queued.delete(q.scene.id); continue; }
    if (!rpgSceneAssetsSettled(q.scene)) return;
    rpgQueue.shift();
    rpgOpen(q.scene);
    return;
  }
}
// 007 / 008：checkHiddenTreasure() 真的取得寶物後呼叫（回傳 true = 會播 RPG，可省略重複的舊文字）
function rpgOnTreasureFound(t) {
  try {
    if (!t) return false;
    if (t.type === 'recipe' && RPG_RECIPE_LINES[t.recipeKey]) return rpgRequest('rpg007_recipe:' + t.recipeKey, () => true, { recipeName: t.recipeName });
    if (t.type === 'goldChest') return rpgRequest('rpg008_chest:goldChest', () => true);
  } catch (e) { console.warn('[RPG] treasure hook', e); }
  return false;
}
// 003：武器碰到天敵「真的爆裂」時由碰撞結果呼叫（目前遊戲沒有這個機制 → 尚無呼叫點，見回報）
function rpgOnWeaponPopped(targetKey) {
  if (!RPG_POP_TARGETS[targetKey]) { console.warn('[RPG] 003 未定義的危險類型', targetKey); return false; }
  return rpgRequest('rpg003_weapon_pop:' + targetKey, () => true);
}

// ── 對話框 DOM ──
function rpgEnsureDom() {
  let ov = document.getElementById('rpg-overlay');
  if (ov) return ov;
  const wrap = document.getElementById('game-wrapper') || document.body;
  ov = document.createElement('div');
  ov.id = 'rpg-overlay';
  ov.innerHTML =
      '<div class="rpg-mask"></div>'
    + '<div class="rpg-side rpg-side--left"><div class="rpg-backdrop"></div><img class="rpg-pimg" alt=""><img class="rpg-pimg" alt=""><div class="rpg-perr"></div><div class="rpg-ptag"></div></div>'
    + '<div class="rpg-target" style="display:none"><div class="rpg-target-glow"></div><div class="rpg-target-arrow">▼</div></div>'
    + '<div class="rpg-side rpg-side--right"><div class="rpg-backdrop"></div><img class="rpg-pimg" alt=""><img class="rpg-pimg" alt=""><div class="rpg-perr"></div><div class="rpg-ptag"></div><div class="rpg-dog-nose"></div><div class="rpg-woof">汪汪！</div><div class="rpg-dog-heart">💗</div><div class="rpg-dog-paws"><span>🐾</span><span>🐾</span><span>🐾</span></div></div>'
    + '<div class="rpg-topbtns"><button type="button" class="rpg-btn" data-act="log">📖 冒險提示筆記</button><button type="button" class="rpg-btn" data-act="skip">⏭ 略過</button></div>'
    + '<div class="rpg-box"><div class="rpg-box-bg"></div><div class="rpg-name"></div><div class="rpg-text"></div><button type="button" class="rpg-next" data-act="next">繼續 ▼</button></div>'
    + '<div class="rpg-showcase" style="display:none"><img class="rpg-showcase-img" alt=""><div class="rpg-showcase-err"></div><button type="button" class="hv-ui-btn hv-ui-btn--primary rpg-showcase-done" data-act="showcasedone">看完了</button></div>'
    + '<div class="rpg-log" style="display:none"><div class="rpg-log-panel"><div class="rpg-log-head"><span>📜 對話紀錄</span><button type="button" class="rpg-btn" data-act="logclose">✕ 關閉</button></div><div class="rpg-log-body"></div></div></div>';
  wrap.appendChild(ov);
  ov.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    const act = e.target && e.target.closest && e.target.closest('[data-act]') ? e.target.closest('[data-act]').dataset.act : 'next';
    rpgHandleAction(act);
  });
  ['touchstart', 'touchend', 'pointerdown', 'mousedown'].forEach(ev => ov.addEventListener(ev, e => { e.stopPropagation(); }, { passive: true }));
  return ov;
}
// v0.3.60：介面模式（小V的家 / 結算 / 秘笈之上）— 對話框改成固定在整個畫面置中的 16:9 區塊，背後加一層擋住點擊的遮罩
function rpgSetUiMode(on) {
  const ov = document.getElementById('rpg-overlay'); if (!ov) return;
  let bl = document.getElementById('rpg-ui-blocker');
  if (on) {
    if (!bl) {
      bl = document.createElement('div'); bl.id = 'rpg-ui-blocker'; document.body.appendChild(bl);
      bl.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); rpgHandleAction('next'); });
      ['touchstart', 'touchend', 'pointerdown', 'mousedown'].forEach(ev => bl.addEventListener(ev, e => e.stopPropagation(), { passive: true }));
    }
    if (ov.parentNode !== document.body) document.body.appendChild(ov);
    ov.classList.add('rpg--ui'); bl.style.display = 'block';
  } else {
    if (bl) bl.style.display = 'none';
    ov.classList.remove('rpg--ui');
    const wrap = document.getElementById('game-wrapper');
    if (wrap && ov.parentNode !== wrap) wrap.appendChild(ov);
    ov.style.left = ov.style.top = ov.style.width = ov.style.height = '';
  }
}
// v0.3.60：場景目標提示 — 用觸發當下的「實際物件世界座標」換成畫面座標；被對話框擋住時在對話框上開一個透明小窗
function rpgSetTargetHighlight(t) {
  const ov = document.getElementById('rpg-overlay'); if (!ov) return;
  // v0.3.61：透明窗只套在對話框的「底板背景層」，名牌 / 文字 / 外框 / 繼續鍵都不受影響
  const el = ov.querySelector('.rpg-target'), box = ov.querySelector('.rpg-box-bg');
  if (!el || !box) return;
  if (!t || typeof t.x !== 'number') {
    el.style.display = 'none';
    box.style.webkitMaskImage = box.style.maskImage = '';
    ov.dataset.target = '';
    return;
  }
  const sx = t.x + (t.w || 40) / 2 - cameraX, sy = t.y + (t.h || 40) / 2;
  const r = Math.max(t.w || 40, t.h || 40) * 0.72 + 16;
  el.style.display = 'block';
  el.style.setProperty('--tx', sx); el.style.setProperty('--ty', sy); el.style.setProperty('--tr', r);
  // 對話框位置（960×540 座標）：left 20、top 540-14-150 = 376 → 目標若落在框內，就在框上挖一個漸層透明窗讓真正的目標看得到
  const bx = 20, by = CANVAS_H - 14 - 150;
  const inBox = sy + r > by;
  const k = parseFloat(getComputedStyle(ov).getPropertyValue('--rk')) || 1;
  if (inBox) {
    const g = 'radial-gradient(circle at ' + ((sx - bx) * k) + 'px ' + ((sy - by) * k) + 'px, transparent ' + (r * k) + 'px, #000 ' + ((r + 14) * k) + 'px)';
    box.style.webkitMaskImage = g; box.style.maskImage = g;
  } else { box.style.webkitMaskImage = box.style.maskImage = ''; }
  ov.dataset.target = Math.round(sx) + ',' + Math.round(sy);
}
function rpgFitScale() {
  const ov = document.getElementById('rpg-overlay');
  if (ov && ov.classList.contains('rpg--ui')) { // 介面模式：以整個視窗置中一個 16:9 區塊
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = Math.min(vw, vh * CANVAS_W / CANVAS_H), h = w * CANVAS_H / CANVAS_W;
    ov.style.left = ((vw - w) / 2) + 'px'; ov.style.top = ((vh - h) / 2) + 'px'; ov.style.width = w + 'px'; ov.style.height = h + 'px';
    ov.style.setProperty('--rk', Math.max(0.3, w / CANVAS_W));
    return;
  }
  const wrap = document.getElementById('game-wrapper');
  const w = (wrap && wrap.clientWidth) || CANVAS_W;
  const k = Math.max(0.3, w / CANVAS_W);
  if (ov) ov.style.setProperty('--rk', k);
  const f = document.getElementById('rpg-dog-float'); if (f) f.style.setProperty('--rk', k);
}
if (typeof window !== 'undefined') window.addEventListener('resize', () => { try { rpgFitScale(); } catch (e) {} });
function rpgSetSide(sideEl, key, active) {
  if (!sideEl) return;
  const imgs = sideEl.querySelectorAll('.rpg-pimg');
  const err = sideEl.querySelector('.rpg-perr');
  sideEl.classList.toggle('rpg-side--hidden', !key);
  sideEl.classList.toggle('rpg-side--dim', !!key && !active);
  if (!key) { sideEl.dataset.key = ''; return; }
  if (sideEl.dataset.key === key) return;
  sideEl.dataset.key = key;
  sideEl.classList.toggle('rpg-side--book', key === 'balloon_recipe_book');
  const bp = RPG_BOSS_PORTRAIT[key]; // v0.3.62：Boss 立繪用大型比例
  sideEl.classList.toggle('rpg-side--boss', !!bp);
  if (bp) { sideEl.style.width = sideEl.style.height = 'calc(' + bp.size + 'px * var(--rk))'; sideEl.style.right = 'calc(' + bp.right + 'px * var(--rk))'; sideEl.style.bottom = 'calc(' + bp.bottom + 'px * var(--rk))'; }
  else { sideEl.style.width = sideEl.style.height = sideEl.style.right = sideEl.style.bottom = ''; }
  sideEl.classList.toggle('rpg-side--dog', key === 'dog_treasure_alert');
  // v0.3.61：這張表情載入失敗 → 改用同一角色已載好的表情（測試版角落標示失敗的檔案）
  const useKey = rpgResolveFace(key);
  const tag = sideEl.querySelector('.rpg-ptag');
  if (tag) {
    const fellBack = useKey !== key;
    tag.style.display = (fellBack && typeof ADVENTURE_TEST_TOOLS_ENABLED !== 'undefined' && ADVENTURE_TEST_TOOLS_ENABLED) ? 'block' : 'none';
    if (fellBack) { tag.textContent = '⚠ ' + RPG_ASSETS[key].split('/').pop() + ' 載入失敗 → 暫用 ' + useKey; console.warn('[RPG] 立繪載入失敗，暫用同角色表情：' + RPG_ASSETS[key] + ' → ' + useKey, rpgAssetFailInfo(key)); }
  }
  const st = rpgAssetState(useKey);
  if (st !== 'loaded') { // 同角色也沒有可用的圖：保留可辨識的錯誤訊息（不換成 emoji / 其他角色）
    imgs.forEach(im => { im.classList.remove('rpg-pimg--on'); });
    err.style.display = 'flex';
    err.textContent = '⚠ 立繪載入失敗\n' + RPG_ASSETS[key];
    console.warn('[RPG] 立繪載入失敗：' + RPG_ASSETS[key], rpgAssetFailInfo(key));
    return;
  }
  err.style.display = 'none';
  // 輕微淡入：用兩層 img 交叉淡化，大小 / 位置不變
  const on = sideEl.querySelector('.rpg-pimg--on');
  const next = (on === imgs[0]) ? imgs[1] : imgs[0];
  next.src = rpgImgUrl(useKey);
  next.classList.add('rpg-pimg--on');
  if (on && on !== next) on.classList.remove('rpg-pimg--on');
}
let rpgPageIdx = 0, rpgTypeStart = 0, rpgTypeDone = false, rpgRaf = 0, rpgOpenedAt = 0, rpgCurLeft = null, rpgCurRight = null;
function rpgOpen(scene, opts) {
  const ui = !!(opts && opts.ui);
  if (rpgActive) return false;
  if (!ui && gameState !== 'playing') return false;
  rpgActive = scene;
  scene.ui = ui;
  rpgAttempt.shown.add(scene.id);
  rpgAttempt.queued.delete(scene.id);
  rpgSessionShown.add(scene.id);
  if (!ui) gameState = 'paused';             // 冒險中：真的暫停玩法（不開暫停選單）；介面中：不動 gameState
  Object.keys(keys).forEach(k => { keys[k] = false; });
  Object.keys(mobileBtn).forEach(k => { mobileBtn[k] = false; });
  rpgHideDogFloat(true);
  const ov = rpgEnsureDom();
  rpgSetUiMode(ui);
  rpgFitScale();
  ov.classList.toggle('rpg--dog-heart', !!scene.dogHeart);
  ov.classList.toggle('rpg--dog-paw', !!scene.dogPaw);
  rpgSetTargetHighlight(scene.targetFn ? (() => { try { return scene.targetFn(); } catch (e) { return null; } })() : null);
  ov.querySelector('.rpg-log').style.display = 'none';
  ov.classList.toggle('rpg--dog-alert', !!scene.dogAlert);
  const sides = ov.querySelectorAll('.rpg-side');
  sides.forEach(s => { s.dataset.key = ''; s.querySelectorAll('.rpg-pimg').forEach(i => i.classList.remove('rpg-pimg--on')); });
  rpgCurLeft = scene.left || null; rpgCurRight = scene.right || null;
  ov.style.display = 'block';
  ov.classList.remove('rpg--show'); void ov.offsetWidth; ov.classList.add('rpg--show');
  rpgOpenedAt = performance.now();
  try { sfxOnDialogOpen(scene); } catch (e) {} // v0.3.64：對話框真的彈出時播一次（翻頁不播）
  ov.classList.toggle('rpg--showcase', !!scene.showcase);
  if (scene.showcase) { rpgShowShowcase(scene); console.log('[RPG] 中央展示', scene.id); return true; }
  rpgShowPage(0);
  console.log('[RPG] 開始對話', scene.id);
  return true;
}
// v0.3.61：中央展示模式（例如 2-3 橘子王觀察筆記）— 背景壓暗、圖片等比例完整置中；點一下或按鍵結束
function rpgShowShowcase(scene) {
  const ov = document.getElementById('rpg-overlay');
  const box = ov.querySelector('.rpg-showcase'), img = ov.querySelector('.rpg-showcase-img'), err = ov.querySelector('.rpg-showcase-err');
  box.style.display = 'flex';
  rpgTypeDone = true;
  if (rpgAssetState(scene.showcase) === 'loaded') {
    img.src = rpgImgUrl(scene.showcase); img.style.display = ''; err.style.display = 'none';
  } else { // 圖片沒載好：不卡住，改顯示文字版筆記內容＋失敗路徑
    img.style.display = 'none'; err.style.display = 'block';
    err.textContent = (scene.fallbackText || '') + '\n\n⚠ 圖片載入失敗：' + RPG_ASSETS[scene.showcase];
    console.warn('[RPG] 展示圖載入失敗', rpgAssetFailInfo(scene.showcase));
  }
}
function rpgShowPage(i) {
  const scene = rpgActive; if (!scene) return;
  rpgPageIdx = i;
  const p = scene.pages[i];
  try { sfxOnDialogPage(scene, i, p); } catch (e) {} // v0.3.65
  const spk = RPG_SPEAKERS[p.sp];
  if (p.left !== undefined) rpgCurLeft = p.left;
  if (p.right !== undefined) rpgCurRight = p.right;
  if (spk.side === 'left') rpgCurLeft = p.face; else rpgCurRight = p.face;
  const ov = document.getElementById('rpg-overlay');
  rpgSetSide(ov.querySelector('.rpg-side--left'), rpgCurLeft, spk.side === 'left');
  rpgSetSide(ov.querySelector('.rpg-side--right'), rpgCurRight, spk.side === 'right');
  const nm = ov.querySelector('.rpg-name');
  nm.textContent = spk.name;
  nm.classList.toggle('rpg-name--right', spk.side === 'right');
  nm.dataset.sp = p.sp;
  ov.querySelector('.rpg-next').textContent = (i >= scene.pages.length - 1) ? '結束 ▼' : '繼續 ▼';
  rpgTypeStart = performance.now(); rpgTypeDone = false;
  ov.querySelector('.rpg-box').classList.remove('rpg-box--done');
  cancelAnimationFrame(rpgRaf);
  const segs = rpgParseMarkup(rpgPageText(p));
  rpgSetButtonFocus(p.focusSwitchBtn && rpgIsTouchControlsShown() ? 'btn-switch-weapon' : null); // v0.3.62：只在這一頁圈出換武器鍵
  const total = segs.reduce((a, sg) => a + sg.chars.length, 0);
  const tick = () => {
    if (!rpgActive) return;
    const n = Math.floor((performance.now() - rpgTypeStart) * RPG_TEXT_CPS / 1000);
    rpgRenderMarkup(ov.querySelector('.rpg-text'), segs, n);
    if (n >= total) { rpgTypeDone = true; ov.querySelector('.rpg-box').classList.add('rpg-box--done'); return; }
    rpgRaf = requestAnimationFrame(tick);
  };
  tick();
}
function rpgHandleAction(act) {
  if (!rpgActive) return;
  if (act === 'log') { rpgOpenNotes(); return; }
  if (act === 'logclose') { document.querySelector('#rpg-overlay .rpg-log').style.display = 'none'; return; }
  if (document.querySelector('#rpg-overlay .rpg-log').style.display !== 'none') return; // 紀錄開著時點背景不前進
  if (rpgNotesOpen()) return; // 提示筆記開著時，點擊不讓對話前進
  if (act === 'skip') { rpgClose('skipped'); return; }
  if (rpgActive.showcase && (act === 'showcasedone' || act === 'key')) { rpgClose('finished'); return; }
  if (performance.now() - rpgOpenedAt < 250 && !rpgActive.showcase) return; // 開啟瞬間的誤觸（例如還按著跳躍鍵）不算
  if (rpgActive.showcase) { if (act === 'showcasedone' || act === 'key') rpgClose('finished'); return; } // v0.3.62：觀察筆記由玩家按「看完了」才關（點畫面其他地方不會誤關）
  if (rpgActive.oneClick) { rpgClose('finished'); return; } // v0.3.60：狗狗汪汪一頁 → 點一下就關（不用先補完文字）
  // 第一次點：補完本頁；第二次點：下一頁
  if (!rpgTypeDone) {
    cancelAnimationFrame(rpgRaf); rpgTypeDone = true;
    const ov = document.getElementById('rpg-overlay');
    rpgRenderMarkup(ov.querySelector('.rpg-text'), rpgParseMarkup(rpgPageText(rpgActive.pages[rpgPageIdx])), Infinity);
    ov.querySelector('.rpg-box').classList.add('rpg-box--done');
    return;
  }
  if (rpgPageIdx < rpgActive.pages.length - 1) rpgShowPage(rpgPageIdx + 1);
  else rpgClose('finished');
}
function rpgClose(how) {
  const scene = rpgActive; if (!scene) return;
  try { sfxOnDialogClose(); } catch (e) {} // v0.3.65：關閉 / 略過不補播，正在播的橘子王嗆聲也停
  cancelAnimationFrame(rpgRaf);
  if (how === 'finished' || how === 'skipped') {      // 看完 / 主動略過 → 才算已觀看；被中斷（reset）不算
    if (scene.modeControlled || scene.policy) rpgMarkSeen(scene.id, how);
    if (scene.saveHistory) rpgLearnFromScene(scene, how); // v0.3.61：只記「知識筆記 / 劇情」各一筆，不再每播一次就加一筆
    if (scene.next && !scene.ui) { // 例如：觀察筆記展示 → 緊接著小V反應（排在佇列最前面）
      try { if (rpgRequest(scene.next, () => true)) { const i = rpgQueue.findIndex(q => q.scene.id === scene.next); if (i > 0) rpgQueue.unshift(rpgQueue.splice(i, 1)[0]); } } catch (e) {}
    }
  }
  rpgActive = null;
  const ov = document.getElementById('rpg-overlay');
  if (ov) { ov.style.display = 'none'; ov.classList.remove('rpg--show', 'rpg--showcase'); const sc = ov.querySelector('.rpg-showcase'); if (sc) sc.style.display = 'none'; }
  rpgSetTargetHighlight(null);   // 對話結束：光暈與箭頭立即消失
  rpgSetButtonFocus(null);       // v0.3.62：按鈕引導也立即消失
  rpgSetUiMode(false);
  Object.keys(keys).forEach(k => { keys[k] = false; });
  Object.keys(mobileBtn).forEach(k => { mobileBtn[k] = false; });
  if (scene.ui) { console.log('[RPG] 結束對話', scene.id, how, '(介面)'); setTimeout(rpgPumpUiQueue, 50); return; } // 介面對話：回到原本畫面，不動 gameState
  if (how !== 'reset' && gameState === 'paused') {
    gameState = 'playing';
    lastTime = 0; fixedStepAccumulator = 0;           // 恢復時不讓時間差暴增
    if (rpgPauseAfterClose) { rpgPauseAfterClose = false; pauseGame(); } // 對話中曾切到背景 / 轉直向 → 回到暫停選單，由玩家按「繼續冒險」
  }
  if (how === 'reset') rpgPauseAfterClose = false;
  console.log('[RPG] 結束對話', scene.id, how);
}
function rpgOpenLog() { rpgOpenNotes(); } // v0.3.61：舊入口改開「冒險提示筆記」
// v0.3.61：冒險提示筆記面板（對話中 / 暫停選單都能開；只顯示學過的知識，每種一筆）
function rpgOpenNotes() {
  let el = document.getElementById('rpg-notes');
  if (!el) {
    el = document.createElement('div'); el.id = 'rpg-notes';
    el.innerHTML = '<div class="rpg-notes-panel"><div class="rpg-notes-head"><span>📖 冒險提示筆記</span><button type="button" class="rpg-btn" data-act="notesclose">✕ 關閉</button></div><div class="rpg-notes-body"></div></div>';
    document.body.appendChild(el);
    el.addEventListener('click', e => { e.stopPropagation(); if (e.target === el || (e.target.closest && e.target.closest('[data-act="notesclose"]'))) rpgCloseNotes(); });
    ['touchstart', 'touchend', 'pointerdown', 'mousedown'].forEach(ev => el.addEventListener(ev, e => e.stopPropagation(), { passive: true }));
  }
  const d = rpgLoad();
  const body = el.querySelector('.rpg-notes-body');
  while (body.firstChild) body.removeChild(body.firstChild);
  const add = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const notes = Object.values(d.notes).sort((a, b) => a.firstAt - b.firstAt);
  body.appendChild(add('div', 'rpg-notes-sec', '💡 玩法提示'));
  if (!notes.length) body.appendChild(add('div', 'rpg-notes-empty', '還沒有提示。冒險中看完（或略過）教學後，重點會記在這裡。'));
  notes.forEach(n => { const def = RPG_NOTE_DEFS[n.id] || n; const c = add('div', 'rpg-note'); c.appendChild(add('div', 'rpg-note-title', def.title)); c.appendChild(add('div', 'rpg-note-sum', def.summary)); body.appendChild(c); }); // v0.3.62：以目前版本的文字顯示（例如「離開」→「消氣」）
  const story = Object.values(d.story).sort((a, b) => a.firstAt - b.firstAt);
  if (story.length) {
    body.appendChild(add('div', 'rpg-notes-sec', '🎭 劇情紀錄'));
    story.forEach(st => { const c = add('div', 'rpg-note rpg-note--story'); c.appendChild(add('div', 'rpg-note-title', st.title));
      // 以目前版本的正式台詞顯示（例如舊版存的是互嗆草稿 → 顯示定稿）；找不到場景才用存下來的內容
      let cur = null; try { const sc = rpgBuildScene(st.id); if (sc && sc.pages) cur = sc.pages.map(p => ({ speaker: RPG_SPEAKERS[p.sp].name, text: rpgPlainText(rpgPageText(p)) })); } catch (e) {}
      (cur || st.lines || []).forEach(l => { const ln = add('div', 'rpg-note-line'); ln.appendChild(add('b', '', l.speaker)); ln.appendChild(document.createTextNode(l.text)); c.appendChild(ln); }); body.appendChild(c); });
  }
  el.style.display = 'flex';
}
function rpgCloseNotes() { const el = document.getElementById('rpg-notes'); if (el) el.style.display = 'none'; }
function rpgNotesOpen() { const el = document.getElementById('rpg-notes'); return !!(el && el.style.display === 'flex'); }
function rpgOpenLogLegacy() {
  const ov = document.getElementById('rpg-overlay'); if (!ov) return;
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  let html = '';
  const cur = rpgActive;
  if (cur) {
    html += '<div class="rpg-log-scene"><div class="rpg-log-title">▶ ' + esc(cur.title || cur.id) + '（目前）</div>'
      + cur.pages.slice(0, rpgPageIdx + 1).map(p => '<div class="rpg-log-line"><b>' + esc(RPG_SPEAKERS[p.sp].name) + '</b>' + esc(p.text) + '</div>').join('') + '</div>';
  }
  const hist = rpgLoad().history.slice(-20).reverse();
  hist.forEach(h => {
    html += '<div class="rpg-log-scene"><div class="rpg-log-title">' + esc(h.title) + (h.stageId ? '　' + esc(h.stageId) : '') + '</div>'
      + h.lines.map(l => '<div class="rpg-log-line"><b>' + esc(l.speaker) + '</b>' + esc(l.text) + '</div>').join('') + '</div>';
  });
  ov.querySelector('.rpg-log-body').innerHTML = html || '<div class="rpg-log-line">還沒有對話紀錄</div>';
  ov.querySelector('.rpg-log').style.display = 'flex';
}
// 鍵盤：對話中只處理對話（Enter / 空白 / Z / → 前進，Esc 略過），其他鍵不傳給遊戲
function rpgHandleKey(e) {
  if (!rpgActive) return false;
  e.preventDefault();
  if (e.repeat) return true;
  if (rpgNotesOpen()) { if (e.code === 'Escape' || e.code === 'Enter') rpgCloseNotes(); return true; }
  if (e.code === 'Escape') {
    const log = document.querySelector('#rpg-overlay .rpg-log');
    if (log && log.style.display !== 'none') { log.style.display = 'none'; return true; }
    if (rpgActive.showcase) { rpgHandleAction('key'); return true; } // 展示中按 Esc = 看完了
    rpgHandleAction('skip'); return true;
  }
  if (['Enter', 'Space', 'KeyZ', 'ArrowRight', 'NumpadEnter'].includes(e.code)) rpgHandleAction(rpgActive.showcase ? 'key' : 'next');
  return true;
}

// ── 006B：日常尋寶提醒（小型浮動立繪；不暫停、不寫歷史、不受顯示模式限制）──
let rpgDogFloatTimer = 0;
function rpgShowDogFloat() {
  const wrap = document.getElementById('game-wrapper'); if (!wrap) return;
  let el = document.getElementById('rpg-dog-float');
  if (!el) {
    el = document.createElement('div');
    el.id = 'rpg-dog-float';
    el.innerHTML = '<div class="rpg-df-card"><img alt=""><div class="rpg-perr"></div><div class="rpg-dog-nose"></div></div><div class="rpg-df-woof">汪汪！</div>';
    wrap.appendChild(el);
  }
  rpgFitScale();
  const img = el.querySelector('img'), err = el.querySelector('.rpg-perr');
  if (rpgAssetState('dog_treasure_alert') === 'loaded') { img.src = rpgImgUrl('dog_treasure_alert'); img.style.display = ''; err.style.display = 'none'; }
  else { img.style.display = 'none'; err.style.display = 'flex'; err.textContent = '⚠ 立繪載入失敗\n' + RPG_ASSETS.dog_treasure_alert; }
  el.style.display = 'block';
  el.classList.remove('rpg-df--show'); void el.offsetWidth; el.classList.add('rpg-df--show');
  rpgDogFloatShows++;
  try { sfxPlay('dogBark'); } catch (e) {} // v0.3.64：小狗「汪汪！」
  clearTimeout(rpgDogFloatTimer);
  rpgDogFloatTimer = setTimeout(() => rpgHideDogFloat(), 2800);
}
let rpgDogFloatShows = 0;
function rpgHideDogFloat(now) {
  clearTimeout(rpgDogFloatTimer);
  const el = document.getElementById('rpg-dog-float');
  if (el) { el.classList.remove('rpg-df--show'); el.style.display = 'none'; }
}

// ── 測試工具（console）──
function debugRpg() {
  const d = rpgLoad();
  const o = { storageKey: rpgStorageKey(), mode: d.mode, seen: d.seen, notes: Object.keys(d.notes), story: Object.keys(d.story), historyCount: d.history.length, active: rpgActive && rpgActive.id,
    queue: rpgQueue.map(q => q.scene.id), attemptShown: [...rpgAttempt.shown], dogInRange: rpgAttempt.dogInRange,
    assets: Object.fromEntries(Object.keys(RPG_ASSETS).map(k => [k, rpgAssetState(k)])),
    assetFailures: Object.fromEntries(Object.keys(RPG_ASSETS).filter(k => rpgAssetState(k) !== 'loaded').map(k => [k, rpgAssetFailInfo(k)])) };
  console.log('[RPG]', o); return o;
}
function rpgDebugPlay(id) { // 測試版：立刻播指定場景（不檢查觸發條件，例如 'rpg003_weapon_pop:orangeOil'）
  const scene = rpgBuildScene(id); if (!scene) { console.warn('[RPG] 沒有這個場景', id); return false; }
  if (gameState !== 'playing') { console.warn('[RPG] 需在冒險進行中'); return false; }
  return rpgOpen(scene);
}
function rpgResetSeen() { const d = rpgLoad(); d.seen = {}; rpgSave(); console.log('[RPG] 已清除觀看紀錄（只清 RPG 自己的 key）'); }
// v0.3.60：BGM 規則 — 冒險中的 RPG 對話只暫停玩法，關卡 / Boss BGM 繼續播放（不重開、不重建音訊）
function isRpgDialogKeepingBgm() {
  if (!rpgActive || rpgActive.ui) return false;
  if (typeof document !== 'undefined' && document.hidden) return false; // 切到背景仍照原本規則
  if (rpgPauseAfterClose) return false;                                  // 對話中曾切背景 → 照暫停規則
  return gameState === 'paused';
}
if (typeof window !== 'undefined') Object.assign(window, { debugRpg, rpgDebugPlay, rpgResetSeen, rpgSetMode, rpgCycleMode, rpgOnWeaponPopped, rpgRequestUi, rpgOpenNotes, rpgCloseNotes, rpgResetForTest });


// ════════════════════════════════════════════════════════════════════
//  v0.3.63：完整冒險成績系統（adventure-score-v1-test）
//  ──────────────────────────────────────────────────────────────────
//  三層統計：
//   1. 單次關卡嘗試（advAttempt）：本次拾取 / 擊敗 / 探索 / 實際損失 HP / 有效時間
//   2. 整趟完整冒險（run）：七關有效通關成果、累計失敗、累計受傷、狀態
//   3. 完成後鎖定的成績快照（run.snapshot）：五項分數、總分、Rank、原始數據、版本
//  ・只用「遊戲實際有效運作時間」elapsedSec（暫停、RPG 對話、筆記、載入、全螢幕等待都不會增加）
//  ・失敗代價（失敗次數 / 實際損失 HP / 失敗耗時）在關卡回復「之前」提交，而且每次嘗試只提交一次
//  ・收集 / 探索 / 擊敗成果只在該關成功通關時提交；同一關重新通過 → 取代，不相加
//  ・本機存檔依 playerKey 隔離，使用測試版專用鍵名，不碰背包 / 身份 / V幣 / RPG / Firebase
// ════════════════════════════════════════════════════════════════════
const ADV_SCORE_VERSION = 'adventure-score-v2-test'; // v0.3.64：圓氣球分母固定 9、挑戰表現改為「戰敗 −150 / 主動重試 −50」（v1 紀錄保留但不直接比較）
const ADV_SCORE_VERSION_V1 = 'adventure-score-v1-test';
const ADV_STORE_PREFIX  = 'balloonV_adventureChallenge_v1test__'; // 測試版專用鍵（正式版沒有這個鍵，不會互相覆寫）
const ADV_STORE_DATA_V  = 1;
const ADV_RECENT_LIMIT  = 10;   // 最近完成紀錄保留筆數
const ADV_ARCHIVE_LIMIT = 10;   // 已放棄 / 測試紀錄保留筆數

// 正式計分的七關（以 stageId 辨識；玩家看到的「1-2」在程式裡是 1-2b 氣球小狗尋寶關）
//   ※ LEVELS 裡的 stageId '1-2'（橘子果園危機）與 '1-4'（圖釘工坊）不在正式流程內，不納入計分
const OFFICIAL_ADVENTURE_STAGES = [
  { stageId: '1-1',  label: '1-1', name: '氣球森林小徑' },
  { stageId: '1-2b', label: '1-2', name: '氣球小狗尋寶' },
  { stageId: '1-3',  label: '1-3', name: '糖果氣球懸崖' },
  { stageId: '2-1',  label: '2-1', name: '橘子油危機' },
  { stageId: '2-2',  label: '2-2', name: '雙噴嘴封鎖線' },
  { stageId: '2-3',  label: '2-3', name: '飛行油彈訓練場' },
  { stageId: '2-4',  label: '2-4', name: '橘子王決戰' },
];
const OFFICIAL_ADVENTURE_STAGE_IDS = OFFICIAL_ADVENTURE_STAGES.map(s => s.stageId);
function advStageLabel(sid) { const s = OFFICIAL_ADVENTURE_STAGES.find(x => x.stageId === sid); return s ? s.label : sid; }

// 計分資源目錄（依 v0.3.62 關卡資料實際盤點；advVerifyCatalog() 會在開機時和關卡產生器比對）
//   coins / b260：buildCoins() / buildBalloons() 固定數量
//   roundMax：buildRoundBalloons() 在背包圓氣球 = 0 時的生成數 = 關卡配置數（v0.3.64：計分分母固定用這個總數 9，不隨玩家背包變化）
//   normal / big：buildEnemies() 的一般蠍子 / 重甲（大型）蠍子
//   explore：需要帶氣球小狗才會出現的隱藏物
const ADV_RESOURCE_CATALOG = {
  version: 'catalog-v1-2026-10-18',
  stages: {
    '1-1':  { coins: 33, b260: 8,  roundMax: 0, normal: 4, big: 0, explore: [] },
    '1-2b': { coins: 35, b260: 10, roundMax: 2, normal: 2, big: 0, explore: [{ id: '1-2b#recipe:basicHammer',       cat: 'recipe' }] },
    '1-3':  { coins: 46, b260: 10, roundMax: 2, normal: 3, big: 2, explore: [{ id: '1-3#recipe:balloonLollipop',    cat: 'recipe' }] },
    '2-1':  { coins: 38, b260: 4,  roundMax: 1, normal: 1, big: 0, explore: [] },
    '2-2':  { coins: 46, b260: 5,  roundMax: 2, normal: 0, big: 1, explore: [{ id: '2-2#treasure:goldChest',        cat: 'treasure' }] },
    '2-3':  { coins: 56, b260: 6,  roundMax: 2, normal: 1, big: 1, explore: [{ id: '2-3#note:orangeKingWeaknessNote01', cat: 'note' }] },
    '2-4':  { coins: 0,  b260: 0,  roundMax: 0, normal: 0, big: 0, explore: [], boss: 'orangeKing' },
  },
};

// 計分規則（權重 / 倍率 / 時間基準 / Rank 門檻集中在這裡）
const ADV_SCORE_RULES = {
  scoreVersion: ADV_SCORE_VERSION,
  max:       { collect: 3000, explore: 2500, combat: 2000, survival: 1500, efficiency: 1000 },
  collect:   { coins: 1200, b260: 1200, round: 600 },
  explore:   { treasure: 1000, recipe: 1000, note: 500 },
  combat:    { enemies: 1400, boss: 600, weight: { normal: 1, big: 4 } },
  // v0.3.64：挑戰表現 = max(0, 900 − 戰敗 × 150 − 主動重試 × 50)；戰敗 = HP 歸零（以及 60 秒時間到）
  survival:  { damageMax: 600, perHp: 30, challengeMax: 900, perDefeat: 150, perManualRetry: 50 },
  // 效率：各關「成功通關那一次」的有效秒數 → min(1, 基準 / 實際)，七關平均 × 1000
  //   confirmed = 已由玩家實測確認（不可擅自更改）；其他為測試版初始值（地圖長度 ÷ 小V最高速度 228px/秒 × 約 1.3）
  efficiencyTargets: {
    '1-1':  { sec: 35, confirmed: false },
    '1-2b': { sec: 30, confirmed: false },
    '1-3':  { sec: 35, confirmed: false },
    '2-1':  { sec: 30, confirmed: false },
    '2-2':  { sec: 35, confirmed: true  },
    '2-3':  { sec: 40, confirmed: true  },
    '2-4':  { sec: 45, confirmed: false }, // Boss 戰：模擬「每次喘氣都立刻打滿」約 34.7 秒 × 1.3
  },
  ranks: [
    { rank: 'S', min: 9000, title: '傳奇冒險家' },
    { rank: 'A', min: 8000, title: '傑出冒險家' },
    { rank: 'B', min: 6500, title: '優秀冒險家' },
    { rank: 'C', min: 5000, title: '勇敢冒險家' },
    { rank: 'D', min: 0,    title: '冒險新手'   },
  ],
};
function advRankFor(total) { return ADV_SCORE_RULES.ranks.find(r => total >= r.min) || ADV_SCORE_RULES.ranks[ADV_SCORE_RULES.ranks.length - 1]; }

// ── 存檔 ──
function advPlayerKey() { try { return (getPlayerIdentityForResult() || {}).playerKey || 'guest'; } catch (e) { return 'guest'; } }
function advStorageKey(pk) { return ADV_STORE_PREFIX + (pk || advPlayerKey()); }
function advEmptyData() { return { v: ADV_STORE_DATA_V, active: null, best: {}, recent: [], archived: [] }; }
// v0.3.64：進行中的 v1 挑戰 → v2。v1 每一筆失敗本來就記錄了類型，直接依類型轉換（不從合併次數猜測）：
//   death → 戰敗、timeout → 時間到（戰敗）、abandon（v1 只在暫停選單重試 / 返回整備或測試捷徑時產生）→ 主動重試、interrupted → 不扣分
//   已完成的 v1 成績（best / recent）完全不動
function advMigrateRunToV2(run) {
  if (!run || run.scoreVersion !== ADV_SCORE_VERSION_V1) return false;
  if (run.status === 'completed' || run.status === 'abandoned') return false;
  const c = { deaths: 0, timeouts: 0, manualRetries: 0, interruptions: 0 };
  (run.failures || []).forEach(f => {
    if (f.type === 'death') c.deaths++;
    else if (f.type === 'timeout') c.timeouts++;
    else if (f.type === 'abandon') { c.manualRetries++; f.type = 'manualRetry'; f.v1Type = 'abandon'; }
    else if (f.type === 'interrupted') c.interruptions++;
  });
  Object.assign(run, c);
  run.v1TotalFailures = run.totalFailures;
  run.totalFailures = c.deaths + c.timeouts;
  run.scoreVersion = ADV_SCORE_VERSION; run.migratedFrom = ADV_SCORE_VERSION_V1; run.updatedAt = Date.now();
  console.log('[Score] 進行中的 v1 挑戰轉為 v2', run.challengeId, c);
  return true;
}
function advLoad() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(advStorageKey()) || 'null'); } catch (e) { d = null; }
  if (!d || typeof d !== 'object' || d.v !== ADV_STORE_DATA_V) {
    // 版本不同 / 損壞：不覆寫原資料，另存一份備份後用空白資料（不影響任何其他存檔）
    if (d) { try { localStorage.setItem(advStorageKey() + '__backup_' + Date.now(), JSON.stringify(d)); } catch (e) {} }
    d = advEmptyData();
  }
  if (!d.best) d.best = {}; if (!Array.isArray(d.recent)) d.recent = []; if (!Array.isArray(d.archived)) d.archived = [];
  if (d.active && advMigrateRunToV2(d.active)) { try { localStorage.setItem(advStorageKey(), JSON.stringify(d)); } catch (e) {} }
  return d;
}
function advSave(d) { try { localStorage.setItem(advStorageKey(), JSON.stringify(d)); return true; } catch (e) { console.warn('[Score] 存檔失敗', e); return false; } }
function advUid() { return 'adv-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
function advNewRun(status, reason) {
  const now = Date.now();
  return {
    challengeId: advUid(), playerKey: advPlayerKey(), gameVersion: GAME_VERSION, scoreVersion: ADV_SCORE_VERSION,
    catalogVersion: ADV_RESOURCE_CATALOG.version,
    status: status || 'in_progress', taint: reason ? [reason] : [],
    createdAt: now, startedAt: now, updatedAt: now,
    stageResults: {}, totalFailures: 0, totalActualHpLost: 0, failedAttemptTime: 0, failures: [],
    deaths: 0, timeouts: 0, manualRetries: 0, interruptions: 0, // v0.3.64：分開計數（totalFailures = 戰敗 = deaths + timeouts）
    currentStageId: null, lastAttemptCleared: false, live: null, resume: null,
    completedAt: null, finalScore: null, finalRank: null, snapshot: null,
  };
}
function advArchiveRun(d, run, status) {
  if (!run) return;
  run.status = status || run.status; run.updatedAt = Date.now(); run.live = null;
  d.archived.unshift(run); d.archived = d.archived.slice(0, ADV_ARCHIVE_LIMIT);
}

// ── 目前這一次關卡嘗試（記憶體；每隔幾秒 / 受傷時同步到 run.live）──
let advAttempt = null;
let advTestEntryFlag = false;   // 測試捷徑（各種測試關、直接進 2-4）呼叫 restart 之前設定
let advResumePromptOpen = false;
function advMarkTestEntry(reason) { advTestEntryFlag = reason || 'test-entry'; }
function advCurrentStageId() { const lv = LEVELS[currentLevelIndex]; return lv ? lv.stageId : null; }
function advExpectedStage(run) {
  for (const sid of OFFICIAL_ADVENTURE_STAGE_IDS) if (!run.stageResults[sid]) return sid;
  return null;
}
function advIsValidStageForRun(run, sid) {
  if (!OFFICIAL_ADVENTURE_STAGE_IDS.includes(sid)) return false;
  if (sid === advExpectedStage(run)) return true;                               // 依序前往下一關
  if (sid === run.currentStageId && !run.lastAttemptCleared) return true;       // 同一關重試 / 恢復
  return false;
}
function advTaint(run, reason) {
  if (!run) return;
  if (!run.taint.includes(reason)) run.taint.push(reason);
  if (run.status === 'in_progress') { run.status = 'test_only'; console.log('[Score] 本趟冒險改為測試紀錄（不會更新個人最佳）：', reason); }
}
function advSerializeAttempt(a) {
  return { challengeId: a.challengeId, stageId: a.stageId, levelIndex: a.levelIndex, startedAt: a.startedAt, hpStart: a.hpStart, bringDog: a.bringDog,
    coins: [...a.coins], b260: [...a.b260], round: [...a.round], roundSpawned: a.roundSpawned,
    enemies: { normal: [...a.enemies.normal], big: [...a.enemies.big] }, explore: [...a.explore],
    hpLost: a.hpLost, sec: +(elapsedSec || 0).toFixed(3), bossDefeatSec: a.bossDefeatSec, bossDefeated: a.bossDefeated };
}

// restart() 結束時呼叫：開始一次新的關卡嘗試
function advOnAttemptStart() {
  const sid = advCurrentStageId(); if (!sid) return;
  const test = advTestEntryFlag; advTestEntryFlag = false;
  const official = OFFICIAL_ADVENTURE_STAGE_IDS.includes(sid);
  const d = advLoad();
  let run = d.active;
  if (run && (run.status === 'completed' || run.status === 'abandoned')) { run = null; d.active = null; }
  if (!run) {
    if (sid === '1-1' && !test) run = advNewRun('in_progress');
    else if (test) run = advNewRun('test_only', String(test));
    else { advAttempt = null; advSave(d); return; } // 完成後重玩單關等「自由遊玩」：不建立挑戰
    d.active = run;
  } else if (sid === '1-1' && !advIsValidStageForRun(run, sid)) {
    // 回到 1-1 重新出發（不是 1-1 的重試）→ 明確封存舊紀錄，開新的一趟
    advArchiveRun(d, run, run.status === 'test_only' ? 'test_only' : 'abandoned');
    run = advNewRun(test ? 'test_only' : 'in_progress', test ? String(test) : null);
    d.active = run;
  } else if (test) {
    advTaint(run, String(test));
  } else if (!official) {
    advTaint(run, 'non-official-stage:' + sid);
  } else if (!advIsValidStageForRun(run, sid)) {
    advTaint(run, 'stage-out-of-order:' + sid);
  }
  advAttempt = {
    challengeId: run.challengeId, stageId: sid, levelIndex: currentLevelIndex, startedAt: Date.now(),
    hpStart: player.hp, bringDog: !!bringBalloonDog,
    coins: new Set(), b260: new Set(), round: new Set(), roundSpawned: roundBalloons.length,
    enemies: { normal: new Set(), big: new Set() }, explore: new Set(),
    hpLost: 0, bossDefeatSec: null, bossDefeated: false, ended: false,
  };
  run.currentStageId = sid; run.lastAttemptCleared = false;
  run.resume = { atPrep: false, stageId: sid, levelIndex: currentLevelIndex, hp: player.hp, bringDog: !!bringBalloonDog, at: Date.now() };
  run.live = advSerializeAttempt(advAttempt);
  run.updatedAt = Date.now();
  advSave(d);
}
function advWithRun(fn) {
  if (!advAttempt || advAttempt.ended) return;
  const d = advLoad(); const run = d.active;
  if (!run || run.challengeId !== advAttempt.challengeId) { advAttempt = null; return; }
  fn(d, run);
}
// 失敗 / 中途放棄：在關卡回復「之前」呼叫；同一次嘗試只會提交一次
//   type：death（HP 歸零）/ timeout（60 秒時間到）/ manualRetry（暫停選單主動重新挑戰）/ discard（其他重新開始，不計次數）
function advEndLiveAttempt(type) {
  if (!advAttempt || advAttempt.ended) return;
  const a = advAttempt; a.ended = true;
  const d = advLoad(); const run = d.active;
  if (!run || run.challengeId !== a.challengeId) { advAttempt = null; return; }
  const sec = +(elapsedSec || 0).toFixed(3);
  advCommitFailure(run, { stageId: a.stageId, type, hpLost: a.hpLost, sec });
  run.live = null;
  advSave(d);
}
// v0.3.64：結束一次沒有通關的嘗試
//   death（HP 歸零）/ timeout（60 秒時間到）→ 戰敗 +1
//   manualRetry（暫停選單「重試本關 / 返回整備」）→ 主動重試 +1
//   interrupted（關閉 / 重新整理網頁）、discard（測試捷徑等其他重新開始）→ 不加任何次數
//   不論哪一種，這次嘗試已經受到的傷害與耗時都保留（不會因為重新整理而消失）
function advEnsureCounters(run) {
  ['deaths', 'timeouts', 'manualRetries', 'interruptions'].forEach(k => { if (typeof run[k] !== 'number') run[k] = 0; });
}
function advCommitFailure(run, f) {
  advEnsureCounters(run);
  if (f.type === 'death') run.deaths += 1;
  else if (f.type === 'timeout') run.timeouts += 1;
  else if (f.type === 'manualRetry') run.manualRetries += 1;
  else if (f.type === 'interrupted') run.interruptions += 1;
  run.totalFailures = run.deaths + run.timeouts;
  run.totalActualHpLost = +(run.totalActualHpLost + (f.hpLost || 0)).toFixed(2);
  run.failedAttemptTime = +(run.failedAttemptTime + (f.sec || 0)).toFixed(3);
  run.failures.push({ stageId: f.stageId, type: f.type, hpLost: f.hpLost || 0, sec: f.sec || 0, at: Date.now() });
  run.updatedAt = Date.now();
  console.log('[Score] 嘗試結束', f.type, f.stageId, '戰敗', run.totalFailures, '主動重試', run.manualRetries, '累計損失 HP', run.totalActualHpLost);
}
// triggerClear() 一開始呼叫：提交本關有效成果（取代同關舊成果，不相加）
function advOnAttemptCleared() {
  if (!advAttempt || advAttempt.ended) return;
  const a = advAttempt; a.ended = true;
  const d = advLoad(); const run = d.active;
  if (!run || run.challengeId !== a.challengeId) { advAttempt = null; return; }
  const clearSec = +((a.bossDefeatSec != null ? a.bossDefeatSec : elapsedSec) || 0).toFixed(3);
  run.stageResults[a.stageId] = {
    stageId: a.stageId, clearedAt: Date.now(), clearSec,
    coins: [...a.coins], b260: [...a.b260], round: [...a.round], roundSpawned: a.roundSpawned,
    enemies: { normal: [...a.enemies.normal], big: [...a.enemies.big] }, explore: [...a.explore],
    bossDefeated: !!a.bossDefeated, hpLost: a.hpLost, bringDog: a.bringDog,
  };
  run.totalActualHpLost = +(run.totalActualHpLost + a.hpLost).toFixed(2);
  run.lastAttemptCleared = true; run.live = null; run.updatedAt = Date.now();
  advSave(d);
}
// 拾取 / 擊敗 / 探索 / 受傷（只記在本次嘗試；同一物件 ID 只算一次）
function advNoteCollect(kind, obj) {
  if (!advAttempt || advAttempt.ended || !obj || !obj.advId) return;
  if (kind === 'coin') advAttempt.coins.add(obj.advId);
  else if (kind === 'b260') advAttempt.b260.add(obj.advId);
  else if (kind === 'round') advAttempt.round.add(obj.advId);
}
function advNoteEnemyDefeated(e) {
  if (!advAttempt || advAttempt.ended || !e || !e.advId) return;
  (e.advKind === 'big' ? advAttempt.enemies.big : advAttempt.enemies.normal).add(e.advId);
}
function advExploreIdFor(t) {
  const sid = advCurrentStageId();
  if (!t) return null;
  if (t.type === 'recipe')    return sid + '#recipe:' + t.recipeKey;
  if (t.type === 'goldChest') return sid + '#treasure:goldChest';
  if (t.type === 'bossNote')  return sid + '#note:' + (t.id || 'bossNote');
  return sid + '#hidden:' + t.type;
}
function advNoteExplore(t) { if (!advAttempt || advAttempt.ended) return; const id = advExploreIdFor(t); if (id) advAttempt.explore.add(id); }
function advNoteDamage(lost) {
  if (!advAttempt || advAttempt.ended || !(lost > 0)) return;
  advAttempt.hpLost = +(advAttempt.hpLost + lost).toFixed(2);
  advPersistLive();
}
function advNoteBossDefeated() {
  if (!advAttempt || advAttempt.ended || advAttempt.bossDefeated) return;
  advAttempt.bossDefeated = true;
  advAttempt.bossDefeatSec = +(elapsedSec || 0).toFixed(3); // 勝利淡出 / 確認視窗的時間不算
  advPersistLive();
}
function advPersistLive() {
  if (!advAttempt || advAttempt.ended) return;
  const d = advLoad(); const run = d.active;
  if (!run || run.challengeId !== advAttempt.challengeId) return;
  run.live = advSerializeAttempt(advAttempt); run.updatedAt = Date.now();
  advSave(d);
}
// 定期保存：關卡中 → 本次嘗試；結算 / 整備 / 失敗畫面 → 恢復點（HP、帶狗安排）
function advPersistTick() {
  try {
    if (advResumePromptOpen) return;
    if (advAttempt && !advAttempt.ended && (gameState === 'playing' || gameState === 'paused')) { advPersistLive(); return; }
    const d = advLoad(); const run = d.active; if (!run || !run.resume) return;
    if (gameState === 'clear' && run.lastAttemptCleared && run.resume.atPrep) {
      run.resume.hp = player.hp > 0 ? player.hp : run.resume.hp;
      run.resume.nextBringDog = !!nextBringDog;
    } else if ((gameState === 'failed' || gameState === 'gameover') && !run.lastAttemptCleared) {
      run.resume.hp = player.hp > 0 ? player.hp : run.resume.hp;
    } else return;
    advSave(d);
  } catch (e) {}
}
try {
  if (typeof setInterval === 'function') setInterval(advPersistTick, 2000);
  if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('visibilitychange', () => { if (document.hidden) advPersistTick(); });
  if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('pagehide', advPersistTick);
} catch (e) {}

// ── 計分 ──
function advSumStages(run, fn) { return OFFICIAL_ADVENTURE_STAGE_IDS.reduce((acc, sid) => acc + (run.stageResults[sid] ? fn(run.stageResults[sid], sid) : 0), 0); }
function advCatalogTotal(key) { return OFFICIAL_ADVENTURE_STAGE_IDS.reduce((acc, sid) => acc + (ADV_RESOURCE_CATALOG.stages[sid][key] || 0), 0); }
// 類別內權重重分配：分母為 0 的項目不扣分，把權重平均依比例分給其他項目，維持該大項滿分
function advWeighted(maxScore, parts) {
  const avail = parts.filter(p => p.total > 0);
  const W = avail.reduce((a, p) => a + p.weight, 0);
  if (!W) return { score: 0, parts: parts.map(p => Object.assign({}, p, { effWeight: 0, score: 0 })) };
  let s = 0;
  const out = parts.map(p => {
    if (!(p.total > 0)) return Object.assign({}, p, { effWeight: 0, score: 0 });
    const eff = maxScore * p.weight / W;
    const sc = eff * Math.max(0, Math.min(1, p.got / p.total));
    s += sc;
    return Object.assign({}, p, { effWeight: eff, score: sc });
  });
  return { score: Math.min(maxScore, s), parts: out };
}
// 最大餘數法：五項顯示分數的總和 = 四捨五入後的總分
function advRoundParts(raw) {
  const keys = Object.keys(raw);
  const target = Math.round(keys.reduce((a, k) => a + raw[k], 0));
  const fl = {}; let sum = 0;
  keys.forEach(k => { fl[k] = Math.floor(raw[k]); sum += fl[k]; });
  keys.slice().sort((a, b) => (raw[b] - Math.floor(raw[b])) - (raw[a] - Math.floor(raw[a]))).slice(0, Math.max(0, target - sum)).forEach(k => { fl[k] += 1; });
  return { parts: fl, total: target };
}
function advComputeScore(run) {
  const R = ADV_SCORE_RULES, C = ADV_RESOURCE_CATALOG.stages;
  const allIds = new Set(OFFICIAL_ADVENTURE_STAGE_IDS.flatMap(sid => C[sid].explore.map(x => x.id)));
  // 收集
  const coins = { got: advSumStages(run, r => r.coins.length), total: advCatalogTotal('coins') };
  const b260  = { got: advSumStages(run, r => r.b260.length),  total: advCatalogTotal('b260') };
  const round = { got: advSumStages(run, r => new Set(r.round).size), total: advCatalogTotal('roundMax'), spawned: advSumStages(run, r => r.roundSpawned || 0) }; // v0.3.64：分母固定 = 七關配置總數
  const collect = advWeighted(R.max.collect, [
    { key: 'coins', weight: R.collect.coins, got: coins.got, total: coins.total },
    { key: 'b260',  weight: R.collect.b260,  got: b260.got,  total: b260.total },
    { key: 'round', weight: R.collect.round, got: Math.min(round.got, round.total), total: round.total },
  ]);
  // 探索
  const found = new Set(OFFICIAL_ADVENTURE_STAGE_IDS.flatMap(sid => (run.stageResults[sid] ? run.stageResults[sid].explore : [])).filter(id => allIds.has(id)));
  const exCat = cat => { const ids = OFFICIAL_ADVENTURE_STAGE_IDS.flatMap(sid => C[sid].explore.filter(x => x.cat === cat).map(x => x.id)); return { got: ids.filter(id => found.has(id)).length, total: ids.length, ids }; };
  const exT = exCat('treasure'), exR = exCat('recipe'), exN = exCat('note');
  const explore = advWeighted(R.max.explore, [
    { key: 'treasure', weight: R.explore.treasure, got: exT.got, total: exT.total },
    { key: 'recipe',   weight: R.explore.recipe,   got: exR.got, total: exR.total },
    { key: 'note',     weight: R.explore.note,     got: exN.got, total: exN.total },
  ]);
  // 戰鬥
  const normal = { got: advSumStages(run, r => r.enemies.normal.length), total: advCatalogTotal('normal') };
  const big    = { got: advSumStages(run, r => r.enemies.big.length),    total: advCatalogTotal('big') };
  const earnedW = normal.got * R.combat.weight.normal + big.got * R.combat.weight.big;
  const totalW  = normal.total * R.combat.weight.normal + big.total * R.combat.weight.big;
  const bossDefeated = !!(run.stageResults['2-4'] && run.stageResults['2-4'].bossDefeated);
  const enemyScore = totalW > 0 ? R.combat.enemies * Math.min(1, earnedW / totalW) : R.combat.enemies; // 沒有可擊敗敵人時不扣分
  const combatScore = Math.min(R.max.combat, enemyScore + (bossDefeated ? R.combat.boss : 0));
  // 生存
  const hpLost = +run.totalActualHpLost.toFixed(2);
  advEnsureCounters(run);
  const defeats = run.deaths + run.timeouts;
  const damageScore  = Math.max(0, R.survival.damageMax  - hpLost * R.survival.perHp);
  const challengeScore = Math.max(0, R.survival.challengeMax - defeats * R.survival.perDefeat - run.manualRetries * R.survival.perManualRetry);
  const failureScore = challengeScore; // 舊欄位名稱相容
  const survivalScore = Math.min(R.max.survival, damageScore + challengeScore);
  // 效率
  const eff = OFFICIAL_ADVENTURE_STAGE_IDS.map(sid => {
    const r = run.stageResults[sid]; const target = R.efficiencyTargets[sid].sec;
    const sec = r ? r.clearSec : null;
    const rate = (r && sec > 0) ? Math.min(1, target / sec) : (r ? 1 : 0);
    return { stageId: sid, label: advStageLabel(sid), sec, target, confirmed: R.efficiencyTargets[sid].confirmed, rate };
  });
  const effScore = Math.min(R.max.efficiency, R.max.efficiency * eff.reduce((a, e) => a + e.rate, 0) / eff.length);
  const raw = { collect: collect.score, explore: explore.score, combat: combatScore, survival: survivalScore, efficiency: effScore };
  Object.keys(raw).forEach(k => { raw[k] = Math.max(0, Math.min(R.max[k], raw[k])); });
  const rounded = advRoundParts(raw);
  const total = Math.max(0, Math.min(10000, rounded.total));
  const rk = advRankFor(total);
  return {
    scoreVersion: ADV_SCORE_VERSION, gameVersion: GAME_VERSION, catalogVersion: ADV_RESOURCE_CATALOG.version,
    catalog: JSON.parse(JSON.stringify(ADV_RESOURCE_CATALOG.stages)),
    rules: { max: R.max, collect: R.collect, explore: R.explore, combat: R.combat, survival: R.survival, efficiencyTargets: R.efficiencyTargets },
    raw: {
      coins, b260, round, explore: { treasure: { got: exT.got, total: exT.total }, recipe: { got: exR.got, total: exR.total }, note: { got: exN.got, total: exN.total }, found: [...found] },
      combat: { normal, big, earnedWeight: earnedW, totalWeight: totalW, bossDefeated, otherEnemies: [] },
      survival: { totalActualHpLost: hpLost, totalFailures: defeats, deaths: run.deaths, timeouts: run.timeouts, manualRetries: run.manualRetries, interruptions: run.interruptions, failures: run.failures, damageScore, challengeScore, failureScore },
      efficiency: eff, failedAttemptTime: run.failedAttemptTime,
    },
    rawScores: raw, scores: rounded.parts, total, rank: rk.rank, rankTitle: rk.title,
    subParts: { collect: collect.parts, explore: explore.parts },
  };
}
function advRunIsComplete(run) { return OFFICIAL_ADVENTURE_STAGE_IDS.every(sid => !!run.stageResults[sid]) && !!run.stageResults['2-4'].bossDefeated; }

// triggerClear() 結束時呼叫：一般關卡 → 記錄整備恢復點；2-4 → 完成冒險、鎖定成績、顯示專屬總結算
function advAfterClear() {
  const sid = advCurrentStageId();
  const d = advLoad(); const run = d.active;
  if (!run) return;
  if (sid !== '2-4') {
    let rs = null; try { rs = JSON.stringify(currentRunStats); } catch (e) {}
    run.resume = { atPrep: true, stageId: sid, levelIndex: currentLevelIndex, hp: player.hp, nextBringDog: !!nextBringDog, elapsedSec: elapsedSec, runStats: rs, at: Date.now() };
    advSave(d); return;
  }
  if (!advRunIsComplete(run)) {  // 例如測試捷徑直接進 2-4：沒有七關紀錄 → 只當測試預覽
    if (run.status === 'in_progress') advTaint(run, 'incomplete-stages');
  }
  const snap = advComputeScore(run);
  snap.challengeId = run.challengeId; snap.playerKey = run.playerKey;
  snap.startedAt = run.startedAt; snap.completedAt = Date.now();
  snap.testOnly = run.status !== 'in_progress';
  snap.complete = advRunIsComplete(run);
  snap.stageResults = JSON.parse(JSON.stringify(run.stageResults));
  const prevBest = d.best[ADV_SCORE_VERSION] || null;
  let bestState = 'test';
  if (!snap.testOnly) {
    if (!prevBest) bestState = 'first';
    else if (snap.total > prevBest.total) bestState = 'new';
    else if (snap.total === prevBest.total) bestState = 'tie';
    else bestState = 'below';
    if (bestState === 'first' || bestState === 'new') d.best[ADV_SCORE_VERSION] = { total: snap.total, rank: snap.rank, rankTitle: snap.rankTitle, challengeId: run.challengeId, completedAt: snap.completedAt, scoreVersion: ADV_SCORE_VERSION, gameVersion: GAME_VERSION };
  }
  snap.bestState = bestState;
  snap.prevBest = prevBest ? { total: prevBest.total, rank: prevBest.rank } : null;
  run.snapshot = snap; run.finalScore = snap.total; run.finalRank = snap.rank; run.completedAt = snap.completedAt;
  if (!snap.testOnly) { run.status = 'completed'; d.recent.unshift(run); d.recent = d.recent.slice(0, ADV_RECENT_LIMIT); }
  else advArchiveRun(d, run, 'test_only');
  d.active = null;
  advSave(d);
  advLastSnapshot = snap;
  advShowFinalResults(snap, d.best[ADV_SCORE_VERSION] || null);
}
let advLastSnapshot = null;

// ── 開機：未完成的一趟冒險 → 詢問繼續或重新開始 ──
function advRunHasProgress(run) {
  return !!run && (Object.keys(run.stageResults).length > 0 || run.totalFailures > 0 || (run.manualRetries || 0) > 0 || run.totalActualHpLost > 0
    || (run.live && (run.live.sec >= 1 || run.live.hpLost > 0)));
}
function advBoot() {
  try { advVerifyCatalog(true); } catch (e) {}
  const d = advLoad(); const run = d.active;
  if (run && run.status === 'test_only') { advArchiveRun(d, run, 'test_only'); d.active = null; advSave(d); }
  else if (run && run.status === 'in_progress') {
    // 上次關閉網頁時還在關卡中 → 那次嘗試結束（v0.3.64：不扣分；已受到的傷害保留；恢復時回到該關開始）
    if (run.live) {
      const L = run.live;
      advCommitFailure(run, { stageId: L.stageId, type: 'interrupted', hpLost: L.hpLost || 0, sec: L.sec || 0 }); // v0.3.64：不加戰敗 / 重試次數，只保留傷害與耗時
      run.live = null; advSave(d);
    }
    if (advRunHasProgress(run)) { advShowResumePrompt(run); return; }
  }
  advOnAttemptStart(); // 開機直接在 1-1：建立 / 延續這一趟
}
function advShowResumePrompt(run) {
  advResumePromptOpen = true;
  let el = document.getElementById('adv-resume-overlay');
  if (!el) { el = document.createElement('div'); el.id = 'adv-resume-overlay'; document.body.appendChild(el); }
  const cleared = OFFICIAL_ADVENTURE_STAGE_IDS.filter(s => run.stageResults[s]).length;
  const r = run.resume || {};
  const where = r.atPrep ? (advStageLabel(r.stageId) + ' 過關後的整備') : ((r.stageId ? advStageLabel(r.stageId) : '1-1') + ' 開始');
  el.innerHTML = '<div class="adv-resume-card">'
    + '<div class="adv-resume-title">🎈 上一趟完整冒險還沒完成</div>'
    + '<div class="adv-resume-stats">已通過 <b>' + cleared + ' / 7</b> 關　·　戰敗 <b>' + run.totalFailures + '</b> 次　·　主動重試 <b>' + (run.manualRetries || 0) + '</b> 次　·　累計損失 <b>' + run.totalActualHpLost + '</b> HP</div>'
    + '<div class="adv-resume-hint">繼續的話，會從「' + escapeHtml(where) + '」接著冒險，戰敗、重試和受傷紀錄都會保留（重新整理不會額外扣分）。</div>'
    + '<div class="adv-resume-btns">'
    + '<button type="button" class="hv-ui-btn hv-ui-btn--primary" id="btn-adv-resume">▶ 繼續冒險</button>'
    + '<button type="button" class="hv-ui-btn" id="btn-adv-new">🆕 開始新的冒險</button>'
    + '</div><div class="adv-resume-note">開始新的冒險時，這一趟會封存為「已放棄」，不會計入成績。</div></div>';
  el.style.display = 'flex';
  document.getElementById('btn-adv-resume').onclick = (e) => { e.preventDefault(); advDoResume(); };
  document.getElementById('btn-adv-new').onclick = (e) => { e.preventDefault(); advDoAbandonAndStart(); };
}
function advHideResumePrompt() { advResumePromptOpen = false; const el = document.getElementById('adv-resume-overlay'); if (el) el.style.display = 'none'; lastTime = 0; fixedStepAccumulator = 0; }
function advDoAbandonAndStart() {
  const d = advLoad(); if (d.active) { advArchiveRun(d, d.active, 'abandoned'); d.active = null; advSave(d); }
  advHideResumePrompt();
  advOnAttemptStart(); // 目前畫面就是開機的 1-1 → 新的一趟
}
function advDoResume() {
  const d = advLoad(); const run = d.active;
  advHideResumePrompt();
  if (!run || !run.resume) { advOnAttemptStart(); return; }
  const r = run.resume;
  const idx = (typeof r.levelIndex === 'number' && LEVELS[r.levelIndex] && LEVELS[r.levelIndex].stageId === r.stageId) ? r.levelIndex : getLevelIndexByStageId(r.stageId);
  if (idx < 0) { advOnAttemptStart(); return; }
  const dog = playerInventory.balloonDog || {};
  const dogOk = !!dog.present && (dog.turnsLeft || 0) > 0;
  const go = () => {
    prepCheckpoint = null;
    if (r.atPrep) {
      // 恢復到「上一關過關後的整備」（和返回整備相同的做法：不重跑通關結算、不重發獎勵）
      currentLevelIndex = idx;
      loadLevel(idx);
      try { if (r.runStats) { const rs = JSON.parse(r.runStats); Object.keys(currentRunStats).forEach(k => { if (!(k in rs)) delete currentRunStats[k]; }); Object.assign(currentRunStats, rs); } } catch (e) {}
      player.hp = r.hp > 0 ? Math.min(player.maxHp, r.hp) : player.maxHp;
      elapsedSec = r.elapsedSec || 0;
      bringBalloonDog = false;
      nextBringDog = !!r.nextBringDog && dogOk;
      levelStartSnapshot = null; levelRolledBackForRetry = false;
      gameState = 'clear';
      populateResultPanel();
      try {
        const body = document.getElementById('result-panel-body');
        if (body) {
          const note = document.createElement('div'); note.className = 'rp-prep-return-note';
          note.innerHTML = '↩ 已恢復上一趟完整冒險：<b>' + getChapterDisplayTitle(idx) + '（' + advStageLabel(r.stageId) + '）</b> 過關後的整備<br><span>本節獎勵先前已領取，不會重複發放。準備好再出發吧！</span>';
          body.insertBefore(note, body.firstChild); body.scrollTop = 0;
        }
      } catch (e) {}
      updateNextLevelButton(); showResultButtons();
      if (typeof window.hidePauseBtn === 'function') window.hidePauseBtn();
    } else {
      // 恢復到該關開始（HP 與帶狗狀態回到該關開始時）
      currentLevelIndex = idx;
      player.hp = r.hp > 0 ? Math.min(player.maxHp, r.hp) : player.maxHp;
      bringBalloonDog = !!r.bringDog && dogOk;
      nextBringDog = false;
      loadLevel(idx);
      restart({ keepHp: true });
    }
  };
  if (typeof runWithAssetGate === 'function' && typeof getAssetGroupsForLevel === 'function') runWithAssetGate(getAssetGroupsForLevel(idx), getAssetGateTitleForLevel(idx), go);
  else go();
}
function advIsBlockingGame() { return advResumePromptOpen; }

// 盤點檢查：資源目錄要和關卡產生器一致（不一致時在 console 警告，並由 debugAdventureScore() 回報）
function advVerifyCatalog(quiet) {
  const issues = [];
  const saveR = playerInventory.roundBalloon;
  OFFICIAL_ADVENTURE_STAGE_IDS.forEach(sid => {
    const lv = LEVELS[getLevelIndexByStageId(sid)]; const c = ADV_RESOURCE_CATALOG.stages[sid];
    if (!lv) { issues.push(sid + ' 不存在'); return; }
    const en = lv.buildEnemies().map(e => e.variant || 'normal');
    playerInventory.roundBalloon = 0; const rb = lv.buildRoundBalloons ? lv.buildRoundBalloons().length : 0; playerInventory.roundBalloon = saveR;
    const got = { coins: lv.buildCoins().length, b260: lv.buildBalloons().length, roundMax: rb,
      normal: en.filter(v => v !== 'heavyBody').length, big: en.filter(v => v === 'heavyBody').length };
    Object.keys(got).forEach(k => { if (got[k] !== c[k]) issues.push(sid + ' ' + k + '：目錄 ' + c[k] + ' / 關卡 ' + got[k]); });
    const t = lv.hiddenTreasure; const want = c.explore.map(x => x.id);
    const have = t ? [sid + (t.type === 'recipe' ? '#recipe:' + t.recipeKey : t.type === 'goldChest' ? '#treasure:goldChest' : t.type === 'bossNote' ? '#note:' + t.id : '#hidden:' + t.type)] : [];
    if (JSON.stringify(want) !== JSON.stringify(have)) issues.push(sid + ' 探索物：目錄 ' + want.join(',') + ' / 關卡 ' + have.join(','));
  });
  if (issues.length && !quiet) console.warn('[Score] 資源目錄與關卡不一致', issues);
  else if (issues.length) console.warn('[Score] 資源目錄與關卡不一致', issues);
  return issues;
}
function debugAdventureScore() {
  const d = advLoad();
  const o = { storageKey: advStorageKey(), active: d.active, attempt: advAttempt ? advSerializeAttempt(advAttempt) : null, best: d.best, recent: d.recent.length, archived: d.archived.length, catalogIssues: advVerifyCatalog(true) };
  if (d.active) { try { o.previewScore = advComputeScore(d.active); } catch (e) { o.previewError = e.message; } }
  console.log('[Score]', o); return o;
}

// ════════════════════════════════════════════════════════════════════
//  v0.3.63：完整冒險總結算 UI 2.0（只在擊敗 2-4 橘子王、勝利演出結束後顯示）
// ════════════════════════════════════════════════════════════════════
function advFmt(n) { return Math.round(n).toLocaleString('en-US'); }
function advSecFmt(s) { return (s == null) ? '—' : (Math.round(s * 10) / 10).toFixed(1) + ' 秒'; }
function advShowFinalResults(snap, best) {
  let el = document.getElementById('adv-final-overlay');
  if (!el) { el = document.createElement('div'); el.id = 'adv-final-overlay'; document.body.appendChild(el); }
  const id = getPlayerIdentityForResult();
  const avatarKey = id.displayAvatarKey || id.avatarKey || id.baseAvatarKey || 'boy1';
  const avatarSrc = resolveAdventureAvatarSrc(avatarKey);
  const name = (playerProfile && (playerProfile.name || playerProfile.id)) || id.name || 'Player';
  const S = snap.scores, M = ADV_SCORE_RULES.max, raw = snap.raw;
  const bestBadge = {
    first: '<div class="adv-best-badge adv-best-badge--first">🎉 首次完成！</div>',
    new:   '<div class="adv-best-badge adv-best-badge--new">🏆 新紀錄！</div>',
    tie:   '<div class="adv-best-badge adv-best-badge--tie">⭐ 追平個人最佳！</div>',
    below: '', test: '',
  }[snap.bestState] || '';
  let v1Best = null; try { v1Best = (advLoad().best || {})[ADV_SCORE_VERSION_V1] || null; } catch (e) {}
  const v1Line = v1Best ? '<div class="adv-old-best">舊版計分規則（v1）最佳：' + advFmt(v1Best.total) + '（' + v1Best.rank + '）— 規則不同，不和本次比較</div>' : '';
  const bestLine = snap.testOnly
    ? (best ? '個人最佳：' + advFmt(best.total) + '（' + best.rank + '）' : '尚未有個人最佳紀錄')
    : (snap.bestState === 'below' ? '個人最佳：' + advFmt(best.total) + '（' + best.rank + '）' : '個人最佳：' + advFmt((best || snap).total) + '（' + (best || snap).rank + '）');
  const bar = (key, label, icon) => {
    const pct = Math.max(0, Math.min(100, S[key] / M[key] * 100));
    return '<div class="adv-cat"><div class="adv-cat-head"><span class="adv-cat-name">' + icon + ' ' + label + '</span>'
      + '<span class="adv-cat-num"><b>' + advFmt(S[key]) + '</b> / ' + advFmt(M[key]) + '</span></div>'
      + '<div class="adv-cat-bar"><div class="adv-cat-fill adv-cat-fill--' + key + '" style="width:' + pct.toFixed(1) + '%"></div></div></div>';
  };
  const row = (label, val) => '<div class="adv-row"><span>' + label + '</span><b>' + val + '</b></div>';
  const xy = o => o.got + ' / ' + o.total;
  const effRows = raw.efficiency.map(e => '<div class="adv-eff-row"><span class="adv-eff-stage">' + e.label + '</span>'
    + '<span>' + advSecFmt(e.sec) + '</span><span class="adv-eff-target">基準 ' + e.target + ' 秒' + (e.confirmed ? '' : '<i>測試值</i>') + '</span>'
    + '<span class="adv-eff-rate">' + Math.round(e.rate * 100) + '%</span></div>').join('');
  el.innerHTML = '<div class="adv-final-scroll"><div class="adv-final-panel">'
    + (snap.testOnly ? '<div class="adv-test-banner">🧪 測試紀錄預覽：' + (snap.complete ? '這趟冒險使用過測試捷徑' : '沒有依序完成正式七關') + '，不會更新個人最佳</div>' : '')
    + '<div class="adv-final-top">'
    +   '<div class="adv-final-player"><div class="adv-avatar-wrap"><img class="adv-avatar" src="' + escapeHtml(avatarSrc) + '" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><div class="adv-avatar-fb" style="display:none">🎈</div></div>'
    +     '<div class="adv-player-name">' + escapeHtml(name) + '</div></div>'
    +   '<div class="adv-final-head">'
    +     '<div class="adv-final-title">派對島大冒險完成！</div>'
    +     '<div class="adv-final-sub">第一章＋第二章｜完整冒險成績</div>'
    +     '<div class="adv-score-line"><span class="adv-score-total">' + advFmt(snap.total) + '</span><span class="adv-score-max"> / 10,000</span></div>'
    +     '<div class="adv-best-line">' + bestBadge + '<span>' + bestLine + '</span></div>' + v1Line
    +   '</div>'
    +   '<div class="adv-rank adv-rank--' + snap.rank + '"><div class="adv-rank-letter">' + snap.rank + '</div><div class="adv-rank-title">' + snap.rankTitle + '</div></div>'
    + '</div>'
    + '<div class="adv-section-title">五大分項</div>'
    + '<div class="adv-cats">' + bar('collect', '收集', '🪙') + bar('explore', '探索', '🗺️') + bar('combat', '戰鬥', '⚔️') + bar('survival', '生存', '❤️') + bar('efficiency', '效率', '⏱️') + '</div>'
    + '<div class="adv-section-title">詳細統計</div>'
    + '<div class="adv-details">'
    +   '<div class="adv-card"><div class="adv-card-title">🪙 收集　' + advFmt(S.collect) + ' / 3,000</div>'
    +     row('金幣', xy(raw.coins)) + row('260 氣球', xy(raw.b260)) + row('圓氣球', xy(raw.round))
    +     '<div class="adv-card-note">只算地圖上撿到的；商店購買、系統補發、寶箱金幣不算。圓氣球分母固定為七關配置的 9 顆（背包已滿時不會出現，就拿不到這幾顆）。</div></div>'
    +   '<div class="adv-card"><div class="adv-card-title">🗺️ 探索　' + advFmt(S.explore) + ' / 2,500</div>'
    +     row('隱藏寶物', xy(raw.explore.treasure)) + row('氣球秘笈', xy(raw.explore.recipe)) + row('重要筆記', xy(raw.explore.note))
    +     '<div class="adv-card-note">隱藏物需要帶氣球小狗才找得到。</div></div>'
    +   '<div class="adv-card"><div class="adv-card-title">⚔️ 戰鬥　' + advFmt(S.combat) + ' / 2,000</div>'
    +     row('一般蠍子（×1）', xy(raw.combat.normal)) + row('大型蠍子（×4）', xy(raw.combat.big)) + row('橘子王', raw.combat.bossDefeated ? '已擊敗 👑' : '未擊敗')
    +     '<div class="adv-card-note">橘子怪家族只能閃避，不列入擊敗率。</div></div>'
    +   '<div class="adv-card"><div class="adv-card-title">❤️ 生存　' + advFmt(S.survival) + ' / 1,500</div>'
    +     row('累計實際損失 HP', raw.survival.totalActualHpLost)
    +     row('戰敗（HP 歸零）', (raw.survival.deaths || 0) + ' 次') + row('時間到', (raw.survival.timeouts || 0) + ' 次') + row('主動重試', (raw.survival.manualRetries || 0) + ' 次')
    +     row('受傷得分', advFmt(raw.survival.damageScore) + ' / 600') + row('挑戰表現', advFmt(raw.survival.challengeScore != null ? raw.survival.challengeScore : raw.survival.failureScore) + ' / 900')
    +     '<div class="adv-card-note">戰敗（含時間到）每次 −150、暫停選單主動重試每次 −50；關閉或重新整理網頁不扣分。</div></div>'
    +   '<div class="adv-card adv-card--wide"><div class="adv-card-title">⏱️ 效率　' + advFmt(S.efficiency) + ' / 1,000</div>'
    +     '<div class="adv-eff-head"><span>關卡</span><span>成功通關時間</span><span>效率基準</span><span>表現</span></div>' + effRows
    +     '<div class="adv-card-note">只計算成功通關那一次的有效時間（暫停、對話、筆記、載入與勝利演出不計時）。</div></div>'
    + '</div>'
    + '<div class="adv-final-btns">'
    +   '<button type="button" class="hv-ui-btn hv-ui-btn--primary" id="btn-adv-new-adventure">🎈 開始新的冒險</button>'
    +   '<button type="button" class="hv-ui-btn" id="btn-adv-final-home">🏠 回到小V的家</button>'
    + '</div>'
    + '<div class="adv-final-foot">計分規則 ' + ADV_SCORE_VERSION + '　·　' + GAME_VERSION + '</div>'
    + '</div></div>';
  // 只保留新的完整冒險總結算（原本 2-4 單關結算留在背後，不同時顯示）
  const res = document.getElementById('result-overlay'); if (res) res.style.display = 'none';
  el.style.display = 'block';
  const sc = el.querySelector('.adv-final-scroll'); if (sc) sc.scrollTop = 0;
  document.getElementById('btn-adv-new-adventure').onclick = (e) => { e.preventDefault(); advStartNewAdventure(); };
  document.getElementById('btn-adv-final-home').onclick = (e) => { e.preventDefault(); advFinalGoHome(); };
}
function advHideFinalResults() { const el = document.getElementById('adv-final-overlay'); if (el) el.style.display = 'none'; }
function advIsFinalResultsOpen() { const el = document.getElementById('adv-final-overlay'); return !!(el && el.style.display !== 'none'); }
function advFinalGoHome() {
  advHideFinalResults();
  if (typeof openHomeScreen === 'function') openHomeScreen('clear');
}
// 重新開始一趟完整冒險：新的 challengeId，從 1-1 出發（背包 / 秘笈 / 身份等永久資料不清除）
function advStartNewAdventure() {
  advHideFinalResults();
  try { closeHomeScreen(); } catch (e) {}
  const res = document.getElementById('result-overlay'); if (res) res.style.display = 'none';
  try { hideResultButtons(); } catch (e) {}
  const d = advLoad(); if (d.active) { advArchiveRun(d, d.active, d.active.status === 'test_only' ? 'test_only' : 'abandoned'); d.active = null; advSave(d); }
  prepCheckpoint = null; bringBalloonDog = false; nextBringDog = false;
  const idx = 0;
  const go = () => {
    currentLevelIndex = idx;
    loadLevel(idx);
    restart({ keepHp: false });
    if (typeof window.showPauseBtn === 'function') window.showPauseBtn();
  };
  if (typeof runWithAssetGate === 'function') runWithAssetGate(getAssetGroupsForLevel(idx), getAssetGateTitleForLevel(idx), go); else go();
}
if (typeof window !== 'undefined') Object.assign(window, { debugAdventureScore, advVerifyCatalog, advStartNewAdventure, advComputeScore, advLoad });

// ════════════════════════════════════════════════════════════════════
//  v0.3.63：帶氣球小狗出發 — 安排成功的當下：260 −1（向下飄）→ 狗狗汪汪 RPG（小肉球）
// ════════════════════════════════════════════════════════════════════
let advLastPointer = null;
try { if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('pointerdown', e => { advLastPointer = { x: e.clientX, y: e.clientY, t: Date.now() }; }, true); } catch (e) {}
function showConsumeFloat(text) {
  let x = window.innerWidth / 2, y = window.innerHeight / 2;
  if (advLastPointer && Date.now() - advLastPointer.t < 1500) { x = advLastPointer.x; y = advLastPointer.y; }
  const el = document.createElement('div');
  el.className = 'adv-consume-float';
  el.textContent = text;
  el.style.left = Math.max(70, Math.min(window.innerWidth - 70, x)) + 'px';
  el.style.top  = Math.max(20, Math.min(window.innerHeight - 90, y - 18)) + 'px';
  document.body.appendChild(el);
  setTimeout(() => { try { el.remove(); } catch (e) {} }, 1500);
  return el;
}
function onDogDepartArranged() {
  try { showConsumeFloat('🎈 260 氣球 −1'); } catch (e) {}
  try { if (typeof rpgRequestUi === 'function') rpgRequestUi('rpg018_dog_depart', 900); } catch (e) {}
}

// ════════════════════════════════════════════════════════════════════
//  v0.3.64：音效（SFX）— 集中式路徑表 + 播放器
//  ──────────────────────────────────────────────────────────────────
//  ・路徑表 SFX_DEFS：25 個音效（assets/audio/sfx/<分類>/<檔名>.mp3），依「GitHub Pages 絕對路徑 → 相對路徑 → raw」順序嘗試
//    （正式首頁、rpg-test/、官網 iframe 都用同一組絕對路徑，不受頁面所在資料夾影響）
//  ・Web Audio：每個檔案只下載 / 解碼一次；播放時才建立輕量的播放節點（不在每一幀建立新的 Audio）
//  ・單次音效：每個音效有最短間隔與同時播放上限；全部音效另有總上限，避免無限疊加
//  ・循環音效（跑步、Boss 招式、製作）：每一幀依「目前遊戲狀態」決定開 / 關（sfxSyncFrame），
//    狀態結束、暫停、對話、切到背景、離開關卡時自動停止，不會殘留
//  ・循環區段 loopStart / loopEnd：跳過檔案頭尾的靜音（不修改原始音檔）
//  ・手機：使用者第一次觸控 / 按鍵後解鎖音訊；切到背景暫停音訊、回到前景恢復
//  ・載入失敗：該音效安靜略過，不影響遊戲
// ════════════════════════════════════════════════════════════════════
const SFX_BASE_PATH = 'assets/audio/sfx/';
const SFX_DEFS = {
  // 小V
  playerHurt:     { path: 'player/player_hurt.mp3',           vol: 0.9 },
  hammerSwing:    { path: 'player/player_hammer_swing.mp3',   vol: 0.8 },
  swordSwing:     { path: 'player/player_sword_swing.mp3',    vol: 0.8 },
  run:            { path: 'player/player_run.mp3',            vol: 0.45, loop: true, loopStart: 0.085, loopEnd: 8.547 },
  jump:           { path: 'player/player_jump.mp3',           vol: 0.7 },
  land:           { path: 'player/player_land.mp3',           vol: 0.6, minGapMs: 180 },
  hammerHit:      { path: 'player/player_hammer_hit.mp3',     vol: 0.9 },
  swordHit:       { path: 'player/player_sword_hit.mp3',      vol: 0.9 },
  // 橘子王
  bossSwordBlock: { path: 'boss/boss_sword_block.mp3',        vol: 0.85 },
  oilProjectileFly: { path: 'boss/boss_oil_projectile_fly.mp3', vol: 0.7, loop: true, loopStart: 0.452, loopEnd: 5.421 },
  oilAim:         { path: 'boss/boss_oil_aim.mp3',            vol: 0.7, loop: true, loopStart: 0.048, loopEnd: 2.40 },
  cannonCharge:   { path: 'boss/boss_cannon_charge.mp3',      vol: 0.75, loop: true },
  cannonFire:     { path: 'boss/boss_cannon_fire.mp3',        vol: 0.9 },
  chargeUp:       { path: 'boss/boss_charge_up.mp3',          vol: 0.75, loop: true, loopStart: 0.077, loopEnd: 6.874 },
  dash:           { path: 'boss/boss_dash.mp3',               vol: 0.8, loop: true },
  // 小狗
  dogBark:        { path: 'dog/dog_bark.mp3',                 vol: 0.8, minGapMs: 600 },
  dogHurt:        { path: 'dog/dog_hurt.mp3',                 vol: 0.7, minGapMs: 400 },
  dogAngry:       { path: 'dog/dog_angry.mp3',                vol: 0.6, minGapMs: 250, maxVoices: 2 },
  // 道具 / 介面
  ringGet:        { path: 'item/golden_pipe_ring_get.mp3',    vol: 0.9 },
  uiClick:        { path: 'ui/ui_button_click.mp3',           vol: 0.55, minGapMs: 90, maxVoices: 2 },
  recipeOpen:     { path: 'ui/ui_recipe_open.mp3',            vol: 0.8, minGapMs: 300 },
  secretDiscovered: { path: 'item/secret_discovered.mp3',     vol: 0.9, minGapMs: 500 },
  heal:           { path: 'item/heal.mp3',                    vol: 0.8, minGapMs: 500 },
  dialogOpen:     { path: 'ui/ui_dialog_open.mp3',            vol: 0.6, minGapMs: 200 },
  crafting:       { path: 'item/balloon_crafting.mp3',        vol: 0.7, loop: true, loopStart: 0.053, loopEnd: 6.197 },
  // ── v0.3.65 新增 14 個 ──
  // 橘子王（Boss 專用）
  bossWallImpact: { path: 'boss/boss_wall_impact.mp3',        vol: 0.9, minGapMs: 300 },                    // 衝刺撞牆 / 跳起震地落地的瞬間
  bossStunned:    { path: 'boss/boss_stunned.mp3',            vol: 0.7, loop: true, loopStart: 0, loopEnd: 2.043 }, // 喘氣（可以攻擊）期間
  bossTaunt:      { path: 'boss/boss_taunt_crouch.mp3',       vol: 0.9, minGapMs: 0, maxVoices: 1 },        // 2-4 開場：橘子王每一句台詞
  bossCrouch:     { path: 'boss/boss_taunt_crouch.mp3',       vol: 0.75, loop: true, loopStart: 0.357, loopEnd: 2.179, bufferOf: 'bossTaunt' }, // 衝撞前蹲下（同一個檔案）
  // 一般敵人（不是 Boss；檔案放在 boss/ 或 item/ 資料夾只是分類，綁定的是一般敵人）
  orangeSpray:    { path: 'boss/orange_spray.mp3',            vol: 0.6, minGapMs: 120, maxVoices: 2 },      // 一般橘子怪噴油（⚠ GitHub 目前沒有這個檔案）
  orangeSpecialSpray: { path: 'boss/orange_special_spray.mp3', vol: 0.6, minGapMs: 120, maxVoices: 2 },    // 雙噴嘴橘子 / 煙囪橘子噴發
  orangeProjectileRelease: { path: 'boss/orange_projectile_release.mp3', vol: 0.75, minGapMs: 150, maxVoices: 2 }, // 飛行油彈橘子 release
  orangeProjectileFly: { path: 'boss/orange_projectile_fly.mp3', vol: 0.55, loop: true, loopStart: 0, loopEnd: 1.832 }, // 飛行油彈橘子的油彈（不是橘子王的）
  giantScorpionHurt: { path: 'boss/giant_scorpion_hurt.mp3',  vol: 0.85, minGapMs: 90, maxVoices: 2 },      // 重甲（巨型）蠍子受到小V攻擊
  scorpionHurt:   { path: 'item/scorpion_hurt.mp3',           vol: 0.8, minGapMs: 90, maxVoices: 2 },       // 一般蠍子受到小V攻擊
  scorpionWalk:   { path: 'item/scorpion_walk.mp3',           vol: 0.45, loop: true },                      // 畫面中最近的一隻蠍子走路
  // 道具 / 介面
  balloonPickup:  { path: 'item/balloon_pickup.mp3',          vol: 0.75, minGapMs: 60, maxVoices: 2 },      // 260 / 圓氣球真的加入背包
  coinPickup:     { path: 'item/coin_pickup.mp3',             vol: 0.6, minGapMs: 45, maxVoices: 3 },       // 金幣（冷卻只影響聲音，金幣照加）
  dialogNext:     { path: 'ui/ui_dialog_next.mp3',            vol: 0.6, minGapMs: 60 },                     // RPG 對話第 2 句起
  levelClear:     { path: 'ui/ui_level_clear.mp3',            vol: 0.8, minGapMs: 1000, maxVoices: 1 },     // 每關正式過關
};
// v0.3.65：個別音量倍率（實機微調集中在這裡；1 = 原本音量）
const SFX_VOLUME_TUNING = {
  dogAngry: 0.75,   // 小狗憤怒：原音量約 75%（小V揮劍 / 揮槌維持清楚）
  dogHurt:  0.75,   // 小狗受傷：原音量約 75%（小V受傷不變）
  land:     0.70,   // 小V落地：降低 30%
};
function sfxVol(key) { const d = SFX_DEFS[key] || {}; return (d.vol != null ? d.vol : 1) * (SFX_VOLUME_TUNING[key] != null ? SFX_VOLUME_TUNING[key] : 1); }
const SFX_MAX_TOTAL_VOICES = 16;
const SFX = {
  ctx: null, master: null, buffers: {}, status: {}, urls: {}, tried: {},
  volume: 0.85, muted: false, unlocked: false, voices: [], lastPlay: {}, loops: {}, log: [], logOn: false,
  craftActive: false, prevBossPhase: null, airFrames: 0,
};
function sfxReadSettings() { try { const o = JSON.parse(localStorage.getItem('balloonV_sfxSettings') || 'null'); if (o) { if (typeof o.volume === 'number') SFX.volume = Math.max(0, Math.min(1, o.volume)); SFX.muted = !!o.muted; } } catch (e) {} }
function sfxSaveSettings() { try { localStorage.setItem('balloonV_sfxSettings', JSON.stringify({ volume: SFX.volume, muted: SFX.muted })); } catch (e) {} }
// 預留：音量 / 靜音（本版沒有設定畫面，之後可接 UI）
function sfxSetVolume(v) { SFX.volume = Math.max(0, Math.min(1, +v || 0)); if (SFX.master) SFX.master.gain.value = SFX.muted ? 0 : SFX.volume; sfxSaveSettings(); }
function sfxSetMuted(m) { SFX.muted = !!m; if (SFX.master) SFX.master.gain.value = SFX.muted ? 0 : SFX.volume; sfxSaveSettings(); }
function sfxEnsureCtx() {
  if (SFX.ctx) return SFX.ctx;
  try {
    const AC = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return null;
    // iOS Safari 17+：讓音效和 BGM 一樣不受靜音開關影響（不支援的瀏覽器略過）
    try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch (e) {}
    SFX.ctx = new AC();
    SFX.master = SFX.ctx.createGain();
    SFX.master.gain.value = SFX.muted ? 0 : SFX.volume;
    SFX.master.connect(SFX.ctx.destination);
  } catch (e) { SFX.ctx = null; }
  return SFX.ctx;
}
function sfxUnlock() {
  const c = sfxEnsureCtx(); if (!c) return;
  if (c.state === 'suspended' && !(typeof document !== 'undefined' && document.hidden)) { try { c.resume(); } catch (e) {} }
  if (!SFX.unlocked) {
    SFX.unlocked = true;
    try { const b = c.createBuffer(1, 1, 22050); const s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch (e) {} // iOS 解鎖
    sfxPreloadAll();
  }
}
function sfxCandidates(rel) {
  const p = SFX_BASE_PATH + rel;
  if (typeof getAssetSourceCandidates === 'function') return getAssetSourceCandidates(p).map(c => c.url);
  return [resolveAdventureAssetSrc(p) + '?v=' + encodeURIComponent(GAME_VERSION)];
}
function sfxBufferKey(key) { const d = SFX_DEFS[key]; return (d && d.bufferOf) || key; }
function sfxLoad(key) {
  key = sfxBufferKey(key);
  const def = SFX_DEFS[key]; if (!def) return Promise.resolve(null);
  if (SFX.status[key] === 'loaded' || SFX.status[key] === 'loading' || SFX.status[key] === 'failed') return SFX.status[key + '__p'] || Promise.resolve(null);
  const c = sfxEnsureCtx(); if (!c || typeof fetch !== 'function') { SFX.status[key] = 'failed'; return Promise.resolve(null); }
  SFX.status[key] = 'loading';
  const urls = sfxCandidates(def.path); SFX.tried[key] = [];
  const tryAt = (i) => {
    if (i >= urls.length) { SFX.status[key] = 'failed'; console.warn('[SFX] 載入失敗（略過這個音效）', def.path, SFX.tried[key]); return null; }
    return fetch(urls[i]).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
      .then(ab => new Promise((res, rej) => { try { const pr = c.decodeAudioData(ab, res, rej); if (pr && pr.then) pr.then(res, rej); } catch (e) { rej(e); } }))
      .then(buf => { SFX.buffers[key] = buf; SFX.status[key] = 'loaded'; SFX.urls[key] = urls[i]; return buf; })
      .catch(err => { SFX.tried[key].push(urls[i].replace(/\?.*$/, '') + ' → ' + (err && err.message || err)); return tryAt(i + 1); });
  };
  const p = tryAt(0);
  SFX.status[key + '__p'] = p;
  return p;
}
let sfxPreloadStarted = false;
function sfxPreloadAll() {
  if (sfxPreloadStarted) return; sfxPreloadStarted = true;
  const keys = Object.keys(SFX_DEFS).filter(k => !SFX_DEFS[k].bufferOf);
  let i = 0; const next = () => { if (i >= keys.length) return; const k = keys[i++]; Promise.resolve(sfxLoad(k)).then(next, next); };
  for (let n = 0; n < 4; n++) next(); // 同時最多 4 個下載，不搶走關卡圖片的頻寬
}
function sfxCanPlay() { return !!(SFX.ctx && SFX.ctx.state === 'running' && !(typeof document !== 'undefined' && document.hidden)); }
function sfxLog(type, key) { if (SFX.logOn) SFX.log.push({ type, key, t: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now())) }); }
// 單次音效
function sfxPlay(key, opts) {
  try {
    const def = SFX_DEFS[key]; if (!def || def.loop) return false;
    const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    if (now - (SFX.lastPlay[key] || -1e9) < (def.minGapMs != null ? def.minGapMs : 70)) return false; // 同一個音效太密集 → 略過（只影響聲音，不影響遊戲）
    SFX.lastPlay[key] = now;
    sfxLog('play', key);
    if (!sfxCanPlay()) return false;
    const buf = SFX.buffers[sfxBufferKey(key)]; if (!buf) { sfxLoad(key); return false; }
    SFX.voices = SFX.voices.filter(v => !v.ended);
    const same = SFX.voices.filter(v => v.key === key);
    if (same.length >= (def.maxVoices || 3)) { try { same[0].src.stop(); } catch (e) {} same[0].ended = true; }
    if (SFX.voices.filter(v => !v.ended).length >= SFX_MAX_TOTAL_VOICES) return false;
    const c = SFX.ctx, src = c.createBufferSource(), g = c.createGain();
    src.buffer = buf; g.gain.value = sfxVol(key) * ((opts && opts.vol) || 1);
    src.connect(g); g.connect(SFX.master);
    const v = { key, src, g, ended: false }; src.onended = () => { v.ended = true; };
    src.start(0, (opts && opts.offset) || 0);
    SFX.voices.push(v);
    return v; // v0.3.65：回傳播放中的聲音（可以用 sfxStopVoice 提前停止）
  } catch (e) { return false; }
}
// 循環音效：on = true 開始（已在播就不動）/ false 停止
// v0.3.65：提前停止某一個單次音效（短淡出，避免爆音）
function sfxStopVoice(v, fadeMs) {
  if (!v || v === true || v.ended) return;
  try {
    const c = SFX.ctx, t = c.currentTime, f = Math.max(0.01, (fadeMs || 80) / 1000);
    v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(v.g.gain.value, t); v.g.gain.linearRampToValueAtTime(0.0001, t + f);
    v.src.stop(t + f + 0.01);
  } catch (e) { try { v.src.stop(); } catch (er) {} }
  v.ended = true; sfxLog('voiceStop', v.key);
}
function sfxLoop(key, on) {
  const cur = SFX.loops[key];
  if (!on) {
    if (cur) { try { cur.src.stop(); } catch (e) {} delete SFX.loops[key]; sfxLog('loopStop', key); }
    return;
  }
  if (cur) return;
  if (!sfxCanPlay()) return;
  const def = SFX_DEFS[key]; const buf = SFX.buffers[sfxBufferKey(key)];
  if (!def || !buf) { if (def) sfxLoad(key); return; }
  try {
    const c = SFX.ctx, src = c.createBufferSource(), g = c.createGain();
    src.buffer = buf; src.loop = true;
    const ls = Math.max(0, Math.min(def.loopStart || 0, buf.duration - 0.05));
    const le = Math.min(buf.duration, def.loopEnd || buf.duration);
    if (le > ls + 0.05) { src.loopStart = ls; src.loopEnd = le; }
    g.gain.value = sfxVol(key) * ((SFX.loopGainMul && SFX.loopGainMul[key]) || 1);
    src.connect(g); g.connect(SFX.master);
    src.start(0, ls);
    SFX.loops[key] = { src, g, at: c.currentTime };
    sfxLog('loopStart', key);
  } catch (e) {}
}
function sfxStopAllLoops() { Object.keys(SFX.loops).forEach(k => sfxLoop(k, false)); }
const SFX_GAME_LOOPS = ['run', 'oilAim', 'oilProjectileFly', 'cannonCharge', 'chargeUp', 'dash', 'bossStunned', 'bossCrouch', 'scorpionWalk', 'orangeProjectileFly'];
// v0.3.65：判斷東西在不在畫面裡（世界座標）
function sfxOnScreen(x, w, margin) { const m = margin || 0; return x + (w || 0) > cameraX - m && x < cameraX + CANVAS_W + m; }
// 一般敵人噴發：每一隻敵人自己的那一聲，噴發結束就淡出停止（不會噴完還響很久）
function sfxEnemySprayEdge(o, phaseKey, key, sprayingName) {
  const ph = o[phaseKey];
  if (ph === sprayingName && o._sfxPrevPhase !== sprayingName && (o.active !== false) && sfxOnScreen(o.x, o.w || 60, 40)) o._sfxVoice = sfxPlay(key);
  if (ph !== sprayingName && o._sfxVoice) { sfxStopVoice(o._sfxVoice, 120); o._sfxVoice = null; }
  o._sfxPrevPhase = ph;
}
function sfxStopEnemyVoices() {
  try { [orangeNemeses, chimneyOranges, dualNozzleOranges].forEach(arr => (arr || []).forEach(o => { if (o._sfxVoice) { sfxStopVoice(o._sfxVoice, 60); o._sfxVoice = null; } o._sfxPrevPhase = null; })); } catch (e) {}
}
// 每一幀：依目前狀態決定循環音效（只有狀態改變時才真的開 / 關）
function sfxSyncFrame() {
  const want = {};
  const hidden = (typeof document !== 'undefined' && document.hidden);
  const playing = !hidden && gameState === 'playing' && !(typeof rpgActive !== 'undefined' && rpgActive && !rpgActive.ui)
    && !(typeof isGameStartGateActive === 'function' && isGameStartGateActive())
    && !(typeof advIsBlockingGame === 'function' && advIsBlockingGame())
    && !(typeof assetGateActive !== 'undefined' && assetGateActive)
    && !(typeof screenFreezeForTest !== 'undefined' && screenFreezeForTest);
  if (playing) {
    if (player.onGround && Math.abs(player.vx || 0) > 0.5 && player.hp > 0) want.run = true;
    const b = (typeof orangeKingBoss !== 'undefined') ? orangeKingBoss : null;
    if (b && typeof isOrangeKingStageActive === 'function' && isOrangeKingStageActive() && b.phase !== 'defeated' && b.hp > 0) {
      if (b.phase === 'lobAim' && b.activeLob) want.oilAim = true;                           // 拋物線瞄準虛線存在期間
      if ((b.lobShots || []).some(s => !s.hit)) want.oilProjectileFly = true;                // 還有油彈在空中飛
      if (b.phase === 'sprayWarn') want.cannonCharge = true;                                 // 油管砲集氣（預警線）
      // v0.3.65：蓄力聲和蹲姿聲不重疊 — 預警（chargeWarn）蓄力聲 → 蹲下（chargeCurl）蹲姿聲 → 原地旋轉蓄力（chargeSpin）再接回蓄力聲
      if (b.phase === 'chargeWarn' || b.phase === 'chargeSpin') want.chargeUp = true;       // 縮球衝撞的蓄力
      if (b.phase === 'chargeCurl') want.bossCrouch = true;                                  // 衝撞前蹲下（保持蹲姿時循環）
      if (b.phase === 'chargeDash') want.dash = true;                                        // 衝刺
      if (b.phase === 'cooldown') want.bossStunned = true;                                   // 喘氣暈眩（唯一可以攻擊的時段）
      if (b.phase === 'sprayFire' && SFX.prevBossPhase !== 'sprayFire') sfxPlay('cannonFire'); // 砲擊發射瞬間
      if (b.phase === 'chargeRecover' && SFX.prevBossPhase === 'chargeDash') sfxPlay('bossWallImpact'); // 衝刺撞牆的瞬間
      if (b.phase === 'slamLand' && SFX.prevBossPhase === 'slamDown') sfxPlay('bossWallImpact');       // 跳起震地、落地產生油漬的瞬間
    }
    SFX.prevBossPhase = b ? b.phase : null;
    // v0.3.65：一般敵人（不是 Boss）
    try {
      (orangeNemeses || []).forEach(o => sfxEnemySprayEdge(o, 'phase', 'orangeSpray', 'spraying'));                 // 一般橘子怪
      (chimneyOranges || []).forEach(o => sfxEnemySprayEdge(o, 'sprayPhase', 'orangeSpecialSpray', 'spraying'));    // 煙囪橘子
      (dualNozzleOranges || []).forEach(o => sfxEnemySprayEdge(o, 'sprayPhase', 'orangeSpecialSpray', 'spraying')); // 雙噴嘴橘子
      (projectileOranges || []).forEach(po => {                                                                    // 飛行油彈橘子：切到 release 那一刻
        if (po.active && po.phase === 'release' && po._sfxPrevPhase !== 'release' && sfxOnScreen(po.x, po.w || 80, 40)) sfxPlay('orangeProjectileRelease');
        po._sfxPrevPhase = po.phase;
      });
      if ((projectileOrangeShots || []).some(s => s.active !== false && sfxOnScreen(s.x - 30, 60, 0))) want.orangeProjectileFly = true;
      // 蠍子走路：只用畫面中離小V最近、正在移動的一隻，音量依距離平滑變化
      let near = null, nd = 1e9; const pc = player.x + player.w / 2;
      (enemies || []).forEach(e => { if (!e.active || Math.abs(e.vx || 0) < 0.05 || !sfxOnScreen(e.x, e.w, 0)) return; const d = Math.abs(e.x + e.w / 2 - pc); if (d < nd) { nd = d; near = e; } });
      if (near) { want.scorpionWalk = true; SFX.walkTarget = Math.max(0.25, Math.min(1, 1 - nd / 800)); }
    } catch (e) {}
  } else {
    sfxStopEnemyVoices();
  }
  SFX_GAME_LOOPS.forEach(k => sfxLoop(k, !!want[k]));
  // 蠍子走路音量：依距離平滑調整（不會忽大忽小）
  try { const w = SFX.loops.scorpionWalk; if (w && SFX.walkTarget != null) w.g.gain.setTargetAtTime(sfxVol('scorpionWalk') * SFX.walkTarget, SFX.ctx.currentTime, 0.15); } catch (e) {}
  // 製作音效：綁定「製作提示」實際顯示的期間（提示消失 / 秘笈關閉 / 切到背景 → 停止）
  // v0.3.65：綁定畫面上的「🎈 製作成功！」提示本身（v0.3.64 綁的是秘笈上方的綠色小字，比提示晚 1 秒多才消失）
  let craftOn = false;
  if (SFX.craftActive) {
    const el = SFX.craftEl;
    const gb = (typeof document !== 'undefined') ? document.getElementById('guidebook-overlay') : null;
    let op = 0; try { op = (el && el.isConnected) ? parseFloat(getComputedStyle(el).opacity) : 0; } catch (e) { op = 0; }
    const young = (Date.now() - (SFX.craftAt || 0)) < 400; // 提示剛出現時正在淡入（透明度從 0 開始）
    const shown = !!(el && el.isConnected && (op > 0.05 || young) && gb && gb.style.display && gb.style.display !== 'none');
    if (shown && !hidden) craftOn = true; else if (!shown) { SFX.craftActive = false; SFX.craftEl = null; }
  }
  sfxLoop('crafting', craftOn);
}
// ── 事件掛勾（由遊戲各處呼叫）──
function sfxOnPlayerFrameStart() { SFX.wasOnGround = !!player.onGround; }
function sfxOnPlayerFrameEnd() {
  if (player.onGround) {
    if (!SFX.wasOnGround && SFX.airFrames >= 6) sfxPlay('land'); // 真的從空中落地（站著 / 碰撞判定不會重複觸發）
    SFX.airFrames = 0;
  } else SFX.airFrames++;
}
function sfxOnAttackStart(weapon) {
  sfxPlay(weapon === 'hammer' ? 'hammerSwing' : 'swordSwing');
  // 有帶小狗、狗狗切到 dog_angry 攻擊姿態（2-4 Boss 房沒有小狗）
  if (bringBalloonDog && !(typeof isOrangeKingStageActive === 'function' && isOrangeKingStageActive())) sfxPlay('dogAngry');
}
function sfxOnPlayerHurt() {
  sfxPlay('playerHurt');
  if (bringBalloonDog && !(typeof isOrangeKingStageActive === 'function' && isOrangeKingStageActive())) setTimeout(() => sfxPlay('dogHurt'), 140); // 小狗和小V同步進入受傷狀態
}
let sfxLastHealAt = 0;
function sfxOnHeal(gained) { if (!(gained > 0)) return; const now = Date.now(); if (now - sfxLastHealAt < 600) return; sfxLastHealAt = now; sfxPlay('heal'); }
function sfxOnDialogOpen(scene) {
  sfxPlay('dialogOpen');
  if (scene && Array.isArray(scene.pages) && scene.pages.some(p => p && p.sp === 'dog')) setTimeout(() => sfxPlay('dogBark'), 160); // 狗狗汪汪的對話
}
// v0.3.65：RPG 對話切換 / 橘子王嗆聲
let sfxDialogShown = null, sfxTauntVoice = null;
function sfxOnDialogPage(scene, i, p) {
  const key = scene.id + '#' + i;
  if (sfxDialogShown === key) return;          // 同一句重新顯示不重播
  sfxDialogShown = key;
  const king = p && p.sp === 'king';
  if (i > 0) sfxPlay('dialogNext', { vol: king ? 0.35 : 1 }); // 第 2 句起；橘子王台詞時降低切換音，讓嗆聲清楚
  if (king) { if (sfxTauntVoice) sfxStopVoice(sfxTauntVoice, 60); sfxTauntVoice = sfxPlay('bossTaunt'); } // 上一句還沒播完 → 停掉再播
}
function sfxOnDialogClose() { sfxDialogShown = null; if (sfxTauntVoice) { sfxStopVoice(sfxTauntVoice, 120); sfxTauntVoice = null; } }
// v0.3.65：過關音效（自然播完；開始下一關 / 重試 / 重新開始時停止）
let sfxClearVoice = null, sfxClearTimer = 0;
function sfxOnLevelClear() {
  sfxStopLevelClear();
  // 2-4：橘子王勝利音樂還在播 → 等它播完再接過關音效（不重疊、不延遲結算畫面）
  let waitMs = 0;
  try { const j = (typeof orangeKingJingle !== 'undefined') ? orangeKingJingle : null; if (j && !j.paused && !j.ended && isFinite(j.duration)) waitMs = Math.max(0, (j.duration - j.currentTime) * 1000); } catch (e) {}
  if (waitMs > 50) sfxClearTimer = setTimeout(() => { sfxClearTimer = 0; if (gameState === 'clear') sfxClearVoice = sfxPlay('levelClear'); }, waitMs + 150);
  else sfxClearVoice = sfxPlay('levelClear');
}
function sfxStopLevelClear() { clearTimeout(sfxClearTimer); sfxClearTimer = 0; if (sfxClearVoice) { sfxStopVoice(sfxClearVoice, 150); sfxClearVoice = null; } }
function sfxStartCrafting(el) { if (!el) return; SFX.craftActive = true; SFX.craftEl = el; SFX.craftAt = Date.now(); }
// 介面按鈕：一次操作只響一次（滑鼠 / 觸控 / 鍵盤 Enter）；遊戲操作鍵、已停用的按鈕不響
let sfxSuppressClickUntil = 0, sfxLastBtnEl = null, sfxLastBtnAt = 0;
// v0.3.65：所有「開啟氣球秘笈」的入口（暫停選單 / 結算 / 小V的家 / 下一步提示裡的按鈕）
const SFX_RECIPE_OPENER_IDS = ['btn-guidebook', 'btn-pause-guidebook', 'btn-home-open-guidebook'];
function sfxIsRecipeOpener(t) {
  if (!t) return false;
  if (SFX_RECIPE_OPENER_IDS.includes(t.id)) return true;
  const oc = t.getAttribute && (t.getAttribute('onclick') || '');
  return /openGuidebook/.test(oc);
}
function sfxOnRecipeOpen() { sfxSuppressClickUntil = Date.now() + 250; sfxPlay('recipeOpen'); }
function sfxHandleUiPress(e) {
  try {
    const t = e.target && e.target.closest ? e.target.closest('button, [role="button"]') : null;
    if (!t || t.disabled || t.getAttribute('aria-disabled') === 'true') return;
    if (t.closest('#mobile-controls') || t.classList.contains('ctrl-btn')) return; // 移動 / 跳躍 / 攻擊等遊戲按鍵
    if (sfxIsRecipeOpener(t)) return; // v0.3.65：開啟氣球秘笈的按鈕 → 只播秘笈音效（真的開啟時才播），不播一般按鈕聲
    const now = Date.now();
    if (t === sfxLastBtnEl && now - sfxLastBtnAt < 450) return; // 同一次操作的 pointerdown + click 只算一次
    sfxLastBtnEl = t; sfxLastBtnAt = now;
    setTimeout(() => { if (Date.now() < sfxSuppressClickUntil) return; sfxPlay('uiClick'); }, 0); // 開秘笈等有專屬音效的按鈕不再疊按鈕聲
  } catch (err) {}
}
try {
  sfxReadSettings();
  if (typeof document !== 'undefined' && document.addEventListener) {
    ['pointerdown', 'touchend', 'keydown', 'click'].forEach(ev => document.addEventListener(ev, sfxUnlock, true));
    document.addEventListener('pointerdown', e => { if (e.isPrimary !== false) sfxHandleUiPress(e); }, true);
    document.addEventListener('click', e => { if (e.detail === 0) sfxHandleUiPress(e); }, true); // 鍵盤 Enter / 空白鍵按按鈕
    document.addEventListener('visibilitychange', () => {
      try {
        if (!SFX.ctx) return;
        if (document.hidden) { sfxStopAllLoops(); SFX.ctx.suspend(); }
        else if (SFX.unlocked) SFX.ctx.resume();
      } catch (e) {}
    });
  }
} catch (e) {}
function debugSfx() {
  const o = { ctx: SFX.ctx ? SFX.ctx.state : 'none', unlocked: SFX.unlocked, volume: SFX.volume, muted: SFX.muted,
    status: Object.fromEntries(Object.keys(SFX_DEFS).map(k => [k, SFX.status[sfxBufferKey(k)] || 'idle'])),
    failed: Object.fromEntries(Object.keys(SFX_DEFS).filter(k => !SFX_DEFS[k].bufferOf && SFX.status[k] === 'failed').map(k => [k, SFX.tried[k]])),
    loops: Object.keys(SFX.loops), voices: SFX.voices.filter(v => !v.ended).map(v => v.key) };
  console.log('[SFX]', o); return o;
}
if (typeof window !== 'undefined') Object.assign(window, { SFX, SFX_DEFS, sfxPlay, sfxLoop, sfxSetVolume, sfxSetMuted, debugSfx, sfxPreloadAll });

runWithAssetGate(['common', 'chapter1', 'rpgBoot'], '派對島準備中...', () => {
  assetBootReady = true;
  try { sfxEnsureCtx(); setTimeout(() => { try { sfxPreloadAll(); } catch (e) {} }, 800); } catch (e) {} // v0.3.64：音效在背景下載 / 解碼（不擋開機）
  try { preloadAssetGroup('rpg'); } catch (e) {} // v0.3.59：其他 RPG 立繪開機後立刻在背景載入（不擋開機）
  try { renderStartGate(); } catch (e) {} // v0.3.57：手機 → 顯示「橫向 / 全螢幕 / 開始冒險」準備畫面（遊戲邏輯還沒開始）
  // v0.3.55：開機完成後在背景預載小狗動作圖（不擋開機；晚到的圖照規則等下一次進關才套用）
  try { setTimeout(() => { try { preloadAssetGroup('dog'); } catch (e) {} }, 1500); } catch (e) {}
});
loadLevel(0);        // 載入第 1 關
initEquippedSword(); // 初始化裝備（只執行一次）
initEquippedHammer();
normalizeActiveWeaponSlot();          // 確保 activeSlot 指向有效武器
applyAdventureTestLoadout();          // 測試版：runtime-only sword + hammer
try { advBoot(); } catch (e) { console.warn('[Score] 開機初始化失敗', e); } // v0.3.63：完整冒險挑戰紀錄

// 測試版：綁定暫停畫面測試按鈕
(function bindPauseTestBtns() {
  const btnPauseReset = document.getElementById('btn-pause-reset-test');
  if (btnPauseReset) {
    btnPauseReset.style.display = ADVENTURE_TEST_TOOLS_ENABLED ? '' : 'none';
    btnPauseReset.addEventListener('click', resetAdventureTestState);
  }
  const btnTestLevel3 = document.getElementById('btn-pause-test-level3');
  if (btnTestLevel3) {
    btnTestLevel3.style.display = 'none'; // v0.3.28-polish：已測試完成，暫停選單不再顯示（function 保留）
    btnTestLevel3.addEventListener('click', startAdventureTestLevel3);
  }
  // v0.3.14：橘子怪測試關按鈕
  const btnTestOrange = document.getElementById('btn-pause-test-orange');
  if (btnTestOrange) {
    btnTestOrange.style.display = 'none'; // v0.3.28-polish：已測試完成，暫停選單不再顯示（function 保留）
    btnTestOrange.addEventListener('click', startOrangeTestLevel);
  }
  // v0.3.15：Enemy Variant+Tier 測試按鈕
  const btnTestVariant = document.getElementById('btn-pause-test-variant');
  if (btnTestVariant) {
    btnTestVariant.style.display = 'none'; // v0.3.28-polish：已測試完成，暫停選單不再顯示（function 保留）
    btnTestVariant.addEventListener('click', startEnemyVariantTestLevel);
  }
  // v0.3.19：第二章 2-1 測試按鈕
  // v0.3.27-menu-cleanup：舊「🏭 測試第二章」入口一律隱藏（連到舊版第二章，含 fan orange 幾何版本，
  // 容易與新的第二章方向混淆）。startChapter2TestLevel() 保留不刪，只是不從暫停選單顯示。
  const btnTestCh2 = document.getElementById('btn-pause-test-ch2');
  if (btnTestCh2) {
    btnTestCh2.style.display = 'none';
    btnTestCh2.addEventListener('click', startChapter2TestLevel);
  }
  // v0.3.25：雙噴嘴橘子美術測試按鈕
  const btnTestDualOrange = document.getElementById('btn-pause-test-dual-orange');
  if (btnTestDualOrange) {
    btnTestDualOrange.style.display = 'none'; // v0.3.28-polish：已測試完成，暫停選單不再顯示（function 保留）
    btnTestDualOrange.addEventListener('click', startDualOrangeTestLevel);
  }
  // v0.3.26：飛行油彈橘子美術測試按鈕
  const btnTestProjOrange = document.getElementById('btn-pause-test-projectile-orange');
  if (btnTestProjOrange) {
    btnTestProjOrange.style.display = 'none'; // v0.3.28-polish：已測試完成，暫停選單不再顯示（function 保留）
    btnTestProjOrange.addEventListener('click', startProjectileOrangeTestLevel);
  }
  // v0.3.27：第二章橘子家族綜合測試按鈕
  const btnTestOrangeFamily = document.getElementById('btn-pause-test-orange-family');
  if (btnTestOrangeFamily) {
    btnTestOrangeFamily.style.display = 'none'; // v0.3.28-polish：已測試完成，暫停選單不再顯示（function 保留）
    btnTestOrangeFamily.addEventListener('click', startOrangeFamilyMixTestLevel);
  }
  // v0.3.27：⛰️ 測試第二章地形 → 直接進入 runtime-only 地形原型測試關
  const btnTestCh2Terrain = document.getElementById('btn-pause-test-chapter2-terrain');
  if (btnTestCh2Terrain) {
    btnTestCh2Terrain.style.display = 'none'; // v0.3.28-polish：已測試完成，暫停選單不再顯示（function 保留）
    btnTestCh2Terrain.addEventListener('click', startChapter2TerrainPrototypeTestLevel);
  }
  // v0.3.33：發現物品視窗「收進背包，繼續冒險」
  const btnDiscoveryClose = document.getElementById('btn-discovery-item-close');
  if (btnDiscoveryClose) {
    ['click', 'touchstart'].forEach(ev => btnDiscoveryClose.addEventListener(ev, e => {
      e.preventDefault();
      e.stopPropagation();
      closeDiscoveryItemModal();
    }));
  }
  // v0.3.35：🍊 測試 2-4 橘子王 → 直接進入 Boss 房（測試版限定，不清背包）
  const btnTestOrangeKing = document.getElementById('btn-pause-test-orange-king');
  if (btnTestOrangeKing) {
    btnTestOrangeKing.style.display = ADVENTURE_TEST_TOOLS_ENABLED ? '' : 'none';
    btnTestOrangeKing.addEventListener('click', startOrangeKingBossTestLevel);
  }
  // v0.3.28-polish：🚀 測試正式第二章 → 直接進入正式 2-1（不是地形 prototype）
  const btnTestCh2Formal = document.getElementById('btn-pause-test-chapter2-formal');
  if (btnTestCh2Formal) {
    btnTestCh2Formal.style.display = ADVENTURE_TEST_TOOLS_ENABLED ? '' : 'none';
    btnTestCh2Formal.addEventListener('click', startFormalChapter2TestLevel);
  }
})();

// v0.3.29：會改變背包內容的操作，執行後一律刷新背包摘要（結算頁 + 小V的家）
// 用包裝方式加上刷新，不改動這些函式原本的邏輯與回傳值
[
  'bringDogNextLevel', 'homeBringDog', 'buyShopItem', 'useHealingItem',
  'homeUseBandage', 'buyBandage', 'craftItem', 'homeMakeDog',
].forEach(name => {
  const orig = globalThis[name];
  if (typeof orig !== 'function') return;
  globalThis[name] = function (...args) {
    const result = orig.apply(this, args);
    try { refreshInventorySummary(); } catch (e) {}
    return result;
  };
});

requestAnimationFrame(loop);

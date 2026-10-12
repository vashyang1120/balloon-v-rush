
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
const GAME_VERSION = 'adventure-v0.3.35-orange-king-boss-victory-pose-fix-1';
const BUILD_TIME   = '2026-10-12 22:50';
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
function startOrangeTestLevel() {
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
function startChapter2TestLevel() {
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
function startDualOrangeTestLevel() {
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
function startOrangeFamilyMixTestLevel() {
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

function startChapter2TerrainPrototypeTestLevel() {
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
function startFormalChapter2TestLevel() {
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

function startProjectileOrangeTestLevel() {
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

function startEnemyVariantTestLevel() {
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
  if (e.code === 'Escape') {
    // v0.3.33：最上層是發現物品視窗 → ESC 等同「收進背包，繼續冒險」
    if (isDiscoveryItemModalOpen()) { closeDiscoveryItemModal(); return; }
    // v0.3.29-fix-1：ESC 先關最上層 overlay — 暫停背包開著時只關背包，回到暫停選單
    if (isPauseBagOpen()) { closePauseBagBackToPauseMenu(); return; }
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
  // v0.3.35-fix-1：做出劍 / 槌後，結算頁與小V的家的「下一關」狀態要立刻解鎖（2-4 武器檢查）
  if (recipeId === 'basicSword' || recipeId === 'basicHammer') refreshAdventureProgressAfterCraft();
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
      name:        '橘子王弱點筆記',
      displayName: '橘子王弱點筆記',
      x:           5200,
      y:           GROUND_Y - 70,
      found:       false,
      emoji:       '📓',
      title:       '橘子王弱點筆記 01',
      // v0.3.35：改成 2-4 Boss 戰的完整攻略（renderDiscoveryItemModal 以「。」分段顯示）
      noteText:    '橘子王身上的油管會在攻擊前發亮。不同高度的油管，代表不同高度的噴油攻擊。'
                 + '牠用頭上的油管瞄準時，會先出現油彈路線。看到路線後，立刻移動到安全平台。'
                 + '小心牠縮成一顆高速旋轉的橘子球。牠衝撞時，高處平台可能是安全位置。'
                 + '橘子王身上有一個金色油管環。第一次衝撞後，那個環可能會掉落。那個環能讓你手上的氣球武器暫時變成真正的武器。'
                 + '記住：不要急著硬衝。等橘子王連續攻擊後喘氣，再靠近反擊！',
      foundMsg:    '氣球小狗找到橘子王弱點筆記！',
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
      { x: 0, y: GROUND_Y - 220, w: 190, h: 22 },  // 最高平台（躲衝撞）
      { x: 0, y: GROUND_Y - 115, w: 300, h: 22 },  // 中層平台
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
// 以背包（craftedItems）判斷：耐久用完時 consumeXxxDurability 會把數量扣到 0，所以數量 > 0 = 還有可用武器
// （測試版的 runtime 測試武器不寫入背包，不算數）
function hasUsableBossWeapon() {
  const ci = playerInventory.craftedItems || {};
  return (ci.basicSword || 0) > 0 || (ci.basicHammer || 0) > 0;
}
function isBossWeaponGateBlocked(nextIdx) {
  return isBossStageLevel(nextIdx) && !hasUsableBossWeapon();
}
const BOSS_WEAPON_GATE_MSG = '⚔️ 橘子王太危險了！請先製作一把氣球劍或氣球槌，再前往 2-4。';

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
  if (bossStage) updateOrangeKingBoss(dtMs); // v0.3.35
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
      player.hammerAnimTimer    = HAMMER_ATTACK_ASSETS.length * HAMMER_ATTACK_FRAME_DUR;
      player.hammerSwingId      = (player.hammerSwingId || 0) + 1; // v0.3.18-fix-2：新槌擊 ID
      player.hammerHit          = false;
    } else if (activeSlot === 'sword' && equippedSword && equippedSword.id === 'basicSword') {
      player.attackCooldown = CONFIG.BASIC_SWORD_ATTACK_COOLDOWN;
      player.meleeActive    = CONFIG.BASIC_SWORD_ATTACK_DURATION;
      player.meleeHit       = false;
      player.swordSwingId   = (player.swordSwingId || 0) + 1; // v0.3.18-test-2：新揮劍 ID
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

  if (e.hp <= 0) {
    e.hp = 0;
    e.active = false;
    player.enemiesDefeated++;
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
  if (t.type === 'bossNote' && t.id && playerInventory.keyItems && playerInventory.keyItems[t.id]) return false;
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
    id: k.id, type: k.type, emoji: k.emoji || '📓', name: k.name || k.id,
    title: k.title || '', noteText: latestNote || k.noteText || '', hintText,
  };
}
function openKeyItemReadModal(id) {
  const item = getKeyItemDisplayData(id);
  if (!item) return;
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
        notifTitle    = (t.emoji || '📓') + ' 找到' + (t.name || 'Boss 弱點筆記') + '！';
        notifSubtitle = '已收進背包「其他物品」';
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
      showHint(t.foundMsg || ('找到隱藏寶箱！獲得 ' + coins + ' 金幣！'), 320); // v0.3.31：可用關卡 foundMsg
    } else if (t.type === 'bossNote') {
      // v0.3.33-fix-1：Boss 弱點筆記先放在本關 pending，通關（triggerClear）才正式寫入
      // playerInventory.keyItems 並存檔；死亡 / 重試 / 時間到都不會保存，重試時可再找一次
      const noteId = t.id || 'bossNote';
      const isNewNote = !(playerInventory.keyItems || {})[noteId]; // 已正式取得的不會出現在關卡（防呆）
      if (!currentRunStats.pendingKeyItems) currentRunStats.pendingKeyItems = {};
      currentRunStats.pendingKeyItems[noteId] = {
        id:         noteId,
        type:       'bossNote',
        name:       t.name || 'Boss 弱點筆記',
        emoji:      t.emoji || '📓',
        title:      t.title || t.name || 'Boss 弱點筆記',
        noteText:   t.noteText || '',
        hintText:   t.hintText || '',
      };
      currentRunStats.foundHiddenTreasureName = t.name || 'Boss 弱點筆記';
      currentRunStats.foundBossNote = {
        id: noteId, name: t.name || 'Boss 弱點筆記', title: t.title || '', noteText: t.noteText || '',
      };
      console.log('boss note found (pending until clear):', noteId);
      showHint(t.foundMsg || ('找到' + (t.name || 'Boss 弱點筆記') + '！'), 320);
      // v0.3.33：重要發現物品 → 展示視窗（資料已先存好，視窗只負責展示）
      if (isNewNote && DISCOVERY_MODAL_TREASURE_TYPES.includes(t.type)) {
        openDiscoveryItemModal({
          id:       noteId,
          type:     t.type,
          emoji:    t.emoji || '📓',
          name:     t.name || 'Boss 弱點筆記',
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
  player.hp--;
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
  HURT_INVULN_MS:  450,   // 被打一下後短暫無敵，避免一次喘氣就被連打到底
  SWORD_DAMAGE:    1,
  HAMMER_DAMAGE:   2,
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
const ORANGE_KING_LANES = {
  high: { y: GROUND_Y - 260, label: '高' },
  mid:  { y: GROUND_Y - 155, label: '中' },
  low:  { y: GROUND_Y - 40,  label: '低' },
};
const ORANGE_KING_LANE_ORDER = ['low', 'high', 'mid', 'high', 'low', 'mid'];
// 拋物線油彈路線（依序輪替）：tx / ty = 路線經過的目標點，vx = 水平速度
const ORANGE_KING_LOB_ROUTES = [
  // v0.3.35-fix-1：水平速度放慢（約 1.5 秒飛完），配合 LOB_GRAVITY 0.15
  { tx: 150, ty: GROUND_Y - 255, vx: -8.5 },  // 掃過最高平台（弧頂約 y=79，不被 HUD 擋住）
  { tx: 200, ty: GROUND_Y - 150, vx: -7   },  // 掃過中層平台
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
    victorySafe: false,          // v0.3.35-victory-pose-fix-1：擊敗後的勝利保護（不共用 player.invincible）
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
function getOrangeKingNozzle(laneKey) {
  const b = orangeKingBoss;
  const lane = ORANGE_KING_LANES[laneKey];
  // 噴嘴放在身體輪廓外側，三個高度都看得到
  const nx = laneKey === 'high' ? b.x - 6 : (laneKey === 'mid' ? b.x - 8 : b.x - 6);
  return { x: nx, y: lane.y };
}
function getOrangeKingLobOrigin() {
  const b = orangeKingBoss;
  return { x: b.x + 128, y: b.y - 58 };
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
  b.ring.state = 'collected';
  b.ringActive = true;
  // v0.3.35-fix-1：金色油管環只讓「已經擁有的」氣球劍 / 槌暫時實體化，不會產生武器
  //               （沒有武器的玩家在進入 2-4 前就會被 checkChapter1ProgressionGate 擋下）
  b.ringAuraMs = 1400; // 小V身上的金色光圈
  orangeKingFloatText('武器實體化！', player.x + player.w / 2, player.y - 10, '#ffe066');
  showHint('✨ 金色油管環讓氣球武器實體化了！', 210);
  b.pendingHint = { msg: '💡 等橘子王連續攻擊後喘氣，再靠近反擊！', delayMs: 3500 };
}

function getOrangeKingSprayBand(laneKey) {
  const n = getOrangeKingNozzle(laneKey);
  const h = ORANGE_KING.SPRAY_BAND_H;
  return { x: 0, y: n.y - h / 2, w: n.x, h };
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
    if (!s.hit && circleRectOverlap(p.x, p.y, ORANGE_KING.LOB_RADIUS, pr.x, pr.y, pr.w, pr.h)) {
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
  const swingId = weapon === 'hammer' ? player.hammerSwingId : player.swordSwingId;
  const lockKey = weapon === 'hammer' ? 'lastHammerSwingId' : 'lastSwordSwingId';
  const hr = getOrangeKingHurtRect();
  if (!rectsOverlap(ax, ay, aw, ah, hr.x, hr.y, hr.w, hr.h)) return;
  if (b[lockKey] === swingId) return; // 同一次揮擊只判定一次
  b[lockKey] = swingId;
  const fx = hr.x + 10, fy = Math.max(hr.y + 30, ay + ah / 2);
  if (!b.ringActive) {
    orangeKingFloatText('✦', fx, fy, '#cfe8ff');
    showHint('🎈 氣球武器還不能傷到橘子王！', 150);
    return;
  }
  if (b.phase !== 'cooldown' || b.invulnMs > 0) {
    orangeKingFloatText('✦ 鏘！', fx, fy, '#cfe8ff');
    if (b.phase !== 'cooldown') showHint('🛡️ 現在打不進去！等牠喘氣再攻擊！', 130);
    return;
  }
  const dmg = weapon === 'hammer' ? ORANGE_KING.HAMMER_DAMAGE : ORANGE_KING.SWORD_DAMAGE;
  b.hp = Math.max(0, b.hp - dmg);
  b.hurtFlashMs = 260;
  b.invulnMs = ORANGE_KING.HURT_INVULN_MS;
  orangeKingFloatText('-' + dmg, fx, fy - 10, '#ff5c5c');
  for (let i = 0; i < 12; i++) { // 命中點金色火花
    const ang = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 4;
    b.sparks.push({ x: fx, y: fy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 2, ms: 0 });
  }
  orangeKingShake(160, 3);
  if (b.hp <= 0) startOrangeKingDefeat();
}

// ── 擊敗流程 ──
function startOrangeKingDefeat() {
  const b = orangeKingBoss;
  setOrangeKingPhase('defeated');
  b.curled = false;
  b.x = Math.max(b.x, 520);
  b.y = GROUND_Y - b.h;
  b.activeLane = null; b.activeLob = null;
  b.lobShots = []; b.puddles = [];
  b.crownY = 0; b.crownVy = -6; b.crownRot = 0;
  b.ringActive = false; // 油管環失去光芒，實體化效果結束
  orangeKingShake(600, 8);
  // v0.3.35-victory-pose-fix-1：不再用 player.invincible 保護（會讓小V顯示 hurt 受傷臉並閃爍）
  //   改用 Boss 自己的勝利保護旗標 victorySafe：orangeKingHitPlayer() 直接不判定
  b.victorySafe = true;
  b.dashHitDone = true;
  player.invincible = 0;       // 立刻恢復正常姿勢（idle / 跑步），不顯示受傷臉、不閃爍
  orangeKingBanner('橘子王被打敗了！', '', 1400);
}
function updateOrangeKingDefeat(dtMs, k) {
  const b = orangeKingBoss;
  b.crownVy += 0.5 * k;
  b.crownY += b.crownVy * k;
  b.crownRot += 0.08 * k;
  if (b.phaseMs >= 1400 && (!b.banner || b.banner.text !== '第二章完成！')) {
    if (!b.chapterBannerShown) { b.chapterBannerShown = true; orangeKingBanner('第二章完成！', '🏆 小V保護了派對島的氣球！', 1600); }
  }
  if (b.phaseMs >= 3000 && !b.clearTriggered) {
    b.clearTriggered = true;
    currentRunStats.chapter2Complete = true;
    triggerClear();
  }
}

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

  // 油漬
  b.puddles.forEach(p => {
    const grow = Math.min(1, p.ms / 200);
    const fade = p.ms > p.life - 600 ? Math.max(0, (p.life - p.ms) / 600) : 1;
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

  // 水平噴油預警線
  if (b.phase === 'sprayWarn' && b.activeLane) {
    const band = getOrangeKingSprayBand(b.activeLane);
    const blink = Math.floor(b.phaseMs / 120) % 2 === 0;
    ctx.save();
    ctx.fillStyle = 'rgba(255,60,60,0.10)';
    ctx.fillRect(band.x - cx, band.y, band.w, band.h);
    ctx.strokeStyle = blink ? 'rgba(255,70,70,0.95)' : 'rgba(255,170,70,0.7)';
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.moveTo(band.x - cx, band.y + band.h / 2);
    ctx.lineTo(band.x + band.w - cx, band.y + band.h / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = blink ? '#ff4d4d' : '#ffb347';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('⚠', 22 - cx, band.y + band.h / 2 + 9);
    ctx.restore();
  }

  // 拋物線預測軌跡
  if (b.phase === 'lobAim' && b.activeLob) {
    ctx.save();
    const blink = Math.floor(b.phaseMs / 140) % 2 === 0;
    ctx.fillStyle = blink ? 'rgba(255,90,60,0.95)' : 'rgba(255,190,80,0.85)';
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
    drawGoldOilRing(ring.x - cx, ring.y + bob, 1, true, t);
  }

  drawOrangeKingBody(cx);
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
    const nh = getOrangeKingNozzle('high'), nm = getOrangeKingNozzle('mid'), nl = getOrangeKingNozzle('low');
    drawOrangeKingPipe(bx + bw * 0.35, by + 18, nh.x - cx + 8, nh.y, sprayGlow && lane === 'high', t);
    drawOrangeKingPipe(bx + bw * 0.3, by + bh * 0.42, nm.x - cx + 8, nm.y, sprayGlow && lane === 'mid', t);
    drawOrangeKingPipe(bx + bw * 0.3, by + bh * 0.85, nl.x - cx + 8, nl.y, sprayGlow && lane === 'low', t);
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
    ['high', 'mid', 'low'].forEach(key => {
      const nz = getOrangeKingNozzle(key);
      drawOrangeKingNozzle(nz.x - cx + wobbleX, nz.y, sprayGlow && lane === key, t);
    });
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
    const pulse = 0.5 + 0.5 * Math.sin(t / 110);
    ctx.strokeStyle = b.ringActive ? `rgba(120,255,160,${0.4 + 0.5 * pulse})` : `rgba(200,200,200,${0.25 + 0.25 * pulse})`;
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.ellipse(ccx, ccy, bw / 2 + 10, bh / 2 + 10, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = b.ringActive ? '#9dffb5' : '#ddd';
    ctx.fillText(b.ringActive ? '💦 喘氣中！快攻擊！' : '💦 喘氣中', ccx, by - 58);
  }
  ctx.restore();
}

// 前景層：水平油柱、拋物線油彈、浮動文字（畫在小V與平台之上）
function drawOrangeKingFront(cx) {
  const b = orangeKingBoss;
  if (!b) return;
  const t = b.totalMs;
  if (b.phase === 'sprayFire' && b.activeLane) {
    const band = getOrangeKingSprayBand(b.activeLane);
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
  b.lobShots.forEach(s => {
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
    const filled = i < b.hp;
    ctx.fillStyle = filled ? (b.hurtFlashMs > 0 ? '#ffffff' : '#ff8a1f') : 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.roundRect(x0 + i * (segW + gap), y0, segW, 14, 4); ctx.fill();
  }
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23f';
  const ringTxt = b.ringActive ? '  ✨ 武器實體化中' : '';
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

// 測試版：🍊 直接進入 2-4 Boss 關（不清背包，只換關卡）
function startOrangeKingBossTestLevel() {
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
  closePauseBag(); // v0.3.29-fix-1：保險 — 遊戲繼續時暫停背包一定不留在畫面上
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
    player.hp = Math.min(player.maxHp, player.hp + 0.5);
    currentRunStats.dogHealed = true;
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
    drawOrangeKingBanner(); // v0.3.35
    drawHintBox();
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

// v0.3.35：Boss 震動時整個世界一起晃（HUD 不晃）
function drawWorld() {
  const shake = getOrangeKingShakeOffset();
  if (shake) { ctx.save(); ctx.translate(shake.x, shake.y); }
  drawWorldInner();
  if (shake) ctx.restore();
}

function drawWorldInner() {
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

  // v0.3.27-terrain：地面缺口（低處坑道）— 挖掉地面，坑底由平台繪製
  groundGaps.forEach(g => {
    const gx = g.x - cx;
    if (gx > CANVAS_W + 10 || gx + g.w < -10) return;
    ctx.fillStyle = '#4a3220';                       // 坑內陰影
    ctx.fillRect(gx, GROUND_Y, g.w, CANVAS_H - GROUND_Y);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';              // 左右坑壁
    ctx.fillRect(gx, GROUND_Y, 6, CANVAS_H - GROUND_Y);
    ctx.fillRect(gx + g.w - 6, GROUND_Y, 6, CANVAS_H - GROUND_Y);
  });

  // Finish flag（v0.3.35：Boss 房沒有終點線）
  if (!isOrangeKingStageActive()) drawFinishFlag(cx);

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
    drawEnemy(sx, e.y, e.w, e.h, e.hitFlash > 0, e.vx, e); // v0.3.15：pass e for variant/tier
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

  // v0.3.35：2-4 橘子王（預警線 / 油漬 / 金色油管環 / 本體，畫在小V之前）
  if (orangeKingBoss) drawOrangeKingBack(cx);

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
  // v0.3.35-fix：orange-king-boss-victory-pose-fix-N → boss-victory-fixN
  if (GAME_VERSION.includes('orange-king-boss-victory-pose-fix')) {
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
    + '小狗陪你完成最後一次冒險，已經消氣回家了。<br>'
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
  // v0.3.32：Boss 弱點筆記有專屬提示卡；其他隱藏物沿用原本提示
  const bossNoteFound = (gameState === 'clear' && currentRunStats.foundBossNote) ? currentRunStats.foundBossNote : null;
  const bossNoteFirstLine = bossNoteFound ? String(bossNoteFound.noteText || '').split('。')[0] : '';
  const treasureHint = bossNoteFound
    ? ('<div class="rp-guidebook-hint" style="border-color:rgba(255,220,80,0.5);background:rgba(80,60,0,0.2)">'
      + '<div class="rp-guidebook-hint__title">📓 找到 Boss 弱點筆記！</div>'
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
    if (nextLvHasTreasure && !nextStepAlreadyHandlesBringDog) { // v0.3.33-fix-2：重新製作的小狗也能安排
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
    foundBadges.push('<div class="rp-award-badge rp-award-badge--recipe"><span>📓</span>Boss 弱點筆記！</div>');
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

  // 【第四層】補給（預設收合；v0.3.34：受傷且背包有繃帶 / 急救包時自動展開）
  const _healItems     = playerInventory.items || {};
  const supplyAutoOpen = player.hp < player.maxHp
    && ((_healItems.bandage || 0) > 0 || (_healItems.firstAidKit || 0) > 0);
  const supplyHtml = '<div class="rp-fold-card" id="supply-section">'
    + '<div class="rp-fold-btn" data-target="rp-supply-body" onclick="rpToggle(this)">'
    + '<span class="rp-fold-icon">🏥</span><span>補給</span><span class="rp-toggle-arrow">' + (supplyAutoOpen ? '▼' : '▶') + '</span></div>'
    + '<div id="rp-supply-body" style="display:' + (supplyAutoOpen ? 'block' : 'none') + '">'
    + buildResultSupplyHpRowHtml()
    + '<div id="rp-heal-items">' + buildHealingItemRowsHtml('result') + '</div>'
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
      + '<div class="rp-guidebook-hint__body">橘子王太危險了！<br>請先製作一把氣球劍或氣球槌，再前往 2-4。</div>'
      + '<button class="rp-next-step-btn" style="margin-top:8px" onclick="openGuidebook()">📖 打開氣球秘笈製作武器</button>'
      + '</div>';
  } else
  // v0.3.35：下一關是 Boss 關 → 出發前提醒
  if (gameState === 'clear' && isBossStageLevel(getNextLevelIndex(currentLevelIndex))) {
    const hasNote = !!(playerInventory.keyItems || {}).orangeKingWeaknessNote01;
    html += '<div class="rp-guidebook-hint rp-boss-next-card">'
      + '<div class="rp-guidebook-hint__title">👑 下一關：橘子王決戰！</div>'
      + '<div class="rp-guidebook-hint__body">出發前先補滿血量'
      + (hasNote ? '，也可以再讀一次弱點筆記。' : '。') + '</div>'
      + (hasNote ? '<button class="rp-next-step-btn" style="margin-top:8px" onclick="openKeyItemReadModal(\'orangeKingWeaknessNote01\')">📖 閱讀弱點筆記</button>' : '')
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

  // 第一層：重點收穫
  html += '<div class="rp-hero-section" id="rp-hero-section">'
    + '<div class="rp-reward-grid">' + mainTiles + '</div>'
    + (badgesHtml ? '<div class="rp-awards">' + badgesHtml + '</div>' : '')
    + '</div>';
  // V幣獎勵 section（Phase 3A，earned > 0 才顯示）
  html += '<div id="rp-vcoin-section" style="display:none"></div>';

  // 隱藏發現（槌子解鎖 / 秘笈 / 受傷提醒已移到上方提醒區）
  html += treasureHint;
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
  updateStickyStatusVisibility(); // v0.3.34
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
  showHint(item.icon + ' ' + item.name + ' 購買成功！', 180);
}

function useHealingItem(itemId) {
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
    html += '<div class="home-shop-card" style="background:rgba(255,255,255,0.06);border-radius:10px;padding:10px 12px">';
    html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">';
    html += '<span style="font-size:1.5em">' + item.icon + '</span>';
    html += '<span style="font-weight:bold;font-size:1.05em">' + item.name + '</span>';
    html += '<span style="margin-left:auto;color:#ffe080;font-size:0.95em">🪙 ' + item.priceCoins + ' 金幣</span>';
    html += '</div>';
    html += '<div style="color:#aaa;font-size:0.88em;margin-bottom:6px">' + item.description + '</div>';
    html += '<div style="display:flex;align-items:center;justify-content:space-between">';
    html += '<span style="font-size:0.9em;color:#ccc">持有：<b>' + have + ' / ' + item.maxCarry + '</b></span>';
    html += '<button class="' + btnCls + '" ' + btnDisbl + ' style="padding:5px 14px;font-size:0.92em" '
          + 'onclick="buyShopItem(\'' + item.id + '\')">購買</button>';
    html += '</div>';
    html += '</div>';
  });

  html += '</div>';
  html += '<div style="margin-top:8px;color:#888;font-size:0.82em">目前金幣：🪙 ' + coins + '</div>';
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
    if (k && k.id) list.push({ icon: k.emoji || '📓', label: k.name || k.id, count: 1, readId: k.noteText ? k.id : null });
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
function buildHpHeartsHtml() {
  const maxHp = player.maxHp || CONFIG.PLAYER_MAX_HP || 3;
  const hp    = Math.max(0, Math.min(maxHp, Number(player.hp) || 0));
  let html = '';
  for (let i = 0; i < maxHp; i++) {
    const cls = hp >= i + 1 ? 'ss-heart--full' : (hp >= i + 0.5 ? 'ss-heart--half' : 'ss-heart--empty');
    html += '<span class="ss-heart ' + cls + '">❤️</span>';
  }
  return html;
}
function formatHpText() {
  const maxHp = player.maxHp || CONFIG.PLAYER_MAX_HP || 3;
  return (Number(player.hp) || 0) + ' / ' + maxHp;
}
function buildStickyStatusBarHtml() {
  const others = getInventoryOtherItems();
  const low    = (Number(player.hp) || 0) <= 1;
  return '<div class="sticky-status__bar">'
    + '<span class="ss-item ss-hp' + (low ? ' ss-hp--low' : '') + '">' + buildHpHeartsHtml()
    +   '<b>' + formatHpText() + '</b></span>'
    + '<span class="ss-item">🪙 <b>' + Number(playerInventory.coins || 0) + '</b></span>'
    + '<span class="ss-item">🎈<span class="ss-lbl"> 260</span> <b>×' + Number(playerInventory.balloon260 || 0) + '</b></span>'
    + '<span class="ss-item">⚪ <b>×' + Number(playerInventory.roundBalloon || 0) + '</b></span>'
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
  }).join('');
}

function buildResultSupplyHpRowHtml() {
  return '<div class="rp-supply-hp-row" id="rp-supply-hp-row">' + buildHpHeartsHtml()
    + '<span class="rp-supply-hp-num" id="supply-hp">' + formatHpText() + '</span></div>';
}

// 結算頁 / 小V的家使用繃帶、急救包（冒險中仍走暫停背包 useHealingItem）
function useHealingItemOutOfAdventure(itemId) {
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
    +   '<div class="inv-sum__card"><div class="inv-sum__head">🪙 金幣</div>'
    +     '<div class="inv-sum__big">' + coins + '</div></div>'
    +   '<div class="inv-sum__card"><div class="inv-sum__head">🎈 氣球材料</div>'
    +     '<div class="inv-sum__line">260 <b>×' + b260 + '</b></div>'
    +     '<div class="inv-sum__line">圓氣球 <b>×' + round + '</b></div></div>'
    +   '<div class="inv-sum__card"><div class="inv-sum__head">📦 其他物品</div>' + otherInner + '</div>'
    + '</div></div>';
}

// 小V的家最上方的背包摘要
function renderHomeInventorySummary() {
  const el = document.getElementById('home-inventory-summary');
  if (!el) return;
  el.innerHTML = buildInventorySummaryHtml({ showHp: true }); // v0.3.34：含血量
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
    { e:'🪙',  v: playerInventory.coins,       lbl:'金幣',    cls:'inv-coin',   dur:null },
    { e:'🎈',  v: playerInventory.balloon260,  lbl:'260 氣球',cls:'inv-balloon',dur:null },
    { e:'⚪',  v: playerInventory.roundBalloon,lbl:'圓氣球',  cls:'inv-round',  dur:null },
    { e:'⚔️', v: ci.basicSword     ||0,        lbl:'氣球劍',  cls:'inv-sword',  dur:eqSword },
    { e:'🔨', v: ci.basicHammer    ||0,        lbl:'氣球槌',  cls:'inv-hammer', dur:eqHammer },
    { e:'🍭', v: ci.balloonLollipop||0,        lbl:'棒棒糖',  cls:'inv-candy',  dur:null },
    // v0.3.32：重要物品（Boss 弱點筆記等）；v0.3.33-fix-1：可點擊閱讀
    ...Object.values(playerInventory.keyItems || {}).filter(k => k && k.id).map(k =>
      ({ e: k.emoji || '📓', v: 1, lbl: k.name || k.id, cls: 'inv-key', dur: null, readId: k.noteText ? k.id : null })),
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
    + '<div id="home-heal-items">' + buildHealingItemRowsHtml('home') + '</div>' // v0.3.34
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
  const ok = craftItem('balloonDog');
  if (ok) {
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
    const supplyHp = document.getElementById('supply-hp');
    if (supplyHp) supplyHp.textContent = player.hp + ' / ' + player.maxHp;
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
  }
}

// ── 下一關資訊 ──────────────────────────────
function renderHomeNextStage() {
  clearInvalidDogTripPlan('renderHomeNextStage'); // v0.3.33-fix-2
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
      + '<div class="hns-hint">請先製作一把氣球劍或氣球槌，再前往 2-4。</div>'
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
  // v0.3.29-fix-1：背包只在暫停中開啟，不讓遊戲回到 playing
  if (gameState === 'playing') pauseGame();
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
    // v0.3.32：重要物品
    ...Object.values(playerInventory.keyItems || {}).filter(k => k && k.id).map(k =>
      ({ e: k.emoji || '📓', v: 1, lbl: k.name || k.id, cls: 'inv-key', dur: null })),
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
    + (healHtml ? '<div style="margin-top:8px"><div style="color:#ffe080;font-size:0.85em;margin-bottom:4px">🩹 補血道具</div>' + healHtml + '</div>' : '')
    + dogHtml;
  panel.style.display = 'flex';
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
  if (isBossStageLevel(currentLevelIndex)) initOrangeKingBoss();

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

function isAdventureCoreArtReady() {
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
initScorpionSkinArt();                // v0.3.15-test-2：預載各 skin variant 圖片
initHammerAttackArt();                // 非阻塞地嘗試載入 hammer attack 素材
initOrangeEnemyArt();                 // 非阻塞地嘗試載入橘子怪 skin 素材
initChimneyOrangeArt();              // v0.3.22：煙囟橘子正式素材（非阻塞，fallback 幾何）
initChimneyOrangeOilArt();           // v0.3.24：煙囟橘子油柱正式圖（非阻塞，fallback canvas overlay）
initDualOrangeArt();                 // v0.3.25：雙噴嘴橘子全套美術（非阻塞，fallback 幾何）
initProjectileOrangeArt();           // v0.3.26：飛行油彈橘子美術測試（非阻塞，fallback 幾何）
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

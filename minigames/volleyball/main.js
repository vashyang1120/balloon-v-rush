/* =========================================================
   《氣球排球》幾何原型 MVP v0.1
   - 原生 JavaScript + Canvas 2D，無外部依賴
   - 不使用 localStorage / Firebase / 任何共用玩家資料
   ========================================================= */
'use strict';

(() => {

// =========================================================
// 【可調參數設定區】所有數值都可在這裡調整
// 單位：位置 = 像素（1280×720 邏輯座標），速度 = 像素/秒，時間 = 秒
// =========================================================
const CONFIG = {
  VERSION: 'v0.2.0-test-1',

  // ---- 場地 ----
  WORLD_W: 1280,              // 邏輯寬度
  WORLD_H: 720,               // 邏輯高度（16:9）
  GROUND_Y: 640,              // 地板高度（y 往下為正）
  NET_X: 640,                 // 球網中心 x
  NET_W: 16,                  // 球網寬度
  NET_H: 210,                 // 球網高度（從地板往上）
  CEILING_Y: 0,               // 天花板（球碰到會反彈，不會飛出畫面）

  // ---- 角色（玩家與電腦共用）----
  CHAR_RADIUS: 52,            // 角色碰撞半徑（圓形）
  CHAR_MOVE_SPEED: 430,       // 水平移動速度（放開即停，無滑行）
  CHAR_JUMP_SPEED: 1060,      // 跳躍初速度
  CHAR_GRAVITY: 2700,         // 角色重力
  JUMP_BUFFER: 0.10,          // 落地前提早按跳躍的緩衝時間
  PLAYER_START_X: 220,        // 玩家每球開始位置
  CPU_START_X: 1060,          // 電腦每球開始位置

  // ---- 排球 ----
  BALL_RADIUS: 30,
  BALL_GRAVITY: 900,          // 球重力（街機風格，比真實氣球快）
  BALL_MAX_SPEED: 1300,       // 球速上限
  BALL_WALL_RESTITUTION: 0.9, // 撞左右牆／天花板反彈係數
  BALL_NET_RESTITUTION: 0.7,  // 撞球網反彈係數

  // ---- 普通碰球（沒按擊球鍵時）----
  BOUNCE_RESTITUTION: 0.85,   // 普通碰球反彈係數
  BOUNCE_CARRY: 0.45,         // 角色本身速度帶給球的比例
  BOUNCE_MIN_UP: 520,         // 從上方或側面碰到時，至少給球的向上速度（方便接球）
  BOUNCE_FORWARD_BIAS: 110,   // 普通碰球額外往對方場地推的水平速度
  TOUCH_COOLDOWN: 0.13,       // 同一角色連續碰球的冷卻（防止每影格重複加速）

  // ---- 主動擊球（Space / 擊球鍵）----
  HIT_ACTIVE_TIME: 0.20,      // 按下後擊球判定持續時間（容錯時間）
  HIT_REACH: 38,              // 擊球判定比身體多出的距離
  HIT_LOB_POWER: 960,         // 地面／側面擊球力量（高吊球）
  HIT_SPIKE_POWER: 1180,      // 空中由上往下扣球力量
  HIT_NET_CLEARANCE: 28,      // 扣球時自動保留的過網高度餘裕
  // 重新觸發條件：必須放開擊球鍵再按下（程式邏輯固定，不需參數）

  // ---- 發球 ----
  SERVE_HEIGHT: 140,          // 球停在發球者頭頂上方的距離
  SERVE_VX: 430,              // 發球水平初速度（自動朝向對方）
  SERVE_VY: -640,             // 發球垂直初速度（負值往上）
  SERVE_AIM_VX: 70,           // 玩家發球時按方向鍵可增減的水平速度
  CPU_SERVE_DELAY: 0.9,       // 電腦發球準備時間
  CPU_SERVE_RANDOM_VX: 50,    // 電腦發球水平隨機幅度
  CPU_SERVE_RANDOM_VY: 50,    // 電腦發球垂直隨機幅度

  // ---- 電腦 AI（目前使用中的參數；開賽時由 AI_PROFILES 依對手覆寫）----
  AI: {
    REACTION_TIME: 0.14,      // 重新判斷間隔（反應延遲）
    PREDICT_ERROR: 42,        // 一般落點預測誤差（像素）
    BIG_MISTAKE_CHANCE: 0.14, // 嚴重判斷失誤機率
    BIG_MISTAKE_ERROR: 130,   // 嚴重失誤時的誤差（像素）
    CONTACT_OFFSET: 20,       // 站在球的後方多少像素（讓球往網的方向彈）
    DEADZONE: 10,             // 到達目標的容許範圍
    HOME_X: 1010,             // 防守待命位置
    JUMP_CHANCE: 0.55,        // 符合條件時起跳機率
    JUMP_TRIGGER_DX: 80,      // 球在多近的水平距離內考慮起跳
    JUMP_TRIGGER_MIN_Y: 280,  // 球的高度範圍（y）在此區間才起跳
    JUMP_TRIGGER_MAX_Y: 470,
    HIT_CHANCE: 0.65,         // 球進入範圍時主動擊球機率
    AIM_FORWARD_CHANCE: 0.45, // 擊球時按「往前」的機率
    AIM_BACK_CHANCE: 0.20,    // 擊球時按「往後（高吊）」的機率
    PREDICT_MAX_TIME: 3.0,    // 預測最長秒數
  },

  // ---- 比賽流程 ----
  POINT_PAUSE: 1.2,           // 得分後停頓時間
  TARGET_SCORE: 7,            // MVP：先到 7 分獲勝（不需領先 2 分）

  // ---- 系統 ----
  PHYSICS_HZ: 60,             // 固定物理更新頻率
  MAX_STEPS_PER_FRAME: 5,     // 單一畫面最多補算幾步（避免背景回來暴衝）
  MAX_FRAME_DT: 0.1,          // 單一畫面最大時間差
  MAX_DPR: 2,                 // 最高繪圖解析度倍率
};

// =========================================================
// 【三位電腦對手與難度】v0.2.0
// 三位共用同一套 AI 程式，只有下面的「決策參數」不同。
// 不會改變任何物理（重力、球速、移動速度、跳躍、擊球力量都一樣）。
// 橘子怪（中級）＝ v0.1 試玩時的電腦參數，原封不動。
// =========================================================
const AI_PROFILES = {
  scorpion: {
    name: '蠍子怪',
    level: '初級',
    desc: '反應比較慢，常常判斷錯誤，第一次玩也有機會贏！',
    reward: '基本獎勵級距',
    ai: {
      REACTION_TIME: 0.24,      // 反應延遲（秒）：越大越慢
      PREDICT_ERROR: 70,        // 落點預測誤差（像素）
      BIG_MISTAKE_CHANCE: 0.24, // 嚴重判斷失誤機率
      BIG_MISTAKE_ERROR: 150,   // 嚴重失誤時的誤差（像素）
      CONTACT_OFFSET: 20,
      DEADZONE: 14,             // 移動決策：離目標多近就停（越大越不精準）
      HOME_X: 1010,
      JUMP_CHANCE: 0.30,        // 跳躍時機：起跳機率
      JUMP_TRIGGER_DX: 80,
      JUMP_TRIGGER_MIN_Y: 280,
      JUMP_TRIGGER_MAX_Y: 470,
      HIT_CHANCE: 0.30,         // 主動擊球使用頻率
      AIM_FORWARD_CHANCE: 0.20, // 攻擊方向：往前壓的機率
      AIM_BACK_CHANCE: 0.35,    // 攻擊方向：高吊（好接）的機率
      PREDICT_MAX_TIME: 3.0,
    },
  },
  orange: {
    name: '橘子怪',
    level: '中級',
    desc: '反應正常，會接球也會進攻。',
    reward: '進階獎勵級距',
    ai: {
      REACTION_TIME: 0.14,
      PREDICT_ERROR: 42,
      BIG_MISTAKE_CHANCE: 0.14,
      BIG_MISTAKE_ERROR: 130,
      CONTACT_OFFSET: 20,
      DEADZONE: 10,
      HOME_X: 1010,
      JUMP_CHANCE: 0.55,
      JUMP_TRIGGER_DX: 80,
      JUMP_TRIGGER_MIN_Y: 280,
      JUMP_TRIGGER_MAX_Y: 470,
      HIT_CHANCE: 0.65,
      AIM_FORWARD_CHANCE: 0.45,
      AIM_BACK_CHANCE: 0.20,
      PREDICT_MAX_TIME: 3.0,
    },
  },
  orange_king: {
    name: '橘子王',
    level: '高級',
    desc: '反應很快、落點很準，常常強力進攻！',
    reward: '高級獎勵級距',
    ai: {
      REACTION_TIME: 0.10,
      PREDICT_ERROR: 26,
      BIG_MISTAKE_CHANCE: 0.08,
      BIG_MISTAKE_ERROR: 110,
      CONTACT_OFFSET: 22,
      DEADZONE: 8,
      HOME_X: 1010,
      JUMP_CHANCE: 0.80,
      JUMP_TRIGGER_DX: 80,
      JUMP_TRIGGER_MIN_Y: 280,
      JUMP_TRIGGER_MAX_Y: 470,
      HIT_CHANCE: 0.82,
      AIM_FORWARD_CHANCE: 0.60,
      AIM_BACK_CHANCE: 0.08,
      PREDICT_MAX_TIME: 3.0,
    },
  },
};
const OPPONENT_ORDER = ['scorpion', 'orange', 'orange_king'];

// =========================================================
// 【角色圖片顯示設定】CHARACTER_VISUAL_CONFIG
// 只影響畫面，不影響任何物理、碰撞、擊球或 AI。
//
// scale    ：原圖縮放倍率。同一角色五個動作共用 → 切換時大小一致
// anchorX/Y：原圖中的對齊點（原圖像素，已依透明範圍實際量測）
//   feet   ＝ 身體重心的水平位置 + 腳底最低點 → 對到地面站立點（碰撞圓正下方）
//   center ＝ 身體重心 → 對到碰撞圓中心（撲球用）
// bottomY  ：人物最低點（撲球時用來避免畫到地板下）
// facing   ：原圖朝向。1 = 朝右，-1 = 朝左，0 = 正面（不鏡像）
// offsetX/Y：遊戲畫面上的微調（遊戲像素；向右／向下為正；鏡像時 X 自動反轉）
// =========================================================
const CHARACTER_VISUAL_CONFIG = {
  DIVE_POSE_TIME: 0.35,      // 成功主動擊球後，撲球姿勢停留秒數（純視覺）
  KEEP_ABOVE_GROUND: true,   // 撲球圖片不會畫到地板下方（純視覺）
  PRESCALE: 2.5,             // 圖片預先縮小到「顯示大小 × 這個倍率」，兼顧清晰與手機記憶體
  CHARACTERS: {
    v: {
      folder: 'v', prefix: 'v',
      scale: 0.14, offsetX: 0, offsetY: 0,      // 待機身高約 165
      geometry: ['#9b6be0', '#5d3a9a'],
      poses: {
        idle: { anchor: 'feet',   anchorX: 601, anchorY: 1207, bottomY: 1207, facing:  1, offsetX: 0, offsetY: 0 },
        jump: { anchor: 'feet',   anchorX: 613, anchorY: 1131, bottomY: 1131, facing:  1, offsetX: 0, offsetY: 0 },
        dive: { anchor: 'center', anchorX: 647, anchorY: 580,  bottomY: 1072, facing:  1, offsetX: 0, offsetY: 0 },
        win:  { anchor: 'feet',   anchorX: 595, anchorY: 1180, bottomY: 1180, facing:  1, offsetX: 0, offsetY: 0 },
        lose: { anchor: 'feet',   anchorX: 602, anchorY: 1204, bottomY: 1204, facing:  1, offsetX: 0, offsetY: 0 },
      },
    },
    scorpion: {
      folder: 'scorpion', prefix: 'scorpion',
      scale: 0.36, offsetX: 0, offsetY: 0,      // 原圖 512px；待機約 123×126
      geometry: ['#e86fb5', '#9b2f73'],
      poses: {
        idle: { anchor: 'feet',   anchorX: 240, anchorY: 430, bottomY: 430, facing:  1, offsetX: 0, offsetY: 0 },
        jump: { anchor: 'feet',   anchorX: 247, anchorY: 428, bottomY: 428, facing:  0, offsetX: 0, offsetY: 0 },
        dive: { anchor: 'center', anchorX: 227, anchorY: 279, bottomY: 406, facing:  1, offsetX: 0, offsetY: 0 },
        win:  { anchor: 'feet',   anchorX: 242, anchorY: 441, bottomY: 441, facing:  0, offsetX: 0, offsetY: 0 },
        lose: { anchor: 'feet',   anchorX: 265, anchorY: 415, bottomY: 415, facing: -1, offsetX: 0, offsetY: 0 },
      },
    },
    orange: {
      folder: 'orange', prefix: 'orange',
      scale: 0.165, offsetX: 0, offsetY: 0,     // 待機約 131×131
      geometry: ['#ff9a3c', '#b85d10'],
      poses: {
        idle: { anchor: 'feet',   anchorX: 586, anchorY: 1002, bottomY: 1002, facing:  1, offsetX: 0, offsetY: 0 },
        jump: { anchor: 'feet',   anchorX: 598, anchorY: 1000, bottomY: 1000, facing:  1, offsetX: 0, offsetY: 0 },
        dive: { anchor: 'center', anchorX: 618, anchorY: 623,  bottomY: 997,  facing:  1, offsetX: 0, offsetY: 0 },
        win:  { anchor: 'feet',   anchorX: 591, anchorY: 1019, bottomY: 1019, facing:  1, offsetX: 0, offsetY: 0 },
        lose: { anchor: 'feet',   anchorX: 603, anchorY: 983,  bottomY: 983,  facing:  1, offsetX: 0, offsetY: 0 },
      },
    },
    orange_king: {
      folder: 'orange_king', prefix: 'orange_king',
      scale: 0.15, offsetX: 0, offsetY: 0,      // 待機約 171×176（魔王體型較大）
      geometry: ['#ff7a1a', '#8a3d00'],
      poses: {
        idle: { anchor: 'feet',   anchorX: 662, anchorY: 1206, bottomY: 1206, facing:  0, offsetX: 0, offsetY: 0 },
        jump: { anchor: 'feet',   anchorX: 631, anchorY: 1165, bottomY: 1165, facing:  0, offsetX: 0, offsetY: 0 },
        dive: { anchor: 'center', anchorX: 636, anchorY: 661,  bottomY: 1128, facing:  1, offsetX: 0, offsetY: 0 },
        win:  { anchor: 'feet',   anchorX: 648, anchorY: 1202, bottomY: 1202, facing:  0, offsetX: 0, offsetY: 0 },
        lose: { anchor: 'feet',   anchorX: 671, anchorY: 1162, bottomY: 1162, facing:  0, offsetX: 0, offsetY: 0 },
      },
    },
  },
};

// 【正式排球圖片】只影響畫面；碰撞仍是半徑 BALL_RADIUS 的圓
const BALL_VISUAL_CONFIG = {
  file: 'assets/volleyball_ball.png',
  centerX: 618,          // 原圖中球的可見中心（依透明範圍量測）
  centerY: 643,
  visibleRadius: 481,    // 原圖中球的可見半徑（約 937×988 的平均）
  sizeFactor: 1.08,      // 顯示半徑 = 碰撞半徑 × 這個倍率（球體凹凸邊緣看起來才不會比實際小）
  spinFactor: 1,         // 旋轉視覺倍率
};

// 【音訊設定】檔案不存在或載入失敗會自動略過，不影響遊戲
const AUDIO_CONFIG = {
  BASE: 'assets/audio/',
  BGM: {
    menu: { file: 'bgm/volleyball_menu_bgm.mp3', volume: 0.38 },
    game: { file: 'bgm/volleyball_game_bgm.mp3', volume: 0.42 },
  },
  BGM_FADE: 0.6,          // BGM 淡入淡出秒數
  SFX_MASTER: 0.9,
  SFX: {                  // volume：個別音量；minGap：同一音效最短間隔（秒），防止連發
    ball_bounce:   { volume: 0.80, minGap: 0.08 },
    ball_hit:      { volume: 0.85, minGap: 0.08 },
    player_jump:   { volume: 0.55, minGap: 0.12 },
    ball_ground:   { volume: 0.85, minGap: 0.30 },
    ball_net:      { volume: 0.40, minGap: 0.35 },
    score:         { volume: 0.75, minGap: 0.30 },
    victory:       { volume: 0.80, minGap: 1.00 },
    defeat:        { volume: 0.80, minGap: 1.00 },
    ui_click:      { volume: 0.60, minGap: 0.05 },
    serve_whistle: { volume: 0.40, minGap: 0.50 },
  },
  NET_MIN_IMPACT: 140,    // 球撞網的速度低於此值不出聲（避免球在網頂滾動時一直響）
};

// 【手機按鈕設定】按鈕直接疊在畫面上，不縮小球場
const TOUCH_CONFIG = {
  BUTTON_VH: 0.235,       // 按鈕直徑 = 可視高度 × 這個比例
  BUTTON_MIN: 66,         // 最小直徑（px）
  BUTTON_MAX: 118,        // 最大直徑（px）
  GAP_RATIO: 0.16,        // 按鈕間距 = 直徑 × 這個比例
  HIT_RADIUS: 0.80,       // 觸控判定半徑 = 直徑 × 這個比例（按鈕本身半徑為 0.5，所以判定範圍比外觀大）
  EDGE: 12,               // 距離螢幕邊緣（px，另加安全區域）
};

// 衍生常數
const STEP = 1 / CONFIG.PHYSICS_HZ;
const NET_LEFT = CONFIG.NET_X - CONFIG.NET_W / 2;
const NET_RIGHT = CONFIG.NET_X + CONFIG.NET_W / 2;
const NET_TOP = CONFIG.GROUND_Y - CONFIG.NET_H;
const R = CONFIG.CHAR_RADIUS;
const BR = CONFIG.BALL_RADIUS;
const CHAR_GROUND_Y = CONFIG.GROUND_Y - R;

// =========================================================
// 狀態
// =========================================================
const STATE = {
  TITLE: 'TITLE',
  SERVE_READY: 'SERVE_READY',
  RALLY: 'RALLY',
  POINT_SCORED: 'POINT_SCORED',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER',
};

const game = {
  state: STATE.TITLE,
  pausedFrom: null,
  server: 'left',          // 'left' = 玩家，'right' = 電腦
  score: { left: 0, right: 0 },
  pointTimer: 0,
  pointWinner: null,
  ballEventId: 0,          // 每次有人碰球／發球就 +1（AI 用來判斷新的一球）
  opponent: 'orange',      // 目前對手（scorpion / orange / orange_king）
  ticks: 0,
  winner: null,
};

const params = new URLSearchParams(location.search);
let debugOn = params.get('debug') === '1';
const forceTouch = params.get('touch') === '1';

// =========================================================
// 輸入：鍵盤與觸控共用同一套指令
// =========================================================
const keyInput = { left: false, right: false, jump: false, hit: false };
const touchInput = { left: false, right: false, jump: false, hit: false };
const playerCtrl = { left: false, right: false, jump: false, hit: false };
const cpuCtrl = { left: false, right: false, jump: false, hit: false };

const KEY_MAP = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'jump',
  Space: 'hit',
};

// 快速點按鎖存：即使在兩個物理步之間按下又放開，也保證被讀到一次
const pressLatch = { jump: false, hit: false };

function mergePlayerInput() {
  playerCtrl.left = keyInput.left || touchInput.left;
  playerCtrl.right = keyInput.right || touchInput.right;
  playerCtrl.jump = keyInput.jump || touchInput.jump || pressLatch.jump;
  playerCtrl.hit = keyInput.hit || touchInput.hit || pressLatch.hit;
  pressLatch.jump = false;
  pressLatch.hit = false;
}

function clearAllInputs() {
  for (const k of ['left', 'right', 'jump', 'hit']) {
    keyInput[k] = false;
    touchInput[k] = false;
    playerCtrl[k] = false;
    cpuCtrl[k] = false;
  }
  pressLatch.jump = false;
  pressLatch.hit = false;
  activePointers.clear();
  updateTouchButtonsVisual();
}

// =========================================================
// 實體
// =========================================================
function makeCharacter(side, ctrl) {
  return {
    side,
    facing: side === 'left' ? 1 : -1,  // 對方場地的方向
    ctrl,
    x: side === 'left' ? CONFIG.PLAYER_START_X : CONFIG.CPU_START_X,
    y: CHAR_GROUND_Y,
    vx: 0,
    vy: 0,
    onGround: true,
    jumpBuffer: 0,
    prevJump: false,
    prevHit: false,
    hitTimer: 0,
    hitUsed: false,
    hitFlash: 0,
    touchCooldown: 0,
    aimOverride: null,   // AI 用：'fwd' / 'back' / null
    poseTimer: 0,        // 純視覺：撲球姿勢剩餘顯示時間
    poseDir: 1,          // 純視覺：撲球方向（1 = 右，-1 = 左）
    lookDir: side === 'left' ? 1 : -1, // 純視覺：最後面向的方向
    minX: side === 'left' ? R : NET_RIGHT + R,
    maxX: side === 'left' ? NET_LEFT - R : CONFIG.WORLD_W - R,
  };
}

const player = makeCharacter('left', playerCtrl);
const cpu = makeCharacter('right', cpuCtrl);
const chars = [player, cpu];

const ball = { x: 0, y: 0, vx: 0, vy: 0, held: true, spin: 0 };

// =========================================================
// 回合重置
// =========================================================
function resetCharacter(c) {
  c.x = c.side === 'left' ? CONFIG.PLAYER_START_X : CONFIG.CPU_START_X;
  c.y = CHAR_GROUND_Y;
  c.vx = 0;
  c.vy = 0;
  c.onGround = true;
  c.jumpBuffer = 0;
  c.hitTimer = 0;
  c.hitUsed = false;
  c.hitFlash = 0;
  c.touchCooldown = 0;
  c.aimOverride = null;
  c.poseTimer = 0;
  c.poseDir = c.facing;
  c.lookDir = c.facing;   // 每球開始時面向球網
  // 讓「目前仍按住」的鍵不會在新回合被當成剛按下（防止按住連續發球）
  c.prevJump = c.ctrl.jump;
  c.prevHit = c.ctrl.hit;
}

function placeBallForServe() {
  const s = game.server === 'left' ? player : cpu;
  ball.x = s.x;
  ball.y = CHAR_GROUND_Y - R - BR - CONFIG.SERVE_HEIGHT;
  ball.vx = 0;
  ball.vy = 0;
  ball.held = true;
}

function startServe() {
  resetCharacter(player);
  resetCharacter(cpu);
  resetAI();
  placeBallForServe();
  game.pointWinner = null;
  game.ballEventId++;
  game.state = STATE.SERVE_READY;
  ai.serveTimer = CONFIG.CPU_SERVE_DELAY;
  sfx('serve_whistle');
}

// 套用對手：只更換 AI 決策參數與外觀，不動物理
function setOpponent(id) {
  if (!AI_PROFILES[id]) id = 'orange';
  game.opponent = id;
  Object.assign(CONFIG.AI, AI_PROFILES[id].ai);
}

function startMatch(opponentId) {
  if (opponentId) setOpponent(opponentId);
  game.score.left = 0;
  game.score.right = 0;
  game.server = 'left';     // 每場第一球固定由玩家發球
  game.winner = null;
  game.pointTimer = 0;
  game.pausedFrom = null;
  clearAllInputs();
  // 開始按鍵（例如 Space）若仍按住，不會立刻發球
  player.prevHit = true;
  showOverlay(null);
  startServe();
  resetClock();
  audio.playBgm('game');
}

function goToTitle() {
  game.state = STATE.TITLE;
  game.pausedFrom = null;
  game.score.left = 0;
  game.score.right = 0;
  game.server = 'left';
  clearAllInputs();
  resetCharacter(player);
  resetCharacter(cpu);
  resetAI();
  placeBallForServe();
  showOverlay('title');
  audio.playBgm('menu');
}

// =========================================================
// 發球
// =========================================================
function serveBall(side, vx, vy) {
  ball.held = false;
  ball.vx = vx;
  ball.vy = vy;
  game.ballEventId++;
  game.state = STATE.RALLY;
}

function playerServe() {
  let vx = CONFIG.SERVE_VX;
  if (playerCtrl.right) vx += CONFIG.SERVE_AIM_VX;
  if (playerCtrl.left) vx -= CONFIG.SERVE_AIM_VX;
  serveBall('left', vx, CONFIG.SERVE_VY);
}

function cpuServe() {
  const vx = -(CONFIG.SERVE_VX + (Math.random() * 2 - 1) * CONFIG.CPU_SERVE_RANDOM_VX);
  const vy = CONFIG.SERVE_VY + (Math.random() * 2 - 1) * CONFIG.CPU_SERVE_RANDOM_VY;
  serveBall('right', vx, vy);
}

// =========================================================
// 角色更新（玩家與電腦相同規則）
// 回傳：這一步是否「剛按下」擊球鍵
// =========================================================
function updateCharacter(c, dt, canMove, allowActiveHit) {
  const ctrl = c.ctrl;
  const jumpEdge = ctrl.jump && !c.prevJump;
  const hitEdge = ctrl.hit && !c.prevHit;
  c.prevJump = ctrl.jump;
  c.prevHit = ctrl.hit;

  // 水平：直接設定速度 → 反應快、放開立即停
  const dir = canMove ? (ctrl.right ? 1 : 0) - (ctrl.left ? 1 : 0) : 0;
  c.vx = dir * CONFIG.CHAR_MOVE_SPEED;
  if (dir !== 0) c.lookDir = dir;   // 純視覺：記住最後面向

  // 跳躍：只在按下瞬間觸發（含落地前短暫緩衝），長按不會連跳
  if (canMove && jumpEdge) c.jumpBuffer = CONFIG.JUMP_BUFFER;
  else c.jumpBuffer = Math.max(0, c.jumpBuffer - dt);
  if (c.onGround && c.jumpBuffer > 0) {
    c.vy = -CONFIG.CHAR_JUMP_SPEED;
    c.onGround = false;
    c.jumpBuffer = 0;
    sfx('player_jump', c === player ? 1 : 0.55);
  }

  c.vy += CONFIG.CHAR_GRAVITY * dt;
  c.x += c.vx * dt;
  c.y += c.vy * dt;

  if (c.y >= CHAR_GROUND_Y) {
    c.y = CHAR_GROUND_Y;
    c.vy = 0;
    c.onGround = true;
  }
  // 左右邊界與球網（角色永遠留在自己半場）
  if (c.x < c.minX) c.x = c.minX;
  if (c.x > c.maxX) c.x = c.maxX;

  // 主動擊球判定
  if (allowActiveHit && hitEdge) {
    c.hitTimer = CONFIG.HIT_ACTIVE_TIME;
    c.hitUsed = false;
  } else {
    c.hitTimer = Math.max(0, c.hitTimer - dt);
    if (c.hitTimer === 0) c.aimOverride = null;
  }
  c.touchCooldown = Math.max(0, c.touchCooldown - dt);
  c.hitFlash = Math.max(0, c.hitFlash - dt);
  c.poseTimer = Math.max(0, c.poseTimer - dt); // 純視覺計時，不影響擊球判定

  return hitEdge;
}

// =========================================================
// 球物理
// =========================================================
function clampBallSpeed() {
  const sp = Math.hypot(ball.vx, ball.vy);
  if (sp > CONFIG.BALL_MAX_SPEED) {
    const k = CONFIG.BALL_MAX_SPEED / sp;
    ball.vx *= k;
    ball.vy *= k;
  }
}

function resolveWalls() {
  if (ball.x < BR) {
    ball.x = BR;
    if (ball.vx < 0) ball.vx = -ball.vx * CONFIG.BALL_WALL_RESTITUTION;
  } else if (ball.x > CONFIG.WORLD_W - BR) {
    ball.x = CONFIG.WORLD_W - BR;
    if (ball.vx > 0) ball.vx = -ball.vx * CONFIG.BALL_WALL_RESTITUTION;
  }
  if (ball.y < CONFIG.CEILING_Y + BR) {
    ball.y = CONFIG.CEILING_Y + BR;
    if (ball.vy < 0) ball.vy = -ball.vy * CONFIG.BALL_WALL_RESTITUTION;
  }
}

function resolveNet(prevX) {
  // 球網是一個矩形：x ∈ [NET_LEFT, NET_RIGHT]，y ∈ [NET_TOP, GROUND]
  const cx = Math.max(NET_LEFT, Math.min(ball.x, NET_RIGHT));
  const cy = Math.max(NET_TOP, Math.min(ball.y, CONFIG.GROUND_Y));
  let dx = ball.x - cx;
  let dy = ball.y - cy;
  let d = Math.hypot(dx, dy);
  if (d >= BR) return;

  let nx, ny;
  if (d < 1e-6) {
    // 球心已進入網內（理論上子步進可避免），依前一位置推回原側
    nx = prevX < CONFIG.NET_X ? -1 : 1;
    ny = 0;
    ball.x = nx < 0 ? NET_LEFT - BR : NET_RIGHT + BR;
  } else {
    nx = dx / d;
    ny = dy / d;
    ball.x = cx + nx * BR;
    ball.y = cy + ny * BR;
  }
  const vn = ball.vx * nx + ball.vy * ny;
  if (vn < 0) {
    ball.vx -= (1 + CONFIG.BALL_NET_RESTITUTION) * vn * nx;
    ball.vy -= (1 + CONFIG.BALL_NET_RESTITUTION) * vn * ny;
    sfxNet(-vn);
  }
  // 防止球停在網頂上不動：給一點往外滾的水平速度
  if (ny < -0.7 && Math.abs(ball.vx) < 60) {
    const side = ball.x < CONFIG.NET_X ? -1 : (ball.x > CONFIG.NET_X ? 1 : (Math.random() < 0.5 ? -1 : 1));
    ball.vx = side * 120;
  }
}

function aimOf(c) {
  if (c.aimOverride) return c.aimOverride;
  const fwd = c.facing > 0 ? c.ctrl.right : c.ctrl.left;
  const back = c.facing > 0 ? c.ctrl.left : c.ctrl.right;
  if (fwd && !back) return 'fwd';
  if (back && !fwd) return 'back';
  return null;
}

// 主動擊球：依接觸位置決定基本方向，方向鍵微調
function doActiveHit(c, nx, ny) {
  const f = c.facing;
  const aim = aimOf(c);
  const relY = (ball.y - c.y) / (R + BR);
  let vx, vy;

  if (!c.onGround && relY < -0.15) {
    // 空中、球在上方 → 扣球（往下壓）
    const P = CONFIG.HIT_SPIKE_POWER;
    vx = f * P * 0.86;
    let vyWanted = P * 0.42;
    if (aim === 'fwd') { vx *= 1.08; vyWanted = P * 0.55; }
    if (aim === 'back') { vx *= 0.75; vyWanted = P * 0.20; }
    // 自動過網：如果壓太低會撞網，就把角度抬高到剛好過網
    const distToNet = (CONFIG.NET_X - ball.x) * f - CONFIG.NET_W / 2;
    if (distToNet > 0) {
      const t = distToNet / Math.abs(vx);
      const yAllowed = NET_TOP - BR - CONFIG.HIT_NET_CLEARANCE;
      const vyMax = (yAllowed - ball.y - 0.5 * CONFIG.BALL_GRAVITY * t * t) / t;
      vy = Math.min(vyWanted, vyMax);
    } else {
      vy = vyWanted;
    }
  } else {
    // 地面或側面 → 往前上方高吊
    const P = CONFIG.HIT_LOB_POWER;
    vx = f * P * 0.62;
    vy = -P * 0.78;
    if (aim === 'fwd') { vx = f * P * 0.80; vy = -P * 0.60; }
    if (aim === 'back') { vx = f * P * 0.38; vy = -P * 0.92; }
  }

  ball.vx = vx;
  ball.vy = vy;
  clampBallSpeed();
  // 確保球不在角色體內
  ball.x = c.x + nx * (R + BR + 0.5);
  ball.y = c.y + ny * (R + BR + 0.5);
  c.hitUsed = true;          // 一次判定最多擊中一次
  c.hitFlash = 0.18;
  // 純視覺：撲球方向 = 實際出球方向（球速水平分量）；幾乎垂直時沿用最後面向
  c.poseDir = Math.abs(ball.vx) > 1 ? Math.sign(ball.vx) : c.lookDir;
  c.lookDir = c.poseDir;
  c.poseTimer = CHARACTER_VISUAL_CONFIG.DIVE_POSE_TIME;
  sfx('ball_hit');
  c.touchCooldown = CONFIG.TOUCH_COOLDOWN;
  game.ballEventId++;
}

// 普通碰球：圓對圓反彈
function doNormalBounce(c, nx, ny) {
  const carry = CONFIG.BOUNCE_CARRY;
  const cvx = c.vx * carry;
  const cvy = c.vy * carry;
  let rvx = ball.vx - cvx;
  let rvy = ball.vy - cvy;
  const vn = rvx * nx + rvy * ny;
  if (vn < 0) {
    rvx -= (1 + CONFIG.BOUNCE_RESTITUTION) * vn * nx;
    rvy -= (1 + CONFIG.BOUNCE_RESTITUTION) * vn * ny;
  }
  ball.vx = rvx + cvx;
  ball.vy = rvy + cvy;
  if (ny < 0.35) {
    // 從上方或側面碰到：保證球會往上彈，新手也能形成來回
    ball.vy = Math.min(ball.vy, -CONFIG.BOUNCE_MIN_UP);
  }
  ball.vx += c.facing * CONFIG.BOUNCE_FORWARD_BIAS;
  clampBallSpeed();
  ball.x = c.x + nx * (R + BR + 0.5);
  ball.y = c.y + ny * (R + BR + 0.5);
  c.touchCooldown = CONFIG.TOUCH_COOLDOWN;
  game.ballEventId++;
  sfx('ball_bounce');
}

function inHitRange(c) {
  const dx = ball.x - c.x;
  const dy = ball.y - c.y;
  if (Math.hypot(dx, dy) > R + BR + CONFIG.HIT_REACH) return false;
  if (dy > R * 0.6) return false;                       // 球在腳下太低
  if ((ball.x - CONFIG.NET_X) * c.facing > BR) return false; // 球已在對方場地
  return true;
}

function resolveCharacter(c) {
  const dx = ball.x - c.x;
  const dy = ball.y - c.y;
  const d = Math.hypot(dx, dy);
  const nx = d > 1e-6 ? dx / d : 0;
  const ny = d > 1e-6 ? dy / d : -1;

  // 主動擊球優先，同一步不會再做普通碰撞
  if (c.hitTimer > 0 && !c.hitUsed && inHitRange(c)) {
    doActiveHit(c, nx, ny);
    return;
  }

  if (d >= R + BR) return;

  const rvn = (ball.vx - c.vx) * nx + (ball.vy - c.vy) * ny;
  if (c.touchCooldown <= 0 && rvn < 0) {
    doNormalBounce(c, nx, ny);
  } else {
    // 冷卻中：只推出、移除「往角色裡面」的速度分量，不額外加速 → 不會震動或暴衝
    ball.x = c.x + nx * (R + BR + 0.5);
    ball.y = c.y + ny * (R + BR + 0.5);
    const vn = ball.vx * nx + ball.vy * ny;
    if (vn < 0) {
      ball.vx -= vn * nx;
      ball.vy -= vn * ny;
    }
  }
}

// 回傳 true = 球落地
function stepBall(dt) {
  const speed = Math.hypot(ball.vx, ball.vy) + CONFIG.BALL_GRAVITY * dt;
  const subSteps = Math.max(1, Math.ceil((speed * dt) / (BR * 0.4)));
  const h = dt / subSteps;
  for (let i = 0; i < subSteps; i++) {
    const prevX = ball.x;
    ball.vy += CONFIG.BALL_GRAVITY * h;
    ball.x += ball.vx * h;
    ball.y += ball.vy * h;
    ball.spin += ball.vx * h * 0.02;

    resolveWalls();
    resolveNet(prevX);
    resolveCharacter(player);
    resolveCharacter(cpu);
    resolveNet(prevX); // 角色把球推向網時再確認一次
    clampBallSpeed();

    if (ball.y + BR >= CONFIG.GROUND_Y) {
      ball.y = CONFIG.GROUND_Y - BR;
      return true;
    }
  }
  return false;
}

// =========================================================
// 計分
// =========================================================
function scorePoint(winner) {
  if (game.state !== STATE.RALLY) return;   // 只有對打中才能得分（防重複計分）
  game.score[winner]++;
  game.pointWinner = winner;
  game.pointTimer = CONFIG.POINT_PAUSE;
  game.state = STATE.POINT_SCORED;
  ball.vx = 0;
  ball.vy = 0;
  sfx('ball_ground');
  if (game.score[winner] < CONFIG.TARGET_SCORE) sfx('score', 1, 0.35); // 晚一點播，避免和落地聲疊在一起
}

function afterPoint() {
  const w = game.pointWinner;
  if (game.score[w] >= CONFIG.TARGET_SCORE) {
    game.winner = w;
    game.state = STATE.GAME_OVER;
    clearAllInputs();
    showGameOver();
    audio.onGameOver(w === 'left');
    // 預留未來整合：冒險主遊戲可監聽此事件取得結果（目前不連接任何系統）
    try {
      window.dispatchEvent(new CustomEvent('balloonVolleyball:result', {
        detail: { winner: w === 'left' ? 'player' : 'cpu', score: { player: game.score.left, cpu: game.score.right } },
      }));
    } catch (e) { /* 忽略 */ }
    return;
  }
  game.server = w;   // 得分方取得發球權
  startServe();
}

// =========================================================
// 電腦 AI（與玩家使用同一套角色規則，只透過按鍵指令操作）
// =========================================================
const ai = {
  thinkTimer: 0,
  targetX: CONFIG.AI.HOME_X,
  predContactX: null,
  predLandX: null,
  error: 0,
  seenEvent: -1,
  jumpRolled: -1,
  hitRolled: -1,
  serveTimer: 0,
};

function resetAI() {
  ai.thinkTimer = 0;
  ai.targetX = CONFIG.AI.HOME_X;
  ai.predContactX = null;
  ai.predLandX = null;
  ai.error = 0;
  ai.seenEvent = -1;
  ai.jumpRolled = -1;
  ai.hitRolled = -1;
  ai.serveTimer = CONFIG.CPU_SERVE_DELAY;
}

// 簡化的軌跡預測（重力、牆、球網），不考慮角色
function predictBall() {
  let x = ball.x, y = ball.y, vx = ball.vx, vy = ball.vy;
  const h = 1 / 120;
  const contactY = CHAR_GROUND_Y - R - BR; // 球剛好碰到站立角色頭頂的高度
  let contactX = null;
  for (let t = 0; t < CONFIG.AI.PREDICT_MAX_TIME; t += h) {
    const px = x;
    vy += CONFIG.BALL_GRAVITY * h;
    x += vx * h;
    y += vy * h;
    if (x < BR) { x = BR; vx = Math.abs(vx) * CONFIG.BALL_WALL_RESTITUTION; }
    if (x > CONFIG.WORLD_W - BR) { x = CONFIG.WORLD_W - BR; vx = -Math.abs(vx) * CONFIG.BALL_WALL_RESTITUTION; }
    if (y < BR) { y = BR; vy = Math.abs(vy) * CONFIG.BALL_WALL_RESTITUTION; }
    if (y > NET_TOP && x + BR > NET_LEFT && x - BR < NET_RIGHT) {
      vx = -vx * CONFIG.BALL_NET_RESTITUTION;
      x = px < CONFIG.NET_X ? NET_LEFT - BR : NET_RIGHT + BR;
    }
    if (contactX === null && vy > 0 && y >= contactY && x > NET_RIGHT) contactX = x;
    if (y + BR >= CONFIG.GROUND_Y) return { contactX, landX: x };
  }
  return { contactX, landX: null };
}

function rollError() {
  const A = CONFIG.AI;
  if (Math.random() < A.BIG_MISTAKE_CHANCE) return (Math.random() < 0.5 ? -1 : 1) * A.BIG_MISTAKE_ERROR;
  return (Math.random() + Math.random() - 1) * A.PREDICT_ERROR * 1.5;
}

function updateAI(dt) {
  const A = CONFIG.AI;
  const c = cpu;
  // 跳躍／擊球都是「按一下」：每步先放開，需要時才按下一步
  cpuCtrl.jump = false;
  cpuCtrl.hit = false;
  cpuCtrl.left = false;
  cpuCtrl.right = false;

  if (game.state === STATE.SERVE_READY) {
    if (game.server === 'right') {
      ai.serveTimer -= dt;
      if (ai.serveTimer <= 0) cpuServe();
    } else {
      steerTo(A.HOME_X);
    }
    return;
  }
  if (game.state !== STATE.RALLY) return;

  if (game.ballEventId !== ai.seenEvent) {
    ai.seenEvent = game.ballEventId;
    ai.error = rollError();
    ai.thinkTimer = A.REACTION_TIME; // 新的一球：先反應延遲再判斷
  }

  ai.thinkTimer -= dt;
  if (ai.thinkTimer <= 0) {
    ai.thinkTimer = A.REACTION_TIME * (0.7 + Math.random() * 0.6);
    const p = predictBall();
    ai.predContactX = p.contactX;
    ai.predLandX = p.landX;
    if (p.contactX !== null) {
      ai.targetX = p.contactX + A.CONTACT_OFFSET + ai.error;
    } else if (p.landX !== null && p.landX > NET_RIGHT) {
      ai.targetX = p.landX + A.CONTACT_OFFSET + ai.error * 0.5;
    } else {
      ai.targetX = A.HOME_X;
    }
    ai.targetX = Math.max(c.minX, Math.min(c.maxX, ai.targetX));
  }
  steerTo(ai.targetX);

  const onMySide = ball.x > CONFIG.NET_X;

  // 起跳判斷：每一球最多擲一次骰
  if (c.onGround && ai.jumpRolled !== game.ballEventId && onMySide &&
      Math.abs(ball.x - c.x) < A.JUMP_TRIGGER_DX &&
      ball.y > A.JUMP_TRIGGER_MIN_Y && ball.y < A.JUMP_TRIGGER_MAX_Y && ball.vy > -200) {
    ai.jumpRolled = game.ballEventId;
    if (Math.random() < A.JUMP_CHANCE) cpuCtrl.jump = true;
  }

  // 主動擊球判斷：每一球最多擲一次骰
  if (ai.hitRolled !== game.ballEventId && c.hitTimer <= 0 && onMySide) {
    const d = Math.hypot(ball.x - c.x, ball.y - c.y);
    if (d < R + BR + CONFIG.HIT_REACH * 0.8 && ball.y < c.y + R * 0.5) {
      ai.hitRolled = game.ballEventId;
      if (Math.random() < A.HIT_CHANCE) {
        cpuCtrl.hit = true;
        const r = Math.random();
        c.aimOverride = r < A.AIM_FORWARD_CHANCE ? 'fwd' : (r < A.AIM_FORWARD_CHANCE + A.AIM_BACK_CHANCE ? 'back' : null);
      }
    }
  }
}

function steerTo(x) {
  const dx = x - cpu.x;
  cpuCtrl.right = dx > CONFIG.AI.DEADZONE;
  cpuCtrl.left = dx < -CONFIG.AI.DEADZONE;
}

// =========================================================
// 固定步長更新
// =========================================================
function fixedUpdate(dt) {
  game.ticks++;
  mergePlayerInput();

  switch (game.state) {
    case STATE.SERVE_READY: {
      updateAI(dt);
      const pEdge = updateCharacter(player, dt, game.server !== 'left', false);
      updateCharacter(cpu, dt, game.server !== 'right', false);
      // 發球準備時：擊球鍵只執行發球，不會同時啟動主動擊球
      if (game.server === 'left' && pEdge && game.state === STATE.SERVE_READY) playerServe();
      if (ball.held) placeBallForServe();
      break;
    }
    case STATE.RALLY: {
      updateAI(dt);
      updateCharacter(player, dt, true, true);
      updateCharacter(cpu, dt, true, true);
      if (stepBall(dt)) scorePoint(ball.x < CONFIG.NET_X ? 'right' : 'left');
      break;
    }
    case STATE.POINT_SCORED: {
      updateCharacter(player, dt, true, false);
      updateCharacter(cpu, dt, false, false);
      game.pointTimer -= dt;
      if (game.pointTimer <= 0) afterPoint();
      break;
    }
    default:
      break; // TITLE / PAUSED / GAME_OVER：不更新物理
  }
}

// =========================================================
// 暫停
// =========================================================
function canPause() {
  return game.state === STATE.SERVE_READY || game.state === STATE.RALLY || game.state === STATE.POINT_SCORED;
}

function pauseGame() {
  if (!canPause()) return;
  game.pausedFrom = game.state;
  game.state = STATE.PAUSED;
  clearAllInputs();
  showOverlay('pause');
  audio.pauseBgm();
}

function resumeGame() {
  if (game.state !== STATE.PAUSED) return;
  if (rotateBlocking()) return;
  clearAllInputs();
  // 恢復時：仍按住的鍵不會被當成剛按下（不會自動擊球／發球）
  for (const c of chars) { c.prevHit = true; c.prevJump = true; }
  game.state = game.pausedFrom || STATE.SERVE_READY;
  game.pausedFrom = null;
  showOverlay(null);
  resetClock();
  audio.resumeBgm();
}

// =========================================================
// 音訊（v0.2.0）：BGM＋音效。任何檔案缺失或失敗都只會略過，不影響遊戲
// =========================================================
const audio = (() => {
  let actx = null;
  let master = null, sfxBus = null;
  let unlocked = false;
  let muted = false;
  let wanted = null;        // 目前應該播放的 BGM（menu / game / null）
  let current = null;       // 實際正在播放的 BGM
  let paused = false;
  let afterJingleTimer = null;
  const buffers = {};       // 音效名稱 -> AudioBuffer
  const sfxStatus = {};     // 音效名稱 -> loading / ok / failed
  const lastPlay = {};
  const playCount = {};
  const bgm = {};           // menu/game -> { el, gain, status }
  let sfxReady = Promise.resolve();

  function log(msg) { console.warn('[氣球排球][音訊] ' + msg); }

  function loadSfx() {
    const jobs = [];
    for (const name of Object.keys(AUDIO_CONFIG.SFX)) {
      sfxStatus[name] = 'loading';
      jobs.push(fetch(AUDIO_CONFIG.BASE + name + '.mp3')
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
        .then(data => new Promise((ok, bad) => actx.decodeAudioData(data, ok, bad)))
        .then(buf => { buffers[name] = buf; sfxStatus[name] = 'ok'; })
        .catch(e => { sfxStatus[name] = 'failed'; log(`音效 ${name}.mp3 無法使用，已略過（${e && e.message || e}）`); }));
    }
    sfxReady = Promise.all(jobs);
  }

  function makeBgm(name) {
    const cfg = AUDIO_CONFIG.BGM[name];
    const el = new Audio();
    el.loop = true;
    el.preload = 'auto';
    el.src = AUDIO_CONFIG.BASE + cfg.file;
    const item = { el, gain: null, status: 'loading' };
    el.addEventListener('canplay', () => { if (item.status === 'loading') item.status = 'ok'; });
    el.addEventListener('error', () => { item.status = 'failed'; log(`背景音樂 ${cfg.file} 無法載入，已略過`); });
    try {
      const src = actx.createMediaElementSource(el);
      item.gain = actx.createGain();
      item.gain.gain.value = 0;
      src.connect(item.gain).connect(master);
    } catch (e) {
      item.gain = null;   // 無法接入 Web Audio：改用元素音量（部分裝置不支援淡入淡出）
    }
    bgm[name] = item;
  }

  function setGain(item, target, seconds) {
    const vol = target;
    if (item.gain) {
      const g = item.gain.gain, t = actx.currentTime;
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(vol, t + seconds);
    } else {
      item.el.volume = Math.max(0, Math.min(1, vol));
    }
  }

  function fadeOut(name) {
    const item = bgm[name];
    if (!item) return;
    setGain(item, 0, AUDIO_CONFIG.BGM_FADE);
    clearTimeout(item.stopTimer);
    item.stopTimer = setTimeout(() => { if (current !== name || paused) item.el.pause(); }, AUDIO_CONFIG.BGM_FADE * 1000 + 50);
  }

  function fadeIn(name, restart) {
    const item = bgm[name];
    if (!item || item.status === 'failed') return;
    clearTimeout(item.stopTimer);
    if (restart) { try { item.el.currentTime = 0; } catch (e) { /* 忽略 */ } }
    const p = item.el.play();
    if (p && p.catch) p.catch(e => log(`背景音樂無法播放（${e && e.name}）`));
    setGain(item, AUDIO_CONFIG.BGM[name].volume, AUDIO_CONFIG.BGM_FADE);
  }

  // 切換 BGM：先淡出舊的再淡入新的，確保不會兩首同時大聲播放
  function apply(restart) {
    if (!unlocked) return;
    if (current && current !== wanted) fadeOut(current);
    if (wanted && !paused) fadeIn(wanted, restart || current !== wanted);
    current = wanted;
  }

  function unlock() {
    if (unlocked) { if (actx && actx.state === 'suspended' && !document.hidden) actx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { unlocked = true; return; }
    try {
      actx = new AC();
      master = actx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(actx.destination);
      sfxBus = actx.createGain();
      sfxBus.gain.value = AUDIO_CONFIG.SFX_MASTER;
      sfxBus.connect(master);
      if (actx.state === 'suspended') actx.resume();
      makeBgm('menu');
      makeBgm('game');
      loadSfx();
    } catch (e) {
      log('瀏覽器無法啟動音訊，遊戲將以靜音進行');
      actx = null;
    }
    unlocked = true;
    if (actx) apply(true);
  }

  function play(name, vol = 1, delay = 0) {
    if (!actx || muted || document.hidden) return;
    const buf = buffers[name];
    const cfg = AUDIO_CONFIG.SFX[name];
    if (!buf || !cfg) return;   // 缺少的音效安全略過
    const t = actx.currentTime + delay;
    if (lastPlay[name] !== undefined && t - lastPlay[name] < cfg.minGap) return; // 防止連發
    lastPlay[name] = t;
    playCount[name] = (playCount[name] || 0) + 1;
    const src = actx.createBufferSource();
    src.buffer = buf;
    const g = actx.createGain();
    g.gain.value = cfg.volume * vol;
    src.connect(g).connect(sfxBus);
    src.start(t);
  }

  return {
    unlock,
    play,
    ready() { return sfxReady; },   // 音效全部處理完（成功或失敗都算）
    playBgm(name) {
      clearTimeout(afterJingleTimer);
      paused = false;
      const restart = wanted !== name;
      wanted = name;
      apply(restart);
    },
    pauseBgm() {
      if (!unlocked || !current) return;
      paused = true;
      fadeOut(current);
    },
    resumeBgm() {
      if (!unlocked) return;
      if (actx && actx.state === 'suspended') actx.resume();
      paused = false;
      if (current) fadeIn(current, false);
    },
    onGameOver(playerWon) {
      if (current) fadeOut(current);
      current = null;
      wanted = null;
      play(playerWon ? 'victory' : 'defeat');
      // 結算音樂播完後，輕輕接回選單音樂
      clearTimeout(afterJingleTimer);
      afterJingleTimer = setTimeout(() => {
        if (game.state === STATE.GAME_OVER) { wanted = 'menu'; apply(true); }
      }, 4200);
    },
    suspend() {
      if (actx && actx.state === 'running') actx.suspend();
      for (const k of Object.keys(bgm)) bgm[k].el.pause();
    },
    wake() {
      // 只恢復選單畫面的音樂；比賽中由玩家按「繼續」時恢復
      if (!unlocked || paused) return;
      if (actx && actx.state === 'suspended') actx.resume();
      if (current) fadeIn(current, false);
    },
    setMuted(m) {
      muted = !!m;
      if (master) master.gain.value = muted ? 0 : 1;
      for (const k of Object.keys(bgm)) if (!bgm[k].gain) bgm[k].el.muted = muted;
    },
    isMuted() { return muted; },
    stats() {
      const b = {};
      for (const k of Object.keys(bgm)) b[k] = { status: bgm[k].status, playing: !bgm[k].el.paused, gain: bgm[k].gain ? +bgm[k].gain.gain.value.toFixed(3) : bgm[k].el.volume };
      return { unlocked, ctx: actx ? actx.state : null, muted, wanted, current, paused, sfx: { ...sfxStatus }, playCount: { ...playCount }, bgm: b };
    },
  };
})();

function sfx(name, vol, delay) { audio.play(name, vol, delay); }
function sfxNet(impact) {
  if (impact < AUDIO_CONFIG.NET_MIN_IMPACT) return; // 小碰撞（例如在網頂滾動）不出聲
  sfx('ball_net', Math.min(1, 0.4 + impact / 900));
}

// =========================================================
// 繪圖
// =========================================================
const canvas = document.getElementById('court');
const ctx = canvas.getContext('2d');
let viewScale = 1;    // 遊戲世界 → 螢幕的縮放
let viewOX = 0;       // 遊戲世界左上角在螢幕上的位置（CSS px）
let viewOY = 0;
let viewW = 1280, viewH = 720;
let dpr = 1;

// 開發者切換：?playerVisual=geometry（所有角色與排球改用幾何圖形）／?playerVisual=sprite（預設）
const visualMode = (params.get('playerVisual') || 'sprite').toLowerCase() === 'geometry' ? 'GEOMETRY' : 'SPRITE';

// ---------- 圖片載入 ----------
const sprites = { chars: {}, ball: { status: 'idle', img: null } };

function prescale(img, targetW, targetH) {
  // 逐步縮小（每次最多一半），避免大圖一次縮太多產生鋸齒；縮好後原圖可被釋放，節省手機記憶體
  let src = img, w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  while (w / 2 >= targetW) {
    const c = document.createElement('canvas');
    c.width = Math.round(w / 2); c.height = Math.round(h / 2);
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, c.width, c.height);
    src = c; w = c.width; h = c.height;
  }
  const out = document.createElement('canvas');
  out.width = Math.max(1, targetW); out.height = Math.max(1, targetH);
  const g = out.getContext('2d');
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, out.width, out.height);
  return out;
}

function loadImage(url) {
  return new Promise((ok, bad) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => ok(img);
    img.onerror = () => bad(new Error('載入失敗'));
    img.src = url;
  });
}

function charImagePath(id, pose) {
  const c = CHARACTER_VISUAL_CONFIG.CHARACTERS[id];
  const file = pose === 'dive' ? 'dive_right' : pose;
  return `assets/characters/${c.folder}/${c.prefix}_volleyball_${file}.png`;
}

// 回傳 Promise：該角色五張圖全部處理完（成功或失敗）時完成
function loadCharacter(id) {
  if (visualMode !== 'SPRITE') return Promise.resolve();
  const set = sprites.chars[id];
  if (set) return set.promise;
  const cfg = CHARACTER_VISUAL_CONFIG.CHARACTERS[id];
  const entry = { status: 'loading', images: {}, loaded: 0, failed: [], promise: null };
  sprites.chars[id] = entry;
  const k = cfg.scale * CHARACTER_VISUAL_CONFIG.PRESCALE;
  entry.promise = Promise.all(Object.keys(cfg.poses).map(pose =>
    loadImage(charImagePath(id, pose)).then(img => {
      const p = cfg.poses[pose];
      p.srcW = img.naturalWidth; p.srcH = img.naturalHeight;
      try { entry.images[pose] = prescale(img, Math.round(img.naturalWidth * k), Math.round(img.naturalHeight * k)); }
      catch (e) { entry.images[pose] = img; }
      entry.loaded++;
    }).catch(() => {
      entry.failed.push(pose);
      console.error(`[氣球排球] 角色圖片載入失敗：${charImagePath(id, pose)}　→ 此角色改用幾何圖形顯示`);
    })
  )).then(() => { entry.status = entry.failed.length ? 'failed' : 'ready'; });
  return entry.promise;
}

function loadBall() {
  if (visualMode !== 'SPRITE') return;
  sprites.ball.status = 'loading';
  loadImage(BALL_VISUAL_CONFIG.file).then(img => {
    const B = BALL_VISUAL_CONFIG;
    const k = (BR * B.sizeFactor / B.visibleRadius) * CHARACTER_VISUAL_CONFIG.PRESCALE;
    B.srcW = img.naturalWidth; B.srcH = img.naturalHeight;
    try { sprites.ball.img = prescale(img, Math.round(img.naturalWidth * k), Math.round(img.naturalHeight * k)); }
    catch (e) { sprites.ball.img = img; }
    sprites.ball.status = 'ready';
  }).catch(() => {
    sprites.ball.status = 'failed';
    console.error(`[氣球排球] 排球圖片載入失敗：${BALL_VISUAL_CONFIG.file}　→ 改用幾何排球`);
  });
}

// ---------- 姿勢 ----------
function charId(c) { return c === player ? 'v' : game.opponent; }

// 依目前狀態決定姿勢（只讀取，不修改任何遊戲資料）
function poseOf(c) {
  if (game.state === STATE.GAME_OVER) return game.winner === c.side ? 'win' : 'lose';
  if (c.poseTimer > 0) return 'dive';
  if (!c.onGround) return 'jump';
  return 'idle';
}

function wantDir(c, pose) {
  if (pose === 'dive') return c.poseDir;
  if (pose === 'win' || pose === 'lose') return c.facing; // 比賽結束時面向球網
  return c.lookDir;
}

// ---------- 背景與球場（只改外觀，不改尺寸）----------
function worldBounds() {
  return {
    l: -viewOX / viewScale,
    r: (viewW - viewOX) / viewScale,
    t: -viewOY / viewScale,
    b: (viewH - viewOY) / viewScale,
  };
}

const BG_BALLOONS = [
  [90, 250, 22, '#ff8fb8'], [205, 300, 16, '#ffd84a'], [470, 210, 14, '#9fd8ff'],
  [800, 240, 18, '#c9a8ff'], [1010, 200, 15, '#ff8fb8'], [1190, 270, 20, '#8ee6b8'],
];

function drawBackground() {
  const W = CONFIG.WORLD_W, G = CONFIG.GROUND_Y;
  const B = worldBounds();
  const sky = ctx.createLinearGradient(0, B.t, 0, G);
  sky.addColorStop(0, '#7cc8ff');
  sky.addColorStop(0.65, '#c8ecff');
  sky.addColorStop(1, '#fff3dc');
  ctx.fillStyle = sky;
  ctx.fillRect(B.l, B.t, B.r - B.l, G - B.t);

  // 遠方小氣球（純裝飾）
  for (const [x, y, r, col] of BG_BALLOONS) {
    ctx.strokeStyle = 'rgba(120,120,140,.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y + r); ctx.quadraticCurveTo(x + 6, y + r + 26, x - 2, y + r + 50); ctx.stroke();
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.55;
    ctx.beginPath(); ctx.ellipse(x, y, r * 0.86, r, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.35, r * 0.18, r * 0.28, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // 雲
  ctx.fillStyle = 'rgba(255,255,255,.88)';
  for (const [cx, cy, s] of [[180, 160, 1], [380, 250, 0.7], [900, 180, 1.1], [1080, 300, 0.7], [-160, 220, 0.9], [1430, 200, 0.9]]) {
    ctx.beginPath();
    ctx.arc(cx, cy, 34 * s, 0, Math.PI * 2);
    ctx.arc(cx + 38 * s, cy - 12 * s, 40 * s, 0, Math.PI * 2);
    ctx.arc(cx + 80 * s, cy, 32 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  // 地板（延伸到整個螢幕）
  const floor = ctx.createLinearGradient(0, G, 0, B.b);
  floor.addColorStop(0, '#f6cf7e');
  floor.addColorStop(1, '#e5ad55');
  ctx.fillStyle = floor;
  ctx.fillRect(B.l, G, B.r - B.l, B.b - G);
  ctx.fillStyle = '#d9a446';
  ctx.fillRect(B.l, G, B.r - B.l, 7);
  // 左右半場顏色
  ctx.fillStyle = 'rgba(155,107,224,.20)';
  ctx.fillRect(0, G + 7, CONFIG.NET_X, B.b - G - 7);
  ctx.fillStyle = 'rgba(255,140,40,.18)';
  ctx.fillRect(CONFIG.NET_X, G + 7, W - CONFIG.NET_X, B.b - G - 7);
  // 球場外（左右延伸區）稍微變暗
  ctx.fillStyle = 'rgba(120,70,20,.16)';
  if (B.l < 0) ctx.fillRect(B.l, G, -B.l, B.b - G);
  if (B.r > W) ctx.fillRect(W, G, B.r - W, B.b - G);
  // 邊線
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(4, G + 22); ctx.lineTo(W - 4, G + 22);
  ctx.stroke();

  // 球場左右邊界：氣球柱（只在螢幕比 16:9 寬時看得到；位置在球場外，不影響碰撞）
  drawBalloonColumn(-24, ['#ff8fb8', '#ffd84a', '#9fd8ff']);
  drawBalloonColumn(W + 24, ['#9fd8ff', '#ffd84a', '#ff8fb8']);
}

function drawBalloonColumn(x, cols) {
  const B = worldBounds();
  if (x + 30 < B.l || x - 30 > B.r) return;
  const G = CONFIG.GROUND_Y;
  for (let i = 0, y = G - 22; y > B.t - 30; i++, y -= 40) {
    ctx.fillStyle = cols[i % cols.length];
    ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.ellipse(x - 7, y - 8, 5, 8, -0.5, 0, Math.PI * 2); ctx.fill();
  }
}

function drawNet() {
  // 網柱（外觀；碰撞仍是原本的矩形）
  ctx.fillStyle = '#ffffff';
  roundRect(NET_LEFT, NET_TOP, CONFIG.NET_W, CONFIG.NET_H, 4);
  ctx.fill();
  ctx.strokeStyle = '#7a63a8';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(122,99,168,.55)';
  ctx.lineWidth = 1.5;
  for (let y = NET_TOP + 14; y < CONFIG.GROUND_Y; y += 14) {
    ctx.beginPath();
    ctx.moveTo(NET_LEFT, y);
    ctx.lineTo(NET_RIGHT, y);
    ctx.stroke();
  }
  // 網頂氣球
  ctx.fillStyle = '#ff5a8a';
  ctx.beginPath();
  ctx.arc(CONFIG.NET_X, NET_TOP - 2, CONFIG.NET_W * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ctx.beginPath();
  ctx.ellipse(CONFIG.NET_X - 4, NET_TOP - 6, 3, 5, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawShadow(x, w) {
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.beginPath();
  ctx.ellipse(x, CONFIG.GROUND_Y + 4, w, w * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
}

// 幾何角色（保留給除錯比較與圖片失敗時使用）
function drawCharacter(c, body, dark) {
  drawShadow(c.x, R * 0.9);
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(c.x - 20, c.y + R - 4, 16, 9, 0, 0, Math.PI * 2);
  ctx.ellipse(c.x + 20, c.y + R - 4, 16, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(c.x, c.y, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = dark;
  ctx.stroke();
  const ang = Math.atan2(ball.y - c.y, ball.x - c.x);
  const ex = Math.cos(ang) * 4, ey = Math.sin(ang) * 4;
  for (const off of [-16, 16]) {
    const bx = c.x + off + c.facing * 6;
    const by = c.y - 14;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(bx, by, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(bx + ex, by + ey, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  drawSwing(c);
}

// 主動擊球判定中的揮擊提示（沿用原本效果）
function drawSwing(c) {
  if (c.hitTimer > 0 || c.hitFlash > 0) {
    if (c.poseTimer > 0 && c.hitFlash <= 0) return;
    ctx.strokeStyle = c.hitFlash > 0 ? 'rgba(255,240,120,.95)' : 'rgba(255,255,255,.8)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    const a0 = c.facing > 0 ? -Math.PI * 0.75 : -Math.PI * 0.25;
    ctx.arc(c.x, c.y, R + 14, a0 - 0.6, a0 + 0.6);
    ctx.stroke();
  }
}

// 圖片角色。回傳 false 代表無法用圖片畫（呼叫端改畫幾何）
function drawCharSprite(c) {
  if (visualMode !== 'SPRITE') return false;
  const id = charId(c);
  const set = sprites.chars[id];
  if (!set || set.status !== 'ready') return false;
  const cfg = CHARACTER_VISUAL_CONFIG.CHARACTERS[id];
  const pose = poseOf(c);
  const pc = cfg.poses[pose];
  const img = set.images[pose];
  if (!img || !pc.srcW) return false;

  const s = cfg.scale;
  const flip = pc.facing === 0 ? 1 : wantDir(c, pose) * pc.facing; // 正面圖不鏡像
  const tx = c.x + (cfg.offsetX + pc.offsetX) * (pc.facing === 0 ? 1 : wantDir(c, pose));
  let top = (pc.anchor === 'feet' ? c.y + R : c.y) + cfg.offsetY + pc.offsetY - pc.anchorY * s;
  if (CHARACTER_VISUAL_CONFIG.KEEP_ABOVE_GROUND && pose === 'dive') {
    const bottom = top + pc.bottomY * s;
    if (bottom > CONFIG.GROUND_Y) top -= bottom - CONFIG.GROUND_Y;
  }

  drawShadow(c.x, R * 0.8);
  ctx.save();
  ctx.translate(tx, 0);
  ctx.scale(flip, 1);   // 以對齊點為中心鏡像 → 鏡像後位置不偏移
  ctx.drawImage(img, -pc.anchorX * s, top, pc.srcW * s, pc.srcH * s);
  ctx.restore();
  drawSwing(c);
  return true;
}

function drawChar(c) {
  if (drawCharSprite(c)) return;
  const g = CHARACTER_VISUAL_CONFIG.CHARACTERS[charId(c)].geometry;
  drawCharacter(c, g[0], g[1]);
}

function drawBall() {
  drawShadow(ball.x, BR * (0.5 + 0.5 * (ball.y / CONFIG.GROUND_Y)));
  ctx.save();
  ctx.translate(ball.x, ball.y);
  ctx.rotate(ball.spin * BALL_VISUAL_CONFIG.spinFactor);
  if (visualMode === 'SPRITE' && sprites.ball.status === 'ready') {
    const B = BALL_VISUAL_CONFIG;
    const k = BR * B.sizeFactor / B.visibleRadius;   // 以可見球體校準，不受透明邊界影響
    ctx.drawImage(sprites.ball.img, -B.centerX * k, -B.centerY * k, B.srcW * k, B.srcH * k);
  } else {
    ctx.fillStyle = '#ffd84a';
    ctx.beginPath();
    ctx.arc(0, 0, BR, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#c9961a';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-BR, 0);
    ctx.quadraticCurveTo(0, -BR * 0.5, BR, 0);
    ctx.moveTo(0, -BR);
    ctx.quadraticCurveTo(BR * 0.5, 0, 0, BR);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHUD() {
  const W = CONFIG.WORLD_W;
  const oppName = AI_PROFILES[game.opponent].name;
  ctx.fillStyle = 'rgba(58,36,112,.86)';
  roundRect(W / 2 - 210, 12, 420, 74, 26);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,216,74,.9)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = '#d9c2ff';
  ctx.fillText('小V', W / 2 - 145, 49);
  ctx.fillStyle = '#ffc48a';
  ctx.fillText(oppName, W / 2 + 145, 49);
  ctx.font = 'bold 52px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(`${game.score.left}`, W / 2 - 55, 51);
  ctx.fillText(':', W / 2, 47);
  ctx.fillText(`${game.score.right}`, W / 2 + 55, 51);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = 'rgba(70,50,120,.85)';
  ctx.fillText(`先得 ${CONFIG.TARGET_SCORE} 分獲勝・${AI_PROFILES[game.opponent].level}`, W / 2, 104);

  const st = game.state === STATE.PAUSED ? game.pausedFrom : game.state;
  if (st === STATE.SERVE_READY) {
    const text = game.server === 'left' ? (isTouchDevice ? '按「擊」發球' : '按 Space 發球') : `${oppName}準備發球…`;
    bannerText(text, 160, game.server === 'left' ? '#7b4cc9' : '#e07a1f');
  }
  if (st === STATE.POINT_SCORED && game.pointWinner) {
    bannerText(game.pointWinner === 'left' ? '小V 得分！' : `${oppName}得分！`, 250,
      game.pointWinner === 'left' ? '#7b4cc9' : '#e07a1f', 46);
  }
}

function bannerText(text, y, color, size = 30) {
  ctx.font = `bold ${size}px sans-serif`;
  const w = ctx.measureText(text).width + 48;
  ctx.fillStyle = color;
  roundRect(CONFIG.WORLD_W / 2 - w / 2, y - size * 0.85, w, size * 1.7, size * 0.6);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, CONFIG.WORLD_W / 2, y);
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---- 除錯資訊（只讀取，不改變任何狀態）----
const fpsMeter = { frames: 0, ticks: 0, acc: 0, fps: 0, tps: 0 };

function drawDebug() {
  ctx.save();
  ctx.lineWidth = 2;
  for (const c of chars) {
    ctx.strokeStyle = '#00e676';
    ctx.beginPath();
    ctx.arc(c.x, c.y, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = c.hitTimer > 0 ? '#ff1744' : 'rgba(255,23,68,.35)';
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(c.x, c.y, R + BR + CONFIG.HIT_REACH, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.strokeStyle = '#2979ff';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ball.x, ball.y);
  ctx.lineTo(ball.x + ball.vx * 0.1, ball.y + ball.vy * 0.1);
  ctx.stroke();
  if (ai.predLandX !== null) {
    ctx.fillStyle = '#ff1744';
    ctx.fillRect(ai.predLandX - 3, CONFIG.GROUND_Y - 20, 6, 20);
  }
  if (ai.predContactX !== null) {
    ctx.strokeStyle = '#ff9100';
    ctx.beginPath();
    ctx.moveTo(ai.predContactX, CHAR_GROUND_Y - R - BR - 15);
    ctx.lineTo(ai.predContactX, CHAR_GROUND_Y - R - BR + 15);
    ctx.stroke();
  }
  ctx.strokeStyle = '#d500f9';
  ctx.beginPath();
  ctx.moveTo(ai.targetX, CONFIG.GROUND_Y);
  ctx.lineTo(ai.targetX, CONFIG.GROUND_Y + 30);
  ctx.stroke();

  const sp = id => (sprites.chars[id] ? `${sprites.chars[id].status} ${sprites.chars[id].loaded}/5` : '-');
  const A = CONFIG.AI;
  const au = audio.stats();
  const lines = [
    `DEBUG  ${CONFIG.VERSION}`,
    `state: ${game.state}${game.pausedFrom ? ' (from ' + game.pausedFrom + ')' : ''}   server: ${game.server === 'left' ? 'player' : 'cpu'}`,
    `ball: x=${ball.x.toFixed(1)} y=${ball.y.toFixed(1)}  vx=${ball.vx.toFixed(1)} vy=${ball.vy.toFixed(1)} |v|=${Math.hypot(ball.vx, ball.vy).toFixed(0)}`,
    `AI land: ${ai.predLandX === null ? '-' : ai.predLandX.toFixed(0)}  contact: ${ai.predContactX === null ? '-' : ai.predContactX.toFixed(0)}  target: ${ai.targetX.toFixed(0)}`,
    `opponent: ${game.opponent} (${AI_PROFILES[game.opponent].level})  react=${A.REACTION_TIME} err=${A.PREDICT_ERROR} miss=${A.BIG_MISTAKE_CHANCE} hit=${A.HIT_CHANCE} jump=${A.JUMP_CHANCE}`,
    `player hit: ${player.hitTimer.toFixed(2)}${player.hitUsed ? ' used' : ''}  cpu hit: ${cpu.hitTimer.toFixed(2)}  input: ${['left', 'right', 'jump', 'hit'].filter(k => playerCtrl[k]).join(',') || '-'}`,
    `visual: ${visualMode}  V: ${sp('v')} ${poseOf(player)}${player.lookDir > 0 ? '→' : '←'}  CPU: ${sp(game.opponent)} ${poseOf(cpu)}${cpu.lookDir > 0 ? '→' : '←'}  ball: ${sprites.ball.status}`,
    `audio: ${au.unlocked ? (au.ctx || 'none') : 'locked'}  bgm=${au.current || '-'}${au.muted ? ' (muted)' : ''}`,
    `FPS: ${fpsMeter.fps}  physics: ${fpsMeter.tps}/s  scale: ${viewScale.toFixed(2)}   (Shift+D 切換除錯)`,
  ];
  ctx.fillStyle = 'rgba(0,0,0,.6)';
  ctx.fillRect(10, 120, 700, lines.length * 20 + 12);
  ctx.fillStyle = '#b9f6ca';
  ctx.font = '15px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, 18, 126 + i * 20));
  ctx.restore();
}

function render() {
  ctx.setTransform(viewScale * dpr, 0, 0, viewScale * dpr, viewOX * dpr, viewOY * dpr);
  drawBackground();
  drawNet();
  drawChar(player);
  drawChar(cpu);
  drawBall();
  if (game.state !== STATE.TITLE) drawHUD();
  if (debugOn) drawDebug();
}

// =========================================================
// 主迴圈（固定 60Hz 物理 + requestAnimationFrame 繪圖）
// =========================================================
let lastTime = null;
let accumulator = 0;

function resetClock() {
  lastTime = null;
  accumulator = 0;
}

function frame(now) {
  if (lastTime === null) lastTime = now;
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  if (dt > CONFIG.MAX_FRAME_DT) dt = CONFIG.MAX_FRAME_DT;
  if (dt < 0) dt = 0;

  accumulator += dt;
  let steps = 0;
  while (accumulator >= STEP && steps < CONFIG.MAX_STEPS_PER_FRAME) {
    fixedUpdate(STEP);
    accumulator -= STEP;
    steps++;
  }
  if (steps >= CONFIG.MAX_STEPS_PER_FRAME) accumulator = 0; // 丟棄過多累積，不補跑

  fpsMeter.frames++;
  fpsMeter.ticks += steps;
  fpsMeter.acc += dt;
  if (fpsMeter.acc >= 0.5) {
    fpsMeter.fps = Math.round(fpsMeter.frames / fpsMeter.acc);
    fpsMeter.tps = Math.round(fpsMeter.ticks / fpsMeter.acc);
    fpsMeter.frames = 0;
    fpsMeter.ticks = 0;
    fpsMeter.acc = 0;
  }

  updateControlsVisibility();
  render();
  requestAnimationFrame(frame);
}

// =========================================================
// 介面
// =========================================================
const el = {
  stage: document.getElementById('stage'),
  game: document.getElementById('game'),
  title: document.getElementById('overlayTitle'),
  cards: document.getElementById('cards'),
  pause: document.getElementById('overlayPause'),
  over: document.getElementById('overlayOver'),
  overTitle: document.getElementById('overTitle'),
  overScore: document.getElementById('overScore'),
  overVs: document.getElementById('overVs'),
  reward: document.getElementById('rewardBox'),
  btnPause: document.getElementById('btnPause'),
  btnMute: document.getElementById('btnMute'),
  controls: document.getElementById('controls'),
  rotate: document.getElementById('rotateHint'),
  version: document.getElementById('versionTag'),
};

let overlayShown = 'title';
function showOverlay(which) {
  overlayShown = which;
  el.title.classList.toggle('hidden', which !== 'title');
  el.pause.classList.toggle('hidden', which !== 'pause');
  el.over.classList.toggle('hidden', which !== 'over');
  el.btnPause.classList.toggle('hidden', which !== null);
  updateControlsVisibility();
}

// ---------- 選角畫面 ----------
let selectedIndex = 1;
let starting = false;

function buildCards() {
  el.cards.innerHTML = '';
  OPPONENT_ORDER.forEach((id, i) => {
    const p = AI_PROFILES[id];
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `card card-${id}`;
    card.dataset.opponent = id;
    card.innerHTML = `
      <span class="card-level lv-${i}">${p.level}</span>
      <span class="card-img"><img alt="${p.name}" draggable="false"></span>
      <span class="card-name">${p.name}</span>
      <span class="card-desc">${p.desc}</span>
      <span class="card-reward">🎁 ${p.reward}</span>
      <span class="card-loading">載入中…</span>`;
    const img = card.querySelector('img');
    img.onerror = () => { img.replaceWith(Object.assign(document.createElement('span'), { className: 'card-fallback', textContent: '●' })); };
    img.src = charImagePath(id, 'idle');
    card.addEventListener('click', (e) => { e.preventDefault(); chooseOpponent(id); });
    card.addEventListener('pointerenter', () => { selectedIndex = i; highlightCard(); });
    el.cards.appendChild(card);
  });
  highlightCard();
}

function highlightCard() {
  el.cards.querySelectorAll('.card').forEach((c, i) => c.classList.toggle('focus', i === selectedIndex));
}

function chooseOpponent(id) {
  if (starting || game.state !== STATE.TITLE) return;
  audio.unlock();
  sfx('ui_click');
  starting = true;
  const card = el.cards.querySelector(`[data-opponent="${id}"]`);
  if (card) card.classList.add('loading');
  // 等該對手的圖片載好（最多 8 秒；失敗會自動用幾何圖形）
  const timeout = new Promise(ok => setTimeout(ok, 8000));
  Promise.race([Promise.all([loadCharacter('v'), loadCharacter(id), audio.ready()]), timeout]).then(() => {
    if (card) card.classList.remove('loading');
    starting = false;
    if (game.state === STATE.TITLE) startMatch(id);
  });
}

// ---------- 結算畫面 ----------
function showGameOver() {
  const playerWon = game.winner === 'left';
  const p = AI_PROFILES[game.opponent];
  el.overTitle.textContent = playerWon ? '小V 獲勝！' : `${p.name} 獲勝！`;
  el.overTitle.classList.toggle('lose', !playerWon);
  el.overVs.textContent = `小V vs ${p.name}（${p.level}）`;
  el.overScore.textContent = `${game.score.left} : ${game.score.right}`;
  // 只顯示獎勵規則與級距，不顯示數字、不發放任何東西
  el.reward.innerHTML = `
    <div class="rw-title">獎勵預覽（測試版不發放）</div>
    <div class="rw-row"><span>完成比賽保底獎勵</span><b class="ok">✔ 已達成</b></div>
    <div class="rw-row"><span>本場得分 ${game.score.left} 分</span><b>得分越高，獎勵越高</b></div>
    <div class="rw-row"><span>對手難度：${p.level}</span><b>${p.reward}</b></div>
    <div class="rw-row"><span>勝利加碼</span><b class="${playerWon ? 'ok' : 'no'}">${playerWon ? '✔ 獲得' : '— 未獲得'}</b></div>`;
  showOverlay('over');
}

function bindButton(id, fn, click = true) {
  const b = document.getElementById(id);
  b.addEventListener('click', (e) => {
    e.preventDefault();
    b.blur();
    audio.unlock();
    if (click) sfx('ui_click');
    fn();
  });
}

bindButton('btnResume', resumeGame);
bindButton('btnPauseTitle', goToTitle);
bindButton('btnAgain', () => startMatch(game.opponent));
bindButton('btnChange', goToTitle);
bindButton('btnPause', () => {
  if (game.state === STATE.PAUSED) resumeGame();
  else pauseGame();
});
bindButton('btnMute', () => {
  audio.setMuted(!audio.isMuted());
  updateMuteButton();
}, false);

function updateMuteButton() {
  const m = audio.isMuted();
  el.btnMute.textContent = m ? '🔇' : '🔊';
  el.btnMute.setAttribute('aria-label', m ? '取消靜音' : '靜音');
  el.btnMute.classList.toggle('muted', m);
}

// 第一次與頁面互動時才啟動音訊（符合瀏覽器自動播放限制）
for (const ev of ['pointerdown', 'keydown', 'touchend']) {
  window.addEventListener(ev, () => audio.unlock(), { capture: true, passive: true });
}

// ---- 鍵盤 ----
window.addEventListener('keydown', (e) => {
  // 選角畫面：← → 選擇，Enter／Space 確認
  if (game.state === STATE.TITLE) {
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
      e.preventDefault();
      if (!e.repeat) {
        selectedIndex = (selectedIndex + (e.code === 'ArrowRight' ? 1 : OPPONENT_ORDER.length - 1)) % OPPONENT_ORDER.length;
        highlightCard();
      }
      return;
    }
    if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      if (!e.repeat) chooseOpponent(OPPONENT_ORDER[selectedIndex]);
      return;
    }
  }
  const cmd = KEY_MAP[e.code];
  if (cmd) {
    e.preventDefault(); // 阻止方向鍵與 Space 捲動頁面
    if (!e.repeat) {    // 自動連發的 keydown 不當作新按鍵
      keyInput[cmd] = true;
      if (cmd === 'jump' || cmd === 'hit') pressLatch[cmd] = true;
    }
    return;
  }
  if (e.code === 'KeyP' || e.code === 'Escape') {
    e.preventDefault();
    if (game.state === STATE.PAUSED) resumeGame();
    else pauseGame();
    return;
  }
  if (e.code === 'KeyM') {
    audio.setMuted(!audio.isMuted());
    updateMuteButton();
    return;
  }
  if (e.code === 'KeyD' && e.shiftKey) {
    debugOn = !debugOn;
    return;
  }
  if (e.code === 'Enter') {
    if (game.state === STATE.GAME_OVER) { e.preventDefault(); sfx('ui_click'); startMatch(game.opponent); }
    else if (game.state === STATE.PAUSED) { e.preventDefault(); resumeGame(); }
  }
}, { passive: false });

window.addEventListener('keyup', (e) => {
  const cmd = KEY_MAP[e.code];
  if (cmd) {
    e.preventDefault();
    keyInput[cmd] = false;
  }
}, { passive: false });

// =========================================================
// 觸控（多點）v0.2.0：按鈕疊在畫面上，每根手指只對應「最近的一顆」按鈕
// =========================================================
const activePointers = new Map(); // pointerId -> {x, y}
const ctrlButtons = Array.from(document.querySelectorAll('.ctrl-btn'));
const ctrlPads = Array.from(document.querySelectorAll('.ctrl-pad'));
let btnGeom = [];   // [{ el, cmd, x, y, r }]：按鈕中心與觸控判定半徑（螢幕 CSS px）

function buttonAt(x, y) {
  let best = null, bestD = Infinity;
  for (const b of btnGeom) {
    const d = Math.hypot(x - b.x, y - b.y);
    if (d <= b.r && d < bestD) { best = b; bestD = d; }
  }
  return best;
}

function recomputeTouch() {
  const next = { left: false, right: false, jump: false, hit: false };
  for (const p of activePointers.values()) {
    const b = buttonAt(p.x, p.y);
    if (b) { next[b.cmd] = true; b.pressed = true; }
  }
  if (next.jump && !touchInput.jump) pressLatch.jump = true;
  if (next.hit && !touchInput.hit) pressLatch.hit = true;
  touchInput.left = next.left;
  touchInput.right = next.right;
  touchInput.jump = next.jump;
  touchInput.hit = next.hit;
  updateTouchButtonsVisual();
}

function updateTouchButtonsVisual() {
  const on = new Set();
  for (const p of activePointers.values()) {
    const b = buttonAt(p.x, p.y);
    if (b) on.add(b.el);
  }
  for (const b of ctrlButtons) b.classList.toggle('active', on.has(b));
}

function pointerXY(e) {
  // 以 #stage 為原點（與按鈕定位一致）
  const r = el.stage.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

for (const pad of ctrlPads) {
  pad.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    activePointers.set(e.pointerId, pointerXY(e));
    recomputeTouch();
  }, { passive: false });
}

window.addEventListener('pointermove', (e) => {
  if (!activePointers.has(e.pointerId)) return;
  activePointers.set(e.pointerId, pointerXY(e));
  recomputeTouch();   // 滑到另一顆鍵＝換鍵；滑出判定範圍＝放開
}, { passive: false });

function releasePointer(e) {
  if (activePointers.delete(e.pointerId)) recomputeTouch();
}
window.addEventListener('pointerup', releasePointer);
window.addEventListener('pointercancel', releasePointer);

// 防止觸控造成捲動、雙擊縮放、長按選單、選取文字
el.controls.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
el.controls.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
el.controls.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
document.addEventListener('selectstart', (e) => e.preventDefault());
canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

function updateControlsVisibility() {
  const show = isTouchDevice && overlayShown === null && game.state !== STATE.TITLE;
  if (el.controls.classList.contains('hidden') === show) {
    el.controls.classList.toggle('hidden', !show);
    if (!show) { activePointers.clear(); recomputeTouch(); }
  }
}

// ---- 失去焦點／背景 → 安全暫停 ----
window.addEventListener('blur', () => {
  clearAllInputs();
  pauseGame();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearAllInputs();
    pauseGame();
    audio.suspend();
  } else {
    audio.wake();
  }
  resetClock();
});

// =========================================================
// 尺寸與方向
// =========================================================
const isTouchDevice = forceTouch ||
  (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
  ('ontouchstart' in window && navigator.maxTouchPoints > 0);

function viewportSize() {
  const vv = window.visualViewport;
  return {
    w: Math.round(vv ? vv.width : window.innerWidth),
    h: Math.round(vv ? vv.height : window.innerHeight),
  };
}

function rotateBlocking() {
  if (!isTouchDevice) return false;
  const { w, h } = viewportSize();
  return h > w;
}

const safeProbe = document.getElementById('safeProbe');
function safeInsets() {
  const cs = getComputedStyle(safeProbe);
  return {
    l: parseFloat(cs.paddingLeft) || 0, r: parseFloat(cs.paddingRight) || 0,
    t: parseFloat(cs.paddingTop) || 0, b: parseFloat(cs.paddingBottom) || 0,
  };
}

function layoutControls(w, h) {
  const T = TOUCH_CONFIG;
  const safe = safeInsets();
  const d = Math.round(Math.max(T.BUTTON_MIN, Math.min(T.BUTTON_MAX, h * T.BUTTON_VH)));
  const gap = Math.round(d * T.GAP_RATIO);
  const baseY = h - T.EDGE - safe.b - d / 2;
  const leftX = T.EDGE + safe.l + d / 2;
  const rightX = w - T.EDGE - safe.r - d / 2;
  const pos = {
    'left:left': [leftX, baseY],
    'left:right': [leftX + d + gap, baseY],
    'left:jump': [leftX + (d + gap) / 2, baseY - d * 0.92 - gap],   // 左右鍵的上方中央
    'right:jump': [rightX - d - gap, baseY],
    'right:hit': [rightX, baseY],
  };
  btnGeom = [];
  for (const b of ctrlButtons) {
    const [x, y] = pos[b.dataset.side + ':' + b.dataset.cmd];
    b.style.width = b.style.height = d + 'px';
    b.style.left = (x - d / 2) + 'px';
    b.style.top = (y - d / 2) + 'px';
    b.style.fontSize = Math.round(d * 0.36) + 'px';
    btnGeom.push({ el: b, cmd: b.dataset.cmd, x, y, r: d * T.HIT_RADIUS });
  }
  // 觸控板：涵蓋每一側按鈕的判定範圍（多出來的邊界讓手指稍微偏一點也按得到）
  for (const pad of ctrlPads) {
    const side = pad.dataset.side;
    const gs = btnGeom.filter(g => g.el.dataset.side === side);
    const m = d * T.HIT_RADIUS;
    const x0 = Math.max(0, Math.min(...gs.map(g => g.x)) - m), x1 = Math.min(w, Math.max(...gs.map(g => g.x)) + m);
    const y0 = Math.max(0, Math.min(...gs.map(g => g.y)) - m), y1 = Math.min(h, Math.max(...gs.map(g => g.y)) + m);
    Object.assign(pad.style, { left: x0 + 'px', top: y0 + 'px', width: (x1 - x0) + 'px', height: (y1 - y0) + 'px' });
  }
}

function layout() {
  const { w, h } = viewportSize();
  const vv = window.visualViewport;
  // 跟著可視區域（瀏覽器工具列出現／消失時也正確）
  el.stage.style.width = w + 'px';
  el.stage.style.height = h + 'px';
  el.stage.style.left = (vv ? vv.offsetLeft : 0) + 'px';
  el.stage.style.top = (vv ? vv.offsetTop : 0) + 'px';

  const portrait = rotateBlocking();
  el.rotate.classList.toggle('hidden', !portrait);
  if (portrait) pauseGame();

  // 畫布填滿整個畫面；遊戲世界（16:9）完整顯示在中央，多出來的地方延伸背景（不再有黑邊）
  viewW = w; viewH = h;
  viewScale = Math.min(w / CONFIG.WORLD_W, h / CONFIG.WORLD_H);
  viewOX = (w - CONFIG.WORLD_W * viewScale) / 2;
  viewOY = (h - CONFIG.WORLD_H * viewScale) / 2;
  dpr = Math.min(window.devicePixelRatio || 1, CONFIG.MAX_DPR);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);

  Object.assign(el.game.style, {
    left: viewOX + 'px', top: viewOY + 'px',
    width: CONFIG.WORLD_W * viewScale + 'px', height: CONFIG.WORLD_H * viewScale + 'px',
  });
  document.documentElement.style.setProperty('--s', viewScale.toFixed(4));

  layoutControls(w, h);
  activePointers.clear();
  recomputeTouch();
  render();
}

window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 150));
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', layout);
  window.visualViewport.addEventListener('scroll', layout);
}

// =========================================================
// 唯讀狀態介面（除錯／測試用，不提供任何寫入）
// =========================================================
window.BalloonVolleyball = {
  version: CONFIG.VERSION,
  getSnapshot() {
    return {
      state: game.state,
      pausedFrom: game.pausedFrom,
      server: game.server,
      score: { ...game.score },
      winner: game.winner,
      opponent: game.opponent,
      ticks: game.ticks,
      ballEventId: game.ballEventId,
      ball: { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy, held: ball.held, spin: ball.spin },
      player: { x: player.x, y: player.y, onGround: player.onGround, hitTimer: player.hitTimer, hitUsed: player.hitUsed },
      cpu: { x: cpu.x, y: cpu.y, onGround: cpu.onGround, hitTimer: cpu.hitTimer },
      visual: {
        mode: visualMode,
        player: { pose: poseOf(player), dir: player.lookDir, poseDir: player.poseDir, poseTimer: player.poseTimer },
        cpu: { pose: poseOf(cpu), dir: cpu.lookDir, poseDir: cpu.poseDir, poseTimer: cpu.poseTimer },
        sprites: Object.fromEntries(Object.entries(sprites.chars).map(([k, v]) => [k, { status: v.status, loaded: v.loaded, failed: v.failed.slice() }])),
        ball: sprites.ball.status,
      },
      ai: { targetX: ai.targetX, predLandX: ai.predLandX, profile: { ...CONFIG.AI } },
      input: { ...playerCtrl },
      touch: { ...touchInput },
      audio: audio.stats(),
      view: { scale: viewScale, ox: viewOX, oy: viewOY, w: viewW, h: viewH },
      controls: btnGeom.map(b => ({ side: b.el.dataset.side, cmd: b.cmd, x: Math.round(b.x), y: Math.round(b.y), r: Math.round(b.r), d: Math.round(parseFloat(b.el.style.width)) })),
    };
  },
};

// =========================================================
// 啟動
// =========================================================
el.version.textContent = CONFIG.VERSION;
buildCards();
updateMuteButton();
loadBall();
loadCharacter('v');
// 背景預先載入三位對手（不阻擋畫面）
OPPONENT_ORDER.forEach(id => loadCharacter(id));
setOpponent('orange');
goToTitle();
layout();
requestAnimationFrame(frame);

})();

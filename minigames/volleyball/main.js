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
  VERSION: 'MVP v0.1',

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

  // ---- 電腦 AI ----
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
}

function startMatch() {
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

  // 跳躍：只在按下瞬間觸發（含落地前短暫緩衝），長按不會連跳
  if (canMove && jumpEdge) c.jumpBuffer = CONFIG.JUMP_BUFFER;
  else c.jumpBuffer = Math.max(0, c.jumpBuffer - dt);
  if (c.onGround && c.jumpBuffer > 0) {
    c.vy = -CONFIG.CHAR_JUMP_SPEED;
    c.onGround = false;
    c.jumpBuffer = 0;
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
}

function afterPoint() {
  const w = game.pointWinner;
  if (game.score[w] >= CONFIG.TARGET_SCORE) {
    game.winner = w;
    game.state = STATE.GAME_OVER;
    clearAllInputs();
    showGameOver();
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
}

// =========================================================
// 繪圖
// =========================================================
const canvas = document.getElementById('court');
const ctx = canvas.getContext('2d');
let viewScale = 1;
let dpr = 1;

function drawBackground() {
  const W = CONFIG.WORLD_W, G = CONFIG.GROUND_Y;
  const sky = ctx.createLinearGradient(0, 0, 0, G);
  sky.addColorStop(0, '#8fd3ff');
  sky.addColorStop(1, '#e6f6ff');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, G);

  // 簡單雲朵
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  for (const [cx, cy, s] of [[180, 160, 1], [380, 250, 0.7], [900, 180, 1.1], [1080, 300, 0.7]]) {
    ctx.beginPath();
    ctx.arc(cx, cy, 34 * s, 0, Math.PI * 2);
    ctx.arc(cx + 38 * s, cy - 12 * s, 40 * s, 0, Math.PI * 2);
    ctx.arc(cx + 80 * s, cy, 32 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  // 地板
  ctx.fillStyle = '#f2c46d';
  ctx.fillRect(0, G, W, CONFIG.WORLD_H - G);
  ctx.fillStyle = '#d9a446';
  ctx.fillRect(0, G, W, 8);
  // 左右半場顏色提示
  ctx.fillStyle = 'rgba(155,107,224,.18)';
  ctx.fillRect(0, G + 8, CONFIG.NET_X, CONFIG.WORLD_H - G - 8);
  ctx.fillStyle = 'rgba(255,140,40,.16)';
  ctx.fillRect(CONFIG.NET_X, G + 8, CONFIG.NET_X, CONFIG.WORLD_H - G - 8);
}

function drawNet() {
  // 網柱
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(NET_LEFT, NET_TOP, CONFIG.NET_W, CONFIG.NET_H);
  ctx.strokeStyle = '#6a5a8c';
  ctx.lineWidth = 3;
  ctx.strokeRect(NET_LEFT, NET_TOP, CONFIG.NET_W, CONFIG.NET_H);
  // 網格
  ctx.strokeStyle = 'rgba(106,90,140,.6)';
  ctx.lineWidth = 1.5;
  for (let y = NET_TOP + 14; y < CONFIG.GROUND_Y; y += 14) {
    ctx.beginPath();
    ctx.moveTo(NET_LEFT, y);
    ctx.lineTo(NET_RIGHT, y);
    ctx.stroke();
  }
  // 網頂
  ctx.fillStyle = '#ff5a8a';
  ctx.beginPath();
  ctx.arc(CONFIG.NET_X, NET_TOP, CONFIG.NET_W * 0.75, 0, Math.PI * 2);
  ctx.fill();
}

function drawShadow(x, w) {
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.beginPath();
  ctx.ellipse(x, CONFIG.GROUND_Y + 4, w, w * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawCharacter(c, body, dark) {
  drawShadow(c.x, R * 0.9);

  // 腳
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(c.x - 20, c.y + R - 4, 16, 9, 0, 0, Math.PI * 2);
  ctx.ellipse(c.x + 20, c.y + R - 4, 16, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // 身體（圓形，與碰撞範圍一致）
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(c.x, c.y, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = dark;
  ctx.stroke();

  // 眼睛看向球
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

  // 主動擊球中：手臂揮動 + 光圈
  if (c.hitTimer > 0 || c.hitFlash > 0) {
    ctx.strokeStyle = c.hitFlash > 0 ? 'rgba(255,240,120,.95)' : 'rgba(255,255,255,.8)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    const a0 = c.facing > 0 ? -Math.PI * 0.75 : -Math.PI * 0.25;
    ctx.arc(c.x, c.y, R + 14, a0 - 0.6, a0 + 0.6);
    ctx.stroke();
  }
}

function drawBall() {
  drawShadow(ball.x, BR * (0.5 + 0.5 * (ball.y / CONFIG.GROUND_Y)));
  ctx.save();
  ctx.translate(ball.x, ball.y);
  ctx.rotate(ball.spin);
  ctx.fillStyle = '#ffd84a';
  ctx.beginPath();
  ctx.arc(0, 0, BR, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#c9961a';
  ctx.stroke();
  // 排球線條（方便看出旋轉）
  ctx.beginPath();
  ctx.moveTo(-BR, 0);
  ctx.quadraticCurveTo(0, -BR * 0.5, BR, 0);
  ctx.moveTo(0, -BR);
  ctx.quadraticCurveTo(BR * 0.5, 0, 0, BR);
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  const W = CONFIG.WORLD_W;
  // 比分
  ctx.fillStyle = 'rgba(45,28,90,.82)';
  roundRect(W / 2 - 190, 12, 380, 74, 22);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = '#c9a8ff';
  ctx.fillText('玩家', W / 2 - 130, 49);
  ctx.fillStyle = '#ffb36b';
  ctx.fillText('電腦', W / 2 + 130, 49);
  ctx.font = 'bold 52px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(`${game.score.left}`, W / 2 - 55, 51);
  ctx.fillText(':', W / 2, 47);
  ctx.fillText(`${game.score.right}`, W / 2 + 55, 51);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.fillText(`先得 ${CONFIG.TARGET_SCORE} 分獲勝`, W / 2, 104);

  // 發球提示
  const st = game.state === STATE.PAUSED ? game.pausedFrom : game.state;
  if (st === STATE.SERVE_READY) {
    const text = game.server === 'left' ? '按 Space／擊球鍵 發球' : '電腦準備發球…';
    bannerText(text, 160, game.server === 'left' ? '#7b4cc9' : '#e07a1f');
  }
  if (st === STATE.POINT_SCORED && game.pointWinner) {
    bannerText(game.pointWinner === 'left' ? '玩家得分！' : '電腦得分！', 250,
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
  // 速度向量
  ctx.beginPath();
  ctx.moveTo(ball.x, ball.y);
  ctx.lineTo(ball.x + ball.vx * 0.1, ball.y + ball.vy * 0.1);
  ctx.stroke();
  // AI 預測
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

  const lines = [
    `DEBUG  ${CONFIG.VERSION}`,
    `state: ${game.state}${game.pausedFrom ? ' (from ' + game.pausedFrom + ')' : ''}`,
    `server: ${game.server === 'left' ? 'player' : 'cpu'}`,
    `ball: x=${ball.x.toFixed(1)} y=${ball.y.toFixed(1)}`,
    `ball v: vx=${ball.vx.toFixed(1)} vy=${ball.vy.toFixed(1)} |v|=${Math.hypot(ball.vx, ball.vy).toFixed(0)}`,
    `AI land: ${ai.predLandX === null ? '-' : ai.predLandX.toFixed(0)}  contact: ${ai.predContactX === null ? '-' : ai.predContactX.toFixed(0)}  target: ${ai.targetX.toFixed(0)}`,
    `player hit: ${player.hitTimer.toFixed(2)}${player.hitUsed ? ' used' : ''}  cpu hit: ${cpu.hitTimer.toFixed(2)}`,
    `input: ${['left', 'right', 'jump', 'hit'].filter(k => playerCtrl[k]).join(',') || '-'}`,
    `FPS: ${fpsMeter.fps}  physics: ${fpsMeter.tps}/s  scale: ${viewScale.toFixed(2)}`,
    `(Shift+D 切換除錯)`,
  ];
  ctx.fillStyle = 'rgba(0,0,0,.6)';
  ctx.fillRect(10, 120, 470, lines.length * 20 + 12);
  ctx.fillStyle = '#b9f6ca';
  ctx.font = '15px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, 18, 126 + i * 20));
  ctx.restore();
}

function render() {
  ctx.setTransform(viewScale * dpr, 0, 0, viewScale * dpr, 0, 0);
  drawBackground();
  drawNet();
  drawCharacter(player, '#9b6be0', '#5d3a9a');
  drawCharacter(cpu, '#ff9a3c', '#b85d10');
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

  render();
  requestAnimationFrame(frame);
}

// =========================================================
// 介面
// =========================================================
const el = {
  game: document.getElementById('game'),
  title: document.getElementById('overlayTitle'),
  pause: document.getElementById('overlayPause'),
  over: document.getElementById('overlayOver'),
  overTitle: document.getElementById('overTitle'),
  overScore: document.getElementById('overScore'),
  btnPause: document.getElementById('btnPause'),
  controls: document.getElementById('controls'),
  rotate: document.getElementById('rotateHint'),
};

function showOverlay(which) {
  el.title.classList.toggle('hidden', which !== 'title');
  el.pause.classList.toggle('hidden', which !== 'pause');
  el.over.classList.toggle('hidden', which !== 'over');
  el.btnPause.classList.toggle('hidden', which !== null);
}

function showGameOver() {
  const playerWon = game.winner === 'left';
  el.overTitle.textContent = playerWon ? '玩家獲勝！' : '電腦獲勝！';
  el.overScore.textContent = `${game.score.left} : ${game.score.right}`;
  showOverlay('over');
}

function bindButton(id, fn) {
  const b = document.getElementById(id);
  b.addEventListener('click', (e) => {
    e.preventDefault();
    b.blur();
    fn();
  });
}

bindButton('btnStart', startMatch);
bindButton('btnResume', resumeGame);
bindButton('btnPauseTitle', goToTitle);
bindButton('btnAgain', startMatch);
bindButton('btnOverTitle', goToTitle);
bindButton('btnPause', () => {
  if (game.state === STATE.PAUSED) resumeGame();
  else pauseGame();
});

// ---- 鍵盤 ----
window.addEventListener('keydown', (e) => {
  const cmd = KEY_MAP[e.code];
  if (cmd) {
    e.preventDefault(); // 阻止方向鍵與 Space 捲動頁面
    if (!e.repeat) {                        // 自動連發的 keydown 不當作新按鍵
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
  if (e.code === 'KeyD' && e.shiftKey) {
    debugOn = !debugOn;
    return;
  }
  if (e.code === 'Enter') {
    if (game.state === STATE.TITLE || game.state === STATE.GAME_OVER) { e.preventDefault(); startMatch(); }
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

// ---- 觸控（多點）----
// 每根手指獨立追蹤；每次有手指變化就依「所有仍按住的手指」重新計算按鍵狀態
const activePointers = new Map(); // pointerId -> {x, y}
const ctrlButtons = Array.from(document.querySelectorAll('.ctrl-btn'));
const TOUCH_SLOP = 10; // 按鍵邊緣額外容許範圍（px）

function recomputeTouch() {
  const next = { left: false, right: false, jump: false, hit: false };
  const rects = ctrlButtons.map(b => ({ cmd: b.dataset.cmd, r: b.getBoundingClientRect() }));
  for (const p of activePointers.values()) {
    for (const { cmd, r } of rects) {
      if (p.x >= r.left - TOUCH_SLOP && p.x <= r.right + TOUCH_SLOP &&
          p.y >= r.top - TOUCH_SLOP && p.y <= r.bottom + TOUCH_SLOP) {
        next[cmd] = true;
      }
    }
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
  for (const b of ctrlButtons) b.classList.toggle('active', !!touchInput[b.dataset.cmd]);
}

el.controls.addEventListener('pointerdown', (e) => {
  if (!e.target.closest('.ctrl-btn')) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  e.preventDefault();
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  recomputeTouch();
}, { passive: false });

window.addEventListener('pointermove', (e) => {
  const p = activePointers.get(e.pointerId);
  if (!p) return;
  p.x = e.clientX;
  p.y = e.clientY;
  recomputeTouch();
}, { passive: false });

function releasePointer(e) {
  if (activePointers.delete(e.pointerId)) recomputeTouch();
}
window.addEventListener('pointerup', releasePointer);
window.addEventListener('pointercancel', releasePointer);

// 防止觸控造成捲動、雙擊縮放、長按選單
el.controls.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
el.controls.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
el.controls.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

// ---- 失去焦點／背景 → 安全暫停 ----
window.addEventListener('blur', () => {
  clearAllInputs();
  pauseGame();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearAllInputs();
    pauseGame();
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
    w: vv ? vv.width : window.innerWidth,
    h: vv ? vv.height : window.innerHeight,
  };
}

function rotateBlocking() {
  if (!isTouchDevice) return false;
  const { w, h } = viewportSize();
  return h > w;
}

function layout() {
  const { w, h } = viewportSize();
  const portrait = rotateBlocking();
  el.rotate.classList.toggle('hidden', !portrait);
  if (portrait) pauseGame();

  el.controls.classList.toggle('hidden', !isTouchDevice);

  viewScale = Math.min(w / CONFIG.WORLD_W, h / CONFIG.WORLD_H);
  const cssW = Math.floor(CONFIG.WORLD_W * viewScale);
  const cssH = Math.floor(CONFIG.WORLD_H * viewScale);
  viewScale = cssW / CONFIG.WORLD_W;
  dpr = Math.min(window.devicePixelRatio || 1, CONFIG.MAX_DPR);
  el.game.style.width = cssW + 'px';
  el.game.style.height = cssH + 'px';
  el.game.style.setProperty('--s', viewScale.toFixed(4));
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);

  // 手機按鍵大小依螢幕高度
  const btn = Math.round(Math.max(54, Math.min(96, h * 0.17)));
  el.controls.style.setProperty('--btn', btn + 'px');
  el.controls.style.setProperty('--gap', Math.round(btn * 0.18) + 'px');

  // 尺寸改變時手指位置已失效，重新計算
  activePointers.clear();
  recomputeTouch();
  render();
}

window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 120));
if (window.visualViewport) window.visualViewport.addEventListener('resize', layout);

// =========================================================
// 唯讀狀態介面（除錯／未來整合用，不提供任何寫入）
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
      ticks: game.ticks,
      ballEventId: game.ballEventId,
      ball: { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy, held: ball.held },
      player: { x: player.x, y: player.y, onGround: player.onGround, hitTimer: player.hitTimer, hitUsed: player.hitUsed },
      cpu: { x: cpu.x, y: cpu.y, onGround: cpu.onGround, hitTimer: cpu.hitTimer },
      input: { ...playerCtrl },
      touch: { ...touchInput },
      ai: { targetX: ai.targetX, predLandX: ai.predLandX },
    };
  },
};

// =========================================================
// 啟動
// =========================================================
goToTitle();
layout();
requestAnimationFrame(frame);

})();

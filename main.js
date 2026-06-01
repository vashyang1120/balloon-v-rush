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

  // -- 攻擊 --
  PROJECTILE_W:    22,    // 氣球彈射物寬度 (px)
  PROJECTILE_H:    22,    // 氣球彈射物高度 (px)
  PROJECTILE_SPD:  9,     // 彈射物飛行速度
  PROJECTILE_LIFE: 40,    // 彈射物存活幀數（越大飛越遠）

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

// ── Asset loading ─────────────────────────────
const playerImg = new Image();
playerImg.src = 'assets/player.png'; // place your image here

// ── Game state ────────────────────────────────
let gameState = 'playing'; // 'playing' | 'gameover' | 'clear'
let cameraX   = 0;
let frameCount = 0;
let lastTime   = 0;
let elapsedSec = 0;

const player = {
  x: 100, y: GROUND_Y - CONFIG.PLAYER_H,
  w: CONFIG.PLAYER_W, h: CONFIG.PLAYER_H,
  vx: 0,  vy: 0,
  onGround: false,
  facingRight: true,
  hp: 5, maxHp: 5,
  invincible: 0,     // frames of invincibility after hit
  attackCooldown: 0,
  attackActive: 0,   // frames the hitbox is live
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
const spikes = generateSpikes();
const enemies = generateEnemies();
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

  if (inp('attack') && player.attackCooldown === 0) {
    player.attackCooldown = 30;
    player.attackActive = 12;
    fireProjectile();
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
        projectiles.splice(i, 1);
      }
    });
  }
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
      player.coinsCollected++;
    }
  });

  balloons260.forEach(b => {
    if (b.collected) return;
    if (rectsOverlap(px, py, pw, ph, b.x - CONFIG.BALLOON_W/2, b.y - CONFIG.BALLOON_H/2, CONFIG.BALLOON_W, CONFIG.BALLOON_H)) {
      b.collected = true;
      player.balloonsCollected++;
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
}

function damagePlayer() {
  player.hp--;
  player.invincible = 90;
  if (player.hp <= 0) triggerGameOver();
}

function checkFinish() {
  if (player.x + player.w >= FINISH_X) {
    triggerClear();
  }
}

function triggerGameOver() {
  gameState = 'gameover';
}

function triggerClear() {
  gameState = 'clear';
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
    drawOverlay('💀 遊戲結束', '#c0392b');
    drawResultBox();
  } else if (gameState === 'clear') {
    drawWorld();
    drawHUD();
    drawOverlay('🎉 關卡完成！', '#27ae60');
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
  if (player.attackActive > 0) {
    const dir = player.facingRight ? 1 : -1;
    ctx.fillStyle = 'rgba(255,20,147,0.4)';
    ctx.beginPath();
    ctx.ellipse(
      (player.facingRight ? player.w + 20 : -20), player.h * 0.4,
      28, 18, 0, 0, Math.PI * 2
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
  const count = Math.floor(w / 16);
  ctx.fillStyle = COLORS.spike;
  for (let i = 0; i < count; i++) {
    const bx = x + i * (w / count);
    const bw = w / count;
    ctx.beginPath();
    ctx.moveTo(bx, y + h);
    ctx.lineTo(bx + bw / 2, y);
    ctx.lineTo(bx + bw, y + h);
    ctx.closePath();
    ctx.fill();
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

function drawResultBox() {
  const bx = CANVAS_W / 2 - 230;
  const by = CANVAS_H / 2 - 60;
  const bw = 460;
  const bh = 260;

  ctx.fillStyle = 'rgba(20,20,40,0.92)';
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const timeLeft = Math.max(0, LEVEL_DURATION - Math.floor(elapsedSec));

  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px sans-serif';

  const lines = [
    ['🪙 金幣收集',       `${player.coinsCollected} 枚`],
    ['🎈 260氣球收集',    `${player.balloonsCollected} 條`],
    ['💥 擊退小怪',       `${player.enemiesDefeated} 隻`],
    ['❤️ 剩餘生命',       `${player.hp} / ${player.maxHp}`],
    ['⏱  剩餘時間',       `${timeLeft} 秒`],
  ];

  lines.forEach(([label, val], i) => {
    const row = by + 22 + i * 34;
    ctx.fillStyle = '#aaa';
    ctx.font = '14px sans-serif';
    ctx.fillText(label, bx + 24, row);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(val, bx + bw - 24, row);
    ctx.textAlign = 'left';
  });

  // Divider
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(bx + 16, by + bh - 72);
  ctx.lineTo(bx + bw - 16, by + bh - 72);
  ctx.stroke();

  // Trivia
  const trivia = TRIVIA[Math.floor(player.coinsCollected + player.balloonsCollected) % TRIVIA.length];
  ctx.fillStyle = '#adf';
  ctx.font = 'italic 12px sans-serif';
  ctx.textAlign = 'center';
  wrapText(ctx, '💡 ' + trivia, CANVAS_W / 2, by + bh - 50, bw - 40, 18);

  // Restart hint
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '13px sans-serif';
  ctx.fillText('按任意鍵 / 點擊重新開始', CANVAS_W / 2, by + bh - 14);
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
  // Reset player
  Object.assign(player, {
    x: 100, y: GROUND_Y - CONFIG.PLAYER_H,
    vx: 0, vy: 0,
    onGround: false, facingRight: true,
    hp: 5, invincible: 0,
    attackCooldown: 0, attackActive: 0,
    coinsCollected: 0, balloonsCollected: 0, enemiesDefeated: 0,
  });
  // Reset world
  cameraX   = 0;
  frameCount = 0;
  elapsedSec = 0;
  gameState  = 'playing';

  coins.forEach(c => { c.collected = false; });
  balloons260.forEach(b => { b.collected = false; });
  enemies.forEach(e => { e.active = true; e.hp = 2; e.x = e.patrol; e.hitFlash = 0; });
  projectiles.length = 0;
}

window.addEventListener('keydown', () => {
  if (gameState !== 'playing') restart();
});
canvas.addEventListener('click', () => {
  if (gameState !== 'playing') restart();
});
canvas.addEventListener('touchstart', () => {
  if (gameState !== 'playing') restart();
});

// ── Game loop ─────────────────────────────────
function loop(timestamp) {
  const dtMs = lastTime ? Math.min(timestamp - lastTime, 50) : 16.667;
  const dt   = dtMs / 16.667; // frame multiplier for physics (1.0 at 60fps)
  lastTime   = timestamp;

  update(dt, dtMs);
  draw();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

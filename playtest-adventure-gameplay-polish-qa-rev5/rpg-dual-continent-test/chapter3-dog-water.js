'use strict';
// Companion Water Animation｜Hotfix 1 — the balloon dog in the 3-4 pool (Continent 2 only).
//
// Root cause: the dog has no water state. Its pose follows 小V, and a swimming 小V is "not on the
// ground" with vy 0, so the dog showed the fall frame; it was drawn at 小V's swimming feet with no
// water cover, and a dog behind 小V on a bank hung in the air over the pool.
//
// Here the dog gets its own water state from its own position: it swims when its spot is over the
// open pool (not on the floating pad) and it is at or below the water, or 小V stands somewhere while
// the dog's spot has nothing under it. While swimming it loops the existing run frames (slower when
// still), keeps its nose a fixed height above the surface, and the part under the surface is drawn
// with the same water tint and fade as 小V's swimmer layer. The following logic, the treasure nose,
// companion turns and all artwork are unchanged. Leaving the water, the dog eases back to 小V's feet
// with the existing jump-up frame instead of jumping there in one frame.
const C34_DOG_WATER = {
  waterlineBelowNose: 70,   // source px under the nose where the waterline sits (collar level; face and top of back stay dry)
  bobPx: 1.2,               // gentle float, px
  bobMs: 420,
  strokeMs: 150,            // run frame time while paddling (same as on land)
  strokeStillMs: 210,       // run frame time while 小V stands still in the water
  enterAbove: 4,            // the dog's feet within 4 px above the surface count as reaching the water
  leaveAbove: 30,           // it leaves the water only when its feet are 30 px above it (no walk/fall flicker)
  wallGap: 2,               // the whole dog picture stays this far inside the pool walls (never in the rock)
  padGap: 2,                // ...and beside the floating pad, not overlapping it
  easeX: 0.25,              // horizontal easing while swimming (no jump when 小V turns around)
  padEdge: 6,               // dog on the floating pad when within 6 px of its ends
  ease: 0.22,               // vertical easing when entering or leaving the water
  maxStep: 8,               // ...at most 8 px per step (about a normal jump's speed)
  tint: 'rgba(11,103,148,0.42)',   // same as 小V's submerged layer
  fadeTop: 'rgba(0,0,0,0.68)',
};

const c34DogLayer = document.createElement('canvas');
let c34Dog = { water: false, y: null, x: null, rising: false, strokeStart: 0, lastStill: null };

function c34DogReset() { c34Dog = { water: false, y: null, x: null, rising: false, strokeStart: 0, lastStill: null }; }

// Decide the water state from the dog's own spot. Called once per game step.
function c34DogWaterStep() {
  if (!c34Is() || !bringBalloonDog) { if (c34Dog.water || c34Dog.y != null) c34DogReset(); return; }
  const pool = c34Pool();
  const a = getDogWorldAnchor();
  if (!pool) { c34DogReset(); return; }
  const P = C34_DOG_WATER, surface = c34SurfaceY();
  const inside = a.x > pool.x + 10 && a.x < pool.x + pool.w - 10;
  const pad = platforms.find(p => p.c34Pad);
  const onPad = !!pad && a.x >= pad.x - P.padEdge && a.x <= pad.x + pad.w + P.padEdge &&
    a.y <= pad.y + DOG_ART.footOffsetY + 8;
  let water = c34Dog.water;
  // While 小V herself swims the dog is always in the pool (when she turns near a wall its follow spot can
  // land past the wall for a moment; the picture is kept inside the water below).
  if (c34.swim && !c34.climb && !onPad) water = true;
  else if (!inside || onPad) water = false;
  else if (!water) {
    // 小V standing (bank or pad) with nothing under the dog, or the dog reaching the water from above.
    water = c34.swim || c34.climb || player.onGround || a.y >= surface - P.enterAbove;
  } else if (!c34.swim && !player.onGround && a.y < surface - P.leaveAbove) water = false;
  const was = c34Dog.water;
  c34Dog.water = water;
  if (water && !was) c34Dog.strokeStart = dogNowMs();
  // Vertical position of the dog's feet, eased so it never jumps up or down in one frame.
  const target = water ? surface + c34DogFeetBelowSurface('run1') : a.y;
  if (c34Dog.y == null) c34Dog.y = target;
  c34Dog.y += Math.max(-P.maxStep, Math.min(P.maxStep, (target - c34Dog.y) * P.ease));
  if (Math.abs(target - c34Dog.y) < 0.5) c34Dog.y = target;
  c34Dog.rising = !water && c34Dog.y > a.y + 4;
  // Horizontal: the dog keeps its follow spot, but its whole picture stays in open water — never in
  // the pool walls and never overlapping the floating pad (it paddles right beside it).
  if (!water) { c34Dog.x = null; return; }
  const k = DOG_ART.scale, S = DOG_ART_SRC.run1, frontPx = (448 - S.collarX) * k, backPx = S.collarX * k;
  const right = a.right, leftExt = right ? backPx : frontPx, rightExt = right ? frontPx : backPx;
  let x = a.x;
  if (pad) {
    if (a.x < pad.x + pad.w / 2) x = Math.min(x, pad.x - rightExt - P.padGap);
    else x = Math.max(x, pad.x + pad.w + leftExt + P.padGap);
  }
  x = Math.max(pool.x + leftExt + P.wallGap, Math.min(pool.x + pool.w - rightExt - P.wallGap, x));
  c34Dog.x = (c34Dog.x == null || !was) ? x : c34Dog.x + (x - c34Dog.x) * P.easeX;
}

// Feet below the surface for a frame so that its nose sits waterlineBelowNose source px above the water.
function c34DogFeetBelowSurface(key) {
  const S = DOG_ART_SRC[key];
  return (S.feetY - S.noseY - C34_DOG_WATER.waterlineBelowNose) * DOG_ART.scale;
}

function c34DogSwimFrame() {
  const still = Math.abs(player.vx || 0) <= 0.35;   // same paddling threshold as 小V's swim ripples
  const ms = still ? C34_DOG_WATER.strokeStillMs : C34_DOG_WATER.strokeMs;
  if (c34Dog.lastStill !== still) {   // keep the current stroke when the speed changes
    const now = dogNowMs(), prevMs = still ? C34_DOG_WATER.strokeMs : C34_DOG_WATER.strokeStillMs;
    const phase = ((now - c34Dog.strokeStart) / prevMs) % 4;
    c34Dog.strokeStart = now - phase * ms;
    c34Dog.lastStill = still;
  }
  const idx = Math.floor((dogNowMs() - c34Dog.strokeStart) / ms) % 4;
  return { key: 'run' + (idx + 1), state: 'swim', frame: idx + 1 };
}

// Draw the swimming dog: dry part as usual, submerged part tinted and faded like 小V's swimmer.
function c34DrawSwimmingDog(cx) {
  const pose = c34DogSwimFrame();
  const img = getDogArtImg(pose.key), S = DOG_ART_SRC[pose.key], k = DOG_ART.scale;
  if (!img || !S) return false;
  const P = C34_DOG_WATER;
  const right = player.facingRight !== false, dir = right ? 1 : -1;
  const surface = c34Dog.y - c34DogFeetBelowSurface('run1');   // eased waterline
  const bob = Math.sin(dogNowMs() / P.bobMs) * P.bobPx;
  // Nose stays waterlineBelowNose source px above the waterline: feet = surface + (feetY - noseY - waterline) * k.
  const sx = c34Dog.x - cx, sy = surface + c34DogFeetBelowSurface(pose.key) + bob;
  const w = img.naturalWidth * k, h = img.naturalHeight * k;
  const left = sx - (right ? S.collarX * k : w - S.collarX * k), top = sy - S.feetY * k;
  const drawAt = (g, ox, oy) => {
    g.save();
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.translate(ox, oy);
    if (!right) g.scale(-1, 1);
    g.drawImage(img, -S.collarX * k, -S.feetY * k, w, h);
    g.restore();
  };
  // 1) Above the surface: normal colours.
  ctx.save();
  ctx.beginPath(); ctx.rect(left - 2, top - 2, w + 4, Math.max(0, surface - top + 2)); ctx.clip();
  drawAt(ctx, sx, sy);
  ctx.restore();
  // 2) Below the surface: same tint and fading as the hero's submerged layer.
  const depth = Math.ceil(top + h - surface) + 1;
  if (depth > 0) {
    const width = Math.ceil(w) + 4;
    if (c34DogLayer.width !== width) c34DogLayer.width = width;
    if (c34DogLayer.height !== depth) c34DogLayer.height = depth;
    const g = c34DogLayer.getContext('2d');
    g.clearRect(0, 0, width, depth);
    drawAt(g, sx - (left - 2), sy - surface);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = P.tint; g.fillRect(0, 0, width, depth);
    const mask = g.createLinearGradient(0, 0, 0, depth);
    mask.addColorStop(0, P.fadeTop); mask.addColorStop(1, 'transparent');
    g.globalCompositeOperation = 'destination-in';
    g.fillStyle = mask; g.fillRect(0, 0, width, depth);
    g.globalCompositeOperation = 'source-over';
    ctx.drawImage(c34DogLayer, left - 2, surface);
  }
  // Treasure nose (unchanged rule; only drawn where the nose really is).
  const nx = sx + dir * (S.noseX - S.collarX) * k, ny = sy + (S.noseY - S.feetY) * k;
  const headTopY = sy + ((DOG_ART_HEAD_TOP[pose.key] != null ? DOG_ART_HEAD_TOP[pose.key] : S.noseY - 120) - S.feetY) * k;
  drawDogNoseGlow(nx, ny, headTopY, k);
  dogLastDraw = { mode: 'sprite', pose: pose.key, state: 'swim', x: Math.round(sx), y: Math.round(sy), w: Math.round(w), h: Math.round(h),
    noseX: Math.round(nx), noseY: Math.round(ny), surface: Math.round(surface), facingRight: right,
    noseAboveSurface: Math.round((surface - ny) * 10) / 10, submergedPx: Math.round(sy - surface) };
  return true;
}

(function installC34DogWater() {
  const wrap = (name, make) => { const o = globalThis[name]; if (typeof o !== 'function' || o._c34dog) return; const w = make(o); w._c34dog = true; globalThis[name] = w; };
  wrap('c34Step', o => function () { const r = o.apply(this, arguments); try { c34DogWaterStep(); } catch (e) { console.warn('[3-4 dog water]', e); } return r; });
  wrap('c34ResetWater', o => function () { c34DogReset(); return o.apply(this, arguments); });
  wrap('getDogPoseKey', o => function () {
    if (c34Is() && bringBalloonDog && c34Dog.water) return c34DogSwimFrame();
    // Rising out of the water, or following 小V while she climbs onto the pad or the bank: the existing
    // jump-up frame (the dog is not falling).
    if (c34Is() && bringBalloonDog && (c34Dog.rising || c34.climb)) { dogWasRunning = false; return { key: getDogFrameKey(DOG_ART.jumpFrame), state: 'jump' }; }
    return o.apply(this, arguments);
  });
  wrap('drawCompanionDog', o => function (cx) {
    if (!c34Is() || !bringBalloonDog || c34Dog.y == null || getDogArtMode() !== 'sprite') return o.apply(this, arguments);
    if (c34Dog.water) { if (c34DrawSwimmingDog(cx)) return; return o.apply(this, arguments); }
    const dy = c34Dog.y - getDogWorldAnchor().y;   // easing back up to 小V's feet after leaving the water
    if (Math.abs(dy) < 0.5) return o.apply(this, arguments);
    ctx.save(); ctx.translate(0, dy);
    try { return o.apply(this, arguments); } finally { ctx.restore(); if (dogLastDraw && dogLastDraw.y != null) { dogLastDraw.y = Math.round(dogLastDraw.y + dy); dogLastDraw.easeDy = Math.round(dy); } }
  });
  window.debugC34Dog = () => Object.assign({}, c34Dog, { draw: dogLastDraw, params: C34_DOG_WATER });
})();

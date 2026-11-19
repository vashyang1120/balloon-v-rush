'use strict';

const C34_TEACHING = {
  c34_canyon_arrival: { face: 'balloonv_confused', text: '哇！好大的峽谷...我要怎麼飛到對面去呢？' },
  c34_canyon_umbrella: { face: 'balloonv_confused', text: '咦...還是飛得不夠高...如果加上氣球雨傘的輔助呢？' },
  c34_first_wet: { face: 'balloonv_surprised', text: '啊！！我全身都溼了...身體變好重好難動...' },
  c34_first_dry_wind: { face: 'balloonv_happy', text: '哇！這裡的風讓我身體乾了一些！！' },
};

function c34JumpSpeed(base, heightRatio) {
  return GRAVITY / 2 + (base - GRAVITY / 2) * Math.sqrt(heightRatio);
}

function c34Motion() {
  if (!c34Is() || !c34.wet && !c34.swim) return { move: 1, height: 1, swim: false };
  if (!c34.swim) return { move: C34.water.wetSpeed, height: C34.water.wetHeight, swim: false };
  if (!inp('jump')) c34.jumpReleased = true;
  return { move: C34.water.swimSpeed, height: C34.water.swimHeight, swim: true, canJump: c34.jumpReleased };
}

function c34LeaveSurface() {
  c34.swim = false;
  c34.jumpReleased = false;
}

function c34ResetWater() {
  Object.assign(c34, { camY: 0, level: 0, fillFrames: 0, stream: 'none', _filling: false,
    swim: false, swimTime: 0, wet: 0, inWind: false, waterTick: 0, ripples: [], rippleAt: 0, jumpReleased: true });
}

function c34PlatformSurface(p, x = player.x + player.w / 2) {
  if (!p.c34Pad) return p.y;
  const angle = p.c34Angle || 0;
  const offset = Math.max(-p.w / 2, Math.min(p.w / 2, x - p.x - p.w / 2));
  return p.y + Math.tan(angle) * offset;
}

function c34Bottom() {
  return GROUND_Y + 150;
}

function c34DrawTerrain(cx) {
  const pool = c34Pool();
  if (pool) c34Art.poolFoundation(pool.x - cx, pool.w, pool.baseY,
    C34_LAY.y(C34_LAY.bank.h), pool.baseY + C34.pool.floor);
  const gaps = [];
  for (const gap of groundGaps.slice().sort((a, b) => a.x - b.x)) {
    const prev = gaps[gaps.length - 1], end = gap.x + gap.w;
    if (prev && gap.x <= prev.end + 1) prev.end = Math.max(prev.end, end);
    else gaps.push({ x: gap.x, end });
  }
  let start = -60;
  for (const gap of gaps) {
    if (gap.x > start) c34Art.terrain(start - cx, gap.x - cx, GROUND_Y, start > -60, true, c34Bottom());
    start = gap.end;
  }
  c34Art.terrain(start - cx, LEVEL_LENGTH + 60 - cx, GROUND_Y, true, false, c34Bottom());
  for (const mesa of platforms.filter(p => p.c34Mesa || p.c34Id === 'P3')) {
    c34Art.terrain(mesa.x - cx, mesa.x + mesa.w - cx, mesa.y, true, mesa.c34Id !== 'BANK', c34Bottom(), mesa.c34Id === 'P3');
  }
}

function c34DebugArtRow(_seq, x, top, bottom) {
  c34Art.terrain(x, x + 540, top, true, true, bottom);
  return x + 540;
}

function c34Falls() {
  return c34Lv()?.c34Falls || [];
}

function c34FallBase(f) {
  return f.baseY ?? GROUND_Y;
}

function c34FallTop() {
  return -C34.cam.max - 20;
}

function c34UnderFall(f) {
  return Math.abs(player.x + player.w / 2 - f.x) <= f.w / 2 + Math.min(12, player.w / 2) &&
    player.y < c34FallBase(f) && player.y + player.h > c34FallTop();
}

// Canopy bounds recorded in each existing umbrella sprite's source pixels.
// [outer left, outer right, crown top, skirt edge], before the hero transform.
const C34_UMBRELLA_CANOPY = {
  idle: [432, 1026, 24, 300], jump: [568, 1118, 20, 296], fall: [390, 865, 120, 380],
  hurt: [550, 1095, 32, 375], block: [835, 1114, 305, 575],
  run1: [602, 1158, 18, 309], run2: [606, 1179, 18, 311], run3: [592, 1187, 19, 334],
  run4: [587, 1190, 23, 347], run5: [618, 1213, 13, 331],
};

function c34FallCanopy(f) {
  if (!umbEquipped() || c34.swim) return null;
  const key = c2UmbArtKey();
  if (!c2UmbArtReady(key)) return null;
  const frame = UMBRELLA_ART.frames[key], pose = c2UmbPoseOf(key);
  const [left, right, crown, edge] = C34_UMBRELLA_CANOPY[key];
  const k = c2UmbFrameScale(pose);
  const sign = player.facingRight ? 1 : -1;
  const originX = Math.round(player.x + player.w / 2 + c2BlockFxHeroDx()) + sign * (pose.dx || 0);
  const originY = player.y + player.h + frame.feet + (pose.dy || 0) + c2HoverBobY();
  const toX = u => originX + sign * (u - frame.ax) * k;
  const toY = v => originY + (v - frame.gy) * k;
  const x0 = Math.min(toX(left), toX(right)), x1 = Math.max(toX(left), toX(right));
  const reach0 = Math.max(x0, f.x - f.w / 2), reach1 = Math.min(x1, f.x + f.w / 2);
  if (reach1 <= reach0) return null;
  const x = Math.max(reach0, Math.min(reach1, f.x));
  const u = Math.abs(2 * (x - x0) / (x1 - x0) - 1);
  const y = toY(edge - Math.sqrt(1 - u * u) * (edge - crown));
  if (y > c34FallBase(f) || y < c34FallTop()) return null;
  const direction = f.split ? 'split' : (sign > 0 ? 'right' : 'left');
  return { x, y, direction, outX: f.split ? x : (sign > 0 ? x1 : x0), outY: f.split ? y : toY(edge) };
}

function c34FallDeflect(f) {
  return c34FallCanopy(f)?.direction ?? null;
}

function c34ArcLand(f, dir, surface, canopy) {
  const t = (f.vy + Math.sqrt(Math.max(0, f.vy * f.vy + surface - canopy.outY))) / 0.5;
  return canopy.outX + dir * f.vx * t;
}

function c34FallImpact(f, direction, canopy = c34FallCanopy(f)) {
  const dir = direction === 'right' ? 1 : -1, pool = c34Pool();
  if (!canopy) return { x: f.x, y: c34FallBase(f), fills: false };
  if (pool && direction !== 'split') {
    const y = c34SurfaceY(), x = c34ArcLand(f, dir, y, canopy);
    if (x > pool.x + 4 && x < pool.x + pool.w - 4) return { x, y, fills: true };
  }
  const y = c34FallBase(f);
  return { x: c34ArcLand(f, dir, y, canopy), y, fills: false };
}

function c34DrawFall(f, cx) {
  const x = f.x - cx;
  if (x < -160 || x > CANVAS_W + 160) return;
  const time = c34.waterTick * 1000 / 60;
  const canopy = c34FallCanopy(f);
  const end = canopy?.y ?? c34FallBase(f);
  c34Art.column(x, c34FallTop(), end, f.w, time);
  if (canopy) {
    const hit = c34FallImpact(f, canopy.direction, canopy);
    c34Art.guide(canopy.direction, canopy.x - cx, canopy.y, canopy.outX - cx, canopy.outY, hit.x - cx, hit.y, time);
    if (canopy.direction !== 'split') c34Art.at('03_waterfall_splash', time, hit.x - cx, hit.y, 0.041);
  } else {
    c34Art.at('03_waterfall_splash', time, x, end, 0.047);
    if (c34UnderFall(f)) c34Art.at('03_waterfall_splash', time, x, player.y + player.h * 0.35, 0.012);
  }
}

function c34DrawPool(cx) {
  const pool = c34Pool();
  if (!pool || pool.x - cx > CANVAS_W + 160 || pool.x + pool.w - cx < -160) return;
  const x = pool.x - cx, y = c34SurfaceY(), floor = pool.baseY + C34.pool.floor;
  const time = c34.waterTick * 1000 / 60;
  c34Art.poolWater(x, pool.w, y, floor, time);
  c34Art.poolWalls(x, pool.w, pool.baseY, C34_LAY.y(C34_LAY.bank.h), floor);
  const ledge = platforms.find(p => p.c34Escape);
  if (ledge) c34Art.tile('15_pool_bottom', ledge.x - cx, ledge.y, ledge.w, 14, 0.16, false);
  const pad = platforms.find(p => p.c34Pad);
  if (pad) c34Art.platform(pad, cx);
}

function c34DrawRipples(cx) {
  const pool = c34Pool();
  if (!pool) return;
  const x = pool.x - cx, y = c34SurfaceY();
  c34Art.clip(x, y - 12, pool.w, 25, () => {
    for (const ripple of c34.ripples) {
      const progress = (c34.waterTick - ripple.start) / C34.water.rippleSteps;
      ctx.save(); ctx.globalAlpha *= (1 - progress) * 0.7;
      c34Art.at('07_water_ripple', 0, ripple.x - cx, y, ripple.scale + progress * 0.027);
      ctx.restore();
    }
  });
}

function c34SwimPose(cx) {
  return c34Art.swimPose(player.x + player.w / 2 - cx, c34SurfaceY(), c34.swimTime, player.facingRight);
}

function c34DrawWetStatus(cx) {
  if (!c34Is() || c34.wet <= 0) return;
  const head = c34.swim ? c34SwimPose(cx).headTop : c34Art.landPose().top;
  c34Art.drop(player.x + player.w / 2 - cx, head - 5, c34.wet / C34.water.steps);
}

function c34Ripple(x, interval = 14, scale = 0.018) {
  if (c34.waterTick < c34.rippleAt) return;
  c34.rippleAt = c34.waterTick + interval;
  c34.ripples.push({ start: c34.waterTick, x, scale });
}

function c34StepPad(pad) {
  if (!pad) return;
  const F = C34.float, center = player.x + player.w / 2;
  const onPad = player.x < pad.x + pad.w && player.x + player.w > pad.x &&
    Math.abs(player.y + player.h - c34PlatformSurface(pad)) < 3.5 && player.vy >= 0;
  const sink = pad.c34Sink || 0, wantSink = onPad ? F.sink : 0;
  pad.c34SpringSpeed = ((pad.c34SpringSpeed || 0) + (wantSink - sink) * F.spring) * F.damping;
  pad.c34Sink = sink + pad.c34SpringSpeed;
  const offset = Math.max(-1, Math.min(1, (center - pad.x - pad.w / 2) / (pad.w / 2)));
  const angle = pad.c34Angle || 0;
  pad.c34Angle = angle + ((onPad ? offset * F.maxTilt : 0) - angle) * F.tiltEase;
  pad.y = c34SurfaceY() - C34.pool.padClear + Math.sin(c34.waterTick * Math.PI * 2 / F.period) * F.bob + pad.c34Sink;
  if (onPad) {
    player.y = c34PlatformSurface(pad) - player.h; player.onGround = true;
    if (!pad.c34Occupied) c34Ripple(center);
  }
  const bag = coins.find(coin => coin.c34PadBag && !coin.collected);
  if (bag) {
    bag.x = pad.x + pad.w / 2;
    bag.y = c34PlatformSurface(pad, bag.x) - 32;
  }
  pad.c34Occupied = onPad;
}

function c34StepSwim() {
  const pool = c34Pool(), x = player.x + player.w / 2, feet = player.y + player.h;
  const wasSwimming = c34.swim;
  const inside = pool && x > pool.x && x < pool.x + pool.w;
  const surface = c34SurfaceY();
  c34.swim = !!(inside && !player.onGround && feet >= surface + 8 &&
    (wasSwimming || player.vy >= 0));
  if (c34.swim) {
    player.y = surface + C34.water.feetDepth - player.h;
    player.vy = 0;
    const paddling = Math.abs(player.vx) > 0.35;
    if (!wasSwimming) c34.swimTime = 0;
    c34.swimTime += (paddling ? 1 : 0.7) * 1000 / 60;
    c34Ripple(x + (player.facingRight ? 1 : -1) * (paddling ? 17 : 7), paddling ? 14 : 25, paddling ? 0.018 : 0.012);
  }
}

function c34Teach(id) {
  if (c34.taught.has(id)) return;
  c34.taught.add(id);
  rpgRequest(id, () => c34Is() && gameState === 'playing');
}

function c34StepWet(touching) {
  const wasWet = c34.wet > 0;
  const windLift = c2UmbWindActive() ? c2UmbWindLiftAt : windLiftAt;
  const inWind = windVents.some(v => windLift(v, player) > 0) ||
    (wdActive() && wdFlowAt(player.x + player.w / 2, player.y + player.h / 2) > 0);
  const entering = inWind && !c34.inWind;
  c34.inWind = inWind;
  if (touching) {
    c34.wet = C34.water.steps;
    if (!wasWet) c34Teach('c34_first_wet');
    return;
  }
  if (c34.wet <= 0) return;
  if (entering) {
    c34.wet = Math.max(0, c34.wet - C34.water.windDry);
    c34L({ ev: 'windDry', wetSeconds: c34.wet / 60 });
    c34Teach('c34_first_dry_wind');
  } else c34.wet--;
}

function c34Step() {
  c34.waterTick++;
  c34.ripples = c34.ripples.filter(r => c34.waterTick - r.start < C34.water.rippleSteps);
  for (const m of c34Mesas()) {
    if (player.x + player.w <= m.x || player.x >= m.x + m.w || player.y + player.h <= m.y + C34.wallTol) continue;
    const fromLeft = player.x + player.w / 2 < m.x + m.w / 2;
    player.x = fromLeft ? m.x - player.w : m.x + m.w; player.vx = 0;
    wd.wdVx = 0;
    if (++c34.wallHits % 30 === 1) c34L({ ev: 'wall', mesa: m.x, side: fromLeft ? 'L' : 'R' });
  }
  let fills = false, touching = false;
  c34.stream = 'none';
  for (const fall of c34Falls()) {
    const canopy = c34FallCanopy(fall);
    if (!canopy) {
      touching ||= c34UnderFall(fall);
      continue;
    }
    c34.stream = canopy.direction;
    fills ||= c34FallImpact(fall, canopy.direction, canopy).fills;
  }
  if (fills && c34.fillFrames < C34.pool.fillFrames) {
    c34.level = ++c34.fillFrames / C34.pool.fillFrames;
    if (c34.fillFrames === 1) showHint('💧 水流進水池了！水位慢慢上升中…', 150);
  }
  if (fills !== c34._filling) {
    c34._filling = fills;
    c34L({ ev: fills ? 'fillOn' : 'fillOff', level: c34.level });
  }
  c34StepPad(platforms.find(p => p.c34Pad));
  c34StepSwim();
  c34StepWet(touching || c34.swim);
  const target = Math.max(0, Math.min(C34.cam.max, C34.cam.top - player.y));
  c34.camY += (target - c34.camY) * C34.cam.ease;
  if (Math.abs(c34.camY) < 0.05) c34.camY = 0;
}

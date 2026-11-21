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
    swim: false, swimTime: 0, climb: null, rescue: { stuck: 0, seen: false, warned: false, flash: 0 }, wet: 0, dryingWindStart: null, waterTick: 0, ripples: [], rippleAt: 0, jumpReleased: true,
    falls: new Map(), poolImpact: null, shower: null });
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

// Upper edge of the sideways balloon cluster measured along the block sprite.
const C34_SIDE_CANOPY = [[835, 395], [861, 315], [891, 295], [930, 312],
  [985, 367], [1033, 437], [1088, 517], [1114, 558]];

function c34UmbrellaTransform(key) {
  const frame = UMBRELLA_ART.frames[key], pose = c2UmbPoseOf(key);
  const k = c2UmbFrameScale(pose);
  const sign = player.facingRight ? 1 : -1;
  const originX = Math.round(player.x + player.w / 2 + c2BlockFxHeroDx()) + sign * (pose.dx || 0);
  const originY = player.y + player.h + frame.feet + (pose.dy || 0) + c2HoverBobY();
  return { k, sign, toX: u => originX + sign * (u - frame.ax) * k, toY: v => originY + (v - frame.gy) * k };
}

function c34DrawShowerUmbrella(cx) {
  const { k, sign, toX, toY } = c34UmbrellaTransform('block');
  // The side canopy and exposed shaft occupy this strip of the existing block sprite.
  const x = 800, y = 292, width = 326, height = 645;
  ctx.save();
  ctx.translate(toX(x) - cx, toY(y));
  ctx.scale(sign, 1);
  ctx.drawImage(umbImgs.block, x, y, width, height, 0, 0, width * k, height * k);
  ctx.restore();
}

function c34FallCanopy(f) {
  if (!umbEquipped() || c34.swim) return null;
  const key = c2UmbArtKey();
  const [left, right, crown, edge] = C34_UMBRELLA_CANOPY[key];
  const { k, sign, toX, toY } = c34UmbrellaTransform(key);
  const x0 = Math.min(toX(left), toX(right)), x1 = Math.max(toX(left), toX(right));
  const reach0 = Math.max(x0, f.x - f.w / 2), reach1 = Math.min(x1, f.x + f.w / 2);
  if (reach1 <= reach0 || !c2UmbArtReady(key)) return null;
  const crownX = (x0 + x1) / 2;
  const direction = sign > 0 ? 'right' : 'left';
  const x = Math.min(reach1, Math.max(reach0, crownX));
  const surfaceAt = atX => {
    if (key === 'block') {
      const sourceX = Math.max(left, Math.min(right, left + (atX - toX(left)) * sign / k));
      const nextIndex = C34_SIDE_CANOPY.findIndex(([x], i) => i > 0 && x >= sourceX);
      const [x0, y0] = C34_SIDE_CANOPY[nextIndex - 1], [x1, y1] = C34_SIDE_CANOPY[nextIndex];
      return toY(y0 + (y1 - y0) * (sourceX - x0) / (x1 - x0));
    }
    const u = Math.min(1, Math.abs(2 * (atX - crownX) / (x1 - x0)));
    return toY(edge - Math.sqrt(1 - u * u) * (edge - crown));
  };
  const y = surfaceAt(x);
  if (y > c34FallBase(f) || y < c34FallTop()) return null;
  return { x, y, direction, left: x0, right: x1, outY: toY(edge), surfaceAt,
    reach0, reach1, width: reach1 - reach0, overlaps: true };
}

function c34ArcLand(f, dir, surface, outX, outY) {
  const t = (f.vy + Math.sqrt(Math.max(0, f.vy * f.vy + surface - outY))) / 0.5;
  return outX + dir * f.vx * t;
}

function c34FallStreams(f, canopy) {
  if (!canopy) return [];
  const pool = c34Pool();
  const sides = ['left', 'right'];
  return sides.map(side => {
    const dir = side === 'right' ? 1 : -1;
    const outX = canopy[side], outY = canopy.outY;
    const base = c34FallBase(f), surface = c34SurfaceY();
    let y = base, x = c34ArcLand(f, dir, base, outX, outY);
    let fills = false;
    if (!f.split && pool && surface >= outY) {
      const poolX = c34ArcLand(f, dir, surface, outX, outY);
      if (poolX > pool.x + 4 && poolX < pool.x + pool.w - 4) {
        const pad = platforms.find(p => p.c34Pad);
        // Land in the open strip between the left wall and the floating pad.
        // A monotone descent to this point also keeps the stream clear of its face.
        x = pad && dir > 0 && outX < pad.x - 44
          ? Math.max(pool.x + C34.pool.inflowMinOffset, Math.min(poolX, pad.x - 44)) : poolX;
        y = surface; fills = true;
      } else if (x >= pool.x && x < pool.x + pool.w) {
        x = dir > 0 ? pool.x + pool.w : pool.x;
        y = Math.max(outY, c34FallBase(f));
      }
    }
    const forward = side === canopy.direction;
    return { side, outX, outY, x, y, fills, width: f.w * (forward ? 1.75 : 0.5), rate: forward ? 1 : 0.1 };
  });
}

function c34ResolveFall(f) {
  const canopy = c34FallCanopy(f);
  const center = player.x + player.w / 2;
  // Ignore the thin spray fringe when testing whether the head takes a direct hit.
  const bodyRadius = Math.min(8, player.w / 2);
  const left = Math.max(f.x - f.w / 2, center - bodyRadius);
  const right = Math.min(f.x + f.w / 2, center + bodyRadius);
  const head = c34Art.landPose().top + 6;
  const sheltered = canopy && right > left && left >= canopy.reach0 && right <= canopy.reach1 &&
    Math.max(canopy.surfaceAt(left), canopy.surfaceAt(right)) <= head;
  return { canopy, streams: c34FallStreams(f, canopy), touching: right > left && !sheltered && c34UnderFall(f) };
}

const C34_IMPACT_FADE_STEPS = 24;

function c34DrawPoolImpact(cx) {
  const impact = c34.poolImpact, pool = c34Pool();
  if (!impact || !pool) return;
  const age = c34.waterTick - impact.tick;
  const opacity = 1 - age / C34_IMPACT_FADE_STEPS;
  const x = impact.x - cx, y = c34SurfaceY();
  const pad = platforms.find(p => p.c34Pad);
  let left = pool.x + 2, right = pool.x + pool.w - 2;
  if (pad) {
    const [padLeft, padRight] = c34Art.platformSpan(pad);
    if (impact.x < padLeft) right = Math.min(right, padLeft - 2);
    else if (impact.x > padRight) left = Math.max(left, padRight + 2);
    else return;
  }
  const scale = 0.047 * impact.width / 36 * (0.72 + 0.18 * opacity);
  const time = (c34.waterTick - impact.start) * 1000 / 60;
  c34Art.clip(left - cx, y - 80, right - left, 96, () => {
    ctx.globalAlpha *= opacity;
    c34Art.at('03_waterfall_splash', time, x, y, scale);
  });
}

function c34DrawFall(f, cx) {
  const x = f.x - cx;
  if (x < -160 || x > CANVAS_W + 160) return;
  const time = c34.waterTick * 1000 / 60;
  const { canopy, streams, touching } = c34.falls?.get(f.id) ?? c34ResolveFall(f);
  const top = c34FallTop(), end = c34FallBase(f);
  const splashScale = 0.047 * f.w / 36;
  const shower = touching && c34HeroWater.shower();
  const columnLeft = x - f.w / 2, columnRight = x + f.w / 2;
  const openColumn = (left, right) => {
    if (right <= left) return;
    c34Art.clip(left, top, right - left, end - top + 16, () => {
      if (shower?.fall === f) c34Art.column(x, top, shower.seam + 16, f.w, time, null, shower.seam);
      else c34Art.column(x, top, end, f.w, time);
    });
  };
  if (canopy) {
    const left = canopy.reach0 - cx, right = canopy.reach1 - cx;
    openColumn(columnLeft, left);
    openColumn(right, columnRight);
    c34Art.clip(left, top, right - left, canopy.outY - top, () =>
      c34Art.column(x, top, canopy.outY, f.w, time, {
        surfaceAt: atX => canopy.surfaceAt(atX + cx),
      }));
    for (const stream of streams) {
      c34Art.guide(canopy, stream, cx, stream.width, time);
      if (!stream.fills) {
        c34Art.at('03_waterfall_splash', time, stream.x - cx, stream.y, splashScale * stream.width / (f.w * 1.75));
      }
    }
  } else openColumn(columnLeft, columnRight);
  if ((!canopy || canopy.width < f.w) && shower?.fall !== f) {
    c34Art.at('03_waterfall_splash', time, x, end, splashScale * (1 - (canopy?.width || 0) / f.w));
  }
  if (touching && shower?.fall !== f) c34Art.at('03_waterfall_splash', time, x, player.y + player.h * 0.35, 0.012);
}

function c34DrawPool(cx) {
  const pool = c34Pool();
  if (!pool || pool.x - cx > CANVAS_W + 160 || pool.x + pool.w - cx < -160) return;
  const x = pool.x - cx, y = c34SurfaceY(), floor = pool.baseY + C34.pool.floor;
  const time = c34.waterTick * 1000 / 60;
  c34Art.poolWater(x, pool.w, y, floor, time);
  c34Art.poolWalls(x, pool.w, pool.baseY, C34_LAY.y(C34_LAY.bank.h), floor);
  const pad = platforms.find(p => p.c34Pad);
  if (pad) c34Art.platform(pad, cx);
}

function c34DrawRipples(cx) {
  const flash = c34.rescue?.flash || 0;
  if (flash) {
    const radius = 10 + (1 - flash / 30) * 25;
    for (let i = 0; i < 5; i++) {
      const angle = i * Math.PI * 2 / 5;
      drawDogSparkle(player.x + player.w / 2 - cx + Math.cos(angle) * radius,
        player.y + player.h / 2 + Math.sin(angle) * radius, 5, angle, flash / 30);
    }
  }
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
  return c34Art.swimPose(player.x + player.w / 2 - cx, c34SurfaceY(), c34.swimTime,
    player.facingRight, c34.waterTick * 1000 / 60);
}

function c34DrawWetStatus(cx) {
  if (!c34Is() || c34.wet <= 0) return;
  const shower = c34HeroWater.shower();
  const head = c34.swim ? c34SwimPose(cx).headTop
    : shower ? shower.feet - 490 * shower.factor : c34Art.landPose().top;
  c34Art.drop(player.x + player.w / 2 - cx, head - 5, c34.wet / C34.water.steps);
}

function c34Ripple(x, interval = 14, scale = 0.018) {
  if (c34.waterTick < c34.rippleAt) return;
  c34.rippleAt = c34.waterTick + interval;
  c34.ripples.push({ start: c34.waterTick, x, scale });
}

function c34ResolvePadContact(pad, previousX, previousFeet) {
  const right = pad.x + pad.w;
  if (player.x >= right || player.x + player.w <= pad.x) return;
  const top = c34PlatformSurface(pad);
  const feet = player.y + player.h;
  if (player.vy >= 0 && previousFeet <= top + 2 && feet >= top) {
    player.y = top - player.h;
    player.vy = 0;
    player.onGround = true;
    return;
  }
  const bottom = top + pad.h;
  if (feet <= top || player.y >= bottom) return;
  if (player.vy < 0 && previousFeet - player.h >= bottom) {
    player.y = bottom;
    player.vy = 0;
    return;
  }
  const cameFromLeft = previousX + player.w <= pad.x;
  const cameFromRight = previousX >= right;
  if (cameFromLeft || cameFromRight || c34.swim) {
    const left = cameFromLeft || (!cameFromRight && player.x + player.w / 2 < pad.x + pad.w / 2);
    player.x = left ? pad.x - player.w : right;
    player.vx = 0;
  }
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

function c34CanClimbLeft() {
  const pool = c34Pool();
  if (!pool) return false;
  const speed = c34JumpSpeed(JUMP_FORCE, C34.water.swimHeight) - GRAVITY / 2;
  const jumpRise = speed * speed / (2 * GRAVITY);
  return c34SurfaceY() + C34.water.feetDepth - pool.baseY <= jumpRise + 12;
}

function c34AdvanceClimb() {
  const pool = c34Pool();
  if (!pool) return false;
  if (!c34.climb) {
    if (!c34.swim) return false;
    const pad = platforms.find(p => p.c34Pad);
    const fromLeft = pad && inp('right') && Math.abs(player.x + player.w - pad.x) <= 2;
    const fromRight = pad && inp('left') && Math.abs(player.x - (pad.x + pad.w)) <= 2;
    // A low-water landing that still strands the player must go through rescue.
    if ((fromLeft || fromRight) && c34CanReturnLeft(pad)) {
      const edge = fromLeft ? pad.x : pad.x + pad.w;
      c34.climb = { pad, edge, top: c34PlatformSurface(pad, edge), tick: 0, facingRight: !!fromLeft };
    } else {
      if (!c34.jumpReleased || !inp('jump') || !inp('left') ||
          player.x > pool.x + 12 || !c34CanClimbLeft()) return false;
      c34.climb = { edge: pool.x, top: pool.baseY, tick: 0, facingRight: false };
    }
    c34.climb.reachOffset = Math.max(0, c34SurfaceY() - c34.climb.top - 8);
    player.facingRight = c34.climb.facingRight;
    player.vx = player.vy = 0;
    c34LeaveSurface();
  }
  if (++c34.climb.tick >= Math.ceil(6 * 110 * 60 / 1000)) {
    const { pad, edge, facingRight } = c34.climb;
    player.x = facingRight ? edge + 8 : edge - player.w - 8;
    const top = pad ? c34PlatformSurface(pad) : pool.baseY;
    player.y = top - player.h;
    player.onGround = true;
    c34.climb = null;
  }
  return true;
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
    c34.swimTime = wasSwimming ? c34.swimTime + 1000 / 60 : 0;
    c34Ripple(x + (player.facingRight ? 1 : -1) * (paddling ? 17 : 7), paddling ? 14 : 25, paddling ? 0.018 : 0.012);
  }
}

function c34CanReturnLeft(pad) {
  if (c34CanClimbLeft()) return true;
  const pool = c34Pool();
  if (!pool || !pad) return false;
  const swimSpeed = c34JumpSpeed(JUMP_FORCE, C34.water.swimHeight) - GRAVITY / 2;
  const padTop = c34PlatformSurface(pad, pad.x);
  if (c34SurfaceY() + C34.water.feetDepth - padTop > swimSpeed ** 2 / (2 * GRAVITY)) return false;
  const takeoff = c34JumpSpeed(JUMP_FORCE, C34.water.wetHeight) - GRAVITY / 2;
  const clearance = takeoff ** 2 - 2 * GRAVITY * (padTop - pool.baseY);
  if (clearance < 0) return false;
  const span = PLAYER_SPEED * C34.water.wetSpeed * (takeoff + Math.sqrt(clearance)) / GRAVITY;
  return pad.x - pool.x - player.w / 2 <= span;
}

function c34StepRescue(pad) {
  const pool = c34Pool(), rescue = c34.rescue;
  if (!pool || !rescue) return;
  rescue.flash = Math.max(0, rescue.flash - 1);
  const canReturn = c34CanReturnLeft(pad);
  rescue.stuck = c34.swim && !canReturn ? rescue.stuck + 1 : 0;
  const spirit = 'star_spirit_normal';
  if (rescue.stuck >= 24) {
    const returnToBank = () => {
      player.x = pool.x - player.w - 72;
      player.y = pool.baseY - player.h;
      player.vx = player.vy = 0;
      player.onGround = true;
      cameraX = Math.max(0, Math.min(LEVEL_LENGTH - CANVAS_W, player.x - 380));
      c34LeaveSurface();
      rescue.seen = true;
      rescue.stuck = 0;
      rescue.flash = 30;
      c34L({ ev: 'poolRescue' });
    };
    if (rescue.seen) returnToBank();
    else if (rpgAssetState('balloonv_panic') === 'loaded' && rpgAssetState(spirit) === 'loaded') {
      rpgOpen({ id: 'c34_pool_rescue', title: '水池救援', left: 'balloonv_panic', requirePages: true, pages: [
        { sp: 'balloonv', face: 'balloonv_panic', text: '糟糕！爬不上去了……怎麼辦？' },
        { sp: 'spirit', face: spirit, text: '別擔心！我帶你回岸上！' },
      ], onEnd: how => { if (how === 'finished' && c34.rescue === rescue) returnToBank(); } });
    }
    return;
  }

  const feet = player.y + player.h;
  const edge = pool.x - (player.x + player.w);
  if (rescue.seen && !rescue.warned && !canReturn && player.onGround && feet === pool.baseY &&
      edge >= 0 && edge <= 30 && inp('right') && player.vx > 0) {
    rescue.warned = rpgOpen({ id: 'c34_pool_warning', title: '水池提醒', right: spirit, pages: [
      { sp: 'spirit', face: spirit, text: '小V，小心！現在水位還太低，掉下去就爬不上來囉！' },
    ] });
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
  if (touching) {
    c34.dryingWindStart = null;
    c34.wet = C34.water.steps;
    if (!wasWet && !c34.rescue?.stuck) c34Teach('c34_first_wet');
    return;
  }
  if (!wasWet) return;

  const rate = inWind ? C34.water.windDryRate : 1;
  c34.wet = Math.max(0, c34.wet - rate);
  if (!inWind || c34.wet === 0) {
    c34.dryingWindStart = null;
  } else if (c34.dryingWindStart === null) {
    c34.dryingWindStart = c34.waterTick;
    c34Teach('c34_first_dry_wind');
  }
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
  let fillRate = 0, showerFall = null;
  // Advance the umbrella pose before resolving water so draw and wetness use the same frame.
  if (umbEquipped() && player.onGround && Math.abs(player.vx) > 0.5 && !player.c2Block) c2Umb.runStep++;
  else c2Umb.runStep = 0;
  c34.stream = 'none';
  c34.falls ??= new Map();
  let poolImpact = null;
  for (const fall of c34Falls()) {
    const interaction = c34ResolveFall(fall);
    c34.falls.set(fall.id, interaction);
    if (interaction.touching) showerFall ??= fall;
    if (interaction.canopy) c34.stream = interaction.canopy.direction;
    const inflow = interaction.streams.find(stream => stream.fills);
    if (inflow) fillRate += inflow.rate;
    if (inflow && interaction.canopy?.overlaps) {
      poolImpact = { x: inflow.x, width: inflow.width / 1.75, tick: c34.waterTick,
        start: c34.poolImpact?.start ?? c34.waterTick };
    }
  }
  if (poolImpact || (c34.poolImpact && c34.waterTick - c34.poolImpact.tick >= C34_IMPACT_FADE_STEPS)) {
    c34.poolImpact = poolImpact;
  }
  const fills = fillRate > 0;
  if (fills && c34.fillFrames < C34.pool.fillFrames) {
    const first = c34.fillFrames === 0;
    c34.fillFrames = Math.min(C34.pool.fillFrames, c34.fillFrames + fillRate);
    c34.level = c34.fillFrames / C34.pool.fillFrames;
    if (first) showHint('💧 水流進水池了！水位慢慢上升中…', 150);
  }
  if (fills !== c34._filling) {
    c34._filling = fills;
    c34L({ ev: fills ? 'fillOn' : 'fillOff', level: c34.level });
  }
  const pad = platforms.find(p => p.c34Pad);
  c34StepPad(pad);
  c34StepSwim();
  c34StepRescue(pad);
  if (!showerFall || c34.swim) c34.shower = null;
  else if (c34.shower?.fall !== showerFall) {
    c34.shower = { fall: showerFall, tick: c34.waterTick, mirror: !player.facingRight };
  }
  c34StepWet(!!showerFall || c34.swim);
  const target = Math.max(0, Math.min(C34.cam.max, C34.cam.top - player.y));
  c34.camY += (target - c34.camY) * C34.cam.ease;
  if (Math.abs(c34.camY) < 0.05) c34.camY = 0;
}

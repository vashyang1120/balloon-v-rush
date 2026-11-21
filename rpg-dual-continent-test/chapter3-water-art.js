'use strict';

const c34Art = (() => {
  const catalog = chapter3ArtCatalog;
  const images = new Map();
  const failures = new Set();
  const pathPrefix = 'rpg-dual-continent-test/chapter3-art/';
  const scale = 0.23;
  const waterSurfaceFrames = new WeakMap();
  const fadedRockEdges = new Map();
  const swimmerLayer = document.createElement('canvas');

  // Visible head widths measured in the approved art, excluding the transparent canvas.
  const landHead = { width: 153, top: 14 };
  const waterHead = { width: 490, top: 125 };
  const palmWaterline = 754;

  function entries(backgroundOnly) {
    return Object.entries(catalog).filter(([id]) => id.startsWith('16_') === backgroundOnly)
      .flatMap(([id, spec]) => spec.files.map(file => ({
        path: pathPrefix + file, type: 'image', critical: true, label: 'chapter3:' + file,
        apply(img) { images.set(file, img); failures.delete(file); },
        fail() { failures.add(file); },
      })));
  }

  function image(id, time = 0) {
    const spec = catalog[id];
    const frame = spec.ms ? Math.floor(time / spec.ms) % spec.files.length : 0;
    return images.get(spec.files[frame]);
  }

  function at(id, time, x, y, factor, mirror = false) {
    const im = image(id, time);
    if (!im) return;
    const spec = catalog[id], [ax, ay] = spec.anchor, [w, h] = spec.size;
    ctx.save();
    ctx.translate(x, y);
    if (mirror) ctx.scale(-1, 1);
    ctx.drawImage(im, -ax * factor, -ay * factor, w * factor, h * factor);
    ctx.restore();
  }

  function clip(x, y, w, h, draw) {
    if (w <= 0 || h <= 0) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    try { draw(); } finally { ctx.restore(); }
  }

  function tile(id, x, y, w, h, factor, repeatY = true, source = null) {
    const im = source || image(id);
    if (!im || w <= 0 || h <= 0 || x >= CANVAS_W || x + w <= 0) return;
    const [iw, ih] = catalog[id].size;
    const tw = iw * factor, th = ih * factor;
    clip(x, y, w, h, () => {
      const start = x + Math.max(0, Math.floor(-x / tw)) * tw;
      for (let dx = start; dx < Math.min(CANVAS_W, x + w); dx += tw) {
        for (let dy = y; dy < y + h; dy += th) {
          ctx.drawImage(im, dx, dy, tw + 0.5, th + 0.5);
          if (!repeatY) break;
        }
      }
    });
  }

  // Use a common world origin so overlapping foundations and banks share the same texture phase.
  function rockBody(x, y, w, h) {
    const im = image('12_rock_body');
    if (!im || w <= 0 || h <= 0) return;
    const step = Math.round(im.naturalWidth * scale);
    const left = -Math.round(cameraX);
    const top = GROUND_Y;
    const col = Math.floor((Math.max(x, 0) - left) / step);
    const row = Math.floor((y - top) / step);
    clip(x, y, w, h, () => {
      for (let i = col; left + i * step < Math.min(CANVAS_W, x + w); i++) {
        for (let j = row; top + j * step < y + h; j++) {
          const sx = i % 2 ? -1 : 1, sy = j % 2 ? -1 : 1;
          ctx.save();
          ctx.translate(left + i * step + (sx < 0 ? step : 0), top + j * step + (sy < 0 ? step : 0));
          ctx.scale(sx, sy);
          ctx.drawImage(im, 0, 0, step, step);
          ctx.restore();
        }
      }
    });
  }

  function softEdge(id, innerRight, feather) {
    if (fadedRockEdges.has(id)) return fadedRockEdges.get(id);
    const im = image(id);
    if (!im) return null;
    const layer = document.createElement('canvas');
    layer.width = im.naturalWidth;
    layer.height = im.naturalHeight;
    const g = layer.getContext('2d');
    g.drawImage(im, 0, 0);
    const start = innerRight ? layer.width - feather : feather;
    const end = innerRight ? layer.width : 0;
    const mask = g.createLinearGradient(start, 0, end, 0);
    mask.addColorStop(0, '#000');
    mask.addColorStop(1, 'rgba(0,0,0,0.45)');
    g.globalCompositeOperation = 'destination-in';
    g.fillStyle = mask;
    g.fillRect(0, 0, layer.width, layer.height);
    fadedRockEdges.set(id, layer);
    return layer;
  }

  function background(cam) {
    if (!image('16_canyon_background') || !image('16_canyon_foreground')) return false;
    const layers = [['16_canyon_background', CHAPTER3_BG.far.parallax, 0.32],
      ['16_canyon_foreground', CHAPTER3_BG.near.parallax, 0.63]];
    for (const [id, parallax, vertical] of layers) {
      const im = image(id);
      const [w, h] = catalog[id].size;
      const worldLeft = Math.max(0, cameraX) * parallax;
      const first = Math.floor(worldLeft / w);
      const y = CANVAS_H - (1 - vertical) * cam - h;
      for (let i = first; i * w - worldLeft < CANVAS_W; i++) {
        const x = i * w - worldLeft;
        ctx.save();
        ctx.translate(x + (i % 2 ? w : 0), y);
        // The approved edges do not tile. Reflection joins each edge to itself.
        if (i % 2) ctx.scale(-1, 1);
        ctx.drawImage(im, 0, 0, w + 0.5, h);
        ctx.restore();
      }
    }
    return true;
  }

  function grass(x, right, y, hasL, hasR) {
    const width = right - x;
    const factor = Math.min(0.095, width / 4080);
    const left = catalog['11_grass_left'], mid = catalog['11_grass_middle'], end = catalog['11_grass_right'];
    const a = hasL ? left.size[0] * factor : 0, b = hasR ? end.size[0] * factor : 0;
    const overlap = mid.recommended_overlap_px * factor;
    const step = mid.size[0] * factor - overlap;
    clip(x, y - 32, width, 100, () => {
      const origin = x + a - (hasL ? overlap : 0);
      const start = origin + Math.max(0, Math.floor(-origin / step)) * step;
      for (let dx = start; dx < Math.min(CANVAS_W, right - b + overlap); dx += step) at('11_grass_middle', 0, dx, y, factor);
      if (hasL) at('11_grass_left', 0, x, y, factor);
      if (hasR) at('11_grass_right', 0, right - b, y, factor);
    });
  }

  function terrain(x, right, top, hasL, hasR, bottom, pillar = false) {
    if (!image('12_rock_body') || x > CANVAS_W + 35 || right < -35 || bottom <= top) return;
    const w = right - x;
    if (pillar) {
      const spec = catalog['14_canyon_pillar'];
      const factor = w / 540;
      const width = spec.size[0] * factor;
      const height = (spec.size[1] - spec.anchor[1]) * factor;
      clip(x - 35, top - 10, w + 70, bottom - top + 10, () => {
        at('14_canyon_pillar', 0, x + w / 2, top, factor);
        if (bottom <= top + height) return;
        // Extend from the pillar's own bottom contour so it retains both outer silhouettes.
        ctx.save();
        ctx.translate(0, 2 * (top + height));
        ctx.scale(1, -1);
        at('14_canyon_pillar', 0, x + w / 2, top, factor);
        ctx.restore();
      });
      grass(x + (width - w) * 0.1, right - (width - w) * 0.1, top, true, true);
      return;
    }
    const factor = Math.min(scale, w / 1024);
    const edgeW = 682 * factor, overlap = catalog['13_rock_edge_left'].suggested_inner_overlap_px * factor;
    const leftInset = hasL ? edgeW * 0.63 : 0, rightInset = hasR ? edgeW * 0.63 : 0;
    const left = x + leftInset, end = right - rightInset;
    rockBody(left, top, end - left, bottom - top);
    if (hasL) tile('13_rock_edge_left', left - edgeW + overlap, top, edgeW, bottom - top, factor, true,
      softEdge('13_rock_edge_left', true, catalog['13_rock_edge_left'].suggested_inner_overlap_px));
    if (hasR) tile('13_rock_edge_right', end - overlap, top, edgeW, bottom - top, factor, true,
      softEdge('13_rock_edge_right', false, catalog['13_rock_edge_right'].suggested_inner_overlap_px));
    grass(x, right, top, hasL, hasR);
  }

  function poolFoundation(x, width, leftY, rightY, floor) {
    // Keep the textured foundation behind the concave walls where their outer silhouettes pull away.
    rockBody(x - 82, leftY + 12, 84, floor - leftY - 6);
    rockBody(x + width - 2, rightY + 12, 84, floor - rightY - 6);
    rockBody(x - 82, floor - 6, width + 164, c34Bottom() - floor + 6);
  }

  function poolWalls(x, width, leftY, rightY, floor) {
    const factor = 0.2, w = 682 * factor;
    tile('15_pool_bottom', x - 6, floor - 3, width + 12, 12, 0.2, false);
    const drawWall = (id, wallX, bankY) => {
      // Keep the upper grass cap continuous at the shared collision height.
      clip(wallX, bankY + 8, w, floor - bankY + 4,
        () => tile(id, wallX, bankY, w, floor - bankY + 12, factor, false, softEdge(id, id.endsWith('_right'), 118)));
    };
    drawWall('15_pool_wall_left', x - w + 32, leftY);
    drawWall('15_pool_wall_right', x + width - 32, rightY);
  }

  function surfaceBlend(im, width) {
    const w = Math.round(width);
    const previous = waterSurfaceFrames.get(im);
    if (previous?.width === w) return previous;
    const layer = document.createElement('canvas');
    layer.width = w;
    layer.height = Math.round(w * im.naturalHeight / im.naturalWidth);
    const g = layer.getContext('2d');
    g.drawImage(im, 0, 0, layer.width, layer.height);
    // Fade the baked shallow-water color into the separate 05 fill.
    const mask = g.createLinearGradient(0, layer.height * 0.585, 0, layer.height * 0.71);
    mask.addColorStop(0, '#000');
    mask.addColorStop(1, 'transparent');
    g.globalCompositeOperation = 'destination-in';
    g.fillStyle = mask;
    g.fillRect(0, 0, layer.width, layer.height);
    waterSurfaceFrames.set(im, layer);
    return layer;
  }

  function poolWater(x, width, y, floor, time) {
    const factor = width / catalog['04_pool_surface'].size[0];
    clip(x, y - 11, width, floor - y + 11, () => {
      // The water fill starts inside the opaque portion of the crest, not below a transparent gap.
      tile('05_pool_body', x, y + 1, width, floor - y - 1, 0.13);
      const crests = image('04_pool_surface', time);
      if (crests) ctx.drawImage(surfaceBlend(crests, width), x, y - catalog['04_pool_surface'].anchor[1] * factor);
    });
  }

  function column(x, top, end, width, time, contact, fadeFrom = end) {
    const im = image('01_waterfall_main', time) || image('01_waterfall_base');
    if (!im || end <= top) return;
    // The opaque core of the approved 724 px texture spans about 270 px.
    const w = width * 724 / 270, h = width * catalog['01_waterfall_main'].size[1] / 270;
    const drawColumn = () => {
      for (let y = end - h; y + h > top; y -= h) ctx.drawImage(im, x - w / 2, y, w, h + 0.35);
    };
    if (contact) {
      ctx.save();
      ctx.beginPath();
      const left = x - width / 2, right = x + width / 2;
      ctx.moveTo(left, top);
      ctx.lineTo(right, top);
      for (let i = 24; i >= 0; i--) {
        const px = left + width * i / 24;
        ctx.lineTo(px, Math.max(top, contact.surfaceAt(px)));
      }
      ctx.closePath();
      ctx.clip();
      drawColumn();
      ctx.restore();
      return;
    }
    clip(x - width / 2, top, width, fadeFrom - top, drawColumn);
    if (fadeFrom < end) {
      ctx.save();
      const alpha = ctx.globalAlpha, step = (end - fadeFrom) / 8;
      for (let i = 0; i < 8; i++) {
        ctx.globalAlpha = alpha * (7.5 - i) / 8;
        clip(x - width / 2, fadeFrom + step * i, width, step, drawColumn);
      }
      ctx.restore();
    }
  }

  function guideThickness(width, i) {
    return 1.75 * width * (i <= 8 ? 0.72 : 0.80 - 0.13 * (i - 8) / 16);
  }

  function clipCanopyGuide(points, cx, width) {
    // Join the edges along the canopy before painting the individual texture strips.
    const edge = side => points.slice(0, 10).map((point, i) => {
      const before = points[Math.max(0, i - 1)], after = points[i + 1];
      const dx = after.x - before.x, dy = after.y - before.y;
      const halfWidth = (guideThickness(width, i) + guideThickness(width, i + 1)) / 4;
      const offset = side * halfWidth / Math.hypot(dx, dy);
      return { x: point.x - cx - offset * dy, y: point.y + offset * dx };
    });
    const left = edge(1), right = edge(-1).reverse();
    const trace = edge => {
      ctx.lineTo(edge[0].x, edge[0].y);
      for (let i = 1; i < edge.length - 1; i++) {
        const point = edge[i], next = edge[i + 1];
        ctx.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
      }
      ctx.lineTo(edge.at(-1).x, edge.at(-1).y);
    };
    ctx.beginPath();
    ctx.moveTo(left[0].x, left[0].y);
    trace(left);
    trace(right);
    ctx.closePath();
    ctx.clip();
  }

  function guide(canopy, stream, cx, width, time) {
    const { side, outX, outY, x, y } = stream;
    // Crop the descending leg of the directional art. Its baked bend is upstream of this crop.
    const im = image('02_umbrella_' + side, time);
    if (!im) return;
    const sourceX = side === 'right' ? 1360 : 240;
    const points = [{ x: canopy.x, y: canopy.y }];
    for (let i = 1; i <= 8; i++) {
      const px = canopy.x + (outX - canopy.x) * i / 8;
      points.push({ x: px, y: Math.max(canopy.y, canopy.surfaceAt(px)) });
    }
    for (let i = 1; i <= 16; i++) {
      const t = i / 16;
      points.push({ x: outX + (x - outX) * t, y: outY + (y - outY) * (0.4 * t + 0.6 * t * t) });
    }
    ctx.save();
    clipCanopyGuide(points, cx, width);
    for (let i = 1; i < points.length; i++) {
      if (i === 10) ctx.restore();
      const a = points[i - 1], b = points[i];
      const dx = b.x - a.x, dy = b.y - a.y;
      const length = Math.hypot(dx, dy);
      if (length < 0.01) continue;
      const thickness = guideThickness(width, i);
      ctx.save();
      ctx.translate(a.x - cx, a.y);
      ctx.rotate(Math.atan2(dy, dx) - Math.PI / 2);
      ctx.globalAlpha *= 0.90;
      // Extend the corner strips under the shared mask so their rotated ends cannot leave gaps.
      const bleed = i <= 9 ? 3 : 0;
      ctx.drawImage(im, sourceX, 470 + i * 50, 400, 50,
        -thickness / 2 - bleed, -0.75 - bleed, thickness + 2 * bleed, length + 1.5 + 2 * bleed);
      ctx.restore();
    }
  }

  function platformSpan(p) {
    const spec = catalog['06_balloon_platform'];
    const [x0] = spec.standing_surface.start, [x1] = spec.standing_surface.end;
    const factor = p.w / (x1 - x0);
    const [ax, ay] = spec.anchor, [w, h] = spec.size;
    const angle = p.c34Angle || 0;
    const center = p.x + p.w / 2;
    // Project the four corners of the rotated sprite onto the horizontal axis.
    const xs = [-ax, w - ax].flatMap(x => [-ay, h - ay].map(y =>
      center + factor * (x * Math.cos(angle) - y * Math.sin(angle))));
    return [Math.min(...xs), Math.max(...xs)];
  }

  function platform(p, cx) {
    const id = '06_balloon_platform', spec = catalog[id];
    const [[x0, sy], [x1]] = [spec.standing_surface.start, spec.standing_surface.end];
    const factor = p.w / (x1 - x0);
    const im = image(id);
    if (!im) return;
    ctx.save();
    ctx.translate(p.x + p.w / 2 - cx, p.y + (spec.anchor[1] - sy) * factor);
    ctx.rotate(p.c34Angle || 0);
    ctx.drawImage(im, -spec.anchor[0] * factor, -spec.anchor[1] * factor, spec.size[0] * factor, spec.size[1] * factor);
    ctx.restore();
  }

  function landPose() {
    const idle = getAdventureImage('idle');
    if (!idle) return { top: player.y, headWidth: player.w * 0.75, footOffset: 0 };
    const rect = getHeroDrawRect(idle, 1);
    const ratio = rect.dW / idle.naturalWidth;
    return { top: player.y + rect.dY + landHead.top * ratio, headWidth: landHead.width * ratio,
      footOffset: rect.dY + 399 * ratio - player.h };
  }

  function swimPose(x, surface, time, facingRight, paddling, bobTime) {
    const id = paddling && image('09_v_water_move', time) ? '09_v_water_move' : '08_v_water_idle';
    const spec = catalog[id];
    const factor = landPose().headWidth / waterHead.width;
    const bob = Math.sin(bobTime / 350) * 1.4;
    const y = surface + (spec.anchor[1] - palmWaterline) * factor + bob;
    return { id, x, y, surface, factor, mirror: !facingRight, time, headTop: y + (waterHead.top - spec.anchor[1]) * factor };
  }

  function swimmer(pose) {
    const { id, x, y, surface, factor, mirror, time } = pose;
    const im = image(id, time), spec = catalog[id];
    if (!im) return false;
    clip(0, surface - 180, CANVAS_W, 180, () => at(id, time, x, y, factor, mirror));

    // Allocate the submerged layer to the full sprite bounds so kicks remain visible.
    const width = Math.ceil(spec.size[0] * factor) + 2;
    const depth = Math.ceil(y - surface + (spec.size[1] - spec.anchor[1]) * factor) + 1;
    if (swimmerLayer.width !== width) swimmerLayer.width = width;
    if (swimmerLayer.height !== depth) swimmerLayer.height = depth;
    const g = swimmerLayer.getContext('2d');
    const localAnchor = (mirror ? spec.size[0] - spec.anchor[0] : spec.anchor[0]) * factor;
    g.clearRect(0, 0, width, depth);
    g.save();
    if (mirror) { g.translate(spec.size[0] * factor, 0); g.scale(-1, 1); }
    g.drawImage(im, 0, y - surface - spec.anchor[1] * factor, spec.size[0] * factor, spec.size[1] * factor);
    g.restore();
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(11,103,148,0.42)';
    g.fillRect(0, 0, width, depth);
    const mask = g.createLinearGradient(0, 0, 0, depth);
    mask.addColorStop(0, 'rgba(0,0,0,0.68)');
    mask.addColorStop(1, 'transparent');
    g.globalCompositeOperation = 'destination-in';
    g.fillStyle = mask;
    g.fillRect(0, 0, width, depth);
    g.globalCompositeOperation = 'source-over';
    ctx.drawImage(swimmerLayer, x - localAnchor, surface);
    return true;
  }

  function climb(pose, cx) {
    const id = '17_v_water_climb';
    const spec = catalog[id], time = pose.tick * 1000 / 60;
    const frame = Math.floor(time / spec.ms);
    const im = image(id, time);
    if (!im || !spec.frames[frame]) return false;
    const { size: [w, h], anchor: [ax, ay], offset, scale } = spec.frames[frame];
    const ratio = landPose().headWidth / 105;
    const factor = scale * ratio;
    const x = pose.edge - cx - offset * ratio;
    const y = pose.top + pose.reachOffset * Math.max(0, 1 - time / (2 * spec.ms));
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(-1, 1);
    ctx.drawImage(im, -ax * factor, -ay * factor, w * factor, h * factor);
    ctx.restore();
    return true;
  }

  function drop(x, y, fraction) {
    const id = '10_wetness_drop', spec = catalog[id];
    if (!image(id) || fraction <= 0) return;
    const factor = 0.085;
    const [top, bottom] = spec.suggested_mask_content_range_y;
    const y0 = y - spec.size[1] * factor;
    const boundary = y0 + (bottom - (bottom - top) * Math.min(1, fraction)) * factor;
    const draw = () => at(id, 0, x, y, factor);
    ctx.save(); ctx.globalAlpha *= spec.mask_demo_upper_alpha_multiplier ?? 0.25;
    clip(x - 16, y0, 32, boundary - y0, draw);
    ctx.restore();
    clip(x - 16, boundary, 32, y - boundary + 1, draw);
  }

  return { entries, image, at, clip, tile, background, terrain, poolFoundation, poolWalls, poolWater, column, guide, platform, platformSpan, landPose, swimPose, swimmer, climb, drop,
    status: () => ({ loaded: images.size, failed: [...failures] }) };
})();

'use strict';

const c34Art = (() => {
  const catalog = chapter3ArtCatalog;
  const images = new Map();
  const failures = new Set();
  const pathPrefix = 'rpg-dual-continent-test/chapter3-art/';
  const scale = 0.23;
  const waterSurfaceFrames = new WeakMap();
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

  function tile(id, x, y, w, h, factor, repeatY = true) {
    const im = image(id);
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
      tile('12_rock_body', x + 12, top + height - 2, w - 24, bottom - top - height + 2, scale);
      clip(x - 35, top - 10, w + 70, bottom - top + 10, () => at('14_canyon_pillar', 0, x + w / 2, top, factor));
      grass(x + (width - w) * 0.1, right - (width - w) * 0.1, top, true, true);
      return;
    }
    const factor = Math.min(scale, w / 1024);
    const edgeW = 682 * factor, overlap = catalog['13_rock_edge_left'].suggested_inner_overlap_px * factor;
    const leftInset = hasL ? edgeW * 0.63 : 0, rightInset = hasR ? edgeW * 0.63 : 0;
    const left = x + leftInset, end = right - rightInset;
    tile('12_rock_body', left, top, end - left, bottom - top, scale);
    if (hasL) tile('13_rock_edge_left', left - edgeW + overlap, top, edgeW, bottom - top, factor);
    if (hasR) tile('13_rock_edge_right', end - overlap, top, edgeW, bottom - top, factor);
    grass(x, right, top, hasL, hasR);
  }

  function poolFoundation(x, width, floor) {
    // Bridge behind both translucent wall silhouettes so the canyon never shows through below the basin.
    tile('12_rock_body', x - 76, floor - 6, width + 152, c34Bottom() - floor + 6, scale);
  }

  function poolWalls(x, width, leftY, rightY, floor) {
    const factor = 0.2, w = 682 * factor;
    tile('15_pool_bottom', x - 6, floor - 3, width + 12, 25, 0.2, false);
    const drawWall = (id, wallX, bankY) => {
      // Keep the upper grass cap continuous at the shared collision height.
      clip(wallX, bankY + 8, w, floor - bankY + 4,
        () => tile(id, wallX, bankY, w, floor - bankY + 12, factor, false));
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

  function column(x, top, end, width, time) {
    const im = image('01_waterfall_main', time) || image('01_waterfall_base');
    if (!im || end <= top) return;
    const w = width * 1.33, h = w * catalog['01_waterfall_main'].size[1] / 724;
    clip(x - w / 2, top, w, end - top, () => {
      for (let y = end - h; y + h > top; y -= h) ctx.drawImage(im, x - w / 2, y, w, h + 0.35);
    });
  }

  function guide(side, x, y, landX, landY, time) {
    at('02_umbrella_split', time, x, y, 0.044);
    const dx = landX - x, dy = landY - y;
    if (side === 'split' || Math.hypot(dx, dy) < 14) return;
    const id = '02_umbrella_' + side;
    const length = Math.hypot(dx, dy);
    ctx.save(); ctx.translate(x, y);
    ctx.rotate(Math.atan2(dy, dx) - Math.PI / 2);
    at(id, time, 0, 0, Math.min(0.19, length / 1640));
    ctx.restore();
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
    if (!idle) return { top: player.y, headWidth: player.w * 0.75 };
    const rect = getHeroDrawRect(idle, 1);
    const ratio = rect.dW / idle.naturalWidth;
    return { top: player.y + rect.dY + landHead.top * ratio, headWidth: landHead.width * ratio };
  }

  function swimPose(x, surface, time, facingRight) {
    const id = image('09_v_water_move', time) ? '09_v_water_move' : '08_v_water_idle';
    const spec = catalog[id];
    const factor = landPose().headWidth / waterHead.width;
    const bob = Math.sin(time / 350) * 1.4;
    const y = surface + (spec.anchor[1] - palmWaterline) * factor + bob;
    return { id, x, y, surface, factor, mirror: !facingRight, time, headTop: y + (waterHead.top - spec.anchor[1]) * factor };
  }

  function swimmer(pose) {
    const { id, x, y, surface, factor, mirror, time } = pose;
    const im = image(id, time), spec = catalog[id];
    if (!im) return false;
    clip(0, surface - 180, CANVAS_W, 180, () => at(id, time, x, y, factor, mirror));

    // Refract only the submerged pixels and hide them gradually in the deeper water.
    const width = Math.ceil(spec.size[0] * factor) + 2, depth = 26;
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

  return { entries, image, at, clip, tile, background, terrain, poolFoundation, poolWalls, poolWater, column, guide, platform, landPose, swimPose, swimmer, drop,
    status: () => ({ loaded: images.size, failed: [...failures] }) };
})();

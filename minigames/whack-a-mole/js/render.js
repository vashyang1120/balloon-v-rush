/* =========================================================
 * render.js — 畫面繪製與動畫（幾何暫代美術）
 * 只「讀」遊戲狀態來畫圖，不改任何判定。
 * 所有動畫都用遊戲時鐘，對話暫停時畫面也一起凍結。
 * ========================================================= */
(function (W) {
  'use strict';
  var WAM = W.WAM;
  var C = WAM.CONFIG;
  var FONT = '"Noto Sans TC","PingFang TC","Microsoft JhengHei","Heiti TC",sans-serif';
  var MONO = 'ui-monospace,"SFMono-Regular",Menlo,Consolas,' + FONT;

  var COLORS = {
    scorpion: '#3dae5c', scorpionDark: '#1f6e37',
    orange: '#f5891f', orangeDark: '#b5560a',
    spike: '#8c7fa8', spikeDark: '#544870',
    gold: '#ffd23f', goldDark: '#c99400',
    yellow: '#ffd84a', purple: '#8a4fd6', purpleDark: '#5b2aa0',
    hammerPink: '#f06aa8', hammerPurple: '#8b5cf6', hammerBlue: '#8ec8f2', hammerBlueDark: '#4f8fc4'
  };

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function easeOut(x) { x = clamp01(x); return 1 - (1 - x) * (1 - x); }
  function easeOutBack(x) { x = clamp01(x); var c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }

  /* ---------- v0.1.1：正式素材繪製輔助 ---------- */
  function asset(key) { return WAM.Assets ? WAM.Assets.get(key) : null; }
  function blit(ctx, e, sx, sy, sw, sh, dx, dy, dw, dh) { WAM.Assets.blit(ctx, e, sx, sy, sw, sh, dx, dy, dw, dh); }
  function spriteFor(type, hit) {
    if (type === 'scorpion' && hit) return asset('scorpionHit') || asset('scorpion');
    if (type === 'orange' && hit) return asset('orangeHit') || asset('orange'); // v0.1.2：金槌敲中橘子怪
    return asset(type);
  }
  // 以 bbox 底部中央為原點、指定寬度等比例繪製（只裁掉透明邊，不拉伸），回傳繪製高度
  function drawSprite(ctx, e, w, flash) {
    var d = e.def, b = d.bbox, bw = b[2] - b[0], bh = b[3] - b[1];
    var s = w / (d.bodyW || bw);
    var ax = d.anchorX !== undefined ? d.anchorX : (b[0] + b[2]) / 2;
    var dx = (b[0] - ax) * s;
    blit(ctx, e, b[0], b[1], bw, bh, dx, -bh * s, bw * s, bh * s);
    if (flash > 0) { // 受擊閃光：疊一層同圖亮化，不修改原圖
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, flash) * 0.65;
      blit(ctx, e, b[0], b[1], bw, bh, dx, -bh * s, bw * s, bh * s);
      ctx.restore();
    }
    return bh * s;
  }
  function spriteHeight(e, w) { var d = e.def, b = d.bbox; return (b[3] - b[1]) * w / (d.bodyW || (b[2] - b[0])); }
  // 以「打擊姿勢」畫一張槌子類圖片：head 對準 (tx,ty)，與遊戲中揮擊的角度一致
  function drawHammerImageAt(ctx, e, tx, ty, L, angle, scaleMul) {
    var hd = e.def, ax = hd.head[0] - hd.grip[0], ay = hd.head[1] - hd.grip[1];
    var sc = L / Math.sqrt(ax * ax + ay * ay) * (scaleMul || 1);
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(angle - Math.atan2(ay, ax));
    ctx.scale(sc, sc);
    blit(ctx, e, 0, 0, e.img.naturalWidth, e.img.naturalHeight, -hd.head[0], -hd.head[1], e.img.naturalWidth, e.img.naturalHeight);
    ctx.restore();
  }
  // 洞口圖（前後兩張同畫布）：opening 中心對準 (cx,cy)，半寬 = rx
  function drawHoleArt(ctx, e, cx, cy, rx) {
    var o = e.def.opening, k = rx / o[2];
    blit(ctx, e, 0, 0, e.img.naturalWidth, e.img.naturalHeight, cx - o[0] * k, cy - o[1] * k, e.img.naturalWidth * k, e.img.naturalHeight * k);
  }

  function Renderer(canvas, grid, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.grid = grid;
    this.game = game;
    this.debug = true;
    this.mouse = { x: 0, y: 0, inside: false };
    this.realStart = performance.now();
  }

  Renderer.prototype.resize = function () {
    var r = this.canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.canvas.width = Math.max(1, Math.round(r.width * dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * dpr));
    this.scale = this.canvas.width / WAM.VIEW_W;
  };

  /* =================== 主繪製 =================== */
  Renderer.prototype.draw = function (realMs) {
    var ctx = this.ctx, g = this.game, grid = this.grid;
    var t = g.state === 'intro' || g.state === 'idle' ? 0 : g.now(realMs);
    var vt = (realMs - this.realStart) / 1000; // 只用於「暫停時也安全」的裝飾閃爍
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);

    // Boss 登場短暫震動（只影響畫面）
    var shake = 0;
    if (g.state === 'playing' && t >= C.BOSS_START && t < C.BOSS_START + 0.35) {
      shake = (1 - (t - C.BOSS_START) / 0.35) * 9;
    }

    this.drawBackground(ctx, t);
    ctx.save();
    if (shake) ctx.translate(Math.sin(t * 90) * shake, Math.cos(t * 77) * shake * 0.6);

    this.drawField(ctx);
    // v0.1.4：27 秒前倒數畫在洞口與怪物下方 → 中上格怪物冒出時不會被倒數擋住
    if (t < C.BOSS_START) this.drawGoldCountdown(ctx, t);
    var bossPhase = g.state !== 'intro' && g.boss.isActive(t);
    // 洞口與普通目標（上排先畫）
    for (var i = 0; i < 9; i++) this.drawHole(ctx, grid.cells[i], t, bossPhase);

    // 變暗
    var dim = g.state === 'intro' ? 0 : g.boss.dimAlpha(t);
    if (dim > 0) {
      ctx.fillStyle = 'rgba(10,6,30,' + dim + ')';
      ctx.fillRect(-40, -40, WAM.VIEW_W + 80, WAM.VIEW_H + 80);
    }
    if (bossPhase) this.drawBoss(ctx, t);

    // 金環（不受變暗影響）
    var ring = g.state === 'playing' || g.state === 'ended' ? g.rings.activeAt(t) : null;
    if (ring && g.state === 'playing') this.drawRing(ctx, grid.cells[ring.hole], t, vt);

    if (this.debug) this.drawHitAreas(ctx, bossPhase);
    this.drawFx(ctx, t);
    ctx.restore();

    this.drawHudLeft(ctx, t, vt);
    this.drawRightPanel(ctx, t);
    // Boss 戰（27 秒起）中上格不再出怪 → 倒數畫在最上層，不受場景變暗影響
    if (t >= C.BOSS_START) this.drawGoldCountdown(ctx, t);
    this.drawHammers(ctx, t);
  };

  /* =================== 背景與場地 =================== */
  Renderer.prototype.drawBackground = function (ctx, t) {
    var sky = ctx.createLinearGradient(0, 0, 0, WAM.VIEW_H);
    sky.addColorStop(0, '#bfe6ff');
    sky.addColorStop(0.55, '#e9f7ff');
    sky.addColorStop(1, '#fff3d6');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WAM.VIEW_W, WAM.VIEW_H);
    // v0.1.1：冒險主線第一章氣球森林背景（遠景＋中景），等比例填滿
    var far = asset('bgFar'), mid = asset('bgMid');
    if (far) {
      drawCover(ctx, far.img);
      if (mid) drawCover(ctx, mid.img);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(0, 0, WAM.VIEW_W, WAM.VIEW_H);
      return;
    }
    // 遠處的氣球（派對島氣氛，純裝飾幾何）
    var cols = ['#ff8fb1', '#ffd84a', '#8fd3ff', '#b79cff'];
    for (var i = 0; i < 6; i++) {
      var x = 60 + i * 290, y = 70 + (i % 2) * 40;
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = cols[i % 4];
      ctx.beginPath(); ctx.ellipse(x, y, 22, 28, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  };

  function drawCover(ctx, img) {
    var s = Math.max(WAM.VIEW_W / img.naturalWidth, WAM.VIEW_H / img.naturalHeight);
    var w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.drawImage(img, (WAM.VIEW_W - w) / 2, (WAM.VIEW_H - h) / 2, w, h);
  }

  // 平台定位：找「九個洞口（含草邊）都落在草地上」的最小等比例縮放，
  // 讓四角花草蘑菇盡量露在資訊欄之間。只影響畫面，不動洞口座標與判定。
  Renderer.prototype.platformFit = function (ground) {
    var key = this.grid.compact ? 'c' : 'n';
    if (this._fit && this._fit.key === key) return this._fit;
    var d = ground.def, b = d.bbox, E = d.edge, cells = this.grid.cells;
    var hb = asset('holeBack'), o = hb ? hb.def.opening : [866, 521, 452];
    function halfAt(y) {
      if (y <= E[0][0]) return E[0][1];
      for (var i = 1; i < E.length; i++) if (y <= E[i][0]) {
        var a = E[i - 1], c = E[i], u = (y - a[0]) / (c[0] - a[0]);
        return a[1] + (c[1] - a[1]) * u;
      }
      return E[E.length - 1][1];
    }
    var near = 0;
    cells.forEach(function (c) { near = Math.max(near, c.cy + c.ry); });
    var gx = this.grid.grid.x + this.grid.grid.w / 2;
    var best = null;
    for (var s = 0.55; s <= 1.6 && !best; s += 0.01) {
      var bottom = near + 14 + (b[3] - d.grassBottom) * s;
      var ok = cells.every(function (c) {
        var k = c.rx / o[2];
        var rimTop = c.cy - (o[1] - 205) * k;            // 洞口草邊頂端
        var yTop = b[3] - (bottom - rimTop) / s;          // 換算回平台圖片 y
        if (yTop < E[0][0]) return false;
        var yMid = b[3] - (bottom - c.cy) / s;
        var ext = Math.abs(c.cx - gx) + 600 * k + 6;      // 洞口圖左右最寬處
        return ext <= halfAt(yMid) * s;
      });
      if (ok) best = { key: key, s: s, bottom: bottom };
    }
    this._fit = best || { key: key, s: (this.grid.grid.h + 70) / (b[3] - b[1]), bottom: this.grid.grid.y + this.grid.grid.h + 22 };
    return this._fit;
  };

  Renderer.prototype.drawField = function (ctx) {
    var gr = this.grid.grid;
    var ground = asset('ground');
    if (ground) { // v0.1.2：森林九宮格平台圖，等比例縮放（不拉伸）
      var b = ground.def.bbox, bw = b[2] - b[0], bh = b[3] - b[1];
      var fit = this.platformFit(ground);
      var s = fit.s, bottom = fit.bottom;
      var cxm = gr.x + gr.w / 2 - (ground.def.centerX - (b[0] + b[2]) / 2) * s;
      blit(ctx, ground, b[0], b[1], bw, bh, cxm - bw * s / 2, bottom - bh * s, bw * s, bh * s);
      return;
    }
    var inset = gr.w * 0.06;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(gr.x + inset, gr.y - 6);
    ctx.lineTo(gr.x + gr.w - inset, gr.y - 6);
    ctx.lineTo(gr.x + gr.w + 18, gr.y + gr.h + 4);
    ctx.lineTo(gr.x - 18, gr.y + gr.h + 4);
    ctx.closePath();
    var grass = ctx.createLinearGradient(0, gr.y, 0, gr.y + gr.h);
    grass.addColorStop(0, '#9ad77a');
    grass.addColorStop(1, '#6fbf55');
    ctx.fillStyle = grass;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#4f9a3d';
    ctx.stroke();
    ctx.restore();
  };

  /* =================== 洞口＋普通目標 =================== */
  Renderer.prototype.drawHole = function (ctx, cell, t, bossPhase) {
    var g = this.game;
    var hb = asset('holeBack'), hf = asset('holeFront');
    var art = !!(hb && hf);
    // 洞口後方（暗色）
    if (art) drawHoleArt(ctx, hb, cell.cx, cell.cy, cell.rx);
    else {
    ctx.save();
    ctx.fillStyle = '#5a3a22';
    ctx.beginPath(); ctx.ellipse(cell.cx, cell.cy + cell.ry * 0.25, cell.rx * 1.08, cell.ry * 1.25, 0, 0, Math.PI * 2); ctx.fill();
    var holeGrad = ctx.createRadialGradient(cell.cx, cell.cy + cell.ry * 0.3, cell.ry * 0.2, cell.cx, cell.cy, cell.rx);
    holeGrad.addColorStop(0, '#120a06');
    holeGrad.addColorStop(1, '#3a2414');
    ctx.fillStyle = holeGrad;
    ctx.beginPath(); ctx.ellipse(cell.cx, cell.cy, cell.rx, cell.ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    }

    // 角色：裁切成「洞口中線以上 ∪ 洞口內部」，前緣再蓋上去
    if (g.state === 'playing' || g.state === 'ended') {
      for (var i = 0; i < g.active.length; i++) {
        var tg = g.active[i];
        if (tg.hole !== cell.index) continue;
        this.drawTargetInHole(ctx, cell, tg, t);
      }
    }

    // 洞口前緣（遮住角色下半身）
    if (art) drawHoleArt(ctx, hf, cell.cx, cell.cy, cell.rx);
    else {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#7b5130';
    ctx.lineWidth = cell.ry * 0.55;
    ctx.beginPath(); ctx.ellipse(cell.cx, cell.cy, cell.rx, cell.ry, 0, 0.02, Math.PI - 0.02); ctx.stroke();
    ctx.strokeStyle = '#a8784c';
    ctx.lineWidth = cell.ry * 0.2;
    ctx.beginPath(); ctx.ellipse(cell.cx, cell.cy - cell.ry * 0.05, cell.rx * 0.98, cell.ry * 0.95, 0, 0.15, Math.PI - 0.15); ctx.stroke();
    ctx.restore();
    }

    // 鍵盤提示
    if (!this.grid.compact && !(bossPhase && cell.index === 4)) {
      ctx.save();
      ctx.font = '600 17px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(30,60,20,0.45)';
      ctx.fillText(C.KEY_LABELS[cell.index], cell.cx, cell.cy + cell.ry + 30);
      ctx.restore();
    }
  };

  Renderer.prototype.clipHole = function (ctx, cx, cy, rx, ry, R) {
    ctx.beginPath();
    ctx.rect(cx - Math.max(rx, R) * 2.2, cy - R * 4, Math.max(rx, R) * 4.4, R * 4);
    ctx.ellipse(cx, cy, rx * 0.97, ry * 0.97, 0, 0, Math.PI);
    ctx.clip();
  };

  // v0.1.3：普通目標可見寬度 = 洞口圖可見寬度 × 比例（Alpha 實際範圍；洞口圖未載入時用舊比例）
  Renderer.prototype.targetWidth = function (type, cell) {
    var hb = asset('holeBack'), r = C.SPRITE_HOLE_RATIO[type];
    if (hb && r) return r * C.HOLE_VISIBLE_W * cell.rx / hb.def.opening[2];
    return C.SPRITE_WIDTH[type] * this.grid.cellW * cell.scale;
  };
  // 同一洞口、在這個目標被敲中之後才出現的下一個目標（排程本來就排好，只是查詢）
  Renderer.prototype.nextOnHole = function (tg) {
    var list = this.game.pending;
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (p !== tg && p.hole === tg.hole && p.s > tg.hitAt) return p;
    }
    return null;
  };

  Renderer.prototype.drawTargetInHole = function (ctx, cell, tg, t) {
    var R = cell.charR;
    var h; // 0 = 在洞裡，1 = 完全升起
    var squash = 0, dizzy = false, shakeX = 0, pop = 0;
    if (tg.hitAt !== null) {
      // v0.1.3 受擊演出（純畫面；命中當下已計分、目標已不能再被敲）：
      //   0 ～ HURT_HOLD(0.35s)：受擊圖清楚停在洞口（若在升起／下降途中被敲，先快速彈到完全升起）
      //   HURT_HOLD ～ HIT_LEAVE_TIME(0.55s)：退洞
      // 同一洞口的下一個目標若在這之前就依排程出現 → 受擊殘影提前讓位，排程完全不變
      var dt = t - tg.hitAt;
      var hold = C.HURT_HOLD, leave = C.HIT_LEAVE_TIME;
      var nx = this.nextOnHole(tg);
      if (nx && nx.s - tg.hitAt < leave) {
        leave = Math.max(0.06, nx.s - tg.hitAt);
        hold = Math.max(0, Math.min(hold, leave - 0.1));
      }
      if (dt >= leave) return;
      var hAtHit = Math.max(0, Math.min(1, (tg.hitAt - tg.s) / C.RISE_TIME, (tg.e - tg.hitAt) / C.FALL_TIME));
      if (dt < hold) {
        h = hAtHit + (1 - hAtHit) * easeOut(dt / 0.08);
        shakeX = Math.sin(dt * 70) * 5 * (1 - dt / hold);
        pop = 1 - clamp01(dt / 0.12);
      } else {
        var kk = clamp01((dt - hold) / Math.max(0.01, leave - hold));
        h = 1 - kk * kk;
        squash = kk * 0.6;
      }
      dizzy = true;
    } else {
      h = Math.min(easeOut((t - tg.s) / C.RISE_TIME), easeOut((tg.e - t) / C.FALL_TIME), 1);
    }
    if (h <= 0.001) return;
    var spr = spriteFor(tg.type, tg.hitAt !== null);
    if (spr) {
      // 正式圖片：底部從洞口中線下方升起，前緣蓋住下半身
      var sw = this.targetWidth(tg.type, cell);
      var sh = spriteHeight(spr, sw);
      var upB = cell.cy + cell.ry * (asset('holeFront') ? C.HOLE_SINK : 0.45);
      var downB = cell.cy + cell.ry + sh + 4;
      var by = downB + (upB - downB) * h;
      // 有專用受擊圖（蠍子怪、橘子怪）就不再疊白光，保留原圖配色
      var hasHitArt = tg.hitAt !== null && ((tg.type === 'scorpion' && asset('scorpionHit')) || (tg.type === 'orange' && asset('orangeHit')));
      var flash = tg.hitAt !== null && !hasHitArt ? 1 - clamp01((t - tg.hitAt) / 0.18) : 0;
      ctx.save();
      this.clipHole(ctx, cell.cx, cell.cy, cell.rx, cell.ry, R);
      ctx.translate(cell.cx + shakeX, by);
      if (pop > 0) ctx.scale(1 + pop * 0.07, 1 - pop * 0.05);
      if (squash > 0) ctx.scale(1 + squash * 0.12, 1 - squash * 0.16);
      drawSprite(ctx, spr, sw, flash);
      ctx.restore();
      return;
    }
    var upY = cell.cy - R * 0.82;
    var downY = cell.cy + R * 1.7;
    var y = downY + (upY - downY) * h;
    ctx.save();
    this.clipHole(ctx, cell.cx, cell.cy, cell.rx, cell.ry, R);
    ctx.translate(cell.cx + shakeX, y);
    if (squash > 0) ctx.scale(1 + squash * 0.18, 1 - squash * 0.22);
    drawCharacter(ctx, tg.type, R, t, dizzy);
    ctx.restore();
  };

  /* =================== 角色幾何（暫代美術） =================== */
  function glyph(ctx, text, R, color, y) {
    ctx.font = '900 ' + Math.round(R * 0.66) + 'px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = R * 0.12;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.strokeText(text, 0, y || 0);
    ctx.fillStyle = color || '#fff';
    ctx.fillText(text, 0, y || 0);
  }
  function eyes(ctx, R, y, angry, dizzy) {
    var ex = R * 0.32;
    for (var s = -1; s <= 1; s += 2) {
      if (dizzy) {
        ctx.strokeStyle = '#222'; ctx.lineWidth = R * 0.08;
        ctx.beginPath();
        ctx.moveTo(s * ex - R * 0.1, y - R * 0.1); ctx.lineTo(s * ex + R * 0.1, y + R * 0.1);
        ctx.moveTo(s * ex + R * 0.1, y - R * 0.1); ctx.lineTo(s * ex - R * 0.1, y + R * 0.1);
        ctx.stroke();
        continue;
      }
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(s * ex, y, R * 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(s * ex + s * -R * 0.02, y + R * 0.02, R * 0.08, 0, Math.PI * 2); ctx.fill();
      if (angry) {
        ctx.strokeStyle = '#3a1a00'; ctx.lineWidth = R * 0.08;
        ctx.beginPath(); ctx.moveTo(s * (ex + R * 0.16), y - R * 0.24); ctx.lineTo(s * (ex - R * 0.14), y - R * 0.14); ctx.stroke();
      }
    }
  }

  function drawCharacter(ctx, type, R, t, dizzy) {
    if (type === 'scorpion') drawScorpion(ctx, R, t, dizzy);
    else if (type === 'orange') drawOrange(ctx, R, t, dizzy);
    else if (type === 'spike') drawSpike(ctx, R, t, dizzy);
  }

  function drawScorpion(ctx, R, t, dizzy) {
    // 尾巴（向上彎、尾端毒針）
    ctx.strokeStyle = COLORS.scorpionDark; ctx.lineWidth = R * 0.26; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(R * 0.35, -R * 0.55);
    ctx.quadraticCurveTo(R * 0.95, -R * 1.45, R * 0.15, -R * 1.55);
    ctx.stroke();
    ctx.fillStyle = '#e8f5a0';
    ctx.beginPath();
    ctx.moveTo(R * 0.18, -R * 1.78); ctx.lineTo(R * -0.12, -R * 1.5); ctx.lineTo(R * 0.28, -R * 1.42); ctx.closePath(); ctx.fill();
    // 兩隻鉗子
    for (var s = -1; s <= 1; s += 2) {
      ctx.fillStyle = COLORS.scorpion; ctx.strokeStyle = COLORS.scorpionDark; ctx.lineWidth = R * 0.07;
      ctx.beginPath(); ctx.arc(s * R * 1.12, -R * 0.42, R * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#163f20';
      ctx.beginPath(); ctx.moveTo(s * R * 1.12, -R * 0.42); ctx.lineTo(s * R * 1.5, -R * 0.62); ctx.lineTo(s * R * 1.45, -R * 0.3); ctx.closePath(); ctx.fill();
    }
    // 身體
    ctx.fillStyle = COLORS.scorpion; ctx.strokeStyle = COLORS.scorpionDark; ctx.lineWidth = R * 0.08;
    ctx.beginPath(); ctx.ellipse(0, 0, R * 0.95, R, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    eyes(ctx, R, -R * 0.42, false, dizzy);
    glyph(ctx, '蠍', R, '#ffffff', R * 0.22);
  }

  function drawOrange(ctx, R, t, dizzy) {
    ctx.fillStyle = COLORS.orange; ctx.strokeStyle = COLORS.orangeDark; ctx.lineWidth = R * 0.08;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // 果蒂與葉子
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(-R * 0.06, -R * 1.18, R * 0.12, R * 0.26);
    ctx.fillStyle = '#4caf50';
    ctx.beginPath(); ctx.ellipse(R * 0.28, -R * 1.08, R * 0.3, R * 0.13, -0.5, 0, Math.PI * 2); ctx.fill();
    // 表皮點點
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.ellipse(-R * 0.45, -R * 0.5, R * 0.18, R * 0.1, -0.7, 0, Math.PI * 2); ctx.fill();
    eyes(ctx, R, -R * 0.38, true, dizzy);
    glyph(ctx, '橘', R, '#ffffff', R * 0.25);
  }

  function drawSpike(ctx, R, t, dizzy) {
    // 三根灰紫色三角尖刺
    var spikes = [[-0.55, 0.15, 0.75], [0.55, 0.15, 0.75], [0, -0.05, 1.0]];
    spikes.forEach(function (sp) {
      var x = sp[0] * R, base = sp[1] * R + R * 0.6, hgt = sp[2] * R * 1.85, w = R * 0.55 * sp[2];
      ctx.fillStyle = COLORS.spike; ctx.strokeStyle = COLORS.spikeDark; ctx.lineWidth = R * 0.07; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(x - w, base); ctx.lineTo(x, base - hgt); ctx.lineTo(x + w, base); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.beginPath(); ctx.moveTo(x - w * 0.2, base - hgt * 0.15); ctx.lineTo(x, base - hgt * 0.92); ctx.lineTo(x + w * 0.12, base - hgt * 0.15); ctx.closePath(); ctx.fill();
    });
    // 名牌
    ctx.fillStyle = '#3d3354';
    roundRect(ctx, -R * 0.42, R * 0.0, R * 0.84, R * 0.6, R * 0.12); ctx.fill();
    glyph(ctx, '刺', R * 0.8, '#ffe9a8', R * 0.3);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /* =================== 金環 =================== */
  Renderer.prototype.drawRing = function (ctx, cell, t, vt) {
    var ring = this.game.rings.activeAt(t);
    var appear = easeOutBack((t - ring.from) / 0.35);
    var R = cell.charR * 0.95 * appear;
    if (R <= 0) return;
    var x = cell.cx, y = cell.cy - cell.charR * 1.05 + Math.sin(t * 4) * 6;
    ctx.save();
    // 光暈
    var glow = ctx.createRadialGradient(x, y, R * 0.3, x, y, R * 2.1);
    glow.addColorStop(0, 'rgba(255,230,120,0.75)');
    glow.addColorStop(1, 'rgba(255,230,120,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, y, R * 2.1, 0, Math.PI * 2); ctx.fill();
    var rs = asset('ring');
    if (rs) { // v0.1.1：冒險主線橘子王的金色油管環
      var rw = C.SPRITE_WIDTH.ring * this.grid.cellW * cell.scale * appear;
      ctx.translate(x, y + spriteHeight(rs, rw) / 2);
      drawSprite(ctx, rs, rw, 0.25 + 0.2 * Math.sin(t * 6));
      ctx.translate(-x, -(y + spriteHeight(rs, rw) / 2));
      for (var j = 0; j < 4; j++) {
        var aj = t * 2.2 + j * Math.PI / 2;
        star(ctx, x + Math.cos(aj) * R * 1.3, y + Math.sin(aj) * R * 1.3, R * 0.16, '#fffbe0');
      }
      ctx.restore();
      return;
    }
    // 金色圓環
    ctx.lineWidth = R * 0.34;
    ctx.strokeStyle = COLORS.goldDark;
    ctx.beginPath(); ctx.arc(x, y, R * 0.82, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = R * 0.24;
    ctx.strokeStyle = COLORS.gold;
    ctx.beginPath(); ctx.arc(x, y, R * 0.82, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = R * 0.07;
    ctx.strokeStyle = '#fff8d0';
    ctx.beginPath(); ctx.arc(x, y, R * 0.82, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
    // 旋轉亮點
    for (var i = 0; i < 4; i++) {
      var a = t * 2.2 + i * Math.PI / 2;
      star(ctx, x + Math.cos(a) * R * 1.25, y + Math.sin(a) * R * 1.25, R * 0.16, '#fffbe0');
    }
    // 名稱
    ctx.font = '900 ' + Math.round(R * 0.62) + 'px ' + FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 5; ctx.strokeStyle = '#7a5600';
    ctx.strokeText('金', x, y + 1);
    ctx.fillStyle = '#fff6c4';
    ctx.fillText('金', x, y + 1);
    ctx.restore();
  };

  function star(ctx, x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (var i = 0; i < 8; i++) {
      var rr = i % 2 ? r * 0.38 : r;
      var a = i * Math.PI / 4 - Math.PI / 2;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
  }

  /* =================== 橘子王 =================== */
  Renderer.prototype.drawBoss = function (ctx, t) {
    var b = this.grid.boss, boss = this.game.boss;
    var p = boss.introProgress(t);
    var R = b.bodyR;
    // 衝擊波
    if (p < 1) {
      var k = (t - C.BOSS_START) / 0.5;
      if (k < 1) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,170,60,' + (1 - k) + ')';
        ctx.lineWidth = 14 * (1 - k) + 2;
        ctx.beginPath(); ctx.ellipse(b.cx, b.cy, b.rx * (1 + k * 1.6), b.ry * (1 + k * 1.6), 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }
    // 大型洞口
    var holeOpen = easeOut(p * 2.5);
    var hb = asset('holeBack'), hf = asset('holeFront');
    if (hb && hf) { if (holeOpen > 0.01) drawHoleArt(ctx, hb, b.cx, b.cy, b.rx * holeOpen); }
    else {
    ctx.save();
    ctx.fillStyle = '#4a2c18';
    ctx.beginPath(); ctx.ellipse(b.cx, b.cy + b.ry * 0.25, b.rx * 1.1 * holeOpen, b.ry * 1.3 * holeOpen, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0d0703';
    ctx.beginPath(); ctx.ellipse(b.cx, b.cy, b.rx * holeOpen, b.ry * holeOpen, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    }

    // 本體（升起）
    var h = easeOutBack(p);
    var upY = b.cy - R * 0.78, downY = b.cy + R * 1.4;
    var y = downY + (upY - downY) * h;
    var react = boss.reactAmount(t);
    var bs = asset('boss');
    // v0.1.2：受擊時換成 orange_king_cooldown_01（同像素比例、腳底對齊；純畫面，不影響判定）
    if (bs && react > 0 && asset('bossHit')) bs = asset('bossHit');
    if (bs) { // v0.1.1：冒險主線橘子王（等比例放大，明顯大於普通目標）
      var bw = C.SPRITE_WIDTH.boss * this.grid.cellW;
      var bh = spriteHeight(bs, bw);
      var bhIdle = asset('boss') ? spriteHeight(asset('boss'), bw) : bh; // 升起位置以一般圖為準
      var art = !!(asset('holeBack') && asset('holeFront'));
      var bry = art ? b.rx * 149 / 452 : b.ry;                     // 洞口圖的高寬比
      var upB = b.cy + bry * (art ? C.HOLE_SINK : 0.5), downB = b.cy + bry + Math.max(bh, bhIdle) + 4;
      var byy = downB + (upB - downB) * h;
      ctx.save();
      this.clipHole(ctx, b.cx, b.cy, b.rx, bry, bh / 4 + 10);
      ctx.translate(b.cx + (react ? Math.sin(t * 160) * 8 * react : 0), byy + react * 8);
      ctx.scale(1 + react * 0.05, 1 - react * 0.06);
      drawSprite(ctx, bs, bw, react * 0.5);
      ctx.restore();
    } else {
    ctx.save();
    this.clipHole(ctx, b.cx, b.cy, b.rx, b.ry, R);
    ctx.translate(b.cx + (react ? Math.sin(t * 160) * 8 * react : 0), y + react * 10);
    ctx.scale(1 + react * 0.08, 1 - react * 0.1);
    // 身體
    ctx.fillStyle = COLORS.orange; ctx.strokeStyle = COLORS.orangeDark; ctx.lineWidth = R * 0.06;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.ellipse(-R * 0.45, -R * 0.45, R * 0.22, R * 0.12, -0.7, 0, Math.PI * 2); ctx.fill();
    // 王冠
    ctx.fillStyle = COLORS.gold; ctx.strokeStyle = COLORS.goldDark; ctx.lineWidth = R * 0.04;
    ctx.beginPath();
    ctx.moveTo(-R * 0.5, -R * 0.82);
    ctx.lineTo(-R * 0.55, -R * 1.32); ctx.lineTo(-R * 0.27, -R * 1.05);
    ctx.lineTo(0, -R * 1.42); ctx.lineTo(R * 0.27, -R * 1.05);
    ctx.lineTo(R * 0.55, -R * 1.32); ctx.lineTo(R * 0.5, -R * 0.82);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    eyes(ctx, R * 0.9, -R * 0.35, true, false);
    // 嘴
    ctx.strokeStyle = '#5a2400'; ctx.lineWidth = R * 0.05;
    ctx.beginPath(); ctx.arc(0, -R * 0.02, R * 0.22, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    glyph(ctx, '王', R * 0.95, '#fff6c4', R * 0.38);
    // 受擊閃白
    if (react > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (react * 0.55) + ')';
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    }

    // 前緣
    if (hb && hf) { if (holeOpen > 0.01) drawHoleArt(ctx, hf, b.cx, b.cy, b.rx * holeOpen); }
    else {
    ctx.save();
    ctx.strokeStyle = '#6d4426';
    ctx.lineWidth = b.ry * 0.5 * holeOpen + 1;
    ctx.beginPath(); ctx.ellipse(b.cx, b.cy, b.rx * holeOpen, b.ry * holeOpen, 0, 0.02, Math.PI - 0.02); ctx.stroke();
    ctx.restore();
    }

    // 名稱標籤
    ctx.save();
    ctx.globalAlpha = clamp01(p * 2);
    ctx.font = '900 30px ' + FONT;
    ctx.textAlign = 'center';
    ctx.lineWidth = 6; ctx.strokeStyle = '#4a1d00';
    ctx.strokeText('橘子王', b.cx, b.cy + b.ry + 46);
    ctx.fillStyle = '#ffd27a';
    ctx.fillText('橘子王', b.cx, b.cy + b.ry + 46);
    ctx.restore();
  };

  /* =================== 測試：有效敲擊區域 =================== */
  Renderer.prototype.drawHitAreas = function (ctx, bossPhase) {
    ctx.save();
    ctx.setLineDash([8, 8]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(40,80,160,0.22)';
    this.grid.cells.forEach(function (c) { ctx.strokeRect(c.hit.x + 2, c.hit.y + 2, c.hit.w - 4, c.hit.h - 4); });
    if (bossPhase) {
      var b = this.grid.boss.hit;
      ctx.strokeStyle = 'rgba(255,140,40,0.75)';
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    }
    ctx.restore();
  };

  /* =================== 特效 =================== */
  Renderer.prototype.fxPos = function (f) {
    if (f.slot === null || f.slot === undefined) return { x: f.x, y: f.y };
    return this.grid.slotCenter(f.slot);
  };

  Renderer.prototype.drawFx = function (ctx, t) {
    var self = this;
    this.game.fx.forEach(function (f) {
      var k = t - f.t0;
      var grid = self.grid;
      if (k < 0) return;
      var p = self.fxPos(f);
      if (p.x === null || p.x === undefined) return;
      ctx.save();
      if (f.type === 'pop' && k < 0.8) {
        var a = 1 - k / 0.8;
        ctx.globalAlpha = a;
        ctx.font = '900 ' + (f.big ? 62 : 48) + 'px ' + FONT;
        ctx.textAlign = 'center';
        ctx.lineWidth = 8; ctx.strokeStyle = f.big ? '#7a2b00' : '#1c4a12';
        var yy = p.y - (f.big ? grid.boss.bodyR * 0.9 : 40) - k * 90;
        ctx.strokeText(f.text, p.x + (f.big ? (Math.random() - 0.5) * 0 : 0), yy);
        ctx.fillStyle = f.big ? '#ffd23f' : (f.goldText ? '#ffe36b' : '#ffffff');
        ctx.fillText(f.text, p.x, yy);
      } else if (f.type === 'burst' && asset('hammerCracked') && asset('hammerBurst') && asset('hammerShards') && k < C.BREAK_FX.shards) {
        // v0.1.2：正式爆槌圖：裂開 → 爆開 → 碎片飄散（在敲擊的位置、敲擊的角度）
        var BF = C.BREAK_FX, L2 = self.hammerLength();
        var hp = p;
        self.game.fx.forEach(function (sw) { if (sw.type === 'swing' && sw.t0 === f.t0 && sw.x !== null && sw.x !== undefined) hp = { x: sw.x, y: sw.y }; });
        if (k < BF.cracked) {
          var sh = Math.sin(k * 140) * 5;
          drawHammerImageAt(ctx, asset('hammerCracked'), hp.x + sh, hp.y, L2, ANG_STRIKE, 1);
        } else if (k < BF.burst) {
          var kb = (k - BF.cracked) / (BF.burst - BF.cracked);
          ctx.globalAlpha = 1 - kb * 0.25;
          drawHammerImageAt(ctx, asset('hammerBurst'), hp.x, hp.y, L2, ANG_STRIKE, 1 + easeOut(kb) * 0.18);
        } else {
          var ks = (k - BF.burst) / (BF.shards - BF.burst);
          ctx.globalAlpha = 1 - ks;
          drawHammerImageAt(ctx, asset('hammerShards'), hp.x, hp.y + ks * 50, L2, ANG_STRIKE, 1.18 + ks * 0.12);
        }
        ctx.globalAlpha = Math.max(0, 1 - k / 1.0);
        if (k < 1.0) {
          ctx.font = '900 64px ' + FONT;
          ctx.textAlign = 'center';
          ctx.lineWidth = 9; ctx.strokeStyle = '#5c0b0b';
          ctx.strokeText('啪！爆槌', p.x, p.y - 70 - k * 30);
          ctx.fillStyle = '#ff5050';
          ctx.fillText('啪！爆槌', p.x, p.y - 70 - k * 30);
        }
      } else if (f.type === 'burst' && k < 1.0) {
        var a2 = 1 - k / 1.0;
        ctx.globalAlpha = a2;
        // 氣球碎片
        for (var i = 0; i < 12; i++) {
          var ang = i * Math.PI / 6 + 0.3;
          var d = 30 + easeOut(k / 0.5) * 120;
          ctx.fillStyle = i % 2 ? COLORS.hammerPink : COLORS.hammerPurple;
          ctx.save();
          ctx.translate(p.x + Math.cos(ang) * d, p.y + Math.sin(ang) * d + k * k * 160);
          ctx.rotate(ang + k * 8);
          ctx.fillRect(-9, -5, 18, 10);
          ctx.restore();
        }
        ctx.font = '900 64px ' + FONT;
        ctx.textAlign = 'center';
        ctx.lineWidth = 9; ctx.strokeStyle = '#5c0b0b';
        ctx.strokeText('啪！爆槌', p.x, p.y - 70 - k * 30);
        ctx.fillStyle = '#ff5050';
        ctx.fillText('啪！爆槌', p.x, p.y - 70 - k * 30);
      } else if (f.type === 'goldget' && k < 1.0) {
        var a3 = 1 - k;
        ctx.globalAlpha = a3;
        ctx.strokeStyle = COLORS.gold;
        ctx.lineWidth = 10 * a3 + 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, 40 + k * 220, 0, Math.PI * 2); ctx.stroke();
        ctx.font = '900 54px ' + FONT;
        ctx.textAlign = 'center';
        ctx.lineWidth = 8; ctx.strokeStyle = '#6b4a00';
        ctx.strokeText('金色無敵槌！', p.x, p.y - 80 - k * 40);
        ctx.fillStyle = '#ffe36b';
        ctx.fillText('金色無敵槌！', p.x, p.y - 80 - k * 40);
      } else if (f.type === 'dust' && k < 0.4) {
        ctx.globalAlpha = 1 - k / 0.4;
        ctx.fillStyle = '#c9a77a';
        for (var j = 0; j < 5; j++) {
          var aa = Math.PI + j * Math.PI / 4;
          ctx.beginPath(); ctx.arc(p.x + Math.cos(aa) * (20 + k * 120), p.y + 40 + Math.sin(aa) * (8 + k * 40), 9 * (1 - k / 0.4) + 2, 0, Math.PI * 2); ctx.fill();
        }
      } else if (f.type === 'denied' && k < 0.5) {
        ctx.globalAlpha = 1 - k / 0.5;
        ctx.font = '800 30px ' + FONT;
        ctx.textAlign = 'center';
        ctx.lineWidth = 6; ctx.strokeStyle = '#ffffff';
        ctx.strokeText('槌子修復中…', p.x + Math.sin(k * 60) * 6, p.y - 30);
        ctx.fillStyle = '#c0392b';
        ctx.fillText('槌子修復中…', p.x + Math.sin(k * 60) * 6, p.y - 30);
      }
      ctx.restore();
    });
  };

  /* =================== 氣球槌 =================== */
  var ANG_STRIKE = 205 * Math.PI / 180;
  var ANG_RAISED = 262 * Math.PI / 180;

  function swingAngle(k) {
    if (k < 0) return ANG_RAISED;
    if (k < 0.06) return ANG_RAISED + (ANG_STRIKE - ANG_RAISED) * easeOut(k / 0.06);
    if (k < 0.12) return ANG_STRIKE;
    if (k < 0.26) return ANG_STRIKE + (ANG_RAISED - ANG_STRIKE) * easeOut((k - 0.12) / 0.14);
    return ANG_RAISED;
  }

  Renderer.prototype.hammerLength = function () { return this.grid.cellW * 0.6; };

  // (tx,ty) 為槌頭打擊點
  Renderer.prototype.drawHammerAt = function (ctx, tx, ty, angle, mode, t) {
    var L = this.hammerLength();
    var px = tx - L * Math.cos(ANG_STRIKE), py = ty - L * Math.sin(ANG_STRIKE);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);
    var hs = asset('hammer');
    if (hs && mode !== 'broken') {
      // v0.1.1：冒險主線氣球槌圖片。握把末端對齊轉軸、槌頭對齊打擊點，
      // 揮擊時間、角度、判定完全沿用原型
      var hd = hs.def, ax = hd.head[0] - hd.grip[0], ay = hd.head[1] - hd.grip[1];
      var sc = L / Math.sqrt(ax * ax + ay * ay);
      ctx.rotate(-Math.atan2(ay, ax));
      ctx.scale(sc, sc);
      var gimg = asset('hammerGold');
      if (mode === 'gold' && gimg) { // v0.1.2：正式金色氣球槌圖片
        ctx.restore();
        ctx.save();
        ctx.shadowColor = 'rgba(255,215,60,0.9)';
        ctx.shadowBlur = 30;
        var hx = px + L * Math.cos(angle), hy = py + L * Math.sin(angle);
        drawHammerImageAt(ctx, gimg, hx, hy, L, angle);
        ctx.restore();
        for (var gs2 = 0; gs2 < 3; gs2++) {
          var ga2 = t * 5 + gs2 * 2.1;
          star(ctx, hx + Math.cos(ga2) * L * 0.45, hy + Math.sin(ga2) * L * 0.38, L * 0.07, '#fffbe0');
        }
        return;
      }
      if (mode === 'gold') {
        ctx.shadowColor = 'rgba(255,215,60,0.95)';
        ctx.shadowBlur = 40;
        ctx.drawImage(hs.gold || hs.img, -hd.grip[0], -hd.grip[1]);
        ctx.shadowBlur = 0;
        for (var gs = 0; gs < 3; gs++) {
          var ga = t * 5 + gs * 2.1;
          star(ctx, hd.head[0] - hd.grip[0] + Math.cos(ga) * 95, hd.head[1] - hd.grip[1] + Math.sin(ga) * 80, 16, '#fffbe0');
        }
      } else {
        ctx.drawImage(hs.img, -hd.grip[0], -hd.grip[1]);
      }
      ctx.restore();
      return;
    }
    var official = !!hs; // 有正式圖片時，破裂狀態也用同色系
    // 握把
    ctx.fillStyle = official ? COLORS.hammerBlueDark : COLORS.purpleDark;
    roundRect(ctx, -L * 0.08, -L * 0.055, L * 0.98, L * 0.11, L * 0.05); ctx.fill();
    ctx.fillStyle = official ? COLORS.hammerBlue : COLORS.purple;
    for (var i = 0; i < 6; i++) {
      ctx.save(); ctx.translate(L * (0.05 + i * 0.14), 0); ctx.rotate(0.6);
      ctx.fillRect(-L * 0.015, -L * 0.07, L * 0.03, L * 0.14); ctx.restore();
    }
    ctx.translate(L, 0);
    if (mode === 'broken') {
      // 破掉的氣球碎片
      ctx.fillStyle = official ? COLORS.hammerPink : COLORS.yellow;
      ctx.strokeStyle = official ? '#a8326e' : '#a07a00'; ctx.lineWidth = 2;
      var shreds = [[-0.05, -0.12, 0.5], [0.06, 0.02, -0.4], [-0.02, 0.14, 0.9]];
      shreds.forEach(function (s) {
        ctx.save(); ctx.translate(L * s[0], L * s[1]); ctx.rotate(s[2]);
        ctx.beginPath();
        ctx.moveTo(-L * 0.1, 0); ctx.lineTo(-L * 0.03, -L * 0.07); ctx.lineTo(L * 0.02, -L * 0.02);
        ctx.lineTo(L * 0.09, -L * 0.08); ctx.lineTo(L * 0.1, L * 0.04); ctx.lineTo(-L * 0.04, L * 0.06); ctx.closePath();
        ctx.fill(); ctx.stroke(); ctx.restore();
        if (official) ctx.fillStyle = ctx.fillStyle === COLORS.hammerPink.toLowerCase() ? COLORS.hammerPurple : COLORS.hammerPink;
      });
      ctx.fillStyle = COLORS.purple;
      ctx.beginPath(); ctx.arc(0, 0, L * 0.06, 0, Math.PI * 2); ctx.fill();
    } else {
      var gold = mode === 'gold';
      if (gold) { ctx.shadowColor = 'rgba(255,215,60,0.95)'; ctx.shadowBlur = 36; }
      var hw = L * 0.19, hh = L * 0.36;
      var grad = ctx.createLinearGradient(-hw, -hh, hw, hh);
      if (gold) { grad.addColorStop(0, '#fff3a6'); grad.addColorStop(0.5, '#ffcf1f'); grad.addColorStop(1, '#d99a00'); }
      else { grad.addColorStop(0, '#fff2a0'); grad.addColorStop(0.5, COLORS.yellow); grad.addColorStop(1, '#e0b000'); }
      ctx.fillStyle = grad;
      ctx.strokeStyle = gold ? '#9a6b00' : '#b38a00';
      ctx.lineWidth = L * 0.025;
      // 兩顆氣球組成槌頭
      ctx.beginPath(); ctx.ellipse(0, -hh * 0.5, hw, hh * 0.55, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, hh * 0.5, hw, hh * 0.55, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;
      // 紫色綁帶
      ctx.fillStyle = gold ? '#b8860b' : COLORS.purple;
      roundRect(ctx, -hw * 1.05, -L * 0.035, hw * 2.1, L * 0.07, L * 0.03); ctx.fill();
      // 高光
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath(); ctx.ellipse(-hw * 0.4, -hh * 0.75, hw * 0.25, hh * 0.13, -0.3, 0, Math.PI * 2); ctx.fill();
      if (gold) {
        for (var s = 0; s < 3; s++) {
          var a = t * 5 + s * 2.1;
          star(ctx, Math.cos(a) * hw * 1.6, Math.sin(a) * hh * 0.9, L * 0.06, '#fffbe0');
        }
      }
    }
    ctx.restore();
  };

  Renderer.prototype.drawRepairBadge = function (ctx, x, y, t) {
    var left = this.game.hammer.repairLeft(t);
    var frac = 1 - left / C.BREAK_DURATION;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(x, y, 34, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(x, y, 28, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#e74c3c';
    ctx.beginPath(); ctx.arc(x, y, 28, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); ctx.stroke();
    ctx.fillStyle = '#c0392b';
    ctx.font = '800 20px ' + FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(left.toFixed(1), x, y + 1);
    ctx.restore();
  };

  // v0.1.3：金槌最後 3 秒，滑鼠游標旁的小倒數（橘紅、每秒跳一下）
  Renderer.prototype.drawGoldBadge = function (ctx, x, y, t) {
    var gl = this.game.hammer.goldLeft(t);
    var sec = Math.ceil(gl - 1e-6), fr = gl - Math.floor(gl - 1e-6);
    var beat = easeOut(clamp01((fr - 0.75) / 0.25));
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1 + 0.4 * beat, 1 + 0.4 * beat);
    ctx.fillStyle = '#ff5a1f';
    ctx.strokeStyle = '#fff3c4'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 34px ' + FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(sec), 0, 2);
    ctx.restore();
  };

  Renderer.prototype.drawHammers = function (ctx, t) {
    var g = this.game;
    if (g.state !== 'playing' && g.state !== 'intro') return;
    var mode = g.state === 'playing' ? g.hammer.mode(t) : 'normal';
    var self = this;
    var lastMouseSwing = null;
    g.fx.forEach(function (f) {
      if (f.type !== 'swing') return;
      var k = t - f.t0;
      if (f.source === 'mouse') { if (!lastMouseSwing || f.t0 > lastMouseSwing.t0) lastMouseSwing = f; return; }
      if (k > 0.3) return;
      // 鍵盤／觸控：只有敲擊時出現
      var p = f.slot !== null && f.source === 'key' ? self.grid.slotCenter(f.slot) : { x: f.x, y: f.y };
      if (p.x === null) return;
      ctx.save();
      ctx.globalAlpha = k > 0.22 ? 1 - (k - 0.22) / 0.08 : 1;
      self.drawHammerAt(ctx, p.x, p.y, swingAngle(k), f.gold ? 'gold' : (g.hammer.isBroken(t) ? 'broken' : 'normal'), t);
      ctx.restore();
    });
    // 滑鼠：跟著游標
    if (this.mouse.inside) {
      var k = lastMouseSwing ? t - lastMouseSwing.t0 : 99;
      var ang = mode === 'broken' ? ANG_RAISED + 0.5 : swingAngle(k);
      var breakArt = asset('hammerCracked') && asset('hammerBurst') && asset('hammerShards') && asset('hammer');
      if (mode === 'broken' && breakArt) {
        // v0.1.2：爆開與碎片在敲擊位置播放；最後 0.25 秒槌子重新充氣長回來
        var kb2 = t - g.hammer.brokenAt, BF2 = C.BREAK_FX;
        var since = kb2 - (C.BREAK_DURATION - BF2.reinflate);
        if (since > 0) {
          var gr = easeOutBack(since / BF2.reinflate);
          ctx.save();
          ctx.globalAlpha = clamp01(since / BF2.reinflate * 1.5);
          var Lr = this.hammerLength();
          var pxr = this.mouse.x - Lr * Math.cos(ANG_STRIKE), pyr = this.mouse.y - Lr * Math.sin(ANG_STRIKE);
          drawHammerImageAt(ctx, asset('hammer'), pxr + Lr * Math.cos(ANG_RAISED), pyr + Lr * Math.sin(ANG_RAISED), Lr, ANG_RAISED, 0.45 + 0.55 * gr);
          ctx.restore();
        }
      } else {
        this.drawHammerAt(ctx, this.mouse.x, this.mouse.y, ang, mode, t);
      }
      if (mode === 'broken') this.drawRepairBadge(ctx, this.mouse.x + 50, this.mouse.y + 50, t);
      if (mode === 'gold' && g.hammer.goldLeft(t) <= 3) this.drawGoldBadge(ctx, this.mouse.x + 52, this.mouse.y + 52, t);
    }
  };

  /* =================== v0.1.4：畫面中上方無敵槌倒數 ===================
   * 只在「真的取得金槌、且還在有效時間內」顯示；沒取得就完全不畫。
   * remaining = 固定結束時間（17 / 30）− 遊戲時間；顯示 Math.ceil(remaining)。
   * 與倒數提示音用同一個遊戲時鐘：剩 3、2、1 秒的跳動和提示音同一刻發生，暫停時一起凍結。 */
  Renderer.prototype.drawGoldCountdown = function (ctx, t) {
    var g = this.game, h = g.hammer;
    if (g.state !== 'playing' || !h.isGold(t)) return;
    var rem = h.goldUntil - t;
    if (rem <= 1e-6) return;
    var n = Math.ceil(rem - 1e-6);
    var cols = C.GOLD_HUD_COLORS;
    var col = n <= 3 ? cols[n] : cols.normal;
    var fr = rem - Math.floor(rem - 1e-6);                       // 剛跨過整數秒時接近 1
    var beat = n <= 3 ? easeOut(clamp01((fr - 0.75) / 0.25)) : 0;
    var compact = this.grid.compact;
    var cx = this.grid.grid.x + this.grid.grid.w / 2;
    var bw = compact ? 300 : 264, bh = compact ? 98 : 92, y0 = compact ? 3 : 6;
    ctx.save();
    // 半透明深色底＋柔和金色外光
    ctx.shadowColor = 'rgba(255,205,60,0.55)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = 'rgba(28,14,64,0.62)';
    roundRect(ctx, cx - bw / 2, y0, bw, bh, 18); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 3;
    ctx.strokeStyle = n <= 3 ? col : 'rgba(255,210,63,0.8)';
    roundRect(ctx, cx - bw / 2, y0, bw, bh, 18); ctx.stroke();
    // 上方小字
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = '800 ' + (compact ? 20 : 17) + 'px ' + FONT;
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText('無敵槌剩餘時間', cx, y0 + (compact ? 23 : 21));
    // 大型數字（最後 3 秒每秒輕微放大再恢復）
    var fs = compact ? 64 : 56;
    var baseY = y0 + bh - (compact ? 7 : 8);
    ctx.translate(cx, baseY - fs * 0.35);
    var sc = 1 + 0.2 * beat;
    ctx.scale(sc, sc);
    ctx.font = '900 ' + fs + 'px ' + FONT;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 9; ctx.strokeStyle = '#2a0e4a';
    ctx.strokeText(String(n), 0, fs * 0.35);
    ctx.shadowColor = col; ctx.shadowBlur = 16;
    ctx.fillStyle = col;
    ctx.fillText(String(n), 0, fs * 0.35);
    ctx.restore();
  };

  /* =================== 左側 HUD =================== */
  Renderer.prototype.drawHudLeft = function (ctx, t, vt) {
    var g = this.game, W0 = this.grid.sideW;
    var x = 22, w = W0 - 44;
    ctx.save();
    ctx.fillStyle = 'rgba(70,40,120,0.86)';
    roundRect(ctx, 12, 12, W0 - 24, WAM.VIEW_H - 24, 22); ctx.fill();

    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffe680';
    ctx.font = '900 40px ' + FONT;
    ctx.fillText(C.TITLE, x + 8, 66, w - 8);   // v0.1.3：正式名稱，移除「暫名」與副標題
    ctx.translate(0, -28);                       // 副標題原本佔的高度收回，下方資訊整體上移

    // 分數
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    roundRect(ctx, x, 116, w, 108, 16); ctx.fill();
    ctx.fillStyle = '#e6dbff'; ctx.font = '700 20px ' + FONT;
    ctx.fillText('分數', x + 16, 146);
    ctx.fillStyle = '#ffffff'; ctx.font = '900 62px ' + FONT;
    ctx.fillText(String(g.scoring.score), x + 16, 206);

    // 時間
    var left = Math.max(0, C.GAME_DURATION - t);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    roundRect(ctx, x, 238, w, 108, 16); ctx.fill();
    ctx.fillStyle = '#e6dbff'; ctx.font = '700 20px ' + FONT;
    ctx.fillText('剩餘秒數', x + 16, 268);
    ctx.fillStyle = left <= 3 && g.state === 'playing' ? '#ff8a8a' : '#ffffff';
    ctx.font = '900 54px ' + FONT;
    ctx.fillText(left.toFixed(1), x + 16, 322);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    roundRect(ctx, x + 16, 330, w - 32, 8, 4); ctx.fill();
    ctx.fillStyle = '#7ee08a';
    roundRect(ctx, x + 16, 330, (w - 32) * (left / C.GAME_DURATION), 8, 4); ctx.fill();

    // 槌子狀態
    var mode = g.state === 'playing' ? g.hammer.mode(t) : 'normal';
    var boxCol = mode === 'broken' ? 'rgba(231,76,60,0.9)' : mode === 'gold' ? 'rgba(255,200,40,0.95)' : 'rgba(255,255,255,0.12)';
    ctx.fillStyle = boxCol;
    roundRect(ctx, x, 360, w, 128, 16); ctx.fill();
    ctx.fillStyle = mode === 'gold' ? '#5a3c00' : '#ffffff';
    ctx.font = '700 20px ' + FONT;
    ctx.fillText('氣球槌', x + 16, 390);
    ctx.font = '900 30px ' + FONT;
    if (mode === 'broken') {
      var rl = g.hammer.repairLeft(t);
      ctx.fillText('爆裂！修復中', x + 16, 430);
      ctx.font = '800 22px ' + FONT;
      ctx.fillText('剩 ' + rl.toFixed(1) + ' 秒自動充氣', x + 16, 462);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      roundRect(ctx, x + 16, 470, w - 32, 8, 4); ctx.fill();
      ctx.fillStyle = '#fff';
      roundRect(ctx, x + 16, 470, (w - 32) * (1 - rl / C.BREAK_DURATION), 8, 4); ctx.fill();
    } else if (mode === 'gold') {
      var gl = g.hammer.goldLeft(t);
      if (gl <= 3) {
        // v0.1.3：最後 3 秒警示——橘紅閃動底色＋大字倒數，每秒跳一下（跟遊戲時鐘，暫停時不動）
        var sec = Math.ceil(gl - 1e-6), fr = gl - Math.floor(gl - 1e-6);
        var beat = easeOut(clamp01((fr - 0.75) / 0.25));
        ctx.fillStyle = 'rgba(255,' + Math.round(90 + 60 * (1 - beat)) + ',30,0.96)';
        roundRect(ctx, x, 360, w, 128, 16); ctx.fill();
        ctx.save();
        ctx.translate(x + w - 52, 438);
        var sc = 1 + 0.45 * beat;
        ctx.scale(sc, sc);
        ctx.textAlign = 'center';
        ctx.font = '900 76px ' + FONT;
        ctx.lineWidth = 8; ctx.strokeStyle = '#7a1a00';
        ctx.strokeText(String(sec), 0, 26);
        ctx.fillStyle = '#fff6c4';
        ctx.fillText(String(sec), 0, 26);
        ctx.restore();
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 20px ' + FONT;
        ctx.fillText('氣球槌', x + 16, 390);
        ctx.font = '900 30px ' + FONT;
      }
      ctx.fillText('金色無敵槌', x + 16, 430);
      ctx.font = '800 22px ' + FONT;
      ctx.fillText('無敵剩 ' + gl.toFixed(1) + ' 秒', x + 16, 462);
      var total = g.hammer.goldUntil - g.hammer.goldFrom;
      ctx.fillStyle = 'rgba(90,60,0,0.25)';
      roundRect(ctx, x + 16, 470, w - 32, 8, 4); ctx.fill();
      ctx.fillStyle = '#5a3c00';
      roundRect(ctx, x + 16, 470, (w - 32) * (total > 0 ? gl / total : 0), 8, 4); ctx.fill();
    } else {
      ctx.fillText('正常', x + 16, 430);
      ctx.font = '600 18px ' + FONT;
      ctx.fillStyle = '#e6dbff';
      ctx.fillText(asset('hammer') ? '派對島氣球槌' : '黃色＋紫色氣球槌', x + 16, 462);
    }

    // 提示（金環 / Boss）——放在側欄，不蓋住九宮格
    var msgY = 528;
    if (g.state === 'playing') {
      var ring = g.rings.activeAt(t);
      if (ring && Math.floor(vt * 3) % 2 === 0) {
        ctx.fillStyle = '#ffe36b'; ctx.font = '900 24px ' + FONT;
        ctx.fillText('★ 金環出現！', x + 8, msgY);
      }
      if (t >= C.BOSS_START && t < C.BOSS_START + 1.6) {
        var flash = Math.floor((t - C.BOSS_START) * 8) % 2 === 0;
        ctx.fillStyle = flash ? '#ff5a3c' : '#ffb199';
        roundRect(ctx, x, msgY + 16, w, 54, 12); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '900 28px ' + FONT;
        ctx.fillText('⚠ 橘子王登場！', x + 16, msgY + 54);
      }
    }

    // 目標辨識（只列名稱，不教規則）
    var ly = 640;
    ctx.fillStyle = '#e6dbff'; ctx.font = '700 17px ' + FONT;
    ctx.fillText('場上目標', x + 8, ly);
    var items = [['scorpion', '蠍子怪'], ['orange', '橘子怪'], ['spike', '尖刺']];
    for (var i = 0; i < items.length; i++) {
      var ix = x + 30 + i * ((w - 20) / 3), iy = ly + 50;
      ctx.save(); ctx.translate(ix, iy);
      var ls = spriteFor(items[i][0], false);
      if (ls) { ctx.translate(0, 24); drawSprite(ctx, ls, items[i][0] === 'orange' ? 50 : 60, 0); }
      else drawCharacter(ctx, items[i][0], 20, t, false);
      ctx.restore();
      ctx.fillStyle = '#fff'; ctx.font = '600 15px ' + FONT; ctx.textAlign = 'center';
      ctx.fillText(items[i][1], ix, iy + 46);
      ctx.textAlign = 'left';
    }
    ctx.fillStyle = 'rgba(230,219,255,0.75)'; ctx.font = '500 14px ' + FONT;
    var help = this.grid.compact ? ['直接點洞口敲擊'] : ['滑鼠：點洞口', '鍵盤：QWE / ASD / ZXC', '數字鍵：789 / 456 / 123'];
    help.forEach(function (s, j) { ctx.fillText(s, x + 8, 780 + j * 22); });
    ctx.fillStyle = 'rgba(230,219,255,0.5)'; ctx.font = '500 12px ' + FONT;
    ctx.fillText(C.VERSION, x + 8, WAM.VIEW_H - 30);
    ctx.restore();
  };

  /* =================== 右側：測試資訊 =================== */
  Renderer.prototype.drawRightPanel = function (ctx, t) {
    var g = this.game, W0 = this.grid.sideW;
    var x0 = WAM.VIEW_W - W0 + 12, w = W0 - 24;
    ctx.save();
    if (!this.debug) { ctx.restore(); return; }
    ctx.fillStyle = 'rgba(20,24,40,0.86)';
    roundRect(ctx, x0, 12, w, WAM.VIEW_H - 24, 18); ctx.fill();
    var x = x0 + 16, y = 44, lh = 24, compact = this.grid.compact;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd84a'; ctx.font = '800 18px ' + FONT;
    ctx.fillText('測試資訊（開發用）', x, y); y += lh + 4;
    var line = function (label, val, col) {
      ctx.fillStyle = '#9fb0d0'; ctx.font = '600 15px ' + FONT;
      ctx.fillText(label, x, y);
      ctx.fillStyle = col || '#ffffff'; ctx.font = '700 ' + (compact ? 13 : 15) + 'px ' + MONO;
      ctx.fillText(val, x + (compact ? 80 : 92), y, w - (compact ? 96 : 108));
      y += lh;
    };
    var rh = WAM.Schedule.rhythmAt(Math.min(t, 26.999));
    var per = g.periodAt(t);
    line('經過秒數', t.toFixed(2) + ' s');
    line('配額時段', per.label);
    line('節奏', t >= C.BOSS_START ? 'Boss 專屬階段' : (rh.label + ' 停留' + rh.dwell + 's'));
    var cur = g.state === 'playing' ? g.active.filter(function (a) { return a.hitAt === null && a.s <= t && t < a.e; }).length : 0;
    line('同時目標', cur + (t < C.BOSS_START ? '（上限 ' + rh.maxConcurrent + '）' : ''));
    line('隨機種子', String(g.seed), '#7fe0ff');
    line('排程嘗試', g.schedule.attempts + ' 次');
    y += 6;
    ctx.fillStyle = '#ffd84a'; ctx.font = '800 15px ' + FONT;
    ctx.fillText('已出現 / 配額    蠍     橘     刺', x, y); y += lh;
    var tot = { scorpion: 0, orange: 0, spike: 0 };
    C.PERIODS.forEach(function (p) {
      var s = g.spawned[p.id];
      ['scorpion', 'orange', 'spike'].forEach(function (ty) { tot[ty] += s[ty]; });
      var done = s.scorpion === p.quota.scorpion && s.orange === p.quota.orange && s.spike === p.quota.spike;
      ctx.fillStyle = per.id === p.id ? '#ffe680' : '#9fb0d0'; ctx.font = '600 14px ' + FONT;
      ctx.fillText(p.label, x, y);
      ctx.fillStyle = done ? '#7ee08a' : '#ffffff'; ctx.font = '700 14px ' + MONO;
      ctx.fillText(pad(s.scorpion + '/' + p.quota.scorpion) + pad(s.orange + '/' + p.quota.orange) + pad(s.spike + '/' + p.quota.spike), x + 96, y);
      y += 22;
    });
    var allDone = tot.scorpion === 30 && tot.orange === 12 && tot.spike === 8;
    ctx.fillStyle = '#9fb0d0'; ctx.font = '700 14px ' + FONT;
    ctx.fillText('合計', x, y);
    ctx.fillStyle = allDone ? '#7ee08a' : '#ffffff'; ctx.font = '700 14px ' + MONO;
    ctx.fillText(pad(tot.scorpion + '/30') + pad(tot.orange + '/12') + pad(tot.spike + '/8'), x + 96, y);
    y += lh + 6;

    g.rings.rings.forEach(function (r) {
      line('金環' + r.id, C.KEY_LABELS[r.hole] + ' 洞・' + g.rings.status(r, t), r.takenAt !== null ? '#ffe36b' : '#ffffff');
    });
    var mode = g.hammer.mode(t);
    var mtxt = mode === 'broken' ? '爆裂 修復剩' + g.hammer.repairLeft(t).toFixed(2) + 's'
      : mode === 'gold' ? '金槌 剩' + g.hammer.goldLeft(t).toFixed(2) + 's（至' + g.hammer.goldUntil + 's）' : '普通';
    line('槌子', mtxt, mode === 'broken' ? '#ff8a8a' : mode === 'gold' ? '#ffe36b' : '#ffffff');
    line('爆槌次數', String(g.hammer.breakCount));
    line('星靈提醒', g.spiritUsed + ' / ' + C.SPIRIT_MAX_REMINDERS);
    line('Boss 命中', String(g.boss.hits));
    line('空敲', String(g.scoring.counts.empty));
    line('擋下', '過快' + g.rejected.tooFast + '・爆槌中' + g.rejected.broken);
    if (g.lastResult) line('上一擊', g.lastResult.outcome + ' @' + g.lastResult.t.toFixed(2) + ' (' + g.lastResult.source + ')');
    if (WAM.Assets) {
      var ar = WAM.Assets.report(), ak = Object.keys(ar), okN = ak.filter(function (k) { return ar[k] === 'ok'; }).length;
      var bad = ak.filter(function (k) { return ar[k] === 'failed'; });
      line('圖片素材', okN + '/' + ak.length + (bad.length ? '（' + bad.length + ' 張失敗→幾何備援）' : ''), bad.length ? '#ff8a8a' : '#7ee08a');
    }
    if (WAM.Audio) {
      var au = WAM.Audio.report(), sk = Object.keys(au.sfx);
      var sOk = sk.filter(function (k) { return au.sfx[k] === 'ok' || au.sfx[k] === 'html' || au.sfx[k] === 'fetched'; }).length;
      line('音訊', au.ctx + '・音效' + sOk + '/' + sk.length + '・BGM ' + au.bgm);
    }
    ctx.fillStyle = '#6f7d99'; ctx.font = '500 12px ' + FONT;
    ctx.fillText('按 ` 鍵可隱藏／顯示測試資訊', x, WAM.VIEW_H - 140);
    ctx.restore();
  };
  function pad(s) { s = String(s); while (s.length < 6) s += ' '; return s; }

  WAM.Renderer = Renderer;
  WAM.drawCharacter = drawCharacter;
})(typeof window !== 'undefined' ? window : globalThis);

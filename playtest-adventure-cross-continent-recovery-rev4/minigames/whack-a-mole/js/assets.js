/* =========================================================
 * assets.js — 圖片素材載入（v0.1.1）
 * - 依 CONFIG.ASSET_BASES 依序嘗試路徑
 * - 載入失敗：該素材標記為 failed，畫面自動改用原型幾何圖形
 * - 載入中也能玩（先畫幾何圖形，載好自動換圖）
 * ========================================================= */
(function (W) {
  'use strict';
  var WAM = W.WAM;
  var C = WAM.CONFIG;

  var images = {};   // key -> { img, status: 'loading'|'ok'|'failed', src, def }

  function loadOne(key, def) {
    var entry = { img: null, status: 'loading', src: null, def: def };
    images[key] = entry;
    var bases = C.ASSET_BASES;
    var i = 0;
    function tryNext() {
      if (i >= bases.length) { entry.status = 'failed'; return; }
      var src = bases[i++] + def.path;
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () {
        if (!img.naturalWidth) { tryNext(); return; }
        entry.img = img; entry.src = src;
        makeCache(entry);
        entry.status = 'ok';
        if (key === 'hammer') buildGoldHammer(entry);
      };
      img.onerror = tryNext;
      img.src = src;
    }
    tryNext();
  }

  // 大圖顯示副本：只是縮小解析度，不改內容；失敗就直接用原圖
  function makeCache(entry) {
    var img = entry.img, cw = entry.def.cacheW;
    entry.draw = img; entry.k = 1;
    if (!cw || img.naturalWidth <= cw) return;
    try {
      var k = cw / img.naturalWidth;
      var cv = document.createElement('canvas');
      cv.width = Math.round(img.naturalWidth * k);
      cv.height = Math.round(img.naturalHeight * k);
      var c = cv.getContext('2d');
      c.imageSmoothingEnabled = true;
      c.imageSmoothingQuality = 'high';
      c.drawImage(img, 0, 0, cv.width, cv.height);
      entry.draw = cv; entry.k = cv.width / img.naturalWidth;
    } catch (e) { entry.draw = img; entry.k = 1; }
  }
  // 以「原圖像素座標」繪製（自動換算到顯示副本）
  function blit(ctx, e, sx, sy, sw, sh, dx, dy, dw, dh) {
    var k = e.k || 1;
    ctx.drawImage(e.draw || e.img, sx * k, sy * k, sw * k, sh * k, dx, dy, dw, dh);
  }

  // 金色氣球槌：沒有獨立金色圖片 → 用原圖 + 程式金色濾鏡（不改原檔、不改外型）
  function buildGoldHammer(entry) {
    try {
      var img = entry.img;
      var cv = document.createElement('canvas');
      cv.width = img.naturalWidth; cv.height = img.naturalHeight;
      var c = cv.getContext('2d');
      c.drawImage(img, 0, 0);
      c.globalCompositeOperation = 'source-atop';
      var g = c.createLinearGradient(0, 0, cv.width, cv.height);
      g.addColorStop(0, 'rgba(255,246,170,0.62)');
      g.addColorStop(0.5, 'rgba(255,205,40,0.66)');
      g.addColorStop(1, 'rgba(214,150,0,0.7)');
      c.fillStyle = g;
      c.fillRect(0, 0, cv.width, cv.height);
      entry.gold = cv;
    } catch (e) { entry.gold = null; }
  }

  function loadAll() {
    Object.keys(C.IMAGES).forEach(function (k) { loadOne(k, C.IMAGES[k]); });
  }

  function get(key) {
    var e = images[key];
    return e && e.status === 'ok' ? e : null;
  }

  function report() {
    var out = {};
    Object.keys(images).forEach(function (k) { out[k] = images[k].status; });
    return out;
  }

  WAM.Assets = { loadAll: loadAll, get: get, report: report, images: images, blit: blit };
})(window);

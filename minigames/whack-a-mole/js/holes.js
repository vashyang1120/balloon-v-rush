/* =========================================================
 * holes.js — 九宮格洞口管理（版面配置＋有效敲擊區域）
 *
 * 畫面邏輯尺寸固定 1600×900（16:9），整張畫布等比縮放到螢幕。
 * - 有效敲擊區域：九個「大小完全相同」的格子，整格都能敲
 * - 視覺洞口：在格子內做輕微透視（上排略小、略往中間靠）
 * - 手機（觸控）版：九宮格放大、側邊資訊欄變窄
 * ========================================================= */
(function (W) {
  'use strict';
  var WAM = W.WAM;

  var VIEW_W = 1600, VIEW_H = 900;
  var ROW_SCALE = [0.84, 0.92, 1.0];
  var ROW_SPREAD = [0.86, 0.93, 1.0];

  function HoleGrid() { this.setMode(false); }

  HoleGrid.prototype.setMode = function (compact) {
    this.compact = !!compact;
    var gw = compact ? 1010 : 900;
    var gh = compact ? 872 : 834;
    var gx = (VIEW_W - gw) / 2;
    var gy = VIEW_H - gh - (compact ? 10 : 18);
    this.grid = { x: gx, y: gy, w: gw, h: gh };
    this.sideW = gx;
    var cw = gw / 3, ch = gh / 3;
    this.cellW = cw; this.cellH = ch;
    var cxMid = gx + gw / 2;
    this.cells = [];
    for (var i = 0; i < 9; i++) {
      var r = Math.floor(i / 3), c = i % 3;
      var sc = ROW_SCALE[r];
      var cx = cxMid + (c - 1) * cw * ROW_SPREAD[r];
      var cy = gy + ch * r + ch * 0.74;
      var rx = cw * 0.37 * sc;
      this.cells.push({
        index: i, row: r, col: c,
        // 有效敲擊區域（九格同尺寸）
        hit: { x: gx + c * cw, y: gy + r * ch, w: cw, h: ch },
        // 視覺洞口
        cx: cx, cy: cy, rx: rx, ry: rx * 0.33, scale: sc,
        charR: cw * 0.25 * sc
      });
    }
    // Boss 專用大型洞口（中央）與有效敲擊區域：
    // 寬度不碰到四個角落的金環，高度跨越三排
    var center = this.cells[4];
    this.boss = {
      cx: center.cx,
      cy: gy + ch * 2.05,
      rx: cw * 0.62,
      ry: cw * 0.62 * 0.3,
      bodyR: cw * 0.56,
      hit: { x: gx + cw * 0.86, y: gy + ch * 0.45, w: cw * 1.28, h: ch * 2.0 }
    };
  };

  function inRect(r, x, y) { return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h; }

  // 回傳 0~8、'boss' 或 null（點到九宮格外）
  HoleGrid.prototype.hitTest = function (x, y, bossPhase) {
    if (bossPhase && inRect(this.boss.hit, x, y)) return 'boss';
    for (var i = 0; i < 9; i++) if (inRect(this.cells[i].hit, x, y)) return i;
    return null;
  };

  // 鍵盤：Boss 戰時中央鍵（S / 5）直接攻擊橘子王
  HoleGrid.prototype.slotFromKeyIndex = function (idx, bossPhase) {
    if (bossPhase && idx === 4) return 'boss';
    return idx;
  };

  HoleGrid.prototype.slotCenter = function (slot) {
    if (slot === 'boss') return { x: this.boss.cx, y: this.boss.cy - this.boss.bodyR * 0.9 };
    var c = this.cells[slot];
    return { x: c.cx, y: c.cy - c.charR * 1.0 };
  };

  WAM.VIEW_W = VIEW_W;
  WAM.VIEW_H = VIEW_H;
  WAM.HoleGrid = HoleGrid;
})(typeof window !== 'undefined' ? window : globalThis);

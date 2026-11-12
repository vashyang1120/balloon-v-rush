/* =========================================================
 * spirit.js — 星靈對話框（原型用簡單圖示＋對話框模擬）
 * 正式版改接冒險主線的星靈 RPG 對話系統。
 * 暫停規則在 game.js（openSpirit / closeSpirit）。
 * ========================================================= */
(function (W) {
  'use strict';
  var WAM = W.WAM;

  function SpiritView(root) {
    this.root = root;
    this.textEl = root.querySelector('.spirit-text');
    this.btn = root.querySelector('.spirit-btn');
    this.icon = root.querySelector('.spirit-icon');
    this.img = root.querySelector('.spirit-img');
    this.onClose = null;
    this.openedAt = 0;
    var self = this;
    this.btn.addEventListener('click', function (e) { e.preventDefault(); self.close(); });
    // 點對話框任何地方也能關閉（避免手機玩家找不到按鈕）
    root.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    root.querySelector('.spirit-box').addEventListener('click', function (e) {
      if (e.target !== self.btn) self.close();
    });
    W.addEventListener('keydown', function (e) {
      if (!self.isOpen()) return;
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter' || e.code === 'Escape') {
        e.preventDefault();
        if (!e.repeat) self.close();
      }
    });
  }
  SpiritView.prototype.isOpen = function () { return !this.root.classList.contains('hidden'); };
  // face：'spiritNormal'（開場）/ 'spiritAngry'（爆槌提醒）——冒險主線星靈立繪
  SpiritView.prototype.open = function (text, btnLabel, onClose, face) {
    this.face = face || 'spiritNormal';
    this.refreshFace();
    this.textEl.textContent = text;
    this.btn.textContent = btnLabel || '知道了 ▶';
    this.onClose = onClose;
    this.openedAt = performance.now();
    this.root.classList.remove('hidden');
  };
  // 立繪還在載入時先顯示 ✦，載好就換上（main.js 每幀呼叫）；載入失敗就一直用 ✦
  SpiritView.prototype.refreshFace = function () {
    if (!WAM.Assets) return;
    var e = WAM.Assets.get(this.face) || WAM.Assets.get('spiritNormal');
    if (e) {
      if (this.img.getAttribute('src') !== e.src) this.img.src = e.src;
      this.icon.classList.add('has-img');
    } else {
      this.icon.classList.remove('has-img');
    }
  };
  SpiritView.prototype.close = function () {
    if (!this.isOpen()) return;
    // 剛跳出 0.25 秒內不收，避免玩家連點時誤關、沒看到台詞
    if (performance.now() - this.openedAt < 250) return;
    this.root.classList.add('hidden');
    var cb = this.onClose;
    this.onClose = null;
    if (cb) cb(performance.now());
  };

  WAM.SpiritView = SpiritView;
})(typeof window !== 'undefined' ? window : globalThis);

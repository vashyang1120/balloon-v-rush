/* =========================================================
 * input.js — 滑鼠／鍵盤／觸控 輸入
 * 三種輸入都只做「轉成敲擊請求」，判定全部交給 game.requestHit()。
 * - 只在「按下」那一刻觸發，按住／長按不會連打
 * - 鍵盤忽略自動重複（e.repeat）
 * - 多指觸控每根手指都要通過同一個 0.1 秒全域間隔
 * ========================================================= */
(function (W) {
  'use strict';
  var WAM = W.WAM;
  var C = WAM.CONFIG;

  // onResult：敲擊結果回呼（v0.1.1 用來播音效；不影響判定）
  function Input(canvas, game, renderer, onResult) {
    var report = function (res) { if (onResult) { try { onResult(res); } catch (e) {} } };
    this.canvas = canvas;
    this.game = game;
    this.renderer = renderer;
    var self = this;

    function toLogical(e) {
      var r = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) / r.width * WAM.VIEW_W,
        y: (e.clientY - r.top) / r.height * WAM.VIEW_H
      };
    }

    canvas.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      var p = toLogical(e);
      if (e.pointerType === 'mouse') {
        renderer.mouse.x = p.x; renderer.mouse.y = p.y; renderer.mouse.inside = true;
      }
      var source = e.pointerType === 'mouse' ? 'mouse' : (e.pointerType === 'pen' ? 'touch' : 'touch');
      report(game.requestHit({ kind: 'point', x: p.x, y: p.y }, source, performance.now()));
    }, { passive: false });

    canvas.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var p = toLogical(e);
      renderer.mouse.x = p.x; renderer.mouse.y = p.y; renderer.mouse.inside = true;
    });
    canvas.addEventListener('pointerleave', function (e) {
      if (e.pointerType === 'mouse') renderer.mouse.inside = false;
    });
    // 觸控時不要顯示「滑鼠槌」
    canvas.addEventListener('touchstart', function (e) { e.preventDefault(); renderer.mouse.inside = false; }, { passive: false });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    canvas.addEventListener('dblclick', function (e) { e.preventDefault(); });

    W.addEventListener('keydown', function (e) {
      if (!(e.code in C.KEY_MAP)) return;
      e.preventDefault();
      if (e.repeat) return; // 按住不放不連打
      report(game.requestHit({ kind: 'key', index: C.KEY_MAP[e.code] }, 'key', performance.now()));
    });
  }

  WAM.Input = Input;
})(typeof window !== 'undefined' ? window : globalThis);

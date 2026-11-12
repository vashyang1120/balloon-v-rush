/* =========================================================
 * audio.js — 音效與 BGM（v0.1.1）
 * - 音效：Web Audio，每個檔案只下載／解碼一次；播放只建立輕量節點，不阻塞遊戲
 * - 每個音效有最短間隔與同時上限，全部音效另有總上限 → 連打不會無限疊加
 *   （限制只影響聲音，得分完全由 game.js 判定）
 * - 手機：第一次觸控／按鍵後才啟動音訊（瀏覽器規範）
 * - BGM：全域只有一個 <audio>，不會產生多個播放實例
 * - 任何檔案載入失敗：安靜略過，遊戲照常
 * ========================================================= */
(function (W) {
  'use strict';
  var WAM = W.WAM;
  var C = WAM.CONFIG;
  var A = C.AUDIO;
  var IS_FILE = location.protocol === 'file:';

  var ctx = null, master = null;
  var raw = {}, buffers = {}, html = {}, status = {};
  var lastPlay = {}, voices = {}, totalVoices = 0;
  var bgm = { el: null, gain: null, node: null, src: null, wanted: false, fadeToken: 0, status: 'idle' };

  function fetchFirst(path, onOk, onFail) {
    var bases = C.ASSET_BASES, i = 0;
    function next() {
      if (i >= bases.length) { onFail(); return; }
      var src = bases[i++] + path;
      fetch(src).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.arrayBuffer();
      }).then(function (ab) { onOk(ab, src); }, next);
    }
    if (!W.fetch || IS_FILE) { onFail(); return; }
    next();
  }

  // file:// 無法 fetch → 改用 <audio>（只在本機雙擊開啟時用到）
  function htmlFallback(key, def) {
    var bases = C.ASSET_BASES, i = 0;
    function next() {
      if (i >= bases.length) { status[key] = 'failed'; return; }
      var el = new Audio();
      el.preload = 'auto';
      el.addEventListener('canplaythrough', function ok() {
        el.removeEventListener('canplaythrough', ok);
        html[key] = [el, el.cloneNode()];
        status[key] = 'html';
      });
      el.addEventListener('error', next, { once: true });
      el.src = bases[i++] + def.path;
      el.load();
    }
    next();
  }

  function decode(key) {
    if (!ctx || !raw[key] || buffers[key]) return;
    var ab = raw[key];
    raw[key] = null;
    try {
      ctx.decodeAudioData(ab, function (buf) { buffers[key] = buf; status[key] = 'ok'; },
        function () { status[key] = 'failed'; });
    } catch (e) { status[key] = 'failed'; }
  }

  function preload() {
    Object.keys(A.SFX).forEach(function (key) {
      status[key] = 'loading';
      fetchFirst(A.SFX[key].path, function (ab) {
        raw[key] = ab; status[key] = 'fetched'; decode(key);
      }, function () { htmlFallback(key, A.SFX[key]); });
    });
    // BGM：單一 <audio> 串流
    var el = new Audio();
    el.loop = true;
    el.preload = 'auto';
    var bases = C.ASSET_BASES, i = 0;
    function nextBgm() {
      if (i >= bases.length) { bgm.status = 'failed'; return; }
      bgm.src = bases[i++] + A.BGM.path;
      el.src = bgm.src;
      el.load();
    }
    el.addEventListener('error', nextBgm);
    el.addEventListener('canplay', function () { if (bgm.status !== 'ok') bgm.status = 'ok'; });
    bgm.el = el;
    bgm.status = 'loading';
    nextBgm();
  }

  function unlock() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    var AC = W.AudioContext || W.webkitAudioContext;
    if (!AC) return;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 1;
      master.connect(ctx.destination);
      // 手機 Safari：播一個無聲 buffer 完成解鎖
      var b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource();
      s.buffer = b; s.connect(master); s.start(0);
      Object.keys(raw).forEach(decode);
      // BGM 音量走 Web Audio（iOS 不吃 el.volume）；file:// 不接，避免被瀏覽器靜音
      if (!IS_FILE && bgm.el && ctx.createMediaElementSource) {
        try {
          bgm.node = ctx.createMediaElementSource(bgm.el);
          bgm.gain = ctx.createGain();
          bgm.gain.gain.value = 0;
          bgm.node.connect(bgm.gain);
          bgm.gain.connect(master);
        } catch (e) { bgm.node = null; bgm.gain = null; }
      }
    } catch (e) { ctx = null; }
  }

  function play(key) {
    var def = A.SFX[key];
    if (!def) return;
    var now = performance.now();
    if (lastPlay[key] && now - lastPlay[key] < (def.minGapMs || 0)) return;
    if ((voices[key] || 0) >= (def.maxVoices || 2)) return;
    if (totalVoices >= A.SFX_MAX_VOICES) return;
    try {
      if (ctx && buffers[key]) {
        if (ctx.state === 'suspended') ctx.resume();
        var src = ctx.createBufferSource();
        src.buffer = buffers[key];
        var g = ctx.createGain();
        g.gain.value = def.vol;
        src.connect(g); g.connect(master);
        var off = def.offset || 0;
        if (def.duration) {
          // 截一小段時，最後 0.08 秒淡出避免爆音
          var t0 = ctx.currentTime, end = t0 + def.duration;
          g.gain.setValueAtTime(def.vol, Math.max(t0, end - 0.08));
          g.gain.linearRampToValueAtTime(0, end);
          src.start(0, off, def.duration);
        } else {
          src.start(0, off);
        }
        voices[key] = (voices[key] || 0) + 1; totalVoices++;
        src.onended = function () { voices[key]--; totalVoices--; };
        lastPlay[key] = now;
      } else if (html[key]) {
        var pool = html[key];
        var el = pool[0].paused ? pool[0] : pool[1];
        el.volume = Math.min(1, def.vol);
        el.currentTime = def.offset || 0;
        var p = el.play();
        if (p && p.catch) p.catch(function () {});
        if (def.duration) {
          var tok = (el._tok || 0) + 1; el._tok = tok;
          setTimeout(function () { if (el._tok === tok) el.pause(); }, def.duration * 1000);
        }
        lastPlay[key] = now;
      }
    } catch (e) { /* 音效失敗不影響遊戲 */ }
  }

  /* ---------- BGM ---------- */
  function setBgmVolume(v, rampSec) {
    if (bgm.gain && ctx) {
      var g = bgm.gain.gain, t = ctx.currentTime;
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      if (rampSec) g.linearRampToValueAtTime(v, t + rampSec);
      else g.setValueAtTime(v, t);
    } else if (bgm.el) {
      bgm.el.volume = Math.max(0, Math.min(1, v));
    }
  }
  function bgmStart() { // 遊戲正式開始（在使用者點擊中呼叫）
    if (!bgm.el || bgm.status === 'failed') return;
    bgm.fadeToken++;
    bgm.wanted = true;
    try { bgm.el.currentTime = 0; } catch (e) {}
    setBgmVolume(A.BGM.vol, 0);
    var p = bgm.el.play();
    if (p && p.catch) p.catch(function () {});
  }
  function bgmSetPaused(paused) { // 跟著遊戲暫停狀態（星靈、直拿、切分頁）
    if (!bgm.el || !bgm.wanted) return;
    if (paused && !bgm.el.paused) bgm.el.pause();
    else if (!paused && bgm.el.paused) {
      var p = bgm.el.play();
      if (p && p.catch) p.catch(function () {});
    }
  }
  function bgmFadeOut() { // 30 秒結束
    if (!bgm.el || !bgm.wanted) return;
    bgm.wanted = false;
    var tok = ++bgm.fadeToken;
    setBgmVolume(0, A.BGM.fadeOut);
    setTimeout(function () {
      if (tok === bgm.fadeToken) { bgm.el.pause(); try { bgm.el.currentTime = 0; } catch (e) {} }
    }, A.BGM.fadeOut * 1000 + 60);
  }
  function bgmStop() { // 重新開始
    if (!bgm.el) return;
    bgm.fadeToken++;
    bgm.wanted = false;
    bgm.el.pause();
    try { bgm.el.currentTime = 0; } catch (e) {}
  }

  function setSuspended(on) {
    if (!ctx) return;
    try { if (on) ctx.suspend(); else ctx.resume(); } catch (e) {}
  }

  function report() {
    return {
      ctx: ctx ? ctx.state : 'locked',
      bgm: bgm.status + (bgm.el && !bgm.el.paused ? '・播放中' : ''),
      bgmSrc: bgm.src,
      voices: totalVoices,
      sfx: status
    };
  }

  function bindUnlock() {
    var h = function () { unlock(); };
    ['pointerdown', 'keydown', 'touchend'].forEach(function (ev) {
      W.addEventListener(ev, h, { capture: true, passive: true });
    });
  }

  WAM.Audio = {
    preload: preload, bindUnlock: bindUnlock, play: play,
    bgmStart: bgmStart, bgmSetPaused: bgmSetPaused, bgmFadeOut: bgmFadeOut, bgmStop: bgmStop,
    setSuspended: setSuspended, report: report
  };
})(window);

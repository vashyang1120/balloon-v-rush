'use strict';
// 氣球骰子小遊戲音訊（Revision 5，Batch G）— 第一、第二大陸共用同一份檔案（內容必須逐位元相同，同步檢查會比對）。
//
// 正式時序（G-08）
//   一、星靈邀約：暫停關卡 BGM，播放小遊戲 BGM（與氣球排球、打地鼠同一個檔案）。
//   二、玩家選「是」：小V切換 Heroic 表情 → 播放一次 2-4 金色油管環音效（SFX key ringGet）。
//   三、骰子開始跳動：同時播放一次骰子音效（不循環）。
//   四、骰子音效結束：骰子同時停住、揭曉點數；勝利＝排球勝利音效，敗北＝排球敗北音效，平手不加音效。
//   五、對話結束返回冒險：停止小遊戲 BGM，關卡 BGM 由原本的 sync 機制恢復。
//   選「否」：直接結束小遊戲 BGM，不播 Heroic、不播骰子音效。
//
// 同步依據：正常播放時以 AudioContext 的實際播放時間與 onended 為準；無法播放（靜音以外的失敗：
// 尚未載入、載入失敗、瀏覽器擋播、AudioContext 停住）時，改用已核對的音檔長度作為動畫時間。
// 靜音只把音量設為 0，時間仍跟著音檔走。結算在動畫開始前就已完成（只會結算一次）。
const BALLOON_DICE_AUDIO = {
  bgm: { path: 'minigames/volleyball/assets/audio/bgm/volleyball_game_bgm.mp3', vol: 0.3 },   // 與打地鼠嵌入冒險時相同的音量
  roll: { path: 'assets/audio/sfx/item/balloon_dice_roll.mp3', vol: 0.9, durationMs: 6661 },   // 6.661 s：ffprobe／ffmpeg 解碼核對
  victory: { path: 'minigames/volleyball/assets/audio/victory.mp3', vol: 0.8 },                 // 氣球排球正式版勝利音效（排球設定 0.80）
  defeat: { path: 'minigames/volleyball/assets/audio/defeat.mp3', vol: 0.8 },                   // 氣球排球正式版敗北音效（排球設定 0.80）
  heroicSfxKey: 'ringGet',                                                                      // assets/audio/sfx/item/golden_pipe_ring_get.mp3（collectOrangeKingRing）
  clockSlackMs: 300,   // AudioContext 時鐘停住時，最多落後牆上時鐘這麼多就改用牆上時鐘，動畫不會卡住
};

const balloonDiceAudio = (() => {
  const A = BALLOON_DICE_AUDIO;
  const buffers = {}, loading = {};
  const state = { active: false, phase: 'idle', heroicPlayed: false, resultPlayed: false, bgm: null, bgmWanted: false,
    rollVoice: null, rollEl: null, roll: null, pausedStarTheme: null, log: [] };
  const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  function log(ev, extra) { state.log.push(Object.assign({ ev, t: Math.round(nowMs() * 10) / 10 }, extra || {})); if (state.log.length > 200) state.log.shift(); }
  function urls(path) {
    if (typeof getAssetSourceCandidates === 'function') { try { return getAssetSourceCandidates(path).map(c => c.url); } catch (e) {} }
    return [resolveAdventureAssetSrc(path)];
  }
  function muted() { return typeof SFX !== 'undefined' && !!SFX.muted; }
  function ctx() { return typeof sfxEnsureCtx === 'function' ? sfxEnsureCtx() : null; }
  function load(key) {
    if (buffers[key]) return Promise.resolve(buffers[key]);
    if (loading[key]) return loading[key];
    const c = ctx();
    if (!c || typeof fetch !== 'function') return Promise.resolve(null);
    const list = urls(A[key].path);
    const tryAt = i => i >= list.length ? (log('loadFailed', { key }), null)
      : fetch(list[i]).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
        .then(ab => new Promise((res, rej) => { const p = c.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); }))
        .then(buf => { buffers[key] = buf; log('loaded', { key, durationMs: Math.round(buf.duration * 1000) }); return buf; })
        .catch(() => tryAt(i + 1));
    loading[key] = Promise.resolve(tryAt(0)).finally(() => { delete loading[key]; });
    return loading[key];
  }
  function canPlayCtx() { return typeof sfxCanPlay === 'function' ? sfxCanPlay() : false; }
  function playBuffer(key) {
    const c = ctx(), buf = buffers[key];
    if (!c || !buf || !canPlayCtx()) return null;
    try {
      const src = c.createBufferSource(), g = c.createGain();
      src.buffer = buf; g.gain.value = A[key].vol;
      src.connect(g); g.connect(SFX.master);
      const v = { key, src, g, ended: false, startCtx: c.currentTime };
      src.onended = () => { v.ended = true; };
      src.start(0);
      return v;
    } catch (e) { return null; }
  }
  function stopVoice(v) { if (!v || v.ended) return; try { v.src.onended = null; v.src.stop(); } catch (e) {} v.ended = true; }

  // ── 小遊戲 BGM：同一時間只有一個 <audio> ──
  function bgmEl() {
    if (state.bgm || typeof Audio === 'undefined') return state.bgm;
    const a = new Audio(); a.loop = true; a.preload = 'auto';
    a.addEventListener('error', () => log('bgmError'));
    a.src = urls(A.bgm.path)[0];
    state.bgm = a;
    return a;
  }
  function bgmPlay() {
    const a = bgmEl(); if (!a) return;
    try { a.volume = muted() ? 0 : A.bgm.vol; } catch (e) {}
    if (!a.paused) return;
    try { const p = a.play(); if (p && p.catch) p.catch(err => log('bgmBlocked', { name: err && err.name })); } catch (e) {}
  }
  function bgmStop() { const a = state.bgm; if (!a) return; try { a.pause(); a.currentTime = 0; } catch (e) {} }

  function invite() {
    if (state.active) end('reinvite');
    state.active = true; state.phase = 'invite'; state.heroicPlayed = false; state.resultPlayed = false; state.bgmWanted = true;
    try { if (typeof v396Theme !== 'undefined' && v396Theme.el && !v396Theme.el.paused) { v396Theme.el.pause(); state.pausedStarTheme = v396Theme.el; } } catch (e) {}
    ['roll', 'victory', 'defeat'].forEach(k => { load(k); });
    try { if (typeof sfxLoad === 'function') sfxLoad(A.heroicSfxKey); } catch (e) {}
    bgmPlay();
    log('invite');
  }
  function decline() { log('decline'); end('decline'); }
  function accept() {
    if (!state.active || state.heroicPlayed) return;
    state.heroicPlayed = true; state.phase = 'heroic';
    let played = false;
    try { played = !!(typeof sfxPlay === 'function' && sfxPlay(A.heroicSfxKey)); } catch (e) {}
    log('heroic', { played });
  }
  // 骰子跳動開始：回傳 timing（給骰子動畫用）
  function startRoll() {
    const t0 = nowMs();
    const roll = { t0, mode: 'clock', totalMs: A.roll.durationMs, done: false };
    state.roll = roll; state.phase = 'rolling';
    const v = state.active ? playBuffer('roll') : null;
    if (v) {
      roll.mode = 'webaudio'; roll.voice = v; roll.totalMs = buffers.roll.duration * 1000;
      v.src.onended = () => { v.ended = true; if (state.roll === roll && !roll.done) { roll.audioEndedAt = nowMs(); log('rollAudioEnded'); } };
      state.rollVoice = v;
    } else if (state.active && typeof Audio !== 'undefined') {
      // AudioContext 沒準備好（例如音效檔還在下載）：改用 <audio>，以它的 currentTime 為準
      try {
        const el = new Audio(urls(A.roll.path)[0]); el.volume = muted() ? 0 : A.roll.vol;
        roll.el = el; state.rollEl = el;
        el.addEventListener('ended', () => { if (state.roll === roll && !roll.done) { roll.audioEndedAt = nowMs(); log('rollAudioEnded'); } });
        el.addEventListener('loadedmetadata', () => { if (isFinite(el.duration) && el.duration > 0 && state.roll === roll) roll.totalMs = el.duration * 1000; });
        const p = el.play();
        if (p && p.then) p.then(() => { if (state.roll === roll) { roll.mode = 'element'; } }, err => { log('rollBlocked', { name: err && err.name }); });
      } catch (e) {}
    }
    log('rollStart', { mode: roll.mode, totalMs: Math.round(roll.totalMs) });
    return {
      totalMs: () => roll.totalMs,
      elapsed: () => {
        const wall = nowMs() - t0;
        if (roll.mode === 'webaudio' && roll.voice && SFX.ctx) {
          const audio = (SFX.ctx.currentTime - roll.voice.startCtx) * 1000;
          return Math.max(audio, wall - A.clockSlackMs);
        }
        if (roll.mode === 'element' && roll.el && !roll.el.paused) return Math.max(roll.el.currentTime * 1000, wall - A.clockSlackMs);
        return wall;
      },
      finished: () => !!roll.audioEndedAt,
    };
  }
  // 點數揭曉（動畫結束的那一刻）
  function reveal(outcome) {
    const roll = state.roll;
    if (roll && !roll.done) {
      roll.done = true; roll.revealAt = nowMs();
      // audioMs：揭曉當下，骰子音效在 AudioContext 時鐘上實際播到的位置（onended 事件可能晚一兩幀才送達）
      let audioMs = null;
      try { if (roll.mode === 'webaudio' && roll.voice && SFX.ctx) audioMs = Math.round((SFX.ctx.currentTime - roll.voice.startCtx) * 1000); } catch (e) {}
      try { if (roll.mode === 'element' && roll.el) audioMs = Math.round(roll.el.currentTime * 1000); } catch (e) {}
      log('reveal', { outcome, mode: roll.mode, totalMs: Math.round(roll.totalMs), animMs: Math.round(roll.revealAt - roll.t0), audioMs,
        audioEndedMs: roll.audioEndedAt ? Math.round(roll.audioEndedAt - roll.t0) : null });
      stopVoice(state.rollVoice); state.rollVoice = null;
      if (state.rollEl) { try { state.rollEl.pause(); } catch (e) {} state.rollEl = null; }
    }
    state.phase = 'result';
    if (state.resultPlayed || !state.active) return;
    state.resultPlayed = true;
    if (outcome === 'win' || outcome === 'loss') {
      const v = playBuffer(outcome === 'win' ? 'victory' : 'defeat');
      log('resultSfx', { outcome, played: !!v });
    } else log('resultSfx', { outcome, played: false });
  }
  function end(reason) {
    if (!state.active && state.phase === 'idle') return;
    state.active = false; state.bgmWanted = false; state.phase = 'idle';
    bgmStop();
    stopVoice(state.rollVoice); state.rollVoice = null;
    if (state.rollEl) { try { state.rollEl.pause(); } catch (e) {} state.rollEl = null; }
    if (state.roll && !state.roll.done) state.roll.done = true;
    state.roll = null;
    if (state.pausedStarTheme) { const el = state.pausedStarTheme; state.pausedStarTheme = null; try { if (typeof v395StarActive === 'function' && v395StarActive()) el.play().catch(() => {}); } catch (e) {} }
    log('end', { reason });
  }
  // 每幀：切到背景時暫停小遊戲 BGM，回來後繼續；音量跟著靜音設定
  function sync() {
    if (!state.active || !state.bgm) return;
    const hidden = typeof document !== 'undefined' && document.hidden;
    if (hidden) { try { if (!state.bgm.paused) state.bgm.pause(); } catch (e) {} return; }
    try { state.bgm.volume = muted() ? 0 : A.bgm.vol; } catch (e) {}
    if (state.bgmWanted && state.bgm.paused) bgmPlay();
  }
  function ownsBgm() { return state.active; }
  function debug() {
    return { active: state.active, phase: state.phase, heroicPlayed: state.heroicPlayed, resultPlayed: state.resultPlayed,
      bgm: state.bgm ? { paused: state.bgm.paused, t: +state.bgm.currentTime.toFixed(2), src: state.bgm.currentSrc } : null,
      buffers: Object.fromEntries(Object.entries(buffers).map(([k, b]) => [k, Math.round(b.duration * 1000)])),
      liveRollVoice: !!(state.rollVoice && !state.rollVoice.ended), log: state.log.slice(-40) };
  }
  return { invite, decline, accept, startRoll, reveal, end, sync, ownsBgm, debug, config: A };
})();

(function installBalloonDiceAudio() {
  if (typeof globalThis === 'undefined') return;
  const wrap = (name, make) => { const o = globalThis[name]; if (typeof o !== 'function' || o._diceAudio) return; const w = make(o); w._diceAudio = true; globalThis[name] = w; };
  // 小遊戲進行中：RPG 對話不保留關卡 BGM（各章節 BGM 的 sync 會自動暫停，結束後自動恢復同一首）
  wrap('isRpgDialogKeepingBgm', o => function () { if (balloonDiceAudio.ownsBgm()) return false; return o.apply(this, arguments); });
  // 每幀的 BGM 同步點（draw() 每幀呼叫 syncOrangeKingBgm）
  wrap('syncOrangeKingBgm', o => function () { const r = o.apply(this, arguments); try { balloonDiceAudio.sync(); } catch (e) {} return r; });
  // 骰子對話以任何方式關閉（繼續冒險、拒絕、死亡重置、離場）都結束小遊戲音訊
  wrap('rpgClose', o => function () { const r = o.apply(this, arguments); try { if (balloonDiceAudio.ownsBgm()) balloonDiceAudio.end('rpgClose'); } catch (e) {} return r; });
  if (typeof window !== 'undefined') window.debugDiceAudio = balloonDiceAudio.debug;
})();

if (typeof module !== 'undefined' && module.exports) module.exports = { balloonDiceAudio, BALLOON_DICE_AUDIO };

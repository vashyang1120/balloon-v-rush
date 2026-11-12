/* =========================================================
 * 打地鼠 whack-a-mole-v0.1.0-test-1
 * config.js — 所有可調參數（測試參數集中在這裡）
 *
 * 想改獎勵分數門檻：只要改下面 REWARD_TIERS 的 minScore 即可。
 * 其他「已確認規則」（30秒、配額、金環時間窗、Boss 時間、
 * 0.1秒間隔、爆槌1.5秒…）請勿隨意修改。
 * ========================================================= */
(function (W) {
  'use strict';

  var CONFIG = {
    VERSION: 'whack-a-mole-v0.1.0-test-1',
    BASELINE: '打地鼠PM企劃v0.25',

    /* ---------- 已確認規則（不可擅改） ---------- */
    GAME_DURATION: 30,          // 秒
    HIT_MIN_INTERVAL: 0.1,      // 全域最短有效敲擊間隔（秒）
    BREAK_DURATION: 1.5,        // 爆槌修復時間（秒）
    SCORE_SCORPION: 10,         // 普通槌敲蠍子怪
    SCORE_GOLD_TARGET: 10,      // 金槌敲任一普通目標
    SCORE_BOSS: 20,             // 金槌每敲橘子王一下
    BOSS_START: 27,             // Boss 戰開始秒數
    SPIRIT_MAX_REMINDERS: 1,    // 星靈每局最多提醒一次

    // 金環時間窗：出現 → 有效至；金槌也一律在 to 結束
    GOLD_WINDOWS: [
      { id: 1, from: 12, to: 17 },
      { id: 2, from: 25, to: 30 }
    ],
    CORNER_HOLES: [0, 2, 6, 8],   // 九宮格四個角落（0=左上 … 8=右下）

    // 普通目標固定配額（每局 50 個）
    TOTAL_QUOTA: { scorpion: 30, orange: 12, spike: 8 },
    PERIODS: [
      { id: 'P1', label: '0～8秒',   from: 0,  to: 8,  quota: { scorpion: 6,  orange: 2, spike: 1 } },
      { id: 'P2', label: '8～12秒',  from: 8,  to: 12, quota: { scorpion: 4,  orange: 2, spike: 1 } },
      { id: 'P3', label: '12～17秒', from: 12, to: 17, quota: { scorpion: 6,  orange: 2, spike: 2 } },
      { id: 'P4', label: '17～25秒', from: 17, to: 25, quota: { scorpion: 11, orange: 5, spike: 3 } },
      { id: 'P5', label: '25～27秒', from: 25, to: 27, quota: { scorpion: 3,  orange: 1, spike: 1 } }
    ],

    // 出現節奏：依「出現時間」決定停留秒數；maxConcurrent 為同時上限
    RHYTHM: [
      { label: '0～8秒',   from: 0,  to: 8,  dwell: 1.5, minConcurrent: 1, maxConcurrent: 2 },
      { label: '8～17秒',  from: 8,  to: 17, dwell: 1.1, minConcurrent: 2, maxConcurrent: 3 },
      { label: '17～27秒', from: 17, to: 27, dwell: 0.8, minConcurrent: 3, maxConcurrent: 4 }
    ],

    /* ---------- 原型實作細節（可調，不影響規則） ---------- */
    FIRST_SPAWN_AT: 0.3,        // 第一個目標最早出現時間（給玩家0.3秒反應）
    SAME_HOLE_GAP: 0.15,        // 同一洞口前後兩個目標之間至少空出的秒數
    RISE_TIME: 0.12,            // 升起動畫（停留時間內，全程可敲）
    FALL_TIME: 0.12,            // 下降動畫（停留時間內，全程可敲）
    HIT_LEAVE_TIME: 0.28,       // 被敲中後縮回洞裡的動畫
    BOSS_INTRO_TIME: 0.6,       // 橘子王升起動畫（一開始就可敲）
    BOSS_DIM_TIME: 0.5,         // 場景變暗時間
    BOSS_DIM_ALPHA: 0.55,
    BOSS_HIT_REACT: 0.14,       // 橘子王受擊反應（純畫面，不擋判定）
    SCHEDULE_MAX_ATTEMPTS: 200, // 排程衝突時重新產生的上限

    /* ---------- 結算（測試參數，可修改門檻） ---------- */
    PLAY_COST_COINS: 20,
    REWARD_TIERS: [
      { id: 'basic', name: '初級', minScore: 0,   coins: 20,  balloon260: 2, roundBalloon: 0 },
      { id: 'mid',   name: '中級', minScore: 200, coins: 50,  balloon260: 4, roundBalloon: 2 },
      { id: 'high',  name: '高級', minScore: 400, coins: 100, balloon260: 6, roundBalloon: 4 }
    ],

    /* ---------- 星靈對話 ---------- */
    SPIRIT_TEXT: {
      opening: '你應該知道什麼可以用氣球槌敲，什麼不能用氣球槌敲吧？',
      orange: '你不知道氣球槌不能拿來敲橘子怪嗎？',
      spike: '你不知道氣球槌不能拿來敲尖刺嗎？',
      boss: '你不知道氣球槌不能拿來敲橘子王嗎？'
    },

    TARGET_NAMES: { scorpion: '蠍子怪', orange: '橘子怪', spike: '尖刺', ring: '金環', boss: '橘子王' },

    /* ---------- 鍵盤九宮格 ---------- */
    KEY_MAP: {
      KeyQ: 0, KeyW: 1, KeyE: 2,
      KeyA: 3, KeyS: 4, KeyD: 5,
      KeyZ: 6, KeyX: 7, KeyC: 8,
      Numpad7: 0, Numpad8: 1, Numpad9: 2,
      Numpad4: 3, Numpad5: 4, Numpad6: 5,
      Numpad1: 6, Numpad2: 7, Numpad3: 8
    },
    KEY_LABELS: ['Q/7', 'W/8', 'E/9', 'A/4', 'S/5', 'D/6', 'Z/1', 'X/2', 'C/3']
  };

  W.WAM = W.WAM || {};
  W.WAM.CONFIG = CONFIG;
})(typeof window !== 'undefined' ? window : globalThis);

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
    VERSION: 'whack-a-mole-v0.1.3-test-1',
    BASELINE: '打地鼠 PM v0.31.1',
    TITLE: '氣球槌打地鼠',

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
    // v0.1.3：受擊演出（純畫面；命中當下就已計分、不能再被敲）
    HURT_HOLD: 0.35,            // 受擊圖清楚停留（秒）
    HIT_LEAVE_TIME: 0.55,       // 受擊停留＋退洞完成（秒）；之後才從場上移除
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
      opening: '你應該知道什麼能用氣球槌子敲，什麼不能吧？',
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
    KEY_LABELS: ['Q/7', 'W/8', 'E/9', 'A/4', 'S/5', 'D/6', 'Z/1', 'X/2', 'C/3'],

    /* =====================================================
     * v0.1.1 素材整合：全部沿用專案既有正式素材（不複製、不修改原檔）
     * 路徑都是「專案根目錄」起算；ASSET_BASES 依序嘗試：
     *   '../../' → GitHub Pages / 本機（minigames/whack-a-mole/ 往上兩層就是專案根目錄）
     *   './'     → 只給獨立測試網頁使用（同層放一份素材副本）
     * 任何一張圖或音效載入失敗，都會自動退回 v0.1.0 的幾何圖形 / 靜音，遊戲照常進行。
     * bbox = 圖片實際有畫面的範圍 [左, 上, 右, 下]（已實測），用來對齊洞口，不影響判定。
     * ===================================================== */
    ASSET_BASES: ['../../', './'],
    IMAGES: {
      scorpion:     { path: 'assets/enemies/scorpion/scorpion_walk_01.png',              bbox: [69, 107, 444, 410] },
      scorpionHit:  { path: 'assets/enemies/scorpion/scorpion_hurt_01.png',              bbox: [65, 73, 446, 399], bodyW: 375 }, // 與一般圖同像素比例
      orange:       { path: 'assets/enemies/orange/orange_idle_01.png',                  bbox: [55, 60, 495, 479] },
      spike:        { path: 'assets/adventure/hazards/chapter1/chapter1_spike.png',      bbox: [70, 233, 1211, 1039], cacheW: 700 },
      boss:         { path: 'assets/bosses/orange-king/orange_king_idle_01.png',         bbox: [31, 7, 493, 466] },
      ring:         { path: 'assets/bosses/orange-king/orange_king_golden_oil_ring.png', bbox: [61, 35, 455, 453] },
      // 氣球槌：head = 槌頭中心、grip = 握把末端（像素座標，已實測）
      hammer:       { path: 'assets/adventure/ui/items/item_balloon_hammer.png',         head: [90, 82], grip: [215, 240] },
      bgFar:        { path: 'assets/adventure/backgrounds/chapter1/chapter1_bg_far.png' },
      bgMid:        { path: 'assets/adventure/backgrounds/chapter1/chapter1_bg_mid.png' },
      spiritNormal: { path: 'assets/adventure/rpg/portraits/star-spirit/star_spirit_normal.png' },
      spiritAngry:  { path: 'assets/adventure/rpg/portraits/star-spirit/star_spirit_angry.png' },

      /* ---- v0.1.2：Vash 提供的打地鼠專用素材（放在本資料夾 assets/，不動共用素材） ----
       * bodyW / anchorX：受擊圖與一般圖的角色本體寬度、中心對齊，換圖時大小不跳動 */
      orangeHit:    { path: 'minigames/whack-a-mole/assets/whack_orange_hurt.png', bbox: [161, 242, 1063, 995], bodyW: 895, anchorX: 667, cacheW: 640 },
      bossHit:      { path: 'assets/bosses/orange-king/orange_king_cooldown_01.png',     bbox: [15, 25, 493, 485], bodyW: 462 },
      // edge = 草地平台實測：[圖片 y, 該列草地半寬]（中心 x=719；y≥960 是前側土壤）
      ground:       { path: 'minigames/whack-a-mole/assets/whack_platform.png',      bbox: [73, 15, 1375, 1038], cacheW: 1600,
                      centerX: 719, grassBottom: 960,
                      edge: [[40, 424], [80, 458], [150, 470], [300, 496], [500, 544], [700, 593], [900, 645]] },
      // 洞口：whack_hole_front.png 是從 whack_hole_back.png 同一張圖遮罩取出的近側邊緣（v0.1.2-test-2），
      // 兩張像素完全對齊。原始前緣 whack_hole_front_original.png 因與底層錯位，只保留備份、不載入。
      // opening = 洞口中心與半寬（像素，已實測，高寬比 0.33 與原型相同）
      holeBack:     { path: 'minigames/whack-a-mole/assets/whack_hole_back.png',   opening: [866, 521, 452], cacheW: 900 },
      holeFront:    { path: 'minigames/whack-a-mole/assets/whack_hole_front.png',  opening: [866, 521, 452], cacheW: 900 },
      hammerGold:   { path: 'minigames/whack-a-mole/assets/whack_hammer_gold.png',      head: [500, 381], grip: [1092, 1215], cacheW: 700 },
      hammerCracked:{ path: 'minigames/whack-a-mole/assets/whack_hammer_pop_01.png',   head: [464, 395], grip: [1065, 1179], cacheW: 700 },
      hammerBurst:  { path: 'minigames/whack-a-mole/assets/whack_hammer_pop_02.png',     head: [464, 395], grip: [1065, 1179], cacheW: 700 },
      hammerShards: { path: 'minigames/whack-a-mole/assets/whack_hammer_pop_03.png', head: [464, 395], grip: [1065, 1179], cacheW: 700 }
    },
    // 爆槌畫面節奏（秒，遊戲時鐘；純畫面，1.5 秒修復規則不變）：
    // 裂開 → 爆開 → 碎片飄散 → 最後 0.25 秒重新充氣
    BREAK_FX: { cracked: 0.12, burst: 0.55, shards: 1.25, reinflate: 0.25 },
    // 角色完全升起時，圖片底部位於洞口近側邊緣下方多少（× 洞口半高）：下半身被邊緣擋住、臉完整露出
    HOLE_SINK: 1.12,
    // 無敵槌倒數提示：金槌結束前 3、2、1 秒＋結束瞬間（Web Audio 即時合成，跟遊戲時鐘走）
    GOLD_COUNTDOWN: [3, 2, 1],
    // cacheW：大圖載入後先縮成一份顯示用副本（原檔不變），手機每幀繪製更輕
    // 角色顯示寬度（× 格子寬，再乘上該排透視比例）；等比例縮放，不拉伸
    SPRITE_WIDTH: { scorpion: 0.68, orange: 0.56, spike: 0.66, ring: 0.5, boss: 1.32 },
    // v0.1.3：普通目標可見寬度 = 洞口圖可見寬度 × 比例（以圖片實際 Alpha 範圍計算，不拉伸）
    // HOLE_VISIBLE_W = whack_hole_back.png 實際可見寬度（像素，含洞口草邊）
    SPRITE_HOLE_RATIO: { scorpion: 0.90, orange: 0.90, spike: 0.85 },
    HOLE_VISIBLE_W: 1148,

    AUDIO: {
      SFX_MAX_VOICES: 8,   // 全部音效同時上限（只限制聲音，不影響得分）
      SFX: {
        hammerHit:  { path: 'assets/audio/sfx/player/player_hammer_hit.mp3',   vol: 0.85, minGapMs: 60,  maxVoices: 3 },
        hammerSwing:{ path: 'assets/audio/sfx/player/player_hammer_swing.mp3', vol: 0.6,  minGapMs: 80,  maxVoices: 2 },
        scorpionHurt:{ path: 'assets/audio/sfx/enemy/scorpion_hurt.mp3',      vol: 0.7,  minGapMs: 90,  maxVoices: 2 },
        bossHurt:   { path: 'assets/audio/sfx/enemy/giant_scorpion_hurt.mp3',  vol: 0.7,  minGapMs: 120, maxVoices: 1 },
        balloonPop: { path: 'assets/audio/sfx/weapon/sfx_balloon_pop.mp3',     vol: 0.95, minGapMs: 120, maxVoices: 2 },
        reinflate:  { path: 'assets/audio/sfx/item/balloon_crafting.mp3',      vol: 0.6,  minGapMs: 300, maxVoices: 1, offset: 0.053, duration: 0.7 },
        ringGet:    { path: 'assets/audio/sfx/item/golden_pipe_ring_get.mp3',  vol: 0.9,  minGapMs: 300, maxVoices: 1 },
        bossIntro:  { path: 'assets/audio/sfx/boss/boss_taunt_crouch.mp3',     vol: 0.9,  minGapMs: 500, maxVoices: 1 },
        dialogOpen: { path: 'assets/audio/sfx/ui/ui_dialog_open.mp3',          vol: 0.55, minGapMs: 200, maxVoices: 1 },
        uiClick:    { path: 'assets/audio/sfx/ui/ui_button_click.mp3',         vol: 0.5,  minGapMs: 90,  maxVoices: 2 },
        result:     { path: 'assets/audio/sfx/ui/ui_level_clear.mp3',          vol: 0.8,  minGapMs: 1000, maxVoices: 1 },
        // v0.1.3：氣球排球的發球哨音（共用原檔，不修改）——第17秒金槌結束、第30秒遊戲結束
        whistle:    { path: 'minigames/volleyball/assets/audio/serve_whistle.mp3', vol: 0.8, minGapMs: 500, maxVoices: 1, noDuck: true }
      },
      // 已定案：沿用氣球排球比賽中的 BGM（同一個檔案，不複製、不修改）
      BGM: { path: 'minigames/volleyball/assets/audio/bgm/volleyball_game_bgm.mp3', vol: 0.3, fadeOut: 0.8 },
      // v0.1.3：無敵槌倒數提示音（Web Audio 合成）——音量可獨立調整
      COUNTDOWN: {
        vol: 0.55,        // 剩 3、2 秒提示音音量
        highVol: 0.65,    // 剩 1 秒（較高音、連響兩聲）音量
        duckTo: 0.35,     // 提示音響起時，其他音效暫時降到原本的 35%（BGM 不受影響）
        duckSec: 0.4      // 降低持續秒數
      },
      RESULT_DELAY_AFTER_WHISTLE: 0.85  // 第30秒哨音後，結算音延後播放（秒），避免重疊
    }
  };

  W.WAM = W.WAM || {};
  W.WAM.CONFIG = CONFIG;
})(typeof window !== 'undefined' ? window : globalThis);

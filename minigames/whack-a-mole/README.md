# 打地鼠（暫名）— whack-a-mole-v0.1.2-test-1

《氣球小V：派對島大作戰》附屬小遊戲的**獨立可玩幾何原型**（基準：打地鼠 PM v0.29）。
與 `minigames/volleyball/` 同層，完全獨立：不讀寫冒險存檔、不使用 Firebase / V幣 / 排行榜，
也沒有修改專案內任何既有檔案。

v0.1.1：換上冒險主線／氣球排球的既有正式素材（直接引用原路徑，不複製、不修改原檔）。
任何素材載入失敗，會自動退回 v0.1.0 的幾何圖形或靜音，遊戲照常進行。

| 用途 | 來源路徑 |
|---|---|
| 蠍子怪 / 被敲中 | assets/enemies/scorpion/scorpion_walk_01.png / scorpion_hurt_01.png |
| 橘子怪 | assets/enemies/orange/orange_idle_01.png |
| 尖刺 | assets/adventure/hazards/chapter1/chapter1_spike.png |
| 橘子王 | assets/bosses/orange-king/orange_king_idle_01.png |
| 金環 | assets/bosses/orange-king/orange_king_golden_oil_ring.png |
| 氣球槌（金槌＝程式金色濾鏡） | assets/adventure/ui/items/item_balloon_hammer.png |
| 背景 | assets/adventure/backgrounds/chapter1/chapter1_bg_far.png、chapter1_bg_mid.png |
| 星靈 | assets/adventure/rpg/portraits/star-spirit/star_spirit_normal.png、star_spirit_angry.png |
| 音效 | assets/audio/sfx/（player_hammer_hit、player_hammer_swing、scorpion_hurt、giant_scorpion_hurt、sfx_balloon_pop、balloon_crafting、golden_pipe_ring_get、boss_taunt_crouch、ui_dialog_open、ui_button_click、ui_level_clear） |
| 橘子王受擊（v0.1.2） | assets/bosses/orange-king/orange_king_cooldown_01.png |
| 橘子怪受擊（v0.1.2） | minigames/whack-a-mole/assets/characters/orange_hurt_01.png |
| 草地平台、洞口後方／前緣（v0.1.2） | minigames/whack-a-mole/assets/stage/whack_ground.png、whack_hole_back.png、whack_hole_front.png |
| 金色氣球槌、爆槌三段（v0.1.2） | minigames/whack-a-mole/assets/hammer/balloon_hammer_gold.png、balloon_hammer_cracked.png、balloon_hammer_burst.png、balloon_hammer_fragments.png |
| BGM（同氣球排球） | minigames/volleyball/assets/audio/bgm/volleyball_game_bgm.mp3 |

## 啟動
- 直接用瀏覽器開 `minigames/whack-a-mole/index.html`（雙擊即可，不需安裝任何東西）
- 上傳到 GitHub Pages 後：`https://vashyang1120.github.io/balloon-v-rush/minigames/whack-a-mole/`
- 網址參數：`?seed=123456` 指定種子；`?debug=0` 隱藏測試資訊（遊戲中按 `` ` `` 鍵也可切換）

## 操作
- 滑鼠：點洞口（游標就是氣球槌）
- 鍵盤：Q W E / A S D / Z X C，或數字鍵盤 7 8 9 / 4 5 6 / 1 2 3（主鍵盤的數字鍵也可）
- 手機橫式：直接點洞口
- Boss 戰時：點中央橘子王，或按 S / 5

## 檔案
| 檔案 | 內容 |
|---|---|
| index.html / style.css | 頁面、星靈對話框、結算畫面 |
| js/config.js | 所有參數（**獎勵分數門檻在 REWARD_TIERS**） |
| js/core.js | 種子亂數、統一遊戲時鐘 |
| js/schedule.js | 50 個目標預先排程與驗證 |
| js/holes.js | 九宮格洞口與有效敲擊區域 |
| js/hammer.js | 氣球槌狀態（普通／爆裂／金槌） |
| js/goldring.js | 金環 |
| js/boss.js | 橘子王 |
| js/scoring.js | 計分與模擬獎勵 |
| js/game.js | 遊戲狀態、敲擊判定、星靈暫停規則 |
| js/assets.js | 圖片素材載入與備援（v0.1.1） |
| js/audio.js | 音效與 BGM（v0.1.1） |
| js/spirit.js | 星靈對話框 |
| js/input.js | 滑鼠／鍵盤／觸控 |
| js/render.js | 畫面繪製與動畫、測試資訊 |
| js/main.js | 啟動與主迴圈 |
| tests/rules.test.js | 規則自動測試：`node minigames/whack-a-mole/tests/rules.test.js` |

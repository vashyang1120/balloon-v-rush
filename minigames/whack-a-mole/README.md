# 打地鼠（暫名）— whack-a-mole-v0.1.0-test-1

《氣球小V：派對島大作戰》附屬小遊戲的**獨立可玩幾何原型**（基準：打地鼠PM企劃v0.25）。
與 `minigames/volleyball/` 同層，完全獨立：不讀寫冒險存檔、不使用 Firebase / V幣 / 排行榜，
也沒有修改專案內任何既有檔案。

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
| js/spirit.js | 星靈對話框 |
| js/input.js | 滑鼠／鍵盤／觸控 |
| js/render.js | 畫面繪製與動畫、測試資訊 |
| js/main.js | 啟動與主迴圈 |
| tests/rules.test.js | 規則自動測試：`node minigames/whack-a-mole/tests/rules.test.js` |

# Balloon Dice v2.0｜Cross-Continent Integration Test 3

基準 `62ed27da932aa8512554fac19e9c7347403d3f50`。Draft PR #43 以 PR #42 的 `integration/ch3-abcd-test-4` 為基底。測試部署目錄為 `playtest-balloon-dice-v2-test-3/`，使用獨立訪客存檔名稱空間。

## 修正

- `chapter3-umbrella-diversion.js` 的兩個像素讀取分別取自雨傘角色圖與瀑布影格。Test 2 的 RawCDN 試玩把這些圖導向 GitHub Pages，但圖片以不含 CORS 授權的方式載入。污染在各自的暫存 Canvas 產生，讀取時拋出的例外透過 `c34DrawFall()` 中斷繪圖。Test 3 先為兩類貼圖發出匿名 CORS 請求。若個別貼圖仍無法讀取，回到原有瀑布導流渲染，避免重複讀取同一張不相容圖。
- `chapter3-treasure-interaction.js` 恢復 Test 1 的兩頁星靈邀約及獎金規則，依來源使用「寶箱」或「金幣包」。接續原本小V thinking 選擇以及雙角色對戰。`main.js` 與 `style.css` 只在兩選項頁啟用寬按鈕，各按鈕最低 44px 高。
- 排球 HTML 的舊絕對路徑無法載入當版隔離腳本，於是 `main.js` 跳過，冒險端收不到 `ready`。打地鼠 HTML 同樣沒有啟動腳本，冒險端等不到 `__wam` 與資源就緒。兩款小遊戲改從各自的 iframe 以相對路徑使用本次部署的隔離腳本。
- LV1／LV2 留在隔離測試中。玩家可以直接試玩擲骰，無須重跑背包升級。

## 驗收方式

Chrome 回歸包含同站和跨站素材、骰子選項尺寸與觸控、離場及存檔、3-4 由小V之家出發並完成關卡，以及小遊戲開始後返回。Actions 的 `balloon-dice-v2-chrome` 產物包含邀約及桌面／橫向觸控按鈕截圖。使用者實機驗收另行確認。

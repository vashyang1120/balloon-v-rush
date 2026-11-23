# Balloon Dice v2.0｜Cross-Continent Integration Test 3

基準 `62ed27da932aa8512554fac19e9c7347403d3f50`。Draft PR #43 以 PR #42 的 `integration/ch3-abcd-test-4` 為基底。測試部署目錄為 `playtest-balloon-dice-v2-test-3/`，使用獨立訪客存檔名稱空間。

## 修正

- `chapter3-umbrella-diversion.js` 的兩個像素讀取分別取自雨傘角色圖與瀑布影格。Test 2 的 RawCDN 試玩把這些圖導向 GitHub Pages，但圖片以不含 CORS 授權的方式載入。污染在各自的暫存 Canvas 產生，讀取時拋出的例外透過 `c34DrawFall()` 中斷繪圖。Test 3 先為兩類貼圖發出匿名 CORS 請求。若個別貼圖仍無法讀取，回到原有瀑布導流渲染，若伺服器拒絕 CORS，嘗試一般載圖並沿用相同的導流備援。
- `chapter3-treasure-interaction.js` 恢復 Test 1 的兩頁星靈邀約及獎金規則，依來源使用「寶箱」或「金幣包」。接續原本小V thinking 選擇以及雙角色對戰。`main.js` 與 `style.css` 只在兩選項頁啟用寬按鈕，各按鈕最低 44px 高。
- 排球 HTML 的舊絕對路徑無法載入當版隔離腳本，於是 `main.js` 跳過，冒險端收不到 `ready`。打地鼠 HTML 同樣沒有啟動腳本，冒險端等不到 `__wam` 與資源就緒。兩款小遊戲改從各自的 iframe 以相對路徑使用本次部署的隔離腳本。
- LV1／LV2 留在隔離測試中。玩家可以直接試玩擲骰，無須重跑背包升級。

## 驗收方式

Chrome 回歸包含同站和跨站素材、骰子選項尺寸與觸控、離場及存檔、3-4 由小V之家出發並完成關卡，以及小遊戲開始後返回。Actions 的 `balloon-dice-v2-chrome` 產物包含邀約及桌面／橫向觸控按鈕截圖。使用者實機驗收另行確認。

Test 1 與 Test 2 的兩款 iframe 內容相同，仍參照更舊部署的路徑。公開驗證以實際 RawCDN commit URL 開頁。測試以隔離資料準備小遊戲資格，並以第二大陸 B 入口的 3-3 通關進度驗證續玩至 3-4。

公開 CDN 的桌面鍵盤回歸已從 3-4 首段進入瀑布，完成雨傘分流、水池游泳、浮墊攀爬、右岸戰鬥、通關及重新載入。此回歸有檢查雨傘及瀑布影像確實由跨站匿名 CORS 載入，並檢查整趟無未捕捉的頁面例外。

公開排球可啟動並返回，打地鼠在修正入口後仍會遇到 RawCDN 素材讀取失敗。打地鼠改優先使用 GitHub Pages 已發布且 Git 物件相同的圖片與音效，保留原來相對路徑備援。HTML、JavaScript 與遊戲存檔仍由 Test 3 自己的網域及目錄處理。

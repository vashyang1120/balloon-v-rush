# test-2 工程交接

- 版本 `adventure-v0.4.13-ch3-water-terrain-integration-test-2`。遊戲基準 `a56ff7dc8552288fa58e263807b53c164d5785f1`，正式基準 `53ca70eb`，test-1 交接 `92ec5f10`。本檔所在提交為開發分支最新水域驗證點。[開發分支及 Draft PR #37](https://github.com/vashyang1120/balloon-v-rush/pull/37)
- 程式變更位於 `rpg-dual-continent-test/{main.js,index.html,chapter3-water-art.js,chapter3-water-runtime.js}`。使用原始美術包。追加驗收結果與 A–D 證據列於 [ACCEPTANCE](ACCEPTANCE.md)。
- 資源盤點和三種 3-4 測試背包已可操作。B 已新增岩壁、窄岩柱及倒樹的畫面與碰撞檢查。續接優先完成 E 三級寶箱和骰子，以及 G 的完整回歸與隔離部署。C 已完成飛行、鏡頭與提示的桌機 Chromium 驗證。F 已完成同一次通關的新版結算重開驗證。完整規格見 [SPEC](SPEC.md)。
- test-1 Pages 仍是提交 `a0eec328`。Recovery 指示指定沿用 `playtest-adventure-v0.4.13/`，覆蓋該隔離目錄的線上試玩內容。test-2 在 G 階段獨立部署前，仍需完成剩餘施工、完整回歸及正式資料隔離驗證。使用者手機及現場音效待實機驗收。

Recovery 施工自 `334b50a0c4f959525a72a5142026dc16e4b657cd` 繼續。CI 範圍已補齊第三章水域測試及稱號測試。待查證與完成項目參見 [PROGRESS](PROGRESS.md) 和 [ACCEPTANCE](ACCEPTANCE.md)。

接續基準請取 PR #37 最新 HEAD。階段 F 改動及瀑布測試修正的瀏覽器證據見 [ACCEPTANCE](ACCEPTANCE.md)。

3-4 飛行續調優先使用新增的軌跡測試。階段 C 只改 3-4 專屬地形、鏡頭和導風參數；3-2 既有分支仍用原有計數及文案。

背包用 `&ch3bag=cumulative|stocked|empty` 選模式。測試背包重置在暫停開發工具內。資源來源和不確定項目見 [RESOURCE_CATALOG](RESOURCE_CATALOG.md)。


E/G 續接自 `a68424255f7f8ab1fa551b6fe916f866e27b9e2b`。骰子和寶箱獎勵核心在 `rpg-dual-continent-test/chapter3-treasure-dice.js`，獨立測試在同目錄的 tests。取得正式素材後，量測黃球可繪製範圍再把正面圖與核心串接。需取得精確的製作、消耗、觸發、次數與星靈首句規格才打開邀約。剩餘工程：核對寶箱原檔三等級，完成實際遊戲操作與整關回歸。部署時從最新 PR HEAD 建置並僅覆蓋 main 的 `playtest-adventure-v0.4.13/`，完成 GitHub Pages 實際 HTTPS 三入口驗證。精確指令及驗收紀錄見 [PROGRESS](PROGRESS.md) 和 [ACCEPTANCE](ACCEPTANCE.md)。

最新檢查點接續 `e896c57fc3571f8d787d6a52f6cf129ee360a27d`，另補 3-1～3-4 疾風共用圖組、修正 Pages 測試端輪詢。


2026-11-20 續接已將 Phase E 串到遊戲。主入口載入 `chapter3-treasure-dice.js` 與 `chapter3-treasure-interaction.js`。需將五張核准的 PNG 落檔到 `assets/adventure/ui/items/`，普通為金框木箱，稀有為銀框藍箱，珍貴為紫寶石金箱，檔名 `item_treasure_chest_normal.png`、`item_treasure_chest_rare.png`、`item_treasure_chest_precious.png`。兩張骰子為 `item_balloon_dice.png`、`dice_face_blank.png`。使用者附圖已辨識，下載回傳失敗。取得完整 PNG 後核對寶箱顯示、點數與結算畫面，完成整關回歸後再更新獨立 Pages 目錄。

Final Recovery 以 PR HEAD `337d5ff6` 接續。骰子在接受時消耗一顆，勝負平手皆以同一筆寫入保存骰子扣除、金幣和寶箱紀錄。拒絕維持原額且保留骰子。關卡失敗依既有快照一起還原。進度見 [PROGRESS](PROGRESS.md)。

骰子回歸請讀 `c34BagKey('cumulative')` 核對快捷入口存檔。初次 Actions #25 因查錯鍵失敗，同一套測試修正後本機 Chromium 11/11 通過。五張正式 PNG 尚待取得原始檔案，避免使用預覽截圖取代。

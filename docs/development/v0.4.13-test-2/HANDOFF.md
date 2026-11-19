# test-2 工程交接

- 版本 `adventure-v0.4.13-ch3-water-terrain-integration-test-2`。遊戲基準 `a56ff7dc8552288fa58e263807b53c164d5785f1`，正式基準 `53ca70eb`，test-1 交接 `92ec5f10`。本檔所在提交為開發分支最新水域驗證點。[開發分支及 Draft PR #37](https://github.com/vashyang1120/balloon-v-rush/pull/37)
- 程式變更位於 `rpg-dual-continent-test/{main.js,index.html,chapter3-water-art.js,chapter3-water-runtime.js}`。使用原始美術包。追加驗收結果與 A–D 證據列於 [ACCEPTANCE](ACCEPTANCE.md)。
- 資源盤點和三種 3-4 測試背包已可操作。B 已新增岩壁、窄岩柱及倒樹的畫面與碰撞檢查。續接優先完成 E 三級寶箱和骰子，以及 G 的完整回歸與隔離部署。C 已完成飛行、鏡頭與提示的桌機 Chromium 驗證。F 已完成同一次通關的新版結算重開驗證。完整規格見 [SPEC](SPEC.md)。
- test-1 Pages 仍是提交 `a0eec328`。Recovery 指示指定沿用 `playtest-adventure-v0.4.13/`，覆蓋該隔離目錄的線上試玩內容。test-2 在 G 階段獨立部署前，仍需完成剩餘施工、完整回歸及正式資料隔離驗證。使用者手機及現場音效待實機驗收。

Recovery 施工自 `334b50a0c4f959525a72a5142026dc16e4b657cd` 繼續。CI 範圍已補齊第三章水域測試及稱號測試。待查證與完成項目參見 [PROGRESS](PROGRESS.md) 和 [ACCEPTANCE](ACCEPTANCE.md)。

接續基準請取 PR #37 最新 HEAD。階段 F 改動及瀑布測試修正的瀏覽器證據見 [ACCEPTANCE](ACCEPTANCE.md)。

3-4 飛行續調優先使用新增的軌跡測試。階段 C 只改 3-4 專屬地形、鏡頭和導風參數；3-2 既有分支仍用原有計數及文案。

背包用 `&ch3bag=cumulative|stocked|empty` 選模式。測試背包重置在暫停開發工具內。資源來源和不確定項目見 [RESOURCE_CATALOG](RESOURCE_CATALOG.md)。

# test-2 工程交接

- 版本 `adventure-v0.4.13-ch3-water-terrain-integration-test-2`。遊戲基準 `a56ff7dc8552288fa58e263807b53c164d5785f1`，正式基準 `53ca70eb`，test-1 交接 `92ec5f10`。本檔所在提交為開發分支最新水域驗證點。[開發分支及 Draft PR #37](https://github.com/vashyang1120/balloon-v-rush/pull/37)
- 程式變更位於 `rpg-dual-continent-test/{main.js,index.html,chapter3-water-art.js,chapter3-water-runtime.js}`。使用原始美術包。追加驗收結果與 A–D 證據列於 [ACCEPTANCE](ACCEPTANCE.md)。
- 優先續接 A 的資源清點與三種測試背包，補齊 B 的岩壁、窄岩柱及樹木回歸，再完成 C–E 與 G。F 已完成同一次通關的新版結算重開驗證。完整規格見 [SPEC](SPEC.md)。
- test-1 Pages 仍是提交 `a0eec328`。Recovery 指示指定沿用 `playtest-adventure-v0.4.13/`，覆蓋該隔離目錄的線上試玩內容。test-2 在 G 階段獨立部署前，仍需完成剩餘施工、完整回歸及正式資料隔離驗證。使用者手機及現場音效待實機驗收。

Recovery 施工自 `334b50a0c4f959525a72a5142026dc16e4b657cd` 繼續。CI 範圍已補齊第三章水域測試及稱號測試。待查證與完成項目參見 [PROGRESS](PROGRESS.md) 和 [ACCEPTANCE](ACCEPTANCE.md)。

接續基準請取 PR #37 最新 HEAD。階段 F 改動及瀑布測試修正的瀏覽器證據見 [ACCEPTANCE](ACCEPTANCE.md)。

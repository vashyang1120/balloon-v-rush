# Revision 5｜交接（HANDOFF）

- 分支：`test/adventure-v0.4.13-gameplay-polish-qa-rev5`（基準 Revision 4 `b5b2f47`）；Draft PR，沒有合併 main，沒有發布正式入口。PR #47 保持原狀。
- 試玩首頁（固定提交，內容不會變）：`https://rawcdn.githack.com/vashyang1120/balloon-v-rush/<提交>/playtest-adventure-gameplay-polish-qa-rev5/index.html`
- 第一大陸的修改（Batch A、G）只在本分支的 `rpg-continent1-universe/`；`GAME_VERSION` 沒有改，快取標記改為 `gameplay-polish-qa-rev5`。
- 修改共用功能時：同時更新 `docs/development/cross-continent-sync/manifest.json`，並執行 `node tools/sync-check/check-cross-continent-sync.cjs --archived`。`balloon-dice-audio.js` 與 `balloon_dice_roll.mp3` 兩個大陸必須逐位元相同。
- 測試指令（repo 根目錄先開 `PORT=8412 node tests/preview-entry.cjs`）：
  - 套件內：`chapter3-water`、`chapter3-normal-flow`（`CH3_INPUT=keyboard|touch`）、`chapter3-pages-isolation`、`balloon-dice-minigames`、`balloon-dice-v2`、`chapter3-tree-gap-rev5`、`balloon-dice-audio-rev5`（`.browser.cjs`），單元 `balloon-dice-v2.test.cjs`、`chapter3-treasure-dice.test.cjs`
  - repo：`tests/gameplay-polish-qa-rev5.browser.cjs`、`tests/continent1-dice-audio-rev5.browser.cjs`、`tests/continent1-rc.browser.cjs`、`tests/entry-reliability.browser.cjs`
- 已知、沒有處理：試玩包 CSP 擋下遊戲宇宙頭像（Revision 4 相同）；第一、第二大陸仍是兩份分叉的 `main.js`（大規模共用模組重構未批准）。
- 未施工（依通知禁止）：第二大陸統一初始資源重新挑戰制度、新世界地圖、3-5／3-6／3-7、共用模組重構。

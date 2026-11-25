# Revision 4｜交接（HANDOFF）

- 分支：`test/adventure-v0.4.13-cross-continent-recovery-rev4`（基準 Revision 3 `d0633ab`）
- 試玩包：`playtest-adventure-cross-continent-recovery-rev4/`
- 版本字串：`adventure-v0.4.13-cross-continent-recovery-rev4`
- 試玩首頁：`https://rawcdn.githack.com/vashyang1120/balloon-v-rush/<HEAD>/playtest-adventure-cross-continent-recovery-rev4/index.html`（第一次開啟 githack 會出現「Open the page」說明頁，按下即可）
- 文件：AUDIT.md（根因）、FEATURE-MATRIX.md（來源表）、IMPLEMENTATION.md（每個 Commit）、TEST-RESULTS.md、`../CROSS-CONTINENT-SYNC-REGISTER.md`
- 未合併、未部署到正式入口。

## 已完成

BUG-01～06 修正（見 IMPLEMENTATION.md）；Revision 3 成果保留並回歸通過；同步清冊＋manifest＋檢查工具＋CI。

## 尚未完成／待決策

1. 使用者實機驗收（真手機觸控、真人手勢音效）。
2. 第一大陸正式版仍有 devtools 內的免費 LV2 按鈕：是否一併移除（需修改正式程式，屬第一大陸範圍）。
3. 是否把 `rpg-dual-continent-test/`（main 上已過期）用 Rev4 內容更新，或正式宣告封存。
4. 長期：把兩大陸共用程式抽成共用檔（需另行批准）。
5. 開發捷徑 `ch3test=pool` 開機時會跳出「做出氣球槌」教學（Revision 3 就有，正常流程不會）。

## 接手步驟

```bash
git fetch origin test/adventure-v0.4.13-cross-continent-recovery-rev4 && git checkout test/adventure-v0.4.13-cross-continent-recovery-rev4
node tools/sync-check/check-cross-continent-sync.cjs --archived          # 共用功能是否仍一致
cd playtest-adventure-cross-continent-recovery-rev4/rpg-dual-continent-test
node --test tests/balloon-dice-v2.test.cjs tests/chapter3-treasure-dice.test.cjs
PLAYWRIGHT_MODULE=<playwright 路徑> node --test tests/chapter3-water.browser.cjs tests/chapter3-normal-flow.browser.cjs \
  tests/chapter3-pages-isolation.browser.cjs tests/balloon-dice-minigames.browser.cjs tests/balloon-dice-v2.browser.cjs
cd ../.. && PLAYWRIGHT_MODULE=<…> node --test tests/cross-continent-recovery-rev4.browser.cjs   # 測試會自己啟動本機伺服器
```

修改任何共用功能後：更新 manifest 的檢查條件 → 跑檢查工具 → 更新清冊的「最近驗證」。

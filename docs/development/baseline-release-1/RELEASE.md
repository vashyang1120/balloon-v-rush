# Adventure v0.4.13｜Gameplay Polish & Cross-Continent Baseline Release 1

- 已驗收基準：`7bd25bd5ce93b84d7ab61416da1584f47b418d4a`（Revision 5 ＋ Companion Water Animation｜Hotfix 1，PR #48）
- 合併前 main：`c3fabbb9bce2bbf585b3328ae7bbfba868e2d6ee`（PR #45）。main 在 Revision 5 分支建立後沒有新提交（兩者的共同祖先就是 `c3fabbb`），沒有衝突、沒有被覆蓋的較新成果。
- 合併方式：PR #48 以一般合併（merge commit）併入 main，保留 Revision 3～5、Hotfix 1 的每一個提交。

## 目錄用途

| 目錄 | 用途 |
|---|---|
| `rpg-continent1-universe/` | 第一大陸正式入口（遊戲宇宙進入點，版本 `adventure-v0.4.13-baseline-release-1`） |
| `rpg-dual-continent-test/` | 雙大陸唯一的累積開發基準（版本 `adventure-v0.4.13-dual-baseline-release-1`）；第二大陸仍是開發測試狀態 |
| `playtest-*` | 歷史獨立試玩版本，保留作驗收紀錄，不再作為施工基準 |

## 第一大陸正式發布內容

本分支上第一大陸（`rpg-continent1-universe/`）相對 PR #45 的實際變更：

- 氣球骰子 v2.0 音訊（Revision 5 Batch G）：`balloon-dice-audio.js`（與開發基準逐位元相同）、`assets/audio/sfx/item/balloon_dice_roll.mp3`（6.661 s，SHA-256 `8d9e454d…cd4228a`）；邀約→小遊戲 BGM、「是」→ Heroic 金色油管環音效、骰子跳動與音檔同步、勝／敗音效、平手無音效、結束後回到冒險 BGM。
- 共用修正（Revision 5 Batch A）：骰子顯示在「武器・裝備」、雨傘上限 LV1 2／LV2 4（雨傘只在已取得秘笈或持有時才顯示，第一大陸一般玩家看不到）、急救包敘述、批量購買上限、暫停 HP 即時更新、隱藏造型・寵物配件入口、移除免費 LV1／LV2 測試按鈕（保留正式 80 金幣升級）。
- 版本 `adventure-v0.4.13-baseline-release-1`，所有變更檔案的快取標記同步更新。

已在 PR #44／#45 上線、本次保持不變：骰子 v2.0 規則與倍率、金幣包及隱藏寶箱對決、星靈邀約、從頭挑戰恢復 LV1、結算 UI 2.0、氣球狗與隱藏寶箱規則、排球五分制與背景淡化模糊、打地鼠載入／BGM／扣費／首玩資格、遊戲宇宙身份及頭像整合。

第一大陸不載入第二大陸專用的 `chapter3-*.js`、`chapter3-dog-water.js`、`qa-test-tool.js`、`umbrella-purchase-guide.js`（manifest 禁止項檢查）。

## 雙大陸累積開發基準

`rpg-dual-continent-test/` 以 Revision 5 ＋ Hotfix 1 試玩包的遊戲目錄更新：

- 程式與第三章美術：與 `playtest-adventure-gameplay-polish-qa-rev5/rpg-dual-continent-test/` 相同，只改版本字串、快取標記，並移除試玩包專用的 CSP 與 `playtest-guard.js`（開發基準與正式版同網域，資產直接讀 repo 根目錄，不需要改道 GitHub Raw）。
- 資產：讀 repo 根目錄 `assets/`、`minigames/`、`motion-comic/`。逐檔比對，試玩包的資產都在根目錄（新增根目錄缺少的 3 張第三章寶箱圖示）；小遊戲與動態漫畫只差試玩防護那幾行，根目錄的排球是較新的五分制版本。
- 存檔隔離：寫在遊戲自己的 `__c1d__` 命名空間；測試 `dual-baseline-isolation` 預先放入正式與第一大陸存檔，確認全部沒被讀改。QA 測試工具只在 `guest=1&sandbox=1&devtools=1` 時出現。
- 測試：套件內所有瀏覽器與單元測試、`tests/dual-baseline-release-1.browser.cjs`（Revision 3／4／5 回歸）都改為對這個目錄執行。

## 歷史 PR 成果對照

| PR | 內容 | 狀態（發布前） | 成果是否已涵蓋 | 處理 |
|---|---|---|---|---|
| #37 | 3-4 水域與地形整合測試 | Draft | 是：分支最新的 `main.js` 就是 main 上 `playtest-adventure-v0.4.13-test-3/` 的版本，之後由 Test 4 → Revision 3／4／5 延續 | 不在本次通知列出的範圍，保留，建議另行關閉 |
| #38 | Batch B 骰子、三級寶箱 | Draft | 是（`playtest-adventure-v0.4.13-test-3-batch-b/`） | 同上 |
| #39 | Batch C1 瀑布、雨傘分流 | Draft | 是（`…-test-3-batch-c/`） | 同上 |
| #40 | Batch D 游泳、浮墊、攀爬 | Draft | 是（`…-test-3-batch-d/`） | 同上 |
| #41 | 排球五分制相容性測試 | Draft | 第一大陸、雙大陸、`universe-official.js`、排球本體都已涵蓋（PR #44 上線）；**唯一未整合的是停用舊版 `rpg-continent2/main.js` 的五分制文字** | 保留（有未整合內容），列入報告 |
| #42 | Chapter 3 Integration Test 4 | Draft | 是：`playtest-adventure-v0.4.13-test-4` 的 `main.js` 已在 Revision 3 歷史中（`40c7749`） | 不在本次通知列出的範圍，保留，建議另行關閉 |
| #43 | 骰子 v2.0 跨大陸整合（Test 1～3） | Draft | 是：骰子 v2 規則、寶箱、`chapter3-treasure-dice.js` 的新增內容都在；分支上不同的只有版本字串、已被 PR #46 取代的秘笈 RPG 舊規則（oncePerPlayer），以及已被 PR #45 結算 UI 2.0 取代的結算按鈕 | 關閉（由 PR #48 取代） |
| #44 | 第一大陸 RC1 | 已合併 | — | — |
| #45 | Fresh Start & UI Recovery | 已合併 | — | — |
| #46 | Recipe RPG Replay Consistency | Draft | 是：最新提交 `d0633ab` 是 Revision 5 分支的祖先 | 由 PR #48 合併後自動涵蓋 |
| #47 | Revision 4 | Draft | 是：最新提交 `b5b2f47` 是 Revision 5 分支的祖先 | 由 PR #48 合併後自動涵蓋 |
| #48 | Revision 5 ＋ Hotfix 1 ＋ Baseline Release 1 | Draft → 合併 | — | 本次發布 |

歷史分支、提交與驗收證據全部保留，沒有刪除。

## Revision 4 待決策事項

| 編號 | 狀態 |
|---|---|
| F-01 第一大陸免費 LV2 測試按鈕 | 已結案（Revision 5 A-07，本次正式發布） |
| F-02 過期雙大陸開發資料夾 | 已結案（本次更新並驗證） |
| F-03 共用模組集中管理 | 長期待辦（方向已採納，未批准重構） |
| F-04 水池捷徑誤觸發氣球槌教學 | 已結案（開發基準實測：6 種捷徑組合都沒有跳出教學） |

## 已知限制

- 遊戲宇宙頭像被試玩包 CSP 擋下：只發生在歷史試玩包（它們有自己的 CSP）。第一大陸正式入口與開發基準都沒有這個 CSP。
- Revision 5 曾出現一次 `reading 'x'`：只在注入測試程式的分頁出現過，乾淨環境（本機全部測試與公開網址）沒有重現，保留紀錄，未修改程式。
- `tests/entry-reliability.browser.cjs` 三個情境平行執行時偶爾逾時（每次失敗的位置不同）；單獨執行三個情境都通過。CI 上的狀態見最終報告。
- 第一大陸與開發基準仍是兩份分叉的 `main.js`（F-03）。

## 後續開發

- 第二大陸新功能（重新挑戰制度、3-5、3-6、3-7…）一律從 main 的 `rpg-dual-continent-test/` 開始。
- 共用功能同時改兩個目錄，更新 `docs/development/CROSS-CONTINENT-SYNC-REGISTER.md` 與 manifest，並跑 `node tools/sync-check/check-cross-continent-sync.cjs --archived`。
- 需要獨立試玩時，再從開發基準打包新的 `playtest-*` 目錄。

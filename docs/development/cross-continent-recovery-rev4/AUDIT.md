# Revision 4｜Batch A 工程調查（AUDIT）

調查日期：2026-11-25。所有結論都附上 Commit 或實測證據；沒有證據的項目標為「未確認」。

## A-01 Repository 盤點

| 項目 | 分支 | HEAD | 狀態 |
|---|---|---|---|
| main | `main` | `c3fabbb`（PR #45 合併，2026-11-25 03:39） | 第一大陸正式版 |
| PR #41 五分制 | `test/volleyball-five-point-v1` | `bc33f29` | Draft、未合併；五分制內容已由 PR #44 帶入 main |
| PR #42 第三章整合 Test 4 | `integration/ch3-abcd-test-4` | `ea09f60` | Draft、未合併；快照 `playtest-adventure-v0.4.13-test-4/` 於 `40c7749` 發佈到 main |
| PR #43 骰子 v2 跨大陸 | `dev/balloon-dice-v2-cross-continent`（base：#42） | `01c07f8` | Draft、未合併；快照只在該分支（`playtest-balloon-dice-v2-test-1~3/`） |
| PR #44 第一大陸 RC1 | `release/adventure-v0.4.13-continent1-rc1` | `0ed4ff7` → 合併 `5272600` | 已合併（含排球背景去除上下鏡像） |
| PR #45 從頭挑戰與 UI 恢復 | `test/adventure-v0.4.13-fresh-start-ui-recovery` | `6a404c8` → 合併 `c3fabbb` | 已合併、已驗收 |
| PR #46 RPG Revision 3 | `test/adventure-v0.4.13-recipe-rpg-replay-consistency` | `d0633ab`（Revision 2 `053dc94`） | Draft；Revision 2 已驗收；Revision 3 驗收不通過 |
| PR #37～#40 水域 Batch | `dev/ch3-water-terrain-*` | `adf8997`／`19d6b55`／`f5008de`／`1ad8635` | Draft；內容已累積進 #42 |
| 本次 | `test/adventure-v0.4.13-cross-continent-recovery-rev4` | 見 HANDOFF.md | Draft PR |

共同祖先：Revision 3（`d0633ab`）的父鏈直接接在 main `c3fabbb` 上。PR #43 的父鏈接在 PR #42 → PR #37（水域整合），與 main 的分岔點早於 2026-11-19，沒有合併過 main。

依賴關係：#37 → #38/#39/#40 → #42 → #43。#44、#45 直接從 main 開出。#46 從 #45 合併後的 main 開出。

「工程測試通過」與「使用者驗收通過」分開記錄於 FEATURE-MATRIX.md。

## A-02 入口清點

| 入口 | 遊戲本體 | 小遊戲 | 資產 | 部署 | guard／存檔 |
|---|---|---|---|---|---|
| `rpg-continent1-universe/`（main） | 自己的 main.js | repo 根目錄 `minigames/`（正式版） | repo 根目錄 `assets/` | GitHub Pages 正式版 | 正式身份、無 guard |
| `rpg-dual-continent-test/`（main） | 自己的 main.js，**停在 2026-11-18** | 根目錄 `minigames/` | 根目錄 | Pages | 無 guard |
| `playtest-adventure-v0.4.13-test-4/`（main 與 Revision 3） | 2026-11-22 快照（PR #42） | **自己的副本**（快照當下的舊版） | 自己的副本 | Pages／githack | guard，命名空間 Rev3 改為 `second-continent-rpg-revision-3` |
| `playtest-second-continent-rpg-revision-3/` | 只是連結頁，全部連到上一列 | — | — | githack | — |
| `playtest-balloon-dice-v2-test-1~3/`（只在 PR #43 分支） | 骰子 v2 快照 | 自己的副本 | 自己的副本＋讀取 Pages test-4 目錄 | githack | guard（強制 devtools） |
| `playtest-adventure-cross-continent-recovery-rev4/`（本次） | Revision 4 | 自己的副本（與正式版逐檔比對） | 自己的副本；githack 時改讀同 commit 的 GitHub Raw | githack | guard，命名空間 `cross-continent-recovery-rev4` |

同一個 Commit（`d0633ab`）裡同時存在：正式第一大陸（新版）、過期的 `rpg-dual-continent-test/`、test-4 快照（舊版小遊戲副本＋Revision 3 修改）。Revision 3 的試玩網址載入的是 test-4 快照，不是 main 上的新版程式。

## A-04 根因（皆已取得證據）

**共同根因：Revision 3 以 2026-11-22 的 Integration Test 4 快照為基準。** 這份快照早於 PR #43（11-23～24）、PR #44（11-24）、PR #45（11-24/25）。快照目錄內是整份程式與小遊戲的獨立副本，main 上正式版更新不會自動流進去；PR #43 從未合併，也不在 Revision 3 的父鏈上。Revision 3 的自動化測試只驗證 RPG／雨傘新功能，沒有檢查共用功能是否為最新版。`tools/sync-check` 對 Revision 3 目錄的封存報告列出它缺少的標記（骰子 v2、Canvas 防護、結算 UI 2.0、從頭挑戰、五分制驗證訊息）。

| Bug | 根因 | 證據 |
|---|---|---|
| BUG-01 骰子舊版 | PR #43 的骰子 v2 從未合併；Revision 3 快照沒有它 | `git merge-base` 顯示 #43 不在 `d0633ab` 祖先中；快照 main.js 缺 `commitDiceRewardCoins`、`rpg-dice-board` |
| BUG-02 3-4 Canvas | githack 會把圖片轉址到 raw.githubusercontent.com，圖片未以 CORS 載入 → 暫存 Canvas 被污染 → `getImageData` 拋出例外。PR #43 的防護（`readPixels`、匿名 CORS）不在快照內 | 公開 Revision 3 網址實測：雨傘與瀑布圖都回 `SecurityError`。Revision 4 同一測試兩張圖皆可讀，60/60 次分流繪製成功 |
| BUG-03 打地鼠無 BGM | 快照的 `minigames/whack-a-mole/js/audio.js` 是 PR #45 之前的版本；嵌在隱藏 iframe 時 media 元素不觸發 `canplay`，BGM 停在 loading | `46d4d35` diff；Revision 4 公開網址實測 `bgm: ok・播放中`、播放 3.9 秒 |
| BUG-04 排球鏡像 | (1) 快照的排球 main.js 早於 PR #44 `0ed4ff7`，仍有上下鏡像延伸；(2) 已驗收的淡化＋模糊（v0.4.1 `c1uPrepareMinigameBg`：blur 5px、saturate 0.85、30% 白色）需要把窗景畫進 Canvas 再輸出；預覽網域的窗景是跨來源圖片，`toBlob` 失敗後轉接頁退回原始球場圖 | Revision 4 公開網址 `__c1uBgSwapped = blob:…`、截圖無倒置／鏡像 |
| BUG-05 結算 UI | PR #45 只改了 `rpg-continent1-universe/`；第二大陸程式是另一份分叉 | PR #45 diff 只含 continent1 檔案 |
| BUG-06 LV2 測試功能 | v0.3.95 在背包價格未定時加入「開發者免費升到 LV2／回 LV1」按鈕；#29 定價 80 金幣後沒有移除；第二大陸試玩捷徑全部帶 `devtools=1`，test-4 的 guard 甚至強制每個入口都開 devtools | main.js 註解「售價：使用者尚未決定 → 只有開發者模式有測試用升級按鈕」；實測 Revision 3 商店顯示「🛠 測試 LV2（免費）」 |

**未確認**：Repository 及 PR 討論中找不到「先前清除 LV2 測試功能」的工程紀錄；第一大陸正式程式同樣保留這些按鈕（僅 devtools 可見）。本次只在第二大陸試玩包移除，第一大陸是否一併移除列為待總 PM 決策。

## 基準選擇

採用 Revision 3 `d0633ab` 為施工基準（保留其 RPG／雨傘／倒樹成果），在新目錄 `playtest-adventure-cross-continent-recovery-rev4/` 先原樣複製 Revision 3 程式（`ebb037f`），再以三方合併帶入 PR #43（base＝main 的 test-4 快照），並逐檔同步 PR #44／#45 的共用程式。不直接覆蓋任何舊目錄。

# 跨大陸共用功能同步清冊（Cross-Continent Sync Register）

最近同步：2026-11-25（Revision 4，分支 `test/adventure-v0.4.13-cross-continent-recovery-rev4`）
機器可讀版本：`docs/development/cross-continent-sync/manifest.json`
自動檢查：`node tools/sync-check/check-cross-continent-sync.cjs --archived`（CI：`.github/workflows/cross-continent-sync.yml`）

> 這份文件是人看的清冊；真正擋住回歸的是 manifest 與檢查工具。修改任何共用功能時，請同時更新 manifest 的檢查條件，並跑一次檢查。

## 1. 目前的入口與程式位置

| 代號 | 目錄 | 狀態 | 說明 |
|---|---|---|---|
| continent1 | `rpg-continent1-universe/` | 正式版（main，PR #45 `c3fabbb`） | 第一大陸正式入口，讀取 repo 根目錄的 `minigames/` |
| rev4 | `playtest-adventure-cross-continent-recovery-rev4/` | 第二大陸試玩（本次） | 自帶 `minigames/`、`motion-comic/`、`assets/` 副本；`rpg-dual-continent-test/` 是遊戲本體 |
| dualSource | `rpg-dual-continent-test/`（main） | 已過期，封存 | main 上停在 2026-11-18，沒有第三章水域、骰子 v2、PR #45。之後若要恢復成來源，需從 rev4 回寫 |
| rev3 | `playtest-adventure-v0.4.13-test-4/` | 封存 | Integration Test 4 快照（2026-11-22）。Revision 3 在這份快照上修改 |
| 其他 | `playtest-adventure-v0.4.13*/`、`playtest-balloon-dice-v2-test-*/`（PR #43 分支） | 封存 | 歷次獨立試玩快照，不再修改 |

## 2. 共用功能清冊

| 功能 | 正確規格 | 最新正確實作（來源 PR／Commit） | 使用者驗收 | 第一大陸 | 第二大陸（rev4） | 小遊戲版本 | 實際程式／資產位置 | 已知差異及例外 | 最近驗證 |
|---|---|---|---|---|---|---|---|---|---|
| 氣球骰子 v2.0 | 260×3＋圓×1；LV1 1 顆／LV2 2 顆；勝 ×2、平 ×1、敗 ×0.5，消耗 1 顆不回滾 | 第一大陸 PR #44 `7177c92`/`bc71d16`/`524b554`；第二大陸 PR #43 `01c07f8` | 第一大陸已上線；第二大陸待驗收 | `balloon-dice.js`、`balloon-dice-interaction.js` | `chapter3-treasure-dice.js`、`chapter3-treasure-interaction.js`、`main.js` | — | 兩套實作（見 §4） | 第一大陸與第二大陸目前是兩份程式，規則相同但未共用模組 | 2026-11-25 rev4 單元 11/11、瀏覽器骰子與寶箱測試通過 |
| 骰子秘笈 RPG | 首次三句；已讀重玩保留第一及最後一句（recipeReplay） | PR #46 Revision 2 `053dc94` | Revision 2 已驗收 | — | `main.js` RPG_RECIPE_LINES | — | | PR #43 曾用 oncePerPlayer；以 Revision 2 為準 | 2026-11-25 |
| 氣球排球 | 5 分制；三位對手；完封稱號；背景＝大陸窗景淡化＋模糊，無上下鏡像 | 五分制 PR #41/#44；背景處理 v0.4.1（`c1uPrepareMinigameBg`）＋PR #44 `0ed4ff7` | 已驗收 | `minigames/volleyball/`＋`minigame-volleyball.html` | rev4 `minigames/volleyball/main.js`（與正式版相同）＋`minigame-volleyball.html`（相同） | main `minigames/volleyball/main.js` | | 預覽網域需 CORS 載入窗景（rev4 已處理） | 2026-11-25 公開 HTTPS 截圖 |
| 氣球槌打地鼠 | 解鎖、20 金幣、每關一次、BGM＝排球 BGM | PR #45 `46d4d35`（audio.js） | 已驗收 | `minigames/whack-a-mole/` | rev4 `minigames/whack-a-mole/`（audio/game/scoring 與正式版相同；config 多了試玩資產根目錄） | main | | config.js 的 ASSET_BASES 為試玩專用差異 | 2026-11-25 公開 HTTPS：BGM 播放中、扣費一次 |
| 結算 UI 2.0／詳細結算 | 正式金幣、皇冠 V 幣圖示；摘要依關卡保存，可唯讀重開（返回整備） | PR #45 | 已驗收 | `main.js` h2ShowSummary 等 | `main.js`（同步） | — | `assets/adventure/ui/items/item_coin*.png` | 第二大陸獎勵列內容依關卡不同（正常） | 2026-11-25 桌機／手機截圖 |
| 從頭挑戰 | 共用確認；LV1、清空本趟背包與秘笈；保留身份、成績、RPG 已讀 | PR #45 | 已驗收 | `advConfirmOfficialChallenge` | 同步 | — | | | 2026-11-25 瀏覽器：LV1、0 金幣、秘笈清空、歷史保留 |
| 跨大陸延續（2-4→3-1） | 同一趟、LV2、金幣、材料、道具、秘笈延續 | 既有 v0.3.99 起；PR #45 驗證 | 已驗收（第一大陸端） | — | `main.js` | — | | 帶狗出發扣 260×1 為正常規則 | 2026-11-25 瀏覽器：LV2、金幣、秘笈、槌子延續 |
| 背包 LV1／LV2 | LV2 以 80 冒險金幣購買一次 | v0.3.96 #29 | 已驗收 | `main.js` | `main.js` | — | | 開發者免費升級按鈕已於 rev4 移除（BUG-06）；第一大陸正式版程式仍保留在 devtools 內，待決策 | 2026-11-25 |
| 3-4 瀑布、雨傘分流 | 主水柱／水花／水面各 6 幀；雨傘導水與分流 | Batch D Rev7 `1ad8635`；Canvas 防護 PR #43 `607c698`/`ea8a317` | 已驗收（動畫） | — | `chapter3-umbrella-diversion.js`、`chapter3-water-runtime.js` | — | `chapter3-art/` | 預覽網域需 CORS；讀不到像素時退回原導流畫法 | 2026-11-25 公開 HTTPS 60/60 次正常分流、無 SecurityError |
| 星靈雨傘救援、商店購買引導、批量購買 | 見 Revision 3 規格 | PR #46 `ab7c398`/`d0633ab` | Revision 3 未驗收 | — | `umbrella-purchase-guide.js`、`main.js` | — | | | 2026-11-25 rev4 回歸測試通過 |
| 3-4 倒樹峽谷、第 2／4 次提示 | | PR #46 `d0633ab` | 未驗收 | — | `chapter3-water-runtime.js` | — | | | 2026-11-25 通過 |
| 溼身／風乾已讀 | 各自一生一次（oncePerPlayer） | PR #46 | 未驗收 | — | `main.js` rpgBuildScene 包裝 | — | | | 2026-11-25 |
| 導風判定、30／45／60 度 | 統一初速；45 最遠、60 最高 | v0.4.11 | 已驗收 | — | `main.js` | — | | 不調整物理 | 2026-11-25 chapter3-water 測試 2–4 通過 |
| Guest／Sandbox／DevTools 隔離 | 試玩存檔獨立命名空間；不讀寫正式資料 | 各試玩 guard | — | — | `playtest-guard.js`（命名空間 `cross-continent-recovery-rev4`） | — | | 自 Revision 3 起 guard 只強制 guest／sandbox | 2026-11-25 隔離測試 8/8 |
| 已廢止測試功能 | 不得出現在正常玩家流程 | 見 §3 | — | — | — | — | | | 自動檢查 |

## 3. 已廢止測試功能與臨時開發邏輯清點

| 項目 | 位置 | 狀態 | 處理 |
|---|---|---|---|
| 背包免費升到 LV2／回到 LV1（商店列與暫停開發面板） | `main.js` v0.3.95 | 已廢止（#29 定價 80 金幣後就沒有用途） | rev4 已移除；manifest `forbidden.obsolete-free-bag-lv2` |
| 試玩 guard 強制所有入口加上 `devtools=1` | 舊 `playtest-guard.js` | 已廢止（Revision 3） | rev4 保持只強制 guest／sandbox；manifest 檢查 |
| 試玩頁載入正式遊戲宇宙 SDK | 來源樹 `index.html` | 不應出現在試玩包 | rev4 已移除；manifest 檢查 |
| 讀取其他部署目錄的資產（Pages test-4） | PR #43 guard／CSP | 不應出現 | rev4 改用同 commit 的 GitHub Raw；manifest 檢查 |
| 999 測試武器（applyAdventureTestLoadout） | `main.js` | 合法、僅開發者模式、不寫背包 | 保留 |
| 第三章測試背包模式（`ch3bag=cumulative/stocked/empty`） | `main.js` | 合法、僅訪客沙盒＋開發者、回家還原 | 保留 |
| 翼靴倍率候選按鈕 | `main.js` | 合法開發工具 | 保留 |
| `?homeLegacy=1` 舊版小V之家 | `main.js` | 開發用回歸工具 | 保留 |
| 3-4 水池捷徑開機時出現「做出氣球槌」對話 | 開發捷徑（Revision 3 起就有） | 僅開發捷徑 | 記錄，未修改 |

## 4. 已知差異與後續建議

- 第一大陸（`rpg-continent1-universe/main.js`）與第二大陸（rev4 `main.js`）仍是兩份約 3.4 萬行的分叉程式。本次以 manifest 檢查擋住已知回歸，但沒有把共用模組抽出來（施工通知未批准大規模重構）。建議後續另開工程：先把結算 UI、從頭挑戰、背包、骰子規則抽成共用 JS 檔，兩個大陸都以 `<script>` 載入同一份。
- 試玩包是整個目錄的副本。每次發佈新試玩包時，跑一次檢查工具即可發現小遊戲或共用 UI 是不是複製到舊版。

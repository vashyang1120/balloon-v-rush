# 跨大陸共用功能同步清冊（Cross-Continent Sync Register）

最近同步：2026-11-26（Adventure v0.4.13｜Gameplay Polish & Cross-Continent Baseline Release 1：Revision 3＋4＋5＋Companion Water Animation｜Hotfix 1 正式整合，PR #48）
機器可讀版本：`docs/development/cross-continent-sync/manifest.json`
自動檢查：`node tools/sync-check/check-cross-continent-sync.cjs --archived`（CI：`.github/workflows/cross-continent-sync.yml`）

> 這份文件是人看的清冊；真正擋住回歸的是 manifest 與檢查工具。修改任何共用功能時，請同時更新 manifest 的檢查條件，並跑一次檢查。

## 1. 目前的入口與程式位置（Baseline Release 1 起）

| 代號 | 目錄 | 用途 | 說明 |
|---|---|---|---|
| continent1 | `rpg-continent1-universe/` | **第一大陸正式入口** | 遊戲宇宙進入的正式版。讀取 repo 根目錄的 `assets/`、`minigames/`、`motion-comic/`。版本 `adventure-v0.4.13-baseline-release-1` |
| dualSource | `rpg-dual-continent-test/` | **雙大陸唯一的累積開發基準** | Revision 3＋4＋5＋Hotfix 1 全部已驗收成果。讀取 repo 根目錄的 `assets/`、`minigames/`、`motion-comic/`（與第一大陸相同的資產）。存檔寫在自己的 `__c1d__` 命名空間，不讀寫第一大陸存檔。版本 `adventure-v0.4.13-dual-baseline-release-1`。**之後所有第二大陸新功能（重新挑戰制度、3-5、3-6、3-7…）都從這裡開始施工** |
| rev5 | `playtest-adventure-gameplay-polish-qa-rev5/` | 歷史試玩版本（驗收紀錄） | Revision 5＋Hotfix 1 的獨立試玩包，自帶資產副本與試玩防護。保留作為驗收紀錄，不再作為施工基準 |
| rev4 | `playtest-adventure-cross-continent-recovery-rev4/` | 歷史試玩版本（驗收紀錄） | Revision 4（PR #47 `b5b2f47`） |
| rev3 | `playtest-adventure-v0.4.13-test-4/` | 歷史試玩版本（驗收紀錄） | Integration Test 4 ＋ Revision 3 |
| 其他 | `playtest-*` | 歷史試玩版本（驗收紀錄） | 歷次獨立試玩快照，不再修改 |
| 舊版 | `rpg-continent2/` | 停用的舊版 | 停在 v0.3.98，沒有入口連到這裡；不在同步範圍 |

規則：
- 共用功能（背包、商店、HP、骰子、小遊戲、結算…）必須同時改 `rpg-continent1-universe/` 與 `rpg-dual-continent-test/`，並更新本清冊與 manifest。
- 第二大陸專用的程式（第三章關卡、水域、狗狗游泳 `chapter3-dog-water.js`、QA 測試工具 `qa-test-tool.js`、雨傘購買引導…）只放在 `rpg-dual-continent-test/`；manifest 的禁止項會擋住它們進入第一大陸。
- 第二大陸仍是開發測試狀態，沒有對一般玩家開放；遊戲宇宙只連到第一大陸正式入口。

## 2. 共用功能清冊

| 功能 | 正確規格 | 最新正確實作（來源 PR／Commit） | 使用者驗收 | 第一大陸 | 第二大陸（dualSource，原 rev4／rev5） | 小遊戲版本 | 實際程式／資產位置 | 已知差異及例外 | 最近驗證 |
|---|---|---|---|---|---|---|---|---|---|
| 氣球骰子 v2.0 | 260×3＋圓×1；LV1 1 顆／LV2 2 顆；勝 ×2、平 ×1、敗 ×0.5，消耗 1 顆不回滾 | 第一大陸 PR #44 `7177c92`/`bc71d16`/`524b554`；第二大陸 PR #43 `01c07f8` | 第一大陸已上線；第二大陸待驗收 | `balloon-dice.js`、`balloon-dice-interaction.js` | `chapter3-treasure-dice.js`、`chapter3-treasure-interaction.js`、`main.js` | — | 兩套實作（見 §4） | 第一大陸與第二大陸目前是兩份程式，規則相同但未共用模組 | 2026-11-25 rev4 單元 11/11、瀏覽器骰子與寶箱測試通過 |
| 骰子秘笈 RPG | 首次三句；已讀重玩保留第一及最後一句（recipeReplay） | PR #46 Revision 2 `053dc94` | Revision 2 已驗收 | — | `main.js` RPG_RECIPE_LINES | — | | PR #43 曾用 oncePerPlayer；以 Revision 2 為準 | 2026-11-25 |
| 氣球排球 | 5 分制；三位對手；完封稱號；背景＝大陸窗景淡化＋模糊，無上下鏡像 | 五分制 PR #41/#44；背景處理 v0.4.1（`c1uPrepareMinigameBg`）＋PR #44 `0ed4ff7` | 已驗收 | `minigames/volleyball/`＋`minigame-volleyball.html` | rev4 `minigames/volleyball/main.js`（與正式版相同）＋`minigame-volleyball.html`（相同） | main `minigames/volleyball/main.js` | | 預覽網域需 CORS 載入窗景（rev4 已處理） | 2026-11-25 公開 HTTPS 截圖 |
| 氣球槌打地鼠 | 解鎖、20 金幣、每關一次、BGM＝排球 BGM | PR #45 `46d4d35`（audio.js） | 已驗收 | `minigames/whack-a-mole/` | rev4 `minigames/whack-a-mole/`（audio/game/scoring 與正式版相同；config 多了試玩資產根目錄） | main | | config.js 的 ASSET_BASES 為試玩專用差異 | 2026-11-25 公開 HTTPS：BGM 播放中、扣費一次 |
| 結算 UI 2.0／詳細結算 | 正式金幣、皇冠 V 幣圖示；摘要依關卡保存，可唯讀重開（返回整備） | PR #45 | 已驗收 | `main.js` h2ShowSummary 等 | `main.js`（同步） | — | `assets/adventure/ui/items/item_coin*.png` | 第二大陸獎勵列內容依關卡不同（正常） | 2026-11-25 桌機／手機截圖 |
| 從頭挑戰 | 共用確認；LV1、清空本趟背包與秘笈；保留身份、成績、RPG 已讀 | PR #45 | 已驗收 | `advConfirmOfficialChallenge` | 同步 | — | | | 2026-11-25 瀏覽器：LV1、0 金幣、秘笈清空、歷史保留 |
| 跨大陸延續（2-4→3-1） | 同一趟、LV2、金幣、材料、道具、秘笈延續 | 既有 v0.3.99 起；PR #45 驗證 | 已驗收（第一大陸端） | — | `main.js` | — | | 帶狗出發扣 260×1 為正常規則 | 2026-11-25 瀏覽器：LV2、金幣、秘笈、槌子延續 |
| 背包 LV1／LV2 | LV2 以 80 冒險金幣購買一次 | v0.3.96 #29 | 已驗收 | `main.js` | `main.js` | — | | 開發者免費升級按鈕：rev4 移除（BUG-06）；第一大陸於 Revision 5（A-07）移除；測試用背包等級改由 QA 測試工具設定 | 2026-11-26 |
| 3-4 瀑布、雨傘分流 | 主水柱／水花／水面各 6 幀；雨傘導水與分流 | Batch D Rev7 `1ad8635`；Canvas 防護 PR #43 `607c698`/`ea8a317` | 已驗收（動畫） | — | `chapter3-umbrella-diversion.js`、`chapter3-water-runtime.js` | — | `chapter3-art/` | 預覽網域需 CORS；讀不到像素時退回原導流畫法 | 2026-11-25 公開 HTTPS 60/60 次正常分流、無 SecurityError |
| 星靈雨傘救援、商店購買引導、批量購買 | 見 Revision 3 規格 | PR #46 `ab7c398`/`d0633ab` | Revision 3 未驗收 | — | `umbrella-purchase-guide.js`、`main.js` | — | | | 2026-11-25 rev4 回歸測試通過 |
| 3-4 倒樹峽谷、第 2／4 次提示 | | PR #46 `d0633ab` | 未驗收 | — | `chapter3-water-runtime.js` | — | | | 2026-11-25 通過 |
| 溼身／風乾已讀 | 各自一生一次（oncePerPlayer） | PR #46 | 未驗收 | — | `main.js` rpgBuildScene 包裝 | — | | | 2026-11-25 |
| 導風判定、30／45／60 度 | 統一初速；45 最遠、60 最高 | v0.4.11 | 已驗收 | — | `main.js` | — | | 不調整物理 | 2026-11-25 chapter3-water 測試 2–4 通過 |
| Guest／Sandbox／DevTools 隔離 | 試玩存檔獨立命名空間；不讀寫正式資料 | 各試玩 guard | — | — | `playtest-guard.js`（命名空間 `cross-continent-recovery-rev4`） | — | | 自 Revision 3 起 guard 只強制 guest／sandbox | 2026-11-25 隔離測試 8/8 |
| 武器・裝備分頁（A-01） | 骰子顯示圖示、名稱、數量、上限（LV1 1／LV2 2），沒有耐久條；雨傘也顯示 | Revision 5 `11edb0c` | 待驗收 | `main.js` h2DiceBagRowHtml、v396BagRows | 同步 | — | | | 2026-11-26 rev5 回歸測試（兩個大陸） |
| 氣球雨傘上限（A-02） | LV1 2 把／LV2 4 把；超過上限的既有庫存不沒收、只是不能再做 | Revision 5 `11edb0c` | 待驗收 | `V395_BAG.caps` | 同步 | — | | | 2026-11-26 |
| 急救包文字（A-03） | 「使用後直接補滿生命。」 | Revision 5 | 待驗收 | `SHOP_ITEMS.firstAidKit` | 同步 | — | | | 2026-11-26 |
| 暫停畫面 HP 即時更新（A-04） | 任何補血後暫停畫面立即重畫 | Revision 5 | 待驗收 | rev5HpSyncInstall | 同步 | — | | | 2026-11-26 |
| 商店造型入口隱藏（A-05） | 只留「冒險道具」；資料保留 | Revision 5 | 待驗收 | `H2_SHOP_TABS` | 同步 | — | | | 2026-11-26 |
| 批量購買上限（A-06） | 上限＝min(買得起, 背包剩餘)；按鈕到上限變灰 | Revision 5 | 待驗收 | h2ShopAffordable／h2ShopRoom | 同步 | — | | | 2026-11-26 |
| 氣球骰子音訊（Batch G） | 邀約→小遊戲 BGM；選「是」→ 金色油管環音效一次；骰子音效 6.661 秒，播完同時揭曉；勝／敗音效一次、平手無；結束恢復關卡 BGM | Revision 5 `a8347d5`／`927f1a5` | 待驗收 | `balloon-dice-audio.js`（逐位元相同）＋`balloon-dice.js`／`balloon-dice-interaction.js` | `balloon-dice-audio.js`（相同）＋`chapter3-treasure-dice.js`／`chapter3-treasure-interaction.js` | 排球 BGM／勝敗音效 | `assets/audio/sfx/item/balloon_dice_roll.mp3`（兩份 SHA-256 相同） | | 2026-11-26 瀏覽器實測時間軸（勝／敗／平） |
| 3-2 開頭風刃蠍子、風刃射程（Batch B） | 新增一般蠍子 x 700；風刃為獨立飛行物；一般風刃 480 px 連續淡出 | Revision 5 `c7a081d` | 待驗收 | — | `main.js` | — | | 只在第二大陸 | 2026-11-26 |
| 3-4 樹峽谷受傷演出、寶箱、鏡頭、捷徑（Batch C） | 見 Revision 5 報告 | Revision 5 `407567d`／`c50e462`／`d1c4c1e` | 待驗收 | — | `main.js`、`chapter3-water-runtime.js`、`chapter3-treasure-interaction.js` | — | | 只在第二大陸 | 2026-11-26 |
| 暫停背景依大陸（D-01） | 第二大陸用風之峽谷窗景 | Revision 5 `ddda10f` | 待驗收 | 共用程式（第一大陸沒有第二大陸關卡，不受影響） | `main.js` c1dSyncPauseBg | — | | | 2026-11-26 |
| QA 測試工具（Batch E） | 只在訪客沙盒＋開發者模式；遊玩中隱藏按鈕 | Revision 5 `563ce3d` | 待驗收 | — | `qa-test-tool.js` | — | | | 2026-11-26 |
| 氣球小狗游泳（Hotfix 1） | 3-4 水池：依小狗自己的位置進入水中；循環走路圖划水；鼻子在水面上 11.2 px；水下部分用小V的水色與漸淡 | Companion Water Animation｜Hotfix 1 | 待驗收 | —（第一大陸沒有水池，不載入） | `chapter3-dog-water.js` | — | | 共用的小狗程式（`getDogPoseKey`、`drawCompanionDog`）沒有修改，只在第二大陸包裝 | 2026-11-26 |
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
| 3-4 水池捷徑開機時出現「做出氣球槌」對話 | 開發捷徑（Revision 3 起就有） | 僅開發捷徑 | Revision 5（C-07）修正：捷徑測試存檔把這段教學標為已讀，正式教學規則不變 |
| 第一大陸商店／暫停的免費 LV2 測試按鈕 | `rpg-continent1-universe/main.js` | 已廢止 | Revision 5（A-07）移除；manifest 對 continent1 也檢查 |

## 4. 已知差異與後續建議

- 第一大陸（`rpg-continent1-universe/main.js`）與雙大陸開發基準（`rpg-dual-continent-test/main.js`）仍是兩份約 3.4 萬行的分叉程式。以 manifest 檢查擋住已知回歸；共用模組集中管理（Revision 4 F-03）總 PM 已採納方向，但目前不批准大規模重構，列為長期待辦。
- 歷史試玩包是整個目錄的副本，只作驗收紀錄；不要再從試玩包複製程式回來。新功能直接在 `rpg-dual-continent-test/` 施工，需要獨立試玩時再從它打包。

## 5. Revision 4 待決策事項（Baseline Release 1 結案狀態）

| 編號 | 事項 | 狀態 |
|---|---|---|
| F-01 | 第一大陸免費 LV2 測試按鈕 | 已結案（Revision 5 A-07 移除，Baseline Release 1 正式發布） |
| F-02 | 過期的 `rpg-dual-continent-test/` | 已結案（Baseline Release 1 以 Revision 5＋Hotfix 1 更新為雙大陸累積開發基準） |
| F-03 | 共用模組集中管理 | 長期待辦（方向已採納，未批准重構；待另行安排架構調查） |
| F-04 | 水池捷徑誤觸發氣球槌教學 | 已結案（Revision 5 C-07；開發基準實測仍正確） |

# Balloon Dice v2.0｜Cross-Continent Integration Test 1

工程基準為 `integration/ch3-abcd-test-4` 的 `ea09f609c80f6c790de7e870df5256f5718a2881`，依賴 [Draft PR #42](https://github.com/vashyang1120/balloon-v-rush/pull/42)。正式入口比對基準為 `main` 的 `40c77494bf24362c0fc87453a5c3b610abb8c130`。本測試的程式版本為 `adventure-v0.4.13-balloon-dice-v2-cross-continent-test-1`。試玩程式與素材位於 `playtest-balloon-dice-v2-test-1/`，使用專屬訪客儲存前綴及原有隔離措施。

## 關卡與獎勵

| 關卡／來源 | 位置（世界座標） | 素材、獎勵與規則 |
| --- | --- | --- |
| 1-2 骰子秘笈 | (3800, 300)，後段高台 x=3700–3850、平台頂 y=330。在氣球槌秘笈 (2380, 310) 後方。 | 沿用尋寶、鼻光、秘笈展示與通關解鎖。重玩仍可發現，已看的對話由既有 RPG 紀錄抑制。 |
| 1-3 金幣包 | (605, 298)，入口後的第二座可跳達平台 x=520–640、頂 y=330。 | 既有金幣包 PNG，+10，無狗即可拾取。 |
| 2-1 金幣包 | (1480, 315)，上路平台。 | +10。 |
| 3-1 金幣包 | (3800, 190)，C 段高台。 | +10。 |
| 3-4 金幣包 | 初始 (3632, −320)，水池浮墊；拾取座標繼續跟隨浮墊。 | +10；水域互動未改。 |
| 2-2 普通寶箱 | (3790, 474)，既有低處坑道。 | 普通寶箱正式 PNG，40；需要同行氣球狗。原氣球排球秘笈仍在相同位置。 |
| 3-1、3-3、3-4 寶箱 | 既有早段高台、C 段高台、右岸。 | 40／60／100，皆需同行氣球狗，包含 3-4。 |

1-2 對話順序與正式文字：

1. 小V（驚訝）「咦？這裡竟然藏著一本氣球秘笈！」
2. 小V（思考立繪暫代好奇）「氣球骰子？原來用氣球也能做出骰子啊！」
3. 小V（思考）「可是氣球骰子可以做什麼呢？」

立繪目錄有 `balloonv_surprised`、`balloonv_thinking`，未找到專用好奇立繪。第一句走既有單擊發現頁，後兩句接續既有秘笈頁。星靈只在持有骰子碰觸金幣包或發現寶箱後走原邀約流程。道具文案為「帶著氣球骰子，遇到金幣包或隱藏寶箱時，發揮你的強運，帶走更多金幣吧！」製作與容量維持 260 ×3、圓 ×1，背包 LV1／LV2 分別為 1／2 顆。

## 存檔與主要改動

- `rpg-dual-continent-test/main.js`：`vbPickupExtra` 及 `rpgBuildScene` 接上 1-2 秘笈，移除通關自動授予骰子配方與開家自動補發。`v395PickupStep` 區分四個金幣包與散落金幣；`triggerClear` 將當趟骰子來源金幣加入正式背包。`restoreLevelStartSnapshot` 始終按已存的消耗序號還原骰子數。`c34OpenTestHome` 支援第一、第二大陸的隔離快捷。
- `chapter3-treasure-interaction.js`：`offerDiceReward` 共用已有邀約、骰子動畫、選擇和顯示；`ch3TreasureClaim` 負責當趟去重、回饋及暫存；`spendDiceForReward` 先保存扣除與序號，寫入失敗保留原骰子與未領取狀態。舊 `chapter3Chests` 可隨原存檔欄位存在，重玩判定以執行期的當趟領取集合為準。測試入口的專屬存檔也走相同扣除。
- `chapter3-treasure-dice.js`：保留舊測試涵蓋的分級 API，加上包／箱共用的本金結算。
- `index.html`、`tests/` 與 `playtest-balloon-dice-v2-test-1/`：更新測試載入版本、增加骰子行為測試，現有 Chrome 測試改驗證本趟暫存及有狗的 3-4 正常路徑。試玩頁提供由 1-1 開始、由 3-1 前小V之家開始與單關快捷。

## 其他收集限制與舊關卡

- 3-2 氣球排球秘笈的 `vbExtraAvailable` 仍讀 `c2Flow().explore`，曾探索的存檔不重生。屬現有其他收集物，已列異常供總 PM 另行核對。
- 1-3 圓氣球有舊 `uniqueCollectibles.level3RoundBalloon` 旗標。此基準內旗標有初始化、複製及通關寫入，未看到同名欄位被用來停止該關生出圓氣球。動態圓氣球配置另依背包與關卡既有規則。
- 圖釘工坊仍在 `LEVELS` 原索引，正式主線、挑戰索引與試玩清單未列。部分正式判定仍用關卡陣列數字索引，而進關快照也保留 `levelIndex`。清理前宜盤點所有索引使用、歷史存檔和開發載入工具，先遷移至 stable stageId，再另案移出正式執行配置。本次保留原始資料及素材。

## 發布與測試結果

- 線上試玩固定提交 `26df0719cf9848b7857da18b79a348fa8b7f18c9`，和成功 CI 的遊戲程式及試玩資產相同。後續提交 `ea24cbc6eb642cf9fce98be7db5098537fba39aa` 調整測試操作，遊戲來源 Git blob 保持一致。第三方試玩入口初次可能出現 External Content Notice，按 **Open the page** 即可進入。測試版只從既有 Test 4 讀取共用素材，進度與存檔保存在獨立訪客空間。 [試玩總入口](https://rawcdn.githack.com/vashyang1120/balloon-v-rush/26df0719cf9848b7857da18b79a348fa8b7f18c9/playtest-balloon-dice-v2-test-1/index.html)
- [第一大陸完整出發入口](https://rawcdn.githack.com/vashyang1120/balloon-v-rush/26df0719cf9848b7857da18b79a348fa8b7f18c9/playtest-balloon-dice-v2-test-1/rpg-dual-continent-test/index.html) 由飛行屋與開場漫畫進 1-1。[第二大陸出發入口](https://rawcdn.githack.com/vashyang1120/balloon-v-rush/26df0719cf9848b7857da18b79a348fa8b7f18c9/playtest-balloon-dice-v2-test-1/rpg-dual-continent-test/index.html?ch3test=3-1) 從小V之家備妥氣球槌並安排小狗，由 3-1 開始。總入口另有 1-2、1-3、2-1、2-2、3-1～3-4 快捷。
- 已確認發佈前 `main` 仍為 `40c77494bf24362c0fc87453a5c3b610abb8c130`，工程 PR 維持 Draft 並指向 PR #42 的分支。 [Draft PR #43](https://github.com/vashyang1120/balloon-v-rush/pull/43)

| 驗證 | 結果 |
| --- | --- |
| 純程式測試 | 10/10。包／箱規則、四種擲骰結果、舊旗標相容、狗條件、失敗寫入回復、骰子計數還原及當趟重領。 |
| 1-1／1-2 | 已實際開線上開場並進 1-1。Chrome 從 1-2 前的小V之家安排小狗出發，以正常走跳通關 1-2，發現骰子秘笈，驗證三句台詞、原有槌子秘笈及回家後製作一顆骰子。 |
| 1-3／2-2 截圖 | 1-3 為遊戲畫面，2-2 使用位置測試顯示新普通箱。截圖只佐證畫面與配置。 |
| 3-4 完整單關 | PC 鍵盤與 844×390 Chrome 觸控模擬各一次：在家製作骰子、安排狗同行、走過瀑布與浮墊、右岸寶箱擲骰、回家通關、重載確認結算及骰子扣除。 |
| 其他 Chromium 測試 | 通過隔離存檔、水域回歸、舊規則不能阻止當趟重玩、第三章獎勵暫存／回滾等測試。成功執行合計 34/34。 |
| 重跑穩定性 | 同一提交的 push 執行為 32/34，有第一大陸測試逾時與 3-4 觸控腳本在右岸戰鬥失敗。PR 執行為 34/34。 |
| 待驗收 | 尚未以不間斷新存檔完整走過 1-1→2-2→2-4→3-1～3-4，也尚未驗證實體手機。總 PM 與使用者須依試玩入口實際驗收。 |

[通過的 GitHub Actions](https://github.com/vashyang1120/balloon-v-rush/actions/runs/45161444984)｜[同提交的 push 執行](https://github.com/vashyang1120/balloon-v-rush/actions/runs/45161426132)｜[1-3 與 2-2 截圖 ZIP](https://github.com/vashyang1120/balloon-v-rush/actions/runs/45161444984/artifacts/14812775154)

截圖檔名為 `1-3-coin-bag.png` 與 `2-2-normal-chest-render-fixture.png`，壓縮檔也附第三章的測試圖。

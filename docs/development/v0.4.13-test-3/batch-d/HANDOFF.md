# Chapter 3-4 | Batch D 工程交接

版本 `adventure-v0.4.13-ch3-water-terrain-integration-test-3`。施工分支 `dev/ch3-water-terrain-batch-d`，Draft PR #40 的基準是 Batch C。

## 分支核對

| 分支 | 開工時的 HEAD | 與 Batch D 基準 C 相比，左右獨有提交 |
| --- | --- | --- |
| main | `562fcee6f9d645126ba40962f74cb16394ccbd57` | 14 / 48 |
| Batch A／#37 | `adf899766d3faf319af73bd27668bb7e4ee77b19` | 0 / 20 |
| Batch B／#38 | `19d6b554560b8a4d8f2ae5d0517babd548ed44ad` | 28 / 23 |
| Batch C／#39 | `f5008de3d0657c6973bac9e541c2d39a744a09a6` | 0 / 0 |

#37 相對 main 有合併衝突。#38 相對目前 A 已分岔（A 獨有 3 個提交，B 獨有 28 個）。#39 以 A 當前提交為基準，C1–C3 全部保留。D 從 C 直接分支，施工時沒有合併衝突，不需取捨任何已驗收的 C 變更。A 飛行、敵人、倒樹峽谷追加需求和 B 骰子／寶箱不在 D 變更內。

## 施工與素材

- `f0c81b4` 沿用正式 08 和 09，以移動速度切換，使用陸地頭部比例與手掌水線，半透明繪製完整水下區域。
- `ec579e3` 使用浮墊的站立面判斷連續落地、側面與底面接觸，沿用漂浮與承重狀態。
- `848c824` 使用 v1.3 美術清單已鎖定的 17 號六幀原圖，逐張核對 SHA-256，相機依實際岸緣與水面定位。按左加跳可在可達岸緣攀回左岸。
- `3d83312` 移除橘色岩棚及其碰撞。第二道落水點仍沿用 94 世界單位的最小偏移，保留 C2 水花與浮墊間距。救援判斷結合水深、游泳起跳、岸緣高度與浮墊回岸距離。
- 首次受困依序播放小V和星靈兩頁，結束才回到左岸距岸緣 72 世界單位的安全點。警告需獲救後主動向右靠近岸緣。再次受困直接回岸。救援只移動玩家與相機並播放亮光。
- 立繪源自「製作慌張立繪」聊天中已確認的 v3.0 圖片，下載檔為「驚慌抓髮的氣球男孩.png」。核對畫面為雙手抓頭，白襯衫與外層粉黃紫背心，以及透明 RGBA PNG，1122×1402。遊戲路徑為 `rpg-dual-continent-test/chapter3-art/balloonv_panic_v3.png`。SHA-256 `752551988bc1986b29e44afdae4aca927ffb305aa8dc5e0fd6f4e33536b0e158`。

## 驗證入口

本機執行 `node tests/preview-entry.cjs`，用 `/rpg-dual-continent-test/?guest=1&sandbox=1&devtools=1&ch3test=pool` 開啟水池捷徑，或將 `pool` 改成 `start` 從第三章 3-4 起點遊玩。Chrome 自動回歸包含首次載入、美術、蓄水、浮墊承重、跳上右岸、20 秒自然風乾／5 秒風口、救援時序與存檔。救援個案從近岸測試起點以鍵盤或觸控事件操作。水位與幾何邊界另由固定場景測試。

[Draft PR #40](https://github.com/vashyang1120/balloon-v-rush/pull/40)

## 驗證與隔離發布

- 51 項入口、章節、稱號、骰子和瀏覽器回歸通過，另有打地鼠內部 92 項規則通過。加強水池操作錄影後另重跑 19 項 Chapter 3 瀏覽器檢查，全部通過。
- 桌機與 844×390 的 Chromium 手機橫向模式各跑一次。兩支錄影用測試座標與水位設定切換場景，各段使用相應鍵盤或觸控操作驗證落水、對話、安全回岸、再次靠岸提醒、中水位游泳攀爬，以及滿水浮墊跳上右岸。裝置驗證使用瀏覽器模擬。
- Pages 精確目錄的隔離瀏覽器測試 7 項通過。測試涵蓋一般入口、3-4 起點、3-4 水池、3-1 至 3-3、測試背包持久化、正式存檔探針和寫入網路封鎖。
- Pages 提交 `cc73dacbaf821fe472f378ef1c7013918704dabb` 是獨立快轉提交。差異僅新增 `playtest-adventure-v0.4.13-test-3-batch-d/` 內 765 個檔案，使用 `balloon-v-rush:adventure-playtest:v0.4.13-test-3-batch-d:` 存檔前綴。遊戲工程 Draft PR #40 仍以 Batch C 為基準。
- [Pages Actions](https://github.com/vashyang1120/balloon-v-rush/actions/runs/44894735813) · [試玩首頁](https://vashyang1120.github.io/balloon-v-rush/playtest-adventure-v0.4.13-test-3-batch-d/) · [3-4 起點](https://vashyang1120.github.io/balloon-v-rush/playtest-adventure-v0.4.13-test-3-batch-d/rpg-dual-continent-test/?ch3test=start) · [3-4 水池](https://vashyang1120.github.io/balloon-v-rush/playtest-adventure-v0.4.13-test-3-batch-d/rpg-dual-continent-test/?ch3test=pool)。

## Revision 1｜雨傘防水與水中待機

以既有 `dev/ch3-water-terrain-batch-d` 的 `6c415aea490559c71bd112b6e88b84ae501b4d72` 續作，沿用 Draft PR #40 與原 Batch D 試玩目錄。開工時 main 的 Pages 基準為 `cc73dac`。版本維持 `adventure-v0.4.13-ch3-water-terrain-integration-test-3`。

- **防水根因**　即使傘面完全沒有和水柱相交，原先仍以「已裝備雨傘且人在瀑布範圍」建立傘面判定，接著取消沖淋。修正以當前傘面幀、面向、縮放與錨點計算攔截。傘面完全遮住頭頂直接接觸的水柱範圍時才防水，部分攔截同時保有分流水與仍可沖淋的垂直水柱。最外緣薄水霧不算直接沖頭。
- **防水與畫面**　兩道瀑布共用同一次接觸判定。照常計算潮溼與 18A，側擋淋溼時合成既有側向傘面及整套 18A。分流仍沿用 175% 厚度係數、核准傘沿接縫與水面撞擊水花。敵人格擋和耐久函式沒有修改。
- **待機根因**　正式 08 原檔是一張 PNG，舊版切到 08 時只畫同一幀並整體浮動。修正以 08 原圖的手腳區域做 16 個循環相位，約 1.2 秒一輪，從遊戲時間取樣。保持頭部錨點、身形畫布尺寸、手掌水線與上下兩層的遮罩。09 四幀與方向翻轉沿用既有速度，停止回 08，離水後交回跳躍與攀爬。
- **回歸**　53 項入口、章節與瀏覽器檢查通過，打地鼠內部 92 項規則通過。涵蓋雙瀑布幾何、08 手腳像素及循環閉合、自然 20 秒與風口 5 秒、浮墊、攀爬、救援、蓄水、敵人格擋與完整 3-4 通關。實際 Pages 目錄另通過 7 項隔離檢查。
- **發布範圍**　Pages 提交 `1e58892e3ebb011d7c50c743ce3492b84fdd72d4` 只修改既有 Batch D 目錄內的六個檔案。存檔前綴沿用 Batch D，其他試玩目錄及正式入口不受變更。

[Draft PR #40](https://github.com/vashyang1120/balloon-v-rush/pull/40) · [Revision 1 HTTPS 試玩](https://vashyang1120.github.io/balloon-v-rush/playtest-adventure-v0.4.13-test-3-batch-d/)

### Revision 1 操作錄影

各案例都有桌機鍵盤與 844×390 Chromium 橫向觸控版本。從既有 3-4 起點或水池捷徑開場，切換工具、走到瀑布、按住格擋、蓄水、游泳和攀爬皆使用可見按鈕或鍵盤。錄影腳本只讀取遊戲狀態以核對結果。

1. `01-first-waterfall`　第一道瀑布頭頂撐傘、側擋、恢復頭頂撐傘及收傘，格擋前後讀取相同耐久。
2. `02-second-waterfall`　第二道瀑布重複相同操作並確認潮溼與 18A。
3. `03-idle-paddling`　由雨傘實際蓄水後走進水池，放開方向鍵，留在 08 划水超過兩個週期。
4. `04-swim-and-climb`　蓄水後用左右操作切 09，放開回到 08，再用左與跳攀回岸上。

[Revision 1 Pages Actions](https://github.com/vashyang1120/balloon-v-rush/actions/runs/44912318174)

## Revision 2｜分流、原版游泳與攀上浮墊

- 兩道瀑布共用固定分流粗細，面向側 175%，背向側 50%。第二道以實際落入水池的支流蓄水，細流速度採粗流的 10%。
- 水中始終循環播放正式 09。無方向輸入立即停止水平位移並保留最後朝向，動畫持續播放。移除 Revision 1 自製的 08 手腳變形。
- 游向浮墊邊緣時停住並播正式 17 攀爬，結束依浮墊站立面落地。左岸攀爬、陸地跳上浮墊和滿水跳右岸沿用原操作。
- 倒樹峽谷落坑免扣血及兩次／四次 RPG 提示仍列為 Batch A 補充。

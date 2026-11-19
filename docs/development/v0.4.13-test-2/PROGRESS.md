# test-2 工程進度

| 階段 | 狀態 |
|---|---|
| A | 三種 3-4 沙盒背包、關卡固定資源與已核實額外來源清點已完成首輪。正式挑戰完整回歸、條件獎勵與重玩／掉落統計待補。 |
| B | Addendum 01、02 已實作並有實際遊戲證據。池底連續岩體、浮墊錢袋跟隨及兩道瀑布傘面攔截已完成首輪驗證。其餘岩壁拼接、窄岩柱與樹木需比對驗收。 |
| C | 3-4 首個峽谷已調整可見安全高台，恢復三個角度，沿用既有導風失敗事件顯示小V的兩段定案提示。完成 Chromium 受控軌跡驗證。 |
| D | 3-1～3-4 配置已調整，敵人等級及資源配置可驗證。全關戰鬥節奏與寶箱配置待實機。 |
| E | 三級寶箱美術對應與骰子原始定案規則待核，動畫與參數化獎勵仍待施工。 |
| F | 小V之家詳細結算已改為重開通關當次的新版結算，完成 Chromium 驗證。 |
| G | PR CI 已加入第三章與稱號測試。整關與線上試玩部署待續。 |

初次工程檢查點 `9f51e84f1c10c20fd2131a62bb57eae50ccb1f1b`。本檔所在的後續提交新增傘面攔截、Loading 修正和複驗紀錄。最新版本及下一步見 [HANDOFF](HANDOFF.md)。

## Recovery 接管檢查點

- 接管基準 `334b50a0c4f959525a72a5142026dc16e4b657cd`。核對 SPEC、Addendum 01／02、交接檔及 [Actions 44542481379](https://github.com/vashyang1120/balloon-v-rush/actions/runs/44542481379)。當時 CI 只跑既有入口 Chromium，第三章專用瀏覽器測試須另列。
- 本次將第三章水域 Chromium 與稱號測試接入 PR CI。完整開發仍按 A–G 的待辦續行。

- 階段 F 與第三章測試修復自 `065320b7f1af8bcf72368d2e15e2647c149052f9` 續接。變更 `main.js` 和 `tests/chapter3-water.browser.cjs`。第三章 Chromium 6 通過、0 失敗。雙入口 Chromium 已在接管基準通過，入口／稱號 Node 23 和打地鼠 92 項亦已通過。

- 階段 C 自 `2d7896d580d60809ba3e05455c6f6167d965e964` 續接。變更 `rpg-dual-continent-test/main.js`、`chapter3-water-runtime.js`、`tests/chapter3-water.browser.cjs`。第三章 7 通過；前一檢查點完整本機 Node／隔離 Chromium 33 通過，打地鼠核心另外列 92 項通過。仍需整關及使用者實機操作。

- 階段 A、D 自 `2da85c1a9c2d3a9cd66dda62c6ab3d286590eb94` 續接。更新 `main.js`、第三章 Chromium 測試、資源產生器和統計檔。第三章 Chromium 9 通過、0 失敗。

- 岩壁、池壁與倒樹檢查點以 `777812371ede0a33a129276a87f9baa0ec6354ca` 續接。共用岩壁貼圖定位，邊緣以原素材柔接，窄岩柱維持 14 號獨立圖，樹使用既有懸崖樹與草皮。桌機 Chromium 第三章 10 通過。修正上次 Actions 的共用背景 Playwright 情境與水池出生即觸及水柱問題，重新跑 PR CI。

- E 狀態：已完成參數化獎勵、一次性領取決策與擲骰繪製／動畫核心。5 項 Node 測試通過。實際寶箱出現、骰子圖檔、星靈邀約與存檔串接待原始素材及定案規則。
- G 狀態：既有 [Adventure entry reliability](https://github.com/vashyang1120/balloon-v-rush/actions/runs/44569196581) 已通過。沿用現行 Pages guard 與路徑的隔離 Chromium fixture 4 項通過，含三入口、手機左方向觸控、寫入嘗試拒絕、同來源正式存檔前後一致。新增兩套測試至 PR CI。線上 test-2 部署仍待 E 與完整遊戲回歸。

- 關卡切換複查發現疾風蠍子的正式圖仍只掛在 3-3。現將共用快取接到 3-1～3-4 的素材讀取，手機 3-4 直接讀取的畫面檢查通過。Actions 22 的 Pages fixture 因舊版 Playwright 等待方式碰到既有 CSP，改為測試端輪詢並保留所有隔離規則。

## E 續接｜氣球骰子與三級寶箱

- 以 `c7ac7ca62540f2fe9d4c0e7ce84059b419a9b446` 接上既有遊戲製作、背包容量、RPG、寶箱獎勵、失敗回滾及遊戲存檔。新增普通、稀有、珍貴各一個試玩寶箱。
- 使用者已指定 3 條 260＋1 顆圓氣球、背包 LV1 1 顆／LV2 2 顆、找到隱藏寶箱且持有骰子就邀約、次數不限，以及鎖定的邀約台詞。本次以 Final Recovery 更正為每次接受消耗一顆，拒絕不消耗。
- Chromium 第三章 11 通過。已看到五張附圖，但目前無法下載 PNG 原始位元組。素材視覺驗收、完整回歸與線上部署待素材到位。

## Revision 2 Final Recovery｜骰子消耗

- 核對最新 Draft PR HEAD `337d5ff6218b0dbbde6e9a294442bd703e9b2683`，父提交為 `c7ac7ca62540f2fe9d4c0e7ce84059b419a9b446`。接受時將一顆骰子、獎勵及寶箱紀錄一起保存。拒絕保留原額及骰子。動畫沿用同一組點數。
- 本機 Node 28 項及打地鼠核心測試通過。前次瀏覽器失敗是退出邀約時同時拾到地圖金幣，已固定測試位置，並加入當場存檔斷言。新版 Chromium CI 待跑。核准原圖尚待取得可核對的 PNG 位元組，G 完整通關與 HTTPS 部署待續。

- Actions #25 到達遊戲互動，拒絕獎勵通過。新增的存檔斷言誤讀正常入口鍵，已改讀 3-4 快捷入口獨立背包鍵。實際 Chromium 使用本機遊戲檔案重跑第三章測試 11/11 通過（包含拒絕與接受、存檔、手機尺寸和結算重開）。

- 五張核准 PNG 原檔已取得並以原始位元組提交。兩張骰子為斜角 2/1/3 點與空白正面。三級寶箱為木質金框、藍色銀框、金色紫寶石。待完成遊戲畫面驗證與 Pages 部署。

## G｜完整通關與試玩入口

- 第三章本機 Chromium 13/13 通過。3-4 從起點以固定步的方向、跳躍與攻擊輸入完整走到結算及小V之家，包括 60° 飛行、倒樹橋、登頂、導水、浮墊及右岸；角色全程由物理推進。核准五圖均由遊戲成功讀取，骰面顯示符合結果。骰子視窗在桌機置中，手機橫向以觸控接受、擲骰及返回。
- 既有 Pages 隔離規則的 Chromium 測試 7/7 通過，涵蓋完整入口、3-4 起點及水池、3-1／3-2／3-3 共六種入口，並驗證手機觸控、存檔隔離及外部寫入攔截。雙入口與小遊戲 Chromium 3/3 通過，含正式挑戰 Loading 資源失敗／重試、排球、打地鼠。仍待覆核實際 HTTPS 與完整 CI。

## test-2 線上試玩交付

- 開發與驗收程式提交 `e38caa9919e515b731f0fad9d75590161b1fff0b`。部署提交 `423c2043cb1d860cfe38dd14f3d874576e3c8291`，只更新 main 既有的 `playtest-adventure-v0.4.13/`。Draft PR #37 保持開啟。
- [開發 Actions](https://github.com/vashyang1120/balloon-v-rush/actions/runs/44583784616) 通過 28 項 Node、23 項 Chromium 與 92 項打地鼠核心測試。[Game Pages 部署](https://github.com/vashyang1120/balloon-v-rush/actions/runs/44583929075) 通過。[Chromium 遊戲截圖](https://github.com/vashyang1120/balloon-v-rush/actions/runs/44583784616/artifacts/14560951225) 曾記錄 3-4 完整通關、小V之家、桌機及手機擲骰。
- 以線上瀏覽器逐一進入六個 HTTPS 入口，確認版本與畫面。3-4 起點首次有必要圖片逾時，按一次「重新載入」即進入關卡。其餘五個入口本輪直接進入。

| 試玩入口 | HTTPS |
| --- | --- |
| 雙大陸 | [開啟](https://vashyang1120.github.io/balloon-v-rush/playtest-adventure-v0.4.13/rpg-dual-continent-test/) |
| 3-4 起點 | [開啟](https://vashyang1120.github.io/balloon-v-rush/playtest-adventure-v0.4.13/rpg-dual-continent-test/?ch3test=start) |
| 3-4 水池 | [開啟](https://vashyang1120.github.io/balloon-v-rush/playtest-adventure-v0.4.13/rpg-dual-continent-test/?ch3test=pool) |
| 3-1 風之峽谷 | [開啟](https://vashyang1120.github.io/balloon-v-rush/playtest-adventure-v0.4.13/rpg-dual-continent-test/?ch3test=3-1) |
| 3-2 雨傘試煉 | [開啟](https://vashyang1120.github.io/balloon-v-rush/playtest-adventure-v0.4.13/rpg-dual-continent-test/?ch3test=3-2) |
| 3-3 蠍群岩道 | [開啟](https://vashyang1120.github.io/balloon-v-rush/playtest-adventure-v0.4.13/rpg-dual-continent-test/?ch3test=3-3) |

3-1、3-2、3-3 本輪完成入口及場景回歸，3-4 完成整關。正式挑戰在線上訪客沙盒以小V之家按鈕確認，觀察到 1-1 飛行地圖、開場故事與教學。受控 Loading 狀態不運作的數值驗證及背包和詳細結算隔離見 ACCEPTANCE。

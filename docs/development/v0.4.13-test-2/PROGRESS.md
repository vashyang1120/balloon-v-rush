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

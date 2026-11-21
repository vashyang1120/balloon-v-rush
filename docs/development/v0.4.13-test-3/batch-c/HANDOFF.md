# C1 工程交接

基準 `adf899766d3faf319af73bd27668bb7e4ee77b19`。分支 `dev/ch3-water-terrain-batch-c`，Draft PR 指向 `dev/ch3-water-terrain-integration`。

遊戲程式提交 `9986af7c8300cab243e97a37851d3e241dff2ada`。[Draft PR #39](https://github.com/vashyang1120/balloon-v-rush/pull/39) 保持開啟。

部署提交 `910a8abcc3fd5969c476c084fcce7b2d2c0fe705` 只新增 `playtest-adventure-v0.4.13-test-3-batch-c/`。該試玩使用存檔前綴 `balloon-v-rush:adventure-playtest:v0.4.13-test-3-batch-c:`。

- [試玩首頁](https://vashyang1120.github.io/balloon-v-rush/playtest-adventure-v0.4.13-test-3-batch-c/)
- [3-4 起點](https://vashyang1120.github.io/balloon-v-rush/playtest-adventure-v0.4.13-test-3-batch-c/rpg-dual-continent-test/?ch3test=start)
- [3-4 水池](https://vashyang1120.github.io/balloon-v-rush/playtest-adventure-v0.4.13-test-3-batch-c/rpg-dual-continent-test/?ch3test=pool)
- [GitHub Actions Pages 部署](https://github.com/vashyang1120/balloon-v-rush/actions/runs/44776836248) 成功。首頁、起點、水池及隔離守衛皆回應 HTTP 200。兩個關卡入口的來源標記與上述遊戲提交相符，線上守衛使用 Batch C 前綴。

[PROGRESS.md](PROGRESS.md) 記錄校準數據及根因。[ACCEPTANCE.md](ACCEPTANCE.md) 記錄正常玩家操作錄影、測試結果及實體手機待驗收項目。C1 提交後交由總 PM 與使用者驗收。
## Batch C2｜本機交接

- 遊戲提交 `73e08b7ef9904554334b8db9f34efff03574e813`，位於既有 `dev/ch3-water-terrain-batch-c` 分支。預備部署提交 `d88c75998389148f4ae7a7ef5580bd3d3aa807e5` 以 C1 的 Pages 部署為父提交，差異限於 `playtest-adventure-v0.4.13-test-3-batch-c/`。
- 四段正常操作錄影與 50 項測試完成。動畫時間、腳底錨點與濕度比例見 [PROGRESS.md](PROGRESS.md)，驗收詳情與錄影檔名見 [ACCEPTANCE.md](ACCEPTANCE.md)。
- 自動審查擋下包含 C2 程式與 72 張 18A／18B PNG 的 GitHub 推送，要求補充本批素材的公開發布授權。[Draft PR #39](https://github.com/vashyang1120/balloon-v-rush/pull/39) 已接收 C2 施工規格提交 `04d09ba`。[現有試玩入口](https://vashyang1120.github.io/balloon-v-rush/playtest-adventure-v0.4.13-test-3-batch-c/) 仍提供 C1。C2 的 Pages Actions、HTTPS 查驗及發布待授權後續辦。

## Batch C2 Revision 1

施工基準為 `402b5daa21110a3d8033f563ba29c83f1dd52185`。依現有分支及 Draft PR #39 交接。18A／18B 素材與動畫節奏沿用 C2，風乾規格保留至 C3。

遊戲提交 `65d83168ffbf54115be2050b82e340a93fe5f6fb`；部署提交 `ef2bd9021b073ff312f69fd7cee78a4ba0f0ba84`，差異僅五個 Batch C 試玩目錄內的檔案。[Pages Actions](https://github.com/vashyang1120/balloon-v-rush/actions/runs/44841310141) 建置及部署成功。[Revision 1 試玩](https://vashyang1120.github.io/balloon-v-rush/playtest-adventure-v0.4.13-test-3-batch-c/)。

最終回歸 50 項通過。桌機 Chrome 起點與手機橫向觸控模擬水池均從公開 HTTPS 首次進關，載入全部 72 張正式 18A／18B PNG，未重新整理或按重試。起點另記錄四張既有導風裝置圖請求中止及外站備援被隔離政策阻擋，仍成功進關；水池未見請求失敗。完整原始紀錄為 `C2R1-HTTPS-verification.log`。

## Batch C2 Revision 3｜第二道瀑布落水水花

施工前核對 Draft PR #39 的 HEAD 為 `f1ce43aedc76b876fc65e4b3a104646f97f24d09`。[水花修正提交](https://github.com/vashyang1120/balloon-v-rush/commit/13a99b073ddb2e761bcc899b5237ac81415edc42) 位於 `dev/ch3-water-terrain-batch-c`。[Pages 部署提交](https://github.com/vashyang1120/balloon-v-rush/commit/6821e4b990b3ad2bc9c4cf1a005cfddee3335ff4) 僅更新 `main` 上 `playtest-adventure-v0.4.13-test-3-batch-c/` 內五個檔案。[Draft PR #39](https://github.com/vashyang1120/balloon-v-rush/pull/39) 保持開啟。

- 沿用正式 `waterfall_splash_01～06.png`。持續入水時的圖像縮放倍率為 Revision 2 的 2.25 倍，錨點在導流水落點及當前水面。畫面依浮墊旋轉後的圖像範圍留出至少 2 世界單位。停止入水後縮小並淡出，24 個更新步結束，約 0.4 秒。
- 鎖定 175% 分流可見厚度、46.46 世界單位垂直瀑布、雨傘防水及裁切、浮墊左側落水、100% 蓄水、18A／18B 與頭頂水滴。維持既有地形、浮墊位置及其他批次機制。
- Chrome 桌機鍵盤與 844 × 390 手機橫向觸控模擬均以正常操作驗證低水位（約 6%）、50% 和 100%。兩端的水花水平錨點皆與分流水落點相符，更新水位時與水柱末端的垂直差不超過 0.16 世界單位。三個水位的實測錨點距浮墊圖像左界約 11.75 世界單位。兩端均觀察到淡出第 23 步，接著清除效果。
- 原有回歸 50/50 通過。以 Revision 3 的 Batch C Pages 封裝另驗證六個入口及存檔隔離，共 7/7 通過。正式存檔值保留，試玩使用 `balloon-v-rush:adventure-playtest:v0.4.13-test-3-batch-c:`。
- 隨施工交付 `C2R3-comparison.png`、`C2R3-desktop-pool.webm` 和 `C2R3-mobile-landscape-pool.webm`。實體手機及使用者目視驗收待確認。
- [Pages Actions](https://github.com/vashyang1120/balloon-v-rush/actions/runs/44848927586) · [HTTPS 試玩](https://vashyang1120.github.io/balloon-v-rush/playtest-adventure-v0.4.13-test-3-batch-c/) · [3-4 水池](https://vashyang1120.github.io/balloon-v-rush/playtest-adventure-v0.4.13-test-3-batch-c/rpg-dual-continent-test/?ch3test=pool)。
- 線上 Pages 建置及部署成功。公開 HTTPS 桌機起點和手機橫向模擬水池均回應 HTTP 200，來源標記與水花修正提交相符，首次按下開始即可進關，兩端均載入 72 張 18A／18B PNG。兩端均記錄既有導風裝置的 `wind_redirector_wind_flow.png` 請求中止及外站備援被隔離政策擋下，進關成功。

### Revision 3｜傘頂導流水接縫

- 實體手機截圖回報傘頂水流轉彎處出現鋸齒。[修正提交](https://github.com/vashyang1120/balloon-v-rush/commit/546673f770b20a694a40ce08f29b2906daa759e8) 以連續輪廓裁切傘頂及轉出傘面第一段的水流貼圖，讓旋轉後的貼圖邊緣平順銜接。175% 分流厚度、瀑布寬度、導流路徑與入池水花沿用 Revision 3。
- 桌機鍵盤與手機橫向觸控模擬完成正常操作、低中滿水位及停流水花驗證。原有回歸 50/50、Batch C 試玩包隔離 7/7 通過。隨交付附 `C2R3-canopy-seam-comparison.png` 和 `C2R3-canopy-seam-mobile.webm`。修正後的實體手機觀感待驗收。
- [部署提交](https://github.com/vashyang1120/balloon-v-rush/commit/7a44530f2681185607eedc22cb68deab687f75cf) 只更新 Batch C 試玩目錄的兩個檔案。[Pages Actions](https://github.com/vashyang1120/balloon-v-rush/actions/runs/44853015824) · [HTTPS 水池試玩](https://vashyang1120.github.io/balloon-v-rush/playtest-adventure-v0.4.13-test-3-batch-c/rpg-dual-continent-test/?ch3test=pool)。
- Pages 部署成功。公開 HTTPS 桌機起點與手機橫向模擬水池皆載入新提交及接縫繪圖版本，首次進關成功，各載入 72 張 18A／18B PNG，無請求失敗。

## Batch C3｜交接

施工基準 `af950f8`，風乾提交 `fa6f7dc`，C3 試玩版本標示提交 `8b70987`。遊戲版本為 `adventure-v0.4.13-ch3-water-terrain-integration-test-3`。[Draft PR #39](https://github.com/vashyang1120/balloon-v-rush/pull/39) 供本批驗收。

Pages 提交 `136d389` 和 `562fcee` 的合計差異僅限 `playtest-adventure-v0.4.13-test-3-batch-c/`。存檔仍用專屬前綴 `balloon-v-rush:adventure-playtest:v0.4.13-test-3-batch-c:`。

- [Pages Actions](https://github.com/vashyang1120/balloon-v-rush/actions/runs/44868834464)
- [隔離試玩首頁](https://vashyang1120.github.io/balloon-v-rush/playtest-adventure-v0.4.13-test-3-batch-c/)
- [3-4 起點](https://vashyang1120.github.io/balloon-v-rush/playtest-adventure-v0.4.13-test-3-batch-c/rpg-dual-continent-test/?ch3test=start)
- [3-4 水池](https://vashyang1120.github.io/balloon-v-rush/playtest-adventure-v0.4.13-test-3-batch-c/rpg-dual-continent-test/?ch3test=pool)

正常遊玩錄影及測試範圍見 [ACCEPTANCE.md](ACCEPTANCE.md)。2026-11-21，使用者確認 Batch C3 驗收通過。

2026-11-21 核對最終 Pages Actions 成功。首頁、3-4 起點、3-4 水池、隔離守衛與六張 19 號 PNG 均回應 HTTPS 200。兩個關卡入口的來源標記皆為 8b70987，守衛前綴與六張原圖的 SHA-256 驗證通過。

# Batch A 交接

版本 `adventure-v0.4.13-ch3-water-terrain-integration-test-3`。Draft PR #37，接手基準 `df2ebeb030aec284429956e2380d5931b64fc067`。

- `rpg-dual-continent-test/main.js` 保留 `c3sSwiftStep`、`c3sSwiftStopX`、`wsUpdateBlades` 的支撐面與相機上界修正。3-4 持傘偏角推力設為 0.5，原本未持傘的偏角推力及教學保留。3-2 的 45° 與 60° 路線另做前後比對。
- 完整通關測試在右岸使用雨傘反彈風刃，再換劍站定攻擊。驗收證據含兩種視窗尺寸回歸及實際遊戲畫面。總 PM 獨立驗收待進行。

## Batch A Revision 1

- 基準 `35a17179df680d9d6c198966b7c521637e6dbcb8`。上方 0.5 偏角調整為歷史紀錄，本次 3-4 使用等風速，`C34.wd.tuning` 為調校來源。
- 版本仍為 test-3，畫面加註 `Batch A Revision 1`。原 test-3 目錄更新 `main.js` 與入口快取參數。保留 test-2、正式入口與既有沙盒存檔前綴。Batch C 保留瀑布寬度 150% 與撐傘防濕待辦。

# Revision 5｜功能對照表（FEATURE-MATRIX）

✅＝已施工並由工程端驗證；—＝不適用（該大陸沒有這個關卡或功能）。

| 項目 | 第一大陸（`rpg-continent1-universe/`） | 第二大陸（rev5 試玩包） | 自動檢查（manifest） | 驗證 |
|---|---|---|---|---|
| A-01 骰子在「武器・裝備」 | ✅ | ✅ | `rev5-A01-dice-in-bag` | 回歸測試 Batch A（兩個大陸） |
| A-02 雨傘上限 2／4、不沒收 | ✅ | ✅ | `rev5-A02-umbrella-cap` | 同上 |
| A-03 急救包文字 | ✅ | ✅ | `rev5-A03-first-aid-text` | 同上 |
| A-04 暫停 HP 即時更新 | ✅ | ✅ | `rev5-A04-pause-hp` | 回歸測試 A-04／D-01 |
| A-05 隱藏造型入口 | ✅ | ✅ | `rev5-A05-shop-tabs`、`rev5-no-cosmetic-shop-tile` | 回歸測試 Batch A |
| A-06 批量購買上限 | ✅ | ✅ | `rev5-A06-bulk-buy` | 回歸測試 Batch A＋Rev3／Rev4 購買流程 |
| A-07 移除免費 LV2 | ✅ | ✅（Rev4 已移除） | `obsolete-free-bag-lv2`（兩個大陸） | 回歸測試 Batch A |
| B-01～B-04 3-2 蠍子與風刃 | — | ✅ | `rev5-B-wind-blades` | 回歸測試 Batch B |
| C-01～C-04 樹峽谷 | — | ✅ | `rev5-C-3-4` | `chapter3-tree-gap-rev5`（3 種 RPG 模式 × 6 次）＋Rev4 子測試 |
| C-05 寶箱新位置 | — | ✅ | `rev5-C05-chest` | 一般流程（鍵盤／觸控）＋有狗／沒狗／有骰子 |
| C-06 高台鏡頭 | — | ✅ | `rev5-C06-camera` | 前後截圖＋跳躍鏡頭取樣 |
| C-07 水池捷徑 | — | ✅ | `rev5-C-3-4` | 6 種捷徑組合 |
| D-01 暫停背景 | —（沒有第二大陸關卡） | ✅ | `rev5-D01-pause-bg` | 回歸測試 A-04／D-01＋截圖 |
| E QA 測試工具 | — | ✅ | `rev5-E-qa-tool`、`rev5-E-qa-tool-isolation` | `qa-test-tool-rev5.probe` |
| G 骰子音訊 | ✅ | ✅（同一份 `balloon-dice-audio.js`） | `balloon-dice-audio`、`balloon-dice-roll-sfx`、`rev5-G-*` | `balloon-dice-audio-rev5`（勝／敗／平、否、靜音、分頁） |

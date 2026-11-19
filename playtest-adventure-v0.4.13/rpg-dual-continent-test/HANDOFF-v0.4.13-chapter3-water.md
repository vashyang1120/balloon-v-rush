# 風之峽谷水域整合試玩

- 版本 `adventure-v0.4.13-ch3-water-terrain-integration-test-1`
- 基準 `53ca70ebf92b671a9b458df2bb95baaed1ef00aa`
- 施工範圍 `rpg-dual-continent-test/`

## 啟動與測試入口

下載這個 Draft PR 的分支或提交 ZIP，解壓後在包含 `assets/`、`tests/` 的專案根目錄執行：

```sh
node tests/preview-entry.cjs
```

開啟 [3-4 起點](http://127.0.0.1:8412/rpg-dual-continent-test/?guest=1&sandbox=1&devtools=1&ch3test=start) 或 [3-4 水池區段](http://127.0.0.1:8412/rpg-dual-continent-test/?guest=1&sandbox=1&devtools=1&ch3test=pool)，按「開始冒險」直接進入。窄螢幕請橫向操作。也可從 [雙大陸開發入口](http://127.0.0.1:8412/rpg-dual-continent-test/?guest=1&sandbox=1&devtools=1) 完成或略過開場，再點「暫停」→「開發測試工具」切換兩區。

| 按鈕 | 試玩方式 |
| --- | --- |
| 測試 3-4 起點 | 從入口瀑布開始，先用其他武器走進水柱看潮溼，再前往導風裝置看風乾。按 3 裝備雨傘可在瀑布底部操作分流。用氣球槌切換 45°／60° 導風，再經風刃蠍子平台、倒樹與岩棚爬上峽谷。 |
| 測試 3-4 水池區段 | 從峽谷頂左岸開始。撐傘到第二道瀑布底，面向左確認水位不升，轉向右導水。離開水柱確認保留已升水位。水位提升後跳上浮台，再從浮台右端跳向高岸。另可落水測試移動、跳離水面及由左岸岩棚上岸。 |

開發入口配發測試用劍、槌與雨傘。同一關僅在高岸出口結算，測試取得的材料與進度不寫入正式背包。

## 整合範圍

- 16 項美術共 76 張 PNG，58 張為動畫影格。使用原始位元組、影格順序、各組速度和定位資料。
- 背景與透明前景 v2.1 各 1182×1330。沿用第三章水平來回鏡像的繪製方式，並保留全高及各層視差。
- 3-4 沿用原型路線與導風、倒樹、敵人、出口位置。新池底、池壁及浮台依碰撞座標繪製。最高水面在左岸站立面下方 8 px，動畫波峰獨立於水位碰撞。左岸增設 82 px 回岸岩棚，站立面在左岸下方 39 px。
- 潮溼為 30 秒，陸地移速與跳高乘 0.7，水中移速乘 0.5、跳高乘 0.4。成功進入有效風區扣 3 秒，停留沿用一般倒數，暫停與教學對話期間停止計時。
- 此分支供總 PM 驗收。建議實機特別查看窄岩柱與倒樹銜接、高岸跨越及手機長時間遊玩。

## 自動化

```sh
node --check rpg-dual-continent-test/main.js
node --test tests/entry-reliability.test.cjs rpg-continent1-universe/tests/title-sync.test.cjs
node minigames/whack-a-mole/tests/rules.test.js
node --test tests/entry-reliability.browser.cjs rpg-dual-continent-test/tests/chapter3-water.browser.cjs
```

瀏覽器測試需要 Node 24、Playwright 與 Google Chrome。可以透過 `PLAYWRIGHT_MODULE` 指定 Playwright 位置。測試以本機實際檔案和隔離瀏覽器執行，封鎖正式服務請求。

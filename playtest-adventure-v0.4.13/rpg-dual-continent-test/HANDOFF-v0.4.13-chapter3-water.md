# 風之峽谷水域整合試玩

- 版本 `adventure-v0.4.13-ch3-water-terrain-integration-test-1`
- 基準 `53ca70ebf92b671a9b458df2bb95baaed1ef00aa`
- 施工範圍 `rpg-dual-continent-test/`

## 線上試玩部署｜2026-11-19

| 入口 | HTTPS 網址 |
| --- | --- |
| 雙大陸開發測試版 | [開啟雙大陸測試版](https://vashyang1120.github.io/balloon-v-rush/playtest-adventure-v0.4.13/rpg-dual-continent-test/?guest=1&sandbox=1&devtools=1) |
| 3-4 起點 | [從入口瀑布開始](https://vashyang1120.github.io/balloon-v-rush/playtest-adventure-v0.4.13/rpg-dual-continent-test/?guest=1&sandbox=1&devtools=1&ch3test=start) |
| 3-4 水池區段 | [從峽谷頂左岸開始](https://vashyang1120.github.io/balloon-v-rush/playtest-adventure-v0.4.13/rpg-dual-continent-test/?guest=1&sandbox=1&devtools=1&ch3test=pool) |

進入後按「開始冒險」。手機請橫向操作。雙大陸入口也可完成或略過開場，再從「暫停」→「開發測試工具」切換兩區。

## 版本與驗證

- 遊戲提交 `a56ff7dc8552288fa58e263807b53c164d5785f1`。Pages 部署提交 `a0eec32863334f33c341e392a5f6e8474f50a648` 僅新增 `playtest-adventure-v0.4.13/`。正式檔案的 Git tree 與 v0.4.12 基準一致，Pages 沿用原發布來源。[部署結果](https://github.com/vashyang1120/balloon-v-rush/actions/runs/44519623986)
- 三個網址皆回傳 HTTPS 200、載入 v0.4.13 並以訪客沙盒啟動。桌機尺寸 1280×820 驗證雙大陸入口和 3-4 起點，手機橫向尺寸 844×390 驗證水池。兩個捷徑各載入 16 組、76 張 PNG。第一大陸正式入口的線上程式回報 v0.4.12。[線上 Chromium 驗證](https://github.com/vashyang1120/balloon-v-rush/actions/runs/44520456952)
- 試玩入口鎖定訪客沙盒，並在載入遊戲前為 `localStorage` 與 `sessionStorage` 的實際鍵加上 `balloon-v-rush:adventure-playtest:v0.4.13:`。同來源 Chromium 測試實際寫入存檔、背包、成績、成就與稱號、V 幣餘額／紀錄及音效，確認重新載入可讀取試玩資料，原有正式鍵值保持原樣，也未產生遊戲宇宙同步鍵。
- 線上驗證只觀察到試玩目錄的讀取請求。隔離測試確認 `fetch` POST／PUT、XHR PUT 及 Beacon 被拒絕。部署專用 HTML 與防護腳本位於試玩目錄，沿用原始遊戲程式及素材位元組。
- [PR #37](https://github.com/vashyang1120/balloon-v-rush/pull/37) 仍為未合併的草稿。線上工程驗證已完成，待總 PM 及使用者在實體手機與電腦試玩，特別檢查整關手感與手機長時間效能。

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

# Adventure v0.4.13｜Chapter 3 Integration Test 4

工程分支 `integration/ch3-abcd-test-4`。Draft PR #42 指向 `dev/ch3-water-terrain-integration`。

| 批次 | 工程來源 | 整合方式 |
| --- | --- | --- |
| A / #37 | `adf899766d3faf319af73bd27668bb7e4ee77b19` | D 的祖先 |
| B / #38 | `19d6b554560b8a4d8f2ae5d0517babd548ed44ad` | 以共同祖先 `e2ed2dceb9722b4e3fb4668b76016a3e88dd9160` 為底三方整合 |
| C / #39 | `f5008de3d0657c6973bac9e541c2d39a744a09a6` | D 的直接上游批次 |
| D / #40 | `1ad86351e2bad5b762b9d358d8a2dfff234ff63c` | 使用者驗收的 Revision 7，為整合基準 |

## 衝突處理

- `main.js` 以 Test 4 標示取代批次標示，保留 B 的第三章關卡清單。其餘 B 功能差異以共同祖先為底帶入，包括骰子製作、三級寶箱、小V之家與小狗尋寶、關卡及背包模式隔離、邀約與獎勵存檔。
- `index.html` 保留 C、D 全部水域、人物與分流腳本及載入次序，再依 B 的規則於主迴圈前載入骰子與互動腳本。兩個寶箱模組使用 B 的版本。
- Batch D 的水域 runtime、18A／18B／19、分流、游泳、攀爬與美術使用原 Git 物件。獨立頁面沿用 Batch D 的已知素材組合，更新 Test 4 專屬存檔前綴，去除共用身份 SDK，保留訪客沙盒與區域內唯讀請求。
- `tests/chapter3-water.browser.cjs` 合併 D 的水域回歸和 B 對已結算寶箱、重試、關卡背包存檔的斷言。另有骰子規則、實際試玩目錄隔離與遊戲正常操作測試。

## 驗證

- Node 入口、稱號、骰子 28 項與打地鼠內部規則 92 項均通過。
- Chrome 第三章及兩個冒險入口共 26 項通過。涵蓋兩道瀑布、方向分流、20 秒自然風乾、風口與緩降風乾、正式游泳與攀爬、零水位左右攀浮墊、左岸高度限制、慌張單頁、三種背包與骰子回滾保護。
- 專屬試玩網址結構在 Chrome 測試 8 項通過，包括兼容舊存檔、測試存檔持久化、寫入阻擋、手機觸控，以及依前置關卡提供的四組累計背包。
- 從小V之家正常製作骰子並出發，以瀏覽器實際鍵盤或觸控事件操作。測試程式讀取關卡狀態作為檢查點，沒有指定角色座標、水位、背包或骰子結果。路線核對兩道瀑布、敲擊風向機關、峽谷、倒樹、敵人、蓄水、游泳、攀浮墊、自然風乾、右岸格擋、開寶箱與擲骰、回到家及重載。

## 待總 PM 確認

- Batch A 已驗收疾風蠍子與風刃蠍子。整合版沿用 D 內的發射物理與既有提示，保留第一導風峽谷的回復與不扣血。
- Batch A Revision 3 對普通走入、空中接觸與 45° 到站的研究仍待確認有效風區。倒樹峽谷落坑免扣血及第 2／4 次漸進提示屬另一組補充，未納入 Test 4 已完成範圍。
- 手機驗證是 844 × 390 的 Chrome 觸控模擬。

## 重跑

```sh
node --test rpg-dual-continent-test/tests/chapter3-treasure-dice.test.cjs
node --test rpg-dual-continent-test/tests/chapter3-water.browser.cjs rpg-dual-continent-test/tests/chapter3-pages-isolation.browser.cjs rpg-dual-continent-test/tests/chapter3-normal-flow.browser.cjs
```

Chrome 測試使用已安裝的桌機 Chrome 及 Playwright 模組，可使用 `PLAYWRIGHT_MODULE` 指向模組位置。

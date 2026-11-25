# Companion Water Animation｜Hotfix 1（氣球小狗游泳表現）

- 基準：Revision 5 已驗收 HEAD `4f59fbb07dcdccd8e92516c0f0569dcd532b7d0b`，接續分支 `test/adventure-v0.4.13-gameplay-polish-qa-rev5`、Draft PR #48，獨立提交，沒有強制推送。
- 版本：`GAME_VERSION = adventure-v0.4.13-gameplay-polish-qa-rev5-hotfix1`，畫面版本列「Revision 5 + Companion Water Animation｜Hotfix 1」；遊戲頁快取標記 `gameplay-polish-qa-rev5-hotfix1`。
- 範圍：只有第二大陸試玩包（3-4 水池）。第一大陸沒有水池，沒有載入這段程式（manifest 禁止項 `hotfix1-dog-water-not-on-continent1` 檢查）。

## 根本原因

氣球小狗沒有自己的水中狀態，動作完全跟著小V：
1. 小V游泳時「不在地面上、垂直速度 0」，小狗的動作判斷因此落到 `fall`（`dog_jump_fall`），一直停在這張圖。
2. 小狗畫在小V游泳時的腳底高度，整隻畫在水面之上，沒有任何水體覆蓋。
3. 小狗的位置是「小V背後」：小V站在岸邊、背後是水池時，小狗會懸在水面上方的空中。

## 修改檔案

| 檔案 | 內容 |
|---|---|
| `rpg-dual-continent-test/chapter3-dog-water.js`（新增） | 小狗水中狀態、游泳動作、垂直定位、水體遮罩 |
| `rpg-dual-continent-test/index.html` | 載入新檔；快取標記 |
| `rpg-dual-continent-test/main.js` | 只改版本字串兩行 |
| `rpg-dual-continent-test/qa-test-tool.js` | 新增捷徑「3-4 水池（帶小狗，狗狗游泳）」（`qago=dogpool`） |
| `rpg-dual-continent-test/tests/chapter3-dog-water-hotfix1.browser.cjs`（新增） | 鍵盤／觸控實測 |
| `index.html`、`build.json`（試玩包） | 標題、版本、狗狗水池入口 |
| `docs/development/cross-continent-sync/manifest.json`、`CROSS-CONTINENT-SYNC-REGISTER.md` | 同步清冊 |

小狗原始美術、陸地跟隨、尋寶、隱藏寶箱、陪伴次數、取得規則、陸地及空中動畫、小V水中表現、水體、瀑布、浮板、水位、地形、物理全部沒有修改（新檔只包裝 `getDogPoseKey`、`drawCompanionDog`，以及在 `c34Step` 之後多算一次小狗狀態）。

## 游泳狀態（H-01、H-04、H-05）

依小狗「自己的位置」判斷（不看小V是否溼身）：

- 進入水中：小狗的位置在水池內、不在浮板上，而且（小V正在游泳，或小V站在岸上／浮板上而小狗腳下沒有東西，或小狗從上方落到水面高度以內 4 px）。
- 離開水中：位置離開水池、站上浮板，或小V不是在游泳時小狗高於水面 30 px 以上（進出門檻不同，不會在水面附近反覆切換）。
- 小V游泳時小狗一律在水中；小V在牆邊轉身時，小狗的畫面保持在水池內。
- 游泳中：循環播放既有走路四張圖（run1～run4）。划水時每張 150 ms（與陸地相同），小V在水中靜止時每張 210 ms（仍持續划水，切換速度時保持目前的划水節奏）。不使用 fall。
- 小V爬上浮板或岸邊、小狗從水中升回小V腳邊時，用既有的跳躍上升圖（不是 fall）。
- 小狗真正在空中下落時，仍使用原本的 fall 圖。

## 垂直定位參數（H-02）

| 參數 | 值 | 說明 |
|---|---|---|
| `waterlineBelowNose` | 70（原圖像素） | 水面位置＝鼻子下方 70 原圖像素（約項圈高度）；臉、眼睛、鼻子、耳朵與背部上緣在水面上 |
| 縮放 | 0.16（沿用 `DOG_ART.scale`） | 鼻子在水面上方 70×0.16＝11.2 px |
| 腳底在水面下 | run1 17.4／run2 17.0／run3 20.0／run4 18.9 px | 依每張圖的鼻子與腳底位置換算，讓鼻子高度固定不跳動 |
| `bobPx`／`bobMs` | 1.2 px／420 ms | 輕微上下漂浮 |
| `ease`／`maxStep` | 0.22／每步最多 8 px | 入水、出水時的垂直緩動，不會瞬間移動 |
| `easeX` | 0.25 | 游泳時的水平緩動（小V轉身時小狗不瞬移） |
| `wallGap`／`padGap` | 2 px | 小狗整張圖保持在水池牆內、在浮板旁邊而不重疊 |
| `enterAbove`／`leaveAbove` | 4 px／30 px | 入水與離水門檻 |

實測：游泳時鼻子在水面上 10.0～12.4 px（含漂浮），腳底在水面下 16～21 px。

## 水體遮罩（H-03）

照小V已驗收的游泳畫法（`c34Art.swimmer`）：
1. 水面以上：正常顏色，原樣繪製（以水面高度裁切）。
2. 水面以下：畫到暫存畫布，以 `source-atop` 疊上與小V相同的水色 `rgba(11,103,148,0.42)`，再以 `destination-in` 由上（0.68）到下（透明）漸淡，貼回水面位置。
3. 水面高度隨水位變化（沿用 `c34SurfaceY()`）。

沒有降低整隻小狗的透明度，也沒有修改任何圖檔。

## 測試

`tests/chapter3-dog-water-hotfix1.browser.cjs`（鍵盤、手機橫向觸控）：入水、水中右／左移、水中靜止、到浮板（小狗在浮板旁游泳／站在浮板上）、回到岸上、小V在岸邊而小狗在水裡、再次入水；檢查只用走路四張圖、靜止仍四張輪替、爬出時不用 fall、鼻子高度、腳在水下、入出水切換次數、相鄰兩幀垂直位移、沒有錯誤。另外跑完第二大陸既有套件（見最終報告）。

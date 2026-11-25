# Revision 5｜施工內容（IMPLEMENTATION）

分支：`test/adventure-v0.4.13-gameplay-polish-qa-rev5`（基準 Revision 4 `b5b2f47`）
試玩包：`playtest-adventure-gameplay-polish-qa-rev5/`（由 rev4 原樣複製後施工；版本 `adventure-v0.4.13-gameplay-polish-qa-rev5`；存檔命名空間 `balloon-v-rush:adventure-playtest:gameplay-polish-qa-rev5:`）
第一大陸的修改只在本分支（`rpg-continent1-universe/`），未合併 main、未發布。

## 提交

| 提交 | 內容 |
|---|---|
| `ea4c8f9` | 原樣複製 Revision 4 試玩包 |
| `58beed7` | 版本字串、快取標記、存檔命名空間 |
| `11edb0c` | Batch A（兩個大陸） |
| `a8347d5` | Batch G（兩個大陸）＋音效資產 |
| `c7a081d` | Batch B |
| `407567d` | C-01／C-02 |
| `c50e462` | C-05／C-06 |
| `d1c4c1e` | C-03／C-04 測試、C-07 |
| `ddda10f` | D-01 |
| `563ce3d` | Batch E QA 測試工具 |
| `927f1a5` | 一般流程測試改走新寶箱、骰子音訊測試、揭曉記錄音訊時鐘 |
| `54258bc` | Revision 5 回歸測試 |
| `cc60632` | 試玩首頁、build.json、同步清冊、CI |

## Batch A（第一、第二大陸同步）

- A-01：新增 `h2DiceBagRowHtml()`；小V之家背包「武器・裝備」分頁顯示氣球骰子（圖示、名稱、`持有 n / 上限 cap`，沒有耐久條）。暫停背包的武器列也加入骰子；雨傘在已解鎖、持有或裝備時顯示。
- A-02：`V395_BAG.caps.balloonUmbrella = 2`（LV2 ×2＝4）。`v395Count` 把雨傘算進上限。既有超過上限的庫存保留，只是不能再製作；救援與強制製作只在 0 把時發生，不會卡住。
- A-03：急救包「使用後直接補滿生命。」；背包升級說明加上氣球雨傘、氣球骰子。
- A-04：`refreshAllHpDisplays` 也重畫暫停畫面；`rev5HpSyncInstall` 讓所有補血入口（冒險中／冒險外道具、棒棒糖、製作即食）在 HP 改變後呼叫它。
- A-05：`H2_SHOP_TABS` 只留「冒險道具」，只有一個分頁時隱藏分頁列；造型資料與擴充點保留。
- A-06：`h2ShopAffordable(id)`（依實際價格）、`h2ShopCarryRoom(id)`（原本的攜帶量）、`h2ShopRoom(id)＝min(兩者)`；「增加數量」到上限變灰，每次重畫重新計算。購買驗證仍用攜帶量；雨傘購買引導不受影響。
- A-07：移除第一大陸商店與暫停開發面板的免費 LV1／LV2 按鈕與處理函式；測試用背包等級改在 QA 測試工具設定。

## Batch B（3-2）

- B-01：`C2_STAGE_32.buildEnemies` 開頭加入一般風刃蠍子 `A1`：`makeWindScorpion(700, 50)`（x 700，巡邏 650～750）。出生點 x 100、平台 A 420～570、第一個風口 B1 890。數值沿用既有一般蠍子。
- B-02：普通風刃不再因射手死亡而消失（`wsUpdateBlades`）；鎧甲蠍子的大風刃也不再淡出（`c4UpdateSlashes`）。
- B-03：`WS_TUNING.normalRange = 480`（＝邏輯畫面寬 960 的一半，不跟瀏覽器寬度變）、`fadeStartRatio = 0.35`（168 px 開始淡出）、smoothstep 連續淡出到 480 px 完全消失並移除；`hitMinAlpha = 0.2`（透明度低於 0.2 不再碰撞）。速度 3.4、傷害不變；反彈的風刃保留淡出後的透明度。
- B-04：鎧甲大風刃 `wsBladeAlpha` 固定 1，射程、速度、傷害不變。

## Batch C（3-4）

- C-01／C-02：A3 樹峽谷掉落回到 P2 時，播放既有受傷音效（`sfxOnPlayerHurt`）、Hurt 姿勢與閃爍（`player.invincible = 90`，與一般受傷同長）。不呼叫 `damagePlayer` → HP、盾牌、道具、受傷次數、無傷成就都不變。
- C-03：提示文字與次數規則維持 Revision 3（第 2、4 次各一次，每次掉落算一次，與導風峽谷分開計算）。
- C-05：新增支線岩棚 `C34_LAY.chestLedge = { x: 2822, w: 160, h: 725 }`（峽谷頂部上方 160 px、烘乾風口左側）。平跳最高 147 px 上不去，站進烘乾風口再跳可升高約 193 px，往左就能落上岩棚。珍貴寶箱（id、等級、小狗規則、每次挑戰一次都不變）：
  - 舊位置：x 4427，y −272（出口對岸，主線上）
  - 新位置：x 2902，y −292（岩棚中央）
  - 岩棚使用第三章既有的懸空平台三段圖（只多載入這三張圖）。
- C-06：`c34CamTarget()`：鏡頭以「最後站立的表面」為準，讓小V站著時回到一般平地構圖（腳底在畫面 y 460）；跳躍不移動鏡頭，掉落往下時跟著往下；保留「頭頂不得高於畫面上方 110 px」作為下限（導風飛行不會出畫面）。上限 430 → 760，緩動 0.12 → 0.10。地形、跳躍、飛行物理沒有改。
- C-07：捷徑的測試存檔在建立時，如果背包有氣球槌，就把「做出氣球槌」教學標為已讀（`rpgMarkSeen(id, 'testFixture')`）。正式教學規則 `rpgHammerTutorialDue` 沒有改。

## Batch D

- D-01：新增 `c1dSyncPauseBg()`，每次打開暫停選單都依目前所在大陸設定 `--h2-img-continent`（第二大陸＝`window_continent_02.png` 風之峽谷）。
- D-02：稽核結果見 `AUDIT.md`，沒有其他確認的錯誤。

## Batch E（QA 測試工具，`qa-test-tool.js`）

只在網址同時有 `guest=1`、`sandbox=1`、`devtools=1` 時建立（試玩包遇到 `devtools=1` 會自動加上訪客沙盒參數）。按鈕在左下角；遊玩中隱藏，暫停、小V之家、開始畫面、結算時顯示，不會擋住觸控按鈕。
- E-01：RPG 已讀／未讀（骰子秘笈、排球秘笈、3-1 雨傘秘笈、3-4 第一次溼身、第一次烘乾、樹峽谷提示）、樹峽谷失敗次數、RPG 顯示模式（完整／僅首次／全部關閉）。
- E-02：工具只設定狀態，事件仍由正常遊玩觸發。
- E-03：雨傘情境 A～E 一鍵載入「3-1 通關、準備前往 3-2」的小V之家；配方需求與商店價格從遊戲資料讀取（目前 260×5，一包 3 條 6 金幣）。
- E-04：金幣、260、圓形氣球、背包等級、HP、雨傘數、骰子數。
- E-05：快速前往（3-1 雨傘秘笈、3-2 新蠍子、3-4 樹峽谷、水池／瀑布、寶箱、高台鏡頭、骰子音效）；網址 `qago=<key>` 與 `qaopen=1` 供首頁連結使用。
- E-06：隔離方式同上；正式玩家網址不會載入任何 QA 介面。

## Batch G（音訊）

見 `AUDIO-ASSETS.md`。程式：`balloon-dice-audio.js`（兩個大陸逐位元相同）；骰子模組 `animate(draw, { timing })` 有 timing 時以音效時間驅動、兩顆骰子各一半、音效結束同時停；沒有 timing 時維持原本 2×1450 ms。

## 同步與 CI

- `docs/development/cross-continent-sync/manifest.json`：新增 `rev5`（啟用）、rev4 改為封存；新增 Revision 5 的相同檔案（含音效逐位元比對）、內容與禁止項檢查、快取標記（含第一大陸）。
- `tools/sync-check/check-cross-continent-sync.cjs`：二進位檔逐位元比對；封存檢查改用目前的第二大陸版本。
- `.github/workflows/cross-continent-sync.yml`：改看 rev5 試玩包與第一大陸骰子檔。
- `docs/development/CROSS-CONTINENT-SYNC-REGISTER.md`：加入 Revision 5 項目。

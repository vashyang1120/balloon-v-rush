# Adventure v0.4.13｜Adventure Notes System Test 1（冒險筆記系統）

分支：`test/adventure-v0.4.13-notes-system-test-1`（從 main `93e3c2d` 開出）
共用模組：`assets/adventure/adventure-notes.js`（第一大陸與雙大陸基準載入同一個檔案）

---

## Batch A｜既有橘子王弱點筆記調查（施工前）

第一大陸正式版 `rpg-continent1-universe/main.js` 與雙大陸基準 `rpg-dual-continent-test/main.js` 的筆記相關函式逐一比對：
`openDiscoveryItemModal`、`openKeyItemReadModal`、`getKeyItemDisplayData`、`closeDiscoveryItemModal`、
`isHiddenTreasureAvailable`、`openObservationNoteFromBag` **完全相同**。唯一差異在 `checkHiddenTreasure`：
第一大陸多一段 2-2 骰子寶箱分流（雙大陸改由 `chapter3-treasure-interaction.js` 處理），與筆記無關。

| 項目 | 現況（兩個大陸相同） |
|---|---|
| 內部 ID | `orangeKingWeaknessNote01`（玩家看到的名稱：v0.3.62 起為「橘子王觀察筆記」） |
| 拾取物件 | 2-3 的 `hiddenTreasure`（`type: 'bossNote'`），位置 x 5200、地面上方 70px；拾取判定 ±50px |
| 圖示 | 關卡內：`H2_ICON.bossNote` → `assets/adventure/rpg/objects/orange_king_weakness_note.png`（缺圖時 📜） |
| 取得條件 | 必須帶氣球小狗才看得到、拿得到（`checkHiddenTreasure` 開頭 `if (!bringBalloonDog) return`） |
| 筆記圖 | `assets/adventure/rpg/objects/orange_king_weakness_note.png`（RPG 素材鍵 `orange_king_weakness_note`） |
| RPG 規則 | 第一次：`rpg019_king_note_find`（小V「咦！？」）→ `rpg016_king_note_show`（中央展示，按「看完了」才關）→ `rpg017_king_note_reaction`；已在背包時不重播 |
| 顯示與關閉 | 冒險中開啟＝安全暫停（`gameState = 'paused'`，不開暫停選單），「看完了」／Esc 關閉後恢復 |
| 取得狀態 | 拾取時只放在本關 `currentRunStats.pendingKeyItems`；**通關（`triggerClear`）才寫入 `playerInventory.keyItems` 並存檔**；死亡、重試、時間到不保存 |
| 儲存位置 | 冒險背包 `balloonV_inventory`（經 `ADV_DEVTEST` 對應到各版本命名空間：第一大陸 `__c1u__…`、雙大陸 `__c1d__…`） |
| 生命週期 | **從頭挑戰／全新冒險（`resetInventory({ freshAdventure: true })`）會清空整個背包，包括 `keyItems`** → 筆記消失 |
| 重玩 | v0.3.63 起已收藏的筆記仍出現在 2-3（列入本趟探索紀錄），不重新發放、不重播發現劇情 |
| 重新閱讀 | 結算頁「📖 閱讀觀察筆記」、暫停背包「閱讀」、小V之家「完整背包 › 重要物品 › 閱讀」→ 同一張中央展示；圖片載入失敗時用文字版 |
| 第一／第二大陸差異 | 無（筆記程式相同）；兩邊存檔命名空間不同，互不讀寫 |

**沿用：** 筆記圖、內部 ID、2-3 拾取與帶狗規則、通關才帶回背包的規則、RPG 發現劇情、中央展示閱讀器（`rpg-showcase`）、`keyItems` 舊存檔資料、背包「重要物品」分頁。
**新增：** 永久收藏（獨立於背包）、統一筆記資料表、小V之家「冒險筆記」入口與分類、閱讀器放大、冒險知識筆記分類、金色燈泡拾取、3-4 第一份知識筆記。
**未改：** 筆記圖片與內容、拾取位置、Boss 規則、劇情、RPG 已讀規則、`main.js`（兩個大陸的 `main.js` 都沒有修改）。

---

## Batch B｜統一筆記資料結構

`assets/adventure/adventure-notes.js` 的 `NOTES`：

| 欄位 | 說明 |
|---|---|
| `id` | 固定內部 ID（不顯示給玩家）。Boss：`orangeKingWeaknessNote01`；知識：`knowledgeNoteProjectileMotion` |
| `category` | `boss`（Boss 弱點筆記）／`knowledge`（冒險知識筆記） |
| `name` | 顯示名稱（知識筆記不加 No.001 或任何編號） |
| `continent`、`chapter`、`stageId`、`stageName` | 所屬大陸、章節、關卡 |
| `image`、`imageKey` | 筆記圖片路徑、閱讀器素材鍵 |
| `pickupIcon` | 拾取圖示類型：`bossNote`（沿用既有）／`knowledgeBulb`（金色燈泡） |
| `pickup.at()` | 關卡拾取位置（只有知識筆記；Boss 筆記沿用 `main.js` 的 hiddenTreasure） |
| `keyItem` | Boss 筆記：取得紀錄來自 `keyItems` |
| 取得狀態 | 不放在資料表，存在永久收藏（見 Batch C） |

**共用方式：** 第一大陸 `index.html` 載入 `../assets/adventure/adventure-notes.js?…" data-continents="1"`；雙大陸載入同一個檔案並設 `data-continents="1,2"`。沒有任何複本（同步檢查 `adventure-notes-single-source` 禁止各大陸自己的複本）。
模組沿用 `chapter3-dog-water.js` 的方式包裝既有全域函式（`h2PanelBody`、`h2Open`、`saveInventory`、`rpgClose`；有知識筆記拾取的大陸再加 `checkHiddenTreasure`、`drawScorpionDefeatEffects`），**沒有修改 `main.js`、沒有集中其他模組**。

**未來新增一份筆記：** 在 `NOTES` 加一筆資料（id、分類、名稱、大陸、關卡、圖片、拾取位置）＋放入已驗收的美術 → 不需要改閱讀器或小V之家程式。

---

## Batch C｜永久收藏

- 存放鍵：`getPlayerScopedStorageKey('balloonVAdventureHome__notesV1')` → `balloonVAdventureHome__notesV1__<playerKey>`
  - 開頭符合既有冒險存檔規則 `^balloonVAdventureHome__`，因此自動套用既有的隔離：
    一般遊玩 → `<鍵>__c1u__prd__<玩家>`（第一大陸正式）／`<鍵>__c1d__…`（雙大陸）；開發者模式 → `…devplay` 副本；
    「重新開始測試」→ `…dev` 測試存檔；訪客沙盒 → `…sbx__guest`；playtest 套件再加上 playtest 命名空間。
  - 內容：`{ v: 1, notes: { <id>: { id, at, src } }, updatedAt }`；`src` = `pickup`／`keyItems`（舊存檔同步）／`qaTool`（QA 測試）。
- 不會清除的情況：通關、失敗、從頭挑戰、背包重置回 LV1、資源重置、跨大陸遊玩、重新開啟遊戲（獨立於 `balloonV_inventory`，不受 `resetInventory` 影響）。
- 每份只收藏一次；不佔背包容量；沒有出售、消耗、交換的功能（不在商店、背包數量或任何交易流程中）。
- **舊存檔相容：** 開啟小V之家、存檔（`saveInventory`）或打開冒險筆記時，`keyItems` 裡已有的 `orangeKingWeaknessNote01`（通關才會寫入的正式取得紀錄）會補進永久收藏，取得時間沿用 `acquiredAt`。
  - 限制：在本版本之前已經「從頭挑戰」而被清掉背包的玩家，舊存檔裡已沒有任何取得紀錄 → 無法還原，需要在 2-3 再找一次。不會憑空發給所有玩家。
  - 2-3 Boss 筆記拾取規則不變：背包被清空後，2-3 會照既有規則再跑一次發現流程並在通關後回到背包；永久收藏不受影響（不重複記錄）。
- 第一大陸與雙大陸各自的命名空間不互通（沿用既有設計）。「第二大陸支援第一大陸既有筆記資料」＝雙大陸使用同一份資料表與同一套 `keyItems` 同步規則。
- **Firebase：** 沒有任何讀寫、沒有新欄位、沒有遷移。若日後要把收藏同步到雲端，建議：先在 sandbox 專案新增獨立欄位 `adventureNotes`（只增不刪）→ 以 guest／QA 帳號驗證 → 再經 PM 核准上正式。

---

## Batch D｜小V之家「冒險筆記」

- 入口：小V之家中央上方「冒險手冊」右邊的「冒險筆記」按鈕（`#h2-notes-btn`，沿用 `h2-pill` 紫色小按鈕）。只有一個入口。
- 面板：沿用小V之家詳細面板（`h2-panel-wrap`）與清單列樣式；兩個分類：「Boss 弱點筆記」「冒險知識筆記」（顯示已收藏／本大陸總數）。
- 已收藏：顯示名稱、筆記縮圖、取得地點、「閱讀」按鈕。未收藏：只顯示「？？？　尚未找到（關卡）」，不顯示名稱、圖片與內容。分類沒有收藏時顯示空狀態提示。
- 第一大陸只列出第一大陸的筆記（知識分類為空，不顯示 3-4 的「？？？」）。
- 閱讀：沿用既有中央展示（與橘子王觀察筆記相同的元件），保持比例、不裁切、不拉伸、保留透明背景；新增「🔍 放大」（可上下左右捲動），「看完了」關閉後回到冒險筆記面板（不改 `gameState`）。

既有的「冒險手冊 › Boss 弱點筆記・重要物品」列仍指向背包「重要物品」分頁（未改，見 PM 決策）。

---

## Batch E｜金色燈泡拾取圖示（第一版，待使用者核准）

- 檔案：`assets/adventure/ui/items/item_knowledge_note_bulb.png`（256×256 RGBA、透明背景）
- 產生方式：`tools/art/make-knowledge-note-bulb.py`（程式繪製，可重現；Repository 原本沒有燈泡素材）
- 風格：比照既有道具（星星、金幣、鑰匙）的亮面金色＋暖褐描邊；燈絲、銀色燈座與放射光芒，和金幣（圓形皇冠）、Boss 筆記（牛皮紙）、秘笈（書本）明顯不同。
- 關卡內：50px、輕微上下漂浮、沿用 `drawChapter2ItemGlow` 外光；已收藏時淡淡顯示（38% 透明度、不發光）。
- 拾取流程：碰到 → 永久收藏 → 播「發現祕密」音效＋一行提示 → 完整展示筆記（安全暫停，敵人不行動）→ 按「看完了」→ 恢復遊戲。
- 重玩：已收藏不再打開、不重複發放，只提示一次「已收藏，可在小V之家重新閱讀」。

---

## Batch F｜3-4 第一份冒險知識筆記

- 名稱：風之峽谷的飛行秘密；ID：`knowledgeNoteProjectileMotion`
- 圖片：`assets/adventure/notes/knowledge_note_projectile_motion.png`（使用者提供的原始 PNG，原封不動）
  - 收到的附件：2026-11-27 使用者在對話中上傳（附件顯示名稱 `_V________.png`，PM 通知中的原始名稱為 `風之峽谷的飛行秘密(3).png`）
  - 1455 × 1081 px、RGBA（外框透明）、3,278,507 bytes
  - SHA-256 `24a040fff2abd656eecb4b372ad09ac5dfc3d9fe5607ea6dd677bab5d56cbe89`（Repository 檔案與上傳檔逐位元相同）
- 位置：第一平台 P1（導風深淵 A1 對岸）x = `C34_LAY.p1.x + 240`（1860），平台上方 50px。
  - 實測：60° 導風飛行落點 x ≈ 1726～1729（`chapter3-normal-flow` 鍵盤／觸控），燈泡在落點右側 ≈130px → 登岸後往前走自然碰到。
  - 不需要小狗、骰子、付費；不在寶箱岩棚（珍貴寶箱在 x 2902）；離導風裝置（x 1040）與星星墊很遠；在 260 氣球（x 1800）與金幣（x 1920）之間。
  - 不擋飛行、不擋往 P2 的起跳（P1 右緣 1980）；沒拿也能正常通關；沒有修改 30°／45°／60° 物理。

---

## Batch H｜跨大陸同步

- `docs/development/cross-continent-sync/manifest.json`：新增 `adventure-notes-*` 規則（共用模組路徑、兩邊的大陸範圍、QA 捷徑、禁止複本、第一大陸禁止第二大陸筆記與 QA 工具）；`qa-test-tool.js` 快取標籤改為本版。
- `docs/development/CROSS-CONTINENT-SYNC-REGISTER.md`：新增第 6 節。
- 測試：`tests/continent1-adventure-notes-test1.browser.cjs`（第一大陸正式入口，訪客沙盒）、
  `rpg-dual-continent-test/tests/adventure-notes-test1.browser.cjs`（雙大陸，鍵盤＋觸控）。

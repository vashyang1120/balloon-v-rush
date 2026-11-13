# 遊戲宇宙大廳串接交接文件（第一大陸 × 遊戲宇宙版）

版本：`adventure-v0.4.1-continent1-universe-test-1`
資料夾：`balloon-v-rush/rpg-continent1-universe/`

> **目前狀態：新冒險版本可以串接；遊戲宇宙大廳還沒有正式串接。**
> 大廳的「派對島大作戰」入口仍指向舊的 `rpg-test/`。本版本沒有修改大廳任何檔案。

## 1. 入口網址

| 用途 | 網址 |
|---|---|
| 正式 | `https://vashyang1120.github.io/balloon-v-rush/rpg-continent1-universe/?bvPlayerId=<playerId>` |
| 測試沙盒 | `https://vashyang1120.github.io/balloon-v-rush/rpg-continent1-universe/?bvPlayerId=<playerId>&sandbox=1` |
| 不帶玩家（訪客） | `https://vashyang1120.github.io/balloon-v-rush/rpg-continent1-universe/` |

大廳現有的 `Store.handoff.launchUrl(player, gameId)` 產生的格式（`?bvPlayerId=…`，沙盒再加 `&sandbox=1`）可以直接使用。

## 2. 身份交接

- 只認遊戲宇宙 playerId：`p_` 加 20 碼（a–z、2–7）。舊的 `ID__頭像` playerKey 一律拒絕，不送 API。
- 讀取順序：
  1. 網址 `?bvPlayerId=`
  2. 大廳目前玩家：正式 `bvUniverse_v2_currentPlayerId`；沙盒 `bvUniverseSandbox_v2_currentPlayerId`
  3. 本分頁上次的玩家：`sessionStorage bvUniverseAdventure_v1_<mode>_playerId`
- 確認玩家資料（只讀）：
  - 正式：用大廳的共用 SDK（`universe/shared/universe-sdk.js`）的 `createApiClient().getPlayer()`，送出 `GET /v1/players/:id`。
  - 沙盒：讀大廳沙盒的 `sessionStorage bvUniverseSandbox_v2_api`，完全不連網。
- 不會建立或修改玩家：沒有第二套帳號系統、沒有選頭像、沒有輸入 ID。
- 名字和頭像由大廳的「角色設定」管理；顯示頭像只改外觀，不會改變玩家身份。
- 狀況處理：

| 狀況 | 畫面 |
|---|---|
| 找不到玩家（404） | 不能開始；可以「回到遊戲宇宙大廳」或「以訪客遊玩」 |
| API 暫時連不上 | 可以遊玩，使用上次確認過的名字與頭像；存檔仍依 playerId |
| 沒有玩家 | 訪客模式：進度只存在這台裝置，不能取得稱號 |

- 存檔位置：冒險存檔全部加上 `__c1u__<prd|sbx>__<playerId>` 結尾，依「模式＋玩家」各自獨立。
  - 和 `rpg-test/`、`rpg-continent2/` 的存檔完全分開，不讀也不寫它們。
  - 開發者模式（`?devtools=1`）另外寫在 `…devplay` 副本。

## 3. 成績格式（ScoreSubmission 相容）

第一大陸完成時（2-4 完整結算），會在本機寫入一筆紀錄：

- 位置：`localStorage bvUniverseGame_v1_<mode>_adventure__<playerId>__results`
- 內容：`{ v:1, gameId:"adventure", playerId, results:[…] }`，最多保留 20 筆。
- 條件：只有完整、正式、不是開發者模式、不是訪客的冒險才會寫入。
- 同一趟冒險（submissionId＝challengeId）只會有一筆。

```json
{
  "submissionId": "<challengeId>",
  "playerId": "p_…",
  "gameId": "adventure",
  "gameVersion": "adventure-v0.4.1-continent1-universe-test-1",
  "mode": "production | sandbox",
  "startedAt": 0,
  "finishedAt": 0,
  "recordStatus": "local",
  "serverConfirmed": false,
  "scoreData": {
    "continent": 1,
    "total": 6701,
    "rank": "A",
    "rankTitle": "…",
    "scoreVersion": "…",
    "stages": ["1-1","1-2b","1-3","2-1","2-2","2-3","2-4"],
    "titles": ["adventure_kind_adventurer"]
  }
}
```

- `serverConfirmed:false`：遊戲宇宙的成績 API 目前是 NOT_IMPLEMENTED，所以還沒有送到伺服器。
- 共用 SDK 的 `SCORE_SCHEMAS` 目前只有 tetris／rhythm／quiz，還沒有 adventure。

## 4. 稱號格式

- 位置：`localStorage bvUniverseGame_v1_<mode>_adventure__<playerId>__titles`
- 內容：`{ v:1, gameId:"adventure", playerId, titles:[…] }`

| titleKey | 名稱 | 條件（整個第一大陸） |
|---|---|---|
| `adventure_kind_adventurer` | 善良冒險家 | 沒有擊倒任何怪物（直接或間接；橘子王決戰不計） |
| `adventure_peace_ambassador` | 和平大使 | 沒有對任何怪物造成傷害（橘子王決戰不計）；同時獲得善良冒險家 |
| `adventure_super_thrifty` | 超勤儉冒險家 | 沒有在商店成功購買任何東西（打地鼠入場費不算） |
| `adventure_volleyball_rookie` | 排球新星 | 氣球排球 7：0 完封蠍子怪（比賽結算時取得） |
| `adventure_volleyball_expert` | 排球高手 | 氣球排球 7：0 完封橘子怪 |
| `adventure_volleyball_king` | 排球王者 | 氣球排球 7：0 完封橘子王 |
| `adventure_whack_legend` | 傳奇槌王 | 打地鼠分數達到 660 分（遊戲結算時取得） |
| `adventure_treasure_hunter` | 寶藏獵人 | 第一大陸完整結算時「收集」滿分 |
| `adventure_secret_explorer` | 秘境探險家 | 第一大陸完整結算時「探索」滿分 |
| `adventure_battle_master` | 戰鬥大師 | 第一大陸完整結算時「戰鬥」滿分 |
| `adventure_unyielding_hero` | 不屈勇者 | 第一大陸完整結算時「生存」滿分 |
| `adventure_swift_adventurer` | 神速冒險家 | 第一大陸完整結算時「效率」滿分 |

以上 12 個稱號都只在一般遊玩取得；開發者模式、訪客不會取得。

每筆稱號的格式：

```json
{
  "gameId": "adventure",
  "titleKey": "adventure_kind_adventurer",
  "name": "善良冒險家",
  "category": "adventure",
  "unlockedAt": 0,
  "source": "client",
  "serverConfirmed": false,
  "challengeId": "…",
  "gameVersion": "…"
}
```

- 每個稱號只解鎖一次。
- 不會自動裝備。
- 對應大廳規劃的路徑：
  - `titleCatalog/adventure/{titleKey}`
  - `titleUnlocks/{playerId}/adventure/{titleKey}`
- 大廳顯示稱號用的是 `{name, gameId}`，這兩個欄位都有。

## 5. 回到大廳

以下三個地方都有回大廳的按鈕：

- 開始畫面：「🌐 回到遊戲宇宙大廳」
- 小V的家：「🌐 遊戲宇宙」
- 2-4 總結算：「🌐 回到遊戲宇宙大廳」

按下後的行為：

- 正式：前往 `https://vashyang1120.github.io/balloon-v-universe/`
- 沙盒：前往 `https://vashyang1120.github.io/balloon-v-universe/?sandbox=1`
- 網址不帶任何身份資料。大廳用它自己記住的目前玩家顯示，和三款宇宙版遊戲的 `goLobby()` 規則相同。
- 離開前會先存好冒險背包。

## 6. 大廳端最小修改方案（尚未執行；本版本沒有改大廳）

只需要改 `zones.js` 兩行：

```js
// zones.js  player.gameUrls
adventure: "https://vashyang1120.github.io/balloon-v-rush/rpg-continent1-universe/"
// zones.js  player.universeGameIds
universeGameIds: ["quiz", "rhythm", "tetris", "adventure"],
```

- `main.js` 的「開始遊玩」已經會對 `universeGameIds` 裡的遊戲呼叫 `Store.handoff.launchUrl()`（會加上 `?bvPlayerId=`，沙盒再加 `&sandbox=1`），不需要另外修改。
- 回復方式：把上面兩行改回原值即可。

## 7. 能不能直接串接

- **可以。** 入口網址、身份交接、回大廳、沙盒，都已經用本機模擬的大廳環境（大廳程式唯讀副本＋模擬玩家 API）實際測過。
- 這不是線上驗收：
  - 本工作環境打不開 github.io。
  - 沒有在大廳正式網站上按過真的入口按鈕。
  - 沒有用手機實機測試。

## 8. 還依賴的東西

1. 遊戲宇宙玩家 API `GET /v1/players/:id`（正式模式），以及 CORS 允許 `https://vashyang1120.github.io`。
2. 大廳共用 SDK `universe/shared/universe-sdk.js` 的網址要保持不變（本版本直接從大廳網站載入）。
3. 頭像圖：`balloon-v-universe/assets/avatars/base/{key}.png`。
4. 成績、稱號、V幣服務目前是 NOT_IMPLEMENTED：
   - 稱號和成績先存在玩家自己的瀏覽器（`serverConfirmed:false`）。
   - 本版本沒有發放或扣除任何遊戲宇宙 V幣。
   - 冒險內原本的 V 幣紀錄只存在本版本自己的獨立存檔。
5. 等伺服器端的稱號／成績 API 完成後，需要另外把 `__titles`／`__results` 送到伺服器，並由伺服器確認。

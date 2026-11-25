# Revision 4｜施工紀錄（IMPLEMENTATION）

所有修改只在 `playtest-adventure-cross-continent-recovery-rev4/`、`tests/cross-continent-recovery-rev4.browser.cjs`、`docs/`、`tools/sync-check/`、`.github/workflows/cross-continent-sync.yml`。
沒有修改 main、`rpg-continent1-universe/`、根目錄 `minigames/`、Revision 2／3 目錄、Firebase、正式玩家資料。

| Commit | Batch | 內容 | 來源 |
|---|---|---|---|
| `ebb037f` | 基準 | 原樣複製 Revision 3 的 test-4 目錄為 Rev4 目錄（之後每個修改都能看到 diff） | `d0633ab` |
| `cf116f4` | C、F | 三方合併 PR #43：骰子 v2.0 全套、`readPixels` 防護＋退回原導流、雨傘與瀑布匿名 CORS 載入、小遊戲 iframe 相對路徑。衝突保留 Revision 3 的 RPG 重玩規則、CSP、雨傘購買引導。guard 改成在 githack 讀同 commit 的 GitHub Raw，新命名空間 | `01c07f8` |
| `2ff3a32` | D-01 | 排球 main.js 同步正式版（無上下鏡像）；`c1uPrepareMinigameBg` 跨來源時加 `crossOrigin='anonymous'`（淡化模糊數值不變） | `0ed4ff7`、v0.4.1 |
| `e405df2` | D-02 | 打地鼠 audio.js 同步正式版 | `46d4d35` |
| `9913b63` | B、E | 從頭挑戰、確認流程、`resetInventory({freshAdventure})`、新背包不繼承秘笈、槌子秘笈旗標、結算 UI 2.0（圖示、依關卡保存、唯讀重開）、五分制訊息 | PR #45、#41 |
| `037e88a` | BUG-06 | 移除免費 LV1／LV2 切換（商店列、暫停開發面板、處理函式） | — |
| `5fe13d0` | 修正 | 移除合併帶進來的遊戲宇宙 SDK script（試玩包不得載入） | 隔離測試發現 |
| `bd74e28` | 測試 | PR #43 的瀏覽器回歸改指向 Rev4；模擬 githack→Raw 轉址 | — |
| `bdd48f0` | 部署 | 試玩首頁、build.json、Rev4 版 Revision 3 回歸測試 | — |
| `bff6fdc` | 測試 | 第三章水域完整回歸對準 Rev4（22/22） | — |
| `f66c181` | H | 同步清冊、manifest、檢查工具、CI | — |

## 刻意保留的差異

- 打地鼠 `js/config.js` 的 `ASSET_BASES` 第一個是試玩資產根目錄（試玩包專用）。
- 小遊戲與遊戲頁的 CSP／guard 標頭（試玩包專用）。
- 第二大陸專用地形、敵人、雨傘、風區、水域、RPG 事件全部未動。

## 未做的事

- 第一大陸正式程式的免費 LV2 開發按鈕未移除（待決策）。
- 沒有把第一、第二大陸共用程式抽成同一檔（未批准重構，見清冊 §4 建議）。
- 沒有合併任何 PR、沒有部署到正式入口。

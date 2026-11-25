# Revision 4｜測試結果（TEST-RESULTS）

測試 Commit：程式 `f66c181` 之前的各 Commit（測試期間程式未再修改）；公開部署測試用 `bdd48f0`（與最終程式相同，之後只加了文件、測試與檢查工具）。
本機環境：Linux、Google Chrome（Playwright 1.63）。公開環境：rawcdn.githack.com（HTTPS），使用者電腦上 Claude 桌面版內建瀏覽器。

## 總計

| 類別 | 項目數 | 通過 | 失敗 | 未測 |
|---|---|---|---|---|
| 靜態（語法、同步檢查 30 項） | 2 | 2 | 0 | 0 |
| 邏輯單元測試 | 27 | 27 | 0 | 0 |
| 瀏覽器自動化（本機：42 項測試＋4 項探測） | 46 | 46 | 0 | 0 |
| 公開 HTTPS 實測 | 7 | 7 | 0 | 0 |
| 使用者實機（真手機、真人手勢） | — | — | — | 全部待驗收 |

邏輯：`balloon-dice-v2.test.cjs`＋`chapter3-treasure-dice.test.cjs` 11/11；`tests/entry-reliability.test.cjs` 16/16。

## 瀏覽器自動化（本機 Chrome）

| 測試 | 入口 | 結果 |
|---|---|---|
| `chapter3-normal-flow.browser.cjs` 鍵盤 | Rev4（模擬 githack，二進位檔 302 轉到 GitHub Raw） | 通過：3-4 從製作到重新整理後結算 |
| 同上，橫向觸控 | 同上 | 通過 |
| `balloon-dice-minigames.browser.cjs` | Rev4 3-1 | 通過：排球、打地鼠開始與返回 |
| `balloon-dice-v2.browser.cjs` | Rev4 | 通過：1-1、1-2 秘笈、1-3／2-2 |
| `chapter3-pages-isolation.browser.cjs` | Rev4 一般／start／pool（手機）／3-1～3-4 | 8/8：寫入被擋、正式存檔不變、捷徑資源數正確 |
| `tests/cross-continent-recovery-rev4.browser.cjs` | Rev4 | 3/3：救援四情況、購買引導、雨傘秘笈 RPG、倒樹峽谷第 2／4 次提示與獨立計數（桌機＋觸控） |
| `chapter3-water.browser.cjs` | Rev4 | 22/22：地形、導風三角度、瀑布分流、水池、浮板、溼身風乾、手機水池、骰子寶箱（含手機觸控） |
| `tests/continent1-rc.browser.cjs` | 第一大陸（未修改） | 2/2 |
| `tests/entry-reliability.browser.cjs` | 第一大陸＋main 的舊 dual 樹（未修改） | 3/3（第一次跑舊 dual 觸控有一次逾時，重跑通過；該目錄本次未修改） |
| 結算 UI 2.0 探測 | Rev4 3-4 通關 | 桌機與 844×390：正式金幣／260／皇冠 V 幣圖示、按鈕「收下獎勵」→ 重開為「返回整備」 |
| 2-4→3-1 延續 | Rev4 | LV2（80 金幣正式購買）、金幣、秘笈、槌子延續；260 −1 為帶狗繩 |
| 從頭挑戰 | Rev4 | 回 1-1、LV1、金幣 0、秘笈清空、歷史紀錄保留 |
| BUG-06 | Rev3 vs Rev4 3-1 商店 | Rev3 有「🛠 測試 LV2（免費）」，Rev4 沒有；暫停開發面板少了 2 顆無 id 按鈕 |

測試檔調整（皆有說明）：入口路徑與命名空間改成 Rev4；捷徑明確帶 `devtools=1`；骰子秘笈重玩斷言改為 Revision 2 規則；溼身／風乾一生一次、開發捷徑未看過槌子教學時，先標記已讀再測水池；詳細結算重開改為 PR #45 行為。

## 公開 HTTPS 實測

| 項目 | 網址（commit） | 結果 |
|---|---|---|
| Revision 3 根因重現 | `d0633ab` pool | 雨傘圖、瀑布圖 `getImageData` 皆 `SecurityError` |
| 3-4 瀑布雨傘分流（桌機） | `bdd48f0` pool | 資產根目錄＝同 commit GitHub Raw；兩張圖可讀；站在瀑布下撐傘 60/60 次走完整像素分流、0 次退回、0 錯誤；截圖 `evidence/https-3-4-waterfall-umbrella-split.jpg` |
| 3-4 瀑布（844×390 手機尺寸） | 同上 | 14/14 次正常、手機按鈕顯示（模擬尺寸，非真觸控裝置） |
| 排球背景 | `bdd48f0` 3-1 | 遠景＝淡化模糊 blob 窗景；比賽與暫停截圖；Revision 3 同條件為未處理原圖（before 截圖） |
| 排球角色圖 | 同上 | 正常載入 |
| 打地鼠 BGM | 同上 | `ok・播放中`，播放 3.9 秒；金幣 313→293 只扣一次 |
| 打地鼠 SFX | 同上 | 音效檔皆 ok；AudioContext 因自動化點擊不算真人手勢仍為 locked（真人點擊會解鎖，請實機確認音效） |

## 未測／限制

- 真實手機與平板觸控、真人手勢的音訊解鎖：需使用者實機驗收。
- 骰子勝／敗／平的完整互動在本機瀏覽器測過，公開網址只確認載入與 CORS。
- 第二大陸結算在本機以 3-4 通關驗證；公開網址未跑完整 3-1 通關。
- 導風歷史校準數字（657.9／797.0／681.1 px）未重新量測；chapter3-water 測試以同一發射點與速度驗證 45° 最遠、60° 最高、第一峽谷規則，未調整任何物理（測試名稱：first canyon uses the three angles…、same launch point and measured velocity…）。

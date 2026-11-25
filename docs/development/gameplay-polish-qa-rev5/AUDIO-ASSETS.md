# Revision 5｜音訊資產（Batch G）

## G-02 新增資產：氣球骰子音效

| 項目 | 內容 |
|---|---|
| 原始檔 | 使用者上傳 `骰子.mp3`（未修改：沒有裁切、沒有變速、沒有重新編碼） |
| 正式檔名 | `balloon_dice_roll.mp3` |
| 位置（第一大陸，repo 根目錄） | `assets/audio/sfx/item/balloon_dice_roll.mp3` |
| 位置（第二大陸試玩包） | `playtest-adventure-gameplay-polish-qa-rev5/assets/audio/sfx/item/balloon_dice_roll.mp3` |
| 大小 | 159,919 bytes |
| SHA-256（兩份相同） | `8d9e454db36d1233bd7fcc083af97818d6797c90cd98b9b11a4fffce7cd4228a` |
| 格式 | MP3，44.1 kHz，立體聲，192 kb/s（LAME 3.101） |
| 長度 | 6.661208 秒（ffprobe）；解碼 293,760 個取樣＝6.6612 秒；瀏覽器 `AudioBuffer.duration`＝6,661 ms |
| 加入的提交 | `a8347d5`（Batch G） |
| 程式引用 | `rpg-continent1-universe/balloon-dice-audio.js`、`playtest-adventure-gameplay-polish-qa-rev5/rpg-dual-continent-test/balloon-dice-audio.js`（兩份逐位元相同；第 17 行 `roll.path`） |
| 同步檢查 | `manifest.json` `identical.balloon-dice-roll-sfx`（逐位元比對）、`identical.balloon-dice-audio` |

## 沿用的既有音訊（沒有修改）

| 用途 | 檔案 | 長度 | 大小 | SHA-256 | 音量 |
|---|---|---|---|---|---|
| 小遊戲 BGM（G-01） | `minigames/volleyball/assets/audio/bgm/volleyball_game_bgm.mp3` | 28.224 s，循環 | 727,266 | `a93c98ea…0322294e` | 0.30（與打地鼠嵌入冒險時相同） |
| Heroic 音效（G-03） | `assets/audio/sfx/item/golden_pipe_ring_get.mp3`（SFX key `ringGet`，2-4 金色油管環） | 1.4106 s | 33,904 | `3b2d3927…64531f9f` | 既有 SFX 設定 |
| 勝利音效（G-05） | `minigames/volleyball/assets/audio/victory.mp3` | 3.9967 s | 95,971 | `a3a08e88…fbc6b555f` | 0.80（排球設定） |
| 敗北音效（G-06） | `minigames/volleyball/assets/audio/defeat.mp3` | 2.2465 s | 53,966 | `94f24a49…3347ae5` | 0.80（排球設定） |

第二大陸試玩包讀自己目錄內的同名副本（與 repo 根目錄相同）。公開 githack 網址上，二進位檔由同一個提交的 GitHub Raw 提供（CORS 允許）。

## 時間軸（G-08）與管理（G-09、G-10）

1. 星靈邀約對話打開：暫停關卡 BGM（各章 BGM 的 sync 規則自動處理），播放小遊戲 BGM。同一時間只有一個 `<audio>`。
2. 選「是」：小V切換 Heroic 表情，`ringGet` 播一次。選「否」：直接結束小遊戲 BGM，不播 Heroic、不播骰子音效。
3. 骰子開始跳動：骰子音效播一次（不循環）。動畫時間以音效實際播放時間為準：兩顆骰子各佔一半（約 3.33 秒）。
4. 骰子音效播到結尾：骰子同時停住並揭曉點數。勝利→勝利音效一次；敗北→敗北音效一次；平手不加音效。
5. 按「繼續冒險」或對話以任何方式關閉：停止小遊戲 BGM，關卡 BGM 恢復。

- 靜音：只把音量設為 0，時間仍跟著音效走。
- 切到背景分頁：小遊戲 BGM 暫停，回來後繼續。
- 播放失敗（尚未載入、被瀏覽器擋、AudioContext 停住）：改用 `<audio>`，再不行就用核對過的 6,661 ms 作為動畫時間；結算在動畫前就完成，只會結算一次（沿用 v2 規則）。
- 不會留下仍在播放的骰子音效（測試檢查 `liveRollVoice=false`）。

實測時間軸見 `TEST-RESULTS.md` 與 `evidence/G12-dice-audio-timeline-*.json`。

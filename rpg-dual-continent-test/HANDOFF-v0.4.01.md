# 《v0.4.01 第三章實玩修正 交接報告》

版本：`adventure-v0.4.01-chapter3-playtest-fixes-test-1`
基準：`adventure-v0.4.00-chapter3-combat-integration-test-1`（main `0532b24`）
資料夾：`rpg-dual-continent-test/`

## 修改檔案

- `main.js`
  - 檔案最後新增「v0.4.01」區塊，數值集中在 `C41`。
  - 少量修改 v0.4.00 區塊：
    - 移除舊開發者開關的 F8 分支。
    - 磐甲破甲後 Guard 結束先走動一段（`noGuard`）。
- `index.html`：快取版本號。
- 本文件。

沒有修改：

- `rpg-test/`、`rpg-continent1-universe/`、`rpg-continent2/`
- 兩款小遊戲、`motion-comic/`
- 遊戲宇宙排行榜與 V 幣
- 任何素材檔案

## P1 樹木前景與人物圖層

- **原因**：樹根前景圖（石頭、草叢、崖邊草皮）原本是在小V和小狗**之後**才畫，所以會蓋住人物的腳。
- **修正**：
  - 可倒樹木和它的樹根前景，改在敵人、小V、小狗之前畫。
  - 樹根前景仍然畫在樹木本身上面，所以樹倒下時，前景照樣遮住樹幹底部。
- 沒有移除任何地形碰撞。

## P2 導風失敗 RPG

| 對話 | 觸發 | 表情 | 台詞 |
|---|---|---|---|
| A `c41_wind_fail_first` | 第一次被導風裝置吹起來、掉進導風坑 | `balloonv_shocked` | 哇!!這個裝置有風! |
| B `c41_wind_fail_umbrella` | 累積第 3 次「整段飛行都沒撐雨傘」被吹進坑 | `balloonv_confused` | 還是飛不夠遠...雨傘會不會有幫助? |

- 「被風吹起來」用導風機關既有的飛行紀錄判斷（`wd.attempt`）。
  - 自己跳進坑、普通掉坑都沒有飛行紀錄，所以不算。
- 「沒撐雨傘」看整段飛行（`attempt.umbrella`：從被吹離機關到掉坑），不看掉坑瞬間拿著什麼。
- 同一次掉坑只算一次。
- 累積次數存在 `balloonV_c41WindFail_v1`，跟著玩家與正式／開發者模式各自存檔。
- 兩段對話都是 `oncePerPlayer`；同時觸發時沿用 RPG 排隊。
- 導風坑仍不扣 HP；一般浮空仍不扣雨傘耐久。

## P3 倒樹壓怪碰撞

**碰撞形狀**

- 樹幹：加粗線段，從支點到分岔。
- 樹冠：從原圖透明度量出的包絡點。
  - 以 72px 方格量測，覆蓋率超過 50% 的格子取中心點。
  - 一般樹 53 點，崖邊樹 66 點。
  - 每點半徑約 11.6 遊戲 px，再加 4px 寬容。
- 不是整張畫布。

**掃掠判定**

- 每一步把倒下角度切成 4 段檢查，倒得快也不會直接穿過敵人。
- 落地後 10 步內仍可結算，處理剛好壓在落點上的敵人。
- 同一棵樹的單次倒下，對同一隻敵人最多結算一次。
- 被受擊保護擋下時，下一步會再試一次（只會成功一次）。

### P3-B 磐甲被倒樹壓到

| 命中瞬間 | 結果 |
|---|---|
| Guard 中，而且盔甲還在 | 盔甲 −1（本體不扣）；最後一格破掉時走原本的破甲演出 |
| 不在 Guard，或已經破甲 | 本體 −1（盔甲不扣） |

- 兩種情況都有 Hurt 圖、受擊音效，頭頂 HP／盔甲會更新。
- 擊倒照原本流程，獎勵只算一次。

### P3-C 倒樹與敵人的圖層

- 被壓到、或落地時在樹冠下的敵人，會記成「壓在這棵樹下」，這時樹畫在牠前面。
- 每一步重新檢查：敵人離開樹的範圍，或被擊倒，就移除這個狀態，恢復正常圖層。
- 之後再走進同一棵倒樹的範圍，算是從外面走進來，畫在樹前面。
- 被壓擊倒的 Defeat 演出期間，樹也畫在前面。
- 受傷狀態和遮蔽狀態分開計算。

## P4 斜向上樹橋（3-3 x 4520 → 平台 DL1）

**倒下過程**

- 只有這棵樹、而且往右（往平台方向）倒時才斜靠。
- 其他一般樹，以及這棵樹往左倒時，照原本平倒。
- 倒下的軌跡和原本相同，只是到最終角度就停住（約 71°；平倒是 90°）。

**最終角度怎麼算**

- 讓樹幹上表面剛好在「小V右緣碰到平台」的那一點升到平台高度。
- 這樣從斜坡走上平台時，不會在邊緣跳一下。

**斜面碰撞**

- 斜面就是樹幹上表面那一條線（從樹根端到平台邊緣），不是水平樹幹橋，沒有水平隱形平台。
- 從地面走過去，樹根端（約 18px 高）會把小V帶上斜面。
- 站在斜面上往下走時會黏住斜面；從空中也可以落到斜面上。
- 在斜面上可以起跳。
- 在樹幹下方的地面行走，不會被吸上去。
- 鏡頭不變；樹冠超出畫面上緣不另外處理。

**預留參數**

- `t.c41SlopeTo`：指定靠哪一個平台。
- `c41SlopeSolve`：依樹的支點、長度、樹幹粗細和平台位置算出最終角度。
- 角度太遠或太近時自動改回平倒。
- 之後要做斜向下樹橋、搭不滿的坑，可以沿用同一套算法。
- 本次沒有新增無底坑。

## P5 磐甲抖動、巡邏卡住

**根因（已重現）**

- 原本的巡邏規則：超出巡邏範圍就「把方向反過來」。
- 磐甲被雨傘頂開，或被推到範圍外超過一步的距離時，每一步都還在範圍外，於是每一步都反轉方向。
- 結果是原地左右翻轉：3 秒翻 178 次，位置不動，也回不去巡邏。
- 這時面向一直在變，所以「正前方才能出招」的條件時有時無，看起來就是抖了一陣子才放出 Wind Slash。

**修正**

- 第三章的蠍子走路中超出範圍時，改成朝巡邏中心走回來。
  - 在原本巡邏程式「之前」處理：先把方向設成朝中心，這一步不讓原本程式反轉方向。
  - 第一版是在原本程式之後才修正方向，但蠍子 AI 在中間已經讀到被反轉的方向，攻擊結束後會先背對小V、原地轉身。第二版已改掉。
- 磐甲攻擊（Slam、Wind Slash）、受傷、破甲結束回到走路時，移動方向對齊原本的面向。
  - 原因：雨傘頂開會把移動方向反過來，攻擊結束時磐甲會突然背對小V再轉回來。

**另外修正**

- 破甲後 Guard 結束時，原本會「走一步 → 立刻又 Guard」，造成反覆閃爍。
- 現在 Guard 結束後會先走動 1.25 秒。

**行為改變（請實玩確認）**

- 磐甲以前會卡在原地翻轉，現在會正常走回來、正常出招。
- 所以舊測試裡「站在磐甲正前方連續測很久」的情境，小V會被 Slam 打到。舊測試已加上標明的受傷保護。
- 一直按住雨傘貼著磐甲時：
  - 雨傘頂開扣 1。
  - Slam 被擋下時不另外扣。
  - Slam 結束後磐甲往前走一步、再碰到雨傘，算新的接觸，再扣 1。
  - v0.4.00 因為原地翻轉的錯誤剛好往後退，所以只扣 1。
  - 這是沿用既有的「每次新接觸扣 1」規則，本次沒有改。

**確認**

- Wind Slash 只照 Charge→Gather→Release→Recover 推進；每次 Release 只發射一片。
- 玩家離開後，磐甲在巡邏範圍內來回走、到邊界正常轉向。
- 破甲後一樣正常。

## P6 破甲後的攻擊美術

**程式能改善的部分**

- 破甲後換動作時，前一張圖淡出 6 步（例如 Exposed → Wind Slash Charge），減少瞬間跳變。
- 動作完整度、輪廓、比例都沒有改。

**仍然存在的問題**

- Slam 4 張、Wind Slash 4 張、Guard、Guard Low、Hurt 都只有完整盔甲版。
- 所以破甲後出招時，畫面上仍會出現完整盔甲。
- 用局部遮罩蓋掉頭盔和背甲，會讓頭部輪廓和螯鉗被裁掉，所以沒有採用。

**需要補的破甲版美術（最少 11 張）**

| 建議正式檔名 | 對應原本的完整盔甲動作 |
|---|---|
| `rockwind_scorpion_slam_charge_broken.png` | `rockwind_scorpion_slam_charge.png` |
| `rockwind_scorpion_slam_swing_broken.png` | `rockwind_scorpion_slam_swing.png` |
| `rockwind_scorpion_slam_impact_broken.png` | `rockwind_scorpion_slam_impact.png` |
| `rockwind_scorpion_slam_recover_broken.png` | `rockwind_scorpion_slam_recover.png` |
| `rockwind_scorpion_wind_slash_charge_broken.png` | `rockwind_scorpion_wind_slash_charge.png` |
| `rockwind_scorpion_wind_slash_gather_broken.png` | `rockwind_scorpion_wind_slash_gather.png` |
| `rockwind_scorpion_wind_slash_release_broken.png` | `rockwind_scorpion_wind_slash_release.png` |
| `rockwind_scorpion_wind_slash_recover_broken.png` | `rockwind_scorpion_wind_slash_recover.png` |
| `armored_scorpion_guard_broken.png` | `armored_scorpion_guard.png` |
| `armored_scorpion_guard_low_broken.png` | `armored_scorpion_guard_low.png` |
| `armored_scorpion_hurt_broken.png` | `armored_scorpion_hurt.png` |

- 選配：`armored_scorpion_walk_idlealt_broken.png`（對應 `armored_scorpion_walk_idlealt.png`）。目前破甲後走路只用一張 Exposed。
- 繪製要求：
  - 和原圖同畫布 1254×1254、同角色位置與比例。
  - 頭盔（金框漩渦板）和背甲照 Exposed 圖的樣子碎掉。
  - 後方腳尖位置和原圖相同。
- 補圖後，程式只要在破甲時改用 `_broken` 版本，接地仍用原本每張圖量測的腳尖。

## P7 小狗同行

**狀態區分**

| 狀態 | 變數 |
|---|---|
| 是否擁有小狗 | `playerInventory.balloonDog`（present、turnsLeft） |
| 小狗在家 | 小V之家顯示 `h2DogState()`：rest／ready／gone |
| 選擇帶狗出發 | `nextBringDog` |
| 進行中的冒險有狗同行 | `bringBalloonDog`、`levelStartBringDog`、`levelStartSnapshot.bringBalloonDog` |

**第三章規則**

- 失敗回家、暫停回家：結束這一趟同行，四個同行旗標全部清掉，小狗回窩休息。
- 從失敗的小V之家再出發：只有這次按了「帶狗出發」（付 260）才同行，不會沿用上一場。
- 3-1 一定要帶狗：失敗回家後沒有帶狗時，出發會被擋下，沿用 3-1 出發檢查的文字和「帶狗出發」引導。
- 第一大陸的整備規則不變。

## P8 一般模式結算

- 網址沒有 `?devtools=1` 時，通關摘要：
  - 整格拿掉「本次取得…（背包說明）」。
  - 擊倒列拿掉「（不用全部打倒也能通關）」。
- 卡片自動縮短，不留空白。
- 獎勵入帳、通關紀錄、擊倒數、小狗療癒都不變。
- `?devtools=1` 保留原本的開發資訊。

## P9 F8

- F8、F4、F5 和其他開發工具只認網址 `?devtools=1`。
- 已移除 v0.4.00 加的舊開關 `balloonV_devTools` 相容分支。
- 一般網址就算瀏覽器裡還留著舊開關，也不會取得 F8，不會變成開發者模式或開發測試背包。

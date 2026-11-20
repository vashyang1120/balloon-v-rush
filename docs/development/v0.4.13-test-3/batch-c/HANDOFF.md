# C1 工程交接

基準 `adf899766d3faf319af73bd27668bb7e4ee77b19`。分支 `dev/ch3-water-terrain-batch-c`，Draft PR 指向 `dev/ch3-water-terrain-integration`。

遊戲程式提交 `9986af7c8300cab243e97a37851d3e241dff2ada`。[Draft PR #39](https://github.com/vashyang1120/balloon-v-rush/pull/39) 保持開啟。

部署提交 `910a8abcc3fd5969c476c084fcce7b2d2c0fe705` 只新增 `playtest-adventure-v0.4.13-test-3-batch-c/`。該試玩使用存檔前綴 `balloon-v-rush:adventure-playtest:v0.4.13-test-3-batch-c:`。

- [試玩首頁](https://vashyang1120.github.io/balloon-v-rush/playtest-adventure-v0.4.13-test-3-batch-c/)
- [3-4 起點](https://vashyang1120.github.io/balloon-v-rush/playtest-adventure-v0.4.13-test-3-batch-c/rpg-dual-continent-test/?ch3test=start)
- [3-4 水池](https://vashyang1120.github.io/balloon-v-rush/playtest-adventure-v0.4.13-test-3-batch-c/rpg-dual-continent-test/?ch3test=pool)
- [GitHub Actions Pages 部署](https://github.com/vashyang1120/balloon-v-rush/actions/runs/44776836248) 成功。首頁、起點、水池及隔離守衛皆回應 HTTP 200。兩個關卡入口的來源標記與上述遊戲提交相符，線上守衛使用 Batch C 前綴。

[PROGRESS.md](PROGRESS.md) 記錄校準數據及根因。[ACCEPTANCE.md](ACCEPTANCE.md) 記錄正常玩家操作錄影、測試結果及實體手機待驗收項目。C1 提交後交由總 PM 與使用者驗收。
## Batch C2｜本機交接

- 遊戲提交 `73e08b7ef9904554334b8db9f34efff03574e813`，位於既有 `dev/ch3-water-terrain-batch-c` 分支。預備部署提交 `d88c75998389148f4ae7a7ef5580bd3d3aa807e5` 以 C1 的 Pages 部署為父提交，差異限於 `playtest-adventure-v0.4.13-test-3-batch-c/`。
- 四段正常操作錄影與 50 項測試完成。動畫時間、腳底錨點與濕度比例見 [PROGRESS.md](PROGRESS.md)，驗收詳情與錄影檔名見 [ACCEPTANCE.md](ACCEPTANCE.md)。
- 自動審查擋下包含 C2 程式與 72 張 18A／18B PNG 的 GitHub 推送，要求補充本批素材的公開發布授權。[Draft PR #39](https://github.com/vashyang1120/balloon-v-rush/pull/39) 已接收 C2 施工規格提交 `04d09ba`。[現有試玩入口](https://vashyang1120.github.io/balloon-v-rush/playtest-adventure-v0.4.13-test-3-batch-c/) 仍提供 C1。C2 的 Pages Actions、HTTPS 查驗及發布待授權後續辦。

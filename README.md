# 氣球小V：派對島大作戰 🎈
**MVP 0.6**

## 檔案結構

```
balloon-v-game/
├── index.html
├── style.css
├── main.js
└── assets/
    └── player.png   ← 放你的主角圖片在這裡
```

## 操作說明

| 動作 | 電腦鍵盤 | 手機按鈕 |
|------|----------|----------|
| 移動 | ← → | 左下兩顆按鈕 |
| 跳躍 | 空白鍵 | 右下「跳」 |
| 攻擊 | Z | 右下「🎈」 |

## 手機遊玩建議

- 點擊右上角「⛶ 全螢幕」進入全螢幕模式
- 手機直拿時會顯示「請旋轉橫向」提示
- 建議橫向手機全螢幕遊玩，體驗最佳

## 部署到 GitHub Pages

1. 建立新的 GitHub repo
2. 把所有檔案推上去（含 `assets/player.png`）
3. 進 repo 設定 → Pages → Branch: `main`，資料夾: `/ (root)`
4. 約 1 分鐘後可在 `https://你的帳號.github.io/balloon-v-rush/` 試玩

## 嵌入 WordPress（iframe）

```html
<iframe
  src="https://你的帳號.github.io/balloon-v-rush/"
  width="100%"
  style="aspect-ratio: 16/9; border: none; max-width: 960px; display: block; margin: 0 auto;"
  allowfullscreen
  allow="fullscreen"
  loading="lazy">
</iframe>
```

> ⚠️ **重要**：iframe 必須加上 `allowfullscreen` 和 `allow="fullscreen"`，
> 否則遊戲內的「全螢幕」按鈕將無法運作。

## MVP 0.6 功能清單

- [x] 角色移動、跳躍、攻擊（近戰）
- [x] 橫向捲動畫面
- [x] 金幣收集 + 260 長條氣球收集
- [x] 背包系統（localStorage 持久化）
- [x] 氣球秘笈 + 基礎氣球劍製作
- [x] 基礎氣球劍近戰攻擊 + 耐久系統
- [x] 尖刺障礙（只能跳過）
- [x] 橘子怪（不能攻擊，需閃避噴油）
- [x] 結算畫面（HTML overlay，含小知識）
- [x] 全螢幕按鈕
- [x] 手機直式遮罩提示
- [x] 手機橫向響應式版型

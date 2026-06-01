# 氣球小V：派對島大作戰 🎈
**MVP 0.1**

## 檔案結構

```
balloon-v-game/
├── index.html
├── style.css
├── main.js
└── assets/
    └── player.png   ← 放你的主角圖片在這裡
```

## 放入角色圖片

把主角圖片命名為 `player.png`，放進 `assets/` 資料夾。  
遊戲會自動讀取。若圖片未載入，會顯示簡易 placeholder。

## 操作說明

| 動作 | 電腦鍵盤 | 手機按鈕 |
|------|----------|----------|
| 移動 | ← → | 左下兩顆按鈕 |
| 跳躍 | 空白鍵 | 右下「跳」 |
| 攻擊 | Z | 右下「🎈」 |

## 部署到 GitHub Pages

1. 建立新的 GitHub repo（如 `balloon-v-rush`）
2. 把所有檔案推上去
3. 進 repo 設定 → Pages → Branch: `main`，資料夾: `/ (root)`
4. 存檔後約 1 分鐘，網址為：`https://你的帳號.github.io/balloon-v-rush/`

## 嵌入 WordPress

在 WordPress 頁面使用「自訂 HTML」區塊，貼上：

```html
<iframe
  src="https://你的帳號.github.io/balloon-v-rush/"
  width="100%"
  style="aspect-ratio: 16/9; border: none; max-width: 960px; display: block; margin: 0 auto;"
  allowfullscreen>
</iframe>
```

## MVP 0.1 功能清單

- [x] 角色移動（左右 + 鏡頭推進）
- [x] 跳躍 + 平台
- [x] 攻擊（氣球彈射）
- [x] 橫向捲動畫面（自動推進 + 跟隨玩家）
- [x] 金幣收集
- [x] 260 長條氣球收集
- [x] 一般小怪（可被攻擊打退）
- [x] 尖刺障礙（只能跳過）
- [x] 角色生命值（5格）+ 無敵幀
- [x] 60 秒關卡計時
- [x] 終點旗桿
- [x] 結算畫面（含隨機小知識）
- [x] 手機觸控操作

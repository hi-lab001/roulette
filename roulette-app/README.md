# Pastel Roulette

HTML / CSS / JavaScriptだけで動く、共有用のルーレットWebアプリです。

## 主な機能

- 候補の追加・削除
- ランダム抽選・回転アニメーション
- パステル / POPデザイン
- スマートフォン対応
- `localStorage` による候補・確率設定の自動保存
- 2パターンの重み付き確率設定（Pattern A / B）
- 円盤の見た目は確率に関係なく均等分割
- 画面右下の隠しホットスポットで確率設定を開く
- 画面左下の隠しホットスポットでPattern A / Bを切り替える
- サーバー / DB 不要

## 隠し操作

- **右下 約58px四方**: 確率設定を開く
- **左下 約58px四方**: Pattern A / B を切り替える

確率設定の数値は「重み」です。合計100にする必要はなく、自動的に実確率へ正規化されます。
例: `5 / 3 / 1 / 1` → `50% / 30% / 10% / 10%`。

## ローカルで確認する

`index.html` をブラウザで開くか、VS CodeのLive Serverなどを利用してください。

## GitHub Pagesで公開する

1. GitHubで新しいリポジトリ（例: `roulette-app`）を作る
2. このフォルダの中身をリポジトリ直下へPushする
3. GitHubのリポジトリで `Settings` → `Pages` を開く
4. `Build and deployment` の `Source` を `Deploy from a branch` にする
5. Branchを `main`、Folderを `/(root)` にする
6. `Save` を押す
7. 発行されたURLをメール、LINE、Discord等で共有する

## ファイル構成

```text
roulette-app/
├── index.html
├── style.css
├── script.js
├── .nojekyll
└── README.md
```

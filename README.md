# Pingers NetworkGame

桃太郎を題材にしたネットワーク学習ゲームです。
Vue 3 + Three.js のフロントエンドと Node.js + MySQL のバックエンドで構成されています。


## クイックスタート

### 前提条件

- Node.js 18 以上
- MySQL 8.0 以上

### 1. データベースのセットアップ

MySQL の root ユーザーで以下を実行します。
DB `network_game` とユーザー `gameusr` が作成されます。

```bash
mysql -u root < backend/db/schema.sql
```

### 2. バックエンドの設定と起動

```bash
cp backend/.env.example backend/.env
# backend/.env を開き、DB_PASSWORD を設定してください
cd backend && npm install && npm run dev
```

> ポート 3000 で起動します。

### 3. フロントエンドの設定と起動

```bash
cp frontend/.env.example frontend/.env.development
# 必要に応じて VITE_API_BASE_URL を変更してください（デフォルト: http://localhost:3000）
cd frontend && npm install && npm run dev
```

> ポート 5173 で起動します。ブラウザで `http://localhost:5173` を開いてください。

> **注意**: `.env.development` を変更した場合は Vite dev サーバーを再起動してください（HMR では反映されません）。

## ディレクトリ構成

```
Pingers_NetworkGame/
├── backend/          # Node.js + Express API サーバー
│   ├── db/           # schema.sql（DB スキーマ）
│   ├── config/       # DB 接続設定
│   ├── controllers/  # リクエスト処理
│   └── routes/       # ルーティング
├── frontend/         # Vue 3 + Vite アプリ（リビルド中。CLAUDE.md 参照）
│   ├── public/models/   # 3D アセット（GLB）
│   ├── scripts/         # アセット生成・変換・撮影ツール
│   └── src/
│       ├── assets/      # フォント・画像資産
│       └── content/     # 教材データ（リビルドをまたいで引き継ぐ。同梱 README 参照）
└── docs/             # 設計ドキュメント・リファクタリング計画
```

## 開発コマンド

| 操作 | コマンド |
|---|---|
| backend 起動 | `cd backend && npm run dev` |
| frontend 起動 | `cd frontend && npm run dev` |
| frontend lint | `cd frontend && npm run lint` |
| frontend build | `cd frontend && npm run build` |


# しゅわしゅわ - 技術スタックとTODOリスト

## 技術スタック

### フロントエンド
- **React 18** - UIライブラリ
- **TypeScript** - 型安全性
- **Vite** - ビルドツール
- **React Router** - ルーティング
- **Axios** - HTTPクライアント
- **Zustand** - 状態管理
- **Tailwind CSS** - スタイリング

### バックエンド
- **Node.js** - ランタイム環境
- **Express.js** - Webフレームワーク
- **TypeScript** - 型安全性
- **Prisma** - ORM
- **bcryptjs** - パスワードハッシュ化
- **jsonwebtoken** - JWT認証
- **multer** - ファイルアップロード
- **socket.io** - リアルタイム通信

### データベース
- **PostgreSQL** - メインデータベース

### インフラ
- **Docker** - コンテナ化
- **Docker Compose** - ローカル開発環境

## プロジェクト構造

`
shuwashuwa/
 frontend/                 # React フロントエンド
    src/
       components/       # コンポーネント
       pages/            # ページ
       services/         # API呼び出し
          api.ts        # 全API統合
          types.ts      # 型定義
       stores/           # Zustandストア
       utils/            # ユーティリティ
    package.json
 backend/                  # Express バックエンド
    src/
       routes/           # ルート定義
          auth.ts
          users.ts
          posts.ts
          chat.ts
       middleware/       # ミドルウェア
          auth.ts
          validation.ts
       models/           # Prismaモデル
       utils/            # ユーティリティ
       app.ts            # メインアプリ
    prisma/
       schema.prisma
    package.json
 docker-compose.yml
 README.md
`

## TODOリスト

### Phase 1: 基盤構築（1週間）
- [ ] プロジェクト初期設定
- [ ] PostgreSQL + Prisma設定
- [ ] Docker環境構築
- [ ] 基本的な認証機能（登録ログイン）

### Phase 2: ユーザー機能（1週間）
- [ ] ユーザープロフィール管理
- [ ] ユーザー検索機能
- [ ] プロフィール表示

### Phase 3: タイムライン機能（1週間）
- [ ] 投稿作成表示
- [ ] 動画アップロード（音声OFF）
- [ ] タイムライン表示

### Phase 4: 友達リクエスト機能（1週間）
- [ ] 友達リクエスト送信受信
- [ ] リクエスト承認拒否
- [ ] マッチング機能

### Phase 5: チャット機能（1週間）
- [ ] チャットルーム作成
- [ ] リアルタイムメッセージ
- [ ] ビデオ通話機能

### Phase 6: 本番環境（1週間）
- [ ] 本番環境構築
- [ ] デプロイ設定
- [ ] セキュリティ設定

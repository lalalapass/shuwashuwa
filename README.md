# shuwashuwa

手話SNSアプリ - 手話学習者とろう者コミュニティのためのソーシャルネットワークサービス

## 📱 アプリ概要

shuwashuwaは、手話学習者とろう者コミュニティが交流できるSNSアプリです。手話でのコミュニケーションを促進し、学習支援とコミュニティ形成を目的としています。

### 主な機能
- **ユーザー認証・プロフィール管理** - 手話レベル、第一言語、年齢層などの詳細プロフィール
- **タイムライン** - 手話動画投稿、いいね機能
- **友達機能** - ユーザー検索、友達リクエスト、承認・拒否
- **リアルタイムチャット** - テキスト・手話動画メッセージの送受信
- **ビデオ通話** - WebRTC技術による手話でのリアルタイム通話
- **日程調整** - ビデオ通話の予定提案・承認・拒否

## 🏗️ アーキテクチャ

### デプロイ構成
- **フロントエンド**: GitHub Pages (静的サイトホスティング)
- **バックエンド**: Firebase (サーバーレス)
- **データベース**: 
  - Cloud Firestore (構造化データ)
  - Firebase Realtime Database (リアルタイム通信)
- **認証**: Firebase Authentication
- **ファイルストレージ**: Firebase Storage (将来実装予定)

### 技術スタック

#### フロントエンド
- **React 18** - UIライブラリ
- **TypeScript** - 型安全性
- **Vite** - ビルドツール
- **React Router** - クライアントサイドルーティング
- **WebRTC** - ビデオ通話機能
- **Firebase SDK** - バックエンド連携

#### バックエンド・インフラ
- **Firebase Authentication** - ユーザー認証
- **Cloud Firestore** - NoSQLデータベース
- **Firebase Realtime Database** - リアルタイム通信
- **GitHub Actions** - CI/CDパイプライン
- **GitHub Pages** - 静的サイトホスティング

#### 開発・デプロイ
- **Git** - バージョン管理
- **GitHub** - リポジトリホスティング
- **GitHub Actions** - 自動デプロイ
- **Node.js** - 開発環境

## 🗄️ データベース設計

### Firestore Collections

#### users
```typescript
{
  uid: string;           // Firebase Auth UID
  username: string;      // ユーザー名
  email: string;         // メールアドレス
  signLanguageLevel: string;  // 手話レベル
  firstLanguage: string;     // 第一言語
  gender: string;            // 性別
  ageGroup: string;          // 年齢層
  profileText: string;       // プロフィール文
  iconUrl?: string;          // プロフィール画像URL
  createdAt: Date;
  updatedAt: Date;
}
```

#### posts
```typescript
{
  id: string;
  userId: string;        // 投稿者UID
  username: string;      // 投稿者名
  contentText: string;   // テキスト内容
  contentVideoUrl?: string; // 動画URL
  likeCount: number;      // いいね数
  createdAt: Date;
  updatedAt: Date;
}
```

#### friendRequests
```typescript
{
  id: string;
  senderId: string;    // 送信者UID
  receiverId: string;   // 受信者UID
  senderUsername: string; // 送信者名
  status: 'pending' | 'accepted' | 'rejected';
  chatRoomId?: string;   // 承認時のチャットルームID
  createdAt: Date;
  updatedAt: Date;
}
```

#### chatRooms
```typescript
{
  id: string;
  user1Id: string;      // ユーザー1のUID
  user2Id: string;      // ユーザー2のUID
  otherUsername: string; // 相手のユーザー名
  lastMessage?: string;  // 最後のメッセージ
  lastMessageAt?: Date;  // 最後のメッセージ時刻
  createdAt: Date;
  updatedAt: Date;
}
```

#### messages
```typescript
{
  id: string;
  roomId: string;       // チャットルームID
  senderId: string;     // 送信者UID
  senderUsername: string; // 送信者名
  messageText?: string; // テキストメッセージ
  videoUrl?: string;    // 動画URL
  createdAt: Date;
}
```

#### videoCallSchedules
```typescript
{
  id: string;
  chatRoomId: string;   // チャットルームID
  proposerId: string;    // 提案者UID
  proposerUsername: string; // 提案者名
  proposedAt: Date;     // 提案日時
  description?: string;  // 説明
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}
```

### Firebase Realtime Database

#### calls/{callId}
```typescript
{
  status: {
    started: boolean;
    starterId: string;
    timestamp: number;
  };
  participants: {
    [userId]: {
      joined: boolean;
      timestamp: number;
    };
  };
  signaling: {
    offer?: {
      offer: RTCSessionDescriptionInit;
      from: string;
      timestamp: number;
    };
    answer?: {
      answer: RTCSessionDescriptionInit;
      from: string;
      timestamp: number;
    };
  };
}
```

## 🔐 セキュリティ

### Firestore Security Rules
- **認証必須**: すべての操作でFirebase Authenticationが必要
- **ユーザー固有データ**: 自分のデータのみ読み書き可能
- **投稿・チャット**: 認証されたユーザー間での共有
- **いいね機能**: 認証されたユーザーが任意の投稿にいいね可能

### 環境変数
- Firebase設定は環境変数で管理
- APIキーはGitHub Secretsで保護
- 本番環境では機密情報を適切に管理

## 🚀 デプロイ

### GitHub Actions ワークフロー
1. **トリガー**: `main`ブランチへのプッシュ
2. **ビルド**: Node.js環境で依存関係インストール
3. **環境変数**: Firebase設定をGitHub Secretsから注入
4. **デプロイ**: GitHub Pagesに自動デプロイ

### 環境設定
- **開発環境**: `http://localhost:5173/shuwashuwa/`
- **本番環境**: `https://lalalapass.github.io/shuwashuwa/`

## 📁 プロジェクト構造

```
shuwashuwa/
├── frontend/                 # React フロントエンド
│   ├── src/
│   │   ├── components/       # React コンポーネント
│   │   │   ├── Auth/         # 認証関連
│   │   │   ├── Chat/         # チャット機能
│   │   │   ├── Timeline/     # タイムライン
│   │   │   ├── Users/        # ユーザー管理
│   │   │   └── VideoCall/    # ビデオ通話
│   │   ├── pages/           # ページコンポーネント
│   │   ├── services/        # API・Firebase連携
│   │   ├── context/         # React Context
│   │   └── types/           # TypeScript型定義
│   ├── public/              # 静的ファイル
│   └── package.json         # 依存関係
├── docs/                    # ドキュメント
├── .github/workflows/         # GitHub Actions
└── README.md               # このファイル
```

## 🛠️ 開発環境セットアップ

### 前提条件
- Node.js 18+
- Git
- Firebase プロジェクト

### セットアップ手順
1. **リポジトリクローン**
   ```bash
   git clone https://github.com/lalalapass/shuwashuwa.git
   cd shuwashuwa
   ```

2. **依存関係インストール**
   ```bash
   cd frontend
   npm install
   ```

3. **環境変数設定**
   ```bash
   # .env.local ファイルを作成
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_DATABASE_URL=your_database_url
   ```

4. **開発サーバー起動**
   ```bash
   npm run dev
   ```

## 📊 機能実装状況

### ✅ 完了済み
- [x] Firebase Authentication 統合
- [x] ユーザープロフィール管理
- [x] タイムライン投稿・いいね機能
- [x] 友達リクエスト機能
- [x] リアルタイムチャット
- [x] ビデオ通話機能 (WebRTC)
- [x] 日程調整機能
- [x] GitHub Pages デプロイ
- [x] CI/CD パイプライン

### 🔄 将来実装予定
- [ ] ファイルアップロード機能 (Firebase Storage)
- [ ] プッシュ通知
- [ ] 手話検定試験機能
- [ ] 多言語対応

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 📞 サポート

問題や質問がある場合は、GitHubのIssuesで報告してください。

---

**shuwashuwa** - 手話コミュニティの架け橋 🌟
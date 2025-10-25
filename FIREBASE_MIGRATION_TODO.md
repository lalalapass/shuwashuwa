# Firebase移行TODOリスト

## Phase 1: Firebase プロジェクトセットアップ（手動作業）

### 1.1 Firebase プロジェクト作成
- [x] Google Cloud ConsoleでFirebase プロジェクト作成
- [x] プロジェクト名: `shuwashuwa`
- [x] 地域設定: `asia-northeast1` (東京)
- [x] 予算アラート設定（月額$10でアラート）

### 1.2 Firebase サービス有効化
- [x] Firebase Authentication 有効化
- [x] Cloud Firestore 有効化
- [x] Firebase Realtime Database 有効化
- [ ] Firebase Storage 有効化（無料枠では利用不可 - 後回し）
- [ ] Firebase Hosting 有効化（無料枠では利用不可 - GitHub Pages使用）

### 1.3 Firebase 設定ファイル取得
- [x] Web アプリ用の設定ファイル（firebase-config.js）ダウンロード
- [x] 設定ファイルをフロントエンドに配置

## Phase 2: データベース設計移行（手動作業）

### 2.1 Firestore コレクション設計
- [x] `users` コレクション設計
  - フィールド: username, signLanguageLevel, firstLanguage, profileText, gender, ageGroup, createdAt, updatedAt
  - 注意: iconUrl は後回し（Storage利用不可のため）
- [x] `posts` コレクション設計
  - フィールド: userId, contentText, likesCount, createdAt, updatedAt
  - 注意: contentVideoUrl は後回し（Storage利用不可のため）
- [x] `postLikes` コレクション設計
  - フィールド: postId, userId, createdAt
- [x] `friendRequests` コレクション設計
  - フィールド: senderId, receiverId, message, status, createdAt, updatedAt
- [x] `chatRooms` コレクション設計
  - フィールド: user1Id, user2Id, createdAt, updatedAt
- [x] `chatMessages` サブコレクション設計
  - パス: `chatRooms/{roomId}/messages`
  - フィールド: senderId, messageText, createdAt
  - 注意: videoUrl は後回し（Storage利用不可のため）
- [x] `videoCallSchedules` コレクション設計
  - フィールド: chatRoomId, proposerId, title, description, proposedAt, status, createdAt, updatedAt
- [x] `videoCallSessions` コレクション設計
  - フィールド: chatRoomId, starterId, roomId, isActive, startedAt, endedAt

### 2.2 Firestore セキュリティルール設計
- [x] ユーザー認証ルール作成
- [x] データアクセス権限ルール作成
- [x] チャットルームアクセス制御ルール作成

### 2.3 Realtime Database 設計
- [ ] `presence/{userId}` ノード設計（オンライン状態）- コード実装時に自動作成
- [ ] `calls/{callId}/signaling` ノード設計（ビデオ通話シグナリング）- コード実装時に自動作成
- [ ] `typing/{chatRoomId}/{userId}` ノード設計（タイピング状態）- コード実装時に自動作成

## Phase 3: 認証システム移行（手動作業）

### 3.1 Firebase Authentication 設定
- [x] メール/パスワード認証有効化
- [x] カスタムクレーム設定（手話レベル、第一言語など）- Firestore で管理
- [x] パスワード強度設定
- [x] アカウント作成時のバリデーション設定

### 3.2 認証フロー設計
- [x] ユーザー登録フロー設計
- [x] ログイン/ログアウトフロー設計
- [x] パスワードリセットフロー設計

## Phase 4: フロントエンド Firebase SDK 統合（コード実装）

### 4.1 Firebase SDK インストール
- [x] `npm install firebase` 実行
- [x] Firebase 設定ファイル統合
- [x] Firebase 初期化コード実装

### 4.2 認証機能実装
- [x] Firebase Auth でのログイン/ログアウト実装
- [x] ユーザー登録機能実装
- [x] 認証状態管理実装

### 4.3 Firestore データ操作実装
- [x] ユーザー情報のCRUD操作実装
- [x] 投稿機能実装
- [x] 友達リクエスト機能実装
- [x] チャット機能実装

### 4.4 リアルタイム機能実装
- [x] Firestore Realtime Listeners 実装
- [x] チャットメッセージのリアルタイム受信実装
- [x] オンライン状態管理実装

## Phase 5: ファイルストレージ移行（後回し - 無料枠では利用不可）

### 5.1 Firebase Storage 統合（後回し）
- [ ] Firebase Storage SDK 統合（後回し）
- [ ] 画像アップロード機能実装（後回し）
- [ ] 動画アップロード機能実装（後回し）
- [ ] ファイル削除機能実装（後回し）

### 5.2 ストレージセキュリティ（後回し）
- [ ] アップロード権限ルール設定（後回し）
- [ ] ファイルサイズ制限設定（後回し）
- [ ] ファイル形式制限設定（後回し）

**注意**: Firebase Storage は無料枠では利用できないため、動画・写真機能は後回しとする

## Phase 6: ビデオ通話機能実装（コード実装）

### 6.1 WebRTC 実装
- [x] WebRTC 基本設定実装
- [x] ビデオ/音声ストリーム取得実装
- [x] P2P接続確立実装

### 6.2 シグナリング実装
- [x] Firebase Realtime Database でのシグナリング実装
- [x] ICE候補交換実装
- [x] SDP交換実装
- [x] 通話開始/終了管理実装

## Phase 7: デプロイ設定（手動作業）

### 7.1 GitHub Pages 設定
- [x] GitHub Pages 有効化
- [x] ビルド設定（Vite用）
- [x] デプロイ設定

### 7.2 ドメイン設定
- [x] カスタムドメイン設定（必要に応じて）
- [x] SSL証明書設定
- [x] リダイレクト設定

## Phase 8: テスト・最適化（手動作業）

### 8.1 機能テスト
- [x] ユーザー認証テスト
- [x] 投稿機能テスト
- [x] チャット機能テスト
- [x] ビデオ通話機能テスト

### 8.2 パフォーマンス最適化
- [x] Firestore クエリ最適化
- [x] リアルタイムリスナー最適化
- [x] ストレージ使用量最適化

### 8.3 セキュリティ確認
- [x] セキュリティルールテスト
- [x] 認証フロー確認
- [x] データアクセス権限確認

## Phase 9: 本番移行（手動作業）

### 9.1 データ移行
- [x] 既存データのFirebase移行（必要に応じて）
- [x] データ整合性確認

### 9.2 本番デプロイ
- [x] 本番環境デプロイ
- [x] ドメイン設定
- [x] 監視設定

### 9.3 旧システム停止
- [x] 旧バックエンド停止
- [x] 旧データベース停止
- [x] DNS設定変更

## 注意事項

- 各Phaseは順次実行
- 手動作業は開発者が直接Firebase Consoleで実行
- コード実装が必要な項目のみ実装
- 各Phase完了後にテストを実施
- 問題発生時は前のPhaseに戻って確認

## 完了条件

- [x] 全機能がFirebase上で正常動作
- [x] パフォーマンスが要件を満たす
- [x] セキュリティが適切に設定されている
- [x] コストが予算内に収まっている

## 🎉 Firebase移行完了！

### ✅ 完了した機能
- **認証システム**: Firebase Authentication
- **データベース**: Cloud Firestore + Realtime Database
- **リアルタイムチャット**: Firestore Realtime Listeners
- **ビデオ通話**: WebRTC + Firebase Realtime Database
- **デプロイ**: GitHub Pages + GitHub Actions
- **セキュリティ**: Firestore セキュリティルール

### 📋 実装済み機能
1. **ユーザー認証**: ログイン/登録/ログアウト
2. **ユーザー管理**: プロフィール管理、検索
3. **投稿機能**: テキスト投稿、いいね機能
4. **友達機能**: リクエスト送信/受信/処理
5. **チャット機能**: リアルタイムメッセージング
6. **ビデオ通話**: WebRTC によるP2P通話
7. **スケジュール管理**: 通話予定の作成・管理

### 🚀 デプロイ状況
- **フロントエンド**: GitHub Pages でホスティング
- **バックエンド**: Firebase サービスで完全移行
- **データベース**: PostgreSQL → Firestore + Realtime Database
- **認証**: JWT → Firebase Authentication
- **リアルタイム**: Socket.io → Firestore Listeners

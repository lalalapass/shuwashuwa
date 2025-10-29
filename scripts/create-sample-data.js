#!/usr/bin/env node

/**
 * Firestore サンプルデータ作成スクリプト
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');
const { getAuth, signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');

// Firebase設定（既存の設定を使用）
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyCYnYxa_T3yDhemdSXZENAQUkFe_X_c30o",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "shuwashuwa-2839f.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "shuwashuwa-2839f",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "shuwashuwa-2839f.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "926044132041",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:926044132041:web:4d887ec9d454928bfa7318",
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || "G-2BGQX0S4R1"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// サンプルユーザーデータ
const sampleUsers = [
  {
    username: '手話学習者1',
    signLanguageLevel: 'beginner',
    firstLanguage: 'japanese',
    profileText: '手話を始めたばかりです。よろしくお願いします！',
    gender: 'female',
    ageGroup: '20s',
    iconUrl: 'https://via.placeholder.com/150/FF6B6B/FFFFFF?text=U1',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    username: '手話上級者',
    signLanguageLevel: 'advanced',
    firstLanguage: 'japanese',
    profileText: '手話歴10年です。質問があればお気軽にどうぞ！',
    gender: 'male',
    ageGroup: '30s',
    iconUrl: 'https://via.placeholder.com/150/4ECDC4/FFFFFF?text=U2',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    username: '手話教師',
    signLanguageLevel: 'expert',
    firstLanguage: 'japanese',
    profileText: '手話教師をしています。みんなで楽しく学びましょう！',
    gender: 'female',
    ageGroup: '40s',
    iconUrl: 'https://via.placeholder.com/150/45B7D1/FFFFFF?text=U3',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
];

// サンプル投稿データ
const samplePosts = [
  {
    userId: '', // 実際のユーザーIDに置き換え
    contentText: '今日は「ありがとう」の手話を覚えました！',
    contentVideoUrl: 'https://example.com/video1.mp4',
    likesCount: 5,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    userId: '', // 実際のユーザーIDに置き換え
    contentText: '手話で自己紹介をしてみました',
    contentVideoUrl: 'https://example.com/video2.mp4',
    likesCount: 12,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    userId: '', // 実際のユーザーIDに置き換え
    contentText: '手話の指文字を練習中です',
    contentVideoUrl: 'https://example.com/video3.mp4',
    likesCount: 8,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
];

// 認証関数
async function authenticateUser() {
  try {
    console.log('Firebase認証を実行中...');
    
    // 匿名認証を試行
    try {
      const userCredential = await signInAnonymously(auth);
      console.log('✓ 匿名認証でログインしました');
      return userCredential.user;
    } catch (error) {
      console.log('匿名認証に失敗しました。メール認証を試行中...');
      
      // テスト用のメール認証を試行
      const testEmail = 'test@shuwashuwa.com';
      const testPassword = 'testpassword123';
      
      try {
        // 既存ユーザーでログインを試行
        const userCredential = await signInWithEmailAndPassword(auth, testEmail, testPassword);
        console.log('✓ 既存ユーザーでログインしました');
        return userCredential.user;
      } catch (signInError) {
        // ユーザーが存在しない場合は新規作成
        console.log('新規ユーザーを作成中...');
        const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
        console.log('✓ 新規ユーザーを作成してログインしました');
        return userCredential.user;
      }
    }
  } catch (error) {
    console.error('認証に失敗しました:', error);
    throw error;
  }
}

async function createSampleData() {
  try {
    console.log('サンプルデータを作成中...');
    
    // 認証を実行
    const user = await authenticateUser();
    console.log(`認証されたユーザー: ${user.uid}`);
    
    // ユーザーを作成
    const userIds = [];
    for (const userData of sampleUsers) {
      const docRef = await addDoc(collection(db, 'users'), userData);
      userIds.push(docRef.id);
      console.log(`✓ ユーザーを作成しました: ${docRef.id} (${userData.username})`);
    }
    
    // 投稿を作成（最初のユーザーIDを使用）
    for (let i = 0; i < samplePosts.length; i++) {
      const postData = {
        ...samplePosts[i],
        userId: userIds[i % userIds.length]
      };
      const docRef = await addDoc(collection(db, 'posts'), postData);
      console.log(`✓ 投稿を作成しました: ${docRef.id}`);
    }
    
    // 友達リクエストのサンプルを作成
    if (userIds.length >= 2) {
      const friendRequestData = {
        senderId: userIds[0],
        receiverId: userIds[1],
        message: 'よろしくお願いします！',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      const friendRequestRef = await addDoc(collection(db, 'friendRequests'), friendRequestData);
      console.log(`✓ 友達リクエストを作成しました: ${friendRequestRef.id}`);
    }
    
    // チャットルームのサンプルを作成
    if (userIds.length >= 2) {
      const chatRoomData = {
        user1Id: userIds[0],
        user2Id: userIds[1],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      const chatRoomRef = await addDoc(collection(db, 'chatRooms'), chatRoomData);
      console.log(`✓ チャットルームを作成しました: ${chatRoomRef.id}`);
      
      // チャットメッセージのサンプルを作成
      const messageData = {
        senderId: userIds[0],
        messageText: 'こんにちは！手話の練習を一緒にしませんか？',
        readBy: { [userIds[0]]: true },
        createdAt: serverTimestamp()
      };
      const messageRef = await addDoc(collection(db, 'chatRooms', chatRoomRef.id, 'messages'), messageData);
      console.log(`✓ チャットメッセージを作成しました: ${messageRef.id}`);
    }
    
    console.log('\n🎉 サンプルデータの作成が完了しました！');
    console.log('\n作成されたデータ:');
    console.log(`- ユーザー: ${userIds.length}件`);
    console.log(`- 投稿: ${samplePosts.length}件`);
    console.log(`- 友達リクエスト: 1件`);
    console.log(`- チャットルーム: 1件`);
    console.log(`- チャットメッセージ: 1件`);
    
    console.log('\n次のステップ:');
    console.log('1. フロントエンドアプリケーションを起動してください');
    console.log('2. Firebase Consoleでデータベースの状態を確認してください');
    console.log('3. アプリケーションでユーザー登録とログインをテストしてください');
    
  } catch (error) {
    console.error('❌ サンプルデータの作成に失敗しました:', error);
    console.error('\n考えられる原因:');
    console.error('1. Firebaseプロジェクトが正しく設定されていない');
    console.error('2. Firestoreが有効化されていない');
    console.error('3. 認証が有効化されていない');
    console.error('4. ネットワーク接続の問題');
    console.error('5. Firebase設定が間違っている');
    
    console.error('\n解決方法:');
    console.error('1. Firebase ConsoleでFirestoreとAuthenticationを有効化してください');
    console.error('2. セキュリティルールを確認してください');
    console.error('3. ネットワーク接続を確認してください');
    console.error('4. Firebase設定を確認してください');
  }
}

// スクリプト実行
if (require.main === module) {
  createSampleData();
}

module.exports = { createSampleData };

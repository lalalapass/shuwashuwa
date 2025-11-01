import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { User, Post, FriendRequest, ChatRoom, ChatMessage, Profile, VideoCallSchedule, Block } from '../types/api';

// ユーザー情報キャッシュ
const userCache = new Map<string, { user: User; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5分

// ユーザー情報をバッチで取得する関数
const getUsersBatch = async (userIds: string[]): Promise<Map<string, User>> => {
  const users = new Map<string, User>();
  const uncachedIds: string[] = [];
  
  // キャッシュから取得
  for (const userId of userIds) {
    const cached = userCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      users.set(userId, cached.user);
    } else {
      uncachedIds.push(userId);
    }
  }
  
  // キャッシュにないユーザーをバッチで取得
  if (uncachedIds.length > 0) {
    const userPromises = uncachedIds.map(async (userId) => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const user: User = {
            id: userDoc.id,
            uid: userDoc.id,
            username: data.username,
            signLanguageLevel: data.signLanguageLevel,
            firstLanguage: data.firstLanguage,
            profileText: data.profileText,
            gender: data.gender,
            ageGroup: data.ageGroup,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          };
          
          // キャッシュに保存
          userCache.set(userId, { user, timestamp: Date.now() });
          return { userId, user };
        }
      } catch (error) {
        console.warn('Failed to get user info for userId:', userId);
      }
      return { userId, user: null };
    });
    
    const results = await Promise.all(userPromises);
    for (const { userId, user } of results) {
      if (user) {
        users.set(userId, user);
      }
    }
  }
  
  return users;
};

// Users API
export const usersFirestoreApi = {
  // ユーザー検索
  searchUsers: async (params?: {
    signLanguageLevel?: string;
    firstLanguage?: string;
    search?: string;
    gender?: string;
    ageGroup?: string;
  }, currentUserId?: string): Promise<{ users: User[] }> => {
    try {
      // インデックス要件を最小化するため、基本的なクエリのみ使用
      let q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(200));
      
      const snapshot = await getDocs(q);
      let users: User[] = [];
      
      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        users.push({
          id: docSnapshot.id,
          uid: docSnapshot.id,
          username: data.username,
          signLanguageLevel: data.signLanguageLevel,
          firstLanguage: data.firstLanguage,
          profileText: data.profileText,
          gender: data.gender,
          ageGroup: data.ageGroup,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });
      
      // すべてのフィルターをクライアントサイドで適用
      if (params?.signLanguageLevel) {
        users = users.filter(user => user.signLanguageLevel === params.signLanguageLevel);
      }
      if (params?.firstLanguage) {
        users = users.filter(user => user.firstLanguage === params.firstLanguage);
      }
      if (params?.gender) {
        users = users.filter(user => user.gender === params.gender);
      }
      if (params?.ageGroup) {
        users = users.filter(user => user.ageGroup === params.ageGroup);
      }
      if (params?.search && params.search.trim()) {
        const searchTerm = params.search.trim().toLowerCase();
        users = users.filter(user => 
          user.username.toLowerCase().includes(searchTerm)
        );
      }
      
      // ブロックチェック: 現在のユーザーがログインしている場合、ブロック関係をチェック
      if (currentUserId) {
        const userIds = users.map(user => user.id);
        const blockChecks = await Promise.all(
          userIds.map(userId => 
            blocksFirestoreApi.isUserBlocked(currentUserId, userId)
          )
        );
        users = users.filter((user, index) => !blockChecks[index].isBlocked);
      }
      
      // 結果を50件に制限
      users = users.slice(0, 50);
      
      return { users };
    } catch (error) {
      console.error('Search users error:', error);
      return { users: [] };
    }
  },

  // ユーザー情報取得
  getUser: async (userId: string): Promise<{ user: User }> => {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error('ユーザーが見つかりません');
    }
    
    const data = userDoc.data();
    const user: User = {
      id: userDoc.id,
      uid: userDoc.id,
      username: data.username,
      signLanguageLevel: data.signLanguageLevel,
      firstLanguage: data.firstLanguage,
      profileText: data.profileText,
      gender: data.gender,
      ageGroup: data.ageGroup,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
    
    return { user };
  },

  // プロフィール更新
  updateProfile: async (userId: string, data: {
    signLanguageLevel?: string;
    firstLanguage?: string;
    profileText?: string;
    gender?: string;
    ageGroup?: string;
  }): Promise<{ profile: Profile }> => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    
    const updatedDoc = await getDoc(userRef);
    const userData = updatedDoc.data()!;
    
    const profile: Profile = {
      id: updatedDoc.id,
      userId: updatedDoc.id,
      username: userData.username,
      signLanguageLevel: userData.signLanguageLevel,
      firstLanguage: userData.firstLanguage,
      profileText: userData.profileText,
      gender: userData.gender,
      ageGroup: userData.ageGroup,
      createdAt: userData.createdAt?.toDate(),
      updatedAt: userData.updatedAt?.toDate(),
    };
    
    return { profile };
  },
};

// Posts API
export const postsFirestoreApi = {
  // 投稿一覧取得（最適化版）
  getPosts: async (currentUserId?: string): Promise<{ posts: Post[] }> => {
    const q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    const snapshot = await getDocs(q);
    const posts: Post[] = [];
    
    if (snapshot.empty) {
      return { posts: [] };
    }
    
    // ユーザーIDを収集
    const userIds = snapshot.docs.map(doc => doc.data().userId).filter(Boolean);
    
    // バッチ読み取り: ユーザー情報を並列で取得
    const users = await getUsersBatch(userIds);
    
    // ブロックチェック: 現在のユーザーがログインしている場合、ブロック関係をチェック
    let blockedUserIds = new Set<string>();
    if (currentUserId) {
      const blockChecks = await Promise.all(
        userIds.map(userId => 
          blocksFirestoreApi.isUserBlocked(currentUserId, userId)
        )
      );
      userIds.forEach((userId, index) => {
        if (blockChecks[index].isBlocked) {
          blockedUserIds.add(userId);
        }
      });
    }
    
    // 投稿データを構築（ブロックされたユーザーの投稿は除外）
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      
      // ブロック関係がある場合はスキップ
      if (currentUserId && blockedUserIds.has(data.userId)) {
        continue;
      }
      
      const user = users.get(data.userId);
      const username = user?.username || 'Unknown User';
      
      posts.push({
        id: docSnapshot.id,
        userId: data.userId,
        username: username,
        contentText: data.contentText,
        likeCount: data.likesCount || 0,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      });
    }
    
    return { posts };
  },

  // 投稿作成
  createPost: async (data: { 
    userId: string;
    contentText?: string; 
  }): Promise<{ post: Post }> => {
    const postData = {
      userId: data.userId,
      contentText: data.contentText || '',
      likesCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(db, 'posts'), postData);
    const post: Post = {
      id: docRef.id,
      userId: data.userId,
      username: '', // 後でユーザー情報から取得
      contentText: data.contentText || '',
      likeCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    return { post };
  },

  // 特定ユーザーの投稿一覧取得
  getUserPosts: async (userId: string, currentUserId?: string): Promise<{ posts: Post[] }> => {
    // ブロックチェック: 現在のユーザーがログインしている場合、ブロック関係をチェック
    if (currentUserId && currentUserId !== userId) {
      const blockCheck = await blocksFirestoreApi.isUserBlocked(currentUserId, userId);
      if (blockCheck.isBlocked) {
        // ブロック関係がある場合は空の配列を返す
        return { posts: [] };
      }
    }
    
    const q = query(
      collection(db, 'posts'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    const snapshot = await getDocs(q);
    const posts: Post[] = [];
    
    if (snapshot.empty) {
      return { posts: [] };
    }
    
    // ユーザー情報を取得（投稿者は自分なので1件のみ）
    const user = await getUsersBatch([userId]);
    const username = user.get(userId)?.username || 'Unknown User';
    
    // 投稿データを構築
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      
      posts.push({
        id: docSnapshot.id,
        userId: data.userId,
        username: username,
        contentText: data.contentText,
        likeCount: data.likesCount || 0,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      });
    }
    
    return { posts };
  },

  // いいね機能
  toggleLike: async (postId: string, userId: string): Promise<{ liked: boolean }> => {
    // 投稿の情報を取得してブロックチェック
    const postRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) {
      throw new Error('投稿が見つかりません');
    }
    
    const postData = postDoc.data();
    const postOwnerId = postData.userId;
    
    // 投稿の所有者が自分でない場合、ブロックチェック
    if (postOwnerId !== userId) {
      const blockCheck = await blocksFirestoreApi.isUserBlocked(userId, postOwnerId);
      if (blockCheck.isBlocked) {
        throw new Error('このユーザーをブロックしているか、ブロックされているため、いいねできません');
      }
    }
    
    const likeRef = doc(db, 'postLikes', `${postId}_${userId}`);
    const likeDoc = await getDoc(likeRef);
    
    if (likeDoc.exists()) {
      // いいねを削除
      await deleteDoc(likeRef);
      
      // 投稿のいいね数を減らす
      const postRef = doc(db, 'posts', postId);
      const postDoc = await getDoc(postRef);
      if (postDoc.exists()) {
        const currentLikes = postDoc.data()?.likesCount || 0;
        await updateDoc(postRef, {
          likesCount: Math.max(0, currentLikes - 1),
          updatedAt: serverTimestamp(),
        });
      }
      
      return { liked: false };
    } else {
      // いいねを追加
      await setDoc(likeRef, {
        postId,
        userId,
        createdAt: serverTimestamp(),
      });
      
      // 投稿のいいね数を増やす
      const postRef = doc(db, 'posts', postId);
      const postDoc = await getDoc(postRef);
      if (postDoc.exists()) {
        const currentLikes = postDoc.data()?.likesCount || 0;
        await updateDoc(postRef, {
          likesCount: currentLikes + 1,
          updatedAt: serverTimestamp(),
        });
      }
      
      return { liked: true };
    }
  },

  // いいねした人を取得
  getPostLikes: async (postId: string): Promise<{ users: User[] }> => {
    const q = query(
      collection(db, 'postLikes'),
      where('postId', '==', postId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const userIds: string[] = [];
    
    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      if (data.userId) {
        userIds.push(data.userId);
      }
    });
    
    if (userIds.length === 0) {
      return { users: [] };
    }
    
    // バッチ読み取り: ユーザー情報を並列で取得
    const users = await getUsersBatch(userIds);
    
    // userIdsの順序を保持しながらユーザー配列を作成
    const usersArray: User[] = [];
    for (const userId of userIds) {
      const user = users.get(userId);
      if (user) {
        usersArray.push(user);
      }
    }
    
    return { users: usersArray };
  },

  // 投稿削除
  deletePost: async (postId: string): Promise<void> => {
    const postRef = doc(db, 'posts', postId);
    
    // 投稿が存在するか確認
    const postDoc = await getDoc(postRef);
    if (!postDoc.exists()) {
      throw new Error('投稿が見つかりません');
    }
    
    // 投稿を削除
    await deleteDoc(postRef);
    
    // 関連するいいねも削除（オプション: バックグラウンドで削除する場合はコメントアウト）
    const likesQuery = query(
      collection(db, 'postLikes'),
      where('postId', '==', postId)
    );
    const likesSnapshot = await getDocs(likesQuery);
    const deletePromises = likesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  },
};

// Friend Requests API
export const friendRequestsFirestoreApi = {
  // 友達リクエスト送信
  sendRequest: async (data: {
    senderId: string;
    receiverId: string;
    message?: string;
  }): Promise<{ request: FriendRequest }> => {
    // ブロックチェック
    const blockCheck = await blocksFirestoreApi.isUserBlocked(data.senderId, data.receiverId);
    if (blockCheck.isBlocked) {
      throw new Error('このユーザーをブロックしているか、ブロックされているため、リクエストを送信できません');
    }

    // 重複チェック：すでにpendingまたはacceptedのリクエストが存在する場合はエラー
    const existingCheck = await friendRequestsFirestoreApi.checkRequestExists(data.senderId, data.receiverId);
    if (existingCheck.exists && existingCheck.request && (existingCheck.request.status === 'pending' || existingCheck.request.status === 'accepted')) {
      throw new Error('このユーザーにはすでにリクエストが送信されています');
    }

    const requestData = {
      senderId: data.senderId,
      receiverId: data.receiverId,
      message: data.message || '',
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(db, 'friendRequests'), requestData);
    
    // 送信者のユーザー名を取得
    let senderUsername = 'Unknown User';
    try {
      const senderDoc = await getDoc(doc(db, 'users', data.senderId));
      if (senderDoc.exists()) {
        senderUsername = senderDoc.data().username || 'Unknown User';
      }
    } catch (error) {
      console.error('Failed to get sender info:', error);
    }
    
    const request: FriendRequest = {
      id: docRef.id,
      senderId: data.senderId,
      senderUsername: senderUsername,
      receiverId: data.receiverId,
      message: data.message || '',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    return { request };
  },

  // 友達リクエスト一覧取得（受信したリクエスト）- 最適化版
  getRequests: async (userId: string): Promise<{ requests: FriendRequest[] }> => {
    const q = query(
      collection(db, 'friendRequests'),
      where('receiverId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const requests: FriendRequest[] = [];
    
    if (snapshot.empty) {
      return { requests: [] };
    }
    
    // 送信者IDを収集
    const senderIds = snapshot.docs.map(doc => doc.data().senderId).filter(Boolean);
    
    // バッチ読み取り: 送信者のユーザー情報を並列で取得
    const users = await getUsersBatch(senderIds);
    
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      const user = users.get(data.senderId);
      const senderUsername = user?.username || 'Unknown User';
      
      requests.push({
        id: docSnapshot.id,
        senderId: data.senderId,
        receiverId: data.receiverId,
        senderUsername: senderUsername,
        message: data.message,
        status: data.status,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      });
    }
    
    return { requests };
  },

  // 送信した友達リクエスト一覧取得 - 最適化版
  getSentRequests: async (userId: string): Promise<{ requests: FriendRequest[] }> => {
    const q = query(
      collection(db, 'friendRequests'),
      where('senderId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const requests: FriendRequest[] = [];
    
    if (snapshot.empty) {
      return { requests: [] };
    }
    
    // 受信者IDを収集
    const receiverIds = snapshot.docs.map(doc => doc.data().receiverId).filter(Boolean);
    
    // バッチ読み取り: 受信者のユーザー情報を並列で取得
    const users = await getUsersBatch(receiverIds);
    
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      const user = users.get(data.receiverId);
      const receiverUsername = user?.username || 'Unknown User';
      
      requests.push({
        id: docSnapshot.id,
        senderId: data.senderId,
        receiverId: data.receiverId,
        senderUsername: receiverUsername, // 送信したリクエストでは受信者名を表示
        message: data.message,
        status: data.status,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      });
    }
    
    return { requests };
  },

  // 特定のユーザーへの送信済みリクエストをチェック
  checkRequestExists: async (senderId: string, receiverId: string): Promise<{ exists: boolean; request?: FriendRequest }> => {
    const q = query(
      collection(db, 'friendRequests'),
      where('senderId', '==', senderId),
      where('receiverId', '==', receiverId)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return { exists: false };
    }
    
    // 最初のリクエストを返す（通常は1つしかないはず）
    const docSnapshot = snapshot.docs[0];
    const data = docSnapshot.data();
    
    // 送信者のユーザー名を取得
    let senderUsername = 'Unknown User';
    try {
      const senderDoc = await getDoc(doc(db, 'users', senderId));
      if (senderDoc.exists()) {
        senderUsername = senderDoc.data().username || 'Unknown User';
      }
    } catch (error) {
      console.error('Failed to get sender info:', error);
    }
    
    const request: FriendRequest = {
      id: docSnapshot.id,
      senderId: data.senderId,
      senderUsername: senderUsername,
      receiverId: data.receiverId,
      message: data.message,
      status: data.status,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
    
    return { exists: true, request };
  },

  // 友達リクエスト処理
  handleRequest: async (requestId: string, action: 'accept' | 'reject'): Promise<{ chatRoomId?: string }> => {
    const requestRef = doc(db, 'friendRequests', requestId);
    const requestDoc = await getDoc(requestRef);
    
    if (!requestDoc.exists()) {
      throw new Error('Request not found');
    }
    
    const requestData = requestDoc.data();
    
    // リクエストのステータスを更新
    await updateDoc(requestRef, {
      status: action === 'accept' ? 'accepted' : 'rejected',
      updatedAt: serverTimestamp(),
    });
    
    // 承認の場合はチャットルームを作成
    if (action === 'accept') {
      const roomData = {
        user1Id: requestData.senderId,
        user2Id: requestData.receiverId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const roomRef = await addDoc(collection(db, 'chatRooms'), roomData);
      return { chatRoomId: roomRef.id };
    }
    
    return {};
  },
};

// Chat API
export const chatFirestoreApi = {
  // チャットルーム作成
  createRoom: async (data: {
    user1Id: string;
    user2Id: string;
  }): Promise<{ room: ChatRoom }> => {
    const roomData = {
      user1Id: data.user1Id,
      user2Id: data.user2Id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(db, 'chatRooms'), roomData);
    const room: ChatRoom = {
      id: docRef.id,
      user1Id: data.user1Id,
      user2Id: data.user2Id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    return { room };
  },

  // チャットルーム一覧取得
  getRooms: async (userId: string): Promise<{ rooms: ChatRoom[] }> => {
    // user1Id または user2Id のどちらでも検索
    const q1 = query(
      collection(db, 'chatRooms'),
      where('user1Id', '==', userId)
    );
    
    const q2 = query(
      collection(db, 'chatRooms'),
      where('user2Id', '==', userId)
    );
    
    const [snapshot1, snapshot2] = await Promise.all([
      getDocs(q1),
      getDocs(q2)
    ]);
    
    const rooms: ChatRoom[] = [];
    const roomIds = new Set<string>();
    const allRoomData: Array<{ docSnapshot: any; data: any; otherUserId: string }> = [];
    
    // user1Id で検索した結果を収集
    for (const docSnapshot of snapshot1.docs) {
      const data = docSnapshot.data();
      if (!roomIds.has(docSnapshot.id)) {
        roomIds.add(docSnapshot.id);
        allRoomData.push({
          docSnapshot,
          data,
          otherUserId: data.user2Id
        });
      }
    }
    
    // user2Id で検索した結果を収集
    for (const docSnapshot of snapshot2.docs) {
      const data = docSnapshot.data();
      if (!roomIds.has(docSnapshot.id)) {
        roomIds.add(docSnapshot.id);
        allRoomData.push({
          docSnapshot,
          data,
          otherUserId: data.user1Id
        });
      }
    }
    
    // 相手のユーザーIDを収集
    const otherUserIds = allRoomData.map(room => room.otherUserId).filter(Boolean);
    
    // ユーザー情報をバッチで取得
    const users = await getUsersBatch(otherUserIds);
    
    // ブロックされたユーザーとのルームを除外するためのチェック
    const blockChecks = await Promise.all(
      otherUserIds.map(otherUserId => 
        blocksFirestoreApi.isUserBlocked(userId, otherUserId)
      )
    );
    const blockedUserIds = new Set(
      otherUserIds.filter((_, index) => blockChecks[index].isBlocked)
    );
    
    // バッチ読み取り: 各ルームの最新メッセージと未読数を並列で取得
    const roomPromises = allRoomData
      .filter(roomInfo => !blockedUserIds.has(roomInfo.otherUserId))
      .map(async (roomInfo) => {
      const { docSnapshot, data, otherUserId } = roomInfo;
      const user = users.get(otherUserId);
      const otherUsername = user?.username || 'Unknown User';
      
      // 最新メッセージと未読数を並列で取得
      const [messagesSnapshot, unreadCount] = await Promise.all([
        // 最新メッセージを取得
        (async () => {
          try {
            const messagesQuery = query(
              collection(db, 'chatRooms', docSnapshot.id, 'messages'),
              orderBy('createdAt', 'desc'),
              limit(1)
            );
            return await getDocs(messagesQuery);
          } catch (error) {
            console.error('Failed to get latest message:', error);
            return { empty: true, docs: [] };
          }
        })(),
        // 未読メッセージ数を取得
        (async () => {
          try {
            return await chatFirestoreApi.getUnreadMessageCount(docSnapshot.id, userId);
          } catch (error) {
            console.error('Failed to get unread count for room:', docSnapshot.id, error);
            return 0;
          }
        })()
      ]);
      
      let lastMessage = '';
      let lastMessageAt = '';
      if (!messagesSnapshot.empty) {
        const latestMessage = messagesSnapshot.docs[0].data();
        lastMessage = latestMessage.messageText || '';
        lastMessageAt = latestMessage.createdAt?.toDate()?.toISOString() || '';
      }

      return {
        id: docSnapshot.id,
        user1Id: data.user1Id,
        user2Id: data.user2Id,
        otherUsername: otherUsername,
        lastMessage: lastMessage,
        lastMessageAt: lastMessageAt,
        unreadCount: unreadCount,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    });
    
    const roomResults = await Promise.all(roomPromises);
    rooms.push(...roomResults);
    
    // 最新メッセージの日時でソート（メッセージがない場合は作成日時）
    rooms.sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : a.createdAt.getTime();
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : b.createdAt.getTime();
      return bTime - aTime;
    });
    
    return { rooms };
  },

  // メッセージ一覧取得
  getMessages: async (roomId: string): Promise<{ messages: ChatMessage[] }> => {
    const q = query(
      collection(db, 'chatRooms', roomId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    
    const snapshot = await getDocs(q);
    const messages: ChatMessage[] = [];
    
    // 送信者IDを収集
    const senderIds = snapshot.docs.map(doc => doc.data().senderId).filter(Boolean);
    
    // ユーザー情報をバッチで取得
    const users = await getUsersBatch(senderIds);
    
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      const user = users.get(data.senderId);
      const senderUsername = user?.username || 'Unknown User';
      
      messages.push({
        id: docSnapshot.id,
        chatRoomId: roomId,
        senderId: data.senderId,
        senderUsername: senderUsername,
        messageText: data.messageText,
        createdAt: data.createdAt?.toDate() || new Date(),
        readBy: data.readBy || {},
      });
    }
    
    return { messages };
  },

  // 未読メッセージ数を取得（既読フラグベース）
  getUnreadMessageCount: async (roomId: string, currentUserId: string): Promise<number> => {
    try {
      const q = query(
        collection(db, 'chatRooms', roomId, 'messages'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      let unreadCount = 0;

      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        // 自分以外が送信したメッセージで、かつ未読のものをカウント
        if (data.senderId !== currentUserId) {
          const readBy = data.readBy || {};
          if (!readBy[currentUserId]) {
            unreadCount++;
          }
        }
      }

      return unreadCount;
    } catch (error) {
      console.error('Failed to get unread message count:', error);
      return 0;
    }
  },

  // チャットルームの全メッセージを既読にする
  markAllMessagesAsRead: async (roomId: string, userId: string): Promise<void> => {
    try {
      const q = query(
        collection(db, 'chatRooms', roomId, 'messages'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const batch = [];

      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        const readBy = data.readBy || {};
        
        // 既に既読でない場合のみ更新
        if (!readBy[userId]) {
          readBy[userId] = true;
          batch.push(updateDoc(docSnapshot.ref, { readBy }));
        }
      }

      // バッチで一括更新
      if (batch.length > 0) {
        await Promise.all(batch);
      }
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  },

  // メッセージ送信時に既読フラグを初期化
  sendMessage: async (roomId: string, data: {
    senderId: string;
    messageText?: string;
  }): Promise<{ message: ChatMessage }> => {
    // チャットルームの情報を取得してブロックチェック
    const roomRef = doc(db, 'chatRooms', roomId);
    const roomDoc = await getDoc(roomRef);
    
    if (!roomDoc.exists()) {
      throw new Error('チャットルームが見つかりません');
    }
    
    const roomData = roomDoc.data();
    const otherUserId = roomData.user1Id === data.senderId ? roomData.user2Id : roomData.user1Id;
    
    // ブロックチェック
    const blockCheck = await blocksFirestoreApi.isUserBlocked(data.senderId, otherUserId);
    if (blockCheck.isBlocked) {
      throw new Error('このユーザーをブロックしているか、ブロックされているため、メッセージを送信できません');
    }
    const messageData: any = {
      senderId: data.senderId,
      createdAt: serverTimestamp(),
      readBy: { [data.senderId]: true }, // 送信者は既読
    };
    
    // undefined の場合はフィールドを追加しない
    if (data.messageText !== undefined) {
      messageData.messageText = data.messageText;
    }
    
    const docRef = await addDoc(collection(db, 'chatRooms', roomId, 'messages'), messageData);
    
    // 送信者のユーザー名を取得
    let senderUsername = 'Unknown User';
    try {
      const senderDoc = await getDoc(doc(db, 'users', data.senderId));
      if (senderDoc.exists()) {
        senderUsername = senderDoc.data().username || 'Unknown User';
      }
    } catch (error) {
      console.error('Failed to get sender info:', error);
    }
    
    const message: ChatMessage = {
      id: docRef.id,
      chatRoomId: roomId,
      senderId: data.senderId,
      senderUsername: senderUsername,
      messageText: data.messageText,
      createdAt: new Date(),
      readBy: { [data.senderId]: true },
    };
    
    return { message };
  },
};

// Video Call Schedule API
export const videoCallScheduleFirestoreApi = {
  // ビデオ通話予定作成
  createSchedule: async (data: {
    chatRoomId: string;
    proposerId: string;
    title: string;
    description?: string;
    proposedAt: string;
  }): Promise<{ schedule: VideoCallSchedule }> => {
    const scheduleData: any = {
      chatRoomId: data.chatRoomId,
      proposerId: data.proposerId,
      title: data.title,
      proposedAt: new Date(data.proposedAt),
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    if (data.description !== undefined) {
      scheduleData.description = data.description;
    }
    
    const docRef = await addDoc(collection(db, 'videoCallSchedules'), scheduleData);
    const schedule: VideoCallSchedule = {
      id: docRef.id,
      chatRoomId: data.chatRoomId,
      proposerId: data.proposerId,
      proposerUsername: 'Unknown User', // 後で取得
      title: data.title,
      description: data.description,
      proposedAt: data.proposedAt,
      status: 'pending',
    };
    
    return { schedule };
  },

  // ビデオ通話予定一覧取得
  getSchedules: async (chatRoomId: string): Promise<{ schedules: VideoCallSchedule[] }> => {
    const q = query(
      collection(db, 'videoCallSchedules'),
      where('chatRoomId', '==', chatRoomId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const schedules: VideoCallSchedule[] = [];
    
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      
      // 提案者のユーザー名を取得
      let proposerUsername = 'Unknown User';
      try {
        const proposerDoc = await getDoc(doc(db, 'users', data.proposerId));
        if (proposerDoc.exists()) {
          proposerUsername = proposerDoc.data().username || 'Unknown User';
        }
      } catch (error) {
        console.error('Failed to get proposer info:', error);
      }
      
      schedules.push({
        id: docSnapshot.id,
        chatRoomId: data.chatRoomId,
        proposerId: data.proposerId,
        proposerUsername: proposerUsername,
        title: data.title,
        description: data.description,
        proposedAt: data.proposedAt?.toDate()?.toISOString() || new Date().toISOString(),
        status: data.status,
      });
    }
    
    return { schedules };
  },

  // ビデオ通話予定への回答
  respondToSchedule: async (scheduleId: string, action: 'accept' | 'reject'): Promise<void> => {
    const scheduleRef = doc(db, 'videoCallSchedules', scheduleId);
    await updateDoc(scheduleRef, {
      status: action === 'accept' ? 'accepted' : 'rejected',
      updatedAt: serverTimestamp(),
    });
  },
};

// Block API
export const blocksFirestoreApi = {
  // ユーザーをブロック
  blockUser: async (blockerId: string, blockedUserId: string): Promise<{ block: Block }> => {
    // 既にブロックされているかチェック
    const existingBlock = await blocksFirestoreApi.isUserBlocked(blockerId, blockedUserId);
    if (existingBlock.isBlocked) {
      throw new Error('このユーザーは既にブロックされています');
    }

    // ブロックされたユーザー名を取得
    let blockedUsername = 'Unknown User';
    try {
      const blockedUserDoc = await getDoc(doc(db, 'users', blockedUserId));
      if (blockedUserDoc.exists()) {
        blockedUsername = blockedUserDoc.data().username || 'Unknown User';
      }
    } catch (error) {
      console.error('Failed to get blocked user info:', error);
    }

    const blockData = {
      blockerId: blockerId,
      blockedUserId: blockedUserId,
      blockedUsername: blockedUsername,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(db, 'blocks'), blockData);
    
    const block: Block = {
      id: docRef.id,
      blockerId: blockerId,
      blockedUserId: blockedUserId,
      blockedUsername: blockedUsername,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    return { block };
  },

  // ブロックを解除
  unblockUser: async (blockerId: string, blockedUserId: string): Promise<void> => {
    const q = query(
      collection(db, 'blocks'),
      where('blockerId', '==', blockerId),
      where('blockedUserId', '==', blockedUserId)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      throw new Error('ブロックが見つかりません');
    }
    
    // ブロックを削除
    const deletePromises = snapshot.docs.map(docSnapshot => deleteDoc(docSnapshot.ref));
    await Promise.all(deletePromises);
  },

  // ブロックされたユーザー一覧を取得
  getBlockedUsers: async (blockerId: string): Promise<{ blocks: Block[] }> => {
    const q = query(
      collection(db, 'blocks'),
      where('blockerId', '==', blockerId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const blocks: Block[] = [];
    
    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      blocks.push({
        id: docSnapshot.id,
        blockerId: data.blockerId,
        blockedUserId: data.blockedUserId,
        blockedUsername: data.blockedUsername,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      });
    });
    
    return { blocks };
  },

  // ユーザーがブロックされているかチェック（双方向）
  isUserBlocked: async (userId1: string, userId2: string): Promise<{ isBlocked: boolean; blockedBy?: string }> => {
    // userId1がuserId2をブロックしているかチェック
    const q1 = query(
      collection(db, 'blocks'),
      where('blockerId', '==', userId1),
      where('blockedUserId', '==', userId2)
    );
    
    // userId2がuserId1をブロックしているかチェック
    const q2 = query(
      collection(db, 'blocks'),
      where('blockerId', '==', userId2),
      where('blockedUserId', '==', userId1)
    );
    
    const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    
    if (!snapshot1.empty) {
      return { isBlocked: true, blockedBy: userId1 };
    }
    
    if (!snapshot2.empty) {
      return { isBlocked: true, blockedBy: userId2 };
    }
    
    return { isBlocked: false };
  },
};

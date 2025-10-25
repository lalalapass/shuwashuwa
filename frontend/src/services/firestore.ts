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
  serverTimestamp,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { User, Post, FriendRequest, ChatRoom, ChatMessage, Profile, VideoCallSchedule } from '../types/api';

// Users API
export const usersFirestoreApi = {
  // ユーザー検索
  searchUsers: async (params?: {
    signLanguageLevel?: string;
    firstLanguage?: string;
    search?: string;
    gender?: string;
    ageGroup?: string;
  }): Promise<{ users: User[] }> => {
    let q = query(collection(db, 'users'));
    
    if (params?.signLanguageLevel) {
      q = query(q, where('signLanguageLevel', '==', params.signLanguageLevel));
    }
    if (params?.firstLanguage) {
      q = query(q, where('firstLanguage', '==', params.firstLanguage));
    }
    if (params?.gender) {
      q = query(q, where('gender', '==', params.gender));
    }
    if (params?.ageGroup) {
      q = query(q, where('ageGroup', '==', params.ageGroup));
    }
    
    q = query(q, orderBy('createdAt', 'desc'), limit(50));
    
    const snapshot = await getDocs(q);
    const users: User[] = [];
    
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
        iconUrl: data.iconUrl,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      });
    });
    
    return { users };
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
      iconUrl: data.iconUrl,
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
    iconUrl?: string;
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
      iconUrl: userData.iconUrl,
      createdAt: userData.createdAt?.toDate(),
      updatedAt: userData.updatedAt?.toDate(),
    };
    
    return { profile };
  },
};

// Posts API
export const postsFirestoreApi = {
  // 投稿一覧取得
  getPosts: async (): Promise<{ posts: Post[] }> => {
    const q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    const snapshot = await getDocs(q);
    const posts: Post[] = [];
    
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      
      // ユーザー情報を取得（エラーが発生した場合はスキップ）
      let username = 'Unknown User';
      try {
        const userDocRef = doc(db, 'users', data.userId);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          username = userDoc.data().username || 'Unknown User';
        }
      } catch (error) {
        // ユーザー情報の取得に失敗した場合はデフォルト値を使用
        console.warn('Failed to get user info for userId:', data.userId);
      }
      
      posts.push({
        id: docSnapshot.id,
        userId: data.userId,
        username: username,
        contentText: data.contentText,
        contentVideoUrl: data.contentVideoUrl,
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
    contentVideoUrl?: string; 
  }): Promise<{ post: Post }> => {
    const postData = {
      userId: data.userId,
      contentText: data.contentText || '',
      contentVideoUrl: data.contentVideoUrl || '',
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
      contentVideoUrl: data.contentVideoUrl || '',
      likeCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    return { post };
  },

  // いいね機能
  toggleLike: async (postId: string, userId: string): Promise<{ liked: boolean }> => {
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
};

// Friend Requests API
export const friendRequestsFirestoreApi = {
  // 友達リクエスト送信
  sendRequest: async (data: {
    senderId: string;
    receiverId: string;
    message?: string;
  }): Promise<{ request: FriendRequest }> => {
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

  // 友達リクエスト一覧取得
  getRequests: async (userId: string): Promise<{ requests: FriendRequest[] }> => {
    const q = query(
      collection(db, 'friendRequests'),
      where('receiverId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const requests: FriendRequest[] = [];
    
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      
      // 送信者のユーザー情報を取得
      let senderUsername = 'Unknown User';
      try {
        const senderDoc = await getDoc(doc(db, 'users', data.senderId));
        if (senderDoc.exists()) {
          senderUsername = senderDoc.data().username || 'Unknown User';
        }
      } catch (error) {
        console.error('Failed to get sender info:', error);
      }
      
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
    
    // user1Id で検索した結果を追加
    for (const docSnapshot of snapshot1.docs) {
      const data = docSnapshot.data();
      if (!roomIds.has(docSnapshot.id)) {
        roomIds.add(docSnapshot.id);
        
        // 相手のユーザー名を取得
        let otherUsername = 'Unknown User';
        try {
          const otherUserId = data.user2Id;
          const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));
          if (otherUserDoc.exists()) {
            otherUsername = otherUserDoc.data().username || 'Unknown User';
          }
        } catch (error) {
          console.error('Failed to get other user info:', error);
        }
        
        rooms.push({
          id: docSnapshot.id,
          user1Id: data.user1Id,
          user2Id: data.user2Id,
          otherUsername: otherUsername,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      }
    }
    
    // user2Id で検索した結果を追加
    for (const docSnapshot of snapshot2.docs) {
      const data = docSnapshot.data();
      if (!roomIds.has(docSnapshot.id)) {
        roomIds.add(docSnapshot.id);
        
        // 相手のユーザー名を取得
        let otherUsername = 'Unknown User';
        try {
          const otherUserId = data.user1Id;
          const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));
          if (otherUserDoc.exists()) {
            otherUsername = otherUserDoc.data().username || 'Unknown User';
          }
        } catch (error) {
          console.error('Failed to get other user info:', error);
        }
        
        rooms.push({
          id: docSnapshot.id,
          user1Id: data.user1Id,
          user2Id: data.user2Id,
          otherUsername: otherUsername,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      }
    }
    
    // 作成日時の降順でソート
    rooms.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
    
    return { rooms };
  },

  // メッセージ送信
  sendMessage: async (roomId: string, data: {
    senderId: string;
    messageText?: string;
    videoUrl?: string;
  }): Promise<{ message: ChatMessage }> => {
    const messageData: any = {
      senderId: data.senderId,
      createdAt: serverTimestamp(),
    };
    
    // undefined の場合はフィールドを追加しない
    if (data.messageText !== undefined) {
      messageData.messageText = data.messageText;
    }
    if (data.videoUrl !== undefined) {
      messageData.videoUrl = data.videoUrl;
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
      videoUrl: data.videoUrl,
      createdAt: new Date(),
    };
    
    return { message };
  },

  // メッセージ一覧取得
  getMessages: async (roomId: string): Promise<{ messages: ChatMessage[] }> => {
    const q = query(
      collection(db, 'chatRooms', roomId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    
    const snapshot = await getDocs(q);
    const messages: ChatMessage[] = [];
    
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      
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
      
      messages.push({
        id: docSnapshot.id,
        chatRoomId: roomId,
        senderId: data.senderId,
        senderUsername: senderUsername,
        messageText: data.messageText,
        videoUrl: data.videoUrl,
        createdAt: data.createdAt?.toDate() || new Date(),
      });
    }
    
    return { messages };
  },

  // リアルタイムメッセージリスナー
  subscribeToMessages: (roomId: string, callback: (messages: ChatMessage[]) => void): Unsubscribe => {
    const q = query(
      collection(db, 'chatRooms', roomId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    
    return onSnapshot(q, async (snapshot) => {
      const messages: ChatMessage[] = [];
      
      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        
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
        
        messages.push({
          id: docSnapshot.id,
          chatRoomId: roomId,
          senderId: data.senderId,
          senderUsername: senderUsername,
          messageText: data.messageText,
          videoUrl: data.videoUrl,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      }
      
      callback(messages);
    });
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
      proposerUsername: data.proposerUsername || 'Unknown User',
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

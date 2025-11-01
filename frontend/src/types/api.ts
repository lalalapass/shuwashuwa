export interface User {
  id: string;
  uid: string;
  username: string;
  signLanguageLevel: string;
  firstLanguage: string;
  profileText?: string;
  gender?: string;
  ageGroup?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Post {
  id: string;
  userId: string;
  username: string;
  contentText?: string;
  createdAt?: Date;
  updatedAt?: Date;
  likeCount: number;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  senderUsername: string;
  receiverId: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ChatRoom {
  id: string;
  user1Id: string;
  user2Id: string;
  otherUsername?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  chatRoomId: string;
  senderId: string;
  senderUsername: string;
  messageText?: string;
  createdAt?: Date;
  readBy?: { [userId: string]: boolean }; // 各ユーザーの既読フラグ
}

export interface AuthResponse {
  user?: { id: number; username: string };
  token?: string;
}

export interface Profile {
  id: string;
  userId: string;
  username: string;
  signLanguageLevel: string;
  firstLanguage: string;
  profileText?: string;
  gender?: string;
  ageGroup?: string;
  createdAt?: Date;
  updatedAt?: Date;
  postCount?: number;
  friendCount?: number;
}

export interface VideoCallSchedule {
  id: string;
  chatRoomId: string;
  proposerId: string;
  proposerUsername: string;
  title: string;
  description?: string;
  proposedAt: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface VideoCallSession {
  id: string;
  chatRoomId: string;
  starterId: string;
  roomId: string;
  isActive: boolean;
  startedAt: Date;
  endedAt?: Date;
}

export interface Block {
  id: string;
  blockerId: string;
  blockedUserId: string;
  blockedUsername: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T> {
  [key: string]: T;
}

export interface User {
  id: number;
  username: string;
  signLanguageLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  firstLanguage: 'SPOKEN' | 'SIGN';
  profileText?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'UNSPECIFIED';
  ageGroup?: 'TEENS' | 'TWENTIES' | 'THIRTIES' | 'FORTIES' | 'FIFTIES' | 'SIXTIES_PLUS';
  iconUrl?: string;
  createdAt: string;
}

export interface Post {
  id: string;
  userId: string;
  username: string;
  contentText?: string;
  contentVideoUrl?: string;
  createdAt: string;
  likeCount: number;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  senderUsername: string;
  receiverId: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface ChatRoom {
  id: string;
  user1Id: string;
  user2Id: string;
  otherUsername?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  chatRoomId: string;
  senderId: string;
  senderUsername: string;
  messageText?: string;
  videoUrl?: string;
  createdAt: string;
}

export interface AuthResponse {
  user?: { id: number; username: string };
  token?: string;
}

export interface Profile {
  id: number;
  username: string;
  signLanguageLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  firstLanguage: 'SPOKEN' | 'SIGN';
  profileText?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'UNSPECIFIED';
  ageGroup?: 'TEENS' | 'TWENTIES' | 'THIRTIES' | 'FORTIES' | 'FIFTIES' | 'SIXTIES_PLUS';
  iconUrl?: string;
  createdAt: string;
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

export interface ApiResponse<T> {
  [key: string]: T;
}

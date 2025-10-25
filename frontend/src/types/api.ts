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
  id: number;
  userId: number;
  username: string;
  contentText?: string;
  contentVideoUrl?: string;
  createdAt: string;
  likeCount: number;
}

export interface FriendRequest {
  id: number;
  senderId: number;
  senderUsername: string;
  receiverId: number;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface ChatRoom {
  id: number;
  otherUserId: number;
  otherUsername: string;
  lastMessage?: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  chatRoomId: number;
  senderId: number;
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
  id: number;
  chatRoomId: number;
  proposerId: number;
  proposerUsername: string;
  title: string;
  description?: string;
  proposedAt: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface VideoCallSession {
  id: number;
  chatRoomId: number;
  starterId: number;
  roomId: string;
  isActive: boolean;
  startedAt: string;
  endedAt?: string;
}

export interface ApiResponse<T> {
  [key: string]: T;
}

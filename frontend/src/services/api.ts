import axios from 'axios';
import type { User, Post, FriendRequest, ChatRoom, ChatMessage, AuthResponse, Profile, VideoCallSchedule, VideoCallSession } from '../types/api';

const API_BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authApi = {
  register: async (data: {
    username: string;
    password: string;
    signLanguageLevel: string;
    firstLanguage: string;
    profileText?: string;
    gender?: string;
    ageGroup?: string;
    iconUrl?: string;
  }): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  login: async (data: { username: string; password: string }): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },
};

// Posts API
export const postsApi = {
  getPosts: async (): Promise<{ posts: Post[] }> => {
    const response = await api.get('/posts');
    return response.data;
  },

  createPost: async (data: { contentText?: string; contentVideoUrl?: string }): Promise<{ post: Post }> => {
    const response = await api.post('/posts', data);
    return response.data;
  },

  likePost: async (postId: number): Promise<{ liked: boolean }> => {
    const response = await api.post(`/posts/${postId}/like`);
    return response.data;
  },
};

// Users API
export const usersApi = {
  searchUsers: async (params?: {
    signLanguageLevel?: string;
    firstLanguage?: string;
    search?: string;
    gender?: string;
    ageGroup?: string;
  }): Promise<{ users: User[] }> => {
    const response = await api.get('/users', { params });
    return response.data;
  },
};

// Friend Requests API
export const friendRequestsApi = {
  sendRequest: async (data: { receiverId: number; message?: string }): Promise<{ request: FriendRequest }> => {
    const response = await api.post('/friend-requests', data);
    return response.data;
  },

  getReceivedRequests: async (): Promise<{ requests: FriendRequest[] }> => {
    const response = await api.get('/friend-requests/received');
    return response.data;
  },

  respondToRequest: async (requestId: number, action: 'accept' | 'reject'): Promise<{ status: string; chatRoomId?: number }> => {
    const response = await api.put(`/friend-requests/${requestId}`, { action });
    return response.data;
  },
};

// Chat API
export const chatApi = {
  getRooms: async (): Promise<{ rooms: ChatRoom[] }> => {
    const response = await api.get('/chat/rooms');
    return response.data;
  },

  getMessages: async (roomId: number): Promise<{ messages: ChatMessage[] }> => {
    const response = await api.get(`/chat/${roomId}/messages`);
    return response.data;
  },

  sendMessage: async (roomId: number, data: { messageText?: string; videoUrl?: string }): Promise<{ message: ChatMessage }> => {
    const response = await api.post(`/chat/${roomId}/messages`, data);
    return response.data;
  },
};

// Profile API
export const profileApi = {
  getProfile: async (): Promise<{ profile: Profile }> => {
    const response = await api.get('/profile');
    return response.data;
  },

  getUserProfile: async (userId: number): Promise<{ profile: Profile }> => {
    const response = await api.get(`/profile/${userId}`);
    return response.data;
  },

  updateProfile: async (data: {
    signLanguageLevel?: string;
    firstLanguage?: string;
    profileText?: string;
    gender?: string;
    ageGroup?: string;
    iconUrl?: string;
  }): Promise<{ profile: Profile }> => {
    const response = await api.put('/profile', data);
    return response.data;
  },
};

// Video Call API
export const videoCallApi = {
  // Schedule management
  createSchedule: async (data: {
    chatRoomId: number;
    title: string;
    description?: string;
    proposedAt: string;
  }): Promise<{ schedule: VideoCallSchedule }> => {
    const response = await api.post('/video-call/schedule', data);
    return response.data;
  },

  getSchedules: async (chatRoomId: number): Promise<{ schedules: VideoCallSchedule[] }> => {
    const response = await api.get(`/video-call/schedule/${chatRoomId}`);
    return response.data;
  },

  respondToSchedule: async (scheduleId: number, action: 'accept' | 'reject'): Promise<{ schedule: VideoCallSchedule }> => {
    const response = await api.put(`/video-call/schedule/${scheduleId}`, { action });
    return response.data;
  },

  // Session management
  startSession: async (chatRoomId: number): Promise<{ session: VideoCallSession }> => {
    const response = await api.post('/video-call/session', { chatRoomId });
    return response.data;
  },

  getActiveSession: async (chatRoomId: number): Promise<{ session: VideoCallSession | null }> => {
    const response = await api.get(`/video-call/session/${chatRoomId}`);
    return response.data;
  },

  endSession: async (sessionId: number): Promise<{ session: VideoCallSession }> => {
    const response = await api.put(`/video-call/session/${sessionId}/end`);
    return response.data;
  },
};

export default api;

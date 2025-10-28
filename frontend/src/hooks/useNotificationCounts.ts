import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { friendRequestsFirestoreApi, chatFirestoreApi } from '../services/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';

export interface NotificationCounts {
  pendingRequests: number;
  unreadChats: number;
}

export const useNotificationCounts = () => {
  const [counts, setCounts] = useState<NotificationCounts>({
    pendingRequests: 0,
    unreadChats: 0,
  });
  const [loading, setLoading] = useState(false);
  const { user: currentUser, loading: authLoading } = useAuth();

  // ユーザーがログアウトした時のみカウントをリセット
  useEffect(() => {
    if (!authLoading && !currentUser) {
      setCounts({ pendingRequests: 0, unreadChats: 0 });
      setLoading(false);
    }
  }, [currentUser, authLoading]);

  const loadNotificationCounts = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // バッチ読み取り: 友達リクエストとチャットルームを並列で取得
      const [requestsResponse, chatResponse] = await Promise.all([
        friendRequestsFirestoreApi.getRequests(currentUser.uid),
        chatFirestoreApi.getRooms(currentUser.uid)
      ]);

      const pendingRequestsCount = requestsResponse.requests.length;
      const unreadChatsCount = chatResponse.rooms.reduce((total, room) => {
        return total + (room.unreadCount || 0);
      }, 0);

      setCounts({
        pendingRequests: pendingRequestsCount,
        unreadChats: unreadChatsCount,
      });
    } catch (error) {
      console.error('Failed to load notification counts:', error);
      setCounts({ pendingRequests: 0, unreadChats: 0 });
    } finally {
      setLoading(false);
    }
  };

  const refreshCounts = useCallback(() => {
    loadNotificationCounts();
  }, [currentUser]);

  return {
    counts,
    loading,
    refreshCounts,
  };
};

import { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(true);
  const { user: currentUser, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && currentUser) {
      loadNotificationCounts();
    } else if (!authLoading && !currentUser) {
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
      // 未対応のリクエスト数を取得
      const requestsResponse = await friendRequestsFirestoreApi.getRequests(currentUser.uid);
      const pendingRequestsCount = requestsResponse.requests.length;

      // 未読メッセージの総数を取得
      const chatResponse = await chatFirestoreApi.getRooms(currentUser.uid);
      const unreadChatsCount = await getUnreadMessagesCount(chatResponse.rooms, currentUser.uid);

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

  const getUnreadMessagesCount = async (rooms: any[], currentUserId: string): Promise<number> => {
    let totalUnreadCount = 0;
    
    for (const room of rooms) {
      try {
        // 各チャットルームの未読メッセージ数を取得（既読フラグベース）
        const unreadCount = await chatFirestoreApi.getUnreadMessageCount(room.id, currentUserId);
        totalUnreadCount += unreadCount;
      } catch (error) {
        console.error('Failed to get unread count for room:', room.id, error);
      }
    }
    
    return totalUnreadCount;
  };

  const refreshCounts = () => {
    loadNotificationCounts();
  };

  return {
    counts,
    loading,
    refreshCounts,
  };
};

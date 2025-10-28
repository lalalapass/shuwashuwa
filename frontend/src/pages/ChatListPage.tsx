import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatFirestoreApi } from '../services/firestore';
import { useAuth } from '../context/AuthContext';
import ChatRoomList from '../components/Chat/ChatRoomList';
import type { ChatRoom } from '../types/api';
import { useNotificationCounts } from '../hooks/useNotificationCounts';
import { useRefreshContext } from '../context/RefreshContext';

const ChatListPage: React.FC = () => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();
  const { refreshCounts } = useNotificationCounts();
  const { registerRefreshFunction, unregisterRefreshFunction } = useRefreshContext();
  const navigate = useNavigate();

  useEffect(() => {
    loadRooms();
    
    // 更新関数を登録
    registerRefreshFunction('chatList', loadRooms);
    
    // コンポーネントのアンマウント時に登録を解除
    return () => {
      unregisterRefreshFunction('chatList');
    };
  }, [registerRefreshFunction, unregisterRefreshFunction]);

  const loadRooms = async () => {
    setLoading(true);
    try {
      if (!currentUser) {
        console.error('User not authenticated');
        return;
      }
      
      // 直接 chatFirestoreApi.getRooms を使用
      const { chatFirestoreApi } = await import('../services/firestore');
      const response = await chatFirestoreApi.getRooms(currentUser.uid);
      setRooms(response.rooms || []);
    } catch (error) {
      console.error('Failed to load chat rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoomSelect = (roomId: string) => {
    navigate(`/chat/${roomId}`);
    // チャットルームを選択した時に通知カウントを更新
    refreshCounts();
  };

  if (!currentUser) {
    return <div>ログインが必要です</div>;
  }

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  return (
    <div className="chat-list-page">
      <div className="chat-list-container">
        <div className="chat-list-header">
          <h2>チャット</h2>
        </div>
        <ChatRoomList
          rooms={rooms}
          onRoomSelect={handleRoomSelect}
        />
      </div>
    </div>
  );
};

export default ChatListPage;


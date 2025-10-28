import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chatFirestoreApi } from '../services/firestore';
import { useAuth } from '../context/AuthContext';
import MessageList from '../components/Chat/MessageList';
import MessageInput from '../components/Chat/MessageInput';
import ScheduleManager from '../components/VideoCall/ScheduleManager';
import VideoCallInterface from '../components/VideoCall/VideoCallInterface';
import { useNotificationCounts } from '../hooks/useNotificationCounts';
import type { ChatRoom, ChatMessage } from '../types/api';

const ChatDetailPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'schedule' | 'video'>('chat');
  const { user: currentUser } = useAuth();
  const { refreshCounts } = useNotificationCounts();
  const [refreshTimeout, setRefreshTimeout] = useState<number | null>(null);

  useEffect(() => {
    if (roomId) {
      loadRoomInfo(roomId);
    }
  }, [roomId]);

  // リアルタイムメッセージリスナー
  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = chatFirestoreApi.subscribeToMessages(roomId, (newMessages) => {
      setMessages(newMessages);
      setMessagesLoading(false);
      
      // デバウンスして通知カウントを更新（500ms後に実行）
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      const timeout = setTimeout(() => {
        refreshCounts();
      }, 500);
      setRefreshTimeout(timeout);
    });

    return () => {
      unsubscribe();
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
    };
  }, [roomId]);

  const loadRoomInfo = async (roomId: string) => {
    if (!currentUser) {
      navigate('/chat');
      return;
    }
    
    setLoading(true);
    setMessagesLoading(true);
    try {
      // Load room info only
      const roomsResponse = await chatFirestoreApi.getRooms(currentUser.uid);
      const foundRoom = roomsResponse.rooms?.find(r => r.id === roomId);
      
      if (!foundRoom) {
        navigate('/chat');
        return;
      }
      
      setRoom(foundRoom);
      
      // チャットルームに訪問した時に全メッセージを既読にする
      await chatFirestoreApi.markAllMessagesAsRead(roomId, currentUser.uid);
    } catch (error) {
      console.error('Failed to load room info:', error);
      navigate('/chat');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (data: { messageText?: string; videoUrl?: string }) => {
    if (!roomId || !currentUser || sending) return;
    
    setSending(true);
    try {
      const response = await chatFirestoreApi.sendMessage(roomId, {
        senderId: currentUser.uid,
        messageText: data.messageText,
        videoUrl: data.videoUrl,
      });
      // Message will be added to the list via real-time listener
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('メッセージの送信に失敗しました');
    } finally {
      setSending(false);
    }
  };

  const handleBackToList = () => {
    navigate('/chat');
  };

  if (!currentUser) {
    return <div>ログインが必要です</div>;
  }

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  if (!room) {
    return (
      <div className="error">
        <p>チャットルームが見つかりません</p>
        <button onClick={handleBackToList}>チャット一覧に戻る</button>
      </div>
    );
  }

  return (
    <div className="chat-detail-page">
      <div className="chat-detail-container">
        <div className="chat-header">
          <button onClick={handleBackToList} className="back-button">
            ← チャット一覧
          </button>
          <h3>{room.otherUsername}とのチャット</h3>
          <div className="chat-tabs">
            <button
              onClick={() => setActiveTab('chat')}
              className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`}
            >
              💬 チャット
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`tab-button ${activeTab === 'schedule' ? 'active' : ''}`}
            >
              📅 日程調整
            </button>
            <button
              onClick={() => setActiveTab('video')}
              className={`tab-button ${activeTab === 'video' ? 'active' : ''}`}
            >
              📹 ビデオ通話
            </button>
          </div>
        </div>
        
        <div className="chat-content">
          {activeTab === 'chat' && (
            <>
              <div className="chat-messages">
                {messagesLoading ? (
                  <div className="loading">メッセージを読み込み中...</div>
                ) : (
                  <MessageList
                    messages={messages}
                    currentUserId={currentUser.uid}
                  />
                )}
              </div>
              
              <div className="chat-input">
                <MessageInput
                  onSendMessage={handleSendMessage}
                  disabled={sending}
                />
              </div>
            </>
          )}
          
          {activeTab === 'schedule' && (
            <ScheduleManager
              chatRoomId={room.id}
              onScheduleUpdate={() => {
                // Optionally refresh data or show notifications
              }}
            />
          )}
          
          {activeTab === 'video' && (
            <VideoCallInterface
              chatRoomId={room.id}
              onCallEnd={() => {
                // Optionally switch back to chat tab
                setActiveTab('chat');
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatDetailPage;


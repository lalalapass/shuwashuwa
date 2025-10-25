import React from 'react';
import type { ChatRoom } from '../../types/api';

interface ChatRoomListProps {
  rooms: ChatRoom[];
  selectedRoomId?: string;
  onRoomSelect: (roomId: string) => void;
}

const ChatRoomList: React.FC<ChatRoomListProps> = ({ rooms, selectedRoomId, onRoomSelect }) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="chat-room-list">
      <h3>チャット一覧</h3>
      {rooms.length === 0 ? (
        <div className="no-rooms">
          <p>チャットルームがありません</p>
          <p>ユーザー検索から会話リクエストを送ってみましょう</p>
        </div>
      ) : (
        <div className="rooms">
          {rooms.map((room) => (
            <div
              key={room.id}
              className={`room-item ${selectedRoomId === room.id ? 'selected' : ''}`}
              onClick={() => onRoomSelect(room.id)}
            >
              <div className="room-header">
                <strong>{room.otherUsername}</strong>
                {room.lastMessageAt && (
                  <span className="last-message-time">
                    {formatDate(room.lastMessageAt)}
                  </span>
                )}
              </div>
              {room.lastMessage && (
                <div className="last-message">
                  {room.lastMessage.length > 50 
                    ? `${room.lastMessage.substring(0, 50)}...` 
                    : room.lastMessage
                  }
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatRoomList;

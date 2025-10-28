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
    const diffInMs = now.getTime() - date.getTime();
    
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInDays / 365);
    
    if (diffInMinutes < 1) {
      return 'たった今';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}分前`;
    } else if (diffInHours < 24) {
      return `${diffInHours}時間前`;
    } else if (diffInDays < 30) {
      return `${diffInDays}日前`;
    } else if (diffInMonths < 12) {
      return `${diffInMonths}か月前`;
    } else {
      return `${diffInYears}年前`;
    }
  };

  const formatLastMessage = (message: string) => {
    if (!message) return 'メッセージがありません';
    return message.length > 40 
      ? `${message.substring(0, 40)}...` 
      : message;
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
                <div className="room-user-info">
                  <strong className="room-username">{room.otherUsername}</strong>
                  {room.lastMessageAt && (
                    <span className="last-message-time">
                      {formatDate(room.lastMessageAt)}
                    </span>
                  )}
                </div>
              </div>
              <div className="room-content">
                <div className="last-message">
                  {formatLastMessage(room.lastMessage || '')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatRoomList;

import React, { useEffect, useRef } from 'react';
import type { ChatMessage } from '../../types/api';

interface MessageListProps {
  messages: ChatMessage[];
  currentUserId: number;
}

const MessageList: React.FC<MessageListProps> = ({ messages, currentUserId }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="message-list">
      {messages.length === 0 ? (
        <div className="no-messages">
          <p>まだメッセージがありません</p>
          <p>最初のメッセージを送ってみましょう！</p>
        </div>
      ) : (
        <div className="messages">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.senderId === currentUserId ? 'own' : 'other'}`}
            >
              <div className="message-content">
                <div className="message-header">
                  <span className="sender">{message.senderUsername}</span>
                  <span className="time">{formatTime(message.createdAt)}</span>
                </div>
                <div className="message-body">
                  {message.messageText && (
                    <p className="message-text">{message.messageText}</p>
                  )}
                  {message.videoUrl && (
                    <div className="message-video">
                      <video controls width="300">
                        <source src={message.videoUrl} type="video/mp4" />
                        お使いのブラウザは動画再生に対応していません。
                      </video>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;

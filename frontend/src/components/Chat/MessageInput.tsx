import React, { useState } from 'react';

interface MessageInputProps {
  onSendMessage: (data: { messageText?: string; videoUrl?: string }) => void;
  disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, disabled }) => {
  const [messageText, setMessageText] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'text' | 'video'>('text');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (activeTab === 'text' && messageText.trim()) {
      onSendMessage({ messageText: messageText.trim() });
      setMessageText('');
    } else if (activeTab === 'video' && videoUrl.trim()) {
      onSendMessage({ videoUrl: videoUrl.trim() });
      setVideoUrl('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="message-input">
      <div className="input-tabs">
        <button
          type="button"
          className={`tab ${activeTab === 'text' ? 'active' : ''}`}
          onClick={() => setActiveTab('text')}
        >
          テキスト
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'video' ? 'active' : ''}`}
          onClick={() => setActiveTab('video')}
        >
          動画URL
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="input-form">
        {activeTab === 'text' ? (
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="メッセージを入力..."
            disabled={disabled}
            rows={3}
            className="text-input"
          />
        ) : (
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="動画のURLを入力..."
            disabled={disabled}
            className="url-input"
          />
        )}
        
        <button
          type="submit"
          disabled={disabled || (activeTab === 'text' ? !messageText.trim() : !videoUrl.trim())}
          className="send-button"
        >
          送信
        </button>
      </form>
    </div>
  );
};

export default MessageInput;

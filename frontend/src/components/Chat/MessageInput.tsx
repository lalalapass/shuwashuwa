import React, { useState } from 'react';

interface MessageInputProps {
  onSendMessage: (data: { messageText: string }) => void;
  onRefresh?: () => void;
  disabled?: boolean;
  refreshing?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, onRefresh, disabled, refreshing }) => {
  const [messageText, setMessageText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (messageText.trim()) {
      onSendMessage({ messageText: messageText.trim() });
      setMessageText('');
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
      <form onSubmit={handleSubmit} className="input-form">
        <textarea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="メッセージを入力..."
          disabled={disabled}
          rows={3}
          className="text-input"
        />
        
        <div className="button-group">
          <button
            type="submit"
            disabled={disabled || !messageText.trim()}
            className="send-button"
          >
            送信
          </button>
          
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={disabled || refreshing}
              className="refresh-button"
            >
              {refreshing ? '更新中...' : '更新'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default MessageInput;

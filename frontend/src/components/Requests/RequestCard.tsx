import React, { useState } from 'react';
import { friendRequestsApi } from '../../services/api';
import type { FriendRequest } from '../../types/api';

interface RequestCardProps {
  request: FriendRequest;
  onRequestHandled: (requestId: number, action: 'accept' | 'reject', chatRoomId?: number) => void;
}

const RequestCard: React.FC<RequestCardProps> = ({ request, onRequestHandled }) => {
  const [isHandling, setIsHandling] = useState(false);

  const handleRequest = async (action: 'accept' | 'reject') => {
    if (isHandling) return;
    setIsHandling(true);

    try {
      const response = await friendRequestsApi.respondToRequest(request.id, action);
      onRequestHandled(request.id, action, response.chatRoomId);
    } catch (error) {
      console.error('Failed to handle request:', error);
      alert('リクエストの処理に失敗しました');
    } finally {
      setIsHandling(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="request-card">
      <div className="request-header">
        <div className="sender-info">
          <strong>{request.senderUsername}</strong>
          <span className="request-date">{formatDate(request.createdAt)}</span>
        </div>
      </div>
      
      {request.message && (
        <div className="request-message">
          <p>"{request.message}"</p>
        </div>
      )}
      
      <div className="request-actions">
        <button
          onClick={() => handleRequest('accept')}
          disabled={isHandling}
          className="accept-button"
        >
          {isHandling ? '処理中...' : '承認'}
        </button>
        <button
          onClick={() => handleRequest('reject')}
          disabled={isHandling}
          className="reject-button"
        >
          {isHandling ? '処理中...' : '拒否'}
        </button>
      </div>
    </div>
  );
};

export default RequestCard;

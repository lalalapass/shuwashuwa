import React from 'react';
import { Link } from 'react-router-dom';
import type { FriendRequest } from '../../types/api';

interface SentRequestCardProps {
  request: FriendRequest;
}

const SentRequestCard: React.FC<SentRequestCardProps> = ({ request }) => {
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '待機中';
      case 'accepted':
        return '承認済み';
      case 'rejected':
        return '拒否されました';
      default:
        return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'accepted':
        return 'status-accepted';
      case 'rejected':
        return 'status-rejected';
      default:
        return 'status-unknown';
    }
  };

  return (
    <div className="sent-request-card">
      <div className="request-header">
        <div className="receiver-info">
          <strong>
            <Link to={`/users/${request.receiverId}`} className="username-link">
              {request.senderUsername}
            </Link>
          </strong>
          <span className="request-date">{formatDate(request.createdAt?.toISOString() || new Date().toISOString())}</span>
        </div>
        <div className={`request-status ${getStatusClass(request.status)}`}>
          {getStatusText(request.status)}
        </div>
      </div>
      
      {request.message && (
        <div className="request-message">
          <p>"{request.message}"</p>
        </div>
      )}
    </div>
  );
};

export default SentRequestCard;

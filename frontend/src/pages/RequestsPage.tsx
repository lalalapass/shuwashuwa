import React, { useState, useEffect } from 'react';
import { friendRequestsFirestoreApi } from '../services/firestore';
import { useAuth } from '../context/AuthContext';
import RequestCard from '../components/Requests/RequestCard';
import type { FriendRequest } from '../types/api';

const RequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [handledRequests, setHandledRequests] = useState<Set<string>>(new Set());
  const { user: currentUser, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && currentUser) {
      loadRequests();
    }
  }, [currentUser, authLoading]);

  const loadRequests = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const response = await friendRequestsFirestoreApi.getRequests(currentUser.uid);
      setRequests(response.requests);
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestHandled = (requestId: string, action: 'accept' | 'reject', chatRoomId?: string) => {
    setHandledRequests((prev: Set<string>) => new Set(prev).add(requestId));
    
    if (action === 'accept' && chatRoomId) {
      // Show success message for accepted request
      alert(`リクエストを承認しました！チャットルームが作成されました。`);
    } else if (action === 'reject') {
      alert('リクエストを拒否しました。');
    }
    
    // Remove the handled request from the list
    setRequests((prev: FriendRequest[]) => prev.filter(req => req.id !== requestId));
  };

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  return (
    <div className="requests-page">
      <div className="requests-container">
        <h2>受信した会話リクエスト</h2>
        
        {requests.length === 0 ? (
          <div className="no-requests">
            <p>新しい会話リクエストはありません</p>
          </div>
        ) : (
          <div className="requests-list">
            {requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onRequestHandled={handleRequestHandled}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestsPage;

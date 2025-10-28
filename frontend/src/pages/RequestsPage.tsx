import React, { useState, useEffect } from 'react';
import { friendRequestsFirestoreApi } from '../services/firestore';
import { useAuth } from '../context/AuthContext';
import RequestCard from '../components/Requests/RequestCard';
import SentRequestCard from '../components/Requests/SentRequestCard';
import type { FriendRequest } from '../types/api';
import { useNotificationCounts } from '../hooks/useNotificationCounts';
import { useRefreshContext } from '../context/RefreshContext';

const RequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [filteredSentRequests, setFilteredSentRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sentLoading, setSentLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
  const [handledRequests, setHandledRequests] = useState<Set<string>>(new Set());
  const { user: currentUser, loading: authLoading } = useAuth();
  const { refreshCounts } = useNotificationCounts();
  const { registerRefreshFunction, unregisterRefreshFunction } = useRefreshContext();

  useEffect(() => {
    if (!authLoading && currentUser) {
      loadRequests();
      loadSentRequests();
      
      // 更新関数を登録
      registerRefreshFunction('requests', loadRequests);
      registerRefreshFunction('sentRequests', loadSentRequests);
    }
    
    // コンポーネントのアンマウント時に登録を解除
    return () => {
      unregisterRefreshFunction('requests');
      unregisterRefreshFunction('sentRequests');
    };
  }, [currentUser, authLoading, registerRefreshFunction, unregisterRefreshFunction]);

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

  const loadSentRequests = async () => {
    if (!currentUser) {
      setSentLoading(false);
      return;
    }
    
    setSentLoading(true);
    try {
      const response = await friendRequestsFirestoreApi.getSentRequests(currentUser.uid);
      setSentRequests(response.requests);
      setFilteredSentRequests(response.requests);
    } catch (error) {
      console.error('Failed to load sent requests:', error);
    } finally {
      setSentLoading(false);
    }
  };

  // ステータスフィルターを適用
  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredSentRequests(sentRequests);
    } else {
      setFilteredSentRequests(sentRequests.filter(request => request.status === statusFilter));
    }
  }, [sentRequests, statusFilter]);

  // ステータステキストを取得
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '待機中';
      case 'accepted':
        return '承認済み';
      case 'rejected':
        return '拒否されました';
      default:
        return 'すべて';
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
    
    // 通知カウントを更新
    refreshCounts();
  };

  if (loading && activeTab === 'received') {
    return <div className="loading">読み込み中...</div>;
  }

  if (sentLoading && activeTab === 'sent') {
    return <div className="loading">読み込み中...</div>;
  }

  return (
    <div className="requests-page">
      <div className="requests-container">
        <div className="requests-header">
          <div className="tab-navigation">
            <button
              className={`tab-button ${activeTab === 'received' ? 'active' : ''}`}
              onClick={() => setActiveTab('received')}
            >
              受信したリクエスト ({requests.length})
            </button>
            <button
              className={`tab-button ${activeTab === 'sent' ? 'active' : ''}`}
              onClick={() => setActiveTab('sent')}
            >
              送信したリクエスト ({sentRequests.length})
            </button>
          </div>
          
          {activeTab === 'sent' && (
            <div className="status-filter">
              <label htmlFor="status-filter">ステータスでフィルター:</label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'accepted' | 'rejected')}
                className="status-select"
              >
                <option value="all">すべて ({sentRequests.length})</option>
                <option value="pending">待機中 ({sentRequests.filter(r => r.status === 'pending').length})</option>
                <option value="accepted">承認済み ({sentRequests.filter(r => r.status === 'accepted').length})</option>
                <option value="rejected">拒否されました ({sentRequests.filter(r => r.status === 'rejected').length})</option>
              </select>
            </div>
          )}
        </div>
        
        {activeTab === 'received' ? (
          <>
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
          </>
        ) : (
          <>
            {filteredSentRequests.length === 0 ? (
              <div className="no-requests">
                <p>
                  {statusFilter === 'all' 
                    ? '送信した会話リクエストはありません' 
                    : `${getStatusText(statusFilter)}のリクエストはありません`}
                </p>
              </div>
            ) : (
              <div className="requests-list">
                {filteredSentRequests.map((request) => (
                  <SentRequestCard
                    key={request.id}
                    request={request}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RequestsPage;

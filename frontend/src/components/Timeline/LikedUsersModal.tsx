import React, { useState, useEffect } from 'react';
import { postsFirestoreApi } from '../../services/firestore';
import type { User } from '../../types/api';

interface LikedUsersModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
}

const LikedUsersModal: React.FC<LikedUsersModalProps> = ({ postId, isOpen, onClose }) => {
  const [likedUsers, setLikedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && postId) {
      loadLikedUsers();
    } else {
      // モーダルが閉じられたら状態をリセット
      setLikedUsers([]);
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, postId]);

  const loadLikedUsers = async () => {
    if (loading) return; // 既に読み込み中の場合は何もしない
    
    setLoading(true);
    setError('');
    
    try {
      const response = await postsFirestoreApi.getPostLikes(postId);
      setLikedUsers(response.users);
    } catch (error: any) {
      console.error('Failed to load liked users:', error);
      setError(error.message || 'いいねした人を取得できませんでした');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>いいねした人</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="loading">読み込み中...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : likedUsers.length === 0 ? (
            <div className="no-data">まだいいねがありません</div>
          ) : (
            <div className="liked-users-list">
              {likedUsers.map((user) => (
                <div key={user.id} className="liked-user-item">
                  <div className="user-avatar-small">
                    <div className="avatar-circle-small">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="user-info-small">
                    <strong>{user.username}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LikedUsersModal;

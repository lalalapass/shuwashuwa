import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { friendRequestsFirestoreApi } from '../../services/firestore';
import { useAuth } from '../../context/AuthContext';
import type { User } from '../../types/api';

interface UserCardProps {
  user: User;
  currentUserId: number;
}

const UserCard: React.FC<UserCardProps> = ({ user, currentUserId }) => {
  const [isRequestSent, setIsRequestSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');
  const [showMessageForm, setShowMessageForm] = useState(false);
  const { user: currentUser } = useAuth();

  const handleSendRequest = async () => {
    if (isSending) return;
    
    if (!currentUser) {
      alert('ログインが必要です');
      return;
    }
    
    setIsSending(true);

    try {
      await friendRequestsFirestoreApi.sendRequest({
        senderId: currentUser.uid,
        receiverId: user.id,
        message: message.trim() || undefined,
      });
      setIsRequestSent(true);
      setShowMessageForm(false);
      setMessage('');
    } catch (error) {
      console.error('Failed to send friend request:', error);
      alert('リクエストの送信に失敗しました');
    } finally {
      setIsSending(false);
    }
  };

  const getSignLanguageLevelText = (level: string) => {
    switch (level) {
      case 'BEGINNER': return '初級';
      case 'INTERMEDIATE': return '中級';
      case 'ADVANCED': return '上級';
      default: return level;
    }
  };

  const getFirstLanguageText = (language: string) => {
    switch (language) {
      case 'SPOKEN': return '音声言語';
      case 'SIGN': return '手話';
      default: return language;
    }
  };

  const getGenderText = (gender?: string) => {
    if (!gender) return '';
    switch (gender) {
      case 'MALE': return '男性';
      case 'FEMALE': return '女性';
      case 'OTHER': return 'その他';
      case 'UNSPECIFIED': return '未回答';
      default: return gender;
    }
  };

  const getAgeGroupText = (ageGroup?: string) => {
    if (!ageGroup) return '';
    switch (ageGroup) {
      case 'TEENS': return '10代';
      case 'TWENTIES': return '20代';
      case 'THIRTIES': return '30代';
      case 'FORTIES': return '40代';
      case 'FIFTIES': return '50代';
      case 'SIXTIES_PLUS': return '60代以上';
      default: return ageGroup;
    }
  };

  if (user.id === currentUserId) {
    return null; // Don't show current user
  }

  return (
    <div className="user-card">
      <div className="user-header">
        <div className="user-info">
          <h3>
            <Link to={`/users/${user.id}`} className="username-link">
              {user.username}
            </Link>
          </h3>
          <div className="user-details">
            <span className="badge">
              手話レベル: {getSignLanguageLevelText(user.signLanguageLevel)}
            </span>
            <span className="badge">
              第一言語: {getFirstLanguageText(user.firstLanguage)}
            </span>
            {user.gender && (
              <span className="badge">
                {getGenderText(user.gender)}
              </span>
            )}
            {user.ageGroup && (
              <span className="badge">
                {getAgeGroupText(user.ageGroup)}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {user.profileText && (
        <div className="user-profile">
          <p>{user.profileText}</p>
        </div>
      )}

      <div className="user-actions">
        {isRequestSent ? (
          <div className="request-sent">
            ✓ リクエストを送信しました
          </div>
        ) : showMessageForm ? (
          <div className="message-form">
            <textarea
              placeholder="メッセージを入力（任意）"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
            />
            <div className="form-actions">
              <button
                onClick={handleSendRequest}
                disabled={isSending}
                className="send-button"
              >
                {isSending ? '送信中...' : 'リクエスト送信'}
              </button>
              <button
                onClick={() => setShowMessageForm(false)}
                className="cancel-button"
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowMessageForm(true)}
            className="request-button"
          >
            会話リクエストを送る
          </button>
        )}
      </div>
    </div>
  );
};

export default UserCard;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { friendRequestsFirestoreApi, usersFirestoreApi } from '../services/firestore';
import { useAuth } from '../context/AuthContext';
import type { Profile } from '../types/api';

const UserProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRequestSent, setIsRequestSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');
  const [showMessageForm, setShowMessageForm] = useState(false);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (!userId || !currentUser) return;
    
    // Redirect to own profile page if viewing own profile
    if (userId === currentUser.uid) {
      navigate('/profile');
      return;
    }

    loadProfile(userId);
  }, [userId, currentUser, navigate]);

  const loadProfile = async (userIdStr: string) => {
    setLoading(true);
    try {
      const response = await usersFirestoreApi.getUser(userIdStr);
      const user = response.user;
      const profile: Profile = {
        id: user.uid,
        userId: user.uid,
        username: user.username,
        signLanguageLevel: user.signLanguageLevel,
        firstLanguage: user.firstLanguage,
        profileText: user.profileText,
        gender: user.gender,
        ageGroup: user.ageGroup,
        iconUrl: user.iconUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
      setProfile(profile);
    } catch (error: unknown) {
      console.error('Failed to load user profile:', error);
      setError('プロフィールの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!profile || isSending) return;
    setIsSending(true);

    try {
      await friendRequestsFirestoreApi.sendRequest({
        senderId: currentUser?.uid || '',
        receiverId: profile.id,
        message: message.trim() || undefined,
      });
      setIsRequestSent(true);
      setShowMessageForm(false);
      setMessage('');
    } catch (error: unknown) {
      console.error('Failed to send friend request:', error);
      alert('リクエストの送信に失敗しました');
    } finally {
      setIsSending(false);
    }
  };

  // Helper functions for display
  const getSignLanguageLevelJapanese = (level: string) => {
    switch (level) {
      case 'BEGINNER': return '初級';
      case 'INTERMEDIATE': return '中級';
      case 'ADVANCED': return '上級';
      default: return level;
    }
  };

  const getFirstLanguageJapanese = (language: string) => {
    switch (language) {
      case 'SPOKEN': return '音声言語';
      case 'SIGN': return '手話';
      default: return language;
    }
  };

  const getGenderJapanese = (gender?: string) => {
    switch (gender) {
      case 'MALE': return '男性';
      case 'FEMALE': return '女性';
      case 'OTHER': return 'その他';
      case 'UNSPECIFIED': return '未回答';
      default: return '';
    }
  };

  const getAgeGroupJapanese = (ageGroup?: string) => {
    switch (ageGroup) {
      case 'TEENS': return '10代';
      case 'TWENTIES': return '20代';
      case 'THIRTIES': return '30代';
      case 'FORTIES': return '40代';
      case 'FIFTIES': return '50代';
      case 'SIXTIES_PLUS': return '60代以上';
      default: return '';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!currentUser) {
    return <div>ログインが必要です</div>;
  }

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  if (error) {
    return (
      <div className="error-page">
        <div className="error-message">{error}</div>
        <button onClick={() => navigate('/users')} className="back-button">
          ユーザー検索に戻る
        </button>
      </div>
    );
  }

  if (!profile) {
    return <div className="error">プロフィールが見つかりません</div>;
  }

  return (
    <div className="user-profile-page">
      <div className="user-profile-container">
        <div className="profile-header-section">
          <button onClick={() => navigate('/users')} className="back-button">
            ← ユーザー検索に戻る
          </button>
          
          <div className="profile-header">
            <div className="profile-avatar">
              {profile.iconUrl ? (
                <img src={profile.iconUrl} alt="プロフィール画像" />
              ) : (
                <div className="avatar-placeholder">
                  {profile.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="profile-info">
              <h2>{profile.username}</h2>
              <p className="join-date">参加日: {formatDate(profile.createdAt?.toISOString() || new Date().toISOString())}</p>
              <div className="profile-stats">
                <div className="stat">
                  <span className="stat-number">{profile.postCount || 0}</span>
                  <span className="stat-label">投稿</span>
                </div>
                <div className="stat">
                  <span className="stat-number">{profile.friendCount || 0}</span>
                  <span className="stat-label">友達</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-details">
          <div className="details-section">
            <h3>基本情報</h3>
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">手話レベル</span>
                <span className="detail-value badge">
                  {getSignLanguageLevelJapanese(profile.signLanguageLevel)}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">第一言語</span>
                <span className="detail-value badge">
                  {getFirstLanguageJapanese(profile.firstLanguage)}
                </span>
              </div>
              {profile.gender && (
                <div className="detail-item">
                  <span className="detail-label">性別</span>
                  <span className="detail-value badge">
                    {getGenderJapanese(profile.gender)}
                  </span>
                </div>
              )}
              {profile.ageGroup && (
                <div className="detail-item">
                  <span className="detail-label">年齢層</span>
                  <span className="detail-value badge">
                    {getAgeGroupJapanese(profile.ageGroup)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {profile.profileText && (
            <div className="details-section">
              <h3>自己紹介</h3>
              <div className="profile-text">
                <p>{profile.profileText}</p>
              </div>
            </div>
          )}

          <div className="profile-actions">
            {isRequestSent ? (
              <div className="request-sent">
                ✓ 会話リクエストを送信しました
              </div>
            ) : showMessageForm ? (
              <div className="message-form">
                <h4>会話リクエストを送信</h4>
                <textarea
                  placeholder="メッセージを入力（任意）"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
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
      </div>
    </div>
  );
};

export default UserProfilePage;

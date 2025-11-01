import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { friendRequestsFirestoreApi, usersFirestoreApi, postsFirestoreApi, blocksFirestoreApi } from '../services/firestore';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/Timeline/PostCard';
import type { Profile, Post } from '../types/api';

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
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (!userId || !currentUser) return;
    
    // Redirect to own profile page if viewing own profile
    if (userId === currentUser.uid) {
      navigate('/profile');
      return;
    }

    loadProfile(userId);
    checkBlockStatus();
  }, [userId, currentUser, navigate]);

  const checkBlockStatus = async () => {
    if (!userId || !currentUser) return;
    
    try {
      const result = await blocksFirestoreApi.isUserBlocked(currentUser.uid, userId);
      setIsBlocked(result.isBlocked && result.blockedBy === currentUser.uid);
    } catch (error) {
      console.error('Failed to check block status:', error);
    }
  };

  useEffect(() => {
    if (profile && userId) {
      loadUserPosts(userId);
    }
  }, [profile, userId]);

  // メニュー外をクリックしたら閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.profile-menu-container')) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMenu]);

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
    
    // ブロックチェック
    try {
      const blockCheck = await blocksFirestoreApi.isUserBlocked(currentUser?.uid || '', profile.id);
      if (blockCheck.isBlocked) {
        alert('このユーザーをブロックしているか、ブロックされているため、リクエストを送信できません');
        return;
      }
    } catch (error) {
      console.error('Failed to check block status:', error);
    }

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
      const errorMessage = error instanceof Error ? error.message : 'リクエストの送信に失敗しました';
      alert(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  const loadUserPosts = async (userIdStr: string) => {
    setLoadingPosts(true);
    try {
      const response = await postsFirestoreApi.getUserPosts(userIdStr, currentUser?.uid);
      setUserPosts(response.posts);
    } catch (error) {
      console.error('Failed to load user posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleLikeUpdate = (postId: string, liked: boolean) => {
    setUserPosts(userPosts.map(post => 
      post.id === postId 
        ? { ...post, likeCount: post.likeCount + (liked ? 1 : -1) }
        : post
    ));
  };

  const handleBlockUser = async () => {
    if (!currentUser || !profile || isBlocking) return;
    
    if (!window.confirm(`${profile.username}をブロックしますか？\nブロックすると、このユーザーとの会話やリクエストができなくなります。`)) {
      return;
    }

    setIsBlocking(true);
    try {
      await blocksFirestoreApi.blockUser(currentUser.uid, profile.id);
      setIsBlocked(true);
      alert('ユーザーをブロックしました');
    } catch (error: unknown) {
      console.error('Failed to block user:', error);
      alert('ブロックに失敗しました');
    } finally {
      setIsBlocking(false);
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
              <div className="avatar-placeholder">
                {profile.username.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="profile-info">
              <h2>{profile.username}</h2>
              <p className="join-date">参加日: {formatDate(profile.createdAt?.toISOString() || new Date().toISOString())}</p>
            </div>
            <div className="profile-menu-container">
              <button
                className="profile-menu-button"
                onClick={() => setShowMenu(!showMenu)}
                aria-label="メニュー"
              >
                ⋮
              </button>
              {showMenu && (
                <div className="profile-menu">
                  {!isBlocked ? (
                    <button
                      className="profile-menu-item block-menu-item"
                      onClick={() => {
                        setShowMenu(false);
                        handleBlockUser();
                      }}
                      disabled={isBlocking}
                    >
                      {isBlocking ? 'ブロック中...' : 'ユーザーをブロック'}
                    </button>
                  ) : (
                    <div className="profile-menu-item block-menu-item disabled">
                      ブロック済み
                    </div>
                  )}
                </div>
              )}
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
            {isBlocked ? (
              <div className="blocked-notice">
                ⚠ このユーザーをブロックしています
              </div>
            ) : isRequestSent ? (
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

        <div className="profile-posts-section">
          <h3>過去の投稿</h3>
          {loadingPosts ? (
            <div className="loading">読み込み中...</div>
          ) : userPosts.length === 0 ? (
            <div className="no-posts">まだ投稿がありません</div>
          ) : (
            <div className="posts-list">
              {userPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLikeUpdate={handleLikeUpdate}
                  showMenu={false}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;

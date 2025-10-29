import React, { useState, useEffect } from 'react';
// import { profileApi } from '../services/api'; // Firebase移行により不要
import { useAuth } from '../context/AuthContext';
import { usersFirestoreApi } from '../services/firestore';
import type { Profile } from '../types/api';

const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user: currentUser, loading: authLoading, refreshUser } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    signLanguageLevel: '',
    firstLanguage: '',
    profileText: '',
    gender: '',
    ageGroup: '',
  });

  useEffect(() => {
    if (!authLoading && currentUser?.uid) {
      loadProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, currentUser?.uid]);

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    
    try {
      if (!currentUser) {
        setError('ユーザーが認証されていません。ログインしてください。');
        setLoading(false);
        return;
      }

      // Firestore から直接最新のプロフィールデータを取得
      const response = await usersFirestoreApi.getUser(currentUser.uid);
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
      
      // Initialize form data - Firestore から取得した値は既に日本語
      setFormData({
        signLanguageLevel: profile.signLanguageLevel || '',
        firstLanguage: profile.firstLanguage || '',
        profileText: profile.profileText || '',
        gender: profile.gender || '',
        ageGroup: profile.ageGroup || '',
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
      setError('プロフィールの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      if (!currentUser) {
        setError('ユーザーが認証されていません');
        return;
      }

      // Firebase移行後は直接 usersFirestoreApi.updateProfile を使用
      const response = await usersFirestoreApi.updateProfile(currentUser.uid, formData);
      
      // ローカルステートを更新
      setProfile(response.profile);
      setSuccess('プロフィールを更新しました！');
      
      // プロフィール更新後、フォームデータも更新
      setFormData({
        signLanguageLevel: response.profile.signLanguageLevel || '',
        firstLanguage: response.profile.firstLanguage || '',
        profileText: response.profile.profileText || '',
        gender: response.profile.gender || '',
        ageGroup: response.profile.ageGroup || '',
      });
      
      // AuthContext の user も更新（他のコンポーネントで最新データを使用するため）
      // 無限ループを避けるため、refreshUser のみ呼び出す（loadProfile は呼ばない）
      await refreshUser();
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      setError(error.message || 'プロフィールの更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Helper functions for display (Firestore から取得した値は既に日本語のため不要)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (authLoading) {
    return <div className="loading">認証状態を確認中...</div>;
  }

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  if (!currentUser) {
    return (
      <div className="error-page">
        <div className="error-message">ログインが必要です</div>
        <button onClick={() => window.location.href = '/shuwashuwa/auth'} className="back-button">
          ログインページに移動
        </button>
      </div>
    );
  }

  if (!profile) {
    return <div className="error">プロフィールが見つかりません</div>;
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <h2>プロフィール編集</h2>
        
        <div className="profile-info">
          <div className="profile-header">
            <div className="profile-avatar">
              <div className="avatar-placeholder">
                {profile.username.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="profile-basic">
              <h3>{profile.username}</h3>
              <p className="join-date">参加日: {formatDate(profile.createdAt?.toISOString() || new Date().toISOString())}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-section">
            <h4>基本情報</h4>
            
            <div className="form-group">
              <label htmlFor="signLanguageLevel">手話レベル *</label>
              <select
                id="signLanguageLevel"
                value={formData.signLanguageLevel}
                onChange={(e) => handleInputChange('signLanguageLevel', e.target.value)}
                required
              >
                <option value="">選択してください</option>
                <option value="初級">初級</option>
                <option value="中級">中級</option>
                <option value="上級">上級</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="firstLanguage">第一言語 *</label>
              <select
                id="firstLanguage"
                value={formData.firstLanguage}
                onChange={(e) => handleInputChange('firstLanguage', e.target.value)}
                required
              >
                <option value="">選択してください</option>
                <option value="音声言語">音声言語</option>
                <option value="手話">手話</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="gender">性別</label>
              <select
                id="gender"
                value={formData.gender}
                onChange={(e) => handleInputChange('gender', e.target.value)}
              >
                <option value="">選択してください</option>
                <option value="男性">男性</option>
                <option value="女性">女性</option>
                <option value="その他">その他</option>
                <option value="未回答">未回答</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="ageGroup">年齢層</label>
              <select
                id="ageGroup"
                value={formData.ageGroup}
                onChange={(e) => handleInputChange('ageGroup', e.target.value)}
              >
                <option value="">選択してください</option>
                <option value="10代">10代</option>
                <option value="20代">20代</option>
                <option value="30代">30代</option>
                <option value="40代">40代</option>
                <option value="50代">50代</option>
                <option value="60代以上">60代以上</option>
              </select>
            </div>
          </div>

          <div className="form-section">
            <h4>プロフィール詳細</h4>
            
            <div className="form-group">
              <label htmlFor="profileText">自己紹介</label>
              <textarea
                id="profileText"
                value={formData.profileText}
                onChange={(e) => handleInputChange('profileText', e.target.value)}
                placeholder="あなたについて教えてください..."
                rows={4}
              />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="form-actions">
            <button
              type="submit"
              disabled={saving}
              className="save-button"
            >
              {saving ? '保存中...' : 'プロフィールを更新'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;

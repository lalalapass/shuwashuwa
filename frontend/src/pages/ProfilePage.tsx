import React, { useState, useEffect } from 'react';
import { profileApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Profile } from '../types/api';

const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user: currentUser } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    signLanguageLevel: '',
    firstLanguage: '',
    profileText: '',
    gender: '',
    ageGroup: '',
    iconUrl: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const response = await profileApi.getProfile();
      setProfile(response.profile);
      
      // Initialize form data
      setFormData({
        signLanguageLevel: getSignLanguageLevelJapanese(response.profile.signLanguageLevel),
        firstLanguage: getFirstLanguageJapanese(response.profile.firstLanguage),
        profileText: response.profile.profileText || '',
        gender: getGenderJapanese(response.profile.gender),
        ageGroup: getAgeGroupJapanese(response.profile.ageGroup),
        iconUrl: response.profile.iconUrl || '',
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
      const response = await profileApi.updateProfile(formData);
      setProfile(response.profile);
      setSuccess('プロフィールを更新しました！');
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      setError(error.response?.data?.message || 'プロフィールの更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Helper functions for display
  const getSignLanguageLevelJapanese = (level?: string) => {
    switch (level) {
      case 'BEGINNER': return '初級';
      case 'INTERMEDIATE': return '中級';
      case 'ADVANCED': return '上級';
      default: return '';
    }
  };

  const getFirstLanguageJapanese = (language?: string) => {
    switch (language) {
      case 'SPOKEN': return '音声言語';
      case 'SIGN': return '手話';
      default: return '';
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
              {profile.iconUrl ? (
                <img src={profile.iconUrl} alt="プロフィール画像" />
              ) : (
                <div className="avatar-placeholder">
                  {profile.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="profile-basic">
              <h3>{profile.username}</h3>
              <p className="join-date">参加日: {formatDate(profile.createdAt)}</p>
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

            <div className="form-group">
              <label htmlFor="iconUrl">プロフィール画像URL</label>
              <input
                type="url"
                id="iconUrl"
                value={formData.iconUrl}
                onChange={(e) => handleInputChange('iconUrl', e.target.value)}
                placeholder="https://example.com/image.jpg"
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

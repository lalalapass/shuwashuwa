import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    signLanguageLevel: '初級',
    firstLanguage: '音声言語',
    profileText: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const registerResponse = await authApi.register(formData);
      if (registerResponse.user) {
        // Registration successful, now login
        const loginResponse = await authApi.login({
          username: formData.username,
          password: formData.password,
        });
        if (loginResponse.token && loginResponse.user) {
          login(loginResponse.token, loginResponse.user);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form">
      <h2>アカウント登録</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">ユーザー名</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">パスワード</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="signLanguageLevel">手話レベル</label>
          <select
            id="signLanguageLevel"
            name="signLanguageLevel"
            value={formData.signLanguageLevel}
            onChange={handleChange}
            required
          >
            <option value="初級">初級</option>
            <option value="中級">中級</option>
            <option value="上級">上級</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="firstLanguage">第一言語</label>
          <select
            id="firstLanguage"
            name="firstLanguage"
            value={formData.firstLanguage}
            onChange={handleChange}
            required
          >
            <option value="音声言語">音声言語</option>
            <option value="手話">手話</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="profileText">プロフィール（任意）</label>
          <textarea
            id="profileText"
            name="profileText"
            value={formData.profileText}
            onChange={handleChange}
            rows={3}
          />
        </div>
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? '登録中...' : '登録'}
        </button>
      </form>
      <p>
        既にアカウントをお持ちの方は{' '}
        <button type="button" className="link-button" onClick={onSwitchToLogin}>
          こちら
        </button>
      </p>
    </div>
  );
};

export default RegisterForm;

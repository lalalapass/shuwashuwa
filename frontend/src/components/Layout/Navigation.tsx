import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navigation: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-brand">
          <Link to="/">しゅわしゅわ</Link>
        </div>
        {isAuthenticated ? (
          <>
            <div className="nav-links">
              <Link to="/timeline" className={isActive('/timeline') ? 'active' : ''}>
                タイムライン
              </Link>
              <Link to="/users" className={isActive('/users') ? 'active' : ''}>
                ユーザー検索
              </Link>
              <Link to="/requests" className={isActive('/requests') ? 'active' : ''}>
                リクエスト
              </Link>
              <Link to="/chat" className={isActive('/chat') ? 'active' : ''}>
                チャット
              </Link>
              <Link to="/profile" className={isActive('/profile') ? 'active' : ''}>
                プロフィール
              </Link>
            </div>
            <div className="nav-user">
              <span>こんにちは、{user?.username}さん</span>
              <button onClick={logout} className="logout-button">
                ログアウト
              </button>
            </div>
          </>
        ) : (
          <div className="nav-auth">
            <Link to="/auth" className="auth-link">
              ログイン / 登録
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;

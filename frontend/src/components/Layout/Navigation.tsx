import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotificationCounts } from '../../hooks/useNotificationCounts';
import { useRefreshContext } from '../../context/RefreshContext';

const Navigation: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { counts, refreshCounts } = useNotificationCounts();
  const { refreshAll, isRefreshing } = useRefreshContext();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const NotificationBadge: React.FC<{ count: number }> = ({ count }) => {
    if (count === 0) return null;
    
    return (
      <span className="notification-badge">
        {count > 99 ? '99+' : count}
      </span>
    );
  };

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
                <NotificationBadge count={counts.pendingRequests} />
              </Link>
              <Link to="/chat" className={isActive('/chat') ? 'active' : ''}>
                チャット
                <NotificationBadge count={counts.unreadChats} />
              </Link>
            </div>
            <div className="nav-actions">
              <Link to="/profile" className={`nav-link ${isActive('/profile') ? 'active' : ''}`}>
                プロフィール
              </Link>
              <button onClick={logout} className="logout-button">
                ログアウト
              </button>
              <button 
                onClick={refreshAll} 
                className="refresh-button"
                title="全てのデータを更新"
                disabled={isRefreshing}
              >
                {isRefreshing ? '更新中...' : '更新'}
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

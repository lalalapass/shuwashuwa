import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-logo">
            <h1 className="logo-text">しゅわしゅわ</h1>
            <div className="logo-subtitle">手話でつながるコミュニティ</div>
          </div>
          <p className="hero-description">
            手話を通じて、多様な人々とつながり、
            <br />
            新しいコミュニティを作りませんか？
          </p>
          <div className="hero-actions">
            {isAuthenticated ? (
              <Link to="/timeline" className="cta-button primary">
                タイムラインへ
              </Link>
            ) : (
              <Link to="/auth" className="cta-button primary">
                今すぐ始める
              </Link>
            )}
            <a href="#features" className="cta-button secondary">
              詳しく見る
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="container">
          <h2 className="section-title">しゅわしゅわの特徴</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🤝</div>
              <h3>つながりを育む</h3>
              <p>
                手話レベルや第一言語に関係なく、誰もが安心して交流できる環境を提供します。
                初心者から上級者まで、それぞれのペースで学び合えます。
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>マッチング機能</h3>
              <p>
                年齢層、性別、手話レベルなど詳細な条件で、
                あなたに合った学習パートナーや友達を見つけられます。
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🌟</div>
              <h3>安全な環境</h3>
              <p>
                会話リクエスト機能により、お互いの同意のもとで
                安心してコミュニケーションを始められます。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">
              <span className="logo-text">しゅわしゅわ</span>
            </div>
            <p className="footer-text">
              手話でつながるコミュニティ - 誰もが安心して交流できる場所
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;

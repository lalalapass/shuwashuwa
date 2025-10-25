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
              <div className="feature-icon">💬</div>
              <h3>多様なコミュニケーション</h3>
              <p>
                テキスト投稿に加えて、手話動画の共有も可能。
                視覚的なコミュニケーションを重視し、より豊かな表現を実現します。
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

      {/* Mission Section */}
      <section className="mission-section">
        <div className="container">
          <div className="mission-content">
            <h2 className="section-title">私たちのミッション</h2>
            <div className="mission-text">
              <p>
                <strong>「手話でつながる、心でつながる」</strong>
              </p>
              <p>
                しゅわしゅわは、手話を通じて聴覚障害者と健聴者の間にある
                コミュニケーションの壁を取り除き、相互理解を深めることを目指しています。
              </p>
              <p>
                私たちは、手話が単なる「言語」ではなく、豊かな文化と表現力を持つ
                コミュニケーション手段であることを多くの人に知ってもらいたいと考えています。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Impact Section */}
      <section className="impact-section">
        <div className="container">
          <h2 className="section-title">社会への価値</h2>
          <div className="impact-grid">
            <div className="impact-item">
              <h3>🌍 インクルーシブな社会の実現</h3>
              <p>
                聴覚障害者と健聴者が自然に交流できる環境を作ることで、
                より包括的で多様性を尊重する社会の構築に貢献します。
              </p>
            </div>
            <div className="impact-item">
              <h3>📚 手話学習の促進</h3>
              <p>
                実践的な学習環境を提供することで、手話を学ぶ人々を支援し、
                手話話者のコミュニティ拡大に寄与します。
              </p>
            </div>
            <div className="impact-item">
              <h3>💡 理解と共感の向上</h3>
              <p>
                直接的な交流を通じて、聴覚障害への理解を深め、
                偏見や誤解を解消し、共感に基づく関係性を築きます。
              </p>
            </div>
            <div className="impact-item">
              <h3>🤲 孤立感の解消</h3>
              <p>
                同じ境遇や興味を持つ人々とのつながりを提供することで、
                社会的孤立感を軽減し、精神的な支援を行います。
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

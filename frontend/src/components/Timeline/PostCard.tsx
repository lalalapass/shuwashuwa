import React, { useState, useRef, useEffect } from 'react';
import { postsFirestoreApi } from '../../services/firestore';
import { useAuth } from '../../context/AuthContext';
import LikedUsersModal from './LikedUsersModal';
import type { Post } from '../../types/api';

interface PostCardProps {
  post: Post;
  onLikeUpdate: (postId: string, liked: boolean) => void;
  showMenu?: boolean;
  onDelete?: (postId: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onLikeUpdate, showMenu = false, onDelete }) => {
  const [isLiking, setIsLiking] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [showLikedUsersModal, setShowLikedUsersModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, loading } = useAuth();

  // メニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenuDropdown(false);
      }
    };

    if (showMenuDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenuDropdown]);

  const handleLike = async () => {
    if (isLiking) return;
    
    if (loading) {
      return;
    }
    
    if (!user) {
      alert('ログインが必要です');
      return;
    }
    
    if (!user.uid) {
      alert('ユーザーIDが取得できません');
      return;
    }
    
    setIsLiking(true);

    try {
      const response = await postsFirestoreApi.toggleLike(post.id, user.uid);
      onLikeUpdate(post.id, response.liked);
    } catch (error) {
      console.error('Failed to like post:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleShowLikedUsers = () => {
    setShowMenuDropdown(false);
    setShowLikedUsersModal(true);
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    const confirmed = window.confirm('この投稿を削除しますか？');
    if (!confirmed) {
      setShowMenuDropdown(false);
      return;
    }

    setIsDeleting(true);
    setShowMenuDropdown(false);

    try {
      await postsFirestoreApi.deletePost(post.id);
      onDelete(post.id);
    } catch (error: any) {
      console.error('Failed to delete post:', error);
      alert(error.message || '投稿の削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <div className="post-card">
        <div className="post-header">
          <div className="user-info">
            <strong>{post.username || 'Unknown User'}</strong>
            <span className="post-date">{formatDate(post.createdAt?.toISOString() || new Date().toISOString())}</span>
          </div>
          {showMenu && (
            <div className="post-menu-container" ref={menuRef}>
              <button
                className="post-menu-button"
                onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                disabled={isDeleting}
              >
                ⋮
              </button>
              {showMenuDropdown && (
                <div className="post-menu-dropdown">
                  <button
                    className="post-menu-item"
                    onClick={handleShowLikedUsers}
                    disabled={post.likeCount === 0}
                  >
                    いいねした人を確認
                  </button>
                  <button
                    className="post-menu-item post-menu-item-delete"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? '削除中...' : '投稿を削除'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="post-content">
          <div className="user-avatar">
            <div className="avatar-circle">
              {post.username ? post.username.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
          <div className="speech-bubble">
            {post.contentText && <p>{post.contentText}</p>}
          </div>
          <div className="bubble-like-container">
            <button
              className={`bubble-like-button ${isLiking ? 'liking' : ''}`}
              onClick={handleLike}
              disabled={isLiking}
            >
              <span className="bubble-icon">💙</span>
              <span className="like-count">{post.likeCount || 0}</span>
            </button>
          </div>
        </div>
      </div>
      <LikedUsersModal
        postId={post.id}
        isOpen={showLikedUsersModal}
        onClose={() => setShowLikedUsersModal(false)}
      />
    </>
  );
};

export default PostCard;

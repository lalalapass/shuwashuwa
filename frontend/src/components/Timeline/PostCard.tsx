import React, { useState } from 'react';
import { postsApi } from '../../services/api';
import type { Post } from '../../types/api';

interface PostCardProps {
  post: Post;
  onLikeUpdate: (postId: number, liked: boolean) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onLikeUpdate }) => {
  const [isLiking, setIsLiking] = useState(false);

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);

    try {
      const response = await postsApi.likePost(post.id);
      onLikeUpdate(post.id, response.liked);
    } catch (error) {
      console.error('Failed to like post:', error);
    } finally {
      setIsLiking(false);
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
    <div className="post-card">
      <div className="post-header">
        <div className="user-info">
          <strong>{post.username}</strong>
          <span className="post-date">{formatDate(post.createdAt)}</span>
        </div>
      </div>
      <div className="post-content">
        <div className="user-avatar">
          <div className="avatar-circle">
            {post.username.charAt(0).toUpperCase()}
          </div>
        </div>
        <div className="speech-bubble">
          {post.contentText && <p>{post.contentText}</p>}
          {post.contentVideoUrl && (
            <video controls className="post-video">
              <source src={post.contentVideoUrl} type="video/mp4" />
              お使いのブラウザは動画をサポートしていません。
            </video>
          )}
        </div>
        <div className="bubble-like-container">
          <button
            className={`bubble-like-button ${isLiking ? 'liking' : ''}`}
            onClick={handleLike}
            disabled={isLiking}
          >
            <span className="bubble-icon">💙</span>
            <span className="like-count">{post.likeCount}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostCard;

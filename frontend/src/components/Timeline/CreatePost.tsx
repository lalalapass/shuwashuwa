import React, { useState } from 'react';
import { postsFirestoreApi } from '../../services/firestore';
import { useAuth } from '../../context/AuthContext';
import type { Post } from '../../types/api';

interface CreatePostProps {
  onPostCreated: (post: Post) => void;
}

const CreatePost: React.FC<CreatePostProps> = ({ onPostCreated }) => {
  const [contentText, setContentText] = useState('');
  const [contentVideoUrl, setContentVideoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentText.trim() && !contentVideoUrl.trim()) return;
    if (!user) {
      alert('ログインが必要です');
      return;
    }

    setIsSubmitting(true);
    try {
      // 直接 postsFirestoreApi.createPost を使用
      const { postsFirestoreApi } = await import('../../services/firestore');
      const response = await postsFirestoreApi.createPost({
        userId: user.uid,
        contentText: contentText.trim() || '',
        contentVideoUrl: contentVideoUrl.trim() || '',
      });
      
      // ユーザー名を追加
      const postWithUsername = {
        ...response.post,
        username: user.username || 'Unknown User'
      };
      
      onPostCreated(postWithUsername);
      setContentText('');
      setContentVideoUrl('');
    } catch (error) {
      console.error('Failed to create post:', error);
      alert('投稿の作成に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-post">
      <h3>新しい投稿</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <textarea
            placeholder="今何をしていますか？手話の練習や日常のことを共有しましょう..."
            value={contentText}
            onChange={(e) => setContentText(e.target.value)}
            rows={3}
          />
        </div>
        <div className="form-group">
          <input
            type="url"
            placeholder="動画URL（任意）"
            value={contentVideoUrl}
            onChange={(e) => setContentVideoUrl(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting || (!contentText.trim() && !contentVideoUrl.trim())}
        >
          {isSubmitting ? '投稿中...' : '投稿する'}
        </button>
      </form>
    </div>
  );
};

export default CreatePost;

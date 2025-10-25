import React, { useState } from 'react';
import { postsApi } from '../../services/api';
import type { Post } from '../../types/api';

interface CreatePostProps {
  onPostCreated: (post: Post) => void;
}

const CreatePost: React.FC<CreatePostProps> = ({ onPostCreated }) => {
  const [contentText, setContentText] = useState('');
  const [contentVideoUrl, setContentVideoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentText.trim() && !contentVideoUrl.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await postsApi.createPost({
        contentText: contentText.trim() || undefined,
        contentVideoUrl: contentVideoUrl.trim() || undefined,
      });
      
      onPostCreated(response.post);
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

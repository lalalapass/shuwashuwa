import React, { useState, useEffect } from 'react';
import { postsApi } from '../services/api';
import PostCard from '../components/Timeline/PostCard';
import CreatePost from '../components/Timeline/CreatePost';
import type { Post } from '../types/api';

const TimelinePage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const response = await postsApi.getPosts();
      setPosts(response.posts);
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostCreated = (newPost: Post) => {
    setPosts([newPost, ...posts]);
  };

  const handleLikeUpdate = (postId: number, liked: boolean) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, likeCount: post.likeCount + (liked ? 1 : -1) }
        : post
    ));
  };

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  return (
    <div className="timeline-page">
      <div className="timeline-container">
        <CreatePost onPostCreated={handlePostCreated} />
        <div className="posts-list">
          {posts.length === 0 ? (
            <div className="no-posts">まだ投稿がありません</div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onLikeUpdate={handleLikeUpdate}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TimelinePage;

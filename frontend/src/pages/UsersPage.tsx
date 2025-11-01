import React, { useState, useEffect } from 'react';
import { usersFirestoreApi } from '../services/firestore';
import { useAuth } from '../context/AuthContext';
import UserSearch from '../components/Users/UserSearch';
import UserCard from '../components/Users/UserCard';
import type { User } from '../types/api';

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async (filters?: {
    signLanguageLevel?: string;
    firstLanguage?: string;
    search?: string;
    gender?: string;
    ageGroup?: string;
  }) => {
    setLoading(true);
    try {
      // 直接 usersFirestoreApi.searchUsers を使用
      const { usersFirestoreApi } = await import('../services/firestore');
      
      // 空のフィルターの場合はundefinedを渡す
      const searchFilters = filters && Object.keys(filters).length > 0 ? filters : undefined;
      const response = await usersFirestoreApi.searchUsers(searchFilters);
      setUsers(response.users);
      console.log('Loaded users:', response.users.length, 'with filters:', searchFilters);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (filters: {
    signLanguageLevel?: string;
    firstLanguage?: string;
    search?: string;
    gender?: string;
    ageGroup?: string;
  }) => {
    loadUsers(filters);
  };

  if (!currentUser) {
    return <div>ログインが必要です</div>;
  }

  return (
    <div className="users-page">
      <div className="users-container">
        <UserSearch onSearch={handleSearch} />
        
        {loading ? (
          <div className="loading">読み込み中...</div>
        ) : (
          <div className="users-list">
            {users.length === 0 ? (
              <div className="no-users">該当するユーザーが見つかりませんでした</div>
            ) : (
              <div className="users-grid">
                {users.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    currentUserId={currentUser.uid}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersPage;

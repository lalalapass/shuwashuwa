import React, { useState } from 'react';

interface UserSearchProps {
  onSearch: (filters: {
    signLanguageLevel?: string;
    firstLanguage?: string;
    search?: string;
    gender?: string;
    ageGroup?: string;
  }) => void;
}

const UserSearch: React.FC<UserSearchProps> = ({ onSearch }) => {
  const [filters, setFilters] = useState({
    signLanguageLevel: '',
    firstLanguage: '',
    search: '',
    gender: '',
    ageGroup: '',
  });

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Apply filters - only include non-empty values
    const searchParams: any = {};
    if (newFilters.signLanguageLevel) searchParams.signLanguageLevel = newFilters.signLanguageLevel;
    if (newFilters.firstLanguage) searchParams.firstLanguage = newFilters.firstLanguage;
    if (newFilters.gender) searchParams.gender = newFilters.gender;
    if (newFilters.ageGroup) searchParams.ageGroup = newFilters.ageGroup;
    if (newFilters.search.trim()) searchParams.search = newFilters.search.trim();
    
    // Always call onSearch to ensure the list updates
    onSearch(searchParams);
  };

  const clearFilters = () => {
    const clearedFilters = {
      signLanguageLevel: '',
      firstLanguage: '',
      search: '',
      gender: '',
      ageGroup: '',
    };
    setFilters(clearedFilters);
    onSearch({});
  };

  return (
    <div className="user-search">
      <h3>ユーザー検索</h3>
      <div className="search-filters">
        <div className="filter-group">
          <label htmlFor="search">ユーザー名で検索</label>
          <input
            type="text"
            id="search"
            placeholder="ユーザー名を入力..."
            value={filters.search}
            onChange={(e) => {
              const value = e.target.value;
              setFilters(prev => ({ ...prev, search: value }));
              
              // 検索実行（空文字列の場合は全ユーザーを表示）
              const searchParams: any = {};
              if (value.trim()) {
                searchParams.search = value.trim();
              }
              // 空文字列でも検索を実行してリストを更新
              onSearch(searchParams);
            }}
          />
        </div>
        
        <div className="filter-group">
          <label htmlFor="signLanguageLevel">手話レベル</label>
          <select
            id="signLanguageLevel"
            value={filters.signLanguageLevel}
            onChange={(e) => handleFilterChange('signLanguageLevel', e.target.value)}
          >
            <option value="">すべて</option>
            <option value="初級">初級</option>
            <option value="中級">中級</option>
            <option value="上級">上級</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="firstLanguage">第一言語</label>
          <select
            id="firstLanguage"
            value={filters.firstLanguage}
            onChange={(e) => handleFilterChange('firstLanguage', e.target.value)}
          >
            <option value="">すべて</option>
            <option value="音声言語">音声言語</option>
            <option value="手話">手話</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="gender">性別</label>
          <select
            id="gender"
            value={filters.gender}
            onChange={(e) => handleFilterChange('gender', e.target.value)}
          >
            <option value="">すべて</option>
            <option value="男性">男性</option>
            <option value="女性">女性</option>
            <option value="その他">その他</option>
            <option value="未回答">未回答</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="ageGroup">年齢層</label>
          <select
            id="ageGroup"
            value={filters.ageGroup}
            onChange={(e) => handleFilterChange('ageGroup', e.target.value)}
          >
            <option value="">すべて</option>
            <option value="10代">10代</option>
            <option value="20代">20代</option>
            <option value="30代">30代</option>
            <option value="40代">40代</option>
            <option value="50代">50代</option>
            <option value="60代以上">60代以上</option>
          </select>
        </div>
        
        <button onClick={clearFilters} className="clear-filters">
          フィルターをクリア
        </button>
      </div>
    </div>
  );
};

export default UserSearch;

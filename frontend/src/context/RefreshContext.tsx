import React, { createContext, useContext, useCallback, useState, useRef, ReactNode } from 'react';
import { useNotificationCounts } from '../hooks/useNotificationCounts';

interface RefreshContextType {
  registerRefreshFunction: (key: string, refreshFn: () => void | Promise<void>) => void;
  unregisterRefreshFunction: (key: string) => void;
  refreshAll: () => Promise<void>;
  isRefreshing: boolean;
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

export const useRefreshContext = () => {
  const context = useContext(RefreshContext);
  if (!context) {
    throw new Error('useRefreshContext must be used within a RefreshProvider');
  }
  return context;
};

interface RefreshProviderProps {
  children: ReactNode;
}

export const RefreshProvider: React.FC<RefreshProviderProps> = ({ children }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshFunctionsRef = useRef<Map<string, () => void | Promise<void>>>(new Map());
  const { refreshCounts } = useNotificationCounts();

  const registerRefreshFunction = useCallback((key: string, refreshFn: () => void | Promise<void>) => {
    refreshFunctionsRef.current.set(key, refreshFn);
  }, []);

  const unregisterRefreshFunction = useCallback((key: string) => {
    refreshFunctionsRef.current.delete(key);
  }, []);

  const refreshAll = useCallback(async () => {
    if (isRefreshing) return; // 既に更新中の場合は何もしない
    
    setIsRefreshing(true);
    try {
      // 通知カウントを更新
      refreshCounts();
      
      // 全ての登録された更新関数を並列実行
      const refreshPromises = Array.from(refreshFunctionsRef.current.values()).map(fn => 
        Promise.resolve(fn()).catch(error => {
          console.error('Refresh function failed:', error);
        })
      );
      
      await Promise.all(refreshPromises);
    } catch (error) {
      console.error('Failed to refresh all data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshCounts, isRefreshing]);

  return (
    <RefreshContext.Provider value={{
      registerRefreshFunction,
      unregisterRefreshFunction,
      refreshAll,
      isRefreshing,
    }}>
      {children}
    </RefreshContext.Provider>
  );
};

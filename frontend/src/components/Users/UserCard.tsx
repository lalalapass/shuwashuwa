import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { friendRequestsFirestoreApi, blocksFirestoreApi } from '../../services/firestore';
import { useAuth } from '../../context/AuthContext';
import type { User } from '../../types/api';

interface UserCardProps {
  user: User;
  currentUserId: string;
}

const UserCard: React.FC<UserCardProps> = ({ user, currentUserId }) => {
  const [isRequestSent, setIsRequestSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [checkingRequest, setCheckingRequest] = useState(true);
  const { user: currentUser } = useAuth();
  const checkedKeyRef = useRef<string | null>(null); // チェック済みのキー（無限ループ防止）

  // 送信済みリクエストをチェック（無限ループを避けるため、依存配列はcurrentUser.uidとuser.idのみ）
  useEffect(() => {
    // チェック用のキーを生成（currentUser.uidとuser.idの組み合わせ）
    const checkKey = currentUser?.uid && user.id ? `${currentUser.uid}-${user.id}` : null;
    
    // 同じキーで既にチェック済みの場合は再実行しない（無限ループ防止）
    if (checkKey && checkedKeyRef.current === checkKey) {
      return;
    }

    const checkExistingRequest = async () => {
      if (!currentUser || !user.id || user.id === currentUser.uid) {
        setCheckingRequest(false);
        if (checkKey) {
          checkedKeyRef.current = checkKey;
        }
        return;
      }

      // チェック開始をマーク（同じキーでの重複実行を防止）
      if (checkKey) {
        checkedKeyRef.current = checkKey;
      }

      try {
        const result = await friendRequestsFirestoreApi.checkRequestExists(currentUser.uid, user.id);
        // リクエストが存在し、かつstatusが'pending'または'accepted'の場合は送信済みとみなす
        if (result.exists && result.request && (result.request.status === 'pending' || result.request.status === 'accepted')) {
          setIsRequestSent(true);
        }
      } catch (error) {
        console.error('Failed to check existing request:', error);
      } finally {
        setCheckingRequest(false);
      }
    };

    checkExistingRequest();
  }, [currentUser?.uid, user.id]); // 依存配列を最小限にすることで無限ループを防止

  const handleSendRequest = async () => {
    if (isSending || isRequestSent) return;
    
    if (!currentUser) {
      alert('ログインが必要です');
      return;
    }
    
    // ブロックチェック
    try {
      const blockCheck = await blocksFirestoreApi.isUserBlocked(currentUser.uid, user.id);
      if (blockCheck.isBlocked) {
        alert('このユーザーをブロックしているか、ブロックされているため、リクエストを送信できません');
        return;
      }
    } catch (error) {
      console.error('Failed to check block status:', error);
    }
    
    setIsSending(true);

    try {
      // 念のため再度重複チェック
      const existingCheck = await friendRequestsFirestoreApi.checkRequestExists(currentUser.uid, user.id);
      if (existingCheck.exists && existingCheck.request && (existingCheck.request.status === 'pending' || existingCheck.request.status === 'accepted')) {
        setIsRequestSent(true);
        setShowMessageForm(false);
        setMessage('');
        alert('このユーザーにはすでにリクエストが送信されています');
        setIsSending(false);
        return;
      }

      await friendRequestsFirestoreApi.sendRequest({
        senderId: currentUser.uid,
        receiverId: user.id,
        message: message.trim() || undefined,
      });
      setIsRequestSent(true);
      setShowMessageForm(false);
      setMessage('');
    } catch (error: any) {
      console.error('Failed to send friend request:', error);
      const errorMessage = error?.message || 'リクエストの送信に失敗しました';
      if (errorMessage.includes('すでにリクエストが送信されています') || errorMessage.includes('ブロック')) {
        setIsRequestSent(true);
        setShowMessageForm(false);
        setMessage('');
      }
      alert(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  const getSignLanguageLevelText = (level: string) => {
    switch (level) {
      case 'BEGINNER': return '初級';
      case 'INTERMEDIATE': return '中級';
      case 'ADVANCED': return '上級';
      default: return level;
    }
  };

  const getFirstLanguageText = (language: string) => {
    switch (language) {
      case 'SPOKEN': return '音声言語';
      case 'SIGN': return '手話';
      default: return language;
    }
  };

  const getGenderText = (gender?: string) => {
    if (!gender) return '';
    switch (gender) {
      case 'MALE': return '男性';
      case 'FEMALE': return '女性';
      case 'OTHER': return 'その他';
      case 'UNSPECIFIED': return '未回答';
      default: return gender;
    }
  };

  const getAgeGroupText = (ageGroup?: string) => {
    if (!ageGroup) return '';
    switch (ageGroup) {
      case 'TEENS': return '10代';
      case 'TWENTIES': return '20代';
      case 'THIRTIES': return '30代';
      case 'FORTIES': return '40代';
      case 'FIFTIES': return '50代';
      case 'SIXTIES_PLUS': return '60代以上';
      default: return ageGroup;
    }
  };

  if (user.uid === currentUserId) {
    return null; // Don't show current user
  }

  return (
    <div className="user-card">
      <div className="user-header">
        <div className="user-info">
          <h3>
            <Link to={`/users/${user.id}`} className="username-link">
              {user.username}
            </Link>
          </h3>
          <div className="user-details">
            <span className="badge">
              手話レベル: {getSignLanguageLevelText(user.signLanguageLevel)}
            </span>
            <span className="badge">
              第一言語: {getFirstLanguageText(user.firstLanguage)}
            </span>
            {user.gender && (
              <span className="badge">
                {getGenderText(user.gender)}
              </span>
            )}
            {user.ageGroup && (
              <span className="badge">
                {getAgeGroupText(user.ageGroup)}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {user.profileText && (
        <div className="user-profile">
          <p>{user.profileText}</p>
        </div>
      )}

      <div className="user-actions">
        {checkingRequest ? (
          <div className="checking-request">確認中...</div>
        ) : isRequestSent ? (
          <div className="request-sent-disabled">
            会話リクエスト送信済み
          </div>
        ) : showMessageForm ? (
          <div className="message-form">
            <textarea
              placeholder="メッセージを入力（任意）"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
            />
            <div className="form-actions">
              <button
                onClick={handleSendRequest}
                disabled={isSending}
                className="send-button"
              >
                {isSending ? '送信中...' : 'リクエスト送信'}
              </button>
              <button
                onClick={() => setShowMessageForm(false)}
                className="cancel-button"
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowMessageForm(true)}
            className="request-button"
          >
            会話リクエストを送る
          </button>
        )}
      </div>
    </div>
  );
};

export default UserCard;

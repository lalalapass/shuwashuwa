import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { WebRTCService } from '../../services/webrtc';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { VideoCallSession } from '../../types/api';

interface VideoCallInterfaceProps {
  chatRoomId: string;
  activeTab: 'chat' | 'schedule' | 'video';
  onCallEnd?: () => void;
}

const VideoCallInterface: React.FC<VideoCallInterfaceProps> = ({ chatRoomId, activeTab, onCallEnd }) => {
  const { user } = useAuth();
  const [session, setSession] = useState<VideoCallSession | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const webrtcServiceRef = useRef<WebRTCService | null>(null);
  const statusListenerRef = useRef<any>(null);
  const streamCheckTimeoutRef = useRef<number | null>(null);
  const isCleaningUpRef = useRef<boolean>(false);

  useEffect(() => {
    isCleaningUpRef.current = false;
    // ビデオ通話タブがアクティブな時のみリスナーを開始
    if (activeTab === 'video') {
      checkActiveSession();
    }
    return () => {
      cleanupAllListeners();
    };
  }, [chatRoomId, activeTab]);

  // すべてのリスナーとタイマーをクリーンアップする関数
  const cleanupAllListeners = () => {
    isCleaningUpRef.current = true;
    
    // ストリーム停止
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    // リモートストリーム停止
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      setRemoteStream(null);
    }
    
    // ステータスリスナー停止
    if (statusListenerRef.current) {
      statusListenerRef.current();
      statusListenerRef.current = null;
    }
    
    // ストリームチェックタイマー停止
    if (streamCheckTimeoutRef.current) {
      clearTimeout(streamCheckTimeoutRef.current);
      streamCheckTimeoutRef.current = null;
    }
    
    // WebRTCサービスクリーンアップ
    if (webrtcServiceRef.current) {
      webrtcServiceRef.current.cleanup();
      webrtcServiceRef.current = null;
    }
  };

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const checkActiveSession = async () => {
    // クリーンアップ中は何もしない
    if (isCleaningUpRef.current) return;
    
    // ビデオ通話タブがアクティブでない場合はリスナーを停止
    if (activeTab !== 'video') {
      if (statusListenerRef.current) {
        statusListenerRef.current();
        statusListenerRef.current = null;
      }
      return;
    }
    
    // Cloud Firestoreでアクティブセッションをチェック
    console.log('Checking active session for room:', chatRoomId);
    
    // 既存のリスナーをクリーンアップ
    if (statusListenerRef.current) {
      statusListenerRef.current();
      statusListenerRef.current = null;
    }
    
    // 通話状態を監視（ビデオタブがアクティブな時のみ）
    if (user?.uid && !isCleaningUpRef.current && activeTab === 'video') {
      // アクティブなルームを検索
      const roomsQuery = query(
        collection(db, 'rooms'),
        where('chatRoomId', '==', chatRoomId),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      
      console.log('Setting up rooms listener for chatRoomId:', chatRoomId);
      
      statusListenerRef.current = onSnapshot(roomsQuery, (snapshot) => {
        // クリーンアップ中は処理しない
        if (isCleaningUpRef.current) return;
        
        if (!snapshot.empty) {
          const roomDoc = snapshot.docs[0];
          const roomData = roomDoc.data();
          console.log('Room data received:', roomData);
          
          if (roomData.callerId !== user.uid) {
            // 他のユーザーが通話を開始した
            console.log('Call started by:', roomData.callerId);
            setSession({
              id: roomDoc.id,
              chatRoomId: chatRoomId,
              starterId: roomData.callerId,
              roomId: roomDoc.id,
              isActive: true,
              startedAt: roomData.createdAt?.toDate() || new Date(),
              endedAt: undefined,
            });
          } else {
            // 自分が通話を開始した場合
            console.log('Call started by current user');
          }
        } else {
          console.log('No active call detected');
          setSession(null);
        }
      }, (error) => {
        console.error('Error in status listener:', error);
        // エラー時もリスナーを停止
        if (statusListenerRef.current) {
          statusListenerRef.current();
          statusListenerRef.current = null;
        }
      });
    }
  };

  // リモートストリーム監視関数（改善版）
  const startRemoteStreamMonitoring = () => {
    // 既存のタイマーをクリア
    if (streamCheckTimeoutRef.current) {
      clearTimeout(streamCheckTimeoutRef.current);
      streamCheckTimeoutRef.current = null;
    }

    let streamCheckCount = 0;
    const maxStreamChecks = 30; // 30秒間試行
    
    const checkRemoteStream = () => {
      // クリーンアップ中は停止
      if (isCleaningUpRef.current) return;
      
      const remoteStream = webrtcServiceRef.current?.getRemoteStream();
      if (remoteStream && remoteStream.getTracks().length > 0) {
        setRemoteStream(remoteStream);
        console.log('✅ Remote stream set in UI with', remoteStream.getTracks().length, 'tracks');
        // 成功したらタイマーをクリア
        if (streamCheckTimeoutRef.current) {
          clearTimeout(streamCheckTimeoutRef.current);
          streamCheckTimeoutRef.current = null;
        }
      } else if (streamCheckCount < maxStreamChecks && !isCleaningUpRef.current) {
        streamCheckCount++;
        console.log(`Checking remote stream... (${streamCheckCount}/${maxStreamChecks})`);
        streamCheckTimeoutRef.current = setTimeout(checkRemoteStream, 1000);
      } else {
        console.log('❌ Remote stream not received after 30 seconds');
        streamCheckTimeoutRef.current = null;
      }
    };
    
    checkRemoteStream();
  };

  const startCall = async () => {
    setLoading(true);
    try {
      if (!user?.uid) {
        throw new Error('ユーザーが認証されていません');
      }

      // WebRTC サービス初期化
      webrtcServiceRef.current = new WebRTCService(user.uid, chatRoomId);
      
      // ルーム作成（通話開始）
      const session = await webrtcServiceRef.current.createRoom();
      setSession(session);
      setIsInCall(true);

      // ローカルストリーム取得
      const localStream = webrtcServiceRef.current.getLocalStream();
      if (localStream) {
        setLocalStream(localStream);
      }

      // リモートストリーム監視（改善版）
      startRemoteStreamMonitoring();
      
    } catch (error) {
      console.error('Failed to start call:', error);
      alert('通話の開始に失敗しました。カメラとマイクへのアクセスを許可してください。');
    } finally {
      setLoading(false);
    }
  };

  const joinCall = async () => {
    setLoading(true);
    try {
      if (!user?.uid || !session) {
        throw new Error('ユーザーが認証されていないか、セッションが見つかりません');
      }

      // WebRTC サービス初期化
      webrtcServiceRef.current = new WebRTCService(user.uid, chatRoomId);
      
      // ルーム参加
      await webrtcServiceRef.current.joinRoom(session.roomId);
      setIsInCall(true);

      // ローカルストリーム取得
      const localStream = webrtcServiceRef.current.getLocalStream();
      if (localStream) {
        setLocalStream(localStream);
      }

      // リモートストリーム監視（改善版）
      startRemoteStreamMonitoring();
      
    } catch (error) {
      console.error('Failed to join call:', error);
      alert('通話の参加に失敗しました。カメラとマイクへのアクセスを許可してください。');
    } finally {
      setLoading(false);
    }
  };

  const endCall = async () => {
    if (!session || !webrtcServiceRef.current) return;

    try {
      // クリーンアップ開始
      isCleaningUpRef.current = true;
      
      // WebRTC サービスで通話終了
      await webrtcServiceRef.current.endCall();
      
      // すべてのリスナーとタイマーをクリーンアップ
      cleanupAllListeners();
      
      // 状態リセット
      setSession(null);
      setIsInCall(false);
      
      onCallEnd?.();
    } catch (error) {
      console.error('Failed to end call:', error);
      alert('通話の終了に失敗しました。');
    } finally {
      // クリーンアップ完了
      isCleaningUpRef.current = false;
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
      }
    }
  };

  const isVideoEnabled = localStream?.getVideoTracks()[0]?.enabled ?? false;
  const isAudioEnabled = localStream?.getAudioTracks()[0]?.enabled ?? false;

  if (!isInCall) {
    // 通話が開始されているかチェック
    const hasActiveCall = session && session.starterId !== user?.uid;
    
    // デバッグ用ログ（一時的）
    console.log('VideoCall Debug:', {
      session,
      hasActiveCall,
      userId: user?.uid,
      starterId: session?.starterId
    });
    
    return (
      <div className="video-call-start">
        <div className="call-info">
          <h3>📹 ビデオ通話</h3>
          {hasActiveCall ? (
            <p>相手が通話を開始しました。参加しますか？</p>
          ) : (
            <p>相手とビデオ通話を開始できます。</p>
          )}
          <p className="call-note">
            ⚠️ 通話を開始する前に、カメラとマイクへのアクセスを許可してください。
          </p>
          {/* デバッグ情報（一時的） */}
          <div style={{fontSize: '12px', color: '#666', marginTop: '10px'}}>
            Debug: hasActiveCall={hasActiveCall ? 'true' : 'false'}, 
            session={session ? 'exists' : 'null'}, 
            userId={user?.uid || 'null'}
          </div>
        </div>
        <div className="call-buttons">
          {!hasActiveCall && (
            <button
              onClick={startCall}
              disabled={loading}
              className="start-call-button"
            >
              {loading ? '準備中...' : '📹 通話を開始'}
            </button>
          )}
          {hasActiveCall && (
            <button
              onClick={joinCall}
              disabled={loading}
              className="join-call-button"
            >
              {loading ? '参加中...' : '📞 通話に参加'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="video-call-interface">
      <div className="video-call-header">
        <h3>📹 ビデオ通話中</h3>
        <div className="call-info">
          <span className="call-status">🔴 通話中</span>
          <span className="call-duration">
            開始時刻: {session ? new Date(session.startedAt).toLocaleTimeString('ja-JP') : ''}
          </span>
        </div>
      </div>

      <div className="video-container">
        <div className="local-video-container">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="local-video"
          />
          <div className="video-label">あなた</div>
        </div>

        <div className="remote-video-container">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="remote-video"
            />
          ) : (
            <div className="waiting-for-peer">
              <div className="waiting-message">
                <p>相手の参加を待っています...</p>
                <div className="loading-spinner"></div>
                <div style={{fontSize: '12px', color: '#666', marginTop: '10px'}}>
                  Debug: {webrtcServiceRef.current ? 'WebRTC service active' : 'No WebRTC service'}
                </div>
              </div>
            </div>
          )}
          <div className="video-label">相手</div>
        </div>
      </div>

      <div className="call-controls">
        <button
          onClick={toggleVideo}
          className={`control-button ${isVideoEnabled ? 'active' : 'inactive'}`}
          title={isVideoEnabled ? 'カメラをオフ' : 'カメラをオン'}
        >
          {isVideoEnabled ? '📹' : '📹❌'}
        </button>

        <button
          onClick={toggleAudio}
          className={`control-button ${isAudioEnabled ? 'active' : 'inactive'}`}
          title={isAudioEnabled ? 'マイクをオフ' : 'マイクをオン'}
        >
          {isAudioEnabled ? '🎤' : '🎤❌'}
        </button>

        <button
          onClick={endCall}
          className="end-call-button"
          title="通話を終了"
        >
          📞❌ 通話終了
        </button>
      </div>

      <div className="call-note">
        <p>
          💡 <strong>注意:</strong> これは基本的なビデオ通話インターフェースです。
          実際の通話機能を使用するには、WebRTCサーバーの設定が必要です。
        </p>
      </div>
    </div>
  );
};

export default VideoCallInterface;

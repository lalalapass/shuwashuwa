import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { WebRTCService } from '../../services/webrtc';
import { ref, onValue } from 'firebase/database';
import type { VideoCallSession } from '../../types/api';

interface VideoCallInterfaceProps {
  chatRoomId: string;
  onCallEnd?: () => void;
}

const VideoCallInterface: React.FC<VideoCallInterfaceProps> = ({ chatRoomId, onCallEnd }) => {
  const { user } = useAuth();
  const [session, setSession] = useState<VideoCallSession | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const webrtcServiceRef = useRef<WebRTCService | null>(null);

  useEffect(() => {
    checkActiveSession();
    return () => {
      // Cleanup streams when component unmounts
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [chatRoomId]);

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
    // Firebase Realtime Databaseでアクティブセッションをチェック
    console.log('Checking active session for room:', chatRoomId);
    
    // 通話状態を監視
    if (user?.uid) {
      const webrtcService = new WebRTCService(user.uid, chatRoomId);
      const callId = `call_${chatRoomId}`;
      
      // 通話開始の監視
      const statusRef = ref(webrtcService['db'], `calls/${callId}/status`);
      onValue(statusRef, (snapshot) => {
        const data = snapshot.val();
        if (data && data.started && data.starterId !== user.uid) {
          // 他のユーザーが通話を開始した
          console.log('Call started by:', data.starterId);
          // 通話参加ボタンを表示する状態に変更
          setSession({
            id: callId,
            chatRoomId: chatRoomId,
            starterId: data.starterId,
            roomId: callId,
            isActive: true,
            startedAt: new Date(),
            endedAt: undefined,
          });
        }
      });
    }
  };

  const startCall = async () => {
    setLoading(true);
    try {
      if (!user?.uid) {
        throw new Error('ユーザーが認証されていません');
      }

      // WebRTC サービス初期化
      webrtcServiceRef.current = new WebRTCService(user.uid, chatRoomId);
      
      // 通話開始
      const session = await webrtcServiceRef.current.startCall();
      setSession(session);
      setIsInCall(true);

      // ローカルストリーム取得
      const localStream = webrtcServiceRef.current.getLocalStream();
      if (localStream) {
        setLocalStream(localStream);
      }

      // オファー送信
      await webrtcServiceRef.current.sendOffer();

      // リモートストリーム監視（改善版）
      const checkRemoteStream = () => {
        const remoteStream = webrtcServiceRef.current?.getRemoteStream();
        if (remoteStream) {
          setRemoteStream(remoteStream);
          console.log('Remote stream set in UI');
        } else {
          setTimeout(checkRemoteStream, 500);
        }
      };
      checkRemoteStream();
      
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
      if (!user?.uid) {
        throw new Error('ユーザーが認証されていません');
      }

      // WebRTC サービス初期化
      webrtcServiceRef.current = new WebRTCService(user.uid, chatRoomId);
      
      // 通話参加
      await webrtcServiceRef.current.joinCall();
      setIsInCall(true);

      // ローカルストリーム取得
      const localStream = webrtcServiceRef.current.getLocalStream();
      if (localStream) {
        setLocalStream(localStream);
      }

      // リモートストリーム監視（改善版）
      const checkRemoteStream = () => {
        const remoteStream = webrtcServiceRef.current?.getRemoteStream();
        if (remoteStream) {
          setRemoteStream(remoteStream);
          console.log('Remote stream set in UI');
        } else {
          setTimeout(checkRemoteStream, 500);
        }
      };
      checkRemoteStream();
      
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
      // WebRTC サービスで通話終了
      await webrtcServiceRef.current.endCall();
      
      // ローカルストリーム停止
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      
      // 状態リセット
      setSession(null);
      setIsInCall(false);
      setRemoteStream(null);
      
      // サービスクリーンアップ
      webrtcServiceRef.current.cleanup();
      webrtcServiceRef.current = null;
      
      onCallEnd?.();
    } catch (error) {
      console.error('Failed to end call:', error);
      alert('通話の終了に失敗しました。');
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

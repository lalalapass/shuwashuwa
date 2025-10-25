import React, { useState, useEffect, useRef } from 'react';
import { videoCallApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { VideoCallSession } from '../../types/api';

interface VideoCallInterfaceProps {
  chatRoomId: number;
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
    try {
      const response = await videoCallApi.getActiveSession(chatRoomId);
      if (response.session) {
        setSession(response.session);
        setIsInCall(true);
      }
    } catch (error) {
      console.error('Failed to check active session:', error);
    }
  };

  const startCall = async () => {
    setLoading(true);
    try {
      // Get user media first
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);

      // Start session
      const response = await videoCallApi.startSession(chatRoomId);
      setSession(response.session);
      setIsInCall(true);

      // In a real implementation, you would set up WebRTC peer connection here
      // For now, we'll simulate a simple video call interface
      
    } catch (error) {
      console.error('Failed to start call:', error);
      alert('通話の開始に失敗しました。カメラとマイクへのアクセスを許可してください。');
    } finally {
      setLoading(false);
    }
  };

  const endCall = async () => {
    if (!session) return;

    try {
      await videoCallApi.endSession(session.id);
      
      // Stop local stream
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      
      setSession(null);
      setIsInCall(false);
      setRemoteStream(null);
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
    return (
      <div className="video-call-start">
        <div className="call-info">
          <h3>📹 ビデオ通話</h3>
          <p>相手とビデオ通話を開始できます。</p>
          <p className="call-note">
            ⚠️ 通話を開始する前に、カメラとマイクへのアクセスを許可してください。
          </p>
        </div>
        <button
          onClick={startCall}
          disabled={loading}
          className="start-call-button"
        >
          {loading ? '準備中...' : '📹 通話を開始'}
        </button>
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

import { 
  ref, 
  set, 
  get, 
  remove, 
  onValue, 
  off,
  push,
  serverTimestamp 
} from 'firebase/database';
import { getDatabase } from 'firebase/database';
import type { VideoCallSession, VideoCallSchedule } from '../types/api';

// WebRTC ビデオ通話サービス
export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private callId: string | null = null;
  private userId: string;
  private chatRoomId: string;
  private signalingRef: any = null;

  private db: any;

  constructor(userId: string, chatRoomId: string) {
    this.userId = userId;
    this.chatRoomId = chatRoomId;
    this.db = getDatabase();
  }

  // 通話開始
  async startCall(): Promise<VideoCallSession> {
    try {
      // メディアストリーム取得
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // 通話ID生成
      this.callId = `call_${Date.now()}_${this.userId}`;
      
      // セッション作成
      const sessionData = {
        chatRoomId: this.chatRoomId,
        starterId: this.userId,
        roomId: this.callId,
        isActive: true,
        startedAt: serverTimestamp(),
        endedAt: null,
      };

      // Firebase Realtime Database にセッション保存
      const sessionRef = push(ref(this.db, 'videoCallSessions'));
      await set(sessionRef, sessionData);

      // シグナリング用のRealtime Database参照
      this.signalingRef = ref(this.db, `calls/${this.callId}/signaling`);
      
      // WebRTC ピアコネクション設定
      await this.setupPeerConnection();

      return {
        id: sessionRef.key!,
        chatRoomId: this.chatRoomId,
        starterId: this.userId,
        roomId: this.callId,
        isActive: true,
        startedAt: new Date(),
        endedAt: undefined,
      };
    } catch (error) {
      console.error('Failed to start call:', error);
      throw error;
    }
  }

  // 通話終了
  async endCall(): Promise<void> {
    try {
      // ローカルストリーム停止
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      // ピアコネクション終了
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      // シグナリングデータ削除
      if (this.signalingRef) {
        await remove(this.signalingRef);
        this.signalingRef = null;
      }

      // セッション更新
      if (this.callId) {
        const sessionRef = ref(this.db, `videoCallSessions/${this.callId}`);
        await set(sessionRef, {
          isActive: false,
          endedAt: serverTimestamp(),
        });
      }

      this.callId = null;
    } catch (error) {
      console.error('Failed to end call:', error);
      throw error;
    }
  }

  // ピアコネクション設定
  private async setupPeerConnection(): Promise<void> {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    // ローカルストリームをピアコネクションに追加
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });
    }

    // リモートストリーム処理
    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
    };

    // ICE候補処理
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.signalingRef) {
        set(ref(this.db, `${this.signalingRef.path}/iceCandidates/${this.userId}`), {
          candidate: event.candidate,
          timestamp: serverTimestamp(),
        });
      }
    };

    // シグナリングデータ監視
    if (this.signalingRef) {
      onValue(this.signalingRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          this.handleSignalingData(data);
        }
      });
    }
  }

  // シグナリングデータ処理
  private async handleSignalingData(data: any): Promise<void> {
    if (!this.peerConnection) return;

    try {
      // オファー処理
      if (data.offer && data.offer.from !== this.userId) {
        await this.peerConnection.setRemoteDescription(data.offer);
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        
        await set(ref(this.db, `${this.signalingRef.path}/answer`), {
          answer: answer,
          from: this.userId,
          timestamp: serverTimestamp(),
        });
      }

      // アンサー処理
      if (data.answer && data.answer.from !== this.userId) {
        await this.peerConnection.setRemoteDescription(data.answer);
      }

      // ICE候補処理
      if (data.iceCandidates) {
        for (const [userId, candidateData] of Object.entries(data.iceCandidates)) {
          if (userId !== this.userId && candidateData) {
            await this.peerConnection.addIceCandidate((candidateData as any).candidate);
          }
        }
      }
    } catch (error) {
      console.error('Failed to handle signaling data:', error);
    }
  }

  // オファー送信
  async sendOffer(): Promise<void> {
    if (!this.peerConnection) return;

    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      if (this.signalingRef) {
        await set(ref(this.db, `${this.signalingRef.path}/offer`), {
          offer: offer,
          from: this.userId,
          timestamp: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Failed to send offer:', error);
    }
  }

  // ローカルストリーム取得
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  // リモートストリーム取得
  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  // 通話状態取得
  isInCall(): boolean {
    return this.callId !== null && this.peerConnection !== null;
  }

  // クリーンアップ
  cleanup(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    if (this.signalingRef) {
      off(this.signalingRef);
    }
  }
}

// ビデオ通話スケジュール管理
export const videoCallScheduleApi = {
  // スケジュール作成
  createSchedule: async (data: {
    chatRoomId: string;
    proposerId: string;
    title: string;
    description?: string;
    proposedAt: string;
  }): Promise<{ schedule: VideoCallSchedule }> => {
    const db = getDatabase();
    const scheduleData = {
      chatRoomId: data.chatRoomId,
      proposerId: data.proposerId,
      title: data.title,
      description: data.description || '',
      proposedAt: data.proposedAt,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const scheduleRef = push(ref(db, 'videoCallSchedules'));
    await set(scheduleRef, scheduleData);

    const schedule: VideoCallSchedule = {
      id: scheduleRef.key!,
      chatRoomId: data.chatRoomId,
      proposerId: data.proposerId,
      proposerUsername: 'Unknown User', // 後で取得
      title: data.title,
      description: data.description || '',
      proposedAt: data.proposedAt,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return { schedule };
  },

  // スケジュール一覧取得
  getSchedules: async (chatRoomId: string): Promise<{ schedules: VideoCallSchedule[] }> => {
    const db = getDatabase();
    const schedulesRef = ref(db, 'videoCallSchedules');
    const snapshot = await get(schedulesRef);
    
    const schedules: VideoCallSchedule[] = [];
    if (snapshot.exists()) {
      const data = snapshot.val();
      for (const [id, schedule] of Object.entries(data)) {
        if ((schedule as any).chatRoomId === chatRoomId) {
          schedules.push({
            id,
            chatRoomId: (schedule as any).chatRoomId,
            proposerId: (schedule as any).proposerId,
            proposerUsername: 'Unknown User', // 後で取得
            title: (schedule as any).title,
            description: (schedule as any).description,
            proposedAt: (schedule as any).proposedAt,
            status: (schedule as any).status,
            createdAt: (schedule as any).createdAt?.toDate() || new Date(),
            updatedAt: (schedule as any).updatedAt?.toDate() || new Date(),
          });
        }
      }
    }

    return { schedules };
  },

  // スケジュール回答
  respondToSchedule: async (scheduleId: string, action: 'accept' | 'reject'): Promise<void> => {
    const db = getDatabase();
    const scheduleRef = ref(db, `videoCallSchedules/${scheduleId}`);
    await set(scheduleRef, {
      status: action === 'accept' ? 'accepted' : 'rejected',
      updatedAt: serverTimestamp(),
    });
  },
};

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
import { realtimeDb } from '../firebase/config';
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
  private processedOffers: Set<string> = new Set();
  private processedAnswers: Set<string> = new Set();
  private lastProcessedOfferSdp: string | null = null;
  private lastProcessedAnswerSdp: string | null = null;

  constructor(userId: string, chatRoomId: string) {
    this.userId = userId;
    this.chatRoomId = chatRoomId;
  }

  // 通話開始
  async startCall(): Promise<VideoCallSession> {
    try {
      // メディアストリーム取得
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // 通話ID生成（チャットルームベース）
      this.callId = `call_${this.chatRoomId}`;
      
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
      const sessionRef = push(ref(realtimeDb, 'videoCallSessions'));
      await set(sessionRef, sessionData);

      // シグナリング用のRealtime Database参照
      this.signalingRef = ref(realtimeDb, `calls/${this.callId}/signaling`);
      
      // WebRTC ピアコネクション設定
      await this.setupPeerConnection();

      // 通話開始を通知
      await set(ref(realtimeDb, `calls/${this.callId}/status`), {
        started: true,
        starterId: this.userId,
        timestamp: serverTimestamp(),
      });

      // シグナリング監視を開始
      this.startSignalingListener();

      // オファー送信
      await this.sendOffer();

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

  // 通話参加
  async joinCall(): Promise<void> {
    try {
      // メディアストリーム取得
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // 通話ID設定（チャットルームベース）
      this.callId = `call_${this.chatRoomId}`;

      // シグナリング用のRealtime Database参照
      this.signalingRef = ref(realtimeDb, `calls/${this.callId}/signaling`);
      
      // WebRTC ピアコネクション設定
      await this.setupPeerConnection();

      // 参加を通知
      await set(ref(realtimeDb, `calls/${this.callId}/participants/${this.userId}`), {
        joined: true,
        timestamp: serverTimestamp(),
      });

      // シグナリング監視を開始
      this.startSignalingListener();

      console.log('Joined call successfully');

    } catch (error) {
      console.error('Failed to join call:', error);
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
        const sessionRef = ref(realtimeDb, `videoCallSessions/${this.callId}`);
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
      console.log('Remote stream received:', event.streams[0]);
      console.log('Remote stream tracks:', event.streams[0].getTracks());
      this.remoteStream = event.streams[0];
    };

    // 接続状態の監視
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log('Connection state changed:', state);
      
      if (state === 'connected') {
        console.log('✅ WebRTC connection established!');
        // 接続確立時にリモートストリームを確認
        this.checkRemoteStream();
      } else if (state === 'failed' || state === 'disconnected') {
        console.log('❌ WebRTC connection failed or disconnected');
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      console.log('ICE connection state changed:', state);
      
      if (state === 'connected' || state === 'completed') {
        console.log('✅ ICE connection established!');
        this.checkRemoteStream();
      } else if (state === 'failed') {
        console.log('❌ ICE connection failed');
      }
    };

    this.peerConnection.onicegatheringstatechange = () => {
      console.log('ICE gathering state changed:', this.peerConnection?.iceGatheringState);
    };

    this.peerConnection.onsignalingstatechange = () => {
      console.log('Signaling state changed:', this.peerConnection?.signalingState);
    };

    // ICE候補処理
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.signalingRef) {
        console.log('Sending ICE candidate:', event.candidate.type);
        const iceCandidatePath = `calls/${this.callId}/signaling/iceCandidates/${this.userId}`;
        set(ref(realtimeDb, iceCandidatePath), {
          candidate: event.candidate,
          timestamp: serverTimestamp(),
        });
      } else if (event.candidate === null) {
        console.log('✅ ICE gathering completed');
        // ICE gathering完了時にリモートストリームを確認
        setTimeout(() => this.checkRemoteStream(), 1000);
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

  // シグナリング監視開始
  private startSignalingListener(): void {
    if (!this.signalingRef) return;

    console.log('Starting signaling listener for:', this.callId);
    
    // シグナリングデータの監視
    onValue(this.signalingRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        this.handleSignalingData(data);
      }
    });
  }

  // シグナリングデータ処理（簡素化版）
  private async handleSignalingData(data: any): Promise<void> {
    if (!this.peerConnection) {
      console.log('No peer connection available for signaling data');
      return;
    }

    try {
      console.log('Handling signaling data:', data);
      console.log('Current signaling state:', this.peerConnection.signalingState);
      console.log('Current connection state:', this.peerConnection.connectionState);

      // オファー処理（参加側）
      if (data.offer && data.offer.from !== this.userId) {
        console.log('Processing offer from:', data.offer.from);
        
        // 重複チェック
        const offerSdp = data.offer.offer.sdp;
        if (this.lastProcessedOfferSdp === offerSdp) {
          console.log('Ignoring duplicate offer');
          return;
        }
        
        // 状態チェック
        if (this.peerConnection.signalingState !== 'stable') {
          console.log('Ignoring offer - not in stable state:', this.peerConnection.signalingState);
          return;
        }
        
        try {
          await this.peerConnection.setRemoteDescription(data.offer.offer);
          console.log('Remote description set successfully');
          
          const answer = await this.peerConnection.createAnswer();
          await this.peerConnection.setLocalDescription(answer);
          console.log('Answer created and set locally');
          
          // アンサーを送信
          const answerPath = `calls/${this.callId}/signaling/answer`;
          await set(ref(realtimeDb, answerPath), {
            answer: answer,
            from: this.userId,
            timestamp: serverTimestamp(),
          });
          console.log('Answer sent to database');
          
          this.lastProcessedOfferSdp = offerSdp;
        } catch (error) {
          console.error('Error processing offer:', error);
        }
      }

      // アンサー処理（開始側）
      if (data.answer && data.answer.from !== this.userId) {
        console.log('Processing answer from:', data.answer.from);
        
        // 重複チェック
        const answerSdp = data.answer.answer.sdp;
        if (this.lastProcessedAnswerSdp === answerSdp) {
          console.log('Ignoring duplicate answer');
          return;
        }
        
        // 状態チェック
        if (this.peerConnection.signalingState !== 'have-local-offer') {
          console.log('Ignoring answer - not in have-local-offer state:', this.peerConnection.signalingState);
          return;
        }
        
        try {
          await this.peerConnection.setRemoteDescription(data.answer.answer);
          console.log('Answer processed successfully');
          
          this.lastProcessedAnswerSdp = answerSdp;
        } catch (error) {
          console.error('Error processing answer:', error);
        }
      }

      // ICE候補処理
      if (data.iceCandidates) {
        for (const [userId, candidateData] of Object.entries(data.iceCandidates)) {
          if (userId !== this.userId && candidateData && (candidateData as any).candidate) {
            try {
              await this.peerConnection.addIceCandidate((candidateData as any).candidate);
              console.log('ICE candidate added from:', userId);
            } catch (error) {
              console.error('Error adding ICE candidate:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to handle signaling data:', error);
    }
  }

  // オファー送信
  async sendOffer(): Promise<void> {
    if (!this.peerConnection) {
      console.log('No peer connection available for sending offer');
      return;
    }

    try {
      console.log('Creating offer...');
      const offer = await this.peerConnection.createOffer();
      console.log('Offer created:', offer);
      
      console.log('Setting local description...');
      await this.peerConnection.setLocalDescription(offer);
      console.log('Local description set successfully');
      
      if (this.signalingRef) {
        const offerPath = `calls/${this.callId}/signaling/offer`;
        console.log('Sending offer to database:', offerPath);
        await set(ref(realtimeDb, offerPath), {
          offer: offer,
          from: this.userId,
          timestamp: serverTimestamp(),
        });
        console.log('Offer sent to database successfully');
      } else {
        console.error('No signaling reference available');
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

  // リモートストリームの確認
  private checkRemoteStream(): void {
    if (this.peerConnection && this.peerConnection.getReceivers) {
      const receivers = this.peerConnection.getReceivers();
      console.log('Checking receivers:', receivers.length);
      
      for (const receiver of receivers) {
        if (receiver.track && receiver.track.kind === 'video') {
          console.log('Found video track in receiver');
          // 新しいストリームを作成
          const stream = new MediaStream([receiver.track]);
          this.remoteStream = stream;
          console.log('Remote stream updated from receiver');
        }
      }
    }
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

    const scheduleRef = push(ref(realtimeDb, 'videoCallSchedules'));
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
    const schedulesRef = ref(realtimeDb, 'videoCallSchedules');
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
    const scheduleRef = ref(realtimeDb, `videoCallSchedules/${scheduleId}`);
    await set(scheduleRef, {
      status: action === 'accept' ? 'accepted' : 'rejected',
      updatedAt: serverTimestamp(),
    });
  },
};

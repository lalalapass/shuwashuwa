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
      console.log('Connection state changed:', this.peerConnection?.connectionState);
      if (this.peerConnection?.connectionState === 'connected') {
        console.log('WebRTC connection established!');
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state changed:', this.peerConnection?.iceConnectionState);
      if (this.peerConnection?.iceConnectionState === 'connected') {
        console.log('ICE connection established!');
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
        console.log('Sending ICE candidate:', event.candidate);
        const iceCandidatePath = `calls/${this.callId}/signaling/iceCandidates/${this.userId}`;
        set(ref(realtimeDb, iceCandidatePath), {
          candidate: event.candidate,
          timestamp: serverTimestamp(),
        });
      } else if (event.candidate === null) {
        console.log('ICE gathering completed');
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

  // シグナリングデータ処理
  private async handleSignalingData(data: any): Promise<void> {
    if (!this.peerConnection) {
      console.log('No peer connection available for signaling data');
      return;
    }

    try {
      console.log('Handling signaling data:', data);
      console.log('Current peer connection state:', this.peerConnection.connectionState);
      console.log('Current ICE connection state:', this.peerConnection.iceConnectionState);

      // オファー処理
      console.log('Checking offer processing:', {
        hasOffer: !!data.offer,
        offerFrom: data.offer?.from,
        currentUserId: this.userId,
        shouldProcess: data.offer && data.offer.from !== this.userId
      });
      
      if (data.offer) {
        // 自分自身のオファーの場合は無視（開始側）
        if (data.offer.from === this.userId) {
          console.log('Ignoring own offer from:', data.offer.from);
          return;
        }
        
        console.log('Processing offer from:', data.offer.from);
        console.log('Offer data:', data.offer.offer);
        
        try {
          await this.peerConnection.setRemoteDescription(data.offer.offer);
          console.log('Remote description set successfully');
          
          const answer = await this.peerConnection.createAnswer();
          console.log('Answer created:', answer);
          
          await this.peerConnection.setLocalDescription(answer);
          console.log('Local description set successfully');
          
          const answerPath = `calls/${this.callId}/signaling/answer`;
          await set(ref(realtimeDb, answerPath), {
            answer: answer,
            from: this.userId,
            timestamp: serverTimestamp(),
          });
          console.log('Answer sent to database');
        } catch (offerError) {
          console.error('Error processing offer:', offerError);
        }
      }

      // アンサー処理
      console.log('Checking answer processing:', {
        hasAnswer: !!data.answer,
        answerFrom: data.answer?.from,
        currentUserId: this.userId,
        shouldProcess: data.answer && data.answer.from !== this.userId
      });
      
      if (data.answer) {
        // 自分自身のアンサーの場合は無視（参加側）
        if (data.answer.from === this.userId) {
          console.log('Ignoring own answer from:', data.answer.from);
          return;
        }
        
        console.log('Processing answer from:', data.answer.from);
        console.log('Answer data:', data.answer.answer);
        
        try {
          await this.peerConnection.setRemoteDescription(data.answer.answer);
          console.log('Answer processed successfully');
        } catch (answerError) {
          console.error('Error processing answer:', answerError);
        }
      }

      // ICE候補処理
      if (data.iceCandidates) {
        console.log('Processing ICE candidates:', data.iceCandidates);
        for (const [userId, candidateData] of Object.entries(data.iceCandidates)) {
          if (userId !== this.userId && candidateData && (candidateData as any).candidate) {
            console.log('Adding ICE candidate from:', userId, candidateData);
            try {
              await this.peerConnection.addIceCandidate((candidateData as any).candidate);
              console.log('ICE candidate added successfully');
            } catch (iceError) {
              console.error('Error adding ICE candidate:', iceError);
            }
          } else if (userId !== this.userId && candidateData && !(candidateData as any).candidate) {
            console.log('ICE candidate data missing candidate property:', candidateData);
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

import { 
  collection, 
  addDoc, 
  doc, 
  onSnapshot, 
  updateDoc, 
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { VideoCallSession, VideoCallSchedule } from '../types/api';

// WebRTC ビデオ通話サービス（FirebaseRTCパターン）
export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private roomId: string | null = null;
  private userId: string;
  private chatRoomId: string;
  private isCaller: boolean = false;
  private unsubscribe: (() => void) | null = null;

  constructor(userId: string, chatRoomId: string) {
    this.userId = userId;
    this.chatRoomId = chatRoomId;
  }

  // ルーム作成（通話開始）
  async createRoom(): Promise<VideoCallSession> {
    try {
      // メディアストリーム取得
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // WebRTC ピアコネクション設定
      await this.setupPeerConnection();

      // オファー作成
      const offer = await this.peerConnection!.createOffer();
      await this.peerConnection!.setLocalDescription(offer);

      // ルームデータ作成（FirebaseRTCパターン）
      const roomData = {
        offer: {
          type: offer.type,
          sdp: offer.sdp
        },
        chatRoomId: this.chatRoomId,
        callerId: this.userId,
        createdAt: new Date(),
        isActive: true
      };

      // Cloud Firestoreにルーム作成
      const roomRef = await addDoc(collection(db, 'rooms'), roomData);
      this.roomId = roomRef.id;
      this.isCaller = true;

      // ルーム監視開始
      this.startRoomListener();

      // ICE候補収集開始
      this.collectIceCandidates();

      console.log(`Room created: ${this.roomId} - You are the caller!`);

      return {
        id: this.roomId,
        chatRoomId: this.chatRoomId,
        starterId: this.userId,
        roomId: this.roomId,
        isActive: true,
        startedAt: new Date(),
        endedAt: undefined,
      };
    } catch (error) {
      console.error('Failed to create room:', error);
      throw error;
    }
  }

  // ルーム参加
  async joinRoom(roomId: string): Promise<void> {
    try {
      // メディアストリーム取得
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      this.roomId = roomId;
      this.isCaller = false;

      // WebRTC ピアコネクション設定
      await this.setupPeerConnection();

      // ルーム監視開始
      this.startRoomListener();

      // ICE候補収集開始
      this.collectIceCandidates();

      console.log(`Joined room: ${roomId} - You are the callee!`);
    } catch (error) {
      console.error('Failed to join room:', error);
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

      // ルーム削除
      if (this.roomId) {
        await deleteDoc(doc(db, 'rooms', this.roomId));
        this.roomId = null;
      }

      // 監視停止
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
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
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:stun.ekiga.net' },
        { urls: 'stun:stun.ideasip.com' },
        { urls: 'stun:stun.schlund.de' },
        { urls: 'stun:stun.stunprotocol.org:3478' },
        { urls: 'stun:stun.voiparound.com' },
        { urls: 'stun:stun.voipbuster.com' },
        { urls: 'stun:stun.voipstunt.com' },
        { urls: 'stun:stun.voxgratia.org' },
        { urls: 'stun:stun.xten.com' },
      ],
      iceCandidatePoolSize: 10,
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
      console.log('Is caller:', this.isCaller);
      
      const stream = event.streams[0];
      
      // ビデオトラックのミュート状態を解除
      stream.getTracks().forEach(track => {
        if (track.kind === 'video' && track.muted) {
          console.log('Unmuting video track:', track.id);
          track.enabled = true;
        }
      });
      
      this.remoteStream = stream;
    };

    // 接続状態の監視
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log('Connection state changed:', state);
      
      if (state === 'connected') {
        console.log('✅ WebRTC connection established!');
      } else if (state === 'connecting') {
        console.log('🔄 WebRTC connecting...');
      } else if (state === 'failed') {
        console.log('❌ WebRTC connection failed - attempting to restart ICE');
        // ICE接続を再開
        this.peerConnection?.restartIce();
        
        // 5秒後に接続状態を再チェック
        setTimeout(() => {
          if (this.peerConnection?.connectionState === 'failed') {
            console.log('🔄 Attempting to recreate peer connection...');
            this.recreatePeerConnection();
          }
        }, 5000);
      } else if (state === 'disconnected') {
        console.log('❌ WebRTC connection disconnected');
      }
    };
  }

  // ルーム監視開始（FirebaseRTCパターン）
  private startRoomListener(): void {
    if (!this.roomId) return;

    const roomRef = doc(db, 'rooms', this.roomId);
    
    this.unsubscribe = onSnapshot(roomRef, async (snapshot) => {
      if (!snapshot.exists()) return;
      
      const data = snapshot.data();
      console.log('Room updated:', data);

      if (!this.peerConnection) return;

      // オファー処理（参加側）
      if (data.offer && !this.isCaller && !this.peerConnection.currentRemoteDescription) {
        console.log('Processing offer from caller');
        try {
          const offer = new RTCSessionDescription(data.offer);
          await this.peerConnection.setRemoteDescription(offer);
          console.log('Remote description set for callee');
          
          const answer = await this.peerConnection.createAnswer();
          await this.peerConnection.setLocalDescription(answer);
          console.log('Answer created and set locally for callee');
          
          // アンサーを送信
          await updateDoc(roomRef, {
            answer: {
              type: answer.type,
              sdp: answer.sdp
            }
          });
          
          console.log('Answer sent to database');
        } catch (error) {
          console.error('Error processing offer:', error);
        }
      }

      // アンサー処理（開始側）
      if (data.answer && this.isCaller && !this.peerConnection.currentRemoteDescription) {
        console.log('Processing answer from callee');
        try {
          const answer = new RTCSessionDescription(data.answer);
          await this.peerConnection.setRemoteDescription(answer);
          console.log('Answer processed successfully by caller');
        } catch (error) {
          console.error('Error processing answer:', error);
        }
      }
    });
  }

  // ICE候補収集（FirebaseRTCパターン）
  private collectIceCandidates(): void {
    if (!this.peerConnection || !this.roomId) return;

    const localName = this.isCaller ? 'callerCandidates' : 'calleeCandidates';
    const remoteName = this.isCaller ? 'calleeCandidates' : 'callerCandidates';
    const candidatesCollection = collection(db, 'rooms', this.roomId, localName);

    // ICE候補送信
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const candidateData = {
          candidate: event.candidate.candidate,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          sdpMid: event.candidate.sdpMid
        };
        addDoc(candidatesCollection, candidateData);
        console.log('ICE candidate sent');
      }
    };

    // リモートICE候補監視
    const remoteCandidatesCollection = collection(db, 'rooms', this.roomId, remoteName);
    onSnapshot(remoteCandidatesCollection, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const candidateData = change.doc.data();
          try {
            const candidate = new RTCIceCandidate(candidateData);
            await this.peerConnection!.addIceCandidate(candidate);
            console.log('ICE candidate added');
          } catch (error) {
            console.error('Error adding ICE candidate:', error);
          }
        }
      });
    });
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
    return this.roomId !== null && this.peerConnection !== null;
  }

  // ルームID取得
  getRoomId(): string | null {
    return this.roomId;
  }

  // ピアコネクション再作成
  private async recreatePeerConnection(): Promise<void> {
    if (!this.localStream || !this.roomId) return;
    
    console.log('Recreating peer connection...');
    
    // 古いピアコネクションを閉じる
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    
    // 新しいピアコネクションを作成
    await this.setupPeerConnection();
    
    // 既存のオファー/アンサーを再処理
    await this.reprocessExistingSignaling();
    
    // ICE候補収集を再開
    this.collectIceCandidates();
    
    console.log('Peer connection recreated');
  }

  // 既存のシグナリングデータを再処理
  private async reprocessExistingSignaling(): Promise<void> {
    if (!this.roomId || !this.peerConnection) return;

    try {
      const roomRef = doc(db, 'rooms', this.roomId);
      const roomSnapshot = await getDoc(roomRef);
      
      if (!roomSnapshot.exists()) return;
      
      const roomData = roomSnapshot.data();
      
      // オファー処理（参加側）
      if (roomData.offer && !this.isCaller) {
        console.log('Reprocessing offer during recreation');
        const offer = new RTCSessionDescription(roomData.offer);
        await this.peerConnection.setRemoteDescription(offer);
        
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        
        await updateDoc(roomRef, {
          answer: {
            type: answer.type,
            sdp: answer.sdp
          }
        });
      }
      
      // アンサー処理（開始側）
      if (roomData.answer && this.isCaller) {
        console.log('Reprocessing answer during recreation');
        const answer = new RTCSessionDescription(roomData.answer);
        await this.peerConnection.setRemoteDescription(answer);
      }
    } catch (error) {
      console.error('Error reprocessing signaling data:', error);
    }
  }

  // クリーンアップ
  cleanup(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    if (this.unsubscribe) {
      this.unsubscribe();
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const scheduleRef = await addDoc(collection(db, 'videoCallSchedules'), scheduleData);

    const schedule: VideoCallSchedule = {
      id: scheduleRef.id,
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
    const schedulesQuery = query(
      collection(db, 'videoCallSchedules'),
      where('chatRoomId', '==', chatRoomId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(schedulesQuery);
    const schedules: VideoCallSchedule[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      schedules.push({
        id: doc.id,
        chatRoomId: data.chatRoomId,
        proposerId: data.proposerId,
        proposerUsername: 'Unknown User', // 後で取得
        title: data.title,
        description: data.description,
        proposedAt: data.proposedAt,
        status: data.status,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      });
    });

    return { schedules };
  },

  // スケジュール回答
  respondToSchedule: async (scheduleId: string, action: 'accept' | 'reject'): Promise<void> => {
    const scheduleRef = doc(db, 'videoCallSchedules', scheduleId);
    await updateDoc(scheduleRef, {
      status: action === 'accept' ? 'accepted' : 'rejected',
      updatedAt: new Date(),
    });
  },
};

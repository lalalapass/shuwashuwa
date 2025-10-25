import React, { useState, useEffect } from 'react';
import { videoCallApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { VideoCallSchedule } from '../../types/api';

interface ScheduleManagerProps {
  chatRoomId: number;
  onScheduleUpdate?: () => void;
}

const ScheduleManager: React.FC<ScheduleManagerProps> = ({ chatRoomId, onScheduleUpdate }) => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<VideoCallSchedule[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    proposedAt: '',
  });

  useEffect(() => {
    loadSchedules();
  }, [chatRoomId]);

  const loadSchedules = async () => {
    try {
      const response = await videoCallApi.getSchedules(chatRoomId);
      setSchedules(response.schedules);
    } catch (error) {
      console.error('Failed to load schedules:', error);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.proposedAt) return;

    setLoading(true);
    try {
      await videoCallApi.createSchedule({
        chatRoomId,
        title: formData.title,
        description: formData.description || undefined,
        proposedAt: formData.proposedAt,
      });

      setFormData({ title: '', description: '', proposedAt: '' });
      setShowCreateForm(false);
      await loadSchedules();
      onScheduleUpdate?.();
    } catch (error) {
      console.error('Failed to create schedule:', error);
      alert('日程提案の作成に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToSchedule = async (scheduleId: number, action: 'accept' | 'reject') => {
    try {
      await videoCallApi.respondToSchedule(scheduleId, action);
      await loadSchedules();
      onScheduleUpdate?.();
    } catch (error) {
      console.error('Failed to respond to schedule:', error);
      alert('日程への回答に失敗しました。');
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待機中';
      case 'accepted': return '承認済み';
      case 'rejected': return '拒否済み';
      default: return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'accepted': return 'status-accepted';
      case 'rejected': return 'status-rejected';
      default: return '';
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30); // 最低30分後から選択可能
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="schedule-manager">
      <div className="schedule-header">
        <h3>📅 ビデオ通話の日程調整</h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="create-schedule-button"
        >
          {showCreateForm ? 'キャンセル' : '日程を提案'}
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreateSchedule} className="schedule-form">
          <div className="form-group">
            <label htmlFor="title">タイトル</label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="例: 手話練習セッション"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="proposedAt">希望日時</label>
            <input
              type="datetime-local"
              id="proposedAt"
              value={formData.proposedAt}
              onChange={(e) => setFormData({ ...formData, proposedAt: e.target.value })}
              min={getMinDateTime()}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">説明（任意）</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="通話の目的や内容について..."
              rows={3}
            />
          </div>
          <div className="form-actions">
            <button type="submit" disabled={loading} className="submit-button">
              {loading ? '作成中...' : '日程を提案'}
            </button>
          </div>
        </form>
      )}

      <div className="schedules-list">
        {schedules.length === 0 ? (
          <p className="no-schedules">まだ日程提案がありません。</p>
        ) : (
          schedules.map((schedule) => (
            <div key={schedule.id} className="schedule-card">
              <div className="schedule-header-info">
                <h4>{schedule.title}</h4>
                <span className={`schedule-status ${getStatusClass(schedule.status)}`}>
                  {getStatusText(schedule.status)}
                </span>
              </div>
              <div className="schedule-details">
                <p className="schedule-datetime">
                  🕐 {formatDateTime(schedule.proposedAt)}
                </p>
                <p className="schedule-proposer">
                  提案者: {schedule.proposerUsername}
                </p>
                {schedule.description && (
                  <p className="schedule-description">{schedule.description}</p>
                )}
              </div>
              {schedule.status === 'pending' && schedule.proposerId !== user?.id && (
                <div className="schedule-actions">
                  <button
                    onClick={() => handleRespondToSchedule(schedule.id, 'accept')}
                    className="accept-button"
                  >
                    承認
                  </button>
                  <button
                    onClick={() => handleRespondToSchedule(schedule.id, 'reject')}
                    className="reject-button"
                  >
                    拒否
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ScheduleManager;

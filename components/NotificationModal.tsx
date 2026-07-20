import React, { useEffect, useState } from 'react';
import { markNotificationRead } from '../services/licenseService';

interface Notification {
  id: string;
  message: string;
  created_at: string;
}

interface NotificationModalProps {
  notifications: Notification[];
  username: string;
  activationKey: string;
  onClose: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({
  notifications, username, activationKey, onClose,
}) => {
  const [current, setCurrent] = useState(0);
  const [marking, setMarking] = useState(false);

  const notification = notifications[current];
  const isLast = current === notifications.length - 1;

  const handleNext = async () => {
    setMarking(true);
    await markNotificationRead();
    setMarking(false);
    if (isLast) onClose();
    else setCurrent(c => c + 1);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  if (!notification) return null;

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.iconWrap}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00c896" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <div>
            <h2 style={styles.title}>Message from Rachid Taouama</h2>
            <p style={styles.date}>{formatDate(notification.created_at)}</p>
          </div>
          {notifications.length > 1 && (
            <span style={styles.counter}>{current + 1} / {notifications.length}</span>
          )}
        </div>

        {/* Message */}
        <div style={styles.messageBox}>
          <p style={styles.message}>{notification.message}</p>
        </div>

        {/* Action */}
        <button
          style={{ ...styles.btn, ...(marking ? styles.btnLoading : {}) }}
          onClick={handleNext}
          disabled={marking}
        >
          {marking ? 'Marking as read...' : isLast ? 'Got it ✓' : 'Next →'}
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  modal: {
    width: 460, padding: '32px',
    background: 'linear-gradient(145deg, #0d1b2a, #0a1628)',
    border: '1px solid rgba(0,200,150,0.2)',
    borderRadius: 20,
    boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,200,150,0.1)',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  header: {
    display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
    background: 'rgba(0,200,150,0.1)',
    border: '1px solid rgba(0,200,150,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  title: {
    margin: 0, fontSize: 16, fontWeight: 600, color: '#f8fafc',
  },
  date: { margin: '4px 0 0', fontSize: 12, color: '#64748b' },
  counter: {
    marginLeft: 'auto', fontSize: 12, color: '#64748b',
    background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 20,
  },
  messageBox: {
    padding: '20px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12, marginBottom: 24,
  },
  message: {
    margin: 0, fontSize: 15, color: '#cbd5e1', lineHeight: 1.7,
    whiteSpace: 'pre-wrap',
  },
  btn: {
    width: '100%', padding: '13px',
    background: 'linear-gradient(135deg, #00c896, #0077ff)',
    color: '#fff', fontSize: 14, fontWeight: 600,
    border: 'none', borderRadius: 12, cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(0,200,150,0.3)',
  },
  btnLoading: { opacity: 0.6, cursor: 'not-allowed' },
};

export default NotificationModal;

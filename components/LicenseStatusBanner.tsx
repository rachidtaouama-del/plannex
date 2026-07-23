import React from 'react';
import { LicenseSession, getLicenseStatus } from '../services/licenseService';

interface LicenseStatusBannerProps {
  session: LicenseSession;
  setPage?: (page: string) => void;
}

const LicenseStatusBanner: React.FC<LicenseStatusBannerProps> = ({ session, setPage }) => {
  const [countdown, setCountdown] = React.useState('');

  React.useEffect(() => {
    if (session.isAdmin) return;

    const updateCountdown = () => {
      const now = new Date();
      const expiresAt = new Date(session.expiresAt);
      if (expiresAt <= now) {
         setCountdown('Expired');
         return;
      }
      
      let d1 = now;
      let d2 = expiresAt;

      let months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
      let days = d2.getDate() - d1.getDate();
      if (days < 0) {
          months -= 1;
          const prevMonth = new Date(d2.getFullYear(), d2.getMonth(), 0);
          days += prevMonth.getDate();
      }
      
      let hours = d2.getHours() - d1.getHours();
      if (hours < 0) { days -= 1; hours += 24; }
      
      let minutes = d2.getMinutes() - d1.getMinutes();
      if (minutes < 0) { hours -= 1; minutes += 60; }
      
      if (days < 0) {
          months -= 1;
          const prevMonth = new Date(d2.getFullYear(), d2.getMonth(), 0);
          days += prevMonth.getDate();
      }

      const parts = [];
      if (months > 0) parts.push(`${months} month${months > 1 ? 's' : ''}`);
      if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
      if (hours > 0) parts.push(`${hours} hr${hours > 1 ? 's' : ''}`);
      parts.push(`${minutes} min`);
      
      setCountdown(parts.join(' '));
    };

    updateCountdown();
    const intervalId = setInterval(updateCountdown, 60000);
    return () => clearInterval(intervalId);
  }, [session]);

  if (session.isAdmin) return null; // Admin never shows expiry banner

  const { daysRemaining, status } = getLicenseStatus(session);

  const configs = {
    valid: daysRemaining > 30 ? null : null, // hide if > 30 days
    warning: {
      bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)',
      color: '#f59e0b', icon: '⚠️',
      text: `License expires in ${countdown}`,
    },
    critical: {
      bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)',
      color: '#ef4444', icon: '🔴',
      text: `License expires in ${countdown} — Renew now!`,
    },
    grace: {
      bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)',
      color: '#ef4444', icon: '⛔',
      text: `License expired — ${session.gracePeriodDays + daysRemaining} grace days remaining`,
    },
    locked: null, // full screen shown instead
  };

  const config = configs[status];
  if (!config) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      padding: '6px 16px',
      background: config.bg,
      borderBottom: `1px solid ${config.border}`,
      fontSize: 12, color: config.color, fontWeight: 500,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      <span>{config.icon}</span>
      <span>{config.text}</span>
      <button
        onClick={() => setPage ? setPage('about') : window.open('mailto:rachid.taouama@gmail.com')}
        style={{
          background: 'none', border: 'none', padding: 0, margin: '0 0 0 8px',
          color: config.color, fontWeight: 700, textDecoration: 'underline',
          cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
        }}
      >
        Contact support →
      </button>
    </div>
  );
};

export default LicenseStatusBanner;


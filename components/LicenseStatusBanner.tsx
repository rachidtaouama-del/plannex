import React from 'react';
import { LicenseSession, getLicenseStatus } from '../services/licenseService';

interface LicenseStatusBannerProps {
  session: LicenseSession;
}

const LicenseStatusBanner: React.FC<LicenseStatusBannerProps> = ({ session }) => {
  if (session.isAdmin) return null; // Admin never shows expiry banner

  const { daysRemaining, status } = getLicenseStatus(session);

  const configs = {
    valid: daysRemaining > 30 ? null : null, // hide if > 30 days
    warning: {
      bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)',
      color: '#f59e0b', icon: '⚠️',
      text: `License expires in ${daysRemaining} days`,
    },
    critical: {
      bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)',
      color: '#ef4444', icon: '🔴',
      text: `License expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} — Renew now!`,
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
      <a
        href="mailto:rachid.taouama@gmail.com"
        style={{ color: config.color, fontWeight: 700, marginLeft: 8, textDecoration: 'underline' }}
      >
        Contact support →
      </a>
    </div>
  );
};

export default LicenseStatusBanner;

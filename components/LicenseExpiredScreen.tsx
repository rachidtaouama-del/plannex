import React from 'react';

interface LicenseExpiredScreenProps {
  username: string;
  companyName: string;
}

const LicenseExpiredScreen: React.FC<LicenseExpiredScreenProps> = ({ username, companyName }) => {
  return (
    <div style={styles.overlay}>
      <div style={styles.gridBg} />
      <div style={{ ...styles.orb, top: '-10%', left: '-5%', width: 400, height: 400, background: 'rgba(239,68,68,0.06)' }} />
      <div style={{ ...styles.orb, bottom: '5%', right: '-5%', width: 300, height: 300, background: 'rgba(239,68,68,0.04)' }} />

      <div style={styles.card}>
        {/* Icon */}
        <div style={styles.iconWrap}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h1 style={styles.title}>License Expired</h1>
        <p style={styles.subtitle}>
          Your Plannex license for <strong style={{ color: '#f8fafc' }}>{companyName || username}</strong> has expired.
          <br />Please contact your administrator to renew access.
        </p>

        <div style={styles.infoBox}>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Account</span>
            <span style={styles.infoValue}>{username}</span>
          </div>
          <div style={styles.infoDivider} />
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Status</span>
            <span style={{ ...styles.infoValue, color: '#ef4444' }}>● Expired</span>
          </div>
        </div>

        <a href="mailto:rachid.taouama@gmail.com" style={styles.contactBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          Contact Rachid Taouama
        </a>

        <p style={styles.emailHint}>rachid.taouama@gmail.com</p>
      </div>

      <p style={styles.credit}>PlanneX · Developed by Rachid Taouama</p>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'linear-gradient(135deg, #0a0f1e 0%, #1a0a0a 100%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    overflow: 'hidden',
  },
  gridBg: {
    position: 'absolute', inset: 0,
    backgroundImage: 'linear-gradient(rgba(239,68,68,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.03) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
  },
  orb: { position: 'absolute', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' },
  card: {
    position: 'relative', zIndex: 10,
    width: 440, padding: '48px 44px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(239,68,68,0.15)',
    borderRadius: 24, textAlign: 'center' as const,
    backdropFilter: 'blur(24px)',
    boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
  },
  iconWrap: {
    width: 80, height: 80, borderRadius: '50%', margin: '0 auto 24px',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  title: {
    margin: '0 0 12px', fontSize: 28, fontWeight: 700, color: '#f8fafc',
  },
  subtitle: {
    margin: '0 0 28px', fontSize: 15, color: '#64748b', lineHeight: 1.7,
  },
  infoBox: {
    padding: '20px', background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 14, marginBottom: 28, textAlign: 'left' as const,
  },
  infoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 13, color: '#64748b' },
  infoValue: { fontSize: 13, color: '#94a3b8', fontWeight: 500 },
  infoDivider: { height: 1, background: 'rgba(255,255,255,0.05)', margin: '12px 0' },
  contactBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '14px', width: '100%', boxSizing: 'border-box' as const,
    background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
    color: '#fff', fontSize: 14, fontWeight: 600,
    textDecoration: 'none', borderRadius: 12,
    boxShadow: '0 8px 24px rgba(239,68,68,0.3)',
  },
  emailHint: { margin: '12px 0 0', fontSize: 12, color: '#475569' },
  credit: {
    position: 'absolute', bottom: 20,
    fontSize: 12, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.5px',
  },
};

export default LicenseExpiredScreen;

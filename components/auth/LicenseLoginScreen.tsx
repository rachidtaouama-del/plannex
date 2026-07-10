import React, { useState, useEffect } from 'react';
import { loginWithLicense, LicenseSession } from '../../services/licenseService';

interface LicenseLoginScreenProps {
  onSuccess: (session: LicenseSession) => void;
}

const LicenseLoginScreen: React.FC<LicenseLoginScreenProps> = ({ onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [dots, setDots] = useState('');

  // Load saved username on mount
  useEffect(() => {
    const saved = localStorage.getItem('plannex_saved_username');
    if (saved) setUsername(saved);
  }, []);

  // Animated dots for loading
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => setDots(d => (d.length >= 3 ? '' : d + '.')), 500);
    return () => clearInterval(interval);
  }, [loading]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.');
      return;
    }
    setLoading(true);
    setError('');

    const result = await loginWithLicense(username, password);
    setLoading(false);

    if (result.success && result.session) {
      localStorage.setItem('plannex_saved_username', username.toLowerCase().trim());
      onSuccess(result.session);
    } else {
      const messages: Record<string, string> = {
        not_found: 'Account not found. Please check your username.',
        wrong_password: 'Incorrect password. Please try again.',
        inactive: 'Your account has been deactivated. Please contact support.',
        network_error: 'Cannot connect to the license server. Please check your internet connection.',
      };
      setError(messages[result.error || 'network_error'] || 'Login failed. Please try again.');
    }
  };

  return (
    <div style={styles.overlay}>
      {/* Background animated grid */}
      <div style={styles.gridBg} />

      {/* Floating orbs */}
      <div style={{ ...styles.orb, ...styles.orb1 }} />
      <div style={{ ...styles.orb, ...styles.orb2 }} />
      <div style={{ ...styles.orb, ...styles.orb3 }} />

      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoSection}>
          <div style={styles.logoIcon}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect width="36" height="36" rx="10" fill="url(#lg1)" />
              <path d="M8 18L14 12L20 18L26 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 26L14 20L20 24L26 18" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="lg1" x1="0" y1="0" x2="36" y2="36">
                  <stop stopColor="#00C896" />
                  <stop offset="1" stopColor="#0077FF" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <h1 style={styles.appName}>PlanneX</h1>
            <p style={styles.tagline}>Industrial Planning Engine</p>
          </div>
        </div>

        <div style={styles.divider} />

        <h2 style={styles.title}>Welcome Back</h2>
        <p style={styles.subtitle}>Sign in to access your workspace</p>

        <form onSubmit={handleLogin} style={styles.form}>
          {/* Username */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Username</label>
            <div style={styles.inputWrapper}>
              <span style={styles.inputIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                style={styles.input}
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus={!username}
              />
            </div>
          </div>

          {/* Password */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <span style={styles.inputIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                style={styles.input}
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus={!!username}
              />
              <button
                type="button"
                style={styles.eyeBtn}
                onClick={() => setShowPassword(s => !s)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={styles.errorBox}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            style={{ ...styles.submitBtn, ...(loading ? styles.submitBtnLoading : {}) }}
            disabled={loading}
          >
            {loading ? (
              <span>Verifying license{dots}</span>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                Sign In
              </>
            )}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Need access?{' '}
            <a href="mailto:rachid.taouama@gmail.com" style={styles.footerLink}>
              Contact Rachid Taouama
            </a>
          </p>
        </div>
      </div>

      {/* Developer credit */}
      <p style={styles.credit}>Developed by Rachid Taouama · PlanneX v1.0</p>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1b2a 50%, #0a1628 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    overflow: 'hidden',
  },
  gridBg: {
    position: 'absolute', inset: 0,
    backgroundImage: 'linear-gradient(rgba(0,200,150,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,150,0.03) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
  },
  orb: {
    position: 'absolute', borderRadius: '50%',
    filter: 'blur(80px)', pointerEvents: 'none',
  },
  orb1: { width: 400, height: 400, background: 'rgba(0,200,150,0.08)', top: '-10%', left: '-5%' },
  orb2: { width: 300, height: 300, background: 'rgba(0,119,255,0.08)', bottom: '5%', right: '-5%' },
  orb3: { width: 200, height: 200, background: 'rgba(100,50,255,0.06)', top: '40%', right: '20%' },
  card: {
    position: 'relative', zIndex: 10,
    width: 420, padding: '40px 44px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 24,
    backdropFilter: 'blur(24px)',
    boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
  },
  logoSection: {
    display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24,
  },
  logoIcon: {
    width: 52, height: 52, borderRadius: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #00c896, #0077ff)',
    boxShadow: '0 8px 24px rgba(0,200,150,0.3)',
  },
  appName: {
    margin: 0, fontSize: 22, fontWeight: 700,
    color: '#fff', letterSpacing: '-0.5px',
  },
  tagline: {
    margin: '2px 0 0', fontSize: 11, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '1px',
  },
  divider: {
    height: 1, background: 'rgba(255,255,255,0.06)',
    marginBottom: 24,
  },
  title: {
    margin: 0, fontSize: 24, fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.5px',
  },
  subtitle: {
    margin: '6px 0 28px', fontSize: 14, color: '#64748b',
  },
  form: { display: 'flex', flexDirection: 'column', gap: 18 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 7 },
  label: { fontSize: 13, fontWeight: 500, color: '#94a3b8', letterSpacing: '0.3px' },
  inputWrapper: {
    position: 'relative', display: 'flex', alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute', left: 14, display: 'flex', alignItems: 'center',
    pointerEvents: 'none',
  },
  input: {
    width: '100%', padding: '13px 14px 13px 42px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12, color: '#f8fafc', fontSize: 14,
    outline: 'none', transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  eyeBtn: {
    position: 'absolute', right: 14, background: 'none', border: 'none',
    cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0,
  },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 14px',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: 10, fontSize: 13, color: '#ef4444',
  },
  submitBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '14px', marginTop: 4,
    background: 'linear-gradient(135deg, #00c896, #0077ff)',
    color: '#fff', fontSize: 15, fontWeight: 600,
    border: 'none', borderRadius: 12, cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(0,200,150,0.3)',
    transition: 'opacity 0.2s, transform 0.1s',
  },
  submitBtnLoading: { opacity: 0.7, cursor: 'not-allowed' },
  footer: { marginTop: 24, textAlign: 'center' as const },
  footerText: { fontSize: 13, color: '#475569', margin: 0 },
  footerLink: { color: '#00c896', textDecoration: 'none', fontWeight: 500 },
  credit: {
    position: 'absolute', bottom: 20,
    fontSize: 12, color: 'rgba(255,255,255,0.2)',
    letterSpacing: '0.5px',
  },
};

export default LicenseLoginScreen;

import React, { useState, useEffect } from 'react';
import {
  loginAsAdmin,
  loginWithPassword,
  setupClientProfile,
  validateNewLicenseFile,
  getMachineId,
  LicenseSession
} from '../../services/licenseService';

interface LicenseLoginScreenProps {
  onSuccess: (session: LicenseSession) => void;
}

type ScreenMode = 'checking' | 'client-password' | 'client-upload' | 'client-setup' | 'client-expired' | 'admin';

const LicenseLoginScreen: React.FC<LicenseLoginScreenProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<ScreenMode>('checking');
  const [machineId, setMachineId] = useState<string>('Loading...');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dots, setDots] = useState('');

  // Forms
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Setup form (after uploading license)
  const [setupUsername, setSetupUsername] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [tempLicenseContent, setTempLicenseContent] = useState('');

  // On mount: check machine ID and profile status
  useEffect(() => {
    getMachineId().then(setMachineId);

    const init = async () => {
      try {
        const profile = await (window as any).electronAPI?.profileRead?.();
        if (profile && profile.licenseContent) {
          // If there is a profile, let's validate its license right away
          // We don't have validateLicenseFile exposed, but we can use validateNewLicenseFile
          const check = await validateNewLicenseFile(profile.licenseContent);
          if (!check.success) {
            setMode('client-expired');
            if (check.error === 'expired') {
              setError('Your license has expired. Please upload a new license file.');
            } else {
              setError('Your license is invalid or for a different machine.');
            }
          } else {
            // Valid license -> Ask for password
            setMode('client-password');
            setUsername(profile.username);
          }
        } else {
          setMode('client-upload');
        }
      } catch (e) {
        setMode('client-upload');
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => setDots(d => (d.length >= 3 ? '' : d + '.')), 500);
    return () => clearInterval(interval);
  }, [loading]);

  const handleCopyMachineId = () => {
    navigator.clipboard.writeText(machineId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleLoadLicenseFile = async () => {
    setError('');
    setLoading(true);
    try {
      let content: string | null = null;
      if ((window as any).electronAPI?.loadLicenseFile) {
        content = await (window as any).electronAPI.loadLicenseFile();
      } else {
        content = await new Promise((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.plxlicense';
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) { resolve(null); return; }
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target?.result as string);
            reader.readAsText(file);
          };
          input.click();
        });
      }

      if (!content) { setLoading(false); return; }

      // Validate the file before going to setup
      const check = await validateNewLicenseFile(content);
      setLoading(false);

      if (check.success) {
        setTempLicenseContent(content);
        setMode('client-setup');
      } else {
        const messages: Record<string, string> = {
          tampered:       '❌ License file has been tampered with or is corrupted.',
          wrong_machine:  '🖥️ This license is not valid for this computer.',
          expired:        '⏰ This license has expired.',
          invalid_format: '⚠️ Invalid license file format.',
        };
        setError(messages[check.error || 'invalid_format']);
      }
    } catch {
      setLoading(false);
      setError('An unexpected error occurred. Please try again.');
    }
  };

  const handleClientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError('Please enter your credentials.'); return; }
    setLoading(true); setError('');

    const result = await loginWithPassword(username, password);
    setLoading(false);

    if (result.success && result.session) {
      onSuccess(result.session);
    } else {
      if (result.error === 'expired') {
        setMode('client-expired');
        setError('Your license has expired. Please upload a new license file.');
      } else {
        setError('Incorrect username or password.');
      }
    }
  };

  const handleClientSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupUsername.trim() || !setupPassword.trim()) { setError('Please enter a username and password.'); return; }
    if (setupPassword.length < 4) { setError('Password must be at least 4 characters.'); return; }
    setLoading(true); setError('');

    const result = await setupClientProfile(tempLicenseContent, setupUsername, setupPassword);
    setLoading(false);

    if (result.success && result.session) {
      // Use the newly picked username in session for UI
      result.session.username = setupUsername;
      onSuccess(result.session);
    } else {
      setError('Failed to setup profile.');
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError('Please enter admin credentials.'); return; }
    setLoading(true); setError('');

    const result = await loginAsAdmin(username, password);
    setLoading(false);

    if (result.success && result.session) {
      onSuccess(result.session);
    } else {
      setError('Incorrect admin credentials.');
    }
  };

  if (mode === 'checking') {
    return (
      <div style={styles.overlay}>
        <div style={styles.card}><div style={{ textAlign: 'center', color: '#94a3b8' }}>Checking license status...</div></div>
      </div>
    );
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.gridBg} />
      <div style={{ ...styles.orb, top: '-10%', left: '-5%', width: 400, height: 400, background: 'rgba(0,200,150,0.08)' }} />
      <div style={{ ...styles.orb, bottom: '5%', right: '-5%', width: 300, height: 300, background: 'rgba(0,119,255,0.08)' }} />
      <div style={{ ...styles.orb, top: '40%', right: '20%', width: 200, height: 200, background: 'rgba(100,50,255,0.06)' }} />

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

        {/* ── CLIENT UPLOAD MODE ── */}
        {(mode === 'client-upload' || mode === 'client-expired') && (
          <>
            <h2 style={styles.title}>{mode === 'client-expired' ? 'License Expired' : 'Load Your License'}</h2>
            <p style={styles.subtitle}>
              {mode === 'client-expired' 
                ? 'Your previous license has expired. Please load a new .plxlicense file to continue.'
                : 'Load the .plxlicense file sent to you by your administrator.'}
            </p>

            <div style={styles.machineBox}>
              <div style={styles.machineLabel}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00c896" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
                </svg>
                Your Machine ID (send this to your administrator)
              </div>
              <div style={styles.machineIdRow}>
                <span style={styles.machineIdValue}>{machineId}</span>
                <button onClick={handleCopyMachineId} style={styles.copyBtn}>{copied ? '✓ Copied' : 'Copy'}</button>
              </div>
            </div>

            {error && <div style={styles.errorBox}><span>{error}</span></div>}

            <button onClick={handleLoadLicenseFile} disabled={loading} style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}>
              {loading ? <span>Verifying license{dots}</span> : 'Load License File (.plxlicense)'}
            </button>
          </>
        )}

        {/* ── CLIENT SETUP MODE (First Time Login) ── */}
        {mode === 'client-setup' && (
          <>
            <h2 style={styles.title}>Create Your Account</h2>
            <p style={styles.subtitle}>Your license is valid! Please choose a username and password to secure your account locally.</p>
            <form onSubmit={handleClientSetup} style={styles.form}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Username</label>
                <div style={styles.inputWrapper}>
                  <input style={styles.input} type="text" placeholder="e.g. john" value={setupUsername} onChange={e => setSetupUsername(e.target.value)} autoFocus />
                </div>
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Password</label>
                <div style={styles.inputWrapper}>
                  <input style={styles.input} type="password" placeholder="Choose a password" value={setupPassword} onChange={e => setSetupPassword(e.target.value)} />
                </div>
              </div>
              {error && <div style={styles.errorBox}><span>{error}</span></div>}
              <button type="submit" style={{ ...styles.submitBtn, ...(loading ? { opacity: 0.7 } : {}) }} disabled={loading}>
                {loading ? `Setting up profile${dots}` : 'Save & Enter Application'}
              </button>
            </form>
          </>
        )}

        {/* ── CLIENT PASSWORD LOGIN ── */}
        {mode === 'client-password' && (
          <>
            <h2 style={styles.title}>Welcome Back</h2>
            <p style={styles.subtitle}>Enter your credentials to access PlanneX.</p>

            <form onSubmit={handleClientLogin} style={styles.form}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Username</label>
                <div style={styles.inputWrapper}>
                  <input style={styles.input} type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
                </div>
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Password</label>
                <div style={styles.inputWrapper}>
                  <input style={styles.input} type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} autoFocus />
                  <button type="button" style={styles.eyeBtn} onClick={() => setShowPassword(s => !s)} tabIndex={-1}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              {error && <div style={styles.errorBox}><span>{error}</span></div>}
              <button type="submit" style={{ ...styles.submitBtn, ...(loading ? { opacity: 0.7 } : {}) }} disabled={loading}>
                {loading ? `Signing in${dots}` : 'Sign In'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button onClick={() => setMode('client-upload')} style={{ ...styles.toggleBtn, color: '#64748b' }}>
                Forgot Password or Need to Renew License?
              </button>
            </div>
          </>
        )}

        {/* ── ADMIN MODE ── */}
        {mode === 'admin' && (
          <>
            <h2 style={styles.title}>Admin Access</h2>
            <p style={styles.subtitle}>Sign in with your administrator credentials.</p>
            <form onSubmit={handleAdminLogin} style={styles.form}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Username</label>
                <div style={styles.inputWrapper}>
                  <input style={styles.input} type="text" placeholder="Admin username" value={username} onChange={e => setUsername(e.target.value)} autoFocus />
                </div>
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Password</label>
                <div style={styles.inputWrapper}>
                  <input style={styles.input} type="password" placeholder="Admin password" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
              </div>
              {error && <div style={styles.errorBox}><span>{error}</span></div>}
              <button type="submit" style={{ ...styles.submitBtn, ...(loading ? { opacity: 0.7 } : {}) }} disabled={loading}>
                {loading ? `Signing in${dots}` : 'Sign In'}
              </button>
            </form>
          </>
        )}

        {/* ── FOOTER TOGGLES ── */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          {mode !== 'admin' ? (
            <button onClick={() => { setMode('admin'); setError(''); }} style={styles.toggleBtn}>
              ⚙️ Admin Login
            </button>
          ) : (
            <button onClick={() => { setMode('client-password'); setError(''); }} style={styles.toggleBtn}>
              ← Back to User Login
            </button>
          )}
        </div>

        {/* Exit button — only inside Electron */}
        {!!(window as any).electronAPI?.quitApp && (
          <button
            onClick={() => (window as any).electronAPI.quitApp()}
            style={styles.exitBtn}
          >
            ✕ Exit Application
          </button>
        )}
      </div>
      <p style={styles.credit}>Developed by Rachid Taouama · PlanneX v1.2</p>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1b2a 50%, #0a1628 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', 'Segoe UI', sans-serif", overflow: 'hidden' },
  gridBg: { position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,200,150,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,150,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px' },
  orb: { position: 'absolute', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' },
  card: { position: 'relative', zIndex: 10, width: 460, padding: '40px 44px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, backdropFilter: 'blur(24px)', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' },
  logoSection: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 },
  logoIcon: { width: 52, height: 52, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #00c896, #0077ff)', boxShadow: '0 8px 24px rgba(0,200,150,0.3)' },
  appName: { margin: 0, fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' },
  tagline: { margin: '2px 0 0', fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' },
  divider: { height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 24 },
  title: { margin: 0, fontSize: 22, fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.5px' },
  subtitle: { margin: '6px 0 22px', fontSize: 14, color: '#64748b', lineHeight: 1.6 },
  machineBox: { padding: '16px', background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.2)', borderRadius: 12, marginBottom: 18 },
  machineLabel: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#00c896', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' },
  machineIdRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  machineIdValue: { fontSize: 14, fontFamily: 'monospace', color: '#f8fafc', fontWeight: 700, letterSpacing: '2px' },
  copyBtn: { padding: '5px 12px', background: 'rgba(0,200,150,0.15)', border: '1px solid rgba(0,200,150,0.3)', borderRadius: 8, color: '#00c896', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  errorBox: { display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, fontSize: 13, color: '#ef4444', marginBottom: 14, lineHeight: 1.5 },
  submitBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', width: '100%', boxSizing: 'border-box', background: 'linear-gradient(135deg, #00c896, #0077ff)', color: '#fff', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 12, cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,200,150,0.3)', transition: 'opacity 0.2s' },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 7 },
  label: { fontSize: 13, fontWeight: 500, color: '#94a3b8', letterSpacing: '0.3px' },
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  input: { width: '100%', padding: '13px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#f8fafc', fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  eyeBtn: { position: 'absolute', right: 14, background: 'none', border: 'none', color: '#64748b', fontSize: 12, cursor: 'pointer' },
  toggleBtn: { background: 'none', border: 'none', color: '#475569', fontSize: 12, cursor: 'pointer', padding: '4px 8px', borderRadius: 6, transition: 'color 0.2s' },
  exitBtn: { marginTop: 12, background: 'none', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#ef444488', fontSize: 12, cursor: 'pointer', padding: '7px 20px', width: '100%', transition: 'all 0.2s' },
  credit: { position: 'absolute', bottom: 20, fontSize: 12, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.5px' },
};

export default LicenseLoginScreen;

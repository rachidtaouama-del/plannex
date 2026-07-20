import React, { useState, useEffect, useCallback } from 'react';
import {
  getAllLicenses, createLicense, updateLicense, deleteLicense,
  regenerateLicenseFile, getLoginLogs, License,
} from '../../services/adminLicenseService';

interface AdminPanelProps {
  adminKey: string;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ adminKey }) => {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [logs, setLogs] = useState<{ username: string; logged_in_at: string; machine_name: string }[]>([]);
  const [activeTab, setActiveTab] = useState<'licenses' | 'logs'>('licenses');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState<License | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [lic, log] = await Promise.all([getAllLicenses(adminKey), getLoginLogs(adminKey, 50)]);
      setLicenses(lic);
      setLogs(log);
    } catch (e: any) { setError('Failed to load data: ' + e.message); }
    finally { setLoading(false); }
  }, [adminKey]);

  useEffect(() => { loadData(); }, [loadData]);

  const flash = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3500); };

  const toggleActive = async (lic: License) => {
    await updateLicense(adminKey, lic.id, { is_active: !lic.is_active });
    flash(`${lic.username} ${!lic.is_active ? 'activated' : 'deactivated'}.`);
    loadData();
  };

  const handleDelete = async (lic: License) => {
    if (!confirm(`Permanently delete license for "${lic.username}"?`)) return;
    await deleteLicense(adminKey, lic.id);
    flash(`License for ${lic.username} deleted.`);
    loadData();
  };

  const handleDownload = async (lic: License) => {
    try {
      const content = await regenerateLicenseFile(lic);
      const filename = `${lic.username}_${lic.company_name.replace(/\s+/g, '_')}.plxlicense`;
      if ((window as any).electronAPI?.saveLicenseFile) {
        await (window as any).electronAPI.saveLicenseFile(content, filename);
        flash(`License file saved for ${lic.username}.`);
      } else {
        // Browser fallback
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
        flash(`License file downloaded for ${lic.username}.`);
      }
    } catch (e: any) { setError('Failed to generate license: ' + e.message); }
  };

  const getDaysLeft = (expiresAt: string) => Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const getStatusBadge = (lic: License) => {
    if (!lic.is_active) return { label: 'Blocked', color: '#64748b' };
    const days = getDaysLeft(lic.expires_at);
    if (days <= 0) return { label: 'Expired', color: '#ef4444' };
    if (days <= 7) return { label: `${days}d left`, color: '#f59e0b' };
    if (days <= 30) return { label: `${days}d left`, color: '#f59e0b' };
    return { label: 'Active', color: '#00c896' };
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>⚙️ Admin Panel</h1>
          <p style={styles.subtitle}>Manage licenses and user access</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={styles.refreshBtn} onClick={loadData}>↻ Refresh</button>
          <button style={styles.createBtn} onClick={() => setShowCreateModal(true)}>+ New License</button>
        </div>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}
      {success && <div style={styles.successBanner}>✓ {success}</div>}

      {/* Stats */}
      <div style={styles.statsRow}>
        {[
          { label: 'Total Licenses', value: licenses.length, color: '#0077ff' },
          { label: 'Active', value: licenses.filter(l => l.is_active && getDaysLeft(l.expires_at) > 0).length, color: '#00c896' },
          { label: 'Expiring Soon', value: licenses.filter(l => { const d = getDaysLeft(l.expires_at); return d > 0 && d <= 30; }).length, color: '#f59e0b' },
          { label: 'Expired/Blocked', value: licenses.filter(l => !l.is_active || getDaysLeft(l.expires_at) <= 0).length, color: '#ef4444' },
        ].map(s => (
          <div key={s.label} style={styles.statCard}>
            <span style={{ ...styles.statValue, color: s.color }}>{s.value}</span>
            <span style={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {(['licenses', 'logs'] as const).map(tab => (
          <button key={tab} style={{ ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }} onClick={() => setActiveTab(tab)}>
            {tab === 'licenses' ? '🔑 Licenses' : '📋 Login History'}
          </button>
        ))}
      </div>

      {/* Licenses Table */}
      {activeTab === 'licenses' && (
        <div style={styles.tableWrap}>
          {loading ? <div style={styles.loadingMsg}>Loading...</div> : (
            <table style={styles.table}>
              <thead>
                <tr>{['Username', 'Company', 'Machine ID', 'Status', 'Expires', 'Actions'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {licenses.length === 0 && (
                  <tr><td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: '#475569', padding: 32 }}>No licenses yet. Click "+ New License" to create one.</td></tr>
                )}
                {licenses.map(lic => {
                  const badge = getStatusBadge(lic);
                  const days = getDaysLeft(lic.expires_at);
                  return (
                    <tr key={lic.id} style={styles.tr}>
                      <td style={styles.td}><strong style={{ color: '#f8fafc' }}>{lic.username}</strong></td>
                      <td style={styles.td}>{lic.company_name || '—'}</td>
                      <td style={styles.td}><span style={{ fontFamily: 'monospace', fontSize: 12, color: '#94a3b8' }}>{lic.machine_id || '—'}</span></td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, background: badge.color + '22', color: badge.color, border: `1px solid ${badge.color}44` }}>{badge.label}</span>
                      </td>
                      <td style={styles.td}>
                        {new Date(lic.expires_at).toLocaleDateString('en-GB')}
                        {days > 0 && days <= 30 && <span style={{ color: '#f59e0b', fontSize: 11, marginLeft: 6 }}>({days}d)</span>}
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button style={{ ...styles.actionBtn, color: '#00c896', borderColor: 'rgba(0,200,150,0.3)' }} onClick={() => handleDownload(lic)} title="Download .plxlicense file">⬇ Download</button>
                          <button style={{ ...styles.actionBtn, color: '#60a5fa', borderColor: 'rgba(96,165,250,0.3)' }} onClick={() => setEditTarget(lic)} title="Edit">✏️ Edit</button>
                          <button style={{ ...styles.actionBtn, ...(lic.is_active ? styles.deactivateBtn : styles.activateBtn) }} onClick={() => toggleActive(lic)}>
                            {lic.is_active ? '⛔ Block' : '✅ Activate'}
                          </button>
                          <button style={{ ...styles.actionBtn, ...styles.deleteBtn }} onClick={() => handleDelete(lic)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Logs */}
      {activeTab === 'logs' && (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead><tr>{['Username', 'Logged In At', 'Machine ID'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
            <tbody>
              {logs.length === 0 && <tr><td colSpan={3} style={{ ...styles.td, textAlign: 'center', color: '#475569', padding: 32 }}>No login history yet.</td></tr>}
              {logs.map((log, i) => (
                <tr key={i} style={styles.tr}>
                  <td style={styles.td}><strong style={{ color: '#f8fafc' }}>{log.username}</strong></td>
                  <td style={styles.td}>{new Date(log.logged_in_at).toLocaleString('en-GB')}</td>
                  <td style={styles.td}><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{log.machine_name || '—'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <CreateLicenseModal
          adminKey={adminKey}
          onClose={() => setShowCreateModal(false)}
          onCreated={async (content, username, company) => {
            setShowCreateModal(false);
            loadData();
            // Auto-download the file
            const filename = `${username}_${company.replace(/\s+/g, '_')}.plxlicense`;
            if ((window as any).electronAPI?.saveLicenseFile) {
              await (window as any).electronAPI.saveLicenseFile(content, filename);
            } else {
              const blob = new Blob([content], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
              URL.revokeObjectURL(url);
            }
            flash(`License created and file downloaded for ${username}!`);
          }}
        />
      )}

      {editTarget && (
        <EditUserModal
          adminKey={adminKey}
          license={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(msg) => { setEditTarget(null); loadData(); flash(msg); }}
        />
      )}
    </div>
  );
};

// ── Create License Modal ──────────────────────────────────────────────────────
const CreateLicenseModal: React.FC<{
  adminKey: string;
  onClose: () => void;
  onCreated: (content: string, username: string, company: string) => void;
}> = ({ adminKey, onClose, onCreated }) => {
  const [form, setForm] = useState({ username: '', companyName: '', machineId: '', notes: '' });
  const [durationType, setDurationType] = useState<'custom' | 'forever'>('custom');
  const [customDays, setCustomDays] = useState('30');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.companyName || !form.machineId) { setError('Username, Company and Machine ID are required.'); return; }
    if (durationType === 'custom' && (!customDays || parseInt(customDays) < 1)) { setError('Enter a valid number of days.'); return; }
    setLoading(true);
    try {
      const expiresAt = durationType === 'forever'
        ? new Date('2099-12-31T23:59:59Z')
        : (() => { const d = new Date(); d.setDate(d.getDate() + parseInt(customDays)); return d; })();
      const content = await createLicense(adminKey, { username: form.username, companyName: form.companyName, machineId: form.machineId, expiresAt, notes: form.notes });
      onCreated(content, form.username, form.companyName);
    } catch (e: any) { setError(e.message); setLoading(false); }
  };

  return (
    <div style={styles.modalBackdrop}>
      <div style={{ ...styles.modal, width: 500 }}>
        <h3 style={styles.modalTitle}>Create New License</h3>
        {error && <div style={styles.modalError}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Username', key: 'username', placeholder: 'e.g. john.smith' },
            { label: 'Company Name', key: 'companyName', placeholder: 'e.g. Sonatrach' },
          ].map(f => (
            <div key={f.key}>
              <label style={styles.modalLabel}>{f.label}</label>
              <input style={styles.modalInput} placeholder={f.placeholder} value={(form as any)[f.key]} onChange={set(f.key)} />
            </div>
          ))}

          {/* Machine ID */}
          <div>
            <label style={styles.modalLabel}>Client Machine ID <span style={{ color: '#64748b' }}>(client must send you this)</span></label>
            <input style={{ ...styles.modalInput, fontFamily: 'monospace', letterSpacing: '1px' }} placeholder="e.g. A3F9B721CC04ABCD" value={form.machineId} onChange={set('machineId')} />
          </div>

          {/* Duration */}
          <div>
            <label style={styles.modalLabel}>License Duration</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {(['custom', 'forever'] as const).map(opt => (
                <button key={opt} type="button" onClick={() => setDurationType(opt)} style={{
                  flex: 1, padding: '9px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  background: durationType === opt ? (opt === 'forever' ? 'rgba(139,92,246,0.2)' : 'rgba(0,200,150,0.15)') : 'rgba(255,255,255,0.04)',
                  border: durationType === opt ? (opt === 'forever' ? '1px solid rgba(139,92,246,0.5)' : '1px solid rgba(0,200,150,0.4)') : '1px solid rgba(255,255,255,0.08)',
                  color: durationType === opt ? (opt === 'forever' ? '#a78bfa' : '#00c896') : '#64748b',
                }}>
                  {opt === 'forever' ? '♾️ Forever' : '📅 Custom Days'}
                </button>
              ))}
            </div>
            {durationType === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input style={{ ...styles.modalInput, flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 700, color: '#00c896' }}
                  type="number" min="1" max="3650" value={customDays} onChange={e => setCustomDays(e.target.value)} />
                <span style={{ color: '#64748b', fontSize: 14 }}>days</span>
                <span style={{ color: '#475569', fontSize: 12 }}>≈ {(parseInt(customDays || '0') / 30).toFixed(1)} months</span>
              </div>
            )}
            {durationType === 'forever' && (
              <div style={{ padding: '12px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 10, color: '#a78bfa', fontSize: 13, textAlign: 'center' }}>
                ♾️ This license will never expire
              </div>
            )}
          </div>

          <div>
            <label style={styles.modalLabel}>Notes (optional)</label>
            <textarea style={{ ...styles.modalInput, height: 60, resize: 'none' }} placeholder="Internal notes..." value={form.notes} onChange={set('notes')} />
          </div>

          <div style={{ padding: '10px 14px', background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.15)', borderRadius: 10, fontSize: 12, color: '#94a3b8' }}>
            ✅ After creating, the <strong style={{ color: '#00c896' }}>.plxlicense</strong> file will be automatically downloaded. Send it to your client.
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" style={styles.modalCancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" style={{ ...styles.modalConfirmBtn, opacity: loading ? 0.6 : 1 }} disabled={loading}>
              {loading ? 'Creating...' : '⬇ Create & Download License'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Edit User Modal ───────────────────────────────────────────────────────────
const EditUserModal: React.FC<{ adminKey: string; license: License; onClose: () => void; onSaved: (msg: string) => void }> = ({ adminKey, license, onClose, onSaved }) => {
  const [form, setForm] = useState({
    company_name: license.company_name || '',
    notes: license.notes || '',
    expires_at: license.expires_at ? license.expires_at.split('T')[0] : '',
    is_active: license.is_active,
    durationType: 'custom' as 'custom' | 'forever',
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    const expiresAt = form.durationType === 'forever' ? new Date('2099-12-31').toISOString() : new Date(form.expires_at).toISOString();
    await updateLicense(adminKey, license.id, { company_name: form.company_name, notes: form.notes, expires_at: expiresAt, is_active: form.is_active });
    onSaved(`${license.username} updated successfully.`);
    setLoading(false);
  };

  return (
    <div style={styles.modalBackdrop}>
      <div style={{ ...styles.modal, width: 460 }}>
        <h3 style={styles.modalTitle}>✏️ Edit — <span style={{ color: '#00c896' }}>{license.username}</span></h3>
        <label style={styles.modalLabel}>Company Name</label>
        <input style={{ ...styles.modalInput, marginBottom: 14 }} value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
        <label style={styles.modalLabel}>Expiry Date</label>
        <input type="date" style={{ ...styles.modalInput, marginBottom: 14 }} value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
        <label style={styles.modalLabel}>Notes</label>
        <textarea style={{ ...styles.modalInput, height: 70, resize: 'none', marginBottom: 16 }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        <label style={{ ...styles.modalLabel, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 20 }}>
          <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
          <span>Account Active</span>
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={styles.modalCancelBtn} onClick={onClose}>Cancel</button>
          <button style={{ ...styles.modalConfirmBtn, opacity: loading ? 0.6 : 1 }} onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : '✓ Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  container: { padding: '32px', fontFamily: "'Inter', 'Segoe UI', sans-serif", color: '#94a3b8' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  title: { margin: 0, fontSize: 26, fontWeight: 700, color: '#f8fafc' },
  subtitle: { margin: '4px 0 0', fontSize: 14, color: '#64748b' },
  refreshBtn: { padding: '9px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#94a3b8', cursor: 'pointer', fontSize: 13 },
  createBtn: { padding: '9px 18px', background: 'linear-gradient(135deg, #00c896, #0077ff)', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  errorBanner: { padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#ef4444', marginBottom: 16, fontSize: 13 },
  successBanner: { padding: '12px 16px', background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.2)', borderRadius: 10, color: '#00c896', marginBottom: 16, fontSize: 13 },
  statsRow: { display: 'flex', gap: 16, marginBottom: 28 },
  statCard: { flex: 1, padding: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 4 },
  statValue: { fontSize: 28, fontWeight: 700 },
  statLabel: { fontSize: 12, color: '#64748b' },
  tabs: { display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.07)' },
  tab: { padding: '10px 20px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13, borderBottom: '2px solid transparent', marginBottom: -1 },
  tabActive: { color: '#00c896', borderBottom: '2px solid #00c896' },
  tableWrap: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px 16px', background: 'rgba(255,255,255,0.03)', fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left' },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.04)' },
  td: { padding: '13px 16px', fontSize: 13 },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
  actionBtn: { padding: '5px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, cursor: 'pointer', color: '#94a3b8', fontSize: 12 },
  deactivateBtn: { color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)' },
  activateBtn: { color: '#00c896', borderColor: 'rgba(0,200,150,0.3)' },
  deleteBtn: { color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' },
  loadingMsg: { padding: 40, textAlign: 'center', color: '#64748b' },
  modalBackdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { width: 400, padding: 32, background: '#0d1b2a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, boxShadow: '0 24px 60px rgba(0,0,0,0.6)', maxHeight: '90vh', overflowY: 'auto' },
  modalTitle: { margin: '0 0 20px', fontSize: 18, fontWeight: 600, color: '#f8fafc' },
  modalLabel: { display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6 },
  modalInput: { width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f8fafc', fontSize: 13, boxSizing: 'border-box', outline: 'none' },
  modalError: { padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#ef4444', fontSize: 13, marginBottom: 12 },
  modalCancelBtn: { flex: 1, padding: '11px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#94a3b8', cursor: 'pointer', fontSize: 13 },
  modalConfirmBtn: { flex: 2, padding: '11px', background: 'linear-gradient(135deg, #00c896, #0077ff)', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
};

export default AdminPanel;

import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { request } from '../api';
import { T } from '../theme';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const data = await request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) });
    setLoading(false);
    if (data.message) {
      setMsg('Password updated! Redirecting to sign in…');
      setTimeout(() => navigate('/'), 2500);
    } else {
      setError(data.error || 'Reset failed. The link may have expired.');
    }
  };

  if (!token) {
    return (
      <div style={{ ...s.page }}>
        <div style={s.card}>
          <p style={{ color: T.error, textAlign: 'center' }}>Invalid reset link.</p>
          <p style={s.foot}><Link to="/forgot-password" style={{ color: T.primaryHov }}>Request a new one</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.glow} />
      <form style={s.card} onSubmit={submit} className="fade-up">
        <div style={s.brand}>
          <div style={s.logoMark}>M</div>
          <span style={s.logoText}>Mogala</span>
        </div>
        <h2 style={s.heading}>Set new password</h2>
        <p style={s.sub}>Choose a strong password for your account.</p>

        <div style={s.fieldGroup}>
          <label style={s.label}>New password</label>
          <input style={s.input} type="password" placeholder="Min 8 characters" required
            value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <div style={s.fieldGroup}>
          <label style={s.label}>Confirm password</label>
          <input style={s.input} type="password" placeholder="Repeat password" required
            value={confirm} onChange={e => setConfirm(e.target.value)} />
        </div>

        {error && <div style={s.errorBox}>{error}</div>}
        {msg && <div style={s.successBox}>{msg}</div>}

        {!msg && (
          <button type="submit" style={s.btn} disabled={loading}>
            {loading ? <span className="spin" style={s.spinner} /> : null}
            {loading ? 'Saving…' : 'Update password'}
          </button>
        )}
        <p style={s.foot}>
          <Link to="/" style={{ color: T.primaryHov }}>← Back to sign in</Link>
        </p>
      </form>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh',
    background: 'radial-gradient(ellipse at 60% 10%, rgba(99,102,241,0.12) 0%, transparent 60%), #09090f',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden',
  },
  glow: {
    position: 'absolute', top: '-20%', right: '-10%',
    width: 600, height: 600,
    background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  card: {
    background: 'rgba(17,17,36,0.9)',
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(20px)',
    borderRadius: 16, padding: '40px 36px', width: 400,
    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
    position: 'relative', zIndex: 1,
  },
  brand: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 },
  logoMark: {
    width: 36, height: 36, borderRadius: 10,
    background: 'linear-gradient(135deg, #6366f1, #818cf8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 800, fontSize: 18,
    boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
  },
  logoText: { fontSize: 20, fontWeight: 700, color: T.text },
  heading: { margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: T.text },
  sub: { margin: '0 0 24px', fontSize: 13, color: T.textSub },
  fieldGroup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: T.textSub, marginBottom: 6 },
  input: {
    width: '100%', padding: '11px 14px', borderRadius: 8, fontSize: 14,
    background: T.surface, border: '1px solid rgba(255,255,255,0.1)',
    color: T.text, outline: 'none', boxSizing: 'border-box',
  },
  errorBox: {
    background: T.errorDim, border: '1px solid rgba(239,68,68,0.25)',
    color: T.error, borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16,
  },
  successBox: {
    background: T.successDim, border: '1px solid rgba(34,197,94,0.25)',
    color: T.success, borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16,
  },
  btn: {
    width: '100%', padding: 13, marginTop: 4,
    background: 'linear-gradient(135deg, #6366f1, #818cf8)',
    color: '#fff', border: 'none', borderRadius: 8,
    fontSize: 15, fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  spinner: { width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' },
  foot: { textAlign: 'center', marginTop: 20, fontSize: 13, color: T.textMuted },
};

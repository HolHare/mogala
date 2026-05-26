import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { request } from '../api';
import { T } from '../theme';

export default function Login() {
  const [form, setForm] = useState({ domain: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e?.preventDefault();
    setError(''); setLoading(true);
    const data = await request('/auth/login', { method: 'POST', body: JSON.stringify(form) });
    setLoading(false);
    if (data.token) {
      localStorage.setItem('token', data.token);
      navigate('/dashboard');
    } else {
      setError('Invalid domain, email or password');
    }
  };

  return (
    <div style={s.page}>
      <div style={s.glow} />
      <form style={s.card} onSubmit={submit} className="fade-up">
        <div style={s.brand}>
          <div style={s.logoMark}>M</div>
          <span style={s.logoText}>Mogala</span>
        </div>
        <h2 style={s.heading}>Welcome back</h2>
        <p style={s.sub}>Sign in to your workspace</p>

        <div style={s.fieldGroup}>
          <label style={s.label}>Company Domain</label>
          <input style={s.input} placeholder="e.g. acme"
            value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })} />
        </div>
        <div style={s.fieldGroup}>
          <label style={s.label}>Email address</label>
          <input style={s.input} type="email" placeholder="you@company.com"
            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>
        <div style={s.fieldGroup}>
          <label style={s.label}>Password</label>
          <input style={s.input} type="password" placeholder="••••••••"
            value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        </div>

        {error && <div style={s.errorBox}>{error}</div>}

        <button type="submit" style={s.btn} disabled={loading}>
          {loading ? <span className="spin" style={s.spinner} /> : null}
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p style={s.foot}>
          No account? <Link to="/register" style={{ color: T.primaryHov }}>Create one</Link>
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
    borderRadius: 16,
    padding: '40px 36px',
    width: 400,
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
  heading: { margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: T.text },
  sub: { margin: '0 0 28px', fontSize: 14, color: T.textSub },
  fieldGroup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: T.textSub, marginBottom: 6 },
  input: {
    width: '100%', padding: '11px 14px', borderRadius: 8, fontSize: 14,
    background: T.surface, border: '1px solid rgba(255,255,255,0.1)',
    color: T.text, outline: 'none', boxSizing: 'border-box',
  },
  errorBox: {
    background: T.errorDim, border: '1px solid rgba(239,68,68,0.25)',
    color: T.error, borderRadius: 8, padding: '10px 14px',
    fontSize: 13, marginBottom: 16,
  },
  btn: {
    width: '100%', padding: 13, marginTop: 4,
    background: 'linear-gradient(135deg, #6366f1, #818cf8)',
    color: '#fff', border: 'none', borderRadius: 8,
    fontSize: 15, fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    transition: 'opacity 0.15s',
  },
  spinner: { width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' },
  foot: { textAlign: 'center', marginTop: 20, fontSize: 13, color: T.textMuted },
};

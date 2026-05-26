import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { request } from '../api';
import { T } from '../theme';

export default function Register() {
  const [form, setForm] = useState({ first_name: '', last_name: '', company_name: '', domain: '', email: '', password: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e?.preventDefault();
    setError(''); setMsg(''); setLoading(true);
    const data = await request('/auth/register', { method: 'POST', body: JSON.stringify(form) });
    setLoading(false);
    if (data.message) {
      setMsg('Account created! Redirecting…');
      setTimeout(() => navigate('/'), 2000);
    } else {
      setError(data.error || 'Registration failed. Domain may already be taken.');
    }
  };

  const f = (key) => ({ value: form[key], onChange: e => setForm({ ...form, [key]: e.target.value }) });

  return (
    <div style={s.page}>
      <div style={s.glow} />
      <form style={s.card} onSubmit={submit} className="fade-up">
        <div style={s.brand}>
          <div style={s.logoMark}>M</div>
          <span style={s.logoText}>Mogala</span>
        </div>
        <h2 style={s.heading}>Create your workspace</h2>
        <p style={s.sub}>Start your free VoIP account today</p>

        <div style={s.row2}>
          <Field label="First name" placeholder="Alice" {...f('first_name')} />
          <Field label="Last name" placeholder="Smith" {...f('last_name')} />
        </div>
        <Field label="Company name" placeholder="Acme Corp" {...f('company_name')} />
        <Field label="Domain" placeholder="acme  (used to sign in)" {...f('domain')} />
        <Field label="Work email" type="email" placeholder="alice@acme.com" {...f('email')} />
        <Field label="Password" type="password" placeholder="Min 8 characters" {...f('password')} />

        {error && <div style={s.errorBox}>{error}</div>}
        {msg && <div style={s.successBox}>{msg}</div>}

        <button type="submit" style={s.btn} disabled={loading}>
          {loading ? <span className="spin" style={s.spinner} /> : null}
          {loading ? 'Creating account…' : 'Create account'}
        </button>
        <p style={s.foot}>
          Already have an account? <Link to="/" style={{ color: T.primaryHov }}>Sign in</Link>
        </p>
      </form>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: T.textSub, marginBottom: 6 }}>{label}</label>
      <input style={{
        width: '100%', padding: '11px 14px', borderRadius: 8, fontSize: 14,
        background: T.surface, border: '1px solid rgba(255,255,255,0.1)',
        color: T.text, outline: 'none', boxSizing: 'border-box',
      }} {...props} />
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh',
    background: 'radial-gradient(ellipse at 40% 90%, rgba(99,102,241,0.1) 0%, transparent 60%), #09090f',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '40px 16px', position: 'relative', overflow: 'hidden',
  },
  glow: {
    position: 'absolute', bottom: '-20%', left: '-10%',
    width: 600, height: 600,
    background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  card: {
    background: 'rgba(17,17,36,0.9)',
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(20px)',
    borderRadius: 16, padding: '40px 36px', width: 480,
    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
    position: 'relative', zIndex: 1,
  },
  brand: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 },
  logoMark: {
    width: 36, height: 36, borderRadius: 10,
    background: 'linear-gradient(135deg, #6366f1, #818cf8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 800, fontSize: 18,
    boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
  },
  logoText: { fontSize: 20, fontWeight: 700, color: T.text },
  heading: { margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: T.text },
  sub: { margin: '0 0 24px', fontSize: 14, color: T.textSub },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  errorBox: {
    background: T.errorDim, border: '1px solid rgba(239,68,68,0.25)',
    color: T.error, borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 12,
  },
  successBox: {
    background: T.successDim, border: '1px solid rgba(34,197,94,0.25)',
    color: T.success, borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 12,
  },
  btn: {
    width: '100%', padding: 13, marginTop: 8,
    background: 'linear-gradient(135deg, #6366f1, #818cf8)',
    color: '#fff', border: 'none', borderRadius: 8,
    fontSize: 15, fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  spinner: { width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' },
  foot: { textAlign: 'center', marginTop: 20, fontSize: 13, color: T.textMuted },
};

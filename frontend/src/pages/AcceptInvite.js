import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { request } from '../api';
import { T } from '../theme';

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [info, setInfo] = useState(null);
  const [infoError, setInfoError] = useState('');
  const [form, setForm] = useState({ first_name: '', last_name: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    request(`/auth/invite-info?token=${token}`)
      .then(d => {
        if (d.error) setInfoError(d.error);
        else setInfo(d);
      })
      .catch(() => setInfoError('Failed to load invite details.'));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const data = await request('/auth/accept-invite', {
      method: 'POST',
      body: JSON.stringify({ token, password: form.password, first_name: form.first_name, last_name: form.last_name }),
    });
    setLoading(false);
    if (data.message) {
      setDone(true);
      setTimeout(() => navigate('/'), 2500);
    } else {
      setError(data.error || 'Failed to accept invite. The link may have expired.');
    }
  };

  if (!token) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <p style={{ color: T.error, textAlign: 'center' }}>Invalid invite link.</p>
          <p style={s.foot}><Link to="/" style={{ color: T.primaryHov }}>Go to sign in</Link></p>
        </div>
      </div>
    );
  }

  if (infoError) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.brand}>
            <div style={s.logoMark}>M</div>
            <span style={s.logoText}>Mogala</span>
          </div>
          <div style={s.errorBox}>{infoError}</div>
          <p style={s.foot}><Link to="/" style={{ color: T.primaryHov }}>Go to sign in</Link></p>
        </div>
      </div>
    );
  }

  if (!info) {
    return (
      <div style={s.page}>
        <div style={{ ...s.card, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="spin" style={spinner} />
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div style={s.page}>
        <div style={s.glow} />
        <div style={s.card} className="fade-up">
          <div style={s.brand}>
            <div style={s.logoMark}>M</div>
            <span style={s.logoText}>Mogala</span>
          </div>
          <div style={s.successBox}>Account activated! Redirecting to sign in…</div>
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

        <div style={s.welcomeBox}>
          <p style={s.welcomeTitle}>Welcome to {info.company_name}</p>
          <p style={s.welcomeSub}>You've been invited as a <strong style={{ color: T.primary }}>{info.role}</strong></p>
        </div>

        <h2 style={s.heading}>Set up your account</h2>
        <p style={s.sub}>Complete your profile and choose a password.</p>

        <div style={s.row2}>
          <div style={s.fieldGroup}>
            <label style={s.label}>First name</label>
            <input style={s.input} placeholder={info.first_name || 'Alice'}
              value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label}>Last name</label>
            <input style={s.input} placeholder={info.last_name || 'Smith'}
              value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
          </div>
        </div>

        <div style={s.fieldGroup}>
          <label style={s.label}>Password</label>
          <input style={s.input} type="password" placeholder="Min 8 characters" required
            value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        </div>
        <div style={s.fieldGroup}>
          <label style={s.label}>Confirm password</label>
          <input style={s.input} type="password" placeholder="Repeat password" required
            value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} />
        </div>

        {error && <div style={s.errorBox}>{error}</div>}

        <button type="submit" style={s.btn} disabled={loading}>
          {loading ? <span className="spin" style={spinnerSm} /> : null}
          {loading ? 'Activating…' : 'Activate account'}
        </button>

        <p style={s.foot}>
          Already have an account? <Link to="/" style={{ color: T.primaryHov }}>Sign in</Link>
        </p>
      </form>
    </div>
  );
}

const spinner = { width: 32, height: 32, border: '3px solid rgba(99,102,241,0.2)', borderTopColor: T.primary, borderRadius: '50%', display: 'inline-block' };
const spinnerSm = { width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' };

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
    borderRadius: 16, padding: '40px 36px', width: 440,
    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
    position: 'relative', zIndex: 1,
  },
  brand: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 },
  logoMark: {
    width: 36, height: 36, borderRadius: 10,
    background: 'linear-gradient(135deg, #6366f1, #818cf8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 800, fontSize: 18,
    boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
  },
  logoText: { fontSize: 20, fontWeight: 700, color: T.text },
  welcomeBox: {
    background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: 10, padding: '12px 16px', marginBottom: 20,
  },
  welcomeTitle: { margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: T.text },
  welcomeSub: { margin: 0, fontSize: 13, color: T.textSub },
  heading: { margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: T.text },
  sub: { margin: '0 0 20px', fontSize: 13, color: T.textSub },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
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
  foot: { textAlign: 'center', marginTop: 20, fontSize: 13, color: T.textMuted },
};

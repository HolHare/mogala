import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { request } from '../api';
import { T } from '../theme';

export default function Register() {
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState('');
  const [form, setForm] = useState({ first_name: '', last_name: '', company_name: '', domain: '', email: '', phone: '', password: '' });
  const [otp, setOtp] = useState('');
  const [phoneSent, setPhoneSent] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const f = (key) => ({ value: form[key], onChange: e => setForm({ ...form, [key]: e.target.value }) });

  const submitForm = async (e) => {
    e?.preventDefault();
    setError(''); setLoading(true);
    const data = await request('/auth/register', { method: 'POST', body: JSON.stringify(form) });
    setLoading(false);
    if (data.user_id) {
      setUserId(data.user_id);
      setStep(2);
    } else {
      setError(data.error || 'Registration failed. Domain may already be taken.');
    }
  };

  const verifyEmail = async (e) => {
    e?.preventDefault();
    setError(''); setLoading(true);
    const data = await request('/auth/verify-email', { method: 'POST', body: JSON.stringify({ user_id: userId, otp }) });
    setLoading(false);
    if (data.verified) {
      setOtp('');
      setStep(3);
    } else {
      setError(data.error || 'Invalid code. Try again.');
    }
  };

  const resendEmailOTP = async () => {
    setError(''); setMsg(''); setLoading(true);
    await request('/auth/resend-email-otp', { method: 'POST', body: JSON.stringify({ user_id: userId }) });
    setLoading(false);
    setMsg('New code sent — check your inbox.');
  };

  const sendPhoneOTP = async () => {
    setError(''); setLoading(true);
    const data = await request('/auth/send-phone-otp', { method: 'POST', body: JSON.stringify({ user_id: userId }) });
    setLoading(false);
    if (data.sent) {
      setPhoneSent(true);
    } else {
      setError(data.error || 'Failed to send code.');
    }
  };

  const verifyPhone = async (e) => {
    e?.preventDefault();
    setError(''); setLoading(true);
    const data = await request('/auth/verify-phone', { method: 'POST', body: JSON.stringify({ user_id: userId, otp }) });
    setLoading(false);
    if (data.verified) {
      setMsg('All verified! Redirecting to sign in…');
      setTimeout(() => navigate('/'), 2000);
    } else {
      setError(data.error || 'Invalid code. Try again.');
    }
  };

  return (
    <div style={s.page}>
      <div style={s.glow} />
      <div style={s.card} className="fade-up">
        <div style={s.brand}>
          <div style={s.logoMark}>M</div>
          <span style={s.logoText}>Mogala</span>
        </div>

        {step === 1 && (
          <form onSubmit={submitForm}>
            <h2 style={s.heading}>Create your workspace</h2>
            <p style={s.sub}>Start your free VoIP account today</p>
            <div style={s.row2}>
              <Field label="First name" placeholder="Alice" {...f('first_name')} />
              <Field label="Last name" placeholder="Smith" {...f('last_name')} />
            </div>
            <Field label="Company name" placeholder="Acme Corp" {...f('company_name')} />
            <Field label="Domain" placeholder="acme  (used to sign in)" {...f('domain')} />
            <Field label="Work email" type="email" placeholder="alice@acme.com" {...f('email')} />
            <Field label="Phone number" type="tel" placeholder="+27 82 123 4567" {...f('phone')} />
            <Field label="Password" type="password" placeholder="Min 8 characters" {...f('password')} />
            {error && <div style={s.errorBox}>{error}</div>}
            <button type="submit" style={s.btn} disabled={loading}>
              {loading ? <span className="spin" style={s.spinner} /> : null}
              {loading ? 'Creating account…' : 'Create account'}
            </button>
            <p style={s.foot}>Already have an account? <Link to="/" style={{ color: T.primaryHov }}>Sign in</Link></p>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={verifyEmail}>
            <h2 style={s.heading}>Verify your email</h2>
            <p style={s.sub}>We sent a 6-digit code to <strong style={{ color: T.text }}>{form.email}</strong>. Enter it below.</p>
            <OTPInput value={otp} onChange={setOtp} />
            {error && <div style={s.errorBox}>{error}</div>}
            {msg && <div style={s.successBox}>{msg}</div>}
            <button type="submit" style={s.btn} disabled={loading || otp.length !== 6}>
              {loading ? <span className="spin" style={s.spinner} /> : null}
              {loading ? 'Verifying…' : 'Verify email'}
            </button>
            <p style={s.foot}>
              Didn't get it?{' '}
              <button type="button" onClick={resendEmailOTP} style={s.linkBtn} disabled={loading}>Resend code</button>
            </p>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={phoneSent ? verifyPhone : undefined}>
            <h2 style={s.heading}>Verify your phone</h2>
            {!phoneSent ? (
              <>
                <p style={s.sub}>We'll send a verification code to <strong style={{ color: T.text }}>{form.phone}</strong>.</p>
                {error && <div style={s.errorBox}>{error}</div>}
                <button type="button" style={s.btn} onClick={sendPhoneOTP} disabled={loading}>
                  {loading ? <span className="spin" style={s.spinner} /> : null}
                  {loading ? 'Sending…' : 'Send verification code'}
                </button>
              </>
            ) : (
              <>
                <p style={s.sub}>Enter the 6-digit code sent to <strong style={{ color: T.text }}>{form.phone}</strong>.</p>
                <OTPInput value={otp} onChange={setOtp} />
                {error && <div style={s.errorBox}>{error}</div>}
                {msg && <div style={s.successBox}>{msg}</div>}
                <button type="submit" style={s.btn} disabled={loading || otp.length !== 6}>
                  {loading ? <span className="spin" style={s.spinner} /> : null}
                  {loading ? 'Verifying…' : 'Verify phone'}
                </button>
                <p style={s.foot}>
                  Didn't get it?{' '}
                  <button type="button" onClick={sendPhoneOTP} style={s.linkBtn} disabled={loading}>Resend code</button>
                </p>
              </>
            )}
          </form>
        )}

        <StepDots step={step} />
      </div>
    </div>
  );
}

function OTPInput({ value, onChange }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        placeholder="••••••"
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        style={{
          width: '100%', padding: '16px 14px', borderRadius: 8, fontSize: 28,
          fontWeight: 700, letterSpacing: 12, textAlign: 'center',
          background: T.surface, border: `2px solid ${T.primary}`,
          color: T.text, outline: 'none', boxSizing: 'border-box',
        }}
        autoFocus
      />
    </div>
  );
}

function StepDots({ step }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
      {[1, 2, 3].map(n => (
        <div key={n} style={{
          width: n === step ? 20 : 8, height: 8, borderRadius: 4,
          background: n <= step ? T.primary : 'rgba(255,255,255,0.15)',
          transition: 'all 0.3s',
        }} />
      ))}
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
  foot: { textAlign: 'center', marginTop: 16, fontSize: 13, color: T.textMuted },
  linkBtn: { background: 'none', border: 'none', color: T.primaryHov, cursor: 'pointer', fontSize: 13, padding: 0 },
};

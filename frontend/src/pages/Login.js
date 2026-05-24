import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { request } from '../api';

export default function Login() {
  const [form, setForm] = useState({ domain: '', email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = async () => {
    setError('');
    const data = await request('/auth/login', { method: 'POST', body: JSON.stringify(form) });
    if (data.token) {
      localStorage.setItem('token', data.token);
      navigate('/dashboard');
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>📞</div>
        <h1 style={s.title}>Mogala</h1>
        <p style={s.sub}>VoIP Management Platform</p>
        <input style={s.input} placeholder="Company Domain" onChange={e => setForm({...form, domain: e.target.value})} />
        <input style={s.input} placeholder="Email" type="email" onChange={e => setForm({...form, email: e.target.value})} />
        <input style={s.input} placeholder="Password" type="password" onChange={e => setForm({...form, password: e.target.value})} />
        {error && <p style={s.error}>{error}</p>}
        <button style={s.btn} onClick={submit}>Sign In</button>
        <p style={s.switch}>Don't have an account? <Link to="/register">Register</Link></p>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  card: { background: '#fff', borderRadius: 16, padding: 40, width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  logo: { textAlign: 'center', fontSize: 48, marginBottom: 8 },
  title: { textAlign: 'center', margin: 0, color: '#1a1a2e', fontSize: 28, fontWeight: 700 },
  sub: { textAlign: 'center', color: '#888', marginBottom: 32, marginTop: 4 },
  input: { width: '100%', padding: '12px 16px', margin: '8px 0', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', outline: 'none' },
  btn: { width: '100%', padding: 14, background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: 'pointer', marginTop: 16 },
  error: { color: '#e53e3e', textAlign: 'center', fontSize: 14 },
  switch: { textAlign: 'center', marginTop: 16, fontSize: 14, color: '#666' }
};

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { request } from '../api';

export default function Register() {
  const [form, setForm] = useState({ first_name: '', last_name: '', company_name: '', domain: '', email: '', password: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = async () => {
    setError(''); setMsg('');
    const data = await request('/auth/register', { method: 'POST', body: JSON.stringify(form) });
    if (data.message) {
      setMsg('Account created! Redirecting...');
      setTimeout(() => navigate('/'), 2000);
    } else {
      setError(data.error || 'Registration failed');
    }
  };

  const fields = [
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { key: 'company_name', label: 'Company Name' },
    { key: 'domain', label: 'Domain (e.g. mycompany)' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'password', label: 'Password', type: 'password' },
  ];

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>📞</div>
        <h1 style={s.title}>Get Started</h1>
        <p style={s.sub}>Create your Mogala account</p>
        {fields.map(f => (
          <input key={f.key} style={s.input} placeholder={f.label} type={f.type || 'text'}
            onChange={e => setForm({...form, [f.key]: e.target.value})} />
        ))}
        {error && <p style={s.error}>{error}</p>}
        {msg && <p style={s.success}>{msg}</p>}
        <button style={s.btn} onClick={submit}>Create Account</button>
        <p style={s.switch}>Already have an account? <Link to="/">Sign In</Link></p>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  card: { background: '#fff', borderRadius: 16, padding: 40, width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  logo: { textAlign: 'center', fontSize: 48, marginBottom: 8 },
  title: { textAlign: 'center', margin: 0, color: '#1a1a2e', fontSize: 28, fontWeight: 700 },
  sub: { textAlign: 'center', color: '#888', marginBottom: 24, marginTop: 4 },
  input: { width: '100%', padding: '12px 16px', margin: '6px 0', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' },
  btn: { width: '100%', padding: 14, background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: 'pointer', marginTop: 16 },
  error: { color: '#e53e3e', textAlign: 'center', fontSize: 14 },
  success: { color: '#38a169', textAlign: 'center', fontSize: 14 },
  switch: { textAlign: 'center', marginTop: 16, fontSize: 14, color: '#666' }
};

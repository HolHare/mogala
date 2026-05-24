import { useState } from 'react';

const API = 'http://173.249.4.136:8080';

function Register({ onSwitch }) {
  const [form, setForm] = useState({ company_name: '', domain: '', email: '', password: '', first_name: '', last_name: '' });
  const [msg, setMsg] = useState('');

  const submit = async () => {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const data = await res.json();
    setMsg(data.message || data.error || JSON.stringify(data));
  };

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>Create Account</h2>
      {['first_name','last_name','company_name','domain','email','password'].map(f => (
        <input key={f} style={styles.input} placeholder={f.replace('_',' ')}
          type={f === 'password' ? 'password' : 'text'}
          onChange={e => setForm({...form, [f]: e.target.value})} />
      ))}
      <button style={styles.btn} onClick={submit}>Register</button>
      {msg && <p style={styles.msg}>{msg}</p>}
      <p style={styles.link} onClick={onSwitch}>Already have an account? Login</p>
    </div>
  );
}

function Login({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '', domain: '' });
  const [msg, setMsg] = useState('');

  const submit = async () => {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('token', data.token);
      onLogin(data.token);
    } else {
      setMsg('Invalid credentials');
    }
  };

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>Mogala</h2>
      <p style={styles.sub}>VoIP Management Platform</p>
      {['domain','email','password'].map(f => (
        <input key={f} style={styles.input} placeholder={f}
          type={f === 'password' ? 'password' : 'text'}
          onChange={e => setForm({...form, [f]: e.target.value})} />
      ))}
      <button style={styles.btn} onClick={submit}>Login</button>
      {msg && <p style={styles.msg}>{msg}</p>}
    </div>
  );
}

function Dashboard({ token, onLogout }) {
  const [user, setUser] = useState(null);

  const load = async () => {
    const res = await fetch(`${API}/api/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setUser(data);
  };

  if (!user) load();

  return (
    <div style={styles.dashboard}>
      <div style={styles.topbar}>
        <h2 style={{margin:0}}>Mogala Dashboard</h2>
        <button style={styles.logoutBtn} onClick={onLogout}>Logout</button>
      </div>
      {user && (
        <div style={styles.card}>
          <h3>Welcome, {user.firstName} {user.lastName}</h3>
          <p>Email: {user.email}</p>
          <p>Role: <span style={styles.badge}>{user.role}</span></p>
          <p>Tenant ID: {user.tenant_id}</p>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState('login');
  const [token, setToken] = useState(localStorage.getItem('token'));

  const logout = () => { localStorage.removeItem('token'); setToken(null); };

  if (token) return <Dashboard token={token} onLogout={logout} />;
  if (page === 'register') return <Register onSwitch={() => setPage('login')} />;
  return <Login onLogin={setToken} />;
}

const styles = {
  card: { maxWidth: 400, margin: '100px auto', padding: 32, background: '#fff', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.1)' },
  title: { textAlign: 'center', marginBottom: 4, color: '#1a1a2e' },
  sub: { textAlign: 'center', color: '#666', marginBottom: 24 },
  input: { width: '100%', padding: '12px 16px', margin: '8px 0', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' },
  btn: { width: '100%', padding: 14, background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, cursor: 'pointer', marginTop: 8 },
  msg: { textAlign: 'center', color: '#e53e3e', marginTop: 8 },
  link: { textAlign: 'center', color: '#4f46e5', cursor: 'pointer', marginTop: 16 },
  dashboard: { padding: 24, background: '#f7f8fc', minHeight: '100vh' },
  topbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '16px 24px', borderRadius: 12, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  logoutBtn: { padding: '8px 16px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' },
  badge: { background: '#4f46e5', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 12 }
};

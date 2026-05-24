import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { request } from '../api';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    request('/api/me').then(data => {
      if (data.error) { localStorage.removeItem('token'); navigate('/'); }
      else setUser(data);
    });
  }, [navigate]);

  const logout = () => { localStorage.removeItem('token'); navigate('/'); };

  if (!user) return <div style={s.loading}>Loading...</div>;

  return (
    <div style={s.page}>
      <div style={s.sidebar}>
        <div style={s.logo}>📞 Mogala</div>
        <nav>
          {['Dashboard', 'Extensions', 'Phone Numbers', 'Call Logs', 'Users', 'Settings'].map(item => (
            <div key={item} style={s.navItem}>{item}</div>
          ))}
        </nav>
        <button style={s.logoutBtn} onClick={logout}>Logout</button>
      </div>
      <div style={s.main}>
        <div style={s.topbar}>
          <h2 style={{margin:0}}>Dashboard</h2>
          <div style={s.userInfo}>
            <span style={s.badge}>{user.role}</span>
            <span>{user.firstName} {user.lastName}</span>
          </div>
        </div>
        <div style={s.grid}>
          {[
            { label: 'Extensions', value: '0', icon: '📱' },
            { label: 'Phone Numbers', value: '0', icon: '☎️' },
            { label: 'Active Calls', value: '0', icon: '🔴' },
            { label: 'Call Logs', value: '0', icon: '📋' },
          ].map(card => (
            <div key={card.label} style={s.statCard}>
              <div style={s.statIcon}>{card.icon}</div>
              <div style={s.statValue}>{card.value}</div>
              <div style={s.statLabel}>{card.label}</div>
            </div>
          ))}
        </div>
        <div style={s.infoCard}>
          <h3>Account Info</h3>
          <p>Email: {user.email}</p>
          <p>Tenant ID: {user.tenant_id}</p>
          <p>Role: {user.role}</p>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { display: 'flex', minHeight: '100vh', background: '#f7f8fc' },
  sidebar: { width: 240, background: '#1a1a2e', color: '#fff', padding: 24, display: 'flex', flexDirection: 'column' },
  logo: { fontSize: 20, fontWeight: 700, marginBottom: 40 },
  navItem: { padding: '12px 16px', borderRadius: 8, cursor: 'pointer', marginBottom: 4, color: '#a0aec0', fontSize: 14 },
  logoutBtn: { marginTop: 'auto', padding: '10px 16px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' },
  main: { flex: 1, padding: 32 },
  topbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  userInfo: { display: 'flex', alignItems: 'center', gap: 12 },
  badge: { background: '#4f46e5', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 12 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
  statCard: { background: '#fff', borderRadius: 12, padding: 24, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  statIcon: { fontSize: 32, marginBottom: 8 },
  statValue: { fontSize: 32, fontWeight: 700, color: '#1a1a2e' },
  statLabel: { color: '#888', fontSize: 14, marginTop: 4 },
  infoCard: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontSize: 18 }
};

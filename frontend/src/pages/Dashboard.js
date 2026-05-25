import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { request } from '../api';
import Softphone from '../components/Softphone';
import CallLogs from './CallLogs';
import PhoneNumbers from './PhoneNumbers';
import Users from './Users';
import Trunks from './Trunks';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [myExtension, setMyExtension] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    request('/api/me').then(data => {
      if (data.error) { localStorage.removeItem('token'); navigate('/'); }
      else setUser(data);
    });
    request('/api/users/my-extension').then(data => {
      if (data && data.id) setMyExtension(data);
    });
  }, [navigate]);

  const logout = () => { localStorage.removeItem('token'); navigate('/'); };

  if (!user) return <div style={s.loading}>Loading...</div>;

  const isAdmin = user.role === 'admin' || user.role === 'superadmin';

  const navItems = [
    { label: 'Dashboard', icon: '🏠', key: 'dashboard' },
    { label: 'Extensions', icon: '📱', key: 'extensions' },
    { label: 'Phone Numbers', icon: '☎️', key: 'numbers' },
    { label: 'Call Logs', icon: '📋', key: 'calllogs' },
    ...(isAdmin ? [
      { label: 'Users', icon: '👥', key: 'users' },
      { label: 'SIP Trunks', icon: '🔗', key: 'trunks' },
    ] : []),
    { label: 'Settings', icon: '⚙️', key: 'settings' },
  ];

  return (
    <div style={s.page}>
      <div style={s.sidebar}>
        <div style={s.logo}>📞 Mogala</div>
        <nav>
          {navItems.map(item => (
            <div key={item.key}
              style={{ ...s.navItem, ...(page === item.key ? s.navActive : {}) }}
              onClick={() => setPage(item.key)}>
              {item.icon} {item.label}
            </div>
          ))}
        </nav>
        {myExtension && (
          <div style={{ marginTop: 'auto', marginBottom: 16 }}>
            <Softphone
              extension={myExtension.extension}
              sipPassword={myExtension.sip_password}
            />
          </div>
        )}
        <button style={s.logoutBtn} onClick={logout}>Logout</button>
      </div>
      <div style={s.main}>
        <div style={s.topbar}>
          <h2 style={{ margin: 0 }}>
            {navItems.find(n => n.key === page)?.label || page}
          </h2>
          <div style={s.userInfo}>
            <span style={s.badge}>{user.role}</span>
            <span>{user.firstName} {user.lastName}</span>
          </div>
        </div>
        {page === 'dashboard' && <DashboardHome />}
        {page === 'extensions' && <Extensions />}
        {page === 'calllogs' && <CallLogs />}
        {page === 'numbers' && <PhoneNumbers />}
        {page === 'users' && <Users />}
        {page === 'trunks' && <Trunks />}
        {page === 'settings' && <Settings />}
      </div>
    </div>
  );
}

function DashboardHome() {
  const [stats, setStats] = useState({ extensions: 0, numbers: 0, callLogs: 0 });

  useEffect(() => {
    request('/api/extensions').then(d => setStats(p => ({ ...p, extensions: Array.isArray(d) ? d.length : 0 })));
    request('/api/phone-numbers').then(d => setStats(p => ({ ...p, numbers: Array.isArray(d) ? d.length : 0 })));
    request('/api/call-logs').then(d => setStats(p => ({ ...p, callLogs: Array.isArray(d) ? d.length : 0 })));
  }, []);

  return (
    <div style={s.grid}>
      {[
        { label: 'Extensions', value: stats.extensions, icon: '📱' },
        { label: 'Phone Numbers', value: stats.numbers, icon: '☎️' },
        { label: 'Active Calls', value: 0, icon: '🔴' },
        { label: 'Call Logs', value: stats.callLogs, icon: '📋' },
      ].map(card => (
        <div key={card.label} style={s.statCard}>
          <div style={s.statIcon}>{card.icon}</div>
          <div style={s.statValue}>{card.value}</div>
          <div style={s.statLabel}>{card.label}</div>
        </div>
      ))}
    </div>
  );
}

function Extensions() {
  const [extensions, setExtensions] = useState([]);
  const [form, setForm] = useState({ extension: '' });
  const [msg, setMsg] = useState('');

  const load = () => request('/api/extensions').then(setExtensions);
  useEffect(() => { load(); }, []);

  const create = async () => {
    const data = await request('/api/extensions', { method: 'POST', body: JSON.stringify(form) });
    if (data.id) { setMsg('Extension created!'); load(); setForm({ extension: '' }); }
    else setMsg(data.error || 'Failed');
  };

  const remove = async (id) => {
    await request(`/api/extensions?id=${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <div style={s.formCard}>
        <h3 style={{ marginTop: 0 }}>Create Extension</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          <input style={s.input} placeholder="Extension number (e.g. 1001)"
            value={form.extension}
            onChange={e => setForm({ extension: e.target.value })} />
          <button style={s.btn} onClick={create}>Create</button>
        </div>
        {msg && <p style={{ color: '#38a169', marginTop: 8 }}>{msg}</p>}
      </div>
      <div style={s.tableCard}>
        <h3 style={{ marginTop: 0 }}>Extensions</h3>
        {extensions.length === 0 ? (
          <p style={{ color: '#888' }}>No extensions yet</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f7f8fc' }}>
                {['Extension', 'SIP Password', 'Assigned To', 'Actions'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {extensions.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={s.td}><strong>{e.extension}</strong></td>
                  <td style={s.td}><code>{e.sip_password}</code></td>
                  <td style={s.td}>{e.first_name ? `${e.first_name} ${e.last_name}` : 'Unassigned'}</td>
                  <td style={s.td}>
                    <button style={s.deleteBtn} onClick={() => remove(e.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Settings() {
  return (
    <div style={{ ...s.tableCard, textAlign: 'center', padding: 60 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚙️</div>
      <h3>Settings</h3>
      <p style={{ color: '#888' }}>Tenant settings coming soon</p>
    </div>
  );
}

const s = {
  page: { display: 'flex', minHeight: '100vh', background: '#f7f8fc' },
  sidebar: { width: 280, background: '#1a1a2e', color: '#fff', padding: 24, display: 'flex', flexDirection: 'column' },
  logo: { fontSize: 20, fontWeight: 700, marginBottom: 40 },
  navItem: { padding: '12px 16px', borderRadius: 8, cursor: 'pointer', marginBottom: 4, color: '#a0aec0', fontSize: 14 },
  navActive: { background: '#4f46e5', color: '#fff' },
  logoutBtn: { padding: '10px 16px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' },
  main: { flex: 1, padding: 32 },
  topbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  userInfo: { display: 'flex', alignItems: 'center', gap: 12 },
  badge: { background: '#4f46e5', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 12 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 },
  statCard: { background: '#fff', borderRadius: 12, padding: 24, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  statIcon: { fontSize: 32, marginBottom: 8 },
  statValue: { fontSize: 32, fontWeight: 700, color: '#1a1a2e' },
  statLabel: { color: '#888', fontSize: 14, marginTop: 4 },
  formCard: { background: '#fff', borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  tableCard: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  input: { flex: 1, padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 },
  btn: { padding: '12px 24px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  deleteBtn: { padding: '6px 12px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#666' },
  td: { padding: '12px 16px', fontSize: 14 },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontSize: 18 },
};

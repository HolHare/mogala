import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { request } from '../api';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('dashboard');
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
          {[
            { label: 'Dashboard', icon: '🏠', key: 'dashboard' },
            { label: 'Extensions', icon: '📱', key: 'extensions' },
            { label: 'Phone Numbers', icon: '☎️', key: 'numbers' },
            { label: 'Call Logs', icon: '📋', key: 'calllogs' },
            { label: 'Users', icon: '👥', key: 'users' },
            { label: 'Settings', icon: '⚙️', key: 'settings' },
          ].map(item => (
            <div key={item.key} style={{...s.navItem, ...(page === item.key ? s.navActive : {})}}
              onClick={() => setPage(item.key)}>
              {item.icon} {item.label}
            </div>
          ))}
        </nav>
        <button style={s.logoutBtn} onClick={logout}>Logout</button>
      </div>
      <div style={s.main}>
        <div style={s.topbar}>
          <h2 style={{margin:0}}>{page.charAt(0).toUpperCase() + page.slice(1)}</h2>
          <div style={s.userInfo}>
            <span style={s.badge}>{user.role}</span>
            <span>{user.firstName} {user.lastName}</span>
          </div>
        </div>
        {page === 'dashboard' && <DashboardHome />}
        {page === 'extensions' && <Extensions />}
        {!['dashboard','extensions'].includes(page) && (
          <div style={s.comingSoon}>🚧 Coming Soon</div>
        )}
      </div>
    </div>
  );
}

function DashboardHome() {
  return (
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
    else setMsg('Failed to create extension');
  };

  const remove = async (id) => {
    await request(`/api/extensions?id=${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <div style={s.formCard}>
        <h3 style={{marginTop:0}}>Create Extension</h3>
        <div style={{display:'flex', gap:12}}>
          <input style={s.input} placeholder="Extension number (e.g. 1001)"
            value={form.extension}
            onChange={e => setForm({extension: e.target.value})} />
          <button style={s.btn} onClick={create}>Create</button>
        </div>
        {msg && <p style={{color:'#38a169', marginTop:8}}>{msg}</p>}
      </div>
      <div style={s.tableCard}>
        <h3 style={{marginTop:0}}>Extensions</h3>
        {extensions.length === 0 ? (
          <p style={{color:'#888'}}>No extensions yet</p>
        ) : (
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#f7f8fc'}}>
                {['Extension','SIP Password','Assigned To','Actions'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {extensions.map(e => (
                <tr key={e.id} style={{borderBottom:'1px solid #e2e8f0'}}>
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

const s = {
  page: { display: 'flex', minHeight: '100vh', background: '#f7f8fc' },
  sidebar: { width: 240, background: '#1a1a2e', color: '#fff', padding: 24, display: 'flex', flexDirection: 'column' },
  logo: { fontSize: 20, fontWeight: 700, marginBottom: 40 },
  navItem: { padding: '12px 16px', borderRadius: 8, cursor: 'pointer', marginBottom: 4, color: '#a0aec0', fontSize: 14 },
  navActive: { background: '#4f46e5', color: '#fff' },
  logoutBtn: { marginTop: 'auto', padding: '10px 16px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' },
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
  comingSoon: { textAlign: 'center', padding: 80, fontSize: 24, color: '#888' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontSize: 18 }
};

import { useState, useEffect } from 'react';
import { request } from '../api';

const ROLES = ['admin', 'supervisor', 'agent', 'billing'];
const ROLE_COLOR = { admin: '#4f46e5', supervisor: '#d97706', agent: '#38a169', billing: '#0891b2' };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [extensions, setExtensions] = useState([]);
  const [form, setForm] = useState({ email: '', password: '', first_name: '', last_name: '', role: 'agent' });
  const [msg, setMsg] = useState('');
  const [msgColor, setMsgColor] = useState('#38a169');

  const load = () => {
    request('/api/users').then(data => setUsers(Array.isArray(data) ? data : []));
    request('/api/extensions').then(data => setExtensions(Array.isArray(data) ? data : []));
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.email || !form.password) { flash('Email and password required', '#e53e3e'); return; }
    const data = await request('/api/users', { method: 'POST', body: JSON.stringify(form) });
    if (data.id) {
      flash('User created!', '#38a169');
      load();
      setForm({ email: '', password: '', first_name: '', last_name: '', role: 'agent' });
    } else flash(data.error || 'Failed', '#e53e3e');
  };

  const remove = async (id) => {
    await request(`/api/users?id=${id}`, { method: 'DELETE' });
    load();
  };

  const changeRole = async (id, role, firstName, lastName) => {
    await request(`/api/users?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify({ role, first_name: firstName, last_name: lastName }),
    });
    load();
  };

  const assignExtension = async (userId, extensionId) => {
    await request('/api/users/assign-extension', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, extension_id: extensionId }),
    });
    load();
  };

  const flash = (text, color) => { setMsg(text); setMsgColor(color); };

  const userExtension = (userId) => extensions.find(e => e.assigned_to === userId || e.user_id === userId);

  return (
    <div>
      <div style={s.card}>
        <h3 style={s.title}>Add User</h3>
        <div style={s.grid2}>
          <input style={s.input} placeholder="Email *"
            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <input style={s.input} placeholder="Password *" type="password"
            value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          <input style={s.input} placeholder="First name"
            value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
          <input style={s.input} placeholder="Last name"
            value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <select style={s.select} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <button style={s.btn} onClick={create}>Add User</button>
        </div>
        {msg && <p style={{ color: msgColor, marginTop: 8 }}>{msg}</p>}
      </div>

      <div style={s.card}>
        <h3 style={s.title}>Users ({users.length})</h3>
        {users.length === 0 ? (
          <p style={s.empty}>No users yet</p>
        ) : (
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                {['Name', 'Email', 'Role', 'Extension', 'Actions'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const ext = userExtension(u.id);
                return (
                  <tr key={u.id} style={s.tr}>
                    <td style={s.td}>{u.first_name || u.last_name ? `${u.first_name} ${u.last_name}` : '—'}</td>
                    <td style={s.td}>{u.email}</td>
                    <td style={s.td}>
                      <select style={s.inlineSelect}
                        value={u.role}
                        onChange={e => changeRole(u.id, e.target.value, u.first_name, u.last_name)}>
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td style={s.td}>
                      <select style={s.inlineSelect}
                        value={ext?.id || ''}
                        onChange={e => assignExtension(u.id, e.target.value)}>
                        <option value="">None</option>
                        {extensions.map(e => (
                          <option key={e.id} value={e.id}>
                            {e.extension} {e.first_name ? `(${e.first_name})` : ''}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={s.td}>
                      <button style={s.deleteBtn} onClick={() => remove(u.id)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const s = {
  card: { background: '#fff', borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  title: { marginTop: 0, marginBottom: 16 },
  empty: { color: '#888' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  input: { padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 },
  select: { flex: 1, padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, background: '#fff' },
  inlineSelect: { padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13, background: '#fff' },
  btn: { padding: '12px 24px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#f7f8fc' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#666', fontWeight: 600 },
  tr: { borderBottom: '1px solid #e2e8f0' },
  td: { padding: '12px 16px', fontSize: 14 },
  deleteBtn: { padding: '6px 12px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' },
};

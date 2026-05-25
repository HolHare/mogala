import { useState, useEffect } from 'react';
import { request } from '../api';

const emptyForm = { name: '', host: '', port: 5060, username: '', password: '', prefix: '', active: true };

export default function Trunks() {
  const [trunks, setTrunks] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');
  const [msgColor, setMsgColor] = useState('#38a169');

  const load = () => {
    request('/api/trunks').then(data => setTrunks(Array.isArray(data) ? data : []));
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name || !form.host) { flash('Name and host required', '#e53e3e'); return; }
    const body = JSON.stringify({ ...form, port: Number(form.port) || 5060 });

    let data;
    if (editing) {
      data = await request(`/api/trunks?id=${editing}`, { method: 'PUT', body });
      setEditing(null);
    } else {
      data = await request('/api/trunks', { method: 'POST', body });
    }

    if (data.error) { flash(data.error, '#e53e3e'); return; }
    flash(editing ? 'Trunk updated!' : 'Trunk added!', '#38a169');
    setForm(emptyForm);
    load();
  };

  const startEdit = (t) => {
    setEditing(t.id);
    setForm({ name: t.name, host: t.host, port: t.port, username: t.username || '', password: '', prefix: t.prefix || '', active: t.active });
  };

  const remove = async (id) => {
    await request(`/api/trunks?id=${id}`, { method: 'DELETE' });
    load();
  };

  const flash = (text, color) => { setMsg(text); setMsgColor(color); };

  return (
    <div>
      <div style={s.card}>
        <h3 style={s.title}>{editing ? 'Edit Trunk' : 'Add SIP Trunk'}</h3>
        <div style={s.grid2}>
          <input style={s.input} placeholder="Name *"
            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input style={s.input} placeholder="SIP Host *"
            value={form.host} onChange={e => setForm({ ...form, host: e.target.value })} />
          <input style={s.input} placeholder="Port" type="number"
            value={form.port} onChange={e => setForm({ ...form, port: e.target.value })} />
          <input style={s.input} placeholder="Username"
            value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
          <input style={s.input} placeholder="Password" type="password"
            value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          <input style={s.input} placeholder="Outbound prefix (e.g. 9)"
            value={form.prefix} onChange={e => setForm({ ...form, prefix: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.active}
              onChange={e => setForm({ ...form, active: e.target.checked })} />
            Active
          </label>
          <button style={s.btn} onClick={save}>{editing ? 'Update Trunk' : 'Add Trunk'}</button>
          {editing && (
            <button style={s.cancelBtn} onClick={() => { setEditing(null); setForm(emptyForm); }}>
              Cancel
            </button>
          )}
        </div>
        {msg && <p style={{ color: msgColor, marginTop: 8 }}>{msg}</p>}
      </div>

      <div style={s.card}>
        <h3 style={s.title}>SIP Trunks</h3>
        {trunks.length === 0 ? (
          <p style={s.empty}>No trunks configured</p>
        ) : (
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                {['Name', 'Host:Port', 'Username', 'Prefix', 'Status', 'Actions'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trunks.map(t => (
                <tr key={t.id} style={s.tr}>
                  <td style={s.td}><strong>{t.name}</strong></td>
                  <td style={s.td}>{t.host}:{t.port}</td>
                  <td style={s.td}>{t.username || '—'}</td>
                  <td style={s.td}>{t.prefix || '—'}</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, background: t.active ? '#38a169' : '#888' }}>
                      {t.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={s.td}>
                    <button style={s.editBtn} onClick={() => startEdit(t)}>Edit</button>
                    <button style={s.deleteBtn} onClick={() => remove(t.id)}>Delete</button>
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
  card: { background: '#fff', borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  title: { marginTop: 0, marginBottom: 16 },
  empty: { color: '#888' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  input: { padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 },
  btn: { padding: '12px 24px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  cancelBtn: { padding: '12px 24px', background: '#e2e8f0', color: '#333', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#f7f8fc' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#666', fontWeight: 600 },
  tr: { borderBottom: '1px solid #e2e8f0' },
  td: { padding: '12px 16px', fontSize: 14 },
  badge: { padding: '3px 10px', borderRadius: 20, color: '#fff', fontSize: 12, fontWeight: 600 },
  editBtn: { padding: '6px 12px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', marginRight: 6 },
  deleteBtn: { padding: '6px 12px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' },
};

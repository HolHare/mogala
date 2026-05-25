import { useState, useEffect } from 'react';
import { request } from '../api';

export default function PhoneNumbers() {
  const [numbers, setNumbers] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ number: '', assigned_to: '' });
  const [msg, setMsg] = useState('');
  const [msgColor, setMsgColor] = useState('#38a169');

  const load = () => {
    request('/api/phone-numbers').then(data => setNumbers(Array.isArray(data) ? data : []));
    request('/api/users').then(data => setUsers(Array.isArray(data) ? data : []));
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.number) { flash('Phone number required', '#e53e3e'); return; }
    const data = await request('/api/phone-numbers', {
      method: 'POST',
      body: JSON.stringify(form),
    });
    if (data.id) { flash('Number added!', '#38a169'); load(); setForm({ number: '', assigned_to: '' }); }
    else flash(data.error || 'Failed', '#e53e3e');
  };

  const reassign = async (id, userId) => {
    await request(`/api/phone-numbers?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify({ assigned_to: userId }),
    });
    load();
  };

  const remove = async (id) => {
    await request(`/api/phone-numbers?id=${id}`, { method: 'DELETE' });
    load();
  };

  const flash = (text, color) => { setMsg(text); setMsgColor(color); };

  const userName = (uid) => {
    const u = users.find(u => u.id === uid);
    return u ? `${u.first_name} ${u.last_name}`.trim() || u.email : 'Unassigned';
  };

  return (
    <div>
      <div style={s.card}>
        <h3 style={s.title}>Add Phone Number</h3>
        <div style={s.row}>
          <input style={s.input} placeholder="+1234567890"
            value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} />
          <select style={s.select} value={form.assigned_to}
            onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
            <option value="">Unassigned</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}` : u.email}
              </option>
            ))}
          </select>
          <button style={s.btn} onClick={create}>Add Number</button>
        </div>
        {msg && <p style={{ color: msgColor, marginTop: 8 }}>{msg}</p>}
      </div>

      <div style={s.card}>
        <h3 style={s.title}>Phone Numbers</h3>
        {numbers.length === 0 ? (
          <p style={s.empty}>No phone numbers yet</p>
        ) : (
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                {['Number', 'Assigned To', 'Actions'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {numbers.map(n => (
                <tr key={n.id} style={s.tr}>
                  <td style={s.td}><strong>{n.number}</strong></td>
                  <td style={s.td}>
                    <select style={s.inlineSelect}
                      value={n.assigned_to || ''}
                      onChange={e => reassign(n.id, e.target.value)}>
                      <option value="">Unassigned</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}` : u.email}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={s.td}>
                    <button style={s.deleteBtn} onClick={() => remove(n.id)}>Delete</button>
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
  row: { display: 'flex', gap: 12, alignItems: 'center' },
  input: { flex: 1, padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 },
  select: { flex: 1, padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, background: '#fff' },
  inlineSelect: { padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13, background: '#fff' },
  btn: { padding: '12px 24px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#f7f8fc' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#666', fontWeight: 600 },
  tr: { borderBottom: '1px solid #e2e8f0' },
  td: { padding: '12px 16px', fontSize: 14 },
  deleteBtn: { padding: '6px 12px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' },
};

import { useState, useEffect } from 'react';
import { request } from '../api';
import { T } from '../theme';
import { Icon } from '../components/Icons';

export default function PhoneNumbers() {
  const [numbers, setNumbers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ number: '', assigned_to: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = () => {
    Promise.all([
      request('/api/phone-numbers').then(d => setNumbers(Array.isArray(d) ? d : [])),
      request('/api/users').then(d => setUsers(Array.isArray(d) ? d : [])),
    ]).then(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.number) { flash('Phone number is required', 'error'); return; }
    setSaving(true);
    const data = await request('/api/phone-numbers', { method: 'POST', body: JSON.stringify(form) });
    setSaving(false);
    if (data.id) {
      flash('Number added successfully', 'success');
      setForm({ number: '', assigned_to: '' }); setShowForm(false); load();
    } else flash(data.error || 'Failed to add number', 'error');
  };

  const reassign = async (id, assigned_to) => {
    await request(`/api/phone-numbers?id=${id}`, { method: 'PUT', body: JSON.stringify({ assigned_to }) });
    load();
  };

  const remove = async (id) => {
    if (!window.confirm('Remove this phone number?')) return;
    await request(`/api/phone-numbers?id=${id}`, { method: 'DELETE' });
    load();
  };

  const flash = (text, type) => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3500); };
  const userName = (uid) => { const u = users.find(u => u.id === uid); return u ? `${u.first_name} ${u.last_name}`.trim() || u.email : null; };

  return (
    <div className="fade-up">
      {msg && <Toast msg={msg} />}

      <div style={s.header}>
        <div>
          <h1 style={s.title}>Phone Numbers</h1>
          <p style={s.subtitle}>{numbers.length} DID{numbers.length !== 1 ? 's' : ''} configured</p>
        </div>
        <button style={T.btn_s('primary')} onClick={() => setShowForm(v => !v)}>
          <Icon name="plus" size={16} /> Add Number
        </button>
      </div>

      {showForm && (
        <div style={{ ...T.card_s(), marginBottom: 16, borderColor: T.primary + '44' }} className="slide-in">
          <h3 style={s.formTitle}>Add Phone Number</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={s.label}>Number (E.164 format)</label>
              <input style={T.input_s()} placeholder="+441234567890"
                value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={s.label}>Assign to user (optional)</label>
              <select style={{ ...T.input_s() }} value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{`${u.first_name} ${u.last_name}`.trim() || u.email}</option>)}
              </select>
            </div>
            <button style={T.btn_s('primary')} onClick={create} disabled={saving}>
              {saving ? <span className="spin" style={spinner} /> : <Icon name="check" size={15} />}
              {saving ? 'Adding…' : 'Add'}
            </button>
            <button style={T.btn_s('ghost')} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={T.card_s()}>
        {loading ? (
          <div style={s.center}><span className="spin" style={spinnerLg} /></div>
        ) : numbers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={s.emptyIcon}><Icon name="hash" size={26} color={T.primary} /></div>
            <p style={s.emptyTitle}>No phone numbers yet</p>
            <p style={s.emptySub}>Add DIDs to assign to your users</p>
          </div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>{['Number', 'Assigned To', 'Added', ''].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {numbers.map(n => {
                const name = n.assigned_to ? userName(n.assigned_to) : null;
                return (
                  <tr key={n.id} style={s.tr}>
                    <td style={s.td}>
                      <span style={s.numBadge}>{n.number}</span>
                    </td>
                    <td style={s.td}>
                      <select style={s.select} value={n.assigned_to || ''} onChange={e => reassign(n.id, e.target.value)}>
                        <option value="">Unassigned</option>
                        {users.map(u => <option key={u.id} value={u.id}>{`${u.first_name} ${u.last_name}`.trim() || u.email}</option>)}
                      </select>
                    </td>
                    <td style={{ ...s.td, color: T.textSub, fontSize: 13 }}>
                      {new Date(n.created_at).toLocaleDateString()}
                    </td>
                    <td style={s.td}>
                      <button style={T.btn_s('danger')} onClick={() => remove(n.id)}>
                        <Icon name="trash" size={14} /> Remove
                      </button>
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

function Toast({ msg }) {
  const c = msg.type === 'success' ? T.success : T.error;
  return (
    <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: c + '18', color: c, border: `1px solid ${c}44`, borderRadius: 10, padding: '12px 18px', fontSize: 14, fontWeight: 500, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }} className="slide-in">
      {msg.text}
    </div>
  );
}

const spinner = { width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' };
const spinnerLg = { width: 28, height: 28, border: '3px solid rgba(99,102,241,0.2)', borderTopColor: T.primary, borderRadius: '50%', display: 'inline-block' };

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: T.text },
  subtitle: { margin: 0, fontSize: 14, color: T.textSub },
  formTitle: { margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: T.text },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: T.textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid ' + T.border },
  tr: { borderBottom: '1px solid ' + T.border },
  td: { padding: '13px 16px', fontSize: 14, color: T.text },
  numBadge: { fontWeight: 700, fontSize: 15, color: T.text, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em' },
  select: { padding: '7px 10px', borderRadius: 7, border: '1px solid ' + T.border, background: T.surface, color: T.text, fontSize: 13, cursor: 'pointer' },
  center: { display: 'flex', justifyContent: 'center', padding: 60 },
  emptyIcon: { width: 56, height: 56, borderRadius: 16, background: T.primaryDim, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' },
  emptyTitle: { margin: '0 0 6px', fontWeight: 600, color: T.text, fontSize: 15 },
  emptySub: { margin: 0, color: T.textSub, fontSize: 14 },
};

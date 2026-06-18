import { useState, useEffect } from 'react';
import { request } from '../api';
import { T } from '../theme';
import { Icon } from '../components/Icons';

const ROLES = ['admin', 'supervisor', 'agent', 'billing'];

export default function Users() {
  const [users, setUsers] = useState([]);
  const [extensions, setExtensions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ email: '', first_name: '', last_name: '', role: 'agent' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [resending, setResending] = useState(null);

  const load = () => {
    Promise.all([
      request('/api/users').then(d => setUsers(Array.isArray(d) ? d : [])),
      request('/api/extensions').then(d => setExtensions(Array.isArray(d) ? d : [])),
    ]).then(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.email) { flash('Email is required', 'error'); return; }
    setSaving(true);
    const data = await request('/api/users', { method: 'POST', body: JSON.stringify(form) });
    setSaving(false);
    if (data.id) {
      flash('Invite sent successfully', 'success');
      setModal(false);
      setForm({ email: '', first_name: '', last_name: '', role: 'agent' });
      load();
    } else flash(data.error || 'Failed to send invite', 'error');
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    await request(`/api/users?id=${id}`, { method: 'DELETE' });
    load();
  };

  const changeRole = async (u, role) => {
    await request(`/api/users?id=${u.id}`, { method: 'PUT', body: JSON.stringify({ role, first_name: u.first_name, last_name: u.last_name }) });
    load();
  };

  const assignExt = async (userId, extensionId) => {
    await request('/api/users/assign-extension', { method: 'POST', body: JSON.stringify({ user_id: userId, extension_id: extensionId }) });
    load();
  };

  const resendInvite = async (userId) => {
    setResending(userId);
    const data = await request(`/api/users/resend-invite?id=${userId}`, { method: 'POST' });
    setResending(null);
    if (data.sent) flash('Invite resent', 'success');
    else flash(data.error || 'Failed to resend invite', 'error');
  };

  const flash = (text, type) => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3500); };

  const userExt = (uid) => extensions.find(e => e.user_id === uid || e.assigned_to === uid);

  return (
    <div className="fade-up">
      {msg && <Toast msg={msg} />}
      {modal && <Modal form={form} setForm={setForm} onSave={create} onClose={() => setModal(false)} saving={saving} />}

      <div style={s.header}>
        <div>
          <h1 style={s.title}>Users</h1>
          <p style={s.subtitle}>{users.length} team member{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button style={T.btn_s('primary')} onClick={() => setModal(true)}>
          <Icon name="plus" size={16} /> Invite User
        </button>
      </div>

      <div style={T.card_s()}>
        {loading ? (
          <div style={s.center}><span className="spin" style={spinnerLg} /></div>
        ) : users.length === 0 ? (
          <EmptyState />
        ) : (
          <table style={s.table}>
            <thead>
              <tr>{['User', 'Email', 'Role', 'Extension', ''].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {users.map(u => {
                const ext = userExt(u.id);
                const roleColor = T.roles[u.role] || T.textSub;
                return (
                  <tr key={u.id} style={s.tr}>
                    <td style={s.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ ...s.avatar, background: roleColor + '22', color: roleColor }}>
                          {(u.first_name?.[0] || u.email[0]).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>
                            {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : '—'}
                          </div>
                          {u.invite_pending && (
                            <div style={s.pendingBadge}>Pending invite</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ ...s.td, color: T.textSub }}>{u.email}</td>
                    <td style={s.td}>
                      <select style={s.select} value={u.role} onChange={e => changeRole(u, e.target.value)}>
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td style={s.td}>
                      <select style={s.select} value={ext?.id || ''} onChange={e => assignExt(u.id, e.target.value)}>
                        <option value="">No extension</option>
                        {extensions.map(e => <option key={e.id} value={e.id}>{e.extension}</option>)}
                      </select>
                    </td>
                    <td style={{ ...s.td, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        {u.invite_pending && (
                          <button style={T.btn_s('ghost')} onClick={() => resendInvite(u.id)} disabled={resending === u.id}>
                            {resending === u.id ? <span className="spin" style={spinner} /> : <Icon name="envelope" size={14} />}
                            Resend
                          </button>
                        )}
                        <button style={T.btn_s('danger')} onClick={() => remove(u.id)}>
                          <Icon name="trash" size={14} /> Remove
                        </button>
                      </div>
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

function Modal({ form, setForm, onSave, onClose, saving }) {
  const f = (key) => ({ value: form[key], onChange: e => setForm({ ...form, [key]: e.target.value }) });
  return (
    <div style={overlay}>
      <div style={s.modal} className="slide-in">
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>Invite User</h3>
          <button style={s.closeBtn} onClick={onClose}><Icon name="xMark" size={18} /></button>
        </div>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: T.textSub }}>
          An invite email will be sent so they can set their own password.
        </p>
        <div style={s.row2}>
          <Field label="First name" placeholder="Alice" {...f('first_name')} />
          <Field label="Last name" placeholder="Smith" {...f('last_name')} />
        </div>
        <Field label="Work email *" type="email" placeholder="alice@company.com" {...f('email')} />
        <div style={{ marginBottom: 20 }}>
          <label style={s.label}>Role</label>
          <select style={{ ...T.input_s() }} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
            {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button style={T.btn_s('ghost')} onClick={onClose}>Cancel</button>
          <button style={T.btn_s('primary')} onClick={onSave} disabled={saving}>
            {saving ? <span className="spin" style={spinner} /> : <Icon name="envelope" size={15} />}
            {saving ? 'Sending…' : 'Send invite'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={s.label}>{label}</label>
      <input style={T.input_s()} {...props} />
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: T.primaryDim, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <Icon name="users" size={26} color={T.primary} />
      </div>
      <p style={{ margin: '0 0 6px', fontWeight: 600, color: T.text, fontSize: 15 }}>No users yet</p>
      <p style={{ margin: 0, color: T.textSub, fontSize: 14 }}>Invite your first team member to get started</p>
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

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' };
const spinner = { width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' };
const spinnerLg = { width: 28, height: 28, border: '3px solid rgba(99,102,241,0.2)', borderTopColor: T.primary, borderRadius: '50%', display: 'inline-block' };

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: T.text },
  subtitle: { margin: 0, fontSize: 14, color: T.textSub },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid ' + T.border },
  tr: { borderBottom: '1px solid ' + T.border },
  td: { padding: '13px 16px', fontSize: 14, color: T.text },
  avatar: { width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 },
  pendingBadge: { fontSize: 11, color: '#f59e0b', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 5, padding: '2px 7px', marginTop: 3, display: 'inline-block' },
  select: { padding: '7px 10px', borderRadius: 7, border: '1px solid ' + T.border, background: T.surface, color: T.text, fontSize: 13, cursor: 'pointer' },
  modal: { background: T.card, border: '1px solid ' + T.border, borderRadius: 16, padding: 28, width: 480, maxWidth: '90vw', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: T.text },
  closeBtn: { background: 'none', border: 'none', color: T.textSub, cursor: 'pointer', padding: 4 },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: T.textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' },
  center: { display: 'flex', justifyContent: 'center', padding: 60 },
};

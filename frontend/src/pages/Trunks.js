import { useState, useEffect } from 'react';
import { request } from '../api';
import { T } from '../theme';
import { Icon } from '../components/Icons';

const empty = { name: '', host: '', port: 5060, username: '', password: '', prefix: '', active: true };

export default function Trunks() {
  const [trunks, setTrunks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | trunk-object
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = () => request('/api/trunks').then(d => { setTrunks(Array.isArray(d) ? d : []); setLoading(false); });
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(empty); setModal('create'); };
  const openEdit = (t) => { setForm({ name: t.name, host: t.host, port: t.port, username: t.username || '', password: '', prefix: t.prefix || '', active: t.active }); setModal(t); };

  const save = async () => {
    if (!form.name || !form.host) { flash('Name and host are required', 'error'); return; }
    setSaving(true);
    const body = JSON.stringify({ ...form, port: Number(form.port) || 5060 });
    const data = modal === 'create'
      ? await request('/api/trunks', { method: 'POST', body })
      : await request(`/api/trunks?id=${modal.id}`, { method: 'PUT', body });
    setSaving(false);
    if (data.error) { flash(data.error, 'error'); return; }
    flash(modal === 'create' ? 'Trunk added' : 'Trunk updated', 'success');
    setModal(null); load();
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this trunk?')) return;
    await request(`/api/trunks?id=${id}`, { method: 'DELETE' });
    load();
  };

  const flash = (text, type) => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3500); };
  const f = (key) => ({ value: form[key], onChange: e => setForm({ ...form, [key]: e.target.value }) });

  return (
    <div className="fade-up">
      {msg && <Toast msg={msg} />}
      {modal && (
        <div style={overlay}>
          <div style={s.modal} className="slide-in">
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>{modal === 'create' ? 'Add SIP Trunk' : 'Edit Trunk'}</h3>
              <button style={s.closeBtn} onClick={() => setModal(null)}><Icon name="xMark" size={18} /></button>
            </div>
            <div style={s.row2}>
              <Field label="Name *" placeholder="My Provider" {...f('name')} />
              <Field label="SIP Host *" placeholder="sip.provider.com" {...f('host')} />
              <Field label="Port" type="number" placeholder="5060" {...f('port')} />
              <Field label="Username" placeholder="auth-user" {...f('username')} />
              <Field label="Password" type="password" placeholder="••••••••" {...f('password')} />
              <Field label="Outbound prefix" placeholder="e.g. 9" {...f('prefix')} />
            </div>
            <label style={s.checkRow}>
              <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />
              <span style={{ color: T.text, fontSize: 14 }}>Active — enable this trunk for outbound calls</span>
            </label>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button style={T.btn_s('ghost')} onClick={() => setModal(null)}>Cancel</button>
              <button style={T.btn_s('primary')} onClick={save} disabled={saving}>
                {saving ? <span className="spin" style={spinner} /> : <Icon name="check" size={15} />}
                {saving ? 'Saving…' : modal === 'create' ? 'Add trunk' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={s.header}>
        <div>
          <h1 style={s.title}>SIP Trunks</h1>
          <p style={s.subtitle}>Outbound PSTN carrier connections</p>
        </div>
        <button style={T.btn_s('primary')} onClick={openCreate}>
          <Icon name="plus" size={16} /> Add Trunk
        </button>
      </div>

      <div style={T.card_s()}>
        {loading ? (
          <div style={s.center}><span className="spin" style={spinnerLg} /></div>
        ) : trunks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={s.emptyIcon}><Icon name="server" size={26} color={T.primary} /></div>
            <p style={s.emptyTitle}>No trunks configured</p>
            <p style={s.emptySub}>Connect a SIP carrier to enable outbound PSTN calls</p>
          </div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>{['Name', 'Host', 'Credentials', 'Prefix', 'Status', ''].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {trunks.map(t => (
                <tr key={t.id} style={s.tr}>
                  <td style={s.td}><strong style={{ color: T.text }}>{t.name}</strong></td>
                  <td style={{ ...s.td, color: T.textSub, fontFamily: 'monospace', fontSize: 13 }}>{t.host}:{t.port}</td>
                  <td style={{ ...s.td, color: T.textSub }}>{t.username || <span style={{ color: T.textMuted }}>None</span>}</td>
                  <td style={{ ...s.td, color: T.textSub }}>{t.prefix || <span style={{ color: T.textMuted }}>—</span>}</td>
                  <td style={s.td}>
                    <span style={T.badge_s(t.active ? T.success : T.textMuted)}>
                      {t.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ ...s.td, display: 'flex', gap: 8 }}>
                    <button style={T.btn_s('ghost')} onClick={() => openEdit(t)}>
                      <Icon name="pencil" size={14} /> Edit
                    </button>
                    <button style={T.btn_s('danger')} onClick={() => remove(t.id)}>
                      <Icon name="trash" size={14} />
                    </button>
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

function Field({ label, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: T.textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
      <input style={T.input_s()} {...props} />
    </div>
  );
}

function Toast({ msg }) {
  const c = msg.type === 'success' ? T.success : T.error;
  return <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: c + '18', color: c, border: `1px solid ${c}44`, borderRadius: 10, padding: '12px 18px', fontSize: 14, fontWeight: 500, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }} className="slide-in">{msg.text}</div>;
}

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' };
const spinner = { width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' };
const spinnerLg = { width: 28, height: 28, border: '3px solid rgba(99,102,241,0.2)', borderTopColor: T.primary, borderRadius: '50%', display: 'inline-block' };

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: T.text },
  subtitle: { margin: 0, fontSize: 14, color: T.textSub },
  modal: { background: T.card, border: '1px solid ' + T.border, borderRadius: 16, padding: 28, width: 560, maxWidth: '90vw', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: T.text },
  closeBtn: { background: 'none', border: 'none', color: T.textSub, cursor: 'pointer', padding: 4 },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  checkRow: { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 4 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid ' + T.border },
  tr: { borderBottom: '1px solid ' + T.border },
  td: { padding: '13px 16px', fontSize: 14, color: T.text },
  center: { display: 'flex', justifyContent: 'center', padding: 60 },
  emptyIcon: { width: 56, height: 56, borderRadius: 16, background: T.primaryDim, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' },
  emptyTitle: { margin: '0 0 6px', fontWeight: 600, color: T.text, fontSize: 15 },
  emptySub: { margin: 0, color: T.textSub, fontSize: 14 },
};

import { useState, useEffect } from 'react';
import { request } from '../api';
import { T } from '../theme';
import { Icon } from '../components/Icons';

export default function Extensions() {
  const [extensions, setExtensions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ extension: '' });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = () => request('/api/extensions').then(d => {
    setExtensions(Array.isArray(d) ? d : []);
    setLoading(false);
  });

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.extension) return;
    setSaving(true);
    const data = await request('/api/extensions', { method: 'POST', body: JSON.stringify(form) });
    setSaving(false);
    if (data.id) {
      setMsg({ text: `Extension ${form.extension} created`, type: 'success' });
      setForm({ extension: '' }); setShowForm(false); load();
    } else {
      setMsg({ text: data.error || 'Failed to create extension', type: 'error' });
    }
    setTimeout(() => setMsg(null), 3500);
  };

  const remove = async (id, ext) => {
    if (!window.confirm(`Delete extension ${ext}?`)) return;
    await request(`/api/extensions?id=${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="fade-up">
      {msg && <Toast msg={msg} />}

      <div style={s.header}>
        <div>
          <h1 style={s.title}>Extensions</h1>
          <p style={s.subtitle}>Manage SIP extensions for your team</p>
        </div>
        <button style={T.btn_s('primary')} onClick={() => setShowForm(v => !v)}>
          <Icon name="plus" size={16} /> New Extension
        </button>
      </div>

      {showForm && (
        <div style={s.formCard} className="slide-in">
          <h3 style={s.formTitle}>Create Extension</h3>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={s.label}>Extension number</label>
              <input style={T.input_s()} placeholder="e.g. 1001"
                value={form.extension}
                onChange={e => setForm({ extension: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && create()} />
            </div>
            <button style={T.btn_s('primary')} onClick={create} disabled={saving}>
              {saving ? <span className="spin" style={spinner} /> : <Icon name="check" size={16} />}
              {saving ? 'Creating…' : 'Create'}
            </button>
            <button style={T.btn_s('ghost')} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={T.card_s()}>
        {loading ? (
          <div style={s.center}><span className="spin" style={spinnerLg} /></div>
        ) : extensions.length === 0 ? (
          <EmptyState icon="phone" title="No extensions yet" desc="Create your first SIP extension to get started." />
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                {['Extension', 'SIP Password', 'Assigned To', 'Created', ''].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {extensions.map(e => (
                <tr key={e.id} style={s.tr}>
                  <td style={s.td}>
                    <div style={s.extBadge}>{e.extension}</div>
                  </td>
                  <td style={s.td}>
                    <code style={s.code}>{e.sip_password}</code>
                  </td>
                  <td style={s.td}>
                    {e.first_name
                      ? <span style={{ color: T.text }}>{e.first_name} {e.last_name}</span>
                      : <span style={{ color: T.textMuted }}>Unassigned</span>}
                  </td>
                  <td style={{ ...s.td, color: T.textSub, fontSize: 13 }}>
                    {new Date(e.created_at).toLocaleDateString()}
                  </td>
                  <td style={s.td}>
                    <button style={T.btn_s('danger')} onClick={() => remove(e.id, e.extension)}>
                      <Icon name="trash" size={14} /> Delete
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

function EmptyState({ icon, title, desc }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: T.primaryDim, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <Icon name={icon} size={26} color={T.primary} />
      </div>
      <p style={{ margin: '0 0 6px', fontWeight: 600, color: T.text, fontSize: 15 }}>{title}</p>
      <p style={{ margin: 0, color: T.textSub, fontSize: 14 }}>{desc}</p>
    </div>
  );
}

function Toast({ msg }) {
  const bg = msg.type === 'success' ? T.successDim : T.errorDim;
  const color = msg.type === 'success' ? T.success : T.error;
  const border = msg.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)';
  return (
    <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: bg, color, border: `1px solid ${border}`, borderRadius: 10, padding: '12px 18px', fontSize: 14, fontWeight: 500, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }} className="slide-in">
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
  formCard: { ...T.card_s(), marginBottom: 16, borderColor: T.primary + '44' },
  formTitle: { margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: T.text },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: T.textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid ' + T.border },
  tr: { borderBottom: '1px solid ' + T.border, transition: 'background 0.1s' },
  td: { padding: '14px 16px', fontSize: 14, color: T.text },
  extBadge: { display: 'inline-block', background: T.primaryDim, color: T.primaryHov, border: '1px solid ' + T.primary + '44', borderRadius: 8, padding: '4px 12px', fontWeight: 700, fontSize: 15, letterSpacing: '0.05em' },
  code: { background: T.surface, border: '1px solid ' + T.border, borderRadius: 6, padding: '3px 8px', fontSize: 12, color: T.textSub, fontFamily: 'monospace' },
  center: { display: 'flex', justifyContent: 'center', padding: 60 },
};

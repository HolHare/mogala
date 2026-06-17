import { useState, useEffect } from 'react';
import { request } from '../api';
import { T } from '../theme';
import { Icon } from '../components/Icons';

const CATEGORIES = ['Sales', 'Support', 'Billing', 'Follow-up', 'No Answer', 'General'];

export default function DispositionCodes() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ code: '', label: '', category: 'General' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = () => {
    request('/api/admin/disposition-codes').then(d => {
      setCodes(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const flash = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  };

  const create = async () => {
    if (!form.code || !form.label) { flash('Code and label are required', 'error'); return; }
    setSaving(true);
    const data = await request('/api/admin/disposition-codes', {
      method: 'POST',
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (data.id) {
      flash('Disposition code created');
      setModal(false);
      setForm({ code: '', label: '', category: 'General' });
      load();
    } else {
      flash(data.error || 'Failed to create', 'error');
    }
  };

  const toggleActive = async (c) => {
    await request(`/api/admin/disposition-codes?id=${c.id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...c, active: !c.active }),
    });
    load();
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this disposition code?')) return;
    await request(`/api/admin/disposition-codes?id=${id}`, { method: 'DELETE' });
    flash('Deleted');
    load();
  };

  // Group by category
  const grouped = codes.reduce((acc, c) => {
    const cat = c.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(c);
    return acc;
  }, {});

  return (
    <div className="fade-up">
      {msg && (
        <div style={{ ...T.card_s(), background: msg.type === 'error' ? T.errorDim : T.successDim, marginBottom: 16, color: msg.type === 'error' ? T.error : T.success, fontSize: 14 }}>
          {msg.text}
        </div>
      )}

      <div style={T.card_s()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Disposition Codes</span>
          <button style={T.btn_s('primary')} onClick={() => setModal(true)}>
            <Icon name="plus" size={14} color="#fff" /> Add Code
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <span className="spin" style={{ width: 24, height: 24, border: '2px solid rgba(99,102,241,0.2)', borderTopColor: T.primary, borderRadius: '50%', display: 'inline-block' }} />
          </div>
        ) : codes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: T.textSub, fontSize: 14 }}>
            No disposition codes yet. Add codes for agents to use after calls.
          </div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>{cat}</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Code', 'Label', 'Status', 'Actions'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid ' + T.border, opacity: c.active ? 1 : 0.5 }}>
                      <td style={s.td}><code style={{ background: T.surface, padding: '3px 8px', borderRadius: 5, fontSize: 12, color: T.primary }}>{c.code}</code></td>
                      <td style={s.td}><span style={{ color: T.text, fontSize: 14 }}>{c.label}</span></td>
                      <td style={s.td}><span style={T.badge_s(c.active ? T.success : T.textMuted)}>{c.active ? 'Active' : 'Inactive'}</span></td>
                      <td style={s.td}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button style={T.btn_s('ghost')} onClick={() => toggleActive(c)}>
                            {c.active ? 'Disable' : 'Enable'}
                          </button>
                          <button style={T.btn_s('danger')} onClick={() => remove(c.id)}>
                            <Icon name="trash" size={13} color={T.error} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>

      {/* Create modal */}
      {modal && (
        <div style={s.overlay} onClick={() => setModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.text }}>New Disposition Code</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setModal(false)}>
                <Icon name="xMark" size={18} color={T.textSub} />
              </button>
            </div>

            {[
              { key: 'code', label: 'Code', placeholder: 'e.g. SALE, CB, NI' },
              { key: 'label', label: 'Label', placeholder: 'e.g. Sale Made, Callback Requested' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, color: T.textSub, fontWeight: 500, marginBottom: 6 }}>{f.label}</label>
                <input style={T.input_s()} placeholder={f.placeholder}
                  value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
              </div>
            ))}

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, color: T.textSub, fontWeight: 500, marginBottom: 6 }}>Category</label>
              <select style={{ ...T.input_s(), cursor: 'pointer' }}
                value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ ...T.btn_s('primary'), flex: 1, justifyContent: 'center' }}
                onClick={create} disabled={saving}>
                {saving ? 'Creating…' : 'Create Code'}
              </button>
              <button style={T.btn_s('ghost')} onClick={() => setModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  th: { textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 12px 10px 0', borderBottom: '1px solid ' + T.border },
  td: { padding: '12px 12px 12px 0', verticalAlign: 'middle' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: T.card, border: '1px solid ' + T.border, borderRadius: 16, padding: 28, width: '90%', maxWidth: 440 },
};

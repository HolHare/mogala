import { useState, useEffect } from 'react';
import { request } from '../api';
import { T } from '../theme';
import { Icon } from '../components/Icons';

const STATUSES = ['pending', 'in_progress', 'completed', 'rejected'];

const STATUS_COLOR = {
  pending:     T.warning,
  in_progress: T.info,
  completed:   T.success,
  rejected:    T.error,
};

const STATUS_LABEL = {
  pending:     'Pending',
  in_progress: 'In Progress',
  completed:   'Completed',
  rejected:    'Rejected',
};

export default function Porting() {
  const [portings, setPortings]   = useState([]);
  const [tenants, setTenants]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(false);  // 'create' | { porting }
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState(null);
  const [filterStatus, setFilter] = useState('all');

  const [form, setForm] = useState({ tenant_id: '', number: '', from_carrier: '', notes: '' });

  const load = () => {
    Promise.all([
      request('/api/admin/portings').then(d => setPortings(Array.isArray(d) ? d : [])),
      request('/api/admin/tenants').then(d => setTenants(Array.isArray(d) ? d : [])),
    ]).then(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const flash = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  };

  const create = async () => {
    if (!form.tenant_id || !form.number) { flash('Tenant and number are required', 'error'); return; }
    setSaving(true);
    const data = await request('/api/admin/portings', { method: 'POST', body: JSON.stringify(form) });
    setSaving(false);
    if (data.id) {
      flash('Porting request created');
      setModal(false);
      setForm({ tenant_id: '', number: '', from_carrier: '', notes: '' });
      load();
    } else flash(data.error || 'Failed to create request', 'error');
  };

  const update = async () => {
    if (!modal?.id) return;
    setSaving(true);
    const data = await request(`/api/admin/portings/${modal.id}`, {
      method: 'PUT', body: JSON.stringify(modal),
    });
    setSaving(false);
    if (data.message) {
      flash('Porting request updated');
      setModal(false);
      load();
    } else flash(data.error || 'Failed to update', 'error');
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this porting request?')) return;
    await request(`/api/admin/portings/${id}`, { method: 'DELETE' });
    flash('Deleted');
    load();
  };

  const updateStatus = async (p, status) => {
    await request(`/api/admin/portings/${p.id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...p, status }),
    });
    load();
  };

  const filtered = filterStatus === 'all'
    ? portings
    : portings.filter(p => p.status === filterStatus);

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = portings.filter(p => p.status === s).length;
    return acc;
  }, {});

  return (
    <div className="fade-up">
      {msg && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: msg.type === 'error' ? T.errorDim : T.successDim, color: msg.type === 'error' ? T.error : T.success, border: `1px solid ${msg.type === 'error' ? T.error : T.success}44`, borderRadius: 10, padding: '12px 18px', fontSize: 14, fontWeight: 500 }} className="slide-in">
          {msg.text}
        </div>
      )}

      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Number Porting</h1>
          <p style={s.subtitle}>{portings.length} request{portings.length !== 1 ? 's' : ''} total</p>
        </div>
        <button style={T.btn_s('primary')} onClick={() => setModal('create')}>
          <Icon name="plus" size={16} /> New Porting Request
        </button>
      </div>

      {/* Status summary chips */}
      <div style={s.chips}>
        <Chip label="All" count={portings.length} active={filterStatus === 'all'} color={T.primary} onClick={() => setFilter('all')} />
        {STATUSES.map(st => (
          <Chip key={st} label={STATUS_LABEL[st]} count={counts[st]} active={filterStatus === st}
            color={STATUS_COLOR[st]} onClick={() => setFilter(st)} />
        ))}
      </div>

      {/* Table */}
      <div style={T.card_s()}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <span className="spin" style={lgSpinner} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: T.primaryDim, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Icon name="arrowPath" size={26} color={T.primary} />
            </div>
            <p style={{ margin: '0 0 6px', fontWeight: 600, color: T.text }}>No porting requests</p>
            <p style={{ margin: 0, color: T.textSub, fontSize: 14 }}>Create one to start tracking a number port</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Number', 'Tenant', 'From Carrier', 'Status', 'Created', 'Actions'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} style={s.tr}>
                  <td style={s.td}>
                    <span style={{ fontWeight: 600, color: T.text, fontFamily: 'monospace', fontSize: 14 }}>{p.number}</span>
                  </td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={s.tenantDot} />
                      <span style={{ fontSize: 14, color: T.text }}>{p.tenant_name}</span>
                    </div>
                  </td>
                  <td style={s.td}><span style={{ color: T.textSub, fontSize: 13 }}>{p.from_carrier || '—'}</span></td>
                  <td style={s.td}>
                    <select style={{ ...s.statusSelect, color: STATUS_COLOR[p.status], borderColor: STATUS_COLOR[p.status] + '55' }}
                      value={p.status} onChange={e => updateStatus(p, e.target.value)}>
                      {STATUSES.map(st => <option key={st} value={st}>{STATUS_LABEL[st]}</option>)}
                    </select>
                  </td>
                  <td style={s.td}><span style={{ color: T.textSub, fontSize: 13 }}>{new Date(p.created_at).toLocaleDateString()}</span></td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={T.btn_s('ghost')} onClick={() => setModal({ ...p })}>
                        <Icon name="pencil" size={13} /> Edit
                      </button>
                      <button style={T.btn_s('danger')} onClick={() => remove(p.id)}>
                        <Icon name="trash" size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create modal */}
      {modal === 'create' && (
        <Modal title="New Porting Request" onClose={() => setModal(false)}
          onSave={create} saving={saving} saveLabel="Create Request" saveIcon="plus">
          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>Tenant *</label>
            <select style={T.input_s()} value={form.tenant_id}
              onChange={e => setForm({ ...form, tenant_id: e.target.value })}>
              <option value="">Select tenant…</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name} ({t.domain})</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>Phone number to port *</label>
            <input style={T.input_s()} placeholder="+27 11 000 0000"
              value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>Losing carrier</label>
            <input style={T.input_s()} placeholder="e.g. Vodacom, MTN, Telkom"
              value={form.from_carrier} onChange={e => setForm({ ...form, from_carrier: e.target.value })} />
          </div>
          <div style={{ marginBottom: 4 }}>
            <label style={s.label}>Notes</label>
            <textarea style={{ ...T.input_s(), height: 80, resize: 'vertical' }}
              placeholder="Any additional information…"
              value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        </Modal>
      )}

      {/* Edit modal */}
      {modal && modal !== 'create' && (
        <Modal title="Edit Porting Request" onClose={() => setModal(false)}
          onSave={update} saving={saving} saveLabel="Save changes" saveIcon="check">
          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>Phone number</label>
            <input style={T.input_s()} value={modal.number}
              onChange={e => setModal({ ...modal, number: e.target.value })} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>Losing carrier</label>
            <input style={T.input_s()} value={modal.from_carrier}
              onChange={e => setModal({ ...modal, from_carrier: e.target.value })} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>Status</label>
            <select style={T.input_s()} value={modal.status}
              onChange={e => setModal({ ...modal, status: e.target.value })}>
              {STATUSES.map(st => <option key={st} value={st}>{STATUS_LABEL[st]}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 4 }}>
            <label style={s.label}>Notes</label>
            <textarea style={{ ...T.input_s(), height: 90, resize: 'vertical' }}
              value={modal.notes}
              onChange={e => setModal({ ...modal, notes: e.target.value })} />
          </div>
        </Modal>
      )}
    </div>
  );
}

function Chip({ label, count, active, color, onClick }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, border: `1px solid ${active ? color : T.border}`, background: active ? color + '18' : 'transparent', color: active ? color : T.textSub, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
      {label}
      <span style={{ background: active ? color + '30' : T.surface, borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{count}</span>
    </button>
  );
}

function Modal({ title, onClose, onSave, saving, saveLabel, saveIcon, children }) {
  return (
    <div style={overlay}>
      <div style={s.modal} className="slide-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: T.text }}>{title}</h3>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textSub }} onClick={onClose}>
            <Icon name="xMark" size={18} />
          </button>
        </div>
        {children}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button style={T.btn_s('ghost')} onClick={onClose}>Cancel</button>
          <button style={T.btn_s('primary')} onClick={onSave} disabled={saving}>
            {saving ? <span className="spin" style={smSpinner} /> : <Icon name={saveIcon} size={14} />}
            {saving ? 'Saving…' : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlay   = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' };
const lgSpinner = { width: 28, height: 28, border: '3px solid rgba(99,102,241,0.2)', borderTopColor: T.primary, borderRadius: '50%', display: 'inline-block' };
const smSpinner = { width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' };

const s = {
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title:        { margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: T.text },
  subtitle:     { margin: 0, fontSize: 14, color: T.textSub },
  chips:        { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  th:           { textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 16px 12px 0', borderBottom: '1px solid ' + T.border },
  tr:           { borderBottom: '1px solid ' + T.border },
  td:           { padding: '13px 16px 13px 0', verticalAlign: 'middle' },
  tenantDot:    { width: 8, height: 8, borderRadius: '50%', background: T.primary, flexShrink: 0 },
  statusSelect: { padding: '5px 10px', borderRadius: 6, border: '1px solid', background: T.surface, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  label:        { display: 'block', fontSize: 12, fontWeight: 600, color: T.textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' },
  modal:        { background: T.card, border: '1px solid ' + T.border, borderRadius: 16, padding: 28, width: 480, maxWidth: '90vw', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' },
};

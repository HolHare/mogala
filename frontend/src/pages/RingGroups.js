import { useState, useEffect } from 'react';
import { request } from '../api';
import { T } from '../theme';
import { Icon } from '../components/Icons';

const STRATEGIES = [
  { value: 'simultaneous', label: 'Ring all at once', desc: 'All extensions ring at the same time' },
  { value: 'round_robin',  label: 'Round robin',      desc: 'Distribute calls evenly across agents' },
  { value: 'sequential',   label: 'Sequential',       desc: 'Ring one at a time in order' },
];

const STUB_GROUPS = [
  { id: '1', name: 'Sales Team', strategy: 'simultaneous', members: ['101', '102', '103'], timeout: 30 },
  { id: '2', name: 'Support',    strategy: 'round_robin',  members: ['201', '202'],        timeout: 20 },
];

export default function RingGroups() {
  const [groups, setGroups] = useState(STUB_GROUPS);
  const [extensions, setExtensions] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', strategy: 'simultaneous', members: [], timeout: 30 });

  useEffect(() => {
    request('/api/extensions').then(d => setExtensions(Array.isArray(d) ? d : []));
  }, []);

  const openCreate = () => { setForm({ name: '', strategy: 'simultaneous', members: [], timeout: 30 }); setModal('create'); };
  const openEdit = (g) => { setForm({ name: g.name, strategy: g.strategy, members: [...g.members], timeout: g.timeout }); setModal(g); };

  const save = () => {
    if (!form.name) return;
    if (modal === 'create') {
      setGroups(prev => [...prev, { id: Date.now().toString(), ...form }]);
    } else {
      setGroups(prev => prev.map(g => g.id === modal.id ? { ...g, ...form } : g));
    }
    setModal(null);
  };

  const remove = (id) => {
    if (!window.confirm('Delete this ring group?')) return;
    setGroups(prev => prev.filter(g => g.id !== id));
  };

  const toggleMember = (ext) => {
    setForm(f => ({
      ...f,
      members: f.members.includes(ext)
        ? f.members.filter(m => m !== ext)
        : [...f.members, ext],
    }));
  };

  const stratLabel = (val) => STRATEGIES.find(s => s.value === val)?.label || val;

  return (
    <div className="fade-up">
      {modal && (
        <div style={overlay}>
          <div style={s.modal} className="slide-in">
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>{modal === 'create' ? 'Create Ring Group' : 'Edit Ring Group'}</h3>
              <button style={s.closeBtn} onClick={() => setModal(null)}><Icon name="xMark" size={18} /></button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={s.label}>Group name</label>
              <input style={T.input_s()} placeholder="e.g. Sales Team" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={s.label}>Ring strategy</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                {STRATEGIES.map(st => (
                  <label key={st.value} style={{ ...s.stratOption, ...(form.strategy === st.value ? s.stratActive : {}) }}>
                    <input type="radio" name="strategy" value={st.value} checked={form.strategy === st.value}
                      onChange={() => setForm({ ...form, strategy: st.value })} style={{ display: 'none' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: T.text }}>{st.label}</div>
                      <div style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}>{st.desc}</div>
                    </div>
                    {form.strategy === st.value && <Icon name="check" size={16} color={T.primary} />}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={s.label}>Timeout (seconds)</label>
              <input style={T.input_s()} type="number" placeholder="30" value={form.timeout}
                onChange={e => setForm({ ...form, timeout: Number(e.target.value) })} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={s.label}>Members ({form.members.length} selected)</label>
              {extensions.length === 0 ? (
                <p style={{ color: T.textSub, fontSize: 13, margin: '8px 0' }}>No extensions available — create extensions first</p>
              ) : (
                <div style={s.memberGrid}>
                  {extensions.map(e => {
                    const selected = form.members.includes(e.extension);
                    return (
                      <button key={e.id} style={{ ...s.memberChip, ...(selected ? s.memberActive : {}) }}
                        onClick={() => toggleMember(e.extension)}>
                        {selected && <Icon name="check" size={12} color={T.primary} />}
                        <span>{e.extension}</span>
                        {(e.first_name || e.last_name) && <span style={{ color: T.textSub, fontSize: 11 }}>{e.first_name}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button style={T.btn_s('ghost')} onClick={() => setModal(null)}>Cancel</button>
              <button style={T.btn_s('primary')} onClick={save}>
                <Icon name="check" size={15} />
                {modal === 'create' ? 'Create group' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={s.header}>
        <div>
          <h1 style={s.title}>Ring Groups</h1>
          <p style={s.subtitle}>Group extensions together with ring strategies</p>
        </div>
        <button style={T.btn_s('primary')} onClick={openCreate}>
          <Icon name="plus" size={16} /> New Ring Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div style={{ ...T.card_s(), textAlign: 'center', padding: '60px 20px' }}>
          <div style={s.emptyIcon}><Icon name="userGroup" size={26} color={T.primary} /></div>
          <p style={s.emptyTitle}>No ring groups yet</p>
          <p style={s.emptySub}>Create groups to route calls to teams of agents</p>
        </div>
      ) : (
        <div style={s.groupGrid}>
          {groups.map(g => (
            <div key={g.id} style={T.card_s()}>
              <div style={s.groupHeader}>
                <div style={s.groupIcon}><Icon name="userGroup" size={20} color={T.primary} /></div>
                <div style={{ flex: 1 }}>
                  <div style={s.groupName}>{g.name}</div>
                  <div style={s.groupMeta}>{g.members.length} members · {stratLabel(g.strategy)}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={T.btn_s('ghost')} onClick={() => openEdit(g)}><Icon name="pencil" size={14} /></button>
                  <button style={T.btn_s('danger')} onClick={() => remove(g.id)}><Icon name="trash" size={14} /></button>
                </div>
              </div>

              <div style={s.stratBadge}>
                <Icon name="arrowPath" size={13} color={T.primary} />
                <span>{stratLabel(g.strategy)}</span>
                <span style={{ color: T.textMuted }}>·</span>
                <span style={{ color: T.textSub }}>{g.timeout}s timeout</span>
              </div>

              <div style={s.memberList}>
                {g.members.map(m => (
                  <span key={m} style={s.memberTag}>{m}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' };

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: T.text },
  subtitle: { margin: 0, fontSize: 14, color: T.textSub },
  groupGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 },
  groupHeader: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  groupIcon: { width: 40, height: 40, borderRadius: 10, background: T.primaryDim, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  groupName: { fontWeight: 700, fontSize: 16, color: T.text, marginBottom: 2 },
  groupMeta: { fontSize: 13, color: T.textSub },
  stratBadge: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: T.primary, marginBottom: 14 },
  memberList: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  memberTag: { background: T.surface, border: '1px solid ' + T.border, borderRadius: 6, padding: '4px 10px', fontSize: 13, fontWeight: 600, color: T.text },
  modal: { background: T.card, border: '1px solid ' + T.border, borderRadius: 16, padding: 28, width: 500, maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: T.text },
  closeBtn: { background: 'none', border: 'none', color: T.textSub, cursor: 'pointer', padding: 4 },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: T.textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' },
  stratOption: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 8, border: '1px solid ' + T.border, cursor: 'pointer', background: T.surface },
  stratActive: { borderColor: T.primary + '66', background: T.primaryDim },
  memberGrid: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  memberChip: { display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid ' + T.border, background: T.surface, color: T.textSub, fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  memberActive: { borderColor: T.primary + '66', background: T.primaryDim, color: T.text },
  emptyIcon: { width: 56, height: 56, borderRadius: 16, background: T.primaryDim, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' },
  emptyTitle: { margin: '0 0 6px', fontWeight: 600, color: T.text, fontSize: 15 },
  emptySub: { margin: 0, color: T.textSub, fontSize: 14 },
};

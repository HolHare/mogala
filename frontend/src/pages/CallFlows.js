import { useState } from 'react';
import { T } from '../theme';
import { Icon } from '../components/Icons';

const STEP_TYPES = [
  { value: 'answer',     label: 'Answer call',        icon: 'phone',     color: T.success },
  { value: 'greet',      label: 'Play greeting',       icon: 'menuAlt',   color: T.info },
  { value: 'ivr',        label: 'IVR menu',            icon: 'hash',      color: T.primary },
  { value: 'ring_group', label: 'Ring group',          icon: 'userGroup', color: T.warning },
  { value: 'extension',  label: 'Forward to extension',icon: 'phone',     color: T.primary },
  { value: 'voicemail',  label: 'Voicemail',           icon: 'bell',      color: T.textSub },
  { value: 'hangup',     label: 'Hang up',             icon: 'xMark',     color: T.error },
];

const STUB_FLOWS = [
  {
    id: '1', name: 'Inbound Main', number: '+441234567890',
    steps: [
      { id: 's1', type: 'answer',     label: 'Answer call',     config: {} },
      { id: 's2', type: 'ivr',        label: 'Main Menu IVR',   config: { menu: 'Main Menu' } },
      { id: 's3', type: 'ring_group', label: 'Sales Team',      config: { group: 'Sales Team' } },
      { id: 's4', type: 'voicemail',  label: 'Voicemail box',   config: {} },
    ],
  },
];

export default function CallFlows() {
  const [flows, setFlows] = useState(STUB_FLOWS);
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', number: '' });
  const [addStep, setAddStep] = useState(false);
  const [stepType, setStepType] = useState('ring_group');
  const [stepTarget, setStepTarget] = useState('');

  const createFlow = () => {
    if (!form.name) return;
    const flow = {
      id: Date.now().toString(), name: form.name, number: form.number,
      steps: [{ id: 'a1', type: 'answer', label: 'Answer call', config: {} }],
    };
    setFlows(prev => [...prev, flow]);
    setSelected(flow);
    setModal(false);
    setForm({ name: '', number: '' });
  };

  const addStepToFlow = () => {
    const st = STEP_TYPES.find(s => s.value === stepType);
    const step = { id: Date.now().toString(), type: stepType, label: stepTarget || st.label, config: { target: stepTarget } };
    const updated = { ...selected, steps: [...selected.steps, step] };
    setFlows(prev => prev.map(f => f.id === selected.id ? updated : f));
    setSelected(updated);
    setAddStep(false);
    setStepTarget('');
  };

  const removeStep = (stepId) => {
    const updated = { ...selected, steps: selected.steps.filter(s => s.id !== stepId) };
    setFlows(prev => prev.map(f => f.id === selected.id ? updated : f));
    setSelected(updated);
  };

  const deleteFlow = (id) => {
    if (!window.confirm('Delete this call flow?')) return;
    setFlows(prev => prev.filter(f => f.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  return (
    <div className="fade-up">
      {modal && (
        <div style={overlay}>
          <div style={s.modal} className="slide-in">
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Create Call Flow</h3>
              <button style={s.closeBtn} onClick={() => setModal(false)}><Icon name="xMark" size={18} /></button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={s.label}>Flow name</label>
              <input style={T.input_s()} placeholder="e.g. Inbound Main" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={s.label}>Inbound number (optional)</label>
              <input style={T.input_s()} placeholder="+441234567890" value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} />
              <p style={{ margin: '6px 0 0', fontSize: 12, color: T.textMuted }}>Attach a DID to trigger this flow automatically</p>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button style={T.btn_s('ghost')} onClick={() => setModal(false)}>Cancel</button>
              <button style={T.btn_s('primary')} onClick={createFlow}><Icon name="check" size={15} /> Create</button>
            </div>
          </div>
        </div>
      )}

      <div style={s.header}>
        <div>
          <h1 style={s.title}>Call Flows</h1>
          <p style={s.subtitle}>Design inbound call routing step by step</p>
        </div>
        <button style={T.btn_s('primary')} onClick={() => setModal(true)}>
          <Icon name="plus" size={16} /> New Flow
        </button>
      </div>

      <div style={s.layout}>
        {/* Flow list */}
        <div style={s.sidebar}>
          {flows.length === 0
            ? <p style={{ color: T.textSub, fontSize: 14, padding: 12 }}>No flows yet</p>
            : flows.map(f => (
              <div key={f.id} style={{ ...s.flowItem, ...(selected?.id === f.id ? s.flowActive : {}) }}
                onClick={() => { setSelected(f); setAddStep(false); }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: selected?.id === f.id ? T.text : T.text }}>{f.name}</div>
                  {f.number && <div style={{ fontSize: 11, color: T.textSub, marginTop: 2 }}>{f.number}</div>}
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{f.steps.length} steps</div>
                </div>
                <button style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', padding: 2 }}
                  onClick={e => { e.stopPropagation(); deleteFlow(f.id); }}>
                  <Icon name="trash" size={13} />
                </button>
              </div>
            ))}
        </div>

        {/* Step editor */}
        {selected ? (
          <div>
            <div style={T.card_s()}>
              <div style={s.flowEditorHeader}>
                <div>
                  <h3 style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 700, color: T.text }}>{selected.name}</h3>
                  {selected.number && <div style={{ fontSize: 13, color: T.textSub }}>{selected.number}</div>}
                </div>
              </div>

              <div style={s.stepList}>
                {selected.steps.map((step, idx) => {
                  const st = STEP_TYPES.find(s => s.value === step.type) || STEP_TYPES[0];
                  return (
                    <div key={step.id} style={s.stepWrapper}>
                      {idx > 0 && <div style={s.stepConnector}><div style={s.connectorLine} /></div>}
                      <div style={s.stepCard}>
                        <div style={{ ...s.stepIcon, background: st.color + '22', border: '1px solid ' + st.color + '44' }}>
                          <Icon name={st.icon} size={18} color={st.color} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: T.text }}>{st.label}</div>
                          {step.label !== st.label && <div style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}>{step.label}</div>}
                          {step.config?.target && <div style={{ fontSize: 12, color: T.primary, marginTop: 2 }}>→ {step.config.target}</div>}
                        </div>
                        {step.type !== 'answer' && (
                          <button style={T.btn_s('danger')} onClick={() => removeStep(step.id)}>
                            <Icon name="trash" size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Add step */}
                {addStep ? (
                  <div style={s.addStepCard}>
                    <div style={s.stepConnector}><div style={s.connectorLine} /></div>
                    <div style={{ ...T.card_s(), borderStyle: 'dashed', padding: 16, marginTop: 0 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                        <div>
                          <label style={s.label}>Step type</label>
                          <select style={{ ...T.input_s() }} value={stepType} onChange={e => setStepType(e.target.value)}>
                            {STEP_TYPES.filter(s => s.value !== 'answer').map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </div>
                        {['extension', 'ring_group', 'ivr', 'greet'].includes(stepType) && (
                          <div>
                            <label style={s.label}>Target</label>
                            <input style={T.input_s()} placeholder={stepType === 'extension' ? 'Extension no.' : 'Name'} value={stepTarget} onChange={e => setStepTarget(e.target.value)} />
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button style={T.btn_s('primary')} onClick={addStepToFlow}><Icon name="plus" size={14} /> Add step</button>
                        <button style={T.btn_s('ghost')} onClick={() => setAddStep(false)}>Cancel</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={s.stepWrapper}>
                    <div style={s.stepConnector}><div style={s.connectorLine} /></div>
                    <button style={s.addBtn} onClick={() => setAddStep(true)}>
                      <Icon name="plus" size={16} color={T.primary} /> Add step
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ ...T.card_s(), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
            <div style={s.emptyIcon}><Icon name="share" size={26} color={T.primary} /></div>
            <p style={s.emptyTitle}>Select a flow to edit</p>
            <p style={s.emptySub}>Click a flow from the list or create a new one</p>
          </div>
        )}
      </div>
    </div>
  );
}

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' };

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: T.text },
  subtitle: { margin: 0, fontSize: 14, color: T.textSub },
  layout: { display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16, alignItems: 'start' },
  sidebar: { ...T.card_s(), padding: 8 },
  flowItem: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4, border: '1px solid transparent' },
  flowActive: { background: T.primaryDim, border: '1px solid ' + T.primary + '44' },
  flowEditorHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  stepList: { display: 'flex', flexDirection: 'column' },
  stepWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  stepConnector: { display: 'flex', justifyContent: 'center', height: 24 },
  connectorLine: { width: 2, height: '100%', background: T.border },
  stepCard: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: T.surface, border: '1px solid ' + T.border, borderRadius: 12, width: '100%', boxSizing: 'border-box' },
  stepIcon: { width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  addStepCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' },
  addBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, border: '2px dashed ' + T.primary + '44', background: T.primaryDim, color: T.primary, fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%', justifyContent: 'center' },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: T.textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' },
  modal: { background: T.card, border: '1px solid ' + T.border, borderRadius: 16, padding: 28, width: 440, maxWidth: '90vw', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: T.text },
  closeBtn: { background: 'none', border: 'none', color: T.textSub, cursor: 'pointer', padding: 4 },
  emptyIcon: { width: 56, height: 56, borderRadius: 16, background: T.primaryDim, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' },
  emptyTitle: { margin: '0 0 6px', fontWeight: 600, color: T.text, fontSize: 15 },
  emptySub: { margin: 0, color: T.textSub, fontSize: 14 },
};

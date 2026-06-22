import { useState, useEffect } from 'react';
import { request } from '../api';
import { T } from '../theme';
import { Icon } from '../components/Icons';

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};

function Toast({ msg }) {
  const color = msg.type === 'error' ? T.error : T.success;
  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 2000,
      background: T.card, border: `1px solid ${color}55`,
      borderLeft: `3px solid ${color}`, borderRadius: 8,
      padding: '12px 18px', color: T.text, fontSize: 14,
    }}>{msg.text}</div>
  );
}

// ── Plan modal ────────────────────────────────────────────────────────────────
function PlanModal({ plan, onClose, onSaved }) {
  const isNew = !plan.id;
  const [form, setForm] = useState({ name: plan.name || '', description: plan.description || '', active: plan.active ?? true });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    if (!form.name.trim()) { setErr('Name is required'); return; }
    setSaving(true);
    const data = isNew
      ? await request('/api/dial-plans', { method: 'POST', body: JSON.stringify(form) })
      : await request(`/api/dial-plans/${plan.id}`, { method: 'PUT', body: JSON.stringify(form) });
    setSaving(false);
    if (data.error) { setErr(data.error); return; }
    onSaved(isNew ? 'Plan created' : 'Plan updated');
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...s.modal }} onClick={e => e.stopPropagation()} className="slide-in">
        <div style={s.modalHeader}>
          <span style={s.modalTitle}>{isNew ? 'New Dial Plan' : 'Edit Dial Plan'}</span>
          <button style={s.closeBtn} onClick={onClose}><Icon name="xMark" size={18} /></button>
        </div>
        {err && <div style={{ color: T.error, fontSize: 13, marginBottom: 12 }}>{err}</div>}
        <label style={s.label}>Plan Name</label>
        <input style={T.input_s()} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Default Outbound" />
        <label style={{ ...s.label, marginTop: 12 }}>Description</label>
        <input style={T.input_s()} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
        <label style={{ ...s.label, marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />
          Active
        </label>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button style={T.btn_s('ghost')} onClick={onClose}>Cancel</button>
          <button style={T.btn_s('primary')} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Rule modal ────────────────────────────────────────────────────────────────
function RuleModal({ rule, planId, trunks, onClose, onSaved }) {
  const isNew = !rule.id;
  const emptyRule = { name: '', pattern: '', trunk_id: trunks[0]?.id || '', priority: 10, strip_digits: 0, prepend: '', active: true };
  const [form, setForm] = useState(isNew ? emptyRule : {
    name: rule.name || '', pattern: rule.pattern, trunk_id: rule.trunk_id,
    priority: rule.priority, strip_digits: rule.strip_digits, prepend: rule.prepend, active: rule.active,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    if (!form.pattern.trim()) { setErr('Pattern is required'); return; }
    if (!form.trunk_id) { setErr('Select a trunk'); return; }
    setSaving(true);
    const body = JSON.stringify({ ...form, priority: Number(form.priority), strip_digits: Number(form.strip_digits) });
    const data = isNew
      ? await request(`/api/dial-plans/${planId}/rules`, { method: 'POST', body })
      : await request(`/api/dial-plans/${planId}/rules/${rule.id}`, { method: 'PUT', body });
    setSaving(false);
    if (data.error) { setErr(data.error); return; }
    onSaved(isNew ? 'Rule added' : 'Rule updated');
  };

  const fi = (key, type = 'text') => ({
    value: form[key], type,
    onChange: e => setForm({ ...form, [key]: e.target.value }),
    style: T.input_s(),
  });

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...s.modal, maxWidth: 520 }} onClick={e => e.stopPropagation()} className="slide-in">
        <div style={s.modalHeader}>
          <span style={s.modalTitle}>{isNew ? 'Add Rule' : 'Edit Rule'}</span>
          <button style={s.closeBtn} onClick={onClose}><Icon name="xMark" size={18} /></button>
        </div>
        {err && <div style={{ color: T.error, fontSize: 13, marginBottom: 12 }}>{err}</div>}

        <div style={s.grid2}>
          <div>
            <label style={s.label}>Rule Name</label>
            <input {...fi('name')} placeholder="e.g. Local SA mobile" />
          </div>
          <div>
            <label style={s.label}>Pattern (prefix)</label>
            <input {...fi('pattern')} placeholder="e.g. 27 or + for all" />
          </div>
        </div>

        <label style={{ ...s.label, marginTop: 12 }}>Trunk</label>
        <select style={{ ...T.input_s() }} value={form.trunk_id} onChange={e => setForm({ ...form, trunk_id: e.target.value })}>
          <option value="">— select trunk —</option>
          {trunks.map(t => <option key={t.id} value={t.id}>{t.name} ({t.host})</option>)}
        </select>

        <div style={{ ...s.grid2, marginTop: 12 }}>
          <div>
            <label style={s.label}>Priority (lower = first)</label>
            <input {...fi('priority', 'number')} min={1} />
          </div>
          <div>
            <label style={s.label}>Strip leading digits</label>
            <input {...fi('strip_digits', 'number')} min={0} />
          </div>
        </div>

        <label style={{ ...s.label, marginTop: 12 }}>Prepend digits</label>
        <input {...fi('prepend')} placeholder="e.g. 0 or 00 or +27" style={{ ...T.input_s(), maxWidth: 180 }} />

        <label style={{ ...s.label, marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />
          Active
        </label>

        <div style={{ fontSize: 12, color: T.textMuted, marginTop: 8 }}>
          Pattern examples: <code>27</code> = match numbers starting with 27 &nbsp;|&nbsp; <code>+</code> = match all
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button style={T.btn_s('ghost')} onClick={onClose}>Cancel</button>
          <button style={T.btn_s('primary')} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DialPlans() {
  const [plans, setPlans] = useState([]);
  const [trunks, setTrunks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [rules, setRules] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [planModal, setPlanModal] = useState(null); // null | {} (new) | plan obj
  const [ruleModal, setRuleModal] = useState(null); // null | {} (new) | rule obj
  const [toast, setToast] = useState(null);

  const flash = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3500); };

  const loadPlans = () => request('/api/dial-plans').then(d => {
    setPlans(Array.isArray(d) ? d : []);
    setLoading(false);
  });

  const loadTrunks = () => request('/api/trunks').then(d => setTrunks(Array.isArray(d) ? d : []));

  useEffect(() => { loadPlans(); loadTrunks(); }, []);

  const selectPlan = (plan) => {
    setSelectedPlan(plan);
    setRulesLoading(true);
    request(`/api/dial-plans/${plan.id}/rules`).then(d => {
      setRules(Array.isArray(d) ? d : []);
      setRulesLoading(false);
    });
  };

  const deletePlan = async (plan) => {
    if (!window.confirm(`Delete dial plan "${plan.name}" and all its rules?`)) return;
    await request(`/api/dial-plans/${plan.id}`, { method: 'DELETE' });
    if (selectedPlan?.id === plan.id) { setSelectedPlan(null); setRules([]); }
    loadPlans();
    flash('Plan deleted');
  };

  const deleteRule = async (rule) => {
    if (!window.confirm('Delete this rule?')) return;
    await request(`/api/dial-plans/${selectedPlan.id}/rules/${rule.id}`, { method: 'DELETE' });
    setRules(rules.filter(r => r.id !== rule.id));
    flash('Rule deleted');
  };

  const afterPlanSaved = (msg) => {
    setPlanModal(null);
    loadPlans();
    flash(msg);
  };

  const afterRuleSaved = (msg) => {
    setRuleModal(null);
    if (selectedPlan) {
      setRulesLoading(true);
      request(`/api/dial-plans/${selectedPlan.id}/rules`).then(d => {
        setRules(Array.isArray(d) ? d : []);
        setRulesLoading(false);
      });
    }
    loadPlans(); // refresh rule_count
    flash(msg);
  };

  return (
    <div className="fade-up">
      {toast && <Toast msg={toast} />}
      {planModal !== null && (
        <PlanModal plan={planModal} onClose={() => setPlanModal(null)} onSaved={afterPlanSaved} />
      )}
      {ruleModal !== null && selectedPlan && (
        <RuleModal rule={ruleModal} planId={selectedPlan.id} trunks={trunks}
          onClose={() => setRuleModal(null)} onSaved={afterRuleSaved} />
      )}

      <div style={s.pageHeader}>
        <div>
          <h2 style={s.title}>Dial Plans</h2>
          <p style={s.sub}>Configure outbound call routing rules — calls not matched to a local extension are routed via these plans.</p>
        </div>
        <button style={T.btn_s('primary')} onClick={() => setPlanModal({})}>
          <Icon name="plus" size={16} /> New Plan
        </button>
      </div>

      <div style={s.layout}>
        {/* Plans list */}
        <div style={s.planList}>
          <div style={s.panelHeader}>Plans {plans.length > 0 && <span style={s.badge}>{plans.length}</span>}</div>
          {loading ? (
            <div style={s.empty}>Loading…</div>
          ) : plans.length === 0 ? (
            <div style={s.empty}>No dial plans yet.<br />Create one to route outbound calls.</div>
          ) : plans.map(plan => (
            <div key={plan.id}
              style={{ ...s.planItem, ...(selectedPlan?.id === plan.id ? s.planItemActive : {}) }}
              onClick={() => selectPlan(plan)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, color: T.text, fontSize: 14 }}>{plan.name}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={T.badge_s(plan.active ? T.success : T.textMuted)}>
                    {plan.active ? 'active' : 'inactive'}
                  </span>
                </div>
              </div>
              {plan.description && <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>{plan.description}</div>}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: 12, color: T.textSub }}>{plan.rule_count} rule{plan.rule_count !== 1 ? 's' : ''}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={s.iconBtn} title="Edit" onClick={e => { e.stopPropagation(); setPlanModal(plan); }}>
                    <Icon name="pencil" size={14} />
                  </button>
                  <button style={{ ...s.iconBtn, color: T.error }} title="Delete" onClick={e => { e.stopPropagation(); deletePlan(plan); }}>
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Rules panel */}
        <div style={s.rulesPanel}>
          {!selectedPlan ? (
            <div style={s.emptyState}>
              <div style={s.emptyIcon}><Icon name="route" size={32} /></div>
              <div style={{ color: T.textSub, fontSize: 14 }}>Select a dial plan to view and manage its routing rules</div>
            </div>
          ) : (
            <>
              <div style={{ ...s.panelHeader, justifyContent: 'space-between' }}>
                <span>Rules for <strong style={{ color: T.text }}>{selectedPlan.name}</strong></span>
                <button style={T.btn_s('primary')} onClick={() => setRuleModal({})}>
                  <Icon name="plus" size={14} /> Add Rule
                </button>
              </div>

              {rulesLoading ? (
                <div style={s.empty}>Loading…</div>
              ) : rules.length === 0 ? (
                <div style={s.emptyState}>
                  <div style={{ color: T.textSub, fontSize: 14 }}>
                    No rules yet. Add rules to define how outbound calls are routed through trunks.
                  </div>
                </div>
              ) : (
                <table style={s.table}>
                  <thead>
                    <tr>
                      {['Pri', 'Name', 'Pattern', 'Trunk', 'Transform', 'Status', ''].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map(rule => (
                      <tr key={rule.id} style={s.tr}>
                        <td style={s.td}><span style={s.priorityBadge}>{rule.priority}</span></td>
                        <td style={s.td}><span style={{ color: T.text, fontWeight: 500 }}>{rule.name || '—'}</span></td>
                        <td style={s.td}><code style={s.code}>{rule.pattern}</code></td>
                        <td style={s.td}><span style={{ color: T.info }}>{rule.trunk_name || rule.trunk_id}</span></td>
                        <td style={s.td}>
                          <span style={{ fontSize: 12, color: T.textSub }}>
                            {rule.strip_digits > 0 ? `strip ${rule.strip_digits}` : ''}
                            {rule.strip_digits > 0 && rule.prepend ? ' + ' : ''}
                            {rule.prepend ? `prepend "${rule.prepend}"` : ''}
                            {!rule.strip_digits && !rule.prepend ? 'none' : ''}
                          </span>
                        </td>
                        <td style={s.td}>
                          <span style={T.badge_s(rule.active ? T.success : T.textMuted)}>
                            {rule.active ? 'on' : 'off'}
                          </span>
                        </td>
                        <td style={s.td}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button style={s.iconBtn} onClick={() => setRuleModal(rule)}><Icon name="pencil" size={13} /></button>
                            <button style={{ ...s.iconBtn, color: T.error }} onClick={() => deleteRule(rule)}><Icon name="trash" size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div style={s.hint}>
                Rules are evaluated in priority order (lowest number first). The first matching pattern wins.
                Pattern <code style={s.code}>+</code> or <code style={s.code}>*</code> matches all numbers.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  pageHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 },
  title: { fontSize: 22, fontWeight: 700, color: T.text, margin: 0 },
  sub: { fontSize: 13, color: T.textSub, marginTop: 4 },

  layout: { display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'start' },

  planList: {
    background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden',
  },
  panelHeader: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '14px 18px', borderBottom: `1px solid ${T.border}`,
    fontSize: 13, fontWeight: 600, color: T.textSub, letterSpacing: '0.05em', textTransform: 'uppercase',
  },
  badge: {
    background: T.primaryDim, color: T.primary, borderRadius: 999, fontSize: 11,
    fontWeight: 700, padding: '1px 8px',
  },
  planItem: {
    padding: '14px 18px', cursor: 'pointer', borderBottom: `1px solid ${T.border}`,
    transition: 'background 0.15s',
  },
  planItemActive: { background: T.primaryDim, borderLeft: `3px solid ${T.primary}` },

  rulesPanel: {
    background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden', minHeight: 300,
  },

  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: 60, gap: 12, color: T.textMuted,
  },
  emptyIcon: { color: T.textMuted, opacity: 0.5 },
  empty: { padding: 24, color: T.textSub, fontSize: 13, textAlign: 'center' },

  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 16px', fontSize: 11, fontWeight: 600, color: T.textSub, textAlign: 'left', borderBottom: `1px solid ${T.border}`, textTransform: 'uppercase', letterSpacing: '0.05em' },
  tr: { borderBottom: `1px solid ${T.border}` },
  td: { padding: '12px 16px', fontSize: 14 },

  priorityBadge: { background: T.primaryDim, color: T.primary, borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700 },
  code: { background: 'rgba(255,255,255,0.06)', borderRadius: 4, padding: '2px 6px', fontSize: 12, fontFamily: 'monospace' },

  hint: { padding: '14px 18px', fontSize: 12, color: T.textMuted, borderTop: `1px solid ${T.border}` },

  iconBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: T.textSub, padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center' },

  modal: { background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 28, width: '100%', maxWidth: 460 },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 16, fontWeight: 700, color: T.text },
  closeBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: T.textSub, padding: 4 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: T.textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
};

import { useState, useEffect } from 'react';
import { request } from '../api';
import { T } from '../theme';
import { Icon } from './Icons';

export default function DispositionModal({ onClose }) {
  const [codes, setCodes] = useState([]);
  const [selected, setSelected] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    request('/api/admin/disposition-codes').then(d => {
      const active = Array.isArray(d) ? d.filter(c => c.active) : [];
      setCodes(active);
    });
  }, []);

  const submit = async () => {
    if (!selected) { setError('Please select a disposition code'); return; }
    setSaving(true);
    const res = await request('/api/agent/disposition', {
      method: 'POST',
      body: JSON.stringify({ disposition_code_id: selected, notes }),
    });
    setSaving(false);
    if (res.id || res.message) {
      onClose();
    } else {
      setError(res.error || 'Failed to submit');
    }
  };

  // Group codes by category
  const grouped = codes.reduce((acc, c) => {
    const cat = c.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(c);
    return acc;
  }, {});

  return (
    <div style={s.overlay}>
      <div style={s.modal} className="fade-up">
        <div style={s.header}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: T.text }}>Call Disposition</h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: T.textSub }}>Select a disposition code to wrap up this call</p>
          </div>
          <div style={s.callBadge}>
            <div style={{ ...s.endedDot }} />
            <span style={{ fontSize: 12, color: T.error }}>Call ended</span>
          </div>
        </div>

        {codes.length === 0 ? (
          <div style={{ padding: '20px 0', color: T.textSub, fontSize: 14, textAlign: 'center' }}>
            No disposition codes configured.
            <button style={{ ...T.btn_s('ghost'), marginTop: 16, width: '100%' }} onClick={onClose}>
              Skip
            </button>
          </div>
        ) : (
          <>
            <div style={s.codeList}>
              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat} style={{ marginBottom: 12 }}>
                  <div style={s.catLabel}>{cat}</div>
                  <div style={s.codeGrid}>
                    {items.map(c => (
                      <button key={c.id}
                        style={{ ...s.codeBtn, ...(selected === c.id ? s.codeBtnActive : {}) }}
                        onClick={() => setSelected(c.id)}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: selected === c.id ? T.primary : T.textMuted, fontFamily: 'monospace' }}>{c.code}</span>
                        <span style={{ fontSize: 13, color: selected === c.id ? T.text : T.textSub, marginTop: 2 }}>{c.label}</span>
                        {selected === c.id && (
                          <div style={s.checkMark}><Icon name="check" size={12} color={T.primary} /></div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 4, marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: T.textSub, fontWeight: 500, display: 'block', marginBottom: 6 }}>Notes (optional)</label>
              <textarea
                style={{ ...T.input_s(), resize: 'vertical', minHeight: 64, fontSize: 13 }}
                placeholder="Add any notes about this call…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            {error && <div style={{ background: T.errorDim, border: '1px solid rgba(239,68,68,0.25)', color: T.error, borderRadius: 8, padding: '9px 14px', fontSize: 13, marginBottom: 14 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ ...T.btn_s('primary'), flex: 1, justifyContent: 'center' }}
                onClick={submit} disabled={saving}>
                {saving ? <span className="spin" style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }} /> : <Icon name="check" size={14} color="#fff" />}
                {saving ? 'Submitting…' : 'Submit & Become Available'}
              </button>
              <button style={T.btn_s('ghost')} onClick={onClose}>Skip</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: T.card, border: '1px solid ' + T.border, borderRadius: 16, padding: 28, width: '90%', maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,0.6)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  callBadge: { display: 'flex', alignItems: 'center', gap: 6, background: T.errorDim, border: '1px solid rgba(239,68,68,0.2)', borderRadius: 20, padding: '5px 12px', flexShrink: 0 },
  endedDot: { width: 8, height: 8, borderRadius: '50%', background: T.error },
  codeList: { maxHeight: 260, overflowY: 'auto', marginBottom: 16 },
  catLabel: { fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6, paddingLeft: 2 },
  codeGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 },
  codeBtn: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '10px 12px', borderRadius: 9, border: '1px solid ' + T.border, background: T.surface, cursor: 'pointer', textAlign: 'left', position: 'relative', transition: 'border-color 0.1s, background 0.1s' },
  codeBtnActive: { borderColor: T.primary, background: T.primaryDim },
  checkMark: { position: 'absolute', top: 8, right: 8 },
};

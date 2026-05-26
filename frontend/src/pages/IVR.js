import { useState } from 'react';
import { T } from '../theme';
import { Icon } from '../components/Icons';

const KEY_ACTIONS = [
  { value: 'extension',   label: 'Forward to extension' },
  { value: 'ring_group',  label: 'Forward to ring group' },
  { value: 'voicemail',   label: 'Leave voicemail' },
  { value: 'repeat',      label: 'Repeat menu' },
  { value: 'hangup',      label: 'Hang up' },
];

const STUB_MENUS = [
  {
    id: '1', name: 'Main Menu', greeting: 'Thank you for calling. Press 1 for Sales, Press 2 for Support, Press 0 for the operator.',
    keys: {
      '1': { action: 'ring_group',  target: 'Sales Team' },
      '2': { action: 'ring_group',  target: 'Support' },
      '0': { action: 'extension',   target: '100' },
      '*': { action: 'repeat',      target: '' },
    },
  },
];

export default function IVR() {
  const [menus, setMenus] = useState(STUB_MENUS);
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', greeting: '' });
  const [editKey, setEditKey] = useState(null);
  const [keyForm, setKeyForm] = useState({ key: '1', action: 'extension', target: '' });

  const createMenu = () => {
    if (!form.name) return;
    const menu = { id: Date.now().toString(), name: form.name, greeting: form.greeting, keys: {} };
    setMenus(prev => [...prev, menu]);
    setSelected(menu);
    setModal(false);
    setForm({ name: '', greeting: '' });
  };

  const updateGreeting = (txt) => {
    setMenus(prev => prev.map(m => m.id === selected.id ? { ...m, greeting: txt } : m));
    setSelected(prev => ({ ...prev, greeting: txt }));
  };

  const saveKey = () => {
    const updated = { ...selected, keys: { ...selected.keys, [keyForm.key]: { action: keyForm.action, target: keyForm.target } } };
    setMenus(prev => prev.map(m => m.id === selected.id ? updated : m));
    setSelected(updated);
    setEditKey(null);
  };

  const removeKey = (k) => {
    const newKeys = { ...selected.keys };
    delete newKeys[k];
    const updated = { ...selected, keys: newKeys };
    setMenus(prev => prev.map(m => m.id === selected.id ? updated : m));
    setSelected(updated);
  };

  const deleteMenu = (id) => {
    if (!window.confirm('Delete this IVR menu?')) return;
    setMenus(prev => prev.filter(m => m.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  return (
    <div className="fade-up">
      {modal && (
        <div style={overlay}>
          <div style={s.modal} className="slide-in">
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Create IVR Menu</h3>
              <button style={s.closeBtn} onClick={() => setModal(false)}><Icon name="xMark" size={18} /></button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={s.label}>Menu name</label>
              <input style={T.input_s()} placeholder="e.g. Main Menu" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={s.label}>Greeting message</label>
              <textarea style={{ ...T.input_s(), height: 80, resize: 'vertical' }}
                placeholder="Thank you for calling. Press 1 for Sales..."
                value={form.greeting} onChange={e => setForm({ ...form, greeting: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button style={T.btn_s('ghost')} onClick={() => setModal(false)}>Cancel</button>
              <button style={T.btn_s('primary')} onClick={createMenu}><Icon name="check" size={15} /> Create</button>
            </div>
          </div>
        </div>
      )}

      {editKey !== null && (
        <div style={overlay}>
          <div style={s.modal} className="slide-in">
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>{editKey === 'new' ? 'Add Key' : `Edit Key "${editKey}"`}</h3>
              <button style={s.closeBtn} onClick={() => setEditKey(null)}><Icon name="xMark" size={18} /></button>
            </div>
            {editKey === 'new' && (
              <div style={{ marginBottom: 16 }}>
                <label style={s.label}>Keypad digit</label>
                <select style={{ ...T.input_s() }} value={keyForm.key} onChange={e => setKeyForm({ ...keyForm, key: e.target.value })}>
                  {['0','1','2','3','4','5','6','7','8','9','*','#'].map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={s.label}>Action</label>
              <select style={{ ...T.input_s() }} value={keyForm.action} onChange={e => setKeyForm({ ...keyForm, action: e.target.value })}>
                {KEY_ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            {['extension', 'ring_group', 'voicemail'].includes(keyForm.action) && (
              <div style={{ marginBottom: 20 }}>
                <label style={s.label}>Target</label>
                <input style={T.input_s()} placeholder={keyForm.action === 'extension' ? 'Extension number' : 'Group name or voicemail box'} value={keyForm.target} onChange={e => setKeyForm({ ...keyForm, target: e.target.value })} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button style={T.btn_s('ghost')} onClick={() => setEditKey(null)}>Cancel</button>
              <button style={T.btn_s('primary')} onClick={saveKey}><Icon name="check" size={15} /> Save</button>
            </div>
          </div>
        </div>
      )}

      <div style={s.header}>
        <div>
          <h1 style={s.title}>IVR / Auto-Attendant</h1>
          <p style={s.subtitle}>Configure menu trees and key-press routing</p>
        </div>
        <button style={T.btn_s('primary')} onClick={() => setModal(true)}>
          <Icon name="plus" size={16} /> New IVR Menu
        </button>
      </div>

      <div style={s.layout}>
        {/* Menu list */}
        <div style={s.sidebar}>
          {menus.length === 0
            ? <p style={{ color: T.textSub, fontSize: 14, padding: 12 }}>No menus yet</p>
            : menus.map(m => (
              <div key={m.id} style={{ ...s.menuItem, ...(selected?.id === m.id ? s.menuActive : {}) }}
                onClick={() => { setSelected(m); setEditKey(null); }}>
                <Icon name="menuAlt" size={16} color={selected?.id === m.id ? T.primary : T.textSub} />
                <span style={{ flex: 1, fontWeight: 500, fontSize: 14 }}>{m.name}</span>
                <button style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', padding: 2 }}
                  onClick={e => { e.stopPropagation(); deleteMenu(m.id); }}>
                  <Icon name="trash" size={13} />
                </button>
              </div>
            ))}
        </div>

        {/* Editor */}
        {selected ? (
          <div style={s.editor}>
            <div style={{ ...T.card_s(), marginBottom: 16 }}>
              <label style={s.label}>Greeting message</label>
              <textarea style={{ ...T.input_s(), height: 72, resize: 'vertical' }}
                value={selected.greeting} onChange={e => updateGreeting(e.target.value)} />
              <p style={{ margin: '8px 0 0', fontSize: 12, color: T.textMuted }}>This text will be read by the text-to-speech engine when a caller enters this menu.</p>
            </div>

            <div style={T.card_s()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: T.text }}>Key Assignments</h3>
                <button style={T.btn_s('primary')} onClick={() => { setKeyForm({ key: '1', action: 'extension', target: '' }); setEditKey('new'); }}>
                  <Icon name="plus" size={14} /> Add key
                </button>
              </div>

              {Object.keys(selected.keys).length === 0 ? (
                <p style={{ color: T.textSub, fontSize: 14 }}>No keys assigned. Add a key to define caller options.</p>
              ) : (
                <div style={s.keyList}>
                  {Object.entries(selected.keys).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => {
                    const actionLabel = KEY_ACTIONS.find(a => a.value === v.action)?.label || v.action;
                    return (
                      <div key={k} style={s.keyRow}>
                        <div style={s.keyDigit}>{k}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500, fontSize: 14, color: T.text }}>{actionLabel}</div>
                          {v.target && <div style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}>→ {v.target}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button style={T.btn_s('ghost')} onClick={() => { setKeyForm({ key: k, action: v.action, target: v.target }); setEditKey(k); }}>
                            <Icon name="pencil" size={13} /> Edit
                          </button>
                          <button style={T.btn_s('danger')} onClick={() => removeKey(k)}>
                            <Icon name="trash" size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ ...T.card_s(), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
            <div style={s.emptyIcon}><Icon name="menuAlt" size={26} color={T.primary} /></div>
            <p style={s.emptyTitle}>Select a menu to edit</p>
            <p style={s.emptySub}>Choose a menu from the list or create a new one</p>
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
  menuItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', color: T.textSub, marginBottom: 2 },
  menuActive: { background: T.primaryDim, color: T.text },
  editor: {},
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: T.textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' },
  keyList: { display: 'flex', flexDirection: 'column', gap: 10 },
  keyRow: { display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: T.surface, border: '1px solid ' + T.border, borderRadius: 10 },
  keyDigit: { width: 40, height: 40, borderRadius: 10, background: T.primaryDim, border: '1px solid ' + T.primary + '44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: T.primaryHov, flexShrink: 0 },
  modal: { background: T.card, border: '1px solid ' + T.border, borderRadius: 16, padding: 28, width: 440, maxWidth: '90vw', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: T.text },
  closeBtn: { background: 'none', border: 'none', color: T.textSub, cursor: 'pointer', padding: 4 },
  emptyIcon: { width: 56, height: 56, borderRadius: 16, background: T.primaryDim, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' },
  emptyTitle: { margin: '0 0 6px', fontWeight: 600, color: T.text, fontSize: 15 },
  emptySub: { margin: 0, color: T.textSub, fontSize: 14 },
};

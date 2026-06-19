import { useState, useEffect } from 'react';
import { request } from '../api';
import { T } from '../theme';
import { Icon } from '../components/Icons';

const TABS = [
  { key: 'profile',   label: 'My Profile',       icon: 'userCircle' },
  { key: 'password',  label: 'Change Password',   icon: 'key' },
  { key: 'workspace', label: 'Workspace',         icon: 'building' },
];

export default function Settings() {
  const [tab, setTab]   = useState('profile');
  const [user, setUser] = useState(null);

  const load = () => request('/api/me').then(d => { if (d.user_id) setUser(d); });
  useEffect(() => { load(); }, []);

  if (!user) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <span className="spin" style={spinner} />
    </div>
  );

  const isAdmin = user.role === 'admin' || user.role === 'superadmin';
  const visibleTabs = isAdmin ? TABS : TABS.filter(t => t.key !== 'workspace');

  return (
    <div className="fade-up">
      <div style={s.header}>
        <h1 style={s.title}>Settings</h1>
        <p style={s.subtitle}>Manage your account and workspace</p>
      </div>

      <div style={s.layout}>
        {/* Tab sidebar */}
        <div style={s.tabSidebar}>
          {visibleTabs.map(t => (
            <button key={t.key} style={{ ...s.tabBtn, ...(tab === t.key ? s.tabActive : {}) }}
              onClick={() => setTab(t.key)}>
              <Icon name={t.icon} size={16} color={tab === t.key ? T.primary : T.textSub} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div style={s.panel}>
          {tab === 'profile'   && <ProfileTab user={user} onSaved={load} />}
          {tab === 'password'  && <PasswordTab />}
          {tab === 'workspace' && <WorkspaceTab />}
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ user, onSaved }) {
  const [form, setForm] = useState({
    first_name: user.firstName || '',
    last_name:  user.lastName  || '',
    phone:      user.phone     || '',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState(null);

  const save = async () => {
    setSaving(true);
    const data = await request('/api/me', { method: 'PUT', body: JSON.stringify(form) });
    setSaving(false);
    if (data.message) {
      setMsg({ type: 'success', text: 'Profile updated' });
      onSaved();
    } else {
      setMsg({ type: 'error', text: data.error || 'Failed to update profile' });
    }
    setTimeout(() => setMsg(null), 3000);
  };

  return (
    <div>
      <SectionHead title="My Profile" sub="Update your name and contact details" />
      <div style={s.row2}>
        <Field label="First name" value={form.first_name}
          onChange={e => setForm({ ...form, first_name: e.target.value })} />
        <Field label="Last name" value={form.last_name}
          onChange={e => setForm({ ...form, last_name: e.target.value })} />
      </div>
      <Field label="Email address" value={user.email} readOnly
        hint="Email cannot be changed here" />
      <Field label="Phone number" value={form.phone} placeholder="+27 …"
        onChange={e => setForm({ ...form, phone: e.target.value })} />

      {msg && <MsgBox msg={msg} />}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button style={T.btn_s('primary')} onClick={save} disabled={saving}>
          {saving ? <span className="spin" style={btnSpinner} /> : <Icon name="check" size={15} />}
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

function PasswordTab() {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState(null);

  const save = async () => {
    if (form.new_password.length < 8) {
      setMsg({ type: 'error', text: 'New password must be at least 8 characters' }); return;
    }
    if (form.new_password !== form.confirm) {
      setMsg({ type: 'error', text: 'Passwords do not match' }); return;
    }
    setSaving(true);
    const data = await request('/api/me/password', {
      method: 'POST',
      body: JSON.stringify({ current_password: form.current_password, new_password: form.new_password }),
    });
    setSaving(false);
    if (data.message) {
      setMsg({ type: 'success', text: 'Password changed successfully' });
      setForm({ current_password: '', new_password: '', confirm: '' });
    } else {
      setMsg({ type: 'error', text: data.error || 'Failed to change password' });
    }
    setTimeout(() => setMsg(null), 4000);
  };

  return (
    <div>
      <SectionHead title="Change Password" sub="Choose a strong password for your account" />
      <Field label="Current password" type="password" value={form.current_password}
        onChange={e => setForm({ ...form, current_password: e.target.value })} />
      <Field label="New password" type="password" placeholder="Min 8 characters" value={form.new_password}
        onChange={e => setForm({ ...form, new_password: e.target.value })} />
      <Field label="Confirm new password" type="password" value={form.confirm}
        onChange={e => setForm({ ...form, confirm: e.target.value })} />

      {msg && <MsgBox msg={msg} />}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button style={T.btn_s('primary')} onClick={save} disabled={saving}>
          {saving ? <span className="spin" style={btnSpinner} /> : <Icon name="key" size={15} />}
          {saving ? 'Saving…' : 'Update password'}
        </button>
      </div>
    </div>
  );
}

function WorkspaceTab() {
  const [ws, setWs]     = useState(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState(null);

  useEffect(() => {
    request('/api/workspace').then(d => {
      if (d.name) { setWs(d); setName(d.name); }
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const data = await request('/api/workspace', { method: 'PUT', body: JSON.stringify({ name }) });
    setSaving(false);
    if (data.message) {
      setMsg({ type: 'success', text: 'Workspace updated' });
      setWs(w => ({ ...w, name }));
    } else {
      setMsg({ type: 'error', text: data.error || 'Failed to update workspace' });
    }
    setTimeout(() => setMsg(null), 3000);
  };

  if (!ws) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <span className="spin" style={spinner} />
    </div>
  );

  return (
    <div>
      <SectionHead title="Workspace" sub="Manage your company details" />

      <Field label="Company name" value={name}
        onChange={e => setName(e.target.value)} />
      <Field label="Domain" value={ws.domain} readOnly
        hint="Domain is set at registration and cannot be changed" />

      <div style={s.infoCard}>
        <Icon name="shield" size={16} color={T.textSub} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 2 }}>Workspace status</div>
          <div style={{ fontSize: 13, color: T.textSub }}>
            {ws.suspended
              ? <span style={{ color: T.error }}>Suspended — contact support</span>
              : <span style={{ color: T.success }}>Active</span>}
          </div>
        </div>
      </div>

      {msg && <MsgBox msg={msg} />}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button style={T.btn_s('primary')} onClick={save} disabled={saving}>
          {saving ? <span className="spin" style={btnSpinner} /> : <Icon name="check" size={15} />}
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

function SectionHead({ title, sub }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700, color: T.text }}>{title}</h2>
      <p style={{ margin: 0, fontSize: 13, color: T.textSub }}>{sub}</p>
    </div>
  );
}

function Field({ label, hint, readOnly, ...props }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={s.label}>{label}</label>
      <input
        style={{ ...T.input_s(), ...(readOnly ? { opacity: 0.5, cursor: 'default' } : {}) }}
        readOnly={readOnly}
        {...props}
      />
      {hint && <p style={s.hint}>{hint}</p>}
    </div>
  );
}

function MsgBox({ msg }) {
  const isSuccess = msg.type === 'success';
  const c = isSuccess ? T.success : T.error;
  const bg = isSuccess ? T.successDim : T.errorDim;
  return (
    <div style={{ background: bg, border: `1px solid ${c}44`, color: c, borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
      <Icon name={isSuccess ? 'check' : 'xMark'} size={14} color={c} />
      {msg.text}
    </div>
  );
}

const spinner    = { width: 28, height: 28, border: '3px solid rgba(99,102,241,0.2)', borderTopColor: T.primary, borderRadius: '50%', display: 'inline-block' };
const btnSpinner = { width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' };

const s = {
  header:     { marginBottom: 24 },
  title:      { margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: T.text },
  subtitle:   { margin: 0, fontSize: 14, color: T.textSub },
  layout:     { display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24, alignItems: 'start' },
  tabSidebar: { background: T.card, border: '1px solid ' + T.border, borderRadius: 12, padding: 8, display: 'flex', flexDirection: 'column', gap: 2 },
  tabBtn:     { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 8, border: 'none', background: 'transparent', color: T.textSub, fontSize: 14, fontWeight: 500, cursor: 'pointer', textAlign: 'left' },
  tabActive:  { background: T.primaryDim, color: T.text },
  panel:      { background: T.card, border: '1px solid ' + T.border, borderRadius: 12, padding: 28 },
  row2:       { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  label:      { display: 'block', fontSize: 12, fontWeight: 600, color: T.textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' },
  hint:       { margin: '6px 0 0', fontSize: 12, color: T.textMuted },
  infoCard:   { display: 'flex', alignItems: 'flex-start', gap: 12, background: T.surface, border: '1px solid ' + T.border, borderRadius: 10, padding: '14px 16px', marginBottom: 20 },
};

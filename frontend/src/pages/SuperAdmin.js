import { useState, useEffect } from 'react';
import { request } from '../api';
import { T } from '../theme';
import { Icon } from '../components/Icons';

export default function SuperAdmin() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail]   = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loggingIn, setLoggingIn] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = () => {
    request('/api/admin/tenants').then(d => {
      setTenants(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  };
  useEffect(() => { load(); }, []);

  const flash = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  };

  const openDetail = async (tenant) => {
    setDetailLoading(true);
    setDetail({ tenant, users: [] });
    const data = await request(`/api/admin/tenants/${tenant.id}/users`);
    setDetail({ tenant, users: Array.isArray(data) ? data : [] });
    setDetailLoading(false);
  };

  const loginAsTenant = async (tenant) => {
    setLoggingIn(tenant.id);
    const data = await request(`/api/admin/tenants/${tenant.id}/impersonate`, { method: 'POST' });
    setLoggingIn(null);
    if (!data.token) { flash('Login failed', 'error'); return; }
    sessionStorage.setItem('superadmin_token', localStorage.getItem('token'));
    sessionStorage.setItem('impersonating', tenant.name);
    localStorage.setItem('token', data.token);
    window.location.reload();
  };

  const toggleSuspend = async (tenant) => {
    const verb = tenant.suspended ? 'Activate' : 'Suspend';
    if (!window.confirm(`${verb} "${tenant.name}"?`)) return;
    const data = await request(`/api/admin/tenants/${tenant.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ suspended: !tenant.suspended }),
    });
    if (data.error) { flash(data.error, 'error'); return; }
    flash(`Tenant ${verb.toLowerCase()}d`);
    load();
    if (detail?.tenant?.id === tenant.id) setDetail(null);
  };

  return (
    <div className="fade-up">
      {msg && (
        <div style={{ ...T.card_s(), marginBottom: 16, fontSize: 14,
          background: msg.type === 'error' ? T.errorDim : T.successDim,
          color: msg.type === 'error' ? T.error : T.success }}>
          {msg.text}
        </div>
      )}

      <div style={s.header}>
        <div>
          <h1 style={s.title}>Tenants</h1>
          <p style={s.subtitle}>{tenants.length} registered workspace{tenants.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div style={T.card_s()}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <span className="spin" style={lgSpinner} />
          </div>
        ) : tenants.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: T.textSub, fontSize: 14 }}>
            No tenants registered yet
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Workspace', 'Domain', 'Users', 'Status', 'Registered', 'Actions'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id} style={s.tr}>
                  <td style={s.td}>
                    <button style={s.nameBtn} onClick={() => openDetail(t)}>
                      <div style={s.tenantIcon}>
                        <Icon name="building" size={13} color={T.primary} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: T.text }}>{t.name}</div>
                      </div>
                    </button>
                  </td>
                  <td style={s.td}><span style={{ color: T.textSub, fontSize: 13 }}>{t.domain}</span></td>
                  <td style={s.td}><span style={{ color: T.text, fontWeight: 600 }}>{t.user_count}</span></td>
                  <td style={s.td}>
                    <span style={T.badge_s(t.suspended ? T.error : T.success)}>
                      {t.suspended ? 'Suspended' : 'Active'}
                    </span>
                  </td>
                  <td style={s.td}><span style={{ color: T.textSub, fontSize: 13 }}>{new Date(t.created_at).toLocaleDateString()}</span></td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={s.loginBtn} onClick={() => loginAsTenant(t)} disabled={loggingIn === t.id}>
                        {loggingIn === t.id
                          ? <span className="spin" style={smSpinner} />
                          : <Icon name="userCircle" size={13} color="#fff" />}
                        Login as Tenant
                      </button>
                      <button style={T.btn_s(t.suspended ? 'success' : 'danger')} onClick={() => toggleSuspend(t)}>
                        {t.suspended ? 'Activate' : 'Suspend'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Tenant detail drawer */}
      {detail && (
        <div style={s.overlay} onClick={() => setDetail(null)}>
          <div style={s.drawer} onClick={e => e.stopPropagation()} className="slide-in">
            {/* Header */}
            <div style={s.drawerHead}>
              <div style={s.drawerIcon}>
                <Icon name="building" size={18} color={T.primary} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>{detail.tenant.name}</div>
                <div style={{ fontSize: 13, color: T.textSub }}>{detail.tenant.domain} · {detail.tenant.user_count} users</div>
              </div>
              <button style={s.closeBtn} onClick={() => setDetail(null)}>
                <Icon name="xMark" size={20} color={T.textSub} />
              </button>
            </div>

            {/* Action buttons */}
            <div style={s.drawerActions}>
              <button style={s.loginBtn} onClick={() => loginAsTenant(detail.tenant)} disabled={loggingIn === detail.tenant.id}>
                {loggingIn === detail.tenant.id
                  ? <span className="spin" style={smSpinner} />
                  : <Icon name="userCircle" size={14} color="#fff" />}
                Login as this tenant
              </button>
              <button style={T.btn_s(detail.tenant.suspended ? 'success' : 'danger')}
                onClick={() => toggleSuspend(detail.tenant)}>
                {detail.tenant.suspended ? 'Activate tenant' : 'Suspend tenant'}
              </button>
              <span style={T.badge_s(detail.tenant.suspended ? T.error : T.success)}>
                {detail.tenant.suspended ? 'Suspended' : 'Active'}
              </span>
            </div>

            {/* Users list */}
            <div style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              Team members
            </div>
            {detailLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <span className="spin" style={lgSpinner} />
              </div>
            ) : detail.users.length === 0 ? (
              <div style={{ color: T.textSub, textAlign: 'center', padding: 32, fontSize: 14 }}>No users yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {detail.users.map(u => {
                  const rc = T.roles[u.role] || T.textSub;
                  return (
                    <div key={u.id} style={s.userRow}>
                      <div style={{ ...s.userAvatar, background: rc + '22', color: rc }}>
                        {(u.first_name?.[0] || u.email[0]).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: T.text }}>
                          {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : '—'}
                        </div>
                        <div style={{ fontSize: 12, color: T.textSub }}>{u.email}</div>
                      </div>
                      <span style={T.badge_s(rc)}>{u.role}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const lgSpinner = { width: 28, height: 28, border: '3px solid rgba(99,102,241,0.2)', borderTopColor: T.primary, borderRadius: '50%', display: 'inline-block' };
const smSpinner = { width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' };

const s = {
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title:       { margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: T.text },
  subtitle:    { margin: 0, fontSize: 14, color: T.textSub },
  th:          { textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 16px 12px 0', borderBottom: '1px solid ' + T.border },
  tr:          { borderBottom: '1px solid ' + T.border },
  td:          { padding: '14px 16px 14px 0', verticalAlign: 'middle' },
  nameBtn:     { display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 },
  tenantIcon:  { width: 30, height: 30, borderRadius: 8, background: T.primaryDim, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  loginBtn:    { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.35)' },
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', justifyContent: 'flex-end' },
  drawer:      { background: T.card, borderLeft: '1px solid ' + T.border, width: 480, maxWidth: '90vw', height: '100%', overflowY: 'auto', padding: 28, display: 'flex', flexDirection: 'column', gap: 20 },
  drawerHead:  { display: 'flex', alignItems: 'flex-start', gap: 14 },
  drawerIcon:  { width: 44, height: 44, borderRadius: 12, background: T.primaryDim, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  drawerActions: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  closeBtn:    { background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginLeft: 'auto', flexShrink: 0 },
  userRow:     { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid ' + T.border },
  userAvatar:  { width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 },
};

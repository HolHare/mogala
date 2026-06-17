import { useState, useEffect } from 'react';
import { request } from '../api';
import { T } from '../theme';
import { Icon } from '../components/Icons';

export default function SuperAdmin() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null); // { tenant, users }
  const [detailLoading, setDetailLoading] = useState(false);
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
    const users = await request(`/api/admin/tenants/${tenant.id}/users`);
    setDetail({ tenant, users: Array.isArray(users) ? users : [] });
    setDetailLoading(false);
  };

  const impersonate = async (tenant) => {
    const data = await request(`/api/admin/tenants/${tenant.id}/impersonate`, { method: 'POST' });
    if (!data.token) { flash('Impersonation failed', 'error'); return; }
    sessionStorage.setItem('superadmin_token', localStorage.getItem('token'));
    sessionStorage.setItem('impersonating', tenant.name);
    localStorage.setItem('token', data.token);
    window.location.reload();
  };

  const toggleSuspend = async (tenant) => {
    const action = tenant.suspended ? 'activate' : 'suspend';
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} tenant "${tenant.name}"?`)) return;
    await request(`/api/admin/tenants/${tenant.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ suspended: !tenant.suspended }),
    });
    flash(`Tenant ${action}d`);
    load();
  };

  const roleColor = (role) => T.roles[role] || T.textSub;

  return (
    <div className="fade-up">
      {msg && (
        <div style={{ ...T.card_s(), background: msg.type === 'error' ? T.errorDim : T.successDim, marginBottom: 16, color: msg.type === 'error' ? T.error : T.success, fontSize: 14 }}>
          {msg.text}
        </div>
      )}

      {/* Tenant table */}
      <div style={T.card_s()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>All Tenants</span>
          <span style={{ fontSize: 13, color: T.textSub }}>{tenants.length} tenant{tenants.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <span className="spin" style={{ width: 24, height: 24, border: '2px solid rgba(99,102,241,0.2)', borderTopColor: T.primary, borderRadius: '50%', display: 'inline-block' }} />
          </div>
        ) : tenants.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: T.textSub, fontSize: 14 }}>No tenants registered yet</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Name', 'Domain', 'Users', 'Status', 'Created', 'Actions'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id} style={s.tr}>
                  <td style={s.td}>
                    <button style={s.nameBtn} onClick={() => openDetail(t)}>
                      <div style={s.tenantIcon}><Icon name="building" size={14} color={T.primary} /></div>
                      {t.name}
                    </button>
                  </td>
                  <td style={s.td}><span style={{ color: T.textSub, fontSize: 13 }}>{t.domain}</span></td>
                  <td style={s.td}><span style={{ color: T.text, fontSize: 14 }}>{t.user_count}</span></td>
                  <td style={s.td}>
                    <span style={T.badge_s(t.suspended ? T.error : T.success)}>
                      {t.suspended ? 'Suspended' : 'Active'}
                    </span>
                  </td>
                  <td style={s.td}><span style={{ color: T.textSub, fontSize: 13 }}>{new Date(t.created_at).toLocaleDateString()}</span></td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={T.btn_s('ghost')} onClick={() => impersonate(t)}>
                        <Icon name="eye" size={13} color={T.textSub} /> Impersonate
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

      {/* Tenant detail modal */}
      {detail && (
        <div style={s.overlay} onClick={() => setDetail(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.text }}>{detail.tenant.name}</h3>
                <span style={{ fontSize: 13, color: T.textSub }}>{detail.tenant.domain}</span>
              </div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textSub }} onClick={() => setDetail(null)}>
                <Icon name="xMark" size={20} color={T.textSub} />
              </button>
            </div>

            {detailLoading ? (
              <div style={{ textAlign: 'center', padding: 32 }}>
                <span className="spin" style={{ width: 24, height: 24, border: '2px solid rgba(99,102,241,0.2)', borderTopColor: T.primary, borderRadius: '50%', display: 'inline-block' }} />
              </div>
            ) : detail.users.length === 0 ? (
              <div style={{ color: T.textSub, textAlign: 'center', padding: 24 }}>No users in this tenant</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Name', 'Email', 'Role', 'Joined'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detail.users.map(u => (
                    <tr key={u.id} style={s.tr}>
                      <td style={s.td}><span style={{ color: T.text, fontSize: 14 }}>{u.first_name} {u.last_name}</span></td>
                      <td style={s.td}><span style={{ color: T.textSub, fontSize: 13 }}>{u.email}</span></td>
                      <td style={s.td}><span style={T.badge_s(roleColor(u.role))}>{u.role}</span></td>
                      <td style={s.td}><span style={{ color: T.textSub, fontSize: 13 }}>{new Date(u.created_at).toLocaleDateString()}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
              <button style={T.btn_s('primary')} onClick={() => { impersonate(detail.tenant); }}>
                <Icon name="eye" size={14} color="#fff" /> Impersonate as Admin
              </button>
              <button style={T.btn_s(detail.tenant.suspended ? 'success' : 'danger')} onClick={() => { toggleSuspend(detail.tenant); setDetail(null); }}>
                {detail.tenant.suspended ? 'Activate Tenant' : 'Suspend Tenant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  th: { textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 12px 12px 0', borderBottom: '1px solid ' + T.border },
  tr: { borderBottom: '1px solid ' + T.border },
  td: { padding: '14px 12px 14px 0', verticalAlign: 'middle' },
  nameBtn: { display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: T.text, fontSize: 14, fontWeight: 600, padding: 0 },
  tenantIcon: { width: 28, height: 28, borderRadius: 7, background: T.primaryDim, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: T.card, border: '1px solid ' + T.border, borderRadius: 16, padding: 28, width: '90%', maxWidth: 680, maxHeight: '80vh', overflowY: 'auto' },
};

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { request } from '../api';
import { T } from '../theme';
import { Icon } from '../components/Icons';
import Softphone from '../components/Softphone';
import AgentToolbar from '../components/AgentToolbar';
import DispositionModal from '../components/DispositionModal';
import Extensions from './Extensions';
import CallLogs from './CallLogs';
import PhoneNumbers from './PhoneNumbers';
import Users from './Users';
import Trunks from './Trunks';
import Billing from './Billing';
import IVR from './IVR';
import CallFlows from './CallFlows';
import RingGroups from './RingGroups';
import SuperAdmin from './SuperAdmin';
import Wallboard from './Wallboard';
import DispositionCodes from './DispositionCodes';
import Settings from './Settings';
import Porting from './Porting';
import KYC from './KYC';
import AdminKYC from './AdminKYC';

const NAV = [
  { section: 'OVERVIEW', items: [
    { key: 'dashboard',  label: 'Dashboard',            icon: 'home' },
  ]},
  { section: 'COMMUNICATIONS', items: [
    { key: 'extensions', label: 'Extensions',            icon: 'phone' },
    { key: 'numbers',    label: 'Phone Numbers',         icon: 'hash' },
    { key: 'calllogs',   label: 'Call Logs',             icon: 'list' },
  ]},
  { section: 'CALL MANAGEMENT', items: [
    { key: 'ringgroups', label: 'Ring Groups',           icon: 'userGroup' },
    { key: 'ivr',        label: 'IVR / Auto-Attendant', icon: 'menuAlt' },
    { key: 'callflows',  label: 'Call Flows',            icon: 'share' },
  ]},
  { section: 'ADMIN', adminOnly: true, items: [
    { key: 'users',      label: 'Users',                 icon: 'users' },
    { key: 'dispcodes',  label: 'Disposition Codes',     icon: 'list' },
  ]},
  { section: 'ACCOUNT', items: [
    { key: 'kyc',        label: 'KYC / RICA',            icon: 'shield' },
    { key: 'billing',    label: 'Billing',               icon: 'creditCard' },
    { key: 'settings',   label: 'Settings',              icon: 'cog' },
  ]},
];

// Superadmin sees a completely different nav
const SUPERADMIN_NAV = [
  { section: 'SUPER ADMIN', items: [
    { key: 'tenants',    label: 'Tenants',               icon: 'building' },
    { key: 'trunks',     label: 'SIP Trunks',            icon: 'server' },
    { key: 'porting',    label: 'Number Porting',        icon: 'arrowPath' },
    { key: 'adminkyc',  label: 'KYC / RICA',            icon: 'shield' },
    { key: 'settings',   label: 'Settings',              icon: 'cog' },
  ]},
];

// Supervisor gets a wallboard nav item added
const SUPERVISOR_EXTRA = { key: 'wallboard', label: 'Wallboard', icon: 'signal', section: 'SUPERVISOR' };

export default function Dashboard() {
  const [user, setUser]               = useState(null);
  const [page, setPage]               = useState('dashboard');
  const [myExtension, setMyExtension] = useState(null);
  const [phoneOpen, setPhoneOpen]     = useState(false);
  const [sipRegistered, setSipRegistered] = useState(false);
  const [showDisposition, setShowDisposition] = useState(false);
  const navigate = useNavigate();

  // Impersonation state
  const impersonating = sessionStorage.getItem('impersonating');

  useEffect(() => {
    request('/api/me').then(data => {
      if (data.error) { localStorage.removeItem('token'); navigate('/'); return; }
      setUser(data);
      // Superadmin default page
      if (data.role === 'superadmin') setPage('tenants');
      // Supervisor default to wallboard
      else if (data.role === 'supervisor') setPage('wallboard');
    });
    request('/api/users/my-extension').then(data => {
      if (data && data.id) { setMyExtension(data); return; }
      request('/api/extensions').then(list => {
        if (Array.isArray(list) && list.length > 0) setMyExtension(list[0]);
      });
    });
  }, [navigate]);

  const logout = async () => {
    await request('/api/logout', { method: 'POST' }).catch(() => {});
    if (impersonating) {
      const orig = sessionStorage.getItem('superadmin_token');
      sessionStorage.removeItem('superadmin_token');
      sessionStorage.removeItem('impersonating');
      localStorage.setItem('token', orig);
      window.location.reload();
      return;
    }
    localStorage.removeItem('token');
    navigate('/');
  };

  const exitImpersonation = () => {
    const orig = sessionStorage.getItem('superadmin_token');
    if (!orig) return;
    sessionStorage.removeItem('superadmin_token');
    sessionStorage.removeItem('impersonating');
    localStorage.setItem('token', orig);
    window.location.reload();
  };

  if (!user) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
      <span className="spin" style={{ width: 36, height: 36, border: '3px solid rgba(99,102,241,0.2)', borderTopColor: T.primary, borderRadius: '50%', display: 'inline-block' }} />
      <span style={{ color: T.textSub, fontSize: 14 }}>Loading your workspace…</span>
    </div>
  );

  const isSuperAdmin  = user.role === 'superadmin';
  const isAdmin       = user.role === 'admin' || isSuperAdmin;
  const isSupervisor  = user.role === 'supervisor' || isAdmin;
  const isAgent       = user.role === 'agent';
  const roleColor     = T.roles[user.role] || T.textSub;
  const initials      = ((user.firstName?.[0] || '') + (user.lastName?.[0] || '') || user.email[0]).toUpperCase();

  const navGroups = isSuperAdmin ? SUPERADMIN_NAV : NAV;
  const pageTitle = [...navGroups.flatMap(g => g.items), SUPERVISOR_EXTRA]
    .find(i => i.key === page)?.label || 'Dashboard';

  return (
    <div style={s.root}>
      {/* Sidebar */}
      <div style={s.sidebar}>
        {/* Logo */}
        <div style={s.logoWrap}>
          <div style={s.logoMark}>{isSuperAdmin ? <Icon name="shield" size={16} color="#fff" strokeWidth={2} /> : 'M'}</div>
          <span style={s.logoText}>{isSuperAdmin ? 'Super Admin' : 'Mogala'}</span>
        </div>

        {/* Nav */}
        <nav style={s.nav}>
          {/* Supervisor wallboard extra item */}
          {isSupervisor && !isSuperAdmin && (
            <div style={s.navGroup}>
              <div style={s.navSection}>SUPERVISOR</div>
              <button style={{ ...s.navItem, ...(page === 'wallboard' ? s.navActive : {}) }}
                onClick={() => setPage('wallboard')}>
                <Icon name="signal" size={16} color={page === 'wallboard' ? T.primaryHov : T.textSub} />
                <span>Wallboard</span>
              </button>
            </div>
          )}

          {navGroups.map(group => {
            if (group.adminOnly && !isAdmin) return null;
            return (
              <div key={group.section} style={s.navGroup}>
                <div style={s.navSection}>{group.section}</div>
                {group.items.map(item => (
                  <button key={item.key} style={{ ...s.navItem, ...(page === item.key ? s.navActive : {}) }}
                    onClick={() => setPage(item.key)}>
                    <Icon name={item.icon} size={16} color={page === item.key ? T.primaryHov : T.textSub} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Agent toolbar (agents and supervisors only) */}
        {(isAgent || user.role === 'supervisor') && <AgentToolbar />}

        {/* Softphone toggle — always mounted so SIP UA stays registered */}
        {myExtension && !isSuperAdmin && (
          <div style={s.phoneWrap}>
            <button style={s.phoneToggle} onClick={() => setPhoneOpen(o => !o)}>
              <div style={{ ...s.regDot, background: sipRegistered ? T.success : T.error }} />
              <span>Ext {myExtension.extension}</span>
              <Icon name="chevronDown" size={14} color={T.textSub} style={{ marginLeft: 'auto', transform: phoneOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            {/* Never unmount — use display:none to keep UA alive even when panel is closed */}
            <div style={{ ...s.phoneBody, display: phoneOpen ? 'block' : 'none' }}>
              <Softphone
                extension={myExtension.extension}
                sipPassword={myExtension.sip_password}
                onRegistered={setSipRegistered}
                onCallEnded={isAgent ? () => setShowDisposition(true) : undefined}
              />
            </div>
          </div>
        )}

        {/* User footer */}
        <div style={s.userFooter}>
          <div style={{ ...s.avatar, background: roleColor + '22', color: roleColor }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={s.userName}>{user.firstName} {user.lastName}</div>
            <div style={{ ...T.badge_s(roleColor), display: 'inline-flex' }}>{user.role}</div>
          </div>
          <button style={s.logoutBtn} onClick={logout} title={impersonating ? 'Exit Impersonation' : 'Logout'}>
            <Icon name="logout" size={16} color={T.textSub} />
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={s.main}>
        {/* Impersonation banner */}
        {impersonating && (
          <div style={s.impBanner}>
            <Icon name="eye" size={14} color={T.warning} />
            <span>Impersonating: <strong>{impersonating}</strong> — changes affect this tenant</span>
            <button style={{ ...T.btn_s('ghost'), padding: '4px 12px', fontSize: 12, marginLeft: 'auto' }} onClick={exitImpersonation}>
              Exit Impersonation
            </button>
          </div>
        )}

        {/* Topbar */}
        <div style={s.topbar}>
          <h2 style={s.pageTitle}>{pageTitle}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button style={s.iconBtn} title="Notifications">
              <Icon name="bell" size={18} color={T.textSub} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={s.content}>
          {page === 'dashboard'  && <DashboardHome setPage={setPage} role={user.role} />}
          {page === 'extensions' && <Extensions />}
          {page === 'calllogs'   && <CallLogs />}
          {page === 'numbers'    && <PhoneNumbers />}
          {page === 'users'      && <Users />}
          {page === 'trunks'     && <Trunks />}
          {page === 'billing'    && <Billing />}
          {page === 'ivr'        && <IVR />}
          {page === 'callflows'  && <CallFlows />}
          {page === 'ringgroups' && <RingGroups />}
          {page === 'settings'   && <Settings />}
          {page === 'tenants'    && <SuperAdmin />}
          {page === 'porting'    && <Porting />}
          {page === 'kyc'        && <KYC />}
          {page === 'adminkyc'   && <AdminKYC />}
          {page === 'wallboard'  && <Wallboard />}
          {page === 'dispcodes'  && <DispositionCodes />}
        </div>
      </div>

      {/* Post-call disposition modal */}
      {showDisposition && <DispositionModal onClose={() => setShowDisposition(false)} />}
    </div>
  );
}

function DashboardHome({ setPage, role }) {
  const [stats, setStats] = useState({ extensions: 0, numbers: 0, callLogs: 0 });
  const [recentCalls, setRecentCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shift, setShift] = useState(null);

  useEffect(() => {
    Promise.all([
      request('/api/extensions').then(d => ({ extensions: Array.isArray(d) ? d.length : 0 })),
      request('/api/phone-numbers').then(d => ({ numbers: Array.isArray(d) ? d.length : 0 })),
      request('/api/call-logs').then(d => {
        const arr = Array.isArray(d) ? d : [];
        return { callLogs: arr.length, recent: arr.slice(0, 5) };
      }),
    ]).then(([e, n, c]) => {
      setStats({ ...e, ...n, callLogs: c.callLogs });
      setRecentCalls(c.recent);
      setLoading(false);
    });

    if (role === 'agent') {
      request('/api/agent/shift').then(d => d.login_at ? setShift(d) : null);
    }
  }, [role]);

  const statCards = [
    { label: 'Extensions',    value: stats.extensions, icon: 'phone',     color: T.primary,  key: 'extensions' },
    { label: 'Phone Numbers', value: stats.numbers,    icon: 'hash',      color: T.info,     key: 'numbers' },
    { label: 'Active Calls',  value: 0,                icon: 'arrowPath', color: T.success,  key: null },
    { label: 'Call Logs',     value: stats.callLogs,   icon: 'chartBar',  color: T.warning,  key: 'calllogs' },
  ];

  const STATUS_COLOR = { answered: T.success, missed: T.error, failed: T.warning };

  return (
    <div className="fade-up">
      {/* Agent shift summary */}
      {shift && (
        <div style={{ ...T.card_s(), marginBottom: 16, display: 'flex', gap: 24, alignItems: 'center' }}>
          <Icon name="clock" size={20} color={T.primary} />
          <div>
            <span style={{ fontSize: 12, color: T.textSub, fontWeight: 600 }}>SHIFT TODAY</span>
            <div style={{ fontSize: 14, color: T.text, marginTop: 2 }}>
              Logged in {new Date(shift.login_at).toLocaleTimeString()} ·&nbsp;
              <strong style={{ color: T.success }}>{shift.call_count} call{shift.call_count !== 1 ? 's' : ''}</strong> ·&nbsp;
              {Math.floor(shift.total_duration / 60)} min talk time
            </div>
          </div>
        </div>
      )}

      <div style={s2.statGrid}>
        {statCards.map(c => (
          <div key={c.label} style={s2.statCard} onClick={() => c.key && setPage(c.key)}>
            <div style={{ ...s2.statIcon, background: c.color + '18', border: '1px solid ' + c.color + '33' }}>
              <Icon name={c.icon} size={22} color={c.color} />
            </div>
            <div style={s2.statValue}>{loading ? '—' : c.value}</div>
            <div style={s2.statLabel}>{c.label}</div>
            {c.key && <div style={s2.statArrow}><Icon name="chevronRight" size={14} color={T.textMuted} /></div>}
          </div>
        ))}
      </div>

      <div style={s2.grid2}>
        {/* Recent calls */}
        <div style={T.card_s()}>
          <div style={s2.sectionHead}>
            <span style={s2.sectionTitle}>Recent Calls</span>
            <button style={T.btn_s('ghost')} onClick={() => setPage('calllogs')}>View all</button>
          </div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <span className="spin" style={{ width: 24, height: 24, border: '2px solid rgba(99,102,241,0.2)', borderTopColor: T.primary, borderRadius: '50%', display: 'inline-block' }} />
            </div>
          ) : recentCalls.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: T.textSub, fontSize: 14 }}>
              No calls recorded yet
            </div>
          ) : (
            <div style={s2.callList}>
              {recentCalls.map(l => {
                const sc = STATUS_COLOR[l.status] || T.textSub;
                return (
                  <div key={l.id} style={s2.callRow}>
                    <div style={{ ...s2.callIcon, background: sc + '18' }}>
                      <Icon name={l.status === 'missed' ? 'phoneDown' : 'phoneUp'} size={14} color={sc} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: T.text }}>
                        {l.caller} → {l.callee}
                      </div>
                      <div style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}>
                        {new Date(l.started_at).toLocaleString()}
                      </div>
                    </div>
                    <span style={T.badge_s(sc)}>{l.status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div style={T.card_s()}>
          <div style={s2.sectionHead}>
            <span style={s2.sectionTitle}>Quick Actions</span>
          </div>
          <div style={s2.quickList}>
            {[
              { label: 'Add extension',     icon: 'phone',     page: 'extensions', color: T.primary },
              { label: 'Add phone number',  icon: 'hash',      page: 'numbers',    color: T.info },
              { label: 'Configure IVR',     icon: 'menuAlt',   page: 'ivr',        color: T.warning },
              { label: 'Set up call flow',  icon: 'share',     page: 'callflows',  color: T.success },
              { label: 'Manage ring groups',icon: 'userGroup', page: 'ringgroups', color: T.error },
              { label: 'View billing',      icon: 'creditCard',page: 'billing',    color: T.textSub },
            ].map(a => (
              <button key={a.label} style={s2.quickItem} onClick={() => setPage(a.page)}>
                <div style={{ ...s2.quickIcon, background: a.color + '18' }}>
                  <Icon name={a.icon} size={16} color={a.color} />
                </div>
                <span style={{ fontSize: 14, color: T.text }}>{a.label}</span>
                <Icon name="chevronRight" size={14} color={T.textMuted} style={{ marginLeft: 'auto' }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


const s = {
  root: { display: 'flex', minHeight: '100vh', background: T.bg },
  impBanner: { display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(245,158,11,0.12)', borderBottom: '1px solid rgba(245,158,11,0.25)', padding: '10px 24px', fontSize: 13, color: T.warning, flexShrink: 0 },
  sidebar: { width: 248, background: T.sidebar, borderRight: '1px solid ' + T.border, display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 10, padding: '20px 20px 16px' },
  logoMark: { width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #6366f1, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0 },
  logoText: { fontSize: 17, fontWeight: 700, color: T.text },
  nav: { flex: 1, padding: '0 12px', overflowY: 'auto' },
  navGroup: { marginBottom: 8 },
  navSection: { fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 8px 4px' },
  navItem: { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 10px', borderRadius: 8, border: 'none', background: 'transparent', color: T.textSub, fontSize: 14, fontWeight: 500, cursor: 'pointer', textAlign: 'left', marginBottom: 1, transition: 'background 0.12s, color 0.12s' },
  navActive: { background: T.primaryDim, color: T.text },
  phoneWrap: { margin: '8px 12px', borderTop: '1px solid ' + T.border, paddingTop: 12 },
  phoneToggle: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: T.surface, border: '1px solid ' + T.border, borderRadius: 8, padding: '8px 12px', color: T.text, fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  regDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  phoneBody: { marginTop: 8 },
  userFooter: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderTop: '1px solid ' + T.border, marginTop: 'auto' },
  avatar: { width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 },
  userName: { fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  logoutBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  topbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 32px 0', borderBottom: '1px solid ' + T.border, paddingBottom: 20, position: 'sticky', top: 0, background: T.bg, zIndex: 10 },
  pageTitle: { margin: 0, fontSize: 20, fontWeight: 700, color: T.text },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, padding: 32, overflowY: 'auto' },
};

const s2 = {
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
  statCard: { ...T.card_s(), display: 'flex', flexDirection: 'column', gap: 4, position: 'relative', cursor: 'pointer', transition: 'border-color 0.15s' },
  statIcon: { width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 32, fontWeight: 800, color: T.text, letterSpacing: '-0.02em' },
  statLabel: { fontSize: 13, color: T.textSub, fontWeight: 500 },
  statArrow: { position: 'absolute', top: 16, right: 16 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  sectionHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: T.text },
  callList: { display: 'flex', flexDirection: 'column', gap: 2 },
  callRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', borderBottom: '1px solid ' + T.border },
  callIcon: { width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  quickList: { display: 'flex', flexDirection: 'column', gap: 4 },
  quickItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, width: '100%', transition: 'background 0.1s' },
  quickIcon: { width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
};

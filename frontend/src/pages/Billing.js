import { T } from '../theme';
import { Icon } from '../components/Icons';

const PLAN = {
  name: 'Professional',
  price: '$49',
  period: '/month',
  features: ['Up to 25 extensions', '5 SIP trunks', 'Unlimited call logs', 'IVR & Call flows', 'Ring groups', 'Email support'],
  usage: [
    { label: 'Extensions', used: 4, max: 25, color: T.primary },
    { label: 'Phone Numbers', used: 2, max: 10, color: T.info },
    { label: 'Minutes this month', used: 312, max: 2000, color: T.success },
    { label: 'SIP Trunks', used: 1, max: 5, color: T.warning },
  ],
};

const INVOICES = [
  { id: 'INV-2026-05', date: 'May 1, 2026', amount: '$49.00', status: 'paid' },
  { id: 'INV-2026-04', date: 'Apr 1, 2026', amount: '$49.00', status: 'paid' },
  { id: 'INV-2026-03', date: 'Mar 1, 2026', amount: '$49.00', status: 'paid' },
  { id: 'INV-2026-02', date: 'Feb 1, 2026', amount: '$49.00', status: 'paid' },
];

export default function Billing() {
  return (
    <div className="fade-up">
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Billing</h1>
          <p style={s.subtitle}>Manage your plan and payment details</p>
        </div>
      </div>

      <div style={s.grid2}>
        {/* Current Plan */}
        <div style={{ ...T.card_s(), display: 'flex', flexDirection: 'column' }}>
          <div style={s.planBadge}>Current Plan</div>
          <div style={s.planName}>{PLAN.name}</div>
          <div style={s.planPrice}>
            <span style={s.price}>{PLAN.price}</span>
            <span style={s.period}>{PLAN.period}</span>
          </div>
          <div style={s.divider} />
          <div style={s.features}>
            {PLAN.features.map(f => (
              <div key={f} style={s.featureRow}>
                <Icon name="check" size={14} color={T.success} />
                <span style={{ color: T.textSub, fontSize: 14 }}>{f}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 'auto', paddingTop: 20 }}>
            <button style={{ ...T.btn_s('primary'), width: '100%', justifyContent: 'center' }}>
              Upgrade Plan
            </button>
            <button style={{ ...T.btn_s('ghost'), width: '100%', justifyContent: 'center', marginTop: 8 }}>
              Manage Payment Method
            </button>
          </div>
        </div>

        {/* Usage */}
        <div style={T.card_s()}>
          <h3 style={s.sectionTitle}>Usage This Month</h3>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: T.textSub }}>Resets June 1, 2026</p>
          {PLAN.usage.map(u => {
            const pct = Math.min((u.used / u.max) * 100, 100);
            return (
              <div key={u.label} style={s.usageItem}>
                <div style={s.usageRow}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: T.text }}>{u.label}</span>
                  <span style={{ fontSize: 13, color: T.textSub }}>{u.used} / {u.max}</span>
                </div>
                <div style={s.barBg}>
                  <div style={{ ...s.barFill, width: pct + '%', background: u.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Next Invoice */}
      <div style={{ ...T.card_s(), marginTop: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: T.primaryDim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="creditCard" size={22} color={T.primary} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Next invoice</div>
          <div style={{ fontSize: 13, color: T.textSub }}>$49.00 due June 1, 2026 · Visa ending 4242</div>
        </div>
        <span style={{ marginLeft: 'auto', ...T.badge_s(T.success) }}>Auto-pay on</span>
      </div>

      {/* Invoice History */}
      <div style={{ ...T.card_s(), marginTop: 16 }}>
        <h3 style={s.sectionTitle}>Invoice History</h3>
        <table style={s.table}>
          <thead>
            <tr>{['Invoice', 'Date', 'Amount', 'Status', ''].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {INVOICES.map(inv => (
              <tr key={inv.id} style={s.tr}>
                <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 13 }}>{inv.id}</td>
                <td style={{ ...s.td, color: T.textSub }}>{inv.date}</td>
                <td style={{ ...s.td, fontWeight: 600 }}>{inv.amount}</td>
                <td style={s.td}><span style={T.badge_s(T.success)}>Paid</span></td>
                <td style={s.td}>
                  <button style={T.btn_s('ghost')} onClick={() => {}}>
                    Download PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: T.text },
  subtitle: { margin: 0, fontSize: 14, color: T.textSub },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 16, alignItems: 'start' },
  planBadge: { display: 'inline-block', background: T.primaryDim, color: T.primaryHov, border: '1px solid ' + T.primary + '44', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', marginBottom: 12 },
  planName: { fontSize: 26, fontWeight: 800, color: T.text, marginBottom: 4 },
  planPrice: { display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 20 },
  price: { fontSize: 40, fontWeight: 800, color: T.text },
  period: { fontSize: 16, color: T.textSub },
  divider: { height: 1, background: T.border, margin: '0 0 20px' },
  features: { display: 'flex', flexDirection: 'column', gap: 10 },
  featureRow: { display: 'flex', alignItems: 'center', gap: 10 },
  sectionTitle: { margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: T.text },
  usageItem: { marginBottom: 18 },
  usageRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 },
  barBg: { height: 6, background: T.surface, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999, transition: 'width 0.5s ease' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid ' + T.border },
  tr: { borderBottom: '1px solid ' + T.border },
  td: { padding: '13px 16px', fontSize: 14, color: T.text },
};

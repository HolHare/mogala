import { useState, useEffect } from 'react';
import { request } from '../api';
import { T } from '../theme';
import { Icon } from '../components/Icons';

const STATUS = {
  answered: { color: T.success, label: 'Answered' },
  missed:   { color: T.error,   label: 'Missed' },
  failed:   { color: T.warning, label: 'Failed' },
};

function fmt(sec) {
  if (!sec) return '—';
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function CallLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    request('/api/call-logs').then(d => {
      setLogs(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  }, []);

  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || (l.caller || '').includes(q) || (l.callee || '').includes(q);
    const matchFilter = filter === 'all' || l.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="fade-up">
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Call Logs</h1>
          <p style={s.subtitle}>{logs.length} calls recorded</p>
        </div>
      </div>

      <div style={T.card_s()}>
        <div style={s.toolbar}>
          <div style={s.searchWrap}>
            <Icon name="search" size={15} color={T.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input style={s.searchInput} placeholder="Search extension…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={s.filters}>
            {['all', 'answered', 'missed', 'failed'].map(f => (
              <button key={f} style={{ ...s.filterBtn, ...(filter === f ? s.filterActive : {}) }}
                onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : STATUS[f]?.label || f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={s.center}><span className="spin" style={spinnerLg} /></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={s.emptyIcon}><Icon name="phone" size={26} color={T.primary} /></div>
            <p style={s.emptyTitle}>{search || filter !== 'all' ? 'No matching calls' : 'No call logs yet'}</p>
            <p style={s.emptySub}>{search || filter !== 'all' ? 'Try adjusting your filters' : 'Calls will appear here once they are made'}</p>
          </div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                {['From', 'To', 'Duration', 'Status', 'Date & Time'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => {
                const st = STATUS[l.status] || { color: T.textSub, label: l.status };
                return (
                  <tr key={l.id} style={s.tr}>
                    <td style={s.td}>
                      <div style={s.extPill}>{l.caller || '—'}</div>
                    </td>
                    <td style={s.td}>
                      <div style={s.extPill}>{l.callee || '—'}</div>
                    </td>
                    <td style={{ ...s.td, fontVariantNumeric: 'tabular-nums', color: T.textSub }}>
                      {fmt(l.duration)}
                    </td>
                    <td style={s.td}>
                      <span style={T.badge_s(st.color)}>{st.label}</span>
                    </td>
                    <td style={{ ...s.td, color: T.textSub, fontSize: 13 }}>
                      {new Date(l.started_at).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const spinnerLg = { width: 28, height: 28, border: '3px solid rgba(99,102,241,0.2)', borderTopColor: T.primary, borderRadius: '50%', display: 'inline-block' };

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: T.text },
  subtitle: { margin: 0, fontSize: 14, color: T.textSub },
  toolbar: { display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' },
  searchWrap: { position: 'relative', flex: 1, minWidth: 200 },
  searchInput: { width: '100%', padding: '9px 14px 9px 36px', borderRadius: 8, fontSize: 14, background: T.surface, border: '1px solid ' + T.border, color: T.text, boxSizing: 'border-box' },
  filters: { display: 'flex', gap: 6 },
  filterBtn: { padding: '8px 14px', borderRadius: 8, border: '1px solid ' + T.border, background: 'transparent', color: T.textSub, fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  filterActive: { background: T.primaryDim, color: T.primaryHov, borderColor: T.primary + '66' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid ' + T.border },
  tr: { borderBottom: '1px solid ' + T.border },
  td: { padding: '13px 16px', fontSize: 14, color: T.text },
  extPill: { display: 'inline-block', background: T.surface, border: '1px solid ' + T.border, borderRadius: 6, padding: '3px 10px', fontSize: 13, fontWeight: 500 },
  center: { display: 'flex', justifyContent: 'center', padding: 60 },
  emptyIcon: { width: 56, height: 56, borderRadius: 16, background: T.primaryDim, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' },
  emptyTitle: { margin: '0 0 6px', fontWeight: 600, color: T.text, fontSize: 15 },
  emptySub: { margin: 0, color: T.textSub, fontSize: 14 },
};

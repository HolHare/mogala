import { useState, useEffect } from 'react';
import { request } from '../api';

const STATUS_COLOR = { answered: '#38a169', missed: '#e53e3e', failed: '#dd6b20' };

function formatDuration(seconds) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function CallLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request('/api/call-logs').then(data => {
      setLogs(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={s.loading}>Loading...</div>;

  return (
    <div style={s.card}>
      <h3 style={s.title}>Call Logs</h3>
      {logs.length === 0 ? (
        <p style={s.empty}>No call logs yet</p>
      ) : (
        <table style={s.table}>
          <thead>
            <tr style={s.thead}>
              {['From', 'To', 'Duration', 'Status', 'Date'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id} style={s.row}>
                <td style={s.td}>{l.caller || '—'}</td>
                <td style={s.td}>{l.callee || '—'}</td>
                <td style={s.td}>{formatDuration(l.duration)}</td>
                <td style={s.td}>
                  <span style={{...s.badge, background: STATUS_COLOR[l.status] || '#888'}}>
                    {l.status}
                  </span>
                </td>
                <td style={s.td}>{new Date(l.started_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const s = {
  card: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  title: { marginTop: 0, marginBottom: 20 },
  loading: { padding: 40, textAlign: 'center', color: '#888' },
  empty: { color: '#888' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#f7f8fc' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#666', fontWeight: 600 },
  row: { borderBottom: '1px solid #e2e8f0' },
  td: { padding: '12px 16px', fontSize: 14 },
  badge: { padding: '3px 10px', borderRadius: 20, color: '#fff', fontSize: 12, fontWeight: 600 },
};

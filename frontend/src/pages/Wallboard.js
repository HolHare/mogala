import { useState, useEffect, useRef } from 'react';
import { request } from '../api';
import { T } from '../theme';

const STATUS_COLOR = {
  available: T.success,
  on_call:   T.error,
  paused:    T.warning,
  break:     '#f97316',
  lunch:     '#a78bfa',
  tea:       '#38bdf8',
  offline:   T.textMuted,
};

const STATUS_LABEL = {
  available: 'Available',
  on_call:   'On Call',
  paused:    'Paused',
  break:     'Break',
  lunch:     'Lunch',
  tea:       'Tea',
  offline:   'Offline',
};

function elapsed(changedAt) {
  if (!changedAt) return '—';
  const diff = Math.floor((Date.now() - new Date(changedAt).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
}

export default function Wallboard() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const intervalRef = useRef(null);

  const load = () => {
    request('/api/supervisor/agents').then(d => {
      setAgents(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 5000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // tick every second so timers update
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const counts = agents.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <span className="spin" style={{ width: 28, height: 28, border: '2px solid rgba(99,102,241,0.2)', borderTopColor: T.primary, borderRadius: '50%', display: 'inline-block' }} />
    </div>
  );

  return (
    <div className="fade-up">
      {/* Summary strip */}
      <div style={s.summaryRow}>
        {Object.entries(STATUS_COLOR).map(([status, color]) => (
          <div key={status} style={s.summaryChip}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ color: T.textSub, fontSize: 12 }}>{STATUS_LABEL[status]}</span>
            <span style={{ color: T.text, fontWeight: 700, fontSize: 14 }}>{counts[status] || 0}</span>
          </div>
        ))}
      </div>

      {agents.length === 0 ? (
        <div style={{ ...T.card_s(), textAlign: 'center', padding: '60px 0', color: T.textSub }}>
          No agents found in this tenant
        </div>
      ) : (
        <div style={s.grid}>
          {agents.map(a => {
            const color = STATUS_COLOR[a.status] || T.textMuted;
            const initials = ((a.first_name?.[0] || '') + (a.last_name?.[0] || '') || a.email[0]).toUpperCase();
            return (
              <div key={a.user_id} style={{ ...s.card, borderColor: color + '44', borderTopColor: color }}>
                <div style={{ ...s.avatar, background: color + '22', color }}>
                  {initials}
                </div>
                <div style={s.name}>{a.first_name} {a.last_name}</div>
                <div style={s.email}>{a.email}</div>
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span style={{ ...T.badge_s(color), fontSize: 12 }}>{STATUS_LABEL[a.status] || a.status}</span>
                  {a.reason && <span style={{ fontSize: 11, color: T.textMuted }}>{a.reason}</span>}
                  <span style={s.timer}>{elapsed(a.changed_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const s = {
  summaryRow: { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 },
  summaryChip: { display: 'flex', alignItems: 'center', gap: 6, background: T.card, border: '1px solid ' + T.border, borderRadius: 20, padding: '6px 14px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 },
  card: { background: T.card, border: '2px solid', borderTop: '3px solid', borderRadius: 12, padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  avatar: { width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, marginBottom: 6 },
  name: { fontSize: 14, fontWeight: 600, color: T.text, textAlign: 'center' },
  email: { fontSize: 11, color: T.textMuted, textAlign: 'center' },
  timer: { fontSize: 20, fontWeight: 800, color: T.text, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' },
};

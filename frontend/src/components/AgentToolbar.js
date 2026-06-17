import { useState, useEffect, useRef } from 'react';
import { request } from '../api';
import { T } from '../theme';

const STATUSES = [
  { value: 'available', label: 'Available', color: T.success },
  { value: 'paused',    label: 'Paused',    color: T.warning },
  { value: 'break',     label: 'Break',     color: '#f97316' },
  { value: 'lunch',     label: 'Lunch',     color: '#a78bfa' },
  { value: 'tea',       label: 'Tea',       color: T.info },
  { value: 'offline',   label: 'Offline',   color: T.textMuted },
];

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export default function AgentToolbar() {
  const [status, setStatus]     = useState('available');
  const [reason, setReason]     = useState('');
  const [changedAt, setChangedAt] = useState(null);
  const [elapsed, setElapsed]   = useState(0);
  const [open, setOpen]         = useState(false);
  const [reasonInput, setReasonInput] = useState('');
  const [pendingStatus, setPendingStatus] = useState(null);
  const [error, setError]       = useState('');
  const dropRef = useRef(null);

  // Load current status on mount
  useEffect(() => {
    request('/api/agent/status').then(d => {
      if (d.status) { setStatus(d.status); setChangedAt(d.changed_at ? new Date(d.changed_at) : new Date()); }
    });
  }, []);

  // Tick elapsed timer
  useEffect(() => {
    const t = setInterval(() => {
      if (changedAt) setElapsed(Math.floor((Date.now() - changedAt.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [changedAt]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const applyStatus = async (value, rsn = '') => {
    setError('');
    const data = await request('/api/agent/status', {
      method: 'PUT',
      body: JSON.stringify({ status: value, reason: rsn }),
    });
    if (data.error) {
      setError(data.error);
      setTimeout(() => setError(''), 4000);
      return;
    }
    setStatus(value);
    setReason(rsn);
    setChangedAt(new Date());
    setElapsed(0);
    setOpen(false);
    setPendingStatus(null);
    setReasonInput('');
  };

  const selectStatus = (value) => {
    if (value === 'paused' || value === 'break' || value === 'lunch' || value === 'tea') {
      setPendingStatus(value);
    } else {
      applyStatus(value);
    }
  };

  const current = STATUSES.find(s => s.value === status) || STATUSES[0];

  return (
    <div style={s.wrap}>
      <div style={s.label}>Agent Status</div>

      {/* Status selector */}
      <div ref={dropRef} style={{ position: 'relative' }}>
        <button style={{ ...s.pill, borderColor: current.color + '66', background: current.color + '18' }}
          onClick={() => setOpen(o => !o)}>
          <div style={{ ...s.dot, background: current.color }} />
          <span style={{ color: current.color, fontWeight: 600, fontSize: 13 }}>{current.label}</span>
          <span style={{ color: T.textMuted, fontSize: 11, marginLeft: 'auto' }}>▾</span>
        </button>

        {open && (
          <div style={s.dropdown}>
            {STATUSES.map(st => (
              <button key={st.value} style={{ ...s.dropItem, background: status === st.value ? st.color + '18' : 'transparent' }}
                onClick={() => selectStatus(st.value)}>
                <div style={{ ...s.dot, background: st.color }} />
                <span style={{ color: status === st.value ? st.color : T.text, fontSize: 13 }}>{st.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Reason input modal for away statuses */}
      {pendingStatus && (
        <div style={s.reasonWrap}>
          <input
            autoFocus
            style={{ ...T.input_s(), fontSize: 12, padding: '7px 10px', marginBottom: 6 }}
            placeholder="Reason (optional)"
            value={reasonInput}
            onChange={e => setReasonInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyStatus(pendingStatus, reasonInput)}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={{ ...T.btn_s('primary'), flex: 1, fontSize: 12, padding: '6px 0' }}
              onClick={() => applyStatus(pendingStatus, reasonInput)}>Set</button>
            <button style={{ ...T.btn_s('ghost'), fontSize: 12, padding: '6px 10px' }}
              onClick={() => { setPendingStatus(null); setReasonInput(''); }}>Cancel</button>
          </div>
        </div>
      )}

      {error && <div style={s.error}>{error}</div>}

      {/* Timer */}
      <div style={s.timer}>
        <span style={{ fontSize: 20, fontWeight: 800, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
          {formatDuration(elapsed)}
        </span>
        {reason && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{reason}</div>}
      </div>
    </div>
  );
}

const s = {
  wrap: { padding: '10px 14px', borderTop: '1px solid ' + T.border, display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' },
  pill: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid', cursor: 'pointer' },
  dot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  dropdown: { position: 'absolute', bottom: '100%', left: 0, right: 0, background: T.card, border: '1px solid ' + T.border, borderRadius: 9, overflow: 'hidden', marginBottom: 4, zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' },
  dropItem: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', border: 'none', cursor: 'pointer', transition: 'background 0.1s' },
  reasonWrap: { display: 'flex', flexDirection: 'column', gap: 4 },
  timer: { textAlign: 'center', paddingTop: 4 },
  error: { fontSize: 11, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '5px 8px', textAlign: 'center' },
};

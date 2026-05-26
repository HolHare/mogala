export const T = {
  bg:          '#09090f',
  surface:     '#0d0d1e',
  card:        '#111124',
  cardHover:   '#16163a',
  sidebar:     '#08081a',

  border:      'rgba(255,255,255,0.07)',
  borderHover: 'rgba(255,255,255,0.14)',

  primary:     '#6366f1',
  primaryHov:  '#818cf8',
  primaryDim:  'rgba(99,102,241,0.15)',
  primaryRing: '0 0 0 3px rgba(99,102,241,0.2)',

  success:     '#22c55e',
  successDim:  'rgba(34,197,94,0.12)',
  error:       '#ef4444',
  errorDim:    'rgba(239,68,68,0.12)',
  warning:     '#f59e0b',
  warningDim:  'rgba(245,158,11,0.12)',
  info:        '#38bdf8',
  infoDim:     'rgba(56,189,248,0.12)',

  text:        '#e2e8f0',
  textSub:     '#8892a4',
  textMuted:   '#4a5568',

  roles: {
    admin:      '#818cf8',
    superadmin: '#c084fc',
    supervisor: '#fb923c',
    agent:      '#34d399',
    billing:    '#38bdf8',
  },

  // common style helpers
  card_s: () => ({
    background: '#111124',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: 24,
  }),
  input_s: () => ({
    background: '#0d0d1e',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 8,
    color: '#e2e8f0',
    fontSize: 14,
    padding: '10px 14px',
    width: '100%',
  }),
  btn_s: (variant = 'primary') => {
    const variants = {
      primary: { background: '#6366f1', color: '#fff', border: 'none' },
      ghost:   { background: 'transparent', color: '#8892a4', border: '1px solid rgba(255,255,255,0.1)' },
      danger:  { background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' },
      success: { background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' },
    };
    return {
      ...variants[variant],
      borderRadius: 8,
      padding: '9px 18px',
      fontSize: 14,
      fontWeight: 600,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      whiteSpace: 'nowrap',
      transition: 'opacity 0.15s',
    };
  },
  badge_s: (color) => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.02em',
    background: color + '22',
    color: color,
    border: `1px solid ${color}44`,
  }),
};

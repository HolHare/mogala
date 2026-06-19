import { useState, useEffect } from 'react';
import { request } from '../api';
import { T } from '../theme';
import { Icon } from '../components/Icons';

const STATUSES = ['pending', 'approved', 'rejected', 'draft'];

const STATUS_COLOR = {
  draft:    T.textSub,
  pending:  T.warning,
  approved: T.success,
  rejected: T.error,
};

const STATUS_LABEL = {
  draft:    'Draft',
  pending:  'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

const DOC_LABELS = {
  id_front:        'ID / Passport (Front)',
  id_back:         'ID (Back)',
  proof_of_address:'Proof of Address',
  company_reg:     'Company Registration',
  tax_clearance:   'Tax Clearance',
};

export default function AdminKYC() {
  const [list, setList]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('pending');
  const [drawer, setDrawer]   = useState(null);  // full KYC detail
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [notes, setNotes]     = useState('');
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState(null);

  const load = () =>
    request('/api/admin/kyc')
      .then(d => { setList(Array.isArray(d) ? d : []); setLoading(false); });

  useEffect(() => { load(); }, []);

  const flash = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3500);
  };

  const openDrawer = async (row) => {
    setDrawer(null);
    setDrawerLoading(true);
    const data = await request(`/api/admin/kyc/${row.id}`);
    setDrawerLoading(false);
    if (data.kyc) {
      setDrawer(data);
      setNotes(data.kyc.reviewer_notes || '');
    }
  };

  const review = async (status) => {
    if (!drawer?.kyc?.id) return;
    setSaving(true);
    const res = await request(`/api/admin/kyc/${drawer.kyc.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reviewer_notes: notes }),
    });
    setSaving(false);
    if (res.message) {
      flash(`KYC ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
      setDrawer(d => ({ ...d, kyc: { ...d.kyc, status, reviewer_notes: notes } }));
      load();
    } else {
      flash(res.error || 'Failed to save review', 'error');
    }
  };

  const filtered = filter === 'all' ? list : list.filter(k => k.status === filter);

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = list.filter(k => k.status === s).length;
    return acc;
  }, {});

  return (
    <div className="fade-up" style={{ display: 'flex', gap: 0, position: 'relative' }}>
      {msg && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: msg.type === 'error' ? T.errorDim : T.successDim, color: msg.type === 'error' ? T.error : T.success, border: `1px solid ${msg.type === 'error' ? T.error : T.success}44`, borderRadius: 10, padding: '12px 18px', fontSize: 14, fontWeight: 500 }} className="slide-in">
          {msg.text}
        </div>
      )}

      {/* List panel */}
      <div style={{ flex: 1, minWidth: 0, transition: 'margin-right 0.25s' }}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <h1 style={s.title}>KYC / RICA Review</h1>
            <p style={s.subtitle}>{list.length} submission{list.length !== 1 ? 's' : ''} total</p>
          </div>
        </div>

        {/* Filter chips */}
        <div style={s.chips}>
          <Chip label="All" count={list.length} active={filter === 'all'} color={T.primary} onClick={() => setFilter('all')} />
          <Chip label="Pending" count={counts.pending} active={filter === 'pending'} color={T.warning} onClick={() => setFilter('pending')} />
          <Chip label="Approved" count={counts.approved} active={filter === 'approved'} color={T.success} onClick={() => setFilter('approved')} />
          <Chip label="Rejected" count={counts.rejected} active={filter === 'rejected'} color={T.error} onClick={() => setFilter('rejected')} />
          <Chip label="Draft" count={counts.draft} active={filter === 'draft'} color={T.textSub} onClick={() => setFilter('draft')} />
        </div>

        {/* Table */}
        <div style={T.card_s()}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
              <span className="spin" style={lgSpinner} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: T.primaryDim, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Icon name="shield" size={26} color={T.primary} />
              </div>
              <p style={{ margin: '0 0 6px', fontWeight: 600, color: T.text }}>No submissions</p>
              <p style={{ margin: 0, color: T.textSub, fontSize: 14 }}>
                {filter === 'pending' ? 'No pending KYC submissions to review' : `No ${filter} submissions`}
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Tenant', 'Entity', 'Submitted', 'Status', 'Updated', ''].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(k => {
                  const sc = STATUS_COLOR[k.status] || T.textSub;
                  const name = k.entity_type === 'business'
                    ? k.company_name || k.tenant_name
                    : [k.first_name, k.last_name].filter(Boolean).join(' ') || k.tenant_name;
                  return (
                    <tr key={k.id} style={{ ...s.tr, cursor: 'pointer', background: drawer?.kyc?.id === k.id ? T.primaryDim : 'transparent' }}
                      onClick={() => openDrawer(k)}>
                      <td style={s.td}>
                        <div style={{ fontWeight: 600, color: T.text, fontSize: 14 }}>{k.tenant_name}</div>
                        <div style={{ fontSize: 12, color: T.textSub }}>{k.domain}</div>
                      </td>
                      <td style={s.td}>
                        <div style={{ fontSize: 14, color: T.text }}>{name}</div>
                        <div style={{ fontSize: 12, color: T.textSub, textTransform: 'capitalize' }}>{k.entity_type || '—'}</div>
                      </td>
                      <td style={s.td}>
                        <span style={{ fontSize: 13, color: T.textSub }}>
                          {k.submitted_at ? new Date(k.submitted_at).toLocaleDateString() : '—'}
                        </span>
                      </td>
                      <td style={s.td}>
                        <span style={{ ...T.badge_s(sc), textTransform: 'capitalize' }}>{STATUS_LABEL[k.status] || k.status}</span>
                      </td>
                      <td style={s.td}>
                        <span style={{ fontSize: 13, color: T.textSub }}>{new Date(k.updated_at).toLocaleDateString()}</span>
                      </td>
                      <td style={s.td}>
                        <Icon name="chevronRight" size={14} color={T.textMuted} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail drawer */}
      {(drawer || drawerLoading) && (
        <div style={s.drawer} className="slide-in">
          <div style={s.drawerHead}>
            <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>KYC Details</span>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textSub, padding: 4 }} onClick={() => setDrawer(null)}>
              <Icon name="xMark" size={18} />
            </button>
          </div>

          {drawerLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
              <span className="spin" style={lgSpinner} />
            </div>
          ) : drawer ? (
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {/* Status badge */}
              <div style={{ padding: '12px 20px', borderBottom: '1px solid ' + T.border }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ ...T.badge_s(STATUS_COLOR[drawer.kyc.status] || T.textSub), fontSize: 12 }}>
                    {STATUS_LABEL[drawer.kyc.status] || drawer.kyc.status}
                  </span>
                  {drawer.kyc.submitted_at && (
                    <span style={{ fontSize: 12, color: T.textSub }}>
                      Submitted {new Date(drawer.kyc.submitted_at).toLocaleString()}
                    </span>
                  )}
                </div>
                {drawer.kyc.reviewed_at && (
                  <span style={{ fontSize: 12, color: T.textSub }}>
                    Reviewed {new Date(drawer.kyc.reviewed_at).toLocaleString()}
                  </span>
                )}
              </div>

              {/* Entity info */}
              <Section title="Entity">
                <Field label="Type" value={drawer.kyc.entity_type === 'business' ? 'Business' : 'Individual'} />
                {drawer.kyc.entity_type === 'business' ? (
                  <>
                    <Field label="Company name" value={drawer.kyc.company_name} />
                    <Field label="Reg number" value={drawer.kyc.reg_number} />
                    <Field label="VAT number" value={drawer.kyc.vat_number} />
                    <Field label="Authorised rep" value={drawer.kyc.auth_rep_name} />
                    <Field label="Rep ID number" value={drawer.kyc.auth_rep_id} />
                  </>
                ) : (
                  <>
                    <Field label="Name" value={[drawer.kyc.first_name, drawer.kyc.last_name].filter(Boolean).join(' ')} />
                    <Field label="ID type" value={{ sa_id: 'SA ID', passport: 'Passport', foreign_id: 'Foreign ID' }[drawer.kyc.id_type] || drawer.kyc.id_type} />
                    <Field label="ID number" value={drawer.kyc.id_number} mono />
                    <Field label="Date of birth" value={drawer.kyc.date_of_birth} />
                    <Field label="Nationality" value={drawer.kyc.nationality} />
                  </>
                )}
              </Section>

              {/* Address */}
              <Section title="RICA Address">
                <Field label="Street" value={drawer.kyc.address_street} />
                <Field label="Suburb" value={drawer.kyc.address_suburb} />
                <Field label="City" value={drawer.kyc.address_city} />
                <Field label="Province" value={drawer.kyc.address_province} />
                <Field label="Postal code" value={drawer.kyc.address_postal} mono />
                <Field label="Country" value={drawer.kyc.address_country} />
              </Section>

              {/* Documents */}
              <Section title={`Documents (${drawer.documents.length})`}>
                {drawer.documents.length === 0 ? (
                  <p style={{ color: T.textSub, fontSize: 13, margin: 0 }}>No documents uploaded</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {drawer.documents.map(doc => (
                      <DocViewer key={doc.id} doc={doc} />
                    ))}
                  </div>
                )}
              </Section>

              {/* Review */}
              {(drawer.kyc.status === 'pending' || drawer.kyc.status === 'approved' || drawer.kyc.status === 'rejected') && (
                <Section title="Review Decision">
                  <label style={s.label}>Reviewer notes</label>
                  <textarea
                    style={{ ...T.input_s(), height: 90, resize: 'vertical', marginBottom: 14 }}
                    placeholder="Reason for approval or rejection…"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      style={{ ...T.btn_s('primary'), flex: 1, justifyContent: 'center', opacity: drawer.kyc.status === 'approved' ? 0.5 : 1 }}
                      disabled={saving || drawer.kyc.status === 'approved'}
                      onClick={() => review('approved')}
                    >
                      {saving ? <span className="spin" style={smSpinner} /> : <Icon name="check" size={14} />}
                      Approve
                    </button>
                    <button
                      style={{ ...T.btn_s('danger'), flex: 1, justifyContent: 'center', opacity: drawer.kyc.status === 'rejected' ? 0.5 : 1 }}
                      disabled={saving || drawer.kyc.status === 'rejected'}
                      onClick={() => review('rejected')}
                    >
                      {saving ? <span className="spin" style={smSpinner} /> : <Icon name="xMark" size={14} />}
                      Reject
                    </button>
                  </div>
                </Section>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ padding: '14px 20px', borderBottom: '1px solid ' + T.border }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function Field({ label, value, mono }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 7 }}>
      <span style={{ fontSize: 12, color: T.textSub, flexShrink: 0, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 13, color: T.text, fontWeight: 500, textAlign: 'right', fontFamily: mono ? 'monospace' : undefined }}>{value}</span>
    </div>
  );
}

function DocViewer({ doc }) {
  const [expanded, setExpanded] = useState(false);
  const isImage = doc.mime_type?.startsWith('image/');
  const isPDF   = doc.mime_type === 'application/pdf';

  return (
    <div style={{ border: '1px solid ' + T.border, borderRadius: 10, overflow: 'hidden' }}>
      <button
        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: T.surface, border: 'none', padding: '10px 14px', cursor: 'pointer', color: T.text }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ width: 30, height: 30, borderRadius: 8, background: T.primaryDim, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name={isImage ? 'photo' : 'document'} size={15} color={T.primary} />
        </div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{DOC_LABELS[doc.doc_type] || doc.doc_type}</div>
          <div style={{ fontSize: 11, color: T.textSub }}>{doc.filename}</div>
        </div>
        <Icon name="chevronDown" size={14} color={T.textSub}
          style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {expanded && doc.data && (
        <div style={{ background: T.bg, padding: 12 }}>
          {isImage ? (
            <img
              src={doc.data}
              alt={doc.filename}
              style={{ width: '100%', borderRadius: 8, display: 'block', maxHeight: 400, objectFit: 'contain' }}
            />
          ) : isPDF ? (
            <iframe
              src={doc.data}
              title={doc.filename}
              style={{ width: '100%', height: 400, border: 'none', borderRadius: 8 }}
            />
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <a
                href={doc.data}
                download={doc.filename}
                style={{ ...T.btn_s('primary'), textDecoration: 'none' }}
              >
                <Icon name="arrowDownTray" size={14} /> Download {doc.filename}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ label, count, active, color, onClick }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, border: `1px solid ${active ? color : T.border}`, background: active ? color + '18' : 'transparent', color: active ? color : T.textSub, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
      {label}
      <span style={{ background: active ? color + '30' : T.surface, borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{count}</span>
    </button>
  );
}

const lgSpinner = { width: 28, height: 28, border: '3px solid rgba(99,102,241,0.2)', borderTopColor: T.primary, borderRadius: '50%', display: 'inline-block' };
const smSpinner = { width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' };

const s = {
  header:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title:    { margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: T.text },
  subtitle: { margin: 0, fontSize: 14, color: T.textSub },
  chips:    { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  th:       { textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 16px 12px 0', borderBottom: '1px solid ' + T.border },
  tr:       { borderBottom: '1px solid ' + T.border, transition: 'background 0.1s' },
  td:       { padding: '13px 16px 13px 0', verticalAlign: 'middle' },
  label:    { display: 'block', fontSize: 12, fontWeight: 600, color: T.textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' },
  drawer:   { width: 420, flexShrink: 0, background: T.card, border: '1px solid ' + T.border, borderRadius: 16, marginLeft: 20, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 140px)', position: 'sticky', top: 20, overflow: 'hidden' },
  drawerHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid ' + T.border, flexShrink: 0 },
};

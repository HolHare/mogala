import { useState, useEffect, useRef } from 'react';
import { request } from '../api';
import { T } from '../theme';
import { Icon } from '../components/Icons';

const TABS = [
  { key: 'identity',  label: 'Identity',  icon: 'userCircle' },
  { key: 'address',   label: 'RICA Address', icon: 'building' },
  { key: 'documents', label: 'Documents', icon: 'key' },
];

const STATUS_CONFIG = {
  draft:    { color: T.textSub,  bg: T.surface,     label: 'Draft — not yet submitted' },
  pending:  { color: T.warning,  bg: 'rgba(245,158,11,0.1)', label: 'Under review' },
  approved: { color: T.success,  bg: 'rgba(34,197,94,0.1)',  label: 'Verified' },
  rejected: { color: T.error,    bg: 'rgba(239,68,68,0.1)',  label: 'Rejected — please resubmit' },
};

const DOC_TYPES = [
  { key: 'id_document',          label: 'ID Document (front)',   required: true },
  { key: 'id_back',              label: 'ID Document (back)',    required: false },
  { key: 'proof_of_address',     label: 'Proof of Residence',    required: true },
  { key: 'business_registration',label: 'Company Registration',  required: false, businessOnly: true },
  { key: 'tax_clearance',        label: 'Tax Clearance / VAT',   required: false, businessOnly: true },
];

const SA_PROVINCES = ['Eastern Cape','Free State','Gauteng','KwaZulu-Natal','Limpopo','Mpumalanga','Northern Cape','North West','Western Cape'];

export default function KYC() {
  const [tab, setTab]     = useState('identity');
  const [kyc, setKyc]     = useState(null);
  const [docs, setDocs]   = useState([]);
  const [form, setForm]   = useState(defaultForm());
  const [saving, setSaving]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading]   = useState(null);
  const [msg, setMsg]     = useState(null);
  const [loaded, setLoaded] = useState(false);

  function defaultForm() {
    return {
      entity_type: 'individual', id_type: 'sa_id', nationality: 'South African',
      address_country: 'South Africa',
      first_name: '', last_name: '', id_number: '', date_of_birth: '',
      company_name: '', reg_number: '', vat_number: '', auth_rep_name: '', auth_rep_id: '',
      address_street: '', address_suburb: '', address_city: '',
      address_province: '', address_postal: '',
    };
  }

  const load = async () => {
    const data = await request('/api/kyc');
    if (data && data.kyc) {
      setKyc(data.kyc);
      setDocs(data.documents || []);
      setForm(f => ({ ...f, ...data.kyc }));
    }
    setLoaded(true);
  };
  useEffect(() => { load(); }, []);

  const flash = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const save = async () => {
    setSaving(true);
    const data = await request('/api/kyc', { method: 'PUT', body: JSON.stringify(form) });
    setSaving(false);
    if (data.message) { flash('Progress saved'); load(); }
    else flash(data.error || 'Save failed', 'error');
  };

  const submit = async () => {
    // Basic validation
    if (form.entity_type === 'individual' && (!form.first_name || !form.last_name || !form.id_number)) {
      flash('Please complete all required fields in Identity tab', 'error'); return;
    }
    if (form.entity_type === 'business' && !form.company_name) {
      flash('Company name is required', 'error'); return;
    }
    if (!form.address_street || !form.address_city) {
      flash('Please complete your RICA address', 'error'); return;
    }
    const requiredDocs = DOC_TYPES.filter(d => d.required && (!d.businessOnly || form.entity_type === 'business'));
    const uploaded = docs.map(d => d.doc_type);
    const missing = requiredDocs.filter(d => !uploaded.includes(d.key));
    if (missing.length > 0) {
      flash(`Please upload: ${missing.map(d => d.label).join(', ')}`, 'error'); return;
    }

    // Save first, then submit
    setSaving(true);
    await request('/api/kyc', { method: 'PUT', body: JSON.stringify(form) });
    setSaving(false);

    setSubmitting(true);
    const data = await request('/api/kyc/submit', { method: 'POST' });
    setSubmitting(false);
    if (data.message) { flash('Submitted for review!'); load(); }
    else flash(data.error || 'Submission failed', 'error');
  };

  const uploadDoc = async (docType, file) => {
    if (file.size > 5 * 1024 * 1024) { flash('File must be under 5 MB', 'error'); return; }
    setUploading(docType);

    // Ensure KYC record exists first
    if (!kyc) {
      await request('/api/kyc', { method: 'PUT', body: JSON.stringify(form) });
      await load();
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = await request('/api/kyc/documents', {
        method: 'POST',
        body: JSON.stringify({
          doc_type: docType,
          filename: file.name,
          mime_type: file.type,
          data: e.target.result,
        }),
      });
      setUploading(null);
      if (data.id) { flash('Document uploaded'); load(); }
      else flash(data.error || 'Upload failed', 'error');
    };
    reader.readAsDataURL(file);
  };

  const removeDoc = async (docId) => {
    await request(`/api/kyc/documents/${docId}`, { method: 'DELETE' });
    load();
  };

  const isEditable = !kyc || kyc.status === 'draft' || kyc.status === 'rejected';
  const status = kyc?.status || 'draft';
  const sc = STATUS_CONFIG[status] || STATUS_CONFIG.draft;

  if (!loaded) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <span className="spin" style={lgSpinner} />
    </div>
  );

  return (
    <div className="fade-up">
      <div style={s.header}>
        <div>
          <h1 style={s.title}>KYC / RICA Compliance</h1>
          <p style={s.subtitle}>Required by South African law to activate your VoIP services</p>
        </div>
      </div>

      {/* Status banner */}
      <div style={{ ...s.statusBanner, background: sc.bg, borderColor: sc.color + '44' }}>
        <div style={{ ...s.statusDot, background: sc.color }} />
        <div>
          <span style={{ fontWeight: 600, color: sc.color }}>{sc.label}</span>
          {kyc?.reviewer_notes && kyc.status === 'rejected' && (
            <p style={{ margin: '4px 0 0', fontSize: 13, color: T.error }}>
              Reason: {kyc.reviewer_notes}
            </p>
          )}
        </div>
        {status === 'approved' && (
          <Icon name="check" size={18} color={T.success} style={{ marginLeft: 'auto' }} />
        )}
      </div>

      {status === 'approved' ? (
        <div style={{ ...T.card_s(), textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Icon name="shield" size={30} color={T.success} />
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: T.text }}>KYC & RICA Verified</h3>
          <p style={{ margin: 0, color: T.textSub, fontSize: 14 }}>Your identity and address have been verified. All services are active.</p>
        </div>
      ) : status === 'pending' ? (
        <div style={{ ...T.card_s(), textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Icon name="clock" size={30} color={T.warning} />
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: T.text }}>Awaiting Review</h3>
          <p style={{ margin: 0, color: T.textSub, fontSize: 14 }}>Your KYC/RICA submission is being reviewed. We'll notify you once complete.</p>
        </div>
      ) : (
        <div style={s.layout}>
          {/* Tab sidebar */}
          <div style={s.tabSidebar}>
            {TABS.map(t => (
              <button key={t.key} style={{ ...s.tabBtn, ...(tab === t.key ? s.tabActive : {}) }}
                onClick={() => setTab(t.key)}>
                <Icon name={t.icon} size={16} color={tab === t.key ? T.primary : T.textSub} />
                {t.label}
              </button>
            ))}
            <div style={{ marginTop: 'auto', borderTop: '1px solid ' + T.border, paddingTop: 12 }}>
              <button style={{ ...T.btn_s('ghost'), width: '100%', justifyContent: 'center', marginBottom: 8 }}
                onClick={save} disabled={saving || !isEditable}>
                {saving ? <span className="spin" style={smSpinner} /> : <Icon name="arrowPath" size={14} />}
                {saving ? 'Saving…' : 'Save draft'}
              </button>
              <button style={{ ...T.btn_s('primary'), width: '100%', justifyContent: 'center' }}
                onClick={submit} disabled={submitting || !isEditable}>
                {submitting ? <span className="spin" style={smSpinner} /> : <Icon name="check" size={14} />}
                {submitting ? 'Submitting…' : 'Submit for review'}
              </button>
            </div>
          </div>

          {/* Content panel */}
          <div style={s.panel}>
            {msg && (
              <div style={{ background: msg.type === 'error' ? T.errorDim : T.successDim, border: `1px solid ${msg.type === 'error' ? T.error : T.success}44`, color: msg.type === 'error' ? T.error : T.success, borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
                <Icon name={msg.type === 'error' ? 'xMark' : 'check'} size={14} color={msg.type === 'error' ? T.error : T.success} />
                {msg.text}
              </div>
            )}

            {tab === 'identity'  && <IdentityTab form={form} setForm={setForm} disabled={!isEditable} />}
            {tab === 'address'   && <AddressTab  form={form} setForm={setForm} disabled={!isEditable} />}
            {tab === 'documents' && <DocumentsTab docs={docs} form={form} onUpload={uploadDoc} onRemove={removeDoc} uploading={uploading} disabled={!isEditable} />}
          </div>
        </div>
      )}
    </div>
  );
}

function IdentityTab({ form, setForm, disabled }) {
  const f = key => ({ value: form[key] || '', disabled, onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) });
  const isIndividual = form.entity_type === 'individual';

  return (
    <div>
      <SectionHead title="Entity type" sub="Select whether you are registering as an individual or a business" />
      <div style={s.radioGroup}>
        {[{ v: 'individual', label: 'Individual / Sole Proprietor' }, { v: 'business', label: 'Company / Close Corporation / Trust' }].map(o => (
          <label key={o.v} style={{ ...s.radioCard, ...(form.entity_type === o.v ? s.radioActive : {}) }}>
            <input type="radio" name="entity_type" value={o.v} checked={form.entity_type === o.v}
              onChange={() => !disabled && setForm(p => ({ ...p, entity_type: o.v }))} style={{ display: 'none' }} />
            <div style={{ ...s.radioCheck, ...(form.entity_type === o.v ? { background: T.primary, borderColor: T.primary } : {}) }}>
              {form.entity_type === o.v && <Icon name="check" size={10} color="#fff" />}
            </div>
            {o.label}
          </label>
        ))}
      </div>

      {isIndividual ? (
        <>
          <SectionHead title="Personal details" sub="As they appear on your identity document" />
          <div style={s.row2}>
            <Field label="First name *" placeholder="John" {...f('first_name')} />
            <Field label="Last name *" placeholder="Doe" {...f('last_name')} />
          </div>
          <div style={s.row2}>
            <div>
              <label style={s.label}>ID type *</label>
              <select style={T.input_s()} value={form.id_type} disabled={disabled}
                onChange={e => setForm(p => ({ ...p, id_type: e.target.value }))}>
                <option value="sa_id">South African ID</option>
                <option value="passport">Passport</option>
                <option value="foreign_id">Foreign ID</option>
              </select>
            </div>
            <Field label="ID / Passport number *" placeholder="8001015009087" {...f('id_number')} />
          </div>
          <div style={s.row2}>
            <Field label="Date of birth *" type="date" {...f('date_of_birth')} />
            <Field label="Nationality" placeholder="South African" {...f('nationality')} />
          </div>
        </>
      ) : (
        <>
          <SectionHead title="Business details" sub="Registered entity information" />
          <Field label="Company / trading name *" placeholder="Acme (Pty) Ltd" {...f('company_name')} />
          <div style={s.row2}>
            <Field label="CIPC registration number *" placeholder="2020/000000/07" {...f('reg_number')} />
            <Field label="VAT number" placeholder="4123456789" {...f('vat_number')} />
          </div>
          <SectionHead title="Authorised representative" sub="Person responsible for RICA registration" />
          <div style={s.row2}>
            <Field label="Full name *" placeholder="Jane Doe" {...f('auth_rep_name')} />
            <Field label="SA ID / Passport number *" placeholder="8001015009087" {...f('auth_rep_id')} />
          </div>
        </>
      )}
    </div>
  );
}

function AddressTab({ form, setForm, disabled }) {
  const f = key => ({ value: form[key] || '', disabled, onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) });
  return (
    <div>
      <SectionHead title="RICA residential / business address" sub="Must match your proof of address document" />
      <Field label="Street address *" placeholder="12 Main Street" {...f('address_street')} />
      <div style={s.row2}>
        <Field label="Suburb" placeholder="Sandton" {...f('address_suburb')} />
        <Field label="City *" placeholder="Johannesburg" {...f('address_city')} />
      </div>
      <div style={s.row2}>
        <div>
          <label style={s.label}>Province *</label>
          <select style={T.input_s()} value={form.address_province} disabled={disabled}
            onChange={e => setForm(p => ({ ...p, address_province: e.target.value }))}>
            <option value="">Select province…</option>
            {SA_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <Field label="Postal code *" placeholder="2196" {...f('address_postal')} />
      </div>
      <Field label="Country" {...f('address_country')} />

      <div style={s.infoBox}>
        <Icon name="shield" size={14} color={T.info} />
        <p style={{ margin: 0, fontSize: 13, color: T.textSub }}>
          <strong style={{ color: T.text }}>RICA compliance: </strong>
          Under the Regulation of Interception of Communications and Provision of Communication-Related Information Act (RICA) No. 70 of 2002, all South African telecoms subscribers must provide verifiable identity and address information.
        </p>
      </div>
    </div>
  );
}

function DocumentsTab({ docs, form, onUpload, onRemove, uploading, disabled }) {
  const isIndividual = form.entity_type === 'individual';
  const visibleDocs = DOC_TYPES.filter(d => !d.businessOnly || !isIndividual);
  const uploadedMap = Object.fromEntries(docs.map(d => [d.doc_type, d]));

  return (
    <div>
      <SectionHead title="Supporting documents" sub="Upload clear, colour scans or photos. Max 5 MB per file." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visibleDocs.map(dt => {
          const uploaded = uploadedMap[dt.key];
          const isUploading = uploading === dt.key;
          return (
            <DocSlot key={dt.key} label={dt.label} required={dt.required}
              uploaded={uploaded} uploading={isUploading} disabled={disabled}
              onUpload={file => onUpload(dt.key, file)}
              onRemove={() => onRemove(uploaded.id)} />
          );
        })}
      </div>
    </div>
  );
}

function DocSlot({ label, required, uploaded, uploading, disabled, onUpload, onRemove }) {
  const ref = useRef();
  return (
    <div style={s.docSlot}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
        <div style={{ ...s.docIcon, background: uploaded ? 'rgba(34,197,94,0.12)' : T.primaryDim }}>
          <Icon name={uploaded ? 'check' : 'key'} size={14} color={uploaded ? T.success : T.primary} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: T.text }}>
            {label} {required && <span style={{ color: T.error }}>*</span>}
          </div>
          {uploaded && <div style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}>{uploaded.filename}</div>}
          {!uploaded && <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>JPG, PNG or PDF — max 5 MB</div>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {uploaded && !disabled && (
          <button style={T.btn_s('danger')} onClick={onRemove}>
            <Icon name="trash" size={13} />
          </button>
        )}
        {!disabled && (
          <>
            <input ref={ref} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
              onChange={e => { if (e.target.files[0]) onUpload(e.target.files[0]); e.target.value = ''; }} />
            <button style={T.btn_s(uploaded ? 'ghost' : 'primary')} disabled={uploading}
              onClick={() => ref.current.click()}>
              {uploading ? <span className="spin" style={smSpinner} /> : <Icon name="arrowPath" size={13} />}
              {uploading ? 'Uploading…' : uploaded ? 'Replace' : 'Upload'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function SectionHead({ title, sub }) {
  return (
    <div style={{ marginBottom: 16, marginTop: 8 }}>
      <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: T.text }}>{title}</h3>
      {sub && <p style={{ margin: 0, fontSize: 13, color: T.textSub }}>{sub}</p>}
    </div>
  );
}

function Field({ label, hint, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={s.label}>{label}</label>
      <input style={{ ...T.input_s(), ...(props.disabled ? { opacity: 0.6 } : {}) }} {...props} />
      {hint && <p style={{ margin: '5px 0 0', fontSize: 12, color: T.textMuted }}>{hint}</p>}
    </div>
  );
}

const lgSpinner = { width: 28, height: 28, border: '3px solid rgba(99,102,241,0.2)', borderTopColor: T.primary, borderRadius: '50%', display: 'inline-block' };
const smSpinner = { width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' };

const s = {
  header:       { marginBottom: 20 },
  title:        { margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: T.text },
  subtitle:     { margin: 0, fontSize: 14, color: T.textSub },
  statusBanner: { display: 'flex', alignItems: 'flex-start', gap: 12, border: '1px solid', borderRadius: 10, padding: '14px 18px', marginBottom: 20 },
  statusDot:    { width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 4 },
  layout:       { display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, alignItems: 'start' },
  tabSidebar:   { background: T.card, border: '1px solid ' + T.border, borderRadius: 12, padding: 8, display: 'flex', flexDirection: 'column', gap: 2, minHeight: 400 },
  tabBtn:       { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 8, border: 'none', background: 'transparent', color: T.textSub, fontSize: 14, fontWeight: 500, cursor: 'pointer', textAlign: 'left' },
  tabActive:    { background: T.primaryDim, color: T.text },
  panel:        { background: T.card, border: '1px solid ' + T.border, borderRadius: 12, padding: 28 },
  row2:         { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  label:        { display: 'block', fontSize: 12, fontWeight: 600, color: T.textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' },
  radioGroup:   { display: 'flex', gap: 10, marginBottom: 24 },
  radioCard:    { display: 'flex', alignItems: 'center', gap: 10, flex: 1, padding: '14px 16px', borderRadius: 10, border: '1px solid ' + T.border, cursor: 'pointer', fontSize: 14, fontWeight: 500, color: T.text, background: T.surface },
  radioActive:  { border: '1px solid ' + T.primary, background: T.primaryDim },
  radioCheck:   { width: 18, height: 18, borderRadius: '50%', border: '2px solid ' + T.border, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  docSlot:      { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: T.surface, border: '1px solid ' + T.border, borderRadius: 10 },
  docIcon:      { width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  infoBox:      { display: 'flex', gap: 12, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '14px 16px', marginTop: 20 },
};

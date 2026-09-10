import { useEffect, useState, useCallback } from 'react';
import api, { errMsg } from '../api/client.js';
import { Spinner, Modal, Badge, fmtDate, useToast } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { can } from '../utils/permissions.js';
import { validateForm, hasErrors } from '../utils/validate.js';

const emptyPatient = { name: '', dob: '', gender: 'Male', bloodGroup: '', phone: '', email: '', address: '', emergencyContact: '', allergies: '', insuranceProvider: '', insuranceNo: '' };

export default function Patients() {
  const { user } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(emptyPatient);
  const [history, setHistory] = useState(null);
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/patients', { params: { search: q, page, limit: 20 } });
      setRows(res.data.patients);
      setTotal(res.data.total);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [q, page]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setForm(emptyPatient);
    setErrors({});
    setEditing('new');
  };
  const openEdit = (p) => {
    setForm({ ...p, dob: p.dob ? p.dob.slice(0, 10) : '', allergies: (p.allergies || []).join(', ') });
    setErrors({});
    setEditing(p._id);
  };
  const save = async () => {
    const errs = validateForm(
      form,
      {
        name: ['required'],
        phone: ['required', 'phone'],
        email: ['email'],
        emergencyContact: ['phone']
      }
    );
    setErrors(errs);
    if (hasErrors(errs)) return;
    try {
      if (editing === 'new') {
        await api.post('/patients', { ...form, allergies: form.allergies ? form.allergies.split(',').map((s) => s.trim()) : [] });
        toast.success('Patient registered');
      } else {
        await api.put(`/patients/${editing}`, { ...form, allergies: form.allergies ? form.allergies.split(',').map((s) => s.trim()) : [] });
        toast.success('Patient updated');
      }
      setEditing(null);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const del = async (p) => {
    if (!confirm(`Delete patient ${p.name}?`)) return;
    try {
      await api.delete(`/patients/${p._id}`);
      toast.success('Patient deleted');
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const view = async (p) => {
    setViewing(p);
    setHistory(null);
    try {
      const [h, l] = await Promise.all([
        api.get('/records', { params: { patientId: p._id } }),
        api.get('/labs', { params: { patientId: p._id } })
      ]);
      setHistory({ records: h.data.records, labs: l.data.tests });
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const upload = async () => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      await api.post(`/patients/${viewing._id}/documents`, fd);
      toast.success('Document uploaded');
      setFile(null);
      view(viewing);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const canAdd = can(user?.role, 'patients', 'create');
  const canEdit = can(user?.role, 'patients', 'update');
  const canDel = can(user?.role, 'patients', 'delete');

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Patients</h2>
          <div className="sub">{total} registered patients</div>
        </div>
        {canAdd && <button className="btn btn-primary" onClick={openAdd}>+ Register Patient</button>}
      </div>

      <div className="search-bar">
        <input type="search" placeholder="Search name, ID, phone, email…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (setQ(search), setPage(1))} />
        <button className="btn" onClick={() => (setQ(search), setPage(1))}>Search</button>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr><th>ID</th><th>Name</th><th>Gender</th><th>Blood</th><th>Phone</th><th>Registered</th><th></th></tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p._id}>
                    <td className="muted">{p.patientId}</td>
                    <td><b>{p.name}</b></td>
                    <td>{p.gender}</td>
                    <td>{p.bloodGroup || '—'}</td>
                    <td>{p.phone}</td>
                    <td>{fmtDate(p.createdAt)}</td>
                    <td className="tbl-actions">
                      <button className="btn btn-sm" onClick={() => view(p)}>View</button>
                      {canEdit && <button className="btn btn-sm" onClick={() => openEdit(p)}>Edit</button>}
                      {canDel && <button className="btn btn-sm btn-ghost-danger" onClick={() => del(p)}>✕</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && <div className="empty-state">No patients found</div>}
          <div className="flex between align-center mt">
            <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
            <span className="muted">Page {page} of {Math.max(1, Math.ceil(total / 20))}</span>
            <button className="btn btn-sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </div>
      )}

      {editing && (
        <Modal title={editing === 'new' ? 'Register Patient' : 'Edit Patient'} onClose={() => setEditing(null)} footer={<><button className="btn" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>} wide>
          <div className="form-grid">
            <div className="field"><label>Full name *</label><input className={errors.name ? 'invalid' : ''} value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors(({ name, ...r }) => r); }} /></div>
            <div className="field"><label>Date of birth</label><input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></div>
            <div className="field"><label>Gender</label><select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option>Male</option><option>Female</option><option>Other</option></select></div>
            <div className="field"><label>Blood group</label><select value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}><option value="">—</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option></select></div>
            <div className="field"><label>Phone *</label><input className={errors.phone ? 'invalid' : ''} value={form.phone} onChange={(e) => { setForm({ ...form, phone: e.target.value }); setErrors(({ phone, ...r }) => r); }} />{errors.phone && <span className="field-error">{errors.phone}</span>}</div>
            <div className="field"><label>Email</label><input className={errors.email ? 'invalid' : ''} type="email" value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors(({ email, ...r }) => r); }} />{errors.email && <span className="field-error">{errors.email}</span>}</div>
            <div className="field"><label>Address</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="field"><label>Emergency contact</label><input className={errors.emergencyContact ? 'invalid' : ''} value={form.emergencyContact} onChange={(e) => { setForm({ ...form, emergencyContact: e.target.value }); setErrors(({ emergencyContact, ...r }) => r); }} />{errors.emergencyContact && <span className="field-error">{errors.emergencyContact}</span>}</div>
            <div className="field"><label>Allergies (comma separated)</label><input value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="Penicillin, Latex" /></div>
            <div className="field"><label>Insurance provider</label><input value={form.insuranceProvider} onChange={(e) => setForm({ ...form, insuranceProvider: e.target.value })} /></div>
            <div className="field"><label>Insurance no</label><input value={form.insuranceNo} onChange={(e) => setForm({ ...form, insuranceNo: e.target.value })} /></div>
            {hasErrors(errors) && <div className="field full"><span className="badge badge-danger">Please fix the highlighted fields</span></div>}
          </div>
        </Modal>
      )}

      {viewing && (
        <Modal title={`Patient — ${viewing.name}`} onClose={() => setViewing(null)} wide>
          <div className="grid-3 mb">
            <div className="card"><div className="detail-label">Details</div>
              <ul className="list-plain">
                <li><b>ID:</b> {viewing.patientId}</li>
                <li><b>DOB:</b> {fmtDate(viewing.dob)}</li>
                <li><b>Gender:</b> {viewing.gender}</li>
                <li><b>Blood:</b> {viewing.bloodGroup || '—'}</li>
              </ul>
            </div>
            <div className="card"><div className="detail-label">Contact</div>
              <ul className="list-plain">
                <li><b>Phone:</b> {viewing.phone}</li>
                <li><b>Email:</b> {viewing.email || '—'}</li>
                <li><b>Address:</b> {viewing.address || '—'}</li>
                <li><b>Emergency:</b> {viewing.emergencyContact || '—'}</li>
              </ul>
            </div>
            <div className="card"><div className="detail-label">Clinical</div>
              <ul className="list-plain">
                <li><b>Allergies:</b> {(viewing.allergies || []).join(', ') || 'None'}</li>
                <li><b>Insurance:</b> {viewing.insuranceProvider ? `${viewing.insuranceProvider} (${viewing.insuranceNo})` : '—'}</li>
              </ul>
            </div>
          </div>

          <h4 style={{ margin: '10px 0 8px' }}>Medical History</h4>
          {history ? (
            <div className="table-wrap card">
              <table className="tbl">
                <thead><tr><th>Date</th><th>Doctor</th><th>Diagnosis</th><th>Treatment</th></tr></thead>
                <tbody>
                  {history.records.map((r) => (
                    <tr key={r._id}>
                      <td>{fmtDate(r.date)}</td>
                      <td>{r.doctorId?.name}</td>
                      <td>{r.diagnosis || '—'}</td>
                      <td>{r.treatmentPlan || '—'}</td>
                    </tr>
                  ))}
                  {history.records.length === 0 && <tr><td className="muted" colSpan={4}>No records yet</td></tr>}
                </tbody>
              </table>
              <div className="mt"><b>Lab tests:</b>{' '}
                <span className="muted">{history.labs.map((l) => `${l.testName} (${l.status})`).join(', ') || 'None'}</span>
              </div>
            </div>
          ) : (
            <Spinner />
          )}

          <h4 style={{ margin: '14px 0 8px' }}>Documents</h4>
          <div className="card">
            {viewing.documents.length === 0 && <div className="muted">No documents uploaded</div>}
            <ul className="list-plain">
              {viewing.documents.map((d) => (
                <li key={d._id} className="flex between align-center">
                  <span>📄 {d.filename}</span>
                  <span><a href={d.path} target="_blank" rel="noreferrer" className="btn btn-sm">Open</a></span>
                </li>
              ))}
            </ul>
            {canEdit && (
              <div className="flex gap mt">
                <input type="file" onChange={(e) => setFile(e.target.files[0])} />
                <button className="btn btn-sm" onClick={upload}>Upload</button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
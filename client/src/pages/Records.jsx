import { useEffect, useState, useCallback } from 'react';
import api, { errMsg } from '../api/client.js';
import { Spinner, Modal, Badge, fmtDate, useToast } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { can } from '../utils/permissions.js';
import { validateForm, hasErrors } from '../utils/validate.js';

const empty = { patientId: '', doctorId: '', date: new Date().toISOString().slice(0, 10), visitType: 'OPD', symptoms: '', diagnosis: '', treatmentPlan: '', notes: '', vitalSigns: { temperature: '', pulse: '', bloodPressure: '', weight: '', height: '' }, prescriptions: [{ medicine: '', dosage: '', frequency: '', duration: '' }] };

export default function Records() {
  const { user } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  const canCreate = can(user?.role, 'records', 'create');
  const canEdit = can(user?.role, 'records', 'update');
  const canDel = can(user?.role, 'records', 'delete');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/records', { params: { search: q || undefined, limit: 50 } });
      setRows(res.data.records);
      setTotal(res.data.total);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => { load(); }, [load]);

  const openNew = async () => {
    try {
      const [p, d] = await Promise.all([api.get('/patients', { params: { limit: 500 } }), api.get('/doctors')]);
      setPatients(p.data.patients);
      setDoctors(d.data.doctors);
      setForm(empty);
      setErrors({});
      setEditing('new');
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const openEdit = async (r) => {
    try {
      const [p, d] = await Promise.all([api.get('/patients', { params: { limit: 500 } }), api.get('/doctors')]);
      setPatients(p.data.patients);
      setDoctors(d.data.doctors);
      setForm({
        patientId: r.patientId?._id, doctorId: r.doctorId?._id, date: r.date.slice(0, 10), visitType: r.visitType,
        symptoms: r.symptoms, diagnosis: r.diagnosis, treatmentPlan: r.treatmentPlan, notes: r.notes,
        vitalSigns: { ...empty.vitalSigns, ...(r.vitalSigns || {}) },
        prescriptions: r.prescriptions?.length ? r.prescriptions : empty.prescriptions
      });
      setErrors({});
      setEditing(r._id);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const save = async () => {
    const errs = validateForm(form, {
      patientId: ['required'],
      doctorId: ['required'],
      date: [
        (v) => (!v ? 'This field is required' : null)
      ]
    });
    form.prescriptions.forEach((p, i) => {
      if ((p.medicine || p.dosage || p.frequency || p.duration) && !p.medicine.trim()) errs[`rx${i}`] = 'Medicine name required';
      if (p.medicine && p.medicine.trim() && !p.dosage.trim()) errs[`rx${i}`] = 'Dosage required';
    });
    setErrors(errs);
    if (hasErrors(errs)) return;
    try {
      if (editing === 'new') {
        await api.post('/records', form);
        toast.success('Medical record created');
      } else {
        await api.put(`/records/${editing}`, form);
        toast.success('Record updated');
      }
      setEditing(null);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const del = async (r) => {
    if (!confirm('Delete this medical record?')) return;
    try {
      await api.delete(`/records/${r._id}`);
      toast.success('Record deleted');
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const setP = (i, k, v) => setForm({ ...form, prescriptions: form.prescriptions.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)) });
  const setV = (k, v) => setForm({ ...form, vitalSigns: { ...form.vitalSigns, [k]: v } });

  return (
    <div>
      <div className="page-head">
        <div><h2>Electronic Medical Records</h2><div className="sub">{total} records</div></div>
        {canCreate && <button className="btn btn-primary" onClick={openNew}>+ New Record</button>}
      </div>

      <div className="search-bar">
        <input type="search" placeholder="Search diagnosis…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (setQ(search), setLoading(true))} />
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>No</th><th>Date</th><th>Patient</th><th>Doctor</th><th>Diagnosis</th><th>Prescriptions</th><th></th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id}>
                    <td className="muted">{r.recordNo}</td>
                    <td>{fmtDate(r.date)}</td>
                    <td>{r.patientId?.name}</td>
                    <td>{r.doctorId?.name}</td>
                    <td>{r.diagnosis || '—'}</td>
                    <td>
                      {r.prescriptions?.map((p, i) => (
                        <div key={i}>{p.medicine} {p.filled ? '✓' : <Badge status="pending" />}</div>
                      ))}
                    </td>
                    <td className="tbl-actions">
                      <button className="btn btn-sm" onClick={() => setViewing(r)}>View</button>
                      {canEdit && <button className="btn btn-sm" onClick={() => openEdit(r)}>Edit</button>}
                      {canDel && <button className="btn btn-sm btn-ghost-danger" onClick={() => del(r)}>✕</button>}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td className="muted" colSpan={7}>No medical records</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <Modal title={editing === 'new' ? 'New Medical Record' : 'Edit Medical Record'} onClose={() => setEditing(null)} footer={<><button className="btn" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>} wide>
          <div className="form-grid">
            <div className="field"><label>Patient *</label><select className={errors.patientId ? 'invalid' : ''} value={form.patientId} onChange={(e) => { setForm({ ...form, patientId: e.target.value }); setErrors(({ patientId, ...r }) => r); }}><option value="">Select…</option>{patients.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.patientId})</option>)}</select>{errors.patientId && <span className="field-error">{errors.patientId}</span>}</div>
            <div className="field"><label>Doctor *</label><select className={errors.doctorId ? 'invalid' : ''} value={form.doctorId} onChange={(e) => { setForm({ ...form, doctorId: e.target.value }); setErrors(({ doctorId, ...r }) => r); }}><option value="">Select…</option>{doctors.map((d) => <option key={d._id} value={d._id}>{d.name} — {d.specialization}</option>)}</select>{errors.doctorId && <span className="field-error">{errors.doctorId}</span>}</div>
            <div className="field"><label>Date *</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div className="field"><label>Visit type</label><select value={form.visitType} onChange={(e) => setForm({ ...form, visitType: e.target.value })}><option>OPD</option><option>IPD</option><option>Emergency</option><option>Follow-up</option></select></div>
          </div>
          <h4 className="mt">Vital signs</h4>
          <div className="form-grid-3">
            <div className="field"><label>Temp</label><input value={form.vitalSigns.temperature} onChange={(e) => setV('temperature', e.target.value)} /></div>
            <div className="field"><label>Pulse</label><input value={form.vitalSigns.pulse} onChange={(e) => setV('pulse', e.target.value)} /></div>
            <div className="field"><label>BP</label><input value={form.vitalSigns.bloodPressure} onChange={(e) => setV('bloodPressure', e.target.value)} /></div>
            <div className="field"><label>Weight</label><input value={form.vitalSigns.weight} onChange={(e) => setV('weight', e.target.value)} /></div>
            <div className="field"><label>Height</label><input value={form.vitalSigns.height} onChange={(e) => setV('height', e.target.value)} /></div>
          </div>
          <div className="form-grid mt">
            <div className="field"><label>Symptoms</label><textarea rows={2} value={form.symptoms} onChange={(e) => setForm({ ...form, symptoms: e.target.value })} /></div>
            <div className="field"><label>Diagnosis</label><textarea rows={2} value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} /></div>
            <div className="field"><label>Treatment plan</label><textarea rows={2} value={form.treatmentPlan} onChange={(e) => setForm({ ...form, treatmentPlan: e.target.value })} /></div>
            <div className="field"><label>Notes</label><textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <h4 className="mt">Prescriptions</h4>
          {form.prescriptions.map((p, i) => (
            <div className="form-grid-3" key={i}>
              <div className="field"><label>Medicine *</label><input className={errors[`rx${i}`] ? 'invalid' : ''} value={p.medicine} onChange={(e) => { setP(i, 'medicine', e.target.value); setErrors(({ [`rx${i}`]: _, ...r }) => r); }} />{errors[`rx${i}`] && <span className="field-error">{errors[`rx${i}`]}</span>}</div>
              <div className="field"><label>Dosage</label><input value={p.dosage} onChange={(e) => setP(i, 'dosage', e.target.value)} /></div>
              <div className="field"><label>Frequency</label><input value={p.frequency} onChange={(e) => setP(i, 'frequency', e.target.value)} /></div>
              <div className="field"><label>Duration</label><input value={p.duration} onChange={(e) => setP(i, 'duration', e.target.value)} /></div>
              <div className="field"><label>Instructions</label><input value={p.instructions || ''} onChange={(e) => setP(i, 'instructions', e.target.value)} /></div>
            </div>
          ))}
          <button className="btn btn-sm mt" onClick={() => setForm({ ...form, prescriptions: [...form.prescriptions, { medicine: '', dosage: '', frequency: '', duration: '' }] })}>+ Add medicine</button>
        </Modal>
      )}

      {viewing && (
        <Modal title={`Record ${viewing.recordNo}`} onClose={() => setViewing(null)} wide>
          <div className="grid-3 mb">
            <div className="card"><div className="detail-label">Patient</div><b>{viewing.patientId?.name}</b><br /><span className="muted">{viewing.patientId?.patientId}</span></div>
            <div className="card"><div className="detail-label">Doctor</div><b>{viewing.doctorId?.name}</b><br /><span className="muted">{viewing.doctorId?.specialization}</span></div>
            <div className="card"><div className="detail-label">Visit</div><b>{viewing.visitType}</b> · {fmtDate(viewing.date)}</div>
          </div>
          {viewing.vitalSigns && Object.values(viewing.vitalSigns).some(Boolean) && (
            <div className="card mb">
              <div className="detail-label">Vital signs</div>
              <div className="muted">{Object.entries(viewing.vitalSigns).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(' · ')}</div>
            </div>
          )}
          <div className="card mb">
            <div className="detail-label">Symptoms</div><div>{viewing.symptoms || '—'}</div>
            <div className="detail-label mt">Diagnosis</div><div><b>{viewing.diagnosis || '—'}</b></div>
            <div className="detail-label mt">Treatment plan</div><div>{viewing.treatmentPlan || '—'}</div>
            {viewing.notes && <><div className="detail-label mt">Notes</div><div>{viewing.notes}</div></>}
          </div>
          <h4>Prescriptions</h4>
          <div className="table-wrap card">
            <table className="tbl">
              <thead><tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Status</th></tr></thead>
              <tbody>
                {viewing.prescriptions?.map((p, i) => (
                  <tr key={i}><td>{p.medicine}</td><td>{p.dosage}</td><td>{p.frequency}</td><td>{p.duration}</td><td>{p.filled ? <Badge status="approved" /> : <Badge status="pending" />}</td></tr>
                ))}
                {(!viewing.prescriptions || !viewing.prescriptions.length) && <tr><td className="muted" colSpan={5}>No prescriptions</td></tr>}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}
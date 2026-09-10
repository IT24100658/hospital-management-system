import { useEffect, useState, useCallback } from 'react';
import api, { errMsg } from '../api/client.js';
import { Spinner, Modal, Badge, fmtDate, useToast } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { can } from '../utils/permissions.js';
import { validateForm, hasErrors } from '../utils/validate.js';

export default function Appointments() {
  const { user } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({ patientId: '', doctorId: '', date: '', time: '', type: 'Checkup', reason: '' });
  const [reschedOf, setReschedOf] = useState(null);
  const [reschedForm, setReschedForm] = useState({ date: '', time: '' });
  const [errors, setErrors] = useState({});
  const [reschedErrors, setReschedErrors] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/appointments', { params: { date: date || undefined, status: status || undefined, limit: 50 } });
      setRows(res.data.appointments);
      setTotal(res.data.total);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [date, status]);

  useEffect(() => { load(); }, [load]);

  const openBook = async () => {
    try {
      const [p, d] = await Promise.all([api.get('/patients', { params: { limit: 500 } }), api.get('/doctors')]);
      setPatients(p.data.patients);
      setDoctors(d.data.doctors);
      setForm({ patientId: '', doctorId: '', date: new Date().toISOString().slice(0, 10), time: '', type: 'Checkup', reason: '' });
      setErrors({});
      setBooking(true);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const save = async () => {
    const errs = validateForm(form, {
      patientId: ['required'],
      doctorId: ['required'],
      date: ['required', 'futureDate'],
      time: ['required', 'time']
    });
    setErrors(errs);
    if (hasErrors(errs)) return;
    try {
      await api.post('/appointments', form);
      toast.success('Appointment booked');
      setBooking(null);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const reschedule = async () => {
    const errs = validateForm(reschedForm, {
      date: ['required', 'futureDate'],
      time: ['required', 'time']
    });
    setReschedErrors(errs);
    if (hasErrors(errs)) return;
    try {
      await api.put(`/appointments/${reschedOf._id}/reschedule`, reschedForm);
      toast.success('Appointment rescheduled');
      setReschedOf(null);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const cancel = async (a) => {
    const reason = prompt('Reason for cancellation:', '');
    if (reason === null) return;
    try {
      await api.put(`/appointments/${a._id}/cancel`, { reason });
      toast.success('Appointment cancelled');
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const setSt = async (a, s) => {
    try {
      await api.put(`/appointments/${a._id}/status`, { status: s });
      toast.success(`Status → ${s}`);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <div>
      <div className="page-head">
        <div><h2>Appointments</h2><div className="sub">{total} appointments</div></div>
        {can(user?.role, 'appointments', 'create') && <button className="btn btn-primary" onClick={openBook}>+ Book Appointment</button>}
      </div>

      <div className="search-bar">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option>scheduled</option><option>confirmed</option><option>in-progress</option><option>completed</option><option>cancelled</option>
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>No</th><th>Date</th><th>Time</th><th>Patient</th><th>Doctor</th><th>Type</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a._id}>
                    <td className="muted">{a.appointmentNo}</td>
                    <td>{fmtDate(a.date)}</td>
                    <td>{a.time}</td>
                    <td>{a.patientId?.name}</td>
                    <td>{a.doctorId?.name}</td>
                    <td>{a.type}</td>
                    <td><Badge status={a.status} /></td>
                    <td className="tbl-actions">
                      {can(user?.role, 'appointments', 'update') && a.status !== 'cancelled' && (
                        <>
                          <select className="btn btn-sm" value={a.status} onChange={(e) => setSt(a, e.target.value)} style={{ border: '1px solid var(--border)' }}>
                            <option>scheduled</option><option>confirmed</option><option>in-progress</option><option>completed</option>
                          </select>
                          <button className="btn btn-sm" onClick={() => { setReschedForm({ date: a.date.slice(0, 10), time: a.time }); setReschedErrors({}); setReschedOf(a); }}>Reschedule</button>
                        </>
                      )}
                      {can(user?.role, 'appointments', 'update') && a.status !== 'cancelled' && <button className="btn btn-sm btn-ghost-danger" onClick={() => cancel(a)}>✕</button>}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td className="muted" colSpan={8}>No appointments</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {booking && (
        <Modal title="Book Appointment" onClose={() => setBooking(null)} footer={<><button className="btn" onClick={() => setBooking(null)}>Cancel</button><button className="btn btn-primary" onClick={save}>Confirm Booking</button></>}>
          <div className="form-grid">
            <div className="field"><label>Patient *</label><select className={errors.patientId ? 'invalid' : ''} value={form.patientId} onChange={(e) => { setForm({ ...form, patientId: e.target.value }); setErrors(({ patientId, ...r }) => r); }}><option value="">Select…</option>{patients.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.patientId})</option>)}</select>{errors.patientId && <span className="field-error">{errors.patientId}</span>}</div>
            <div className="field"><label>Doctor *</label><select className={errors.doctorId ? 'invalid' : ''} value={form.doctorId} onChange={(e) => { setForm({ ...form, doctorId: e.target.value }); setErrors(({ doctorId, ...r }) => r); }}><option value="">Select…</option>{doctors.map((d) => <option key={d._id} value={d._id}>{d.name} — {d.specialization}</option>)}</select>{errors.doctorId && <span className="field-error">{errors.doctorId}</span>}</div>
            <div className="field"><label>Date *</label><input className={errors.date ? 'invalid' : ''} type="date" value={form.date} onChange={(e) => { setForm({ ...form, date: e.target.value }); setErrors(({ date, ...r }) => r); }} />{errors.date && <span className="field-error">{errors.date}</span>}</div>
            <div className="field"><label>Time *</label><input className={errors.time ? 'invalid' : ''} type="time" value={form.time} onChange={(e) => { setForm({ ...form, time: e.target.value }); setErrors(({ time, ...r }) => r); }} />{errors.time && <span className="field-error">{errors.time}</span>}</div>
            <div className="field"><label>Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option>Checkup</option><option>Follow-up</option><option>Consultation</option><option>Surgery</option><option>Lab</option><option>Emergency</option></select></div>
            <div className="field"><label>Reason</label><input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
          </div>
        </Modal>
      )}

      {reschedOf && (
        <Modal title="Reschedule Appointment" onClose={() => setReschedOf(null)} footer={<><button className="btn" onClick={() => setReschedOf(null)}>Cancel</button><button className="btn btn-primary" onClick={reschedule}>Reschedule</button></>}>
          <div className="form-grid">
            <div className="field"><label>New date *</label><input className={reschedErrors.date ? 'invalid' : ''} type="date" value={reschedForm.date} onChange={(e) => { setReschedForm({ ...reschedForm, date: e.target.value }); setReschedErrors(({ date, ...r }) => r); }} />{reschedErrors.date && <span className="field-error">{reschedErrors.date}</span>}</div>
            <div className="field"><label>New time *</label><input className={reschedErrors.time ? 'invalid' : ''} type="time" value={reschedForm.time} onChange={(e) => { setReschedForm({ ...reschedForm, time: e.target.value }); setReschedErrors(({ time, ...r }) => r); }} />{reschedErrors.time && <span className="field-error">{reschedErrors.time}</span>}</div>
          </div>
        </Modal>
      )}
    </div>
  );
}
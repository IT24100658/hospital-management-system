import { useEffect, useState } from 'react';
import api, { errMsg } from '../api/client.js';
import { Spinner, Modal, Badge, fmtMoney, useToast } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { can } from '../utils/permissions.js';
import { validateForm, hasErrors } from '../utils/validate.js';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function Doctors() {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('doctors');
  const [doctors, setDoctors] = useState([]);
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [sched, setSched] = useState([{ day: 'Monday', start: '09:00', end: '13:00' }]);
  const [form, setForm] = useState({});
  const [schedOf, setSchedOf] = useState(null);
  const [deptEditing, setDeptEditing] = useState(null);
  const [deptForm, setDeptForm] = useState({ name: '', head: '', description: '' });
  const [errors, setErrors] = useState({});
  const [deptErrors, setDeptErrors] = useState({});

  const canCreate = can(user?.role, 'doctors', 'create');
  const canEdit = can(user?.role, 'doctors', 'update');
  const canDel = can(user?.role, 'doctors', 'delete');

  const load = async () => {
    setLoading(true);
    try {
      const [d, dp] = await Promise.all([api.get('/doctors'), api.get('/departments')]);
      setDoctors(d.data.doctors);
      setDepts(dp.data.departments);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm({ name: '', specialization: '', departmentId: '', phone: '', email: '', qualification: '', fees: '', status: 'active' });
    setSched([{ day: 'Monday', start: '09:00', end: '12:00' }]);
    setErrors({});
    setEditing('new');
  };
  const openEdit = (d) => {
    setForm({ name: d.name, specialization: d.specialization, departmentId: d.departmentId?._id || d.departmentId, phone: d.phone, email: d.email, qualification: d.qualification, fees: d.fees, status: d.status });
    setSched(d.schedule?.length ? d.schedule : [{ day: 'Monday', start: '', end: '' }]);
    setErrors({});
    setEditing(d._id);
  };
  const save = async () => {
    const errs = validateForm(form, {
      name: ['required'],
      specialization: ['required'],
      fees: ['positiveNumber'],
      email: ['email'],
      phone: ['phone']
    });
    const schedErr = {};
    sched.forEach((s, i) => {
      if ((s.start || s.end) && (!s.start || !s.end)) schedErr[`sched${i}`] = 'Both start and end are required';
      if (s.start && s.end && s.start >= s.end) schedErr[`sched${i}`] = 'Start must be before end';
    });
    setErrors({ ...errs, ...schedErr });
    if (hasErrors({ ...errs, ...schedErr })) return;
    try {
      if (editing === 'new') {
        await api.post('/doctors', { ...form, fees: Number(form.fees) || 0, schedule: sched });
        toast.success('Doctor added');
      } else {
        await api.put(`/doctors/${editing}`, { ...form, fees: Number(form.fees) || 0, schedule: sched });
        toast.success('Doctor updated');
      }
      setEditing(null);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const del = async (d) => {
    if (!confirm(`Delete ${d.name}?`)) return;
    try {
      await api.delete(`/doctors/${d._id}`);
      toast.success('Doctor deleted');
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const setSchedAt = (i, k, v) => setSched(sched.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)));

  const saveDept = async () => {
    const errs = validateForm(deptForm, { name: ['required'] });
    setDeptErrors(errs);
    if (hasErrors(errs)) return;
    try {
      if (deptEditing === 'new') {
        await api.post('/departments', deptForm);
        toast.success('Department created');
      } else {
        await api.put(`/departments/${deptEditing}`, deptForm);
        toast.success('Department updated');
      }
      setDeptEditing(null);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const delDept = async (d) => {
    if (!confirm(`Delete department ${d.name}?`)) return;
    try {
      await api.delete(`/departments/${d._id}`);
      toast.success('Department deleted');
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <div>
      <div className="page-head">
        <div><h2>Doctors & Departments</h2><div className="sub">{doctors.length} doctors · {depts.length} departments</div></div>
        {tab === 'doctors' && canCreate && <button className="btn btn-primary" onClick={openAdd}>+ Add Doctor</button>}
      </div>

      <div className="tabs">
        <button className={tab === 'doctors' ? 'active' : ''} onClick={() => setTab('doctors')}>Doctors</button>
        <button className={tab === 'departments' ? 'active' : ''} onClick={() => setTab('departments')}>Departments</button>
      </div>

      {loading ? (
        <Spinner />
      ) : tab === 'doctors' ? (
        <div className="card">
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr><th>ID</th><th>Name</th><th>Specialization</th><th>Department</th><th>Phone</th><th>Fees</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {doctors.map((d) => (
                  <tr key={d._id}>
                    <td className="muted">{d.doctorId}</td>
                    <td><b>{d.name}</b></td>
                    <td>{d.specialization}</td>
                    <td>{d.departmentId?.name || '—'}</td>
                    <td>{d.phone || '—'}</td>
                    <td className="money">{fmtMoney(d.fees)}</td>
                    <td><Badge status={d.status} /></td>
                    <td className="tbl-actions">
                      <button className="btn btn-sm" onClick={() => setSchedOf(d)}>Schedule</button>
                      {canEdit && <button className="btn btn-sm" onClick={() => openEdit(d)}>Edit</button>}
                      {canDel && <button className="btn btn-sm btn-ghost-danger" onClick={() => del(d)}>✕</button>}
                    </td>
                  </tr>
                ))}
                {doctors.length === 0 && <tr><td className="muted" colSpan={8}>No doctors added</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="flex between align-center mb">
            <span className="muted">{depts.length} departments</span>
            {canCreate && <button className="btn btn-sm btn-primary" onClick={() => { setDeptForm({ name: '', head: '', description: '' }); setDeptErrors({}); setDeptEditing('new'); }}>+ Add Department</button>}
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Name</th><th>Head</th><th>Description</th><th></th></tr></thead>
              <tbody>
                {depts.map((d) => (
                  <tr key={d._id}>
                    <td><b>{d.name}</b></td>
                    <td>{d.head || '—'}</td>
                    <td className="muted">{d.description || '—'}</td>
                    <td className="tbl-actions">
                      {canEdit && <button className="btn btn-sm" onClick={() => { setDeptForm({ name: d.name, head: d.head, description: d.description }); setDeptErrors({}); setDeptEditing(d._id); }}>Edit</button>}
                      {canDel && <button className="btn btn-sm btn-ghost-danger" onClick={() => delDept(d)}>✕</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <Modal title={editing === 'new' ? 'Add Doctor' : 'Edit Doctor'} onClose={() => setEditing(null)} footer={<><button className="btn" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>} wide>
          <div className="form-grid">
            <div className="field"><label>Full name *</label><input className={errors.name ? 'invalid' : ''} value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors(({ name, ...r }) => r); }} />{errors.name && <span className="field-error">{errors.name}</span>}</div>
            <div className="field"><label>Specialization *</label><input className={errors.specialization ? 'invalid' : ''} value={form.specialization} onChange={(e) => { setForm({ ...form, specialization: e.target.value }); setErrors(({ specialization, ...r }) => r); }} />{errors.specialization && <span className="field-error">{errors.specialization}</span>}</div>
            <div className="field"><label>Department</label><select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}><option value="">—</option>{depts.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select></div>
            <div className="field"><label>Consultation fee (LKR)</label><input className={errors.fees ? 'invalid' : ''} type="number" value={form.fees} onChange={(e) => { setForm({ ...form, fees: e.target.value }); setErrors(({ fees, ...r }) => r); }} />{errors.fees && <span className="field-error">{errors.fees}</span>}</div>
            <div className="field"><label>Phone</label><input className={errors.phone ? 'invalid' : ''} value={form.phone} onChange={(e) => { setForm({ ...form, phone: e.target.value }); setErrors(({ phone, ...r }) => r); }} />{errors.phone && <span className="field-error">{errors.phone}</span>}</div>
            <div className="field"><label>Email</label><input className={errors.email ? 'invalid' : ''} value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors(({ email, ...r }) => r); }} />{errors.email && <span className="field-error">{errors.email}</span>}</div>
            <div className="field"><label>Qualification</label><input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} /></div>
            <div className="field"><label>Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>active</option><option>inactive</option></select></div>
          </div>
          <h4 className="mt">Weekly schedule</h4>
          {sched.map((s, i) => (
            <div className="form-grid-3 mt" key={i}>
              <div className="field"><label>Day</label><select value={s.day} onChange={(e) => setSchedAt(i, 'day', e.target.value)}>{DAYS.map((d) => <option key={d}>{d}</option>)}</select></div>
              <div className="field"><label>Start</label><input type="time" value={s.start} onChange={(e) => { setSchedAt(i, 'start', e.target.value); setErrors(({ [`sched${i}`]: _, ...r }) => r); }} /></div>
              <div className="field"><label>End</label><input type="time" value={s.end} onChange={(e) => { setSchedAt(i, 'end', e.target.value); setErrors(({ [`sched${i}`]: _, ...r }) => r); }} />{errors[`sched${i}`] && <span className="field-error">{errors[`sched${i}`]}</span>}</div>
            </div>
          ))}
          <button className="btn btn-sm mt" onClick={() => setSched([...sched, { day: 'Monday', start: '', end: '' }])}>+ Add slot</button>
        </Modal>
      )}

      {schedOf && (
        <Modal title={`${schedOf.name} — Schedule`} onClose={() => setSchedOf(null)}>
          {schedOf.schedule?.length ? (
            <table className="tbl">
              <thead><tr><th>Day</th><th>Start</th><th>End</th></tr></thead>
              <tbody>
                {schedOf.schedule.map((s, i) => (
                  <tr key={i}><td>{s.day}</td><td>{s.start}</td><td>{s.end}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <div className="empty-state">No schedule set</div>}
        </Modal>
      )}

      {deptEditing && (
        <Modal title={deptEditing === 'new' ? 'Add Department' : 'Edit Department'} onClose={() => setDeptEditing(null)} footer={<><button className="btn" onClick={() => setDeptEditing(null)}>Cancel</button><button className="btn btn-primary" onClick={saveDept}>Save</button></>}>
          <div className="field"><label>Name *</label><input className={deptErrors.name ? 'invalid' : ''} value={deptForm.name} onChange={(e) => { setDeptForm({ ...deptForm, name: e.target.value }); setDeptErrors(({ name, ...r }) => r); }} />{deptErrors.name && <span className="field-error">{deptErrors.name}</span>}</div>
          <div className="field mt"><label>Head</label><input value={deptForm.head} onChange={(e) => setDeptForm({ ...deptForm, head: e.target.value })} /></div>
          <div className="field mt"><label>Description</label><textarea rows={3} value={deptForm.description} onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })} /></div>
        </Modal>
      )}
    </div>
  );
}
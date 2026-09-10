import { useEffect, useState, useCallback } from 'react';
import api, { errMsg } from '../api/client.js';
import { Spinner, Modal, Badge, fmtDate, fmtMoney, useToast } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { can } from '../utils/permissions.js';
import { validateForm, hasErrors } from '../utils/validate.js';

export default function Staff() {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('roster');
  const [staff, setStaff] = useState([]);
  const [att, setAtt] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [attDate, setAttDate] = useState(new Date().toISOString().slice(0, 10));
  const [attForm, setAttForm] = useState({ staffId: '', status: 'present', timeIn: '08:30', timeOut: '16:30' });
  const [leaveForm, setLeaveForm] = useState({ staffId: '', type: 'Annual', startDate: '', endDate: '', reason: '' });
  const [errors, setErrors] = useState({});
  const [attErrors, setAttErrors] = useState({});
  const [leaveErrors, setLeaveErrors] = useState({});

  const canWrite = can(user?.role, 'staff', 'create') || can(user?.role, 'staff', 'update');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, dp, lv] = await Promise.all([api.get('/staff'), api.get('/departments'), api.get('/staff/leaves/list')]);
      setStaff(s.data.staff);
      setDepts(dp.data.departments);
      setLeaves(lv.data.leaves);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAtt = useCallback(async () => {
    try {
      const a = await api.get('/staff/attendance/list', { params: { date: attDate } });
      setAtt(a.data.records);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }, [attDate]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === 'attendance') loadAtt(); }, [tab, loadAtt]);

  const openAdd = () => {
    setForm({ name: '', nic: '', position: '', departmentId: '', phone: '', email: '', salary: '', joinedDate: '', gender: 'Female', address: '', status: 'active' });
    setErrors({});
    setEditing('new');
  };
  const openEdit = (s) => {
    setForm({ name: s.name, nic: s.nic, position: s.position, departmentId: s.departmentId?._id || s.departmentId, phone: s.phone, email: s.email, salary: s.salary, joinedDate: s.joinedDate ? s.joinedDate.slice(0, 10) : '', gender: s.gender, address: s.address, status: s.status });
    setErrors({});
    setEditing(s._id);
  };
  const save = async () => {
    const errs = validateForm(form, {
      name: ['required'],
      position: ['required'],
      email: ['email'],
      phone: ['phone'],
      nic: [
        (v) => (v && !/^[0-9]{9}[VvXx]?$/.test(v.trim()) ? 'Invalid NIC format' : null)
      ],
      salary: ['positiveNumber']
    });
    setErrors(errs);
    if (hasErrors(errs)) return;
    try {
      if (editing === 'new') {
        await api.post('/staff', { ...form, salary: Number(form.salary) || 0 });
        toast.success('Staff member added');
      } else {
        await api.put(`/staff/${editing}`, { ...form, salary: Number(form.salary) || 0 });
        toast.success('Staff updated');
      }
      setEditing(null);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const del = async (s) => {
    if (!confirm(`Remove ${s.name}?`)) return;
    try {
      await api.delete(`/staff/${s._id}`);
      toast.success('Staff removed');
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const markAtt = async () => {
    const errs = validateForm({ ...attForm, date: attDate }, { staffId: ['required'] });
    setAttErrors(errs);
    if (hasErrors(errs)) return;
    try {
      await api.post('/staff/attendance', { ...attForm, date: attDate });
      toast.success('Attendance marked');
      loadAtt();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const applyLeave = async () => {
    const errs = validateForm(leaveForm, {
      staffId: ['required'],
      startDate: ['required'],
      endDate: [
        'required',
        (v) => (v && leaveForm.startDate && v < leaveForm.startDate ? 'End must be on/after start' : null)
      ]
    });
    setLeaveErrors(errs);
    if (hasErrors(errs)) return;
    try {
      await api.post('/staff/leaves', leaveForm);
      toast.success('Leave requested');
      setLeaveForm({ staffId: '', type: 'Annual', startDate: '', endDate: '', reason: '' });
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const review = async (l, status) => {
    try {
      await api.put(`/staff/leaves/${l._id}`, { status });
      toast.success(`Leave ${status}`);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <div>
      <div className="page-head">
        <div><h2>Staff Management</h2><div className="sub">{staff.length} employees</div></div>
        {canWrite && <button className="btn btn-primary" onClick={openAdd}>+ Add Staff</button>}
      </div>

      <div className="tabs">
        <button className={tab === 'roster' ? 'active' : ''} onClick={() => setTab('roster')}>Roster</button>
        <button className={tab === 'attendance' ? 'active' : ''} onClick={() => setTab('attendance')}>Attendance</button>
        <button className={tab === 'leaves' ? 'active' : ''} onClick={() => setTab('leaves')}>Leave Requests</button>
      </div>

      {loading ? (
        <Spinner />
      ) : tab === 'roster' ? (
        <div className="card">
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>ID</th><th>Name</th><th>Position</th><th>Department</th><th>Phone</th><th>Salary</th><th>Joined</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s._id}>
                    <td className="muted">{s.employeeId}</td>
                    <td><b>{s.name}</b></td>
                    <td>{s.position}</td>
                    <td>{s.departmentId?.name || '—'}</td>
                    <td>{s.phone || '—'}</td>
                    <td className="money">{fmtMoney(s.salary)}</td>
                    <td>{fmtDate(s.joinedDate)}</td>
                    <td><Badge status={s.status} /></td>
                    <td className="tbl-actions">
                      {canWrite && <button className="btn btn-sm" onClick={() => openEdit(s)}>Edit</button>}
                      {can(user?.role, 'staff', 'delete') && <button className="btn btn-sm btn-ghost-danger" onClick={() => del(s)}>✕</button>}
                    </td>
                  </tr>
                ))}
                {staff.length === 0 && <tr><td className="muted" colSpan={9}>No staff records</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === 'attendance' ? (
        <div>
          <div className="card mb">
            <div className="search-bar" style={{ marginBottom: 0 }}>
              <input type="date" value={attDate} onChange={(e) => setAttDate(e.target.value)} />
              {canWrite && (
                <span className="flex gap">
                  <select className={attErrors.staffId ? 'invalid' : ''} value={attForm.staffId} onChange={(e) => { setAttForm({ ...attForm, staffId: e.target.value }); setAttErrors(({ staffId, ...r }) => r); }}>
                    <option value="">Select staff…</option>
                    {staff.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                  {attErrors.staffId && <span className="field-error">{attErrors.staffId}</span>}
                  <select value={attForm.status} onChange={(e) => setAttForm({ ...attForm, status: e.target.value })}><option>present</option><option>absent</option><option>late</option><option>half-day</option></select>
                  <input type="time" value={attForm.timeIn} onChange={(e) => setAttForm({ ...attForm, timeIn: e.target.value })} />
                  <button className="btn btn-sm btn-primary" onClick={markAtt}>Mark</button>
                </span>
              )}
            </div>
          </div>
          <div className="card">
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Employee</th><th>Date</th><th>In</th><th>Out</th><th>Status</th></tr></thead>
                <tbody>
                  {att.map((a) => (
                    <tr key={a._id}>
                      <td>{a.staffId?.name}<br /><span className="muted" style={{ fontSize: 11 }}>{a.staffId?.employeeId}</span></td>
                      <td>{fmtDate(a.date)}</td>
                      <td>{a.timeIn || '—'}</td>
                      <td>{a.timeOut || '—'}</td>
                      <td><Badge status={a.status} /></td>
                    </tr>
                  ))}
                  {att.length === 0 && <tr><td className="muted" colSpan={5}>No attendance for this date</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {canWrite && (
            <div className="card mb">
              <div className="form-grid">
                <div className="field"><label>Staff *</label><select className={leaveErrors.staffId ? 'invalid' : ''} value={leaveForm.staffId} onChange={(e) => { setLeaveForm({ ...leaveForm, staffId: e.target.value }); setLeaveErrors(({ staffId, ...r }) => r); }}><option value="">Select…</option>{staff.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}</select>{leaveErrors.staffId && <span className="field-error">{leaveErrors.staffId}</span>}</div>
                <div className="field"><label>Type</label><select value={leaveForm.type} onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}><option>Annual</option><option>Sick</option><option>Casual</option><option>Maternity</option><option>No Pay</option><option>Other</option></select></div>
                <div className="field"><label>From *</label><input className={leaveErrors.startDate ? 'invalid' : ''} type="date" value={leaveForm.startDate} onChange={(e) => { setLeaveForm({ ...leaveForm, startDate: e.target.value }); setLeaveErrors(({ startDate, ...r }) => r); }} />{leaveErrors.startDate && <span className="field-error">{leaveErrors.startDate}</span>}</div>
                <div className="field"><label>To *</label><input className={leaveErrors.endDate ? 'invalid' : ''} type="date" value={leaveForm.endDate} onChange={(e) => { setLeaveForm({ ...leaveForm, endDate: e.target.value }); setLeaveErrors(({ endDate, ...r }) => r); }} />{leaveErrors.endDate && <span className="field-error">{leaveErrors.endDate}</span>}</div>
                <div className="field"><label>Reason</label><input value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} /></div>
                <div className="field"><label></label><button className="btn btn-primary" onClick={applyLeave}>Request Leave</button></div>
              </div>
            </div>
          )}
          <div className="card">
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Reason</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {leaves.map((l) => (
                    <tr key={l._id}>
                      <td>{l.staffId?.name}</td>
                      <td>{l.type}</td>
                      <td>{fmtDate(l.startDate)}</td>
                      <td>{fmtDate(l.endDate)}</td>
                      <td className="muted">{l.reason || '—'}</td>
                      <td><Badge status={l.status} /></td>
                      <td className="tbl-actions">
                        {canWrite && l.status === 'pending' && (<>
                          <button className="btn btn-sm btn-success" onClick={() => review(l, 'approved')}>Approve</button>
                          <button className="btn btn-sm btn-ghost-danger" onClick={() => review(l, 'rejected')}>Reject</button>
                        </>)}
                      </td>
                    </tr>
                  ))}
                  {leaves.length === 0 && <tr><td className="muted" colSpan={7}>No leave requests</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <Modal title={editing === 'new' ? 'Add Staff' : 'Edit Staff'} onClose={() => setEditing(null)} footer={<><button className="btn" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>} wide>
          <div className="form-grid">
            <div className="field"><label>Full name *</label><input className={errors.name ? 'invalid' : ''} value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors(({ name, ...r }) => r); }} />{errors.name && <span className="field-error">{errors.name}</span>}</div>
            <div className="field"><label>NIC</label><input className={errors.nic ? 'invalid' : ''} value={form.nic} onChange={(e) => { setForm({ ...form, nic: e.target.value }); setErrors(({ nic, ...r }) => r); }} placeholder="952351245V" />{errors.nic && <span className="field-error">{errors.nic}</span>}</div>
            <div className="field"><label>Position *</label><input className={errors.position ? 'invalid' : ''} value={form.position} onChange={(e) => { setForm({ ...form, position: e.target.value }); setErrors(({ position, ...r }) => r); }} />{errors.position && <span className="field-error">{errors.position}</span>}</div>
            <div className="field"><label>Department</label><select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}><option value="">—</option>{depts.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select></div>
            <div className="field"><label>Phone</label><input className={errors.phone ? 'invalid' : ''} value={form.phone} onChange={(e) => { setForm({ ...form, phone: e.target.value }); setErrors(({ phone, ...r }) => r); }} />{errors.phone && <span className="field-error">{errors.phone}</span>}</div>
            <div className="field"><label>Email</label><input className={errors.email ? 'invalid' : ''} value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors(({ email, ...r }) => r); }} />{errors.email && <span className="field-error">{errors.email}</span>}</div>
            <div className="field"><label>Gender</label><select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option>Male</option><option>Female</option><option>Other</option></select></div>
            <div className="field"><label>Salary (LKR/month)</label><input className={errors.salary ? 'invalid' : ''} type="number" value={form.salary} onChange={(e) => { setForm({ ...form, salary: e.target.value }); setErrors(({ salary, ...r }) => r); }} />{errors.salary && <span className="field-error">{errors.salary}</span>}</div>
            <div className="field"><label>Joined date</label><input type="date" value={form.joinedDate} onChange={(e) => setForm({ ...form, joinedDate: e.target.value })} /></div>
            <div className="field"><label>Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>active</option><option>inactive</option></select></div>
            <div className="field full"><label>Address</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
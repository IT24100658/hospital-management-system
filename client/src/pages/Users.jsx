import { useEffect, useState } from 'react';
import api, { errMsg } from '../api/client.js';
import { Spinner, Modal, Badge, fmtDate, useToast } from '../components/ui.jsx';
import { ROLES } from '../utils/permissions.js';
import { validateForm, hasErrors } from '../utils/validate.js';

export default function Users() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ username: '', name: '', email: '', role: 'receptionist', password: '', active: true });
  const [errors, setErrors] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setRows(res.data.users);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm({ username: '', name: '', email: '', role: 'receptionist', password: '', active: true });
    setErrors({});
    setEditing('new');
  };
  const openEdit = (u) => {
    setForm({ username: u.username, name: u.name, email: u.email, role: u.role, password: '', active: u.active });
    setErrors({});
    setEditing(u._id);
  };
  const save = async () => {
    const errs = validateForm(form, {
      username: ['required'],
      name: ['required'],
      email: ['required', 'email'],
      password: editing === 'new' ? ['required', (v) => (String(v || '').length < 6 ? 'At least 6 characters' : null)] : []
    });
    setErrors(errs);
    if (hasErrors(errs)) return;
    try {
      if (editing === 'new') {
        await api.post('/users', form);
        toast.success('User created');
      } else {
        const { password, ...rest } = form;
        await api.put(`/users/${editing}`, password ? { ...rest, password } : rest);
        toast.success('User updated');
      }
      setEditing(null);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const del = async (u) => {
    if (!confirm(`Delete user ${u.username}?`)) return;
    try {
      await api.delete(`/users/${u._id}`);
      toast.success('User deleted');
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <div>
      <div className="page-head">
        <div><h2>Users & Roles</h2><div className="sub">{rows.length} system accounts</div></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Create User</button>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Username</th><th>Name</th><th>Email</th><th>Role</th><th>Last login</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u._id}>
                    <td><b>{u.username}</b></td>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td><Badge status={u.role} /></td>
                    <td>{u.lastLogin ? fmtDate(u.lastLogin) : 'Never'}</td>
                    <td>{u.active ? <Badge status="active" /> : <Badge status="inactive" />}</td>
                    <td className="tbl-actions">
                      <button className="btn btn-sm" onClick={() => openEdit(u)}>Edit</button>
                      <button className="btn btn-sm btn-ghost-danger" onClick={() => del(u)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt muted" style={{ fontSize: 12 }}>
            Roles: {ROLES.map((r) => <span key={r} className="badge badge-neutral" style={{ marginRight: 5 }}>{r}</span>)}
          </div>
        </div>
      )}

      {editing && (
        <Modal title={editing === 'new' ? 'Create User' : 'Edit User'} onClose={() => setEditing(null)} footer={<><button className="btn" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}>
          <div className="form-grid">
            <div className="field"><label>Username *</label><input className={errors.username ? 'invalid' : ''} value={form.username} onChange={(e) => { setForm({ ...form, username: e.target.value }); setErrors(({ username, ...r }) => r); }} />{errors.username && <span className="field-error">{errors.username}</span>}</div>
            <div className="field"><label>Full name *</label><input className={errors.name ? 'invalid' : ''} value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors(({ name, ...r }) => r); }} />{errors.name && <span className="field-error">{errors.name}</span>}</div>
            <div className="field"><label>Email *</label><input className={errors.email ? 'invalid' : ''} value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors(({ email, ...r }) => r); }} />{errors.email && <span className="field-error">{errors.email}</span>}</div>
            <div className="field"><label>Role *</label><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></div>
            <div className="field"><label>{editing === 'new' ? 'Password *' : 'New password (leave blank to keep)'}</label><input className={errors.password ? 'invalid' : ''} type="password" value={form.password} onChange={(e) => { setForm({ ...form, password: e.target.value }); setErrors(({ password, ...r }) => r); }} />{errors.password && <span className="field-error">{errors.password}</span>}</div>
            <div className="field"><label>Active</label><select value={form.active} onChange={(e) => setForm({ ...form, active: e.target.value === 'true' })}><option value="true">Active</option><option value="false">Disabled</option></select></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
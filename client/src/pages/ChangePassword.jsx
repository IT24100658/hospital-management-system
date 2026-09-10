import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../api/client.js';
import { useToast } from '../components/ui.jsx';
import { validateForm, hasErrors } from '../utils/validate.js';
import api from '../api/client.js';

export default function ChangePassword() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const errs = validateForm(
      { cur, next, confirm },
      {
        cur: ['required'],
        next: ['required', (v) => (String(v || '').length < 6 ? 'At least 6 characters' : null)],
        confirm: [
          'required',
          (v) => (v && v !== next ? 'Passwords do not match' : null)
        ]
      }
    );
    setErrors(errs);
    if (hasErrors(errs)) return;
    setBusy(true);
    try {
      const res = await api.post('/auth/change-password', { currentPassword: cur, newPassword: next });
      localStorage.setItem('hms_token', res.data.token);
      updateUser(user);
      toast.success('Password changed');
      navigate('/');
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const clear = (k) => setErrors(({ [k]: _, ...rest }) => rest);

  return (
    <div>
      <div className="page-head">
        <div><h2>Change Password</h2><div className="sub">Signed in as {user?.name}</div></div>
      </div>
      <div className="card" style={{ maxWidth: 460 }}>
        <form onSubmit={submit} noValidate>
          <div className="field">
            <label>Current password</label>
            <input className={errors.cur ? 'invalid' : ''} type="password" value={cur} onChange={(e) => { setCur(e.target.value); clear('cur'); }} />
            {errors.cur && <span className="field-error">{errors.cur}</span>}
          </div>
          <div className="field mt">
            <label>New password</label>
            <input className={errors.next ? 'invalid' : ''} type="password" value={next} onChange={(e) => { setNext(e.target.value); clear('next'); }} />
            <div className="hint">At least 6 characters</div>
            {errors.next && <span className="field-error">{errors.next}</span>}
          </div>
          <div className="field mt">
            <label>Confirm new password</label>
            <input className={errors.confirm ? 'invalid' : ''} type="password" value={confirm} onChange={(e) => { setConfirm(e.target.value); clear('confirm'); }} />
            {errors.confirm && <span className="field-error">{errors.confirm}</span>}
          </div>
          <button className="btn btn-primary mt" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>{busy ? 'Saving…' : 'Update Password'}</button>
        </form>
      </div>
    </div>
  );
}
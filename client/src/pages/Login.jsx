import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../api/client.js';
import { validateForm, hasErrors } from '../utils/validate.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const errs = validateForm({ username, password }, { username: ['required'], password: ['required'] });
    setErrors(errs);
    if (hasErrors(errs)) return;
    setBusy(true);
    setError('');
    try {
      await login(username.trim(), password);
      navigate('/');
    } catch (err) {
      setError(errMsg(err, 'Login failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand">
          <span className="logo">+</span>
          <div>
            <h1>MediCare</h1>
            <p className="sub">Hospital Management System</p>
          </div>
        </div>
        <form onSubmit={submit} noValidate>
          <div className="field">
            <label>Username or Email</label>
            <input className={errors.username ? 'invalid' : ''} value={username} onChange={(e) => { setUsername(e.target.value); setErrors(({ username, ...r }) => r); }} autoFocus />
            {errors.username && <span className="field-error">{errors.username}</span>}
          </div>
          <div className="field mt">
            <label>Password</label>
            <input className={errors.password ? 'invalid' : ''} type="password" value={password} onChange={(e) => { setPassword(e.target.value); setErrors(({ password, ...r }) => r); }} />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>
          {error && <div className="field mt"><span className="badge badge-danger">{error}</span></div>}
          <button className="btn btn-primary mt" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div className="demo-box">
          <strong>Demo accounts</strong> (password: <code>admin123</code>)
          <br />
          <code>admin</code> · <code>reception</code> · <code>nurse</code> · <code>labtech</code> · <code>pharmacist</code> · <code>accountant</code>
        </div>
      </div>
    </div>
  );
}
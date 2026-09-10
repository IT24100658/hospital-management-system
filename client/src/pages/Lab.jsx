import { useEffect, useState, useCallback } from 'react';
import api, { errMsg } from '../api/client.js';
import { Spinner, Modal, Badge, fmtDate, useToast } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { can } from '../utils/permissions.js';
import { validateForm, hasErrors } from '../utils/validate.js';

export default function Lab() {
  const { user } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState({ patientId: '', testName: '', category: 'Blood', notes: '', referenceRange: '' });
  const [requesting, setRequesting] = useState(false);
  const [resultOf, setResultOf] = useState(null);
  const [result, setResult] = useState({ result: '', normal: 'normal', notes: '' });
  const [viewing, setViewing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [resultErrors, setResultErrors] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/labs', { params: { status: status || undefined, limit: 50 } });
      setRows(res.data.tests);
      setTotal(res.data.total);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const openRequest = async () => {
    try {
      const p = await api.get('/patients', { params: { limit: 500 } });
      setPatients(p.data.patients);
      setForm({ patientId: '', testName: '', category: 'Blood', notes: '', referenceRange: '' });
      setErrors({});
      setRequesting(true);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const submit = async () => {
    const errs = validateForm(form, {
      patientId: ['required'],
      testName: ['required']
    });
    setErrors(errs);
    if (hasErrors(errs)) return;
    try {
      await api.post('/labs', form);
      toast.success('Lab test requested');
      setRequesting(false);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const collect = async (t) => {
    try {
      await api.put(`/labs/${t._id}/collect`);
      toast.success('Sample collected');
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const saveResult = async () => {
    const errs = validateForm(result, { result: ['required'] });
    setResultErrors(errs);
    if (hasErrors(errs)) return;
    try {
      await api.put(`/labs/${resultOf._id}/result`, result);
      toast.success('Result saved');
      setResultOf(null);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const del = async (t) => {
    if (!can(user?.role, 'lab', 'delete')) return;
    if (!confirm('Delete this lab request?')) return;
    try {
      await api.delete(`/labs/${t._id}`);
      toast.success('Deleted');
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <div>
      <div className="page-head">
        <div><h2>Laboratory</h2><div className="sub">{total} tests</div></div>
        {can(user?.role, 'lab', 'create') && <button className="btn btn-primary" onClick={openRequest}>+ Request Test</button>}
      </div>

      <div className="search-bar">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option>requested</option><option>sample-collected</option><option>in-progress</option><option>completed</option>
        </select>
        <button className="btn btn-sm" onClick={load}>Refresh</button>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>No</th><th>Patient</th><th>Test</th><th>Category</th><th>Requested</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t._id}>
                    <td className="muted">{t.testNo}</td>
                    <td>{t.patientId?.name}</td>
                    <td>{t.testName}</td>
                    <td>{t.category}</td>
                    <td>{fmtDate(t.createdAt)}</td>
                    <td><Badge status={t.status} /></td>
                    <td className="tbl-actions">
                      <button className="btn btn-sm" onClick={() => setViewing(t)}>View</button>
                      {can(user?.role, 'lab', 'update') && t.status === 'requested' && <button className="btn btn-sm" onClick={() => collect(t)}>Collect</button>}
                      {can(user?.role, 'lab', 'update') && t.status !== 'completed' && <button className="btn btn-sm" onClick={() => { setResult({ result: t.result || '', normal: t.normal || 'normal', notes: t.notes || '' }); setResultErrors({}); setResultOf(t); }}>Enter Result</button>}
                      {can(user?.role, 'lab', 'delete') && <button className="btn btn-sm btn-ghost-danger" onClick={() => del(t)}>✕</button>}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td className="muted" colSpan={7}>No lab tests</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {requesting && (
        <Modal title="Request Lab Test" onClose={() => setRequesting(false)} footer={<><button className="btn" onClick={() => setRequesting(false)}>Cancel</button><button className="btn btn-primary" onClick={submit}>Request</button></>}>
          <div className="form-grid">
            <div className="field"><label>Patient *</label><select className={errors.patientId ? 'invalid' : ''} value={form.patientId} onChange={(e) => { setForm({ ...form, patientId: e.target.value }); setErrors(({ patientId, ...r }) => r); }}><option value="">Select…</option>{patients.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.patientId})</option>)}</select>{errors.patientId && <span className="field-error">{errors.patientId}</span>}</div>
            <div className="field"><label>Test name *</label><input className={errors.testName ? 'invalid' : ''} value={form.testName} onChange={(e) => { setForm({ ...form, testName: e.target.value }); setErrors(({ testName, ...r }) => r); }} placeholder="Full Blood Count" />{errors.testName && <span className="field-error">{errors.testName}</span>}</div>
            <div className="field"><label>Category</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>Blood</option><option>Urine</option><option>Imaging</option><option>Biopsy</option><option>Other</option></select></div>
            <div className="field"><label>Reference range</label><input value={form.referenceRange} onChange={(e) => setForm({ ...form, referenceRange: e.target.value })} /></div>
            <div className="field full"><label>Notes</label><textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
        </Modal>
      )}

      {resultOf && (
        <Modal title={`Result — ${resultOf.testName}`} onClose={() => setResultOf(null)} footer={<><button className="btn" onClick={() => setResultOf(null)}>Cancel</button><button className="btn btn-primary" onClick={saveResult}>Save Result</button></>}>
          <div className="field"><label>Result *</label><textarea className={resultErrors.result ? 'invalid' : ''} rows={4} value={result.result} onChange={(e) => { setResult({ ...result, result: e.target.value }); setResultErrors(({ result, ...r }) => r); }} placeholder="e.g. Hb 13.5 g/dL — within normal limits" />{resultErrors.result && <span className="field-error">{resultErrors.result}</span>}</div>
          <div className="form-grid mt">
            <div className="field"><label>Assessment</label><select value={result.normal} onChange={(e) => setResult({ ...result, normal: e.target.value })}><option value="normal">Normal</option><option value="abnormal">Abnormal</option><option value="">Not marked</option></select></div>
            <div className="field"><label>Notes</label><input value={result.notes} onChange={(e) => setResult({ ...result, notes: e.target.value })} /></div>
          </div>
        </Modal>
      )}

      {viewing && (
        <Modal title={`${viewing.testNo} — ${viewing.testName}`} onClose={() => setViewing(null)} wide>
          <div className="grid-3 mb">
            <div className="card"><div className="detail-label">Patient</div><b>{viewing.patientId?.name}</b><br /><span className="muted">{viewing.patientId?.patientId}</span></div>
            <div className="card"><div className="detail-label">Category</div><b>{viewing.category}</b><br /><span className="muted">Status: <Badge status={viewing.status} /></span></div>
            <div className="card"><div className="detail-label">Requested</div>{fmtDate(viewing.createdAt)}<br /><span className="muted">Sample: {viewing.sampleCollectedAt ? fmtDate(viewing.sampleCollectedAt) : '—'}</span></div>
          </div>
          <div className="card">
            <div className="detail-label">Result</div>
            <div>{viewing.result || <span className="muted">Result not yet entered</span>}</div>
            {viewing.normal && <div className="mt"><Badge status={viewing.normal} /></div>}
            {viewing.referenceRange && <><div className="detail-label mt">Reference range</div><div className="muted">{viewing.referenceRange}</div></>}
            {viewing.notes && <><div className="detail-label mt">Notes</div><div>{viewing.notes}</div></>}
          </div>
        </Modal>
      )}
    </div>
  );
}
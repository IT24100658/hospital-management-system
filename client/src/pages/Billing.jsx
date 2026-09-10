import { useEffect, useState, useCallback } from 'react';
import api, { errMsg } from '../api/client.js';
import { Spinner, Modal, Badge, fmtDate, fmtMoney, useToast } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { can } from '../utils/permissions.js';
import { hasErrors } from '../utils/validate.js';

export default function Billing() {
  const { user } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [patients, setPatients] = useState([]);
  const [creating, setCreating] = useState(false);
  const [items, setItems] = useState([{ description: '', category: 'Consultation', quantity: 1, unitPrice: '' }]);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [patientId, setPatientId] = useState('');
  const [payOf, setPayOf] = useState(null);
  const [payAmt, setPayAmt] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [viewing, setViewing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [lineErrors, setLineErrors] = useState({});
  const [payErrors, setPayErrors] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/billing', { params: { status: status || undefined, limit: 50 } });
      setRows(res.data.invoices);
      setTotal(res.data.total);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const openCreate = async () => {
    try {
      const p = await api.get('/patients', { params: { limit: 500 } });
      setPatients(p.data.patients);
      setPatientId('');
      setItems([{ description: '', category: 'Consultation', quantity: 1, unitPrice: '' }]);
      setDiscount(0);
      setTax(0);
      setPatientId('');
      setErrors({});
      setLineErrors({});
      setCreating(true);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const setItem = (i, k, v) => setItems(items.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)));
  const subtotal = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);
  const grandTotal = Math.max(0, subtotal - Number(discount || 0) + Number(tax || 0));

  const save = async () => {
    const errs = {};
    if (!patientId) errs.patientId = 'This field is required';
    const lerrs = {};
    const clean = items
      .map((it) => ({ ...it, quantity: Number(it.quantity) || 0, unitPrice: Number(it.unitPrice) || 0 }))
      .filter((it) => it.description.trim() || it.quantity || it.unitPrice);
    if (clean.length === 0) lerrs.all = 'Add at least one line item';
    clean.forEach((it, i) => {
      if (!it.description.trim()) lerrs[i] = 'Description required';
      if (it.quantity <= 0) lerrs[`${i}q`] = 'Qty > 0';
      if (it.unitPrice <= 0) lerrs[`${i}p`] = 'Price > 0';
    });
    if (Number(discount) < 0 || Number(tax) < 0) errs.total = 'Discount/tax cannot be negative';
    const errsAll = { ...errs, ...lerrs };
    setErrors(errsAll);
    if (hasErrors(errsAll)) return;
    try {
      await api.post('/billing', { patientId, items: clean, discount: Number(discount) || 0, tax: Number(tax) || 0 });
      toast.success('Invoice created');
      setCreating(false);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const pay = async () => {
    const pErr = {};
    if (payAmt === '' || payAmt === null) pErr.amount = 'This field is required';
    else if (Number(payAmt) <= 0) pErr.amount = 'Must be greater than 0';
    else if (Number(payAmt) > payOf?.balance) pErr.amount = `Cannot exceed balance (${fmtMoney(payOf.balance)})`;
    setPayErrors(pErr);
    if (hasErrors(pErr)) return;
    try {
      await api.post(`/billing/${payOf._id}/payments`, { amount: Number(payAmt), method: payMethod });
      toast.success('Payment recorded');
      setPayOf(null);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const del = async (b) => {
    if (!confirm(`Delete invoice ${b.invoiceNo}?`)) return;
    try {
      await api.delete(`/billing/${b._id}`);
      toast.success('Invoice deleted');
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <div>
      <div className="page-head">
        <div><h2>Billing</h2><div className="sub">{total} invoices</div></div>
        {can(user?.role, 'billing', 'create') && <button className="btn btn-primary" onClick={openCreate}>+ Create Invoice</button>}
      </div>

      <div className="search-bar">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option>unpaid</option><option>partial</option><option>paid</option>
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Invoice</th><th>Patient</th><th>Date</th><th>Items</th><th>Total</th><th>Paid</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b._id}>
                    <td className="muted">{b.invoiceNo}</td>
                    <td>{b.patientId?.name}</td>
                    <td>{fmtDate(b.createdAt)}</td>
                    <td>{b.items.length}</td>
                    <td className="money">{fmtMoney(b.total)}</td>
                    <td className="money">{fmtMoney(b.paidAmount)}</td>
                    <td><Badge status={b.status} /></td>
                    <td className="tbl-actions">
                      <button className="btn btn-sm" onClick={() => setViewing(b)}>Receipt</button>
                      {can(user?.role, 'billing', 'update') && b.status !== 'paid' && <button className="btn btn-sm" onClick={() => { setPayOf(b); setPayAmt(b.total - b.paidAmount); setPayErrors({}); }}>Pay</button>}
                      {can(user?.role, 'billing', 'delete') && <button className="btn btn-sm btn-ghost-danger" onClick={() => del(b)}>✕</button>}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td className="muted" colSpan={8}>No invoices</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {creating && (
        <Modal title="Create Invoice" onClose={() => setCreating(false)} footer={<><button className="btn" onClick={() => setCreating(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save Invoice</button></>} wide>
          <div className="field"><label>Patient *</label><select className={errors.patientId ? 'invalid' : ''} value={patientId} onChange={(e) => { setPatientId(e.target.value); setErrors(({ patientId, ...r }) => r); }}><option value="">Select…</option>{patients.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.patientId})</option>)}</select>{errors.patientId && <span className="field-error">{errors.patientId}</span>}</div>
          <table className="tbl mt">
            <thead><tr><th>Description</th><th>Category</th><th>Qty</th><th>Unit price</th><th>Amount</th><th></th></tr></thead>
            <tbody>
              {items.map((i, idx) => (
                <tr key={idx}>
                  <td><input className={lineErrors[idx] ? 'invalid' : ''} value={i.description} onChange={(e) => { setItem(idx, 'description', e.target.value); setLineErrors(({ [idx]: _, ...r }) => r); }} placeholder="Item" />{lineErrors[idx] && <div className="field-error">{lineErrors[idx]}</div>}</td>
                  <td><select value={i.category} onChange={(e) => setItem(idx, 'category', e.target.value)}><option>Consultation</option><option>Laboratory</option><option>Pharmacy</option><option>Admission</option><option>Procedure</option><option>Other</option></select></td>
                  <td><input className={lineErrors[`${idx}q`] ? 'invalid' : ''} type="number" style={{ width: 64 }} value={i.quantity} onChange={(e) => { setItem(idx, 'quantity', e.target.value); setLineErrors(({ [`${idx}q`]: _, ...r }) => r); }} />{lineErrors[`${idx}q`] && <div className="field-error">{lineErrors[`${idx}q`]}</div>}</td>
                  <td><input className={lineErrors[`${idx}p`] ? 'invalid' : ''} type="number" style={{ width: 90 }} value={i.unitPrice} onChange={(e) => { setItem(idx, 'unitPrice', e.target.value); setLineErrors(({ [`${idx}p`]: _, ...r }) => r); }} />{lineErrors[`${idx}p`] && <div className="field-error">{lineErrors[`${idx}p`]}</div>}</td>
                  <td className="money">{fmtMoney((Number(i.quantity) || 0) * (Number(i.unitPrice) || 0))}</td>
                  <td>{items.length > 1 && <button className="btn btn-sm btn-ghost-danger" onClick={() => setItems(items.filter((_, x) => x !== idx))}>✕</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {lineErrors.all && <div className="field-error mt">{lineErrors.all}</div>}
          {errors.total && <div className="field-error mt">{errors.total}</div>}
          <button className="btn btn-sm mt" onClick={() => setItems([...items, { description: '', category: 'Other', quantity: 1, unitPrice: '' }])}>+ Add line</button>
          <div className="form-grid mt">
            <div className="field"><label>Discount (LKR)</label><input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
            <div className="field"><label>Tax (LKR)</label><input type="number" value={tax} onChange={(e) => setTax(e.target.value)} /></div>
          </div>
          <div className="flex between mt"><b>Total</b><b className="money">{fmtMoney(grandTotal)}</b></div>
        </Modal>
      )}

      {payOf && (
        <Modal title={`Record Payment — ${payOf.invoiceNo}`} onClose={() => setPayOf(null)} footer={<><button className="btn" onClick={() => setPayOf(null)}>Cancel</button><button className="btn btn-success" onClick={pay}>Confirm Payment</button></>}>
          <div className="card mb">
            <div className="flex between"><span className="muted">Total</span><b className="money">{fmtMoney(payOf.total)}</b></div>
            <div className="flex between"><span className="muted">Paid so far</span><b>{fmtMoney(payOf.paidAmount)}</b></div>
            <div className="flex between"><span className="muted">Balance due</span><b className="money">{fmtMoney(payOf.total - payOf.paidAmount)}</b></div>
          </div>
          <div className="form-grid">
            <div className="field"><label>Amount *</label><input className={payErrors.amount ? 'invalid' : ''} type="number" value={payAmt} onChange={(e) => { setPayAmt(e.target.value); setPayErrors({}); }} />{payErrors.amount && <span className="field-error">{payErrors.amount}</span>}</div>
            <div className="field"><label>Method</label><select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}><option>Cash</option><option>Card</option><option>Online</option><option>Insurance</option><option>Other</option></select></div>
          </div>
        </Modal>
      )}

      {viewing && (
        <Modal title={`Invoice ${viewing.invoiceNo}`} onClose={() => setViewing(null)} wide>
          <div className="flex between align-center mb">
            <div>
              <b>MediCare Hospital</b>
              <div className="muted">Digital Healthcare Services<br />Billed to: {viewing.patientId?.name} ({viewing.patientId?.patientId})</div>
            </div>
            <div className="muted">{fmtDate(viewing.createdAt)}<br /><Badge status={viewing.status} /></div>
          </div>
          <table className="tbl">
            <thead><tr><th>Description</th><th>Category</th><th>Qty</th><th>Unit</th><th>Amount</th></tr></thead>
            <tbody>
              {viewing.items.map((i, idx) => (
                <tr key={idx}><td>{i.description}</td><td>{i.category}</td><td>{i.quantity}</td><td className="money">{fmtMoney(i.unitPrice)}</td><td className="money">{fmtMoney(i.amount)}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="flex between mt"><span className="muted">Subtotal</span><span className="money">{fmtMoney(viewing.subtotal)}</span></div>
          {viewing.discount > 0 && <div className="flex between"><span className="muted">Discount</span><span className="money">−{fmtMoney(viewing.discount)}</span></div>}
          {viewing.tax > 0 && <div className="flex between"><span className="muted">Tax</span><span className="money">{fmtMoney(viewing.tax)}</span></div>}
          <div className="flex between mt"><b>Total</b><b className="money">{fmtMoney(viewing.total)}</b></div>
          <div className="flex between"><span className="muted">Paid</span><span className="money" style={{ color: 'var(--success)' }}>{fmtMoney(viewing.paidAmount)}</span></div>
          {viewing.status !== 'paid' && <div className="flex between"><span className="muted">Due</span><span className="money" style={{ color: 'var(--danger)' }}>{fmtMoney(viewing.total - viewing.paidAmount)}</span></div>}
          {viewing.payments.length > 0 && (
            <>
              <h4 className="mt">Payments</h4>
              <ul className="list-plain">
                {viewing.payments.map((p, i) => (
                  <li key={i} className="flex between"><span>{fmtDate(p.date)} · {p.method}</span><span className="money">{fmtMoney(p.amount)}</span></li>
                ))}
              </ul>
            </>
          )}
          <div className="modal-foot no-print" style={{ padding: '14px 0 0' }}>
            <button className="btn btn-primary" onClick={() => window.print()}>Print Receipt</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
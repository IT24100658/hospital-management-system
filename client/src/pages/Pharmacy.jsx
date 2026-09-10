import { useEffect, useState, useCallback } from 'react';
import api, { errMsg } from '../api/client.js';
import { Spinner, Modal, Badge, fmtDate, fmtMoney, useToast } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { can } from '../utils/permissions.js';
import { validateForm, hasErrors } from '../utils/validate.js';

export default function Pharmacy() {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('inventory');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [presc, setPresc] = useState([]);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [restockOf, setRestockOf] = useState(null);
  const [restockQty, setRestockQty] = useState(1);
  const [errors, setErrors] = useState({});
  const [restockErrors, setRestockErrors] = useState({});

  const canWrite = can(user?.role, 'pharmacy', 'update') || can(user?.role, 'pharmacy', 'create');

  const load = useCallback(async (which = 'all') => {
    setLoading(true);
    try {
      const reqs = [];
      if (which !== 'presc') reqs.push(api.get('/pharmacy', { params: { limit: 200 } }));
      if (which === 'all' || which === 'presc') reqs.push(api.get('/pharmacy/prescriptions'));
      if (which === 'all') reqs.push(api.get('/pharmacy/alerts'));
      const res = await Promise.all(reqs);
      let i = 0;
      if (which !== 'presc') { setItems(res[i].data.items); setTotal(res[i].data.total); i++; }
      if (which === 'all' || which === 'presc') { setPresc(res[i].data.prescriptions); i++; }
      if (which === 'all') setAlerts(res[i].data);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setForm({ code: '', name: '', category: 'Tablet', batchNo: '', manufacturer: '', supplier: '', quantity: 0, unitPrice: '', sellingPrice: '', expiryDate: '', reorderLevel: '', location: '' });
    setErrors({});
    setEditing('new');
  };
  const openEdit = (i) => {
    setForm({ ...i, expiryDate: i.expiryDate ? i.expiryDate.slice(0, 10) : '' });
    setErrors({});
    setEditing(i._id);
  };
  const save = async () => {
    const errs = validateForm(form, {
      code: ['required'],
      name: ['required'],
      quantity: ['positiveInt'],
      unitPrice: ['positiveNumber'],
      sellingPrice: ['positiveNumber'],
      reorderLevel: ['positiveInt'],
      expiryDate: ['futureMonth']
    });
    setErrors(errs);
    if (hasErrors(errs)) return;
    try {
      if (editing === 'new') {
        await api.post('/pharmacy', { ...form, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice), sellingPrice: Number(form.sellingPrice), reorderLevel: Number(form.reorderLevel) });
        toast.success('Item added');
      } else {
        await api.put(`/pharmacy/${editing}`, { ...form, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice), sellingPrice: Number(form.sellingPrice), reorderLevel: Number(form.reorderLevel) });
        toast.success('Item updated');
      }
      setEditing(null);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const doRestock = async () => {
    const errs = validateForm({ restockQty }, { restockQty: [(v) => (!v || Number(v) <= 0 ? 'Must be greater than 0' : !Number.isInteger(Number(v)) ? 'Must be a whole number' : null)] });
    setRestockErrors(errs);
    if (hasErrors(errs)) return;
    try {
      await api.put(`/pharmacy/${restockOf._id}/restock`, { quantity: restockQty });
      toast.success(`Stock increased by ${restockQty}`);
      setRestockOf(null);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const del = async (i) => {
    if (!confirm(`Delete ${i.name}?`)) return;
    try {
      await api.delete(`/pharmacy/${i._id}`);
      toast.success('Deleted');
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const fill = async (p) => {
    if (!confirm(`Dispense "${p.medicine}" for ${p.patient?.name}?`)) return;
    try {
      const res = await api.put(`/pharmacy/prescriptions/${p.recordId}/${p.prescriptionIndex}`);
      toast.success('Prescription filled');
      if (res.data.warning?.length) res.data.warning.forEach((w) => toast.error(w));
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <div>
      <div className="page-head">
        <div><h2>Pharmacy</h2><div className="sub">Inventory · Prescriptions</div></div>
      </div>

      {alerts && (alerts.lowStock.length > 0 || alerts.expiring.length > 0) && (
        <div className="card mb" style={{ borderColor: 'var(--warning)', background: 'var(--warning-bg)' }}>
          <b>⚠ Alerts:</b>{' '}
          {alerts.lowStock.length > 0 && <span>{alerts.lowStock.length} item(s) low stock ({alerts.lowStock.map((i) => i.name).join(', ')})</span>}
          {alerts.expiring.length > 0 && <span>{alerts.lowStock.length > 0 ? ' · ' : ''}{alerts.expiring.length} expiring within 30 days ({alerts.expiring.map((i) => i.name).join(', ')})</span>}
        </div>
      )}

      <div className="tabs">
        <button className={tab === 'inventory' ? 'active' : ''} onClick={() => setTab('inventory')}>Inventory ({total})</button>
        <button className={tab === 'prescriptions' ? 'active' : ''} onClick={() => setTab('prescriptions')}>Prescriptions ({presc.length})</button>
      </div>

      {loading ? (
        <Spinner />
      ) : tab === 'inventory' ? (
        <div className="card">
          <div className="flex between align-center mb">
            <span className="muted">Showing all items ({total})</span>
            {canWrite && <button className="btn btn-sm btn-primary" onClick={openAdd}>+ Add Item</button>}
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Code</th><th>Name</th><th>Category</th><th>Qty</th><th>Unit price</th><th>Selling</th><th>Expiry</th><th>Stock</th><th></th></tr></thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i._id}>
                    <td className="muted">{i.code}</td>
                    <td><b>{i.name}</b><br /><span className="muted">{i.batchNo || ''}</span></td>
                    <td>{i.category}</td>
                    <td>{i.quantity}</td>
                    <td className="money">{fmtMoney(i.unitPrice)}</td>
                    <td className="money">{fmtMoney(i.sellingPrice)}</td>
                    <td>{i.expiryDate ? fmtDate(i.expiryDate) : '—'}</td>
                    <td>
                      {i.lowStock ? <Badge status="late" /> : i.expiringSoon ? <Badge status="pending" /> : i.expired ? <Badge status="cancelled" /> : <Badge status="approved" />}
                      <span className="muted" style={{ fontSize: 11 }}> reorder @{i.reorderLevel}</span>
                    </td>
                    <td className="tbl-actions">
                      {canWrite && <button className="btn btn-sm" onClick={() => { setRestockOf(i); setRestockQty(1); setRestockErrors({}); }}>Restock</button>}
                      {canWrite && <button className="btn btn-sm" onClick={() => openEdit(i)}>Edit</button>}
                      {can(user?.role, 'pharmacy', 'delete') && <button className="btn btn-sm btn-ghost-danger" onClick={() => del(i)}>✕</button>}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && <tr><td className="muted" colSpan={9}>No inventory items</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          {presc.length === 0 ? (
            <div className="empty-state">No open prescriptions</div>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Patient</th><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Doctor</th><th>Date</th><th></th></tr></thead>
                <tbody>
                  {presc.map((p, idx) => (
                    <tr key={idx}>
                      <td>{p.patient?.name}</td>
                      <td><b>{p.medicine}</b></td>
                      <td>{p.dosage}</td>
                      <td>{p.frequency}</td>
                      <td>{p.duration}</td>
                      <td>{p.doctor?.name}</td>
                      <td>{fmtDate(p.date)}</td>
                      <td>{p.filled ? <Badge status="approved" /> : canWrite ? <button className="btn btn-sm btn-success" onClick={() => fill(p)}>Dispense</button> : <Badge status="pending" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {editing && (
        <Modal title={editing === 'new' ? 'Add Item' : 'Edit Item'} onClose={() => setEditing(null)} footer={<><button className="btn" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>} wide>
          <div className="form-grid">
            <div className="field"><label>Code *</label><input className={errors.code ? 'invalid' : ''} value={form.code} onChange={(e) => { setForm({ ...form, code: e.target.value }); setErrors(({ code, ...r }) => r); }} />{errors.code && <span className="field-error">{errors.code}</span>}</div>
            <div className="field"><label>Name *</label><input className={errors.name ? 'invalid' : ''} value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors(({ name, ...r }) => r); }} />{errors.name && <span className="field-error">{errors.name}</span>}</div>
            <div className="field"><label>Category</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>Tablet</option><option>Syrup</option><option>Injection</option><option>Capsule</option><option>Ointment</option><option>Dressing</option><option>Other</option></select></div>
            <div className="field"><label>Batch no</label><input value={form.batchNo} onChange={(e) => setForm({ ...form, batchNo: e.target.value })} /></div>
            <div className="field"><label>Manufacturer</label><input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} /></div>
            <div className="field"><label>Supplier</label><input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></div>
            <div className="field"><label>Quantity *</label><input className={errors.quantity ? 'invalid' : ''} type="number" value={form.quantity} onChange={(e) => { setForm({ ...form, quantity: e.target.value }); setErrors(({ quantity, ...r }) => r); }} />{errors.quantity && <span className="field-error">{errors.quantity}</span>}</div>
            <div className="field"><label>Unit price (LKR) *</label><input className={errors.unitPrice ? 'invalid' : ''} type="number" value={form.unitPrice} onChange={(e) => { setForm({ ...form, unitPrice: e.target.value }); setErrors(({ unitPrice, ...r }) => r); }} />{errors.unitPrice && <span className="field-error">{errors.unitPrice}</span>}</div>
            <div className="field"><label>Selling price (LKR) *</label><input className={errors.sellingPrice ? 'invalid' : ''} type="number" value={form.sellingPrice} onChange={(e) => { setForm({ ...form, sellingPrice: e.target.value }); setErrors(({ sellingPrice, ...r }) => r); }} />{errors.sellingPrice && <span className="field-error">{errors.sellingPrice}</span>}</div>
            <div className="field"><label>Expiry date</label><input className={errors.expiryDate ? 'invalid' : ''} type="date" value={form.expiryDate} onChange={(e) => { setForm({ ...form, expiryDate: e.target.value }); setErrors(({ expiryDate, ...r }) => r); }} />{errors.expiryDate && <span className="field-error">{errors.expiryDate}</span>}</div>
            <div className="field"><label>Reorder level</label><input className={errors.reorderLevel ? 'invalid' : ''} type="number" value={form.reorderLevel} onChange={(e) => { setForm({ ...form, reorderLevel: e.target.value }); setErrors(({ reorderLevel, ...r }) => r); }} />{errors.reorderLevel && <span className="field-error">{errors.reorderLevel}</span>}</div>
            <div className="field"><label>Location</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
          </div>
        </Modal>
      )}

      {restockOf && (
        <Modal title={`Restock — ${restockOf.name}`} onClose={() => setRestockOf(null)} footer={<><button className="btn" onClick={() => setRestockOf(null)}>Cancel</button><button className="btn btn-success" onClick={doRestock}>Add Stock</button></>}>
          <div className="field"><label>Current quantity</label><div>{restockOf.quantity}</div></div>
          <div className="field mt"><label>Quantity to add *</label><input className={restockErrors.restockQty ? 'invalid' : ''} type="number" value={restockQty} onChange={(e) => { setRestockQty(e.target.value); setRestockErrors(({ restockQty, ...r }) => r); }} />{restockErrors.restockQty && <span className="field-error">{restockErrors.restockQty}</span>}</div>
        </Modal>
      )}
    </div>
  );
}
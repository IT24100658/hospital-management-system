import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import api, { errMsg } from '../api/client.js';
import { Spinner, fmtMoney, useToast } from '../components/ui.jsx';
import { can } from '../utils/permissions.js';
import { useAuth } from '../context/AuthContext.jsx';

const COLORS = ['#0e7490', '#d97706', '#16a34a', '#dc2626', '#2563eb', '#7c3aed', '#64748b'];

function MiniPie({ data, nameKey = '_id', valueKey = 'count' }) {
  const rows = (data || []).filter((d) => d[nameKey]);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={rows} dataKey={valueKey} nameKey={nameKey} outerRadius={80} label={(e) => e._id}>
          {rows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

function MiniBar({ data, xKey, yKey, color = '#0e7490', name }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey={xKey} fontSize={11} />
        <YAxis fontSize={11} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey={yKey} name={name} fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function Reports() {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('revenue');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const tabs = [
    { key: 'revenue', label: 'Revenue', need: 'reports' },
    { key: 'patients', label: 'Patients', need: 'reports' },
    { key: 'appointments', label: 'Appointments', need: 'reports' },
    { key: 'lab', label: 'Laboratory', need: 'lab' },
    { key: 'pharmacy', label: 'Pharmacy', need: 'pharmacy' },
    { key: 'staff', label: 'Staff', need: 'staff' }
  ].filter((t) => can(user?.role, t.need, 'read'));

  useEffect(() => {
    setData(null);
    setLoading(true);
    const active = tabs.find((t) => t.key === tab);
    if (!active) return;
    api
      .get(`/reports/${tab}`, { params: { from: from || undefined, to: to || undefined } })
      .then((res) => setData(res.data))
      .catch((e) => toast.error(errMsg(e)))
      .finally(() => setLoading(false));
  }, [tab, from, to]);

  return (
    <div>
      <div className="page-head">
        <div><h2>Reports & Analytics</h2><div className="sub">Filter reports by date range</div></div>
        <div className="search-bar" style={{ marginBottom: 0 }}>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="muted">to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="tabs">
        {tabs.map((t) => (
          <button key={t.key} className={tab === t.key ? 'active' : ''} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div>
          {tab === 'revenue' && (
            <div>
              <div className="stat-grid">
                <div className="stat-card"><div><div className="value">{fmtMoney(data?.summary?.billed)}</div><div className="label">Total Billed</div></div></div>
                <div className="stat-card"><div><div className="value">{fmtMoney(data?.summary?.collected)}</div><div className="label">Collected</div></div></div>
                <div className="stat-card"><div><div className="value">{fmtMoney(data?.summary?.outstanding)}</div><div className="label">Outstanding</div></div></div>
                <div className="stat-card"><div><div className="value">{data?.summary?.invoices}</div><div className="label">Invoices</div></div></div>
              </div>
              <div className="grid-2">
                <div className="chart-box"><h4>Revenue by category</h4><MiniBar data={(data?.byCategory || []).map((c) => ({ name: c._id, amount: c.amount }))} xKey="name" yKey="amount" color="#d97706" name="Amount" /></div>
                <div className="chart-box"><h4>Invoices by status</h4><MiniPie data={data?.byStatus} valueKey="count" /></div>
              </div>
            </div>
          )}

          {tab === 'patients' && (
            <div>
              <div className="stat-grid">
                <div className="stat-card"><div><div className="value">{data?.total}</div><div className="label">Total patients</div></div></div>
              </div>
              <div className="grid-2">
                <div className="chart-box"><h4>Registrations by month</h4><MiniBar data={(data?.byMonth || []).map((m) => ({ month: m._id, count: m.count }))} xKey="month" yKey="count" name="Patients" /></div>
                <div className="chart-box"><h4>By gender</h4><MiniPie data={data?.byGender} /></div>
              </div>
            </div>
          )}

          {tab === 'appointments' && (
            <div>
              <div className="stat-grid">
                <div className="stat-card"><div><div className="value">{data?.total}</div><div className="label">Appointments</div></div></div>
              </div>
              <div className="grid-2">
                <div className="chart-box"><h4>Appointments per day</h4><MiniBar data={(data?.byDay || []).map((d) => ({ day: d._id.slice(5), count: d.count }))} xKey="day" yKey="count" name="Appointments" /></div>
                <div className="chart-box"><h4>By status</h4><MiniPie data={data?.byStatus} /></div>
              </div>
            </div>
          )}

          {tab === 'lab' && (
            <div>
              <div className="stat-grid">
                <div className="stat-card"><div><div className="value">{data?.total}</div><div className="label">Lab tests</div></div></div>
              </div>
              <div className="grid-2">
                <div className="chart-box"><h4>By status</h4><MiniPie data={data?.byStatus} /></div>
                <div className="chart-box"><h4>By category</h4><MiniPie data={data?.byCategory} /></div>
              </div>
            </div>
          )}

          {tab === 'pharmacy' && (
            <div>
              <div className="stat-grid">
                <div className="stat-card"><div><div className="value">{data?.totalItems}</div><div className="label">Inventory items</div></div></div>
                <div className="stat-card"><div><div className="value">{fmtMoney(data?.stockValue)}</div><div className="label">Stock value</div></div></div>
                <div className="stat-card"><div><div className="value">{data?.expiring}</div><div className="label">Expiring ≤30 days</div></div></div>
                <div className="stat-card"><div><div className="value">{data?.lowStock?.length || 0}</div><div className="label">Low stock</div></div></div>
              </div>
              <div className="grid-2">
                <div className="chart-box"><h4>Items by category</h4><MiniPie data={data?.byCategory} /></div>
                <div className="chart-box">
                  <h4>Low stock items</h4>
                  <ul className="list-plain">
                    {(data?.lowStock || []).map((i) => <li key={i._id} className="flex between"><span>{i.name}</span><b>{i.quantity} left</b></li>)}
                    {(data?.lowStock || []).length === 0 && <li className="muted">No low stock items</li>}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {tab === 'staff' && (
            <div>
              <div className="stat-grid">
                <div className="stat-card"><div><div className="value">{data?.total}</div><div className="label">Staff members</div></div></div>
                <div className="stat-card"><div><div className="value">{data?.active}</div><div className="label">Active</div></div></div>
                <div className="stat-card"><div><div className="value">{data?.records}</div><div className="label">Medical records</div></div></div>
              </div>
              <div className="grid-2">
                <div className="chart-box"><h4>By position</h4><MiniPie data={data?.byPosition} /></div>
                <div className="chart-box"><h4>By department</h4><MiniPie data={data?.byDepartment} /></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
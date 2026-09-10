import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api, { errMsg } from '../api/client.js';
import { StatCard, Spinner, Badge, fmtMoney, fmtDate, useToast } from '../components/ui.jsx';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [appts, setAppts] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [recent, setRecent] = useState(null);
  const toast = useToast();

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/appointments-by-day'),
      api.get('/dashboard/revenue-months'),
      api.get('/dashboard/recent')
    ])
      .then(([s, a, r, rec]) => {
        setStats(s.data);
        setAppts(a.data.labels.map((l) => ({ day: l.key.slice(5), count: l.count })));
        setRevenue(r.data.series.map((x) => ({ month: x._id, Paid: x.paid, Billed: x.billed })));
        setRecent(rec.data);
      })
      .catch((e) => toast.error(errMsg(e)));
  }, []);

  if (!stats || !recent) return <Spinner />;

  const now = new Date();
  const todayKey = now.toLocaleDateString('en-CA');

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Dashboard</h2>
          <div className="sub">{new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard icon="🧍" label="Total Patients" value={stats.totalPatients} tone="primary" />
        <StatCard icon="🗓" label="Today's Appointments" value={stats.todaysAppointments} tone="info" />
        <StatCard icon="💵" label="Collected (this month)" value={fmtMoney(stats.monthlyRevenue)} tone="success" />
        <StatCard icon="🔬" label="Pending Lab Requests" value={stats.pendingLab} tone="warning" />
        <StatCard icon="💊" label="Stock Alerts" value={stats.pharmacyAlerts.lowStock + stats.pharmacyAlerts.expiring} tone="danger" sub={`${stats.pharmacyAlerts.lowStock} low · ${stats.pharmacyAlerts.expiring} expiring`} />
        <StatCard icon="📋" label="Medical Records" value={stats.recordsCount} tone="neutral" />
      </div>

      <div className="grid-2 mb">
        <div className="chart-box">
          <h4>Appointments — last 14 days</h4>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={appts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="Appointments" fill="#0e7490" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-box">
          <h4>Revenue — last 6 months</h4>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Line type="monotone" dataKey="Billed" stroke="#d97706" strokeWidth={2} />
              <Line type="monotone" dataKey="Paid" stroke="#16a34a" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-2">
        <div className="chart-box">
          <div className="flex between align-center mb">
            <h4>Today's Appointments</h4>
            <Link to="/appointments" className="btn btn-sm">View all</Link>
          </div>
          {recent.todaysAppts.length === 0 ? (
            <div className="empty-state">No appointments scheduled for today</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr><th>Time</th><th>Patient</th><th>Doctor</th><th>Status</th></tr>
              </thead>
              <tbody>
                {recent.todaysAppts.map((a) => (
                  <tr key={a._id}>
                    <td>{a.time}</td>
                    <td>{a.patientId?.name}</td>
                    <td>{a.doctorId?.name}</td>
                    <td><Badge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="chart-box">
          <h4>Pending Lab Requests</h4>
          {recent.recentLab.length === 0 ? (
            <div className="empty-state">No pending lab work</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr><th>Patient</th><th>Test</th><th>Status</th></tr>
              </thead>
              <tbody>
                {recent.recentLab.map((l) => (
                  <tr key={l._id}>
                    <td>{l.patientId?.name}</td>
                    <td>{l.testName}</td>
                    <td><Badge status={l.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="mt">
            <b>Recent patients:</b>{' '}
            <span className="muted">
              {recent.recentPatients.map((p) => p.name).join(', ') || '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
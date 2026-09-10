import { useEffect, useState } from 'react';
import api, { errMsg } from '../api/client.js';
import { Spinner, fmtDateTime, useToast } from '../components/ui.jsx';

export default function Audit() {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get('/audit', { params: { page, limit: 50, action: action || undefined } })
      .then((res) => {
        setLogs(res.data.logs);
        setTotal(res.data.total);
      })
      .catch((e) => toast.error(errMsg(e)))
      .finally(() => setLoading(false));
  }, [page, action]);

  return (
    <div>
      <div className="page-head">
        <div><h2>Audit Logs</h2><div className="sub">{total} recorded actions</div></div>
      </div>

      <div className="search-bar">
        <input type="search" placeholder="Filter by action (e.g. patients)…" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} />
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>When</th><th>User</th><th>Role</th><th>Action</th><th>Details</th></tr></thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l._id}>
                    <td>{fmtDateTime(l.createdAt)}</td>
                    <td>{l.user?.username || l.username || 'system'}</td>
                    <td><span className="badge badge-neutral">{l.role}</span></td>
                    <td>{l.action}</td>
                    <td className="muted" style={{ fontSize: 12, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.details}</td>
                  </tr>
                ))}
                {logs.length === 0 && <tr><td className="muted" colSpan={5}>No audit entries</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex between align-center mt">
            <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
            <span className="muted">Page {page} of {Math.max(1, Math.ceil(total / 50))}</span>
            <button className="btn btn-sm" disabled={page >= Math.ceil(total / 50)} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
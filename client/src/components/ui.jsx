import { createContext, useContext, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';

const ToastContext = createContext(null);

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const toast = {
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error')
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const Modal = ({ title, onClose, children, footer, wide }) => (
  <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className={`modal${wide ? ' wide' : ''}`}>
      <div className="modal-head">
        <h3>{title}</h3>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="modal-body">{children}</div>
      {footer && <div className="modal-foot">{footer}</div>}
    </div>
  </div>
);

export const Badge = ({ status }) => {
  const map = {
    scheduled: 'badge-primary',
    confirmed: 'badge-info',
    'in-progress': 'badge-warning',
    completed: 'badge-success',
    cancelled: 'badge-danger',
    requested: 'badge-primary',
    'sample-collected': 'badge-info',
    pending: 'badge-warning',
    approved: 'badge-success',
    rejected: 'badge-danger',
    unpaid: 'badge-danger',
    partial: 'badge-warning',
    paid: 'badge-success',
    present: 'badge-success',
    absent: 'badge-danger',
    late: 'badge-warning',
    'half-day': 'badge-neutral',
    active: 'badge-success',
    inactive: 'badge-neutral',
    normal: 'badge-success',
    abnormal: 'badge-danger'
  };
  const cls = map[status] || 'badge-neutral';
  return <span className={`badge ${cls}`}>{String(status || '—').replace(/-/g, ' ')}</span>;
};

export const StatCard = ({ icon, label, value, tone = 'primary', sub }) => {
  const tones = {
    primary: { bg: 'var(--primary-light)', color: 'var(--primary-dark)' },
    success: { bg: 'var(--success-bg)', color: 'var(--success)' },
    warning: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
    danger: { bg: 'var(--danger-bg)', color: 'var(--danger)' },
    info: { bg: 'var(--info-bg)', color: 'var(--info)' }
  };
  const t = tones[tone] || tones.primary;
  return (
    <div className="stat-card">
      <div className="icon" style={t}>
        {icon}
      </div>
      <div>
        <div className="value">{value}</div>
        <div className="label">{label}</div>
        {sub && <div className="label">{sub}</div>}
      </div>
    </div>
  );
};

export const Spinner = () => <div className="spinner" />;

export const fmtMoney = (n) =>
  Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 });

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';
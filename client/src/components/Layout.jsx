import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { can } from '../utils/permissions.js';

const NAV = [
  { group: 'General' },
  { to: '/', label: 'Dashboard', icon: '▦', match: true },
  { to: '/appointments', label: 'Appointments', icon: '🗓', module: 'appointments' },
  { group: 'Clinical' },
  { to: '/patients', label: 'Patients', icon: '🧍', module: 'patients' },
  { to: '/doctors', label: 'Doctors', icon: '🩺', module: 'doctors' },
  { to: '/records', label: 'Medical Records', icon: '📋', module: 'records' },
  { to: '/lab', label: 'Laboratory', icon: '🔬', module: 'lab' },
  { to: '/pharmacy', label: 'Pharmacy', icon: '💊', module: 'pharmacy' },
  { group: 'Finance' },
  { to: '/billing', label: 'Billing', icon: '🧾', module: 'billing' },
  { to: '/reports', label: 'Reports', icon: '📊', module: 'reports' },
  { group: 'Admin' },
  { to: '/staff', label: 'Staff', icon: '👥', module: 'staff' },
  { to: '/users', label: 'Users & Roles', icon: '🔐', module: 'users' },
  { to: '/audit', label: 'Audit Logs', icon: '📜', module: 'audit' }
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const visible = NAV.filter((item) => {
    if (!item.module) return true;
    return can(user?.role, item.module, 'read');
  });

  const initials = (user?.name || 'U')
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="layout">
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="brand">
          <span className="logo">+</span>
          <span>MediCare HMS</span>
        </div>
        <nav>
          {visible.map((item, i) =>
            item.group ? (
              <div key={i} className="nav-group">
                {item.group}
              </div>
            ) : (
              <NavLink
                key={i}
                to={item.to}
                end={item.match}
                onClick={() => setOpen(false)}
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            )
          )}
        </nav>
        <div className="footer">Hospital Management System<br />v1.0 • Internship Project</div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="hamburger" onClick={() => setOpen(!open)}>
            ☰
          </button>
          <div className="topbar-right">
            <div className="user-chip">
              <span className="avatar">{initials}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{user?.name}</div>
                <div className="muted" style={{ fontSize: 12, textTransform: 'capitalize' }}>
                  {user?.role}
                </div>
              </div>
            </div>
            <button
              className="btn btn-sm"
              onClick={() => navigate('/password')}
              title="Change password"
            >
              🔑
            </button>
            <button className="btn btn-sm" onClick={() => { logout(); navigate('/login'); }}>
              Logout
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
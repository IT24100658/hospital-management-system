import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { ToastProvider } from './components/ui.jsx';
import { useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Patients from './pages/Patients.jsx';
import Doctors from './pages/Doctors.jsx';
import Appointments from './pages/Appointments.jsx';
import Records from './pages/Records.jsx';
import Lab from './pages/Lab.jsx';
import Pharmacy from './pages/Pharmacy.jsx';
import Billing from './pages/Billing.jsx';
import Staff from './pages/Staff.jsx';
import Reports from './pages/Reports.jsx';
import Users from './pages/Users.jsx';
import Audit from './pages/Audit.jsx';
import ChangePassword from './pages/ChangePassword.jsx';

const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <Protected>
              <Layout />
            </Protected>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="patients" element={<Patients />} />
          <Route path="doctors" element={<Doctors />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="records" element={<Records />} />
          <Route path="lab" element={<Lab />} />
          <Route path="pharmacy" element={<Pharmacy />} />
          <Route path="billing" element={<Billing />} />
          <Route path="staff" element={<Staff />} />
          <Route path="reports" element={<Reports />} />
          <Route path="users" element={<Users />} />
          <Route path="audit" element={<Audit />} />
          <Route path="password" element={<ChangePassword />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}
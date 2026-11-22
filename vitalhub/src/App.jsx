import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import PublicLayout from './components/PublicLayout.jsx';
import { Loading } from './components/ui.jsx';
import Admin from './pages/Admin.jsx';
import Applications from './pages/Applications.jsx';
import FaqManager from './pages/FaqManager.jsx';
import Inquiries from './pages/Inquiries.jsx';
import Billing from './pages/Billing.jsx';
import ChangePassword from './pages/ChangePassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Login from './pages/Login.jsx';
import Organizations from './pages/Organizations.jsx';
import Patients from './pages/Patients.jsx';
import Queue from './pages/Queue.jsx';
import Report from './pages/Report.jsx';
import About from './pages/public/About.jsx';
import Apply from './pages/public/Apply.jsx';
import ApplicationStatus from './pages/public/ApplicationStatus.jsx';
import Contact from './pages/public/Contact.jsx';
import Faqs from './pages/public/Faqs.jsx';
import Home from './pages/public/Home.jsx';

const HOSPITAL = ['receptionist', 'nurse', 'doctor', 'billing', 'admin'];
export const homeFor = (user) => (user.role === 'platform_admin' ? '/organizations' : '/dashboard');

/** Redirects to login / forced password change, and enforces role access. */
function Guard({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.must_change_password) return <Navigate to="/change-password" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;

  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/faqs" element={<Faqs />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/apply" element={<Apply />} />
        <Route path="/apply/status" element={<ApplicationStatus />} />
      </Route>
      <Route path="/login" element={user ? <Navigate to={user.must_change_password ? '/change-password' : homeFor(user)} replace /> : <Login />} />
      <Route element={user ? <Layout /> : <Navigate to="/login" replace />}>
        <Route path="/change-password" element={user?.must_change_password ? <ChangePassword /> : <Navigate to={user ? homeFor(user) : '/login'} replace />} />
        <Route path="/organizations" element={<Guard roles={['platform_admin']}><Organizations /></Guard>} />
        <Route path="/applications" element={<Guard roles={['platform_admin']}><Applications /></Guard>} />
        <Route path="/inquiries" element={<Guard roles={['platform_admin']}><Inquiries /></Guard>} />
        <Route path="/faq-manager" element={<Guard roles={['platform_admin']}><FaqManager /></Guard>} />
        <Route path="/dashboard" element={<Guard roles={HOSPITAL}><Dashboard /></Guard>} />
        <Route path="/patients" element={<Guard roles={HOSPITAL}><Patients /></Guard>} />
        <Route path="/queue" element={<Guard roles={['receptionist', 'nurse', 'doctor', 'admin']}><Queue /></Guard>} />
        <Route path="/billing" element={<Guard roles={['receptionist', 'billing', 'admin']}><Billing /></Guard>} />
        <Route path="/visits/:visitId/report" element={<Guard roles={HOSPITAL}><Report /></Guard>} />
        <Route path="/admin" element={<Guard roles={['admin']}><Admin /></Guard>} />
      </Route>
      <Route path="*" element={<Navigate to={user ? homeFor(user) : '/'} replace />} />
    </Routes>
  );
}

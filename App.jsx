import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";

import Login from "./pages/Login.jsx";
import OtpVerify from "./pages/OtpVerify.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";

import ClientLayout from "./pages/client/ClientLayout.jsx";
import MyEvents from "./pages/client/MyEvents.jsx";
import OldEvents from "./pages/client/OldEvents.jsx";
import EventDetail from "./pages/client/EventDetail.jsx";
import Dashboards from "./pages/client/Dashboards.jsx";
import Reports from "./pages/client/Reports.jsx";
import AskAI from "./pages/client/AskAI.jsx";
import Faqs from "./pages/client/Faqs.jsx";
import HavingTrouble from "./pages/client/HavingTrouble.jsx";

import AdminLayout from "./pages/admin/AdminLayout.jsx";
import Users from "./pages/admin/Users.jsx";
import EmailSettings from "./pages/admin/EmailSettings.jsx";
import SmtpSettings from "./pages/admin/SmtpSettings.jsx";
import SalesforceConnection from "./pages/admin/SalesforceConnection.jsx";
import ClaudeSettings from "./pages/admin/ClaudeSettings.jsx";
import ApplicationLogs from "./pages/admin/ApplicationLogs.jsx";

function Protected({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/verify-otp" element={<OtpVerify />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route
        path="/"
        element={
          <Protected role="client">
            <ClientLayout />
          </Protected>
        }
      >
        <Route index element={<Navigate to="ask-ai" replace />} />
        <Route path="ask-ai" element={<AskAI />} />
        <Route path="my-events" element={<MyEvents />} />
        <Route path="old-events" element={<OldEvents />} />
        <Route path="events/:id" element={<EventDetail />} />
        <Route path="dashboards" element={<Dashboards />} />
        <Route path="reports" element={<Reports />} />
        <Route path="faqs" element={<Faqs />} />
        <Route path="having-trouble" element={<HavingTrouble />} />
      </Route>

      <Route
        path="/admin"
        element={
          <Protected role="admin">
            <AdminLayout />
          </Protected>
        }
      >
        <Route index element={<Navigate to="users" replace />} />
        <Route path="users" element={<Users />} />
        <Route path="email" element={<EmailSettings />} />
        <Route path="smtp" element={<SmtpSettings />} />
        <Route path="salesforce" element={<SalesforceConnection />} />
        <Route path="claude" element={<ClaudeSettings />} />
        <Route path="logs" element={<ApplicationLogs />} />
      </Route>

      <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
    </Routes>
  );
}

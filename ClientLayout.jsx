import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { LOGO_DATA_URI } from "../../assets/logo.js";

const TABS = [
  { to: "ask-ai", label: "Ask AI" },
  { to: "my-events", label: "My Events" },
  { to: "old-events", label: "Old Events" },
  { to: "dashboards", label: "Dashboards" },
  { to: "reports", label: "Reports" },
  { to: "faqs", label: "Resources / FAQs" },
  { to: "having-trouble", label: "Having Trouble" },
];

export default function ClientLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="client-shell">
      <div style={{ position: "sticky", top: 0, zIndex: 20, background: "#fff" }}>
        <div className="client-topbar">
          <img src={LOGO_DATA_URI} alt="Flow Wine Group" style={{ height: 28 }} />
          <div style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 12 }}>
            <span>{user?.firstName} {user?.lastName}</span>
            <button className="btn-secondary" onClick={logout}>Log out</button>
          </div>
        </div>
        {/* Client tabs are always horizontal, mobile and desktop — spec requirement */}
        <nav className="client-tabs">
          {TABS.map(t => (
            <NavLink key={t.to} to={t.to} className={({ isActive }) => (isActive ? "active" : "")}>{t.label}</NavLink>
          ))}
        </nav>
      </div>
      <main className="client-main" style={{ flex: 1 }}>
        <Outlet />
      </main>
      <footer style={{
        position: "sticky", bottom: 0, background: "#201A17", color: "#a89b8f",
        fontSize: 11, padding: "8px 20px", display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap",
      }}>
        <span>© {new Date().getFullYear()} Flow Wine Group. All rights reserved.</span>
        <a href="#" style={{ color: "inherit" }}>Terms of Use</a>
        <a href="#" style={{ color: "inherit" }}>Privacy Policy</a>
      </footer>
    </div>
  );
}

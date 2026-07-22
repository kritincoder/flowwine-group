import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

const TABS = [
  { to: "users", label: "Users" },
  { to: "email", label: "Email" },
  { to: "smtp", label: "SMTP Settings" },
  { to: "salesforce", label: "Salesforce Connection" },
  { to: "claude", label: "Claude / Ask AI" },
  { to: "logs", label: "Application Logs" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="admin-shell">
      {/* Admin nav is vertical on desktop (collapses to a horizontal bar on mobile) — spec requirement */}
      <aside className="admin-sidebar">
        <div style={{ padding: "16px 18px", fontFamily: "Fraunces, serif", fontWeight: 600 }}>Admin Panel</div>
        <nav>
          {TABS.map(t => (
            <NavLink key={t.to} to={t.to} className={({ isActive }) => (isActive ? "active" : "")}>{t.label}</NavLink>
          ))}
        </nav>
      </aside>
      <main className="admin-main">
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 12, fontSize: 13 }}>
          <span style={{ marginRight: 12 }}>{user?.firstName} {user?.lastName}</span>
          <button className="btn-secondary" onClick={logout}>Log out</button>
        </div>
        <Outlet />
      </main>
    </div>
  );
}

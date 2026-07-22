import { useEffect, useState } from "react";
import { api } from "../../api/client.js";

export default function Users() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [editing, setEditing] = useState(null); // user being edited
  const [resetting, setResetting] = useState(null); // user having password reset

  function load() {
    api(`/admin/users?search=${encodeURIComponent(search)}&page=${page}&pageSize=${pageSize}`)
      .then(d => { setRows(d.users); setTotal(d.total); });
  }
  useEffect(load, [search, page]);

  async function sync() {
    setSyncing(true); setSyncMsg("");
    try {
      const d = await api("/admin/users/sync", { method: "POST" });
      setSyncMsg(`Synced — ${d.created} created, ${d.updated} updated`);
      load();
    } catch (err) {
      setSyncMsg(err.message);
    } finally { setSyncing(false); }
  }

  async function toggleActive(u) {
    await api(`/admin/users/${u.id}/toggle-active`, { method: "POST" });
    load();
  }

  async function sendWelcome(u) {
    await api(`/admin/users/${u.id}/send-welcome-email`, { method: "POST" });
    alert(`Welcome email sent to ${u.email}`);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
        <h1 style={{ fontSize: 22 }}>Users</h1>
        <button className="btn-secondary" style={{ borderColor: "var(--wine)", color: "var(--wine)" }} onClick={sync} disabled={syncing}>
          {syncing ? "Syncing…" : "⟳ Sync with Salesforce"}
        </button>
      </div>
      <p style={{ color: "#8a7d73", fontSize: 13, marginBottom: 6 }}>Syncs Contacts where EnablePartnerUser__c = true</p>
      {syncMsg && <p style={{ fontSize: 13, marginBottom: 10 }}>{syncMsg}</p>}

      <input placeholder="Search by name or email…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ width: 260, marginBottom: 10 }} />

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>SFDC Account</th><th>Last Login</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {rows.map(u => (
              <tr key={u.id}>
                <td>
                  {editing === u.id ? (
                    <EditRow user={u} onDone={() => { setEditing(null); load(); }} />
                  ) : `${u.first_name} ${u.last_name}`}
                </td>
                <td>{u.email}</td>
                <td>{u.sfdc_account_id || "—"}</td>
                <td>{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "—"}</td>
                <td>
                  <span style={{
                    fontSize: 12, padding: "2px 8px", borderRadius: 999,
                    background: u.active ? "#e6f4ea" : "#f1f1ef", color: u.active ? "#1e7b34" : "#8a7d73",
                  }}>{u.active ? "Active" : "Inactive"}</span>
                </td>
                <td>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    <button className="btn-secondary" onClick={() => setEditing(u.id)}>Edit</button>
                    <button className="btn-secondary" onClick={() => setResetting(u)}>Reset Password</button>
                    <button className="btn-secondary" onClick={() => sendWelcome(u)}>Send Welcome Email</button>
                    <button className="btn-secondary" onClick={() => toggleActive(u)}>{u.active ? "Deactivate" : "Activate"}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 13, color: "#8a7d73" }}>
        <span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
          <span style={{ padding: "8px 4px" }}>{page} / {totalPages}</span>
          <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
        </div>
      </div>

      {resetting && <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} />}
    </div>
  );
}

function EditRow({ user, onDone }) {
  const [firstName, setFirstName] = useState(user.first_name);
  const [lastName, setLastName] = useState(user.last_name);
  async function save() {
    await api(`/admin/users/${user.id}`, { method: "PATCH", body: { firstName, lastName } });
    onDone();
  }
  return (
    <div style={{ display: "flex", gap: 4 }}>
      <input value={firstName} onChange={e => setFirstName(e.target.value)} style={{ width: 90 }} />
      <input value={lastName} onChange={e => setLastName(e.target.value)} style={{ width: 90 }} />
      <button className="btn-secondary" onClick={save}>Save</button>
    </div>
  );
}

function ResetPasswordModal({ user, onClose }) {
  const [pw, setPw] = useState("");
  async function save() {
    await api(`/admin/users/${user.id}/reset-password`, { method: "POST", body: { newPassword: pw } });
    onClose();
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.3)", display: "grid", placeItems: "center" }} onClick={onClose}>
      <div className="card" style={{ width: 320 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 15, marginBottom: 10 }}>Reset password for {user.first_name} {user.last_name}</h3>
        <input type="password" placeholder="New password" value={pw} onChange={e => setPw(e.target.value)} style={{ marginBottom: 12 }} />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save}>Set Password</button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { api } from "../../api/client.js";

const CATEGORIES = ["", "login_issue", "api_error", "app_bug", "system_error"];

export default function ApplicationLogs() {
  const [logs, setLogs] = useState([]);
  const [category, setCategory] = useState("");

  useEffect(() => {
    api(`/admin/logs${category ? `?category=${category}` : ""}`).then(setLogs);
  }, [category]);

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Application Logs</h1>
      <p style={{ color: "#8a7d73", fontSize: 13, marginBottom: 12 }}>Auto-created on login issues, API errors, app bugs, and system errors.</p>
      <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: 220, marginBottom: 12 }}>
        {CATEGORIES.map(c => <option key={c} value={c}>{c || "All categories"}</option>)}
      </select>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th>Time</th><th>Category</th><th>Level</th><th>Message</th></tr></thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id}>
                <td style={{ whiteSpace: "nowrap" }}>{new Date(l.created_at).toLocaleString()}</td>
                <td>{l.category}</td>
                <td>{l.level}</td>
                <td>{l.message}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={4} style={{ padding: 16, textAlign: "center", color: "#a89b8f" }}>No log entries</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

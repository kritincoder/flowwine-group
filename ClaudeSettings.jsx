import { useEffect, useState } from "react";
import { api } from "../../api/client.js";

export default function ClaudeSettings() {
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState("");
  useEffect(() => { api("/admin/claude").then(setForm); }, []);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function save() {
    await api("/admin/claude", { method: "PUT", body: form });
    setMsg("Saved"); setTimeout(() => setMsg(""), 1500);
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Claude / Ask AI Settings</h1>
      <p style={{ color: "#8a7d73", fontSize: 13, marginBottom: 16 }}>
        Ask AI is hard-scoped in code to each client's own events, wine sold, reporting, and photos — this tab only controls
        the API credentials and model used.
      </p>
      <div className="card" style={{ maxWidth: 460 }}>
        <label style={{ fontSize: 12, color: "#8a7d73" }}>Anthropic API Key</label>
        <input type="password" onChange={set("api_key")} placeholder="leave blank to keep current" style={{ marginBottom: 12 }} />
        <label style={{ fontSize: 12, color: "#8a7d73" }}>Model</label>
        <select value={form.model || "claude-sonnet-5"} onChange={set("model")} style={{ marginBottom: 12 }}>
          <option value="claude-sonnet-5">Claude Sonnet 5 (recommended — balanced cost/quality)</option>
          <option value="claude-opus-4-8">Claude Opus 4.8 (highest quality, more expensive)</option>
          <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (fastest, cheapest)</option>
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <input type="checkbox" style={{ width: "auto" }} checked={form.enabled ?? true} onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))} />
          Enable Ask AI for clients
        </label>
        <button className="btn-primary" onClick={save}>Save</button>
        {msg && <span style={{ fontSize: 13, marginLeft: 10 }}>{msg}</span>}
      </div>
    </div>
  );
}

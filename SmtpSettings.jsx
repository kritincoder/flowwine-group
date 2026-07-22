import { useEffect, useState } from "react";
import { api } from "../../api/client.js";

export default function SmtpSettings() {
  const [form, setForm] = useState({ provider: "gmail_oauth" });
  const [testTo, setTestTo] = useState("");
  const [msg, setMsg] = useState("");
  const [logs, setLogs] = useState([]);
  const [logsLoaded, setLogsLoaded] = useState(false);

  useEffect(() => { api("/admin/email/settings").then(setForm); }, []);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const isGmailOAuth = form.provider === "gmail_oauth";

  async function save() {
    await api("/admin/email/settings", { method: "PUT", body: form });
    setMsg("Settings saved"); setTimeout(() => setMsg(""), 2000);
  }
  async function test() {
    try { await api("/admin/email/settings/test", { method: "POST", body: { to: testTo || form.from_email } }); setMsg("Test email sent"); }
    catch (err) { setMsg(err.message); }
  }
  async function diagnose() {
    setMsg("Checking connection…");
    try {
      const d = await api("/admin/email/settings/diagnose", { method: "POST" });
      setMsg(`✓ Connected — ${d.provider} as ${d.fromEmail}`);
    } catch (err) {
      setMsg(`✗ ${err.message}`);
    }
  }
  async function loadLog() {
    const data = await api("/admin/email/logs");
    setLogs(data); setLogsLoaded(true);
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>✉ Email Settings</h1>
      <p style={{ color: "#8a7d73", fontSize: 13, marginBottom: 16 }}>
        Used as the <b>From</b> address for all portal emails (OTP codes, welcome emails, Having Trouble tickets).
      </p>

      {isGmailOAuth && (
        <div className="card" style={{ marginBottom: 16, fontSize: 13, lineHeight: 1.7 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Gmail API setup (one-time):</div>
          <ol style={{ margin: 0, paddingLeft: 18, color: "#5c5049" }}>
            <li>Google Cloud Console → APIs &amp; Services → <b>OAuth consent screen</b>: configure it, add scope{" "}
              <code style={{ background: "#f4f0ea", padding: "1px 5px", borderRadius: 4 }}>https://www.googleapis.com/auth/gmail.send</code>, and add your email as a test user (or publish the app).</li>
            <li><b>Credentials</b> → your Web application client → add{" "}
              <code style={{ background: "#f4f0ea", padding: "1px 5px", borderRadius: 4 }}>https://developers.google.com/oauthplayground</code>{" "}
              under <b>Authorized redirect URIs</b> → Save. Copy the <b>Client ID</b> and <b>Client Secret</b>.</li>
            <li>Open <b>developers.google.com/oauthplayground</b> → click the ⚙ gear (top right) → tick <b>Use your own OAuth credentials</b> → paste Client ID + Secret.</li>
            <li>In Step 1, type scope <code style={{ background: "#f4f0ea", padding: "1px 5px", borderRadius: 4 }}>https://www.googleapis.com/auth/gmail.send</code> → <b>Authorize APIs</b> → sign in with your Google account → Allow.</li>
            <li>In Step 2, click <b>Exchange authorization code for tokens</b> → copy the <b>Refresh token</b>.</li>
            <li>Paste all three values below, Save, then Diagnose.</li>
          </ol>
        </div>
      )}

      <div className="card" style={{ maxWidth: 560 }}>
        <label style={{ fontSize: 12, color: "#8a7d73" }}>Email Provider *</label>
        <select value={form.provider || "gmail_oauth"} onChange={set("provider")} style={{ marginBottom: 14 }}>
          <option value="gmail_oauth">Gmail API — OAuth2 (recommended)</option>
          <option value="smtp">SMTP (host/port/username/password)</option>
        </select>

        {isGmailOAuth ? (
          <>
            <label style={{ fontSize: 12, color: "#8a7d73" }}>OAuth Client ID *</label>
            <input value={form.oauth_client_id || ""} onChange={set("oauth_client_id")} placeholder="xxxxxxxxxx-xxxxxxxxxxxx.apps.googleusercontent.com" style={{ marginBottom: 12 }} />
            <label style={{ fontSize: 12, color: "#8a7d73" }}>OAuth Client Secret *</label>
            <input value={form.oauth_client_secret || ""} onChange={set("oauth_client_secret")} placeholder="leave blank to keep current" style={{ marginBottom: 12 }} />
            <label style={{ fontSize: 12, color: "#8a7d73" }}>Refresh Token *</label>
            <input value={form.oauth_refresh_token || ""} onChange={set("oauth_refresh_token")} placeholder="leave blank to keep current" style={{ marginBottom: 12 }} />
          </>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ fontSize: 12, color: "#8a7d73" }}>SMTP Host</label><input value={form.smtp_host || ""} onChange={set("smtp_host")} placeholder="smtp.gmail.com" /></div>
            <div><label style={{ fontSize: 12, color: "#8a7d73" }}>Port</label><input value={form.smtp_port || ""} onChange={set("smtp_port")} placeholder="587" /></div>
            <div><label style={{ fontSize: 12, color: "#8a7d73" }}>Username</label><input value={form.smtp_username || ""} onChange={set("smtp_username")} /></div>
            <div><label style={{ fontSize: 12, color: "#8a7d73" }}>Password / App Key</label><input type="password" onChange={set("smtp_password")} placeholder="leave blank to keep current" /></div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 6 }}>
          <div>
            <label style={{ fontSize: 12, color: "#8a7d73" }}>From Email {isGmailOAuth && "(your Google account)"} *</label>
            <input value={form.from_email || ""} onChange={set("from_email")} placeholder="you@company.com" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#8a7d73" }}>From Name</label>
            <input value={form.from_name || ""} onChange={set("from_name")} placeholder="Flow Wine Group Portal" />
          </div>
        </div>
        <div style={{ marginBottom: 4 }}>
          <label style={{ fontSize: 12, color: "#8a7d73" }}>Having Trouble → sends to</label>
          <input value={form.trouble_ticket_to_email || ""} onChange={set("trouble_ticket_to_email")} placeholder="emailsupport@flowwinegroup.com" />
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn-primary" onClick={save}>Save Settings</button>
          <input placeholder={`Test recipient (default: ${form.from_email || "…"})`} value={testTo} onChange={e => setTestTo(e.target.value)} style={{ width: 220 }} />
          <button className="btn-secondary" onClick={test}>Send Test Email</button>
          <button className="btn-secondary" onClick={diagnose}>🔍 Diagnose Connection</button>
        </div>
        {msg && <div style={{ fontSize: 13, marginTop: 10 }}>{msg}</div>}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 15 }}>📨 Email Log (last 100)</h3>
          <button className="btn-secondary" onClick={loadLog}>Load Log</button>
        </div>
        {logsLoaded && (
          <div style={{ marginTop: 10, overflowX: "auto" }}>
            <table>
              <thead><tr><th>Time</th><th>To</th><th>Subject</th><th>Status</th><th>Error</th></tr></thead>
              <tbody>
                {logs.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: 14, color: "#a89b8f" }}>No emails sent yet</td></tr>}
                {logs.map(l => (
                  <tr key={l.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{new Date(l.created_at).toLocaleString()}</td>
                    <td>{l.to_email}</td>
                    <td>{l.subject || "—"}</td>
                    <td style={{ color: l.status === "sent" ? "#1e7b34" : "var(--wine)" }}>{l.status}</td>
                    <td>{l.error || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

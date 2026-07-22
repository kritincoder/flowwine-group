import { useEffect, useState } from "react";
import { api } from "../../api/client.js";

export default function EmailSettings() {
  const [templates, setTemplates] = useState([]);
  const [tab, setTab] = useState("forgot_password_otp");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => { api("/admin/email/templates").then(setTemplates); }, []);
  useEffect(() => {
    const t = templates.find(t => t.template_key === tab);
    if (t) { setSubject(t.subject); setBody(t.body_html); }
  }, [tab, templates]);

  async function save() {
    await api(`/admin/email/templates/${tab}`, { method: "PUT", body: { subject, body_html: body } });
    setSaved("Saved"); setTimeout(() => setSaved(""), 1500);
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Email Templates</h1>
      <div style={{ display: "flex", gap: 4, marginBottom: 14, borderBottom: "1px solid var(--border)" }}>
        <button className="btn-secondary" style={{ border: "none", borderBottom: tab === "forgot_password_otp" ? "2px solid var(--wine)" : "2px solid transparent", borderRadius: 0, fontWeight: tab === "forgot_password_otp" ? 600 : 400 }} onClick={() => setTab("forgot_password_otp")}>Forgot Password OTP</button>
        <button className="btn-secondary" style={{ border: "none", borderBottom: tab === "welcome_email" ? "2px solid var(--wine)" : "2px solid transparent", borderRadius: 0, fontWeight: tab === "welcome_email" ? 600 : 400 }} onClick={() => setTab("welcome_email")}>Welcome Email</button>
      </div>
      <div className="card" style={{ maxWidth: 640 }}>
        <label style={{ fontSize: 12, color: "#8a7d73" }}>Subject</label>
        <input value={subject} onChange={e => setSubject(e.target.value)} style={{ marginBottom: 12, marginTop: 4 }} />
        <label style={{ fontSize: 12, color: "#8a7d73" }}>
          Body (HTML — placeholders: {tab === "forgot_password_otp" ? "{{first_name}}, {{otp_code}}, {{expires_minutes}}" : "{{first_name}}, {{portal_url}}, {{username}}, {{temp_password}}"})
        </label>
        <textarea rows={8} value={body} onChange={e => setBody(e.target.value)} style={{ marginTop: 4, fontFamily: "monospace", fontSize: 13 }} />
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <button className="btn-primary" onClick={save}>Save Template</button>
          {saved && <span style={{ fontSize: 13, color: "#1e7b34" }}>{saved}</span>}
        </div>
      </div>
    </div>
  );
}

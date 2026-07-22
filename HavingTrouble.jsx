import { useState } from "react";
import { api } from "../../api/client.js";

export default function HavingTrouble() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("");

  async function submit(e) {
    e.preventDefault();
    setStatus("Sending…");
    try {
      await api("/trouble", { method: "POST", body: { subject, body } });
      setStatus("Message sent — we'll be in touch.");
      setSubject(""); setBody("");
    } catch (err) {
      setStatus(err.message);
    }
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Having Trouble</h1>
      <p style={{ color: "#8a7d73", fontSize: 13, marginBottom: 16 }}>Sent to Flow Wine Group support, cc'd to you.</p>
      <form onSubmit={submit} className="card">
        <label style={{ fontSize: 12, color: "#8a7d73" }}>Subject</label>
        <input value={subject} onChange={e => setSubject(e.target.value)} style={{ marginBottom: 12, marginTop: 4 }} />
        <label style={{ fontSize: 12, color: "#8a7d73" }}>Message</label>
        <textarea rows={6} value={body} onChange={e => setBody(e.target.value)} style={{ marginBottom: 12, marginTop: 4 }} />
        {status && <div style={{ fontSize: 13, marginBottom: 12 }}>{status}</div>}
        <button className="btn-primary">Send message</button>
      </form>
    </div>
  );
}

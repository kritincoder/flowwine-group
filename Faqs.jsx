import { useEffect, useState } from "react";
import { api } from "../../api/client.js";

export default function Faqs() {
  const [faqs, setFaqs] = useState([]);
  useEffect(() => { api("/faqs").then(setFaqs); }, []);

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Resources &amp; FAQs</h1>
      {faqs.map(f => (
        <details key={f.id} className="card" style={{ marginBottom: 8 }}>
          <summary style={{ fontWeight: 600, cursor: "pointer" }}>{f.title}</summary>
          <p style={{ color: "#8a7d73", fontSize: 14, marginTop: 8 }}>{f.description}</p>
        </details>
      ))}
      {faqs.length === 0 && <p style={{ color: "#8a7d73" }}>No FAQs published yet.</p>}
    </div>
  );
}

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "../../api/client.js";

const CHIPS = [
  { label: "📅 My upcoming events", prompt: "Show my upcoming events" },
  { label: "🍷 Wine sold this quarter", prompt: "How much wine have we sold this quarter?" },
  { label: "📋 Report for last event", prompt: "Give me the report for my most recent event" },
  { label: "📷 Photos from last event", prompt: "Show me the photos from my most recent event" },
];

export default function AskAI() {
  const [messages, setMessages] = useState([]); // [{role, text}]
  const [history, setHistory] = useState([]); // raw Anthropic message history for context
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(text) {
    if (!text.trim()) return;
    setMessages(m => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const data = await api("/askai", { method: "POST", body: { message: text, history } });
      setMessages(m => [...m, { role: "assistant", text: data.reply }]);
      setHistory(data.messages);
    } catch (err) {
      setMessages(m => [...m, { role: "assistant", text: `Sorry — ${err.message}` }]);
    } finally { setLoading(false); }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Ask AI</h1>
      <p style={{ color: "#8a7d73", fontSize: 13, marginBottom: 16 }}>
        Ask about your events, wine sold, reporting, or photos. Scoped to your account only.
      </p>
      <div className="card" style={{ minHeight: 260, display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
        {messages.length === 0 && <p style={{ color: "#a89b8f", fontSize: 13 }}>Try one of the prompts below to get started.</p>}
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
            background: m.role === "user" ? "#F7EDEE" : "#f4f0ea",
            color: m.role === "user" ? "var(--wine)" : "inherit",
            borderRadius: 8, padding: "8px 12px", fontSize: 14, maxWidth: m.role === "user" ? "80%" : "100%",
          }}>
            {m.role === "assistant" ? (
              <div className="markdown-body">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{ a: (props) => <a {...props} target="_blank" rel="noopener noreferrer" /> }}
                >{m.text}</ReactMarkdown>
              </div>
            ) : m.text}
          </div>
        ))}
        {loading && <div style={{ fontSize: 13, color: "#a89b8f" }}>Thinking…</div>}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {CHIPS.map(c => (
          <button key={c.label} className="btn-secondary" onClick={() => send(c.prompt)}>{c.label}</button>
        ))}
      </div>
      <form onSubmit={e => { e.preventDefault(); send(input); }} style={{ display: "flex", gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about your events, wine sold, or reports…" />
        <button className="btn-primary">Send</button>
      </form>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import PublicHeader from "../components/PublicHeader.jsx";
import PublicFooter from "../components/PublicFooter.jsx";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const data = await api("/auth/login", { method: "POST", body: { email, password }, auth: false });
      nav("/verify-otp", { state: { pendingUserId: data.pendingUserId, emailWarning: data.emailWarning } });
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicHeader />
      <div className="login-hero" style={{
        background: "linear-gradient(rgba(40,10,15,.45),rgba(40,10,15,.45)), url('https://flowpro.herokuapp.com/assets/myimages/wine.jpg') center/cover",
      }}>
        <form onSubmit={submit} className="card" style={{ width: 360 }}>
          <h1 style={{ fontSize: 20, marginBottom: 20, color: "var(--wine)" }}>Log in to your account</h1>
          <label htmlFor="login-email" style={{ fontSize: 12, color: "#8a7d73" }}>Email</label>
          <input id="login-email" name="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} style={{ marginBottom: 12, marginTop: 4 }} />
          <label htmlFor="login-password" style={{ fontSize: 12, color: "#8a7d73" }}>Password</label>
          <input id="login-password" name="password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} style={{ marginBottom: 8, marginTop: 4 }} />
          <div style={{ textAlign: "right", marginBottom: 16 }}>
            <a href="/forgot-password" style={{ fontSize: 13 }}>Forgot password?</a>
          </div>
          {error && <div style={{ color: "var(--wine)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button className="btn-primary" style={{ width: "100%" }} disabled={loading}>
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>
      </div>
      <PublicFooter />
    </div>
  );
}

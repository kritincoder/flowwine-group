import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import PublicHeader from "../components/PublicHeader.jsx";
import PublicFooter from "../components/PublicFooter.jsx";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    const data = await api("/auth/forgot-password", { method: "POST", body: { email }, auth: false });
    if (data.pendingUserId) {
      nav("/verify-otp", { state: { pendingUserId: data.pendingUserId } });
    } else {
      setMessage(data.message);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicHeader />
      <div className="login-hero" style={{
        background: "linear-gradient(rgba(40,10,15,.45),rgba(40,10,15,.45)), url('https://flowpro.herokuapp.com/assets/myimages/wine.jpg') center/cover",
      }}>
        <form onSubmit={submit} className="card" style={{ width: 360 }}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Reset your password</h1>
          <p style={{ color: "#8a7d73", fontSize: 13, marginBottom: 16 }}>We'll email a one-time code to your registered address.</p>
          <label htmlFor="forgot-email" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>Email</label>
          <input id="forgot-email" name="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" style={{ marginBottom: 12 }} />
          {message && <div style={{ fontSize: 13, marginBottom: 12 }}>{message}</div>}
          <button className="btn-primary" style={{ width: "100%" }}>Send code</button>
        </form>
      </div>
      <PublicFooter />
    </div>
  );
}

import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import PublicHeader from "../components/PublicHeader.jsx";
import PublicFooter from "../components/PublicFooter.jsx";

export default function OtpVerify() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const location = useLocation();
  const nav = useNavigate();
  const { login } = useAuth();
  const pendingUserId = location.state?.pendingUserId;
  const emailWarning = location.state?.emailWarning;

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      // Validated server-side against the user's LAST issued OTP only.
      const data = await api("/auth/verify-otp", { method: "POST", body: { pendingUserId, code }, auth: false });
      login(data.token, data.user);
      nav(data.user.role === "admin" ? "/admin" : "/");
    } catch (err) {
      setError(err.message);
    }
  }

  if (!pendingUserId) return <p style={{ padding: 20 }}>Session expired — please <a href="/login">log in again</a>.</p>;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicHeader />
      <div className="login-hero" style={{
        background: "linear-gradient(rgba(40,10,15,.45),rgba(40,10,15,.45)), url('https://flowpro.herokuapp.com/assets/myimages/wine.jpg') center/cover",
      }}>
        <form onSubmit={submit} className="card" style={{ width: 340, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Verify it's you</h1>
          <p style={{ color: "#8a7d73", fontSize: 13, marginBottom: 16 }}>Enter the 6-digit code we emailed you</p>
          {emailWarning && (
            <div style={{ background: "#FFF4E5", color: "#8a5a1f", fontSize: 12, borderRadius: 8, padding: "8px 12px", marginBottom: 12, textAlign: "left" }}>
              ⚠ {emailWarning}
            </div>
          )}
          <label htmlFor="otp-code" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>One-time code</label>
          <input
            id="otp-code" name="otp" autoComplete="one-time-code" inputMode="numeric"
            value={code} onChange={e => setCode(e.target.value)}
            maxLength={6} style={{ textAlign: "center", fontSize: 20, letterSpacing: 6, marginBottom: 12 }}
          />
          {error && <div style={{ color: "var(--wine)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button className="btn-primary" style={{ width: "100%" }}>Verify &amp; continue</button>
        </form>
      </div>
      <PublicFooter />
    </div>
  );
}

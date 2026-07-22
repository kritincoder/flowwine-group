import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db/pool.js";
import { issueSessionToken } from "../middleware/auth.js";
import { issueOtp, validateOtp } from "../services/otp.js";
import { sendTemplateEmail } from "../services/mailer.js";
import { logLoginIssue } from "../services/logger.js";

const router = Router();

// STEP 1 — email + password. On success, issue an OTP and email it; do NOT
// issue a session token yet (that only happens after OTP verification).
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
  const user = rows[0];

  if (!user || !user.active) {
    await logLoginIssue("Login attempt for unknown or inactive user", { email });
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const ok = user.password_hash && (await bcrypt.compare(password, user.password_hash));
  if (!ok) {
    await logLoginIssue("Incorrect password", { email }, user.id);
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const { code, expiresAt } = await issueOtp(user.id);
  try {
    await sendTemplateEmail("forgot_password_otp", user.email, {
      first_name: user.first_name,
      otp_code: code,
      expires_minutes: process.env.OTP_EXPIRY_MINUTES || 10,
    });
  } catch (err) {
    // Don't block login on this — the OTP is already stored and can be verified —
    // but tell the caller so a misconfigured SMTP/Gmail setup is obvious immediately
    // instead of silently leaving the user stuck on the OTP screen with no email.
    return res.json({
      pendingUserId: user.id,
      otpExpiresAt: expiresAt,
      emailWarning: "Could not send the verification email — check Admin > SMTP Settings.",
    });
  }

  res.json({ pendingUserId: user.id, otpExpiresAt: expiresAt });
});

// STEP 2 — OTP verification against the user's LAST issued code only.
router.post("/verify-otp", async (req, res) => {
  const { pendingUserId, code } = req.body;
  const result = await validateOtp(pendingUserId, code);
  if (!result.valid) {
    await logLoginIssue(`OTP verification failed: ${result.reason}`, {}, pendingUserId);
    return res.status(400).json({ error: result.reason });
  }

  const { rows } = await pool.query(`SELECT * FROM users WHERE id = $1`, [pendingUserId]);
  const user = rows[0];

  await pool.query(
    `UPDATE users SET last_login_at = now(), login_ip_range = $1 WHERE id = $2`,
    [req.ip, user.id]
  );

  const token = await issueSessionToken(user);
  res.json({
    token,
    user: { id: user.id, firstName: user.first_name, lastName: user.last_name, email: user.email, role: user.role },
  });
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1 AND active = true`, [email]);
  const user = rows[0];
  // Always respond 200 regardless of whether the email exists, to avoid user enumeration.
  if (user) {
    const { code, expiresAt } = await issueOtp(user.id);
    await sendTemplateEmail("forgot_password_otp", user.email, {
      first_name: user.first_name,
      otp_code: code,
      expires_minutes: process.env.OTP_EXPIRY_MINUTES || 10,
    });
    return res.json({ pendingUserId: user.id, otpExpiresAt: expiresAt });
  }
  res.json({ message: "If that email exists, a code has been sent." });
});

router.post("/reset-password", async (req, res) => {
  const { pendingUserId, code, newPassword } = req.body;
  const result = await validateOtp(pendingUserId, code);
  if (!result.valid) return res.status(400).json({ error: result.reason });

  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query(`UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`, [hash, pendingUserId]);
  res.json({ message: "Password updated. You can now log in." });
});

export default router;

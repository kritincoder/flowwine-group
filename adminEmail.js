import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { sendRawEmail, diagnoseConnection } from "../services/mailer.js";

const router = Router();
router.use(requireAuth, requireAdmin);

// ---- Email templates (Forgot Password OTP, Welcome Email) ----
router.get("/templates", async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM email_templates ORDER BY template_key`);
  res.json(rows);
});

router.put("/templates/:key", async (req, res) => {
  const { subject, body_html } = req.body;
  await pool.query(
    `UPDATE email_templates SET subject = $1, body_html = $2, updated_at = now() WHERE template_key = $3`,
    [subject, body_html, req.params.key]
  );
  res.json({ message: "Template saved" });
});

// ---- Email / SMTP setup settings (single settings row, used by both the
// "Email setup settings" tab and the "SMTP Settings" tab) ----
router.get("/settings", async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM email_settings WHERE id = 1`);
  const s = rows[0] || {};
  delete s.smtp_password;
  delete s.oauth_client_secret;
  delete s.oauth_refresh_token; // never return secrets to the client
  res.json(s);
});

router.put("/settings", async (req, res) => {
  const {
    provider, smtp_host, smtp_port, smtp_username, smtp_password, smtp_secure,
    oauth_client_id, oauth_client_secret, oauth_refresh_token,
    from_email, from_name, trouble_ticket_to_email,
  } = req.body;

  await pool.query(
    `UPDATE email_settings SET
       provider = COALESCE($1, provider),
       smtp_host = $2, smtp_port = $3, smtp_username = $4,
       smtp_password = COALESCE(NULLIF($5, ''), smtp_password),
       smtp_secure = $6,
       oauth_client_id = $7,
       oauth_client_secret = COALESCE(NULLIF($8, ''), oauth_client_secret),
       oauth_refresh_token = COALESCE(NULLIF($9, ''), oauth_refresh_token),
       from_email = $10, from_name = $11, trouble_ticket_to_email = $12,
       updated_at = now()
     WHERE id = 1`,
    [provider, smtp_host, smtp_port, smtp_username, smtp_password, smtp_secure,
     oauth_client_id, oauth_client_secret, oauth_refresh_token,
     from_email, from_name, trouble_ticket_to_email]
  );
  res.json({ message: "Settings saved" });
});

router.post("/settings/test", async (req, res) => {
  const { to } = req.body;
  try {
    await sendRawEmail({ to, subject: "Flow Wine Group — Test Email", text: "This is a test email from your portal's email settings." });
    res.json({ message: "Test email sent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verifies the connection/auth without sending anything
router.post("/settings/diagnose", async (req, res) => {
  try {
    const result = await diagnoseConnection();
    res.json({ message: "Connection OK", ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Last 100 sends, newest first — powers the "Email Log" panel + Load Log button
router.get("/logs", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, to_email, cc_email, subject, template_key, status, error, created_at
     FROM email_log ORDER BY created_at DESC LIMIT 100`
  );
  res.json(rows);
});

export default router;

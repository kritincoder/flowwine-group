import nodemailer from "nodemailer";
import { google } from "googleapis";
import { pool } from "../db/pool.js";
import { logError } from "./logger.js";

function fillTemplate(str, vars) {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => (vars[key] !== undefined ? vars[key] : ""));
}

async function getSettings() {
  const { rows } = await pool.query(`SELECT * FROM email_settings WHERE id = 1`);
  if (!rows[0]) throw new Error("Email settings not configured");
  return rows[0];
}

async function logSend({ to, cc, subject, templateKey, status, error }) {
  await pool.query(
    `INSERT INTO email_log (to_email, cc_email, subject, template_key, status, error)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [to, cc || null, subject || null, templateKey || null, status, error || null]
  ).catch(e => console.error("Failed to write email_log:", e));
}

// Builds a minimal RFC 2822 message and base64url-encodes it, as required by
// Gmail's users.messages.send endpoint.
function buildRawMessage({ from, to, cc, subject, html, text }) {
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    cc ? `Cc: ${cc}` : null,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: ${html ? "text/html" : "text/plain"}; charset=UTF-8`,
  ].filter(Boolean).join("\r\n");
  const body = html || text || "";
  const message = `${headers}\r\n\r\n${body}`;
  return Buffer.from(message).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Sends via the Gmail REST API (HTTPS, port 443) rather than SMTP (port 25/465/587).
// Many hosts, Railway included, block or throttle raw SMTP ports for spam prevention —
// the REST API sidesteps that entirely since it's just another HTTPS call.
async function sendViaGmailApi(s, { to, cc, subject, html, text }) {
  const oauth2Client = new google.auth.OAuth2(s.oauth_client_id, s.oauth_client_secret);
  oauth2Client.setCredentials({ refresh_token: s.oauth_refresh_token });
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const raw = buildRawMessage({
    from: `"${s.from_name || "Flow Wine Group"}" <${s.from_email}>`,
    to, cc, subject, html, text,
  });

  await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
}

async function sendViaSmtp(s, { to, cc, subject, html, text }) {
  const transport = nodemailer.createTransport({
    host: s.smtp_host,
    port: s.smtp_port,
    secure: s.smtp_secure,
    auth: { user: s.smtp_username, pass: s.smtp_password },
    connectionTimeout: 10000, // fail fast (10s) instead of hanging — surfaces port-blocking issues quickly
  });
  await transport.sendMail({
    from: `"${s.from_name || "Flow Wine Group"}" <${s.from_email}>`,
    to, cc, subject, html, text,
  });
}

async function dispatch(s, payload) {
  if (s.provider === "gmail_oauth") return sendViaGmailApi(s, payload);
  return sendViaSmtp(s, payload);
}

export async function sendTemplateEmail(templateKey, to, vars, cc) {
  const { rows } = await pool.query(`SELECT * FROM email_templates WHERE template_key = $1`, [templateKey]);
  const tpl = rows[0];
  if (!tpl) throw new Error(`Email template "${templateKey}" not found`);

  const settings = await getSettings();
  const subject = fillTemplate(tpl.subject, vars);
  const html = fillTemplate(tpl.body_html, vars);

  try {
    await dispatch(settings, { to, cc, subject, html });
    await logSend({ to, cc, subject, templateKey, status: "sent" });
  } catch (err) {
    await logSend({ to, cc, subject, templateKey, status: "failed", error: err.message });
    await logError(`Failed to send "${templateKey}" email`, { to, error: err.message });
    throw err;
  }
}

export async function sendRawEmail({ to, cc, subject, text }) {
  const settings = await getSettings();
  try {
    await dispatch(settings, { to, cc, subject, text });
    await logSend({ to, cc, subject, status: "sent" });
  } catch (err) {
    await logSend({ to, cc, subject, status: "failed", error: err.message });
    throw err;
  }
}

// Verifies the connection/credentials without sending anything — powers "Diagnose Connection".
export async function diagnoseConnection() {
  const s = await getSettings();

  if (s.provider === "gmail_oauth") {
    const oauth2Client = new google.auth.OAuth2(s.oauth_client_id, s.oauth_client_secret);
    oauth2Client.setCredentials({ refresh_token: s.oauth_refresh_token });
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: "me" }); // throws with a descriptive error if the token/scope is bad
    return { provider: "gmail_oauth", fromEmail: profile.data.emailAddress };
  }

  const transport = nodemailer.createTransport({
    host: s.smtp_host, port: s.smtp_port, secure: s.smtp_secure,
    auth: { user: s.smtp_username, pass: s.smtp_password },
    connectionTimeout: 10000,
  });
  await transport.verify();
  return { provider: "smtp", fromEmail: s.from_email };
}

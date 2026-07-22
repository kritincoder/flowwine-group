import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { pool } from "../db/pool.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { withSalesforce } from "../services/salesforce.js";
import { sendTemplateEmail } from "../services/mailer.js";
import { logAppBug } from "../services/logger.js";

const router = Router();
router.use(requireAuth, requireAdmin);

// GET /api/admin/users?search=&page=1&pageSize=20
router.get("/", async (req, res) => {
  const { search = "", page = 1, pageSize = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(pageSize);
  const like = `%${search}%`;

  const { rows } = await pool.query(
    `SELECT id, first_name, last_name, email, role, active, sfdc_account_id,
            login_ip_range, login_location, last_login_at, sfdc_contact_id
     FROM users
     WHERE (first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1)
     ORDER BY last_name, first_name
     LIMIT $2 OFFSET $3`,
    [like, pageSize, offset]
  );
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) FROM users WHERE (first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1)`,
    [like]
  );
  res.json({ users: rows, total: Number(countRows[0].count) });
});

// POST /api/admin/users/sync — pulls Contacts where EnablePartnerUser__c = true
router.post("/sync", async (req, res) => {
  try {
    const contacts = await withSalesforce(null, async (conn) => {
      const result = await conn.query(
        `SELECT Id, FirstName, LastName, Email, AccountId
         FROM Contact
         WHERE EnablePartnerUser__c = true AND Email != null`
      );
      return result.records;
    });

    let created = 0, updated = 0;
    for (const c of contacts) {
      const { rows } = await pool.query(`SELECT id FROM users WHERE sfdc_contact_id = $1`, [c.Id]);
      if (rows[0]) {
        await pool.query(
          `UPDATE users SET first_name = $1, last_name = $2, email = $3, sfdc_account_id = $4, updated_at = now()
           WHERE sfdc_contact_id = $5`,
          [c.FirstName, c.LastName, c.Email, c.AccountId, c.Id]
        );
        updated++;
      } else {
        await pool.query(
          `INSERT INTO users (first_name, last_name, email, role, active, sfdc_account_id, sfdc_contact_id)
           VALUES ($1, $2, $3, 'client', true, $4, $5)`,
          [c.FirstName, c.LastName, c.Email, c.AccountId, c.Id]
        );
        created++;
      }
    }
    res.json({ message: "Sync complete", created, updated, total: contacts.length });
  } catch (err) {
    await logAppBug("Salesforce user sync failed", { error: err.message });
    res.status(500).json({ error: "Sync failed — check Salesforce Connection settings" });
  }
});

// PATCH /api/admin/users/:id — edit first/last name only (Postgres-side edit)
router.patch("/:id", async (req, res) => {
  const { firstName, lastName } = req.body;
  await pool.query(
    `UPDATE users SET first_name = $1, last_name = $2, updated_at = now() WHERE id = $3`,
    [firstName, lastName, req.params.id]
  );
  res.json({ message: "Updated" });
});

// POST /api/admin/users/:id/toggle-active
router.post("/:id/toggle-active", async (req, res) => {
  const { rows } = await pool.query(`SELECT active FROM users WHERE id = $1`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: "User not found" });
  const newActive = !rows[0].active;
  await pool.query(`UPDATE users SET active = $1, updated_at = now() WHERE id = $2`, [newActive, req.params.id]);
  res.json({ active: newActive });
});

// POST /api/admin/users/:id/reset-password — admin sets a new password directly
router.post("/:id/reset-password", async (req, res) => {
  const { newPassword } = req.body;
  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query(`UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`, [hash, req.params.id]);
  res.json({ message: "Password reset" });
});

// POST /api/admin/users/:id/send-welcome-email
router.post("/:id/send-welcome-email", async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM users WHERE id = $1`, [req.params.id]);
  const user = rows[0];
  if (!user) return res.status(404).json({ error: "User not found" });

  const tempPassword = crypto.randomBytes(6).toString("base64url");
  const hash = await bcrypt.hash(tempPassword, 10);
  await pool.query(`UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`, [hash, user.id]);

  await sendTemplateEmail("welcome_email", user.email, {
    first_name: user.first_name,
    portal_url: process.env.CLIENT_ORIGIN,
    username: user.email,
    temp_password: tempPassword,
  });
  res.json({ message: "Welcome email sent" });
});

export default router;

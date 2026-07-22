import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { pool } from "../db/pool.js";
import { sendRawEmail } from "../services/mailer.js";
import { logAppBug } from "../services/logger.js";

const router = Router();
router.use(requireAuth);

// "Having Trouble" — sends to the FWG designated support address, cc'd to the client
router.post("/", async (req, res) => {
  const { subject, body } = req.body;
  const { rows } = await pool.query(`SELECT trouble_ticket_to_email FROM email_settings WHERE id = 1`);
  const supportEmail = rows[0]?.trouble_ticket_to_email;
  if (!supportEmail) return res.status(400).json({ error: "Support inbox not configured yet" });

  try {
    await sendRawEmail({ to: supportEmail, cc: req.user.email, subject: `[Portal] ${subject}`, text: body });
    res.json({ message: "Message sent" });
  } catch (err) {
    await logAppBug("Having Trouble email failed to send", { error: err.message }, req.user.id);
    res.status(500).json({ error: "Could not send message — please try again" });
  }
});

export default router;

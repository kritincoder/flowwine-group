import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { getSalesforceConnection } from "../services/salesforce.js";

const router = Router();
router.use(requireAuth, requireAdmin);

// GET /api/admin/salesforce — both org configs (production + sandbox), secrets masked
router.get("/", async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM salesforce_connections ORDER BY org_type`);
  rows.forEach(r => { delete r.consumer_secret; delete r.password_and_token; delete r.last_session_id; });
  res.json({ orgs: rows, lockedOrg: process.env.SF_LOCKED_ORG || null });
});

// PUT /api/admin/salesforce/:orgType — save Consumer Key/Secret + org's My Domain URL
router.put("/:orgType", async (req, res) => {
  const { orgType } = req.params;
  const { login_url, consumer_key, consumer_secret } = req.body;
  await pool.query(
    `UPDATE salesforce_connections SET
       login_url = $1, consumer_key = $2,
       consumer_secret = COALESCE(NULLIF($3, ''), consumer_secret),
       updated_at = now()
     WHERE org_type = $4`,
    [login_url, consumer_key, consumer_secret, orgType]
  );
  res.json({ message: "Saved" });
});

// POST /api/admin/salesforce/:orgType/activate — switch which org the whole portal talks to
router.post("/:orgType/activate", async (req, res) => {
  if (process.env.SF_LOCKED_ORG) {
    return res.status(400).json({ error: `This deployment is locked to ${process.env.SF_LOCKED_ORG} (SF_LOCKED_ORG). Deploy a separate service to run another org.` });
  }
  await pool.query(`UPDATE salesforce_connections SET is_active = false`);
  await pool.query(`UPDATE salesforce_connections SET is_active = true, last_session_id = NULL WHERE org_type = $1`, [req.params.orgType]);
  res.json({ message: `${req.params.orgType} is now active` });
});

// POST /api/admin/salesforce/:orgType/test — force a fresh login and report success
router.post("/:orgType/test", async (req, res) => {
  try {
    const conn = await getSalesforceConnection(req.params.orgType);
    const identity = await conn.identity();
    res.json({ message: "Connected", org: identity.organization_id, user: identity.username });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

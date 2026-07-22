import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireAdmin);

router.get("/", async (req, res) => {
  const { rows } = await pool.query(`SELECT id, model, enabled, updated_at FROM claude_settings WHERE id = 1`);
  res.json(rows[0] || {});
});

router.put("/", async (req, res) => {
  const { api_key, model, enabled } = req.body;
  await pool.query(
    `UPDATE claude_settings SET
       api_key = COALESCE(NULLIF($1, ''), api_key),
       model = COALESCE($2, model),
       enabled = COALESCE($3, enabled),
       updated_at = now()
     WHERE id = 1`,
    [api_key, model, enabled]
  );
  res.json({ message: "Saved" });
});

export default router;

import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireAdmin);

// GET /api/admin/logs?category=&page=1&pageSize=50
router.get("/", async (req, res) => {
  const { category, page = 1, pageSize = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(pageSize);
  const params = [];
  let where = "";
  if (category) { params.push(category); where = `WHERE category = $${params.length}`; }
  params.push(pageSize, offset);

  const { rows } = await pool.query(
    `SELECT * FROM application_logs ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  res.json(rows);
});

export default router;

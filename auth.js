import jwt from "jsonwebtoken";
import { pool } from "../db/pool.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, email, role, sfdcAccountId }
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Admin access required" });
  next();
}

export async function issueSessionToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, sfdcAccountId: user.sfdc_account_id },
    process.env.JWT_SECRET,
    { expiresIn: `${process.env.SESSION_EXPIRY_HOURS || 12}h` }
  );
}

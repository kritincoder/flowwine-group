import { pool } from "../db/pool.js";

const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 10);

export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

export async function issueOtp(userId) {
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  await pool.query(
    `UPDATE users SET otp_code = $1, otp_expires_at = $2, otp_attempts = 0, updated_at = now() WHERE id = $3`,
    [code, expiresAt, userId]
  );
  return { code, expiresAt };
}

/**
 * Validates against the user's LAST issued OTP only (spec requirement).
 * Any previous code becomes invalid the moment a new one is issued, since we
 * overwrite otp_code/otp_expires_at in place rather than keeping history.
 */
export async function validateOtp(userId, submittedCode) {
  const { rows } = await pool.query(
    `SELECT otp_code, otp_expires_at, otp_attempts FROM users WHERE id = $1`,
    [userId]
  );
  const user = rows[0];
  if (!user || !user.otp_code) return { valid: false, reason: "No code has been issued" };
  if (user.otp_attempts >= 5) return { valid: false, reason: "Too many attempts — request a new code" };
  if (new Date(user.otp_expires_at) < new Date()) return { valid: false, reason: "Code expired" };

  if (user.otp_code !== submittedCode) {
    await pool.query(`UPDATE users SET otp_attempts = otp_attempts + 1 WHERE id = $1`, [userId]);
    return { valid: false, reason: "Incorrect code" };
  }

  // consume the code so it can't be replayed
  await pool.query(`UPDATE users SET otp_code = NULL, otp_expires_at = NULL, otp_attempts = 0 WHERE id = $1`, [userId]);
  return { valid: true };
}

import { pool } from "../db/pool.js";

// Every login issue, API error, application bug, or system error should call this
// so the Admin > Application Logs tab shows a complete picture.
export async function logEvent(level, category, message, context = {}, userId = null) {
  try {
    await pool.query(
      `INSERT INTO application_logs (level, category, message, context, user_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [level, category, message, JSON.stringify(context), userId]
    );
  } catch (e) {
    // Last resort — never let logging itself crash the request.
    console.error("Failed to write application log:", e, { level, category, message });
  }
}

export const logLoginIssue = (message, context, userId) => logEvent("warning", "login_issue", message, context, userId);
export const logApiError   = (message, context, userId) => logEvent("error", "api_error", message, context, userId);
export const logAppBug     = (message, context, userId) => logEvent("error", "app_bug", message, context, userId);
export const logSystemError = (message, context, userId) => logEvent("error", "system_error", message, context, userId);
export const logError = logApiError; // convenience alias used by services

import { logSystemError } from "../services/logger.js";

// Catch-all error handler — mount last in index.js. Anything that reaches here
// gets written to application_logs automatically, satisfying the "log every
// application bug / system error" requirement without each route remembering to.
export function errorLoggerMiddleware(err, req, res, next) {
  logSystemError(err.message || "Unhandled error", {
    path: req.path,
    method: req.method,
    stack: err.stack,
  }, req.user?.id || null);

  console.error(err);
  res.status(err.status || 500).json({ error: "Something went wrong. Please try again." });
}

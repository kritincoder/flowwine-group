import "dotenv/config";
import express from "express";
import cors from "cors";
import "express-async-errors"; // patches Express so throws inside async handlers reach errorLoggerMiddleware
                                // instead of becoming unhandled promise rejections that crash the process

import authRoutes from "./routes/auth.js";
import adminUsers from "./routes/adminUsers.js";
import adminEmail from "./routes/adminEmail.js";
import adminSalesforce from "./routes/adminSalesforce.js";
import adminClaude from "./routes/adminClaude.js";
import adminLogs from "./routes/adminLogs.js";
import eventsRoutes from "./routes/events.js";
import dashboardsRoutes from "./routes/dashboards.js";
import faqsRoutes from "./routes/faqs.js";
import troubleRoutes from "./routes/trouble.js";
import askaiRoutes from "./routes/askai.js";
import { errorLoggerMiddleware } from "./middleware/errorLogger.js";

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/admin/users", adminUsers);
app.use("/api/admin/email", adminEmail);
app.use("/api/admin/salesforce", adminSalesforce);
app.use("/api/admin/claude", adminClaude);
app.use("/api/admin/logs", adminLogs);
app.use("/api/events", eventsRoutes);
app.use("/api/dashboards", dashboardsRoutes);
app.use("/api/faqs", faqsRoutes);
app.use("/api/trouble", troubleRoutes);
app.use("/api/askai", askaiRoutes);

app.use(errorLoggerMiddleware);

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`FWG portal API listening on :${port}`));

// Last line of defense: log-and-survive rather than crash-and-take-down-every-in-flight-request.
// With express-async-errors handling route-level throws above, this should rarely fire —
// but background code (e.g. a stray promise in a service file) could still hit it.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

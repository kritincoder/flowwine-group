// Run with: npm run migrate
// Applies backend/src/db/migrations/*.sql in order, in a single new database
// created under your existing Railway Postgres instance (or any DATABASE_URL).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "migrations");

async function run() {
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    console.log(`Applying ${file}...`);
    await pool.query(sql);
  }
  console.log("Migrations complete.");
  await pool.end();
}

run().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});

import pg from "pg";
import "dotenv/config";

// Railway injects DATABASE_URL automatically once you attach the Postgres plugin
// to this service. Locally, copy .env.example to .env and fill it in.
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("railway") ? { rejectUnauthorized: false } : false,
});

export async function query(text, params) {
  return pool.query(text, params);
}

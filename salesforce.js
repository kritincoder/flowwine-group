import jsforce from "jsforce";
import { pool } from "../db/pool.js";
import { logError } from "./logger.js";

// In-memory cache of live jsforce Connections, keyed by org_type ('production' | 'sandbox').
// This is what implements "one shared Salesforce session, reused across every client login" —
// we do NOT log in to Salesforce on every request. We reconnect only when the cached
// session is missing or Salesforce tells us it's expired (INVALID_SESSION_ID).
const liveConnections = {};

async function getOrgConfig(orgType) {
  const { rows } = await pool.query(
    "SELECT * FROM salesforce_connections WHERE org_type = $1",
    [orgType]
  );
  if (!rows[0]) throw new Error(`No Salesforce connection configured for org_type=${orgType}`);
  return rows[0];
}

async function getActiveOrgType() {
  // SF_LOCKED_ORG pins this deployment to one org permanently (set it when running
  // Production and Sandbox as two separate, parallel Railway services). When set,
  // the Admin UI's "Set as Active" toggle is disabled for this deployment — see
  // adminSalesforce.js's /:orgType/activate guard below.
  if (process.env.SF_LOCKED_ORG) return process.env.SF_LOCKED_ORG;

  const { rows } = await pool.query(
    "SELECT org_type FROM salesforce_connections WHERE is_active = true LIMIT 1"
  );
  return rows[0]?.org_type || process.env.SF_DEFAULT_ORG || "sandbox";
}

async function freshLogin(cfg) {
  // OAuth 2.0 Client Credentials Flow — requires the Connected App to have
  // "Client Credentials Flow" enabled with a Run As user set in its policies.
  // No username/password/security token needed; Salesforce authenticates the
  // app itself via Consumer Key + Secret and issues a token scoped to the Run As user.
  const tokenUrl = `${cfg.login_url}/services/oauth2/token`;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: cfg.consumer_key,
    client_secret: cfg.consumer_secret,
  });

  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error_description || data.error || `Salesforce token request failed (${resp.status})`);
  }

  const conn = new jsforce.Connection({ instanceUrl: data.instance_url, accessToken: data.access_token });

  await pool.query(
    `UPDATE salesforce_connections
     SET last_session_id = $1, last_instance_url = $2, last_connected_at = now()
     WHERE org_type = $3`,
    [data.access_token, data.instance_url, cfg.org_type]
  );

  liveConnections[cfg.org_type] = conn;
  return conn;
}

/**
 * Returns a live, authenticated jsforce Connection for the given org (defaults to
 * whichever org is currently marked is_active in salesforce_connections).
 * Reuses the cached session whenever possible.
 */
export async function getSalesforceConnection(orgType) {
  const org = orgType || (await getActiveOrgType());

  if (liveConnections[org]) {
    return liveConnections[org];
  }

  const cfg = await getOrgConfig(org);

  // Try to rehydrate from the last known session stored in Postgres (survives backend restarts).
  if (cfg.last_session_id && cfg.last_instance_url) {
    const conn = new jsforce.Connection({
      instanceUrl: cfg.last_instance_url,
      accessToken: cfg.last_session_id,
    });
    try {
      await conn.identity(); // cheap call to confirm the session is still valid
      liveConnections[org] = conn;
      return conn;
    } catch (e) {
      // fall through to a fresh login below
    }
  }

  return freshLogin(cfg);
}

/**
 * Wraps a Salesforce call and transparently re-logs in once if the session expired mid-flight.
 */
export async function withSalesforce(orgType, fn) {
  const org = orgType || (await getActiveOrgType());
  let conn = await getSalesforceConnection(org);
  try {
    return await fn(conn);
  } catch (err) {
    if (err?.errorCode === "INVALID_SESSION_ID") {
      delete liveConnections[org];
      const cfg = await getOrgConfig(org);
      conn = await freshLogin(cfg);
      return fn(conn);
    }
    await logError("api_error", `Salesforce call failed: ${err.message}`, { org, stack: err.stack });
    throw err;
  }
}

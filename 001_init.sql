-- FlowWine Group Client Portal — initial schema
-- Run once via `npm run migrate` (backend/src/db/migrate.js), or paste into Railway's
-- Postgres query console. Safe to re-run (uses IF NOT EXISTS everywhere).

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid() if ever needed

-- ============================================================
-- USERS  (both portal clients and internal admins live here,
-- distinguished by role)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id                SERIAL PRIMARY KEY,
  first_name        TEXT NOT NULL,
  last_name         TEXT NOT NULL,
  email             TEXT UNIQUE NOT NULL,          -- username, sourced from Salesforce for clients
  password_hash     TEXT,                          -- bcrypt hash, set on first login / reset
  role              TEXT NOT NULL DEFAULT 'client', -- 'client' | 'admin'
  active            BOOLEAN NOT NULL DEFAULT true,
  sfdc_account_id   TEXT,                           -- Account Id the client belongs to (scopes their events)
  sfdc_contact_id   TEXT UNIQUE,                     -- Contact Id, source of truth from Salesforce sync
  login_ip_range    TEXT,                            -- optional CIDR restriction, admin-set
  login_location    TEXT,                            -- last known city/region, captured at login
  last_login_at     TIMESTAMPTZ,
  otp_code          TEXT,
  otp_expires_at    TIMESTAMPTZ,
  otp_attempts      INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_sfdc_account ON users(sfdc_account_id);

-- ============================================================
-- APPLICATION LOGS  (admin-only tab; auto-created on login issues,
-- API errors, app bugs, system errors)
-- ============================================================
CREATE TABLE IF NOT EXISTS application_logs (
  id           SERIAL PRIMARY KEY,
  level        TEXT NOT NULL DEFAULT 'error',   -- 'info' | 'warning' | 'error'
  category     TEXT NOT NULL,                    -- 'login_issue' | 'api_error' | 'app_bug' | 'system_error'
  message      TEXT NOT NULL,
  context      JSONB,                            -- stack trace, request path, payload, etc.
  user_id      INT REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_logs_created ON application_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_category ON application_logs(category);

-- ============================================================
-- SALESFORCE CONNECTIONS  (admin-only; one row per org: production / sandbox)
-- ============================================================
CREATE TABLE IF NOT EXISTS salesforce_connections (
  id                SERIAL PRIMARY KEY,
  org_type          TEXT UNIQUE NOT NULL,   -- 'production' | 'sandbox'
  login_url         TEXT NOT NULL,          -- e.g. https://login.salesforce.com or https://test.salesforce.com
  consumer_key      TEXT,
  consumer_secret   TEXT,
  username          TEXT,                   -- integration user, username-password OAuth flow
  password_and_token TEXT,                  -- password + security token concatenated (as Salesforce expects)
  is_active         BOOLEAN NOT NULL DEFAULT false,  -- which org is "live" for the portal right now
  last_connected_at TIMESTAMPTZ,
  last_session_id   TEXT,                   -- cached session, reused across client logins
  last_instance_url TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- EMAIL TEMPLATES  (Forgot Password OTP, Welcome Email)
-- ============================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id           SERIAL PRIMARY KEY,
  template_key TEXT UNIQUE NOT NULL,   -- 'forgot_password_otp' | 'welcome_email'
  subject      TEXT NOT NULL,
  body_html    TEXT NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- EMAIL / SMTP SETTINGS  (singleton row)
-- ============================================================
CREATE TABLE IF NOT EXISTS email_settings (
  id              SERIAL PRIMARY KEY,
  provider        TEXT NOT NULL DEFAULT 'smtp',  -- 'smtp' | 'gmail_oauth'
  smtp_host       TEXT,
  smtp_port       INT,
  smtp_username   TEXT,
  smtp_password   TEXT,
  smtp_secure     BOOLEAN DEFAULT true,
  oauth_client_id TEXT,
  oauth_client_secret TEXT,
  oauth_refresh_token TEXT,
  from_email      TEXT,
  from_name       TEXT,
  trouble_ticket_to_email TEXT,   -- "Having Trouble" messages go here
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CLAUDE / ASK AI SETTINGS  (singleton row)
-- ============================================================
CREATE TABLE IF NOT EXISTS claude_settings (
  id          SERIAL PRIMARY KEY,
  api_key     TEXT,
  model       TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
  enabled     BOOLEAN NOT NULL DEFAULT true,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- EMAIL LOG  (last 100 sends shown in Admin > Email > Email Log)
-- ============================================================
CREATE TABLE IF NOT EXISTS email_log (
  id           SERIAL PRIMARY KEY,
  to_email     TEXT NOT NULL,
  cc_email     TEXT,
  subject      TEXT,
  template_key TEXT,             -- null for raw/test emails
  status       TEXT NOT NULL,    -- 'sent' | 'failed'
  error        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_log_created ON email_log(created_at DESC);

-- ============================================================
-- FAQS  (admin-managed, client reads read-only)
-- ============================================================
CREATE TABLE IF NOT EXISTS faqs (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Seed defaults (safe to re-run; ON CONFLICT DO NOTHING)
-- ============================================================
INSERT INTO email_templates (template_key, subject, body_html) VALUES
('forgot_password_otp',
 'Your Flow Wine Group verification code',
 '<p>Hi {{first_name}},</p><p>Your one-time code is <b>{{otp_code}}</b>. It expires in {{expires_minutes}} minutes.</p><p>If you did not request this, you can ignore this email.</p>'),
('welcome_email',
 'Welcome to the Flow Wine Group Portal',
 '<p>Hi {{first_name}},</p><p>Your portal account is ready.</p><p>URL: {{portal_url}}<br/>Username: {{username}}<br/>Temporary password: {{temp_password}}</p><p>Please log in and change your password.</p>')
ON CONFLICT (template_key) DO NOTHING;

INSERT INTO email_settings (id, provider, from_email, from_name)
VALUES (1, 'gmail_oauth', 'no-reply@flowwinegroup.com', 'Flow Wine Group Portal')
ON CONFLICT (id) DO NOTHING;

INSERT INTO claude_settings (id, model) VALUES (1, 'claude-sonnet-5')
ON CONFLICT (id) DO NOTHING;

INSERT INTO salesforce_connections (org_type, login_url, is_active) VALUES
('production', '', false),
('sandbox', '', true)
ON CONFLICT (org_type) DO NOTHING;

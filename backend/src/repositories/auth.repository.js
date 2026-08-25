import { pool, query } from "../db/db.js";

// Accounts
export const findAccountByEmail = async (email) => {
  const res = await query(
    `SELECT * FROM accounts WHERE email = $1 LIMIT 1`,
    [email]
  );
  return res.rows[0] || null;
};

export const findAccountByPhone = async (phone) => {
  const res = await query(
    `SELECT * FROM accounts WHERE phone = $1 LIMIT 1`,
    [phone]
  );
  return res.rows[0] || null;
};

export const findAccountById = async (id) => {
  const res = await query(
    `SELECT id, full_name, email, phone, phone_verified_at, status, last_login_at, created_at 
     FROM accounts WHERE id = $1 LIMIT 1`,
    [id]
  );
  return res.rows[0] || null;
};

export const createAccount = async ({ fullName, email, phone, passwordHash }) => {
  const res = await query(
    `INSERT INTO accounts (full_name, email, phone, password_hash, status)
     VALUES ($1, $2, $3, $4, 'PENDING_VERIFICATION')
     RETURNING id, full_name, email, phone, status, created_at`,
    [fullName, email, phone, passwordHash]
  );
  return res.rows[0];
};

export const updateLastLogin = async (accountId) => {
  await query(
    `UPDATE accounts SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [accountId]
  );
};

// OTP Challenges
export const createOtpChallenge = async ({ accountId, phone, purpose, codeHash, expiresAt }) => {
  const res = await query(
    `INSERT INTO otp_challenges (account_id, phone, purpose, code_hash, expires_at, last_sent_at)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
     RETURNING id, expires_at`,
    [accountId, phone, purpose, codeHash, expiresAt]
  );
  return res.rows[0];
};

export const findLatestOtpChallenge = async (phone, purpose) => {
  const res = await query(
    `SELECT * FROM otp_challenges 
     WHERE phone = $1 AND purpose = $2 AND consumed_at IS NULL
     ORDER BY created_at DESC 
     LIMIT 1`,
    [phone, purpose]
  );
  return res.rows[0] || null;
};

export const incrementOtpAttempts = async (challengeId) => {
  await query(
    `UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = $1`,
    [challengeId]
  );
};

export const incrementOtpResend = async (challengeId, codeHash, expiresAt) => {
  await query(
    `UPDATE otp_challenges 
     SET code_hash = $1, expires_at = $2, resend_count = resend_count + 1, last_sent_at = CURRENT_TIMESTAMP 
     WHERE id = $3`,
    [codeHash, expiresAt, challengeId]
  );
};

// Transactional Verification & Vendor Creation
export const executePhoneVerification = async ({ accountId, challengeId }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Mark OTP as consumed and verified
    await client.query(
      `UPDATE otp_challenges 
       SET verified_at = CURRENT_TIMESTAMP, consumed_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [challengeId]
    );

    // 2. Activate Account
    const accountRes = await client.query(
      `UPDATE accounts 
       SET status = 'ACTIVE', phone_verified_at = CURRENT_TIMESTAMP 
       WHERE id = $1
       RETURNING id, full_name, email, phone, status`,
      [accountId]
    );

    // 3. Create Vendor profile (if not exists)
    const vendorRes = await client.query(
      `INSERT INTO vendors (account_id, status, onboarding_status)
       VALUES ($1, 'ACTIVE', 'NOT_STARTED')
       ON CONFLICT (account_id) DO UPDATE SET status = 'ACTIVE'
       RETURNING id, onboarding_status`,
      [accountId]
    );

    await client.query("COMMIT");
    return {
      account: accountRes.rows[0],
      vendor: vendorRes.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// Sessions
export const createSession = async ({ accountId, refreshTokenHash, ipAddress, userAgent, expiresAt }) => {
  const res = await query(
    `INSERT INTO sessions (account_id, refresh_token_hash, ip_address, user_agent, expires_at, last_used_at)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
     RETURNING id`,
    [accountId, refreshTokenHash, ipAddress, userAgent, expiresAt]
  );
  return res.rows[0];
};

export const findSessionById = async (sessionId) => {
  const res = await query(
    `SELECT * FROM sessions WHERE id = $1 AND revoked_at IS NULL LIMIT 1`,
    [sessionId]
  );
  return res.rows[0] || null;
};

export const updateSessionToken = async (sessionId, newHash, expiresAt) => {
  await query(
    `UPDATE sessions 
     SET refresh_token_hash = $1, expires_at = $2, last_used_at = CURRENT_TIMESTAMP 
     WHERE id = $3`,
    [newHash, expiresAt, sessionId]
  );
};

export const revokeSession = async (sessionId) => {
  await query(
    `UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [sessionId]
  );
};

export const revokeAllAccountSessions = async (accountId) => {
  await query(
    `UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE account_id = $1`,
    [accountId]
  );
};

// Vendor Profile Details for /me
export const findVendorByAccountId = async (accountId) => {
  const res = await query(
    `SELECT id, status, onboarding_status, created_at FROM vendors WHERE account_id = $1 LIMIT 1`,
    [accountId]
  );
  return res.rows[0] || null;
};

// Audit Logging
export const logAuthAttempt = async ({ accountId, identifier, action, success, reason, ipAddress, userAgent }) => {
  await query(
    `INSERT INTO auth_attempts (account_id, identifier, action, success, reason, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [accountId || null, identifier, action, success, reason || null, ipAddress, userAgent]
  );
};

export const logAuthEvent = async ({ accountId, eventType, ipAddress, userAgent, metadata }) => {
  await query(
    `INSERT INTO auth_events (account_id, event_type, ip_address, user_agent, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [accountId || null, eventType, ipAddress, userAgent, metadata ? JSON.stringify(metadata) : null]
  );
};
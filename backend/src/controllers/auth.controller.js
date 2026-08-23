import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { query } from "../db/db.js";

// Helper function to log security attempts
const logAuthAttempt = async (phone, action, success, reason, req) => {
  try {
    const ipAddress = req.ip || req.headers["x-forwarded-for"] || "UNKNOWN";
    const userAgent = req.headers["user-agent"] || "UNKNOWN";
    await query(
      `INSERT INTO auth_attempts (phone, action, success, reason, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6)`,
      [phone, action, success, reason, ipAddress, userAgent]
    );
  } catch (err) {
    console.error("Failed to log auth attempt:", err);
  }
};

// Helper function to log successful auth events
const logAuthEvent = async (userId, eventType, req) => {
  try {
    const ipAddress = req.ip || req.headers["x-forwarded-for"] || "UNKNOWN";
    const userAgent = req.headers["user-agent"] || "UNKNOWN";
    await query(
      `INSERT INTO auth_events (user_id, event_type, ip_address, user_agent) VALUES ($1, $2, $3, $4)`,
      [userId, eventType, ipAddress, userAgent]
    );
  } catch (err) {
    console.error("Failed to log auth event:", err);
  }
};

// 1. Request OTP Function with Rate Limiting
export const requestOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone number is required" });
    }

    // RATE LIMITING CHECK: Max 3 OTP requests in the last 5 minutes for this phone
    const recentAttempts = await query(
      `SELECT COUNT(*) FROM auth_attempts WHERE phone = $1 AND action = 'OTP_REQUEST' AND created_at > NOW() - INTERVAL '5 minutes'`,
      [phone]
    );

    const requestCount = parseInt(recentAttempts.rows[0].count, 10);
    if (requestCount >= 3) {
      await logAuthAttempt(phone, "OTP_REQUEST", false, "RATE_LIMIT_EXCEEDED", req);
      return res.status(429).json({ 
        success: false, 
        message: "Too many OTP requests. Please try again after 5 minutes." 
      });
    }

    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[DEV ONLY] Generated OTP for ${phone}: ${rawOtp}`);

    const saltRounds = 10;
    const codeHash = await bcrypt.hash(rawOtp, saltRounds);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins expiry

    await query(
      `INSERT INTO otp_challenges (phone, purpose, code_hash, expires_at) VALUES ($1, $2, $3, $4)`,
      [phone, "LOGIN", codeHash, expiresAt]
    );

    // Log successful OTP request attempt
    await logAuthAttempt(phone, "OTP_REQUEST", true, "SUCCESS", req);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      debugOtp: rawOtp 
    });
  } catch (error) {
    console.error("Error in requestOtp:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// 2. Verify OTP & Login/Register Function with Attempt Logging
export const verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: "Phone and OTP are required" });
    }

    // Find the latest valid OTP challenge for this phone
    const challengeResult = await query(
      `SELECT * FROM otp_challenges WHERE phone = $1 AND purpose = 'LOGIN' AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1`,
      [phone]
    );

    if (challengeResult.rows.length === 0) {
      await logAuthAttempt(phone, "OTP_VERIFY", false, "NO_ACTIVE_OTP", req);
      return res.status(400).json({ success: false, message: "No active OTP request found. Please request a new OTP." });
    }

    const challenge = challengeResult.rows[0];

    // Check if expired
    if (new Date() > new Date(challenge.expires_at)) {
      await logAuthAttempt(phone, "OTP_VERIFY", false, "OTP_EXPIRED", req);
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
    }

    // Check attempts limit
    if (challenge.attempts >= challenge.max_attempts) {
      await logAuthAttempt(phone, "OTP_VERIFY", false, "MAX_ATTEMPTS_EXCEEDED", req);
      return res.status(400).json({ success: false, message: "Maximum verification attempts reached. Request a new OTP." });
    }

    // Compare OTP hash
    const isMatch = await bcrypt.compare(otp, challenge.code_hash);

    if (!isMatch) {
      // Increment attempts
      await query(`UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = $1`, [challenge.id]);
      await logAuthAttempt(phone, "OTP_VERIFY", false, "INVALID_OTP", req);
      return res.status(400).json({ success: false, message: "Invalid OTP code." });
    }

    // Mark OTP as consumed and verified
    await query(
      `UPDATE otp_challenges SET verified_at = CURRENT_TIMESTAMP, consumed_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [challenge.id]
    );

    // Check if user exists, otherwise create a new user (Sign up / Sign in flow)
    let userResult = await query(`SELECT * FROM users WHERE phone = $1`, [phone]);
    let user;

    if (userResult.rows.length === 0) {
      // Create new user
      const newUserResult = await query(
        `INSERT INTO users (phone, phone_verified, status, last_login_at) VALUES ($1, true, 'ACTIVE', CURRENT_TIMESTAMP) RETURNING *`,
        [phone]
      );
      user = newUserResult.rows[0];
    } else {
      // Existing user: update verification & last login
      const updatedUserResult = await query(
        `UPDATE users SET phone_verified = true, last_login_at = CURRENT_TIMESTAMP WHERE phone = $1 RETURNING *`,
        [phone]
      );
      user = updatedUserResult.rows[0];
    }

    // Generate JWT Tokens (Access Token & Refresh Token)
    const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey_vendor_os";
    const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refreshsecretkey_vendor_os";

    const accessToken = jwt.sign({ userId: user.id, phone: user.phone }, JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: "30d" });

    // Hash refresh token to store in session table
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const ipAddress = req.ip || req.headers["x-forwarded-for"] || "UNKNOWN";
    const userAgent = req.headers["user-agent"] || "UNKNOWN";

    // Save session in user_sessions table
    await query(
      `INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5)`,
      [user.id, refreshTokenHash, sessionExpiresAt, ipAddress, userAgent]
    );

    // Log success attempt & login event
    await logAuthAttempt(phone, "OTP_VERIFY", true, "SUCCESS", req);
    await logAuthEvent(user.id, "LOGIN_SUCCESS", req);

    return res.status(200).json({
      success: true,
      message: "Authentication successful",
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          phone: user.phone,
          phoneVerified: user.phone_verified,
          status: user.status
        }
      }
    });

  } catch (error) {
    console.error("Error in verifyOtp:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// 3. Get Current User Profile Function
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.userId;

    const userResult = await query(
      `SELECT id, phone, phone_verified, name, email, email_verified, status, last_login_at, created_at FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: userResult.rows[0]
      }
    });
  } catch (error) {
    console.error("Error in getCurrentUser:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
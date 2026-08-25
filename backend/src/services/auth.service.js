import * as authRepo from "../repositories/auth.repository.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import { generateOtp, hashOtp, compareOtp } from "../utils/otp.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/token.js";

const OTP_EXPIRY_MINUTES = 10;
const REFRESH_EXPIRY_DAYS = 7;

export const register = async ({ fullName, email, phone, password }, meta) => {
  const cleanEmail = email?.trim().toLowerCase();
  const cleanPhone = phone?.trim();

  if (!fullName || !cleanEmail || !cleanPhone || !password) {
    throw { statusCode: 400, message: "All registration fields are required." };
  }

  // 1. Uniqueness check
  const existingEmail = await authRepo.findAccountByEmail(cleanEmail);
  if (existingEmail) {
    await authRepo.logAuthAttempt({
      identifier: cleanEmail,
      action: "REGISTER",
      success: false,
      reason: "EMAIL_ALREADY_EXISTS",
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    throw { statusCode: 409, message: "An account with this email already exists." };
  }

  const existingPhone = await authRepo.findAccountByPhone(cleanPhone);
  if (existingPhone) {
    await authRepo.logAuthAttempt({
      identifier: cleanPhone,
      action: "REGISTER",
      success: false,
      reason: "PHONE_ALREADY_EXISTS",
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    throw { statusCode: 409, message: "An account with this phone number already exists." };
  }

  // 2. Create account (PENDING_VERIFICATION)
  const passwordHash = await hashPassword(password);
  const account = await authRepo.createAccount({
    fullName: fullName.trim(),
    email: cleanEmail,
    phone: cleanPhone,
    passwordHash,
  });

  // 3. Issue Phone Verification OTP
  const rawOtp = generateOtp();
  const codeHash = await hashOtp(rawOtp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await authRepo.createOtpChallenge({
    accountId: account.id,
    phone: cleanPhone,
    purpose: "PHONE_VERIFICATION",
    codeHash,
    expiresAt,
  });

  await authRepo.logAuthEvent({
    accountId: account.id,
    eventType: "REGISTERED",
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return {
    accountId: account.id,
    phone: account.phone,
    verificationRequired: true,
    ...(process.env.NODE_ENV === "development" && { debugOtp: rawOtp }),
  };
};

export const verifyPhone = async ({ phone, otp }, meta) => {
  const cleanPhone = phone?.trim();
  if (!cleanPhone || !otp) {
    throw { statusCode: 400, message: "Phone number and OTP are required." };
  }

  const challenge = await authRepo.findLatestOtpChallenge(cleanPhone, "PHONE_VERIFICATION");
  if (!challenge) {
    throw { statusCode: 400, message: "No active verification challenge found for this phone." };
  }

  if (new Date() > new Date(challenge.expires_at)) {
    throw { statusCode: 400, message: "OTP has expired. Please request a new one." };
  }

  if (challenge.attempts >= challenge.max_attempts) {
    throw { statusCode: 429, message: "Maximum verification attempts exceeded. Request a new OTP." };
  }

  const isMatch = await compareOtp(otp, challenge.code_hash);
  if (!isMatch) {
    await authRepo.incrementOtpAttempts(challenge.id);
    throw { statusCode: 400, message: "Invalid verification code." };
  }

  // Activate Account & Initialize Vendor
  const { account, vendor } = await authRepo.executePhoneVerification({
    accountId: challenge.account_id,
    challengeId: challenge.id,
  });

  // Create Authenticated Session
  const sessionExpiresAt = new Date(Date.now() + REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const session = await authRepo.createSession({
    accountId: account.id,
    refreshTokenHash: "TEMP",
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    expiresAt: sessionExpiresAt,
  });

  const accessToken = generateAccessToken({ sub: account.id });
  const refreshToken = generateRefreshToken({ sub: account.id, sid: session.id });

  const refreshTokenHash = await hashPassword(refreshToken);
  await authRepo.updateSessionToken(session.id, refreshTokenHash, sessionExpiresAt);

  await authRepo.logAuthEvent({
    accountId: account.id,
    eventType: "PHONE_VERIFIED",
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return {
    accessToken,
    refreshToken,
    account: {
      id: account.id,
      fullName: account.full_name,
      email: account.email,
      phone: account.phone,
      status: account.status,
    },
    vendor: {
      id: vendor.id,
      onboardingStatus: vendor.onboarding_status,
    },
  };
};

export const resendPhoneOtp = async ({ phone }) => {
  const cleanPhone = phone?.trim();
  if (!cleanPhone) {
    throw { statusCode: 400, message: "Phone number is required." };
  }

  const challenge = await authRepo.findLatestOtpChallenge(cleanPhone, "PHONE_VERIFICATION");
  if (!challenge) {
    throw { statusCode: 404, message: "No active verification challenge found." };
  }

  if (challenge.resend_count >= 3) {
    throw { statusCode: 429, message: "Maximum OTP resend limit reached. Try again later." };
  }

  const rawOtp = generateOtp();
  const codeHash = await hashOtp(rawOtp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await authRepo.incrementOtpResend(challenge.id, codeHash, expiresAt);

  return {
    phone: cleanPhone,
    resendCount: challenge.resend_count + 1,
    ...(process.env.NODE_ENV === "development" && { debugOtp: rawOtp }),
  };
};

export const login = async ({ email, password }, meta) => {
  const cleanEmail = email?.trim().toLowerCase();
  if (!cleanEmail || !password) {
    throw { statusCode: 400, message: "Email and password are required." };
  }

  const account = await authRepo.findAccountByEmail(cleanEmail);
  if (!account) {
    await authRepo.logAuthAttempt({
      identifier: cleanEmail,
      action: "LOGIN",
      success: false,
      reason: "ACCOUNT_NOT_FOUND",
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    throw { statusCode: 401, message: "Invalid email or password." };
  }

  const isMatch = await comparePassword(password, account.password_hash);
  if (!isMatch) {
    await authRepo.logAuthAttempt({
      accountId: account.id,
      identifier: cleanEmail,
      action: "LOGIN",
      success: false,
      reason: "INVALID_PASSWORD",
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    throw { statusCode: 401, message: "Invalid email or password." };
  }

  if (account.status === "PENDING_VERIFICATION") {
    throw {
      statusCode: 403,
      message: "Phone verification pending. Please verify your phone number.",
      data: { phone: account.phone, verificationRequired: true },
    };
  }

  if (account.status !== "ACTIVE") {
    throw { statusCode: 403, message: `Account is ${account.status.toLowerCase()}. Contact support.` };
  }

  // Create Session
  const sessionExpiresAt = new Date(Date.now() + REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const session = await authRepo.createSession({
    accountId: account.id,
    refreshTokenHash: "TEMP",
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    expiresAt: sessionExpiresAt,
  });

  const accessToken = generateAccessToken({ sub: account.id });
  const refreshToken = generateRefreshToken({ sub: account.id, sid: session.id });

  const refreshTokenHash = await hashPassword(refreshToken);
  await authRepo.updateSessionToken(session.id, refreshTokenHash, sessionExpiresAt);
  await authRepo.updateLastLogin(account.id);

  const vendor = await authRepo.findVendorByAccountId(account.id);

  await authRepo.logAuthAttempt({
    accountId: account.id,
    identifier: cleanEmail,
    action: "LOGIN",
    success: true,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return {
    accessToken,
    refreshToken,
    account: {
      id: account.id,
      fullName: account.full_name,
      email: account.email,
      phone: account.phone,
      status: account.status,
    },
    vendor: vendor
      ? { id: vendor.id, onboardingStatus: vendor.onboarding_status }
      : null,
  };
};

export const refresh = async ({ refreshToken }) => {
  if (!refreshToken) {
    throw { statusCode: 400, message: "Refresh token is required." };
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw { statusCode: 401, message: "Invalid or expired refresh token." };
  }

  const session = await authRepo.findSessionById(decoded.sid);
  if (!session) {
    throw { statusCode: 401, message: "Session expired or revoked." };
  }

  if (new Date() > new Date(session.expires_at)) {
    await authRepo.revokeSession(session.id);
    throw { statusCode: 401, message: "Session expired." };
  }

  const isTokenValid = await comparePassword(refreshToken, session.refresh_token_hash);
  if (!isTokenValid) {
    // Potential token reuse detected - revoke session
    await authRepo.revokeSession(session.id);
    throw { statusCode: 401, message: "Invalid session token." };
  }

  // Refresh Token Rotation
  const newSessionExpiresAt = new Date(Date.now() + REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const newAccessToken = generateAccessToken({ sub: session.account_id });
  const newRefreshToken = generateRefreshToken({ sub: session.account_id, sid: session.id });

  const newHash = await hashPassword(newRefreshToken);
  await authRepo.updateSessionToken(session.id, newHash, newSessionExpiresAt);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

export const logout = async (accountId, sessionId) => {
  if (sessionId) {
    await authRepo.revokeSession(sessionId);
  } else if (accountId) {
    await authRepo.revokeAllAccountSessions(accountId);
  }
};

export const getMe = async (accountId) => {
  const account = await authRepo.findAccountById(accountId);
  if (!account) {
    throw { statusCode: 404, message: "Account not found." };
  }

  const vendor = await authRepo.findVendorByAccountId(accountId);
  return {
    account,
    vendor,
  };
};
import * as authService from "../services/auth.service.js";

// ============================================================
// REQUEST METADATA
// ============================================================

const extractMeta = (req) => ({
  ipAddress:
    req.ip ||
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress,

  userAgent: req.headers["user-agent"],
});

// ============================================================
// REGISTER
// ============================================================

export const register = async (req, res, next) => {
  try {
    const result = await authService.register(
      req.body,
      extractMeta(req)
    );

    return res.status(201).json({
      success: true,
      message:
        "Registration successful. Verification OTP sent to your phone.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// VERIFY PHONE
// ============================================================

export const verifyPhone = async (req, res, next) => {
  try {
    const result = await authService.verifyPhone(
      req.body,
      extractMeta(req)
    );

    return res.status(200).json({
      success: true,
      message:
        "Phone verified successfully. Vendor profile created.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// RESEND PHONE OTP
// ============================================================

export const resendPhoneOtp = async (req, res, next) => {
  try {
    const result = await authService.resendPhoneOtp(
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "New OTP sent successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// LOGIN
// ============================================================

export const login = async (req, res, next) => {
  try {
    const result = await authService.login(
      req.body,
      extractMeta(req)
    );

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// REFRESH TOKEN
// ============================================================

export const refresh = async (req, res, next) => {
  try {
    const result = await authService.refresh(
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Access token refreshed.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// LOGOUT
// ============================================================

export const logout = async (req, res, next) => {
  try {
    await authService.logout(
      req.user.accountId
    );

    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET CURRENT USER
// ============================================================

export const getMe = async (req, res, next) => {
  try {
    const result = await authService.getMe(
      req.user.accountId
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
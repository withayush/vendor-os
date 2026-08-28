import express from "express";

import {
  register,
  verifyPhone,
  resendPhoneOtp,
  login,
  refresh,
  logout,
  getMe,
} from "../controllers/auth.controller.js";

import { verifyToken } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

import {
  registerSchema,
  verifyPhoneSchema,
  resendPhoneOtpSchema,
  loginSchema,
  refreshSchema,
} from "../validations/auth.validation.js";

const router = express.Router();

// ============================================================
// PUBLIC AUTH ROUTES
// ============================================================

router.post(
  "/register",
  validate(registerSchema),
  register
);

router.post(
  "/verify-phone",
  validate(verifyPhoneSchema),
  verifyPhone
);

router.post(
  "/resend-phone-otp",
  validate(resendPhoneOtpSchema),
  resendPhoneOtp
);

router.post(
  "/login",
  validate(loginSchema),
  login
);

router.post(
  "/refresh",
  validate(refreshSchema),
  refresh
);

// ============================================================
// PROTECTED AUTH ROUTES
// ============================================================

router.post(
  "/logout",
  verifyToken,
  logout
);

router.get(
  "/me",
  verifyToken,
  getMe
);

export default router;
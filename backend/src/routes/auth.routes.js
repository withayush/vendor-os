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

const router = express.Router();

// Public Routes
router.post("/register", register);
router.post("/verify-phone", verifyPhone);
router.post("/resend-phone-otp", resendPhoneOtp);
router.post("/login", login);
router.post("/refresh", refresh);

// Protected Routes
router.post("/logout", verifyToken, logout);
router.get("/me", verifyToken, getMe);

export default router;
import express from "express";
import { requestOtp, verifyOtp, getCurrentUser } from "../controllers/auth.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/otp/request", requestOtp);
router.post("/otp/verify", verifyOtp);
router.get("/me", verifyToken, getCurrentUser); // Protected route

export default router;
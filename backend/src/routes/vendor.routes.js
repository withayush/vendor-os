import express from "express";
import {
  createVendorProfile,
  getVendorProfile,
  updateVendorProfile
} from "../controllers/vendor.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/profile", verifyToken, createVendorProfile);
router.get("/profile", verifyToken, getVendorProfile);
router.patch("/profile", verifyToken, updateVendorProfile);

export default router;
import express from "express";
import {
  createBusiness,
  getUserBusinesses,
  addBusinessMember,
  getBusinessById,
} from "../controllers/business.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { verifyBusinessAccess } from "../middlewares/business.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createBusinessSchema } from "../validations/business.validation.js";
import { updateBusiness } from "../controllers/business.controller.js";
const router = express.Router();

// =========================================================
// BUSINESS ROUTES (PHASE 1)
// =========================================================

// Get logged-in user's business profile
router.get("/me", verifyToken, getUserBusinesses);

// Create or update business profile (Task T2)
router.post("/", verifyToken, validate(createBusinessSchema), createBusiness);

// Get all businesses associated with the user
router.get("/", verifyToken, getUserBusinesses);

// Get specific business by ID with security access check (Task T3)
router.get(
  "/:businessId",
  verifyToken,
  verifyBusinessAccess(["OWNER", "MANAGER", "STAFF", "ACCOUNTANT"]),
  getBusinessById,
);

// Add staff member to business
router.post(
  "/:businessId/members",
  verifyToken,
  verifyBusinessAccess(["OWNER", "MANAGER"]),
  addBusinessMember,
);

// 👉 T4: Update Business API (Secured strictly for OWNER role only)
router.put(
  "/:businessId",
  verifyToken,
  verifyBusinessAccess(["OWNER"]),
  updateBusiness,
);

export default router;

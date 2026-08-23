import express from "express";
import { createBusiness, getUserBusinesses, addBusinessMember } from "../controllers/business.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { verifyBusinessAccess } from "../middlewares/business.middleware.js";

const router = express.Router();

router.post("/", verifyToken, createBusiness);
router.get("/", verifyToken, getUserBusinesses);

// Add staff (Only OWNER or MANAGER can add members)
router.post("/:businessId/members", verifyToken, verifyBusinessAccess(["OWNER", "MANAGER"]), addBusinessMember);

export default router;
import express from "express";
import { createBusiness, getUserBusinesses, addBusinessMember } from "../controllers/business.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { verifyBusinessAccess } from "../middlewares/business.middleware.js";

const router = express.Router();

// 👉 Ye route hona zaroori hai (/me hamesha /:businessId se upar hona chahiye)
router.get("/me", verifyToken, getUserBusinesses);

router.post("/", verifyToken, createBusiness);
router.get("/", verifyToken, getUserBusinesses);

router.post("/:businessId/members", verifyToken, verifyBusinessAccess(["OWNER", "MANAGER"]), addBusinessMember);

export default router;
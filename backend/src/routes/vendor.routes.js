import express from "express";
import {
  createVendorProfile,
  getVendorProfile,
  updateVendorProfile
} from "../controllers/vendor.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createVendorSchema, updateVendorSchema } from "../validations/vendor.validation.js";

const router = express.Router();

router.post("/profile", verifyToken, validate(createVendorSchema), createVendorProfile);
router.get("/profile", verifyToken, getVendorProfile);
router.patch("/profile", verifyToken, validate(updateVendorSchema), updateVendorProfile);

export default router;
import express from "express";
import { createInvoice } from "../controllers/sales.controller.js";
import { generateInvoicePDF } from "../controllers/pdf.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { verifyBusinessAccess } from "../middlewares/business.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { checkoutSchema } from "../validations/sales.validation.js";

const router = express.Router();

// T25: Create Sale (POS Checkout) API with transactional controls
router.post(
  "/checkout",
  verifyToken,
  verifyBusinessAccess(["OWNER", "MANAGER", "STAFF"]),
  validate(checkoutSchema),
  createInvoice
);

// T27: Invoice PDF Generation Endpoint
router.get(
  "/invoice/:invoiceId/pdf",
  verifyToken,
  verifyBusinessAccess(),
  generateInvoicePDF
);

export default router;

import express from "express";
import { 
  getCustomers, 
  getCustomerById,
  createCustomer, 
  updateCustomer,
  getCustomerOutstanding,
  getBusinessOutstandingSummary,
  getBusinessOutstandingTotals,
  recordCustomerPayment,
  getCustomerLedgerHistory,
  getCustomerPaymentHistory,
  getCustomerCRMProfile
} from "../controllers/customer.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { verifyBusinessAccess } from "../middlewares/business.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { 
  createCustomerSchema, 
  updateCustomerSchema, 
  recordPaymentSchema 
} from "../validations/customer.validation.js";

const router = express.Router();

router.get("/", verifyToken, verifyBusinessAccess(), getCustomers);

// T34: Business-wide outstanding summary & totals (must be before /:customerId)
router.get("/outstanding/summary", verifyToken, verifyBusinessAccess(), getBusinessOutstandingSummary);
router.get("/outstanding/totals", verifyToken, verifyBusinessAccess(), getBusinessOutstandingTotals);

router.post(
  "/", 
  verifyToken, 
  verifyBusinessAccess(["OWNER", "MANAGER", "STAFF"]), 
  validate(createCustomerSchema),
  createCustomer
);
router.put(
  "/:customerId", 
  verifyToken, 
  verifyBusinessAccess(["OWNER", "MANAGER"]), 
  validate(updateCustomerSchema),
  updateCustomer
);

// T32: Get single customer by ID
router.get("/:customerId", verifyToken, verifyBusinessAccess(), getCustomerById);

// T34: Real-time Outstanding Balance
router.get("/:customerId/outstanding", verifyToken, verifyBusinessAccess(), getCustomerOutstanding);

// T35: Record Payment Settlement against Credit
router.post(
  "/:customerId/pay", 
  verifyToken, 
  verifyBusinessAccess(["OWNER", "MANAGER", "ACCOUNTANT"]), 
  validate(recordPaymentSchema),
  recordCustomerPayment
);

// T35: Fetch Customer Full Ledger & Payment History
router.get("/:customerId/ledger", verifyToken, verifyBusinessAccess(), getCustomerLedgerHistory);

// T35: Dedicated Payment Settlements endpoint (PAYMENT_RECEIVED only, with ?from=&to=&limit=)
router.get("/:customerId/payments", verifyToken, verifyBusinessAccess(), getCustomerPaymentHistory);

// T36: CRM Profile — sales metrics, debt aging, top products, monthly trend
router.get("/:customerId/profile", verifyToken, verifyBusinessAccess(), getCustomerCRMProfile);

export default router;

import express from "express";
import { 
  recordStockMovement, 
  stockIn, 
  stockOut, 
  adjustStock,
  getLedgerLogs,
  getLowStockAlerts
} from "../controllers/inventory.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { verifyBusinessAccess } from "../middlewares/business.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  recordMovementSchema,
  stockInSchema,
  stockOutSchema,
  adjustStockSchema
} from "../validations/inventory.validation.js";

const router = express.Router();

// T17: Stock In/Out Ledger Write API
router.post(
  "/movement",
  verifyToken,
  verifyBusinessAccess(["OWNER", "MANAGER"]),
  validate(recordMovementSchema),
  recordStockMovement
);

// T18: Stock IN Endpoint
router.post(
  "/stock-in",
  verifyToken,
  verifyBusinessAccess(["OWNER", "MANAGER", "STAFF"]),
  validate(stockInSchema),
  stockIn
);

// T19: Stock OUT Endpoint
router.post(
  "/stock-out",
  verifyToken,
  verifyBusinessAccess(["OWNER", "MANAGER", "STAFF"]),
  validate(stockOutSchema),
  stockOut
);

// T20: Stock Adjustment / Reconciliation Endpoint
router.post(
  "/adjust",
  verifyToken,
  verifyBusinessAccess(["OWNER", "MANAGER"]),
  validate(adjustStockSchema),
  adjustStock
);

// T21: Inventory Ledger Audit Logs API
router.get(
  "/ledger",
  verifyToken,
  verifyBusinessAccess(["OWNER", "MANAGER", "STAFF"]),
  getLedgerLogs
);

// T22: Low Stock Notifications API
router.get(
  "/low-stock",
  verifyToken,
  verifyBusinessAccess(["OWNER", "MANAGER", "STAFF"]),
  getLowStockAlerts
);

export default router;

import express from "express";
import { 
  recordStockMovement, 
  stockIn, 
  stockOut, 
  adjustStock,
  setOpeningStock,
  getOpeningStock,
  getLedgerLogs,
  getLedgerSummary,
  getLowStockAlerts,
  getInventoryStoreState,
  getProductStoreState,
  updateInventoryConfig,
  getInventoryValuation
} from "../controllers/inventory.controller.js";

import { verifyToken } from "../middlewares/auth.middleware.js";
import { verifyBusinessAccess } from "../middlewares/business.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  recordMovementSchema,
  stockInSchema,
  stockOutSchema,
  adjustStockSchema,
  updateInventoryConfigSchema,
  openingStockSchema
} from "../validations/inventory.validation.js";

const router = express.Router();

// T15: Inventory Store State Model APIs (Master Schema)
router.get(
  "/store-state",
  verifyToken,
  verifyBusinessAccess(["OWNER", "MANAGER", "STAFF"]),
  getInventoryStoreState
);

router.get(
  "/store-state/summary",
  verifyToken,
  verifyBusinessAccess(["OWNER", "MANAGER", "STAFF"]),
  getInventoryValuation
);

router.get(
  "/store-state/:productId",
  verifyToken,
  verifyBusinessAccess(["OWNER", "MANAGER", "STAFF"]),
  getProductStoreState
);

router.put(
  "/store-state/:productId",
  verifyToken,
  verifyBusinessAccess(["OWNER", "MANAGER"]),
  validate(updateInventoryConfigSchema),
  updateInventoryConfig
);


// T17: Opening Stock Initialization API
// POST — seed initial audited stock for a product (OPENING ledger entry)
router.post(
  "/opening-stock",
  verifyToken,
  verifyBusinessAccess(["OWNER", "MANAGER"]),
  validate(openingStockSchema),
  setOpeningStock
);

// GET — check if a product has had opening stock initialized
router.get(
  "/opening-stock/:productId",
  verifyToken,
  verifyBusinessAccess(["OWNER", "MANAGER", "STAFF"]),
  getOpeningStock
);

// T17 (legacy): Generic Stock In/Out/Adjust movement endpoint
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

// T16 & T21: Inventory Ledger Audit Logs & Flow Summary API
router.get(
  "/ledger/summary",
  verifyToken,
  verifyBusinessAccess(["OWNER", "MANAGER", "STAFF"]),
  getLedgerSummary
);

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

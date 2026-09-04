import * as inventoryService from "../services/inventory.service.js";

// ─────────────────────────────────────────────────────────────────────────────
// T17: Opening Stock Initialization Controllers
// ─────────────────────────────────────────────────────────────────────────────

// POST /inventory/opening-stock — seed the initial audited stock for a product
export const setOpeningStock = async (req, res, next) => {
  try {
    const businessId = req.businessId;
    const result = await inventoryService.initializeOpeningStock(businessId, req.body);

    return res.status(201).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    console.error("Error in setOpeningStock:", error);
    next(error);
  }
};

// GET /inventory/opening-stock/:productId — check if opening stock has been initialized
export const getOpeningStock = async (req, res, next) => {
  try {
    const businessId = req.businessId;
    const { productId } = req.params;

    const result = await inventoryService.getOpeningStockEntry(businessId, productId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error in getOpeningStock:", error);
    next(error);
  }
};

// Record General Stock Movement
export const recordStockMovement = async (req, res, next) => {
  try {
    const businessId = req.businessId;
    const result = await inventoryService.recordMovement(businessId, req.body);

    return res.status(201).json({
      success: true,
      message: "Stock movement recorded successfully.",
      data: result
    });
  } catch (error) {
    console.error("Error in recordStockMovement:", error);
    next(error);
  }
};

// Dedicated Stock IN API (Task T18)
export const stockIn = async (req, res, next) => {
  try {
    const businessId = req.businessId;
    const result = await inventoryService.recordStockIn(businessId, req.body);

    return res.status(201).json({
      success: true,
      message: "Stock added successfully (Stock IN recorded).",
      data: result
    });
  } catch (error) {
    console.error("Error in stockIn:", error);
    next(error);
  }
};

// Dedicated Stock OUT API (Task T19)
export const stockOut = async (req, res, next) => {
  try {
    const businessId = req.businessId;
    const result = await inventoryService.recordStockOut(businessId, req.body);

    return res.status(200).json({
      success: true,
      message: "Stock deducted successfully (Stock OUT recorded).",
      data: result
    });
  } catch (error) {
    console.error("Error in stockOut:", error);
    next(error);
  }
};

// Stock Reconciliation / Adjust API (Task T20)
export const adjustStock = async (req, res, next) => {
  try {
    const businessId = req.businessId;
    const result = await inventoryService.reconcileStock(businessId, req.body);

    return res.status(200).json({
      success: true,
      message: "Stock adjusted successfully (Reconciliation recorded).",
      data: result
    });
  } catch (error) {
    console.error("Error in adjustStock:", error);
    next(error);
  }
};

// Get Inventory Ledger Audit Logs (Task T16 & T21)
export const getLedgerLogs = async (req, res, next) => {
  try {
    const businessId = req.businessId;
    const logs = await inventoryService.listLedgerLogs(businessId, req.query);

    return res.status(200).json({
      success: true,
      data: { logs, count: logs.length }
    });
  } catch (error) {
    console.error("Error in getLedgerLogs:", error);
    next(error);
  }
};

// T16: Ledger movement flow summary (total IN/OUT/ADJUST)
export const getLedgerSummary = async (req, res, next) => {
  try {
    const businessId = req.businessId;
    const summary = await inventoryService.getLedgerSummary(businessId);

    return res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error("Error in getLedgerSummary:", error);
    next(error);
  }
};


// Get Low Stock Alerts (Task T22)
export const getLowStockAlerts = async (req, res, next) => {
  try {
    const businessId = req.businessId;
    const result = await inventoryService.listLowStockAlerts(businessId);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Error in getLowStockAlerts:", error);
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// T15: Inventory Store State Model Controllers
// ─────────────────────────────────────────────────────────────────────────────

// T15: Get master inventory store state (all products with physical stock & reorder level)
export const getInventoryStoreState = async (req, res, next) => {
  try {
    const businessId = req.businessId;
    const result = await inventoryService.getInventoryStoreState(businessId, req.query);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error in getInventoryStoreState:", error);
    next(error);
  }
};

// T15: Get store state for a specific product
export const getProductStoreState = async (req, res, next) => {
  try {
    const businessId = req.businessId;
    const { productId } = req.params;

    const result = await inventoryService.getProductStoreState(businessId, productId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error in getProductStoreState:", error);
    next(error);
  }
};

// T15: Update product reorder level and parameters
export const updateInventoryConfig = async (req, res, next) => {
  try {
    const businessId = req.businessId;
    const { productId } = req.params;

    const result = await inventoryService.updateInventoryConfig(businessId, productId, req.body);

    return res.status(200).json({
      success: true,
      message: "Inventory configuration updated successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Error in updateInventoryConfig:", error);
    next(error);
  }
};

// T15: Get overall inventory valuation & health metrics
export const getInventoryValuation = async (req, res, next) => {
  try {
    const businessId = req.businessId;
    const result = await inventoryService.getInventoryValuation(businessId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error in getInventoryValuation:", error);
    next(error);
  }
};


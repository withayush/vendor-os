import * as inventoryService from "../services/inventory.service.js";

// Record Stock Movement (Task T17)
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

// Get Inventory Ledger Audit Logs (Task T21)
export const getLedgerLogs = async (req, res, next) => {
  try {
    const businessId = req.businessId;
    const { productId } = req.query;

    const logs = await inventoryService.listLedgerLogs(businessId, productId);

    return res.status(200).json({
      success: true,
      data: { logs }
    });
  } catch (error) {
    console.error("Error in getLedgerLogs:", error);
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

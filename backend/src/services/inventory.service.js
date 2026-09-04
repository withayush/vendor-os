import { pool } from "../db/db.js";
import * as inventoryRepo from "../repositories/inventory.repository.js";

export const recordMovement = async (businessId, body) => {
  const { productId, qtyChange, type, referenceId, notes } = body;
  let parsedQtyChange = parseFloat(qtyChange);

  if (type === 'IN' && parsedQtyChange < 0) {
    parsedQtyChange = Math.abs(parsedQtyChange);
  } else if (type === 'OUT' && parsedQtyChange > 0) {
    parsedQtyChange = -parsedQtyChange;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verify product belongs to business
    const product = await inventoryRepo.findProductByIdAndBusiness(businessId, productId, client);
    if (!product) {
      throw { statusCode: 404, message: "Product not found or access denied." };
    }

    // 2. Insert into inventory_ledger
    const ledgerEntry = await inventoryRepo.createLedgerEntry(
      businessId,
      productId,
      parsedQtyChange,
      type,
      referenceId,
      notes,
      client
    );

    // 3. Update inventory available stock
    const inv = await inventoryRepo.findInventoryByProductId(productId, client);

    let updatedStock;
    if (inv) {
      const currentStock = parseFloat(inv.available_stock || 0);
      updatedStock = currentStock + parsedQtyChange;

      if (updatedStock < 0) {
        throw { statusCode: 400, message: "Insufficient stock available for this operation." };
      }

      await inventoryRepo.updateInventoryStock(productId, updatedStock, client);
    } else {
      updatedStock = parsedQtyChange;
      if (updatedStock < 0) {
        throw { statusCode: 400, message: "Stock cannot be negative." };
      }

      await inventoryRepo.createInventoryRecord(businessId, productId, updatedStock, client);
    }

    await client.query('COMMIT');
    return { ledgerEntry, newAvailableStock: updatedStock };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const recordStockIn = async (businessId, body) => {
  const { productId, quantity, referenceId, notes } = body;
  const parsedQuantity = parseFloat(quantity);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const product = await inventoryRepo.findProductByIdAndBusiness(businessId, productId, client);
    if (!product) {
      throw { statusCode: 404, message: "Product not found or access denied." };
    }

    const ledgerEntry = await inventoryRepo.createLedgerEntry(
      businessId,
      productId,
      parsedQuantity,
      'IN',
      referenceId,
      notes || "Stock intake / Goods Receipt",
      client
    );

    const inv = await inventoryRepo.findInventoryByProductId(productId, client);

    let updatedStock;
    if (inv) {
      const currentStock = parseFloat(inv.available_stock || 0);
      updatedStock = currentStock + parsedQuantity;
      await inventoryRepo.updateInventoryStock(productId, updatedStock, client);
    } else {
      updatedStock = parsedQuantity;
      await inventoryRepo.createInventoryRecord(businessId, productId, updatedStock, client);
    }

    await client.query('COMMIT');
    return { ledgerEntry, availableStock: updatedStock };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const recordStockOut = async (businessId, body) => {
  const { productId, quantity, referenceId, notes } = body;
  const parsedQuantity = parseFloat(quantity);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const product = await inventoryRepo.findProductByIdAndBusiness(businessId, productId, client);
    if (!product) {
      throw { statusCode: 404, message: "Product not found or access denied." };
    }

    const inv = await inventoryRepo.findInventoryByProductId(productId, client);
    const currentStock = inv ? parseFloat(inv.available_stock || 0) : 0;
    const updatedStock = currentStock - parsedQuantity;

    if (updatedStock < 0) {
      throw { statusCode: 400, message: "Insufficient stock available for stock-out." };
    }

    const ledgerEntry = await inventoryRepo.createLedgerEntry(
      businessId,
      productId,
      -Math.abs(parsedQuantity),
      'OUT',
      referenceId,
      notes || "Billing checkout / Stock reduction",
      client
    );

    await inventoryRepo.updateInventoryStock(productId, updatedStock, client);

    await client.query('COMMIT');
    return { ledgerEntry, availableStock: updatedStock };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const reconcileStock = async (businessId, body) => {
  const { productId, newStock, notes } = body;
  const parsedNewStock = parseFloat(newStock);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const product = await inventoryRepo.findProductByIdAndBusiness(businessId, productId, client);
    if (!product) {
      throw { statusCode: 404, message: "Product not found or access denied." };
    }

    const inv = await inventoryRepo.findInventoryByProductId(productId, client);
    const currentStock = inv ? parseFloat(inv.available_stock || 0) : 0;
    const qtyChange = parsedNewStock - currentStock;

    if (qtyChange === 0) {
      throw { statusCode: 400, message: "New stock is same as current stock. No adjustment needed." };
    }

    const ledgerEntry = await inventoryRepo.createLedgerEntry(
      businessId,
      productId,
      qtyChange,
      'ADJUST',
      null,
      notes || "Manual stock audit / reconciliation adjustment",
      client
    );

    if (inv) {
      await inventoryRepo.updateInventoryStock(productId, parsedNewStock, client);
    } else {
      await inventoryRepo.createInventoryRecord(businessId, productId, parsedNewStock, client);
    }

    await client.query('COMMIT');
    return { ledgerEntry, availableStock: parsedNewStock };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// T17: Opening Stock Initialization Service
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initialize opening stock for a product.
 * - Writes an OPENING ledger entry (the first audited value in the ledger)
 * - Seeds inventory.available_stock with the opening quantity
 * - Guards against: negative qty, duplicate OPENING entries, setting OPENING after movements exist
 * - Can be called standalone (POST /inventory/opening-stock) or during product creation
 */
export const initializeOpeningStock = async (businessId, body) => {
  const { productId, openingQty, notes } = body;
  const parsedQty = parseFloat(openingQty);

  if (isNaN(parsedQty) || parsedQty < 0) {
    throw { statusCode: 400, message: "Opening stock quantity must be a non-negative number." };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verify product belongs to this business
    const product = await inventoryRepo.findProductByIdAndBusiness(businessId, productId, client);
    if (!product) {
      throw { statusCode: 404, message: "Product not found or access denied." };
    }

    // Delegate to DB function (handles all guards atomically)
    const ledgerEntry = await inventoryRepo.callInitializeOpeningStock(
      businessId,
      productId,
      parsedQty,
      notes || `Opening stock initialization — ${parsedQty} units seeded as starting audited value`,
      client
    );

    await client.query("COMMIT");

    return {
      ledgerEntry: {
        id: ledgerEntry.id,
        productId: ledgerEntry.product_id,
        qtyChange: parseFloat(ledgerEntry.qty_change),
        type: ledgerEntry.type,
        notes: ledgerEntry.notes,
        createdAt: ledgerEntry.created_at,
      },
      availableStock: parsedQty,
      message: `Opening stock of ${parsedQty} units initialized successfully.`,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    // Map DB-raised exceptions to friendly HTTP errors
    if (error.message?.includes("OPENING_STOCK_DUPLICATE")) {
      throw { statusCode: 409, message: "Opening stock has already been initialized for this product. Use a Stock Adjust (ADJUST) entry to reconcile the balance." };
    }
    if (error.message?.includes("OPENING_STOCK_LATE")) {
      throw { statusCode: 409, message: "Opening stock cannot be set after inventory movements have already been recorded. Use a Stock Adjust (ADJUST) entry to reconcile the balance." };
    }
    if (error.message?.includes("OPENING_STOCK_INVALID")) {
      throw { statusCode: 400, message: "Opening stock quantity cannot be negative." };
    }

    throw error;
  } finally {
    client.release();
  }
};

// T17: Get the opening stock entry for a product (audit check)
export const getOpeningStockEntry = async (businessId, productId) => {
  const product = await inventoryRepo.findProductByIdAndBusiness(businessId, productId);
  if (!product) {
    throw { statusCode: 404, message: "Product not found or access denied." };
  }

  const entry = await inventoryRepo.findOpeningStockEntry(businessId, productId);
  return entry
    ? {
        id: entry.id,
        qtyChange: parseFloat(entry.qty_change),
        type: "OPENING",
        createdAt: entry.created_at,
        initialized: true,
      }
    : { initialized: false, qtyChange: null };
};

export const listLedgerLogs = async (businessId, queryParams = {}) => {

  const options = typeof queryParams === "string" ? { productId: queryParams } : queryParams;
  const logs = await inventoryRepo.findLedgerLogs(businessId, {
    productId: options.productId || null,
    type: options.type || null,
    invoiceId: options.invoiceId || null,
    limit: parseInt(options.limit) || 100,
  });

  return logs.map((log) => ({
    id: log.ledger_id,
    productId: log.product_id,
    productName: log.product_name,
    sku: log.sku,
    barcode: log.barcode,
    unit: log.unit,
    categoryName: log.category_name,
    qtyChange: parseFloat(log.qty_change),
    type: log.type,
    invoiceId: log.invoice_id,
    invoiceNumber: log.invoice_number,
    customerName: log.customer_name,
    referenceId: log.reference_id,
    notes: log.notes,
    createdAt: log.created_at,
  }));
};

// T16 & T17: Ledger movement totals & breakdown
export const getLedgerSummary = async (businessId) => {
  const summary = await inventoryRepo.findLedgerMovementSummary(businessId);
  return {
    totalInUnits: parseFloat(summary.total_in_units || 0),
    totalOutUnits: parseFloat(summary.total_out_units || 0),
    totalOpeningUnits: parseFloat(summary.total_opening_units || 0),
    inCount: parseInt(summary.in_count || 0),
    outCount: parseInt(summary.out_count || 0),
    adjustCount: parseInt(summary.adjust_count || 0),
    openingCount: parseInt(summary.opening_count || 0),
  };
};


export const listLowStockAlerts = async (businessId) => {
  const lowStockItems = await inventoryRepo.findLowStockAlerts(businessId);
  return { lowStockItems, count: lowStockItems.length };
};


// ─────────────────────────────────────────────────────────────────────────────
// T15: Inventory Store State Model Services
// ─────────────────────────────────────────────────────────────────────────────

// T15: List inventory store state master records with pagination, search, status filter
export const getInventoryStoreState = async (businessId, queryParams = {}) => {
  const search = queryParams.search || "";
  const status = queryParams.status || null;
  const sortBy = queryParams.sortBy || "name";
  const sortDir = queryParams.sortDir || "ASC";
  const limit = parseInt(queryParams.limit) || 20;
  const page = parseInt(queryParams.page) || 1;
  const offset = (page - 1) * limit;

  const totalItems = await inventoryRepo.countInventoryStoreState(businessId, { search, status });
  const items = await inventoryRepo.findInventoryStoreState(businessId, {
    search,
    status,
    limit,
    offset,
    sortBy,
    sortDir,
  });

  return {
    items: items.map((item) => ({
      inventoryId: item.inventory_id,
      productId: item.product_id,
      productName: item.product_name,
      sku: item.sku,
      barcode: item.barcode,
      categoryName: item.category_name,
      unit: item.unit || "pcs",
      costPrice: parseFloat(item.cost_price || 0),
      sellingPrice: parseFloat(item.selling_price || 0),
      availableStock: parseFloat(item.available_stock || 0),
      reorderLevel: parseFloat(item.reorder_level || 0),
      stockStatus: item.stock_status,
      stockCostValue: parseFloat(item.stock_cost_value || 0),
      stockRetailValue: parseFloat(item.stock_retail_value || 0),
      updatedAt: item.updated_at,
    })),
    pagination: {
      totalItems,
      totalPages: Math.ceil(totalItems / limit) || 1,
      currentPage: page,
      limit,
    },
  };
};

// T15: Get single product store state model
export const getProductStoreState = async (businessId, productId) => {
  const item = await inventoryRepo.findProductInventoryState(businessId, productId);
  if (!item) {
    throw { statusCode: 404, message: "Inventory record not found for this product." };
  }

  // Also fetch recent ledger flow
  const recentLogs = await inventoryRepo.findLedgerLogs(businessId, productId);

  return {
    inventoryId: item.inventory_id,
    productId: item.product_id,
    productName: item.product_name,
    sku: item.sku,
    barcode: item.barcode,
    categoryName: item.category_name,
    unit: item.unit || "pcs",
    costPrice: parseFloat(item.cost_price || 0),
    sellingPrice: parseFloat(item.selling_price || 0),
    availableStock: parseFloat(item.available_stock || 0),
    reorderLevel: parseFloat(item.reorder_level || 0),
    stockStatus: item.stock_status,
    stockCostValue: parseFloat(item.stock_cost_value || 0),
    stockRetailValue: parseFloat(item.stock_retail_value || 0),
    updatedAt: item.updated_at,
    recentMovements: recentLogs.slice(0, 10),
  };
};

// T15: Update inventory store parameters (e.g. reorder level threshold)
export const updateInventoryConfig = async (businessId, productId, body) => {
  const { reorderLevel } = body;
  const parsedReorderLevel = parseFloat(reorderLevel);

  if (isNaN(parsedReorderLevel) || parsedReorderLevel < 0) {
    throw { statusCode: 400, message: "Reorder level must be a valid non-negative number." };
  }

  const updated = await inventoryRepo.updateInventoryReorderLevel(
    businessId,
    productId,
    parsedReorderLevel
  );

  if (!updated) {
    throw { statusCode: 404, message: "Inventory record not found for this product." };
  }

  return {
    productId,
    reorderLevel: parseFloat(updated.reorder_level),
    availableStock: parseFloat(updated.available_stock),
    updatedAt: updated.updated_at,
  };
};

// T15: Summary valuation & health metrics
export const getInventoryValuation = async (businessId) => {
  const summary = await inventoryRepo.getInventoryValuationSummary(businessId);
  return {
    totalProducts: parseInt(summary.total_products || 0),
    totalPhysicalUnits: parseFloat(summary.total_physical_units || 0),
    totalCostValuation: parseFloat(summary.total_cost_valuation || 0),
    totalRetailValuation: parseFloat(summary.total_retail_valuation || 0),
    lowStockCount: parseInt(summary.low_stock_count || 0),
    outOfStockCount: parseInt(summary.out_of_stock_count || 0),
    healthyStockCount: parseInt(summary.healthy_stock_count || 0),
  };
};


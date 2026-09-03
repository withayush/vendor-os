import { query } from "../db/db.js";

export const findProductByIdAndBusiness = async (businessId, productId, client = null) => {
  const executor = client || { query };
  const res = await executor.query(
    `SELECT id FROM products WHERE id = $1 AND business_id = $2 LIMIT 1`,
    [productId, businessId]
  );
  return res.rows[0] || null;
};

export const createLedgerEntry = async (
  businessId,
  productId,
  qtyChange,
  type,
  referenceId,
  notes,
  client = null,
  invoiceId = null
) => {
  const executor = client || { query };
  const res = await executor.query(
    `INSERT INTO inventory_ledger (business_id, product_id, qty_change, type, reference_id, notes, invoice_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      businessId,
      productId,
      qtyChange,
      type,
      referenceId || null,
      notes || null,
      invoiceId || (type === "OUT" ? referenceId : null),
    ]
  );
  return res.rows[0];
};

export const findInventoryByProductId = async (productId, client = null) => {
  const executor = client || { query };
  const res = await executor.query(
    `SELECT id, available_stock FROM inventory WHERE product_id = $1 LIMIT 1`,
    [productId]
  );
  return res.rows[0] || null;
};

export const updateInventoryStock = async (productId, availableStock, client = null) => {
  const executor = client || { query };
  const res = await executor.query(
    `UPDATE inventory SET available_stock = $1, updated_at = CURRENT_TIMESTAMP WHERE product_id = $2 RETURNING *`,
    [availableStock, productId]
  );
  return res.rows[0];
};

export const createInventoryRecord = async (businessId, productId, availableStock, client = null) => {
  const executor = client || { query };
  const res = await executor.query(
    `INSERT INTO inventory (business_id, product_id, available_stock) 
     VALUES ($1, $2, $3) RETURNING *`,
    [businessId, productId, availableStock]
  );
  return res.rows[0];
};

// T16: Find Ledger Logs using v_inventory_ledger_audit (joins invoice, product, category)
export const findLedgerLogs = async (businessId, { productId = null, type = null, invoiceId = null, limit = 100 } = {}) => {
  let queryText = `
    SELECT *
    FROM v_inventory_ledger_audit
    WHERE business_id = $1
  `;
  const queryParams = [businessId];

  if (productId) {
    queryParams.push(productId);
    queryText += ` AND product_id = $${queryParams.length}`;
  }

  if (type) {
    queryParams.push(type.toUpperCase());
    queryText += ` AND type = $${queryParams.length}`;
  }

  if (invoiceId) {
    queryParams.push(invoiceId);
    queryText += ` AND invoice_id = $${queryParams.length}`;
  }

  queryParams.push(limit);
  queryText += ` ORDER BY created_at DESC LIMIT $${queryParams.length}`;

  const res = await query(queryText, queryParams);
  return res.rows;
};

// T16: Aggregate ledger flow statistics (total IN volume, OUT volume, ADJUST count)
export const findLedgerMovementSummary = async (businessId) => {
  const res = await query(
    `SELECT
       COALESCE(SUM(qty_change) FILTER (WHERE type = 'IN'), 0)     AS total_in_units,
       COALESCE(ABS(SUM(qty_change) FILTER (WHERE type = 'OUT')), 0) AS total_out_units,
       COUNT(*) FILTER (WHERE type = 'IN')                        AS in_count,
       COUNT(*) FILTER (WHERE type = 'OUT')                       AS out_count,
       COUNT(*) FILTER (WHERE type = 'ADJUST')                    AS adjust_count
     FROM inventory_ledger
     WHERE business_id = $1`,
    [businessId]
  );
  return res.rows[0] || {};
};


export const findLowStockAlerts = async (businessId) => {
  const res = await query(
    `SELECT i.*, p.name as product_name, p.sku 
     FROM inventory i
     JOIN products p ON i.product_id = p.id
     WHERE i.business_id = $1 AND i.available_stock <= i.reorder_level
     ORDER BY i.available_stock ASC`,
    [businessId]
  );
  return res.rows;
};

// ─────────────────────────────────────────────────────────────────────────────
// T15: Inventory Store State Model Queries
// ─────────────────────────────────────────────────────────────────────────────

// T15: List inventory store state master records with search, filter, sort & pagination
export const findInventoryStoreState = async (
  businessId,
  { search = "", status = null, limit = 20, offset = 0, sortBy = "name", sortDir = "ASC" } = {}
) => {
  const searchQuery = `%${search}%`;
  const params = [businessId, searchQuery, limit, offset];
  let filterClause = "";

  if (status && ["HEALTHY", "LOW_STOCK", "OUT_OF_STOCK"].includes(status.toUpperCase())) {
    params.push(status.toUpperCase());
    filterClause += ` AND stock_status = $${params.length}`;
  }

  const allowedSorts = {
    name: "product_name",
    stock: "available_stock",
    reorder: "reorder_level",
    cost_value: "stock_cost_value",
    retail_value: "stock_retail_value",
    updated: "updated_at"
  };
  const orderCol = allowedSorts[sortBy] || "product_name";
  const orderDir = sortDir.toUpperCase() === "DESC" ? "DESC" : "ASC";

  const res = await query(
    `SELECT *
     FROM v_inventory_store_state
     WHERE business_id = $1
       AND (
         product_name ILIKE $2
         OR sku ILIKE $2
         OR barcode ILIKE $2
         OR category_name ILIKE $2
       )${filterClause}
     ORDER BY ${orderCol} ${orderDir}
     LIMIT $3 OFFSET $4`,
    params
  );
  return res.rows;
};

// T15: Count total matching inventory records for pagination
export const countInventoryStoreState = async (businessId, { search = "", status = null } = {}) => {
  const searchQuery = `%${search}%`;
  const params = [businessId, searchQuery];
  let filterClause = "";

  if (status && ["HEALTHY", "LOW_STOCK", "OUT_OF_STOCK"].includes(status.toUpperCase())) {
    params.push(status.toUpperCase());
    filterClause += ` AND stock_status = $${params.length}`;
  }

  const res = await query(
    `SELECT COUNT(*) FROM v_inventory_store_state
     WHERE business_id = $1
       AND (
         product_name ILIKE $2
         OR sku ILIKE $2
         OR barcode ILIKE $2
         OR category_name ILIKE $2
       )${filterClause}`,
    params
  );
  return parseInt(res.rows[0].count);
};

// T15: Find single product inventory state details
export const findProductInventoryState = async (businessId, productId) => {
  const res = await query(
    `SELECT *
     FROM v_inventory_store_state
     WHERE business_id = $1 AND product_id = $2
     LIMIT 1`,
    [businessId, productId]
  );
  return res.rows[0] || null;
};

// T15: Update reorder level on inventory master record
export const updateInventoryReorderLevel = async (businessId, productId, reorderLevel) => {
  const res = await query(
    `UPDATE inventory
     SET reorder_level = $1, updated_at = CURRENT_TIMESTAMP
     WHERE business_id = $2 AND product_id = $3
     RETURNING *`,
    [reorderLevel, businessId, productId]
  );
  return res.rows[0] || null;
};

// T15: High-level inventory valuation and health summary
export const getInventoryValuationSummary = async (businessId) => {
  const res = await query(
    `SELECT
       COUNT(*)                                                               AS total_products,
       COALESCE(SUM(available_stock), 0)                                     AS total_physical_units,
       COALESCE(SUM(stock_cost_value), 0)                                    AS total_cost_valuation,
       COALESCE(SUM(stock_retail_value), 0)                                  AS total_retail_valuation,
       COUNT(*) FILTER (WHERE stock_status = 'LOW_STOCK')                    AS low_stock_count,
       COUNT(*) FILTER (WHERE stock_status = 'OUT_OF_STOCK')                 AS out_of_stock_count,
       COUNT(*) FILTER (WHERE stock_status = 'HEALTHY')                      AS healthy_stock_count
     FROM v_inventory_store_state
     WHERE business_id = $1`,
    [businessId]
  );
  return res.rows[0] || {};
};


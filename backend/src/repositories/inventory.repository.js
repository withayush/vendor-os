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
  client = null
) => {
  const executor = client || { query };
  const res = await executor.query(
    `INSERT INTO inventory_ledger (business_id, product_id, qty_change, type, reference_id, notes)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [businessId, productId, qtyChange, type, referenceId || null, notes || null]
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

export const findLedgerLogs = async (businessId, productId = null) => {
  let queryText = `
    SELECT l.*, p.name as product_name 
    FROM inventory_ledger l
    JOIN products p ON l.product_id = p.id
    WHERE l.business_id = $1
  `;
  const queryParams = [businessId];

  if (productId) {
    queryText += ` AND l.product_id = $2`;
    queryParams.push(productId);
  }

  queryText += ` ORDER BY l.created_at DESC LIMIT 100`;

  const res = await query(queryText, queryParams);
  return res.rows;
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

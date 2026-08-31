import { query } from "../db/db.js";

export const findProductBySkuAndBusiness = async (businessId, sku) => {
  if (!sku) return null;
  const res = await query(
    `SELECT * FROM products WHERE business_id = $1 AND sku = $2 LIMIT 1`,
    [businessId, sku]
  );
  return res.rows[0] || null;
};

export const createProductRecord = async (businessId, data) => {
  const res = await query(
    `INSERT INTO products (business_id, category_id, name, sku, barcode, selling_price, cost_price, unit)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      businessId,
      data.categoryId || null,
      data.name,
      data.sku || null,
      data.barcode || null,
      data.sellingPrice,
      data.costPrice || 0.00,
      data.unit || "pcs"
    ]
  );
  return res.rows[0];
};

export const countProducts = async (businessId, search) => {
  const searchQuery = `%${search}%`;
  const res = await query(
    `SELECT COUNT(*) FROM products 
     WHERE business_id = $1 
     AND (name ILIKE $2 OR sku ILIKE $2 OR barcode ILIKE $2)`,
    [businessId, searchQuery]
  );
  return parseInt(res.rows[0].count);
};

export const findProductsList = async (businessId, search, limit, offset) => {
  const searchQuery = `%${search}%`;
  const res = await query(
    `SELECT p.*, COALESCE(i.available_stock, 0.00) as available_stock, i.reorder_level 
     FROM products p
     LEFT JOIN inventory i ON p.id = i.product_id
     WHERE p.business_id = $1 
     AND (p.name ILIKE $2 OR p.sku ILIKE $2 OR p.barcode ILIKE $2)
     ORDER BY p.created_at DESC 
     LIMIT $3 OFFSET $4`,
    [businessId, searchQuery, limit, offset]
  );
  return res.rows;
};

export const findProductById = async (businessId, id) => {
  const res = await query(
    `SELECT id, is_active FROM products WHERE id = $1 AND business_id = $2 LIMIT 1`,
    [id, businessId]
  );
  return res.rows[0] || null;
};

export const updateProductRecord = async (businessId, id, data) => {
  const res = await query(
    `UPDATE products SET
      category_id = COALESCE($1, category_id),
      name = COALESCE($2, name),
      sku = COALESCE($3, sku),
      barcode = COALESCE($4, barcode),
      selling_price = COALESCE($5, selling_price),
      cost_price = COALESCE($6, cost_price),
      unit = COALESCE($7, unit),
      is_active = COALESCE($8, is_active),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $9 AND business_id = $10
    RETURNING *`,
    [
      data.categoryId !== undefined ? data.categoryId : null,
      data.name || null,
      data.sku || null,
      data.barcode || null,
      data.sellingPrice !== undefined ? data.sellingPrice : null,
      data.costPrice !== undefined ? data.costPrice : null,
      data.unit || null,
      data.isActive !== undefined ? data.isActive : null,
      id,
      businessId
    ]
  );
  return res.rows[0];
};

export const archiveProductRecord = async (businessId, id) => {
  const res = await query(
    `UPDATE products SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $1 AND business_id = $2 RETURNING *`,
    [id, businessId]
  );
  return res.rows[0];
};
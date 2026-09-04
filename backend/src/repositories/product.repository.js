import { query } from "../db/db.js";

export const findProductBySkuAndBusiness = async (businessId, sku) => {
  if (!sku) return null;
  const res = await query(
    `SELECT * FROM products WHERE business_id = $1 AND sku = $2 LIMIT 1`,
    [businessId, sku]
  );
  return res.rows[0] || null;
};

export const createProductRecord = async (businessId, data, client = null) => {
  const executor = client || { query };
  const res = await executor.query(
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


// T14: Count products with category-aware search (uses v_product_search view)
export const countProducts = async (businessId, search, isArchived, categoryId) => {
  const searchQuery = `%${search}%`;
  const params = [businessId, searchQuery];
  let clauses = "";
  if (isArchived === true)  clauses += " AND is_active = FALSE";
  else if (isArchived === false) clauses += " AND is_active = TRUE";
  if (categoryId) {
    params.push(categoryId);
    clauses += ` AND category_id = $${params.length}`;
  }
  const res = await query(
    `SELECT COUNT(*) FROM v_product_search
     WHERE business_id = $1
       AND (
         name     ILIKE $2
         OR sku      ILIKE $2
         OR barcode  ILIKE $2
         OR category_name ILIKE $2
       )${clauses}`,
    params
  );
  return parseInt(res.rows[0].count);
};

// T14: Paginated product list with category-aware search + sort
export const findProductsList = async (businessId, search, limit, offset, isArchived, categoryId, sortBy = "created_at", sortDir = "DESC") => {
  const searchQuery = `%${search}%`;
  const params = [businessId, searchQuery, limit, offset];
  let clauses = "";
  if (isArchived === true)  clauses += " AND is_active = FALSE";
  else if (isArchived === false) clauses += " AND is_active = TRUE";
  if (categoryId) {
    params.push(categoryId);
    clauses += ` AND category_id = $${params.length}`;
  }
  // Whitelist sort columns to prevent SQL injection
  const allowedSort = { name: "name", price: "selling_price", margin: "margin_pct", created: "created_at" };
  const orderCol = allowedSort[sortBy] || "created_at";
  const orderDir = sortDir === "ASC" ? "ASC" : "DESC";

  const res = await query(
    `SELECT *
     FROM v_product_search
     WHERE business_id = $1
       AND (
         name         ILIKE $2
         OR sku        ILIKE $2
         OR barcode    ILIKE $2
         OR category_name ILIKE $2
       )${clauses}
     ORDER BY ${orderCol} ${orderDir}
     LIMIT $3 OFFSET $4`,
    params
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

// ─────────────────────────────────────────────────────────────────────────────
// T14: Elastic Search / Instant Search Queries
// ─────────────────────────────────────────────────────────────────────────────

// T14: Instant-search — ultra-fast, minimal payload, for POS typeahead/autocomplete
// Searches name, SKU, barcode (exact prefix match prioritized, then ILIKE fallback)
// Returns top N active products only
export const findProductsInstantSearch = async (businessId, q, limit = 10) => {
  if (!q || q.trim() === "") {
    // Return top products by name when query is empty
    const res = await query(
      `SELECT id, name, sku, barcode, selling_price, cost_price, unit, category_name, available_stock, margin_pct
       FROM v_product_search
       WHERE business_id = $1 AND is_active = TRUE
       ORDER BY name ASC
       LIMIT $2`,
      [businessId, limit]
    );
    return res.rows;
  }

  const searchQ = `%${q.trim()}%`;
  const prefixQ = `${q.trim()}%`;

  const res = await query(
    `SELECT
        id,
        name,
        sku,
        barcode,
        selling_price,
        cost_price,
        unit,
        category_name,
        available_stock,
        margin_pct,
        -- Relevance ranking: exact SKU/barcode match > prefix match > partial
        CASE
          WHEN LOWER(sku)     = LOWER($2) THEN 1
          WHEN LOWER(barcode) = LOWER($2) THEN 1
          WHEN sku     ILIKE $3           THEN 2
          WHEN barcode ILIKE $3           THEN 2
          WHEN name    ILIKE $3           THEN 3
          ELSE 4
        END AS relevance_rank
     FROM v_product_search
     WHERE business_id = $1
       AND is_active = TRUE
       AND (
         name         ILIKE $4
         OR sku        ILIKE $4
         OR barcode    ILIKE $4
         OR category_name ILIKE $4
       )
     ORDER BY relevance_rank ASC, name ASC
     LIMIT $5`,
    [businessId, q.trim(), prefixQ, searchQ, limit]
  );
  return res.rows;
};

// T14: Fetch all categories for filter dropdown
export const findCategoriesList = async (businessId) => {
  const res = await query(
    `SELECT id, name FROM categories WHERE business_id = $1 ORDER BY name ASC`,
    [businessId]
  );
  return res.rows;
};

// T14: Find or create category by name
export const findOrCreateCategory = async (businessId, categoryName) => {
  if (!categoryName || !categoryName.trim()) return null;
  const name = categoryName.trim();
  const res = await query(
    `INSERT INTO categories (business_id, name)
     VALUES ($1, $2)
     ON CONFLICT (business_id, name) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
     RETURNING id, name`,
    [businessId, name]
  );
  return res.rows[0] || null;
};
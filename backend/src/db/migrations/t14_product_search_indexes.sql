-- T14: Product Elastic Search/Filter — Optimized Indexing Migration
-- Enables pg_trgm for fuzzy text matching, creates GIN trigram indexes
-- on products(name, sku, barcode) + a category-joined search view

-- ── 1. Enable pg_trgm extension (requires superuser or pg_extension privilege) ──
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── 2. GIN Trigram index on product name (fastest for ILIKE '%...%' queries) ──
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products USING GIN (name gin_trgm_ops);

-- ── 3. GIN Trigram index on sku (exact + partial SKU search for POS) ──
CREATE INDEX IF NOT EXISTS idx_products_sku_trgm
  ON products USING GIN (sku gin_trgm_ops);

-- ── 4. GIN Trigram index on barcode (barcode scan fallback) ──
CREATE INDEX IF NOT EXISTS idx_products_barcode_trgm
  ON products USING GIN (barcode gin_trgm_ops);

-- ── 5. Composite index: business_id + is_active (most queries filter by both) ──
CREATE INDEX IF NOT EXISTS idx_products_business_active
  ON products (business_id, is_active);

-- ── 6. GIN index on categories name for category search ──
CREATE INDEX IF NOT EXISTS idx_categories_name_trgm
  ON categories USING GIN (name gin_trgm_ops);

-- ── 7. T14: Product Search View — joins category name for category-aware search ──
CREATE OR REPLACE VIEW v_product_search AS
  SELECT
    p.id,
    p.business_id,
    p.name,
    p.sku,
    p.barcode,
    p.selling_price,
    p.cost_price,
    p.unit,
    p.is_active,
    p.category_id,
    p.created_at,
    p.updated_at,
    c.name                               AS category_name,
    COALESCE(i.available_stock, 0)       AS available_stock,
    i.reorder_level,
    -- Precomputed margin percentage for fast sorting
    CASE
      WHEN p.selling_price > 0
      THEN ROUND(((p.selling_price - p.cost_price) / p.selling_price) * 100, 2)
      ELSE 0
    END                                  AS margin_pct
  FROM products p
  LEFT JOIN categories c ON p.category_id = c.id
  LEFT JOIN inventory i  ON p.id = i.product_id;

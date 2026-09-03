-- T15: Inventory Store State Model Migration
-- Establishes Master Schema constraints (ProductID, AvailableStock, ReorderLevel),
-- automated product inventory initialization trigger, backfills missing records,
-- and creates the v_inventory_store_state view.

-- 1. Ensure constraints on inventory table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_inventory_available_stock_non_negative'
  ) THEN
    ALTER TABLE inventory 
      ADD CONSTRAINT chk_inventory_available_stock_non_negative 
      CHECK (available_stock >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_inventory_reorder_level_non_negative'
  ) THEN
    ALTER TABLE inventory 
      ADD CONSTRAINT chk_inventory_reorder_level_non_negative 
      CHECK (reorder_level >= 0);
  END IF;
END $$;

-- 2. Backfill missing inventory records for all existing products
INSERT INTO inventory (business_id, product_id, available_stock, reorder_level)
SELECT p.business_id, p.id, 0.00, 5.00
FROM products p
WHERE NOT EXISTS (
  SELECT 1 FROM inventory i WHERE i.product_id = p.id
);

-- 3. Automatic inventory initialization trigger on new product creation
CREATE OR REPLACE FUNCTION fn_init_product_inventory()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO inventory (business_id, product_id, available_stock, reorder_level)
  VALUES (NEW.business_id, NEW.id, 0.00, 5.00)
  ON CONFLICT (product_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_product_init_inventory ON products;
CREATE TRIGGER trg_product_init_inventory
  AFTER INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION fn_init_product_inventory();

-- 4. T15: Inventory Store State Master View
CREATE OR REPLACE VIEW v_inventory_store_state AS
  SELECT 
    i.id                                       AS inventory_id,
    i.business_id,
    i.product_id,
    p.name                                     AS product_name,
    p.sku,
    p.barcode,
    p.unit,
    p.cost_price,
    p.selling_price,
    p.is_active,
    c.name                                     AS category_name,
    i.available_stock,
    i.reorder_level,
    -- Store state classification
    CASE 
      WHEN i.available_stock <= 0 THEN 'OUT_OF_STOCK'
      WHEN i.available_stock <= i.reorder_level THEN 'LOW_STOCK'
      ELSE 'HEALTHY'
    END                                        AS stock_status,
    -- Inventory Valuation
    ROUND(i.available_stock * p.cost_price, 2)    AS stock_cost_value,
    ROUND(i.available_stock * p.selling_price, 2) AS stock_retail_value,
    i.updated_at,
    i.created_at
  FROM inventory i
  JOIN products p ON i.product_id = p.id
  LEFT JOIN categories c ON p.category_id = c.id;

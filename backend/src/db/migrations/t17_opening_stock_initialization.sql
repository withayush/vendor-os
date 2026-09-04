-- T17: Opening Stock Initialization API
-- Adds 'OPENING' as a valid transaction type in inventory_ledger to seed initial audited stock values.
-- This enables the "Opening Stock Initialization API" where initial quantities on product creation
-- are written as OPENING ledger entries, establishing the first audited stock record.

-- 1. Drop the old type check constraint and recreate with OPENING support
ALTER TABLE inventory_ledger DROP CONSTRAINT IF EXISTS inventory_ledger_type_check;
ALTER TABLE inventory_ledger DROP CONSTRAINT IF EXISTS chk_ledger_entry_type;

ALTER TABLE inventory_ledger
  ADD CONSTRAINT inventory_ledger_type_check
  CHECK (type IN ('IN', 'OUT', 'ADJUST', 'OPENING'));

-- 2. Create index for OPENING type queries (audit trail of initial stock seedings)
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_opening
  ON inventory_ledger (business_id, type, product_id)
  WHERE type = 'OPENING';

-- 3. Create a database function to safely initialize opening stock
-- Rules:
--   (a) Each product may only have one OPENING entry per business
--   (b) Opening stock must be non-negative
--   (c) An OPENING entry locks in the starting audited value — cannot be retroactively set if stock movements already exist
CREATE OR REPLACE FUNCTION fn_initialize_opening_stock(
  p_business_id UUID,
  p_product_id  UUID,
  p_qty         NUMERIC,
  p_notes       TEXT DEFAULT NULL
)
RETURNS inventory_ledger AS $$
DECLARE
  v_existing_movements INTEGER;
  v_existing_opening   INTEGER;
  v_entry              inventory_ledger;
BEGIN
  -- Guard: qty must be non-negative
  IF p_qty < 0 THEN
    RAISE EXCEPTION 'OPENING_STOCK_INVALID: Opening stock quantity cannot be negative. Got: %', p_qty;
  END IF;

  -- Guard: only one OPENING entry per product per business
  SELECT COUNT(*) INTO v_existing_opening
  FROM inventory_ledger
  WHERE business_id = p_business_id
    AND product_id  = p_product_id
    AND type        = 'OPENING';

  IF v_existing_opening > 0 THEN
    RAISE EXCEPTION 'OPENING_STOCK_DUPLICATE: Opening stock has already been initialized for this product. Use ADJUST to reconcile.';
  END IF;

  -- Guard: cannot set OPENING stock after transactions have already been recorded
  SELECT COUNT(*) INTO v_existing_movements
  FROM inventory_ledger
  WHERE business_id = p_business_id
    AND product_id  = p_product_id
    AND type        IN ('IN', 'OUT', 'ADJUST');

  IF v_existing_movements > 0 THEN
    RAISE EXCEPTION 'OPENING_STOCK_LATE: Opening stock cannot be initialized after inventory movements (IN/OUT/ADJUST) have already been recorded. Use ADJUST to reconcile the current balance.';
  END IF;

  -- Write the OPENING ledger entry (immutable audit seed)
  INSERT INTO inventory_ledger (business_id, product_id, qty_change, type, notes)
  VALUES (p_business_id, p_product_id, p_qty, 'OPENING', COALESCE(p_notes, 'Opening stock initialization — starting audited value'))
  RETURNING * INTO v_entry;

  -- Sync the inventory table to reflect opening stock
  INSERT INTO inventory (business_id, product_id, available_stock)
  VALUES (p_business_id, p_product_id, p_qty)
  ON CONFLICT (product_id)
  DO UPDATE SET
    available_stock = p_qty,
    updated_at      = CURRENT_TIMESTAMP;

  RETURN v_entry;
END;
$$ LANGUAGE plpgsql;

-- 4. Update the v_inventory_ledger_audit view to include OPENING type coloring metadata
CREATE OR REPLACE VIEW v_inventory_ledger_audit AS
  SELECT
    l.id                          AS ledger_id,
    l.business_id,
    l.product_id,
    p.name                        AS product_name,
    p.sku,
    p.barcode,
    p.unit,
    c.name                        AS category_name,
    l.qty_change,
    l.type,
    l.invoice_id,
    inv.invoice_number,
    inv.customer_name,
    l.reference_id,
    l.notes,
    l.created_at
  FROM inventory_ledger l
  JOIN products p ON l.product_id = p.id
  LEFT JOIN categories c ON p.category_id = c.id
  LEFT JOIN invoices inv ON l.invoice_id = inv.id;

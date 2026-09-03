-- T16: Inventory Ledger Schema Model Migration
-- Establishes Inventory Transaction Ledger schema: (ID, ProductID, QtyChange, Type: IN/OUT/ADJUST, InvoiceID)
-- Enforces Architectural Rule: "Never overwrite stock directly. All stock movement written as ledger logs."
-- Guarantees ledger immutability (append-only) and establishes audit views linking invoices.

-- 1. Add invoice_id column referencing invoices(id)
ALTER TABLE inventory_ledger 
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

-- 2. Backfill invoice_id from reference_id where reference_id links to an invoice
UPDATE inventory_ledger il
SET invoice_id = il.reference_id
FROM invoices inv
WHERE il.reference_id = inv.id 
  AND il.invoice_id IS NULL;

-- 3. Create indexes for high-speed ledger audit queries & invoice reconciliation
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_invoice_id 
  ON inventory_ledger (invoice_id);

CREATE INDEX IF NOT EXISTS idx_inventory_ledger_biz_type_created 
  ON inventory_ledger (business_id, type, created_at DESC);

-- 4. Update POS auto-deduct function to populate invoice_id
CREATE OR REPLACE FUNCTION public.auto_deduct_inventory_on_sale()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- 1. Insert Stock OUT entry into inventory_ledger with explicit invoice_id
    INSERT INTO inventory_ledger (business_id, product_id, qty_change, type, invoice_id, reference_id, notes)
    SELECT 
        i.business_id, 
        NEW.product_id, 
        -ABS(NEW.quantity), 
        'OUT', 
        NEW.invoice_id,
        NEW.invoice_id, 
        CONCAT('Auto stock reduction for Invoice: ', i.invoice_number)
    FROM invoices i
    WHERE i.id = NEW.invoice_id;

    -- 2. Update physical available_stock in inventory table
    UPDATE inventory
    SET available_stock = available_stock - NEW.quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE product_id = NEW.product_id;

    RETURN NEW;
END;
$$;

-- 5. Enforce Architectural Rule: Ledger is Immutable (Append-Only)
CREATE OR REPLACE FUNCTION fn_prevent_inventory_ledger_tamper()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'ARCHITECTURAL_VIOLATION: inventory_ledger is append-only and immutable. Historical stock movements cannot be modified or deleted. Write an ADJUST entry to reconcile discrepancies.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventory_ledger_immutable ON inventory_ledger;
CREATE TRIGGER trg_inventory_ledger_immutable
    BEFORE UPDATE OR DELETE ON inventory_ledger
    FOR EACH ROW
    EXECUTE FUNCTION fn_prevent_inventory_ledger_tamper();

-- 6. T16: Complete Inventory Ledger Audit View
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

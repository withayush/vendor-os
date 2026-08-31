-- =========================================================
-- T33: Customer Ledger Transaction Log — Migration
-- Run this on your existing PostgreSQL database to apply
-- the double-entry ledger schema without losing existing data.
-- =========================================================

-- Step 1: Add customer_id FK column to customer_ledger (links to customers table)
ALTER TABLE customer_ledger
    ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- Step 2: Create the new double-entry customer_ledger_entries table (T33)
CREATE TABLE IF NOT EXISTS customer_ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_ledger_id UUID NOT NULL REFERENCES customer_ledger(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    sale_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    credit_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    debit_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    balance_snapshot NUMERIC(12, 2) NOT NULL,
    entry_type VARCHAR(30) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_ledger_entry_direction CHECK (
        (credit_amount > 0 AND debit_amount = 0) OR
        (debit_amount > 0 AND credit_amount = 0)
    ),
    CONSTRAINT chk_ledger_entry_type CHECK (
        entry_type IN ('CREDIT_SALE', 'PAYMENT_RECEIVED', 'ADJUSTMENT')
    )
);

-- Step 3: Add new indexes
CREATE INDEX IF NOT EXISTS idx_customer_ledger_customer_id ON customer_ledger(customer_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_ledger ON customer_ledger_entries(customer_ledger_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_sale ON customer_ledger_entries(sale_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_customer ON customer_ledger_entries(customer_id);

-- Step 4: Add updated_at trigger to customer_ledger (if not already present)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_customer_ledger_updated_at'
    ) THEN
        CREATE TRIGGER trg_customer_ledger_updated_at
        BEFORE UPDATE ON customer_ledger
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END;
$$;

-- Step 5: Backfill customer_ledger_entries from existing customer_ledger_transactions
-- This migrates old single-amount records into the new double-entry format.
-- Positive old amounts = CREDIT_SALE (debit entry), Negative = PAYMENT_RECEIVED (credit entry)
INSERT INTO customer_ledger_entries (
    customer_ledger_id,
    sale_id,
    credit_amount,
    debit_amount,
    balance_snapshot,
    entry_type,
    notes,
    created_at
)
SELECT
    t.customer_ledger_id,
    t.invoice_id AS sale_id,
    CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0.00 END AS credit_amount,
    CASE WHEN t.amount > 0 THEN t.amount ELSE 0.00 END AS debit_amount,
    -- Use current ledger balance as snapshot (rough backfill; precise history not available)
    l.balance AS balance_snapshot,
    CASE
        WHEN t.type = 'PAYMENT_RECEIVED' THEN 'PAYMENT_RECEIVED'
        ELSE 'CREDIT_SALE'
    END AS entry_type,
    t.notes,
    t.created_at
FROM customer_ledger_transactions t
JOIN customer_ledger l ON l.id = t.customer_ledger_id
WHERE NOT EXISTS (
    SELECT 1 FROM customer_ledger_entries e
    WHERE e.customer_ledger_id = t.customer_ledger_id
      AND e.created_at = t.created_at
)
ON CONFLICT DO NOTHING;

-- Done
SELECT 'T33 migration applied successfully' AS status;

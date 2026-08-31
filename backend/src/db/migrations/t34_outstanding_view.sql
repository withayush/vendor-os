-- =========================================================
-- T34: Real-Time Outstanding Calculation — Migration
-- Creates an aggregated view for computing active credit
-- debt per customer from the double-entry ledger.
-- =========================================================

-- T34: Aggregated outstanding view
-- Computes real-time balance from customer_ledger_entries:
--   outstanding = SUM(debit_amount) - SUM(credit_amount)
-- Falls back to customer_ledger.balance for legacy records
-- that only have customer_ledger_transactions entries.
CREATE OR REPLACE VIEW v_customer_outstanding AS
SELECT
    c.id                                         AS customer_id,
    c.business_id,
    c.name                                       AS customer_name,
    c.phone                                      AS customer_phone,
    c.email,
    c.address,
    cl.id                                        AS ledger_id,

    -- Real-time aggregated balance from double-entry entries
    COALESCE(
        SUM(cle.debit_amount) - SUM(cle.credit_amount),
        cl.balance,   -- fallback to stored balance if no entries yet
        0.00
    )                                            AS outstanding_balance,

    -- Total credit sales (udhaar) ever given
    COALESCE(SUM(CASE WHEN cle.entry_type = 'CREDIT_SALE' THEN cle.debit_amount ELSE 0 END), 0.00)
                                                 AS total_credit_given,

    -- Total payments received
    COALESCE(SUM(CASE WHEN cle.entry_type = 'PAYMENT_RECEIVED' THEN cle.credit_amount ELSE 0 END), 0.00)
                                                 AS total_paid,

    -- Count of credit transactions
    COUNT(CASE WHEN cle.entry_type = 'CREDIT_SALE' THEN 1 END)
                                                 AS credit_transaction_count,

    -- Last activity timestamp
    MAX(cle.created_at)                          AS last_activity_at,

    c.created_at                                 AS customer_since

FROM customers c
LEFT JOIN customer_ledger cl
    ON cl.customer_phone = c.phone
    AND cl.business_id = c.business_id
LEFT JOIN customer_ledger_entries cle
    ON cle.customer_ledger_id = cl.id
GROUP BY
    c.id, c.business_id, c.name, c.phone, c.email, c.address,
    cl.id, cl.balance;


-- T34: Index on customer_ledger_entries entry_type for fast aggregation
CREATE INDEX IF NOT EXISTS idx_ledger_entries_type ON customer_ledger_entries(entry_type);

-- Composite index for fast per-business outstanding queries
CREATE INDEX IF NOT EXISTS idx_ledger_entries_ledger_type ON customer_ledger_entries(customer_ledger_id, entry_type);

SELECT 'T34 outstanding view and indexes created successfully' AS status;

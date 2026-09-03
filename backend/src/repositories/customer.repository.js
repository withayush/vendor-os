import { query } from "../db/db.js";

export const findCustomerByPhone = async (businessId, phone) => {
  const res = await query(
    `SELECT * FROM customers WHERE business_id = $1 AND phone = $2 LIMIT 1`,
    [businessId, phone]
  );
  return res.rows[0] || null;
};

export const findCustomerById = async (businessId, id) => {
  const res = await query(
    `SELECT * FROM customers WHERE business_id = $1 AND id = $2 LIMIT 1`,
    [businessId, id]
  );
  return res.rows[0] || null;
};

export const createCustomerRecord = async (businessId, data) => {
  const res = await query(
    `INSERT INTO customers (business_id, name, phone, email, address)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      businessId,
      data.name,
      data.phone,
      data.email || null,
      data.address || null
    ]
  );
  return res.rows[0];
};

export const updateCustomerRecord = async (businessId, id, data) => {
  const res = await query(
    `UPDATE customers 
     SET name = COALESCE($1, name),
         phone = COALESCE($2, phone),
         email = COALESCE($3, email),
         address = COALESCE($4, address),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $5 AND business_id = $6 RETURNING *`,
    [
      data.name !== undefined ? data.name : null,
      data.phone !== undefined ? data.phone : null,
      data.email !== undefined ? data.email : null,
      data.address !== undefined ? data.address : null,
      id,
      businessId
    ]
  );
  return res.rows[0] || null;
};

export const findCustomersList = async (businessId, search) => {
  const searchQuery = `%${search}%`;
  const res = await query(
    `SELECT * FROM customers 
     WHERE business_id = $1 AND (name ILIKE $2 OR phone ILIKE $2 OR email ILIKE $2)
     ORDER BY created_at DESC`,
    [businessId, searchQuery]
  );
  return res.rows;
};

// T34: Real-time outstanding per customer — uses v_customer_outstanding aggregated view
export const findOutstandingBalance = async (businessId, customerId) => {
  const res = await query(
    `SELECT * FROM v_customer_outstanding
     WHERE business_id = $1 AND customer_id = $2
     LIMIT 1`,
    [businessId, customerId]
  );
  return res.rows[0] || null;
};

// T34: Business-wide outstanding summary — all customers with active credit debt
export const findBusinessOutstandingSummary = async (businessId) => {
  const res = await query(
    `SELECT 
        customer_id,
        customer_name,
        customer_phone,
        email,
        outstanding_balance,
        total_credit_given,
        total_paid,
        credit_transaction_count,
        last_activity_at
     FROM v_customer_outstanding
     WHERE business_id = $1
       AND outstanding_balance > 0
     ORDER BY outstanding_balance DESC`,
    [businessId]
  );
  return res.rows;
};

// T34: Business-wide outstanding totals — aggregated numbers for dashboard
export const findBusinessOutstandingTotals = async (businessId) => {
  const res = await query(
    `SELECT 
        COUNT(*) FILTER (WHERE outstanding_balance > 0)   AS customers_with_debt,
        COUNT(*)                                          AS total_customers,
        COALESCE(SUM(outstanding_balance), 0)             AS total_outstanding,
        COALESCE(SUM(total_credit_given), 0)              AS total_credit_given,
        COALESCE(SUM(total_paid), 0)                      AS total_collected,
        COALESCE(MAX(outstanding_balance), 0)             AS highest_outstanding
     FROM v_customer_outstanding
     WHERE business_id = $1`,
    [businessId]
  );
  return res.rows[0] || {};
};

export const findLedgerByPhone = async (businessId, phone, client = null) => {
  const queryExecutor = client || { query };
  const res = await queryExecutor.query(
    `SELECT id, balance FROM customer_ledger WHERE business_id = $1 AND customer_phone = $2 LIMIT 1`,
    [businessId, phone]
  );
  return res.rows[0] || null;
};

export const updateLedgerBalance = async (ledgerId, newBalance, client = null) => {
  const queryExecutor = client || { query };
  const res = await queryExecutor.query(
    `UPDATE customer_ledger SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
    [newBalance, ledgerId]
  );
  return res.rows[0];
};

export const createLedgerTransaction = async (ledgerId, amount, type, notes, client = null) => {
  const queryExecutor = client || { query };
  // Write to legacy table for backward compatibility
  const res = await queryExecutor.query(
    `INSERT INTO customer_ledger_transactions (customer_ledger_id, amount, type, notes)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [ledgerId, amount, type, notes]
  );
  return res.rows[0];
};

// T33: Double-entry ledger writer — creates a proper credit OR debit entry
export const createLedgerEntry = async (
  { ledgerId, customerId = null, saleId = null, creditAmount = 0, debitAmount = 0, balanceSnapshot, entryType, notes },
  client = null
) => {
  const queryExecutor = client || { query };
  const res = await queryExecutor.query(
    `INSERT INTO customer_ledger_entries 
       (customer_ledger_id, customer_id, sale_id, credit_amount, debit_amount, balance_snapshot, entry_type, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [ledgerId, customerId, saleId, creditAmount, debitAmount, balanceSnapshot, entryType, notes]
  );
  return res.rows[0];
};

// T33/T35: Full ledger history (all entries: both CREDIT_SALE + PAYMENT_RECEIVED)
export const findLedgerTransactions = async (businessId, phone) => {
  // Try new double-entry table first
  const entriesRes = await query(
    `SELECT 
        e.id, 
        e.credit_amount,
        e.debit_amount,
        e.balance_snapshot,
        e.entry_type AS type,
        e.sale_id,
        e.notes, 
        e.created_at,
        l.balance as current_balance
     FROM customer_ledger l
     JOIN customer_ledger_entries e ON l.id = e.customer_ledger_id
     WHERE l.business_id = $1 AND l.customer_phone = $2
     ORDER BY e.created_at DESC`,
    [businessId, phone]
  );

  if (entriesRes.rows.length > 0) {
    return entriesRes.rows;
  }

  // Fallback: read from legacy customer_ledger_transactions table
  const legacyRes = await query(
    `SELECT 
        t.id,
        CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END AS credit_amount,
        CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END AS debit_amount,
        l.balance AS balance_snapshot,
        t.type,
        t.invoice_id AS sale_id,
        t.notes,
        t.created_at,
        l.balance AS current_balance
     FROM customer_ledger l
     LEFT JOIN customer_ledger_transactions t ON l.id = t.customer_ledger_id
     WHERE l.business_id = $1 AND l.customer_phone = $2
     ORDER BY t.created_at DESC`,
    [businessId, phone]
  );
  return legacyRes.rows;
};

// T35: Payment History — ONLY payment settlement entries (PAYMENT_RECEIVED)
// Includes balance_before (= balance_snapshot + credit_amount = balance before payment)
export const findPaymentHistory = async (businessId, phone, filters = {}) => {
  const { fromDate, toDate, limit = 100 } = filters;

  // From new double-entry table
  const params = [businessId, phone];
  let whereClauses = `l.business_id = $1 AND l.customer_phone = $2 AND e.entry_type = 'PAYMENT_RECEIVED'`;

  if (fromDate) {
    params.push(fromDate);
    whereClauses += ` AND e.created_at >= $${params.length}`;
  }
  if (toDate) {
    params.push(toDate);
    whereClauses += ` AND e.created_at <= $${params.length}`;
  }
  params.push(limit);

  const entriesRes = await query(
    `SELECT 
        e.id,
        e.credit_amount                                   AS amount_paid,
        e.balance_snapshot                                AS balance_after,
        (e.balance_snapshot + e.credit_amount)            AS balance_before,
        e.entry_type,
        e.notes,
        e.created_at,
        e.sale_id,
        l.balance                                         AS current_balance,
        -- Extract payment mode from notes if stored (e.g. "Payment received via UPI")
        CASE 
          WHEN e.notes ILIKE '%upi%' THEN 'UPI'
          WHEN e.notes ILIKE '%card%' THEN 'CARD'
          WHEN e.notes ILIKE '%bank%' OR e.notes ILIKE '%neft%' OR e.notes ILIKE '%rtgs%' THEN 'BANK'
          ELSE 'CASH'
        END AS payment_mode
     FROM customer_ledger l
     JOIN customer_ledger_entries e ON l.id = e.customer_ledger_id
     WHERE ${whereClauses}
     ORDER BY e.created_at DESC
     LIMIT $${params.length}`,
    params
  );

  if (entriesRes.rows.length > 0) {
    return entriesRes.rows;
  }

  // Fallback: legacy table for PAYMENT_RECEIVED
  const legacyRes = await query(
    `SELECT 
        t.id,
        ABS(t.amount)                     AS amount_paid,
        l.balance                         AS balance_after,
        (l.balance + ABS(t.amount))       AS balance_before,
        t.type                            AS entry_type,
        t.notes,
        t.created_at,
        t.invoice_id                      AS sale_id,
        l.balance                         AS current_balance,
        'CASH'                            AS payment_mode
     FROM customer_ledger l
     JOIN customer_ledger_transactions t ON l.id = t.customer_ledger_id
     WHERE l.business_id = $1 AND l.customer_phone = $2 AND t.type = 'PAYMENT_RECEIVED'
     ORDER BY t.created_at DESC
     LIMIT $3`,
    [businessId, phone, limit]
  );
  return legacyRes.rows;
};

// T35: Payment Summary — aggregated stats for a customer's repayment track record
export const findPaymentSummary = async (businessId, phone) => {
  const entriesRes = await query(
    `SELECT
        COUNT(*)                          AS total_payments,
        COALESCE(SUM(e.credit_amount), 0) AS total_paid,
        COALESCE(AVG(e.credit_amount), 0) AS avg_payment,
        COALESCE(MAX(e.credit_amount), 0) AS largest_payment,
        MIN(e.created_at)                 AS first_payment_at,
        MAX(e.created_at)                 AS last_payment_at
     FROM customer_ledger l
     JOIN customer_ledger_entries e ON l.id = e.customer_ledger_id
     WHERE l.business_id = $1 AND l.customer_phone = $2 AND e.entry_type = 'PAYMENT_RECEIVED'`,
    [businessId, phone]
  );
  return entriesRes.rows[0] || {};
};

// ─────────────────────────────────────────────────────────────────────────────
// T36: Customer CRM & Profiling Queries
// ─────────────────────────────────────────────────────────────────────────────

// T36: Full CRM sales profile — visit frequency, avg spend, total spend, first/last visit
export const findCustomerSalesProfile = async (businessId, phone) => {
  const res = await query(
    `SELECT
        COUNT(*)                                              AS total_visits,
        COALESCE(SUM(i.grand_total), 0)                      AS total_spend,
        COALESCE(AVG(i.grand_total), 0)                      AS avg_spend,
        COALESCE(MAX(i.grand_total), 0)                      AS largest_purchase,
        MIN(i.created_at)                                    AS first_visit_at,
        MAX(i.created_at)                                    AS last_visit_at,
        -- Days since last visit
        EXTRACT(DAY FROM NOW() - MAX(i.created_at))          AS days_since_last_visit,
        -- Count credit vs paid
        COUNT(*) FILTER (WHERE i.payment_status = 'PAID')    AS paid_visits,
        COUNT(*) FILTER (WHERE i.payment_status = 'PENDING') AS credit_visits,
        -- Preferred payment mode (most used)
        MODE() WITHIN GROUP (ORDER BY i.payment_mode)        AS preferred_payment_mode
     FROM invoices i
     WHERE i.business_id = $1 AND i.customer_phone = $2`,
    [businessId, phone]
  );
  return res.rows[0] || {};
};

// T36: Debt aging — buckets outstanding credit entries by age
// Returns: current (0-30d), short (31-60d), medium (61-90d), long (90+d) overdue amounts
export const findCustomerDebtAging = async (businessId, phone) => {
  const res = await query(
    `SELECT
        COALESCE(SUM(e.debit_amount) FILTER (
          WHERE e.entry_type = 'CREDIT_SALE'
            AND e.created_at >= NOW() - INTERVAL '30 days'
        ), 0)                                               AS aging_0_30,
        COALESCE(SUM(e.debit_amount) FILTER (
          WHERE e.entry_type = 'CREDIT_SALE'
            AND e.created_at < NOW() - INTERVAL '30 days'
            AND e.created_at >= NOW() - INTERVAL '60 days'
        ), 0)                                               AS aging_31_60,
        COALESCE(SUM(e.debit_amount) FILTER (
          WHERE e.entry_type = 'CREDIT_SALE'
            AND e.created_at < NOW() - INTERVAL '60 days'
            AND e.created_at >= NOW() - INTERVAL '90 days'
        ), 0)                                               AS aging_61_90,
        COALESCE(SUM(e.debit_amount) FILTER (
          WHERE e.entry_type = 'CREDIT_SALE'
            AND e.created_at < NOW() - INTERVAL '90 days'
        ), 0)                                               AS aging_90_plus,
        -- Total credit sales amount (gross, before payments)
        COALESCE(SUM(e.debit_amount) FILTER (WHERE e.entry_type = 'CREDIT_SALE'), 0) AS total_credit_taken
     FROM customer_ledger l
     JOIN customer_ledger_entries e ON l.id = e.customer_ledger_id
     WHERE l.business_id = $1 AND l.customer_phone = $2`,
    [businessId, phone]
  );
  return res.rows[0] || {};
};

// T36: Top purchased products (by frequency and revenue)
export const findCustomerTopProducts = async (businessId, phone) => {
  const res = await query(
    `SELECT
        ii.product_name,
        COUNT(*)                        AS purchase_count,
        SUM(ii.quantity)                AS total_qty,
        SUM(ii.quantity * ii.unit_price) AS total_revenue
     FROM invoices i
     JOIN invoice_items ii ON i.id = ii.invoice_id
     WHERE i.business_id = $1 AND i.customer_phone = $2
     GROUP BY ii.product_name
     ORDER BY purchase_count DESC, total_revenue DESC
     LIMIT 5`,
    [businessId, phone]
  );
  return res.rows;
};

// T36: Monthly spend trend — last 12 months (for sparkline/chart)
export const findCustomerMonthlySpend = async (businessId, phone) => {
  const res = await query(
    `SELECT
        TO_CHAR(DATE_TRUNC('month', i.created_at), 'Mon YY') AS month_label,
        DATE_TRUNC('month', i.created_at)                    AS month_start,
        COUNT(*)                                             AS visit_count,
        COALESCE(SUM(i.grand_total), 0)                      AS total_spend
     FROM invoices i
     WHERE i.business_id = $1 
       AND i.customer_phone = $2
       AND i.created_at >= NOW() - INTERVAL '12 months'
     GROUP BY DATE_TRUNC('month', i.created_at)
     ORDER BY month_start ASC`,
    [businessId, phone]
  );
  return res.rows;
};

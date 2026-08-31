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

// T33: Fetch ledger history from customer_ledger_entries (double-entry table)
// Falls back to customer_ledger_transactions if no entries found yet
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

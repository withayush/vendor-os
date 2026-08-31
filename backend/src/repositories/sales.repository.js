import { query } from "../db/db.js";

export const findProductDetails = async (productId, businessId, client = null) => {
  const executor = client || { query };
  const res = await executor.query(
    `SELECT selling_price, cost_price FROM products WHERE id = $1 AND business_id = $2 AND is_active = TRUE LIMIT 1`,
    [productId, businessId]
  );
  return res.rows[0] || null;
};

export const findInventoryStock = async (productId, client = null) => {
  const executor = client || { query };
  const res = await executor.query(
    `SELECT available_stock FROM inventory WHERE product_id = $1 LIMIT 1`,
    [productId]
  );
  return res.rows[0] || null;
};

export const createInvoiceHeader = async (
  businessId,
  invoiceNumber,
  customerName,
  customerPhone,
  subtotal,
  grandTotal,
  paymentMode,
  paymentStatus,
  client = null
) => {
  const executor = client || { query };
  const res = await executor.query(
    `INSERT INTO invoices (business_id, invoice_number, customer_name, customer_phone, subtotal, grand_total, payment_mode, payment_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      businessId,
      invoiceNumber,
      customerName || "Walk-in Customer",
      customerPhone || null,
      subtotal,
      grandTotal,
      paymentMode || "CASH",
      paymentStatus
    ]
  );
  return res.rows[0];
};

export const createPaymentRecord = async (businessId, invoiceId, grandTotal, paymentMode, client = null) => {
  const executor = client || { query };
  const res = await executor.query(
    `INSERT INTO payments (business_id, invoice_id, amount, method) 
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [businessId, invoiceId, grandTotal, paymentMode]
  );
  return res.rows[0];
};

export const findCustomerLedger = async (businessId, customerPhone, client = null) => {
  const executor = client || { query };
  const res = await executor.query(
    `SELECT id, balance FROM customer_ledger WHERE business_id = $1 AND customer_phone = $2 LIMIT 1`,
    [businessId, customerPhone]
  );
  return res.rows[0] || null;
};

export const updateCustomerLedgerBalance = async (ledgerId, amount, client = null) => {
  const executor = client || { query };
  const res = await executor.query(
    `UPDATE customer_ledger SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
    [amount, ledgerId]
  );
  return res.rows[0];
};

export const createCustomerLedger = async (businessId, customerName, customerPhone, amount, client = null) => {
  const executor = client || { query };
  const res = await executor.query(
    `INSERT INTO customer_ledger (business_id, customer_name, customer_phone, balance)
     VALUES ($1, $2, $3, $4) RETURNING id, balance`,
    [businessId, customerName, customerPhone, amount]
  );
  return res.rows[0];
};

export const createLedgerTransactionRecord = async (ledgerId, invoiceId, amount, type, notes, client = null) => {
  const executor = client || { query };
  const res = await executor.query(
    `INSERT INTO customer_ledger_transactions (customer_ledger_id, invoice_id, amount, type, notes)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [ledgerId, invoiceId, amount, type, notes]
  );
  return res.rows[0];
};

// T33: Write a proper double-entry DEBIT entry when a credit sale (udhaar) is made
export const createLedgerEntryRecord = async (
  { ledgerId, customerId = null, saleId, debitAmount, balanceSnapshot, notes },
  client = null
) => {
  const executor = client || { query };
  const res = await executor.query(
    `INSERT INTO customer_ledger_entries 
       (customer_ledger_id, customer_id, sale_id, credit_amount, debit_amount, balance_snapshot, entry_type, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [ledgerId, customerId, saleId, 0, debitAmount, balanceSnapshot, 'CREDIT_SALE', notes]
  );
  return res.rows[0];
};

export const createInvoiceItem = async (invoiceId, productId, quantity, soldPrice, costPrice, totalPrice, client = null) => {
  const executor = client || { query };
  const res = await executor.query(
    `INSERT INTO invoice_items (invoice_id, product_id, quantity, sold_price, cost_price, total_price)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [invoiceId, productId, quantity, soldPrice, costPrice, totalPrice]
  );
  return res.rows[0];
};

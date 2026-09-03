import { pool } from "../db/db.js";
import * as customerRepo from "../repositories/customer.repository.js";

// Helper: Validate & Format Phone Number (T32 - Country Code Check)
// Supports:
//   - 10-digit bare number → auto-prefixed with +91 (India default)
//   - E.164 format: +91XXXXXXXXXX, +1XXXXXXXXXX, +44XXXXXXXXXX etc.
//   - Numbers with spaces, dashes, dots (cleaned before validation)
export const validateAndFormatPhone = (phone) => {
  if (!phone) return null;

  // Strip all whitespace, dashes, dots, parentheses
  let cleaned = phone.trim().replace(/[\s\-\.\(\)]/g, "");

  // Digits only (no +)
  const digitsOnly = cleaned.replace(/^\+/, "");

  // Must be all digits after stripping leading +
  if (!/^\d+$/.test(digitsOnly)) return null;

  // Case 1: Starts with + → explicit country code (E.164)
  if (cleaned.startsWith("+")) {
    // Minimum: +1 (country code) + at least 7 digits = 9 chars total
    // Maximum: +3-digit country code + 12 digits = 16 chars total
    if (digitsOnly.length < 8 || digitsOnly.length > 15) return null;
    return cleaned; // Already formatted with country code
  }

  // Case 2: 10-digit number → Indian number, prefix +91
  if (digitsOnly.length === 10) {
    return `+91${digitsOnly}`;
  }

  // Case 3: 11-digit starting with 0 → strip leading 0, treat as 10-digit Indian
  if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) {
    return `+91${digitsOnly.slice(1)}`;
  }

  // Case 4: 12-digit starting with 91 → Indian number with country code (no +)
  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    return `+${digitsOnly}`;
  }

  // Case 5: Other international lengths (8–15 digits) → pass through as-is (no country code prefix forced)
  if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
    return cleaned;
  }

  return null; // Invalid
};

// 1. Get All Customers
export const listCustomers = async (businessId, search) => {
  return await customerRepo.findCustomersList(businessId, search);
};

// 2. Create or Register a New Customer
export const registerCustomer = async (businessId, body) => {
  const { name, phone, email, address } = body;

  if (!name || !phone) {
    throw { statusCode: 400, message: "Customer name and phone number are required." };
  }

  const formattedPhone = validateAndFormatPhone(phone);
  if (!formattedPhone) {
    throw { statusCode: 400, message: "Invalid phone number format." };
  }

  // Check if customer already exists for this business
  const existing = await customerRepo.findCustomerByPhone(businessId, formattedPhone);
  if (existing) {
    throw { statusCode: 409, message: "Customer with this phone number already exists." };
  }

  const customer = await customerRepo.createCustomerRecord(businessId, {
    name,
    phone: formattedPhone,
    email,
    address,
  });

  return customer;
};

// 3. Update Customer Details
export const editCustomer = async (businessId, customerId, body) => {
  const { name, phone, email, address } = body;

  const formattedPhone = phone ? validateAndFormatPhone(phone) : undefined;
  if (phone && !formattedPhone) {
    throw { statusCode: 400, message: "Invalid phone number format." };
  }

  const customer = await customerRepo.updateCustomerRecord(businessId, customerId, {
    name,
    phone: formattedPhone,
    email,
    address,
  });

  if (!customer) {
    throw { statusCode: 404, message: "Customer not found." };
  }

  return customer;
};

// 4. Get Single Customer by ID (T32)
export const getCustomerById = async (businessId, customerId) => {
  const customer = await customerRepo.findCustomerById(businessId, customerId);
  if (!customer) {
    throw { statusCode: 404, message: "Customer not found." };
  }
  return customer;
};

// T34: Real-time outstanding for a single customer (via aggregated view)
export const getOutstanding = async (businessId, customerId) => {
  const data = await customerRepo.findOutstandingBalance(businessId, customerId);
  if (!data) {
    throw { statusCode: 404, message: "Customer not found." };
  }
  return {
    customer_id: data.customer_id,
    customer_name: data.customer_name,
    customer_phone: data.customer_phone,
    email: data.email,
    address: data.address,
    ledger_id: data.ledger_id,
    // T34 real-time computed fields
    outstanding_balance: parseFloat(data.outstanding_balance ?? 0),
    total_credit_given: parseFloat(data.total_credit_given ?? 0),
    total_paid: parseFloat(data.total_paid ?? 0),
    credit_transaction_count: parseInt(data.credit_transaction_count ?? 0),
    last_activity_at: data.last_activity_at,
  };
};

// T34: Business-wide outstanding summary (all customers with active debt)
export const getBusinessOutstandingSummary = async (businessId) => {
  const rows = await customerRepo.findBusinessOutstandingSummary(businessId);
  return rows.map(r => ({
    ...r,
    outstanding_balance: parseFloat(r.outstanding_balance),
    total_credit_given: parseFloat(r.total_credit_given),
    total_paid: parseFloat(r.total_paid),
    credit_transaction_count: parseInt(r.credit_transaction_count),
  }));
};

// T34: Business-wide aggregated outstanding totals (for dashboard)
export const getBusinessOutstandingTotals = async (businessId) => {
  const data = await customerRepo.findBusinessOutstandingTotals(businessId);
  return {
    customers_with_debt: parseInt(data.customers_with_debt ?? 0),
    total_customers: parseInt(data.total_customers ?? 0),
    total_outstanding: parseFloat(data.total_outstanding ?? 0),
    total_credit_given: parseFloat(data.total_credit_given ?? 0),
    total_collected: parseFloat(data.total_collected ?? 0),
    highest_outstanding: parseFloat(data.highest_outstanding ?? 0),
  };
};


// 5. Process Payment Settlement (T35)
export const processRepayment = async (businessId, customerId, body) => {
  const { amount, paymentMode, notes } = body;

  if (!amount || amount <= 0) {
    throw { statusCode: 400, message: "A valid positive payment amount is required." };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Get customer
    const customer = await customerRepo.findCustomerById(businessId, customerId);
    if (!customer) {
      throw { statusCode: 404, message: "Customer not found." };
    }

    // 2. Fetch ledger
    const ledger = await customerRepo.findLedgerByPhone(businessId, customer.phone, client);
    if (!ledger) {
      throw { statusCode: 404, message: "No credit ledger found for this customer." };
    }

    const currentBalance = parseFloat(ledger.balance);
    if (amount > currentBalance) {
      throw { statusCode: 400, message: `Payment amount (₹${amount}) exceeds outstanding balance (₹${currentBalance}).` };
    }

    const newBalance = currentBalance - parseFloat(amount);

    // 3. Update balance
    await customerRepo.updateLedgerBalance(ledger.id, newBalance, client);

    // 4. Write legacy transaction log (backward compat)
    await customerRepo.createLedgerTransaction(
      ledger.id,
      -Math.abs(amount),
      "PAYMENT_RECEIVED",
      notes || `Payment received via ${paymentMode || "CASH"}`,
      client
    );

    // 5. T33: Write proper double-entry CREDIT entry
    await customerRepo.createLedgerEntry(
      {
        ledgerId: ledger.id,
        customerId: customer.id,
        saleId: null,
        creditAmount: parseFloat(amount),  // Credit = payment reduces balance
        debitAmount: 0,
        balanceSnapshot: newBalance,        // Running balance AFTER this payment
        entryType: "PAYMENT_RECEIVED",
        notes: notes || `Payment received via ${paymentMode || "CASH"}`,
      },
      client
    );

    await client.query("COMMIT");

    return {
      customerName: customer.name,
      previousBalance: currentBalance,
      paidAmount: amount,
      remainingBalance: newBalance,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

// T35: Full ledger history (all entry types) with payment summary included
export const getLedgerHistory = async (businessId, customerId) => {
  const customer = await customerRepo.findCustomerById(businessId, customerId);
  if (!customer) {
    throw { statusCode: 404, message: "Customer not found." };
  }

  const [transactions, summary] = await Promise.all([
    customerRepo.findLedgerTransactions(businessId, customer.phone),
    customerRepo.findPaymentSummary(businessId, customer.phone),
  ]);

  return {
    transactions,
    payment_summary: {
      total_payments: parseInt(summary.total_payments ?? 0),
      total_paid: parseFloat(summary.total_paid ?? 0),
      avg_payment: parseFloat(summary.avg_payment ?? 0),
      largest_payment: parseFloat(summary.largest_payment ?? 0),
      first_payment_at: summary.first_payment_at || null,
      last_payment_at: summary.last_payment_at || null,
    },
  };
};

// T35: Dedicated Payment Settlement History endpoint
// Returns ONLY PAYMENT_RECEIVED entries with full repayment metadata
export const getPaymentHistory = async (businessId, customerId, filters = {}) => {
  const customer = await customerRepo.findCustomerById(businessId, customerId);
  if (!customer) {
    throw { statusCode: 404, message: "Customer not found." };
  }

  const [payments, summary] = await Promise.all([
    customerRepo.findPaymentHistory(businessId, customer.phone, filters),
    customerRepo.findPaymentSummary(businessId, customer.phone),
  ]);

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
    },
    payments: payments.map(p => ({
      id: p.id,
      amount_paid: parseFloat(p.amount_paid ?? 0),
      balance_before: parseFloat(p.balance_before ?? 0),
      balance_after: parseFloat(p.balance_after ?? 0),
      payment_mode: p.payment_mode || "CASH",
      notes: p.notes || null,
      created_at: p.created_at,
    })),
    summary: {
      total_payments: parseInt(summary.total_payments ?? 0),
      total_paid: parseFloat(summary.total_paid ?? 0),
      avg_payment: parseFloat(summary.avg_payment ?? 0),
      largest_payment: parseFloat(summary.largest_payment ?? 0),
      first_payment_at: summary.first_payment_at || null,
      last_payment_at: summary.last_payment_at || null,
    },
  };
};

// T36: Full CRM Profile — aggregates all profiling data in a single call
export const getCustomerCRMProfile = async (businessId, customerId) => {
  const customer = await customerRepo.findCustomerById(businessId, customerId);
  if (!customer) {
    throw { statusCode: 404, message: "Customer not found." };
  }

  // Fetch all CRM data in parallel
  const [salesProfile, debtAging, topProducts, monthlySpend, paymentSummary] =
    await Promise.all([
      customerRepo.findCustomerSalesProfile(businessId, customer.phone),
      customerRepo.findCustomerDebtAging(businessId, customer.phone),
      customerRepo.findCustomerTopProducts(businessId, customer.phone),
      customerRepo.findCustomerMonthlySpend(businessId, customer.phone),
      customerRepo.findPaymentSummary(businessId, customer.phone),
    ]);

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      customer_since: customer.created_at,
    },
    // T36: Sales profile metrics
    sales: {
      total_visits: parseInt(salesProfile.total_visits ?? 0),
      total_spend: parseFloat(salesProfile.total_spend ?? 0),
      avg_spend: parseFloat(salesProfile.avg_spend ?? 0),
      largest_purchase: parseFloat(salesProfile.largest_purchase ?? 0),
      first_visit_at: salesProfile.first_visit_at || null,
      last_visit_at: salesProfile.last_visit_at || null,
      days_since_last_visit: parseFloat(salesProfile.days_since_last_visit ?? 0),
      paid_visits: parseInt(salesProfile.paid_visits ?? 0),
      credit_visits: parseInt(salesProfile.credit_visits ?? 0),
      preferred_payment_mode: salesProfile.preferred_payment_mode || "CASH",
    },
    // T36: Debt aging buckets
    debt_aging: {
      aging_0_30: parseFloat(debtAging.aging_0_30 ?? 0),
      aging_31_60: parseFloat(debtAging.aging_31_60 ?? 0),
      aging_61_90: parseFloat(debtAging.aging_61_90 ?? 0),
      aging_90_plus: parseFloat(debtAging.aging_90_plus ?? 0),
      total_credit_taken: parseFloat(debtAging.total_credit_taken ?? 0),
    },
    // T36: Top purchased products
    top_products: topProducts.map(p => ({
      product_name: p.product_name,
      purchase_count: parseInt(p.purchase_count),
      total_qty: parseFloat(p.total_qty),
      total_revenue: parseFloat(p.total_revenue),
    })),
    // T36: Monthly spend trend (12 months)
    monthly_trend: monthlySpend.map(m => ({
      month_label: m.month_label,
      visit_count: parseInt(m.visit_count),
      total_spend: parseFloat(m.total_spend),
    })),
    // Payment track record
    payment_track: {
      total_payments: parseInt(paymentSummary.total_payments ?? 0),
      total_paid: parseFloat(paymentSummary.total_paid ?? 0),
      avg_payment: parseFloat(paymentSummary.avg_payment ?? 0),
      first_payment_at: paymentSummary.first_payment_at || null,
      last_payment_at: paymentSummary.last_payment_at || null,
    },
  };
};


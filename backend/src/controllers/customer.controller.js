import * as customerService from "../services/customer.service.js";


// 1. Get All Customers for Business
export const getCustomers = async (req, res, next) => {
  try {
    const businessId = req.businessId;
    const search = req.query.search || "";

    const customers = await customerService.listCustomers(businessId, search);

    return res.status(200).json({
      success: true,
      data: {
        customers
      }
    });
  } catch (error) {
    console.error("Error in getCustomers:", error);
    next(error);
  }
};
// 2. Get Single Customer by ID (T32)
export const getCustomerById = async (req, res, next) => {
  try {
    const businessId = req.businessId;
    const { customerId } = req.params;

    const customer = await customerService.getCustomerById(businessId, customerId);

    return res.status(200).json({
      success: true,
      data: { customer }
    });
  } catch (error) {
    console.error("Error in getCustomerById:", error);
    next(error);
  }
};

// 3. Create or Register a New Customer
export const createCustomer = async (req, res, next) => {
  try {
    const businessId = req.businessId;
    const customer = await customerService.registerCustomer(businessId, req.body);

    return res.status(201).json({
      success: true,
      message: "Customer registered successfully.",
      data: {
        customer
      }
    });
  } catch (error) {
    console.error("Error in createCustomer:", error);
    next(error);
  }
};

// 3. Update Customer Details
export const updateCustomer = async (req, res, next) => {
  try {
    const businessId = req.businessId;
    const { customerId } = req.params;

    const customer = await customerService.editCustomer(businessId, customerId, req.body);

    return res.status(200).json({
      success: true,
      message: "Customer updated successfully.",
      data: {
        customer
      }
    });
  } catch (error) {
    console.error("Error in updateCustomer:", error);
    next(error);
  }
};

// T34: Get Real-Time Outstanding Balance & Summary per Customer (via aggregated view)
export const getCustomerOutstanding = async (req, res, next) => {
  try {
    const businessId = req.businessId;
    const { customerId } = req.params;

    const data = await customerService.getOutstanding(businessId, customerId);

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Error in getCustomerOutstanding:", error);
    next(error);
  }
};

// T34: Get All Customers with Active Outstanding Debt (ordered by amount DESC)
export const getBusinessOutstandingSummary = async (req, res, next) => {
  try {
    const businessId = req.businessId;
    const debtors = await customerService.getBusinessOutstandingSummary(businessId);

    return res.status(200).json({
      success: true,
      data: { debtors, count: debtors.length }
    });
  } catch (error) {
    console.error("Error in getBusinessOutstandingSummary:", error);
    next(error);
  }
};

// T34: Business-wide Aggregated Outstanding Totals (for dashboard widget)
export const getBusinessOutstandingTotals = async (req, res, next) => {
  try {
    const businessId = req.businessId;
    const totals = await customerService.getBusinessOutstandingTotals(businessId);

    return res.status(200).json({
      success: true,
      data: totals
    });
  } catch (error) {
    console.error("Error in getBusinessOutstandingTotals:", error);
    next(error);
  }
};

// T35: Record Payment Settlement against Customer Credit (Udhaar Repayment)
export const recordCustomerPayment = async (req, res, next) => {
  try {
    const businessId = req.businessId;
    const { customerId } = req.params;

    const result = await customerService.processRepayment(businessId, customerId, req.body);

    return res.status(200).json({
      success: true,
      message: "Customer payment settlement recorded successfully.",
      data: result
    });
  } catch (error) {
    console.error("Error in recordCustomerPayment:", error);
    next(error);
  }
};

// T35: Fetch Customer Full Ledger History (all entries + payment summary stats)
export const getCustomerLedgerHistory = async (req, res, next) => {
  try {
    const businessId = req.businessId;
    const { customerId } = req.params;

    const result = await customerService.getLedgerHistory(businessId, customerId);

    return res.status(200).json({
      success: true,
      data: result  // { transactions, payment_summary }
    });
  } catch (error) {
    console.error("Error in getCustomerLedgerHistory:", error);
    next(error);
  }
};

// T35: Dedicated Payment Settlement History — ONLY repayments toward credit balances
export const getCustomerPaymentHistory = async (req, res, next) => {
  try {
    const businessId = req.businessId;
    const { customerId } = req.params;
    const { from, to, limit } = req.query;

    const result = await customerService.getPaymentHistory(businessId, customerId, {
      fromDate: from || null,
      toDate: to || null,
      limit: limit ? parseInt(limit) : 100,
    });

    return res.status(200).json({
      success: true,
      data: result  // { customer, payments[], summary }
    });
  } catch (error) {
    console.error("Error in getCustomerPaymentHistory:", error);
    next(error);
  }
};

// T36: Full CRM & Profiling Dashboard Data per Customer
export const getCustomerCRMProfile = async (req, res, next) => {
  try {
    const businessId = req.businessId;
    const { customerId } = req.params;

    const profile = await customerService.getCustomerCRMProfile(businessId, customerId);

    return res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error("Error in getCustomerCRMProfile:", error);
    next(error);
  }
};

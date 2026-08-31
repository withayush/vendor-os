import * as salesService from "../services/sales.service.js";

// Enhanced POS Checkout with Payment Recording & Customer Credit Ledger (T28 & T29)
export const createInvoice = async (req, res, next) => {
  try {
    const businessId = req.businessId;
    const invoice = await salesService.checkoutPOS(businessId, req.body);

    return res.status(201).json({
      success: true,
      message: "POS Checkout completed with payment & credit ledger integration.",
      data: { invoice }
    });
  } catch (error) {
    console.error("Error in createInvoice:", error);
    next(error);
  }
};

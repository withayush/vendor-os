import { pool } from "../db/db.js";
import * as salesRepo from "../repositories/sales.repository.js";

export const checkoutPOS = async (businessId, body) => {
  const { customerName, customerPhone, items, paymentMode } = body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      const { productId, quantity } = item;
      const product = await salesRepo.findProductDetails(productId, businessId, client);

      if (!product) {
        throw { statusCode: 404, message: `Product not found or inactive: ${productId}` };
      }

      const soldPrice = parseFloat(product.selling_price);
      const costPrice = parseFloat(product.cost_price || 0);

      // Check stock
      const inv = await salesRepo.findInventoryStock(productId, client);
      const currentStock = inv ? parseFloat(inv.available_stock) : 0;
      if (currentStock < quantity) {
        throw { statusCode: 400, message: `Insufficient stock for product ID: ${productId}. Available: ${currentStock}` };
      }

      const totalPrice = soldPrice * quantity;
      subtotal += totalPrice;
      processedItems.push({ productId, quantity, soldPrice, costPrice, totalPrice });
    }

    const grandTotal = subtotal;
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const paymentStatus = paymentMode === 'CREDIT' ? 'PENDING' : 'PAID';

    // 1. Insert Invoice Header
    const invoice = await salesRepo.createInvoiceHeader(
      businessId,
      invoiceNumber,
      customerName,
      customerPhone,
      subtotal,
      grandTotal,
      paymentMode,
      paymentStatus,
      client
    );

    const invoiceId = invoice.id;

    // 2. Record Payment if not CREDIT
    if (paymentMode !== 'CREDIT') {
      await salesRepo.createPaymentRecord(businessId, invoiceId, grandTotal, paymentMode, client);
    }

    // 3. Handle Customer Credit Ledger Routing if paymentMode is 'CREDIT'
    if (paymentMode === 'CREDIT') {
      if (!customerPhone || !customerName) {
        throw { statusCode: 400, message: "Customer name and phone number are mandatory for Credit (Udhaar) sales." };
      }

      // Find or create customer ledger account
      const ledger = await salesRepo.findCustomerLedger(businessId, customerPhone, client);

      let ledgerId;
      if (ledger) {
        ledgerId = ledger.id;
        // Update balance
        await salesRepo.updateCustomerLedgerBalance(ledgerId, grandTotal, client);
      } else {
        const newLedger = await salesRepo.createCustomerLedger(businessId, customerName, customerPhone, grandTotal, client);
        ledgerId = newLedger.id;
      }

      // Log transaction in legacy table (backward compat)
      await salesRepo.createLedgerTransactionRecord(
        ledgerId,
        invoiceId,
        grandTotal,
        'CREDIT_SALE',
        `Credit sale for invoice ${invoiceNumber}`,
        client
      );

      // T33: Write proper double-entry DEBIT entry
      // debit_amount = sale amount (customer owes more)
      // balance_snapshot = updated running balance AFTER this sale
      const currentBalance = ledger
        ? parseFloat(ledger.balance) + parseFloat(grandTotal)
        : parseFloat(grandTotal);

      await salesRepo.createLedgerEntryRecord(
        {
          ledgerId,
          customerId: null,          // No customer_id FK at this stage (sale by phone only)
          saleId: invoiceId,         // T33: link to invoice/sale
          debitAmount: grandTotal,   // T33: debit = amount customer now owes
          balanceSnapshot: currentBalance, // T33: running balance after this entry
          notes: `Udhaar sale — Invoice ${invoiceNumber}`,
        },
        client
      );
    }


    // 4. Insert Invoice Items (DB Trigger automatically updates inventory and logs to ledger)
    for (const item of processedItems) {
      await salesRepo.createInvoiceItem(
        invoiceId,
        item.productId,
        item.quantity,
        item.soldPrice,
        item.costPrice,
        item.totalPrice,
        client
      );
    }

    await client.query('COMMIT');
    return invoice;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

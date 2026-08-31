import { pool } from "../db/db.js";
import * as inventoryRepo from "../repositories/inventory.repository.js";

export const recordMovement = async (businessId, body) => {
  const { productId, qtyChange, type, referenceId, notes } = body;
  let parsedQtyChange = parseFloat(qtyChange);

  if (type === 'IN' && parsedQtyChange < 0) {
    parsedQtyChange = Math.abs(parsedQtyChange);
  } else if (type === 'OUT' && parsedQtyChange > 0) {
    parsedQtyChange = -parsedQtyChange;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verify product belongs to business
    const product = await inventoryRepo.findProductByIdAndBusiness(businessId, productId, client);
    if (!product) {
      throw { statusCode: 404, message: "Product not found or access denied." };
    }

    // 2. Insert into inventory_ledger
    const ledgerEntry = await inventoryRepo.createLedgerEntry(
      businessId,
      productId,
      parsedQtyChange,
      type,
      referenceId,
      notes,
      client
    );

    // 3. Update inventory available stock
    const inv = await inventoryRepo.findInventoryByProductId(productId, client);

    let updatedStock;
    if (inv) {
      const currentStock = parseFloat(inv.available_stock || 0);
      updatedStock = currentStock + parsedQtyChange;

      if (updatedStock < 0) {
        throw { statusCode: 400, message: "Insufficient stock available for this operation." };
      }

      await inventoryRepo.updateInventoryStock(productId, updatedStock, client);
    } else {
      updatedStock = parsedQtyChange;
      if (updatedStock < 0) {
        throw { statusCode: 400, message: "Stock cannot be negative." };
      }

      await inventoryRepo.createInventoryRecord(businessId, productId, updatedStock, client);
    }

    await client.query('COMMIT');
    return { ledgerEntry, newAvailableStock: updatedStock };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const recordStockIn = async (businessId, body) => {
  const { productId, quantity, referenceId, notes } = body;
  const parsedQuantity = parseFloat(quantity);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const product = await inventoryRepo.findProductByIdAndBusiness(businessId, productId, client);
    if (!product) {
      throw { statusCode: 404, message: "Product not found or access denied." };
    }

    const ledgerEntry = await inventoryRepo.createLedgerEntry(
      businessId,
      productId,
      parsedQuantity,
      'IN',
      referenceId,
      notes || "Stock intake / Goods Receipt",
      client
    );

    const inv = await inventoryRepo.findInventoryByProductId(productId, client);

    let updatedStock;
    if (inv) {
      const currentStock = parseFloat(inv.available_stock || 0);
      updatedStock = currentStock + parsedQuantity;
      await inventoryRepo.updateInventoryStock(productId, updatedStock, client);
    } else {
      updatedStock = parsedQuantity;
      await inventoryRepo.createInventoryRecord(businessId, productId, updatedStock, client);
    }

    await client.query('COMMIT');
    return { ledgerEntry, availableStock: updatedStock };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const recordStockOut = async (businessId, body) => {
  const { productId, quantity, referenceId, notes } = body;
  const parsedQuantity = parseFloat(quantity);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const product = await inventoryRepo.findProductByIdAndBusiness(businessId, productId, client);
    if (!product) {
      throw { statusCode: 404, message: "Product not found or access denied." };
    }

    const inv = await inventoryRepo.findInventoryByProductId(productId, client);
    const currentStock = inv ? parseFloat(inv.available_stock || 0) : 0;
    const updatedStock = currentStock - parsedQuantity;

    if (updatedStock < 0) {
      throw { statusCode: 400, message: "Insufficient stock available for stock-out." };
    }

    const ledgerEntry = await inventoryRepo.createLedgerEntry(
      businessId,
      productId,
      -Math.abs(parsedQuantity),
      'OUT',
      referenceId,
      notes || "Billing checkout / Stock reduction",
      client
    );

    await inventoryRepo.updateInventoryStock(productId, updatedStock, client);

    await client.query('COMMIT');
    return { ledgerEntry, availableStock: updatedStock };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const reconcileStock = async (businessId, body) => {
  const { productId, newStock, notes } = body;
  const parsedNewStock = parseFloat(newStock);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const product = await inventoryRepo.findProductByIdAndBusiness(businessId, productId, client);
    if (!product) {
      throw { statusCode: 404, message: "Product not found or access denied." };
    }

    const inv = await inventoryRepo.findInventoryByProductId(productId, client);
    const currentStock = inv ? parseFloat(inv.available_stock || 0) : 0;
    const qtyChange = parsedNewStock - currentStock;

    if (qtyChange === 0) {
      throw { statusCode: 400, message: "New stock is same as current stock. No adjustment needed." };
    }

    const ledgerEntry = await inventoryRepo.createLedgerEntry(
      businessId,
      productId,
      qtyChange,
      'ADJUST',
      null,
      notes || "Manual stock audit / reconciliation adjustment",
      client
    );

    if (inv) {
      await inventoryRepo.updateInventoryStock(productId, parsedNewStock, client);
    } else {
      await inventoryRepo.createInventoryRecord(businessId, productId, parsedNewStock, client);
    }

    await client.query('COMMIT');
    return { ledgerEntry, availableStock: parsedNewStock };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const listLedgerLogs = async (businessId, productId) => {
  const logs = await inventoryRepo.findLedgerLogs(businessId, productId);
  return logs;
};

export const listLowStockAlerts = async (businessId) => {
  const lowStockItems = await inventoryRepo.findLowStockAlerts(businessId);
  return { lowStockItems, count: lowStockItems.length };
};

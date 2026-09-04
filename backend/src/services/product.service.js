import { pool } from "../db/db.js";
import * as productRepo from "../repositories/product.repository.js";
import * as inventoryRepo from "../repositories/inventory.repository.js";

export const createProduct = async (businessId, body) => {
  const { openingStock, openingStockNotes } = body;
  const parsedOpeningStock = openingStock !== undefined && openingStock !== null
    ? parseFloat(openingStock)
    : null;

  // Check if SKU already exists for this business
  if (body.sku) {
    const existingProduct = await productRepo.findProductBySkuAndBusiness(businessId, body.sku);
    if (existingProduct) {
      throw { statusCode: 409, message: "A product with this SKU already exists for this business." };
    }
  }

  // T14: Resolve categoryName if categoryId not explicitly provided
  if (body.categoryName && !body.categoryId) {
    const category = await productRepo.findOrCreateCategory(businessId, body.categoryName);
    if (category) body.categoryId = category.id;
  }

  // T17: If openingStock is provided, run product creation + OPENING ledger seeding atomically
  if (parsedOpeningStock !== null) {
    if (isNaN(parsedOpeningStock) || parsedOpeningStock < 0) {
      throw { statusCode: 400, message: "Opening stock must be a non-negative number." };
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const product = await productRepo.createProductRecord(businessId, body, client);

      // Seed the OPENING ledger entry via DB function (atomic, guarded)
      await inventoryRepo.callInitializeOpeningStock(
        businessId,
        product.id,
        parsedOpeningStock,
        openingStockNotes || `Opening stock initialization — ${parsedOpeningStock} units seeded on product creation`,
        client
      );

      await client.query("COMMIT");
      return { ...product, openingStock: parsedOpeningStock, openingStockInitialized: true };
    } catch (error) {
      await client.query("ROLLBACK");
      if (error.message?.includes("OPENING_STOCK_DUPLICATE")) {
        throw { statusCode: 409, message: "Opening stock has already been initialized for this product." };
      }
      throw error;
    } finally {
      client.release();
    }
  }

  // No opening stock provided — standard product creation
  const product = await productRepo.createProductRecord(businessId, body);
  return { ...product, openingStockInitialized: false };
};


export const listProducts = async (businessId, queryParams) => {
  const search = queryParams.search || "";
  const limit = parseInt(queryParams.limit) || 20;
  const page = parseInt(queryParams.page) || 1;
  const offset = (page - 1) * limit;

  // isArchived: "true" → archived only, "false" → active only, undefined → all
  let isArchived;
  if (queryParams.isArchived === "true") isArchived = true;
  else if (queryParams.isArchived === "false") isArchived = false;

  // T14: category filter + sort support
  const categoryId = queryParams.categoryId || null;
  const sortBy = queryParams.sortBy || "created";
  const sortDir = queryParams.sortDir === "ASC" ? "ASC" : "DESC";

  const totalItems = await productRepo.countProducts(businessId, search, isArchived, categoryId);
  const products = await productRepo.findProductsList(businessId, search, limit, offset, isArchived, categoryId, sortBy, sortDir);

  return {
    products,
    pagination: {
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page,
      limit
    }
  };
};

export const editProduct = async (businessId, productId, body) => {
  // Check if product exists and belongs to this business
  const productCheck = await productRepo.findProductById(businessId, productId);
  if (!productCheck) {
    throw { statusCode: 404, message: "Product not found or access denied." };
  }

  // Check SKU uniqueness if SKU is being updated
  if (body.sku) {
    const existingProduct = await productRepo.findProductBySkuAndBusiness(businessId, body.sku);
    if (existingProduct && existingProduct.id !== productId) {
      throw { statusCode: 409, message: "A product with this SKU already exists." };
    }
  }

  // T14: Resolve categoryName if categoryId not explicitly provided
  if (body.categoryName && !body.categoryId) {
    const category = await productRepo.findOrCreateCategory(businessId, body.categoryName);
    if (category) body.categoryId = category.id;
  }

  const product = await productRepo.updateProductRecord(businessId, productId, body);
  return product;
};


export const archiveProduct = async (businessId, productId) => {
  // Check if product exists and belongs to this business
  const productCheck = await productRepo.findProductById(businessId, productId);
  if (!productCheck) {
    throw { statusCode: 404, message: "Product not found or access denied." };
  }

  const product = await productRepo.archiveProductRecord(businessId, productId);
  return product;
};

// T14: Instant search — typeahead / POS fast lookup
// Returns minimal payload: id, name, sku, barcode, price, unit, stock, category
export const instantSearchProducts = async (businessId, q, limit = 10) => {
  const results = await productRepo.findProductsInstantSearch(businessId, q, limit);
  return results.map(p => ({
    id: p.id,
    name: p.name,
    sku: p.sku || null,
    barcode: p.barcode || null,
    selling_price: parseFloat(p.selling_price),
    cost_price: parseFloat(p.cost_price),
    unit: p.unit || "pcs",
    category_name: p.category_name || null,
    available_stock: parseFloat(p.available_stock || 0),
    margin_pct: parseFloat(p.margin_pct || 0),
  }));
};

// T14: Get all categories for filter dropdown
export const getCategories = async (businessId) => {
  return productRepo.findCategoriesList(businessId);
};
import * as productRepo from "../repositories/product.repository.js";

export const createProduct = async (businessId, body) => {
  // Check if SKU already exists for this business
  if (body.sku) {
    const existingProduct = await productRepo.findProductBySkuAndBusiness(businessId, body.sku);
    if (existingProduct) {
      throw { statusCode: 409, message: "A product with this SKU already exists for this business." };
    }
  }

  const product = await productRepo.createProductRecord(businessId, body);
  return product;
};

export const listProducts = async (businessId, queryParams) => {
  const search = queryParams.search || "";
  const limit = parseInt(queryParams.limit) || 20;
  const page = parseInt(queryParams.page) || 1;
  const offset = (page - 1) * limit;

  const totalItems = await productRepo.countProducts(businessId, search);
  const products = await productRepo.findProductsList(businessId, search, limit, offset);

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
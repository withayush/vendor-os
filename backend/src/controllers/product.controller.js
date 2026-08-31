import * as productService from "../services/product.service.js";

// Add Product API (Task T9)
export const createProduct = async (req, res, next) => {
  try {
    const businessId = req.businessId;
    const product = await productService.createProduct(businessId, req.body);

    return res.status(201).json({
      success: true,
      message: "Product added successfully.",
      data: { product }
    });
  } catch (error) {
    console.error("Error in createProduct:", error);
    next(error);
  }
};

// Get Products with Search & Pagination (Task T14)
export const getProducts = async (req, res, next) => {
  try {
    const businessId = req.businessId;
    const result = await productService.listProducts(businessId, req.query);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Error in getProducts:", error);
    next(error);
  }
};

// Update Product API (Task T10)
export const updateProduct = async (req, res, next) => {
  try {
    const businessId = req.businessId;
    const { id } = req.params;

    const product = await productService.editProduct(businessId, id, req.body);

    return res.status(200).json({
      success: true,
      message: "Product updated successfully.",
      data: { product }
    });
  } catch (error) {
    console.error("Error in updateProduct:", error);
    next(error);
  }
};

// Archive / Soft-Delete Product API (Task T11)
export const deleteProduct = async (req, res, next) => {
  try {
    const businessId = req.businessId;
    const { id } = req.params;

    const product = await productService.archiveProduct(businessId, id);

    return res.status(200).json({
      success: true,
      message: "Product archived successfully (soft-deleted to preserve invoice history).",
      data: { product }
    });
  } catch (error) {
    console.error("Error in deleteProduct:", error);
    next(error);
  }
};
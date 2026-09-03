import express from "express";
import { 
  createProduct, 
  getProducts, 
  updateProduct, 
  deleteProduct,
  searchProducts,
  getProductCategories
} from "../controllers/product.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { verifyBusinessAccess } from "../middlewares/business.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createProductSchema, updateProductSchema } from "../validations/product.validation.js";

const router = express.Router();

router.post(
  "/", 
  verifyToken, 
  verifyBusinessAccess(["OWNER", "MANAGER", "STAFF"]), 
  validate(createProductSchema),
  createProduct
);
router.get("/", verifyToken, verifyBusinessAccess(), getProducts);

// T14: Product Elastic Search & Filter Endpoints (must precede /:id)
router.get("/search", verifyToken, verifyBusinessAccess(), searchProducts);
router.get("/categories", verifyToken, verifyBusinessAccess(), getProductCategories);

// T10: Update Product API Endpoint
router.put(
  "/:id",
  verifyToken,
  verifyBusinessAccess(["OWNER", "MANAGER"]),
  validate(updateProductSchema),
  updateProduct
);

// T11: Archive / Soft-Delete Product API Endpoint
router.delete(
  "/:id",
  verifyToken,
  verifyBusinessAccess(["OWNER", "MANAGER"]),
  deleteProduct
);

export default router;
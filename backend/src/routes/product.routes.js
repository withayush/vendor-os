import express from "express";
import { createProduct, getProducts } from "../controllers/product.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { verifyBusinessAccess } from "../middlewares/business.middleware.js";

const router = express.Router();

// Owner, Manager, or Staff can add and view products for their business
router.post("/", verifyToken, verifyBusinessAccess(["OWNER", "MANAGER", "STAFF"]), createProduct);
router.get("/", verifyToken, verifyBusinessAccess(), getProducts);

export default router;
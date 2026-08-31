import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import businessRoutes from "./routes/business.routes.js";
import productRoutes from "./routes/product.routes.js";
import vendorRoutes from "./routes/vendor.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import salesRoutes from "./routes/sales.routes.js";
import customerRoutes from "./routes/customer.routes.js";
const app = express();

// =====================================================
// GLOBAL MIDDLEWARE
// =====================================================

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Parse JSON request bodies
app.use(express.json());

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "OK",
    message: "VendorOS backend is running.",
    timestamp: new Date().toISOString(),
  });
});

// =====================================================
// API ROUTES
// =====================================================

app.use("/api/v1/auth", authRoutes);

app.use("/api/v1/businesses", businessRoutes);

app.use("/api/v1/products", productRoutes);

app.use("/api/v1/vendors", vendorRoutes);

app.use("/api/v1/inventory", inventoryRoutes);

app.use("/api/v1/sales", salesRoutes);

app.use("/api/v1/customers", customerRoutes);

// =====================================================
// 404 HANDLER
// =====================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found.",
    path: req.originalUrl,
  });
});

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use((err, req, res, next) => {
  console.error("\n❌ UNHANDLED SERVER ERROR");
  console.error("Message:", err.message);
  console.error("Stack:", err.stack);

  res.status(err.status || err.statusCode || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "development" || err.status || err.statusCode
        ? err.message
        : "Internal server error.",
  });
});

export default app;
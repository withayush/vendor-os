import { query } from "../db/db.js";

// Add Product API
export const createProduct = async (req, res) => {
  try {
    const businessId = req.headers["x-business-id"];
    const { name, description, sku, price, cost_price, stock_quantity, unit } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ success: false, message: "Product name and price are required." });
    }

    const result = await query(
      `INSERT INTO products (business_id, name, description, sku, price, cost_price, stock_quantity, unit) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [businessId, name, description, sku, price, cost_price || 0, stock_quantity || 0, unit || "pcs"]
    );

    return res.status(201).json({
      success: true,
      message: "Product added successfully.",
      data: {
        product: result.rows[0]
      }
    });
  } catch (error) {
    console.error("Error in createProduct:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Get All Products for the Business API
export const getProducts = async (req, res) => {
  try {
    const businessId = req.headers["x-business-id"];

    const result = await query(
      `SELECT * FROM products WHERE business_id = $1 ORDER BY created_at DESC`,
      [businessId]
    );

    return res.status(200).json({
      success: true,
      data: {
        products: result.rows
      }
    });
  } catch (error) {
    console.error("Error in getProducts:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
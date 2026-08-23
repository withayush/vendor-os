import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({ 
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "vendor_os",
});

// Database connection verify karne ke liye yeh add karein
pool.connect((err, client, release) => {
  if (err) {
    return console.error("Error acquiring client", err.stack);
  }
  console.log("PostgreSQL database connected successfully!");
  release();
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL error:", error);
});

export const query = (text, params) => {
  return pool.query(text, params);
};

export { pool };
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as dbModule from "./db.js";

// Handle both named export ({ pool }) and default export (pool)
const pool = dbModule.pool || dbModule.default;

if (!pool) {
  console.error("Database pool instance not found in db.js. Check your exports.");
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initializeDatabase() {
  try {
    const schemaPath = path.join(__dirname, "schema.sql");

    if (!fs.existsSync(schemaPath)) {
      throw new Error(`schema.sql not found at ${schemaPath}. Please create the file.`);
    }

    const schemaSql = fs.readFileSync(schemaPath, "utf8");

    console.log("Connecting and executing schema.sql...");
    await pool.query(schemaSql);
    console.log("Database schema initialized successfully (8 tables, indexes & triggers created).");
  } catch (error) {
    console.error("Database initialization failed:", error.message);
  } finally {
    await pool.end();
  }
}

initializeDatabase();
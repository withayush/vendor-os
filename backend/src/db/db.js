import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const requiredEnv = [
  "DB_USER",
  "DB_PASSWORD",
  "DB_HOST",
  "DB_PORT",
  "DB_NAME",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,

  // Pool configuration
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Unexpected idle client error
pool.on("error", (error) => {
  console.error("\n❌ PostgreSQL Pool Error");
  console.error(error);
});

export const query = (text, params) => {
  return pool.query(text, params);
};
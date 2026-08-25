import "dotenv/config";
import app from "./src/app.js";
import { pool } from "./src/db/db.js";

const PORT = Number(process.env.PORT) || 3000;

const startServer = async () => {
  try {
    console.log("\n========================================");
    console.log("        VendorOS Backend Starting");
    console.log("========================================");

    // -----------------------------------------
    // 1. Check Database Connection
    // -----------------------------------------

    console.log("⏳ Connecting to PostgreSQL...");

    const client = await pool.connect();

    try {
      const result = await client.query(
        "SELECT NOW() AS current_time"
      );

      console.log("✅ PostgreSQL connected successfully");
      console.log(`   Database: ${process.env.DB_NAME}`);
      console.log(`   Host: ${process.env.DB_HOST}`);
      console.log(`   Port: ${process.env.DB_PORT}`);
      console.log(`   DB Time: ${result.rows[0].current_time}`);
    } finally {
      client.release();
    }

    // -----------------------------------------
    // 2. Start Express Server
    // -----------------------------------------

    const server = app.listen(PORT, () => {
      console.log("\n========================================");
      console.log("        VendorOS Backend Ready");
      console.log("========================================");
      console.log(`🚀 Server: http://localhost:${PORT}`);
      console.log(`❤️  Health: http://localhost:${PORT}/health`);
      console.log(`🔐 Auth:   http://localhost:${PORT}/api/v1/auth`);
      console.log("========================================\n");
    });

    // -----------------------------------------
    // 3. Handle Server Errors
    // -----------------------------------------

    server.on("error", (error) => {
      console.error("\n❌ SERVER ERROR");

      if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use.`);
      } else {
        console.error(error);
      }

      process.exit(1);
    });

    // -----------------------------------------
    // 4. Graceful Shutdown
    // -----------------------------------------

    const shutdown = async (signal) => {
      console.log(`\n⚠️  ${signal} received.`);
      console.log("Shutting down VendorOS...");

      server.close(async () => {
        console.log("✅ HTTP server closed.");

        try {
          await pool.end();
          console.log("✅ PostgreSQL connection pool closed.");
          console.log("👋 VendorOS stopped safely.");

          process.exit(0);
        } catch (error) {
          console.error("❌ Error closing PostgreSQL:", error);
          process.exit(1);
        }
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

  } catch (error) {
    console.error("\n========================================");
    console.error("❌ VENDOROS STARTUP FAILED");
    console.error("========================================");

    console.error("Reason:", error.message);

    if (error.code) {
      console.error("Error Code:", error.code);
    }

    console.error("\nServer was NOT started.");

    process.exit(1);
  }
};

startServer();
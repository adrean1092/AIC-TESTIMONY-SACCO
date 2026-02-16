const { Pool } = require("pg");
require("dotenv").config();

// Use DATABASE_URL if available (Render default), otherwise use individual variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false, // Force SSL for remote DB
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased for remote DB
});

pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL database");
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL connection error:", err.message);
  process.exit(1);
});

// Test connection immediately
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ Database connection test failed:", err.message);
  } else {
    console.log("✅ Database connection test successful at:", res.rows[0].now);
  }
});

module.exports = pool;
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }, // FORCE SSL
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // increased for remote DB
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
    console.log("✅ Database connection test successful");
  }
});

module.exports = pool;

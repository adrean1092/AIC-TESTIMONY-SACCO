const { Pool } = require("pg");
require("dotenv").config();

let pool;

// Try to use DATABASE_URL first, fallback to individual variables
if (process.env.DATABASE_URL) {
  console.log("📡 Using DATABASE_URL for connection");
  
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
} else {
  // Fallback to individual environment variables
  console.log("📡 Using individual environment variables for connection");
  
  // Validate required variables
  const requiredVars = ['DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_NAME'];
  const missing = requiredVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
  
  // Ensure password is a string
  const dbPassword = String(process.env.DB_PASSWORD || '');
  
  if (!dbPassword) {
    console.error('❌ DB_PASSWORD cannot be empty');
    process.exit(1);
  }
  
  pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: dbPassword, // Explicitly convert to string
    port: parseInt(process.env.DB_PORT || '5432'),
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL database");
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL connection error:", err.message);
  // Don't exit on pool errors, just log them
});

// Test connection immediately
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ Database connection test failed:", err.message);
    console.error("Full error:", err);
    
    // Log configuration (without sensitive data)
    console.log("\n🔍 Checking configuration:");
    console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);
    console.log("DB_USER:", process.env.DB_USER);
    console.log("DB_HOST:", process.env.DB_HOST);
    console.log("DB_NAME:", process.env.DB_NAME);
    console.log("DB_PORT:", process.env.DB_PORT);
    console.log("DB_PASSWORD exists:", !!process.env.DB_PASSWORD);
    console.log("DB_PASSWORD type:", typeof process.env.DB_PASSWORD);
    console.log("DB_PASSWORD length:", process.env.DB_PASSWORD?.length);
  } else {
    console.log("✅ Database connection test successful at:", res.rows[0].now);
  }
});

module.exports = pool;
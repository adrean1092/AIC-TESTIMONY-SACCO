require("dotenv").config();
const pool = require("../db");

async function migrate() {
  console.log("Starting migration: Adding payment tracking columns...");

  try {
    /* 1️⃣ Add columns */
    await pool.query(`
      ALTER TABLE loans
      ADD COLUMN IF NOT EXISTS principal_paid NUMERIC(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS interest_paid NUMERIC(10,2) DEFAULT 0;
    `);

    console.log("✓ Added principal_paid and interest_paid columns");

    /* 2️⃣ Initialize values */
    await pool.query(`
      UPDATE loans
      SET
        principal_paid = COALESCE(principal_paid, 0),
        interest_paid = COALESCE(interest_paid, 0);
    `);

    console.log("✓ Initialized payment tracking for existing loans");

    /* 3️⃣ Backfill using existing data */
    await pool.query(`
      UPDATE loans
      SET
        interest_paid = COALESCE(interest, 0),
        principal_paid = GREATEST(
          COALESCE(total_paid, 0) - COALESCE(interest, 0),
          0
        )
      WHERE total_paid IS NOT NULL;
    `);

    console.log("✓ Calculated payment breakdown for existing loans");

    console.log("✅ Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  }
}

migrate();

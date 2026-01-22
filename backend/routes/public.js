// Create a new file: routes/public.js

const express = require("express");
const router = express.Router();
const pool = require("../db");

// GET public stats (no auth required)
router.get("/stats", async (req, res) => {
  try {
    // Count members
    const membersRes = await pool.query(
      "SELECT COUNT(*) FROM users WHERE role='MEMBER'"
    );

    // Sum total loans (all approved loans - use initial_amount to show total disbursed)
    const loansRes = await pool.query(
      "SELECT COALESCE(SUM(initial_amount), 0) AS total FROM loans WHERE status='APPROVED'"
    );

    // Sum total savings (use amount column, not balance)
    const savingsRes = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM savings"
    );

    res.json({
      members: parseInt(membersRes.rows[0].count),
      totalLoans: parseFloat(loansRes.rows[0].total),
      totalSavings: parseFloat(savingsRes.rows[0].total)
    });
  } catch (err) {
    console.error("Error fetching public stats:", err);
    res.status(500).json({ 
      message: "Server error",
      members: 0,
      totalLoans: 0,
      totalSavings: 0
    });
  }
});

module.exports = router;
const express = require("express");
const router = express.Router();
const pool = require("../db");
const auth = require("../middleware/auth");
const bcrypt = require("bcryptjs");

// GET member dashboard
router.get("/me", auth, async (req, res) => {
  if (req.user.role !== "MEMBER") return res.status(403).json({ message: "Forbidden" });

  try {
    const memberRes = await pool.query(
      "SELECT id, full_name AS name, email, loan_limit FROM users WHERE id=$1", 
      [req.user.id]
    );
    
    const savingsRes = await pool.query(
      "SELECT SUM(amount) AS savings FROM savings WHERE user_id=$1", 
      [req.user.id]
    );
    
    const loansRes = await pool.query(
      `SELECT 
        id, 
        amount, 
        initial_amount, 
        principal_amount, 
        COALESCE(principal_paid, 0) as principal_paid,
        COALESCE(interest_paid, 0) as interest_paid,
        status, 
        interest_rate, 
        repayment_period, 
        created_at 
       FROM loans 
       WHERE user_id=$1 
       ORDER BY created_at DESC`, 
      [req.user.id]
    );

    res.json({
      id: memberRes.rows[0].id,
      name: memberRes.rows[0].name,
      email: memberRes.rows[0].email,
      savings: parseFloat(savingsRes.rows[0].savings) || 0,
      loanLimit: parseFloat(memberRes.rows[0].loan_limit) || 0,
      loans: loansRes.rows.map(l => ({
        id: l.id,
        amount: parseFloat(l.amount),
        initialAmount: parseFloat(l.initial_amount || l.amount),
        principalAmount: parseFloat(l.principal_amount || l.amount),
        principalPaid: parseFloat(l.principal_paid),
        interestPaid: parseFloat(l.interest_paid),
        status: l.status,
        interestRate: parseFloat(l.interest_rate),
        repaymentPeriod: l.repayment_period,
        createdAt: l.created_at
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Change password
router.put("/change-password", auth, async (req, res) => {
  if (req.user.role !== "MEMBER") return res.status(403).json({ message: "Forbidden" });
  
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Current password and new password are required" });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ message: "New password must be at least 6 characters" });
  }

  try {
    // Get current password from database
    const userRes = await pool.query("SELECT password FROM users WHERE id=$1", [req.user.id]);
    
    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const user = userRes.rows[0];
    
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await pool.query("UPDATE users SET password=$1 WHERE id=$2", [hashedPassword, req.user.id]);
    
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get savings history
router.get("/savings-history", auth, async (req, res) => {
  if (req.user.role !== "MEMBER") return res.status(403).json({ message: "Forbidden" });
  
  try {
    const savingsHistory = await pool.query(
      "SELECT id, amount, saved_at FROM savings WHERE user_id=$1 ORDER BY saved_at DESC",
      [req.user.id]
    );
    
    res.json({
      history: savingsHistory.rows.map(s => ({
        id: s.id,
        amount: parseFloat(s.amount),
        savedAt: s.saved_at
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
const express = require("express");
const router = express.Router();
const pool = require("../db");
const auth = require("../middleware/auth");
const bcrypt = require("bcryptjs");

// ======== MEMBERS MANAGEMENT ========

// Get all members
router.get("/members", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  try {
    const members = await pool.query(`
      SELECT 
        u.id, 
        u.full_name, 
        u.id_number, 
        u.email, 
        u.phone, 
        u.role,
        u.sacco_number,
        COALESCE(SUM(s.amount), 0) AS savings
      FROM users u
      LEFT JOIN savings s ON s.user_id = u.id
      GROUP BY u.id, u.full_name, u.id_number, u.email, u.phone, u.role, u.sacco_number
      ORDER BY u.created_at DESC
    `);
    res.json(members.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Generate next sacco number
async function generateSaccoNumber() {
  try {
    const result = await pool.query(
      "SELECT sacco_number FROM users WHERE sacco_number IS NOT NULL ORDER BY sacco_number DESC LIMIT 1"
    );
    
    if (result.rows.length === 0) {
      return "SACCO-0001";
    }
    
    const lastNumber = result.rows[0].sacco_number.split('-')[1];
    const nextNumber = parseInt(lastNumber) + 1;
    return `SACCO-${String(nextNumber).padStart(4, '0')}`;
  } catch (err) {
    console.error("Error generating sacco number:", err);
    throw err;
  }
}

// Add member or admin
router.post("/members", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  
  const { full_name, id_number, email, phone, password, role } = req.body;
  
  if (!full_name || !id_number || !email || !phone || !password || !role) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (role !== "ADMIN" && role !== "MEMBER") {
    return res.status(400).json({ message: "Role must be either ADMIN or MEMBER" });
  }

  try {
    const existingId = await pool.query("SELECT id FROM users WHERE id_number=$1", [id_number]);
    if (existingId.rows.length > 0) {
      return res.status(400).json({ message: "ID number already exists" });
    }

    const existingEmail = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
    if (existingEmail.rows.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    let newUser;
    
    if (role === "MEMBER") {
      const saccoNumber = await generateSaccoNumber();
      newUser = await pool.query(
        `INSERT INTO users (full_name, id_number, email, phone, password, role, sacco_number) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [full_name, id_number, email, phone, hashedPassword, role, saccoNumber]
      );
    } else {
      newUser = await pool.query(
        `INSERT INTO users (full_name, id_number, email, phone, password, role) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [full_name, id_number, email, phone, hashedPassword, role]
      );
    }
    
    delete newUser.rows[0].password;
    res.json({
      message: `${role} added successfully`,
      user: newUser.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update member
router.put("/members/:id", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  const { id } = req.params;
  const { full_name, id_number, email, phone } = req.body;
  
  try {
    const updated = await pool.query(
      `UPDATE users SET full_name=$1, id_number=$2, email=$3, phone=$4 
       WHERE id=$5 RETURNING *`,
      [full_name, id_number, email, phone, id]
    );
    
    if (updated.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    delete updated.rows[0].password;
    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete member
router.delete("/members/:id", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  const { id } = req.params;
  
  try {
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }
    
    await pool.query("DELETE FROM users WHERE id=$1", [id]);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Add savings to member
router.post("/members/:id/savings", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  const { id } = req.params;
  const { amount } = req.body;
  
  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ message: "Invalid amount" });
  }

  try {
    const userCheck = await pool.query("SELECT role FROM users WHERE id=$1", [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    if (userCheck.rows[0].role !== "MEMBER") {
      return res.status(400).json({ message: "Only members can have savings" });
    }
    
    await pool.query(
      "INSERT INTO savings (user_id, amount, saved_at) VALUES ($1, $2, NOW())",
      [id, parseFloat(amount)]
    );
    
    res.json({ message: "Savings added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ======== LOANS MANAGEMENT ========

// Get all loans - UPDATED TO INCLUDE GUARANTOR ID AND PHONE
router.get("/loans", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  
  try {
    const loans = await pool.query(`
      SELECT 
        l.id, 
        l.amount, 
        l.principal_amount,
        l.initial_amount,
        l.principal_paid,
        l.interest_paid,
        l.interest_rate, 
        l.repayment_period, 
        l.status,
        u.full_name AS "memberName",
        u.sacco_number AS "saccoNumber",
        g.guarantor_name AS "guarantorName",
        g.guarantor_email AS "guarantorEmail",
        g.guarantor_id_number AS "guarantorIdNumber",
        g.guarantor_phone AS "guarantorPhone"
      FROM loans l
      JOIN users u ON l.user_id = u.id
      LEFT JOIN guarantors g ON g.loan_id = l.id
      WHERE u.role = 'MEMBER'
      ORDER BY l.created_at DESC
    `);
    res.json(loans.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Approve loan
router.put("/loans/:id/approve", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  const { id } = req.params;
  
  try {
    const loanRes = await pool.query(
      "SELECT user_id, principal_amount, status FROM loans WHERE id=$1",
      [id]
    );
    
    if (loanRes.rows.length === 0) {
      return res.status(404).json({ message: "Loan not found" });
    }
    
    const loan = loanRes.rows[0];
    
    if (loan.status === 'APPROVED') {
      return res.status(400).json({ message: "Loan already approved" });
    }
    
    const principalAmount = parseFloat(loan.principal_amount);
    
    const memberRes = await pool.query(
      "SELECT loan_limit FROM users WHERE id=$1",
      [loan.user_id]
    );
    
    if (memberRes.rows.length === 0) {
      return res.status(404).json({ message: "Member not found" });
    }
    
    const currentLimit = parseFloat(memberRes.rows[0].loan_limit || 0);
    
    if (principalAmount > currentLimit) {
      return res.status(400).json({ 
        message: `Insufficient loan limit. Available: KES ${currentLimit.toLocaleString()}, Requested: KES ${principalAmount.toLocaleString()}` 
      });
    }
    
    const newLimit = currentLimit - principalAmount;
    
    await pool.query(
      "UPDATE users SET loan_limit=$1 WHERE id=$2",
      [newLimit, loan.user_id]
    );
    
    const approved = await pool.query(
      "UPDATE loans SET status='APPROVED' WHERE id=$1 RETURNING *",
      [id]
    );
    
    res.json({
      ...approved.rows[0],
      message: `Loan approved. New loan limit: KES ${newLimit.toLocaleString()}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Reject loan
router.put("/loans/:id/reject", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  const { id } = req.params;
  
  try {
    const rejected = await pool.query(
      "UPDATE loans SET status='REJECTED' WHERE id=$1 RETURNING *",
      [id]
    );
    
    if (rejected.rows.length === 0) {
      return res.status(404).json({ message: "Loan not found" });
    }
    
    res.json(rejected.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Record loan payment - FIXED VERSION
router.put("/loans/:id/payment", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  const { id } = req.params;
  const { amount } = req.body;
  
  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ message: "Invalid payment amount" });
  }

  try {
    const loanRes = await pool.query(
      `SELECT user_id, amount, principal_amount, initial_amount, 
              COALESCE(principal_paid, 0) as principal_paid,
              COALESCE(interest_paid, 0) as interest_paid
       FROM loans WHERE id=$1`, 
      [id]
    );
    
    if (!loanRes.rows[0]) {
      return res.status(404).json({ message: "Loan not found" });
    }
    
    const loan = loanRes.rows[0];
    const currentBalance = parseFloat(loan.amount);
    const principalAmount = parseFloat(loan.principal_amount);
    const initialAmount = parseFloat(loan.initial_amount);
    const paymentAmount = parseFloat(amount);
    const principalPaid = parseFloat(loan.principal_paid);
    const interestPaid = parseFloat(loan.interest_paid);
    
    if (paymentAmount > currentBalance) {
      return res.status(400).json({ 
        message: `Payment amount (KES ${paymentAmount.toLocaleString()}) exceeds loan balance (KES ${currentBalance.toLocaleString()})` 
      });
    }
    
    // Calculate interest and principal portions
    // Interest is paid first, then principal
    const totalInterest = initialAmount - principalAmount;
    const remainingInterest = totalInterest - interestPaid;
    
    let interestPortion = Math.min(paymentAmount, remainingInterest);
    let principalPortion = paymentAmount - interestPortion;
    
    const newBalance = currentBalance - paymentAmount;
    const newPrincipalPaid = principalPaid + principalPortion;
    const newInterestPaid = interestPaid + interestPortion;
    
    // Update loan with new values
    await pool.query(
      `UPDATE loans 
       SET amount=$1, principal_paid=$2, interest_paid=$3 
       WHERE id=$4`,
      [newBalance, newPrincipalPaid, newInterestPaid, id]
    );
    
    // Restore loan limit for principal portion only
    if (principalPortion > 0) {
      await pool.query(
        "UPDATE users SET loan_limit = loan_limit + $1 WHERE id=$2",
        [principalPortion, loan.user_id]
      );
    }
    
    // Get updated loan limit
    const memberRes = await pool.query(
      "SELECT loan_limit FROM users WHERE id=$1",
      [loan.user_id]
    );
    
    const newLoanLimit = parseFloat(memberRes.rows[0].loan_limit);
    
    res.json({ 
      message: "Payment recorded successfully", 
      remaining: newBalance,
      paid: paymentAmount,
      breakdown: {
        interestPaid: parseFloat(interestPortion.toFixed(2)),
        principalPaid: parseFloat(principalPortion.toFixed(2))
      },
      totals: {
        totalInterestPaid: parseFloat(newInterestPaid.toFixed(2)),
        totalPrincipalPaid: parseFloat(newPrincipalPaid.toFixed(2)),
        totalInterest: parseFloat(totalInterest.toFixed(2)),
        totalPrincipal: principalAmount
      },
      newLoanLimit: newLoanLimit,
      fullyPaid: newBalance === 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ======== REPORTS ========

// Get individual member report
router.get("/reports/member/:id", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  const { id } = req.params;
  const { month, year } = req.query;
  
  try {
    const memberRes = await pool.query(
      "SELECT id, full_name, sacco_number, email, phone, loan_limit FROM users WHERE id=$1 AND role='MEMBER'",
      [id]
    );
    
    if (memberRes.rows.length === 0) {
      return res.status(404).json({ message: "Member not found" });
    }
    
    const member = memberRes.rows[0];
    
    let dateFilter = "";
    let params = [id];
    
    if (month && year) {
      dateFilter = "AND EXTRACT(MONTH FROM saved_at) = $2 AND EXTRACT(YEAR FROM saved_at) = $3";
      params.push(parseInt(month), parseInt(year));
    } else if (year) {
      dateFilter = "AND EXTRACT(YEAR FROM saved_at) = $2";
      params.push(parseInt(year));
    }
    
    const savingsRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count 
       FROM savings WHERE user_id=$1 ${dateFilter}`,
      params
    );
    
    const loansParams = month && year 
      ? [id, parseInt(month), parseInt(year)]
      : year 
        ? [id, parseInt(year)]
        : [id];
    
    const loansDateFilter = month && year
      ? "AND EXTRACT(MONTH FROM created_at) = $2 AND EXTRACT(YEAR FROM created_at) = $3"
      : year
        ? "AND EXTRACT(YEAR FROM created_at) = $2"
        : "";
    
    const loansRes = await pool.query(
      `SELECT id, amount, initial_amount, principal_amount, principal_paid, interest_paid, 
              status, interest_rate, created_at 
       FROM loans WHERE user_id=$1 ${loansDateFilter} ORDER BY created_at DESC`,
      loansParams
    );
    
    const savingsHistoryRes = await pool.query(
      `SELECT amount, saved_at FROM savings WHERE user_id=$1 ${dateFilter} ORDER BY saved_at DESC`,
      params
    );
    
    res.json({
      member: {
        id: member.id,
        name: member.full_name,
        saccoNumber: member.sacco_number,
        email: member.email,
        phone: member.phone,
        loanLimit: parseFloat(member.loan_limit)
      },
      period: { month, year },
      summary: {
        totalSavings: parseFloat(savingsRes.rows[0].total),
        savingsCount: parseInt(savingsRes.rows[0].count),
        totalLoans: loansRes.rows.length,
        activeLoans: loansRes.rows.filter(l => l.status === 'APPROVED' && l.amount > 0).length
      },
      loans: loansRes.rows.map(l => ({
        id: l.id,
        amount: parseFloat(l.amount),
        initialAmount: parseFloat(l.initial_amount || l.amount),
        principalAmount: parseFloat(l.principal_amount || l.amount),
        principalPaid: parseFloat(l.principal_paid || 0),
        interestPaid: parseFloat(l.interest_paid || 0),
        status: l.status,
        interestRate: parseFloat(l.interest_rate),
        createdAt: l.created_at
      })),
      savingsHistory: savingsHistoryRes.rows.map(s => ({
        amount: parseFloat(s.amount),
        savedAt: s.saved_at
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all members report
router.get("/reports/all", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  const { month, year } = req.query;
  
  try {
    let savingsDateFilter = "";
    let loansDateFilter = "";
    let savingsParams = [];
    let loansParams = [];
    
    if (month && year) {
      savingsDateFilter = "WHERE EXTRACT(MONTH FROM saved_at) = $1 AND EXTRACT(YEAR FROM saved_at) = $2";
      loansDateFilter = "WHERE EXTRACT(MONTH FROM created_at) = $1 AND EXTRACT(YEAR FROM created_at) = $2";
      savingsParams = [parseInt(month), parseInt(year)];
      loansParams = [parseInt(month), parseInt(year)];
    } else if (year) {
      savingsDateFilter = "WHERE EXTRACT(YEAR FROM saved_at) = $1";
      loansDateFilter = "WHERE EXTRACT(YEAR FROM created_at) = $1";
      savingsParams = [parseInt(year)];
      loansParams = [parseInt(year)];
    }
    
    const membersRes = await pool.query("SELECT COUNT(*) FROM users WHERE role='MEMBER'");
    
    const savingsRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM savings ${savingsDateFilter}`,
      savingsParams
    );
    
    const loansRes = await pool.query(
      `SELECT COALESCE(SUM(initial_amount), 0) AS total, COUNT(*) AS count 
       FROM loans ${loansDateFilter}`,
      loansParams
    );
    
    const activeLoansRes = await pool.query(
      "SELECT COUNT(*) FROM loans WHERE status='APPROVED' AND amount > 0"
    );
    
    const memberBreakdownRes = await pool.query(`
      SELECT 
        u.id,
        u.full_name,
        u.sacco_number,
        u.loan_limit,
        COALESCE(SUM(s.amount), 0) AS total_savings,
        COUNT(DISTINCT l.id) AS total_loans
      FROM users u
      LEFT JOIN savings s ON s.user_id = u.id
      LEFT JOIN loans l ON l.user_id = u.id
      WHERE u.role = 'MEMBER'
      GROUP BY u.id, u.full_name, u.sacco_number, u.loan_limit
      ORDER BY u.full_name
    `);
    
    res.json({
      period: { month, year },
      summary: {
        totalMembers: parseInt(membersRes.rows[0].count),
        totalSavings: parseFloat(savingsRes.rows[0].total),
        totalLoans: parseFloat(loansRes.rows[0].total),
        loansCount: parseInt(loansRes.rows[0].count),
        activeLoans: parseInt(activeLoansRes.rows[0].count)
      },
      members: memberBreakdownRes.rows.map(m => ({
        id: m.id,
        name: m.full_name,
        saccoNumber: m.sacco_number,
        loanLimit: parseFloat(m.loan_limit),
        totalSavings: parseFloat(m.total_savings),
        totalLoans: parseInt(m.total_loans)
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
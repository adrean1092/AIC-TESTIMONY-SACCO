const express = require("express");
const router = express.Router();
const pool = require("../db");
const auth = require("../middleware/auth");
const bcrypt = require("bcryptjs");

// ======== MEMBERS MANAGEMENT ========

// Get all members - FIXED: Removed guarantor join to prevent duplicates
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
        u.loan_limit,
        COALESCE(SUM(s.amount), 0) AS savings
      FROM users u
      LEFT JOIN savings s ON s.user_id = u.id
      GROUP BY u.id, u.full_name, u.id_number, u.email, u.phone, u.role, u.sacco_number, u.loan_limit
      ORDER BY u.created_at DESC
    `);
    res.json(members.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Generate next sacco number (fallback if not manually provided)
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

// ✅ NEW: Add member or admin with optional existing loan and manual SACCO number
router.post("/members", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  
  const { 
    full_name, 
    id_number, 
    email, 
    phone, 
    password, 
    role,
    sacco_number, // ✅ NEW: Manual SACCO number
    initial_savings, // ✅ NEW: Initial savings amount
    existing_loan // ✅ NEW: Optional existing loan details
  } = req.body;
  
  if (!full_name || !id_number || !email || !phone || !password || !role) {
    return res.status(400).json({ message: "All required fields must be provided" });
  }

  if (role !== "ADMIN" && role !== "MEMBER") {
    return res.status(400).json({ message: "Role must be either ADMIN or MEMBER" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Check for existing ID number
    const existingId = await client.query("SELECT id FROM users WHERE id_number=$1", [id_number]);
    if (existingId.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "ID number already exists" });
    }

    // Check for existing email
    const existingEmail = await client.query("SELECT id FROM users WHERE email=$1", [email]);
    if (existingEmail.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Email already exists" });
    }

    // ✅ NEW: Validate manual SACCO number if provided
    let finalSaccoNumber = null;
    if (role === "MEMBER") {
      if (sacco_number) {
        // Check if manual SACCO number already exists
        const existingSacco = await client.query(
          "SELECT id FROM users WHERE sacco_number=$1", 
          [sacco_number]
        );
        if (existingSacco.rows.length > 0) {
          await client.query("ROLLBACK");
          return res.status(400).json({ message: "SACCO number already exists" });
        }
        finalSaccoNumber = sacco_number;
      } else {
        // Auto-generate if not provided
        finalSaccoNumber = await generateSaccoNumber();
      }
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    
    // Create user
    let newUser;
    if (role === "MEMBER") {
      newUser = await client.query(
        `INSERT INTO users (full_name, id_number, email, phone, password, role, sacco_number) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [full_name, id_number, email, phone, hashedPassword, role, finalSaccoNumber]
      );
    } else {
      newUser = await client.query(
        `INSERT INTO users (full_name, id_number, email, phone, password, role) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [full_name, id_number, email, phone, hashedPassword, role]
      );
    }

    const userId = newUser.rows[0].id;

    // ✅ NEW: Add initial savings if provided
    if (initial_savings && parseFloat(initial_savings) > 0 && role === "MEMBER") {
      await client.query(
        `INSERT INTO savings (user_id, amount, saved_at, source)
         VALUES ($1, $2, NOW(), $3)`,
        [userId, parseFloat(initial_savings), 'Initial Deposit']
      );
    }

    // ✅ NEW: Add existing loan if provided
    if (existing_loan && role === "MEMBER") {
      const {
        amount,
        interest_rate,
        repayment_period,
        loan_purpose,
        created_at, // ✅ Custom creation date
        status // Optional status (defaults to APPROVED for existing loans)
      } = existing_loan;

      if (!amount || !interest_rate || !repayment_period) {
        await client.query("ROLLBACK");
        return res.status(400).json({ 
          message: "Existing loan must have amount, interest_rate, and repayment_period" 
        });
      }

      const loanAmount = parseFloat(amount);
      const loanInterestRate = parseFloat(interest_rate);
      const processingFee = loanAmount * 0.005; // 0.5%
      const principalWithFee = loanAmount + processingFee;

      // Calculate interest and monthly payment
      const monthlyRate = loanInterestRate / 100;
      const totalInterest = principalWithFee * monthlyRate * repayment_period;
      const totalPayable = principalWithFee + totalInterest;
      const monthlyPayment = totalPayable / repayment_period;

      const loanCreatedAt = created_at || new Date().toISOString();
      const loanStatus = status || 'APPROVED';

      await client.query(
        `INSERT INTO loans (
          user_id, amount, initial_amount, principal_amount, 
          interest_rate, repayment_period, loan_purpose, 
          processing_fee, monthly_payment, total_interest, 
          status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          userId, 
          loanAmount, // Current balance
          loanAmount, // Initial amount
          principalWithFee, // Principal with fee
          loanInterestRate,
          repayment_period,
          loan_purpose || 'Existing loan',
          processingFee,
          monthlyPayment,
          totalInterest,
          loanStatus,
          loanCreatedAt
        ]
      );
    }

    await client.query("COMMIT");
    
    delete newUser.rows[0].password;
    res.json({
      message: `${role} added successfully${initial_savings ? ' with initial savings' : ''}${existing_loan ? ' and existing loan' : ''}`,
      user: newUser.rows[0]
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
});

// Update member
router.put("/members/:id", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  const { id } = req.params;
  const { full_name, id_number, email, phone, sacco_number } = req.body;
  
  try {
    // ✅ NEW: Allow updating SACCO number
    let query, params;
    
    if (sacco_number !== undefined) {
      // Check if new SACCO number already exists (if changing)
      const existing = await pool.query(
        "SELECT id FROM users WHERE sacco_number=$1 AND id!=$2",
        [sacco_number, id]
      );
      
      if (existing.rows.length > 0) {
        return res.status(400).json({ message: "SACCO number already in use" });
      }
      
      query = `UPDATE users SET full_name=$1, id_number=$2, email=$3, phone=$4, sacco_number=$5 
               WHERE id=$6 RETURNING *`;
      params = [full_name, id_number, email, phone, sacco_number, id];
    } else {
      query = `UPDATE users SET full_name=$1, id_number=$2, email=$3, phone=$4 
               WHERE id=$5 RETURNING *`;
      params = [full_name, id_number, email, phone, id];
    }
    
    const updated = await pool.query(query, params);
    
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

// ✅ FIX: Add savings to ANY user (member OR admin)
router.post("/members/:id/savings", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  const { id } = req.params;
  const { amount } = req.body;
  
  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ message: "Invalid amount" });
  }

  try {
    const userCheck = await pool.query("SELECT id, role, full_name FROM users WHERE id=$1", [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const user = userCheck.rows[0];
    const savingsAmount = parseFloat(amount);
    
    await pool.query(
      "INSERT INTO savings (user_id, amount, saved_at) VALUES ($1, $2, NOW())",
      [id, savingsAmount]
    );
    
    res.json({ 
      message: `Savings added successfully for ${user.full_name} (${user.role}) and loan limit updated` 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ======== LOANS MANAGEMENT ========

// Get all loans
router.get("/loans", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  
  try {
    const loans = await pool.query(`
      SELECT DISTINCT ON (l.id)
        l.id, 
        l.amount, 
        l.principal_amount,
        l.initial_amount,
        l.principal_paid,
        l.interest_paid,
        l.interest_rate, 
        l.repayment_period, 
        l.status,
        l.created_at,
        u.full_name AS "memberName",
        u.sacco_number AS "saccoNumber",
        g.guarantor_name AS "guarantorName",
        g.guarantor_email AS "guarantorEmail",
        g.guarantor_id_number AS "guarantorIdNumber",
        g.guarantor_phone AS "guarantorPhone"
      FROM loans l
      JOIN users u ON l.user_id = u.id
      LEFT JOIN guarantors g ON g.loan_id = l.id AND g.guarantor_type = 'MEMBER'
      WHERE u.role = 'MEMBER'
      ORDER BY l.id, g.id
    `);
    res.json(loans.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ NEW: Update loan details (including creation date)
router.put("/loans/:id", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  
  const { id } = req.params;
  const {
    amount,
    interest_rate,
    repayment_period,
    loan_purpose,
    created_at, // ✅ NEW: Allow editing creation date
    status
  } = req.body;

  try {
    // Get current loan
    const currentLoan = await pool.query("SELECT * FROM loans WHERE id=$1", [id]);
    if (currentLoan.rows.length === 0) {
      return res.status(404).json({ message: "Loan not found" });
    }

    const loan = currentLoan.rows[0];
    
    // Use provided values or keep existing
    const newAmount = amount !== undefined ? parseFloat(amount) : parseFloat(loan.amount);
    const newRate = interest_rate !== undefined ? parseFloat(interest_rate) : parseFloat(loan.interest_rate);
    const newPeriod = repayment_period !== undefined ? parseInt(repayment_period) : loan.repayment_period;
    const newPurpose = loan_purpose !== undefined ? loan_purpose : loan.loan_purpose;
    const newCreatedAt = created_at || loan.created_at;
    const newStatus = status || loan.status;

    // Recalculate loan values
    const processingFee = newAmount * 0.005;
    const principalWithFee = newAmount + processingFee;
    const monthlyRate = newRate / 100;
    const totalInterest = principalWithFee * monthlyRate * newPeriod;
    const totalPayable = principalWithFee + totalInterest;
    const monthlyPayment = totalPayable / newPeriod;

    await pool.query(
      `UPDATE loans SET 
        amount = $1,
        initial_amount = $2,
        principal_amount = $3,
        interest_rate = $4,
        repayment_period = $5,
        loan_purpose = $6,
        processing_fee = $7,
        monthly_payment = $8,
        total_interest = $9,
        status = $10,
        created_at = $11
       WHERE id = $12`,
      [
        newAmount,
        newAmount, // initial_amount same as current amount
        principalWithFee,
        newRate,
        newPeriod,
        newPurpose,
        processingFee,
        monthlyPayment,
        totalInterest,
        newStatus,
        newCreatedAt,
        id
      ]
    );

    res.json({ 
      success: true,
      message: "Loan updated successfully" 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Approve loan
router.post("/loans/:id/approve", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  const { id } = req.params;
  
  try {
    await pool.query("UPDATE loans SET status='APPROVED' WHERE id=$1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Reject loan
router.post("/loans/:id/reject", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  const { id } = req.params;
  
  try {
    await pool.query("UPDATE loans SET status='REJECTED' WHERE id=$1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Record loan repayment
router.post("/loans/:id/repayment", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  
  const { id } = req.params;
  const { amount } = req.body;
  
  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ message: "Invalid repayment amount" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const loanRes = await client.query("SELECT * FROM loans WHERE id=$1", [id]);
    if (loanRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Loan not found" });
    }

    const loan = loanRes.rows[0];
    const repaymentAmount = parseFloat(amount);
    const currentBalance = parseFloat(loan.amount);
    const principalAmount = parseFloat(loan.principal_amount || loan.initial_amount);
    const currentPrincipalPaid = parseFloat(loan.principal_paid || 0);
    const currentInterestPaid = parseFloat(loan.interest_paid || 0);
    const monthlyRate = parseFloat(loan.interest_rate) / 100;

    const currentPrincipalBalance = principalAmount - currentPrincipalPaid;
    const interestPayment = currentPrincipalBalance * monthlyRate;
    const principalPayment = Math.max(0, repaymentAmount - interestPayment);

    const newPrincipalPaid = currentPrincipalPaid + principalPayment;
    const newInterestPaid = currentInterestPaid + Math.min(repaymentAmount, interestPayment);
    const newBalance = Math.max(0, currentBalance - repaymentAmount);

    await client.query(
      `UPDATE loans 
       SET amount=$1, principal_paid=$2, interest_paid=$3, status=$4
       WHERE id=$5`,
      [
        newBalance,
        newPrincipalPaid,
        newInterestPaid,
        newBalance === 0 ? 'PAID' : 'APPROVED',
        id
      ]
    );

    await client.query(
      `INSERT INTO loan_repayments (loan_id, amount, principal_paid, interest_paid)
       VALUES ($1, $2, $3, $4)`,
      [id, repaymentAmount, principalPayment, Math.min(repaymentAmount, interestPayment)]
    );

    const userRes = await client.query("SELECT loan_limit FROM users WHERE id=$1", [loan.user_id]);
    const currentLoanLimit = parseFloat(userRes.rows[0].loan_limit || 0);
    const newLoanLimit = currentLoanLimit + repaymentAmount;

    await client.query(
      "UPDATE users SET loan_limit=$1 WHERE id=$2",
      [newLoanLimit, loan.user_id]
    );

    await client.query("COMMIT");

    const totalInterest = principalAmount * monthlyRate * loan.repayment_period;

    res.json({
      success: true,
      repayment: {
        amount: parseFloat(repaymentAmount.toFixed(2)),
        principalPayment: parseFloat(principalPayment.toFixed(2)),
        interestPayment: parseFloat(Math.min(repaymentAmount, interestPayment).toFixed(2)),
        newBalance: parseFloat(newBalance.toFixed(2)),
        totalInterestPaid: parseFloat(newInterestPaid.toFixed(2)),
        totalPrincipalPaid: parseFloat(newPrincipalPaid.toFixed(2)),
        totalInterest: parseFloat(totalInterest.toFixed(2)),
        totalPrincipal: principalAmount
      },
      newLoanLimit: newLoanLimit,
      fullyPaid: newBalance === 0
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
});

// ======== REPORTS (Keep existing implementation) ========

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
    
    const totalSavingsRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total 
       FROM savings WHERE user_id=$1`,
      [id]
    );
    
    let dateFilter = "";
    let params = [id];
    
    if (month && year) {
      dateFilter = "AND EXTRACT(MONTH FROM saved_at) = $2 AND EXTRACT(YEAR FROM saved_at) = $3";
      params.push(parseInt(month), parseInt(year));
    } else if (year) {
      dateFilter = "AND EXTRACT(YEAR FROM saved_at) = $2";
      params.push(parseInt(year));
    }
    
    const periodSavingsRes = await pool.query(
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
      `SELECT amount, saved_at, source FROM savings WHERE user_id=$1 ${dateFilter} ORDER BY saved_at DESC`,
      params
    );
    
    const outstandingLoansRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_outstanding 
       FROM loans 
       WHERE user_id=$1 AND status='APPROVED' AND amount > 0`,
      [id]
    );
    
    const totalSavings = parseFloat(totalSavingsRes.rows[0].total);
    const loanLimit = parseFloat(member.loan_limit);
    const outstandingLoans = parseFloat(outstandingLoansRes.rows[0].total_outstanding);
    const availableLoanLimit = Math.max(0, loanLimit - outstandingLoans);
    
    res.json({
      member: {
        id: member.id,
        name: member.full_name,
        saccoNumber: member.sacco_number,
        email: member.email,
        phone: member.phone,
        loanLimit: loanLimit,
        totalSavings: totalSavings,
        outstandingLoans: outstandingLoans,
        availableLoanLimit: availableLoanLimit
      },
      period: { month, year },
      summary: {
        totalSavings: totalSavings,
        periodSavings: parseFloat(periodSavingsRes.rows[0].total),
        savingsCount: parseInt(periodSavingsRes.rows[0].count),
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
        savedAt: s.saved_at,
        source: s.source || 'Savings Deposit'
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/reports/all", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  const { month, year } = req.query;
  
  try {
    let loansDateFilter = "";
    let loansParams = [];
    
    if (month && year) {
      loansDateFilter = "WHERE EXTRACT(MONTH FROM created_at) = $1 AND EXTRACT(YEAR FROM created_at) = $2";
      loansParams = [parseInt(month), parseInt(year)];
    } else if (year) {
      loansDateFilter = "WHERE EXTRACT(YEAR FROM created_at) = $1";
      loansParams = [parseInt(year)];
    }
    
    const membersRes = await pool.query("SELECT COUNT(*) FROM users WHERE role='MEMBER'");
    
    const totalSavingsRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM savings`
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
        COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'APPROVED') AS total_approved_loans,
        COALESCE(SUM(l.amount) FILTER (WHERE l.status = 'APPROVED' AND l.amount > 0), 0) AS outstanding_loans
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
        totalSavings: parseFloat(totalSavingsRes.rows[0].total),
        totalLoans: parseFloat(loansRes.rows[0].total),
        loansCount: parseInt(loansRes.rows[0].count),
        activeLoans: parseInt(activeLoansRes.rows[0].count)
      },
      members: memberBreakdownRes.rows.map(m => {
        const totalSavings = parseFloat(m.total_savings);
        const loanLimit = parseFloat(m.loan_limit);
        const outstandingLoans = parseFloat(m.outstanding_loans);
        const availableLoanLimit = Math.max(0, loanLimit - outstandingLoans);
        
        return {
          id: m.id,
          name: m.full_name,
          saccoNumber: m.sacco_number,
          loanLimit: loanLimit,
          totalSavings: totalSavings,
          totalLoans: parseInt(m.total_approved_loans),
          outstandingLoans: outstandingLoans,
          availableLoanLimit: availableLoanLimit
        };
      })
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
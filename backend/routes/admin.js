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
      ORDER BY 
        CASE 
          WHEN u.sacco_number ~ '^[0-9]+$' THEN u.sacco_number::INTEGER 
          ELSE 999999 
        END ASC,
        u.sacco_number ASC
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
      const savingsDate = existing_loan?.savings_date || new Date().toISOString();
      await client.query(
        `INSERT INTO savings (user_id, amount, saved_at, source)
         VALUES ($1, $2, $3, $4)`,
        [userId, parseFloat(initial_savings), savingsDate, 'Initial Deposit']
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
      // Check if new SACCO number already exists for another user
      const existingSacco = await pool.query(
        "SELECT id FROM users WHERE sacco_number=$1 AND id!=$2",
        [sacco_number, id]
      );
      
      if (existingSacco.rows.length > 0) {
        return res.status(400).json({ message: "SACCO number already exists" });
      }
      
      query = `UPDATE users SET full_name=$1, id_number=$2, email=$3, phone=$4, sacco_number=$5 WHERE id=$6 RETURNING *`;
      params = [full_name, id_number, email, phone, sacco_number, id];
    } else {
      query = `UPDATE users SET full_name=$1, id_number=$2, email=$3, phone=$4 WHERE id=$5 RETURNING *`;
      params = [full_name, id_number, email, phone, id];
    }
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Member not found" });
    }
    
    delete result.rows[0].password;
    res.json(result.rows[0]);
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
    await pool.query("DELETE FROM users WHERE id=$1", [id]);
    res.json({ message: "Member deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ======== LOANS MANAGEMENT ========

// ✅ UPDATED: Edit loan with backdating support
router.put("/loans/:id", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden" });
  }

  const { id } = req.params;
  const { 
    amount, 
    interest_rate, 
    repayment_period, 
    loan_purpose, 
    status,
    created_at // ✅ NEW: Allow backdating loan creation
  } = req.body;

  try {
    // Recalculate loan values
    const loanAmount = parseFloat(amount);
    const loanInterestRate = parseFloat(interest_rate);
    const processingFee = loanAmount * 0.005; // 0.5%
    const principalWithFee = loanAmount + processingFee;

    const monthlyRate = loanInterestRate / 100;
    const totalInterest = principalWithFee * monthlyRate * repayment_period;
    const totalPayable = principalWithFee + totalInterest;
    const monthlyPayment = totalPayable / repayment_period;

    // Build update query
    let query = `
      UPDATE loans 
      SET amount = $1, 
          initial_amount = $2,
          principal_amount = $3,
          interest_rate = $4, 
          repayment_period = $5, 
          loan_purpose = $6,
          processing_fee = $7,
          monthly_payment = $8,
          total_interest = $9,
          status = $10
    `;
    
    let params = [
      loanAmount,
      loanAmount,
      principalWithFee,
      loanInterestRate,
      repayment_period,
      loan_purpose,
      processingFee,
      monthlyPayment,
      totalInterest,
      status
    ];

    // ✅ NEW: Add created_at if provided
    if (created_at) {
      query += `, created_at = $11 WHERE id = $12 RETURNING *`;
      params.push(created_at, id);
    } else {
      query += ` WHERE id = $11 RETURNING *`;
      params.push(id);
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Loan not found" });
    }

    res.json({
      success: true,
      loan: result.rows[0]
    });
  } catch (err) {
    console.error("Error updating loan:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ NEW: Add loan payment with backdating support
router.post("/loans/:id/payment", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden" });
  }

  const { id } = req.params;
  const { 
    principal_payment, 
    interest_payment,
    payment_date // ✅ NEW: Allow backdating payments
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Get loan details
    const loanRes = await client.query(
      `SELECT l.*, u.full_name, u.loan_limit 
       FROM loans l 
       JOIN users u ON l.user_id = u.id 
       WHERE l.id = $1`,
      [id]
    );

    if (loanRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Loan not found" });
    }

    const loan = loanRes.rows[0];

    if (loan.status !== 'APPROVED') {
      await client.query("ROLLBACK");
      return res.status(400).json({ 
        message: "Can only record payments for approved loans" 
      });
    }

    const principalPmt = parseFloat(principal_payment) || 0;
    const interestPmt = parseFloat(interest_payment) || 0;
    const totalPayment = principalPmt + interestPmt;

    if (totalPayment <= 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ 
        message: "Payment amount must be greater than 0" 
      });
    }

    // Calculate new balance
    const currentBalance = parseFloat(loan.amount);
    const newBalance = currentBalance - principalPmt;

    if (newBalance < 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ 
        message: `Principal payment (${principalPmt}) exceeds remaining balance (${currentBalance})` 
      });
    }

    // Update loan balance and payment totals
    await client.query(
      `UPDATE loans 
       SET amount = $1,
           principal_paid = COALESCE(principal_paid, 0) + $2,
           interest_paid = COALESCE(interest_paid, 0) + $3
       WHERE id = $4`,
      [newBalance, principalPmt, interestPmt, id]
    );

    // ✅ NEW: Insert payment record with custom date
    const paymentDateValue = payment_date || new Date().toISOString();
    
    await client.query(
      `INSERT INTO loan_payments (
        loan_id, principal_paid, interest_paid, payment_date
      ) VALUES ($1, $2, $3, $4)`,
      [id, principalPmt, interestPmt, paymentDateValue]
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "Payment recorded successfully",
      payment: {
        principalPaid: principalPmt,
        interestPaid: interestPmt,
        totalPaid: totalPayment,
        newBalance: newBalance,
        paymentDate: paymentDateValue
      }
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error recording payment:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
});

// Add savings to a member
router.post("/savings", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  const { user_id, amount } = req.body;
  
  try {
    await pool.query(
      "INSERT INTO savings (user_id, amount) VALUES ($1, $2)",
      [user_id, amount]
    );
    res.json({ message: "Savings added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ NEW: Get payment history for a specific loan
router.get("/loans/:id/payments", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden" });
  }

  const { id } = req.params;

  try {
    // Get loan basic info
    const loanRes = await pool.query(
      `SELECT l.*, u.full_name, u.sacco_number, u.email, u.phone, u.loan_limit
       FROM loans l
       JOIN users u ON l.user_id = u.id
       WHERE l.id = $1`,
      [id]
    );

    if (loanRes.rows.length === 0) {
      return res.status(404).json({ message: "Loan not found" });
    }

    const loan = loanRes.rows[0];

    // Get payment history
    const paymentsRes = await pool.query(
      `SELECT * FROM loan_payments 
       WHERE loan_id = $1 
       ORDER BY payment_date DESC`,
      [id]
    );

    res.json({
      loan: {
        id: loan.id,
        userId: loan.user_id,
        memberName: loan.full_name,
        saccoNumber: loan.sacco_number,
        memberEmail: loan.email,
        memberPhone: loan.phone,
        amount: parseFloat(loan.amount),
        initialAmount: parseFloat(loan.initial_amount),
        principalAmount: parseFloat(loan.principal_amount),
        principalPaid: parseFloat(loan.principal_paid || 0),
        interestPaid: parseFloat(loan.interest_paid || 0),
        interestRate: parseFloat(loan.interest_rate),
        repaymentPeriod: loan.repayment_period,
        loanPurpose: loan.loan_purpose,
        status: loan.status,
        createdAt: loan.created_at,
        processingFee: parseFloat(loan.processing_fee || 0),
        monthlyPayment: parseFloat(loan.monthly_payment || 0),
        totalInterest: parseFloat(loan.total_interest || 0)
      },
      payments: paymentsRes.rows.map(p => ({
        id: p.id,
        principalPaid: parseFloat(p.principal_paid),
        interestPaid: parseFloat(p.interest_paid),
        paymentDate: p.payment_date
      })),
      memberLoanLimit: parseFloat(loan.loan_limit || 0)
    });

  } catch (err) {
    console.error("Error fetching payment details:", err);
    res.status(500).json({ 
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ======== LOAN CREATION ========

// POST /api/admin/loans - Create a new loan for a member (used by EditMemberModal)
router.post("/loans", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden" });
  }

  const {
    userId,
    memberId,
    amount,
    interest_rate,
    repayment_period,
    loan_purpose,
    status,
    created_at,
    // ── partial payment support for historical loans ──────────────────
    principal_paid,
    interest_paid,
    last_payment_date,
    notes,
  } = req.body;

  const finalUserId = userId || memberId;

  if (!finalUserId || !amount || !interest_rate || !repayment_period) {
    return res.status(400).json({ 
      message: "userId, amount, interest_rate, and repayment_period are required" 
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Get member's current loan limit and outstanding loans
    const memberRes = await client.query(
      `SELECT u.loan_limit,
              COALESCE(SUM(l.amount) FILTER (WHERE l.status = 'APPROVED' AND l.amount > 0), 0) as outstanding
       FROM users u
       LEFT JOIN loans l ON l.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id, u.loan_limit`,
      [finalUserId]
    );

    if (memberRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Member not found" });
    }

    const loanLimit = parseFloat(memberRes.rows[0].loan_limit);
    const outstanding = parseFloat(memberRes.rows[0].outstanding);
    const available = loanLimit - outstanding;
    const loanAmount = parseFloat(amount);

    // Check if amount exceeds available loan limit
    if (loanAmount > available) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `Loan amount (KES ${loanAmount.toLocaleString()}) exceeds member's available loan limit (KES ${available.toLocaleString()}). Total limit: KES ${loanLimit.toLocaleString()}, Outstanding: KES ${outstanding.toLocaleString()}`
      });
    }

    // Calculate processing fee (0.5%)
    const processingFee = loanAmount * 0.005;
    const principalWithFee = loanAmount + processingFee;

    // Calculate interest and monthly payment using amortisation formula
    const monthlyRate = parseFloat(interest_rate) / 100;
    const periods = parseInt(repayment_period);
    
    const monthlyPayment = (principalWithFee * monthlyRate * Math.pow(1 + monthlyRate, periods)) / 
                          (Math.pow(1 + monthlyRate, periods) - 1);
    
    const totalPayable = monthlyPayment * periods;
    const totalInterest = totalPayable - principalWithFee;

    // Prior payment state for historical loans
    const prevPrincipalPaid = parseFloat(principal_paid || 0);
    const prevInterestPaid  = parseFloat(interest_paid  || 0);
    const hasPriorPayments  = prevPrincipalPaid > 0 || prevInterestPaid > 0;

    if (hasPriorPayments && prevPrincipalPaid > principalWithFee) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `principal_paid (${prevPrincipalPaid}) exceeds total principal + fee (${principalWithFee.toFixed(2)})`
      });
    }

    // Current outstanding = principal+fee minus what's already been paid
    const currentBalance = Math.max(0, principalWithFee - prevPrincipalPaid);

    const loanCreatedAt = created_at || new Date().toISOString();
    const loanStatus = status || 'APPROVED';

    // Create the loan
    const loanRes = await client.query(
      `INSERT INTO loans (
        user_id, amount, initial_amount, principal_amount, 
        interest_rate, repayment_period, loan_purpose, 
        processing_fee, monthly_payment, total_interest,
        principal_paid, interest_paid,
        status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        finalUserId, 
        currentBalance,       // current outstanding balance
        loanAmount,           // original requested amount
        principalWithFee,
        parseFloat(interest_rate),
        periods,
        loan_purpose || null,
        processingFee,
        monthlyPayment,
        totalInterest,
        prevPrincipalPaid,
        prevInterestPaid,
        loanStatus,
        loanCreatedAt
      ]
    );

    const loanId = loanRes.rows[0].id;

    // Insert backdated payment record if prior payments exist
    if (hasPriorPayments) {
      const paymentDate = last_payment_date || created_at || new Date().toISOString();
      await client.query(
        `INSERT INTO loan_payments (loan_id, principal_paid, interest_paid, payment_date)
         VALUES ($1, $2, $3, $4)`,
        [loanId, prevPrincipalPaid, prevInterestPaid, paymentDate]
      );
    }

    // Optional internal note
    if (notes) {
      try {
        await client.query(
          `INSERT INTO loan_notes (loan_id, note, created_by, created_at) VALUES ($1, $2, $3, NOW())`,
          [loanId, notes, req.user.id]
        );
      } catch (_) { /* loan_notes table may not exist in all deployments */ }
    }

    await client.query("COMMIT");

    res.json({
      message: "Loan created successfully",
      loan: {
        id: loanRes.rows[0].id,
        amount: parseFloat(loanRes.rows[0].amount),
        initialAmount: parseFloat(loanRes.rows[0].initial_amount),
        principalAmount: parseFloat(loanRes.rows[0].principal_amount),
        principalPaid: parseFloat(loanRes.rows[0].principal_paid || 0),
        interestPaid: parseFloat(loanRes.rows[0].interest_paid || 0),
        interestRate: parseFloat(loanRes.rows[0].interest_rate),
        repaymentPeriod: loanRes.rows[0].repayment_period,
        processingFee: parseFloat(loanRes.rows[0].processing_fee),
        monthlyPayment: parseFloat(loanRes.rows[0].monthly_payment),
        totalInterest: parseFloat(loanRes.rows[0].total_interest),
        status: loanRes.rows[0].status,
        createdAt: loanRes.rows[0].created_at
      }
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error creating loan:", err);
    res.status(500).json({ 
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
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
      `SELECT 
        COALESCE(SUM(initial_amount), 0) AS total_disbursed,
        COALESCE(SUM(CASE WHEN status='APPROVED' THEN amount ELSE 0 END), 0) AS total_outstanding,
        COUNT(*) AS count 
       FROM loans ${loansDateFilter}`,
      loansParams
    );
    
    const activeLoansRes = await pool.query(
      "SELECT COUNT(*) FROM loans WHERE status='APPROVED'"
    );
    
    const memberBreakdownRes = await pool.query(`
      SELECT 
        u.id,
        u.full_name,
        u.sacco_number,
        u.loan_limit,
        COALESCE(SUM(s.amount), 0) AS total_savings,
        COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'APPROVED') AS total_approved_loans,
        COALESCE(SUM(l.amount) FILTER (WHERE l.status = 'APPROVED' AND l.amount > 0), 0) AS outstanding_loans,
        COALESCE(SUM(l.initial_amount) FILTER (WHERE l.status = 'APPROVED'), 0) AS total_approved_amount
      FROM users u
      LEFT JOIN savings s ON s.user_id = u.id
      LEFT JOIN loans l ON l.user_id = u.id
      WHERE u.role = 'MEMBER'
      GROUP BY u.id, u.full_name, u.sacco_number, u.loan_limit
      ORDER BY 
        CASE 
          WHEN u.sacco_number ~ '^[0-9]+$' THEN u.sacco_number::INTEGER 
          ELSE 999999 
        END ASC,
        u.sacco_number ASC
    `);
    
    res.json({
      period: { month, year },
      summary: {
        totalMembers: parseInt(membersRes.rows[0].count),
        totalSavings: parseFloat(totalSavingsRes.rows[0].total),
        totalLoans: parseFloat(loansRes.rows[0].total_outstanding),
        totalDisbursed: parseFloat(loansRes.rows[0].total_disbursed),
        loansCount: parseInt(loansRes.rows[0].count),
        activeLoans: parseInt(activeLoansRes.rows[0].count)
      },
      members: memberBreakdownRes.rows.map(m => {
        const totalSavings = parseFloat(m.total_savings);
        const loanLimit = parseFloat(m.loan_limit);
        const outstandingLoans = parseFloat(m.outstanding_loans);
        const availableLoanLimit = Math.max(0, loanLimit - outstandingLoans);
        const totalApprovedAmount = parseFloat(m.total_approved_amount);
        
        return {
          id: m.id,
          name: m.full_name,
          saccoNumber: m.sacco_number,
          loanLimit: loanLimit,
          totalSavings: totalSavings,
          totalLoans: parseInt(m.total_approved_loans),
          outstandingLoans: outstandingLoans,
          availableLoanLimit: availableLoanLimit,
          totalApprovedAmount: totalApprovedAmount
        };
      })
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ======== BULK HISTORICAL LOAN IMPORT ========

// POST /api/admin/loans/bulk-create
router.post("/loans/bulk-create", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden" });
  }

  const { loans } = req.body;

  if (!loans || !Array.isArray(loans) || loans.length === 0) {
    return res.status(400).json({ message: "Please provide an array of loans to import" });
  }

  const client = await pool.connect();
  const successful = [];
  const failed = [];

  try {
    await client.query("BEGIN");

    for (const loanData of loans) {
      try {
        const {
          sacco_number,
          loan_amount,
          interest_rate = 1.045,
          repayment_period = 12,
          loan_purpose = "Historical loan",
          loan_date,
          principal_paid,
          interest_paid,
          last_payment_date,
          notes,
        } = loanData;

        if (!sacco_number || !loan_amount) {
          failed.push({ sacco_number: sacco_number || "N/A", loan_amount, reason: "Missing SACCO number or loan amount" });
          continue;
        }

        const memberRes = await client.query(
          "SELECT id, full_name, loan_limit FROM users WHERE sacco_number = $1",
          [sacco_number]
        );

        if (memberRes.rows.length === 0) {
          failed.push({ sacco_number, loan_amount, reason: "Member not found with this SACCO number" });
          continue;
        }

        const member = memberRes.rows[0];
        const amount = parseFloat(loan_amount);

        if (amount <= 0) {
          failed.push({ sacco_number, loan_amount, reason: "Loan amount must be greater than 0" });
          continue;
        }

        const processingFee    = amount * 0.005;
        const principalWithFee = amount + processingFee;
        const monthlyRate      = parseFloat(interest_rate) / 100;
        const period           = parseInt(repayment_period);

        const monthlyPayment =
          (principalWithFee * monthlyRate * Math.pow(1 + monthlyRate, period)) /
          (Math.pow(1 + monthlyRate, period) - 1);
        const totalPayable  = monthlyPayment * period;
        const totalInterest = totalPayable - principalWithFee;

        const prevPrincipalPaid = parseFloat(principal_paid || 0);
        const prevInterestPaid  = parseFloat(interest_paid  || 0);
        const hasPriorPayments  = prevPrincipalPaid > 0 || prevInterestPaid > 0;

        if (hasPriorPayments && prevPrincipalPaid > principalWithFee) {
          failed.push({ sacco_number, loan_amount, reason: `principal_paid exceeds total principal+fee (${principalWithFee.toFixed(2)})` });
          continue;
        }

        const currentBalance = Math.max(0, principalWithFee - prevPrincipalPaid);

        const loanRes = await client.query(
          `INSERT INTO loans
             (user_id, amount, initial_amount, principal_amount,
              interest_rate, repayment_period, loan_purpose,
              processing_fee, monthly_payment, total_interest,
              principal_paid, interest_paid,
              status, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'APPROVED',$13)
           RETURNING id`,
          [
            member.id,
            currentBalance,
            amount,
            principalWithFee,
            interest_rate,
            period,
            loan_purpose,
            processingFee,
            monthlyPayment,
            totalInterest,
            prevPrincipalPaid,
            prevInterestPaid,
            loan_date || new Date(),
          ]
        );

        const loanId = loanRes.rows[0].id;

        if (hasPriorPayments) {
          const paymentDate = last_payment_date || loan_date || new Date();
          await client.query(
            `INSERT INTO loan_payments (loan_id, principal_paid, interest_paid, payment_date)
             VALUES ($1, $2, $3, $4)`,
            [loanId, prevPrincipalPaid, prevInterestPaid, paymentDate]
          );
        }

        if (notes) {
          try {
            await client.query(
              `INSERT INTO loan_notes (loan_id, note, created_by, created_at) VALUES ($1, $2, $3, NOW())`,
              [loanId, notes, req.user.id]
            );
          } catch (_) {}
        }

        successful.push({
          loan_id         : loanId,
          sacco_number,
          member_name     : member.full_name,
          amount,
          repayment_period: period,
          current_balance : currentBalance,
          principal_paid  : prevPrincipalPaid,
          interest_paid   : prevInterestPaid,
          status          : "APPROVED",
        });

      } catch (err) {
        console.error("Error creating historical loan:", err);
        failed.push({ sacco_number: loanData.sacco_number || "N/A", loan_amount: loanData.loan_amount, reason: err.message || "Database error" });
      }
    }

    await client.query("COMMIT");
    res.json({
      message: `Imported ${successful.length} loans successfully. ${failed.length} failed.`,
      successful,
      failed,
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Bulk loan creation error:", err);
    res.status(500).json({ message: "Server error during bulk import", error: err.message });
  } finally {
    client.release();
  }
});

// ======== BULK LOAN PAYMENT UPDATE ========

// POST /api/admin/loans/bulk-payment-update
router.post("/loans/bulk-payment-update", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });

  const { payments } = req.body;

  if (!payments || !Array.isArray(payments) || payments.length === 0) {
    return res.status(400).json({ message: "payments array is required" });
  }

  const results = { success: [], failed: [] };

  for (const entry of payments) {
    const { loan_id, sacco_number, payment_amount, principal_paid, interest_paid, payment_date, notes } = entry;

    if (!loan_id || !payment_date) {
      results.failed.push({ loan_id, sacco_number, reason: "loan_id and payment_date are required" });
      continue;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Fetch the loan
      const loanRes = await client.query(
        `SELECT l.*, u.sacco_number AS member_sacco
         FROM loans l JOIN users u ON l.user_id = u.id
         WHERE l.id = $1`,
        [loan_id]
      );

      if (loanRes.rows.length === 0) {
        await client.query("ROLLBACK");
        results.failed.push({ loan_id, sacco_number, reason: "Loan not found" });
        continue;
      }

      const loan = loanRes.rows[0];

      if (loan.status !== "APPROVED") {
        await client.query("ROLLBACK");
        results.failed.push({ loan_id, sacco_number, reason: "Loan is not in APPROVED status" });
        continue;
      }

      const currentBalance = parseFloat(loan.amount);

      let principalPmt, interestPmt;

      if (payment_amount && !principal_paid && !interest_paid) {
        // Auto-split: interest first, then principal
        const totalPmt = parseFloat(payment_amount);
        if (totalPmt <= 0) {
          await client.query("ROLLBACK");
          results.failed.push({ loan_id, sacco_number, reason: "payment_amount must be > 0" });
          continue;
        }
        const monthlyInterest = currentBalance * (parseFloat(loan.interest_rate) / 100);
        interestPmt = Math.min(monthlyInterest, totalPmt);
        principalPmt = totalPmt - interestPmt;
      } else {
        principalPmt = parseFloat(principal_paid) || 0;
        interestPmt = parseFloat(interest_paid) || 0;
      }

      if (principalPmt + interestPmt <= 0) {
        await client.query("ROLLBACK");
        results.failed.push({ loan_id, sacco_number, reason: "Total payment must be > 0" });
        continue;
      }

      const newBalance = currentBalance - principalPmt;
      if (newBalance < 0) {
        await client.query("ROLLBACK");
        results.failed.push({ loan_id, sacco_number, reason: `Principal payment (${principalPmt}) exceeds balance (${currentBalance})` });
        continue;
      }

      // Update loan
      await client.query(
        `UPDATE loans
         SET amount = $1,
             principal_paid = COALESCE(principal_paid, 0) + $2,
             interest_paid  = COALESCE(interest_paid,  0) + $3
         WHERE id = $4`,
        [newBalance, principalPmt, interestPmt, loan_id]
      );

      // Insert payment record
      await client.query(
        `INSERT INTO loan_payments (loan_id, principal_paid, interest_paid, payment_date)
         VALUES ($1, $2, $3, $4)`,
        [loan_id, principalPmt, interestPmt, payment_date]
      );

      await client.query("COMMIT");

      results.success.push({
        loan_id,
        sacco_number: loan.member_sacco,
        principalPaid: principalPmt,
        interestPaid: interestPmt,
        newBalance,
        paymentDate: payment_date,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`Bulk payment error for loan ${loan_id}:`, err.message);
      results.failed.push({ loan_id, sacco_number, reason: err.message });
    } finally {
      client.release();
    }
  }

  res.json({
    message: `Processed ${payments.length} payments: ${results.success.length} succeeded, ${results.failed.length} failed`,
    results,
  });
});

// GET /api/admin/loans/bulk-update-template — returns CSV column headers
router.get("/loans/bulk-update-template", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  const csv = [
    "sacco_number,loan_id,payment_amount,payment_date,notes",
    "SACCO-0001,123,5000,2024-01-15,January payment",
    "SACCO-0002,124,8000,2024-01-15,January payment",
  ].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=loan_payment_template.csv");
  res.send(csv);
});

module.exports = router;
const express = require("express");
const router = express.Router();
const pool = require("../db");
const auth = require("../middleware/auth");
const { sendGuarantorNotification } = require("../utils/sendEmail");

// MEMBER requests a loan
router.post("/", auth, async (req, res) => {
  if (req.user.role !== "MEMBER") return res.status(403).json({ message: "Forbidden" });

  const { amount, repaymentPeriod, guarantor } = req.body;

  try {
    // Validate guarantor fields
    if (!guarantor || !guarantor.name || !guarantor.email || !guarantor.idNumber || !guarantor.phone) {
      return res.status(400).json({ 
        message: "All guarantor details are required (name, email, ID number, phone)" 
      });
    }

    // Check for existing active loans (PENDING or APPROVED with balance > 0)
    const activeLoanCheck = await pool.query(
      `SELECT id, amount, status FROM loans 
       WHERE user_id=$1 AND (status='PENDING' OR (status='APPROVED' AND amount > 0))
       LIMIT 1`,
      [req.user.id]
    );

    if (activeLoanCheck.rows.length > 0) {
      const activeLoan = activeLoanCheck.rows[0];
      return res.status(400).json({ 
        message: `You have an active loan. Please clear your existing loan of KES ${parseFloat(activeLoan.amount).toLocaleString()} before requesting a new one.` 
      });
    }

    // Check loan limit and get member details for email
    const memberRes = await pool.query(
      "SELECT loan_limit, full_name, email, phone, id_number FROM users WHERE id=$1",
      [req.user.id]
    );

    const member = memberRes.rows[0];
    const loanLimit = parseFloat(member.loan_limit || 0);

    if (amount > loanLimit) {
      return res.status(400).json({ 
        message: `Insufficient loan limit. You can borrow up to KES ${loanLimit.toLocaleString()}. Add more savings to increase your limit.` 
      });
    }

    // Annual interest rate 10%
    const annualInterestRate = 10;
    
    // Calculate simple interest correctly
    const timeInYears = repaymentPeriod / 12;
    const interestAmount = (amount * annualInterestRate * timeInYears) / 100;
    const totalPayable = parseFloat((amount + interestAmount).toFixed(2));

    // Insert loan
    const loanRes = await pool.query(
      `INSERT INTO loans (user_id, amount, principal_amount, initial_amount, interest_rate, repayment_period) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, totalPayable, amount, totalPayable, annualInterestRate, repaymentPeriod]
    );

    const loanId = loanRes.rows[0].id;

    // Insert guarantor
    await pool.query(
      `INSERT INTO guarantors 
       (loan_id, guarantor_name, guarantor_email, guarantor_id_number, guarantor_phone) 
       VALUES ($1, $2, $3, $4, $5)`,
      [loanId, guarantor.name, guarantor.email, guarantor.idNumber, guarantor.phone]
    );

    // Send email to guarantor
    try {
      await sendGuarantorNotification(guarantor.email, {
        memberName: member.full_name,
        memberPhone: member.phone,
        memberEmail: member.email,
        memberIdNumber: member.id_number
      });
      console.log("✓ Email sent to guarantor");
    } catch (emailError) {
      console.error("✗ Email error:", emailError.message);
    }

    res.json({ 
      success: true, 
      loan: loanRes.rows[0],
      breakdown: {
        principal: parseFloat(amount),
        interest: parseFloat(interestAmount.toFixed(2)),
        total: totalPayable,
        monthlyPayment: parseFloat((totalPayable / repaymentPeriod).toFixed(2))
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ADMIN approves loan
router.post("/:id/approve", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });

  const loanId = req.params.id;

  try {
    await pool.query("UPDATE loans SET status='APPROVED' WHERE id=$1", [loanId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ADMIN rejects loan
router.post("/:id/reject", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });

  const loanId = req.params.id;

  try {
    await pool.query("UPDATE loans SET status='REJECTED' WHERE id=$1", [loanId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
const express = require("express");
const router = express.Router();
const pool = require("../db");
const auth = require("../middleware/auth");
const { sendGuarantorNotification } = require("../utils/sendEmail");

// ✅ NEW: ADMIN gets all loans with member details
router.get("/", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }

  try {
    const loansRes = await pool.query(
      `SELECT 
        l.id,
        l.user_id,
        l.amount,
        l.principal_amount,
        l.initial_amount,
        l.interest_rate,
        l.repayment_period,
        l.loan_purpose,
        l.status,
        l.created_at,
        u.full_name,
        u.email,
        u.phone,
        u.id_number
      FROM loans l
      JOIN users u ON l.user_id = u.id
      ORDER BY l.created_at DESC`
    );

    // Get guarantor counts for each loan
    const loansWithCounts = await Promise.all(
      loansRes.rows.map(async (loan) => {
        const guarantorsRes = await pool.query(
          `SELECT guarantor_type, COUNT(*) as count
           FROM guarantors
           WHERE loan_id = $1
           GROUP BY guarantor_type`,
          [loan.id]
        );

        const counts = {
          members: 0,
          churchOfficials: 0,
          witnesses: 0
        };

        guarantorsRes.rows.forEach(row => {
          if (row.guarantor_type === 'MEMBER') counts.members = parseInt(row.count);
          if (row.guarantor_type === 'CHURCH_OFFICIAL') counts.churchOfficials = parseInt(row.count);
          if (row.guarantor_type === 'WITNESS') counts.witnesses = parseInt(row.count);
        });

        return {
          id: loan.id,
          userId: loan.user_id,
          memberName: loan.full_name,
          memberEmail: loan.email,
          memberPhone: loan.phone,
          memberIdNumber: loan.id_number,
          amount: parseFloat(loan.amount),
          principalAmount: parseFloat(loan.principal_amount),
          initialAmount: parseFloat(loan.initial_amount),
          interestRate: parseFloat(loan.interest_rate),
          repaymentPeriod: loan.repayment_period,
          loanPurpose: loan.loan_purpose,
          status: loan.status,
          createdAt: loan.created_at,
          guarantorCounts: counts
        };
      })
    );

    res.json({ 
      success: true,
      loans: loansWithCounts 
    });
  } catch (err) {
    console.error("Error fetching loans:", err);
    res.status(500).json({ 
      message: "Server error while fetching loans",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// MEMBER requests a loan
router.post("/", auth, async (req, res) => {
  if (req.user.role !== "MEMBER") return res.status(403).json({ message: "Forbidden" });

  const { 
    amount, 
    repaymentPeriod, 
    loanPurpose,
    isTopUp, // Flag to indicate if this is a top-up loan
    guarantors, // Array of guarantor objects
    churchOfficials, // Array of church official objects
    witnesses // Array of witness objects (spouse/next of kin)
  } = req.body;

  try {
    // Validate guarantors (exactly 3 members required)
    if (!guarantors || !Array.isArray(guarantors) || guarantors.length !== 3) {
      return res.status(400).json({ 
        message: "Exactly 3 guarantors who are SACCO members are required" 
      });
    }

    // Validate each guarantor has required fields
    for (let i = 0; i < guarantors.length; i++) {
      const g = guarantors[i];
      if (!g.name || !g.idNumber || !g.phone || !g.email || 
          !g.county || !g.location || !g.subLocation || !g.placeOfWork || !g.shares) {
        return res.status(400).json({ 
          message: `Guarantor ${i + 1}: All fields are required (name, ID, phone, email, county, location, sub-location, place of work, shares)` 
        });
      }
    }

    // ✅ FIXED: Check for duplicate guarantor IDs
    const guarantorIds = guarantors.map(g => g.idNumber.trim().toLowerCase());
    const uniqueGuarantorIds = new Set(guarantorIds);
    
    if (uniqueGuarantorIds.size !== guarantorIds.length) {
      return res.status(400).json({ 
        message: "Duplicate guarantors detected! Each guarantor must be a unique person. Please check the ID numbers." 
      });
    }

    // ✅ FIXED: Check for duplicate guarantor emails
    const guarantorEmails = guarantors.map(g => g.email.trim().toLowerCase());
    const uniqueGuarantorEmails = new Set(guarantorEmails);
    
    if (uniqueGuarantorEmails.size !== guarantorEmails.length) {
      return res.status(400).json({ 
        message: "Duplicate guarantor emails detected! Each guarantor must have a unique email address." 
      });
    }

    // Validate church officials (exactly 3 required)
    if (!churchOfficials || !Array.isArray(churchOfficials) || churchOfficials.length !== 3) {
      return res.status(400).json({ 
        message: "Exactly 3 church officials from Local Church Council are required" 
      });
    }

    // Validate each church official
    for (let i = 0; i < churchOfficials.length; i++) {
      const co = churchOfficials[i];
      if (!co.name || !co.idNumber || !co.phone || !co.email || !co.position || 
          !co.localChurch || !co.county || !co.location || !co.subLocation) {
        return res.status(400).json({ 
          message: `Church Official ${i + 1}: All fields are required (name, ID, phone, email, position, local church, county, location, sub-location)` 
        });
      }
    }

    // ✅ FIXED: Check for duplicate church official IDs
    const officialIds = churchOfficials.map(co => co.idNumber.trim().toLowerCase());
    const uniqueOfficialIds = new Set(officialIds);
    
    if (uniqueOfficialIds.size !== officialIds.length) {
      return res.status(400).json({ 
        message: "Duplicate church officials detected! Each church official must be a unique person." 
      });
    }

    // Validate witnesses (exactly 2 required - spouse or next of kin)
    if (!witnesses || !Array.isArray(witnesses) || witnesses.length !== 2) {
      return res.status(400).json({ 
        message: "Exactly 2 witnesses (spouse or next of kin) are required" 
      });
    }

    // Validate each witness
    for (let i = 0; i < witnesses.length; i++) {
      const w = witnesses[i];
      if (!w.name || !w.idNumber || !w.phone || !w.email || 
          !w.county || !w.location || !w.subLocation || !w.placeOfWork) {
        return res.status(400).json({ 
          message: `Witness ${i + 1}: All fields are required (name, ID, phone, email, county, location, sub-location, place of work)` 
        });
      }
    }

    // ✅ FIXED: Check for duplicate witness IDs
    const witnessIds = witnesses.map(w => w.idNumber.trim().toLowerCase());
    const uniqueWitnessIds = new Set(witnessIds);
    
    if (uniqueWitnessIds.size !== witnessIds.length) {
      return res.status(400).json({ 
        message: "Duplicate witnesses detected! Each witness must be a unique person." 
      });
    }

    // Check for existing pending loans
    const pendingLoanCheck = await pool.query(
      `SELECT id, amount FROM loans 
       WHERE user_id=$1 AND status='PENDING'
       LIMIT 1`,
      [req.user.id]
    );

    if (pendingLoanCheck.rows.length > 0) {
      return res.status(400).json({ 
        message: `You have a pending loan application. Please wait for approval before requesting another loan.` 
      });
    }

    // Get member details and calculate available loan limit
    const memberRes = await pool.query(
      "SELECT loan_limit, full_name, email, phone, id_number FROM users WHERE id=$1",
      [req.user.id]
    );

    const member = memberRes.rows[0];
    const totalLoanLimit = parseFloat(member.loan_limit || 0);

    // Calculate total outstanding loan balance (approved loans only)
    const outstandingLoanRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_outstanding 
       FROM loans 
       WHERE user_id=$1 AND status='APPROVED' AND amount > 0`,
      [req.user.id]
    );

    const totalOutstanding = parseFloat(outstandingLoanRes.rows[0].total_outstanding || 0);
    const availableLoanLimit = totalLoanLimit - totalOutstanding;

    // Check if member has available loan limit
    if (availableLoanLimit <= 0) {
      return res.status(400).json({ 
        message: `You have reached your loan limit. Your total loan limit is KES ${totalLoanLimit.toLocaleString()} and you have KES ${totalOutstanding.toLocaleString()} outstanding. Please repay your existing loan(s) to free up loan limit.` 
      });
    }

    if (amount > availableLoanLimit) {
      return res.status(400).json({ 
        message: `Insufficient available loan limit. You can borrow up to KES ${availableLoanLimit.toLocaleString()}. (Total limit: KES ${totalLoanLimit.toLocaleString()}, Outstanding: KES ${totalOutstanding.toLocaleString()})` 
      });
    }

    // ✅ FIXED: Calculate interest using reducing balance method (1.045% per month)
    const monthlyInterestRate = 1.045 / 100; // 1.045% monthly
    const processingFeeRate = 0.5 / 100; // 0.5% processing fee
    
    // Calculate processing fee and add to principal
    const processingFee = amount * processingFeeRate;
    const principalWithFee = amount + processingFee;
    
    // Calculate monthly payment using reducing balance formula
    // M = P * r * (1 + r)^n / ((1 + r)^n - 1)
    const n = repaymentPeriod; // number of months
    const r = monthlyInterestRate;
    const factor = Math.pow(1 + r, n);
    const monthlyPayment = principalWithFee * r * factor / (factor - 1);
    
    // Total amount to be repaid
    const totalPayable = monthlyPayment * n;
    
    // Total interest
    const totalInterest = totalPayable - principalWithFee;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Insert loan with correct calculations
      const loanRes = await client.query(
        `INSERT INTO loans (
          user_id, amount, principal_amount, initial_amount, 
          interest_rate, repayment_period, loan_purpose
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          req.user.id, 
          totalPayable, // Total amount to repay
          amount, // Original principal (without processing fee)
          totalPayable, // Initial total
          (monthlyInterestRate * 12 * 100), // Annual rate for display (1.045 * 12 = 12.54%)
          repaymentPeriod, 
          loanPurpose
        ]
      );

      const loanId = loanRes.rows[0].id;

      // Insert guarantors
      for (const guarantor of guarantors) {
        await client.query(
          `INSERT INTO guarantors (
            loan_id, guarantor_name, guarantor_email, guarantor_id_number, 
            guarantor_phone, guarantor_type, county, location, 
            sub_location, place_of_work, shares
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            loanId, guarantor.name, guarantor.email, guarantor.idNumber, guarantor.phone,
            'MEMBER', guarantor.county, guarantor.location,
            guarantor.subLocation, guarantor.placeOfWork, guarantor.shares
          ]
        );

        // Send email to guarantor
        try {
          await sendGuarantorNotification(guarantor.email, {
            memberName: member.full_name,
            memberPhone: member.phone,
            memberEmail: member.email,
            memberIdNumber: member.id_number,
            loanAmount: amount,
            guarantorType: 'SACCO Member Guarantor',
            guarantorName: guarantor.name
          });
        } catch (emailError) {
          console.error(`Email error for ${guarantor.email}:`, emailError.message);
        }
      }

      // Insert church officials
      for (const official of churchOfficials) {
        await client.query(
          `INSERT INTO guarantors (
            loan_id, guarantor_name, guarantor_email, guarantor_id_number, guarantor_phone, 
            guarantor_type, position, local_church, county, location, sub_location
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            loanId, official.name, official.email, official.idNumber, official.phone,
            'CHURCH_OFFICIAL', official.position, official.localChurch,
            official.county, official.location, official.subLocation
          ]
        );

        // Send email to church official
        try {
          await sendGuarantorNotification(official.email, {
            memberName: member.full_name,
            memberPhone: member.phone,
            memberEmail: member.email,
            memberIdNumber: member.id_number,
            loanAmount: amount,
            guarantorType: 'Church Official',
            guarantorName: official.name
          });
        } catch (emailError) {
          console.error(`Email error for ${official.email}:`, emailError.message);
        }
      }

      // Insert witnesses
      for (const witness of witnesses) {
        await client.query(
          `INSERT INTO guarantors (
            loan_id, guarantor_name, guarantor_email, guarantor_id_number, guarantor_phone,
            guarantor_type, county, location, sub_location, place_of_work
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            loanId, witness.name, witness.email, witness.idNumber, witness.phone,
            'WITNESS', witness.county, witness.location,
            witness.subLocation, witness.placeOfWork
          ]
        );

        // Send email to witness
        try {
          await sendGuarantorNotification(witness.email, {
            memberName: member.full_name,
            memberPhone: member.phone,
            memberEmail: member.email,
            memberIdNumber: member.id_number,
            loanAmount: amount,
            guarantorType: 'Witness/Next of Kin',
            guarantorName: witness.name
          });
        } catch (emailError) {
          console.error(`Email error for ${witness.email}:`, emailError.message);
        }
      }

      await client.query("COMMIT");

      res.json({ 
        success: true, 
        loan: loanRes.rows[0],
        breakdown: {
          principal: parseFloat(amount.toFixed(2)),
          processingFee: parseFloat(processingFee.toFixed(2)),
          principalWithFee: parseFloat(principalWithFee.toFixed(2)),
          interest: parseFloat(totalInterest.toFixed(2)),
          total: parseFloat(totalPayable.toFixed(2)),
          monthlyPayment: parseFloat(monthlyPayment.toFixed(2)),
          monthlyInterestRate: (monthlyInterestRate * 100).toFixed(3) + '%',
          annualInterestRate: ((monthlyInterestRate * 12 * 100).toFixed(2)) + '%'
        },
        guarantorsCount: {
          members: guarantors.length,
          churchOfficials: churchOfficials.length,
          witnesses: witnesses.length
        }
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get loan details with guarantors
router.get("/:id", auth, async (req, res) => {
  const { id } = req.params;

  try {
    // Get loan details
    const loanRes = await pool.query(
      `SELECT l.*, u.full_name, u.email, u.phone 
       FROM loans l 
       JOIN users u ON l.user_id = u.id 
       WHERE l.id = $1`,
      [id]
    );

    if (loanRes.rows.length === 0) {
      return res.status(404).json({ message: "Loan not found" });
    }

    // Check authorization
    if (req.user.role !== "ADMIN" && loanRes.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Get all guarantors
    const guarantorsRes = await pool.query(
      `SELECT * FROM guarantors WHERE loan_id = $1 ORDER BY guarantor_type, id`,
      [id]
    );

    const loan = loanRes.rows[0];
    const allGuarantors = guarantorsRes.rows;

    res.json({
      loan: {
        id: loan.id,
        userId: loan.user_id,
        memberName: loan.full_name,
        memberEmail: loan.email,
        memberPhone: loan.phone,
        amount: parseFloat(loan.amount),
        principalAmount: parseFloat(loan.principal_amount),
        initialAmount: parseFloat(loan.initial_amount),
        interestRate: parseFloat(loan.interest_rate),
        repaymentPeriod: loan.repayment_period,
        loanPurpose: loan.loan_purpose,
        status: loan.status,
        createdAt: loan.created_at
      },
      guarantors: {
        members: allGuarantors.filter(g => g.guarantor_type === 'MEMBER').map(g => ({
          id: g.id,
          name: g.guarantor_name,
          email: g.guarantor_email,
          idNumber: g.guarantor_id_number,
          phone: g.guarantor_phone,
          county: g.county,
          location: g.location,
          subLocation: g.sub_location,
          placeOfWork: g.place_of_work,
          shares: parseFloat(g.shares)
        })),
        churchOfficials: allGuarantors.filter(g => g.guarantor_type === 'CHURCH_OFFICIAL').map(g => ({
          id: g.id,
          name: g.guarantor_name,
          email: g.guarantor_email,
          idNumber: g.guarantor_id_number,
          phone: g.guarantor_phone,
          position: g.position,
          localChurch: g.local_church,
          county: g.county,
          location: g.location,
          subLocation: g.sub_location
        })),
        witnesses: allGuarantors.filter(g => g.guarantor_type === 'WITNESS').map(g => ({
          id: g.id,
          name: g.guarantor_name,
          email: g.guarantor_email,
          idNumber: g.guarantor_id_number,
          phone: g.guarantor_phone,
          county: g.county,
          location: g.location,
          subLocation: g.sub_location,
          placeOfWork: g.place_of_work
        }))
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
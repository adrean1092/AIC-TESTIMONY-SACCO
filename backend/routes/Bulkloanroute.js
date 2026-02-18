/**
 * BULK LOAN UPLOAD ROUTE
 * Add this to your admin.js routes file
 * 
 * This allows admins to import historical loans in bulk
 */

// Add this route to your routes/admin.js file

/**
 * POST /api/admin/loans/bulk-create
 * Bulk create historical loans for members
 */
router.post("/loans/bulk-create", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden" });
  }

  const { loans } = req.body;

  if (!loans || !Array.isArray(loans) || loans.length === 0) {
    return res.status(400).json({ 
      message: "Please provide an array of loans to import" 
    });
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
          notes
        } = loanData;

        // Validate required fields
        if (!sacco_number || !loan_amount) {
          failed.push({
            sacco_number: sacco_number || "N/A",
            loan_amount,
            reason: "Missing SACCO number or loan amount"
          });
          continue;
        }

        // Find member by SACCO number
        const memberRes = await client.query(
          "SELECT id, full_name, loan_limit FROM users WHERE sacco_number = $1",
          [sacco_number]
        );

        if (memberRes.rows.length === 0) {
          failed.push({
            sacco_number,
            loan_amount,
            reason: "Member not found with this SACCO number"
          });
          continue;
        }

        const member = memberRes.rows[0];
        const amount = parseFloat(loan_amount);

        // Validate loan amount
        if (amount <= 0) {
          failed.push({
            sacco_number,
            loan_amount,
            reason: "Loan amount must be greater than 0"
          });
          continue;
        }

        // Calculate loan details
        const processingFee = amount * 0.005; // 0.5%
        const principalWithFee = amount + processingFee;
        const monthlyRate = parseFloat(interest_rate) / 100;
        const period = parseInt(repayment_period);
        const totalInterest = principalWithFee * monthlyRate * period;
        const totalRepayable = principalWithFee + totalInterest;

        // Create the loan (already approved)
        const loanRes = await client.query(`
          INSERT INTO loans 
          (user_id, amount, initial_amount, principal_amount, interest_rate, 
           repayment_period, loan_purpose, status, created_at, approved_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
          RETURNING id
        `, [
          member.id,
          totalRepayable, // Total amount to be repaid
          amount, // Original loan amount
          principalWithFee, // Principal + processing fee
          interest_rate,
          period,
          loan_purpose,
          'APPROVED',
          loan_date || new Date()
        ]);

        const loanId = loanRes.rows[0].id;

        // Add note if provided
        if (notes) {
          await client.query(`
            INSERT INTO loan_notes (loan_id, note, created_by, created_at)
            VALUES ($1, $2, $3, NOW())
          `, [loanId, notes, req.user.id]);
        }

        successful.push({
          loan_id: loanId,
          sacco_number,
          member_name: member.full_name,
          amount,
          repayment_period: period,
          status: 'APPROVED'
        });

      } catch (err) {
        console.error("Error creating loan:", err);
        failed.push({
          sacco_number: loanData.sacco_number || "N/A",
          loan_amount: loanData.loan_amount,
          reason: err.message || "Database error"
        });
      }
    }

    await client.query("COMMIT");

    res.json({
      message: `Imported ${successful.length} loans successfully. ${failed.length} failed.`,
      successful,
      failed
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Bulk loan creation error:", err);
    res.status(500).json({ 
      message: "Server error during bulk import",
      error: err.message 
    });
  } finally {
    client.release();
  }
});
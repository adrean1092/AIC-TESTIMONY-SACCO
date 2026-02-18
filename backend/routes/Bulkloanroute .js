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
          // ── partial payment support ──────────────────────────────────
          principal_paid,
          interest_paid,
          last_payment_date,
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

        if (amount <= 0) {
          failed.push({ sacco_number, loan_amount, reason: "Loan amount must be greater than 0" });
          continue;
        }

        // Calculate loan figures
        const processingFee    = amount * 0.005; // 0.5%
        const principalWithFee = amount + processingFee;
        const monthlyRate      = parseFloat(interest_rate) / 100;
        const period           = parseInt(repayment_period);

        // Amortisation formula
        const monthlyPayment =
          (principalWithFee * monthlyRate * Math.pow(1 + monthlyRate, period)) /
          (Math.pow(1 + monthlyRate, period) - 1);
        const totalPayable  = monthlyPayment * period;
        const totalInterest = totalPayable - principalWithFee;

        // Prior payment amounts
        const prevPrincipalPaid = parseFloat(principal_paid || 0);
        const prevInterestPaid  = parseFloat(interest_paid  || 0);
        const hasPriorPayments  = prevPrincipalPaid > 0 || prevInterestPaid > 0;

        if (hasPriorPayments && prevPrincipalPaid > principalWithFee) {
          failed.push({
            sacco_number,
            loan_amount,
            reason: `principal_paid (${prevPrincipalPaid}) exceeds principal+fee (${principalWithFee.toFixed(2)})`
          });
          continue;
        }

        // Current outstanding = principal+fee minus what's already been paid
        const currentBalance = Math.max(0, principalWithFee - prevPrincipalPaid);

        // Create the loan
        const loanRes = await client.query(`
          INSERT INTO loans 
          (user_id, amount, initial_amount, principal_amount,
           interest_rate, repayment_period, loan_purpose,
           processing_fee, monthly_payment, total_interest,
           principal_paid, interest_paid,
           status, created_at, approved_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14)
          RETURNING id
        `, [
          member.id,
          currentBalance,       // amount = current outstanding balance
          amount,               // initial_amount = original loan amount
          principalWithFee,     // principal_amount = principal + fee
          interest_rate,
          period,
          loan_purpose,
          processingFee,
          monthlyPayment,
          totalInterest,
          prevPrincipalPaid,
          prevInterestPaid,
          'APPROVED',
          loan_date || new Date()
        ]);

        const loanId = loanRes.rows[0].id;

        // Insert prior payment record if applicable
        if (hasPriorPayments) {
          const paymentDate = last_payment_date || loan_date || new Date();
          await client.query(`
            INSERT INTO loan_payments (loan_id, principal_paid, interest_paid, payment_date)
            VALUES ($1, $2, $3, $4)
          `, [loanId, prevPrincipalPaid, prevInterestPaid, paymentDate]);
        }

        // Add note if provided
        if (notes) {
          try {
            await client.query(`
              INSERT INTO loan_notes (loan_id, note, created_by, created_at)
              VALUES ($1, $2, $3, NOW())
            `, [loanId, notes, req.user.id]);
          } catch (_) { /* loan_notes table may not exist in all deployments */ }
        }

        successful.push({
          loan_id         : loanId,
          sacco_number,
          member_name     : member.full_name,
          amount,                                   // original amount
          repayment_period: period,
          current_balance : currentBalance,         // balance after prior payments
          principal_paid  : prevPrincipalPaid,
          interest_paid   : prevInterestPaid,
          status          : 'APPROVED'
        });

      } catch (err) {
        console.error("Error creating loan:", err);
        failed.push({
          sacco_number: loanData.sacco_number || "N/A",
          loan_amount : loanData.loan_amount,
          reason      : err.message || "Database error"
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
/**
 * BULK LOAN UPLOAD ROUTE  (FIXED)
 * ─────────────────────────────────────────────────────────────────────────────
 * Key fix: when a historical loan is imported, we now AUTO-CALCULATE how many
 * monthly amortisation payments have elapsed between loan_date and today, then
 * store the accumulated principal_paid / interest_paid and set the current
 * outstanding balance correctly.
 *
 * You can still override with explicit principal_paid / interest_paid values in
 * the CSV if you already know the exact figures (e.g. from old records).
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Helper – walk the amortisation schedule from month 1 up to `monthsElapsed`
 * and return accumulated { principalPaid, interestPaid, remainingBalance }.
 */
function calcElapsedPayments(principalWithFee, monthlyRate, period, monthsElapsed) {
  // Amortisation formula for constant monthly payment
  const monthlyPayment =
    (principalWithFee * monthlyRate * Math.pow(1 + monthlyRate, period)) /
    (Math.pow(1 + monthlyRate, period) - 1);

  let balance = principalWithFee;
  let totalPrincipalPaid = 0;
  let totalInterestPaid = 0;

  const paymentsToProcess = Math.min(monthsElapsed, period);

  for (let m = 0; m < paymentsToProcess; m++) {
    const interestThisMonth = balance * monthlyRate;
    const principalThisMonth = monthlyPayment - interestThisMonth;

    totalInterestPaid += interestThisMonth;
    totalPrincipalPaid += principalThisMonth;
    balance -= principalThisMonth;
  }

  return {
    monthlyPayment,
    principalPaid: Math.max(0, totalPrincipalPaid),
    interestPaid: Math.max(0, totalInterestPaid),
    remainingBalance: Math.max(0, balance),
    paymentsProcessed: paymentsToProcess
  };
}

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

    const today = new Date();

    for (const loanData of loans) {
      try {
        const {
          sacco_number,
          loan_amount,
          interest_rate = 1.045,
          repayment_period = 12,
          loan_purpose = "Historical loan",
          loan_date,
          // Optional overrides – if provided they take precedence over auto-calc
          principal_paid: principalPaidOverride,
          interest_paid: interestPaidOverride,
          last_payment_date,
          notes
        } = loanData;

        // ── Validate required fields ────────────────────────────────────────
        if (!sacco_number || !loan_amount) {
          failed.push({
            sacco_number: sacco_number || "N/A",
            loan_amount,
            reason: "Missing SACCO number or loan amount"
          });
          continue;
        }

        // ── Find member ─────────────────────────────────────────────────────
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

        // ── Core loan calculations ──────────────────────────────────────────
        const processingFee    = amount * 0.005;           // 0.5%
        const principalWithFee = amount + processingFee;
        const monthlyRate      = parseFloat(interest_rate) / 100;
        const period           = parseInt(repayment_period);

        // ── Determine how many months have elapsed since loan_date ──────────
        const loanStart = loan_date ? new Date(loan_date) : new Date();

        // Months elapsed = full calendar months between loan start and today
        const monthsElapsed =
          (today.getFullYear() - loanStart.getFullYear()) * 12 +
          (today.getMonth()   - loanStart.getMonth());

        // ── Auto-calculate OR use provided override values ──────────────────
        let principalPaid, interestPaid, currentBalance, monthlyPayment, paymentsProcessed;

        const hasOverride =
          principalPaidOverride !== undefined && principalPaidOverride !== "" &&
          interestPaidOverride  !== undefined && interestPaidOverride  !== "";

        if (hasOverride) {
          // Admin supplied explicit figures from old records – trust them
          principalPaid     = parseFloat(principalPaidOverride);
          interestPaid      = parseFloat(interestPaidOverride);
          currentBalance    = Math.max(0, principalWithFee - principalPaid);
          monthlyPayment    =
            (principalWithFee * monthlyRate * Math.pow(1 + monthlyRate, period)) /
            (Math.pow(1 + monthlyRate, period) - 1);
          paymentsProcessed = "manual";

          if (principalPaid > principalWithFee) {
            failed.push({
              sacco_number,
              loan_amount,
              reason: `principal_paid (${principalPaid}) exceeds principal+fee (${principalWithFee.toFixed(2)})`
            });
            continue;
          }
        } else if (monthsElapsed <= 0) {
          // Loan just started – no payments yet
          monthlyPayment =
            (principalWithFee * monthlyRate * Math.pow(1 + monthlyRate, period)) /
            (Math.pow(1 + monthlyRate, period) - 1);
          principalPaid     = 0;
          interestPaid      = 0;
          currentBalance    = principalWithFee;
          paymentsProcessed = 0;
        } else {
          // ✅ AUTO-CALCULATE based on elapsed months
          const calc = calcElapsedPayments(principalWithFee, monthlyRate, period, monthsElapsed);
          monthlyPayment    = calc.monthlyPayment;
          principalPaid     = calc.principalPaid;
          interestPaid      = calc.interestPaid;
          currentBalance    = calc.remainingBalance;
          paymentsProcessed = calc.paymentsProcessed;
        }

        const totalPayable  = monthlyPayment * period;
        const totalInterest = totalPayable - principalWithFee;

        // ── Insert the loan record ──────────────────────────────────────────
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
          principalPaid,
          interestPaid,
          'APPROVED',
          loanStart             // use the actual loan date, not NOW()
        ]);

        const loanId = loanRes.rows[0].id;

        // ── Insert accumulated payment record (if any payments have elapsed) ─
        if (principalPaid > 0 || interestPaid > 0) {
          // Use last_payment_date if provided, otherwise calculate it
          // (last full payment month before today)
          let paymentDate;
          if (last_payment_date) {
            paymentDate = new Date(last_payment_date);
          } else {
            paymentDate = new Date(loanStart);
            const paidMonths = typeof paymentsProcessed === "number" ? paymentsProcessed : monthsElapsed;
            paymentDate.setMonth(paymentDate.getMonth() + paidMonths);
          }

          await client.query(`
            INSERT INTO loan_payments (loan_id, principal_paid, interest_paid, payment_date)
            VALUES ($1, $2, $3, $4)
          `, [loanId, principalPaid, interestPaid, paymentDate]);
        }

        // ── Optional notes ──────────────────────────────────────────────────
        if (notes) {
          try {
            await client.query(`
              INSERT INTO loan_notes (loan_id, note, created_by, created_at)
              VALUES ($1, $2, $3, NOW())
            `, [loanId, notes, req.user.id]);
          } catch (_) { /* loan_notes table may not exist in all deployments */ }
        }

        successful.push({
          loan_id:           loanId,
          sacco_number,
          member_name:       member.full_name,
          original_amount:   amount,
          repayment_period:  period,
          months_elapsed:    typeof paymentsProcessed === "number" ? paymentsProcessed : "manual",
          principal_paid:    parseFloat(principalPaid.toFixed(2)),
          interest_paid:     parseFloat(interestPaid.toFixed(2)),
          current_balance:   parseFloat(currentBalance.toFixed(2)),
          monthly_payment:   parseFloat(monthlyPayment.toFixed(2)),
          status:            'APPROVED'
        });

      } catch (err) {
        console.error("Error creating loan:", err);
        failed.push({
          sacco_number: loanData.sacco_number || "N/A",
          loan_amount:  loanData.loan_amount,
          reason:       err.message || "Database error"
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
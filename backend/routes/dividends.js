const express = require("express");
const router = express.Router();
const pool = require("../db");
const auth = require("../middleware/auth");

// ======== ADMIN DIVIDENDS ROUTES ========

/**
 * GET /api/admin/dividends/declarations
 * Get all dividend declarations
 */
router.get("/declarations", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden" });
  }

  try {
    const declarations = await pool.query(`
      SELECT 
        id,
        financial_year,
        dividend_rate,
        total_eligible_savings,
        total_dividend_amount,
        declaration_date,
        payment_status,
        notes
      FROM dividend_declarations
      ORDER BY financial_year DESC
    `);

    res.json(declarations.rows.map(d => ({
      id: d.id,
      financialYear: d.financial_year,
      dividendRate: parseFloat(d.dividend_rate),
      totalEligibleSavings: parseFloat(d.total_eligible_savings),
      totalDividendAmount: parseFloat(d.total_dividend_amount),
      declarationDate: d.declaration_date,
      paymentStatus: d.payment_status,
      notes: d.notes
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/admin/dividends/declare
 * Declare dividends for a financial year
 */
router.post("/declare", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden" });
  }

  const { financialYear, dividendRate, notes } = req.body;

  if (!financialYear || !dividendRate) {
    return res.status(400).json({ 
      message: "Financial year and dividend rate are required" 
    });
  }

  if (dividendRate <= 0 || dividendRate > 20) {
    return res.status(400).json({ 
      message: "Dividend rate must be between 0.1% and 20%" 
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Check if dividends already declared for this year
    const existing = await client.query(
      "SELECT id FROM dividend_declarations WHERE financial_year = $1",
      [financialYear]
    );

    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ 
        message: `Dividends already declared for ${financialYear}` 
      });
    }

    // Calculate total eligible savings (sum of all member savings as of year end)
    const savingsRes = await client.query(`
      SELECT COALESCE(SUM(s.amount), 0) as total_savings
      FROM savings s
      JOIN users u ON s.user_id = u.id
      WHERE u.role = 'MEMBER'
      AND EXTRACT(YEAR FROM s.saved_at) <= $1
    `, [financialYear]);

    const totalEligibleSavings = parseFloat(savingsRes.rows[0].total_savings);
    const totalDividendAmount = (totalEligibleSavings * dividendRate) / 100;

    // Create dividend declaration
    const declarationRes = await client.query(`
      INSERT INTO dividend_declarations 
      (financial_year, dividend_rate, total_eligible_savings, total_dividend_amount, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [financialYear, dividendRate, totalEligibleSavings, totalDividendAmount, notes || null]);

    const declarationId = declarationRes.rows[0].id;

    // Calculate and create individual dividend allocations
    const membersRes = await client.query(`
      SELECT 
        u.id,
        u.full_name,
        u.sacco_number,
        COALESCE(SUM(s.amount), 0) as total_savings
      FROM users u
      LEFT JOIN savings s ON s.user_id = u.id 
        AND EXTRACT(YEAR FROM s.saved_at) <= $1
      WHERE u.role = 'MEMBER'
      GROUP BY u.id, u.full_name, u.sacco_number
      HAVING COALESCE(SUM(s.amount), 0) > 0
    `, [financialYear]);

    // Insert dividend allocations for each member
    for (const member of membersRes.rows) {
      const memberSavings = parseFloat(member.total_savings);
      const dividendAmount = (memberSavings * dividendRate) / 100;

      await client.query(`
        INSERT INTO dividend_allocations
        (declaration_id, user_id, savings_amount, dividend_amount)
        VALUES ($1, $2, $3, $4)
      `, [declarationId, member.id, memberSavings, dividendAmount]);
    }

    await client.query("COMMIT");

    res.json({
      success: true,
      declaration: {
        id: declarationRes.rows[0].id,
        financialYear,
        dividendRate: parseFloat(dividendRate),
        totalEligibleSavings,
        totalDividendAmount,
        membersCount: membersRes.rows.length
      }
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
});

/**
 * GET /api/admin/dividends/declaration/:id
 * Get details of a specific dividend declaration including member allocations
 */
router.get("/declaration/:id", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden" });
  }

  const { id } = req.params;

  try {
    // Get declaration details
    const declarationRes = await pool.query(`
      SELECT * FROM dividend_declarations WHERE id = $1
    `, [id]);

    if (declarationRes.rows.length === 0) {
      return res.status(404).json({ message: "Declaration not found" });
    }

    const declaration = declarationRes.rows[0];

    // Get member allocations
    const allocationsRes = await pool.query(`
      SELECT 
        da.id,
        da.savings_amount,
        da.dividend_amount,
        da.payment_status,
        da.payment_date,
        u.id as user_id,
        u.full_name,
        u.sacco_number,
        u.email,
        u.phone
      FROM dividend_allocations da
      JOIN users u ON da.user_id = u.id
      WHERE da.declaration_id = $1
      ORDER BY u.full_name
    `, [id]);

    res.json({
      declaration: {
        id: declaration.id,
        financialYear: declaration.financial_year,
        dividendRate: parseFloat(declaration.dividend_rate),
        totalEligibleSavings: parseFloat(declaration.total_eligible_savings),
        totalDividendAmount: parseFloat(declaration.total_dividend_amount),
        declarationDate: declaration.declaration_date,
        paymentStatus: declaration.payment_status,
        notes: declaration.notes
      },
      allocations: allocationsRes.rows.map(a => ({
        id: a.id,
        userId: a.user_id,
        memberName: a.full_name,
        saccoNumber: a.sacco_number,
        email: a.email,
        phone: a.phone,
        savingsAmount: parseFloat(a.savings_amount),
        dividendAmount: parseFloat(a.dividend_amount),
        paymentStatus: a.payment_status,
        paymentDate: a.payment_date
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/admin/dividends/pay/:declarationId
 * Mark dividends as paid for a declaration
 * This credits dividends to member savings
 */
router.post("/pay/:declarationId", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden" });
  }

  const { declarationId } = req.params;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Get declaration
    const declarationRes = await client.query(`
      SELECT * FROM dividend_declarations WHERE id = $1
    `, [declarationId]);

    if (declarationRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Declaration not found" });
    }

    const declaration = declarationRes.rows[0];

    if (declaration.payment_status === 'PAID') {
      await client.query("ROLLBACK");
      return res.status(400).json({ 
        message: "Dividends already paid for this declaration" 
      });
    }

    // Get all unpaid allocations
    const allocationsRes = await client.query(`
      SELECT * FROM dividend_allocations 
      WHERE declaration_id = $1 AND payment_status = 'PENDING'
    `, [declarationId]);

    let paidCount = 0;
    let totalPaid = 0;

    // Pay each allocation by adding to member savings
    for (const allocation of allocationsRes.rows) {
      const dividendAmount = parseFloat(allocation.dividend_amount);

      // Insert dividend as savings
      await client.query(`
        INSERT INTO savings (user_id, amount, saved_at, source)
        VALUES ($1, $2, NOW(), $3)
      `, [allocation.user_id, dividendAmount, `Dividend ${declaration.financial_year}`]);

      // Update loan limit (3x savings rule)
      await client.query(`
        UPDATE users 
        SET loan_limit = loan_limit + ($1 * 3)
        WHERE id = $2
      `, [dividendAmount, allocation.user_id]);

      // Mark allocation as paid
      await client.query(`
        UPDATE dividend_allocations
        SET payment_status = 'PAID', payment_date = NOW()
        WHERE id = $1
      `, [allocation.id]);

      paidCount++;
      totalPaid += dividendAmount;
    }

    // Update declaration status
    await client.query(`
      UPDATE dividend_declarations
      SET payment_status = 'PAID'
      WHERE id = $1
    `, [declarationId]);

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "Dividends paid successfully",
      stats: {
        membersPaid: paidCount,
        totalAmount: parseFloat(totalPaid.toFixed(2)),
        financialYear: declaration.financial_year
      }
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/admin/dividends/declaration/:id
 * Delete a dividend declaration (only if not paid)
 */
router.delete("/declaration/:id", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden" });
  }

  const { id } = req.params;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Check declaration exists and is not paid
    const declarationRes = await client.query(`
      SELECT payment_status FROM dividend_declarations WHERE id = $1
    `, [id]);

    if (declarationRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Declaration not found" });
    }

    if (declarationRes.rows[0].payment_status === 'PAID') {
      await client.query("ROLLBACK");
      return res.status(400).json({ 
        message: "Cannot delete paid dividend declarations" 
      });
    }

    // Delete allocations first (foreign key constraint)
    await client.query("DELETE FROM dividend_allocations WHERE declaration_id = $1", [id]);

    // Delete declaration
    await client.query("DELETE FROM dividend_declarations WHERE id = $1", [id]);

    await client.query("COMMIT");

    res.json({ message: "Dividend declaration deleted successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
});

// ======== MEMBER DIVIDENDS ROUTES ========

/**
 * GET /api/members/my-dividends
 * Get member's dividend history
 */
router.get("/my-dividends", auth, async (req, res) => {
  if (req.user.role !== "MEMBER") {
    return res.status(403).json({ message: "Forbidden" });
  }

  try {
    const dividendsRes = await pool.query(`
      SELECT 
        dd.financial_year,
        dd.dividend_rate,
        dd.declaration_date,
        da.savings_amount,
        da.dividend_amount,
        da.payment_status,
        da.payment_date
      FROM dividend_allocations da
      JOIN dividend_declarations dd ON da.declaration_id = dd.id
      WHERE da.user_id = $1
      ORDER BY dd.financial_year DESC
    `, [req.user.id]);

    res.json({
      dividends: dividendsRes.rows.map(d => ({
        financialYear: d.financial_year,
        dividendRate: parseFloat(d.dividend_rate),
        declarationDate: d.declaration_date,
        savingsAmount: parseFloat(d.savings_amount),
        dividendAmount: parseFloat(d.dividend_amount),
        paymentStatus: d.payment_status,
        paymentDate: d.payment_date
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
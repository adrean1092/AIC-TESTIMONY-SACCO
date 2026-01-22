const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const userRes = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    if (!userRes.rows.length) return res.status(400).json({ message: "User not found" });

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "12h" });

    res.json({ token, role: user.role, user: { id: user.id, name: user.full_name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// CORS Configuration
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://aic-sacco-frontend.onrender.com',
    'https://aictestimonysacco.com',
    'https://www.aictestimonysacco.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require("./routes/auth");
const memberRoutes = require("./routes/members");
const loanRoutes = require("./routes/loans");
const adminRoutes = require("./routes/admin");
const publicRoutes = require("./routes/public");
const dividendsRoutes = require("./routes/dividends");

// Register routes - CRITICAL: More specific routes MUST come first!
app.use("/api/auth", authRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/public", publicRoutes);

// Dividends MUST be registered BEFORE /api/admin and /api/members
app.use("/api/admin/dividends", dividendsRoutes);
app.use("/api/members/dividends", dividendsRoutes);

// Now register general routes
app.use("/api/admin", adminRoutes);
app.use("/api/members", memberRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ message: "AIC Testimony SACCO API is running" });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Routes registered:");
  console.log("  /api/auth/*");
  console.log("  /api/loans/*");
  console.log("  /api/public/*");
  console.log("  /api/admin/dividends/*");
  console.log("  /api/members/dividends/*");
  console.log("  /api/admin/*");
  console.log("  /api/members/*");
});

module.exports = app;
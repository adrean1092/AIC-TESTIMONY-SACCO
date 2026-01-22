const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

// Routes
const authRoutes = require("./routes/auth");
const memberRoutes = require("./routes/members");
const adminRoutes = require("./routes/admin");
const loanRoutes = require("./routes/loans");
const publicRoutes = require("./routes/public"); // ✅ ADD THIS

const app = express();

// Determine allowed origins
const allowedOrigins = [
  "http://localhost:5173", // local dev
  "https://aic-testimony-sacco-1.onrender.com" // production frontend
];

// CORS setup
app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin (e.g., Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/public", publicRoutes); // ✅ ADD THIS

// Test route
app.get("/", (req, res) => res.send("SACCO Backend is running"));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

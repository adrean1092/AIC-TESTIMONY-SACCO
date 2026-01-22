const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// CORS Configuration - CRITICAL FOR FRONTEND TO WORK
const corsOptions = {
  origin: [
    'http://localhost:5173',        // Vite dev server
    'http://localhost:3000',        // React dev server  
    'https://your-frontend-domain.com', // Replace with your actual frontend domain
    // Add more origins as needed
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

// Apply CORS middleware BEFORE routes
app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require("./routes/auth");
const memberRoutes = require("./routes/members");
const loanRoutes = require("./routes/loans");
const adminRoutes = require("./routes/admin");
const publicRoutes = require("./routes/public");

// Register routes
app.use("/api/auth", authRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/public", publicRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ message: "AIC Testimony SACCO API is running" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
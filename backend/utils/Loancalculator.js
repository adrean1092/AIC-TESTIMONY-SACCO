/**
 * AIC Testimony SACCO Loan Calculator
 * Implements reducing balance method with monthly rate of 1.8%
 * Processing fee of 0.5% added to principal
 */

/**
 * Calculate loan with reducing balance method
 * @param {number} principal - Loan amount requested (before processing fee)
 * @param {number} months - Repayment period in months
 * @returns {Object} Loan details and payment schedule
 */
function calculateLoan(principal, months) {
  // Constants
  const MONTHLY_INTEREST_RATE = 1.8 / 100; // 1.8% per month
  const PROCESSING_FEE_RATE = 0.5 / 100; // 0.5% processing fee
  const ANNUAL_INTEREST_RATE = MONTHLY_INTEREST_RATE * 12 * 100; // 21.6% annual
  
  // Step 1: Calculate processing fee and add to principal
  const processingFee = principal * PROCESSING_FEE_RATE;
  const principalWithFee = principal + processingFee;
  
  // Step 2: Calculate monthly payment using reducing balance formula
  // M = P * r * (1 + r)^n / ((1 + r)^n - 1)
  let monthlyPayment;
  if (MONTHLY_INTEREST_RATE > 0) {
    const factor = Math.pow(1 + MONTHLY_INTEREST_RATE, months);
    monthlyPayment = principalWithFee * MONTHLY_INTEREST_RATE * factor / (factor - 1);
  } else {
    monthlyPayment = principalWithFee / months;
  }
  
  // Step 3: Generate payment schedule
  const schedule = [];
  let remainingPrincipal = principalWithFee;
  let totalInterestPaid = 0;
  
  for (let month = 1; month <= months; month++) {
    // Interest for this month on remaining balance
    const interestPayment = remainingPrincipal * MONTHLY_INTEREST_RATE;
    
    // Principal repaid this month
    const principalPayment = monthlyPayment - interestPayment;
    
    // Update remaining balance
    const previousBalance = remainingPrincipal;
    remainingPrincipal -= principalPayment;
    
    // Handle final payment rounding
    if (month === months) {
      remainingPrincipal = 0;
    }
    
    totalInterestPaid += interestPayment;
    
    schedule.push({
      month: month,
      openingBalance: parseFloat(previousBalance.toFixed(2)),
      monthlyPayment: parseFloat(monthlyPayment.toFixed(2)),
      interestPayment: parseFloat(interestPayment.toFixed(2)),
      principalPayment: parseFloat(principalPayment.toFixed(2)),
      closingBalance: parseFloat(Math.max(0, remainingPrincipal).toFixed(2))
    });
  }
  
  const totalPayable = monthlyPayment * months;
  
  return {
    // Input values
    requestedPrincipal: parseFloat(principal.toFixed(2)),
    repaymentPeriod: months,
    
    // Fees
    processingFee: parseFloat(processingFee.toFixed(2)),
    principalWithFee: parseFloat(principalWithFee.toFixed(2)),
    
    // Interest rates
    monthlyInterestRate: (MONTHLY_INTEREST_RATE * 100).toFixed(1) + '%',
    annualInterestRate: ANNUAL_INTEREST_RATE.toFixed(1) + '%',
    
    // Payment details
    monthlyPayment: parseFloat(monthlyPayment.toFixed(2)),
    totalInterest: parseFloat(totalInterestPaid.toFixed(2)),
    totalPayable: parseFloat(totalPayable.toFixed(2)),
    
    // Payment schedule
    schedule: schedule,
    
    // Summary
    summary: {
      principal: parseFloat(principal.toFixed(2)),
      processingFee: parseFloat(processingFee.toFixed(2)),
      totalPrincipal: parseFloat(principalWithFee.toFixed(2)),
      totalInterest: parseFloat(totalInterestPaid.toFixed(2)),
      grandTotal: parseFloat(totalPayable.toFixed(2))
    }
  };
}

/**
 * Calculate maximum loan amount based on savings
 * @param {number} savings - Total savings amount
 * @returns {number} Maximum loan amount (3x savings)
 */
function calculateMaxLoanAmount(savings) {
  return parseFloat((savings * 3).toFixed(2));
}

/**
 * Calculate loan eligibility
 * @param {number} savings - Total savings
 * @param {number} outstandingLoans - Current outstanding loan balance
 * @returns {Object} Eligibility details
 */
function calculateLoanEligibility(savings, outstandingLoans = 0) {
  const totalLoanLimit = calculateMaxLoanAmount(savings);
  const availableLoanLimit = Math.max(0, totalLoanLimit - outstandingLoans);
  
  return {
    totalSavings: parseFloat(savings.toFixed(2)),
    totalLoanLimit: totalLoanLimit,
    outstandingLoans: parseFloat(outstandingLoans.toFixed(2)),
    availableLoanLimit: availableLoanLimit,
    canBorrow: availableLoanLimit > 0,
    utilizationPercentage: totalLoanLimit > 0 
      ? parseFloat(((outstandingLoans / totalLoanLimit) * 100).toFixed(2))
      : 0
  };
}

/**
 * Calculate early settlement amount
 * @param {number} currentBalance - Current loan balance
 * @param {number} principalPaid - Principal already paid
 * @param {number} interestPaid - Interest already paid
 * @param {number} originalPrincipal - Original principal amount
 * @returns {Object} Settlement details
 */
function calculateEarlySettlement(currentBalance, principalPaid, interestPaid, originalPrincipal) {
  // Early settlement is just the current balance
  // No early settlement discount in this system
  return {
    currentBalance: parseFloat(currentBalance.toFixed(2)),
    principalPaid: parseFloat(principalPaid.toFixed(2)),
    interestPaid: parseFloat(interestPaid.toFixed(2)),
    settlementAmount: parseFloat(currentBalance.toFixed(2)),
    savings: 0 // No discount for early settlement
  };
}

/**
 * Validate loan request
 * @param {number} amount - Requested loan amount
 * @param {number} months - Repayment period
 * @param {number} availableLimit - Available loan limit
 * @returns {Object} Validation result
 */
function validateLoanRequest(amount, months, availableLimit) {
  const errors = [];
  
  if (!amount || amount <= 0) {
    errors.push("Loan amount must be greater than zero");
  }
  
  if (amount > availableLimit) {
    errors.push(`Loan amount exceeds available limit of KES ${availableLimit.toLocaleString()}`);
  }
  
  if (!months || months < 1) {
    errors.push("Repayment period must be at least 1 month");
  }
  
  if (months > 60) {
    errors.push("Repayment period cannot exceed 60 months");
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

// Example usage and testing
if (require.main === module) {
  console.log("AIC Testimony SACCO Loan Calculator");
  console.log("Interest Rate: 1.8% monthly (21.6% annual)");
  console.log("===================================\n");
  
  // Example 1: KES 100,000 for 12 months
  console.log("Example 1: KES 100,000 for 12 months");
  const loan1 = calculateLoan(100000, 12);
  console.log("Requested Principal:", loan1.requestedPrincipal);
  console.log("Processing Fee (0.5%):", loan1.processingFee);
  console.log("Total Principal:", loan1.principalWithFee);
  console.log("Monthly Interest Rate:", loan1.monthlyInterestRate);
  console.log("Annual Interest Rate:", loan1.annualInterestRate);
  console.log("Monthly Payment:", loan1.monthlyPayment);
  console.log("Total Interest:", loan1.totalInterest);
  console.log("Total Payable:", loan1.totalPayable);
  console.log("\nFirst 3 months schedule:");
  loan1.schedule.slice(0, 3).forEach(month => {
    console.log(`Month ${month.month}: Opening=${month.openingBalance}, Payment=${month.monthlyPayment}, Interest=${month.interestPayment}, Principal=${month.principalPayment}, Closing=${month.closingBalance}`);
  });
  
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Example 2: Loan eligibility check
  console.log("Example 2: Loan Eligibility");
  const eligibility = calculateLoanEligibility(50000, 30000);
  console.log("Total Savings:", eligibility.totalSavings);
  console.log("Total Loan Limit (3x):", eligibility.totalLoanLimit);
  console.log("Outstanding Loans:", eligibility.outstandingLoans);
  console.log("Available Loan Limit:", eligibility.availableLoanLimit);
  console.log("Can Borrow:", eligibility.canBorrow);
  console.log("Utilization:", eligibility.utilizationPercentage + "%");
}

module.exports = {
  calculateLoan,
  calculateMaxLoanAmount,
  calculateLoanEligibility,
  calculateEarlySettlement,
  validateLoanRequest
};
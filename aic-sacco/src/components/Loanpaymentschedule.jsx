import React, { useMemo } from "react";

/**
 * Loan Payment Schedule Component
 * Displays a complete month-by-month breakdown of loan payments with exact dates
 */
export default function LoanPaymentSchedule({ principal, repaymentPeriod, loanStartDate, onClose }) {
  // Interest rate: 1.045% monthly (12.54% annual)
  const MONTHLY_RATE = 0.01045;
  const PROCESSING_FEE_RATE = 0.005; // 0.5%
  
  // Calculate processing fee and adjusted principal
  const processingFee = principal * PROCESSING_FEE_RATE;
  const principalWithFee = principal + processingFee;
  
  // Parse loan start date or use today
  const startDate = useMemo(() => {
    if (loanStartDate) {
      return new Date(loanStartDate);
    }
    return new Date();
  }, [loanStartDate]);
  
  // Calculate monthly payment using standard amortization formula
  const monthlyPayment = useMemo(() => {
    const r = MONTHLY_RATE;
    const n = repaymentPeriod;
    const P = principalWithFee;
    
    return (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }, [principalWithFee, repaymentPeriod]);

  // Generate complete payment schedule with exact dates
  const schedule = useMemo(() => {
    let remainingBalance = principalWithFee;
    const payments = [];
    
    for (let month = 1; month <= repaymentPeriod; month++) {
      const interestPayment = remainingBalance * MONTHLY_RATE;
      const principalPayment = monthlyPayment - interestPayment;
      
      // Calculate payment date (add months to start date)
      const paymentDate = new Date(startDate);
      paymentDate.setMonth(paymentDate.getMonth() + month);
      
      payments.push({
        month,
        paymentDate: paymentDate,
        principalBalance: remainingBalance,
        payment: monthlyPayment,
        principalPayment,
        interestPayment
      });
      
      remainingBalance -= principalPayment;
    }
    
    return payments;
  }, [principalWithFee, monthlyPayment, repaymentPeriod, startDate]);

  // Calculate totals
  const totalInterest = schedule.reduce((sum, p) => sum + p.interestPayment, 0);
  const totalRepayment = principalWithFee + totalInterest;

  // Format date as "Jan 15, 2025"
  const formatDate = (date) => {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-700 to-red-800 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">Payment Schedule Breakdown</h2>
              <p className="text-red-100 text-sm mt-1">Complete month-by-month payment details with exact dates</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-red-200 text-3xl font-bold leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="bg-gray-50 p-6 border-b">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-xs text-gray-600 mb-1">Loan Start Date</p>
              <p className="text-lg font-bold text-gray-900">
                {formatDate(startDate)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-xs text-gray-600 mb-1">Principal Amount</p>
              <p className="text-lg font-bold text-gray-900">
                KES {principal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-xs text-gray-600 mb-1">Processing Fee (0.5%)</p>
              <p className="text-lg font-bold text-orange-600">
                KES {processingFee.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-xs text-gray-600 mb-1">Principal + Fee</p>
              <p className="text-lg font-bold text-blue-700">
                KES {principalWithFee.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-xs text-gray-600 mb-1">Monthly Payment</p>
              <p className="text-lg font-bold text-green-700">
                KES {monthlyPayment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-xs text-gray-600 mb-1">Repayment Period</p>
              <p className="text-lg font-bold text-purple-700">
                {repaymentPeriod} months
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-xs text-gray-600 mb-1">Total Interest</p>
              <p className="text-lg font-bold text-red-600">
                KES {totalInterest.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-xs text-gray-600 mb-1">Total Repayment</p>
              <p className="text-lg font-bold text-red-700">
                KES {totalRepayment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </p>
            </div>
          </div>
          
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Interest Rate:</span> {(MONTHLY_RATE * 100).toFixed(3)}% monthly 
              ({(MONTHLY_RATE * 12 * 100).toFixed(2)}% per annum)
            </p>
          </div>
        </div>

        {/* Payment Schedule Table */}
        <div className="flex-1 overflow-auto p-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-gray-800 text-white z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Payment #</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Due Date</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Principal Balance</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Payment</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Amt Repaid</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Interest</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((payment, index) => (
                  <tr 
                    key={payment.month}
                    className={`${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-blue-50 transition`}
                  >
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {payment.month}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatDate(payment.paymentDate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-blue-700">
                      KES {payment.principalBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-green-700">
                      KES {payment.payment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                      KES {payment.principalPayment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-red-600">
                      KES {payment.interestPayment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 bg-gray-800 text-white">
                <tr>
                  <td className="px-4 py-3 text-sm font-bold" colSpan="2">TOTALS</td>
                  <td className="px-4 py-3 text-sm text-right font-bold">—</td>
                  <td className="px-4 py-3 text-sm text-right font-bold">
                    KES {(monthlyPayment * repaymentPeriod).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-bold">
                    KES {principalWithFee.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-bold">
                    KES {totalInterest.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Final payment due: <span className="font-semibold text-gray-900">{formatDate(schedule[schedule.length - 1].paymentDate)}</span>
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
import { useState } from "react";

export default function RequestLoanForm({ maxLoan, onSubmit, onCancel }) {
  const [amount, setAmount] = useState("");
  const [repaymentPeriod, setRepaymentPeriod] = useState("");
  const [guarantorName, setGuarantorName] = useState("");
  const [guarantorEmail, setGuarantorEmail] = useState("");
  const [guarantorIdNumber, setGuarantorIdNumber] = useState("");
  const [guarantorPhone, setGuarantorPhone] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || !repaymentPeriod || !guarantorName || !guarantorEmail || !guarantorIdNumber || !guarantorPhone) {
      alert("Please fill in all fields");
      return;
    }
    if (amount > maxLoan) {
      alert(`You cannot request more than KES ${maxLoan.toLocaleString()}`);
      return;
    }
    onSubmit({
      amount: parseFloat(amount),
      repaymentPeriod: parseInt(repaymentPeriod),
      guarantor: { 
        name: guarantorName, 
        email: guarantorEmail,
        idNumber: guarantorIdNumber,
        phone: guarantorPhone
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-red-700 mb-6">Request Loan</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Loan Details Section */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Loan Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2 font-semibold">
                  Loan Amount (KES) *
                </label>
                <input
                  type="number"
                  min="100"
                  max={maxLoan}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter amount"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Max available: KES {maxLoan.toLocaleString()}
                </p>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2 font-semibold">
                  Repayment Period *
                </label>
                <select
                  value={repaymentPeriod}
                  onChange={(e) => setRepaymentPeriod(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Period</option>
                  <option value="3">3 Months</option>
                  <option value="6">6 Months</option>
                  <option value="12">12 Months</option>
                  <option value="18">18 Months</option>
                  <option value="24">24 Months</option>
                </select>
              </div>
            </div>
          </div>

          {/* Guarantor Details Section */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Guarantor Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2 font-semibold">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={guarantorName}
                  onChange={(e) => setGuarantorName(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter guarantor's full name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2 font-semibold">
                  ID Number *
                </label>
                <input
                  type="text"
                  value={guarantorIdNumber}
                  onChange={(e) => setGuarantorIdNumber(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter ID number"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2 font-semibold">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={guarantorEmail}
                  onChange={(e) => setGuarantorEmail(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="guarantor@example.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2 font-semibold">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={guarantorPhone}
                  onChange={(e) => setGuarantorPhone(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="+254712345678"
                  required
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 rounded-lg bg-red-700 text-white hover:bg-red-800 transition font-semibold shadow-lg"
            >
              Submit Loan Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import API from "../api";

export default function EditLoanModal({ loan, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    amount: "",
    interest_rate: "1.045",
    repayment_period: "",
    loan_purpose: "",
    created_at: "",
    status: "APPROVED"
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (loan) {
      // Format the date for the input field
      const createdDate = loan.createdAt 
        ? new Date(loan.createdAt).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      setFormData({
        amount: loan.amount || loan.initialAmount || "",
        interest_rate: loan.interestRate || "1.045",
        repayment_period: loan.repaymentPeriod || "",
        loan_purpose: loan.loanPurpose || "",
        created_at: createdDate,
        status: loan.status || "APPROVED"
      });
    }
  }, [loan]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        amount: parseFloat(formData.amount),
        interest_rate: parseFloat(formData.interest_rate),
        repayment_period: parseInt(formData.repayment_period),
        loan_purpose: formData.loan_purpose,
        created_at: formData.created_at,
        status: formData.status
      };

      await API.put(`/admin/loans/${loan.id}`, payload);
      alert("Loan updated successfully!");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error updating loan:", error);
      alert(error.response?.data?.message || "Failed to update loan");
    } finally {
      setLoading(false);
    }
  };

  // Calculate loan preview
  const calculatePreview = () => {
    const amount = parseFloat(formData.amount) || 0;
    const rate = parseFloat(formData.interest_rate) || 0;
    const period = parseInt(formData.repayment_period) || 0;

    if (!amount || !rate || !period) return null;

    const processingFee = amount * 0.005;
    const principalWithFee = amount + processingFee;
    const monthlyRate = rate / 100;
    const totalInterest = principalWithFee * monthlyRate * period;
    const totalPayable = principalWithFee + totalInterest;
    const monthlyPayment = totalPayable / period;

    return {
      processingFee,
      principalWithFee,
      totalInterest,
      totalPayable,
      monthlyPayment,
      annualRate: (rate * 12).toFixed(2)
    };
  };

  const preview = calculatePreview();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-blue-700 text-white p-6 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Edit Loan Details</h2>
              <p className="text-blue-100 text-sm mt-1">
                Modify loan information including creation date
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 text-3xl font-bold leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Loan Details */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Loan Information
            </h3>

            {loan && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-900">
                  <strong>Member:</strong> {loan.memberName}
                </p>
                <p className="text-sm text-blue-900">
                  <strong>SACCO Number:</strong> {loan.saccoNumber}
                </p>
                <p className="text-sm text-blue-900">
                  <strong>Loan ID:</strong> #{loan.id}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Loan Amount (KES) <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="50000.00"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Monthly Interest Rate (%) <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  required
                  value={formData.interest_rate}
                  onChange={(e) =>
                    setFormData({ ...formData, interest_rate: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1.045"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Annual: {preview ? preview.annualRate : "0.00"}%
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Repayment Period (months) <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.repayment_period}
                  onChange={(e) =>
                    setFormData({ ...formData, repayment_period: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="12"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Loan Status <span className="text-red-600">*</span>
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="PAID">Paid</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Loan Purpose
                </label>
                <input
                  type="text"
                  value={formData.loan_purpose}
                  onChange={(e) =>
                    setFormData({ ...formData, loan_purpose: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Business expansion, Emergency, etc."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Loan Creation Date <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.created_at}
                  onChange={(e) =>
                    setFormData({ ...formData, created_at: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-600 mt-1">
                  ⚠️ Changing this date affects loan aging and reporting
                </p>
              </div>
            </div>
          </div>

          {/* Loan Preview */}
          {preview && (
            <div className="bg-green-50 rounded-lg p-6 border border-green-200">
              <h3 className="text-lg font-bold text-green-900 mb-4">
                Updated Loan Preview
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-green-700 mb-1">Processing Fee (0.5%)</p>
                  <p className="text-lg font-bold text-green-900">
                    KES {preview.processingFee.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-green-700 mb-1">Principal + Fee</p>
                  <p className="text-lg font-bold text-green-900">
                    KES {preview.principalWithFee.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-green-700 mb-1">Total Interest</p>
                  <p className="text-lg font-bold text-green-900">
                    KES {preview.totalInterest.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-green-700 mb-1">Total Repayment</p>
                  <p className="text-lg font-bold text-green-900">
                    KES {preview.totalPayable.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-green-700 mb-1">Monthly Payment</p>
                  <p className="text-lg font-bold text-green-900">
                    KES {preview.monthlyPayment.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-green-700 mb-1">Interest Rate</p>
                  <p className="text-sm font-bold text-green-900">
                    {formData.interest_rate}% monthly
                    <br />
                    <span className="text-xs">({preview.annualRate}% p.a.)</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <span className="text-yellow-600 text-xl">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-yellow-900">Important Notes:</p>
                <ul className="text-xs text-yellow-800 mt-2 space-y-1 ml-4 list-disc">
                  <li>Changing the loan amount will recalculate all interest and fees</li>
                  <li>The creation date affects loan aging in reports</li>
                  <li>Any payments already made will remain in the system</li>
                  <li>This will update the loan schedule immediately</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-3 rounded-lg font-semibold transition ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-700 hover:bg-blue-800 text-white"
              }`}
            >
              {loading ? "Updating..." : "Update Loan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import API from "../api";

export default function LoanApprovalModal({ loan, onClose, onSuccess }) {
  const [approvalAmount, setApprovalAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (loan) {
      // Default to the requested amount
      const requestedAmount = parseFloat(loan.amount || loan.initialAmount || 0);
      setApprovalAmount(requestedAmount.toString());
      calculatePreview(requestedAmount);
    }
  }, [loan]);

  const calculatePreview = (amount) => {
    if (!amount || amount <= 0) {
      setPreview(null);
      return;
    }

    const principal = parseFloat(amount);
    const interestRate = parseFloat(loan.interestRate || 1.045);
    const period = parseInt(loan.repaymentPeriod || 12);
    
    const processingFee = principal * 0.005; // 0.5%
    const principalWithFee = principal + processingFee;
    const monthlyRate = interestRate / 100;
    const totalInterest = principalWithFee * monthlyRate * period;
    const totalPayable = principalWithFee + totalInterest;
    const monthlyPayment = totalPayable / period;

    setPreview({
      principal,
      processingFee,
      principalWithFee,
      totalInterest,
      totalPayable,
      monthlyPayment,
      annualRate: (interestRate * 12).toFixed(2)
    });
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    setApprovalAmount(value);
    calculatePreview(parseFloat(value));
  };

  const handleApprove = async () => {
    if (!approvalAmount || parseFloat(approvalAmount) <= 0) {
      alert("Please enter a valid approval amount");
      return;
    }

    const amount = parseFloat(approvalAmount);
    const requestedAmount = parseFloat(loan.amount || loan.initialAmount || 0);

    // Confirm if approving different amount
    if (amount !== requestedAmount) {
      const confirmed = window.confirm(
        `Member requested KES ${requestedAmount.toLocaleString()}, but you are approving KES ${amount.toLocaleString()}. Continue?`
      );
      if (!confirmed) return;
    }

    setLoading(true);
    try {
      // If amount is different, update the loan first
      if (amount !== requestedAmount) {
        await API.put(`/admin/loans/${loan.id}`, {
          amount,
          interest_rate: loan.interestRate,
          repayment_period: loan.repaymentPeriod,
          loan_purpose: loan.loanPurpose,
          status: 'APPROVED'
        });
      }
      
      // Then approve it
      await API.post(`/loans/${loan.id}/approve`);
      
      alert(`Loan approved successfully for KES ${amount.toLocaleString()}!`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error approving loan:", error);
      alert(error.response?.data?.message || "Failed to approve loan");
    } finally {
      setLoading(false);
    }
  };

  if (!loan) return null;

  const requestedAmount = parseFloat(loan.amount || loan.initialAmount || 0);
  const maxApproval = parseFloat(loan.memberAvailableLoanLimit || requestedAmount * 2);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-green-700 text-white p-6 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Approve Loan</h2>
              <p className="text-green-100 text-sm mt-1">
                Review and adjust loan approval amount
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-green-200 text-3xl font-bold leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Member Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Member Information</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="font-semibold">Name:</span> {loan.memberName}</div>
              <div><span className="font-semibold">SACCO No:</span> {loan.saccoNumber || 'N/A'}</div>
              <div><span className="font-semibold">Email:</span> {loan.memberEmail}</div>
              <div><span className="font-semibold">Phone:</span> {loan.memberPhone || 'N/A'}</div>
            </div>
          </div>

          {/* Loan Request Details */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-900 mb-2">Loan Request</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-semibold">Requested Amount:</span>
                <p className="text-lg font-bold text-yellow-800">
                  KES {requestedAmount.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="font-semibold">Interest Rate:</span>
                <p className="text-lg font-bold text-yellow-800">
                  {loan.interestRate}% monthly
                </p>
              </div>
              <div>
                <span className="font-semibold">Repayment Period:</span>
                <p className="text-lg font-bold text-yellow-800">
                  {loan.repaymentPeriod} months
                </p>
              </div>
              <div>
                <span className="font-semibold">Purpose:</span>
                <p className="text-sm text-yellow-800">
                  {loan.loanPurpose || 'Not specified'}
                </p>
              </div>
            </div>
          </div>

          {/* Approval Amount Input */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Approval Amount (KES) <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={maxApproval}
              value={approvalAmount}
              onChange={handleAmountChange}
              className="w-full border border-gray-300 rounded-lg p-3 text-lg font-semibold focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Enter approval amount"
            />
            <div className="mt-2 flex items-center justify-between text-xs">
              <p className="text-gray-600">
                Requested: KES {requestedAmount.toLocaleString()}
              </p>
              <p className="text-gray-600">
                Max Available: KES {maxApproval.toLocaleString()}
              </p>
            </div>
            {parseFloat(approvalAmount) !== requestedAmount && approvalAmount && (
              <div className="mt-2 bg-orange-100 border border-orange-300 rounded p-2 text-xs text-orange-800">
                ⚠️ You are approving a different amount than requested
              </div>
            )}
          </div>

          {/* Loan Preview */}
          {preview && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-3">Loan Breakdown Preview</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-purple-700 mb-1">Principal Amount</p>
                  <p className="text-lg font-bold text-purple-900">
                    KES {preview.principal.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-purple-700 mb-1">Processing Fee (0.5%)</p>
                  <p className="text-lg font-bold text-purple-900">
                    KES {preview.processingFee.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-purple-700 mb-1">Principal + Fee</p>
                  <p className="text-lg font-bold text-purple-900">
                    KES {preview.principalWithFee.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-purple-700 mb-1">Total Interest</p>
                  <p className="text-lg font-bold text-purple-900">
                    KES {preview.totalInterest.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-purple-700 mb-1">Total Repayment</p>
                  <p className="text-lg font-bold text-purple-900">
                    KES {preview.totalPayable.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-purple-700 mb-1">Monthly Payment</p>
                  <p className="text-lg font-bold text-purple-900">
                    KES {preview.monthlyPayment.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Guarantors Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Guarantors</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <p className="text-gray-600">SACCO Members</p>
                <p className="text-2xl font-bold text-green-600">
                  {loan.guarantorCounts?.members || 0}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-600">Church Officials</p>
                <p className="text-2xl font-bold text-purple-600">
                  {loan.guarantorCounts?.churchOfficials || 0}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-600">Witnesses</p>
                <p className="text-2xl font-bold text-blue-600">
                  {loan.guarantorCounts?.witnesses || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleApprove}
              disabled={loading || !approvalAmount || parseFloat(approvalAmount) <= 0}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition ${
                loading || !approvalAmount || parseFloat(approvalAmount) <= 0
                  ? "bg-gray-400 cursor-not-allowed text-white"
                  : "bg-green-700 hover:bg-green-800 text-white"
              }`}
            >
              {loading ? "Approving..." : `Approve Loan - KES ${parseFloat(approvalAmount || 0).toLocaleString()}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
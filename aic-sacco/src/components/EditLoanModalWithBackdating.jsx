import React, { useState, useEffect } from "react";
import API from "../api";

export default function EditLoanModalWithBackdating({ loan, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    amount: "",
    interest_rate: "",
    repayment_period: "",
    loan_purpose: "",
    status: "",
    created_at: ""
  });
  
  const [paymentData, setPaymentData] = useState({
    principal_payment: "",
    interest_payment: "",
    payment_date: ""
  });
  
  const [activeTab, setActiveTab] = useState("edit"); // "edit" or "payment"
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  useEffect(() => {
    if (loan) {
      setFormData({
        amount: loan.amount || loan.initialAmount || "",
        interest_rate: loan.interestRate || "",
        repayment_period: loan.repaymentPeriod || "",
        loan_purpose: loan.loanPurpose || "",
        status: loan.status || "PENDING",
        created_at: loan.createdAt ? new Date(loan.createdAt).toISOString().split('T')[0] : ""
      });
      
      // Load payment history
      loadPayments();
    }
  }, [loan]);

  const loadPayments = async () => {
    if (!loan?.id) return;
    
    setLoadingPayments(true);
    try {
      const res = await API.get(`/admin/loans/${loan.id}/payments`);
      setPayments(res.data.payments || []);
    } catch (error) {
      console.error("Error loading payments:", error);
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await API.put(`/admin/loans/${loan.id}`, formData);
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

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    
    if (!paymentData.principal_payment && !paymentData.interest_payment) {
      alert("Please enter at least one payment amount");
      return;
    }
    
    setLoading(true);
    
    try {
      await API.post(`/admin/loans/${loan.id}/payment`, paymentData);
      alert("Payment recorded successfully!");
      
      // Reset payment form
      setPaymentData({
        principal_payment: "",
        interest_payment: "",
        payment_date: ""
      });
      
      // Reload payments
      await loadPayments();
      onSuccess();
    } catch (error) {
      console.error("Error recording payment:", error);
      alert(error.response?.data?.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  if (!loan) return null;

  const currentBalance = parseFloat(loan.amount || loan.initialAmount || 0);
  const principalPaid = parseFloat(loan.principalPaid || 0);
  const interestPaid = parseFloat(loan.interestPaid || 0);
  const initialAmount = parseFloat(loan.initialAmount || 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-blue-700 text-white p-6 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Edit Loan & Record Payments</h2>
              <p className="text-blue-100 text-sm mt-1">{loan.memberName} - Loan #{loan.id}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 text-3xl font-bold leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-gray-100 border-b flex">
          <button
            onClick={() => setActiveTab("edit")}
            className={`flex-1 px-6 py-3 font-semibold transition ${
              activeTab === "edit"
                ? "bg-white text-blue-700 border-b-2 border-blue-700"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            📝 Edit Loan Details
          </button>
          <button
            onClick={() => setActiveTab("payment")}
            className={`flex-1 px-6 py-3 font-semibold transition ${
              activeTab === "payment"
                ? "bg-white text-green-700 border-b-2 border-green-700"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            💰 Record Payments
          </button>
        </div>

        <div className="p-6">
          {/* Loan Summary Card */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-purple-900 mb-3">Current Loan Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-600 mb-1">Original Amount</p>
                <p className="text-lg font-bold text-gray-900">
                  KES {initialAmount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Current Balance</p>
                <p className="text-lg font-bold text-blue-700">
                  KES {currentBalance.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Principal Paid</p>
                <p className="text-lg font-bold text-green-600">
                  KES {principalPaid.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Interest Paid</p>
                <p className="text-lg font-bold text-orange-600">
                  KES {interestPaid.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Edit Loan Tab */}
          {activeTab === "edit" && (
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Amount */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Loan Amount (KES) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Current outstanding balance</p>
                </div>

                {/* Interest Rate */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Interest Rate (% monthly) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={formData.interest_rate}
                    onChange={(e) => setFormData({...formData, interest_rate: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Repayment Period */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Repayment Period (months) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.repayment_period}
                    onChange={(e) => setFormData({...formData, repayment_period: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Status <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>

                {/* Loan Creation Date (Backdating) */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Loan Creation Date <span className="text-red-600">*</span>
                    <span className="text-blue-600 text-xs ml-2">(Backdate if needed)</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.created_at}
                    onChange={(e) => setFormData({...formData, created_at: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Set the date when this loan was originally taken
                  </p>
                </div>

                {/* Loan Purpose */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Loan Purpose
                  </label>
                  <textarea
                    value={formData.loan_purpose}
                    onChange={(e) => setFormData({...formData, loan_purpose: e.target.value})}
                    rows="3"
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter loan purpose..."
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 px-6 py-3 rounded-lg font-semibold transition ${
                    loading
                      ? "bg-gray-400 cursor-not-allowed text-white"
                      : "bg-blue-700 hover:bg-blue-800 text-white"
                  }`}
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}

          {/* Record Payment Tab */}
          {activeTab === "payment" && (
            <div className="space-y-6">
              {/* Payment Form */}
              <form onSubmit={handlePaymentSubmit} className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-4">
                <h3 className="font-semibold text-green-900 mb-4">Record New Payment</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Principal Payment */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Principal Payment (KES)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={currentBalance}
                      value={paymentData.principal_payment}
                      onChange={(e) => setPaymentData({...paymentData, principal_payment: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Interest Payment */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Interest Payment (KES)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={paymentData.interest_payment}
                      onChange={(e) => setPaymentData({...paymentData, interest_payment: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Payment Date */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Payment Date
                      <span className="text-blue-600 text-xs ml-2">(Backdate if needed)</span>
                    </label>
                    <input
                      type="date"
                      value={paymentData.payment_date}
                      onChange={(e) => setPaymentData({...paymentData, payment_date: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave blank for today</p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full px-6 py-3 rounded-lg font-semibold transition ${
                    loading
                      ? "bg-gray-400 cursor-not-allowed text-white"
                      : "bg-green-700 hover:bg-green-800 text-white"
                  }`}
                >
                  {loading ? "Recording..." : "Record Payment"}
                </button>
              </form>

              {/* Payment History */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b">
                  <h3 className="font-semibold text-gray-800">Payment History</h3>
                </div>

                {loadingPayments && (
                  <div className="p-8 text-center text-gray-600">
                    Loading payment history...
                  </div>
                )}

                {!loadingPayments && payments.length === 0 && (
                  <div className="p-8 text-center text-gray-600">
                    No payments recorded yet
                  </div>
                )}

                {!loadingPayments && payments.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Date
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Principal
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Interest
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {payments.map((payment, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(payment.paymentDate).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-semibold">
                              KES {payment.principalPaid.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-orange-600 font-semibold">
                              KES {payment.interestPaid.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-700 font-bold">
                              KES {(payment.principalPaid + payment.interestPaid).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td className="px-6 py-4 text-sm font-bold text-gray-900">TOTALS</td>
                          <td className="px-6 py-4 text-sm text-right font-bold text-green-700">
                            KES {principalPaid.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-right font-bold text-orange-700">
                            KES {interestPaid.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-right font-bold text-blue-800">
                            KES {(principalPaid + interestPaid).toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import React, { useState } from "react";
import RequestLoanForm from "./RequestLoanForm";
import MemberDividends from "./Memberdividends";
import LoanPaymentSchedule from "./LoanPaymentSchedule";
import API from "../api";

export default function MemberDashboard({ data, onLogout }) {
  // Debug: Log the data structure
  console.log("MemberDashboard data:", data);
  
  const [loans, setLoans] = useState(data?.loans || []);
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showSavingsHistory, setShowSavingsHistory] = useState(false);
  const [showLoanHistory, setShowLoanHistory] = useState(false);
  const [showDividends, setShowDividends] = useState(false);
  const [savingsHistory, setSavingsHistory] = useState([]);
  const [selectedLoanSchedule, setSelectedLoanSchedule] = useState(null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const savings = data?.savings || data?.member?.savings || 0;
  const totalLoanLimit = data?.loanLimit || data?.member?.loanLimit || data?.totalLoanLimit || 0;
  const availableLoanLimit = data?.availableLoanLimit || data?.member?.availableLoanLimit || data?.availableLimit || 0;
  const outstandingLoans = data?.outstandingLoans || data?.member?.outstandingLoans || data?.outstanding || 0;

  const handleRequestLoan = async (loanData) => {
    try {
      const res = await API.post("/loans", loanData);
      setLoans([...loans, res.data.loan]);
      setShowLoanForm(false);
      alert("Loan request submitted successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit loan");
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("New passwords do not match!");
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      alert("Password must be at least 6 characters long!");
      return;
    }

    try {
      await API.put("/members/change-password", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      alert("Password changed successfully!");
      setShowPasswordForm(false);
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to change password");
    }
  };

  const fetchSavingsHistory = async () => {
    try {
      const res = await API.get("/members/savings-history");
      setSavingsHistory(res.data.history);
      setShowSavingsHistory(true);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to fetch savings history");
    }
  };

  const handleViewSchedule = (loan) => {
    setSelectedLoanSchedule({
      principal: loan.principalAmount || loan.amount,
      repaymentPeriod: loan.repaymentPeriod
    });
  };

  // Calculate active loans (APPROVED with balance > 0)
  const activeLoans = loans.filter(l => l.status === 'APPROVED' && l.amount > 0);
  const hasActiveLoan = activeLoans.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-red-700 text-white shadow-lg">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Member Dashboard</h1>
          <button
            className="bg-white text-red-700 px-4 py-2 rounded-lg font-semibold hover:bg-red-50 transition"
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">
          Welcome, {data?.name || "Member"}
        </h2>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {/* Savings Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Your Savings</h3>
            <p className="text-3xl font-bold text-green-600">KES {savings.toLocaleString()}</p>
          </div>

          {/* Total Loan Limit Card */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Loan Limit</h3>
            <p className="text-3xl font-bold text-purple-700">KES {totalLoanLimit.toLocaleString()}</p>
            <p className="text-sm text-gray-600 mt-1">Based on 3x your savings</p>
          </div>

          {/* Available Loan Limit Card */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Available to Borrow</h3>
            <p className="text-3xl font-bold text-blue-700">KES {availableLoanLimit.toLocaleString()}</p>
            {outstandingLoans > 0 && (
              <p className="text-sm text-gray-600 mt-1">Outstanding: KES {outstandingLoans.toLocaleString()}</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
          <button
            onClick={() => setShowLoanForm(true)}
            className="bg-red-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-800 transition shadow"
          >
            Request Loan
          </button>
          <button
            onClick={fetchSavingsHistory}
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition shadow"
          >
            Savings History
          </button>
          <button
            onClick={() => setShowLoanHistory(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow"
          >
            Loan History
          </button>
          <button
            onClick={() => setShowDividends(true)}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition shadow"
          >
            My Dividends
          </button>
          <button
            onClick={() => setShowPasswordForm(true)}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition shadow"
          >
            Change Password
          </button>
        </div>

        {/* Active Loans Section */}
        {activeLoans.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Active Loans</h3>
            <div className="space-y-4">
              {activeLoans.map((loan) => {
                const totalInterest = loan.initialAmount - loan.principalAmount;
                const remainingInterest = totalInterest - loan.interestPaid;
                const remainingPrincipal = loan.principalAmount - loan.principalPaid;
                const progress = ((loan.principalPaid + loan.interestPaid) / loan.initialAmount) * 100;

                return (
                  <div key={loan.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-gray-600">Total Balance</p>
                        <p className="text-xl font-bold text-red-600">
                          KES {loan.amount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Original Amount</p>
                        <p className="text-lg font-semibold text-gray-800">
                          KES {loan.initialAmount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Interest Rate</p>
                        <p className="text-lg font-semibold text-gray-800">
                          {loan.interestRate}% p.a.
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Payment Progress</span>
                        <span>{progress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Paid: KES {(loan.principalPaid + loan.interestPaid).toLocaleString()}</span>
                        <span>Remaining: KES {loan.amount.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Payment Breakdown */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 text-xs">Principal Balance</p>
                          <p className="font-semibold text-blue-700">
                            KES {remainingPrincipal.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 text-xs">Interest Balance</p>
                          <p className="font-semibold text-red-600">
                            KES {remainingInterest.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 text-xs">Principal Paid</p>
                          <p className="font-semibold text-green-600">
                            KES {loan.principalPaid.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 text-xs">Interest Paid</p>
                          <p className="font-semibold text-orange-600">
                            KES {loan.interestPaid.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewSchedule(loan)}
                        className="flex-1 bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition font-semibold text-sm"
                      >
                        📊 View Payment Schedule
                      </button>
                      {loan.loanPurpose && (
                        <button
                          onClick={() => alert(`Purpose: ${loan.loanPurpose}`)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm"
                          title="View loan purpose"
                        >
                          ℹ️
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Request Loan Form Modal */}
        {showLoanForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl m-4 max-h-[95vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Request a Loan</h2>
                <button
                  onClick={() => setShowLoanForm(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              <div className="p-6">
                <RequestLoanForm 
                  onSubmit={handleRequestLoan}
                  onCancel={() => setShowLoanForm(false)}
                  availableLoanLimit={availableLoanLimit}
                  totalLoanLimit={totalLoanLimit}
                  outstandingLoans={outstandingLoans}
                />
              </div>
            </div>
          </div>
        )}

        {/* Change Password Modal */}
        {showPasswordForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
              <div className="bg-red-700 text-white px-6 py-4 rounded-t-lg">
                <h2 className="text-xl font-bold">Change Password</h2>
              </div>
              <form onSubmit={handleChangePassword} className="p-6">
                <div>
                  <label className="block text-gray-700 mb-2 font-semibold">Current Password</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    className="w-full border border-gray-300 p-3 rounded-lg"
                    required
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-gray-700 mb-2 font-semibold">New Password</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    className="w-full border border-gray-300 p-3 rounded-lg"
                    required
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-gray-700 mb-2 font-semibold">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    className="w-full border border-gray-300 p-3 rounded-lg"
                    required
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowPasswordForm(false)}
                    className="flex-1 bg-gray-200 py-3 rounded-lg font-semibold hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-red-700 text-white py-3 rounded-lg font-semibold hover:bg-red-800"
                  >
                    Change Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Savings History Modal */}
        {showSavingsHistory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl m-4 max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Savings History</h2>
                <button
                  onClick={() => setShowSavingsHistory(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              <div className="p-6">
                {savingsHistory.length === 0 ? (
                  <p className="text-gray-600">No savings history yet.</p>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {savingsHistory.map((saving) => (
                        <tr key={saving.id}>
                          <td className="px-4 py-3 text-sm">{new Date(saving.savedAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                            KES {saving.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loan History Modal */}
        {showLoanHistory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl m-4 max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Detailed Loan History</h2>
                <button
                  onClick={() => setShowLoanHistory(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              <div className="p-6">
                {loans.length === 0 ? (
                  <p className="text-gray-600">No loans yet.</p>
                ) : (
                  <div className="space-y-4">
                    {loans.map((loan) => {
                      const isPaid = loan.amount === 0;
                      
                      return (
                        <div key={loan.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="text-lg font-bold">KES {loan.initialAmount.toLocaleString()}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(loan.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <span className={`px-3 py-1 text-xs font-semibold rounded ${
                              isPaid ? 'bg-gray-100 text-gray-800' :
                              loan.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                              loan.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {isPaid ? 'PAID' : loan.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                            <div>
                              <p className="text-gray-600">Current Balance</p>
                              <p className="font-semibold">KES {loan.amount.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Principal Paid</p>
                              <p className="font-semibold text-green-600">
                                KES {loan.principalPaid.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Interest Paid</p>
                              <p className="font-semibold text-orange-600">
                                KES {loan.interestPaid.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Interest Rate</p>
                              <p className="font-semibold">{loan.interestRate}%</p>
                            </div>
                          </div>
                          {loan.status === 'APPROVED' && (
                            <button
                              onClick={() => handleViewSchedule(loan)}
                              className="w-full bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition font-semibold text-sm"
                            >
                              📊 View Payment Schedule
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dividends Modal */}
        {showDividends && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl m-4 max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">My Dividends</h2>
                <button
                  onClick={() => setShowDividends(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              <div className="p-6">
                <MemberDividends />
              </div>
            </div>
          </div>
        )}

        {/* Payment Schedule Modal */}
        {selectedLoanSchedule && (
          <LoanPaymentSchedule
            principal={selectedLoanSchedule.principal}
            repaymentPeriod={selectedLoanSchedule.repaymentPeriod}
            onClose={() => setSelectedLoanSchedule(null)}
          />
        )}
      </main>
    </div>
  );
}
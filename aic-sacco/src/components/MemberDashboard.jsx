import { useState } from "react";
import RequestLoanForm from "./RequestLoanForm";
import API from "../api";

export default function MemberDashboard({ data, onLogout }) {
  const [loans, setLoans] = useState(data?.loans || []);
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showSavingsHistory, setShowSavingsHistory] = useState(false);
  const [showLoanHistory, setShowLoanHistory] = useState(false);
  const [savingsHistory, setSavingsHistory] = useState([]);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const savings = data?.savings || 0;
  const loanLimit = data?.loanLimit || 0;

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

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Savings Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Your Savings</h3>
            <p className="text-3xl font-bold text-green-600">KES {savings.toLocaleString()}</p>
          </div>

          {/* Loan Limit Card */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Available Loan Limit</h3>
            <p className="text-gray-600">You can borrow up to:</p>
            <p className="text-3xl font-bold text-blue-700">KES {loanLimit.toLocaleString()}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            className="bg-red-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-800 transition shadow"
            onClick={() => setShowLoanForm(true)}
          >
            Request Loan
          </button>
          <button
            className="bg-green-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-800 transition shadow"
            onClick={fetchSavingsHistory}
          >
            View Savings History
          </button>
          <button
            className="bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-800 transition shadow"
            onClick={() => setShowLoanHistory(true)}
          >
            View Loan History
          </button>
          <button
            className="bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800 transition shadow"
            onClick={() => setShowPasswordForm(true)}
          >
            Change Password
          </button>
        </div>

        {/* Loans Table */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Your Loans</h3>
          {loans.length === 0 ? (
            <p className="text-gray-500">No loans yet.</p>
          ) : (
            <div className="space-y-4">
              {loans.map((l) => {
                const principalAmount = parseFloat(l.principalAmount || 0);
                const initialAmount = parseFloat(l.initialAmount || 0);
                const interestAmount = initialAmount - principalAmount;
                const currentBalance = parseFloat(l.amount || 0);
                const principalPaid = parseFloat(l.principalPaid || 0);
                const interestPaid = parseFloat(l.interestPaid || 0);
                const totalPaid = principalPaid + interestPaid;
                const progressPercentage = initialAmount > 0 ? (totalPaid / initialAmount) * 100 : 0;
                
                return (
                  <div key={l.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className="text-lg font-bold text-gray-800">
                            KES {initialAmount.toLocaleString()}
                          </h4>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            l.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                            l.status === "APPROVED" ? "bg-green-100 text-green-800" :
                            "bg-red-100 text-red-800"
                          }`}>
                            {l.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          <p>Principal: KES {principalAmount.toLocaleString()} + Interest: KES {interestAmount.toLocaleString()}</p>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Applied: {l.createdAt ? new Date(l.createdAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Interest Rate</p>
                        <p className="text-lg font-semibold text-blue-600">{l.interestRate || 10}%</p>
                      </div>
                    </div>
                    
                    {l.status === "APPROVED" && (
                      <div className="mt-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600">Repayment Progress</span>
                          <span className="font-semibold text-gray-800">
                            {progressPercentage.toFixed(1)}% paid
                          </span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                          <div 
                            className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${progressPercentage}%` }}
                          ></div>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-3 text-sm">
                          <div className="bg-blue-50 p-2 rounded">
                            <p className="text-gray-600 text-xs">Interest Paid</p>
                            <p className="font-bold text-blue-700">KES {interestPaid.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">of {interestAmount.toLocaleString()}</p>
                          </div>
                          <div className="bg-purple-50 p-2 rounded">
                            <p className="text-gray-600 text-xs">Principal Paid</p>
                            <p className="font-bold text-purple-700">KES {principalPaid.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">of {principalAmount.toLocaleString()}</p>
                          </div>
                          <div className="bg-red-50 p-2 rounded">
                            <p className="text-gray-600 text-xs">Balance</p>
                            <p className="font-bold text-red-700">KES {currentBalance.toLocaleString()}</p>
                          </div>
                          <div className="bg-gray-50 p-2 rounded">
                            <p className="text-gray-600 text-xs">Period</p>
                            <p className="font-bold text-gray-700">{l.repaymentPeriod || 'N/A'} months</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Loan Request Modal */}
      {showLoanForm && (
        <RequestLoanForm
          maxLoan={loanLimit}
          onSubmit={handleRequestLoan}
          onCancel={() => setShowLoanForm(false)}
        />
      )}

      {/* Change Password Modal */}
      {showPasswordForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-96">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Change Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2 font-semibold">Current Password</label>
                <input
                  type="password"
                  required
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2 font-semibold">New Password</label>
                <input
                  type="password"
                  required
                  minLength="6"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
              </div>
              <div>
                <label className="block text-gray-700 mb-2 font-semibold">Confirm New Password</label>
                <input
                  type="password"
                  required
                  minLength="6"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
                  }}
                  className="px-6 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition"
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
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Savings History</h2>
            
            {savingsHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No savings history yet.</p>
            ) : (
              <div className="space-y-3">
                {savingsHistory.map((saving, index) => (
                  <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                    <div>
                      <p className="text-lg font-bold text-green-700">
                        KES {saving.amount.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(saving.savedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-green-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6">
              <button
                onClick={() => setShowSavingsHistory(false)}
                className="w-full px-6 py-2 rounded-lg bg-gray-300 text-gray-700 hover:bg-gray-400 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loan History Modal */}
      {showLoanHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Loan History</h2>
            
            {loans.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No loan history yet.</p>
            ) : (
              <div className="space-y-4">
                {loans.map((loan) => {
                  const principalAmount = parseFloat(loan.principalAmount || 0);
                  const initialAmount = parseFloat(loan.initialAmount || 0);
                  const interestAmount = initialAmount - principalAmount;
                  const currentBalance = parseFloat(loan.amount || 0);
                  const principalPaid = parseFloat(loan.principalPaid || 0);
                  const interestPaid = parseFloat(loan.interestPaid || 0);
                  const totalPaid = principalPaid + interestPaid;
                  const progressPercentage = initialAmount > 0 ? (totalPaid / initialAmount) * 100 : 0;
                  
                  return (
                    <div key={loan.id} className="border-2 border-gray-200 rounded-lg p-5 hover:shadow-lg transition">
                      {/* Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-2xl font-bold text-gray-800">
                              KES {initialAmount.toLocaleString()}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              loan.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                              loan.status === "APPROVED" ? "bg-green-100 text-green-800" :
                              "bg-red-100 text-red-800"
                            }`}>
                              {loan.status}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 space-y-1">
                            <p>Principal: KES {principalAmount.toLocaleString()}</p>
                            <p>Interest ({loan.interestRate}%): KES {interestAmount.toLocaleString()}</p>
                            <p className="font-semibold">Total: KES {initialAmount.toLocaleString()}</p>
                          </div>
                          <p className="text-sm text-gray-600 mt-2">
                            Applied: {loan.createdAt ? new Date(loan.createdAt).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            }) : 'N/A'}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Interest Rate</p>
                          <p className="text-2xl font-bold text-blue-600">{loan.interestRate || 10}%</p>
                        </div>
                      </div>
                      
                      {/* Details Grid */}
                      <div className="grid grid-cols-4 gap-4 mb-4">
                        <div className="bg-blue-50 p-3 rounded-lg text-center">
                          <p className="text-xs text-gray-600 mb-1">Interest Paid</p>
                          <p className="text-lg font-bold text-blue-700">KES {interestPaid.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">of {interestAmount.toLocaleString()}</p>
                        </div>
                        
                        <div className="bg-purple-50 p-3 rounded-lg text-center">
                          <p className="text-xs text-gray-600 mb-1">Principal Paid</p>
                          <p className="text-lg font-bold text-purple-700">KES {principalPaid.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">of {principalAmount.toLocaleString()}</p>
                        </div>
                        
                        <div className="bg-red-50 p-3 rounded-lg text-center">
                          <p className="text-xs text-gray-600 mb-1">Balance</p>
                          <p className="text-lg font-bold text-red-700">KES {currentBalance.toLocaleString()}</p>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg text-center">
                          <p className="text-xs text-gray-600 mb-1">Repayment Period</p>
                          <p className="text-lg font-bold text-gray-700">{loan.repaymentPeriod || 'N/A'} months</p>
                        </div>
                      </div>
                      
                      {/* Progress Bar - Only for Approved Loans */}
                      {loan.status === "APPROVED" && (
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-600 font-semibold">Repayment Progress</span>
                            <span className="font-bold text-gray-800">{progressPercentage.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-green-500 to-green-600 h-4 rounded-full transition-all duration-700 flex items-center justify-end pr-2"
                              style={{ width: `${progressPercentage}%` }}
                            >
                              {progressPercentage > 10 && (
                                <span className="text-xs text-white font-bold">
                                  {progressPercentage.toFixed(0)}%
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {currentBalance === 0 && (
                            <div className="mt-3 bg-green-100 border border-green-400 rounded-lg p-3 text-center">
                              <p className="text-green-800 font-bold">✓ Loan Fully Paid!</p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Pending/Rejected Status Info */}
                      {loan.status === "PENDING" && (
                        <div className="mt-3 bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                          <p className="text-yellow-800 text-sm">⏳ Waiting for admin approval</p>
                        </div>
                      )}
                      
                      {loan.status === "REJECTED" && (
                        <div className="mt-3 bg-red-50 border border-red-300 rounded-lg p-3">
                          <p className="text-red-800 text-sm">✗ This loan was rejected</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            <div className="mt-6">
              <button
                onClick={() => setShowLoanHistory(false)}
                className="w-full px-6 py-3 rounded-lg bg-gray-300 text-gray-700 hover:bg-gray-400 transition font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
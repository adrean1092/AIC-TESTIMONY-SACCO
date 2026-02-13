import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import Reports from "./Reports";
import DividendsManagement from "./Dividendsmanagement";
// ✅ NEW: Import the modal components
import AddMemberModal from "./AddMemberModal";
import EditLoanModal from "./EditLoanModal";
import LoanApprovalModal from "./Loanapprovalmodal";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("members"); // members, dividends, reports
  const [members, setMembers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [newMember, setNewMember] = useState({ 
    full_name: "", 
    id_number: "",
    email: "", 
    phone: "", 
    password: "",
    role: "MEMBER"
  });
  const [paymentAmount, setPaymentAmount] = useState({});
  const [savingsAmount, setSavingsAmount] = useState({});
  const [editMember, setEditMember] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);

  // ✅ NEW: Modal state for Add Member and Edit Loan
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  
  // ✅ NEW: Modal state for viewing guarantors
  const [showGuarantorsModal, setShowGuarantorsModal] = useState(false);
  const [selectedLoanGuarantors, setSelectedLoanGuarantors] = useState(null);
  const [loadingGuarantors, setLoadingGuarantors] = useState(false);

  // ✅ NEW: Modal state for loan approval
  const [approvingLoan, setApprovingLoan] = useState(null);

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const loadMembers = async () => {
    try {
      const res = await API.get("/admin/members");
      setMembers(res.data);
    } catch (error) {
      console.error("Error loading members:", error);
      alert("Failed to load members. Please check your authentication.");
    }
  };

  const loadLoans = async () => {
    try {
      const res = await API.get("/loans");
      setLoans(res.data.loans || res.data);
    } catch (error) {
      console.error("Error loading loans:", error);
      alert("Failed to load loans. Please check your authentication.");
    }
  };

  // ✅ NEW: Function to load and view guarantors for a specific loan
  const viewGuarantors = async (loanId) => {
    setLoadingGuarantors(true);
    setShowGuarantorsModal(true);
    try {
      const res = await API.get(`/loans/${loanId}`);
      setSelectedLoanGuarantors(res.data);
    } catch (error) {
      console.error("Error loading guarantors:", error);
      alert("Failed to load guarantors");
      setShowGuarantorsModal(false);
    } finally {
      setLoadingGuarantors(false);
    }
  };

  useEffect(() => {
    loadMembers();
    loadLoans();
  }, []);

  const addMember = async () => {
    if (!newMember.full_name || !newMember.id_number || !newMember.email || !newMember.phone || !newMember.password) {
      alert("Please fill in all fields");
      return;
    }
    try {
      await API.post("/admin/members", newMember);
      setNewMember({ full_name: "", id_number: "", email: "", phone: "", password: "", role: "MEMBER" });
      loadMembers();
      alert("Member added successfully!");
    } catch (error) {
      console.error("Error adding member:", error);
      alert("Failed to add member: " + (error.response?.data?.message || error.message));
    }
  };

  const updateMember = async () => {
    try {
      await API.put(`/admin/members/${editMember.id}`, editMember);
      setEditMember(null);
      loadMembers();
      alert("Member updated successfully!");
    } catch (error) {
      console.error("Error updating member:", error);
      alert("Failed to update member: " + (error.response?.data?.message || error.message));
    }
  };

  const deleteMember = async (id) => {
    if (!window.confirm("Are you sure you want to delete this member?")) return;
    try {
      await API.delete(`/admin/members/${id}`);
      loadMembers();
      alert("Member deleted successfully!");
    } catch (error) {
      console.error("Error deleting member:", error);
      alert("Failed to delete member: " + (error.response?.data?.message || error.message));
    }
  };

  const updateSavings = async (memberId) => {
    const amount = savingsAmount[memberId];
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    try {
      await API.post(`/admin/members/${memberId}/savings`, { amount: parseFloat(amount) });
      setSavingsAmount({ ...savingsAmount, [memberId]: "" });
      loadMembers();
      alert("Savings updated successfully!");
    } catch (error) {
      console.error("Error updating savings:", error);
      alert("Failed to update savings: " + (error.response?.data?.message || error.message));
    }
  };

  // ✅ UPDATED: Open approval modal instead of direct approval
  const openApprovalModal = (loan) => {
    setApprovingLoan(loan);
  };

  const rejectLoan = async (loanId) => {
    try {
      await API.post(`/loans/${loanId}/reject`);
      loadLoans();
      alert("Loan rejected successfully!");
    } catch (error) {
      console.error("Error rejecting loan:", error);
      alert("Failed to reject loan: " + (error.response?.data?.message || error.message));
    }
  };

  const recordPayment = async (loanId) => {
    const amount = paymentAmount[loanId];
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid payment amount");
      return;
    }

    try {
      const res = await API.post(`/admin/loans/${loanId}/repayment`, { 
        amount: parseFloat(amount) 
      });
      
      setPaymentResult(res.data);
      setShowPaymentModal(true);
      setPaymentAmount({ ...paymentAmount, [loanId]: "" });
      loadLoans();
      loadMembers();
    } catch (error) {
      console.error("Error recording payment:", error);
      alert("Failed to record payment: " + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <button 
            onClick={handleLogout} 
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => setActiveTab("members")} 
          className={`px-6 py-3 rounded-lg font-semibold transition ${
            activeTab === "members" ? "bg-red-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
        >
          Members & Loans
        </button>
        <button 
          onClick={() => setActiveTab("dividends")} 
          className={`px-6 py-3 rounded-lg font-semibold transition ${
            activeTab === "dividends" ? "bg-red-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
        >
          Dividends
        </button>
        <button 
          onClick={() => setActiveTab("reports")} 
          className={`px-6 py-3 rounded-lg font-semibold transition ${
            activeTab === "reports" ? "bg-red-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
        >
          Reports
        </button>
      </div>

      {/* Members & Loans Tab */}
      {activeTab === "members" && (
        <>
          {/* ✅ UPDATED: Add Member Section - Now uses Modal */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Add New Member</h2>
              {/* ✅ NEW: Button to open the enhanced modal */}
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold flex items-center gap-2"
              >
                <span>➕</span>
                <span>Add Member</span>
              </button>
            </div>

            {/* Keep the old quick add form for simple additions */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              <input 
                type="text" 
                placeholder="Full Name" 
                className="border border-gray-300 p-3 rounded-lg" 
                value={newMember.full_name} 
                onChange={e => setNewMember({...newMember, full_name: e.target.value})} 
              />
              <input 
                type="text" 
                placeholder="ID Number" 
                className="border border-gray-300 p-3 rounded-lg" 
                value={newMember.id_number} 
                onChange={e => setNewMember({...newMember, id_number: e.target.value})} 
              />
              <input 
                type="email" 
                placeholder="Email" 
                className="border border-gray-300 p-3 rounded-lg" 
                value={newMember.email} 
                onChange={e => setNewMember({...newMember, email: e.target.value})} 
              />
              <input 
                type="tel" 
                placeholder="Phone" 
                className="border border-gray-300 p-3 rounded-lg" 
                value={newMember.phone} 
                onChange={e => setNewMember({...newMember, phone: e.target.value})} 
              />
              <input 
                type="password" 
                placeholder="Password" 
                className="border border-gray-300 p-3 rounded-lg" 
                value={newMember.password} 
                onChange={e => setNewMember({...newMember, password: e.target.value})} 
              />
              <select 
                className="border border-gray-300 p-3 rounded-lg" 
                value={newMember.role} 
                onChange={e => setNewMember({...newMember, role: e.target.value})}
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
              <button 
                onClick={addMember} 
                className="bg-red-600 text-white p-3 rounded-lg hover:bg-red-700 transition font-semibold"
              >
                Quick Add
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 Use "Quick Add" for simple members, or "Add Member (Enhanced)" for members with existing loans/savings
            </p>
          </div>

          {/* Members Table */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Members</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-green-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">SACCO #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">ID Number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Savings</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Loan Limit</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Add Savings</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {members.map((m, idx) => (
                    <tr key={`member-${idx}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{m.sacco_number || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{m.full_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{m.id_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{m.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{m.phone}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600">
                        KES {parseFloat(m.savings || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-blue-600">
                        KES {parseFloat(m.loan_limit || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {m.role === "MEMBER" && (
                          <div className="flex gap-1">
                            <input 
                              type="number" 
                              placeholder="Amount" 
                              className="border border-gray-300 p-1 rounded w-24 text-sm" 
                              value={savingsAmount[m.id] || ""} 
                              onChange={e => setSavingsAmount({...savingsAmount, [m.id]: e.target.value})} 
                            />
                            <button 
                              onClick={() => updateSavings(m.id)} 
                              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition"
                            >
                              Add
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-1">
                          <button 
                            onClick={() => setEditMember(m)} 
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => deleteMember(m.id)} 
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Edit Member Modal */}
          {editMember && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Edit Member</h2>
                <div className="space-y-3">
                  <input 
                    type="text" 
                    placeholder="Full Name" 
                    className="w-full border border-gray-300 p-3 rounded-lg"
                    value={editMember.full_name}
                    onChange={(e) => setEditMember({...editMember, full_name: e.target.value})}
                  />
                  <input 
                    type="text" 
                    placeholder="ID Number" 
                    className="w-full border border-gray-300 p-3 rounded-lg"
                    value={editMember.id_number}
                    onChange={(e) => setEditMember({...editMember, id_number: e.target.value})}
                  />
                  <input 
                    type="email" 
                    placeholder="Email" 
                    className="w-full border border-gray-300 p-3 rounded-lg"
                    value={editMember.email}
                    onChange={(e) => setEditMember({...editMember, email: e.target.value})}
                  />
                  <input 
                    type="tel" 
                    placeholder="Phone" 
                    className="w-full border border-gray-300 p-3 rounded-lg"
                    value={editMember.phone}
                    onChange={(e) => setEditMember({...editMember, phone: e.target.value})}
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => setEditMember(null)}
                      className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={updateMember}
                      className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition font-semibold"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loans Table */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Loans Management</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Member</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Interest %</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Created</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Guarantor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Record Payment</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loans.map((l, idx) => {
                    const principal = parseFloat(l.principal_amount || 0);
                    const total = parseFloat(l.initial_amount || 0);
                    const interest = total - principal;
                    const currentBalance = parseFloat(l.amount || 0);
                    
                    return (
                      <tr key={`loan-${idx}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          <div className="font-semibold text-gray-900">{l.memberName}</div>
                          <div className="text-xs text-gray-500">{l.saccoNumber}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-semibold text-red-600">
                            KES {total.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-600">
                            Balance: KES {currentBalance.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{l.interest_rate || 10}%</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            l.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                            l.status === "APPROVED" ? "bg-green-100 text-green-800" :
                            "bg-red-100 text-red-800"
                          }`}>
                            {l.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {l.createdAt ? new Date(l.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <button
                            onClick={() => viewGuarantors(l.id)}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition flex items-center gap-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            View ({l.guarantorCounts ? (l.guarantorCounts.members + l.guarantorCounts.churchOfficials + l.guarantorCounts.witnesses) : 0})
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {l.status === "APPROVED" && currentBalance > 0 && (
                            <div className="flex gap-1">
                              <input 
                                type="number" 
                                placeholder="Amount" 
                                className="border border-gray-300 p-1 rounded w-24 text-sm" 
                                value={paymentAmount[l.id] || ""} 
                                onChange={e => setPaymentAmount({...paymentAmount, [l.id]: e.target.value})} 
                              />
                              <button 
                                onClick={() => recordPayment(l.id)} 
                                className="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700 transition"
                              >
                                Pay
                              </button>
                            </div>
                          )}
                          {l.status === "APPROVED" && currentBalance === 0 && (
                            <span className="text-green-600 font-semibold text-xs">✓ Fully Paid</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {/* ✅ NEW: Edit Loan Button */}
                          <div className="flex gap-1 flex-wrap">
                            <button 
                              onClick={() => setEditingLoan(l)} 
                              className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 transition"
                            >
                              Edit
                            </button>
                            
                            {l.status === "PENDING" && (
                              <>
                                <button 
                                  onClick={() => openApprovalModal(l)} 
                                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition"
                                >
                                  Approve
                                </button>
                                <button 
                                  onClick={() => rejectLoan(l.id)} 
                                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Dividends Tab */}
      {activeTab === "dividends" && <DividendsManagement />}

      {/* Reports Tab */}
      {activeTab === "reports" && <Reports />}

      {/* Payment Result Modal */}
      {showPaymentModal && paymentResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
            <h2 className="text-2xl font-bold text-green-600 mb-4">✓ Payment Recorded</h2>
            
            <div className="space-y-3 mb-6">
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-600">Amount Paid</p>
                <p className="text-xl font-bold text-gray-900">
                  KES {paymentResult.repayment?.amount?.toLocaleString()}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-xs text-gray-600">Interest Paid</p>
                  <p className="text-sm font-bold text-blue-700">
                    KES {paymentResult.repayment?.interestPayment?.toLocaleString()}
                  </p>
                </div>
                <div className="bg-purple-50 p-3 rounded">
                  <p className="text-xs text-gray-600">Principal Paid</p>
                  <p className="text-sm font-bold text-purple-700">
                    KES {paymentResult.repayment?.principalPayment?.toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="bg-green-50 p-3 rounded">
                <p className="text-sm text-gray-600">Remaining Balance</p>
                <p className="text-xl font-bold text-green-700">
                  KES {paymentResult.repayment?.newBalance?.toLocaleString()}
                </p>
              </div>

              <div className="bg-indigo-50 p-3 rounded">
                <p className="text-sm text-gray-600">New Loan Limit</p>
                <p className="text-xl font-bold text-indigo-700">
                  KES {paymentResult.loanLimit?.new?.toLocaleString()}
                </p>
                {paymentResult.loanLimit?.increase > 0 && (
                  <p className="text-xs text-indigo-500 mt-1">
                    ↑ KES {paymentResult.loanLimit?.increase?.toLocaleString()} from principal paid
                  </p>
                )}
              </div>
              
              {paymentResult.fullyPaid && (
                <div className="bg-green-100 p-3 rounded text-center">
                  <p className="text-green-800 font-bold">🎉 Loan Fully Paid!</p>
                </div>
              )}
            </div>
            
            <button
              onClick={() => setShowPaymentModal(false)}
              className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ✅ NEW: Add Member Modal (Enhanced) */}
      {showAddMemberModal && (
        <AddMemberModal
          onClose={() => setShowAddMemberModal(false)}
          onSuccess={() => {
            loadMembers();
            loadLoans(); // Refresh loans too in case member has existing loan
          }}
        />
      )}

      {/* ✅ NEW: Edit Loan Modal */}
      {editingLoan && (
        <EditLoanModal
          loan={editingLoan}
          onClose={() => setEditingLoan(null)}
          onSuccess={() => {
            loadLoans();
            loadMembers(); // Refresh members too for updated loan limits
          }}
        />
      )}

      {/* ✅ NEW: Loan Approval Modal */}
      {approvingLoan && (
        <LoanApprovalModal
          loan={approvingLoan}
          onClose={() => setApprovingLoan(null)}
          onSuccess={() => {
            loadLoans();
            loadMembers();
          }}
        />
      )}

      {/* ✅ NEW: Guarantors Modal */}
      {showGuarantorsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-blue-700 text-white p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Loan Guarantors</h2>
                {selectedLoanGuarantors && (
                  <p className="text-blue-100 text-sm mt-1">
                    Member: {selectedLoanGuarantors.loan.memberName} | 
                    Loan Amount: KES {selectedLoanGuarantors.loan.amount?.toLocaleString()}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowGuarantorsModal(false);
                  setSelectedLoanGuarantors(null);
                }}
                className="text-white hover:text-blue-200 text-3xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              {loadingGuarantors && (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
                  <p className="mt-2 text-gray-600">Loading guarantors...</p>
                </div>
              )}

              {!loadingGuarantors && selectedLoanGuarantors && (
                <div className="space-y-6">
                  {/* SACCO Member Guarantors */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-green-900 mb-4 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                      </svg>
                      SACCO Member Guarantors ({selectedLoanGuarantors.guarantors.members?.length || 0})
                    </h3>
                    {selectedLoanGuarantors.guarantors.members?.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {selectedLoanGuarantors.guarantors.members.map((g, idx) => (
                          <div key={g.id} className="bg-white p-4 rounded-lg shadow-sm border border-green-200">
                            <div className="font-semibold text-green-900 mb-2">Guarantor {idx + 1}</div>
                            <div className="space-y-1 text-sm">
                              <div><span className="font-semibold">Name:</span> {g.name}</div>
                              <div><span className="font-semibold">ID:</span> {g.idNumber}</div>
                              <div><span className="font-semibold">Phone:</span> {g.phone}</div>
                              <div><span className="font-semibold">Email:</span> {g.email}</div>
                              <div><span className="font-semibold">Shares:</span> KES {g.shares?.toLocaleString()}</div>
                              <div className="text-xs text-gray-600 mt-2">
                                {g.county}, {g.location}, {g.subLocation}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600">No SACCO member guarantors</p>
                    )}
                  </div>

                  {/* Church Officials */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                      Church Council Officials ({selectedLoanGuarantors.guarantors.churchOfficials?.length || 0})
                    </h3>
                    {selectedLoanGuarantors.guarantors.churchOfficials?.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {selectedLoanGuarantors.guarantors.churchOfficials.map((g, idx) => (
                          <div key={g.id} className="bg-white p-4 rounded-lg shadow-sm border border-purple-200">
                            <div className="font-semibold text-purple-900 mb-2">Official {idx + 1}</div>
                            <div className="space-y-1 text-sm">
                              <div><span className="font-semibold">Name:</span> {g.name}</div>
                              <div><span className="font-semibold">Position:</span> {g.position}</div>
                              <div><span className="font-semibold">Church:</span> {g.localChurch}</div>
                              <div><span className="font-semibold">ID:</span> {g.idNumber}</div>
                              <div><span className="font-semibold">Phone:</span> {g.phone}</div>
                              <div><span className="font-semibold">Email:</span> {g.email}</div>
                              <div className="text-xs text-gray-600 mt-2">
                                {g.county}, {g.location}, {g.subLocation}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600">No church officials</p>
                    )}
                  </div>

                  {/* Witnesses */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                      </svg>
                      Witnesses / Next of Kin ({selectedLoanGuarantors.guarantors.witnesses?.length || 0})
                    </h3>
                    {selectedLoanGuarantors.guarantors.witnesses?.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedLoanGuarantors.guarantors.witnesses.map((g, idx) => (
                          <div key={g.id} className="bg-white p-4 rounded-lg shadow-sm border border-blue-200">
                            <div className="font-semibold text-blue-900 mb-2">Witness {idx + 1}</div>
                            <div className="space-y-1 text-sm">
                              <div><span className="font-semibold">Name:</span> {g.name}</div>
                              <div><span className="font-semibold">ID:</span> {g.idNumber}</div>
                              <div><span className="font-semibold">Phone:</span> {g.phone}</div>
                              <div><span className="font-semibold">Email:</span> {g.email}</div>
                              <div><span className="font-semibold">Work:</span> {g.placeOfWork}</div>
                              <div className="text-xs text-gray-600 mt-2">
                                {g.county}, {g.location}, {g.subLocation}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600">No witnesses</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t flex justify-end">
              <button
                onClick={() => {
                  setShowGuarantorsModal(false);
                  setSelectedLoanGuarantors(null);
                }}
                className="px-6 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
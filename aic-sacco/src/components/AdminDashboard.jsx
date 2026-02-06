import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import Reports from "./Reports";
import DividendsManagement from "./Dividendsmanagement";

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

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    navigate("/");
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
      const res = await API.get("/admin/loans");
      setLoans(res.data);
    } catch (error) {
      console.error("Error loading loans:", error);
      alert("Failed to load loans. Please check your authentication.");
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

  const approveLoan = async (loanId) => {
    try {
      await API.put(`/admin/loans/${loanId}/approve`);
      loadLoans();
      loadMembers();
      alert("Loan approved successfully!");
    } catch (error) {
      console.error("Error approving loan:", error);
      alert("Failed to approve loan: " + (error.response?.data?.message || error.message));
    }
  };

  const rejectLoan = async (loanId) => {
    try {
      await API.put(`/admin/loans/${loanId}/reject`);
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
      const res = await API.post(`/admin/loans/${loanId}/payment`, { 
        paymentAmount: parseFloat(amount) 
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
          {/* Add Member Form */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Add New User</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                type="text" 
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
                className="border border-gray-300 p-3 rounded-lg bg-white"
                value={newMember.role}
                onChange={e => setNewMember({...newMember, role: e.target.value})}
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
              <button 
                onClick={addMember} 
                className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition font-semibold"
              >
                Add {newMember.role === "ADMIN" ? "Admin" : "Member"}
              </button>
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Users List</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Member</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Savings</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Loan Limit</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Add Savings</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {members.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <div className="font-semibold text-gray-900">{m.full_name}</div>
                        <div className="text-xs text-gray-500">ID: {m.id_number}</div>
                        <div className="text-xs text-gray-500">SACCO: {m.sacco_number}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          m.role === 'ADMIN' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {m.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="text-gray-900">{m.email}</div>
                        <div className="text-xs text-gray-500">{m.phone}</div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600">
                        KES {m.savings?.toLocaleString() || 0}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-blue-600">
                        KES {m.loan_limit?.toLocaleString() || 0}
                      </td>
                      <td className="px-4 py-3 text-sm">
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
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Edit Member</h2>
                <div className="space-y-4">
                  <input 
                    type="text" 
                    placeholder="Full Name" 
                    className="w-full border border-gray-300 p-3 rounded-lg"
                    value={editMember.full_name}
                    onChange={(e) => setEditMember({...editMember, full_name: e.target.value})}
                  />
                  <input 
                    type="email" 
                    placeholder="Email" 
                    className="w-full border border-gray-300 p-3 rounded-lg"
                    value={editMember.email}
                    onChange={(e) => setEditMember({...editMember, email: e.target.value})}
                  />
                  <input 
                    type="text" 
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
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div className="space-y-1">
                            <div className="font-semibold">{l.guarantorName}</div>
                            <div className="text-xs text-gray-600">{l.guarantorEmail}</div>
                          </div>
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
                          {l.status === "PENDING" && (
                            <div className="flex gap-1">
                              <button 
                                onClick={() => approveLoan(l.id)} 
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
                            </div>
                          )}
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
                  KES {paymentResult.paid?.toLocaleString()}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-xs text-gray-600">Interest Paid</p>
                  <p className="text-sm font-bold text-blue-700">
                    KES {paymentResult.breakdown?.interestPaid?.toLocaleString()}
                  </p>
                </div>
                <div className="bg-purple-50 p-3 rounded">
                  <p className="text-xs text-gray-600">Principal Paid</p>
                  <p className="text-sm font-bold text-purple-700">
                    KES {paymentResult.breakdown?.principalPaid?.toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="bg-green-50 p-3 rounded">
                <p className="text-sm text-gray-600">Remaining Balance</p>
                <p className="text-xl font-bold text-green-700">
                  KES {paymentResult.remaining?.toLocaleString()}
                </p>
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
    </div>
  );
};

export default AdminDashboard;
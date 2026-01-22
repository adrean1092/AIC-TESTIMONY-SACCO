import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Reports from "./Reports";

const API_BASE_URL = "https://aic-testimony-sacco-1.onrender.com";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("members"); // members, reports
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

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    navigate("/");
  };

  const loadMembers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/members`, getAuthHeaders());
      setMembers(res.data);
    } catch (error) {
      console.error("Error loading members:", error);
      alert("Failed to load members. Please check your authentication.");
    }
  };

  const loadLoans = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/loans`, getAuthHeaders());
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
      await axios.post(`${API_BASE_URL}/api/admin/members`, newMember, getAuthHeaders());
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
      await axios.put(`${API_BASE_URL}/api/admin/members/${editMember.id}`, editMember, getAuthHeaders());
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
      await axios.delete(`${API_BASE_URL}/api/admin/members/${id}`, getAuthHeaders());
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
      await axios.post(
        `${API_BASE_URL}/api/admin/members/${memberId}/savings`, 
        { amount: parseFloat(amount) }, 
        getAuthHeaders()
      );
      setSavingsAmount({ ...savingsAmount, [memberId]: "" });
      loadMembers();
      alert("Savings updated successfully!");
    } catch (error) {
      console.error("Error updating savings:", error);
      alert("Failed to update savings: " + (error.response?.data?.message || error.message));
    }
  };

  const approveLoan = async (id) => {
    try {
      await axios.put(`${API_BASE_URL}/api/admin/loans/${id}/approve`, {}, getAuthHeaders());
      loadLoans();
      loadMembers();
      alert("Loan approved successfully!");
    } catch (error) {
      console.error("Error approving loan:", error);
      alert("Failed to approve loan: " + (error.response?.data?.message || error.message));
    }
  };

  const rejectLoan = async (id) => {
    try {
      await axios.put(`${API_BASE_URL}/api/admin/loans/${id}/reject`, {}, getAuthHeaders());
      loadLoans();
      alert("Loan rejected successfully!");
    } catch (error) {
      console.error("Error rejecting loan:", error);
      alert("Failed to reject loan: " + (error.response?.data?.message || error.message));
    }
  };

  const recordPayment = async (id) => {
    const amount = paymentAmount[id];
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid payment amount");
      return;
    }
    try {
      const res = await axios.put(
        `${API_BASE_URL}/api/admin/loans/${id}/payment`, 
        { amount: parseFloat(amount) }, 
        getAuthHeaders()
      );
      setPaymentAmount({ ...paymentAmount, [id]: "" });
      setPaymentResult(res.data);
      setShowPaymentModal(true);
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

      {/* Tabs Navigation */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("members")}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === "members"
                ? "border-b-2 border-red-600 text-red-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            👥 Members & Loans
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === "reports"
                ? "border-b-2 border-red-600 text-red-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            📊 Reports
          </button>
        </div>
      </div>

      {/* Members & Loans Tab */}
      {activeTab === "members" && (
        <>
          {/* Add/Edit Member Form */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {editMember ? "Edit Member" : "Add New Member"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <input 
                type="text" 
                placeholder="Full Name *" 
                value={editMember?.full_name || newMember.full_name} 
                onChange={e => editMember 
                  ? setEditMember({...editMember, full_name: e.target.value}) 
                  : setNewMember({...newMember, full_name: e.target.value})} 
                className="border border-gray-300 p-2 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent" 
              />
              <input 
                type="text" 
                placeholder="ID Number *" 
                value={editMember?.id_number || newMember.id_number} 
                onChange={e => editMember 
                  ? setEditMember({...editMember, id_number: e.target.value}) 
                  : setNewMember({...newMember, id_number: e.target.value})} 
                className="border border-gray-300 p-2 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent" 
              />
              <input 
                type="email" 
                placeholder="Email *" 
                value={editMember?.email || newMember.email} 
                onChange={e => editMember 
                  ? setEditMember({...editMember, email: e.target.value}) 
                  : setNewMember({...newMember, email: e.target.value})} 
                className="border border-gray-300 p-2 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent" 
              />
              <input 
                type="tel" 
                placeholder="Phone Number *" 
                value={editMember?.phone || newMember.phone} 
                onChange={e => editMember 
                  ? setEditMember({...editMember, phone: e.target.value}) 
                  : setNewMember({...newMember, phone: e.target.value})} 
                className="border border-gray-300 p-2 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent" 
              />
              {!editMember && (
                <select 
                  value={newMember.role} 
                  onChange={e => setNewMember({...newMember, role: e.target.value})} 
                  className="border border-gray-300 p-2 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              )}
              {!editMember && (
                <input 
                  type="password" 
                  placeholder="Password *" 
                  value={newMember.password} 
                  onChange={e => setNewMember({...newMember, password: e.target.value})} 
                  className="border border-gray-300 p-2 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent" 
                />
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <button 
                onClick={editMember ? updateMember : addMember} 
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition"
              >
                {editMember ? "Update Member" : "Add Member"}
              </button>
              {editMember && (
                <button 
                  onClick={() => setEditMember(null)} 
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Members Management</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-red-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">SACCO #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">ID Number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Savings</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Add Savings</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {members.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{m.full_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{m.role}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{m.sacco_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{m.id_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{m.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{m.phone}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600">
                        KES {parseFloat(m.savings || 0).toLocaleString()}
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
                  {loans.map(l => {
                    const principal = parseFloat(l.principal_amount || 0);
                    const total = parseFloat(l.initial_amount || 0);
                    const interest = total - principal;
                    const currentBalance = parseFloat(l.amount || 0);
                    
                    return (
                      <tr key={l.id} className="hover:bg-gray-50">
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
                  KES {paymentResult.paid.toLocaleString()}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-xs text-gray-600">Interest Paid</p>
                  <p className="text-sm font-bold text-blue-700">
                    KES {paymentResult.breakdown?.interestPaid.toLocaleString()}
                  </p>
                </div>
                <div className="bg-purple-50 p-3 rounded">
                  <p className="text-xs text-gray-600">Principal Paid</p>
                  <p className="text-sm font-bold text-purple-700">
                    KES {paymentResult.breakdown?.principalPaid.toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="bg-orange-50 p-3 rounded">
                <p className="text-sm text-gray-600">Remaining Balance</p>
                <p className="text-xl font-bold text-orange-600">
                  KES {paymentResult.remaining.toLocaleString()}
                </p>
              </div>
              
              <div className="bg-green-50 p-3 rounded">
                <p className="text-sm text-gray-600">New Loan Limit</p>
                <p className="text-lg font-bold text-green-600">
                  KES {paymentResult.newLoanLimit.toLocaleString()}
                </p>
              </div>
              
              {paymentResult.totals && (
                <div className="border-t pt-3 mt-3">
                  <p className="text-xs text-gray-500 mb-2">Total Progress</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-gray-600">Total Interest Paid</p>
                      <p className="font-semibold">
                        KES {paymentResult.totals.totalInterestPaid.toLocaleString()} / {paymentResult.totals.totalInterest.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Principal Paid</p>
                      <p className="font-semibold">
                        KES {paymentResult.totals.totalPrincipalPaid.toLocaleString()} / {paymentResult.totals.totalPrincipal.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={() => {
                setShowPaymentModal(false);
                setPaymentResult(null);
              }}
              className="w-full bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
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
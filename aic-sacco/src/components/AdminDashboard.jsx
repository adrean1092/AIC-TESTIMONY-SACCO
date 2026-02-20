import React, { useEffect, useState } from "react";
import API from "../api";
import Reports from "./Reports";
import DividendsManagement from "./Dividendsmanagement";
import AddMemberModal from "./AddMemberModal";
import Editmembermodal from "./Editmembermodal";
import EditLoanModal from "./EditLoanModal";
import LoanApprovalModal from "./Loanapprovalmodal";
import Bulkloanpaymentupload from "./Bulkloanpaymentupload";
import BulkLoanUpload from "./Bulkloanupload";
import AddHistoricalLoanModal from "./AddHistoricalLoanModal";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("members");
  const [members, setMembers] = useState([]);
  const [loans, setLoans] = useState([]);

  // Member modals
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  // Loan modals
  const [editingLoan, setEditingLoan] = useState(null);
  const [approvingLoan, setApprovingLoan] = useState(null);
  const [showGuarantorsModal, setShowGuarantorsModal] = useState(false);
  const [selectedLoanGuarantors, setSelectedLoanGuarantors] = useState(null);
  const [loadingGuarantors, setLoadingGuarantors] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showBulkLoanUpload, setShowBulkLoanUpload] = useState(false);
  const [showHistoricalLoanModal, setShowHistoricalLoanModal] = useState(false);

  // Savings state
  const [savingsAmount, setSavingsAmount] = useState({});

  // Payment state
  const [paymentAmount, setPaymentAmount] = useState({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);

  // Loan filters
  const [loanStatusFilter, setLoanStatusFilter] = useState("ALL");
  const [loanSearch, setLoanSearch] = useState("");

  // Member search
  const [memberSearch, setMemberSearch] = useState("");

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
      alert("Failed to load members.");
    }
  };

  const loadLoans = async () => {
    try {
      const res = await API.get("/loans");
      setLoans(res.data.loans || res.data);
    } catch (error) {
      console.error("Error loading loans:", error);
      alert("Failed to load loans.");
    }
  };

  useEffect(() => {
    loadMembers();
    loadLoans();
  }, []);

  const deleteMember = async (id) => {
    if (!window.confirm("Are you sure you want to delete this member?")) return;
    try {
      await API.delete(`/admin/members/${id}`);
      loadMembers();
      alert("Member deleted successfully!");
    } catch (error) {
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
      alert("Failed to update savings: " + (error.response?.data?.message || error.message));
    }
  };

  const rejectLoan = async (loanId) => {
    if (!window.confirm("Reject this loan?")) return;
    try {
      await API.post(`/loans/${loanId}/reject`);
      loadLoans();
      alert("Loan rejected.");
    } catch (error) {
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
      alert("Failed to record payment: " + (error.response?.data?.message || error.message));
    }
  };

  const viewGuarantors = async (loanId) => {
    setLoadingGuarantors(true);
    setShowGuarantorsModal(true);
    try {
      const res = await API.get(`/loans/${loanId}`);
      setSelectedLoanGuarantors(res.data);
    } catch (error) {
      alert("Failed to load guarantors");
      setShowGuarantorsModal(false);
    } finally {
      setLoadingGuarantors(false);
    }
  };

  // Filtered lists
  const filteredMembers = members.filter(m =>
    m.full_name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.email?.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.sacco_number?.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const filteredLoans = loans.filter(l => {
    const matchesStatus = loanStatusFilter === "ALL" || l.status === loanStatusFilter;
    const matchesSearch = l.memberName?.toLowerCase().includes(loanSearch.toLowerCase()) ||
      l.saccoNumber?.toLowerCase().includes(loanSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const tabs = [
    { id: "members", label: "👤 Members", count: members.length },
    { id: "savings", label: "💰 Savings", count: null },
    { id: "loans", label: "📋 Loans", count: loans.filter(l => l.status === "PENDING").length || null },
    { id: "dividends", label: "📊 Dividends", count: null },
    { id: "reports", label: "🗂 Reports", count: null },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-red-700 text-white shadow-lg">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">AIC TESTIMONY SACCO</h1>
            <p className="text-red-200 text-sm">Admin Dashboard</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-white text-red-700 px-4 py-2 rounded-lg hover:bg-red-50 transition font-semibold text-sm"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-20">
        <div className="max-w-screen-xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "border-red-600 text-red-700 bg-red-50"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    activeTab === tab.id ? "bg-red-600 text-white" : "bg-gray-200 text-gray-700"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6">

        {/* ─────────────────────────────────────────────
            MEMBERS TAB
        ───────────────────────────────────────────── */}
        {activeTab === "members" && (
          <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Members</h2>
                <p className="text-sm text-gray-500">{members.length} total members</p>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Search name, email or SACCO #..."
                  className="border border-gray-300 rounded-lg px-4 py-2 text-sm flex-1 md:w-64 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                />
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-semibold text-sm whitespace-nowrap flex items-center gap-2"
                >
                  <span>➕</span> Add Member
                </button>
              </div>
            </div>

            {/* Members Table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">SACCO #</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ID Number</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredMembers.map((m, idx) => (
                      <tr key={m.id || idx} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-sm font-bold text-red-700">{m.sacco_number || '—'}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">{m.full_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{m.id_number}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{m.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{m.phone}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            m.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {m.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingMember(m)}
                              className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteMember(m.id)}
                              className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-200 transition"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredMembers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">
                          No members found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────
            SAVINGS TAB
        ───────────────────────────────────────────── */}
        {activeTab === "savings" && (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h2 className="text-xl font-bold text-gray-800">Savings Management</h2>
              <p className="text-sm text-gray-500">View and update member savings balances</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Members</p>
                <p className="text-3xl font-bold text-gray-900">{members.filter(m => m.role === 'MEMBER').length}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Savings</p>
                <p className="text-3xl font-bold text-green-700">
                  KES {members.reduce((sum, m) => sum + parseFloat(m.savings || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Loan Limits</p>
                <p className="text-3xl font-bold text-blue-700">
                  KES {members.reduce((sum, m) => sum + parseFloat(m.loan_limit || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Savings Table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="px-6 py-4 border-b bg-green-50">
                <h3 className="font-semibold text-green-900">Member Savings Balances</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">SACCO #</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Member Name</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Savings Balance</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Loan Limit (3x)</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Add Savings</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {members.filter(m => m.role === 'MEMBER').map((m, idx) => (
                      <tr key={m.id || idx} className="hover:bg-green-50 transition">
                        <td className="px-4 py-3 text-sm font-bold text-red-700">{m.sacco_number || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-gray-900">{m.full_name}</div>
                          <div className="text-xs text-gray-500">{m.email}</div>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-green-700 text-right">
                          KES {parseFloat(m.savings || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-blue-700 text-right">
                          KES {parseFloat(m.loan_limit || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <input
                              type="number"
                              placeholder="Amount (KES)"
                              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-36 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                              value={savingsAmount[m.id] || ""}
                              onChange={e => setSavingsAmount({ ...savingsAmount, [m.id]: e.target.value })}
                              min="0"
                            />
                            <button
                              onClick={() => updateSavings(m.id)}
                              className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition whitespace-nowrap"
                            >
                              + Add
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────
            LOANS TAB
        ───────────────────────────────────────────── */}
        {activeTab === "loans" && (
          <div className="space-y-6">
            {/* Header + Filters */}
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Loans Management</h2>
                <p className="text-sm text-gray-500">
                  {loans.filter(l => l.status === "PENDING").length} pending approval
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setShowHistoricalLoanModal(true)}
                  className="bg-slate-700 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-slate-800 transition whitespace-nowrap"
                >
                  🕐 Add Historical Loan
                </button>
                <button
                  onClick={() => setShowBulkLoanUpload(true)}
                  className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-emerald-700 transition whitespace-nowrap"
                >
                  📥 Bulk Loan Import
                </button>
                <button
                  onClick={() => setShowBulkUpload(true)}
                  className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-700 transition whitespace-nowrap"
                >
                  📤 Bulk Payment Upload
                </button>
                <input
                  type="text"
                  placeholder="Search member..."
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-48 focus:ring-2 focus:ring-red-500 outline-none"
                  value={loanSearch}
                  onChange={e => setLoanSearch(e.target.value)}
                />
                {["ALL", "PENDING", "APPROVED", "REJECTED"].map(s => (
                  <button
                    key={s}
                    onClick={() => setLoanStatusFilter(s)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${
                      loanStatusFilter === s
                        ? "bg-red-600 text-white"
                        : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Loans", value: loans.length, color: "text-gray-900" },
                { label: "Pending", value: loans.filter(l => l.status === "PENDING").length, color: "text-yellow-700" },
                { label: "Approved", value: loans.filter(l => l.status === "APPROVED").length, color: "text-green-700" },
                { label: "Rejected", value: loans.filter(l => l.status === "REJECTED").length, color: "text-red-700" },
              ].map(stat => (
                <div key={stat.label} className="bg-white rounded-xl shadow p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Loans Table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Member</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Repayment</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rate</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Period</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Guarantors</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Payment</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredLoans.map((l, idx) => {
                      const total = parseFloat(l.initialAmount || l.initial_amount || l.amount || 0);
                      const balance = parseFloat(l.amount || 0);
                      const principalPaid = parseFloat(l.principalPaid || l.principal_paid || 0);
                      const interestPaid = parseFloat(l.interestPaid || l.interest_paid || 0);
                      const totalPaid = principalPaid + interestPaid;
                      const principalWithFee = parseFloat(l.principalAmount || l.principal_amount || total);

                      // Calculate repayment percentage
                      const repaymentPercent = principalWithFee > 0 
                        ? ((principalPaid / principalWithFee) * 100).toFixed(1)
                        : 0;

                      return (
                        <tr key={l.id || idx} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3 text-sm">
                            <div className="font-semibold text-gray-900">{l.memberName}</div>
                            <div className="text-xs text-gray-400">{l.saccoNumber}</div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="font-bold text-gray-900">KES {total.toLocaleString()}</div>
                            <div className="text-xs text-red-600">Bal: KES {balance.toLocaleString()}</div>
                          </td>
                          {/* ✅ NEW REPAYMENT COLUMN */}
                          <td className="px-4 py-3 text-sm">
                            {l.status === "APPROVED" ? (
                              <div>
                                <div className="font-semibold text-green-700">
                                  KES {totalPaid.toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Principal: {principalPaid.toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Interest: {interestPaid.toLocaleString()}
                                </div>
                                {/* Progress bar */}
                                <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                                  <div 
                                    className="bg-green-600 h-1.5 rounded-full transition-all"
                                    style={{ width: `${Math.min(repaymentPercent, 100)}%` }}
                                  ></div>
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {repaymentPercent}% repaid
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {l.interest_rate || l.interestRate || 10}%
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {l.repayment_period || l.repaymentPeriod || '—'} mo
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              l.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                              l.status === "APPROVED" ? "bg-green-100 text-green-800" :
                              "bg-red-100 text-red-800"
                            }`}>
                              {l.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {l.createdAt ? new Date(l.createdAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <button
                              onClick={() => viewGuarantors(l.id)}
                              className="text-blue-600 hover:text-blue-800 text-xs font-semibold underline"
                            >
                              View ({l.guarantorCounts
                                ? (l.guarantorCounts.members + l.guarantorCounts.churchOfficials + l.guarantorCounts.witnesses)
                                : 0})
                            </button>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {l.status === "APPROVED" && balance > 0 ? (
                              <div className="flex gap-1">
                                <input
                                  type="number"
                                  placeholder="KES"
                                  className="border border-gray-300 rounded px-2 py-1 text-xs w-24"
                                  value={paymentAmount[l.id] || ""}
                                  onChange={e => setPaymentAmount({ ...paymentAmount, [l.id]: e.target.value })}
                                />
                                <button
                                  onClick={() => recordPayment(l.id)}
                                  className="bg-orange-500 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-orange-600 transition"
                                >
                                  Pay
                                </button>
                              </div>
                            ) : l.status === "APPROVED" && balance === 0 ? (
                              <span className="text-green-600 text-xs font-bold">✓ Paid</span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex gap-1 flex-wrap">
                              <button
                                onClick={() => setEditingLoan(l)}
                                className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-purple-700 transition"
                              >
                                Edit
                              </button>
                              {l.status === "PENDING" && (
                                <button
                                  onClick={() => setApprovingLoan(l)}
                                  className="bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-green-700 transition"
                                >
                                  Approve
                                </button>
                              )}
                              {l.status === "PENDING" && (
                                <button
                                  onClick={() => rejectLoan(l.id)}
                                  className="bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-red-700 transition"
                                >
                                  Reject
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredLoans.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-4 py-10 text-center text-gray-400 text-sm">
                          No loans found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Dividends & Reports tabs */}
        {activeTab === "dividends" && <DividendsManagement />}
        {activeTab === "reports" && <Reports />}
      </div>

      {/* ─── MODALS ─── */}

      {/* Add Member */}
      {showAddMemberModal && (
        <AddMemberModal
          onClose={() => setShowAddMemberModal(false)}
          onSuccess={() => { loadMembers(); loadLoans(); }}
        />
      )}

      {/* Edit Member (details only) */}
      {editingMember && (
        <Editmembermodal
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSuccess={() => { loadMembers(); setEditingMember(null); }}
        />
      )}

      {/* Edit Loan */}
      {editingLoan && (
        <EditLoanModal
          loan={editingLoan}
          onClose={() => setEditingLoan(null)}
          onSuccess={() => { loadLoans(); loadMembers(); }}
        />
      )}

      {/* Loan Approval */}
      {approvingLoan && (
        <LoanApprovalModal
          loan={approvingLoan}
          onClose={() => setApprovingLoan(null)}
          onSuccess={() => { loadLoans(); loadMembers(); }}
        />
      )}

      {/* Payment Result */}
      {showPaymentModal && paymentResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-green-600 mb-4">✓ Payment Recorded</h2>
            <div className="space-y-3 mb-6">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Amount Paid</p>
                <p className="text-xl font-bold">KES {paymentResult.repayment?.amount?.toLocaleString()}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">Interest Paid</p>
                  <p className="font-bold text-blue-700">KES {paymentResult.repayment?.interestPayment?.toLocaleString()}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">Principal Paid</p>
                  <p className="font-bold text-purple-700">KES {paymentResult.repayment?.principalPayment?.toLocaleString()}</p>
                </div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Remaining Balance</p>
                <p className="text-xl font-bold text-green-700">KES {paymentResult.repayment?.newBalance?.toLocaleString()}</p>
              </div>
              {paymentResult.fullyPaid && (
                <div className="bg-green-100 p-3 rounded-lg text-center">
                  <p className="text-green-800 font-bold text-lg">🎉 Loan Fully Paid!</p>
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

      {/* Guarantors Modal */}
      {showGuarantorsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-blue-700 text-white p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Loan Guarantors</h2>
                {selectedLoanGuarantors && (
                  <p className="text-blue-200 text-sm mt-1">
                    {selectedLoanGuarantors.loan?.memberName} — KES {selectedLoanGuarantors.loan?.amount?.toLocaleString()}
                  </p>
                )}
              </div>
              <button onClick={() => { setShowGuarantorsModal(false); setSelectedLoanGuarantors(null); }}
                className="text-white hover:text-blue-200 text-3xl font-bold">×</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {loadingGuarantors && <div className="text-center py-10 text-gray-500">Loading guarantors...</div>}
              {!loadingGuarantors && selectedLoanGuarantors && (
                <div className="space-y-6">
                  {/* SACCO Members */}
                  <GuarantorSection title="SACCO Member Guarantors" color="green"
                    items={selectedLoanGuarantors.guarantors?.members} type="member" />
                  {/* Church Officials */}
                  <GuarantorSection title="Church Council Officials" color="purple"
                    items={selectedLoanGuarantors.guarantors?.churchOfficials} type="official" />
                  {/* Witnesses */}
                  <GuarantorSection title="Witnesses / Next of Kin" color="blue"
                    items={selectedLoanGuarantors.guarantors?.witnesses} type="witness" />
                </div>
              )}
            </div>
            <div className="bg-gray-50 px-6 py-4 border-t flex justify-end">
              <button onClick={() => { setShowGuarantorsModal(false); setSelectedLoanGuarantors(null); }}
                className="px-6 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 font-semibold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Bulk Payment Upload */}
      {showBulkUpload && (
        <Bulkloanpaymentupload
          onClose={() => setShowBulkUpload(false)}
          onSuccess={() => { setShowBulkUpload(false); loadLoans(); }}
        />
      )}

      {/* Bulk Historical Loan Import */}
      {showBulkLoanUpload && (
        <BulkLoanUpload
          onClose={() => setShowBulkLoanUpload(false)}
          onSuccess={() => { setShowBulkLoanUpload(false); loadLoans(); loadMembers(); }}
        />
      )}

      {/* Single Historical Loan */}
      {showHistoricalLoanModal && (
        <AddHistoricalLoanModal
          onClose={() => setShowHistoricalLoanModal(false)}
          onSuccess={() => { setShowHistoricalLoanModal(false); loadLoans(); loadMembers(); }}
        />
      )}
    </div>
  );
};

// Helper component for guarantor sections
function GuarantorSection({ title, color, items, type }) {
  const colorMap = {
    green: "bg-green-50 border-green-200 text-green-900",
    purple: "bg-purple-50 border-purple-200 text-purple-900",
    blue: "bg-blue-50 border-blue-200 text-blue-900",
  };
  return (
    <div className={`border rounded-lg p-5 ${colorMap[color]}`}>
      <h3 className="font-bold text-lg mb-4">{title} ({items?.length || 0})</h3>
      {items?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((g, i) => (
            <div key={g.id || i} className="bg-white rounded-lg p-4 shadow-sm text-sm space-y-1">
              <div className="font-semibold text-gray-900">{g.name}</div>
              {g.position && <div className="text-gray-600">Position: {g.position}</div>}
              {g.localChurch && <div className="text-gray-600">Church: {g.localChurch}</div>}
              <div className="text-gray-600">ID: {g.idNumber}</div>
              <div className="text-gray-600">Phone: {g.phone}</div>
              {g.email && <div className="text-gray-600">Email: {g.email}</div>}
              {g.shares && <div className="text-gray-600">Shares: KES {g.shares?.toLocaleString()}</div>}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">None added</p>
      )}
    </div>
  );
}

export default AdminDashboard;
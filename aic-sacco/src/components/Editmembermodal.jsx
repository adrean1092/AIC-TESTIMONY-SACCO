import React, { useState, useEffect } from "react";
import API from "../api";

export default function EditMemberModal({ member, onClose, onSuccess }) {
  const [memberData, setMemberData] = useState({
    full_name: "",
    id_number: "",
    email: "",
    phone: "",
    sacco_number: "",
    role: "MEMBER",
  });

  const [loanData, setLoanData] = useState({
    amount: "",
    interest_rate: "1.045",
    repayment_period: "12",
    loan_purpose: "",
    status: "APPROVED",
    created_at: new Date().toISOString().split("T")[0],
  });

  const [showLoanForm, setShowLoanForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loanLoading, setLoanLoading] = useState(false);
  const [existingLoans, setExistingLoans] = useState([]);
  const [loadingLoans, setLoadingLoans] = useState(false);
  
  // Guarantors state
  const [loanFormTab, setLoanFormTab] = useState("details"); // "details" or "guarantors"
  const [guarantors, setGuarantors] = useState([]);

  // Live loan preview
  const loanPreview = (() => {
    const principal = parseFloat(loanData.amount);
    const rate = parseFloat(loanData.interest_rate) / 100;
    const period = parseInt(loanData.repayment_period);
    if (!principal || principal <= 0 || !period || !rate) return null;
    const processingFee = principal * 0.005;
    const principalWithFee = principal + processingFee;
    const monthlyPayment =
      (principalWithFee * rate * Math.pow(1 + rate, period)) /
      (Math.pow(1 + rate, period) - 1);
    const totalRepayment = monthlyPayment * period;
    return {
      processingFee,
      principalWithFee,
      monthlyPayment,
      totalRepayment,
      totalInterest: totalRepayment - principalWithFee,
    };
  })();

  useEffect(() => {
    if (member) {
      setMemberData({
        full_name: member.full_name || "",
        id_number: member.id_number || "",
        email: member.email || "",
        phone: member.phone || "",
        sacco_number: member.sacco_number || "",
        role: member.role || "MEMBER",
      });
      loadExistingLoans();
    }
  }, [member]);

  const loadExistingLoans = async () => {
    setLoadingLoans(true);
    try {
      const res = await API.get("/loans");
      const all = res.data.loans || res.data;
      setExistingLoans(
        all.filter((l) => l.userId === member.id || l.memberId === member.id)
      );
    } catch (err) {
      console.error("Could not load loans", err);
    } finally {
      setLoadingLoans(false);
    }
  };

  const handleSaveMember = async () => {
    if (!memberData.full_name || !memberData.email) {
      alert("Full name and email are required.");
      return;
    }
    setLoading(true);
    try {
      await API.put(`/admin/members/${member.id}`, memberData);
      alert("Member details saved!");
      onSuccess();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update member");
    } finally {
      setLoading(false);
    }
  };

  // Guarantor management functions
  const addGuarantor = () => {
    setGuarantors([...guarantors, { 
      name: "", 
      phone: "", 
      email: "", 
      id_number: "" 
    }]);
  };

  const removeGuarantor = (index) => {
    setGuarantors(guarantors.filter((_, i) => i !== index));
  };

  const updateGuarantor = (index, field, value) => {
    const updated = [...guarantors];
    updated[index] = { ...updated[index], [field]: value };
    setGuarantors(updated);
  };

  const handleAddLoan = async () => {
    if (!loanData.amount || parseFloat(loanData.amount) <= 0) {
      alert("Please enter a valid loan amount.");
      return;
    }
    if (!loanData.created_at) {
      alert("Please enter the date the loan was taken.");
      return;
    }
    setLoanLoading(true);
    try {
      // Create the loan first
      const loanRes = await API.post(`/admin/loans`, {
        userId: member.id,
        memberId: member.id,
        amount: parseFloat(loanData.amount),
        interest_rate: parseFloat(loanData.interest_rate),
        repayment_period: parseInt(loanData.repayment_period),
        loan_purpose: loanData.loan_purpose,
        status: loanData.status,
        created_at: loanData.created_at,
      });
      
      const newLoanId = loanRes.data.loan.id;
      
      // Add guarantors if any
      if (guarantors.length > 0) {
        for (const g of guarantors) {
          if (g.name) { // Only add guarantors with a name
            try {
              await API.post(`/admin/loans/${newLoanId}/guarantors`, g);
            } catch (err) {
              console.error("Error adding guarantor:", err);
            }
          }
        }
      }
      
      alert("Loan added successfully!");
      setLoanData({
        amount: "",
        interest_rate: "1.045",
        repayment_period: "12",
        loan_purpose: "",
        status: "APPROVED",
        created_at: new Date().toISOString().split("T")[0],
      });
      setGuarantors([]);
      setShowLoanForm(false);
      setLoanFormTab("details");
      loadExistingLoans();
      onSuccess();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to add loan");
    } finally {
      setLoanLoading(false);
    }
  };

  const inputClass =
    "w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none bg-white";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-red-700 text-white px-6 py-5 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold">Edit Member</h2>
            <p className="text-red-200 text-sm mt-0.5">
              {member?.sacco_number} · {member?.full_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-red-200 text-2xl font-bold w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">

          {/* ────────────────────────────────────────
              SECTION 1: Member Details
          ──────────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-7 h-7 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <h3 className="font-bold text-gray-800">Member Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                <input type="text" className={inputClass} value={memberData.full_name}
                  onChange={e => setMemberData({ ...memberData, full_name: e.target.value })}
                  placeholder="e.g. John Doe" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">ID / Passport Number</label>
                <input type="text" className={inputClass} value={memberData.id_number}
                  onChange={e => setMemberData({ ...memberData, id_number: e.target.value })}
                  placeholder="e.g. 12345678" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address <span className="text-red-500">*</span></label>
                <input type="email" className={inputClass} value={memberData.email}
                  onChange={e => setMemberData({ ...memberData, email: e.target.value })}
                  placeholder="e.g. john@example.com" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
                <input type="tel" className={inputClass} value={memberData.phone}
                  onChange={e => setMemberData({ ...memberData, phone: e.target.value })}
                  placeholder="e.g. 0712345678" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">SACCO Number</label>
                <input type="text" className={inputClass} value={memberData.sacco_number}
                  onChange={e => setMemberData({ ...memberData, sacco_number: e.target.value })}
                  placeholder="e.g. AIC-001" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Role</label>
                <select className={inputClass} value={memberData.role}
                  onChange={e => setMemberData({ ...memberData, role: e.target.value })}>
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={onClose}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleSaveMember} disabled={loading}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${
                  loading ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-red-700 text-white hover:bg-red-800"
                }`}>
                {loading ? "Saving..." : "Save Member Details"}
              </button>
            </div>
          </section>

          {/* Divider */}
          <div className="relative">
            <hr className="border-gray-200" />
            <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-white px-3 text-xs text-gray-400 font-medium">
              LOAN MANAGEMENT
            </span>
          </div>

          {/* ────────────────────────────────────────
              SECTION 2: Loans
          ──────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <h3 className="font-bold text-gray-800">
                  Loans
                  {existingLoans.length > 0 && (
                    <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-normal">
                      {existingLoans.length} existing
                    </span>
                  )}
                </h3>
              </div>
              <button
                onClick={() => setShowLoanForm(!showLoanForm)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
                  showLoanForm
                    ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}>
                {showLoanForm ? "✕ Cancel" : "＋ Add Loan"}
              </button>
            </div>

            {/* Existing loans list */}
            {loadingLoans ? (
              <p className="text-sm text-gray-400 py-2">Loading loans...</p>
            ) : existingLoans.length > 0 ? (
              <div className="space-y-2 mb-4">
                {existingLoans.map((loan, idx) => (
                  <div key={loan.id || idx}
                    className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                    <div>
                      <span className="text-sm font-bold text-gray-900">
                        KES {parseFloat(loan.initial_amount || loan.amount || 0).toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {loan.repayment_period || loan.repaymentPeriod} mo ·{" "}
                        {loan.interest_rate || loan.interestRate}%/mo
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {loan.createdAt
                          ? new Date(loan.createdAt).toLocaleDateString("en-KE")
                          : "—"}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        loan.status === "APPROVED" ? "bg-green-100 text-green-800" :
                        loan.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {loan.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : !showLoanForm ? (
              <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg py-6 text-center mb-4">
                <p className="text-sm text-gray-400">No loans recorded for this member.</p>
                <p className="text-xs text-gray-400 mt-1">Click "Add Loan" to enter a historical or new loan.</p>
              </div>
            ) : null}

            {/* ── Add Loan Form ── */}
            {showLoanForm && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📋</span>
                    <h4 className="font-bold text-blue-900">New Loan Entry</h4>
                    <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                      Backdating supported
                    </span>
                  </div>
                  
                  {/* Tab buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLoanFormTab("details")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        loanFormTab === "details"
                          ? "bg-blue-600 text-white"
                          : "bg-white text-blue-700 hover:bg-blue-100"
                      }`}>
                      Loan Details
                    </button>
                    <button
                      onClick={() => setLoanFormTab("guarantors")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        loanFormTab === "guarantors"
                          ? "bg-blue-600 text-white"
                          : "bg-white text-blue-700 hover:bg-blue-100"
                      }`}>
                      Guarantors ({guarantors.length})
                    </button>
                  </div>
                </div>

                {/* LOAN DETAILS TAB */}
                {loanFormTab === "details" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Loan Amount */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Loan Amount (KES) <span className="text-red-500">*</span>
                    </label>
                    <input type="number" min="0" step="500"
                      className={inputClass}
                      value={loanData.amount}
                      onChange={e => setLoanData({ ...loanData, amount: e.target.value })}
                      placeholder="e.g. 50000" />
                  </div>

                  {/* Date Loan Was Taken — highlighted */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      📅 Date Loan Was Taken <span className="text-red-500">*</span>
                    </label>
                    <input type="date"
                      className="w-full border-2 border-blue-400 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white font-semibold text-blue-900"
                      value={loanData.created_at}
                      onChange={e => setLoanData({ ...loanData, created_at: e.target.value })}
                      max={new Date().toISOString().split("T")[0]} />
                    <p className="text-xs text-blue-600 mt-1 font-medium">
                      ← Enter the actual date the loan was issued (can be past date)
                    </p>
                  </div>

                  {/* Interest Rate */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Interest Rate (% monthly)
                    </label>
                    <input type="number" min="0" step="0.001"
                      className={inputClass}
                      value={loanData.interest_rate}
                      onChange={e => setLoanData({ ...loanData, interest_rate: e.target.value })}
                      placeholder="1.045" />
                  </div>

                  {/* Repayment Period */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Repayment Period
                    </label>
                    <select className={inputClass} value={loanData.repayment_period}
                      onChange={e => setLoanData({ ...loanData, repayment_period: e.target.value })}>
                      {[3, 6, 9, 12, 18, 24, 36, 48, 60].map(n => (
                        <option key={n} value={n}>{n} months</option>
                      ))}
                    </select>
                  </div>

                  {/* Loan Purpose */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Loan Purpose
                    </label>
                    <input type="text" className={inputClass}
                      value={loanData.loan_purpose}
                      onChange={e => setLoanData({ ...loanData, loan_purpose: e.target.value })}
                      placeholder="e.g. School fees, Business, Medical..." />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Loan Status
                    </label>
                    <select className={inputClass} value={loanData.status}
                      onChange={e => setLoanData({ ...loanData, status: e.target.value })}>
                      <option value="APPROVED">Approved (Already disbursed)</option>
                      <option value="PENDING">Pending (Awaiting approval)</option>
                    </select>
                  </div>
                </div>

                {/* Live Preview */}
                {loanPreview && (
                  <div className="bg-white border border-blue-200 rounded-lg p-4">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">
                      Loan Breakdown Preview
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Processing Fee (0.5%)</p>
                        <p className="text-sm font-bold text-orange-600">
                          KES {loanPreview.processingFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Principal + Fee</p>
                        <p className="text-sm font-bold text-blue-700">
                          KES {loanPreview.principalWithFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Monthly Payment</p>
                        <p className="text-sm font-bold text-green-700">
                          KES {loanPreview.monthlyPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Total Repayment</p>
                        <p className="text-sm font-bold text-red-700">
                          KES {loanPreview.totalRepayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-center text-gray-400 mt-3 border-t pt-3">
                      Loan dated:{" "}
                      <strong className="text-blue-700">
                        {new Date(loanData.created_at + "T00:00:00").toLocaleDateString("en-KE", {
                          year: "numeric", month: "long", day: "numeric",
                        })}
                      </strong>
                    </p>
                  </div>
                )}
                  </>
                )}

                {/* GUARANTORS TAB */}
                {loanFormTab === "guarantors" && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-sm text-blue-800">
                        Add guarantors for this loan (optional but recommended)
                      </p>
                      <button
                        onClick={addGuarantor}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition">
                        + Add Guarantor
                      </button>
                    </div>

                    {guarantors.length === 0 && (
                      <div className="bg-white border-2 border-dashed border-blue-300 rounded-lg py-8 text-center">
                        <p className="text-sm text-gray-500 mb-2">No guarantors added yet</p>
                        <button
                          onClick={addGuarantor}
                          className="text-blue-600 hover:text-blue-800 text-sm font-semibold">
                          + Add First Guarantor
                        </button>
                      </div>
                    )}

                    {guarantors.map((g, index) => (
                      <div key={index} className="bg-white border border-blue-200 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="font-semibold text-gray-800 text-sm">
                            Guarantor {index + 1}
                          </h5>
                          <button
                            onClick={() => removeGuarantor(index)}
                            className="text-red-600 hover:text-red-800 text-xs font-semibold">
                            Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                              Full Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={g.name || ""}
                              onChange={(e) => updateGuarantor(index, "name", e.target.value)}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="Full name"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                              ID Number
                            </label>
                            <input
                              type="text"
                              value={g.id_number || ""}
                              onChange={(e) => updateGuarantor(index, "id_number", e.target.value)}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="National ID"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                              Phone
                            </label>
                            <input
                              type="tel"
                              value={g.phone || ""}
                              onChange={(e) => updateGuarantor(index, "phone", e.target.value)}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="0712345678"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                              Email
                            </label>
                            <input
                              type="email"
                              value={g.email || ""}
                              onChange={(e) => updateGuarantor(index, "email", e.target.value)}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="email@example.com"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Submit */}
                <button onClick={handleAddLoan} disabled={loanLoading}
                  className={`w-full py-3 rounded-lg font-bold text-sm transition flex items-center justify-center gap-2 ${
                    loanLoading
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                  }`}>
                  {loanLoading ? (
                    "Adding Loan..."
                  ) : (
                    <>
                      <span>✓</span>
                      <span>
                        Add Loan{guarantors.length > 0 ? ` with ${guarantors.length} Guarantor${guarantors.length > 1 ? 's' : ''}` : ''} — KES {parseFloat(loanData.amount || 0).toLocaleString()} ·{" "}
                        {new Date(loanData.created_at + "T00:00:00").toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
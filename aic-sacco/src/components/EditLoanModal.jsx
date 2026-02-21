import React, { useState, useEffect } from "react";
import API from "../api";

const emptyGuarantor = { name: "", phone: "", email: "", id_number: "" };

export default function EditLoanModal({ loan, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState("loan");
  const [formData, setFormData] = useState({
    amount: "",
    interest_rate: "1.8",
    repayment_period: "",
    loan_purpose: "",
    created_at: "",
    status: "APPROVED"
  });
  const [guarantors, setGuarantors] = useState([]);
  const [loadingGuarantors, setLoadingGuarantors] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (loan) {
      const createdDate = loan.createdAt
        ? new Date(loan.createdAt).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];

      setFormData({
        amount: loan.amount || loan.initialAmount || "",
        interest_rate: loan.interestRate || "1.8",
        repayment_period: loan.repaymentPeriod || "",
        loan_purpose: loan.loanPurpose || "",
        created_at: createdDate,
        status: loan.status || "APPROVED"
      });

      loadGuarantors();
    }
  }, [loan]);

  const loadGuarantors = async () => {
    setLoadingGuarantors(true);
    try {
      const res = await API.get(`/admin/loans/${loan.id}/guarantors`);
      setGuarantors(res.data.guarantors || []);
    } catch (err) {
      setGuarantors([]);
    } finally {
      setLoadingGuarantors(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.put(`/admin/loans/${loan.id}`, {
        amount: parseFloat(formData.amount),
        interest_rate: parseFloat(formData.interest_rate),
        repayment_period: parseInt(formData.repayment_period),
        loan_purpose: formData.loan_purpose,
        created_at: formData.created_at,
        status: formData.status
      });
      alert("Loan updated successfully!");
      onSuccess();
      onClose();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update loan");
    } finally {
      setLoading(false);
    }
  };

  const addGuarantor = () => {
    setGuarantors([...guarantors, { ...emptyGuarantor, isNew: true }]);
  };

  const removeGuarantor = async (index) => {
    const g = guarantors[index];
    if (g.id) {
      if (!window.confirm("Remove this guarantor?")) return;
      try {
        await API.delete(`/admin/loans/${loan.id}/guarantors/${g.id}`);
      } catch (err) {
        alert("Failed to remove guarantor");
        return;
      }
    }
    setGuarantors(guarantors.filter((_, i) => i !== index));
  };

  const updateGuarantor = (index, field, value) => {
    const updated = [...guarantors];
    updated[index] = { ...updated[index], [field]: value };
    setGuarantors(updated);
  };

  const saveGuarantor = async (index) => {
    const g = guarantors[index];
    if (!g.name) { alert("Guarantor name is required"); return; }

    try {
      if (g.id) {
        await API.put(`/admin/loans/${loan.id}/guarantors/${g.id}`, g);
      } else {
        const res = await API.post(`/admin/loans/${loan.id}/guarantors`, g);
        const updated = [...guarantors];
        updated[index] = { ...res.data.guarantor, isNew: false };
        setGuarantors(updated);
      }
      alert("Guarantor saved!");
      loadGuarantors();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save guarantor");
    }
  };

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
    return { processingFee, principalWithFee, totalInterest, totalPayable, monthlyPayment, annualRate: (rate * 12).toFixed(2) };
  };

  const preview = calculatePreview();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">

        {/* Header */}
        <div className="bg-blue-700 text-white p-6 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Edit Loan</h2>
              {loan && (
                <p className="text-blue-100 text-sm mt-1">
                  {loan.memberName} &bull; {loan.saccoNumber} &bull; Loan #{loan.id}
                </p>
              )}
            </div>
            <button onClick={onClose} className="text-white hover:text-blue-200 text-3xl font-bold leading-none">×</button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab("loan")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                activeTab === "loan" ? "bg-white text-blue-700" : "bg-blue-600 text-white hover:bg-blue-500"
              }`}
            >
              Loan Details
            </button>
            <button
              onClick={() => setActiveTab("guarantors")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                activeTab === "guarantors" ? "bg-white text-blue-700" : "bg-blue-600 text-white hover:bg-blue-500"
              }`}
            >
              Guarantors ({guarantors.length})
            </button>
          </div>
        </div>

        {/* LOAN DETAILS TAB */}
        {activeTab === "loan" && (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Loan Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Loan Amount (KES) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number" step="0.01" min="0" required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
                    placeholder="50000.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Monthly Interest Rate (%) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number" step="0.001" min="0" required
                    value={formData.interest_rate}
                    onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
                    placeholder="1.8"
                  />
                  <p className="text-xs text-gray-500 mt-1">Annual: {preview ? preview.annualRate : "0.00"}%</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Repayment Period (months) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number" min="1" required
                    value={formData.repayment_period}
                    onChange={(e) => setFormData({ ...formData, repayment_period: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
                    placeholder="12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Loan Status <span className="text-red-600">*</span>
                  </label>
                  <select
                    required value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="PAID">Paid</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Loan Purpose</label>
                  <input
                    type="text" value={formData.loan_purpose}
                    onChange={(e) => setFormData({ ...formData, loan_purpose: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
                    placeholder="Business expansion, Emergency, etc."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Loan Date (When loan was taken) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date" required value={formData.created_at}
                    onChange={(e) => setFormData({ ...formData, created_at: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">⚠️ Set to the actual date the loan was originally taken</p>
                </div>
              </div>
            </div>

            {/* Preview */}
            {preview && (
              <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                <h3 className="text-lg font-bold text-green-900 mb-4">Loan Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: "Processing Fee (0.5%)", val: preview.processingFee },
                    { label: "Principal + Fee", val: preview.principalWithFee },
                    { label: "Total Interest", val: preview.totalInterest },
                    { label: "Total Repayment", val: preview.totalPayable },
                    { label: "Monthly Payment", val: preview.monthlyPayment },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <p className="text-xs text-green-700 mb-1">{label}</p>
                      <p className="text-lg font-bold text-green-900">
                        KES {val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  ))}
                  <div>
                    <p className="text-xs text-green-700 mb-1">Interest Rate</p>
                    <p className="text-sm font-bold text-green-900">
                      {formData.interest_rate}% / month<br />
                      <span className="text-xs">({preview.annualRate}% p.a.)</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-4 border-t">
              <button type="button" onClick={onClose}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className={`px-6 py-3 rounded-lg font-semibold transition ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-700 hover:bg-blue-800 text-white"}`}>
                {loading ? "Updating..." : "Update Loan"}
              </button>
            </div>
          </form>
        )}

        {/* GUARANTORS TAB */}
        {activeTab === "guarantors" && (
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Guarantors</h3>
                <p className="text-sm text-gray-500">Add any number of guarantors for this loan</p>
              </div>
              <button
                onClick={addGuarantor}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-semibold flex items-center gap-2"
              >
                + Add Guarantor
              </button>
            </div>

            {loadingGuarantors && (
              <div className="text-center py-8 text-gray-500">Loading guarantors...</div>
            )}

            {!loadingGuarantors && guarantors.length === 0 && (
              <div className="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500 mb-2">No guarantors added yet</p>
                <button onClick={addGuarantor}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm font-semibold">
                  + Add First Guarantor
                </button>
              </div>
            )}

            {guarantors.map((g, index) => (
              <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-gray-800">
                    Guarantor {index + 1}
                    {g.id && <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Saved</span>}
                    {!g.id && <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">New</span>}
                  </h4>
                  <button
                    onClick={() => removeGuarantor(index)}
                    className="text-red-600 hover:text-red-800 text-sm font-semibold"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name <span className="text-red-500">*</span></label>
                    <input
                      type="text" value={g.name || ""}
                      onChange={(e) => updateGuarantor(index, "name", e.target.value)}
                      className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">ID Number</label>
                    <input
                      type="text" value={g.id_number || ""}
                      onChange={(e) => updateGuarantor(index, "id_number", e.target.value)}
                      className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="National ID"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
                    <input
                      type="tel" value={g.phone || ""}
                      onChange={(e) => updateGuarantor(index, "phone", e.target.value)}
                      className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="0712345678"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                    <input
                      type="email" value={g.email || ""}
                      onChange={(e) => updateGuarantor(index, "email", e.target.value)}
                      className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => saveGuarantor(index)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
                  >
                    {g.id ? "Update" : "Save"} Guarantor
                  </button>
                </div>
              </div>
            ))}

            <div className="flex justify-end pt-4 border-t">
              <button onClick={onClose}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
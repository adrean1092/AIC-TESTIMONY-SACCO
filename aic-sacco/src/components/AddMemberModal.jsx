import React, { useState } from "react";
import API from "../api";
import { getCounties, getSubCounties } from "../../../backend/routes/kenyan-locations";

export default function AddMemberModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState("single"); // "single" or "bulk"
  
  // Single member state
  const [formData, setFormData] = useState({
    full_name: "",
    id_number: "",
    email: "",
    phone: "",
    password: "",
    role: "MEMBER",
    sacco_number: "",
    initial_savings: ""
  });

  const [hasExistingLoan, setHasExistingLoan] = useState(false);
  const [existingLoan, setExistingLoan] = useState({
    amount: "",
    interest_rate: "1.045",
    repayment_period: "",
    loan_purpose: "",
    created_at: new Date().toISOString().split('T')[0],
    status: "APPROVED"
  });

  // Bulk upload state
  const [bulkFile, setBulkFile] = useState(null);
  const [uploadedMembers, setUploadedMembers] = useState([]);
  const [editingEmailIndex, setEditingEmailIndex] = useState(null);

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const counties = getCounties();
  const subCounties = formData.county ? getSubCounties(formData.county) : [];

  // Handle file upload (Excel or CSV)
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setBulkFile(file);
    setLoading(true);

    try {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        const data = event.target.result;
        
        if (file.name.endsWith('.csv')) {
          parseCSV(data);
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          await parseExcel(data);
        } else {
          alert("Please upload a CSV or Excel file");
          setBulkFile(null);
        }
        setLoading(false);
      };

      if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    } catch (error) {
      console.error("Error reading file:", error);
      alert("Failed to read file");
      setLoading(false);
    }
  };

  // Parse CSV file
  const parseCSV = (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const members = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      const member = {
        full_name: values[headers.indexOf('full_name')] || values[headers.indexOf('name')] || "",
        id_number: values[headers.indexOf('id_number')] || values[headers.indexOf('id')] || "",
        phone: values[headers.indexOf('phone')] || values[headers.indexOf('phone_number')] || "",
        email: "", // Will be added manually
        password: `Pass${Math.random().toString(36).slice(-8)}`, // Auto-generate
        role: "MEMBER",
        sacco_number: values[headers.indexOf('sacco_number')] || "",
        initial_savings: values[headers.indexOf('initial_savings')] || values[headers.indexOf('savings')] || "0"
      };
      
      if (member.full_name && member.id_number) {
        members.push(member);
      }
    }
    
    setUploadedMembers(members);
  };

  // Parse Excel file
  const parseExcel = async (arrayBuffer) => {
    try {
      // Use SheetJS (xlsx) library - you'll need to install it: npm install xlsx
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      const members = jsonData.map(row => ({
        full_name: row.full_name || row.name || row.Full_Name || row.Name || "",
        id_number: row.id_number || row.id || row.ID_Number || row.ID || "",
        phone: row.phone || row.phone_number || row.Phone || row.Phone_Number || "",
        email: "", // Will be added manually
        password: `Pass${Math.random().toString(36).slice(-8)}`, // Auto-generate
        role: "MEMBER",
        sacco_number: row.sacco_number || row.SACCO_Number || "",
        initial_savings: row.initial_savings || row.savings || row.Initial_Savings || "0"
      })).filter(m => m.full_name && m.id_number);
      
      setUploadedMembers(members);
    } catch (error) {
      console.error("Error parsing Excel:", error);
      alert("Failed to parse Excel file. Make sure xlsx library is installed.");
    }
  };

  // Update email for a member
  const updateMemberEmail = (index, email) => {
    const updated = [...uploadedMembers];
    updated[index].email = email;
    setUploadedMembers(updated);
  };

  // Download CSV template
  const downloadTemplate = () => {
    const template = `full_name,id_number,phone,sacco_number,initial_savings
John Doe,12345678,0712345678,SACCO-0001,10000
Jane Smith,87654321,0723456789,SACCO-0002,15000`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'member_upload_template.csv';
    a.click();
  };

  // Submit single member
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        full_name: formData.full_name,
        id_number: formData.id_number,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role,
        sacco_number: formData.sacco_number || undefined,
        initial_savings: formData.initial_savings ? parseFloat(formData.initial_savings) : undefined,
        existing_loan: hasExistingLoan && existingLoan.amount ? {
          amount: parseFloat(existingLoan.amount),
          interest_rate: parseFloat(existingLoan.interest_rate),
          repayment_period: parseInt(existingLoan.repayment_period),
          loan_purpose: existingLoan.loan_purpose,
          created_at: existingLoan.created_at,
          status: existingLoan.status
        } : undefined
      };

      await API.post("/admin/members", payload);
      alert("Member added successfully!");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error adding member:", error);
      alert(error.response?.data?.message || "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  // Submit bulk members
  const handleBulkSubmit = async () => {
    // Validate all members have emails
    const missingEmails = uploadedMembers.filter(m => !m.email);
    if (missingEmails.length > 0) {
      alert(`Please add email addresses for all ${missingEmails.length} member(s)`);
      return;
    }

    setLoading(true);
    let successCount = 0;
    let failCount = 0;
    const errors = [];

    for (const member of uploadedMembers) {
      try {
        await API.post("/admin/members", {
          full_name: member.full_name,
          id_number: member.id_number,
          email: member.email,
          phone: member.phone,
          password: member.password,
          role: member.role,
          sacco_number: member.sacco_number || undefined,
          initial_savings: member.initial_savings ? parseFloat(member.initial_savings) : undefined
        });
        successCount++;
      } catch (error) {
        failCount++;
        errors.push(`${member.full_name}: ${error.response?.data?.message || error.message}`);
      }
    }

    setLoading(false);
    
    if (failCount === 0) {
      alert(`✅ Successfully added all ${successCount} members!`);
      onSuccess();
      onClose();
    } else {
      alert(`✅ Added ${successCount} members\n❌ Failed ${failCount} members\n\nErrors:\n${errors.join('\n')}`);
      if (successCount > 0) {
        onSuccess();
      }
    }
  };

  // Calculate loan preview (for single mode)
  const calculateLoanPreview = () => {
    if (!hasExistingLoan || !existingLoan.amount) return null;

    const amount = parseFloat(existingLoan.amount) || 0;
    const rate = parseFloat(existingLoan.interest_rate) || 0;
    const period = parseInt(existingLoan.repayment_period) || 0;

    if (!amount || !rate || !period) return null;

    const processingFee = amount * 0.005;
    const principalWithFee = amount + processingFee;
    const monthlyRate = rate / 100;
    const totalInterest = principalWithFee * monthlyRate * period;
    const totalPayable = principalWithFee + totalInterest;
    const monthlyPayment = totalPayable / period;

    return {
      processingFee,
      principalWithFee,
      totalInterest,
      totalPayable,
      monthlyPayment,
      annualRate: (rate * 12).toFixed(2)
    };
  };

  const loanPreview = calculateLoanPreview();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-red-700 text-white p-6 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Add Members</h2>
              <p className="text-red-100 text-sm mt-1">
                Add members individually or bulk upload from Excel/CSV
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-red-200 text-3xl font-bold leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Mode Selection */}
          <div className="flex gap-4 border-b pb-4">
            <button
              onClick={() => setMode("single")}
              className={`px-6 py-3 rounded-lg font-semibold transition ${
                mode === "single"
                  ? "bg-red-700 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Single Member
            </button>
            <button
              onClick={() => setMode("bulk")}
              className={`px-6 py-3 rounded-lg font-semibold transition ${
                mode === "bulk"
                  ? "bg-red-700 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Bulk Upload
            </button>
          </div>

          {/* SINGLE MEMBER MODE */}
          {mode === "single" && (
            <form onSubmit={handleSingleSubmit} className="space-y-6">
              {/* Role Selection */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Account Type <span className="text-red-600">*</span>
                </label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              {/* Personal Information */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Full Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ID/Passport Number <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.id_number}
                      onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="12345678"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="john@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone Number <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="0712345678"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Password <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg p-3 pr-10 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="••••••••"
                        minLength="6"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? "👁️" : "👁️‍🗨️"}
                      </button>
                    </div>
                  </div>

                  {formData.role === "MEMBER" && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        SACCO Number (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.sacco_number}
                        onChange={(e) => setFormData({ ...formData, sacco_number: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="e.g., SACCO-0123"
                      />
                      <p className="text-xs text-gray-600 mt-1">Leave blank to auto-generate</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Initial Savings */}
              {formData.role === "MEMBER" && (
                <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                  <h3 className="text-lg font-bold text-green-900 mb-4">Initial Savings (Optional)</h3>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Initial Savings Amount (KES)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.initial_savings}
                      onChange={(e) => setFormData({ ...formData, initial_savings: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="10000.00"
                    />
                    <p className="text-xs text-gray-600 mt-2">
                      💡 Loan limit will be 3x savings
                    </p>
                    {formData.initial_savings && parseFloat(formData.initial_savings) > 0 && (
                      <div className="mt-3 p-3 bg-white rounded border border-green-300">
                        <p className="text-sm font-semibold text-green-900">
                          Loan Limit: KES {(parseFloat(formData.initial_savings) * 3).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end space-x-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-6 py-3 rounded-lg font-semibold transition ${
                    loading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-red-700 hover:bg-red-800 text-white"
                  }`}
                >
                  {loading ? "Adding..." : "Add Member"}
                </button>
              </div>
            </form>
          )}

          {/* BULK UPLOAD MODE */}
          {mode === "bulk" && (
            <div className="space-y-6">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-blue-900 mb-3">📋 Bulk Upload Instructions</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                  <li>Download the CSV template and fill in member details</li>
                  <li>Upload the completed CSV or Excel file</li>
                  <li>Review the uploaded members and manually add email addresses</li>
                  <li>Click "Add All Members" to complete the upload</li>
                </ol>
                <button
                  onClick={downloadTemplate}
                  className="mt-4 bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition text-sm font-semibold"
                >
                  📥 Download CSV Template
                </button>
              </div>

              {/* File Upload */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Upload File</h3>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Accepted formats: CSV, Excel (.xlsx, .xls)
                </p>
              </div>

              {/* Uploaded Members Table */}
              {uploadedMembers.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Uploaded Members ({uploadedMembers.length})
                    </h3>
                    <span className="text-sm text-gray-600">
                      {uploadedMembers.filter(m => m.email).length} of {uploadedMembers.length} have emails
                    </span>
                  </div>

                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">#</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Full Name</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">ID Number</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Phone</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">SACCO Number</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Savings</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Email <span className="text-red-600">*</span></th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Password</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {uploadedMembers.map((member, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{member.full_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{member.id_number}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{member.phone}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{member.sacco_number || "Auto"}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {parseFloat(member.initial_savings || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="email"
                                value={member.email}
                                onChange={(e) => updateMemberEmail(index, e.target.value)}
                                placeholder="email@example.com"
                                className={`w-full border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-red-500 ${
                                  member.email
                                    ? "border-green-300 bg-green-50"
                                    : "border-red-300 bg-red-50"
                                }`}
                              />
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600 font-mono">{member.password}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Submit Bulk */}
              {uploadedMembers.length > 0 && (
                <div className="flex justify-end space-x-4 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedMembers([]);
                      setBulkFile(null);
                    }}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleBulkSubmit}
                    disabled={loading || uploadedMembers.some(m => !m.email)}
                    className={`px-6 py-3 rounded-lg font-semibold transition ${
                      loading || uploadedMembers.some(m => !m.email)
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-red-700 hover:bg-red-800 text-white"
                    }`}
                  >
                    {loading ? "Adding Members..." : `Add All ${uploadedMembers.length} Members`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
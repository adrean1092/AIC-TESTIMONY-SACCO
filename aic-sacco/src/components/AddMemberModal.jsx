import React, { useState } from "react";
import API from "../api";
import * as XLSX from 'xlsx';

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

  // Bulk upload state
  const [uploadedMembers, setUploadedMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  // Handle Excel/CSV file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setUploadStatus("Reading file...");

    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const data = event.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        console.log("Raw Excel data:", jsonData.slice(0, 5));
        
        // Find the header row (row with "NAME")
        let headerRowIndex = -1;
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row.some(cell => String(cell).toUpperCase().includes('NAME'))) {
            headerRowIndex = i;
            break;
          }
        }
        
        if (headerRowIndex === -1) {
          alert("Could not find header row with column names");
          setLoading(false);
          return;
        }
        
        const headers = jsonData[headerRowIndex].map(h => String(h || '').trim());
        console.log("Headers found:", headers);
        
        // Find column indices
        const nameIdx = headers.findIndex(h => h.toUpperCase().includes('NAME') && !h.toUpperCase().includes('NO'));
        const idIdx = headers.findIndex(h => h.toUpperCase().includes('ID'));
        const phoneIdx = headers.findIndex(h => h.toUpperCase().includes('MOBILE') || h.toUpperCase().includes('PHONE'));
        const saccoIdx = headers.findIndex(h => h.toUpperCase().includes('M.') || (h.toUpperCase().includes('NO') && h.toUpperCase().includes('.')));
        const savingsIdx = headers.findIndex(h => h.toUpperCase().includes('SAVINGS'));
        const emailIdx = headers.findIndex(h => h.toUpperCase().includes('EMAIL'));
        
        console.log("Column indices:", { nameIdx, idIdx, phoneIdx, saccoIdx, savingsIdx, emailIdx });
        
        // Process data rows
        const members = [];
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;
          
          const name = row[nameIdx] ? String(row[nameIdx]).trim() : '';
          const idNumber = row[idIdx] ? String(row[idIdx]).trim() : '';
          
          // Skip empty rows or header repetitions
          if (!name || !idNumber || name.toUpperCase() === 'NAME') continue;
          
          const saccoNumber = row[saccoIdx] ? String(row[saccoIdx]).trim() : '';
          
          const member = {
            full_name: name,
            id_number: idNumber,
            phone: row[phoneIdx] ? String(row[phoneIdx]).trim() : '',
            email: row[emailIdx] ? String(row[emailIdx]).trim() : '',
            password: saccoNumber || `temp${Math.random().toString(36).slice(-6)}`,
            role: "MEMBER",
            sacco_number: saccoNumber,
            initial_savings: row[savingsIdx] ? String(row[savingsIdx]).trim() : '0'
          };
          
          members.push(member);
        }
        
        console.log(`Processed ${members.length} members`);
        console.log("First member:", members[0]);
        
        setUploadedMembers(members);
        setUploadStatus(`✅ Loaded ${members.length} members`);
        setLoading(false);
      } catch (error) {
        console.error("Error parsing file:", error);
        alert("Error parsing file: " + error.message);
        setLoading(false);
        setUploadStatus("");
      }
    };
    
    reader.onerror = () => {
      alert("Error reading file");
      setLoading(false);
      setUploadStatus("");
    };
    
    reader.readAsBinaryString(file);
  };

  // Update member field
  const updateMember = (index, field, value) => {
    const updated = [...uploadedMembers];
    updated[index][field] = value;
    setUploadedMembers(updated);
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
        initial_savings: formData.initial_savings ? parseFloat(formData.initial_savings) : undefined
      };

      await API.post("/admin/members", payload);
      alert("✅ Member added successfully!");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error adding member:", error);
      alert("❌ " + (error.response?.data?.message || "Failed to add member"));
    } finally {
      setLoading(false);
    }
  };

  // Submit bulk upload
  const handleBulkSubmit = async () => {
    // Validate all members have emails
    const missingEmails = uploadedMembers.filter(m => !m.email);
    if (missingEmails.length > 0) {
      alert(`⚠️ ${missingEmails.length} members are missing email addresses. Please add emails for all members.`);
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to add ${uploadedMembers.length} members?\n\n` +
      `This will create member accounts with:\n` +
      `- Passwords set to their SACCO numbers\n` +
      `- Initial savings if provided\n\n` +
      `Click OK to proceed.`
    );
    
    if (!confirmed) return;

    setLoading(true);
    setUploadStatus("Starting bulk upload...");
    
    let successCount = 0;
    let failCount = 0;
    const errors = [];

    for (let i = 0; i < uploadedMembers.length; i++) {
      const member = uploadedMembers[i];
      setUploadStatus(`Adding member ${i + 1} of ${uploadedMembers.length}: ${member.full_name}...`);
      
      try {
        await API.post("/admin/members", {
          full_name: member.full_name,
          id_number: member.id_number,
          email: member.email,
          phone: member.phone,
          password: member.password,
          role: member.role,
          sacco_number: member.sacco_number || undefined,
          initial_savings: member.initial_savings && parseFloat(member.initial_savings) > 0 
            ? parseFloat(member.initial_savings) 
            : undefined
        });
        successCount++;
      } catch (error) {
        failCount++;
        const errorMsg = error.response?.data?.message || error.message;
        errors.push(`${member.full_name} (${member.id_number}): ${errorMsg}`);
        console.error(`Error adding ${member.full_name}:`, error);
      }
    }

    setLoading(false);
    setUploadStatus("");
    
    // Show results
    let resultMessage = `✅ BULK UPLOAD COMPLETE\n\n`;
    resultMessage += `Successfully added: ${successCount} members\n`;
    resultMessage += `Failed: ${failCount} members\n`;
    
    if (errors.length > 0) {
      resultMessage += `\n❌ ERRORS:\n`;
      if (errors.length <= 10) {
        resultMessage += errors.join('\n');
      } else {
        resultMessage += errors.slice(0, 10).join('\n');
        resultMessage += `\n... and ${errors.length - 10} more errors`;
      }
    }
    
    alert(resultMessage);
    
    if (successCount > 0) {
      onSuccess();
      if (failCount === 0) {
        onClose();
      } else {
        // Keep modal open, clear successful uploads
        setUploadedMembers([]);
      }
    }
  };

  // Download template
  const downloadTemplate = () => {
    const template = `SN,NAME,ID NO.,MOBILE NO.,M. NO.,INITIAL SAVINGS,Email address
1,John Doe,12345678,0712345678,1,10000,john@example.com
2,Jane Smith,87654321,0723456789,2,15000,jane@example.com`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'member_template.csv';
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-red-700 text-white p-6 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Add New Member(s)</h2>
              <p className="text-red-100 text-sm mt-1">Add members individually or bulk upload from Excel</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-red-200 text-3xl font-bold leading-none"
            >
              ×
            </button>
          </div>

          {/* Mode Toggle */}
          <div className="flex space-x-4 mt-4">
            <button
              onClick={() => setMode("single")}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                mode === "single"
                  ? "bg-white text-red-700"
                  : "bg-red-600 text-white hover:bg-red-500"
              }`}
            >
              Single Member
            </button>
            <button
              onClick={() => setMode("bulk")}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                mode === "bulk"
                  ? "bg-white text-red-700"
                  : "bg-red-600 text-white hover:bg-red-500"
              }`}
            >
              Bulk Upload
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* SINGLE MEMBER MODE */}
          {mode === "single" && (
            <form onSubmit={handleSingleSubmit} className="space-y-6">
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
                      className="w-full border border-gray-300 rounded-lg p-3"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ID Number <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.id_number}
                      onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-3"
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
                      className="w-full border border-gray-300 rounded-lg p-3"
                      placeholder="john@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-3"
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
                        className="w-full border border-gray-300 rounded-lg p-3 pr-12"
                        placeholder="********"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600"
                      >
                        {showPassword ? "👁️" : "👁️‍🗨️"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      SACCO Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.sacco_number}
                      onChange={(e) => setFormData({ ...formData, sacco_number: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-3"
                      placeholder="Auto-generate if blank"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Initial Savings (KES)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.initial_savings}
                      onChange={(e) => setFormData({ ...formData, initial_savings: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-3"
                      placeholder="10000.00"
                    />
                    {formData.initial_savings && parseFloat(formData.initial_savings) > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        💡 Loan limit: KES {(parseFloat(formData.initial_savings) * 3).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-6 py-3 rounded-lg font-semibold ${
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
                <h3 className="text-lg font-bold text-blue-900 mb-3">📋 How to Bulk Upload</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                  <li>Your Excel file should have these columns: NAME, ID NO., MOBILE NO., M. NO., INITIAL SAVINGS, Email address</li>
                  <li>Upload your Excel file (.xlsx or .xls)</li>
                  <li>Review the members and add/edit emails if needed</li>
                  <li>Each member's password will be their SACCO number (M. NO. column)</li>
                  <li>Click "Add All Members" to complete</li>
                </ol>
                <button
                  onClick={downloadTemplate}
                  className="mt-4 bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 text-sm font-semibold"
                >
                  📥 Download Template
                </button>
              </div>

              {/* File Upload */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Upload Excel File</h3>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={loading}
                  className="w-full border border-gray-300 rounded-lg p-3"
                />
                {uploadStatus && (
                  <p className="text-sm text-blue-600 mt-2">{uploadStatus}</p>
                )}
              </div>

              {/* Uploaded Members Table */}
              {uploadedMembers.length > 0 && (
                <>
                  <div className="bg-white rounded-lg border border-gray-200">
                    <div className="px-6 py-4 bg-gray-50 border-b">
                      <h3 className="text-lg font-semibold text-gray-800">
                        📊 Uploaded Members: {uploadedMembers.length}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {uploadedMembers.filter(m => m.email).length} have emails | 
                        {' '}{uploadedMembers.filter(m => !m.email).length} missing emails
                      </p>
                    </div>

                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">#</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">ID No.</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Phone</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">SACCO No.</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Savings</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Email *</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Password</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {uploadedMembers.map((member, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm">{index + 1}</td>
                              <td className="px-4 py-3 text-sm">{member.full_name}</td>
                              <td className="px-4 py-3 text-sm">{member.id_number}</td>
                              <td className="px-4 py-3 text-sm">{member.phone}</td>
                              <td className="px-4 py-3 text-sm font-mono">{member.sacco_number}</td>
                              <td className="px-4 py-3 text-sm">{parseFloat(member.initial_savings || 0).toLocaleString()}</td>
                              <td className="px-4 py-3">
                                <input
                                  type="email"
                                  value={member.email}
                                  onChange={(e) => updateMember(index, 'email', e.target.value)}
                                  placeholder="email@example.com"
                                  className={`w-full border rounded px-2 py-1 text-sm ${
                                    member.email ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"
                                  }`}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={member.password}
                                  onChange={(e) => updateMember(index, 'password', e.target.value)}
                                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end space-x-4 pt-4 border-t">
                    <button
                      onClick={() => setUploadedMembers([])}
                      className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleBulkSubmit}
                      disabled={loading || uploadedMembers.some(m => !m.email)}
                      className={`px-6 py-3 rounded-lg font-semibold ${
                        loading || uploadedMembers.some(m => !m.email)
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-red-700 hover:bg-red-800 text-white"
                      }`}
                    >
                      {loading ? "Processing..." : `✅ Add All ${uploadedMembers.length} Members`}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
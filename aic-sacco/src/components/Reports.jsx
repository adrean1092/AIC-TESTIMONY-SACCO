import React, { useState, useEffect } from "react";
import API from "../api";

export default function Reports() {
  const [reportType, setReportType] = useState("all");
  const [selectedMember, setSelectedMember] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);

  // Fetch members for dropdown
  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await API.get("/admin/members");
      setMembers(res.data.filter(m => m.role === "MEMBER"));
    } catch (err) {
      console.error("Error fetching members:", err);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      let url = "";
      const params = new URLSearchParams();
      
      if (month) params.append("month", month);
      if (year) params.append("year", year);
      
      const queryString = params.toString();
      
      if (reportType === "all") {
        url = `/admin/reports/all${queryString ? `?${queryString}` : ""}`;
      } else {
        if (!selectedMember) {
          alert("Please select a member");
          setLoading(false);
          return;
        }
        url = `/admin/reports/member/${selectedMember}${queryString ? `?${queryString}` : ""}`;
      }
      
      const res = await API.get(url);
      setReportData(res.data);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `report_${reportType}_${year}${month ? `_${month}` : ""}.json`;
    link.click();
  };

  const downloadPDF = () => {
    const printContent = document.getElementById('report-content');
    const printWindow = window.open('', '', 'height=600,width=800');
    
    printWindow.document.write('<html><head><title>SACCO Report</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
      body { font-family: Arial, sans-serif; padding: 20px; }
      h1, h2, h3 { color: #b91c1c; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #fef2f2; }
      .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
      .summary-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
      .print-only { page-break-after: always; }
      @media print { .no-print { display: none; } }
    `);
    printWindow.document.write('</style></head><body>');
    printWindow.document.write(printContent.innerHTML);
    printWindow.document.write('</body></html>');
    
    printWindow.document.close();
    printWindow.print();
  };

  const downloadCSV = () => {
    if (!reportData) return;
    
    let csvContent = "";
    
    if (reportType === "all") {
      csvContent = "SACCO Number,Name,Total Savings,Loan Limit,Outstanding Loans,Available Loan Limit,Total Loans,Total Approved Amount\n";
      
      reportData.members.forEach(member => {
        const totalApproved = member.totalApprovedAmount || 0;
        csvContent += `${member.saccoNumber},${member.name},${member.totalSavings},${member.loanLimit},${member.outstandingLoans || 0},${member.availableLoanLimit || 0},${member.totalLoans},${totalApproved}\n`;
      });
    } else {
      csvContent = `Member Report - ${reportData.member.name}\n`;
      csvContent += `SACCO Number: ${reportData.member.saccoNumber}\n`;
      csvContent += `Email: ${reportData.member.email}\n`;
      csvContent += `Phone: ${reportData.member.phone}\n`;
      csvContent += `Total Savings: KES ${reportData.member.totalSavings}\n`;
      csvContent += `Loan Limit: KES ${reportData.member.loanLimit}\n`;
      csvContent += `Outstanding Loans: KES ${reportData.member.outstandingLoans || 0}\n`;
      csvContent += `Available Loan Limit: KES ${reportData.member.availableLoanLimit || 0}\n\n`;
      
      csvContent += "Loan ID,Approved Amount,Current Balance,Status,Interest Rate,Created Date\n";
      reportData.loans.forEach(loan => {
        csvContent += `${loan.id},${loan.initialAmount},${loan.amount},${loan.status},${loan.interestRate}%,${new Date(loan.createdAt).toLocaleDateString()}\n`;
      });
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report_${reportType}_${year}${month ? `_${month}` : ""}.csv`;
    link.click();
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Generate Reports</h2>
      
      {/* Report Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-gray-700 mb-2 font-semibold">Report Type</label>
          <select
            value={reportType}
            onChange={(e) => {
              setReportType(e.target.value);
              setReportData(null);
            }}
            className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-red-500"
          >
            <option value="all">All Members Summary</option>
            <option value="individual">Individual Member</option>
          </select>
        </div>
        
        {reportType === "individual" && (
          <div>
            <label className="block text-gray-700 mb-2 font-semibold">Select Member</label>
            <select
              value={selectedMember}
              onChange={(e) => {
                setSelectedMember(e.target.value);
                setReportData(null);
              }}
              className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-red-500"
            >
              <option value="">Choose Member</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.sacco_number})
                </option>
              ))}
            </select>
          </div>
        )}
        
        <div>
          <label className="block text-gray-700 mb-2 font-semibold">Month (Optional)</label>
          <select
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setReportData(null);
            }}
            className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-red-500"
          >
            <option value="">All Months</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2024, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-gray-700 mb-2 font-semibold">Year</label>
          <select
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              setReportData(null);
            }}
            className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-red-500"
          >
            {Array.from({ length: 10 }, (_, i) => {
              const y = new Date().getFullYear() - i;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
        </div>
      </div>
      
      {/* Generate Button */}
      <button
        onClick={generateReport}
        disabled={loading}
        className={`w-full py-3 rounded-lg font-semibold transition ${
          loading 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-red-700 hover:bg-red-800 text-white'
        }`}
      >
        {loading ? "Generating Report..." : "Generate Report"}
      </button>
      
      {/* Report Output */}
      {reportData && (
        <div className="mt-8" id="report-content">
          {/* Download Buttons */}
          <div className="flex gap-2 mb-6 no-print">
            <button
              onClick={downloadCSV}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition font-semibold"
            >
              Download CSV
            </button>
            <button
              onClick={downloadPDF}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition font-semibold"
            >
              Print / PDF
            </button>
            <button
              onClick={downloadReport}
              className="flex-1 bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 transition font-semibold"
            >
              Download JSON
            </button>
          </div>
          
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            {reportType === "all" ? "All Members Report" : "Individual Member Report"}
            {month && ` - ${new Date(2024, month - 1).toLocaleString('default', { month: 'long' })}`}
            {` ${year}`}
          </h3>
          
          {reportType === "all" ? (
            <div>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 summary-grid">
                <div className="bg-blue-50 p-4 rounded-lg summary-card">
                  <p className="text-gray-600 text-sm">Total Members</p>
                  <p className="text-2xl font-bold text-blue-700">{reportData.summary.totalMembers}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg summary-card">
                  <p className="text-gray-600 text-sm">Total Savings</p>
                  <p className="text-2xl font-bold text-green-700">
                    KES {reportData.summary.totalSavings.toLocaleString()}
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg summary-card">
                  <p className="text-gray-600 text-sm">Total Loans</p>
                  <p className="text-2xl font-bold text-red-700">
                    KES {reportData.summary.totalLoans.toLocaleString()}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg summary-card">
                  <p className="text-gray-600 text-sm">Active Loans</p>
                  <p className="text-2xl font-bold text-purple-700">{reportData.summary.activeLoans}</p>
                </div>
              </div>
              
              {/* Members Table - ✅ ADDED APPROVED AMOUNT COLUMN */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Member</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">SACCO No.</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Total Savings</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Loan Limit</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Outstanding</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Available</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Approved Amount</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase"># Loans</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.members.map((m) => {
                      // Calculate total approved amount (sum of initial_amount for all approved loans)
                      const totalApproved = m.totalApprovedAmount || 0;
                      
                      return (
                        <tr key={m.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{m.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{m.saccoNumber}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-green-600 text-right">
                            KES {m.totalSavings.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-blue-600 text-right">
                            KES {m.loanLimit.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-orange-600 text-right">
                            KES {(m.outstandingLoans || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-purple-600 text-right">
                            KES {(m.availableLoanLimit || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-indigo-600 text-right">
                            KES {totalApproved.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-center">{m.totalLoans}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div>
              {/* Individual Member Report */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 className="text-lg font-bold text-gray-800">{reportData.member.name}</h4>
                <p className="text-gray-600">SACCO Number: {reportData.member.saccoNumber}</p>
                <p className="text-gray-600">Email: {reportData.member.email}</p>
                <p className="text-gray-600">Phone: {reportData.member.phone}</p>
              </div>
              
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-green-50 p-4 rounded-lg summary-card">
                  <p className="text-gray-600 text-sm">Total Savings</p>
                  <p className="text-2xl font-bold text-green-700">
                    KES {reportData.member.totalSavings.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">{reportData.summary.savingsCount} deposits</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg summary-card">
                  <p className="text-gray-600 text-sm">Loan Limit</p>
                  <p className="text-2xl font-bold text-blue-700">
                    KES {reportData.member.loanLimit.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">3x Savings</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg summary-card">
                  <p className="text-gray-600 text-sm">Outstanding Loans</p>
                  <p className="text-2xl font-bold text-orange-700">
                    KES {(reportData.member.outstandingLoans || 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg summary-card">
                  <p className="text-gray-600 text-sm">Available Limit</p>
                  <p className="text-2xl font-bold text-purple-700">
                    KES {(reportData.member.availableLoanLimit || 0).toLocaleString()}
                  </p>
                </div>
              </div>
              
              {/* Additional Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-red-50 p-4 rounded-lg summary-card">
                  <p className="text-gray-600 text-sm">Total Loans</p>
                  <p className="text-2xl font-bold text-red-700">{reportData.summary.totalLoans}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg summary-card">
                  <p className="text-gray-600 text-sm">Active Loans</p>
                  <p className="text-2xl font-bold text-yellow-700">{reportData.summary.activeLoans}</p>
                </div>
              </div>
              
              {/* Loans - ✅ ADDED APPROVED AMOUNT COLUMN */}
              {reportData.loans.length > 0 && (
                <div className="mb-6">
                  <h5 className="text-lg font-semibold text-gray-800 mb-3">Loans History</h5>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Loan ID</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Approved Amount</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Principal</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Interest</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Current Balance</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.loans.map((loan) => (
                          <tr key={loan.id}>
                            <td className="px-4 py-3 text-sm text-gray-900">#{loan.id}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-indigo-600 text-right">
                              KES {loan.initialAmount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                              KES {loan.principalAmount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                              KES {(loan.initialAmount - loan.principalAmount).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-orange-600 text-right">
                              KES {loan.amount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                loan.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                                loan.status === "APPROVED" ? "bg-green-100 text-green-800" :
                                "bg-red-100 text-red-800"
                              }`}>
                                {loan.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {new Date(loan.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Savings History */}
              {reportData.savingsHistory.length > 0 && (
                <div>
                  <h5 className="text-lg font-semibold text-gray-800 mb-3">Savings History</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {reportData.savingsHistory.map((saving, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <div>
                          <p className="font-semibold text-green-700">
                            KES {saving.amount.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-600">{saving.source || 'Savings Deposit'}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(saving.savedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-green-600">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
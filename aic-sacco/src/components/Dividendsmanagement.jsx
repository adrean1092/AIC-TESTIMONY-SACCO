import React, { useState, useRef } from "react";
import API from "../api";

// CSV parser (handles quoted fields)
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((line) => {
    const values = [];
    let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === "," && !inQ) { values.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    values.push(cur.trim());
    return headers.reduce((obj, h, i) => { obj[h] = values[i] ?? ""; return obj; }, {});
  }).filter((row) => Object.values(row).some((v) => v !== ""));
}

const BulkLoanUpload = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState("upload"); // upload | preview | result
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  const handleFile = (e) => {
    setError("");
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a .csv file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = parseCSV(evt.target.result);
        if (parsed.length === 0) {
          setError("CSV is empty or has no data rows.");
          return;
        }
        // Validate required columns
        const required = ["sacco_number", "loan_amount", "loan_date"];
        const missing = required.filter((col) => !(col in parsed[0]));
        if (missing.length > 0) {
          setError(`Missing required columns: ${missing.join(", ")}`);
          return;
        }
        setRows(parsed);
        setStep("preview");
      } catch {
        setError("Failed to parse CSV. Please check the file format.");
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const loans = rows.map((r) => ({
        sacco_number     : r.sacco_number || "",
        loan_amount      : r.loan_amount      ? parseFloat(r.loan_amount)      : undefined,
        interest_rate    : r.interest_rate    ? parseFloat(r.interest_rate)    : 1.8,
        repayment_period : r.repayment_period ? parseInt(r.repayment_period)   : 12,
        loan_purpose     : r.loan_purpose     || "Historical loan",
        loan_date        : r.loan_date        || new Date().toISOString().split("T")[0],
        // partial payment support
        principal_paid   : r.principal_paid   ? parseFloat(r.principal_paid)   : undefined,
        interest_paid    : r.interest_paid    ? parseFloat(r.interest_paid)    : undefined,
        last_payment_date: r.last_payment_date || undefined,
        notes            : r.notes            || "Bulk imported historical loan",
      }));

      const res = await API.post("/admin/loans/bulk-create", { loans });
      setResult(res.data);
      setStep("result");
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const csv = [
      "sacco_number,loan_amount,interest_rate,repayment_period,loan_purpose,loan_date,principal_paid,interest_paid,last_payment_date,notes",
      "SACCO-0001,50000,1.8,12,Business loan,2022-03-15,,,, No payments yet",
      "SACCO-0002,75000,1.8,24,School fees,2021-11-01,30000,8500,2023-06-30,Partial repayment recorded",
      "SACCO-0003,30000,1.8,6,Emergency,2023-01-20,,,,",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk_loan_upload_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="bg-indigo-700 text-white p-5 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">📤 Bulk Loan Upload</h2>
            <p className="text-indigo-200 text-sm mt-0.5">Upload historical loans for members who borrowed before the system</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-indigo-200 text-3xl font-bold leading-none">×</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">

          {/* ── STEP: UPLOAD ── */}
          {step === "upload" && (
            <div className="space-y-5">
              {/* Format guide */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm text-indigo-800 space-y-2">
                <p className="font-semibold">📋 CSV Format for Historical Loans</p>
                <div className="font-mono text-xs bg-white border border-indigo-100 rounded p-3 overflow-x-auto">
                  <div className="text-green-700 font-semibold mb-1">Required columns:</div>
                  sacco_number, loan_amount, loan_date
                  <div className="text-blue-700 font-semibold mt-2 mb-1">Optional columns:</div>
                  interest_rate, repayment_period, loan_purpose, notes
                  <div className="text-amber-700 font-semibold mt-2 mb-1">For prior payments (if member already made repayments):</div>
                  principal_paid, interest_paid, last_payment_date
                </div>
                <div className="space-y-1 text-xs">
                  <p><strong>sacco_number:</strong> Member's SACCO number (e.g., SACCO-0001)</p>
                  <p><strong>loan_amount:</strong> Principal loan amount (e.g., 50000)</p>
                  <p><strong>interest_rate:</strong> Monthly rate (default: 1.8)</p>
                  <p><strong>repayment_period:</strong> Months (default: 12)</p>
                  <p><strong>loan_purpose:</strong> Why the loan was taken (default: "Historical loan")</p>
                  <p><strong>loan_date:</strong> When loan was issued (YYYY-MM-DD) — required for backdating</p>
                  <p><strong>principal_paid:</strong> Principal already repaid (leave blank if none)</p>
                  <p><strong>interest_paid:</strong> Interest already paid (leave blank if none)</p>
                  <p><strong>last_payment_date:</strong> Date of last prior payment (YYYY-MM-DD)</p>
                  <p><strong>notes:</strong> Any additional information</p>
                </div>
              </div>

              {/* Important note */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <span className="font-bold">⚠️ Important:</span> Loans will be automatically approved and backdated.
                  If <strong>principal_paid</strong> or <strong>interest_paid</strong> are provided, the system records them as a prior payment and adjusts the current balance accordingly.
                </p>
              </div>

              {/* Template download */}
              <button
                onClick={downloadTemplate}
                className="text-sm text-indigo-600 hover:text-indigo-800 underline font-medium"
              >
                ⬇️ Download CSV Template
              </button>

              {/* File upload */}
              <div
                className="border-2 border-dashed border-indigo-300 rounded-xl p-10 text-center cursor-pointer hover:bg-indigo-50 transition"
                onClick={() => fileRef.current?.click()}
              >
                <p className="text-4xl mb-2">📂</p>
                <p className="text-gray-600 font-semibold">Click to select a CSV file</p>
                <p className="text-gray-400 text-sm mt-1">or drag and drop</p>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
              </div>

              {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
            </div>
          )}

          {/* ── STEP: PREVIEW ── */}
          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  <span className="font-bold text-gray-900">{rows.length}</span> historical loans ready to import
                </p>
                <button
                  onClick={() => { setStep("upload"); setRows([]); fileRef.current && (fileRef.current.value = ""); }}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  ← Change file
                </button>
              </div>

              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">SACCO #</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Loan Amount</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Loan Date</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Rate</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Period</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Purpose</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-amber-700 uppercase bg-amber-50">Principal Paid</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-amber-700 uppercase bg-amber-50">Interest Paid</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-amber-700 uppercase bg-amber-50">Last Pmt Date</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {rows.map((row, i) => {
                      const hasPmt = row.principal_paid || row.interest_paid;
                      return (
                        <tr key={i} className={`${hasPmt ? "bg-amber-50/40" : ""} hover:bg-gray-50`}>
                          <td className="px-3 py-2 text-gray-700 font-medium">{row.sacco_number}</td>
                          <td className="px-3 py-2 text-gray-700 font-semibold">KES {parseFloat(row.loan_amount || 0).toLocaleString()}</td>
                          <td className="px-3 py-2 text-amber-700 font-medium">{row.loan_date || "—"}</td>
                          <td className="px-3 py-2 text-gray-700">{row.interest_rate || "1.8"}%</td>
                          <td className="px-3 py-2 text-gray-700">{row.repayment_period || "12"} mo</td>
                          <td className="px-3 py-2 text-gray-500 max-w-xs truncate">{row.loan_purpose || "Historical loan"}</td>
                          <td className={`px-3 py-2 font-medium ${hasPmt && row.principal_paid ? "text-emerald-700" : "text-gray-300"}`}>
                            {row.principal_paid ? `KES ${parseFloat(row.principal_paid).toLocaleString()}` : "—"}
                          </td>
                          <td className={`px-3 py-2 font-medium ${hasPmt && row.interest_paid ? "text-orange-600" : "text-gray-300"}`}>
                            {row.interest_paid ? `KES ${parseFloat(row.interest_paid).toLocaleString()}` : "—"}
                          </td>
                          <td className={`px-3 py-2 ${hasPmt && row.last_payment_date ? "text-amber-700" : "text-gray-300"}`}>
                            {row.last_payment_date || "—"}
                          </td>
                          <td className="px-3 py-2 text-gray-400 max-w-xs truncate">{row.notes || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
            </div>
          )}

          {/* ── STEP: RESULT ── */}
          {step === "result" && result && (
            <div className="space-y-4">
              <div className={`rounded-lg p-4 text-sm font-semibold ${
                result.failed.length === 0
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : result.successful.length === 0
                  ? "bg-red-50 text-red-800 border border-red-200"
                  : "bg-yellow-50 text-yellow-800 border border-yellow-200"
              }`}>
                {result.message || `Imported ${result.successful.length} loans successfully`}
              </div>

              {result.successful.length > 0 && (
                <div>
                  <p className="font-semibold text-green-700 mb-2">✅ Successfully Imported ({result.successful.length})</p>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full text-sm divide-y divide-gray-200">
                      <thead className="bg-green-50">
                        <tr>
                          {["Loan ID", "SACCO #", "Member Name", "Amount", "Period", "Status"].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {result.successful.map((s, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 font-mono text-gray-600">{s.loan_id}</td>
                            <td className="px-3 py-2 font-semibold">{s.sacco_number}</td>
                            <td className="px-3 py-2">{s.member_name}</td>
                            <td className="px-3 py-2 text-green-700 font-bold">KES {s.amount?.toLocaleString()}</td>
                            <td className="px-3 py-2">{s.repayment_period} months</td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                                {s.status || 'APPROVED'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {result.failed.length > 0 && (
                <div>
                  <p className="font-semibold text-red-700 mb-2">❌ Failed ({result.failed.length})</p>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full text-sm divide-y divide-gray-200">
                      <thead className="bg-red-50">
                        <tr>
                          {["SACCO #", "Amount", "Reason"].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {result.failed.map((f, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 font-semibold">{f.sacco_number}</td>
                            <td className="px-3 py-2">KES {f.loan_amount?.toLocaleString()}</td>
                            <td className="px-3 py-2 text-red-600">{f.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-5 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition"
          >
            {step === "result" ? "Close" : "Cancel"}
          </button>

          <div className="flex gap-3">
            {step === "preview" && (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-60"
              >
                {loading ? "Importing..." : `Import ${rows.length} Loans`}
              </button>
            )}
            {step === "result" && result?.successful.length > 0 && (
              <button
                onClick={onSuccess}
                className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition"
              >
                Done & Refresh
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default BulkLoanUpload;
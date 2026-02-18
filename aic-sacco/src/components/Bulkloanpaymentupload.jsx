import React, { useState, useRef } from "react";
import API from "../api";

// Lightweight CSV parser (no external dependency needed)
function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    return headers.reduce((obj, h, i) => {
      obj[h] = values[i] ?? "";
      return obj;
    }, {});
  }).filter((row) => Object.values(row).some((v) => v !== ""));
}

const BulkLoanPaymentUpload = ({ onClose, onSuccess }) => {
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
        const required = ["loan_id", "payment_date"];
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
      const payments = rows.map((r) => ({
        loan_id: r.loan_id ? parseInt(r.loan_id) : undefined,
        sacco_number: r.sacco_number || "",
        payment_amount: r.payment_amount ? parseFloat(r.payment_amount) : undefined,
        principal_paid: r.principal_paid ? parseFloat(r.principal_paid) : undefined,
        interest_paid: r.interest_paid ? parseFloat(r.interest_paid) : undefined,
        payment_date: r.payment_date,
        notes: r.notes || "",
      }));

      const res = await API.post("/admin/loans/bulk-payment-update", { payments });
      setResult(res.data);
      setStep("result");
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const res = await API.get("/admin/loans/bulk-update-template", { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "loan_payment_template.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: generate locally
      const csv = "sacco_number,loan_id,payment_amount,payment_date,notes\nSACCO-0001,123,5000,2024-01-15,January payment\n";
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "loan_payment_template.csv";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="bg-indigo-700 text-white p-5 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">📤 Bulk Loan Payment Upload</h2>
            <p className="text-indigo-200 text-sm mt-0.5">Upload a CSV to record multiple loan payments at once</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-indigo-200 text-3xl font-bold leading-none">×</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">

          {/* ── STEP: UPLOAD ── */}
          {step === "upload" && (
            <div className="space-y-5">
              {/* Format guide */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm text-indigo-800 space-y-2">
                <p className="font-semibold">CSV Format</p>
                <p>Use one of these two column layouts:</p>
                <div className="font-mono text-xs bg-white border border-indigo-100 rounded p-3 overflow-x-auto">
                  <div className="text-green-700 font-semibold mb-1">Auto-split (recommended):</div>
                  sacco_number, loan_id, payment_amount, payment_date, notes
                  <div className="text-blue-700 font-semibold mt-2 mb-1">Manual split:</div>
                  sacco_number, loan_id, principal_paid, interest_paid, payment_date, notes
                </div>
                <p className="text-xs text-indigo-600">
                  <strong>loan_id</strong> and <strong>payment_date</strong> (YYYY-MM-DD) are required. All other columns are optional.
                </p>
              </div>

              {/* Template download */}
              <button
                onClick={downloadTemplate}
                className="text-sm text-indigo-600 hover:text-indigo-800 underline font-medium"
              >
                ⬇ Download CSV Template
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
                  <span className="font-bold text-gray-900">{rows.length}</span> payment rows ready to process
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
                      {Object.keys(rows[0]).map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {rows.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="px-3 py-2 text-gray-700 whitespace-nowrap">{val || "—"}</td>
                        ))}
                      </tr>
                    ))}
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
                result.results.failed.length === 0
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : result.results.success.length === 0
                  ? "bg-red-50 text-red-800 border border-red-200"
                  : "bg-yellow-50 text-yellow-800 border border-yellow-200"
              }`}>
                {result.message}
              </div>

              {result.results.success.length > 0 && (
                <div>
                  <p className="font-semibold text-green-700 mb-2">✅ Successful ({result.results.success.length})</p>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full text-sm divide-y divide-gray-200">
                      <thead className="bg-green-50">
                        <tr>
                          {["Loan ID", "SACCO #", "Principal Paid", "Interest Paid", "New Balance", "Date"].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {result.results.success.map((s, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2">{s.loan_id}</td>
                            <td className="px-3 py-2">{s.sacco_number}</td>
                            <td className="px-3 py-2 text-purple-700 font-semibold">KES {s.principalPaid?.toLocaleString()}</td>
                            <td className="px-3 py-2 text-blue-700 font-semibold">KES {s.interestPaid?.toLocaleString()}</td>
                            <td className="px-3 py-2 text-green-700 font-bold">KES {s.newBalance?.toLocaleString()}</td>
                            <td className="px-3 py-2 text-gray-500">{s.paymentDate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {result.results.failed.length > 0 && (
                <div>
                  <p className="font-semibold text-red-700 mb-2">❌ Failed ({result.results.failed.length})</p>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full text-sm divide-y divide-gray-200">
                      <thead className="bg-red-50">
                        <tr>
                          {["Loan ID", "SACCO #", "Reason"].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {result.results.failed.map((f, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2">{f.loan_id}</td>
                            <td className="px-3 py-2">{f.sacco_number}</td>
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
                {loading ? "Processing..." : `Process ${rows.length} Payments`}
              </button>
            )}
            {step === "result" && result?.results.success.length > 0 && (
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

export default BulkLoanPaymentUpload;
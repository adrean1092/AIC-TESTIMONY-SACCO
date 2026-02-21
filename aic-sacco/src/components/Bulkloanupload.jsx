import React, { useState, useRef } from "react";
import API from "../api";

// Lightweight CSV parser
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

/**
 * Preview helper – mirrors the backend calcElapsedPayments so the user can
 * see what will happen BEFORE they submit.
 */
function previewElapsed(loanAmount, interestRate, period, loanDate) {
  const processingFee    = loanAmount * 0.005;
  const principalWithFee = loanAmount + processingFee;
  const monthlyRate      = interestRate / 100;
  const today            = new Date();
  const start            = new Date(loanDate);

  const monthsElapsed =
    (today.getFullYear() - start.getFullYear()) * 12 +
    (today.getMonth()    - start.getMonth());

  if (monthsElapsed <= 0 || !loanDate) {
    const mp =
      (principalWithFee * monthlyRate * Math.pow(1 + monthlyRate, period)) /
      (Math.pow(1 + monthlyRate, period) - 1);
    return { monthsElapsed: 0, principalPaid: 0, interestPaid: 0, balance: principalWithFee, monthlyPayment: mp };
  }

  const mp =
    (principalWithFee * monthlyRate * Math.pow(1 + monthlyRate, period)) /
    (Math.pow(1 + monthlyRate, period) - 1);

  let balance = principalWithFee;
  let totalPrincipalPaid = 0;
  let totalInterestPaid = 0;
  const paymentsToProcess = Math.min(monthsElapsed, period);

  for (let m = 0; m < paymentsToProcess; m++) {
    const interestThisMonth = balance * monthlyRate;
    const principalThisMonth = mp - interestThisMonth;
    totalInterestPaid += interestThisMonth;
    totalPrincipalPaid += principalThisMonth;
    balance -= principalThisMonth;
  }

  return {
    monthsElapsed: paymentsToProcess,
    principalPaid: Math.max(0, totalPrincipalPaid),
    interestPaid:  Math.max(0, totalInterestPaid),
    balance:       Math.max(0, balance),
    monthlyPayment: mp
  };
}

const BulkLoanUpload = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState("upload"); // upload | preview | result
  const [rows, setRows] = useState([]);
  const [previews, setPreviews] = useState([]);
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
        const required = ["sacco_number", "loan_amount", "loan_date"];
        const missing = required.filter((col) => !(col in parsed[0]));
        if (missing.length > 0) {
          setError(`Missing required columns: ${missing.join(", ")}`);
          return;
        }

        // Build client-side previews
        const computedPreviews = parsed.map((r) => {
          const loanAmount   = parseFloat(r.loan_amount || 0);
          const interestRate = parseFloat(r.interest_rate || 1.8);
          const period       = parseInt(r.repayment_period || 12);
          const loanDate     = r.loan_date;

          // If admin supplied manual overrides, skip auto-calc
          const hasOverride  =
            r.principal_paid && r.principal_paid !== "" &&
            r.interest_paid  && r.interest_paid  !== "";

          if (hasOverride) {
            const processingFee    = loanAmount * 0.005;
            const principalWithFee = loanAmount + processingFee;
            const monthlyRate      = interestRate / 100;
            const mp =
              (principalWithFee * monthlyRate * Math.pow(1 + monthlyRate, period)) /
              (Math.pow(1 + monthlyRate, period) - 1);
            const principalPaid = parseFloat(r.principal_paid);
            const interestPaid  = parseFloat(r.interest_paid);
            return {
              monthsElapsed: "manual",
              principalPaid,
              interestPaid,
              balance:       Math.max(0, principalWithFee - principalPaid),
              monthlyPayment: mp
            };
          }

          return previewElapsed(loanAmount, interestRate, period, loanDate);
        });

        setRows(parsed);
        setPreviews(computedPreviews);
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
        sacco_number:     r.sacco_number || "",
        loan_amount:      r.loan_amount   ? parseFloat(r.loan_amount)   : undefined,
        interest_rate:    r.interest_rate ? parseFloat(r.interest_rate) : 1.8,
        repayment_period: r.repayment_period ? parseInt(r.repayment_period) : 12,
        loan_purpose:     r.loan_purpose  || "Historical loan",
        loan_date:        r.loan_date     || new Date().toISOString().split("T")[0],
        // Pass overrides only if explicitly supplied
        ...(r.principal_paid && r.principal_paid !== "" ? { principal_paid: parseFloat(r.principal_paid) } : {}),
        ...(r.interest_paid  && r.interest_paid  !== "" ? { interest_paid:  parseFloat(r.interest_paid)  } : {}),
        ...(r.last_payment_date ? { last_payment_date: r.last_payment_date } : {}),
        notes: r.notes || "Bulk imported historical loan",
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
      "sacco_number,loan_amount,interest_rate,repayment_period,loan_purpose,loan_date,notes",
      "SACCO-0001,50000,1.8,12,Business loan,2024-01-15,Historical loan from 2024",
      "SACCO-0002,30000,1.8,6,Emergency loan,2024-06-01,Pre-system loan",
      "SACCO-0003,75000,1.8,24,Agricultural loan,2023-12-10,Imported from old records",
    ].join("\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk_loan_upload_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (n) =>
    typeof n === "number" ? `KES ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : n;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="bg-indigo-700 text-white p-5 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">📤 Bulk Historical Loan Upload</h2>
            <p className="text-indigo-200 text-sm mt-0.5">
              Payments are <strong>auto-calculated</strong> from the loan date to today using amortisation
            </p>
          </div>
          <button onClick={onClose} className="text-white hover:text-indigo-200 text-3xl font-bold leading-none">×</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">

          {/* ── STEP: UPLOAD ── */}
          {step === "upload" && (
            <div className="space-y-5">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm text-indigo-800 space-y-2">
                <p className="font-semibold">📋 CSV Format</p>
                <div className="font-mono text-xs bg-white border border-indigo-100 rounded p-3 overflow-x-auto">
                  <div className="text-green-700 font-semibold mb-1">Required columns:</div>
                  sacco_number, loan_amount, loan_date
                  <div className="text-blue-700 font-semibold mt-2 mb-1">Optional columns:</div>
                  interest_rate, repayment_period, loan_purpose, notes
                  <div className="text-orange-600 font-semibold mt-2 mb-1">Override columns (only if you have exact figures):</div>
                  principal_paid, interest_paid, last_payment_date
                </div>
                <div className="space-y-1 text-xs">
                  <p><strong>loan_date</strong> is now <span className="text-red-600 font-semibold">required</span> — the system uses it to auto-calculate all payments made since the loan started.</p>
                  <p><strong>principal_paid / interest_paid:</strong> Only supply these if you want to override auto-calculation (e.g. partial payments from old records).</p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
                <p className="font-semibold mb-1">✅ How auto-calculation works</p>
                <p>The system calculates how many full months have passed between the <strong>loan date</strong> and <strong>today</strong>, then runs the amortisation schedule to determine exactly how much principal and interest should have been paid, and sets the current outstanding balance accordingly.</p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                <p><span className="font-bold">⚠️ Important:</span> All loans will be automatically approved. Make sure SACCO numbers match members in the system and loan dates are correct.</p>
              </div>

              <button onClick={downloadTemplate} className="text-sm text-indigo-600 hover:text-indigo-800 underline font-medium">
                ⬇️ Download CSV Template
              </button>

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
                  <span className="font-bold text-gray-900">{rows.length}</span> loans ready to import — payments auto-calculated below
                </p>
                <button
                  onClick={() => { setStep("upload"); setRows([]); setPreviews([]); if (fileRef.current) fileRef.current.value = ""; }}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  ← Change file
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
                💡 The <strong>Months Elapsed</strong>, <strong>Principal Paid</strong>, <strong>Interest Paid</strong>, and <strong>Current Balance</strong> columns below are what will be saved — computed from loan date → today.
              </div>

              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {["SACCO #", "Original Amount", "Interest Rate", "Period", "Loan Date", "Months Elapsed", "Principal Paid", "Interest Paid", "Current Balance", "Monthly Payment"].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {rows.map((row, i) => {
                      const p = previews[i] || {};
                      return (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-semibold text-gray-800">{row.sacco_number}</td>
                          <td className="px-3 py-2 text-gray-700">KES {parseFloat(row.loan_amount || 0).toLocaleString()}</td>
                          <td className="px-3 py-2 text-gray-700">{row.interest_rate || '1.8'}%</td>
                          <td className="px-3 py-2 text-gray-700">{row.repayment_period || '12'} mo</td>
                          <td className="px-3 py-2 text-gray-700">{row.loan_date}</td>
                          <td className="px-3 py-2 font-semibold text-indigo-700">{p.monthsElapsed}</td>
                          <td className="px-3 py-2 font-semibold text-purple-700">{fmt(p.principalPaid)}</td>
                          <td className="px-3 py-2 font-semibold text-blue-700">{fmt(p.interestPaid)}</td>
                          <td className="px-3 py-2 font-bold text-green-700">{fmt(p.balance)}</td>
                          <td className="px-3 py-2 text-gray-600">{fmt(p.monthlyPayment)}</td>
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
                {result.message}
              </div>

              {result.successful.length > 0 && (
                <div>
                  <p className="font-semibold text-green-700 mb-2">✅ Successfully Imported ({result.successful.length})</p>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full text-sm divide-y divide-gray-200">
                      <thead className="bg-green-50">
                        <tr>
                          {["Loan ID", "SACCO #", "Member", "Original Amt", "Months Elapsed", "Principal Paid", "Interest Paid", "Balance", "Monthly Pmt"].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {result.successful.map((s, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 font-mono text-gray-500">{s.loan_id}</td>
                            <td className="px-3 py-2 font-semibold">{s.sacco_number}</td>
                            <td className="px-3 py-2">{s.member_name}</td>
                            <td className="px-3 py-2">KES {s.original_amount?.toLocaleString()}</td>
                            <td className="px-3 py-2 text-indigo-700 font-semibold">{s.months_elapsed}</td>
                            <td className="px-3 py-2 text-purple-700 font-semibold">KES {s.principal_paid?.toLocaleString()}</td>
                            <td className="px-3 py-2 text-blue-700 font-semibold">KES {s.interest_paid?.toLocaleString()}</td>
                            <td className="px-3 py-2 text-green-700 font-bold">KES {s.current_balance?.toLocaleString()}</td>
                            <td className="px-3 py-2 text-gray-600">KES {s.monthly_payment?.toLocaleString()}</td>
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
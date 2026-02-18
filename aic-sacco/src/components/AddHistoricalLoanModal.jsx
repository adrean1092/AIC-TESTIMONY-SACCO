import React, { useState, useEffect, useCallback } from "react";
import API from "../api";

// ─── tiny debounce ───────────────────────────────────────────────────────────
function useDebounce(value, ms = 350) {
  const [deb, setDeb] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return deb;
}

// ─── loan maths ──────────────────────────────────────────────────────────────
function calcLoan(originalAmount, rate, period) {
  if (!originalAmount || !rate || !period) return null;
  const amt    = parseFloat(originalAmount);
  const r      = parseFloat(rate) / 100;
  const n      = parseInt(period);
  const fee    = amt * 0.005;
  const P      = amt + fee;
  // amortisation
  const monthly = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const total   = monthly * n;
  const interest = total - P;
  return { fee, P, monthly, total, interest, r, n, amt };
}

const STEPS = ["member", "loan", "payments", "review"];

export default function AddHistoricalLoanModal({ onClose, onSuccess }) {
  // ── step ────────────────────────────────────────────────────────────────────
  const [step, setStep] = useState(0); // 0=member 1=loan 2=payments 3=review

  // ── member search ────────────────────────────────────────────────────────────
  const [search, setSearch]     = useState("");
  const [members, setMembers]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [member, setMember]     = useState(null);
  const debouncedSearch = useDebounce(search, 350);

  // ── loan fields ──────────────────────────────────────────────────────────────
  const [loan, setLoan] = useState({
    original_amount : "",
    interest_rate   : "1.045",
    repayment_period: "12",
    loan_purpose    : "Historical loan",
    loan_date       : "",          // backdate
    notes           : "",
  });

  // ── partial-payment state ────────────────────────────────────────────────────
  const [partial, setPartial] = useState({
    has_payments   : false,
    principal_paid : "",
    interest_paid  : "",
    last_payment_date: "",
  });

  // ── submission ───────────────────────────────────────────────────────────────
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [result, setResult]     = useState(null);

  // ── member search effect ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) { setMembers([]); return; }
    setSearching(true);
    API.get("/admin/members")
      .then(res => {
        const q = debouncedSearch.toLowerCase();
        setMembers(
          res.data.filter(m =>
            m.full_name?.toLowerCase().includes(q) ||
            m.sacco_number?.toLowerCase().includes(q) ||
            m.email?.toLowerCase().includes(q)
          ).slice(0, 8)
        );
      })
      .catch(() => {})
      .finally(() => setSearching(false));
  }, [debouncedSearch]);

  // ── derived ──────────────────────────────────────────────────────────────────
  const calc    = calcLoan(loan.original_amount, loan.interest_rate, loan.repayment_period);
  const paidAmt = parseFloat(partial.principal_paid || 0) + parseFloat(partial.interest_paid || 0);
  const currentBalance = calc ? Math.max(0, calc.P - parseFloat(partial.principal_paid || 0)) : 0;

  // ── step validation ──────────────────────────────────────────────────────────
  const canNext = [
    () => !!member,
    () => !!loan.original_amount && !!loan.loan_date && parseFloat(loan.original_amount) > 0,
    () => true,  // payments step always ok
    () => true,
  ];

  const handleNext = () => {
    setError("");
    if (canNext[step]()) setStep(s => s + 1);
    else setError(step === 0 ? "Please select a member." : "Please fill in all required fields.");
  };

  // ── submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const principalPaid = parseFloat(partial.principal_paid || 0);
      const interestPaid  = parseFloat(partial.interest_paid  || 0);

      const payload = {
        userId          : member.id,
        amount          : parseFloat(loan.original_amount),
        interest_rate   : parseFloat(loan.interest_rate),
        repayment_period: parseInt(loan.repayment_period),
        loan_purpose    : loan.loan_purpose || "Historical loan",
        status          : "APPROVED",
        created_at      : loan.loan_date,
        // pre-existing payment data
        principal_paid  : principalPaid || undefined,
        interest_paid   : interestPaid  || undefined,
        last_payment_date: partial.has_payments && partial.last_payment_date
                            ? partial.last_payment_date
                            : undefined,
        notes: loan.notes || undefined,
      };

      const res = await API.post("/admin/loans", payload);
      setResult(res.data);
      setStep(4); // done
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create historical loan.");
    } finally {
      setLoading(false);
    }
  };

  // ── helper ───────────────────────────────────────────────────────────────────
  const fmt = (n) =>
    n?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-6 py-5 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Add Historical Loan</h2>
            <p className="text-slate-300 text-sm mt-0.5">Record a pre-system loan with backdating</p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-white text-2xl leading-none mt-0.5">×</button>
        </div>

        {/* ── Step indicator ── */}
        {step < 4 && (
          <div className="px-6 pt-4 pb-2 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center gap-2">
              {["Find Member", "Loan Details", "Prior Payments", "Review"].map((label, i) => (
                <React.Fragment key={i}>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      i < step ? "bg-emerald-500 text-white" :
                      i === step ? "bg-slate-800 text-white" :
                      "bg-slate-200 text-slate-500"
                    }`}>
                      {i < step ? "✓" : i + 1}
                    </div>
                    <span className={`text-xs font-medium hidden sm:block ${
                      i === step ? "text-slate-800" : "text-slate-400"
                    }`}>{label}</span>
                  </div>
                  {i < 3 && <div className={`flex-1 h-0.5 rounded-full ${i < step ? "bg-emerald-400" : "bg-slate-200"}`} />}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* ── STEP 0: Member search ── */}
          {step === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Search by name, SACCO number, or email.</p>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="e.g. SACCO-0012 or John Doe"
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent text-sm"
                />
                {searching && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs animate-pulse">searching…</span>
                )}
              </div>

              {members.length > 0 && !member && (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {members.map(m => (
                    <button
                      key={m.id}
                      onClick={() => { setMember(m); setSearch(""); setMembers([]); }}
                      className="w-full flex items-center gap-4 px-4 py-3 hover:bg-slate-50 text-left transition"
                    >
                      <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm flex-shrink-0">
                        {m.full_name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">{m.full_name}</p>
                        <p className="text-xs text-slate-500">{m.sacco_number} · {m.email}</p>
                      </div>
                      <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">Select</span>
                    </button>
                  ))}
                </div>
              )}

              {member && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 font-bold">
                    {member.full_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-emerald-900">{member.full_name}</p>
                    <p className="text-sm text-emerald-700">{member.sacco_number} · {member.email}</p>
                    <p className="text-xs text-emerald-600 mt-0.5">
                      Savings: KES {parseFloat(member.savings || 0).toLocaleString()} ·
                      Loan limit: KES {parseFloat(member.loan_limit || 0).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => setMember(null)}
                    className="text-xs text-slate-500 hover:text-red-500 underline"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 1: Loan details ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-800">
                Adding historical loan for <strong>{member?.full_name}</strong> ({member?.sacco_number})
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Original loan date */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Original Loan Date <span className="text-red-500">*</span>
                    <span className="text-blue-500 text-xs font-normal ml-2">(backdate to when it was issued)</span>
                  </label>
                  <input
                    type="date"
                    value={loan.loan_date}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={e => setLoan(l => ({ ...l, loan_date: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-slate-500 text-sm"
                  />
                </div>

                {/* Original amount */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Original Loan Amount (KES) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={loan.original_amount}
                    onChange={e => setLoan(l => ({ ...l, original_amount: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-slate-500 text-sm"
                    placeholder="e.g. 50000"
                  />
                </div>

                {/* Interest rate */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Interest Rate (% / month)</label>
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={loan.interest_rate}
                    onChange={e => setLoan(l => ({ ...l, interest_rate: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-slate-500 text-sm"
                  />
                </div>

                {/* Period */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Repayment Period (months)</label>
                  <select
                    value={loan.repayment_period}
                    onChange={e => setLoan(l => ({ ...l, repayment_period: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-slate-500 text-sm"
                  >
                    {[3, 6, 9, 12, 18, 24, 36, 48, 60].map(n => (
                      <option key={n} value={n}>{n} months</option>
                    ))}
                  </select>
                </div>

                {/* Purpose */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Loan Purpose</label>
                  <input
                    type="text"
                    value={loan.loan_purpose}
                    onChange={e => setLoan(l => ({ ...l, loan_purpose: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-slate-500 text-sm"
                    placeholder="e.g. Business expansion"
                  />
                </div>

                {/* Notes */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Internal Notes</label>
                  <textarea
                    rows={2}
                    value={loan.notes}
                    onChange={e => setLoan(l => ({ ...l, notes: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-slate-500 text-sm resize-none"
                    placeholder="Optional admin notes..."
                  />
                </div>
              </div>

              {/* Live preview */}
              {calc && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Loan Preview</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      ["Processing Fee (0.5%)", `KES ${fmt(calc.fee)}`, "text-orange-600"],
                      ["Principal + Fee",       `KES ${fmt(calc.P)}`,   "text-blue-700"],
                      ["Monthly Payment",       `KES ${fmt(calc.monthly)}`, "text-emerald-700"],
                      ["Total Interest",        `KES ${fmt(calc.interest)}`, "text-red-600"],
                      ["Total Repayable",       `KES ${fmt(calc.total)}`, "text-slate-800 font-bold"],
                    ].map(([label, val, cls]) => (
                      <div key={label}>
                        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                        <p className={`text-sm font-semibold ${cls}`}>{val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Prior payments ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-amber-900 mb-1">Has the member already made payments on this loan?</p>
                <p className="text-xs text-amber-700">If yes, enter the amounts already paid so the current balance is correct.</p>
              </div>

              <div className="flex gap-3">
                {[
                  { val: false, label: "No — loan is brand new / no payments yet" },
                  { val: true,  label: "Yes — some payments have been made" },
                ].map(({ val, label }) => (
                  <button
                    key={String(val)}
                    onClick={() => setPartial(p => ({ ...p, has_payments: val }))}
                    className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition ${
                      partial.has_payments === val
                        ? "border-slate-800 bg-slate-800 text-white"
                        : "border-slate-200 text-slate-600 hover:border-slate-400"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {partial.has_payments && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Principal Already Paid (KES)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={partial.principal_paid}
                      onChange={e => setPartial(p => ({ ...p, principal_paid: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-slate-500 text-sm"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Interest Already Paid (KES)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={partial.interest_paid}
                      onChange={e => setPartial(p => ({ ...p, interest_paid: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-slate-500 text-sm"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Date of Last Payment
                      <span className="text-blue-500 text-xs font-normal ml-2">(backdate if needed)</span>
                    </label>
                    <input
                      type="date"
                      value={partial.last_payment_date}
                      max={new Date().toISOString().split("T")[0]}
                      onChange={e => setPartial(p => ({ ...p, last_payment_date: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-slate-500 text-sm"
                    />
                  </div>

                  {calc && (
                    <div className="sm:col-span-2 bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">Resulting Balance</p>
                      <div className="flex gap-6">
                        <div>
                          <p className="text-xs text-blue-600">Original principal + fee</p>
                          <p className="text-base font-bold text-blue-900">KES {fmt(calc.P)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-blue-600">Principal paid</p>
                          <p className="text-base font-bold text-emerald-700">− KES {fmt(parseFloat(partial.principal_paid || 0))}</p>
                        </div>
                        <div>
                          <p className="text-xs text-blue-600">Current outstanding</p>
                          <p className="text-xl font-extrabold text-slate-900">KES {fmt(currentBalance)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Review ── */}
          {step === 3 && calc && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Please review everything before saving.</p>

              {/* Member */}
              <Section title="Member" color="blue">
                <Row label="Name"        val={member?.full_name} />
                <Row label="SACCO No."   val={member?.sacco_number} />
                <Row label="Email"       val={member?.email} />
              </Section>

              {/* Loan */}
              <Section title="Loan Details" color="slate">
                <Row label="Original Amount"    val={`KES ${fmt(calc.amt)}`} />
                <Row label="Processing Fee"     val={`KES ${fmt(calc.fee)}`} />
                <Row label="Principal + Fee"    val={`KES ${fmt(calc.P)}`} bold />
                <Row label="Interest Rate"      val={`${loan.interest_rate}% / month`} />
                <Row label="Repayment Period"   val={`${loan.repayment_period} months`} />
                <Row label="Monthly Payment"    val={`KES ${fmt(calc.monthly)}`} />
                <Row label="Total Interest"     val={`KES ${fmt(calc.interest)}`} />
                <Row label="Total Repayable"    val={`KES ${fmt(calc.total)}`} bold />
                <Row label="Loan Date"          val={loan.loan_date} highlight="amber" />
                <Row label="Purpose"            val={loan.loan_purpose} />
              </Section>

              {/* Payments */}
              {partial.has_payments && (
                <Section title="Prior Payments" color="emerald">
                  <Row label="Principal Paid"   val={`KES ${fmt(parseFloat(partial.principal_paid || 0))}`} />
                  <Row label="Interest Paid"    val={`KES ${fmt(parseFloat(partial.interest_paid || 0))}`} />
                  <Row label="Current Balance"  val={`KES ${fmt(currentBalance)}`} bold />
                  {partial.last_payment_date && (
                    <Row label="Last Payment"   val={partial.last_payment_date} highlight="amber" />
                  )}
                </Section>
              )}

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800 font-semibold">
                ✅ Loan will be created with status <span className="bg-emerald-200 px-2 py-0.5 rounded">APPROVED</span> and backdated to {loan.loan_date}.
              </div>
            </div>
          )}

          {/* ── STEP 4: Done ── */}
          {step === 4 && (
            <div className="text-center py-8 space-y-4">
              <div className="text-6xl">🎉</div>
              <h3 className="text-xl font-bold text-slate-800">Historical Loan Saved!</h3>
              <p className="text-slate-600 text-sm">
                Loan #{result?.loan?.id} for <strong>{member?.full_name}</strong> has been recorded.
              </p>
              {result?.loan && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left inline-block mx-auto text-sm space-y-1 min-w-60">
                  <Row label="Loan ID"      val={`#${result.loan.id}`} bold />
                  <Row label="Amount"       val={`KES ${fmt(result.loan.initialAmount || result.loan.amount)}`} />
                  <Row label="Status"       val={result.loan.status} />
                  <Row label="Date"         val={loan.loan_date} highlight="amber" />
                </div>
              )}
              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={() => { setStep(0); setMember(null); setLoan({ original_amount:"",interest_rate:"1.045",repayment_period:"12",loan_purpose:"Historical loan",loan_date:"",notes:"" }); setPartial({ has_payments:false,principal_paid:"",interest_paid:"",last_payment_date:"" }); setResult(null); setSearch(""); }}
                  className="px-5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition"
                >
                  Add Another
                </button>
                <button
                  onClick={onSuccess}
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition"
                >
                  Done & Refresh
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {step < 4 && (
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between items-center">
            <button
              onClick={step === 0 ? onClose : () => setStep(s => s - 1)}
              className="px-5 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition"
            >
              {step === 0 ? "Cancel" : "← Back"}
            </button>

            {step < 3 && (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-900 transition"
              >
                Continue →
              </button>
            )}

            {step === 3 && (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className={`px-6 py-2 rounded-lg text-sm font-semibold transition ${
                  loading ? "bg-slate-400 cursor-not-allowed text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                {loading ? "Saving…" : "✓ Save Historical Loan"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── tiny sub-components ───────────────────────────────────────────────────────
function Section({ title, color = "slate", children }) {
  const colors = {
    blue:    "bg-blue-50 border-blue-100 text-blue-900",
    slate:   "bg-slate-50 border-slate-200 text-slate-800",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-900",
  };
  return (
    <div className={`border rounded-xl overflow-hidden`}>
      <div className={`px-4 py-2.5 border-b font-semibold text-sm ${colors[color]}`}>
        {title}
      </div>
      <div className="divide-y divide-slate-100">
        {children}
      </div>
    </div>
  );
}

function Row({ label, val, bold, highlight }) {
  return (
    <div className="flex justify-between items-center px-4 py-2.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`${bold ? "font-bold" : "font-medium"} ${
        highlight === "amber" ? "text-amber-700 bg-amber-50 px-2 py-0.5 rounded" : "text-slate-800"
      }`}>
        {val ?? "—"}
      </span>
    </div>
  );
}
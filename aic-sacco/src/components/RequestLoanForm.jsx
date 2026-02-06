import { useState } from "react";

// Kenya Counties and Sub-Counties data
const KENYA_COUNTIES = {
  "Baringo": ["Baringo Central", "Baringo North", "East Pokot", "Mogotio", "Tiaty", "Eldama Ravine"],
  "Bomet": ["Bomet Central", "Bomet East", "Chepalungu", "Konoin", "Sotik"],
  "Bungoma": ["Bumula", "Kabuchai", "Kanduyi", "Kimilili", "Mt. Elgon", "Sirisia", "Tongaren", "Webuye East", "Webuye West"],
  "Busia": ["Budalangi", "Butula", "Funyula", "Nambale", "Teso North", "Teso South"],
  "Elgeyo-Marakwet": ["Keiyo North", "Keiyo South", "Marakwet East", "Marakwet West"],
  "Embu": ["Manyatta", "Mbeere North", "Mbeere South", "Runyenjes"],
  "Garissa": ["Daadab", "Fafi", "Garissa", "Hulugho", "Ijara", "Lagdera", "Balambala"],
  "Homa Bay": ["Homa Bay Town", "Kabondo", "Karachuonyo", "Kasipul", "Mbita", "Ndhiwa", "Rangwe", "Suba"],
  "Isiolo": ["Central", "Garbatulla", "Merti", "North"],
  "Kajiado": ["Isinya", "Kajiado Central", "Kajiado North", "Kajiado South", "Loitokitok", "Mashuuru"],
  "Kakamega": ["Butere", "Ikolomani", "Khwisero", "Likuyani", "Lugari", "Matungu", "Mumias East", "Mumias West", "Navakholo", "Shinyalu"],
  "Kericho": ["Ainamoi", "Belgut", "Bureti", "Kipkelion East", "Kipkelion West", "Soin/Sigowet"],
  "Kiambu": ["Gatundu North", "Gatundu South", "Githunguri", "Juja", "Kabete", "Kiambaa", "Kiambu", "Kikuyu", "Lari", "Limuru", "Ruiru", "Thika"],
  "Kilifi": ["Genze", "Kaloleni", "Kilifi North", "Kilifi South", "Magarini", "Malindi", "Rabai"],
  "Kirinyaga": ["Kirinyaga Central", "Kirinyaga East", "Kirinyaga West", "Mwea East", "Mwea West"],
  "Kisii": ["Bobasi", "Bomachoge Borabu", "Bomachoge Chache", "Kitutu Chache North", "Kitutu Chache South", "Nyaribari Chache", "Nyaribari Masaba", "South Mugirango"],
  "Kisumu": ["Kisumu Central", "Kisumu East", "Kisumu West", "Mohoroni", "Nyakach", "Nyando", "Seme"],
  "Kitui": ["Ikutha", "Katulani", "Kisasi", "Kitui Central", "Kitui Rural", "Kitui South", "Kitui West", "Lower Yatta", "Matinyani", "Migwani", "Mutitu", "Mutomo", "Mwingi Central", "Mwingi North", "Mwingi West"],
  "Kwale": ["Kinango", "Lunga Lunga", "Matuga", "Msambweni"],
  "Laikipia": ["Laikipia Central", "Laikipia East", "Laikipia North", "Laikipia West", "Nyahururu"],
  "Lamu": ["Lamu East", "Lamu West"],
  "Machakos": ["Kalama", "Kangundo", "Kathiani", "Machakos", "Masinga", "Matungulu", "Mavoko", "Mwala", "Yathui"],
  "Makueni": ["Kaiti", "Kibwezi East", "Kibwezi West", "Kilome", "Makueni", "Mbooni"],
  "Mandera": ["Banissa", "Lafey", "Mandera East", "Mandera North", "Mandera South", "Mandera West"],
  "Marsabit": ["Laisamis", "Moyale", "North Horr", "Saku"],
  "Meru": ["Buuri", "Igembe Central", "Igembe North", "Igembe South", "Imenti Central", "Imenti North", "Imenti South", "Tigania East", "Tigania West"],
  "Migori": ["Awendo", "Kuria East", "Kuria West", "Ntimaru", "Rongo", "Suna East", "Suna West", "Uriri"],
  "Mombasa": ["Changamwe", "Jomvu", "Kisauni", "Likoni", "Mvita", "Nyali"],
  "Murang'a": ["Gatanga", "Kahuro", "Kandara", "Kangema", "Kigumo", "Kiharu", "Mathioya", "Murang'a South"],
  "Nairobi": ["Dagoretti North", "Dagoretti South", "Embakasi Central", "Embakasi East", "Embakasi North", "Embakasi South", "Embakasi West", "Kamukunji", "Kasarani", "Kibra", "Lang'ata", "Makadara", "Mathare", "Roysambu", "Ruaraka", "Starehe", "Westlands"],
  "Nakuru": ["Bahati", "Gilgil", "Kuresoi North", "Kuresoi South", "Molo", "Naivasha", "Nakuru Town East", "Nakuru Town West", "Njoro", "Rongai", "Subukia"],
  "Nandi": ["Aldai", "Chesumei", "Emgwen", "Mosop", "Nandi Hills", "Tinderet"],
  "Narok": ["Narok East", "Narok North", "Narok South", "Narok West", "Transmara East", "Transmara West"],
  "Nyamira": ["Borabu", "Manga", "Masaba North", "Nyamira North", "Nyamira South"],
  "Nyandarua": ["Kinangop", "Kipipiri", "Ndaragwa", "Ol Kalou", "Ol Joro Orok"],
  "Nyeri": ["Kieni East", "Kieni West", "Mathira East", "Mathira West", "Mukurweini", "Nyeri Central", "Nyeri South", "Othaya", "Tetu"],
  "Samburu": ["Samburu Central", "Samburu East", "Samburu North"],
  "Siaya": ["Alego Usonga", "Bondo", "Gem", "Rarieda", "Ugenya", "Ugunja"],
  "Taita-Taveta": ["Mwatate", "Taveta", "Voi", "Wundanyi"],
  "Tana River": ["Bura", "Galole", "Garsen"],
  "Tharaka-Nithi": ["Chuka", "Igambang'ombe", "Maara", "Muthambi", "Tharaka North", "Tharaka South"],
  "Trans-Nzoia": ["Cherangany", "Endebess", "Kiminini", "Kwanza", "Saboti"],
  "Turkana": ["Loima", "Turkana Central", "Turkana East", "Turkana North", "Turkana South", "Turkana West"],
  "Uasin Gishu": ["Ainabkoi", "Kapseret", "Kesses", "Moiben", "Soy", "Turbo"],
  "Vihiga": ["Emuhaya", "Hamisi", "Luanda", "Sabatia", "Vihiga"],
  "Wajir": ["Eldas", "Tarbaj", "Wajir East", "Wajir North", "Wajir South", "Wajir West"],
  "West Pokot": ["Kapenguria", "Kacheliba", "Pokot South", "Sigor"]
};

const getCounties = () => Object.keys(KENYA_COUNTIES).sort();
const getSubCounties = (county) => KENYA_COUNTIES[county] || [];

export default function RequestLoanForm({ 
  maxLoan = 0, 
  availableLoanLimit = 0,
  outstandingLoans = 0,
  totalLoanLimit = 0,
  onSubmit, 
  onCancel 
}) {
  const [amount, setAmount] = useState("");
  const [repaymentPeriod, setRepaymentPeriod] = useState("");
  const [useCustomPeriod, setUseCustomPeriod] = useState(false);
  const [loanPurpose, setLoanPurpose] = useState("");
  
  const maxLoanAmount = parseFloat(availableLoanLimit) || parseFloat(maxLoan) || 0;
  const totalLimit = parseFloat(totalLoanLimit) || parseFloat(maxLoan) || 0;
  const outstanding = parseFloat(outstandingLoans) || 0;
  const isTopUpLoan = outstanding > 0;
  
  // Guarantors (exactly 3 members)
  const [guarantors, setGuarantors] = useState([
    { name: "", idNumber: "", phone: "", email: "", county: "", location: "", subLocation: "", placeOfWork: "", shares: "" },
    { name: "", idNumber: "", phone: "", email: "", county: "", location: "", subLocation: "", placeOfWork: "", shares: "" },
    { name: "", idNumber: "", phone: "", email: "", county: "", location: "", subLocation: "", placeOfWork: "", shares: "" }
  ]);

  // Church Officials (exactly 3)
  const [churchOfficials, setChurchOfficials] = useState([
    { name: "", idNumber: "", phone: "", email: "", position: "", localChurch: "", county: "", location: "", subLocation: "" },
    { name: "", idNumber: "", phone: "", email: "", position: "", localChurch: "", county: "", location: "", subLocation: "" },
    { name: "", idNumber: "", phone: "", email: "", position: "", localChurch: "", county: "", location: "", subLocation: "" }
  ]);

  // Witnesses (exactly 2)
  const [witnesses, setWitnesses] = useState([
    { name: "", idNumber: "", phone: "", email: "", county: "", location: "", subLocation: "", placeOfWork: "" },
    { name: "", idNumber: "", phone: "", email: "", county: "", location: "", subLocation: "", placeOfWork: "" }
  ]);

  const [activeSection, setActiveSection] = useState("loan");

  const updateGuarantor = (index, field, value) => {
    const updated = [...guarantors];
    updated[index][field] = value;
    
    // Reset sub-location when county changes
    if (field === 'county') {
      updated[index].location = "";
      updated[index].subLocation = "";
    }
    // Reset sub-location when location changes
    if (field === 'location') {
      updated[index].subLocation = "";
    }
    
    setGuarantors(updated);
  };

  const updateChurchOfficial = (index, field, value) => {
    const updated = [...churchOfficials];
    updated[index][field] = value;
    
    // Reset sub-location when county changes
    if (field === 'county') {
      updated[index].location = "";
      updated[index].subLocation = "";
    }
    // Reset sub-location when location changes
    if (field === 'location') {
      updated[index].subLocation = "";
    }
    
    setChurchOfficials(updated);
  };

  const updateWitness = (index, field, value) => {
    const updated = [...witnesses];
    updated[index][field] = value;
    
    // Reset sub-location when county changes
    if (field === 'county') {
      updated[index].location = "";
      updated[index].subLocation = "";
    }
    // Reset sub-location when location changes
    if (field === 'location') {
      updated[index].subLocation = "";
    }
    
    setWitnesses(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!amount || !repaymentPeriod || !loanPurpose) {
      alert("Please fill in all loan details");
      return;
    }

    if (amount > maxLoanAmount) {
      alert(`You cannot request more than KES ${maxLoanAmount.toLocaleString()}`);
      return;
    }

    // Validate guarantors
    for (let i = 0; i < guarantors.length; i++) {
      const g = guarantors[i];
      if (!g.name || !g.idNumber || !g.phone || !g.email || 
          !g.county || !g.location || !g.subLocation || !g.placeOfWork || !g.shares) {
        alert(`Please complete all fields for Guarantor ${i + 1}`);
        return;
      }
    }

    // Validate church officials
    for (let i = 0; i < churchOfficials.length; i++) {
      const co = churchOfficials[i];
      if (!co.name || !co.idNumber || !co.phone || !co.email || !co.position || 
          !co.localChurch || !co.county || !co.location || !co.subLocation) {
        alert(`Please complete all fields for Church Official ${i + 1}`);
        return;
      }
    }

    // Validate witnesses
    for (let i = 0; i < witnesses.length; i++) {
      const w = witnesses[i];
      if (!w.name || !w.idNumber || !w.phone || !w.email ||
          !w.county || !w.location || !w.subLocation || !w.placeOfWork) {
        alert(`Please complete all fields for Witness ${i + 1}`);
        return;
      }
    }

    onSubmit({
      amount: parseFloat(amount),
      repaymentPeriod: parseInt(repaymentPeriod),
      loanPurpose,
      isTopUp: isTopUpLoan,
      guarantors: guarantors.map(g => ({
        ...g,
        shares: parseFloat(g.shares)
      })),
      churchOfficials,
      witnesses
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-red-700 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">Request Loan</h2>
              <p className="text-red-100 text-sm mt-1">
                Complete all sections to submit your loan application
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-white hover:text-red-200 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="mt-6 flex items-center justify-between">
            {["loan", "guarantors", "officials", "witnesses"].map((section, index) => (
              <div key={section} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
                  activeSection === section 
                    ? "bg-white text-red-700" 
                    : "bg-red-600 text-white"
                }`}>
                  {index + 1}
                </div>
                {index < 3 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    ["loan", "guarantors", "officials", "witnesses"].indexOf(activeSection) > index
                      ? "bg-white"
                      : "bg-red-600"
                  }`} />
                )}
              </div>
            ))}
          </div>

          <div className="mt-3 text-center">
            <p className="text-sm text-red-100 font-semibold">
              {activeSection === "loan" && "Step 1: Loan Details"}
              {activeSection === "guarantors" && "Step 2: Guarantors (3 Members)"}
              {activeSection === "officials" && "Step 3: Church Officials (3 Required)"}
              {activeSection === "witnesses" && "Step 4: Witnesses (2 Required)"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Loan Details Section */}
            {activeSection === "loan" && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">💰 Loan Information</h3>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p><span className="font-semibold">Total Loan Limit:</span> KES {totalLimit.toLocaleString()}</p>
                    <p><span className="font-semibold">Outstanding Loans:</span> KES {outstanding.toLocaleString()}</p>
                    <p><span className="font-semibold">Available Limit:</span> KES {maxLoanAmount.toLocaleString()}</p>
                    {isTopUpLoan && (
                      <p className="text-orange-700 font-semibold">⚠️ This will be a top-up loan (you have existing loans)</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Loan Amount (KES) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={`Maximum: ${maxLoanAmount.toLocaleString()}`}
                      min="1"
                      max={maxLoanAmount}
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Repayment Period (Months) <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      {useCustomPeriod ? (
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={repaymentPeriod}
                            onChange={(e) => setRepaymentPeriod(e.target.value)}
                            placeholder="Enter months"
                            min="1"
                            max="60"
                            required
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setUseCustomPeriod(false);
                              setRepaymentPeriod("");
                            }}
                            className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                          >
                            Dropdown
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <select
                            value={repaymentPeriod}
                            onChange={(e) => setRepaymentPeriod(e.target.value)}
                            required
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                          >
                            <option value="">Select period</option>
                            {[6, 12, 18, 24, 30, 36].map(months => (
                              <option key={months} value={months}>{months} months</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              setUseCustomPeriod(true);
                              setRepaymentPeriod("");
                            }}
                            className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm whitespace-nowrap"
                          >
                            Custom
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loan Purpose <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={loanPurpose}
                    onChange={(e) => setLoanPurpose(e.target.value)}
                    required
                    rows={4}
                    placeholder="Briefly describe the purpose of this loan..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {amount && repaymentPeriod && (() => {
                  const MONTHLY_RATE = 1.8 / 100;        // 1.8% per month
                  const PROCESSING_FEE_RATE = 0.5 / 100;   // 0.5% processing fee

                  const principal = parseFloat(amount);
                  const months = parseInt(repaymentPeriod);
                  const processingFee = principal * PROCESSING_FEE_RATE;
                  const principalWithFee = principal + processingFee;

                  // Amortisation formula: M = P * r * (1+r)^n / ((1+r)^n - 1)
                  const r = MONTHLY_RATE;
                  const n = months;
                  const monthlyPayment = principalWithFee * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);

                  // Generate month-by-month schedule
                  let remaining = principalWithFee;
                  let totalInterest = 0;
                  const schedule = [];
                  
                  for (let m = 1; m <= n; m++) {
                    const interestPayment = remaining * r;
                    const principalPayment = monthlyPayment - interestPayment;
                    totalInterest += interestPayment;
                    
                    schedule.push({
                      month: m,
                      balance: remaining,
                      payment: monthlyPayment,
                      principal: principalPayment,
                      interest: interestPayment
                    });
                    
                    remaining -= principalPayment;
                  }

                  const totalRepayable = principalWithFee + totalInterest;

                  return (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-900 mb-3">📊 Loan Breakdown</h4>
                      
                      {/* Summary Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-gray-600">Principal + Fee (0.5%)</p>
                          <p className="font-bold text-lg">KES {principalWithFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Fee: KES {processingFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Total Interest (1.8%/mo)</p>
                          <p className="font-bold text-lg text-orange-600">
                            KES {totalInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Total Repayable</p>
                          <p className="font-bold text-lg text-red-700">
                            KES {totalRepayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Monthly Payment</p>
                          <p className="font-bold text-lg text-green-700">
                            KES {monthlyPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      {/* Month-by-Month Schedule */}
                      <div className="mt-4">
                        <h5 className="font-semibold text-gray-800 mb-2">Monthly Payment Schedule</h5>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-green-600 text-white">
                              <tr>
                                <th className="px-3 py-2 text-left">Month</th>
                                <th className="px-3 py-2 text-right">Balance</th>
                                <th className="px-3 py-2 text-right">Payment</th>
                                <th className="px-3 py-2 text-right">Principal</th>
                                <th className="px-3 py-2 text-right">Interest</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white">
                              {schedule.map((row, idx) => (
                                <tr key={row.month} className={idx % 2 === 0 ? 'bg-green-50' : 'bg-white'}>
                                  <td className="px-3 py-2 font-semibold text-gray-800">Month {row.month}</td>
                                  <td className="px-3 py-2 text-right text-blue-600">
                                    KES {row.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-3 py-2 text-right font-semibold text-green-700">
                                    KES {row.payment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-3 py-2 text-right text-gray-800">
                                    KES {row.principal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-3 py-2 text-right text-orange-600">
                                    KES {row.interest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-green-700 text-white font-bold">
                              <tr>
                                <td className="px-3 py-2" colSpan="2">TOTALS</td>
                                <td className="px-3 py-2 text-right">
                                  KES {(monthlyPayment * n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  KES {principalWithFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  KES {totalInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Guarantors Section */}
            {activeSection === "guarantors" && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">👥 Guarantors (3 Required)</h3>
                  <p className="text-sm text-blue-800">All 3 guarantors must be SACCO members. They will receive email notifications.</p>
                </div>

                {guarantors.map((guarantor, index) => (
                  <div key={index} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                    <h4 className="font-semibold text-gray-800 mb-4">Guarantor {index + 1}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={guarantor.name}
                          onChange={(e) => updateGuarantor(index, "name", e.target.value)}
                          required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ID Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={guarantor.idNumber}
                          onChange={(e) => updateGuarantor(index, "idNumber", e.target.value)}
                          required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          value={guarantor.phone}
                          onChange={(e) => updateGuarantor(index, "phone", e.target.value)}
                          placeholder="+254..."
                          required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={guarantor.email}
                          onChange={(e) => updateGuarantor(index, "email", e.target.value)}
                          required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          County <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={guarantor.county}
                          onChange={(e) => updateGuarantor(index, "county", e.target.value)}
                          required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          <option value="">Select County</option>
                          {getCounties().map(county => (
                            <option key={county} value={county}>{county}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Sub-County <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={guarantor.location}
                          onChange={(e) => updateGuarantor(index, "location", e.target.value)}
                          required
                          disabled={!guarantor.county}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                        >
                          <option value="">Select Sub-County</option>
                          {getSubCounties(guarantor.county).map(subCounty => (
                            <option key={subCounty} value={subCounty}>{subCounty}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ward/Location <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={guarantor.subLocation}
                          onChange={(e) => updateGuarantor(index, "subLocation", e.target.value)}
                          required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Place of Work <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={guarantor.placeOfWork}
                          onChange={(e) => updateGuarantor(index, "placeOfWork", e.target.value)}
                          required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Shares (KES) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={guarantor.shares}
                          onChange={(e) => updateGuarantor(index, "shares", e.target.value)}
                          min="0"
                          required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Church Officials Section */}
            {activeSection === "officials" && (
              <div className="space-y-6">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-2">⛪ Church Officials (3 Required)</h3>
                  <p className="text-sm text-purple-800">Officials from your Local Church Council. They will receive email notifications.</p>
                </div>

                {churchOfficials.map((official, index) => (
                  <div key={index} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                    <h4 className="font-semibold text-gray-800 mb-4">Church Official {index + 1}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={official.name}
                          onChange={(e) => updateChurchOfficial(index, "name", e.target.value)}
                          required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ID Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={official.idNumber}
                          onChange={(e) => updateChurchOfficial(index, "idNumber", e.target.value)}
                          required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          value={official.phone}
                          onChange={(e) => updateChurchOfficial(index, "phone", e.target.value)}
                          placeholder="+254..."
                          required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={official.email}
                          onChange={(e) => updateChurchOfficial(index, "email", e.target.value)}
                          required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Position <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={official.position}
                          onChange={(e) => updateChurchOfficial(index, "position", e.target.value)}
                          placeholder="e.g., Chairman, Secretary"
                          required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Local Church <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={official.localChurch}
                          onChange={(e) => updateChurchOfficial(index, "localChurch", e.target.value)}
                          required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          County <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={official.county}
                          onChange={(e) => updateChurchOfficial(index, "county", e.target.value)}
                          required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          <option value="">Select County</option>
                          {getCounties().map(county => (
                            <option key={county} value={county}>{county}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Sub-County <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={official.location}
                          onChange={(e) => updateChurchOfficial(index, "location", e.target.value)}
                          required
                          disabled={!official.county}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                        >
                          <option value="">Select Sub-County</option>
                          {getSubCounties(official.county).map(subCounty => (
                            <option key={subCounty} value={subCounty}>{subCounty}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ward/Location <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={official.subLocation}
                          onChange={(e) => updateChurchOfficial(index, "subLocation", e.target.value)}
                          required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Witnesses Section */}
            {activeSection === "witnesses" && (
              <div className="space-y-6">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h3 className="font-semibold text-orange-900 mb-2">👨‍👩‍👧 Witnesses (2 Required)</h3>
                  <p className="text-sm text-orange-800">Spouse or Next of Kin. They will receive email notifications.</p>
                </div>

                {witnesses.map((witness, index) => (
                  <div key={index} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                    <h4 className="font-semibold text-gray-800 mb-4">Witness {index + 1}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={witness.name}
                          onChange={(e) => updateWitness(index, "name", e.target.value)}
                          required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ID Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={witness.idNumber}
                          onChange={(e) => updateWitness(index, "idNumber", e.target.value)}
                          required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          value={witness.phone}
                          onChange={(e) => updateWitness(index, "phone", e.target.value)}
                          placeholder="+254..."
                          required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={witness.email}
                          onChange={(e) => updateWitness(index, "email", e.target.value)}
                          required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          County <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={witness.county}
                          onChange={(e) => updateWitness(index, "county", e.target.value)}
                          required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          <option value="">Select County</option>
                          {getCounties().map(county => (
                            <option key={county} value={county}>{county}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Sub-County <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={witness.location}
                          onChange={(e) => updateWitness(index, "location", e.target.value)}
                          required
                          disabled={!witness.county}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                        >
                          <option value="">Select Sub-County</option>
                          {getSubCounties(witness.county).map(subCounty => (
                            <option key={subCounty} value={subCounty}>{subCounty}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ward/Location <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={witness.subLocation}
                          onChange={(e) => updateWitness(index, "subLocation", e.target.value)}
                          required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Place of Work <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={witness.placeOfWork}
                          onChange={(e) => updateWitness(index, "placeOfWork", e.target.value)}
                          required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="border-t bg-gray-50 px-6 py-4 flex justify-between items-center">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition font-semibold"
            >
              Cancel
            </button>
            
            <div className="flex gap-3">
              {activeSection !== "loan" && (
                <button
                  type="button"
                  onClick={() => {
                    const sections = ["loan", "guarantors", "officials", "witnesses"];
                    const currentIndex = sections.indexOf(activeSection);
                    setActiveSection(sections[currentIndex - 1]);
                  }}
                  className="px-6 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition font-semibold"
                >
                  Previous
                </button>
              )}
              
              {activeSection !== "witnesses" ? (
                <button
                  type="button"
                  onClick={() => {
                    const sections = ["loan", "guarantors", "officials", "witnesses"];
                    const currentIndex = sections.indexOf(activeSection);
                    setActiveSection(sections[currentIndex + 1]);
                  }}
                  className="px-6 py-2 rounded-lg bg-red-700 text-white hover:bg-red-800 transition font-semibold"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition font-semibold shadow-lg"
                >
                  Submit Application
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
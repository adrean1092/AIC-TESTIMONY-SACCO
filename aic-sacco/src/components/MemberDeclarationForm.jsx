import React, { useState } from "react";
import API from "../api";

export default function MemberDeclarationForm({ onComplete, memberData }) {
  const [formData, setFormData] = useState({
    fullName: memberData?.name || "",
    idNumber: "",
    phone: memberData?.phone || "",
    email: memberData?.email || "",
    date: new Date().toISOString().split('T')[0]
  });

  const [declarations, setDeclarations] = useState({
    membershipTerms: false,
    loanTerms: false,
    savingsTerms: false,
    dividendTerms: false,
    guarantorTerms: false,
    dataProtection: false,
    accurateInfo: false,
    regulationsCompliance: false
  });

  const [signature, setSignature] = useState("");
  const [loading, setLoading] = useState(false);

  const allDeclarationsChecked = Object.values(declarations).every(v => v === true);
  const formComplete = formData.fullName && formData.idNumber && formData.phone && 
                      formData.email && signature && allDeclarationsChecked;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formComplete) {
      alert("Please complete all fields and accept all declarations");
      return;
    }

    setLoading(true);
    try {
      await API.post("/members/submit-declaration", {
        ...formData,
        declarations,
        signature,
        submittedAt: new Date().toISOString()
      });
      
      alert("Declaration submitted successfully!");
      onComplete();
    } catch (error) {
      console.error("Error submitting declaration:", error);
      alert(error.response?.data?.message || "Failed to submit declaration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-red-700 text-white p-6">
          <h1 className="text-2xl font-bold text-center">AIC TESTIMONY SACCO</h1>
          <h2 className="text-xl font-semibold text-center mt-2">MEMBER DECLARATION FORM</h2>
          <p className="text-center text-red-100 mt-2">
            Please read and accept the following terms before proceeding
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Personal Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-blue-900 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-3"
                  placeholder="As per ID/Passport"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ID/Passport Number <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.idNumber}
                  onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-3"
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
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-3"
                  placeholder="0712345678"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-3"
                />
              </div>
            </div>
          </div>

          {/* Declarations */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-yellow-900 mb-4">
              Member Declarations & Acceptance of Terms
            </h3>
            <p className="text-sm text-gray-700 mb-4">
              By checking the boxes below, I hereby declare and accept:
            </p>

            <div className="space-y-4">
              {/* Membership Terms */}
              <label className="flex items-start space-x-3 cursor-pointer p-3 rounded hover:bg-yellow-100">
                <input
                  type="checkbox"
                  checked={declarations.membershipTerms}
                  onChange={(e) => setDeclarations({...declarations, membershipTerms: e.target.checked})}
                  className="mt-1 h-5 w-5 text-red-600 rounded"
                />
                <span className="text-sm text-gray-800">
                  <strong className="font-semibold">Membership Terms:</strong> I understand and accept all terms 
                  and conditions of membership in AIC Testimony SACCO as outlined in the constitution 
                  and by-laws.
                </span>
              </label>

              {/* Loan Terms */}
              <label className="flex items-start space-x-3 cursor-pointer p-3 rounded hover:bg-yellow-100">
                <input
                  type="checkbox"
                  checked={declarations.loanTerms}
                  onChange={(e) => setDeclarations({...declarations, loanTerms: e.target.checked})}
                  className="mt-1 h-5 w-5 text-red-600 rounded"
                />
                <span className="text-sm text-gray-800">
                  <strong className="font-semibold">Loan Terms & Interest:</strong> I understand that loans are 
                  calculated using a reducing balance method at the prevailing interest rate (currently 1.8% per month), 
                  with a 0.5% processing fee. I accept responsibility for timely repayment.
                </span>
              </label>

              {/* Savings Terms */}
              <label className="flex items-start space-x-3 cursor-pointer p-3 rounded hover:bg-yellow-100">
                <input
                  type="checkbox"
                  checked={declarations.savingsTerms}
                  onChange={(e) => setDeclarations({...declarations, savingsTerms: e.target.checked})}
                  className="mt-1 h-5 w-5 text-red-600 rounded"
                />
                <span className="text-sm text-gray-800">
                  <strong className="font-semibold">Savings & Shares:</strong> I understand that my loan limit 
                  is 3 times my savings balance. I commit to regular savings as per SACCO requirements.
                </span>
              </label>

              {/* Dividend Terms */}
              <label className="flex items-start space-x-3 cursor-pointer p-3 rounded hover:bg-yellow-100">
                <input
                  type="checkbox"
                  checked={declarations.dividendTerms}
                  onChange={(e) => setDeclarations({...declarations, dividendTerms: e.target.checked})}
                  className="mt-1 h-5 w-5 text-red-600 rounded"
                />
                <span className="text-sm text-gray-800">
                  <strong className="font-semibold">Dividends:</strong> I understand that dividends are declared 
                  annually based on SACCO performance and are distributed according to my savings contribution.
                </span>
              </label>

              {/* Guarantor Terms */}
              <label className="flex items-start space-x-3 cursor-pointer p-3 rounded hover:bg-yellow-100">
                <input
                  type="checkbox"
                  checked={declarations.guarantorTerms}
                  onChange={(e) => setDeclarations({...declarations, guarantorTerms: e.target.checked})}
                  className="mt-1 h-5 w-5 text-red-600 rounded"
                />
                <span className="text-sm text-gray-800">
                  <strong className="font-semibold">Guarantorship:</strong> I understand that loan applications 
                  require 3 SACCO member guarantors, 3 church council officials, and 2 witnesses (spouse/next of kin). 
                  I accept liability as a guarantor for other members when I guarantee their loans.
                </span>
              </label>

              {/* Data Protection */}
              <label className="flex items-start space-x-3 cursor-pointer p-3 rounded hover:bg-yellow-100">
                <input
                  type="checkbox"
                  checked={declarations.dataProtection}
                  onChange={(e) => setDeclarations({...declarations, dataProtection: e.target.checked})}
                  className="mt-1 h-5 w-5 text-red-600 rounded"
                />
                <span className="text-sm text-gray-800">
                  <strong className="font-semibold">Data Protection:</strong> I consent to the processing of my 
                  personal data by the SACCO for membership, financial services, and communication purposes in 
                  accordance with data protection laws.
                </span>
              </label>

              {/* Accurate Information */}
              <label className="flex items-start space-x-3 cursor-pointer p-3 rounded hover:bg-yellow-100">
                <input
                  type="checkbox"
                  checked={declarations.accurateInfo}
                  onChange={(e) => setDeclarations({...declarations, accurateInfo: e.target.checked})}
                  className="mt-1 h-5 w-5 text-red-600 rounded"
                />
                <span className="text-sm text-gray-800">
                  <strong className="font-semibold">Accurate Information:</strong> I declare that all information 
                  provided is true, accurate, and complete to the best of my knowledge. I will promptly notify the 
                  SACCO of any changes to my personal details.
                </span>
              </label>

              {/* Regulations Compliance */}
              <label className="flex items-start space-x-3 cursor-pointer p-3 rounded hover:bg-yellow-100">
                <input
                  type="checkbox"
                  checked={declarations.regulationsCompliance}
                  onChange={(e) => setDeclarations({...declarations, regulationsCompliance: e.target.checked})}
                  className="mt-1 h-5 w-5 text-red-600 rounded"
                />
                <span className="text-sm text-gray-800">
                  <strong className="font-semibold">Compliance:</strong> I agree to abide by all SACCO regulations, 
                  policies, and decisions made by the management committee and annual general meeting.
                </span>
              </label>
            </div>
          </div>

          {/* Signature Section */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-green-900 mb-4">Electronic Signature</h3>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Type your full name as electronic signature <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 font-serif text-lg"
                placeholder="Your Full Name"
              />
              <p className="text-xs text-gray-600 mt-2">
                By typing your name above, you agree that this constitutes your legal signature
              </p>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full border border-gray-300 rounded-lg p-3"
                readOnly
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            {!allDeclarationsChecked && (
              <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
                <p className="text-sm text-red-800">
                  âš ï¸ Please accept all declarations to proceed
                </p>
              </div>
            )}
            
            <button
              type="submit"
              disabled={!formComplete || loading}
              className={`w-full py-4 rounded-lg font-bold text-lg transition ${
                formComplete && !loading
                  ? 'bg-red-700 text-white hover:bg-red-800 shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {loading ? "Submitting..." : "Submit Declaration & Continue to Dashboard"}
            </button>

            <p className="text-xs text-center text-gray-600 mt-4">
              By submitting this form, you confirm that you have read, understood, and agreed to all 
              the terms and conditions stated above.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
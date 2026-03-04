import React, { useState, useEffect } from "react";
import API from "../api";

export default function DividendsManagement() {
  const [declarations, setDeclarations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeclareModal, setShowDeclareModal] = useState(false);
  const [selectedDeclaration, setSelectedDeclaration] = useState(null);
  const [showAllocations, setShowAllocations] = useState(false);
  const [allocations, setAllocations] = useState([]);

  // Form state for declaring dividends
  const [declareForm, setDeclareForm] = useState({
    financialYear: new Date().getFullYear().toString(),
    dividendRate: "",
    notes: ""
  });

  useEffect(() => {
    loadDeclarations();
  }, []);

  const loadDeclarations = async () => {
    setLoading(true);
    try {
      const res = await API.get("/admin/dividends/declarations");
      setDeclarations(res.data);
    } catch (error) {
      console.error("Error loading declarations:", error);
      alert("Failed to load dividend declarations");
    } finally {
      setLoading(false);
    }
  };

  const handleDeclare = async (e) => {
    e.preventDefault();

    if (!declareForm.dividendRate || parseFloat(declareForm.dividendRate) <= 0) {
      alert("Please enter a valid dividend rate");
      return;
    }

    if (parseFloat(declareForm.dividendRate) > 20) {
      alert("Dividend rate cannot exceed 20%");
      return;
    }

    try {
      await API.post("/admin/dividends/declare", {
        financialYear: declareForm.financialYear,
        dividendRate: parseFloat(declareForm.dividendRate),
        notes: declareForm.notes
      });

      alert("Dividends declared successfully!");
      setShowDeclareModal(false);
      setDeclareForm({ 
        financialYear: new Date().getFullYear().toString(), 
        dividendRate: "", 
        notes: "" 
      });
      loadDeclarations();
    } catch (error) {
      console.error("Error declaring dividends:", error);
      alert(error.response?.data?.message || "Failed to declare dividends");
    }
  };

  const viewAllocations = async (declaration) => {
    try {
      const res = await API.get(`/admin/dividends/declaration/${declaration.id}`);
      setSelectedDeclaration(res.data.declaration);
      setAllocations(res.data.allocations);
      setShowAllocations(true);
    } catch (error) {
      console.error("Error loading allocations:", error);
      alert("Failed to load dividend allocations");
    }
  };

  const payDividends = async (declarationId) => {
    const confirmed = window.confirm(
      "Are you sure you want to pay out these dividends? This will credit all member savings accounts and cannot be undone."
    );

    if (!confirmed) return;

    try {
      const res = await API.post(`/admin/dividends/pay/${declarationId}`);
      alert(res.data.message || "Dividends paid successfully!");
      loadDeclarations();
      setShowAllocations(false);
    } catch (error) {
      console.error("Error paying dividends:", error);
      alert(error.response?.data?.message || "Failed to pay dividends");
    }
  };

  const deleteDeclaration = async (declarationId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this dividend declaration? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      await API.delete(`/admin/dividends/declaration/${declarationId}`);
      alert("Dividend declaration deleted successfully");
      loadDeclarations();
    } catch (error) {
      console.error("Error deleting declaration:", error);
      alert(error.response?.data?.message || "Failed to delete declaration");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Dividends Management</h2>
          <p className="text-sm text-gray-500">Declare and manage annual dividend distributions</p>
        </div>
        <button
          onClick={() => setShowDeclareModal(true)}
          className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition shadow-lg"
        >
          📊 Declare Dividends
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ How Dividends Work</h3>
        <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
          <li>Dividends are calculated as a percentage of each member's savings balance</li>
          <li>Declare dividends annually after the AGM based on SACCO performance</li>
          <li>Once declared, dividends can be paid out to credit member savings accounts</li>
          <li>Paid dividends automatically increase member loan limits (3x savings)</li>
        </ul>
      </div>

      {/* Declarations List */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 bg-purple-50 border-b">
          <h3 className="font-semibold text-purple-900">Dividend Declarations</h3>
        </div>

        {loading && (
          <div className="p-8 text-center text-gray-600">
            Loading declarations...
          </div>
        )}

        {!loading && declarations.length === 0 && (
          <div className="p-8 text-center text-gray-600">
            <p className="mb-2">No dividend declarations yet.</p>
            <p className="text-sm text-gray-500">Click "Declare Dividends" to create your first declaration.</p>
          </div>
        )}

        {!loading && declarations.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rate</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total Savings</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total Dividend</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Declaration Date</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {declarations.map((dec) => (
                  <tr key={dec.id} className="hover:bg-purple-50 transition">
                    <td className="px-6 py-4 text-sm font-bold text-purple-700">
                      {dec.financialYear}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {dec.dividendRate}%
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">
                      KES {dec.totalEligibleSavings.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-green-700">
                      KES {dec.totalDividendAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        dec.paymentStatus === 'PAID' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {dec.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-center text-gray-600">
                      {new Date(dec.declarationDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => viewAllocations(dec)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                        >
                          View Details
                        </button>
                        {dec.paymentStatus !== 'PAID' && (
                          <>
                            <button
                              onClick={() => payDividends(dec.id)}
                              className="text-green-600 hover:text-green-800 text-sm font-semibold"
                            >
                              Pay Out
                            </button>
                            <button
                              onClick={() => deleteDeclaration(dec.id)}
                              className="text-red-600 hover:text-red-800 text-sm font-semibold"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Declare Dividends Modal */}
      {showDeclareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
            <div className="bg-purple-700 text-white p-6 rounded-t-lg">
              <h3 className="text-xl font-bold">Declare Dividends</h3>
              <p className="text-purple-100 text-sm mt-1">Set dividend rate for the financial year</p>
            </div>

            <form onSubmit={handleDeclare} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Financial Year <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={declareForm.financialYear}
                  onChange={(e) => setDeclareForm({...declareForm, financialYear: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-3"
                  placeholder="e.g., 2024"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Dividend Rate (%) <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  max="20"
                  required
                  value={declareForm.dividendRate}
                  onChange={(e) => setDeclareForm({...declareForm, dividendRate: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-3"
                  placeholder="e.g., 10.5"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Percentage of savings to distribute as dividends (max 20%)
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={declareForm.notes}
                  onChange={(e) => setDeclareForm({...declareForm, notes: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-3"
                  rows="3"
                  placeholder="Additional notes about this dividend declaration..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDeclareModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition"
                >
                  Declare Dividends
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Allocations Modal */}
      {showAllocations && selectedDeclaration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-purple-700 text-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">
                    Dividend Allocations - {selectedDeclaration.financialYear}
                  </h3>
                  <p className="text-purple-100 text-sm mt-1">
                    {selectedDeclaration.dividendRate}% dividend on KES {selectedDeclaration.totalEligibleSavings.toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setShowAllocations(false)}
                  className="text-white hover:text-purple-200 text-3xl font-bold leading-none"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">SACCO #</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Member</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Savings</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Dividend</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {allocations.map((alloc) => (
                      <tr key={alloc.id} className="hover:bg-purple-50">
                        <td className="px-4 py-3 text-sm font-bold text-red-700">
                          {alloc.saccoNumber}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-gray-900">{alloc.memberName}</div>
                          <div className="text-xs text-gray-500">{alloc.email}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                          KES {alloc.savingsAmount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-green-700">
                          KES {alloc.dividendAmount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            alloc.paymentStatus === 'PAID' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {alloc.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Total Members: <span className="font-bold">{allocations.length}</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAllocations(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-100 transition"
                >
                  Close
                </button>
                {selectedDeclaration.paymentStatus !== 'PAID' && (
                  <button
                    onClick={() => payDividends(selectedDeclaration.id)}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
                  >
                    Pay Out Dividends
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
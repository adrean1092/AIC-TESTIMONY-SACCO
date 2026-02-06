import React, { useState, useEffect } from "react";
import API from "../api";

export default function DividendsManagement() {
  const [activeView, setActiveView] = useState("declarations"); // declarations, declare-new, view-details
  const [declarations, setDeclarations] = useState([]);
  const [selectedDeclaration, setSelectedDeclaration] = useState(null);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Form state for new declaration
  const [newDeclaration, setNewDeclaration] = useState({
    financialYear: new Date().getFullYear(),
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

  const handleDeclareNewDividend = async (e) => {
    e.preventDefault();
    
    if (!newDeclaration.financialYear || !newDeclaration.dividendRate) {
      alert("Please fill in all required fields");
      return;
    }

    if (parseFloat(newDeclaration.dividendRate) <= 0 || parseFloat(newDeclaration.dividendRate) > 20) {
      alert("Dividend rate must be between 0.1% and 20%");
      return;
    }

    setLoading(true);
    try {
      const res = await API.post("/admin/dividends/declare", newDeclaration);
      alert(`Dividends declared successfully for ${res.data.declaration.financialYear}!\n\n` +
            `Total Members: ${res.data.declaration.membersCount}\n` +
            `Total Amount: KES ${res.data.declaration.totalDividendAmount.toLocaleString()}`);
      
      setNewDeclaration({
        financialYear: new Date().getFullYear(),
        dividendRate: "",
        notes: ""
      });
      setActiveView("declarations");
      loadDeclarations();
    } catch (error) {
      console.error("Error declaring dividends:", error);
      alert(error.response?.data?.message || "Failed to declare dividends");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (declarationId) => {
    setLoading(true);
    try {
      const res = await API.get(`/admin/dividends/declaration/${declarationId}`);
      setSelectedDeclaration(res.data.declaration);
      setAllocations(res.data.allocations);
      setActiveView("view-details");
    } catch (error) {
      console.error("Error loading declaration details:", error);
      alert("Failed to load declaration details");
    } finally {
      setLoading(false);
    }
  };

  const handlePayDividends = async (declarationId) => {
    if (!window.confirm("Are you sure you want to pay these dividends? This action will credit all member accounts and cannot be undone.")) {
      return;
    }

    setLoading(true);
    try {
      const res = await API.post(`/admin/dividends/pay/${declarationId}`);
      alert(`Dividends paid successfully!\n\n` +
            `Members Paid: ${res.data.stats.membersPaid}\n` +
            `Total Amount: KES ${res.data.stats.totalAmount.toLocaleString()}`);
      
      loadDeclarations();
      if (selectedDeclaration?.id === declarationId) {
        handleViewDetails(declarationId);
      }
    } catch (error) {
      console.error("Error paying dividends:", error);
      alert(error.response?.data?.message || "Failed to pay dividends");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDeclaration = async (declarationId) => {
    if (!window.confirm("Are you sure you want to delete this dividend declaration? This action cannot be undone.")) {
      return;
    }

    setLoading(true);
    try {
      await API.delete(`/admin/dividends/declaration/${declarationId}`);
      alert("Dividend declaration deleted successfully");
      loadDeclarations();
      if (activeView === "view-details") {
        setActiveView("declarations");
      }
    } catch (error) {
      console.error("Error deleting declaration:", error);
      alert(error.response?.data?.message || "Failed to delete declaration");
    } finally {
      setLoading(false);
    }
  };

  const renderDeclarationsList = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Dividend Declarations</h2>
        <button
          onClick={() => setActiveView("declare-new")}
          className="bg-red-700 text-white px-6 py-2 rounded-lg hover:bg-red-800 transition font-semibold"
        >
          + Declare New Dividend
        </button>
      </div>

      {loading && <p className="text-gray-600">Loading...</p>}

      {!loading && declarations.length === 0 && (
        <div className="bg-gray-50 p-8 rounded-lg text-center">
          <p className="text-gray-600">No dividend declarations yet.</p>
          <button
            onClick={() => setActiveView("declare-new")}
            className="mt-4 text-red-700 hover:underline font-semibold"
          >
            Declare your first dividend
          </button>
        </div>
      )}

      {!loading && declarations.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Financial Year
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dividend Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Declaration Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {declarations.map((declaration) => (
                <tr key={declaration.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {declaration.financialYear}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {declaration.dividendRate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    KES {declaration.totalDividendAmount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(declaration.declarationDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      declaration.paymentStatus === 'PAID' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {declaration.paymentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => handleViewDetails(declaration.id)}
                      className="text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      View Details
                    </button>
                    {declaration.paymentStatus === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handlePayDividends(declaration.id)}
                          className="text-green-600 hover:text-green-800 font-semibold"
                          disabled={loading}
                        >
                          Pay Dividends
                        </button>
                        <button
                          onClick={() => handleDeleteDeclaration(declaration.id)}
                          className="text-red-600 hover:text-red-800 font-semibold"
                          disabled={loading}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderDeclareNewForm = () => (
    <div>
      <div className="mb-6">
        <button
          onClick={() => setActiveView("declarations")}
          className="text-red-700 hover:underline font-semibold"
        >
          ← Back to Declarations
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-8 max-w-2xl">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Declare New Dividend</h2>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ About Dividend Rates</h3>
          <p className="text-sm text-blue-800 mb-2">
            Typical SACCO dividend rates in Kenya range from 8% to 12% annually, based on the SACCO's financial performance.
          </p>
          <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
            <li>Conservative SACCOs: 8-9%</li>
            <li>Standard performing SACCOs: 10-11%</li>
            <li>High-performing SACCOs: 12-15%</li>
          </ul>
        </div>

        <form onSubmit={handleDeclareNewDividend} className="space-y-6">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Financial Year *
            </label>
            <input
              type="number"
              min="2020"
              max="2100"
              value={newDeclaration.financialYear}
              onChange={(e) => setNewDeclaration({...newDeclaration, financialYear: parseInt(e.target.value)})}
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-red-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              The year for which dividends are being declared (e.g., 2024)
            </p>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Dividend Rate (%) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.1"
              max="20"
              value={newDeclaration.dividendRate}
              onChange={(e) => setNewDeclaration({...newDeclaration, dividendRate: e.target.value})}
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-red-500"
              placeholder="e.g., 10.5"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the dividend rate as a percentage (0.1% - 20%)
            </p>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={newDeclaration.notes}
              onChange={(e) => setNewDeclaration({...newDeclaration, notes: e.target.value})}
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-red-500"
              rows="3"
              placeholder="Add any notes about this dividend declaration..."
            ></textarea>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setActiveView("declarations")}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-red-700 text-white py-3 rounded-lg font-semibold hover:bg-red-800 transition"
              disabled={loading}
            >
              {loading ? "Declaring..." : "Declare Dividend"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderDeclarationDetails = () => (
    <div>
      <div className="mb-6">
        <button
          onClick={() => setActiveView("declarations")}
          className="text-red-700 hover:underline font-semibold"
        >
          ← Back to Declarations
        </button>
      </div>

      {selectedDeclaration && (
        <>
          {/* Declaration Summary */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedDeclaration.financialYear} Dividend Declaration
                </h2>
                <p className="text-gray-600">
                  Declared on {new Date(selectedDeclaration.declarationDate).toLocaleDateString()}
                </p>
              </div>
              <span className={`px-4 py-2 text-sm font-semibold rounded-full ${
                selectedDeclaration.paymentStatus === 'PAID' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {selectedDeclaration.paymentStatus}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Dividend Rate</p>
                <p className="text-2xl font-bold text-blue-700">
                  {selectedDeclaration.dividendRate}%
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Total Eligible Savings</p>
                <p className="text-2xl font-bold text-green-700">
                  KES {selectedDeclaration.totalEligibleSavings.toLocaleString()}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Total Dividend Amount</p>
                <p className="text-2xl font-bold text-purple-700">
                  KES {selectedDeclaration.totalDividendAmount.toLocaleString()}
                </p>
              </div>
            </div>

            {selectedDeclaration.notes && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-semibold text-gray-700 mb-1">Notes:</p>
                <p className="text-gray-600">{selectedDeclaration.notes}</p>
              </div>
            )}

            {selectedDeclaration.paymentStatus === 'PENDING' && (
              <div className="mt-6">
                <button
                  onClick={() => handlePayDividends(selectedDeclaration.id)}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                  disabled={loading}
                >
                  {loading ? "Processing..." : "Pay All Dividends"}
                </button>
              </div>
            )}
          </div>

          {/* Member Allocations */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b">
              <h3 className="text-lg font-semibold text-gray-800">
                Member Allocations ({allocations.length} members)
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SACCO Number
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Savings Amount
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dividend Amount
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allocations.map((allocation) => (
                    <tr key={allocation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {allocation.memberName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {allocation.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {allocation.saccoNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        KES {allocation.savingsAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-green-600">
                        KES {allocation.dividendAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          allocation.paymentStatus === 'PAID' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {allocation.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                        {allocation.paymentDate 
                          ? new Date(allocation.paymentDate).toLocaleDateString()
                          : '-'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {activeView === "declarations" && renderDeclarationsList()}
      {activeView === "declare-new" && renderDeclareNewForm()}
      {activeView === "view-details" && renderDeclarationDetails()}
    </div>
  );
}
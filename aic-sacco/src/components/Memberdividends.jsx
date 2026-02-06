import React, { useState, useEffect } from "react";
import API from "../api";

export default function MemberDividends() {
  const [dividends, setDividends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalReceived, setTotalReceived] = useState(0);

  useEffect(() => {
    loadDividends();
  }, []);

  const loadDividends = async () => {
    setLoading(true);
    try {
      const res = await API.get("/members/dividends/my-dividends");
      setDividends(res.data.dividends);
      
      // Calculate total dividends received
      const total = res.data.dividends
        .filter(d => d.paymentStatus === 'PAID')
        .reduce((sum, d) => sum + d.dividendAmount, 0);
      setTotalReceived(total);
    } catch (error) {
      console.error("Error loading dividends:", error);
      alert("Failed to load dividend history");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg shadow-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">My Dividends</h2>
        <p className="text-purple-100">
          View your dividend history and earnings from SACCO profits
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Total Dividends Received</p>
            <p className="text-3xl font-bold text-green-700">
              KES {totalReceived.toLocaleString()}
            </p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Total Declarations</p>
            <p className="text-3xl font-bold text-blue-700">
              {dividends.length}
            </p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Paid Dividends</p>
            <p className="text-3xl font-bold text-purple-700">
              {dividends.filter(d => d.paymentStatus === 'PAID').length}
            </p>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">💡 About Dividends</h3>
        <p className="text-sm text-blue-800 mb-2">
          Dividends are your share of the SACCO's profits, distributed annually after the AGM 
          based on your savings balance at the end of the financial year.
        </p>
        <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
          <li>Dividends are calculated as a percentage of your savings</li>
          <li>Paid dividends are automatically added to your savings account</li>
          <li>Your loan limit increases when dividends are paid (3x savings rule)</li>
        </ul>
      </div>

      {/* Dividends History */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Dividend History</h3>
        </div>

        {loading && (
          <div className="p-8 text-center text-gray-600">
            Loading dividend history...
          </div>
        )}

        {!loading && dividends.length === 0 && (
          <div className="p-8 text-center text-gray-600">
            <p className="mb-2">No dividends declared yet.</p>
            <p className="text-sm text-gray-500">
              Dividends are typically declared annually after the AGM.
            </p>
          </div>
        )}

        {!loading && dividends.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Financial Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dividend Rate
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Your Savings
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dividend Amount
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Declaration Date
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dividends.map((dividend, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {dividend.financialYear}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {dividend.dividendRate}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      KES {dividend.savingsAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-green-600">
                      KES {dividend.dividendAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        dividend.paymentStatus === 'PAID' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {dividend.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600">
                      {new Date(dividend.declarationDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600">
                      {dividend.paymentDate 
                        ? new Date(dividend.paymentDate).toLocaleDateString()
                        : '-'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Explanation Section */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-gray-800 mb-3">Understanding Your Dividends</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            <span className="font-semibold">Calculation:</span> Your dividend is calculated by multiplying 
            your savings balance (at year end) by the declared dividend rate.
          </p>
          <p>
            <span className="font-semibold">Example:</span> If you had KES 100,000 in savings and the 
            dividend rate is 10%, you would receive KES 10,000 in dividends.
          </p>
          <p>
            <span className="font-semibold">Payment:</span> Once paid, dividends are added directly to 
            your savings account, increasing both your savings balance and loan limit.
          </p>
        </div>
      </div>
    </div>
  );
}
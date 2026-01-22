import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    members: 0,
    totalLoans: 0,
    totalSavings: 0
  });

  useEffect(() => {
    fetch("http://localhost:5000/api/public/stats")
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error("Error fetching stats:", err));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-blue-50">
      {/* Header */}
      <header className="bg-red-700 text-white shadow-lg">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">AIC TESTIMONY PASTORS SACCO</h1>
          <button
            onClick={() => navigate("/login")}
            className="bg-white text-red-700 px-6 py-2 rounded-lg font-semibold hover:bg-red-50 transition"
          >
            Login
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16 text-center">
        <h2 className="text-5xl font-bold text-gray-800 mb-6">
          Building Financial Futures Together
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          A trusted community savings and credit cooperative society dedicated to empowering pastors
          through accessible financial services and support.
        </p>
        <button
          onClick={() => navigate("/login")}
          className="bg-red-700 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-red-800 transition shadow-lg"
        >
          Get Started
        </button>
      </section>

      {/* Stats Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-6">
          <h3 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Our Impact
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 bg-red-50 rounded-lg shadow">
              <div className="text-5xl font-bold text-red-700 mb-2">
                {stats.members}
              </div>
              <div className="text-gray-600 text-lg">Active Members</div>
            </div>

            <div className="text-center p-8 bg-blue-50 rounded-lg shadow">
              <div className="text-5xl font-bold text-blue-700 mb-2">
                KES {stats.totalLoans.toLocaleString()}
              </div>
              <div className="text-gray-600 text-lg">Total Loans Disbursed</div>
            </div>

            <div className="text-center p-8 bg-green-50 rounded-lg shadow">
              <div className="text-5xl font-bold text-green-700 mb-2">
                KES {stats.totalSavings.toLocaleString()}
              </div>
              <div className="text-gray-600 text-lg">Total Savings</div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="container mx-auto px-6 py-16">
        <h3 className="text-3xl font-bold text-center text-gray-800 mb-12">
          Our Services
        </h3>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h4 className="text-xl font-bold text-red-700 mb-3">Savings Accounts</h4>
            <p className="text-gray-600">
              Build your financial security with flexible savings options designed for your needs.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h4 className="text-xl font-bold text-red-700 mb-3">Quick Loans</h4>
            <p className="text-gray-600">
              Access loans up to 3x your savings with competitive interest rates and flexible repayment.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h4 className="text-xl font-bold text-red-700 mb-3">Financial Advisory</h4>
            <p className="text-gray-600">
              Get expert guidance on managing your finances and planning for the future.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h4 className="text-xl font-bold text-red-700 mb-3">Community Support</h4>
            <p className="text-gray-600">
              Join a supportive community of pastors building financial stability together.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-6 text-center">
          <p className="text-gray-400">
            © 2025 AIC Testimony SACCO. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
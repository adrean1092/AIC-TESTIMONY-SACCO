import { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import HomePage from "./components/HomePage";
import LoginPage from "./components/LoginPage";
import AdminDashboard from "./components/AdminDashboard";
import MemberDashboard from "./components/MemberDashboard";
import API, { setAuthToken } from "./api";

export default function App() {
  const [auth, setAuth] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check for existing token on app load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const userStr = localStorage.getItem('user');
    
    if (token && role && userStr) {
      try {
        const user = JSON.parse(userStr);
        setAuth({ token, role, user });
        setAuthToken(token);
      } catch (err) {
        console.error("Failed to restore session:", err);
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = ({ token, role, user }) => {
    setAuth({ token, role, user });
    setAuthToken(token);
    localStorage.setItem('role', role);
    localStorage.setItem('user', JSON.stringify(user));
    
    // Navigate to appropriate dashboard
    if (role === "ADMIN") {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
  };

  const handleLogout = () => {
    setAuth(null);
    setDashboardData(null);
    setAuthToken(null);
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    navigate("/");
  };

  useEffect(() => {
    if (!auth) return;

    const fetchDashboard = async () => {
      try {
        if (auth.role === "ADMIN") {
          setDashboardData({ role: "ADMIN" });
        } else {
          const res = await API.get("/members/me");
          setDashboardData(res.data);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        if (err.response?.status === 401) {
          alert("Session expired. Please login again.");
          handleLogout();
        } else {
          alert("Failed to fetch dashboard: " + err.message);
        }
      }
    };

    fetchDashboard();
  }, [auth]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-700 text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
      <Route 
        path="/admin" 
        element={
          auth?.role === "ADMIN" && dashboardData ? (
            <AdminDashboard data={dashboardData} onLogout={handleLogout} />
          ) : (
            <div className="min-h-screen flex items-center justify-center">
              <p className="text-red-700 text-lg">Loading...</p>
            </div>
          )
        } 
      />
      <Route 
        path="/dashboard" 
        element={
          auth?.role === "MEMBER" && dashboardData ? (
            <MemberDashboard data={dashboardData} onLogout={handleLogout} />
          ) : (
            <div className="min-h-screen flex items-center justify-center">
              <p className="text-red-700 text-lg">Loading...</p>
            </div>
          )
        } 
      />
    </Routes>
  );
}
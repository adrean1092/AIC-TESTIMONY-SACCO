import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./components/HomePage";
import LoginPage from "./components/LoginPage";
import MemberDashboard from "./components/MemberDashboard";
import AdminDashboard from "./components/AdminDashboard";
import MemberDeclarationForm from "./components/MemberDeclarationForm";
import API, { setAuthToken } from "./api";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsDeclaration, setNeedsDeclaration] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const storedUser = localStorage.getItem("user");

    if (token && role && storedUser) {
      setAuthToken(token);
      setUser({ token, role, user: JSON.parse(storedUser) });
      checkDeclarationStatus(role);
    } else {
      setLoading(false);
    }
  }, []);

  const checkDeclarationStatus = async (role) => {
    if (role === "MEMBER") {
      try {
        const res = await API.get("/members/me");
        if (!res.data.declarationAccepted) {
          setNeedsDeclaration(true);
        }
      } catch (error) {
        console.error("Error checking declaration status:", error);
      }
    }
    setLoading(false);
  };

  const handleLogin = async (loginData) => {
    const { token, role, user: userData } = loginData;
    
    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
    localStorage.setItem("user", JSON.stringify(userData));
    setAuthToken(token);
    
    setUser({ token, role, user: userData });
    
    // Check if member needs to complete declaration
    if (role === "MEMBER") {
      await checkDeclarationStatus(role);
    } else {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    setAuthToken(null);
    setUser(null);
    setNeedsDeclaration(false);
    // Force navigation to home page without requiring refresh
    window.location.href = "/";
  };

  const handleDeclarationComplete = () => {
    setNeedsDeclaration(false);
    // Refresh the page to load member dashboard
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-700 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/" 
        element={
          !user ? (
            <HomePage />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        } 
      />
      
      <Route 
        path="/login" 
        element={
          !user ? (
            <LoginPage onLogin={handleLogin} />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        } 
      />

      {/* Protected Dashboard Route */}
      <Route
        path="/dashboard"
        element={
          !user ? (
            <Navigate to="/login" replace />
          ) : needsDeclaration ? (
            <MemberDeclarationForm 
              onComplete={handleDeclarationComplete}
              memberData={user.user}
            />
          ) : user.role === "ADMIN" ? (
            <AdminDashboard onLogout={handleLogout} />
          ) : (
            <MemberDashboardWrapper onLogout={handleLogout} />
          )
        }
      />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Wrapper component to fetch member data
function MemberDashboardWrapper({ onLogout }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMemberData();
  }, []);

  const fetchMemberData = async () => {
    try {
      const res = await API.get("/members/me");
      setData(res.data);
    } catch (err) {
      console.error("Error fetching member data:", err);
      if (err.response?.status === 401) {
        onLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-700 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return <MemberDashboard data={data} onLogout={onLogout} />;
}
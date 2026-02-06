import axios from "axios";

// 🌐 Automatic Environment Detection
const isDevelopment = 
  import.meta.env.MODE === 'development' || 
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1';

// 📡 API Base URLs for each environment
const API_URLS = {
  development: "http://localhost:5000/api",
  production: "https://aic-testimony-sacco1.onrender.com/api"  // ✅ FIXED - added "1"
};

// Select the correct API URL based on environment
export const API_BASE_URL = isDevelopment ? API_URLS.development : API_URLS.production;

// Create axios instance with default config
const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔐 Helper function to set/remove auth token
export const setAuthToken = (token) => {
  if (token) {
    API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    localStorage.setItem("token", token);
  } else {
    delete API.defaults.headers.common["Authorization"];
    localStorage.removeItem("token");
  }
};

// 🚀 Request Interceptor - Add token to every request
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 🛡️ Response Interceptor - Handle errors globally
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized - Token expired or invalid
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("user");
      delete API.defaults.headers.common["Authorization"];
      
      // Redirect to login page
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// 🔧 Initialize token from localStorage on app load
const token = localStorage.getItem("token");
if (token) {
  setAuthToken(token);
}

// 📊 Log current configuration (helps with debugging)
console.log(`🌐 Environment: ${isDevelopment ? 'Development' : 'Production'}`);
console.log(`📡 API Base URL: ${API_BASE_URL}`);

export default API;
import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api", // replace with your backend URL
});

// Attach token automatically AND save to localStorage
export const setAuthToken = (token) => {
  if (token) {
    API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    localStorage.setItem('token', token); // ✅ SAVE TOKEN
  } else {
    delete API.defaults.headers.common["Authorization"];
    localStorage.removeItem('token'); // ✅ REMOVE TOKEN
  }
};

// ✅ INITIALIZE: Load token from localStorage on app startup
const savedToken = localStorage.getItem('token');
if (savedToken) {
  API.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;
}

export default API;
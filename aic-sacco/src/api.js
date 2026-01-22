import axios from "axios";

const API_BASE_URL = "https://aic-sacco-backend.onrender.com/api";

const API = axios.create({
  baseURL: API_BASE_URL,
});

export const setAuthToken = (token) => {
  if (token) {
    API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    localStorage.setItem("token", token);
  } else {
    delete API.defaults.headers.common["Authorization"];
    localStorage.removeItem("token");
  }
};

// Set token from localStorage on initialization
const token = localStorage.getItem("token");
if (token) {
  setAuthToken(token);
}

export default API;
import axios from "axios";

// Dynamically use the same host that served the frontend
// Works for both localhost and LAN access (e.g. 10.169.235.240:5173)
const isDevServer = window.location.port && window.location.port !== "8000";
const API_BASE =
  import.meta.env.VITE_API_URL ||
  (isDevServer
    ? `${window.location.protocol}//${window.location.hostname}:8000/api`
    : "/api");

const api = axios.create({
  baseURL: API_BASE,
});

// Attach the auth token to every request automatically.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

export default api;

import axios from "axios";

const STORAGE_KEY = "insytix-auth";

export function readAuth() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}
export function writeAuth(auth) {
  if (auth) localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
  else localStorage.removeItem(STORAGE_KEY);
}

// Base URL: same-origin /api (Vite proxies to the backend), overridable via env.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
});

// Attach the bearer token on every request.
api.interceptors.request.use((config) => {
  const auth = readAuth();
  if (auth?.token) config.headers.Authorization = `Bearer ${auth.token}`;
  return config;
});

// Unwrap the { success, data } envelope and normalise errors to Error(message).
api.interceptors.response.use(
  (res) => res.data?.data,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes("/auth/")) {
      writeAuth(null);
      if (!location.pathname.startsWith("/login")) location.href = "/login";
    }
    const message = err.response?.data?.message || err.message || "Request failed";
    return Promise.reject(new Error(message));
  }
);

export default api;

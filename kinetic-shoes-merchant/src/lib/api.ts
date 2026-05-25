// src/lib/api.ts
import axios from 'axios';

// Use NEXT_PUBLIC_API_URL if defined, otherwise default to localhost:5001/api
const configuredBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
const baseURL = configuredBaseUrl
  ? (configuredBaseUrl.endsWith('/api') ? configuredBaseUrl : `${configuredBaseUrl}/api`)
  : 'http://localhost:5001/api';

const api = axios.create({
  baseURL,
  withCredentials: true, // send httpOnly cookies
});


// Helper to get JWT from cookie (if needed for auth header)
function getTokenFromCookie(): string | null {
  const match = document.cookie.match(/token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

api.interceptors.request.use((config) => {
  const token = getTokenFromCookie();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export default api;

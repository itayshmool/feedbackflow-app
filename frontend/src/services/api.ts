// frontend/src/services/api.ts

import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Prevent hanging requests and reduce likelihood of browser aborts
  timeout: 15000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Read from Zustand's persisted storage
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        const token = parsed?.state?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (error) {
      // If parsing fails, continue without token
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Only clear storage, let React Router handle navigation
      // Don't do hard redirect - let the route guard handle it
      localStorage.removeItem('auth-storage');
    }
    return Promise.reject(error);
  }
);

export default api;

import axios from 'axios';

// Base URL - configurable for different environments
// Android emulator uses 10.0.2.2 for localhost
// iOS simulator uses localhost
// Physical device uses actual IP
const BASE_URL = 'http://10.0.2.2:3000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach token
api.interceptors.request.use(
  async (config) => {
    try {
      const SecureStore = require('expo-secure-store');
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // SecureStore not available (e.g. in web)
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      if (status === 401) {
        // Token expired or invalid - could trigger logout
        console.log('Unauthorized - token may be expired');
      }
      const message = data?.error?.message || data?.message || 'Terjadi kesalahan pada server';
      return Promise.reject(new Error(message));
    } else if (error.request) {
      return Promise.reject(new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'));
    } else {
      return Promise.reject(new Error('Terjadi kesalahan. Silakan coba lagi.'));
    }
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
};

// Attendance API
export const attendanceAPI = {
  getAll: (params) => api.get('/attendance', { params }),
  getMy: (params) => api.get('/attendance/my', { params }),
  getStats: (params) => api.get('/attendance/stats', { params }),
  create: (data) => api.post('/attendance', data),
  update: (id, data) => api.put(`/attendance/${id}`, data),
  delete: (id) => api.delete(`/attendance/${id}`),
};

// QR Code API
export const qrAPI = {
  generate: (data) => api.post('/qr/generate', data),
  getActive: () => api.get('/qr/active'),
  scan: (data) => api.post('/qr/scan', data),
};

// Reports API
export const reportsAPI = {
  getSummary: (params) => api.get('/reports/summary', { params }),
  getEmployeeReport: (uid, params) => api.get(`/reports/employee/${uid}`, { params }),
};

// Users API
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getOne: (uid) => api.get(`/users/${uid}`),
};

export default api;

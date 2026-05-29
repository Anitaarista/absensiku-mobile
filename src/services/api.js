import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// ========================================
// API Configuration - Uses Backend API with Firebase Admin SDK
// ========================================
const getApiUrl = () => {
  // Priority: Constants.expoConfig.extra.apiUrl > EXPO_PUBLIC_API_URL > default
  const extraApiUrl = Constants.expoConfig?.extra?.apiUrl;
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL;
  return extraApiUrl || envApiUrl || 'http://10.0.2.2:3000/api';
};

const API_BASE_URL = getApiUrl();

console.log('🔗 API Base URL:', API_BASE_URL);

// ========================================
// HTTP Helper Functions
// ========================================
const getToken = async () => {
  try {
    return await SecureStore.getItemAsync('auth_token');
  } catch (e) {
    return null;
  }
};

const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = await getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      const errorMessage = data.error?.message || 'Terjadi kesalahan pada server';
      const errorCode = data.error?.code || 'UNKNOWN_ERROR';
      const error = new Error(errorMessage);
      error.code = errorCode;
      error.status = response.status;
      throw error;
    }

    // Return in the same format as before: { data: { data } }
    return { data: { data: data.data } };
  } catch (error) {
    if (error.code) {
      // Already a formatted API error
      throw error;
    }
    // Network or fetch error
    console.error('API Request Error:', error.message);
    throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
  }
};

// ========================================
// Auth API
// ========================================
export const authAPI = {
  login: async (email, password) => {
    if (!email || !password) {
      throw new Error('Email dan password wajib diisi');
    }
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register: async (data) => {
    const { name, email, password, nip, jabatan, divisi, role } = data;
    if (!name || !email || !password) {
      throw new Error('Nama, email, dan password wajib diisi');
    }
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, nip, jabatan, divisi, role }),
    });
  },

  me: async () => {
    return apiRequest('/auth/me');
  },

  logout: async () => {
    try {
      return await apiRequest('/auth/logout', { method: 'POST' });
    } catch (e) {
      // Even if logout fails on server, we still clear local data
      return { data: { data: { message: 'Logout berhasil' } } };
    }
  },
};

// ========================================
// Attendance API
// ========================================
export const attendanceAPI = {
  getAll: async (params = {}) => {
    const { date, status, uid, limit } = params;
    const queryParams = new URLSearchParams();
    if (date) queryParams.append('date', date);
    if (status) queryParams.append('status', status);
    if (uid) queryParams.append('uid', uid);
    if (limit) queryParams.append('limit', limit);

    const query = queryParams.toString();
    return apiRequest(`/attendance${query ? `?${query}` : ''}`);
  },

  getMy: async (params = {}) => {
    const { date } = params;
    const queryParams = new URLSearchParams();
    if (date) queryParams.append('date', date);

    const query = queryParams.toString();
    return apiRequest(`/attendance/my${query ? `?${query}` : ''}`);
  },

  getStats: async (params = {}) => {
    const { date } = params;
    const queryParams = new URLSearchParams();
    if (date) queryParams.append('date', date);

    const query = queryParams.toString();
    return apiRequest(`/attendance/stats${query ? `?${query}` : ''}`);
  },

  create: async (data) => {
    const { uid, date, status, checkIn, checkOut, note } = data;
    if (!uid) {
      throw new Error('UID wajib diisi');
    }
    return apiRequest('/attendance', {
      method: 'POST',
      body: JSON.stringify({ uid, date, status, checkIn, checkOut, note }),
    });
  },

  update: async (id, data) => {
    const { status, checkOut, note } = data;
    return apiRequest(`/attendance/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status, checkOut, note }),
    });
  },

  delete: async (id) => {
    return apiRequest(`/attendance/${id}`, {
      method: 'DELETE',
    });
  },
};

// ========================================
// QR Code API
// ========================================
export const qrAPI = {
  generate: async (data = {}) => {
    const { validMinutes } = data;
    return apiRequest('/qr/generate', {
      method: 'POST',
      body: JSON.stringify({ validMinutes }),
    });
  },

  getActive: async () => {
    return apiRequest('/qr/active');
  },

  scan: async (data) => {
    const { code, uid } = data;
    if (!code) {
      throw new Error('Code wajib diisi');
    }
    return apiRequest('/qr/scan', {
      method: 'POST',
      body: JSON.stringify({ code, uid }),
    });
  },
};

// ========================================
// Reports API
// ========================================
export const reportsAPI = {
  getSummary: async (params = {}) => {
    const { month, year } = params;
    const queryParams = new URLSearchParams();
    if (month) queryParams.append('month', month);
    if (year) queryParams.append('year', year);

    const query = queryParams.toString();
    return apiRequest(`/reports/summary${query ? `?${query}` : ''}`);
  },

  getEmployeeReport: async (uid, params = {}) => {
    const { month, year } = params;
    const queryParams = new URLSearchParams();
    if (month) queryParams.append('month', month);
    if (year) queryParams.append('year', year);

    const query = queryParams.toString();
    return apiRequest(`/reports/employee/${uid}${query ? `?${query}` : ''}`);
  },
};

// ========================================
// Users API
// ========================================
export const usersAPI = {
  getAll: async (params = {}) => {
    const { role } = params;
    const queryParams = new URLSearchParams();
    if (role) queryParams.append('role', role);

    const query = queryParams.toString();
    return apiRequest(`/users${query ? `?${query}` : ''}`);
  },

  getOne: async (uid) => {
    return apiRequest(`/users/${uid}`);
  },

  create: async (data) => {
    return authAPI.register(data);
  },

  register: async (data) => {
    return authAPI.register(data);
  },
};

export default {
  auth: authAPI,
  attendance: attendanceAPI,
  qr: qrAPI,
  reports: reportsAPI,
  users: usersAPI,
};

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authAPI } from '../services/api';

// Export uid helper for API calls that need it
export const getAuthUid = async () => {
  try {
    const storedUser = await SecureStore.getItemAsync('auth_user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      return parsed?.uid || parsed?.id;
    }
  } catch (e) {}
  return null;
};

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = user?.role === 'admin';
  const isKaryawan = user?.role === 'karyawan';

  // Load stored auth data on mount
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedUser = await SecureStore.getItemAsync('auth_user');
      const storedToken = await SecureStore.getItemAsync('auth_token');
      if (storedUser && storedToken) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setToken(storedToken);
      }
    } catch (e) {
      console.log('Error loading auth data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAuthData = async (userData, authToken) => {
    try {
      await SecureStore.setItemAsync('auth_user', JSON.stringify(userData));
      await SecureStore.setItemAsync('auth_token', authToken);
    } catch (e) {
      console.log('Error saving auth data:', e);
    }
  };

  const clearAuthData = async () => {
    try {
      await SecureStore.deleteItemAsync('auth_user');
      await SecureStore.deleteItemAsync('auth_token');
    } catch (e) {
      console.log('Error clearing auth data:', e);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      const { user: userData, token: authToken } = response.data.data;
      setUser(userData);
      setToken(authToken);
      await saveAuthData(userData, authToken);
      return { success: true, user: userData };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Login gagal. Periksa email dan password Anda.',
      };
    }
  };

  const register = async (data) => {
    try {
      const response = await authAPI.register(data);
      const { user: userData, token: authToken } = response.data.data;
      setUser(userData);
      setToken(authToken);
      await saveAuthData(userData, authToken);
      return { success: true, user: userData };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Registrasi gagal. Silakan coba lagi.',
      };
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await clearAuthData();
  };

  const updateUser = (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    SecureStore.setItemAsync('auth_user', JSON.stringify(updatedUser)).catch(console.log);
  };

  const contextValue = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user,
    isAdmin,
    isKaryawan,
    login,
    register,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

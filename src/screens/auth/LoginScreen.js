import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { isValidEmail } from '../../utils/helpers';

const LoginScreen = () => {
  const { login, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Email wajib diisi';
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Format email tidak valid';
    }
    if (!password.trim()) {
      newErrors.password = 'Password wajib diisi';
    } else if (password.length < 6) {
      newErrors.password = 'Password minimal 6 karakter';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (!result.success) {
        Alert.alert('Login Gagal', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0D9488', '#0F766E', '#134E4A']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Ionicons name="finger-print" size={56} color="#FFFFFF" />
            </View>
            <Text style={styles.appName}>AbsensiKu</Text>
            <Text style={styles.tagline}>Sistem Absensi Digital</Text>
          </View>

          {/* Login Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Masuk ke Akun</Text>
            <Text style={styles.cardSubtitle}>
              Masukkan kredensial Anda untuk melanjutkan
            </Text>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#9CA3AF"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors({ ...errors, email: null });
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {errors.email ? (
              <Text style={styles.errorText}>{errors.email}</Text>
            ) : null}

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#9CA3AF"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors({ ...errors, password: null });
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>
            {errors.password ? (
              <Text style={styles.errorText}>{errors.password}</Text>
            ) : null}

            {/* Login Button */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#0D9488', '#0F766E']}
                style={styles.loginGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <Text style={styles.loginButtonText}>Memproses...</Text>
                ) : (
                  <Text style={styles.loginButtonText}>Masuk</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Role Info */}
          <View style={styles.roleInfo}>
            <View style={styles.roleRow}>
              <View style={styles.roleBadge}>
                <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                <Text style={styles.roleBadgeText}>Admin</Text>
              </View>
              <Text style={styles.roleDesc}>Kelola absensi & laporan</Text>
            </View>
            <View style={styles.roleDivider} />
            <View style={styles.roleRow}>
              <View style={styles.roleBadge}>
                <Ionicons name="person" size={16} color="#3B82F6" />
                <Text style={styles.roleBadgeText}>Karyawan</Text>
              </View>
              <Text style={styles.roleDesc}>Absen & riwayat kehadiran</Text>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 4,
    backgroundColor: '#F9FAFB',
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    paddingVertical: 0,
  },
  eyeButton: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginBottom: 8,
    marginLeft: 4,
  },
  loginButton: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  loginGradient: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  roleInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  roleDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  roleDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 12,
  },
});

export default LoginScreen;

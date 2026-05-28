import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const LoadingScreen = ({ message = 'Memuat...' }) => {
  return (
    <LinearGradient
      colors={['#0D9488', '#0F766E', '#134E4A']}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="finger-print" size={64} color="#FFFFFF" />
        </View>
        <Text style={styles.appName}>AbsensiKu</Text>
        <Text style={styles.tagline}>Sistem Absensi Digital</Text>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 40,
  },
  loaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  message: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});

export default LoadingScreen;

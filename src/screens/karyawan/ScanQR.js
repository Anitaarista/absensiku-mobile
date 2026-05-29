import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { qrAPI } from '../../services/api';

const ScanQR = () => {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { Camera } = require('expo-camera');
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      } catch (e) {
        setHasPermission(false);
        console.log('Camera permission error:', e);
      }
    })();
  }, []);

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || processing) return;

    setScanned(true);
    setProcessing(true);

    try {
      // Try to parse QR data as JSON to extract code
      let code = data;
      try {
        const parsed = JSON.parse(data);
        code = parsed.code || parsed.sessionCode || parsed.qrCode || data;
      } catch (e) {
        // Not JSON, use raw data as code
      }

      const response = await qrAPI.scan({
        code: code,
        uid: user?.uid || user?.id,
      });

      if (response.data?.data?.attendance) {
        setResult({
          success: true,
          message: 'Absensi berhasil dicatat!',
          data: response.data.data.attendance,
        });
      } else {
        setResult({
          success: true,
          message: response.data?.data?.message || 'Absensi berhasil dicatat!',
          data: response.data?.data,
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: error.message || 'Gagal memproses absensi. Silakan coba lagi.',
      });
    } finally {
      setProcessing(false);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setProcessing(false);
    setResult(null);
  };

  // No permission
  if (hasPermission === false) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="camera-outline" size={64} color="#D1D5DB" />
        <Text style={styles.permissionTitle}>Akses Kamera Ditolak</Text>
        <Text style={styles.permissionSubtext}>
          Aplikasi membutuhkan akses kamera untuk memindai QR Code. Silakan aktifkan izin kamera di pengaturan.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={resetScanner}>
          <Text style={styles.retryButtonText}>Coba Lagi</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Requesting permission
  if (hasPermission === null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0D9488" />
        <Text style={styles.loadingText}>Meminta akses kamera...</Text>
      </View>
    );
  }

  // Processing state
  if (processing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0D9488" />
        <Text style={styles.loadingText}>Memproses absensi...</Text>
      </View>
    );
  }

  // Result view
  if (result) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.resultContainer}>
          {result.success ? (
            <>
              <View style={styles.resultIconSuccess}>
                <Ionicons name="checkmark-circle" size={80} color="#10B981" />
              </View>
              <Text style={styles.resultTitleSuccess}>Berhasil!</Text>
              <Text style={styles.resultMessage}>{result.message}</Text>
              {result.data && (
                <View style={styles.resultDetails}>
                  {result.data.date && (
                    <Text style={styles.resultDetail}>Tanggal: {result.data.date}</Text>
                  )}
                  {result.data.checkIn && (
                    <Text style={styles.resultDetail}>Jam Masuk: {result.data.checkIn}</Text>
                  )}
                  {result.data.status && (
                    <Text style={styles.resultDetail}>Status: {result.data.status}</Text>
                  )}
                </View>
              )}
            </>
          ) : (
            <>
              <View style={styles.resultIconFail}>
                <Ionicons name="close-circle" size={80} color="#EF4444" />
              </View>
              <Text style={styles.resultTitleFail}>Gagal</Text>
              <Text style={styles.resultMessage}>{result.message}</Text>
            </>
          )}
        </View>

        <TouchableOpacity style={styles.scanAgainButton} onPress={resetScanner}>
          <LinearGradient
            colors={['#0D9488', '#0F766E']}
            style={styles.scanAgainGradient}
          >
            <Ionicons name="scan" size={22} color="#FFFFFF" />
            <Text style={styles.scanAgainText}>Scan Lagi</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  // Scanner view using CameraView from expo-camera
  return (
    <View style={styles.scannerContainer}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top */}
        <View style={styles.overlayTop}>
          <Text style={styles.overlayTitle}>Scan QR Code Absensi</Text>
          <Text style={styles.overlaySubtitle}>Arahkan kamera ke QR Code</Text>
        </View>

        {/* Center cutout area with corner markers */}
        <View style={styles.scanArea}>
          <View style={styles.scanAreaBorder}>
            {/* Top Left */}
            <View style={[styles.corner, styles.cornerTL]} />
            {/* Top Right */}
            <View style={[styles.corner, styles.cornerTR]} />
            {/* Bottom Left */}
            <View style={[styles.corner, styles.cornerBL]} />
            {/* Bottom Right */}
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>

        {/* Bottom */}
        <View style={styles.overlayBottom}>
          <TouchableOpacity style={styles.cancelButton} onPress={resetScanner}>
            <Text style={styles.cancelButtonText}>Batal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 20,
    marginBottom: 8,
  },
  permissionSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 16,
  },
  resultContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  resultIconSuccess: {
    marginBottom: 16,
  },
  resultIconFail: {
    marginBottom: 16,
  },
  resultTitleSuccess: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 8,
  },
  resultTitleFail: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 8,
  },
  resultMessage: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  resultDetails: {
    marginTop: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  resultDetail: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  scanAgainButton: {
    borderRadius: 14,
    overflow: 'hidden',
    width: '100%',
  },
  scanAgainGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
    borderRadius: 14,
  },
  scanAgainText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Scanner styles
  scannerContainer: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  overlayTop: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
  },
  overlayTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  overlaySubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  scanArea: {
    height: 250,
    marginHorizontal: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanAreaBorder: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#0D9488',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  overlayBottom: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ScanQR;

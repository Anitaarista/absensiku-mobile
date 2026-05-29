import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { qrAPI } from '../../services/api';
import { formatDateTime, formatDate, formatTime } from '../../utils/helpers';

const GenerateQR = () => {
  const [session, setSession] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActiveQR = useCallback(async () => {
    try {
      const response = await qrAPI.getActive();
      if (response.data?.data?.session) {
        setSession(response.data.data.session);
        setQrData(response.data.data.qrData || null);
      }
    } catch (error) {
      console.log('No active QR session');
    }
  }, []);

  useEffect(() => {
    fetchActiveQR();
  }, [fetchActiveQR]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await qrAPI.generate({
        validMinutes: 30,
      });
      if (response.data?.data) {
        setSession(response.data.data.session);
        setQrData(response.data.data.qrData || null);
        Alert.alert('Berhasil', 'QR Code absensi berhasil dibuat!');
      }
    } catch (error) {
      Alert.alert('Gagal', error.message || 'Gagal membuat QR Code');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchActiveQR();
    setRefreshing(false);
  };

  const isExpired = session?.expiresAt
    ? new Date(session.expiresAt) < new Date()
    : false;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color="#0D9488" />
          <Text style={styles.infoText}>
            Buat QR Code untuk sesi absensi. Karyawan dapat memindai kode ini untuk melakukan absensi.
          </Text>
        </View>

        {/* QR Display Area */}
        <View style={styles.qrSection}>
          {qrData ? (
            <View style={styles.qrContainer}>
              <QRCode
                value={qrData}
                size={220}
                color="#000000"
                backgroundColor="#FFFFFF"
              />
              {isExpired && (
                <View style={styles.expiredOverlay}>
                  <Ionicons name="close-circle" size={40} color="#EF4444" />
                  <Text style={styles.expiredText}>QR Expired</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.noQrContainer}>
              <Ionicons name="qr-code-outline" size={80} color="#D1D5DB" />
              <Text style={styles.noQrText}>Belum ada QR Code aktif</Text>
              <Text style={styles.noQrSubtext}>
                Tekan tombol di bawah untuk membuat QR Code baru
              </Text>
            </View>
          )}
        </View>

        {/* Session Info Card */}
        {session && (
          <View style={styles.sessionCard}>
            <Text style={styles.sessionTitle}>Informasi Sesi</Text>
            <View style={styles.sessionRow}>
              <Ionicons name="calendar-outline" size={18} color="#6B7280" />
              <Text style={styles.sessionLabel}>Tanggal</Text>
              <Text style={styles.sessionValue}>{formatDate(session.date || session.createdAt)}</Text>
            </View>
            <View style={styles.sessionRow}>
              <Ionicons name="time-outline" size={18} color="#6B7280" />
              <Text style={styles.sessionLabel}>Berlaku Hingga</Text>
              <Text style={styles.sessionValue}>
                {session.expiresAt ? formatDateTime(session.expiresAt) : '-'}
              </Text>
            </View>
            <View style={styles.sessionRow}>
              <Ionicons name="key-outline" size={18} color="#6B7280" />
              <Text style={styles.sessionLabel}>Kode</Text>
              <Text style={styles.sessionValue}>{session.code || '-'}</Text>
            </View>
            <View style={styles.sessionRow}>
              <Ionicons name="shield-outline" size={18} color="#6B7280" />
              <Text style={styles.sessionLabel}>Status</Text>
              {isExpired ? (
                <View style={styles.expiredBadge}>
                  <Text style={styles.expiredBadgeText}>EXPIRED</Text>
                </View>
              ) : (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>AKTIF</Text>
                </View>
              )}
            </View>
            {session.scannedCount !== undefined && (
              <View style={styles.sessionRow}>
                <Ionicons name="scan-outline" size={18} color="#6B7280" />
                <Text style={styles.sessionLabel}>Total Scan</Text>
                <Text style={styles.sessionValue}>{session.scannedCount} orang</Text>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.generateButton}
            onPress={handleGenerate}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#0D9488', '#0F766E']}
              style={styles.generateGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="qr-code" size={22} color="#FFFFFF" />
              <Text style={styles.generateText}>
                {loading ? 'Membuat...' : session ? 'Generate QR Baru' : 'Generate QR Code'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Tips Section */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Tips Penggunaan</Text>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.tipText}>QR Code berlaku 30 menit sejak dibuat</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.tipText}>Setiap karyawan hanya bisa scan 1x per sesi</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.tipText}>Buat QR baru jika yang lama sudah expired</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.tipText}>Tampilkan QR di layar untuk dipindai karyawan</Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#0F766E',
    lineHeight: 18,
  },
  qrSection: {
    alignItems: 'center',
    marginTop: 24,
  },
  qrContainer: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expiredText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#EF4444',
    marginTop: 8,
  },
  noQrContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noQrText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  noQrSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  sessionLabel: {
    fontSize: 14,
    color: '#6B7280',
    width: 110,
  },
  sessionValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  expiredBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  expiredBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  activeBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  actions: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  generateButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  generateGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 10,
    borderRadius: 14,
  },
  generateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tipsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 14,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  tipText: {
    fontSize: 13,
    color: '#6B7280',
  },
  bottomSpacer: {
    height: 40,
  },
});

export default GenerateQR;

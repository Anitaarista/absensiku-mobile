import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { attendanceAPI } from '../../services/api';
import AttendanceItem from '../../components/AttendanceItem';
import EmptyState from '../../components/EmptyState';
import {
  getGreeting,
  getInitials,
  getRandomColor,
  formatDate,
  formatTime,
  statusColors,
  statusLabels,
  statusBgColors,
} from '../../utils/helpers';

const KaryawanHome = ({ navigation }) => {
  const { user } = useAuth();
  const [todayRecord, setTodayRecord] = useState(null);
  const [recentRecords, setRecentRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const uid = user?.uid || user?.id;
      const response = await attendanceAPI.getMy({ uid, date: today });
      if (response.data?.data) {
        const records = response.data.data.records || [];
        const todayRec = records.find((r) => r.date === today);
        setTodayRecord(todayRec || null);
        setRecentRecords(records.slice(0, 5));
      }
    } catch (error) {
      console.log('Error fetching data:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const greeting = getGreeting();
  const initials = getInitials(user?.name);
  const avatarColor = getRandomColor(user?.name);
  const isCheckedIn = todayRecord && todayRecord.status?.toLowerCase() === 'hadir';

  const quickActions = [
    { icon: 'scan', title: 'Scan QR', screen: 'Scan QR', color: '#0D9488' },
    { icon: 'time', title: 'Riwayat', screen: 'Riwayat', color: '#7C3AED' },
    { icon: 'person', title: 'Profil', screen: 'Profil', color: '#EA580C' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Gradient Header */}
        <LinearGradient
          colors={['#0D9488', '#0F766E', '#134E4A']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <View style={[styles.headerAvatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={styles.headerAvatarText}>{initials}</Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.headerGreeting}>{greeting},</Text>
              <Text style={styles.headerName}>{user?.name || 'Karyawan'}</Text>
              <Text style={styles.headerNip}>NIP: {user?.nip || '-'}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Today Status Card */}
        <View style={styles.todayCard}>
          <View style={styles.todayHeader}>
            <Ionicons name="today-outline" size={20} color="#0D9488" />
            <Text style={styles.todayTitle}>Status Hari Ini</Text>
            <Text style={styles.todayDate}>{formatDate(new Date())}</Text>
          </View>

          {isCheckedIn ? (
            <View style={styles.checkedInContainer}>
              <View style={styles.checkedInIcon}>
                <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              </View>
              <Text style={styles.checkedInText}>Sudah Check In</Text>
              <Text style={styles.checkedInTime}>
                Jam Masuk: {todayRecord.checkIn ? formatTime(todayRecord.checkIn) : '-'}
              </Text>
              {todayRecord.checkOut && (
                <Text style={styles.checkedInTime}>
                  Jam Keluar: {formatTime(todayRecord.checkOut)}
                </Text>
              )}
              <View style={[styles.statusBadge, { backgroundColor: statusBgColors.hadir }]}>
                <Text style={[styles.statusText, { color: statusColors.hadir }]}>
                  {statusLabels.hadir}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.notCheckedInContainer}>
              <Ionicons name="close-circle-outline" size={48} color="#9CA3AF" />
              <Text style={styles.notCheckedInText}>Belum Check In</Text>
              <Text style={styles.notCheckedInSubtext}>
                Scan QR Code untuk melakukan absensi
              </Text>
              <TouchableOpacity
                style={styles.scanButton}
                onPress={() => navigation.navigate('Scan QR')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#0D9488', '#0F766E']}
                  style={styles.scanGradient}
                >
                  <Ionicons name="scan" size={20} color="#FFFFFF" />
                  <Text style={styles.scanButtonText}>Scan QR Sekarang</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Aksi Cepat</Text>
        </View>

        <View style={styles.quickActions}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionCard}
              onPress={() => navigation.navigate(action.screen)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color + '15' }]}>
                <Ionicons name={action.icon} size={24} color={action.color} />
              </View>
              <Text style={styles.actionTitle}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Attendance */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Riwayat Terbaru</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Riwayat')}>
            <Text style={styles.seeAll}>Lihat Semua</Text>
          </TouchableOpacity>
        </View>

        {recentRecords.length > 0 ? (
          recentRecords.map((item, index) => (
            <AttendanceItem key={item.id || index} item={item} />
          ))
        ) : (
          <EmptyState
            icon="time-outline"
            title="Belum Ada Riwayat"
            subtitle="Riwayat absensi Anda akan muncul di sini"
          />
        )}

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
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
  },
  headerGreeting: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  headerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 2,
  },
  headerNip: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  todayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 16,
    marginTop: -15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  todayTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  todayDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  checkedInContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  checkedInIcon: {
    marginBottom: 8,
  },
  checkedInText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 4,
  },
  checkedInTime: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 16,
    marginTop: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  notCheckedInContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  notCheckedInText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 4,
  },
  notCheckedInSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 16,
    textAlign: 'center',
  },
  scanButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  scanGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 8,
    borderRadius: 12,
  },
  scanButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  seeAll: {
    fontSize: 13,
    color: '#0D9488',
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  actionCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    width: '30%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  bottomSpacer: {
    height: 80,
  },
});

export default KaryawanHome;

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { attendanceAPI, usersAPI } from '../../services/api';
import CustomHeader from '../../components/CustomHeader';
import StatCard from '../../components/StatCard';
import AttendanceItem from '../../components/AttendanceItem';
import EmptyState from '../../components/EmptyState';
import { formatDate, statusColors, statusLabels } from '../../utils/helpers';

const AdminDashboard = ({ navigation }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [statsRes, attendanceRes] = await Promise.all([
        attendanceAPI.getStats({ date: today }),
        attendanceAPI.getAll({ date: today, limit: 5 }),
      ]);

      if (statsRes.data?.data) {
        setStats(statsRes.data.data.summary || null);
        setBreakdown(statsRes.data.data.breakdown || null);
      }
      if (attendanceRes.data?.data) {
        setTodayAttendance(attendanceRes.data.data.records || []);
      }
    } catch (error) {
      console.log('Error fetching dashboard data:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const statCards = stats
    ? [
        { icon: 'people', value: stats.totalEmployees || 0, title: 'Total Karyawan', color: '#0D9488' },
        { icon: 'checkmark-circle', value: breakdown?.hadir || 0, title: 'Hadir', color: '#10B981' },
        { icon: 'information-circle', value: breakdown?.izin || 0, title: 'Izin', color: '#F59E0B' },
        { icon: 'medkit', value: breakdown?.sakit || 0, title: 'Sakit', color: '#EF4444' },
        { icon: 'close-circle', value: breakdown?.alpha || 0, title: 'Alpha', color: '#6B7280' },
      ]
    : [
        { icon: 'people', value: '-', title: 'Total Karyawan', color: '#0D9488' },
        { icon: 'checkmark-circle', value: '-', title: 'Hadir', color: '#10B981' },
        { icon: 'information-circle', value: '-', title: 'Izin', color: '#F59E0B' },
        { icon: 'medkit', value: '-', title: 'Sakit', color: '#EF4444' },
        { icon: 'close-circle', value: '-', title: 'Alpha', color: '#6B7280' },
      ];

  const quickActions = [
    { icon: 'qr-code', title: 'Generate QR', screen: 'QR Code', colors: ['#0D9488', '#0F766E'] },
    { icon: 'person-add', title: 'Tambah Karyawan', screen: 'AddEmployee', colors: ['#7C3AED', '#6D28D9'] },
    { icon: 'bar-chart', title: 'Laporan', screen: 'Laporan', colors: ['#EA580C', '#C2410C'] },
  ];

  // 7-day trend data
  const trendData = breakdown?.weeklyTrend || [
    { day: 'Sen', hadir: 0 },
    { day: 'Sel', hadir: 0 },
    { day: 'Rab', hadir: 0 },
    { day: 'Kam', hadir: 0 },
    { day: 'Jum', hadir: 0 },
    { day: 'Sab', hadir: 0 },
    { day: 'Min', hadir: 0 },
  ];

  const maxTrend = Math.max(...trendData.map(d => d.hadir || 0), 1);

  const handleAttendancePress = (item) => {
    // Navigate to attendance detail if needed
  };

  return (
    <View style={styles.container}>
      <CustomHeader
        onPeoplePress={() => navigation.navigate('EmployeeList')}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Statistik Hari Ini</Text>
          <Text style={styles.sectionDate}>{formatDate(new Date())}</Text>
        </View>

        <View style={styles.statsGrid}>
          {statCards.map((item, index) => (
            <View key={index} style={styles.statCardWrapper}>
              <StatCard
                icon={item.icon}
                value={item.value}
                title={item.title}
                color={item.color}
              />
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Aksi Cepat</Text>
        </View>

        <View style={styles.quickActions}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionButton}
              onPress={() => {
                if (action.screen === 'AddEmployee' || action.screen === 'EmployeeList') {
                  navigation.navigate(action.screen);
                } else {
                  navigation.navigate(action.screen);
                }
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={action.colors}
                style={styles.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name={action.icon} size={24} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.actionTitle}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 7-Day Trend */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trend 7 Hari</Text>
        </View>

        <View style={styles.trendCard}>
          <View style={styles.trendChart}>
            {trendData.map((item, index) => (
              <View key={index} style={styles.trendBarItem}>
                <View style={styles.trendBarContainer}>
                  <View
                    style={[
                      styles.trendBar,
                      {
                        height: `${Math.max((item.hadir / maxTrend) * 100, 5)}%`,
                        backgroundColor: index === trendData.length - 1 ? '#0D9488' : '#99F6E4',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.trendLabel}>{item.day}</Text>
                <Text style={styles.trendValue}>{item.hadir}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Today's Attendance */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Absensi Hari Ini</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Absensi')}>
            <Text style={styles.seeAll}>Lihat Semua</Text>
          </TouchableOpacity>
        </View>

        {todayAttendance.length > 0 ? (
          todayAttendance.map((item, index) => (
            <AttendanceItem key={item.id || index} item={item} onPress={handleAttendancePress} />
          ))
        ) : (
          <EmptyState
            icon="calendar-outline"
            title="Belum Ada Absensi"
            subtitle="Data absensi hari ini akan muncul di sini"
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
  sectionDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  seeAll: {
    fontSize: 13,
    color: '#0D9488',
    fontWeight: '600',
  },
  statsGrid: {
    paddingHorizontal: 16,
    gap: 8,
  },
  statCardWrapper: {
    marginBottom: 4,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  actionButton: {
    alignItems: 'center',
    gap: 8,
  },
  actionGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#374151',
  },
  trendCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  trendChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  trendBarItem: {
    flex: 1,
    alignItems: 'center',
  },
  trendBarContainer: {
    width: 24,
    height: 90,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  trendBar: {
    width: '100%',
    borderRadius: 8,
    minHeight: 4,
  },
  trendLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 6,
  },
  trendValue: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
    marginTop: 2,
  },
  bottomSpacer: {
    height: 80,
  },
});

export default AdminDashboard;

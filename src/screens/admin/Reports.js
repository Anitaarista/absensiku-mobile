import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { reportsAPI } from '../../services/api';
import { statusColors, statusLabels, calculatePercentage, formatDate } from '../../utils/helpers';

const Reports = () => {
  const [summary, setSummary] = useState(null);
  const [dailyBreakdown, setDailyBreakdown] = useState([]);
  const [employeeBreakdown, setEmployeeBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      const now = new Date();
      const response = await reportsAPI.getSummary({
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      });
      if (response.data?.data) {
        setSummary(response.data.data.summary || null);
        setDailyBreakdown(response.data.data.dailyBreakdown || []);
        setEmployeeBreakdown(response.data.data.employeeBreakdown || []);
      }
    } catch (error) {
      console.log('Error fetching reports:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const now = new Date();
  const periodLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(now);

  const summaryStats = summary
    ? [
        { label: 'Total', value: summary.total || 0, color: '#0D9488', icon: 'calendar' },
        { label: 'Hadir', value: summary.hadir || 0, color: '#10B981', icon: 'checkmark-circle' },
        { label: 'Izin', value: summary.izin || 0, color: '#F59E0B', icon: 'information-circle' },
        { label: 'Sakit', value: summary.sakit || 0, color: '#EF4444', icon: 'medkit' },
        { label: 'Alpha', value: summary.alpha || 0, color: '#6B7280', icon: 'close-circle' },
      ]
    : [];

  const maxDaily = Math.max(...dailyBreakdown.map(d => d.hadir || 0), 1);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Period Card */}
        <View style={styles.periodCard}>
          <Ionicons name="calendar-outline" size={22} color="#0D9488" />
          <View style={styles.periodInfo}>
            <Text style={styles.periodLabel}>Periode Laporan</Text>
            <Text style={styles.periodValue}>{periodLabel}</Text>
          </View>
        </View>

        {/* Summary Stats */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ringkasan</Text>
        </View>

        <View style={styles.summaryGrid}>
          {summaryStats.map((stat, index) => (
            <View key={index} style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: stat.color + '15' }]}>
                <Ionicons name={stat.icon} size={20} color={stat.color} />
              </View>
              <Text style={[styles.summaryValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.summaryLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Daily Breakdown */}
        {dailyBreakdown.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Breakdown Harian</Text>
            </View>
            <View style={styles.dailyCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.dailyChart}>
                  {dailyBreakdown.map((item, index) => (
                    <View key={index} style={styles.dailyBarItem}>
                      <Text style={styles.dailyValue}>{item.hadir || 0}</Text>
                      <View style={styles.dailyBarContainer}>
                        <View
                          style={[
                            styles.dailyBar,
                            {
                              height: Math.max((item.hadir / maxDaily) * 80, 4),
                              backgroundColor: statusColors[item.dominantStatus] || '#0D9488',
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.dailyLabel}>{item.day}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          </>
        )}

        {/* Employee Breakdown */}
        {employeeBreakdown.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Breakdown per Karyawan</Text>
            </View>
            {employeeBreakdown.map((emp, index) => {
              const pct = calculatePercentage(emp.hadir, emp.total);
              return (
                <View key={index} style={styles.employeeCard}>
                  <View style={styles.employeeTop}>
                    <View style={styles.employeeAvatar}>
                      <Text style={styles.employeeAvatarText}>
                        {(emp.name || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.employeeInfo}>
                      <Text style={styles.employeeName}>{emp.name || '-'}</Text>
                      <Text style={styles.employeeNip}>{emp.nip || '-'}</Text>
                    </View>
                    <View style={styles.percentageCircle}>
                      <Text style={styles.percentageText}>{pct}%</Text>
                    </View>
                  </View>

                  <View style={styles.employeeStats}>
                    <View style={styles.miniStat}>
                      <View style={[styles.miniStatDot, { backgroundColor: '#10B981' }]} />
                      <Text style={styles.miniStatLabel}>Hadir</Text>
                      <Text style={styles.miniStatValue}>{emp.hadir || 0}</Text>
                    </View>
                    <View style={styles.miniStat}>
                      <View style={[styles.miniStatDot, { backgroundColor: '#F59E0B' }]} />
                      <Text style={styles.miniStatLabel}>Izin</Text>
                      <Text style={styles.miniStatValue}>{emp.izin || 0}</Text>
                    </View>
                    <View style={styles.miniStat}>
                      <View style={[styles.miniStatDot, { backgroundColor: '#EF4444' }]} />
                      <Text style={styles.miniStatLabel}>Sakit</Text>
                      <Text style={styles.miniStatValue}>{emp.sakit || 0}</Text>
                    </View>
                    <View style={styles.miniStat}>
                      <View style={[styles.miniStatDot, { backgroundColor: '#6B7280' }]} />
                      <Text style={styles.miniStatLabel}>Alpha</Text>
                      <Text style={styles.miniStatValue}>{emp.alpha || 0}</Text>
                    </View>
                  </View>

                  {/* Progress bar */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBackground}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${pct}%`, backgroundColor: pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444' },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {(!summary && !loading) && (
          <View style={styles.emptyContainer}>
            <Ionicons name="bar-chart-outline" size={56} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Belum Ada Data Laporan</Text>
            <Text style={styles.emptySubtitle}>Data laporan akan muncul setelah ada absensi</Text>
          </View>
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
  periodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  periodInfo: {
    flex: 1,
  },
  periodLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  periodValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 2,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    width: '31%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  dailyCard: {
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
  dailyChart: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
  },
  dailyBarItem: {
    alignItems: 'center',
    width: 40,
  },
  dailyValue: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  dailyBarContainer: {
    width: 28,
    height: 80,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  dailyBar: {
    width: '100%',
    borderRadius: 8,
    minHeight: 4,
  },
  dailyLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 6,
  },
  employeeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  employeeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  employeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0D9488',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  employeeAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  employeeNip: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  percentageCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#0D9488',
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0D9488',
  },
  employeeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  miniStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniStatDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  miniStatLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  miniStatValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  progressContainer: {
    marginTop: 4,
  },
  progressBackground: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  bottomSpacer: {
    height: 80,
  },
});

export default Reports;

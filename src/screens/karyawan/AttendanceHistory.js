import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { attendanceAPI } from '../../services/api';
import AttendanceItem from '../../components/AttendanceItem';
import EmptyState from '../../components/EmptyState';
import { statusColors } from '../../utils/helpers';

const AttendanceHistory = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [activeFilter, setActiveFilter] = useState('semua');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const filters = [
    { key: 'semua', label: 'Semua' },
    { key: 'hadir', label: 'Hadir' },
    { key: 'izin', label: 'Izin' },
    { key: 'sakit', label: 'Sakit' },
    { key: 'alpha', label: 'Alpha' },
  ];

  const fetchData = useCallback(async () => {
    try {
      const uid = user?.uid || user?.id;
      const response = await attendanceAPI.getMy({ uid });
      if (response.data?.data) {
        const data = response.data.data.records || [];
        setRecords(data);
        applyFilter(data, activeFilter);
      }
    } catch (error) {
      console.log('Error fetching history:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter, user?.uid]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const applyFilter = (data, filter) => {
    if (filter === 'semua') {
      setFilteredRecords(data);
    } else {
      setFilteredRecords(data.filter((item) => (item.status || '').toLowerCase() === filter));
    }
  };

  const handleFilter = (filter) => {
    setActiveFilter(filter);
    applyFilter(records, filter);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Calculate summary counts
  const counts = {
    hadir: records.filter((r) => (r.status || '').toLowerCase() === 'hadir').length,
    izin: records.filter((r) => (r.status || '').toLowerCase() === 'izin').length,
    sakit: records.filter((r) => (r.status || '').toLowerCase() === 'sakit').length,
    alpha: records.filter((r) => (r.status || '').toLowerCase() === 'alpha').length,
  };

  const miniCards = [
    { key: 'hadir', label: 'Hadir', count: counts.hadir, color: '#10B981', icon: 'checkmark-circle' },
    { key: 'izin', label: 'Izin', count: counts.izin, color: '#F59E0B', icon: 'information-circle' },
    { key: 'sakit', label: 'Sakit', count: counts.sakit, color: '#EF4444', icon: 'medkit' },
    { key: 'alpha', label: 'Alpha', count: counts.alpha, color: '#6B7280', icon: 'close-circle' },
  ];

  return (
    <View style={styles.container}>
      {/* Summary Row */}
      <View style={styles.summaryRow}>
        {miniCards.map((card) => (
          <View key={card.key} style={[styles.miniCard, { borderTopColor: card.color }]}>
            <Ionicons name={card.icon} size={18} color={card.color} />
            <Text style={[styles.miniCardCount, { color: card.color }]}>{card.count}</Text>
            <Text style={styles.miniCardLabel}>{card.label}</Text>
          </View>
        ))}
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterChip,
              activeFilter === filter.key && styles.filterChipActive,
            ]}
            onPress={() => handleFilter(filter.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === filter.key && styles.filterChipTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {filteredRecords.length > 0 ? (
        <FlatList
          data={filteredRecords}
          renderItem={({ item }) => <AttendanceItem item={item} />}
          keyExtractor={(item, index) => item.id || index.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <EmptyState
          icon="time-outline"
          title="Belum Ada Riwayat"
          subtitle="Riwayat absensi Anda akan muncul di sini"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  miniCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  miniCardCount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  miniCardLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  filterContainer: {
    marginTop: 14,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  filterChipText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 80,
  },
});

export default AttendanceHistory;

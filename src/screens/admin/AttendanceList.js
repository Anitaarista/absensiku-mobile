import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { attendanceAPI } from '../../services/api';
import AttendanceItem from '../../components/AttendanceItem';
import EmptyState from '../../components/EmptyState';
import { statusColors, statusLabels, statusBgColors, formatDateTime, formatDate, formatTime } from '../../utils/helpers';

const AttendanceList = () => {
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('semua');
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const filters = [
    { key: 'semua', label: 'Semua' },
    { key: 'hadir', label: 'Hadir' },
    { key: 'izin', label: 'Izin' },
    { key: 'sakit', label: 'Sakit' },
    { key: 'alpha', label: 'Alpha' },
  ];

  const fetchAttendance = useCallback(async () => {
    try {
      const response = await attendanceAPI.getAll();
      if (response.data?.data) {
        const data = response.data.data.records || [];
        setRecords(data);
        applyFilters(data, search, activeFilter);
      }
    } catch (error) {
      console.log('Error fetching attendance:', error.message);
    } finally {
      setLoading(false);
    }
  }, [search, activeFilter]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const applyFilters = (data, searchText, filter) => {
    let result = [...data];

    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      result = result.filter(
        (item) =>
          (item.userName || item.name || '').toLowerCase().includes(lower) ||
          (item.userNip || item.nip || '').toLowerCase().includes(lower)
      );
    }

    if (filter !== 'semua') {
      result = result.filter((item) => (item.status || '').toLowerCase() === filter);
    }

    setFilteredRecords(result);
  };

  const handleSearch = (text) => {
    setSearch(text);
    applyFilters(records, text, activeFilter);
  };

  const handleFilter = (filter) => {
    setActiveFilter(filter);
    applyFilters(records, search, filter);
  };

  const handleItemPress = (item) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  const handleDelete = (id) => {
    Alert.alert('Hapus Absensi', 'Apakah Anda yakin ingin menghapus data absensi ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await attendanceAPI.delete(id);
            setModalVisible(false);
            fetchAttendance();
          } catch (error) {
            Alert.alert('Gagal', error.message || 'Gagal menghapus data');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <AttendanceItem item={item} onPress={handleItemPress} />
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari nama atau NIP..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={handleSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
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

      {/* Results Count */}
      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>
          {filteredRecords.length} data ditemukan
        </Text>
      </View>

      {/* List */}
      {filteredRecords.length > 0 ? (
        <FlatList
          data={filteredRecords}
          renderItem={renderItem}
          keyExtractor={(item, index) => item.id || index.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <EmptyState
          icon="clipboard-outline"
          title="Tidak Ada Data Absensi"
          subtitle="Data absensi akan muncul di sini"
        />
      )}

      {/* Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detail Absensi</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Informasi Karyawan</Text>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Nama</Text>
                    <Text style={styles.modalValue}>{selectedItem.userName || selectedItem.name || '-'}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>NIP</Text>
                    <Text style={styles.modalValue}>{selectedItem.userNip || selectedItem.nip || '-'}</Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Informasi Absensi</Text>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Tanggal</Text>
                    <Text style={styles.modalValue}>{formatDate(selectedItem.date)}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Jam Masuk</Text>
                    <Text style={styles.modalValue}>
                      {selectedItem.checkIn ? formatTime(selectedItem.checkIn) : '-'}
                    </Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Jam Keluar</Text>
                    <Text style={styles.modalValue}>
                      {selectedItem.checkOut ? formatTime(selectedItem.checkOut) : '-'}
                    </Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Status</Text>
                    <View
                      style={[
                        styles.statusBadgeModal,
                        { backgroundColor: statusBgColors[selectedItem.status?.toLowerCase()] || '#F3F4F6' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusTextModal,
                          { color: statusColors[selectedItem.status?.toLowerCase()] || '#6B7280' },
                        ]}
                      >
                        {statusLabels[selectedItem.status?.toLowerCase()] || selectedItem.status}
                      </Text>
                    </View>
                  </View>
                  {selectedItem.note && (
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>Catatan</Text>
                      <Text style={styles.modalValue}>{selectedItem.note}</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(selectedItem.id)}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  <Text style={styles.deleteButtonText}>Hapus Data</Text>
                </TouchableOpacity>

                <View style={{ height: 20 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginTop: 16,
    height: 48,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    paddingVertical: 0,
  },
  filterContainer: {
    marginTop: 12,
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
  resultsRow: {
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  resultsText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0D9488',
    marginBottom: 12,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  modalLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
    textAlign: 'right',
  },
  statusBadgeModal: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusTextModal: {
    fontSize: 13,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
    gap: 8,
    marginTop: 8,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
});

export default AttendanceList;

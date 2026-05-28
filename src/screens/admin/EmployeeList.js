import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usersAPI } from '../../services/api';
import EmptyState from '../../components/EmptyState';
import { getRandomColor, getInitials } from '../../utils/helpers';

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await usersAPI.getAll({ role: 'karyawan' });
      if (response.data?.data) {
        setEmployees(response.data.data.users || []);
      }
    } catch (error) {
      console.log('Error fetching employees:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEmployees();
  };

  const renderItem = ({ item }) => {
    const initials = getInitials(item.name);
    const avatarColor = getRandomColor(item.name);

    return (
      <View style={styles.card}>
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.name || '-'}</Text>
          <Text style={styles.nip}>NIP: {item.nip || '-'}</Text>
          <Text style={styles.email}>{item.email || '-'}</Text>
        </View>
        <View style={styles.divisiBadge}>
          <Text style={styles.divisiText}>{item.divisi || '-'}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {employees.length > 0 ? (
        <FlatList
          data={employees}
          renderItem={renderItem}
          keyExtractor={(item, index) => item.uid || item.id || index.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <EmptyState
          icon="people-outline"
          title="Belum Ada Karyawan"
          subtitle="Tambahkan karyawan baru melalui menu Dashboard"
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
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  nip: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 1,
  },
  email: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  divisiBadge: {
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  divisiText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0D9488',
  },
});

export default EmployeeList;

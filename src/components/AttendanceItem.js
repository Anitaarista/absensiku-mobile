import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { statusColors, statusLabels, statusBgColors, getInitials, getRandomColor, formatTime } from '../utils/helpers';

const AttendanceItem = ({ item, onPress }) => {
  const status = item.status?.toLowerCase() || 'alpha';
  const initials = getInitials(item.userName || item.name);
  const avatarColor = getRandomColor(item.userName || item.name);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress && onPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.name} numberOfLines={1}>
          {item.userName || item.name || '-'}
        </Text>
        <Text style={styles.nip}>
          {item.userNip || item.nip || '-'}
        </Text>
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={12} color="#9CA3AF" />
          <Text style={styles.time}>
            {item.checkIn ? formatTime(item.checkIn) : '-'}
            {item.checkOut ? ` - ${formatTime(item.checkOut)}` : ''}
          </Text>
          <Text style={styles.date}>{item.date || '-'}</Text>
        </View>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: statusBgColors[status] || '#F3F4F6' }]}>
        <Ionicons
          name={status === 'hadir' ? 'checkmark-circle' : status === 'izin' ? 'information-circle' : status === 'sakit' ? 'medkit' : 'close-circle'}
          size={14}
          color={statusColors[status] || '#6B7280'}
        />
        <Text style={[styles.statusText, { color: statusColors[status] || '#6B7280' }]}>
          {statusLabels[status] || status}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoContainer: {
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
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  time: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  date: {
    fontSize: 11,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default AttendanceItem;

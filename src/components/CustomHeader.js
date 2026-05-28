import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getInitials, getRandomColor, getGreeting } from '../utils/helpers';

const CustomHeader = ({ onPeoplePress, onLogoutPress }) => {
  const { user, logout } = useAuth();
  const initials = getInitials(user?.name);
  const avatarColor = getRandomColor(user?.name);
  const greeting = getGreeting();

  const handleLogout = async () => {
    if (onLogoutPress) {
      onLogoutPress();
    } else {
      await logout();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>{greeting},</Text>
          <Text style={styles.userName}>{user?.name || 'Admin'}</Text>
        </View>
      </View>
      <View style={styles.rightSection}>
        {onPeoplePress && (
          <TouchableOpacity style={styles.iconButton} onPress={onPeoplePress}>
            <Ionicons name="people-outline" size={22} color="#374151" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.iconButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  greetingContainer: {
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 12,
    color: '#6B7280',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
});

export default CustomHeader;

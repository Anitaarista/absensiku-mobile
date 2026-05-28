import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getInitials, getRandomColor } from '../../utils/helpers';

const Profile = () => {
  const { user, logout } = useAuth();

  const initials = getInitials(user?.name);
  const avatarColor = getRandomColor(user?.name);

  const handleLogout = () => {
    Alert.alert('Keluar', 'Apakah Anda yakin ingin keluar dari akun?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const infoItems = [
    { icon: 'mail-outline', label: 'Email', value: user?.email || '-' },
    { icon: 'card-outline', label: 'NIP', value: user?.nip || '-' },
    { icon: 'briefcase-outline', label: 'Jabatan', value: user?.jabatan || '-' },
    { icon: 'business-outline', label: 'Divisi', value: user?.divisi || '-' },
    {
      icon: 'shield-outline',
      label: 'Role',
      value: user?.role === 'admin' ? 'Admin' : 'Karyawan',
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Gradient Header */}
        <LinearGradient
          colors={['#0D9488', '#0F766E', '#134E4A']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>
          <Text style={styles.userName}>{user?.name || 'Karyawan'}</Text>
          <Text style={styles.userNip}>NIP: {user?.nip || '-'}</Text>
          <View style={styles.roleBadge}>
            <Ionicons
              name={user?.role === 'admin' ? 'shield-checkmark' : 'person'}
              size={14}
              color="#FFFFFF"
            />
            <Text style={styles.roleBadgeText}>
              {user?.role === 'admin' ? 'Admin' : 'Karyawan'}
            </Text>
          </View>
        </LinearGradient>

        {/* Info Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Informasi Pribadi</Text>
        </View>

        <View style={styles.infoCard}>
          {infoItems.map((item, index) => (
            <View key={index} style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name={item.icon} size={18} color="#0D9488" />
                </View>
                <Text style={styles.infoLabel}>{item.label}</Text>
              </View>
              <Text style={styles.infoValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* App Info Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Informasi Aplikasi</Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="information-circle-outline" size={18} color="#0D9488" />
              </View>
              <Text style={styles.infoLabel}>Versi</Text>
            </View>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="code-slash-outline" size={18} color="#0D9488" />
              </View>
              <Text style={styles.infoLabel}>Developer</Text>
            </View>
            <Text style={styles.infoValue}>AbsensiKu Team</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={styles.infoLeft}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="finger-print-outline" size={18} color="#0D9488" />
              </View>
              <Text style={styles.infoLabel}>UID</Text>
            </View>
            <Text style={[styles.infoValue, { fontSize: 11 }]}>{user?.uid || '-'}</Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          <Text style={styles.logoutText}>Keluar</Text>
        </TouchableOpacity>

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
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 32,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userNip: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 10,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 6,
  },
  roleBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    maxWidth: '50%',
    textAlign: 'right',
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  bottomSpacer: {
    height: 40,
  },
});

export default Profile;

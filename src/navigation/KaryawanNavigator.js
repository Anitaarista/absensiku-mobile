import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import KaryawanHome from '../screens/karyawan/KaryawanHome';
import ScanQR from '../screens/karyawan/ScanQR';
import AttendanceHistory from '../screens/karyawan/AttendanceHistory';
import Profile from '../screens/karyawan/Profile';

const Tab = createBottomTabNavigator();

const KaryawanNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Beranda') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Scan QR') {
            iconName = focused ? 'scan' : 'scan-outline';
          } else if (route.name === 'Riwayat') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Profil') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0D9488',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          paddingBottom: 4,
          paddingTop: 4,
          height: 56,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Beranda" component={KaryawanHome} />
      <Tab.Screen name="Scan QR" component={ScanQR} />
      <Tab.Screen name="Riwayat" component={AttendanceHistory} />
      <Tab.Screen name="Profil" component={Profile} />
    </Tab.Navigator>
  );
};

export default KaryawanNavigator;

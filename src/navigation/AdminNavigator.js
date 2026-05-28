import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AdminDashboard from '../screens/admin/AdminDashboard';
import GenerateQR from '../screens/admin/GenerateQR';
import AttendanceList from '../screens/admin/AttendanceList';
import Reports from '../screens/admin/Reports';
import AddEmployee from '../screens/admin/AddEmployee';
import EmployeeList from '../screens/admin/EmployeeList';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const AdminTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'QR Code') {
            iconName = focused ? 'qr-code' : 'qr-code-outline';
          } else if (route.name === 'Absensi') {
            iconName = focused ? 'clipboard' : 'clipboard-outline';
          } else if (route.name === 'Laporan') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
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
      <Tab.Screen name="Dashboard" component={AdminDashboard} />
      <Tab.Screen name="QR Code" component={GenerateQR} />
      <Tab.Screen name="Absensi" component={AttendanceList} />
      <Tab.Screen name="Laporan" component={Reports} />
    </Tab.Navigator>
  );
};

const AdminNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminTabs" component={AdminTabs} />
      <Stack.Screen
        name="AddEmployee"
        component={AddEmployee}
        options={{
          headerShown: true,
          title: 'Tambah Karyawan',
          headerTintColor: '#0D9488',
          headerTitleStyle: { fontWeight: '600' },
        }}
      />
      <Stack.Screen
        name="EmployeeList"
        component={EmployeeList}
        options={{
          headerShown: true,
          title: 'Daftar Karyawan',
          headerTintColor: '#0D9488',
          headerTitleStyle: { fontWeight: '600' },
        }}
      />
    </Stack.Navigator>
  );
};

export default AdminNavigator;

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../components/LoadingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import AdminNavigator from './AdminNavigator';
import KaryawanNavigator from './KaryawanNavigator';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Memuat data pengguna..." />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : user?.role === 'admin' ? (
          <Stack.Screen name="AdminApp" component={AdminNavigator} />
        ) : (
          <Stack.Screen name="KaryawanApp" component={KaryawanNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

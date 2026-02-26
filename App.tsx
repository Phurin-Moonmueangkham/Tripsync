import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useEffect } from 'react';
import { useAuthStore } from './src/core/store/useAuthStore';

// Import หน้าจอทั้งหมดจากโฟลเดอร์ features
import AuthChoiceScreen from './src/features/Auth/AuthChoiceScreen';
import SignInScreen from './src/features/Auth/SignInScreen';
import SignUpScreen from './src/features/Auth/SignUpScreen';
import HomeScreen from './src/features/Home/HomeScreen';
import TripManagementScreen from './src/features/TripManagement/TripManagementScreen';
import MapDashboardScreen from './src/features/MapDashboard/MapDashboardScreen';
import MeetingPointScreen from './src/features/MeetingPoint/MeetingPointScreen';
import SettingsScreen from './src/features/Settings/SettingsScreen';
import CreateTripScreen from './src/features/CreateTrip/CreateTripScreen';
import AlertScreen from './src/features/Alert/AlertScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const userProfile = useAuthStore((state) => state.userProfile);
  const isAuthReady = useAuthStore((state) => state.isAuthReady);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    const unsubscribe = initializeAuth();

    return unsubscribe;
  }, [initializeAuth]);

  if (!isAuthReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator id="root-stack">
        {userProfile ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="TripManagement" component={TripManagementScreen} options={{ title: 'Join / Create Trip' }} />
            <Stack.Screen name="MapDashboard" component={MapDashboardScreen} options={{ headerShown: false }} />
            <Stack.Screen name="MeetingPoint" component={MeetingPointScreen} options={{ title: 'Meeting Point', presentation: 'modal' }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
            <Stack.Screen name="CreateTrip" component={CreateTripScreen} options={{ title: 'Create New Trip' }} />
            <Stack.Screen name="Alert" component={AlertScreen} options={{ title: 'Alert', presentation: 'modal' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="AuthChoice" component={AuthChoiceScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SignIn" component={SignInScreen} options={{ title: 'Sign in' }} />
            <Stack.Screen name="SignUp" component={SignUpScreen} options={{ title: 'Sign up' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
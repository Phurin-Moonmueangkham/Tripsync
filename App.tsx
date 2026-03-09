import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useEffect, useRef } from 'react';
import { useAuthStore } from './src/core/store/useAuthStore';
import { useTripStore } from './src/core/store/useTripStore';
import { getStoredTripCode } from './src/core/store/useTripStore';

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
  const navigationRef = useRef<any>(null);

  useEffect(() => {
    const unsubscribe = initializeAuth();

    return unsubscribe;
  }, [initializeAuth]);

  useEffect(() => {
    // If auth is ready and user is logged in, check if there's an active trip
    if (isAuthReady && userProfile) {
      const storedTripCode = getStoredTripCode();
      if (storedTripCode) {
        // Join the trip automatically
        const joinTrip = useTripStore.getState().joinTrip;
        joinTrip(storedTripCode).catch(() => {
          // If join fails, the trip might have been deleted
          // User will see error in MapDashboard
        });
        
        // Navigate to MapDashboard
        if (navigationRef.current) {
          navigationRef.current.navigate('MapDashboard');
        }
      }
    }
  }, [isAuthReady, userProfile]);

  if (!isAuthReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator id="root-stack" screenOptions={{ headerTintColor: '#007AFF' }}>
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
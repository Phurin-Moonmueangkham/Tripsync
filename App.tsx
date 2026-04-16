import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useEffect, useRef } from 'react';
import { useAuthStore } from './src/core/store/useAuthStore';
import { useTripStore } from './src/core/store/useTripStore';
import { getStoredTripCode } from './src/core/store/useTripStore';

const Stack = createNativeStackNavigator();

const loadScreen = (loader: () => { default: React.ComponentType<any> }) => loader().default;

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
            <Stack.Screen name="Home" getComponent={() => loadScreen(() => require('./src/features/Home/HomeScreen'))} options={{ headerShown: false }} />
            <Stack.Screen name="TripManagement" getComponent={() => loadScreen(() => require('./src/features/TripManagement/TripManagementScreen'))} options={{ title: 'Join / Create Trip' }} />
            <Stack.Screen name="MapDashboard" getComponent={() => loadScreen(() => require('./src/features/MapDashboard/MapDashboardScreen'))} options={{ headerShown: false }} />
            <Stack.Screen name="MeetingPoint" getComponent={() => loadScreen(() => require('./src/features/MeetingPoint/MeetingPointScreen'))} options={{ title: 'Meeting Point', presentation: 'modal' }} />
            <Stack.Screen name="Settings" getComponent={() => loadScreen(() => require('./src/features/Settings/SettingsScreen'))} options={{ title: 'Settings' }} />
            <Stack.Screen name="CreateTrip" getComponent={() => loadScreen(() => require('./src/features/CreateTrip/CreateTripScreen'))} options={{ title: 'Create New Trip' }} />
            <Stack.Screen name="Alert" getComponent={() => loadScreen(() => require('./src/features/Alert/AlertScreen'))} options={{ title: 'Alert', presentation: 'modal' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="AuthChoice" getComponent={() => loadScreen(() => require('./src/features/Auth/AuthChoiceScreen'))} options={{ headerShown: false }} />
            <Stack.Screen name="SignIn" getComponent={() => loadScreen(() => require('./src/features/Auth/SignInScreen'))} options={{ title: 'Sign in' }} />
            <Stack.Screen name="SignUp" getComponent={() => loadScreen(() => require('./src/features/Auth/SignUpScreen'))} options={{ title: 'Sign up' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
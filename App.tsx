import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './src/features/Home/HomeScreen';
import TripManagementScreen from './src/features/TripManagement/TripManagementScreen';
import MapDashboardScreen from './src/features/MapDashboard/MapDashboardScreen';
import MeetingPointScreen from './src/features/MeetingPoint/MeetingPointScreen';
import SettingsScreen from './src/features/Settings/SettingsScreen';
import CreateTripScreen from './src/features/CreateTrip/CreateTripScreen';
import AlertScreen from './src/features/Alert/AlertScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="TripManagement" 
          component={TripManagementScreen} 
          options={{ title: 'Join / Create Trip' }} 
        />
        <Stack.Screen 
          name="MapDashboard" 
          component={MapDashboardScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="MeetingPoint" 
          component={MeetingPointScreen} 
          options={{ 
            title: 'Meeting Point', 
            presentation: 'modal' 
          }} 
        />
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen} 
          options={{ title: 'Settings' }} 
        />
        <Stack.Screen 
          name="CreateTrip" 
          component={CreateTripScreen} 
          options={{ title: 'Create New Trip' }} 
        />
        <Stack.Screen 
          name="Alert" 
          component={AlertScreen} 
          options={{ 
            title: 'Alert', 
            presentation: 'modal', 
            headerStyle: { backgroundColor: '#FDECEA' }, 
            headerTintColor: '#D9534F' 
          }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
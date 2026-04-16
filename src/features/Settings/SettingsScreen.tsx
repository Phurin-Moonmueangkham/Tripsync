import React, { useState } from 'react';
import { View, Text, SafeAreaView, Switch, TouchableOpacity, Alert } from 'react-native';
import { useAuthStore } from '../../core/store/useAuthStore';
import { useTripStore } from '../../core/store/useTripStore';
import { styles } from './SettingsScreen.styles';

const SettingsScreen: React.FC<any> = ({ navigation }) => {
  const signOut = useAuthStore((state) => state.signOut);
  const isAuthLoading = useAuthStore((state) => state.isAuthLoading);
  const locationMode = useTripStore((state) => state.locationMode);
  const setLocationMode = useTripStore((state) => state.setLocationMode);
  const leaveTrip = useTripStore((state) => state.leaveTrip);
  const isTripLoading = useTripStore((state) => state.isTripLoading);

  const [sosAlerts, setSosAlerts] = useState(true);
  const [proximityAlerts, setProximityAlerts] = useState(false);

  const handleLogout = async () => {
    try {
      await leaveTrip();
      await signOut();
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Logout failed', error.message);
        return;
      }

      Alert.alert('Logout failed', 'Please try again.');
    }
  };

  const handleLeaveTrip = async () => {
    await leaveTrip();
    navigation.navigate('Home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.sectionTitle}>Location & Battery</Text>
      <View style={styles.card}>
        {(['high', 'balanced', 'smart'] as const).map((mode) => (
          <TouchableOpacity key={mode} style={styles.radioRow} onPress={() => {
            void setLocationMode(mode);
          }}>
            <View style={[styles.radio, locationMode === mode && styles.radioSelected]} />
            <View>
              <Text style={styles.radioLabel}>
                {mode === 'high' ? 'High Accuracy (Real-time)' : mode === 'balanced' ? 'Balanced (Periodic Sync) - Recommended' : 'Smart Battery Saver'}
              </Text>
              {mode === 'smart' && <Text style={styles.radioSub}>Pauses GPS when stationary to save power</Text>}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Notifications</Text>
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>SOS Alerts</Text>
          <Switch value={sosAlerts} onValueChange={setSosAlerts} trackColor={{ true: '#007AFF' }} />
        </View>
        <View style={styles.divider} />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Proximity Alerts</Text>
          <Switch value={proximityAlerts} onValueChange={setProximityAlerts} trackColor={{ true: '#007AFF' }} />
        </View>
      </View>

      <TouchableOpacity style={[styles.leaveBtn, isTripLoading && styles.logoutBtnDisabled]} onPress={handleLeaveTrip}>
        <Text style={styles.leaveBtnText}>{isTripLoading ? 'Leaving...' : 'Leave Trip'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.logoutBtn, isAuthLoading && styles.logoutBtnDisabled]}
        onPress={handleLogout}
        disabled={isAuthLoading}
      >
        <Text style={styles.logoutBtnText}>{isAuthLoading ? 'Logging out...' : 'Log out'}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default SettingsScreen;
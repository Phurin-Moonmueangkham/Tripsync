import React from 'react';
import { View, Text, SafeAreaView, Switch, TouchableOpacity, Alert } from 'react-native';
import { useAuthStore } from '../../core/store/useAuthStore';
import { useSettingsStore } from '../../core/store/useSettingsStore';
import { useTripStore } from '../../core/store/useTripStore';
import BottomNavigationBar from '../../components/BottomNavigationBar';
import { styles } from './SettingsScreen.styles';

const SettingsScreen: React.FC<any> = ({ navigation }) => {
  const signOut = useAuthStore((state) => state.signOut);
  const isAuthLoading = useAuthStore((state) => state.isAuthLoading);
  const locationMode = useTripStore((state) => state.locationMode);
  const setLocationMode = useTripStore((state) => state.setLocationMode);
  const leaveTrip = useTripStore((state) => state.leaveTrip);
  const isTripLoading = useTripStore((state) => state.isTripLoading);
  const sosAlerts = useSettingsStore((state) => state.sosAlerts);
  const proximityAlerts = useSettingsStore((state) => state.proximityAlerts);
  const setSosAlerts = useSettingsStore((state) => state.setSosAlerts);
  const setProximityAlerts = useSettingsStore((state) => state.setProximityAlerts);

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
    try {
      await leaveTrip();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Leave trip failed', error.message);
        return;
      }

      Alert.alert('Leave trip failed', 'Please try again.');
    }
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
          <Switch value={sosAlerts} onValueChange={setSosAlerts} trackColor={{ false: '#4B5563', true: '#007AFF' }} />
        </View>
        <View style={styles.divider} />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Proximity Alerts</Text>
          <Switch value={proximityAlerts} onValueChange={setProximityAlerts} trackColor={{ false: '#4B5563', true: '#007AFF' }} />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.leaveBtn, isTripLoading && styles.logoutBtnDisabled]}
        onPress={handleLeaveTrip}
        disabled={isTripLoading}
      >
        <Text style={styles.leaveBtnText}>{isTripLoading ? 'Leaving...' : 'Leave Trip'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.logoutBtn, isAuthLoading && styles.logoutBtnDisabled]}
        onPress={handleLogout}
        disabled={isAuthLoading}
      >
        <Text style={styles.logoutBtnText}>{isAuthLoading ? 'Logging out...' : 'Log out'}</Text>
      </TouchableOpacity>

      <BottomNavigationBar navigation={navigation} activeRoute="Settings" />
    </SafeAreaView>
  );
};

export default SettingsScreen;
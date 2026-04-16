import React from 'react';
import { View, Text, SafeAreaView, Switch, TouchableOpacity, Alert } from 'react-native';
import { useAuthStore } from '../../core/store/useAuthStore';
import { useTripStore } from '../../core/store/useTripStore';
import { useSettingsStore } from '../../core/store/useSettingsStore';
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
  const resetNotificationSettings = useSettingsStore((state) => state.resetNotificationSettings);

  const handleLogout = async () => {
    try {
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
      navigation.navigate('Home');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      Alert.alert('Leave trip failed', message);
    }
  };

  const handleResetNotificationSettings = () => {
    Alert.alert('Reset notification settings?', 'This will restore the default notification preferences.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          resetNotificationSettings();
        },
      },
    ]);
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
        <Text style={styles.radioSub}>Preferences are saved on this device and affect in-app alerts.</Text>
        <TouchableOpacity style={styles.resetBtn} onPress={handleResetNotificationSettings}>
          <Text style={styles.resetBtnText}>Reset notification settings</Text>
        </TouchableOpacity>
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
import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Switch, TouchableOpacity, Alert } from 'react-native';
import { useAuthStore } from '../../core/store/useAuthStore';
import { useTripStore } from '../../core/store/useTripStore';

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#888', marginBottom: 8, marginTop: 16, textTransform: 'uppercase' },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  radioRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#007AFF', marginRight: 12, marginTop: 2 },
  radioSelected: { backgroundColor: '#007AFF' },
  radioLabel: { fontSize: 15, color: '#333' },
  radioSub: { fontSize: 12, color: '#999', marginTop: 2 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  switchLabel: { fontSize: 15, color: '#333' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  leaveBtn: { marginTop: 30, backgroundColor: '#FDECEA', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#D9534F' },
  leaveBtnText: { color: '#D9534F', fontWeight: 'bold', fontSize: 16 },
  logoutBtn: {
    marginTop: 12,
    backgroundColor: '#1A1A2E',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutBtnDisabled: {
    opacity: 0.7,
  },
  logoutBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default SettingsScreen;
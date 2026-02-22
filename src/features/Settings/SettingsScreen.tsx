import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Switch, TouchableOpacity } from 'react-native';

const SettingsScreen: React.FC<any> = ({ navigation }) => {
  const [locationMode, setLocationMode] = useState<'high' | 'balanced' | 'smart'>('balanced');
  const [sosAlerts, setSosAlerts] = useState(true);
  const [proximityAlerts, setProximityAlerts] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.sectionTitle}>Location & Battery</Text>
      <View style={styles.card}>
        {(['high', 'balanced', 'smart'] as const).map((mode) => (
          <TouchableOpacity key={mode} style={styles.radioRow} onPress={() => setLocationMode(mode)}>
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

      <TouchableOpacity style={styles.leaveBtn} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.leaveBtnText}>Leave Trip</Text>
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
});

export default SettingsScreen;
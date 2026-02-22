import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, FlatList } from 'react-native';
import { useTripStore } from '../../core/store/useTripStore';

export default function MapDashboardScreen({ navigation }: any) {
  const { tripName, members, isSOSActive, triggerSOS } = useTripStore();

  return (
    <SafeAreaView style={styles.container}>
      {isSOSActive && (
        <View style={styles.sosBanner}>
          <Text style={styles.sosText}>🚨 ALERT! Someone needs help! 🚨</Text>
        </View>
      )}

      <View style={styles.header}>
        <View>
          <Text style={styles.tripName}>{tripName || 'Unknown Trip'}</Text>
          <Text style={styles.memberCount}>👥 {members.length} Online</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        <Text style={styles.mapPlaceholderText}>🗺️ Map View</Text>
        {members.map((m) => (
          <View key={m.id} style={styles.memberPin}>
            <Text style={styles.pinEmoji}>📍</Text>
            <Text style={styles.pinName}>{m.name}</Text>
          </View>
        ))}
      </View>

      <View style={styles.memberList}>
        <Text style={styles.sectionTitle}>Members Status</Text>
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.memberRow}>
              <Text style={styles.memberAvatar}>👤</Text>
              <Text style={styles.memberName}>{item.name}</Text>
              <Text style={item.batteryLevel < 20 ? styles.lowBattery : styles.battery}>
                🔋 {item.batteryLevel}%
              </Text>
            </View>
          )}
        />
      </View>

      {/* Bottom Nav เหมือน HomeScreen */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>🗺️</Text>
          <Text style={[styles.navLabel, styles.navLabelActive]}>Map</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('MeetingPoint')}>
          <Text style={styles.navIcon}>📍</Text>
          <Text style={styles.navLabel}>Set Point</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => triggerSOS(!isSOSActive)}
        >
          <Text style={styles.navIcon}>{isSOSActive ? '✅' : '🚨'}</Text>
          <Text style={[styles.navLabel, isSOSActive && { color: 'gray' }]}>
            {isSOSActive ? 'Cancel' : 'SOS'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.navIcon}>⚙️</Text>
          <Text style={styles.navLabel}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  sosBanner: { backgroundColor: '#D9534F', padding: 12, alignItems: 'center' },
  sosText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'white' },
  tripName: { fontSize: 20, fontWeight: 'bold', color: '#1A1A2E' },
  memberCount: { fontSize: 13, color: '#666', marginTop: 2 },
  settingsIcon: { fontSize: 24 },
  mapContainer: { flex: 1, backgroundColor: '#D4E8C2', margin: 12, borderRadius: 16, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  mapPlaceholderText: { fontSize: 18, color: '#555', position: 'absolute', top: 16 },
  memberPin: { alignItems: 'center', margin: 12 },
  pinEmoji: { fontSize: 24 },
  pinName: { fontSize: 11, fontWeight: '600', backgroundColor: 'white', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  memberList: { maxHeight: 140, backgroundColor: 'white', paddingHorizontal: 16, paddingTop: 10 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  memberAvatar: { fontSize: 18, marginRight: 8 },
  memberName: { flex: 1, fontSize: 15, color: '#333' },
  battery: { fontSize: 14, color: 'green' },
  lowBattery: { fontSize: 14, color: 'red', fontWeight: 'bold' },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingBottom: 28,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 8,
    elevation: 10,
  },
  navItem: { alignItems: 'center' },
  navIcon: { fontSize: 22 },
  navLabel: { fontSize: 11, color: '#999', marginTop: 4 },
  navLabelActive: { color: '#007AFF', fontWeight: '600' },
});
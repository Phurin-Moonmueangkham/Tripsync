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

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('MeetingPoint')}>
          <Text style={styles.navBtnText}>📍 Set Point</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sosBtn, isSOSActive && styles.sosBtnActive]}
          onPress={() => triggerSOS(!isSOSActive)}
        >
          <Text style={styles.sosBtnText}>{isSOSActive ? '✅ Cancel SOS' : '🚨 SOS'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.navBtnText}>⚙️ Settings</Text>
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
    alignItems: 'center',
    paddingVertical: 12,
    paddingBottom: 32, // เพิ่ม padding ด้านล่างให้สูงขึ้น
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  navBtn: { padding: 10, borderRadius: 10, backgroundColor: '#F0F7FF' },
  navBtnText: { color: '#007AFF', fontWeight: '600' },
  sosBtn: { backgroundColor: '#D9534F', padding: 12, borderRadius: 12 },
  sosBtnActive: { backgroundColor: '#888' },
  sosBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
});
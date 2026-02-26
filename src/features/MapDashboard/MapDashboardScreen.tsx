import React, { useEffect, useMemo, useRef } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useAuthStore } from '../../core/store/useAuthStore';
import { useTripStore } from '../../core/store/useTripStore';

export default function MapDashboardScreen({ navigation }: any) {
  const mapRef = useRef<MapView>(null);

  const userProfile = useAuthStore((state) => state.userProfile);
  const {
    tripName,
    members,
    destination,
    destinationAddress,
    routePoints,
    isSOSActive,
    currentUserLocation,
    locationMode,
    tripError,
    triggerSOS,
    startLocationTracking,
    stopLocationTracking,
  } = useTripStore();

  useEffect(() => {
    void startLocationTracking();

    return () => {
      void stopLocationTracking();
    };
  }, [startLocationTracking, stopLocationTracking, locationMode]);

  const initialRegion = useMemo(() => {
    if (destination) {
      return {
        ...destination,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    if (currentUserLocation) {
      return {
        ...currentUserLocation,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    return {
      latitude: 13.7563,
      longitude: 100.5018,
      latitudeDelta: 0.2,
      longitudeDelta: 0.2,
    };
  }, [currentUserLocation, destination]);

  useEffect(() => {
    const points = [
      ...routePoints,
      ...members.map((member) => member.location).filter((location) => location !== null),
      ...(destination ? [destination] : []),
    ];

    if (points.length < 2) {
      return;
    }

    mapRef.current?.fitToCoordinates(points, {
      edgePadding: { top: 80, right: 50, bottom: 80, left: 50 },
      animated: true,
    });
  }, [destination, members, routePoints]);

  return (
    <SafeAreaView style={styles.container}>
      {isSOSActive ? (
        <View style={styles.sosBanner}>
          <Text style={styles.sosText}>🚨 ALERT! Someone needs help! 🚨</Text>
        </View>
      ) : null}

      <View style={styles.header}>
        <View>
          <Text style={styles.tripName}>{tripName || 'Trip Map'}</Text>
          <Text style={styles.memberCount}>👥 {members.length} Members</Text>
          <Text style={styles.modeText}>Mode: {locationMode.toUpperCase()}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mapCard}>
        <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion}>
          {destination ? <Marker coordinate={destination} title="Destination" description={destinationAddress} pinColor="#FF9500" /> : null}

          {routePoints.length > 1 ? <Polyline coordinates={routePoints} strokeColor="#007AFF" strokeWidth={4} /> : null}

          {members
            .filter((member) => member.location)
            .map((member) => {
              const isCurrentUser = member.id === userProfile?.uid;

              return (
                <Marker
                  key={member.id}
                  coordinate={member.location!}
                  title={isCurrentUser ? `${member.name} (You)` : member.name}
                  description={`Mode: ${member.locationMode.toUpperCase()}`}
                  pinColor={isCurrentUser ? '#007AFF' : '#34C759'}
                />
              );
            })}
        </MapView>
      </View>

      {tripError ? <Text style={styles.errorText}>{tripError}</Text> : null}

      <View style={styles.memberList}>
        <Text style={styles.sectionTitle}>Members Status</Text>
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.memberRow}>
              <Text style={styles.memberAvatar}>👤</Text>
              <View style={styles.memberMeta}>
                <Text style={styles.memberName}>{item.id === userProfile?.uid ? `${item.name} (You)` : item.name}</Text>
                <Text style={styles.memberMode}>{item.locationMode.toUpperCase()} • {item.location ? 'Online' : 'Waiting GPS'}</Text>
              </View>
              <Text style={item.batteryLevel < 20 ? styles.lowBattery : styles.battery}>🔋 {item.batteryLevel}%</Text>
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
          onPress={() => {
            void triggerSOS(!isSOSActive);
          }}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: 'white',
  },
  tripName: { fontSize: 20, fontWeight: 'bold', color: '#1A1A2E' },
  memberCount: { fontSize: 13, color: '#666', marginTop: 2 },
  modeText: { fontSize: 12, color: '#007AFF', marginTop: 2, fontWeight: '600' },
  settingsIcon: { fontSize: 24 },
  mapCard: {
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DDE1E6',
  },
  map: { height: 330, width: '100%' },
  errorText: { color: '#D9534F', marginTop: 8, marginHorizontal: 14 },
  memberList: { flex: 1, backgroundColor: 'white', marginTop: 10, paddingHorizontal: 16, paddingTop: 10 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  memberAvatar: { fontSize: 18, marginRight: 8 },
  memberMeta: { flex: 1 },
  memberName: { fontSize: 15, color: '#333' },
  memberMode: { fontSize: 12, color: '#777', marginTop: 2 },
  battery: { fontSize: 14, color: 'green' },
  lowBattery: { fontSize: 14, color: 'red', fontWeight: 'bold' },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingBottom: 24,
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

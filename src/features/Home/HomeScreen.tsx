import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';

const HomeScreen = ({ navigation }: any) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>TripSync</Text>
        <Text style={styles.subtitle}>Journey Together. Stay Connected.</Text>
      </View>

      {/* Illustration Area */}
      <View style={styles.illustrationContainer}>
        {/* Mock Map Grid */}
        <View style={styles.mapGrid}>
          {/* Roads */}
          <View style={[styles.road, styles.roadH, { top: '30%' }]} />
          <View style={[styles.road, styles.roadH, { top: '60%' }]} />
          <View style={[styles.road, styles.roadV, { left: '25%' }]} />
          <View style={[styles.road, styles.roadV, { left: '65%' }]} />

          {/* Location Pins */}
          <View style={[styles.pinWrapper, { top: '20%', left: '20%' }]}>
            <Text style={styles.pin}>📍</Text>
            <View style={styles.pinBubble}><Text style={styles.pinBubbleText}>You</Text></View>
          </View>
          <View style={[styles.pinWrapper, { top: '50%', left: '55%' }]}>
            <Text style={styles.pin}>📍</Text>
            <View style={[styles.pinBubble, { backgroundColor: '#FF6B6B' }]}><Text style={styles.pinBubbleText}>Mike</Text></View>
          </View>
          <View style={[styles.pinWrapper, { top: '15%', left: '60%' }]}>
            <Text style={styles.pin}>📍</Text>
            <View style={[styles.pinBubble, { backgroundColor: '#2ECC71' }]}><Text style={styles.pinBubbleText}>Sarah</Text></View>
          </View>

          {/* Meeting Point Star */}
          <View style={[styles.pinWrapper, { top: '55%', left: '20%' }]}>
            <Text style={styles.starPin}>⭐</Text>
            <View style={[styles.pinBubble, { backgroundColor: '#F1C40F' }]}><Text style={[styles.pinBubbleText, { color: '#333' }]}>Meet Here</Text></View>
          </View>

          {/* Dotted Route Line */}
          <View style={[styles.routeDot, { top: '35%', left: '30%' }]} />
          <View style={[styles.routeDot, { top: '40%', left: '35%' }]} />
          <View style={[styles.routeDot, { top: '45%', left: '32%' }]} />
          <View style={[styles.routeDot, { top: '48%', left: '28%' }]} />

          {/* Location radius circle */}
          <View style={[styles.radiusCircle, { top: '10%', left: '45%' }]} />
        </View>

        {/* SOS Badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>🔋 Live Sync</Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('CreateTrip')}>
          <Text style={styles.primaryButtonText}>🚀 Create New Trip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('TripManagement')}>
          <Text style={styles.secondaryButtonText}>🔗 Join Trip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={[styles.navLabel, styles.navLabelActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('MapDashboard')}>
          <Text style={styles.navIcon}>🗺️</Text>
          <Text style={styles.navLabel}>Map</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.navIcon}>⚙️</Text>
          <Text style={styles.navLabel}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { alignItems: 'center', paddingTop: 36, paddingBottom: 12 },
  logo: { fontSize: 42, fontWeight: 'bold', color: '#1A1A2E', letterSpacing: 1 },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },

  illustrationContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#E8F4FD',
    borderWidth: 1,
    borderColor: '#D0E8F5',
  },
  mapGrid: { flex: 1, position: 'relative' },

  road: { position: 'absolute', backgroundColor: '#C8DCE8' },
  roadH: { height: 8, left: 0, right: 0 },
  roadV: { width: 8, top: 0, bottom: 0 },

  pinWrapper: { position: 'absolute', alignItems: 'center' },
  pin: { fontSize: 26 },
  starPin: { fontSize: 22 },
  pinBubble: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 2,
  },
  pinBubbleText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

  routeDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#007AFF',
    opacity: 0.5,
  },
  radiusCircle: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#007AFF',
    opacity: 0.15,
    backgroundColor: '#007AFF',
  },

  badge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: { color: 'white', fontSize: 12, fontWeight: '600' },

  buttonContainer: { paddingHorizontal: 24, paddingBottom: 16 },
  primaryButton: { backgroundColor: '#007AFF', padding: 16, borderRadius: 14, alignItems: 'center', marginBottom: 10 },
  primaryButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  secondaryButton: { backgroundColor: 'white', padding: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#007AFF', marginBottom: 10 },
  secondaryButtonText: { color: '#007AFF', fontSize: 16, fontWeight: 'bold' },

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
  navIcon: { fontSize: 24 },
  navLabel: { fontSize: 11, color: '#999', marginTop: 4 },
  navLabelActive: { color: '#007AFF', fontWeight: '600' },
});

export default HomeScreen;

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';

const HomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>TripSync</Text>
        <Text style={styles.subtitle}>Journey Together. Stay Connected.</Text>
      </View>
      <View style={styles.illustrationContainer}>
        <Text style={styles.illustration}></Text>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('CreateTrip')}>
          <Text style={styles.primaryButtonText}>Create New Trip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('TripManagement')}>
          <Text style={styles.secondaryButtonText}>Join Trip</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}></Text>
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('MapDashboard')}>
          <Text style={styles.navIcon}></Text>
          <Text style={styles.navLabel}>Map</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.navIcon}></Text>
          <Text style={styles.navLabel}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { alignItems: 'center', paddingTop: 40, paddingBottom: 10 },
  logo: { fontSize: 28, fontWeight: 'bold', color: '#1A1A2E' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 5 },
  illustrationContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  illustration: { fontSize: 80 },
  buttonContainer: { paddingHorizontal: 30, paddingBottom: 20 },
  primaryButton: { backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  primaryButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  secondaryButton: { backgroundColor: 'white', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#007AFF' },
  secondaryButtonText: { color: '#007AFF', fontSize: 16, fontWeight: 'bold' },
  bottomNav: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    paddingVertical: 12, 
    paddingBottom: 32, // เพิ่ม padding ด้านล่างให้สูงขึ้น
    backgroundColor: 'white', 
    borderTopWidth: 1, 
    borderTopColor: '#eee' 
  },
  navItem: { alignItems: 'center' },
  navIcon: { fontSize: 22 },
  navLabel: { fontSize: 11, color: '#666', marginTop: 2 },
});

export default HomeScreen;

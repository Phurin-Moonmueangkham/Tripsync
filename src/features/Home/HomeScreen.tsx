import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity } from 'react-native';
import { styles } from './HomeScreen.styles';

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
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('MapDashboard')}>
          <Text style={styles.navLabel}>Map</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.navLabel}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;

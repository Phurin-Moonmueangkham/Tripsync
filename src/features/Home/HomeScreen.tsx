import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import BottomNavigationBar from '../../components/BottomNavigationBar';
import { styles } from './HomeScreen.styles';

const HomeScreen = ({ navigation }: any) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>TripSync</Text>
        <Text style={styles.subtitle}>Journey Together. Stay Connected.</Text>
      </View>
      <View style={styles.illustrationContainer}>
        <Image
          source={require('../../../assets/1000_F_422174132_hIk2iTkZuz50WAgsZUYmvWlqFj9EDcMl-removebg-preview.png')}
          style={styles.illustrationImage}
          resizeMode="contain"
        />
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('CreateTrip')}>
          <Text style={styles.primaryButtonText}>Create New Trip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('TripManagement')}>
          <Text style={styles.secondaryButtonText}>Join Trip</Text>
        </TouchableOpacity>
      </View>
      <BottomNavigationBar navigation={navigation} activeRoute="Home" />
    </SafeAreaView>
  );
};

export default HomeScreen;

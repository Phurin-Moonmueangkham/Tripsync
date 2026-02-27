import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { styles } from './MeetingPointScreen.styles';

const MeetingPointScreen: React.FC<any> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>📍 Set Meeting Point</Text>
      <Text style={styles.subtitle}>Tap on the map to set a meeting point for everyone in the group.</Text>

      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapText}>🗺️ Map View</Text>
        <View style={styles.pinContainer}>
          <Text style={styles.pin}>⭐</Text>
          <Text style={styles.pinLabel}>Central Plaza</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.saveBtnText}>✅ Navigate to Meeting Point</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default MeetingPointScreen;
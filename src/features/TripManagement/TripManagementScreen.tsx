import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useTripStore } from '../../core/store/useTripStore';
import { styles } from './TripManagementScreen.styles';

const TripManagementScreen: React.FC<any> = ({ navigation }) => {
  const joinTrip = useTripStore((state) => state.joinTrip);
  const isTripLoading = useTripStore((state) => state.isTripLoading);
  const tripError = useTripStore((state) => state.tripError);
  const clearTripError = useTripStore((state) => state.clearTripError);

  const [code, setCode] = useState('');

  const handleJoinTrip = async () => {
    if (!code.trim()) {
      Alert.alert('Missing code', 'Please enter trip code.');
      return;
    }

    try {
      await joinTrip(code);
      navigation.navigate('MapDashboard');
    } catch {
      // error text handled by store
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Join a Trip</Text>
      <Text style={styles.label}>Enter Trip Code</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., X7Y8Z9"
        value={code}
        onChangeText={(value) => {
          clearTripError();
          setCode(value);
        }}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={handleJoinTrip}
      />
      {tripError ? <Text style={styles.errorText}>{tripError}</Text> : null}
      <TouchableOpacity style={[styles.joinBtn, isTripLoading && styles.joinBtnDisabled]} onPress={handleJoinTrip} disabled={isTripLoading}>
        <Text style={styles.joinBtnText}>{isTripLoading ? 'Joining...' : 'Join Trip'}</Text>
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.orText}>or</Text>
        <View style={styles.divider} />
      </View>

      <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateTrip')}>
        <Text style={styles.createBtnText}>Create New Trip</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default TripManagementScreen;
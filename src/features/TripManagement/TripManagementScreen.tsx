import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useTripStore } from '../../core/store/useTripStore';

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', padding: 24 },
  heading: { fontSize: 24, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 24 },
  label: { fontSize: 14, color: '#666', marginBottom: 6 },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, fontSize: 18, letterSpacing: 4, marginBottom: 16, textAlign: 'center' },
  joinBtn: { backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center' },
  joinBtnDisabled: { opacity: 0.7 },
  joinBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  errorText: { color: '#D9534F', marginBottom: 8 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  divider: { flex: 1, height: 1, backgroundColor: '#ddd' },
  orText: { marginHorizontal: 12, color: '#999' },
  createBtn: { padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#007AFF' },
  createBtnText: { color: '#007AFF', fontSize: 16, fontWeight: 'bold' },
});

export default TripManagementScreen;
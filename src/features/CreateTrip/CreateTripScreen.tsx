import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';

const CreateTripScreen: React.FC<any> = ({ navigation }) => {
  const [tripName, setTripName] = useState('');
  const [created, setCreated] = useState(false);

  const handleCreate = () => {
    if (!tripName) { Alert.alert('Please enter a trip name'); return; }
    setCreated(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Create New Trip</Text>

      <Text style={styles.label}>Trip Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Chiang Mai 2024"
        value={tripName}
        onChangeText={setTripName}
        autoCorrect={false}
      />

      <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
        <Text style={styles.createButtonText}>Create Trip</Text>
      </TouchableOpacity>

      {created && (
        <View style={styles.shareBox}>
          <Text style={styles.shareTitle}>Share Trip Code</Text>
          <View style={styles.qrPlaceholder}>
            <Text style={styles.qrText}>QR Code</Text>
          </View>
          <Text style={styles.codeText}>X7Y8Z9</Text>
          <TouchableOpacity style={styles.shareButton}>
            <Text style={styles.shareButtonText}>🔗 Share Invite Link</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', padding: 24 },
  heading: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, color: '#1A1A2E' },
  label: { fontSize: 14, color: '#666', marginBottom: 6 },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, fontSize: 16, marginBottom: 20 },
  createButton: { backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center' },
  createButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  shareBox: { marginTop: 30, backgroundColor: 'white', borderRadius: 16, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  shareTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 16, color: '#1A1A2E' },
  qrPlaceholder: { width: 150, height: 150, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', borderRadius: 8, marginBottom: 16 },
  qrText: { color: '#999' },
  codeText: { fontSize: 28, fontWeight: 'bold', letterSpacing: 4, marginBottom: 16, color: '#1A1A2E' },
  shareButton: { flexDirection: 'row', backgroundColor: '#F0F7FF', padding: 14, borderRadius: 10, alignItems: 'center' },
  shareButtonText: { color: '#007AFF', fontWeight: '600', fontSize: 15 },
});

export default CreateTripScreen;

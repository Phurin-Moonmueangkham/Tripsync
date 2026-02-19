import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';

const AlertScreen: React.FC<any> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.alertBox}>
        <Text style={styles.alertIcon}>🔔</Text>
        <Text style={styles.alertTitle}>Alert! Mike needs help!</Text>
        <Text style={styles.alertSub}>Mike has triggered an SOS signal. Navigate to his location.</Text>
      </View>
      <TouchableOpacity style={styles.navigateBtn} onPress={() => navigation.navigate('MapDashboard')}>
        <Text style={styles.navigateBtnText}>Navigate to Mike</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.dismissBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.dismissBtnText}>Dismiss</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDECEA', justifyContent: 'center', padding: 24 },
  alertBox: { backgroundColor: 'white', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 20, shadowColor: '#D9534F', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  alertIcon: { fontSize: 50, marginBottom: 12 },
  alertTitle: { fontSize: 22, fontWeight: 'bold', color: '#D9534F', textAlign: 'center', marginBottom: 8 },
  alertSub: { fontSize: 14, color: '#666', textAlign: 'center' },
  navigateBtn: { backgroundColor: '#D9534F', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  navigateBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  dismissBtn: { padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#D9534F' },
  dismissBtnText: { color: '#D9534F', fontSize: 15, fontWeight: '600' },
});

export default AlertScreen;

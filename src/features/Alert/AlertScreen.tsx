import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity } from 'react-native';
import { styles } from './AlertScreen.styles';

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

export default AlertScreen;

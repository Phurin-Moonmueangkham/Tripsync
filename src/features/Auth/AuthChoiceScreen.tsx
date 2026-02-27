import React from 'react';
import { SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { styles } from './AuthChoiceScreen.styles';

const AuthChoiceScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>TripSync</Text>
        <Text style={styles.subtitle}>Welcome! Please choose how you want to continue.</Text>

        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('SignIn')}>
          <Text style={styles.primaryButtonText}>Sign in</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.secondaryButtonText}>Sign up</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default AuthChoiceScreen;

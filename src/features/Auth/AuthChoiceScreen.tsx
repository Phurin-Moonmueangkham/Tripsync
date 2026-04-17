import React from 'react';
import { SafeAreaView, Text, TouchableOpacity, View, Image } from 'react-native';
import { styles } from './AuthChoiceScreen.styles';

const AuthChoiceScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <Image
        source={require('../../../assets/ดีไซน์ที่ยังไม่ได้ตั้งชื่อ.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <View style={styles.darkScrim} pointerEvents="none" />
      <View style={styles.vignette} pointerEvents="none" />
      <View style={[styles.ambient, styles.ambientOne]} pointerEvents="none" />
      <View style={[styles.ambient, styles.ambientTwo]} pointerEvents="none" />

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

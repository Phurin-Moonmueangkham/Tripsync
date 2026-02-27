import React, { useRef, useState } from 'react';
import { Alert, SafeAreaView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '../../core/store/useAuthStore';
import { styles } from './SignUpScreen.styles';

const SignUpScreen = ({ navigation }) => {
  const signUp = useAuthStore((state) => state.signUp);
  const isAuthLoading = useAuthStore((state) => state.isAuthLoading);
  const authError = useAuthStore((state) => state.authError);
  const clearAuthError = useAuthStore((state) => state.clearAuthError);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const emailInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !phoneNumber.trim() || !password.trim()) {
      Alert.alert('Missing information', 'Please fill in name, email, phone number, and password.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }

    try {
      await signUp({
        name,
        email,
        phoneNumber,
        password,
      });

      Alert.alert('Success', 'Your account has been created.');
    } catch {
      // Error message is managed by store state.
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Sign up</Text>

        <TextInput
          style={styles.input}
          placeholder="Name"
          value={name}
          returnKeyType="next"
          onSubmitEditing={() => emailInputRef.current?.focus()}
          blurOnSubmit={false}
          onChangeText={(value) => {
            clearAuthError();
            setName(value);
          }}
        />
        <TextInput
          ref={emailInputRef}
          style={styles.input}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          returnKeyType="next"
          onSubmitEditing={() => phoneInputRef.current?.focus()}
          blurOnSubmit={false}
          onChangeText={(value) => {
            clearAuthError();
            setEmail(value);
          }}
        />
        <TextInput
          ref={phoneInputRef}
          style={styles.input}
          placeholder="Phone number"
          keyboardType="phone-pad"
          value={phoneNumber}
          returnKeyType="next"
          onSubmitEditing={() => passwordInputRef.current?.focus()}
          blurOnSubmit={false}
          onChangeText={(value) => {
            clearAuthError();
            setPhoneNumber(value);
          }}
        />
        <View style={styles.passwordInputWrapper}>
          <TextInput
            ref={passwordInputRef}
            style={[styles.input, styles.passwordInput]}
            placeholder="Password"
            secureTextEntry={!isPasswordVisible}
            value={password}
            returnKeyType="done"
            onSubmitEditing={handleSignUp}
            onChangeText={(value) => {
              clearAuthError();
              setPassword(value);
            }}
          />
          <TouchableOpacity
            style={styles.passwordToggleButton}
            onPress={() => {
              setIsPasswordVisible((prev) => !prev);
            }}
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
          >
            <Text style={styles.passwordToggleIcon}>{isPasswordVisible ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryButton, isAuthLoading && styles.primaryButtonDisabled]}
          onPress={handleSignUp}
          disabled={isAuthLoading}
        >
          <Text style={styles.primaryButtonText}>{isAuthLoading ? 'Creating account...' : 'Sign up'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default SignUpScreen;

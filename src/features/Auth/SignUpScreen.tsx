import React, { useRef, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '../../core/store/useAuthStore';

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDE1E6',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  passwordInputWrapper: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 46,
  },
  passwordToggleButton: {
    position: 'absolute',
    right: 10,
    top: 8,
    height: 34,
    width: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordToggleIcon: {
    fontSize: 18,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: '#D9534F',
    marginTop: -4,
    marginBottom: 8,
    fontSize: 13,
  },
});

export default SignUpScreen;

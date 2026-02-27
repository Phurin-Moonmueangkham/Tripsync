import React, { useRef, useState } from 'react';
import { Alert, SafeAreaView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '../../core/store/useAuthStore';
import { styles } from './SignInScreen.styles';

const SignInScreen = ({ navigation }) => {
  const signIn = useAuthStore((state) => state.signIn);
  const requestPasswordReset = useAuthStore((state) => state.requestPasswordReset);
  const isAuthLoading = useAuthStore((state) => state.isAuthLoading);
  const authError = useAuthStore((state) => state.authError);
  const clearAuthError = useAuthStore((state) => state.clearAuthError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const passwordInputRef = useRef<TextInput>(null);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing information', 'Please enter your email and password.');
      return;
    }

    try {
      await signIn(email, password);
    } catch {
      // Error message is managed by store state.
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Missing email', 'Please enter your email first.');
      return;
    }

    try {
      await requestPasswordReset(email);
      Alert.alert('Reset email sent', 'Please check your inbox to reset your password.');
    } catch {
      // Error message is managed by store state.
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Sign in</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          returnKeyType="next"
          onSubmitEditing={() => passwordInputRef.current?.focus()}
          blurOnSubmit={false}
          onChangeText={(value) => {
            clearAuthError();
            setEmail(value);
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
            onSubmitEditing={handleSignIn}
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

        <TouchableOpacity style={styles.forgotPasswordButton} onPress={handleForgotPassword} disabled={isAuthLoading}>
          <Text style={styles.forgotPasswordText}>Forgot password?</Text>
        </TouchableOpacity>

        {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryButton, isAuthLoading && styles.primaryButtonDisabled]}
          onPress={handleSignIn}
          disabled={isAuthLoading}
        >
          <Text style={styles.primaryButtonText}>{isAuthLoading ? 'Signing in...' : 'Sign in'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default SignInScreen;

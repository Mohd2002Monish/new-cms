import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Svg, { Path } from 'react-native-svg';
import { X, Mail, Lock, KeyRound, User } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getBaseUrl } from '../api/client';

function GoogleIcon({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </Svg>
  );
}

export default function LoginModalScreen({ navigation }) {
  const { colors, typography } = useTheme();
  const { loginPassword, loginOtp, sendOtp, register, loginWithGoogleToken } = useAuth();

  const [activeTab, setActiveTab] = useState('password'); // 'password' | 'otp' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handlePasswordLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    const res = await loginPassword({ email: email.trim(), password });
    setLoading(false);
    if (res.success) {
      navigation.goBack();
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleSendOtp = async () => {
    if (!email) {
      setErrorMsg('Please enter your email to receive an OTP.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await sendOtp({ email: email.trim() });
      setOtpSent(true);
    } catch (e) {
      setErrorMsg(e?.response?.data?.message || 'Failed to send OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!email || !otp) {
      setErrorMsg('Please enter the OTP sent to your email.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    const res = await loginOtp({ email: email.trim(), otp: otp.trim() });
    setLoading(false);
    if (res.success) {
      navigation.goBack();
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setErrorMsg('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    const res = await register({ name: name.trim(), email: email.trim(), password });
    setLoading(false);
    if (res.success) {
      navigation.goBack();
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const apiBase = getBaseUrl().replace(/\/api\/?$/, '');
      const redirectUri = 'dailychronicle://oauth';
      const authUrl = `${apiBase}/api/public/auth/google/redirect?portalUrl=${encodeURIComponent(redirectUri)}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type === 'success' && result.url) {
        const queryString = result.url.split('?')[1] || '';
        const params = new URLSearchParams(queryString);
        const token = params.get('google_token');
        const googleName = params.get('google_name');
        const authError = params.get('auth_error');

        if (authError) {
          setErrorMsg(decodeURIComponent(authError));
          return;
        }

        if (token) {
          const res = await loginWithGoogleToken(token, googleName);
          if (res?.success) {
            navigation.goBack();
          } else {
            setErrorMsg(res?.message || 'Google authentication failed');
          }
        } else {
          setErrorMsg('No authentication token returned by Google');
        }
      }
    } catch (err) {
      console.warn('Google sign-in error:', err);
      setErrorMsg(err?.message || 'Unable to connect to Google OAuth.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <X size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: typography.fontSerif }]}>
          Reader Sign In
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        {/* Google One-Tap Sign In */}
        <TouchableOpacity
          style={[styles.googleButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
          onPress={handleGoogleLogin}
          activeOpacity={0.85}
          disabled={loading}
        >
          <GoogleIcon size={20} />
          <Text style={[styles.googleButtonText, { color: colors.text }]}>
            Continue with Google
          </Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.borderLight }]} />
          <Text style={[styles.dividerText, { color: colors.textMuted }]}>OR CONTINUE WITH EMAIL</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.borderLight }]} />
        </View>

        {/* Tab Buttons */}
        <View style={[styles.tabBar, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'password' && { backgroundColor: colors.accent }]}
            onPress={() => { setActiveTab('password'); setErrorMsg(''); }}
          >
            <Text style={[styles.tabText, { color: activeTab === 'password' ? '#ffffff' : colors.textSecondary }]}>
              Password
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'otp' && { backgroundColor: colors.accent }]}
            onPress={() => { setActiveTab('otp'); setErrorMsg(''); }}
          >
            <Text style={[styles.tabText, { color: activeTab === 'otp' ? '#ffffff' : colors.textSecondary }]}>
              Instant OTP
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'register' && { backgroundColor: colors.accent }]}
            onPress={() => { setActiveTab('register'); setErrorMsg(''); }}
          >
            <Text style={[styles.tabText, { color: activeTab === 'register' ? '#ffffff' : colors.textSecondary }]}>
              Register
            </Text>
          </TouchableOpacity>
        </View>

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Register Fields */}
        {activeTab === 'register' && (
          <View style={[styles.inputRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <User size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Your Full Name"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>
        )}

        {/* Email Field */}
        <View style={[styles.inputRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Mail size={18} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="reader@example.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* Password Field (for Password login & Register) */}
        {activeTab !== 'otp' && (
          <View style={[styles.inputRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Lock size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Your Secret Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>
        )}

        {/* OTP Field (for OTP login) */}
        {activeTab === 'otp' && otpSent && (
          <View style={[styles.inputRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <KeyRound size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="6-digit verification code"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
            />
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary }]}
          onPress={
            activeTab === 'password'
              ? handlePasswordLogin
              : activeTab === 'register'
              ? handleRegister
              : !otpSent
              ? handleSendOtp
              : handleVerifyOtp
          }
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {activeTab === 'password'
                ? 'Sign In'
                : activeTab === 'register'
                ? 'Create Reader Account'
                : !otpSent
                ? 'Send Login Code'
                : 'Verify & Sign In'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    padding: 20,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    marginBottom: 16,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 3,
    marginBottom: 20,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    padding: 10,
    borderRadius: 6,
    marginBottom: 16,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  submitButton: {
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});


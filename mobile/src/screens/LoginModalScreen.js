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
import { X, Mail, Lock, KeyRound, User } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function LoginModalScreen({ navigation }) {
  const { colors, typography } = useTheme();
  const { loginPassword, loginOtp, sendOtp, register } = useAuth();

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


'use client';

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X } from 'lucide-react';
import AuthGoogleButton from './auth/AuthGoogleButton';
import AuthTabs from './auth/AuthTabs';
import AuthLoginForm from './auth/AuthLoginForm';
import AuthOtpForm from './auth/AuthOtpForm';
import AuthRegisterForm from './auth/AuthRegisterForm';
import AuthForgotPasswordForm from './auth/AuthForgotPasswordForm';
import AuthResetPasswordForm from './auth/AuthResetPasswordForm';
import AuthDevQuickLogin from './auth/AuthDevQuickLogin';

/**
 * AuthModal — Orchestrator component for user authentication (Login, Register, OTP, Password Reset)
 */
export default function AuthModal() {
  const {
    authModalOpen,
    closeAuthModal,
    loginWithPassword,
    sendLoginOtp,
    loginWithOtp,
    devLogin,
    register,
    forgotPassword,
    resetPassword,
    loginWithGoogle,
    getGoogleAuthConfig,
    authError,
    setAuthError,
  } = useAuth();

  const [mode, setMode] = useState('login-password'); // login-password | login-otp | register | forgot | reset
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);

  const displayError = error || authError;

  if (!authModalOpen) return null;

  const resetMessages = () => {
    setError('');
    setSuccess('');
    setAuthError?.('');
  };

  const changeMode = (newMode) => {
    setMode(newMode);
    resetMessages();
  };

  // Google OAuth Sign In / Sign Up handler
  const handleGoogleAuth = async () => {
    resetMessages();
    setGoogleLoading(true);
    try {
      const config = await getGoogleAuthConfig();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3030/api';

      if (config?.enabled && config?.clientId) {
        window.location.href = `${apiUrl}/public/auth/google/redirect`;
      } else {
        const proceedMock = window.confirm(
          "Google OAuth has not been configured in Admin Settings yet (Settings > Google OAuth).\n\nWould you like to simulate signing up/in with a Google Reader test account for development?"
        );
        if (proceedMock) {
          const res = await loginWithGoogle({
            mockEmail: 'google.reader@newscms.dev',
            mockName: 'Google Reader',
          });
          if (!res.success) {
            setError(res.message || 'Google authentication failed');
          }
        } else {
          setError('Google OAuth is not configured. An administrator can configure Client ID & Secret in Admin Settings > Google OAuth.');
        }
      }
    } catch (err) {
      setError(err?.message || 'Failed to initiate Google authentication');
    } finally {
      setGoogleLoading(false);
    }
  };

  // 60-second OTP resend timer
  const startTimer = () => {
    setTimer(60);
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Handlers
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    resetMessages();
    if (!email || !password) return setError('Please fill in all fields.');
    setSubmitting(true);
    const res = await loginWithPassword(email, password);
    setSubmitting(false);
    if (!res.success) setError(res.message);
  };

  const handleSendOtp = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    resetMessages();
    if (!email) return setError('Please enter your email.');
    setSubmitting(true);
    const res = await sendLoginOtp(email);
    setSubmitting(false);
    if (res.success) {
      setOtpSent(true);
      setSuccess('OTP verification code sent to ' + email);
      startTimer();
    } else {
      setError(res.message);
    }
  };

  const handleOtpLogin = async (e) => {
    e.preventDefault();
    resetMessages();
    if (!email || !otp) return setError('Please enter the verification OTP.');
    setSubmitting(true);
    const res = await loginWithOtp(email, otp);
    setSubmitting(false);
    if (!res.success) setError(res.message);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    resetMessages();
    if (!name || !email || !password) return setError('Please fill in all fields.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    setSubmitting(true);
    const res = await register(name, email, password);
    setSubmitting(false);
    if (!res.success) setError(res.message);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    resetMessages();
    if (!email) return setError('Please enter your email.');
    setSubmitting(true);
    const res = await forgotPassword(email);
    setSubmitting(false);
    if (res.success) {
      setSuccess('Verification OTP sent for password reset.');
      setMode('reset');
    } else {
      setError(res.message);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    resetMessages();
    if (!email || !otp || !newPassword) return setError('Please fill in all fields.');
    if (newPassword.length < 6) return setError('New password must be at least 6 characters.');
    setSubmitting(true);
    const res = await resetPassword(email, otp, newPassword);
    setSubmitting(false);
    if (res.success) {
      setSuccess('Password updated successfully. You can now log in.');
      setTimeout(() => {
        changeMode('login-password');
      }, 1500);
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={closeAuthModal} aria-modal="true" role="dialog">
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={closeAuthModal} aria-label="Close modal">
          <X size={18} />
        </button>

        {/* Header Branding */}
        <div className="auth-modal-header">
          <div className="auth-brand-logo">N</div>
          <h2 className="auth-modal-title">
            {mode === 'register' && 'Join NewsPortal'}
            {(mode === 'login-password' || mode === 'login-otp') && 'Welcome Back'}
            {mode === 'forgot' && 'Reset Password'}
            {mode === 'reset' && 'Create New Password'}
          </h2>
          <p className="auth-modal-subtitle">
            {mode === 'register' && 'Create an account to unlock bookmarks, customized feeds, and reactions.'}
            {(mode === 'login-password' || mode === 'login-otp') && 'Sign in to sync your saved stories and reading interests.'}
            {mode === 'forgot' && "Enter your email and we'll send a 6-digit OTP code to verify."}
            {mode === 'reset' && 'Enter the 6-digit verification code and your new password.'}
          </p>
        </div>

        {/* Alerts */}
        {displayError && <div className="auth-alert error">{displayError}</div>}
        {success && <div className="auth-alert success">{success}</div>}

        {/* Login Mode (Password & OTP) */}
        {(mode === 'login-password' || mode === 'login-otp') && (
          <form
            onSubmit={
              mode === 'login-password'
                ? handlePasswordLogin
                : otpSent
                ? handleOtpLogin
                : handleSendOtp
            }
            className="auth-form"
          >
            <AuthGoogleButton
              onGoogleAuth={handleGoogleAuth}
              submitting={submitting}
              googleLoading={googleLoading}
            />

            <AuthTabs mode={mode} onSelectMode={changeMode} />

            {mode === 'login-password' ? (
              <AuthLoginForm
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                onSubmit={handlePasswordLogin}
                submitting={submitting}
                onForgotPassword={() => changeMode('forgot')}
              />
            ) : (
              <AuthOtpForm
                email={email}
                setEmail={setEmail}
                otp={otp}
                setOtp={setOtp}
                otpSent={otpSent}
                timer={timer}
                submitting={submitting}
                onSendOtp={handleSendOtp}
              />
            )}
          </form>
        )}

        {/* Register Mode */}
        {mode === 'register' && (
          <AuthRegisterForm
            name={name}
            setName={setName}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            onSubmit={handleRegister}
            onGoogleAuth={handleGoogleAuth}
            submitting={submitting}
            googleLoading={googleLoading}
          />
        )}

        {/* Forgot Password Mode */}
        {mode === 'forgot' && (
          <AuthForgotPasswordForm
            email={email}
            setEmail={setEmail}
            onSubmit={handleForgotPassword}
            onBackToLogin={() => changeMode('login-password')}
            submitting={submitting}
          />
        )}

        {/* Reset Password Mode */}
        {mode === 'reset' && (
          <AuthResetPasswordForm
            email={email}
            setEmail={setEmail}
            otp={otp}
            setOtp={setOtp}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            onSubmit={handleResetPassword}
            submitting={submitting}
          />
        )}

        {/* One-Click Dev Login */}
        <AuthDevQuickLogin onDevLogin={devLogin} submitting={submitting} />

        {/* Footer Toggle */}
        <div className="auth-modal-footer">
          {mode === 'register' ? (
            <p>
              Already have an account?{' '}
              <button onClick={() => changeMode('login-password')}>Sign In</button>
            </p>
          ) : (
            mode !== 'forgot' &&
            mode !== 'reset' && (
              <p>
                Don&apos;t have an account?{' '}
                <button onClick={() => changeMode('register')}>Sign Up</button>
              </p>
            )
          )}
        </div>
      </div>
    </div>
  );
}

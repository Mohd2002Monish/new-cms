'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Mail, Lock, User, Key, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

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
        // Redirect browser to dynamic Google OAuth consent flow configured in Admin
        window.location.href = `${apiUrl}/public/auth/google/redirect`;
      } else {
        // Fallback when OAuth is still in local development or not configured in Admin Settings yet
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

  // Start a 60-second OTP resend timer
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

  // Email + Password Sign In
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    resetMessages();
    if (!email || !password) return setError('Please fill in all fields.');
    setSubmitting(true);
    const res = await loginWithPassword(email, password);
    setSubmitting(false);
    if (!res.success) setError(res.message);
  };

  // Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
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

  // Verify OTP Login
  const handleOtpLogin = async (e) => {
    e.preventDefault();
    resetMessages();
    if (!email || !otp) return setError('Please enter the verification OTP.');
    setSubmitting(true);
    const res = await loginWithOtp(email, otp);
    setSubmitting(false);
    if (!res.success) setError(res.message);
  };

  // Register Account
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

  // Forgot Password (Send code)
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

  // Reset Password
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
        {/* Close button */}
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

        {/* Alert Messages */}
        {displayError && <div className="auth-alert error">{displayError}</div>}
        {success && <div className="auth-alert success">{success}</div>}

        {/* ─── Mode: LOGIN (PASSWORD & OTP TABS) ─── */}
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
            <button
              type="button"
              className="auth-google-btn"
              onClick={handleGoogleAuth}
              disabled={submitting || googleLoading}
              id="google-signin-btn"
            >
              <GoogleIcon />
              <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>

            <div className="auth-divider">
              <span>or continue with email</span>
            </div>

            {/* Segmented Tab Switcher */}
            <div className="auth-tabs" role="tablist" aria-label="Sign In Method">
              <button
                type="button"
                role="tab"
                id="auth-tab-password"
                aria-selected={mode === 'login-password'}
                className={`auth-tab ${mode === 'login-password' ? 'active' : ''}`}
                onClick={() => changeMode('login-password')}
              >
                <Lock size={15} />
                <span>Password</span>
              </button>
              <button
                type="button"
                role="tab"
                id="auth-tab-otp"
                aria-selected={mode === 'login-otp'}
                className={`auth-tab ${mode === 'login-otp' ? 'active' : ''}`}
                onClick={() => changeMode('login-otp')}
              >
                <Key size={15} />
                <span>Verification OTP</span>
              </button>
            </div>

            {/* Email Address */}
            <div className="auth-input-group">
              <label htmlFor="login-email">Email Address</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input
                  id="login-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={mode === 'login-otp' && otpSent}
                  required
                />
              </div>
            </div>

            {/* Password input when Password tab is selected */}
            {mode === 'login-password' && (
              <div className="auth-input-group animate-slide-up">
                <div className="label-row">
                  <label htmlFor="login-pass">Password</label>
                  <button type="button" className="auth-link-btn text-xs" onClick={() => changeMode('forgot')}>
                    Forgot Password?
                  </button>
                </div>
                <div className="auth-input-wrap">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    id="login-pass"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {/* OTP code input when OTP tab is selected and OTP has been sent */}
            {mode === 'login-otp' && otpSent && (
              <div className="auth-input-group animate-slide-up">
                <div className="label-row">
                  <label htmlFor="otp-code">6-Digit Verification Code</label>
                  {timer > 0 ? (
                    <span className="text-xs text-secondary">Resend in {timer}s</span>
                  ) : (
                    <button type="button" className="auth-link-btn text-xs" onClick={handleSendOtp}>
                      Resend Code
                    </button>
                  )}
                </div>
                <div className="auth-input-wrap">
                  <Key size={16} className="auth-input-icon" />
                  <input
                    id="otp-code"
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>
              </div>
            )}

            <button type="submit" className="auth-submit-btn" disabled={submitting}>
              {submitting
                ? 'Processing...'
                : mode === 'login-password'
                ? 'Sign In'
                : otpSent
                ? 'Verify & Sign In'
                : 'Send Verification OTP'}
              <ArrowRight size={16} style={{ marginLeft: 6 }} />
            </button>
          </form>
        )}

        {/* ─── Mode: REGISTER ─── */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="auth-form">
            <button
              type="button"
              className="auth-google-btn"
              onClick={handleGoogleAuth}
              disabled={submitting || googleLoading}
              id="google-signup-btn"
            >
              <GoogleIcon />
              <span>{googleLoading ? 'Connecting to Google...' : 'Sign up with Google'}</span>
            </button>

            <div className="auth-divider">
              <span>or sign up with email</span>
            </div>

            <div className="auth-input-group">
              <label htmlFor="reg-name">Full Name</label>
              <div className="auth-input-wrap">
                <User size={16} className="auth-input-icon" />
                <input
                  id="reg-name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label htmlFor="reg-email">Email Address</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input
                  id="reg-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label htmlFor="reg-pass">Password (min 6 characters)</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="reg-pass"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={submitting}>
              {submitting ? 'Creating Account...' : 'Create Account'}
              <ArrowRight size={16} style={{ marginLeft: 6 }} />
            </button>
          </form>
        )}

        {/* ─── Mode: FORGOT PASSWORD ─── */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="auth-form">
            <div className="auth-input-group">
              <label htmlFor="forgot-email">Email Address</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={submitting}>
              {submitting ? 'Sending OTP...' : 'Send Verification OTP'}
              <ArrowRight size={16} style={{ marginLeft: 6 }} />
            </button>

            <button type="button" className="auth-link-btn justify-center mt-4 text-sm font-medium" onClick={() => changeMode('login-password')}>
              Back to Sign In
            </button>
          </form>
        )}

        {/* ─── Mode: RESET PASSWORD ─── */}
        {mode === 'reset' && (
          <form onSubmit={handleResetPassword} className="auth-form">
            <div className="auth-input-group">
              <label htmlFor="reset-email">Confirm Email</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label htmlFor="reset-otp">6-Digit Verification Code</label>
              <div className="auth-input-wrap">
                <Key size={16} className="auth-input-icon" />
                <input
                  id="reset-otp"
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label htmlFor="reset-pass">New Password (min 6 characters)</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="reset-pass"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={submitting}>
              {submitting ? 'Resetting Password...' : 'Reset Password & Log In'}
              <ArrowRight size={16} style={{ marginLeft: 6 }} />
            </button>
          </form>
        )}

        {/* ─── One-Click Dev Login ─── */}
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b', display: 'inline-block' }} />
              Dev 1-Click Login
            </span>
            <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Instant Session</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            <button
              type="button"
              disabled={submitting}
              onClick={() => devLogin('reader')}
              style={{
                padding: '0.5rem',
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.2rem'
              }}
            >
              <span>📖</span>
              <span>Reader</span>
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => devLogin('editor')}
              style={{
                padding: '0.5rem',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.2rem'
              }}
            >
              <span>✍️</span>
              <span>Editor</span>
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => devLogin('admin')}
              style={{
                padding: '0.5rem',
                backgroundColor: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.2rem'
              }}
            >
              <span>👑</span>
              <span>Admin</span>
            </button>
          </div>
        </div>

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

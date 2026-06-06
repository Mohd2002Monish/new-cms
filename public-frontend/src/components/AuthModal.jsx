'use client';

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Mail, Lock, User, Key, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function AuthModal() {
  const {
    authModalOpen,
    closeAuthModal,
    loginWithPassword,
    sendLoginOtp,
    loginWithOtp,
    register,
    forgotPassword,
    resetPassword
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
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);

  if (!authModalOpen) return null;

  const resetMessages = () => {
    setError('');
    setSuccess('');
  };

  const changeMode = (newMode) => {
    setMode(newMode);
    resetMessages();
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
        {error && <div className="auth-alert error">{error}</div>}
        {success && <div className="auth-alert success">{success}</div>}

        {/* ─── Mode: LOGIN WITH PASSWORD ─── */}
        {mode === 'login-password' && (
          <form onSubmit={handlePasswordLogin} className="auth-form">
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
                  required
                />
              </div>
            </div>

            <div className="auth-input-group">
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

            <button type="submit" className="auth-submit-btn" disabled={submitting}>
              {submitting ? 'Signing In...' : 'Sign In'}
              <ArrowRight size={16} style={{ marginLeft: 6 }} />
            </button>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <button type="button" className="auth-secondary-btn" onClick={() => changeMode('login-otp')}>
              Sign In with Verification OTP
            </button>
          </form>
        )}

        {/* ─── Mode: LOGIN WITH OTP ─── */}
        {mode === 'login-otp' && (
          <form onSubmit={otpSent ? handleOtpLogin : handleSendOtp} className="auth-form">
            <div className="auth-input-group">
              <label htmlFor="otp-email">Email Address</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input
                  id="otp-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={otpSent}
                  required
                />
              </div>
            </div>

            {otpSent && (
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
              {submitting ? 'Processing...' : otpSent ? 'Verify & Sign In' : 'Send Verification OTP'}
              <ArrowRight size={16} style={{ marginLeft: 6 }} />
            </button>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <button type="button" className="auth-secondary-btn" onClick={() => changeMode('login-password')}>
              Sign In with Password
            </button>
          </form>
        )}

        {/* ─── Mode: REGISTER ─── */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="auth-form">
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
                Don't have an account?{' '}
                <button onClick={() => changeMode('register')}>Sign Up</button>
              </p>
            )
          )}
        </div>
      </div>
    </div>
  );
}

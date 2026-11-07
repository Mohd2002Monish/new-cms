'use client';

import { Mail, Key, Lock, ArrowRight } from 'lucide-react';

/**
 * AuthResetPasswordForm — Verification OTP + New Password submission form
 */
export default function AuthResetPasswordForm({
  email,
  setEmail,
  otp,
  setOtp,
  newPassword,
  setNewPassword,
  onSubmit,
  submitting,
}) {
  return (
    <form onSubmit={onSubmit} className="auth-form">
      <div className="auth-input-group">
        <label htmlFor="reset-email">Confirm Email</label>
        <div className="auth-input-wrap">
          <Mail size={16} className="auth-input-icon" />
          <input
            id="reset-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
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
            disabled={submitting}
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
            disabled={submitting}
            autoComplete="new-password"
            required
          />
        </div>
      </div>

      <button type="submit" className="auth-submit-btn" disabled={submitting}>
        <span>{submitting ? 'Resetting Password...' : 'Reset Password & Log In'}</span>
        <ArrowRight size={16} style={{ marginLeft: 6 }} />
      </button>
    </form>
  );
}


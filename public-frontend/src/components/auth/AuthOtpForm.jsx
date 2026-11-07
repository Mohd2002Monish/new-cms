'use client';

import { Mail, Key, ArrowRight } from 'lucide-react';

/**
 * AuthOtpForm — Passwordless OTP sign-in form
 */
export default function AuthOtpForm({
  email,
  setEmail,
  otp,
  setOtp,
  otpSent,
  timer,
  submitting,
  onSendOtp,
}) {
  return (
    <>
      {/* Email Address */}
      <div className="auth-input-group">
        <label htmlFor="login-email-otp">Email Address</label>
        <div className="auth-input-wrap">
          <Mail size={16} className="auth-input-icon" />
          <input
            id="login-email-otp"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting || otpSent}
            autoComplete="email"
            required
          />
        </div>
      </div>

      {/* OTP Code (Only shown once sent) */}
      {otpSent && (
        <div className="auth-input-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="otp-code">6-Digit OTP Code</label>
            {timer > 0 ? (
              <span style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>
                Resend in {timer}s
              </span>
            ) : (
              <button
                type="button"
                className="auth-link-btn text-xs"
                onClick={onSendOtp}
              >
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
        <span>
          {submitting
            ? 'Processing...'
            : otpSent
            ? 'Verify & Sign In'
            : 'Send Verification OTP'}
        </span>
        <ArrowRight size={16} style={{ marginLeft: 6 }} />
      </button>
    </>
  );
}


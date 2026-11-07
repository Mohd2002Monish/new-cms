'use client';

import { Mail, ArrowRight } from 'lucide-react';

/**
 * AuthForgotPasswordForm — Email submission to trigger reset password OTP
 */
export default function AuthForgotPasswordForm({
  email,
  setEmail,
  onSubmit,
  onBackToLogin,
  submitting,
}) {
  return (
    <form onSubmit={onSubmit} className="auth-form">
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
            disabled={submitting}
            autoComplete="email"
            required
          />
        </div>
      </div>

      <button type="submit" className="auth-submit-btn" disabled={submitting}>
        <span>{submitting ? 'Sending OTP...' : 'Send Verification OTP'}</span>
        <ArrowRight size={16} style={{ marginLeft: 6 }} />
      </button>

      <button
        type="button"
        className="auth-link-btn justify-center mt-4 text-sm font-medium"
        onClick={onBackToLogin}
      >
        Back to Sign In
      </button>
    </form>
  );
}


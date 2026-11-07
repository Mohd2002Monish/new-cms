'use client';

import { Mail, Lock, ArrowRight } from 'lucide-react';

/**
 * AuthLoginForm — Email & Password sign-in form
 */
export default function AuthLoginForm({
  email,
  setEmail,
  password,
  setPassword,
  onSubmit,
  submitting,
  onForgotPassword,
}) {
  return (
    <>
      {/* Email Address */}
      <div className="auth-input-group">
        <label htmlFor="login-email">Email Address</label>
        <div className="auth-input-wrap">
          <Mail size={16} className="auth-input-icon" />
          <input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            autoComplete="email"
            required
          />
        </div>
      </div>

      {/* Password */}
      <div className="auth-input-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label htmlFor="login-password">Password</label>
          <button
            type="button"
            className="auth-link-btn"
            onClick={onForgotPassword}
            style={{ fontSize: '12px' }}
          >
            Forgot?
          </button>
        </div>
        <div className="auth-input-wrap">
          <Lock size={16} className="auth-input-icon" />
          <input
            id="login-password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            autoComplete="current-password"
            required
          />
        </div>
      </div>

      <button type="submit" className="auth-submit-btn" disabled={submitting}>
        <span>{submitting ? 'Signing in...' : 'Sign In'}</span>
        <ArrowRight size={16} />
      </button>
    </>
  );
}


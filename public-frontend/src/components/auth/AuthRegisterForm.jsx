'use client';

import { User, Mail, Lock, ArrowRight } from 'lucide-react';
import AuthGoogleButton from './AuthGoogleButton';

/**
 * AuthRegisterForm — Registration form with Google and Email
 */
export default function AuthRegisterForm({
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  onSubmit,
  onGoogleAuth,
  submitting,
  googleLoading,
}) {
  return (
    <form onSubmit={onSubmit} className="auth-form">
      <AuthGoogleButton
        onGoogleAuth={onGoogleAuth}
        submitting={submitting}
        googleLoading={googleLoading}
      />

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
            disabled={submitting}
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
            disabled={submitting}
            autoComplete="email"
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
            disabled={submitting}
            autoComplete="new-password"
            required
          />
        </div>
      </div>

      <button type="submit" className="auth-submit-btn" disabled={submitting}>
        <span>{submitting ? 'Creating Account...' : 'Create Account'}</span>
        <ArrowRight size={16} style={{ marginLeft: 6 }} />
      </button>
    </form>
  );
}


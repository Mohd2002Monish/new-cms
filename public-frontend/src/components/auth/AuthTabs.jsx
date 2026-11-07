'use client';

import { Lock, Key } from 'lucide-react';

/**
 * AuthTabs — Switch between Password and OTP login methods
 */
export default function AuthTabs({ mode, onSelectMode }) {
  return (
    <div className="auth-tabs" role="tablist" aria-label="Sign In Method">
      <button
        type="button"
        role="tab"
        id="auth-tab-password"
        aria-selected={mode === 'login-password'}
        className={`auth-tab ${mode === 'login-password' ? 'active' : ''}`}
        onClick={() => onSelectMode('login-password')}
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
        onClick={() => onSelectMode('login-otp')}
      >
        <Key size={15} />
        <span>Verification OTP</span>
      </button>
    </div>
  );
}


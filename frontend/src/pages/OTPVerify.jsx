import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { verifyOTP, loginUser, clearError, selectAuth } from '../features/auth/authSlice.js';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 300; // 5 minutes

export default function OTPVerify() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, otpPending, otpEmail, isAuthenticated } = useSelector(selectAuth);

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!otpPending && !isAuthenticated) navigate('/login', { replace: true });
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [otpPending, isAuthenticated, navigate]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleOtpChange = (index, value) => {
    dispatch(clearError());
    if (!/^\d?$/.test(value)) return;
    const updated = [...otp];
    updated[index] = value;
    setOtp(updated);
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (pasted.length === OTP_LENGTH) {
      setOtp(pasted.split(''));
      inputRefs.current[OTP_LENGTH - 1]?.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) return;
    dispatch(verifyOTP({ email: otpEmail, otp: code }));
  };

  const handleResend = () => {
    if (!canResend) return;
    dispatch(loginUser({ email: otpEmail, password: '' })); // triggers resend flow
    setOtp(Array(OTP_LENGTH).fill(''));
    setCountdown(RESEND_SECONDS);
    setCanResend(false);
  };

  const minutes = String(Math.floor(countdown / 60)).padStart(2, '0');
  const seconds = String(countdown % 60).padStart(2, '0');

  return (
    <div className="min-h-screen bg-theme-cream flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-15%] right-[-10%] w-[45%] h-[45%] rounded-full bg-theme-mint opacity-30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[45%] h-[45%] rounded-full bg-theme-lavender opacity-30 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-theme-purple shadow-lg mb-4">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-slate-900">Verify Identity</h1>
          <p className="text-slate-500 mt-1">
            Enter the 6-digit code sent to <br />
            <span className="font-semibold text-slate-700">{otpEmail}</span>
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/60 p-8 relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-theme-purple via-theme-lavender to-theme-mint rounded-t-2xl" />

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* OTP digit boxes */}
            <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  ref={(el) => (inputRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 border-slate-200
                    bg-white text-slate-800 focus:outline-none focus:border-theme-purple focus:ring-2
                    focus:ring-theme-purple/30 transition"
                />
              ))}
            </div>

            {/* Countdown */}
            <div className="text-center">
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-theme-purple font-semibold text-sm hover:underline"
                >
                  Resend OTP
                </button>
              ) : (
                <p className="text-sm text-slate-500">
                  Resend available in{' '}
                  <span className="font-mono font-bold text-slate-700">{minutes}:{seconds}</span>
                </p>
              )}
            </div>

            <button
              id="otp-submit"
              type="submit"
              disabled={loading || otp.join('').length < OTP_LENGTH}
              className="w-full py-3 px-6 bg-theme-purple hover:bg-purple-600 text-white font-bold rounded-xl
                transition-all duration-200 hover:shadow-lg hover:shadow-theme-purple/30
                disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verifying…
                </>
              ) : (
                'Verify & Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

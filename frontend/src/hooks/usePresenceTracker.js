import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '../features/auth/authSlice.js';
import { initSocket, getSocket } from '../services/socket.js';

const IDLE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes idle -> mark as 'away'

/**
 * Hook to automatically broadcast Microsoft Teams-style presence:
 * - 'active': user has tab focused and interacted within 2 minutes.
 * - 'away': tab is hidden/minimized, blurred, or user is idle > 2 minutes.
 */
export function usePresenceTracker() {
  const user = useSelector(selectUser);
  const [presenceStatus, setPresenceStatus] = useState('active');
  const idleTimerRef = useRef(null);
  const statusRef = useRef('active');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token || !user) return;

    const socket = initSocket(token);

    const updateStatus = (newStatus) => {
      if (statusRef.current === newStatus) return;
      statusRef.current = newStatus;
      setPresenceStatus(newStatus);
      if (socket && socket.connected) {
        socket.emit('presence_status', { status: newStatus });
      }
    };

    // 1. Tab Visibility change (switched tabs / minimized window)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateStatus('away');
      } else {
        updateStatus('active');
        resetIdleTimer();
      }
    };

    // 2. Window Blur / Focus
    const handleWindowBlur = () => {
      updateStatus('away');
    };

    const handleWindowFocus = () => {
      updateStatus('active');
      resetIdleTimer();
    };

    // 3. Idle Detection (no user input for 2 minutes)
    const resetIdleTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

      if (!document.hidden) {
        if (statusRef.current === 'away') {
          updateStatus('active');
        }
        idleTimerRef.current = setTimeout(() => {
          updateStatus('away');
        }, IDLE_TIMEOUT_MS);
      }
    };

    // Attach activity listeners
    const activityEvents = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach((evt) => {
      window.addEventListener(evt, resetIdleTimer, { passive: true });
    });

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    // Initial check
    if (document.hidden) {
      updateStatus('away');
    } else {
      updateStatus('active');
      resetIdleTimer();
    }

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, resetIdleTimer);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [user]);

  return { presenceStatus };
}

import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['auth/login/fulfilled', 'auth/verifyOtp/fulfilled'],
      },
    }),
});

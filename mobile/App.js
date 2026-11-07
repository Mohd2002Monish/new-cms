import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ErrorBoundary from './src/components/ErrorBoundary';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { AudioPlaylistProvider } from './src/context/AudioPlaylistContext';
import AppNavigator from './src/navigation/AppNavigator';
import { initApiUrl } from './src/api/client';
import logger from './src/utils/logger';

function RootApp() {
  const { isDarkMode } = useTheme();

  useEffect(() => {
    logger.info('App', 'App initialized');
    initApiUrl().catch((e) => logger.warn('App', 'initApiUrl warning', e));
  }, []);

  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <AudioPlaylistProvider>
              <RootApp />
            </AudioPlaylistProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

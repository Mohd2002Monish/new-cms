import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAudioPlaylist } from '../context/AudioPlaylistContext';
import BottomTabs from './BottomTabs';
import ArticleDetailScreen from '../screens/ArticleDetailScreen';
import SearchScreen from '../screens/SearchScreen';
import LoginModalScreen from '../screens/LoginModalScreen';
import AudioDigestModalScreen from '../screens/AudioDigestModalScreen';
import FloatingMiniPlayer from '../components/FloatingMiniPlayer';

export const navigationRef = createNavigationContainerRef();

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { colors, isDarkMode } = useTheme();

  const handleOpenAudioModal = () => {
    if (navigationRef.isReady()) {
      navigationRef.navigate('AudioDigestModal');
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <NavigationContainer
        ref={navigationRef}
        theme={{
          dark: isDarkMode,
          colors: {
            primary: colors.primary,
            background: colors.background,
            card: colors.surface,
            text: colors.text,
            border: colors.border,
            notification: colors.primary,
          },
        }}
      >
        <Stack.Navigator
          detachInactiveScreens={false}
          screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}
        >
          <Stack.Screen name="MainTabs" component={BottomTabs} />
          <Stack.Screen
            name="ArticleDetail"
            component={ArticleDetailScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Search"
            component={SearchScreen}
            options={{ animation: 'fade' }}
          />
          <Stack.Screen
            name="LoginModal"
            component={LoginModalScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="AudioDigestModal"
            component={AudioDigestModalScreen}
            options={{ presentation: 'fullScreenModal' }}
          />
        </Stack.Navigator>

        {/* Global Persistent Floating Mini-Player for continuous audio playback */}
        <FloatingMiniPlayer onOpenFullPlayer={handleOpenAudioModal} />
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});


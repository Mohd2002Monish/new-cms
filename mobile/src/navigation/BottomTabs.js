import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Newspaper, Grid, Headphones, Bookmark, User } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAudioPlaylist } from '../context/AudioPlaylistContext';
import HomeScreen from '../screens/HomeScreen';
import CategoryScreen from '../screens/CategoryScreen';
import BookmarksScreen from '../screens/BookmarksScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

// Empty component for the audio brief tab (clicking it directly opens full audio modal)
function AudioBriefTabPlaceholder() {
  return <View style={{ flex: 1 }} />;
}

export default function BottomTabs({ navigation }) {
  const { colors } = useTheme();
  const { isPlaying, setIsFullPlayerVisible } = useAudioPlaylist();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderLight,
          height: 54,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Headlines',
          tabBarIcon: ({ color, size }) => <Newspaper size={20} color={color} />,
        }}
      />

      <Tab.Screen
        name="Categories"
        component={CategoryScreen}
        options={{
          tabBarLabel: 'Sections',
          tabBarIcon: ({ color, size }) => <Grid size={20} color={color} />,
        }}
      />

      <Tab.Screen
        name="AudioBrief"
        component={AudioBriefTabPlaceholder}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            setIsFullPlayerVisible(true);
            navigation.navigate('AudioDigestModal');
          },
        }}
        options={{
          tabBarLabel: 'Daily Audio',
          tabBarIcon: ({ color }) => (
            <View style={[styles.audioPill, { backgroundColor: isPlaying ? colors.primary : colors.surfaceAlt }]}>
              <Headphones size={18} color={isPlaying ? '#ffffff' : color} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Bookmarks"
        component={BookmarksScreen}
        options={{
          tabBarLabel: 'Saved',
          tabBarIcon: ({ color, size }) => <Bookmark size={20} color={color} />,
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Account',
          tabBarIcon: ({ color, size }) => <User size={20} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  audioPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});


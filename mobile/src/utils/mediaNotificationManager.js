import { Platform } from 'react-native';

let Notifications = null;
try {
  Notifications = require('expo-notifications');
} catch (_) {
  Notifications = null;
}

const NOTIFICATION_ID = 'daily-chronicle-media-player';
const CHANNEL_ID = 'media-playback-channel';

let isConfigured = false;

// Configure default notification handler so audio notifications don't trigger loud popups or alerts
if (Notifications && typeof Notifications.setNotificationHandler === 'function') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Initialize notification channels and interactive action categories
 */
export async function initMediaNotifications() {
  if (!Notifications || Platform.OS === 'web' || isConfigured) return;

  try {
    // 1. Android Notification Channel (Public on Lock Screen, silent updates)
    if (Platform.OS === 'android' && typeof Notifications.setNotificationChannelAsync === 'function') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Daily Chronicle Media Player',
        importance: Notifications.AndroidImportance.LOW,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: null,
        vibrationPattern: null,
        enableVibrate: false,
        showBadge: false,
      });
    }

    // 2. Interactive Action Categories (Playing vs Paused states)
    if (typeof Notifications.setNotificationCategoryAsync === 'function') {
      await Notifications.setNotificationCategoryAsync('media-player-playing', [
        {
          identifier: 'pause',
          buttonTitle: '⏸ Pause',
          options: { opensAppToForeground: false },
        },
        {
          identifier: 'next',
          buttonTitle: '⏭ Next',
          options: { opensAppToForeground: false },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('media-player-paused', [
        {
          identifier: 'play',
          buttonTitle: '▶ Resume',
          options: { opensAppToForeground: false },
        },
        {
          identifier: 'next',
          buttonTitle: '⏭ Next',
          options: { opensAppToForeground: false },
        },
      ]);
    }

    isConfigured = true;
  } catch (err) {
    console.warn('initMediaNotifications warning:', err?.message);
  }
}

/**
 * Present or update the persistent media notification in the status bar & lock screen
 */
export async function updateMediaNotification({
  title,
  categoryName,
  isPlaying,
  storyIndex = 0,
  totalStories = 1,
}) {
  if (!Notifications || Platform.OS === 'web') return;

  try {
    if (!isConfigured) {
      await initMediaNotifications();
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const categoryIdentifier = isPlaying ? 'media-player-playing' : 'media-player-paused';
    const statusPrefix = isPlaying ? '▶ ' : '⏸ ';
    const cleanTitle = title || 'Daily News Briefing';
    const bodyText = `${categoryName || 'Top Story'} • Story ${storyIndex + 1} of ${totalStories}`;

    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_ID,
      content: {
        title: `${statusPrefix}${cleanTitle}`,
        body: bodyText,
        categoryIdentifier,
        channelId: CHANNEL_ID,
        sticky: isPlaying,
        autoDismiss: false,
        data: {
          type: 'media-controls',
        },
      },
      trigger: null, // show immediately
    });
  } catch (err) {
    console.warn('updateMediaNotification warning:', err?.message);
  }
}

/**
 * Dismiss media notification when playback completely stops
 */
export async function dismissMediaNotification() {
  if (!Notifications || Platform.OS === 'web') return;
  try {
    await Notifications.dismissNotificationAsync(NOTIFICATION_ID);
  } catch (_) {}
}

export default {
  initMediaNotifications,
  updateMediaNotification,
  dismissMediaNotification,
};

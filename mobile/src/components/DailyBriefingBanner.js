import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Play, Pause, Headphones, Radio } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAudioPlaylist } from '../context/AudioPlaylistContext';
import AudioVisualizerBar from './AudioVisualizerBar';

export default function DailyBriefingBanner({ onOpenFullPlayer }) {
  const { colors, typography } = useTheme();
  const {
    isPlaying,
    isLoadingAudio,
    currentIndex,
    playlist,
    audioLanguage,
    startDailyBriefing,
    playPause,
    setIsFullPlayerVisible,
  } = useAudioPlaylist();

  const isBriefingActive = playlist.length > 0;

  const handlePressPlay = () => {
    if (isBriefingActive) {
      playPause();
    } else {
      startDailyBriefing({ limit: 25, language: audioLanguage });
    }
  };

  const handleOpenPlayer = () => {
    if (onOpenFullPlayer) {
      onOpenFullPlayer();
    } else {
      setIsFullPlayerVisible(true);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      {/* Top Header Badge */}
      <View style={styles.topRow}>
        <View style={[styles.badge, { backgroundColor: colors.primaryMuted }]}>
          <Headphones size={12} color={colors.primary} style={{ marginRight: 4 }} />
          <Text style={[styles.badgeText, { color: colors.primary }]}>
            DAILY AUDIO DIGEST • TOP 25
          </Text>
        </View>
        <View style={styles.liveIndicator}>
          <Radio size={12} color={colors.statusSuccess} />
          <Text style={[styles.liveText, { color: colors.statusSuccess }]}>TODAY'S BRIEF</Text>
        </View>
      </View>

      {/* Title & Subtitle */}
      <Text style={[styles.title, { color: colors.text, fontFamily: typography.fontSerif }]}>
        Listen to Today's Top News
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Continuous hands-free audio stream of the day's top 20–30 headlines and deep dives.
      </Text>

      {/* Action Row */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={handlePressPlay}
          activeOpacity={0.8}
        >
          {isLoadingAudio ? (
            <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
          ) : isPlaying ? (
            <Pause size={18} color="#ffffff" style={{ marginRight: 8 }} />
          ) : (
            <Play size={18} color="#ffffff" fill="#ffffff" style={{ marginRight: 8 }} />
          )}

          <Text style={styles.primaryButtonText}>
            {isLoadingAudio
              ? 'Loading Audio...'
              : isPlaying
              ? 'Pause Briefing'
              : isBriefingActive
              ? 'Resume Briefing'
              : 'Play Top 25 News (15m)'}
          </Text>
        </TouchableOpacity>

        {isBriefingActive && (
          <TouchableOpacity
            style={[styles.queueButton, { borderColor: colors.border }]}
            onPress={handleOpenPlayer}
            activeOpacity={0.7}
          >
            <AudioVisualizerBar isPlaying={isPlaying} color={colors.primary} />
            <Text style={[styles.queueButtonText, { color: colors.text }]}>
              {`Story ${currentIndex + 1} of ${playlist.length}`}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  queueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  queueButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});


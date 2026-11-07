import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Play, Pause, SkipForward, X } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAudioPlaylist } from '../context/AudioPlaylistContext';

export default function FloatingMiniPlayer({ onOpenFullPlayer }) {
  const { colors } = useTheme();
  const {
    currentStory,
    currentIndex,
    playlist,
    isPlaying,
    isLoadingAudio,
    positionMillis,
    durationMillis,
    isMiniPlayerVisible,
    playPause,
    playNext,
    dismissMiniPlayer,
    setIsFullPlayerVisible,
  } = useAudioPlaylist();

  if (!isMiniPlayerVisible || !currentStory) {
    return null;
  }

  const progress = durationMillis > 0 ? Math.min(1, positionMillis / durationMillis) : 0;

  const handleOpen = () => {
    if (onOpenFullPlayer) {
      onOpenFullPlayer();
    } else {
      setIsFullPlayerVisible(true);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.audioBarBg, borderTopColor: colors.border }]}>
      {/* Top progress indicator line */}
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: colors.audioWave }]} />
      </View>

      <TouchableOpacity style={styles.touchArea} onPress={handleOpen} activeOpacity={0.85}>
        {/* Story Index Badge */}
        <View style={styles.indexPill}>
          <Text style={styles.indexText}>{`${currentIndex + 1}/${playlist.length}`}</Text>
        </View>

        {/* Story Title & Category */}
        <View style={styles.textContainer}>
          <Text style={styles.storyTitle} numberOfLines={1}>
            {currentStory.title}
          </Text>
          <Text style={styles.categoryText} numberOfLines={1}>
            {currentStory.category?.name || 'Top News'} • Tap to expand player
          </Text>
        </View>
      </TouchableOpacity>

      {/* Control Buttons */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={playPause}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isLoadingAudio ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : isPlaying ? (
            <Pause size={20} color="#ffffff" />
          ) : (
            <Play size={20} color="#ffffff" fill="#ffffff" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={playNext}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <SkipForward size={18} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={dismissMiniPlayer}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={16} color="#9ca3af" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 50, // sits directly on top of the tab bar
    left: 0,
    right: 0,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 999,
  },
  progressBarTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  progressBarFill: {
    height: 2.5,
  },
  touchArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  indexPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 8,
  },
  indexText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  textContainer: {
    flex: 1,
  },
  storyTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  categoryText: {
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
});


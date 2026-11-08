import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import {
  ChevronDown,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Volume2,
  Globe,
  Moon,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAudioPlaylist } from '../context/AudioPlaylistContext';
import AudioVisualizerBar from '../components/AudioVisualizerBar';
import { formatDuration, getImageUrl } from '../utils/formatters';

const SPEEDS = [1.0, 1.25, 1.5, 2.0];
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'gu', label: 'ગુજરાતી' },
];

export default function AudioDigestModalScreen({ navigation }) {
  const { colors, typography } = useTheme();
  const {
    playlist,
    currentIndex,
    currentStory,
    isPlaying,
    isLoadingAudio,
    playbackSpeed,
    audioLanguage,
    positionMillis,
    durationMillis,
    sleepTimerMinutes,
    sleepTimerRemainingSec,
    playPause,
    playNext,
    playPrevious,
    jumpToStory,
    changePlaybackSpeed,
    changeLanguage,
    setSleepTimer,
    seekTo,
    setIsFullPlayerVisible,
  } = useAudioPlaylist();

  const handleClose = () => {
    setIsFullPlayerVisible(false);
    if (navigation?.goBack) navigation.goBack();
  };

  const safePlaylist = Array.isArray(playlist) ? playlist : [];
  const currentSeconds = Math.floor((Number(positionMillis) || 0) / 1000);
  const totalSeconds = Math.floor((Number(durationMillis) || 0) / 1000) || 60;
  const progressRatio = Math.min(1, Math.max(0, (Number(positionMillis) || 0) / (Number(durationMillis) || 1)));
  const storyImageUrl = getImageUrl(currentStory?.featuredImage);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header Navigation */}
      <View style={[styles.navHeader, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={handleClose} style={styles.navButton}>
          <ChevronDown size={26} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.navTitleContainer}>
          <Text style={[styles.navSubtitle, { color: colors.primary }]}>DAILY AUDIO BRIEFING</Text>
          <Text style={[styles.navTrackCount, { color: colors.textMuted }]}>
            {safePlaylist.length > 0 ? `Story ${currentIndex + 1} of ${safePlaylist.length}` : 'Audio Player'}
          </Text>
        </View>

        <View style={styles.navRight}>
          <AudioVisualizerBar isPlaying={isPlaying} color={colors.primary} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Story Hero Image */}
        <View style={styles.imageContainer}>
          {storyImageUrl ? (
            <ExpoImage
              source={{ uri: storyImageUrl }}
              style={styles.storyImage}
              contentFit="cover"
              transition={200}
              cachePolicy="disk"
            />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: colors.surfaceHighlight }]}>
              <Volume2 size={44} color={colors.primary} />
            </View>
          )}

          <View style={[styles.categoryBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.categoryBadgeText}>
              {currentStory?.category?.name || 'Top News'}
            </Text>
          </View>
        </View>

        {/* Story Title */}
        <Text style={[styles.headline, { color: colors.text, fontFamily: typography.fontSerif }]}>
          {currentStory?.title || 'Loading next story...'}
        </Text>

        <Text style={[styles.authorMeta, { color: colors.textMuted }]}>
          {`By ${currentStory?.author?.name || 'The Daily Chronicle'} • Edition Briefing`}
        </Text>

        {/* Audio Timeline Scrubber */}
        <View style={styles.scrubberContainer}>
          <View style={[styles.scrubberTrack, { backgroundColor: colors.surfaceHighlight }]}>
            <View style={[styles.scrubberProgress, { width: `${progressRatio * 100}%`, backgroundColor: colors.primary }]} />
          </View>
          <View style={styles.timeRow}>
            <Text style={[styles.timeText, { color: colors.textMuted }]}>{formatDuration(currentSeconds)}</Text>
            <Text style={[styles.timeText, { color: colors.textMuted }]}>{formatDuration(totalSeconds)}</Text>
          </View>
        </View>

        {/* Playback Controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={styles.secondaryControl}
            onPress={() => seekTo(Math.max(0, positionMillis - 10000))}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <RotateCcw size={22} color={colors.text} />
            <Text style={[styles.seekBadge, { color: colors.textMuted }]}>10s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryControl}
            onPress={playPrevious}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <SkipBack size={26} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainPlayButton, { backgroundColor: colors.primary }]}
            onPress={playPause}
            activeOpacity={0.85}
          >
            {isLoadingAudio ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : isPlaying ? (
              <Pause size={28} color="#ffffff" />
            ) : (
              <Play size={28} color="#ffffff" fill="#ffffff" style={{ marginLeft: 3 }} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryControl}
            onPress={playNext}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <SkipForward size={26} color={colors.text} />
          </TouchableOpacity>

          {/* Speed Selector Pill */}
          <TouchableOpacity
            style={[styles.speedPill, { borderColor: colors.border }]}
            onPress={() => {
              const nextIndex = (SPEEDS.indexOf(playbackSpeed) + 1) % SPEEDS.length;
              changePlaybackSpeed(SPEEDS[nextIndex]);
            }}
          >
            <Text style={[styles.speedText, { color: colors.text }]}>{playbackSpeed}x</Text>
          </TouchableOpacity>

          {/* Audio Sleep Timer Pill */}
          <TouchableOpacity
            style={[
              styles.speedPill,
              {
                borderColor: sleepTimerMinutes ? colors.primary : colors.border,
                backgroundColor: sleepTimerMinutes ? colors.primaryMuted : 'transparent',
              },
            ]}
            onPress={() => {
              const TIMER_CYCLE = [null, 15, 30, 45, 60];
              const curIdx = TIMER_CYCLE.indexOf(sleepTimerMinutes);
              const nextTimer = TIMER_CYCLE[(curIdx + 1) % TIMER_CYCLE.length];
              setSleepTimer(nextTimer);
            }}
          >
            <Moon size={13} color={sleepTimerMinutes ? colors.primary : colors.textMuted} style={{ marginRight: 3 }} />
            <Text
              style={[
                styles.speedText,
                { color: sleepTimerMinutes ? colors.primary : colors.textMuted, fontSize: 11 },
              ]}
            >
              {sleepTimerMinutes ? `${Math.ceil((sleepTimerRemainingSec || 60) / 60)}m` : 'Timer'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Story Language Badge (Auto-tuned to news story language) */}
        <View style={[styles.languageBar, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <View style={styles.langLeft}>
            <Globe size={15} color={colors.textSecondary} />
            <Text style={[styles.langLabel, { color: colors.textSecondary }]}>Language:</Text>
            <View style={[styles.autoLangPill, { backgroundColor: colors.accent }]}>
              <Text style={styles.autoLangPillText}>
                {currentStory?.language === 'hi' ? '🇮🇳 Hindi' : currentStory?.language === 'gu' ? '🇮🇳 Gujarati' : '🇬🇧 English'}
              </Text>
            </View>
          </View>
          {currentStory?.audioNarrations?.[currentStory?.language || 'en']?.url ? (
            <View style={styles.actualVoiceBadge}>
              <Text style={styles.actualVoiceText}>🎙️ Human Voice</Text>
            </View>
          ) : (
            <Text style={[styles.autoModeHint, { color: colors.textSecondary }]}>Auto-selected</Text>
          )}
        </View>

        {/* Playlist Queue (Top 20-30 Stories) */}
        <View style={styles.queueSection}>
          <Text style={[styles.queueHeaderTitle, { color: colors.text, fontFamily: typography.fontSerif }]}>
            Today's Briefing Lineup ({safePlaylist.length} Stories)
          </Text>

          {safePlaylist.map((story, idx) => {
            const isSelected = idx === currentIndex;
            return (
              <TouchableOpacity
                key={story._id || story.slug || idx}
                style={[
                  styles.queueItem,
                  {
                    backgroundColor: isSelected ? colors.surfaceHighlight : 'transparent',
                    borderBottomColor: colors.borderLight,
                  },
                ]}
                onPress={() => jumpToStory(idx)}
              >
                <View style={styles.queueIndexBox}>
                  {isSelected && isPlaying ? (
                    <AudioVisualizerBar isPlaying={true} color={colors.primary} />
                  ) : (
                    <Text style={[styles.queueIndexText, { color: isSelected ? colors.primary : colors.textMuted }]}>
                      {idx + 1}
                    </Text>
                  )}
                </View>

                <View style={styles.queueTextContainer}>
                  <Text
                    style={[
                      styles.queueStoryTitle,
                      { color: isSelected ? colors.primary : colors.text, fontWeight: isSelected ? '700' : '500' },
                    ]}
                    numberOfLines={2}
                  >
                    {story.title}
                  </Text>
                  <Text style={[styles.queueStoryCategory, { color: colors.textMuted }]}>
                    {story.category?.name || 'General'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  navTitleContainer: {
    alignItems: 'center',
  },
  navSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  navTrackCount: {
    fontSize: 12,
    marginTop: 2,
  },
  navRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  imageContainer: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  storyImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  headline: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: 6,
  },
  authorMeta: {
    fontSize: 13,
    marginBottom: 20,
  },
  scrubberContainer: {
    marginBottom: 20,
  },
  scrubberTrack: {
    height: 4,
    borderRadius: 2,
    width: '100%',
    overflow: 'hidden',
    marginBottom: 8,
  },
  scrubberProgress: {
    height: '100%',
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  mainPlayButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  secondaryControl: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  seekBadge: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 1,
  },
  speedPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  speedText: {
    fontSize: 12,
    fontWeight: '700',
  },
  languageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 24,
  },
  langLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  langLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  autoLangPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 6,
  },
  autoLangPillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  actualVoiceBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  actualVoiceText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
  },
  autoModeHint: {
    fontSize: 11,
    fontWeight: '500',
  },
  queueSection: {
    marginTop: 8,
  },
  queueHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderRadius: 6,
  },
  queueIndexBox: {
    width: 30,
    alignItems: 'center',
  },
  queueIndexText: {
    fontSize: 14,
    fontWeight: '700',
  },
  queueTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  queueStoryTitle: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 2,
  },
  queueStoryCategory: {
    fontSize: 11,
  },
});


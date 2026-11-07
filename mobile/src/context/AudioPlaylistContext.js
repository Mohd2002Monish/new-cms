import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import newsApi from '../api/newsApi';
import audioApi from '../api/audioApi';
import { stripHtml } from '../utils/formatters';
import logger from '../utils/logger';

// Dynamic import for expo-av to support web and environments without native av
let ExpoAudio = null;
try {
  ExpoAudio = require('expo-av').Audio;
} catch (_) {
  ExpoAudio = null;
}

const AudioPlaylistContext = createContext(null);

export function AudioPlaylistProvider({ children }) {
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [audioLanguage, setAudioLanguage] = useState('en'); // 'en' | 'hi' | 'gu'
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [isMiniPlayerVisible, setIsMiniPlayerVisible] = useState(false);
  const [isFullPlayerVisible, setIsFullPlayerVisible] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  // Native sound instance or Web audio instance
  const soundRef = useRef(null);
  const webAudioRef = useRef(null);
  const currentIndexRef = useRef(0);
  const playlistRef = useRef([]);
  const speedRef = useRef(1.0);
  const languageRef = useRef('en');

  // Keep refs in sync for callbacks
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    speedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  useEffect(() => {
    languageRef.current = audioLanguage;
  }, [audioLanguage]);

  // Defer audio mode setup until playback starts to avoid startup crashes
  const isAudioModeSetRef = useRef(false);
  const ensureAudioMode = useCallback(async () => {
    if (isAudioModeSetRef.current || !ExpoAudio) return;
    try {
      await ExpoAudio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      isAudioModeSetRef.current = true;
      logger.info('AudioPlaylist', 'Audio mode configured for playback');
    } catch (e) {
      logger.warn('AudioPlaylist', 'setAudioModeAsync warning', e);
    }
  }, []);

  // Cleanup helper
  const stopCurrentAudio = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch (_) {}

    try {
      if (webAudioRef.current) {
        webAudioRef.current.pause();
        webAudioRef.current.src = '';
        webAudioRef.current = null;
      }
    } catch (_) {}

    setIsPlaying(false);
    setPositionMillis(0);
    setDurationMillis(0);
  }, []);

  // Load and play a specific story track from the playlist
  const loadAndPlayTrack = useCallback(async (index, storyList = null) => {
    const list = storyList || playlistRef.current;
    if (!list || index < 0 || index >= list.length) {
      setIsPlaying(false);
      return;
    }

    const story = list[index];
    const storyLang = (story.language || languageRef.current || 'en').toLowerCase().slice(0, 2);
    setAudioLanguage(storyLang);
    languageRef.current = storyLang;

    setCurrentIndex(index);
    setIsLoadingAudio(true);
    await stopCurrentAudio();

    try {
      // 1. Check if actual human audio narration was uploaded for this news language
      let audioUri = story.audioNarrations?.[storyLang]?.url;

      if (!audioUri) {
        // Fallback: Synthesize speech text matching the story's actual language
        const textToSynthesize = [
          story.title,
          story.excerpt || stripHtml(story.contentHtml || story.content || '').slice(0, 800),
        ].filter(Boolean).join('. ');

        // 2. Synthesize audio via backend TTS engine
        const ttsData = await audioApi.synthesizeAudio({
          text: textToSynthesize,
          language: storyLang,
          rate: speedRef.current,
          articleId: story._id || story.id,
        });

        audioUri = ttsData?.audioContent;
      }

      if (!audioUri) {
        throw new Error('No audio content available for this story');
      }

      // 3. Play audio on native or web runtime
      if (Platform.OS === 'web' || !ExpoAudio) {
        // Web Audio fallback
        const audio = new Audio(audioUri);
        audio.playbackRate = speedRef.current;
        webAudioRef.current = audio;

        audio.ontimeupdate = () => {
          setPositionMillis(Math.floor(audio.currentTime * 1000));
          setDurationMillis(Math.floor((audio.duration || 0) * 1000));
        };

        audio.onended = () => {
          // Continuous Auto-Advance: Play next story in playlist
          playNext();
        };

        await audio.play();
        setIsPlaying(true);
      } else {
        // React Native Expo-AV with base64 file caching for Android stability
        let playableUri = audioUri;
        if (typeof audioUri === 'string' && audioUri.startsWith('data:')) {
          try {
            const FileSystem = require('expo-file-system');
            const base64Data = audioUri.split(';base64,').pop();
            const tempFile = `${FileSystem.cacheDirectory}track_${story._id || index}.mp3`;
            await FileSystem.writeAsStringAsync(tempFile, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });
            playableUri = tempFile;
          } catch (fsErr) {
            logger.warn('AudioPlaylist', 'File system caching warning', fsErr);
          }
        }

        await ensureAudioMode();
        const { sound } = await ExpoAudio.Sound.createAsync(
          { uri: playableUri },
          { shouldPlay: true, rate: speedRef.current, shouldCorrectPitch: true },
          (status) => {
            if (!status.isLoaded) {
              if (status.error) console.warn('ExpoAudio playback error:', status.error);
              return;
            }
            setPositionMillis(status.positionMillis);
            setDurationMillis(status.durationMillis || 0);
            setIsBuffering(status.isBuffering);
            setIsPlaying(status.isPlaying);

            if (status.didJustFinish && !status.isLooping) {
              // Continuous Auto-Advance: Play next story in playlist!
              playNext();
            }
          }
        );
        soundRef.current = sound;
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Failed to load audio for story track:', err?.message);
      setIsPlaying(false);
    } finally {
      setIsLoadingAudio(false);
    }
  }, [stopCurrentAudio]);

  // Action: Start the Daily Top 20-30 News Briefing
  const startDailyBriefing = useCallback(async ({ limit = 25, language = 'en', stories = null } = {}) => {
    setIsLoadingAudio(true);
    setIsMiniPlayerVisible(true);

    try {
      let articles = stories;
      if (!articles || articles.length === 0) {
        articles = await newsApi.getDailyBriefingArticles(limit, language);
      }

      if (!articles || articles.length === 0) {
        throw new Error('No articles available for daily briefing');
      }

      // Cap at user's desired 20-30 range (default 25)
      const topStories = articles.slice(0, Math.min(30, Math.max(20, limit)));
      setPlaylist(topStories);
      playlistRef.current = topStories;
      setAudioLanguage(language);
      languageRef.current = language;

      // Begin playing track 0
      await loadAndPlayTrack(0, topStories);
    } catch (err) {
      console.error('Error starting daily briefing:', err?.message);
    } finally {
      setIsLoadingAudio(false);
    }
  }, [loadAndPlayTrack]);

  // Action: Play / Pause
  const playPause = useCallback(async () => {
    if (Platform.OS === 'web' || !ExpoAudio) {
      if (!webAudioRef.current) {
        if (playlist.length > 0) loadAndPlayTrack(currentIndex);
        return;
      }
      if (isPlaying) {
        webAudioRef.current.pause();
        setIsPlaying(false);
      } else {
        await webAudioRef.current.play();
        setIsPlaying(true);
      }
    } else {
      if (!soundRef.current) {
        if (playlist.length > 0) loadAndPlayTrack(currentIndex);
        return;
      }
      if (isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    }
  }, [currentIndex, isPlaying, loadAndPlayTrack, playlist.length]);

  // Action: Play Next Story
  const playNext = useCallback(() => {
    const nextIdx = currentIndexRef.current + 1;
    if (nextIdx < playlistRef.current.length) {
      loadAndPlayTrack(nextIdx);
    } else {
      // End of playlist
      setIsPlaying(false);
      setPositionMillis(0);
    }
  }, [loadAndPlayTrack]);

  // Action: Play Previous Story or Rewind
  const playPrevious = useCallback(() => {
    if (positionMillis > 4000) {
      // If played more than 4s, restart current story
      seekTo(0);
      return;
    }
    const prevIdx = currentIndexRef.current - 1;
    if (prevIdx >= 0) {
      loadAndPlayTrack(prevIdx);
    } else {
      seekTo(0);
    }
  }, [loadAndPlayTrack, positionMillis]);

  // Action: Jump to specific story
  const jumpToStory = useCallback((index) => {
    if (index >= 0 && index < playlistRef.current.length) {
      loadAndPlayTrack(index);
    }
  }, [loadAndPlayTrack]);

  // Action: Seek position in milliseconds
  const seekTo = useCallback(async (millis) => {
    try {
      if (Platform.OS === 'web' || !ExpoAudio) {
        if (webAudioRef.current) {
          webAudioRef.current.currentTime = millis / 1000;
          setPositionMillis(millis);
        }
      } else {
        if (soundRef.current) {
          await soundRef.current.setPositionAsync(millis);
          setPositionMillis(millis);
        }
      }
    } catch (_) {}
  }, []);

  // Action: Change playback speed (0.75x, 1x, 1.25x, 1.5x, 2x)
  const changePlaybackSpeed = useCallback(async (speed) => {
    setPlaybackSpeed(speed);
    speedRef.current = speed;
    try {
      if (Platform.OS === 'web' || !ExpoAudio) {
        if (webAudioRef.current) webAudioRef.current.playbackRate = speed;
      } else {
        if (soundRef.current) {
          await soundRef.current.setRateAsync(speed, true);
        }
      }
    } catch (_) {}
  }, []);

  // Action: Change language (re-synthesizes current track in new language)
  const changeLanguage = useCallback(async (lang) => {
    setAudioLanguage(lang);
    languageRef.current = lang;
    if (playlistRef.current.length > 0) {
      await loadAndPlayTrack(currentIndexRef.current);
    }
  }, [loadAndPlayTrack]);

  // Action: Dismiss mini player & stop audio
  const dismissMiniPlayer = useCallback(async () => {
    await stopCurrentAudio();
    setIsMiniPlayerVisible(false);
    setIsFullPlayerVisible(false);
  }, [stopCurrentAudio]);

  const currentStory = playlist[currentIndex] || null;

  return (
    <AudioPlaylistContext.Provider
      value={{
        playlist,
        currentIndex,
        currentStory,
        isPlaying,
        isLoadingAudio,
        isBuffering,
        playbackSpeed,
        audioLanguage,
        positionMillis,
        durationMillis,
        isMiniPlayerVisible,
        isFullPlayerVisible,
        setIsMiniPlayerVisible,
        setIsFullPlayerVisible,
        startDailyBriefing,
        playPause,
        playNext,
        playPrevious,
        jumpToStory,
        seekTo,
        changePlaybackSpeed,
        changeLanguage,
        dismissMiniPlayer,
      }}
    >
      {children}
    </AudioPlaylistContext.Provider>
  );
}

export function useAudioPlaylist() {
  const context = useContext(AudioPlaylistContext);
  if (!context) {
    throw new Error('useAudioPlaylist must be used within an AudioPlaylistProvider');
  }
  return context;
}

export default AudioPlaylistContext;


import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, TextInput, Alert, Modal } from 'react-native';
import {
  User,
  LogOut,
  Moon,
  Bookmark,
  Volume2,
  Lock,
  ChevronRight,
  ShieldCheck,
  Globe,
  Check,
  Terminal,
  Trash2,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useAudioPlaylist } from '../context/AudioPlaylistContext';
import { getBaseUrl, setCustomApiUrl } from '../api/client';
import logger from '../utils/logger';

export default function ProfileScreen({ navigation }) {
  const { colors, typography, isDarkMode, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout, bookmarks } = useAuth();
  const { playbackSpeed, changePlaybackSpeed } = useAudioPlaylist();

  const [apiUrl, setApiUrl] = useState(getBaseUrl());
  const [editingUrl, setEditingUrl] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [logsModalVisible, setLogsModalVisible] = useState(false);
  const [appLogs, setAppLogs] = useState([]);

  const handleOpenLogs = async () => {
    const logs = await logger.getLogs();
    setAppLogs(logs);
    setLogsModalVisible(true);
  };

  const handleClearLogs = async () => {
    await logger.clearLogs();
    setAppLogs([]);
  };

  const handleSaveApiUrl = async () => {
    await setCustomApiUrl(apiUrl);
    setEditingUrl(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        <Text style={[styles.title, { color: colors.text, fontFamily: typography.fontSerif }]}>
          Account & Settings
        </Text>
      </View>

      {/* User Card */}
      <View style={[styles.userCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        <View style={[styles.avatarCircle, { backgroundColor: colors.primaryMuted }]}>
          <User size={28} color={colors.primary} />
        </View>

        {isAuthenticated ? (
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>
              {user?.name || user?.email?.split('@')[0] || 'Subscribed Reader'}
            </Text>
            <Text style={[styles.userEmail, { color: colors.textMuted }]}>{user?.email}</Text>
            <View style={styles.memberBadge}>
              <ShieldCheck size={12} color={colors.statusSuccess} />
              <Text style={[styles.memberBadgeText, { color: colors.statusSuccess }]}>Verified Reader</Text>
            </View>
          </View>
        ) : (
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>Guest Reader</Text>
            <Text style={[styles.userEmail, { color: colors.textMuted }]}>
              Sign in to sync bookmarks and preferences
            </Text>
            <TouchableOpacity
              style={[styles.signInBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('LoginModal')}
            >
              <Text style={styles.signInBtnText}>Sign In / Register</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Reading Stats Row */}
      <View style={[styles.statsRow, { borderColor: colors.border }]}>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: colors.text }]}>{bookmarks.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Saved Stories</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: colors.text }]}>25</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Daily Digest Queue</Text>
        </View>
      </View>

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PREFERENCES</Text>

        {/* Dark Mode Toggle */}
        <View style={[styles.settingRow, { borderBottomColor: colors.borderLight }]}>
          <View style={styles.settingLeft}>
            <Moon size={18} color={colors.text} />
            <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Appearance</Text>
          </View>
          <Switch value={isDarkMode} onValueChange={toggleTheme} trackColor={{ true: colors.primary }} />
        </View>

        {/* Audio Narration Speed */}
        <TouchableOpacity
          style={[styles.settingRow, { borderBottomColor: colors.borderLight }]}
          onPress={() => {
            const speeds = [1.0, 1.25, 1.5, 2.0];
            const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
            changePlaybackSpeed(speeds[nextIdx]);
          }}
        >
          <View style={styles.settingLeft}>
            <Volume2 size={18} color={colors.text} />
            <Text style={[styles.settingLabel, { color: colors.text }]}>Audio Narration Speed</Text>
          </View>
          <View style={styles.settingRight}>
            <Text style={[styles.settingValue, { color: colors.primary }]}>{playbackSpeed}x</Text>
            <ChevronRight size={16} color={colors.textMuted} />
          </View>
        </TouchableOpacity>

        {/* Bookmarks Quick Link */}
        <TouchableOpacity
          style={[styles.settingRow, { borderBottomColor: colors.borderLight }]}
          onPress={() => navigation.navigate('Bookmarks')}
        >
          <View style={styles.settingLeft}>
            <Bookmark size={18} color={colors.text} />
            <Text style={[styles.settingLabel, { color: colors.text }]}>Reading Library</Text>
          </View>
          <ChevronRight size={16} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Live API Server URL */}
        <View style={[styles.settingRow, { borderBottomColor: colors.borderLight, flexDirection: 'column', alignItems: 'stretch' }]}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            onPress={() => setEditingUrl(!editingUrl)}
          >
            <View style={styles.settingLeft}>
              <Globe size={18} color={colors.text} />
              <Text style={[styles.settingLabel, { color: colors.text }]}>API Server Address</Text>
            </View>
            <View style={styles.settingRight}>
              {savedSuccess ? (
                <Text style={{ fontSize: 12, color: colors.statusSuccess, fontWeight: '700' }}>Updated!</Text>
              ) : (
                <Text style={[styles.settingValue, { color: colors.textSecondary, maxWidth: 160 }]} numberOfLines={1}>
                  {apiUrl}
                </Text>
              )}
              <ChevronRight size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          {editingUrl && (
            <View style={{ marginTop: 10, gap: 8 }}>
              <TextInput
                style={{
                  height: 42,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  color: colors.text,
                  backgroundColor: colors.surfaceAlt,
                  fontSize: 13,
                }}
                value={apiUrl}
                onChangeText={setApiUrl}
                placeholder="https://api.yourdomain.com/api"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={{
                  backgroundColor: colors.primary,
                  height: 38,
                  borderRadius: 6,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={handleSaveApiUrl}
              >
                <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>Save Server URL</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Diagnostics & Logs */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>DIAGNOSTICS & LOGS</Text>
        <View style={{ borderRadius: 8, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surface }}>
          <TouchableOpacity style={styles.settingRow} onPress={handleOpenLogs}>
            <View style={styles.settingLeft}>
              <Terminal size={18} color={colors.primary} />
              <Text style={[styles.settingLabel, { color: colors.text }]}>View Application Logs</Text>
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Logout button */}
      {isAuthenticated && (
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: colors.statusError }]}
          onPress={logout}
          activeOpacity={0.7}
        >
          <LogOut size={16} color={colors.statusError} style={{ marginRight: 8 }} />
          <Text style={[styles.logoutBtnText, { color: colors.statusError }]}>Sign Out</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 100 }} />

      <Modal visible={logsModalVisible} animationType="slide" onRequestClose={() => setLogsModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background, padding: 16, paddingTop: 40 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>System Diagnostic Logs</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={handleClearLogs} style={{ padding: 6, backgroundColor: colors.surfaceAlt, borderRadius: 6 }}>
                <Trash2 size={16} color={colors.statusError} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setLogsModalVisible(false)} style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.primary, borderRadius: 6 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView style={{ flex: 1 }}>
            {appLogs.length === 0 ? (
              <Text style={{ color: colors.textMuted, marginTop: 20, textAlign: 'center' }}>No logs recorded yet.</Text>
            ) : (
              appLogs.map((item, idx) => (
                <View key={item.id || idx} style={{ backgroundColor: colors.surface, padding: 10, borderRadius: 6, marginBottom: 8, borderWidth: 1, borderColor: colors.borderLight }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: item.level === 'ERROR' ? colors.statusError : item.level === 'WARN' ? colors.statusWarning : colors.primary }}>
                    [{item.level}] [{item.tag}] {item.timestamp}
                  </Text>
                  <Text style={{ color: colors.text, fontSize: 12, marginTop: 2 }}>{item.message}</Text>
                  {item.details ? <Text style={{ color: colors.textMuted, fontSize: 11, fontFamily: 'monospace', marginTop: 4 }}>{item.details}</Text> : null}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  userCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    marginBottom: 6,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  signInBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  signInBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '80%',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});


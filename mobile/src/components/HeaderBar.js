import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Search, Moon, Sun } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

export default function HeaderBar({ onOpenSearch }) {
  const { colors, typography, isDarkMode, toggleTheme } = useTheme();

  const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const d = new Date();
  const todayStr = `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

  return (
    <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <View style={styles.topSubBar}>
        <Text style={[styles.dateText, { color: colors.textMuted }]}>{todayStr}</Text>
        <Text style={[styles.editionText, { color: colors.textMuted }]}>DAILY DIGITAL EDITION</Text>
      </View>

      <View style={styles.mainTitleRow}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={toggleTheme}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {isDarkMode ? <Sun size={20} color={colors.text} /> : <Moon size={20} color={colors.text} />}
        </TouchableOpacity>

        <Text style={[styles.brandTitle, { color: colors.text, fontFamily: typography.fontSerif }]}>
          THE CHRONICLE
        </Text>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onOpenSearch}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Search size={20} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  topSubBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dateText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  editionText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  mainTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});


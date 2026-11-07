import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function CategoryPills({ categories = [], selectedSlug = 'all', onSelectCategory }) {
  const { colors } = useTheme();

  const allItems = [{ slug: 'all', name: 'Top Headlines' }, ...categories];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {allItems.map((cat) => {
        const isSelected = selectedSlug === cat.slug;
        return (
          <TouchableOpacity
            key={cat.slug}
            style={[
              styles.pill,
              {
                backgroundColor: isSelected ? colors.accent : colors.surfaceAlt,
                borderColor: isSelected ? colors.accent : colors.border,
              },
            ]}
            onPress={() => onSelectCategory(cat.slug)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.pillText,
                { color: isSelected ? '#ffffff' : colors.textSecondary },
              ]}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
  },
});


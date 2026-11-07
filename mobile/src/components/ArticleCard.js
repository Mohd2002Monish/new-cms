import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Bookmark } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { formatTimeAgo, getEstimatedReadTime, getImageUrl } from '../utils/formatters';

function ArticleCard({ article, onPress, isHero = false }) {
  const { colors, typography } = useTheme();
  const { isBookmarked, toggleBookmark } = useAuth();

  if (!article) return null;

  const bookmarked = isBookmarked(article.slug);

  // Memoize heavy text/date calculations so FlatList scrolls smoothly at 60 FPS
  const readTime = useMemo(
    () => getEstimatedReadTime(article.content || article.excerpt),
    [article.content, article.excerpt]
  );

  const timeAgo = useMemo(
    () => formatTimeAgo(article.publishedAt || article.createdAt),
    [article.publishedAt, article.createdAt]
  );

  // Dynamically request downscaled image: 300px for thumbnails, 800px for hero cards
  const imageUrl = useMemo(
    () => getImageUrl(article.featuredImage, { width: isHero ? 800 : 300 }),
    [article.featuredImage, isHero]
  );

  const categoryName = article.category?.name || 'General';

  const handleBookmarkPress = (e) => {
    e?.stopPropagation?.();
    toggleBookmark(article.slug);
  };

  if (isHero) {
    return (
      <TouchableOpacity
        style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={onPress}
        activeOpacity={0.88}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <View style={[styles.heroImagePlaceholder, { backgroundColor: colors.surfaceHighlight }]} />
        )}

        <View style={styles.heroContent}>
          <View style={styles.metaRow}>
            <View style={[styles.categoryPill, { backgroundColor: colors.primaryMuted }]}>
              <Text style={[styles.categoryText, { color: colors.primary }]}>{categoryName}</Text>
            </View>
            <Text style={[styles.timeAgo, { color: colors.textMuted }]}>{`${timeAgo} • ${readTime} min read`}</Text>
          </View>

          <Text
            style={[styles.heroTitle, { color: colors.text, fontFamily: typography.fontSerif }]}
            numberOfLines={3}
          >
            {article.title}
          </Text>

          {article.excerpt ? (
            <Text style={[styles.heroExcerpt, { color: colors.textSecondary }]} numberOfLines={2}>
              {article.excerpt}
            </Text>
          ) : null}

          <View style={styles.heroFooter}>
            <Text style={[styles.authorName, { color: colors.textMuted }]}>
              By {article.author?.name || 'Staff Reporter'}
            </Text>
            <TouchableOpacity onPress={handleBookmarkPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Bookmark size={18} color={bookmarked ? colors.primary : colors.textMuted} fill={bookmarked ? colors.primary : 'transparent'} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.cardLeft}>
        <View style={styles.metaRow}>
          <Text style={[styles.cardCategory, { color: colors.primary }]}>{categoryName.toUpperCase()}</Text>
          <Text style={[styles.timeAgo, { color: colors.textMuted }]}>• {timeAgo}</Text>
        </View>

        <Text
          style={[styles.cardTitle, { color: colors.text, fontFamily: typography.fontSerif }]}
          numberOfLines={2}
        >
          {article.title}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={[styles.timeAgo, { color: colors.textMuted }]}>{readTime} min read</Text>
          <TouchableOpacity onPress={handleBookmarkPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Bookmark size={16} color={bookmarked ? colors.primary : colors.textMuted} fill={bookmarked ? colors.primary : 'transparent'} />
          </TouchableOpacity>
        </View>
      </View>

      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.thumbnail} resizeMode="cover" />
      ) : (
        <View style={[styles.thumbnailPlaceholder, { backgroundColor: colors.surfaceHighlight }]} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: 190,
  },
  heroImagePlaceholder: {
    width: '100%',
    height: 140,
  },
  heroContent: {
    padding: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  timeAgo: {
    fontSize: 12,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 6,
  },
  heroExcerpt: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  authorName: {
    fontSize: 12,
  },
  card: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    alignItems: 'flex-start',
  },
  cardLeft: {
    flex: 1,
    paddingRight: 12,
  },
  cardCategory: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  thumbnail: {
    width: 84,
    height: 72,
    borderRadius: 6,
  },
  thumbnailPlaceholder: {
    width: 84,
    height: 72,
    borderRadius: 6,
  },
});

export default React.memo(ArticleCard);


import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Share,
} from 'react-native';
import {
  ArrowLeft,
  Bookmark,
  Share2,
  Headphones,
  Volume2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useAudioPlaylist } from '../context/AudioPlaylistContext';
import newsApi from '../api/newsApi';
import { formatTimeAgo, getEstimatedReadTime, stripHtml } from '../utils/formatters';
import ArticleCard from '../components/ArticleCard';

export default function ArticleDetailScreen({ route, navigation }) {
  const { slug } = route.params || {};
  const { colors, typography } = useTheme();
  const { isBookmarked, toggleBookmark } = useAuth();
  const { startDailyBriefing } = useAudioPlaylist();

  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState(16);

  useEffect(() => {
    async function fetchArticle() {
      if (!slug) return;
      setLoading(true);
      try {
        const data = await newsApi.getArticleBySlug(slug);
        setArticle(data);
        if (data?.category?.slug) {
          const relatedRes = await newsApi.getArticles({
            category: data.category.slug,
            limit: 4,
          });
          const filtered = (relatedRes?.data || []).filter((a) => a.slug !== slug);
          setRelated(filtered.slice(0, 3));
        }
      } catch (err) {
        console.warn('Failed to load article detail:', err?.message);
      } finally {
        setLoading(false);
      }
    }
    fetchArticle();
  }, [slug]);

  if (loading) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!article) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Story could not be loaded.</Text>
      </View>
    );
  }

  const bookmarked = isBookmarked(article.slug);
  const readTime = getEstimatedReadTime(article.content);
  const cleanBody = stripHtml(article.content);

  const handleShare = () => {
    Share.share({
      title: article.title,
      message: `${article.title}\n\nRead more on The Daily Chronicle.`,
    });
  };

  const handleListenThisArticle = () => {
    // Starts audio player with this article as story #1
    startDailyBriefing({ limit: 1, stories: [article] });
    navigation.navigate('AudioDigestModal');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Navbar */}
      <View style={[styles.navbar, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.navActions}>
          {/* Font Scaling */}
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => setFontSize((s) => Math.max(14, s - 1))}
          >
            <ZoomOut size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => setFontSize((s) => Math.min(24, s + 1))}
          >
            <ZoomIn size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.navBtn} onPress={() => toggleBookmark(article.slug)}>
            <Bookmark size={20} color={bookmarked ? colors.primary : colors.text} fill={bookmarked ? colors.primary : 'transparent'} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.navBtn} onPress={handleShare}>
            <Share2 size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Category Pill & Time */}
        <View style={styles.metaRow}>
          <View style={[styles.categoryPill, { backgroundColor: colors.primaryMuted }]}>
            <Text style={[styles.categoryText, { color: colors.primary }]}>
              {article.category?.name || 'General'}
            </Text>
          </View>
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            {`${formatTimeAgo(article.publishedAt || article.createdAt)} • ${readTime} min read`}
          </Text>
        </View>

        {/* Headline */}
        <Text style={[styles.title, { color: colors.text, fontFamily: typography.fontSerif }]}>
          {article.title}
        </Text>

        {/* Byline */}
        <Text style={[styles.byline, { color: colors.textSecondary }]}>
          By <Text style={{ fontWeight: '700', color: colors.text }}>{article.author?.name || 'Editorial Board'}</Text>
        </Text>

        {/* Listen to Article Audio Button */}
        <TouchableOpacity
          style={[styles.audioListenBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
          onPress={handleListenThisArticle}
          activeOpacity={0.8}
        >
          <View style={[styles.audioIconCircle, { backgroundColor: colors.primary }]}>
            <Headphones size={18} color="#ffffff" />
          </View>
          <View style={styles.audioBtnTexts}>
            <Text style={[styles.audioBtnTitle, { color: colors.text }]}>Listen to this Article</Text>
            <Text style={[styles.audioBtnSub, { color: colors.textSecondary }]}>
              Narration powered by TTS Audio Engine ({readTime}m listen)
            </Text>
          </View>
          <Volume2 size={20} color={colors.primary} />
        </TouchableOpacity>

        {/* Featured Image */}
        {article.featuredImage ? (
          <Image source={{ uri: article.featuredImage }} style={styles.featuredImage} resizeMode="cover" />
        ) : null}

        {/* Excerpt Lead */}
        {article.excerpt ? (
          <Text style={[styles.leadExcerpt, { color: colors.text, borderLeftColor: colors.primary }]}>
            {article.excerpt}
          </Text>
        ) : null}

        {/* Article Body */}
        <Text style={[styles.bodyText, { color: colors.text, fontSize, lineHeight: fontSize * 1.55 }]}>
          {cleanBody}
        </Text>

        {/* Related Stories */}
        {related.length > 0 && (
          <View style={styles.relatedSection}>
            <Text style={[styles.relatedTitle, { color: colors.text, fontFamily: typography.fontSerif }]}>
              Related Coverage
            </Text>
            {related.map((item) => (
              <ArticleCard
                key={item._id || item.slug}
                article={item}
                onPress={() => navigation.push('ArticleDetail', { slug: item.slug })}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 80,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metaText: {
    fontSize: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 32,
    marginBottom: 8,
  },
  byline: {
    fontSize: 13,
    marginBottom: 16,
  },
  audioListenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  audioIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioBtnTexts: {
    flex: 1,
  },
  audioBtnTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  audioBtnSub: {
    fontSize: 11,
    marginTop: 1,
  },
  featuredImage: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    marginBottom: 18,
  },
  leadExcerpt: {
    fontSize: 16,
    fontWeight: '600',
    fontStyle: 'italic',
    lineHeight: 24,
    paddingLeft: 12,
    borderLeftWidth: 3,
    marginBottom: 18,
  },
  bodyText: {
    letterSpacing: 0.2,
    marginBottom: 30,
  },
  relatedSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  relatedTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
});


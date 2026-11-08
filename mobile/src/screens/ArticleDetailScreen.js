import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import {
  ArrowLeft,
  Bookmark,
  Share2,
  Headphones,
  Volume2,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Download,
  CheckCircle,
  ArrowRight,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useAudioPlaylist } from '../context/AudioPlaylistContext';
import newsApi from '../api/newsApi';
import offlineManager from '../utils/offlineManager';
import { formatTimeAgo, getEstimatedReadTime, stripHtml, getImageUrl } from '../utils/formatters';
import ArticleCard from '../components/ArticleCard';
import RichArticleRenderer from '../components/RichArticleRenderer';

export default function ArticleDetailScreen({ route, navigation }) {
  const { slug } = route.params || {};
  const { colors, typography } = useTheme();
  const { isBookmarked, toggleBookmark } = useAuth();
  const { startDailyBriefing } = useAudioPlaylist();

  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fontSize, setFontSize] = useState(16);
  const [isDownloaded, setIsDownloaded] = useState(false);

  useEffect(() => {
    if (article?.slug) {
      offlineManager.isArticleDownloaded(article.slug).then(setIsDownloaded);
    }
  }, [article?.slug]);

  const handleToggleOffline = async () => {
    if (!article) return;
    if (isDownloaded) {
      await offlineManager.removeOfflineArticle(article.slug);
      setIsDownloaded(false);
      Alert.alert('Offline Mode', 'Story removed from offline storage.');
    } else {
      const ok = await offlineManager.saveArticleOffline(article);
      if (ok) {
        setIsDownloaded(true);
        Alert.alert('Offline Mode', 'Story saved for offline reading. You can read it without internet anytime.');
      }
    }
  };

  const fetchArticle = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const data = await newsApi.getArticleBySlug(slug);
      if (!data) throw new Error('Article not found');
      setArticle(data);
      if (data?.category?.slug) {
        const relatedRes = await newsApi.getArticles({
          category: data.category.slug,
          limit: 4,
        }).catch(() => null);
        const filtered = (relatedRes?.data || []).filter((a) => a.slug !== slug);
        setRelated(filtered.slice(0, 3));
      }
    } catch (err) {
      console.warn('Failed to load article detail:', err?.message);
      setError(err?.message || 'Unable to connect to news service.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchArticle();
  }, [fetchArticle]);

  if (loading) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || (!loading && !article)) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: colors.background, paddingHorizontal: 24 }]}>
        <Text style={[styles.errorTitle, { color: colors.text }]}>Unable to Load Story</Text>
        <Text style={[styles.errorSub, { color: colors.textSecondary }]}>
          {error || 'This article could not be retrieved. Please check your connection and try again.'}
        </Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          onPress={fetchArticle}
          activeOpacity={0.8}
        >
          <RefreshCw size={16} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backTextBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const bookmarked = isBookmarked(article.slug);
  const readTime = getEstimatedReadTime(article.contentHtml || article.content);
  const cleanBody = stripHtml(article.contentHtml || article.content);
  const imageUrl = getImageUrl(article.featuredImage);

  // Split cleanBody into safe individual paragraphs to prevent Android Hermes buffer overflows
  const paragraphs = useMemo(() => {
    if (!cleanBody) return [];
    return cleanBody
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }, [cleanBody]);

  const storyLang = (article.language || 'en').toLowerCase().slice(0, 2);
  const humanAudioAvailable = Boolean(article.audioNarrations?.[storyLang]?.url);
  const audioLanguageLabel = storyLang === 'hi' ? 'Hindi' : storyLang === 'gu' ? 'Gujarati' : 'English';

  const handleShare = () => {
    Share.share({
      title: article.title || 'The Daily Chronicle',
      message: `${article.title || 'Breaking News'}\n\nRead more on The Daily Chronicle.`,
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

          <TouchableOpacity style={styles.navBtn} onPress={handleToggleOffline}>
            {isDownloaded ? (
              <CheckCircle size={20} color={colors.statusSuccess || '#22c55e'} />
            ) : (
              <Download size={20} color={colors.text} />
            )}
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
          {article.title || 'Untitled Dispatch'}
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
            <Text style={[styles.audioBtnTitle, { color: colors.text }]}>
              Listen in {audioLanguageLabel}
            </Text>
            <Text style={[styles.audioBtnSub, { color: colors.textSecondary }]}>
              {humanAudioAvailable
                ? `🎙️ Official Human Voice (${readTime}m listen)`
                : `AI Audio Engine (${readTime}m listen)`}
            </Text>
          </View>
          <Volume2 size={20} color={colors.primary} />
        </TouchableOpacity>

        {/* Featured Image */}
        {imageUrl ? (
          <ExpoImage
            source={{ uri: imageUrl }}
            style={styles.featuredImage}
            contentFit="cover"
            transition={200}
            cachePolicy="disk"
          />
        ) : null}

        {/* Excerpt Lead */}
        {article.excerpt ? (
          <Text style={[styles.leadExcerpt, { color: colors.text, borderLeftColor: colors.primary }]}>
            {article.excerpt}
          </Text>
        ) : null}

        {/* Article Body: Rich Editorial Typography with Headings, Quotes, Links */}
        {article.contentHtml ? (
          <RichArticleRenderer
            contentHtml={article.contentHtml}
            fontSize={fontSize}
            colors={colors}
            typography={typography}
          />
        ) : paragraphs.length > 0 ? (
          paragraphs.map((para, pIdx) => (
            <Text
              key={`para_${pIdx}`}
              style={[
                styles.bodyText,
                { color: colors.text, fontSize, lineHeight: Math.round(fontSize * 1.6) },
              ]}
            >
              {para}
            </Text>
          ))
        ) : (
          <Text style={[styles.bodyText, { color: colors.text, fontSize, lineHeight: Math.round(fontSize * 1.6) }]}>
            {cleanBody || 'No text content available for this dispatch.'}
          </Text>
        )}

        {/* Next Story Card */}
        {related.length > 0 && (
          <TouchableOpacity
            style={[styles.nextStoryCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
            onPress={() => navigation.push('ArticleDetail', { slug: related[0].slug })}
            activeOpacity={0.85}
          >
            <View style={styles.nextStoryLeft}>
              <Text style={[styles.nextStoryTag, { color: colors.primary }]}>UP NEXT IN THIS SECTION</Text>
              <Text style={[styles.nextStoryTitle, { color: colors.text, fontFamily: typography.fontSerif }]} numberOfLines={2}>
                {related[0].title}
              </Text>
            </View>
            <ArrowRight size={22} color={colors.primary} />
          </TouchableOpacity>
        )}

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
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSub: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 14,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  backTextBtn: {
    padding: 8,
  },
  nextStoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
    marginBottom: 10,
    gap: 12,
  },
  nextStoryLeft: {
    flex: 1,
  },
  nextStoryTag: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  nextStoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
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


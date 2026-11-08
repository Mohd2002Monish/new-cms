import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import newsApi from '../api/newsApi';
import logger from '../utils/logger';
import HeaderBar from '../components/HeaderBar';
import DailyBriefingBanner from '../components/DailyBriefingBanner';
import CategoryPills from '../components/CategoryPills';
import ArticleCard from '../components/ArticleCard';

export default function HomeScreen({ navigation }) {
  const { colors, typography } = useTheme();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [articles, setArticles] = useState([]);
  const [breakingNews, setBreakingNews] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  // Load initial data
  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        newsApi.clearCache();
      } else {
        setLoading(true);
      }
      setErrorMessage(null);

      // Only re-fetch categories and breaking news on refresh or initial startup
      const fetchCats = isRefresh || categories.length === 0;
      const fetchBreaking = isRefresh || breakingNews.length === 0;

      const [catList, breakingList, articlesRes] = await Promise.all([
        fetchCats
          ? newsApi.getCategories('en', isRefresh).catch((err) => {
              logger.warn('HomeScreen', 'Categories fetch failed', err);
              return [];
            })
          : Promise.resolve(categories),
        fetchBreaking
          ? newsApi.getBreakingNews('en', isRefresh).catch((err) => {
              logger.warn('HomeScreen', 'Breaking news fetch failed', err);
              return [];
            })
          : Promise.resolve(breakingNews),
        newsApi.getArticles({
          page: 1,
          limit: 12,
          category: selectedCategory,
          forceRefresh: isRefresh,
        }).catch((err) => {
          logger.error('HomeScreen', 'Articles fetch failed', err);
          setErrorMessage(err?.message || 'Unable to connect to news server');
          return null;
        }),
      ]);

      if (catList && catList.length > 0) setCategories(catList);
      if (breakingList && breakingList.length > 0) setBreakingNews(breakingList);
      if (articlesRes?.data) {
        setArticles(articlesRes.data);
        setPage(1);
        setHasMore(!!articlesRes.pagination?.hasNextPage);
      }
    } catch (err) {
      logger.error('HomeScreen', 'loadData general error', err);
      setErrorMessage(err?.message || 'Error loading dispatches');
    } finally {
      setLoading(false);
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, categories.length, breakingNews.length]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load more articles on scroll
  const handleLoadMore = async () => {
    if (loading || !hasMore) return;
    try {
      const nextPage = page + 1;
      const res = await newsApi.getArticles({
        page: nextPage,
        limit: 10,
        category: selectedCategory,
      });
      const incoming = res?.data || [];
      if (incoming.length > 0) {
        setArticles((prev) => [...prev, ...incoming]);
        setPage(nextPage);
        setHasMore(!!res?.pagination?.hasNextPage);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      setHasMore(false);
    }
  };

  const handleCategorySelect = (catSlug) => {
    setSelectedCategory(catSlug);
  };

  const renderArticleItem = useCallback(
    ({ item }) => (
      <ArticleCard
        article={item}
        onPress={() => navigation.navigate('ArticleDetail', { slug: item.slug })}
      />
    ),
    [navigation]
  );

  const heroArticle = articles.length > 0 ? articles[0] : null;
  const feedArticles = articles.length > 1 ? articles.slice(1) : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar onOpenSearch={() => navigation.navigate('Search')} />

      <FlatList
        data={feedArticles}
        keyExtractor={(item, index) => item._id || item.slug || String(index)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={3}
        removeClippedSubviews={Platform.OS === 'android'}
        updateCellsBatchingPeriod={40}
        ListHeaderComponent={
          <View>
            {/* Breaking News Marquee Strip if present */}
            {breakingNews.length > 0 && (
              <View style={[styles.breakingStrip, { backgroundColor: colors.primary }]}>
                <Text style={styles.breakingTag}>BREAKING</Text>
                <Text style={styles.breakingText} numberOfLines={1}>
                  {breakingNews[0]?.title}
                </Text>
              </View>
            )}

            {/* Continuous Daily Briefing Top 25 Audio Banner */}
            <DailyBriefingBanner onOpenFullPlayer={() => navigation.navigate('AudioDigestModal')} />

            {/* Category horizontal tabs */}
            <CategoryPills
              categories={categories}
              selectedSlug={selectedCategory}
              onSelectCategory={handleCategorySelect}
            />

            {/* Lead Story / Hero Card */}
            {heroArticle && (
              <View style={styles.heroWrapper}>
                <ArticleCard
                  article={heroArticle}
                  isHero={true}
                  onPress={() => navigation.navigate('ArticleDetail', { slug: heroArticle.slug })}
                />
              </View>
            )}

            {/* Section Divider Header */}
            {articles.length > 0 && (
              <View style={[styles.sectionDivider, { borderBottomColor: colors.borderLight }]}>
                <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.fontSerif }]}>
                  {selectedCategory === 'all' ? 'Latest Reports' : 'Category Feed'}
                </Text>
              </View>
            )}
          </View>
        }
        renderItem={renderArticleItem}
        ListEmptyComponent={
          initialLoading || loading ? (
            <View style={styles.stateContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.stateText, { color: colors.textSecondary }]}>
                Fetching latest dispatches...
              </Text>
            </View>
          ) : errorMessage ? (
            <View style={styles.stateContainer}>
              <Text style={[styles.stateTitle, { color: colors.statusError || '#ef4444' }]}>
                Connection Issue
              </Text>
              <Text style={[styles.stateText, { color: colors.textSecondary }]}>
                {errorMessage}
              </Text>
              <TouchableOpacity
                style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                onPress={() => loadData()}
              >
                <Text style={styles.retryBtnText}>Tap to Retry</Text>
              </TouchableOpacity>
            </View>
          ) : !heroArticle ? (
            <View style={styles.stateContainer}>
              <Text style={[styles.stateText, { color: colors.textSecondary }]}>
                No stories available in this section yet.
              </Text>
              <TouchableOpacity
                style={[styles.retryBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => loadData(true)}
              >
                <Text style={[styles.retryBtnText, { color: colors.text }]}>Refresh Feed</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListFooterComponent={
          loading && articles.length > 0 ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <View style={{ height: 80 }} />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  breakingStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  breakingTag: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  breakingText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  heroWrapper: {
    marginTop: 6,
  },
  sectionDivider: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  stateContainer: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  stateText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});


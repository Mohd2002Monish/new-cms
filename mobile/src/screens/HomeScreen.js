import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Text,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import newsApi from '../api/newsApi';
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
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Load initial data
  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [catList, breakingList, articlesRes] = await Promise.all([
        newsApi.getCategories(),
        newsApi.getBreakingNews(),
        newsApi.getArticles({ page: 1, limit: 12, category: selectedCategory }),
      ]);

      setCategories(catList || []);
      setBreakingNews(breakingList || []);
      setArticles(articlesRes?.data || []);
      setPage(1);
      setHasMore(!!articlesRes?.pagination?.hasNextPage);
    } catch (err) {
      console.warn('Failed to load home news data:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory]);

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
            <View style={[styles.sectionDivider, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.fontSerif }]}>
                {selectedCategory === 'all' ? 'Latest Reports' : 'Category Feed'}
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <ArticleCard
            article={item}
            onPress={() => navigation.navigate('ArticleDetail', { slug: item.slug })}
          />
        )}
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
});


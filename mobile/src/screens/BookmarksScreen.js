import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { Bookmark, Sparkles } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import newsApi from '../api/newsApi';
import ArticleCard from '../components/ArticleCard';

export default function BookmarksScreen({ navigation }) {
  const { colors, typography } = useTheme();
  const { bookmarks } = useAuth();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadBookmarkedArticles() {
      if (!bookmarks || bookmarks.length === 0) {
        setArticles([]);
        return;
      }
      setLoading(true);
      try {
        // Fetch stories for all bookmarked slugs
        const storyPromises = bookmarks.map((slug) => newsApi.getArticleBySlug(slug).catch(() => null));
        const results = await Promise.all(storyPromises);
        setArticles(results.filter(Boolean));
      } catch (e) {
        console.warn('Failed to load bookmarked articles:', e?.message);
      } finally {
        setLoading(false);
      }
    }
    loadBookmarkedArticles();
  }, [bookmarks]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        <Text style={[styles.title, { color: colors.text, fontFamily: typography.fontSerif }]}>
          Saved Library
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {bookmarks.length} stories saved for offline reading
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : articles.length > 0 ? (
        <FlatList
          data={articles}
          keyExtractor={(item, index) => item._id || item.slug || String(index)}
          renderItem={({ item }) => (
            <ArticleCard
              article={item}
              onPress={() => navigation.navigate('ArticleDetail', { slug: item.slug })}
            />
          )}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Bookmark size={48} color={colors.textMuted} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: typography.fontSerif }]}>
            No Saved Stories Yet
          </Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Tap the bookmark icon on any headline or report to save it for reading or listening later.
          </Text>
          <TouchableOpacity
            style={[styles.exploreBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.exploreBtnText}>Explore Top Headlines</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
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
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  exploreBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});


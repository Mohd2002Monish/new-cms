import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import newsApi from '../api/newsApi';
import CategoryPills from '../components/CategoryPills';
import ArticleCard from '../components/ArticleCard';

export default function CategoryScreen({ navigation }) {
  const { colors, typography } = useTheme();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCategories() {
      try {
        const list = await newsApi.getCategories();
        setCategories(list || []);
        if (list && list.length > 0) {
          const preferred = list.find((c) => c.slug === 'technology') || list[0];
          setSelectedCategory(preferred.slug);
        }
      } catch (e) {
        console.warn('Failed to load categories:', e?.message);
      }
    }
    loadCategories();
  }, []);

  useEffect(() => {
    async function loadCategoryArticles() {
      if (!selectedCategory) return;
      setLoading(true);
      try {
        const res = await newsApi.getArticles({
          category: selectedCategory,
          limit: 15,
        });
        setArticles(res?.data || []);
      } catch (e) {
        console.warn('Failed to load category articles:', e?.message);
      } finally {
        setLoading(false);
      }
    }
    loadCategoryArticles();
  }, [selectedCategory]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        <Text style={[styles.title, { color: colors.text, fontFamily: typography.fontSerif }]}>
          Sections & Beats
        </Text>
      </View>

      <CategoryPills
        categories={categories}
        selectedSlug={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item, index) => item._id || item.slug || String(index)}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={50}
          renderItem={({ item }) => (
            <ArticleCard
              article={item}
              onPress={() => navigation.navigate('ArticleDetail', { slug: item.slug })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={{ color: colors.textSecondary }}>No articles found in this section.</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 80 }}
        />
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
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
});


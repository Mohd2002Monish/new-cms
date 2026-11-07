import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Search, X, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import newsApi from '../api/newsApi';
import ArticleCard from '../components/ArticleCard';

export default function SearchScreen({ navigation }) {
  const { colors, typography } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceTimer = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await newsApi.searchArticles({ query: query.trim(), limit: 20 });
        setResults(res?.data || []);
      } catch (e) {
        console.warn('Search failed:', e?.message);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(debounceTimer.current);
  }, [query]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Input Bar */}
      <View style={[styles.searchBar, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={[styles.inputContainer, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Search size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Search stories, topics, authors..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item, index) => item._id || item.slug || String(index)}
          renderItem={({ item }) => (
            <ArticleCard
              article={item}
              onPress={() => navigation.navigate('ArticleDetail', { slug: item.slug })}
            />
          )}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      ) : query.trim().length > 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No stories matching "{query}"
          </Text>
        </View>
      ) : (
        <View style={styles.placeholderContainer}>
          <Text style={[styles.placeholderTitle, { color: colors.text, fontFamily: typography.fontSerif }]}>
            Search The Daily Chronicle
          </Text>
          <Text style={[styles.placeholderSub, { color: colors.textMuted }]}>
            Find breaking reports, analysis, investigations, and audio stories.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
    marginRight: 6,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  placeholderContainer: {
    padding: 30,
    alignItems: 'center',
    marginTop: 40,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  placeholderSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});


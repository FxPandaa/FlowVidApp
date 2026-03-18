import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { cinemetaService } from '../services';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';

interface MediaItem {
  imdbId: string;
  title: string;
  year?: number;
  poster?: string;
  type: 'movie' | 'series';
  rating?: number;
}

type FilterType = 'all' | 'movie' | 'series';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const CARD_GAP = spacing.md;
const CARD_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - CARD_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

export function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setIsSearching(true);
    setSearched(true);
    try {
      const { results: searchResults } = await cinemetaService.search(q.trim());
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleChangeText = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(text), 600);
  };

  const handleSubmit = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    performSearch(query);
    Keyboard.dismiss();
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
    setFilter('all');
  };

  const filteredResults = results.filter((item) => {
    if (filter === 'all') return true;
    return item.type === filter;
  });

  const filterTabs: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'movie', label: 'Movies' },
    { key: 'series', label: 'Series' },
  ];

  const renderGridItem = ({ item, index }: { item: MediaItem; index: number }) => {
    const isLastInRow = (index + 1) % NUM_COLUMNS === 0;
    return (
      <TouchableOpacity
        style={[styles.gridCard, !isLastInRow && { marginRight: CARD_GAP }]}
        onPress={() => navigation.navigate('Details', { type: item.type, id: item.imdbId })}
        activeOpacity={0.75}
      >
        <View style={styles.gridPosterContainer}>
          <Image
            source={{ uri: item.poster }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />
          <View style={styles.gridOverlay} />
          <View style={styles.gridPlayCircle}>
            <Text style={styles.gridPlayIcon}>▶</Text>
          </View>
          {item.rating && item.rating > 0 && (
            <View style={styles.gridRating}>
              <Text style={styles.gridRatingStar}>★</Text>
              <Text style={styles.gridRatingText}>{item.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
        <Text style={styles.gridTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.gridMeta}>
          {item.year && <Text style={styles.gridYear}>{item.year}</Text>}
          <Text style={styles.gridType}>
            {item.type === 'movie' ? 'Movie' : 'Series'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Search bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.input}
            placeholder="Search movies & shows..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={handleChangeText}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter tabs */}
      {searched && results.length > 0 && (
        <View style={styles.filterRow}>
          {filterTabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}
              onPress={() => setFilter(tab.key)}
            >
              <Text style={[styles.filterTabText, filter === tab.key && styles.filterTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
          <Text style={styles.resultCount}>
            {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {isSearching ? (
        <View style={styles.centerContent}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.searchingText}>Searching...</Text>
        </View>
      ) : filteredResults.length > 0 ? (
        <FlatList
          data={filteredResults}
          keyExtractor={(item) => item.imdbId}
          renderItem={renderGridItem}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      ) : searched && !isSearching ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyIcon}>🎬</Text>
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySubtitle}>Try a different search term</Text>
        </View>
      ) : (
        <View style={styles.centerContent}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>Find your next watch</Text>
          <Text style={styles.emptySubtitle}>Search for movies and TV shows</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  searchBarContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg + 8,
    paddingBottom: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    height: 48,
  },
  searchIcon: {
    fontSize: fontSize.md,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSize.md,
  },
  clearBtn: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterTab: {
    backgroundColor: colors.bgTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  resultCount: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginLeft: 'auto',
  },
  grid: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  gridCard: {
    width: CARD_WIDTH,
    marginBottom: spacing.lg,
  },
  gridPosterContainer: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.5,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.bgTertiary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 7,
    elevation: 4,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  gridPlayCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -17,
    marginLeft: -17,
  },
  gridPlayIcon: {
    color: colors.bgPrimary,
    fontSize: 13,
    marginLeft: 2,
  },
  gridRating: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  gridRatingStar: {
    color: colors.star,
    fontSize: 9,
  },
  gridRatingText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '600',
  },
  gridTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginTop: spacing.xs,
    letterSpacing: -0.1,
  },
  gridMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  gridYear: {
    color: colors.textMuted,
    fontSize: 10,
  },
  gridType: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '500',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
    gap: spacing.sm,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  searchingText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.md,
  },
});


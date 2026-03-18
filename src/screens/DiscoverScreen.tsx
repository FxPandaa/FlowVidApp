import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { tmdbService, TmdbDiscoverItem } from '../services';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm * 2) / 3;

const SORT_OPTIONS = [
  { value: 'popularity.desc', label: 'Most Popular' },
  { value: 'vote_average.desc', label: 'Highest Rated' },
  { value: 'primary_release_date.desc', label: 'Newest First' },
  { value: 'primary_release_date.asc', label: 'Oldest First' },
  { value: 'vote_count.desc', label: 'Most Voted' },
];

const LANGUAGES = [
  { code: '', label: 'All' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'zh', label: 'Chinese' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ar', label: 'Arabic' },
  { code: 'ru', label: 'Russian' },
  { code: 'nl', label: 'Dutch' },
];

interface Genre {
  id: number;
  name: string;
}

function DiscoverCard({ item }: { item: TmdbDiscoverItem }) {
  const navigation = useNavigation<any>();
  const [resolving, setResolving] = useState(false);

  const handlePress = async () => {
    if (resolving) return;
    setResolving(true);
    try {
      const imdbId = await tmdbService.resolveImdbId(item.tmdbId, item.type);
      if (imdbId) {
        navigation.navigate('Details', { id: imdbId, type: item.type });
      }
    } catch {
      // ignore
    } finally {
      setResolving(false);
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.cardPoster}>
        {item.posterUrl ? (
          <Image source={{ uri: item.posterUrl }} style={styles.cardImage} />
        ) : (
          <View style={styles.cardPlaceholder}>
            <Text style={styles.cardPlaceholderText}>
              {item.type === 'movie' ? '🎬' : '📺'}
            </Text>
          </View>
        )}
        {resolving && (
          <View style={styles.cardOverlay}>
            <ActivityIndicator color={colors.white} />
          </View>
        )}
        {item.rating > 0 && (
          <View style={styles.cardRating}>
            <Text style={styles.cardRatingText}>⭐ {item.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.cardMeta}>
        {item.releaseDate?.substring(0, 4) || 'TBA'} · {item.type === 'movie' ? 'Movie' : 'Series'}
      </Text>
    </TouchableOpacity>
  );
}

export function DiscoverScreen() {
  const [type, setType] = useState<'movie' | 'series'>('movie');
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState('popularity.desc');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [ratingMin, setRatingMin] = useState('');
  const [language, setLanguage] = useState('');
  const [genreModalOpen, setGenreModalOpen] = useState(false);
  const [sortModalOpen, setSortModalOpen] = useState(false);

  const [results, setResults] = useState<TmdbDiscoverItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    tmdbService.getGenres(type).then(setGenres);
  }, [type]);

  const filterParams = useMemo(
    () => ({
      sortBy,
      genres: selectedGenres,
      yearGte: yearFrom ? parseInt(yearFrom) : undefined,
      yearLte: yearTo ? parseInt(yearTo) : undefined,
      ratingGte: ratingMin ? parseFloat(ratingMin) : undefined,
      language: language || undefined,
    }),
    [sortBy, selectedGenres, yearFrom, yearTo, ratingMin, language],
  );

  const loadResults = useCallback(
    async (p: number, append: boolean = false) => {
      try {
        const data = await tmdbService.discover(type, { ...filterParams, page: p });
        if (append) {
          setResults((prev) => [...prev, ...data.results]);
        } else {
          setResults(data.results);
        }
        setTotalPages(data.totalPages);
      } catch {
        // ignore
      }
    },
    [type, filterParams],
  );

  useEffect(() => {
    setPage(1);
    setIsLoading(true);
    loadResults(1, false).finally(() => setIsLoading(false));
  }, [type, filterParams, loadResults]);

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current || page >= totalPages || isLoading) return;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    loadResults(nextPage, true).finally(() => {
      setIsLoadingMore(false);
      loadingMoreRef.current = false;
    });
  }, [page, totalPages, isLoading, loadResults]);

  const toggleGenre = (id: number) => {
    setSelectedGenres((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  };

  const clearFilters = () => {
    setSelectedGenres([]);
    setSortBy('popularity.desc');
    setYearFrom('');
    setYearTo('');
    setRatingMin('');
    setLanguage('');
  };

  const hasActiveFilters =
    selectedGenres.length > 0 ||
    sortBy !== 'popularity.desc' ||
    yearFrom !== '' ||
    yearTo !== '' ||
    ratingMin !== '' ||
    language !== '';

  const renderItem = useCallback(
    ({ item }: { item: TmdbDiscoverItem }) => <DiscoverCard item={item} />,
    [],
  );

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label || 'Sort';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.subtitle}>
          Find your next favorite {type === 'movie' ? 'movie' : 'show'}
        </Text>
      </View>

      {/* Type toggle */}
      <View style={styles.typeTabs}>
        <TouchableOpacity
          style={[styles.typeTab, type === 'movie' && styles.typeTabActive]}
          onPress={() => setType('movie')}
        >
          <Text style={[styles.typeTabText, type === 'movie' && styles.typeTabTextActive]}>
            🎬 Movies
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeTab, type === 'series' && styles.typeTabActive]}
          onPress={() => setType('series')}
        >
          <Text style={[styles.typeTabText, type === 'series' && styles.typeTabTextActive]}>
            📺 TV Shows
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
        <View style={styles.filterChipsRow}>
          <TouchableOpacity style={styles.filterChip} onPress={() => setSortModalOpen(true)}>
            <Text style={styles.filterChipText}>{sortLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedGenres.length > 0 && styles.filterChipActive]}
            onPress={() => setGenreModalOpen(true)}
          >
            <Text style={[styles.filterChipText, selectedGenres.length > 0 && styles.filterChipTextActive]}>
              {selectedGenres.length === 0
                ? 'All Genres'
                : `${selectedGenres.length} Genre${selectedGenres.length > 1 ? 's' : ''}`}
            </Text>
          </TouchableOpacity>

          {LANGUAGES.slice(0, 6).map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.filterChip, language === lang.code && styles.filterChipActive]}
              onPress={() => setLanguage(lang.code === language ? '' : lang.code)}
            >
              <Text style={[styles.filterChipText, language === lang.code && styles.filterChipTextActive]}>
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}

          {hasActiveFilters && (
            <TouchableOpacity style={styles.clearChip} onPress={clearFilters}>
              <Text style={styles.clearChipText}>✕ Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Year / Rating row */}
      <View style={styles.filterRow}>
        <TextInput
          style={styles.filterInput}
          placeholder="Year from"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          value={yearFrom}
          onChangeText={setYearFrom}
          maxLength={4}
        />
        <TextInput
          style={styles.filterInput}
          placeholder="Year to"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          value={yearTo}
          onChangeText={setYearTo}
          maxLength={4}
        />
        <TextInput
          style={styles.filterInput}
          placeholder="Min rating"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          value={ratingMin}
          onChangeText={setRatingMin}
          maxLength={3}
        />
      </View>

      {/* Results grid */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(item, idx) => `${item.tmdbId}-${idx}`}
          numColumns={3}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoadingMore ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
            ) : null
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptyHint}>Try adjusting your filters</Text>
        </View>
      )}

      {/* Sort Modal */}
      <Modal visible={sortModalOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setSortModalOpen(false)} activeOpacity={1}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sort By</Text>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.modalOption, sortBy === opt.value && styles.modalOptionActive]}
                onPress={() => {
                  setSortBy(opt.value);
                  setSortModalOpen(false);
                }}
              >
                <Text style={[styles.modalOptionText, sortBy === opt.value && styles.modalOptionTextActive]}>
                  {opt.label}
                </Text>
                {sortBy === opt.value && <Text style={styles.checkMark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Genre Modal */}
      <Modal visible={genreModalOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setGenreModalOpen(false)} activeOpacity={1}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Genres</Text>
              {selectedGenres.length > 0 && (
                <TouchableOpacity onPress={() => setSelectedGenres([])}>
                  <Text style={styles.modalClear}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {genres.map((genre) => {
                const selected = selectedGenres.includes(genre.id);
                return (
                  <TouchableOpacity
                    key={genre.id}
                    style={[styles.modalOption, selected && styles.modalOptionActive]}
                    onPress={() => toggleGenre(genre.id)}
                  >
                    <Text style={[styles.modalOptionText, selected && styles.modalOptionTextActive]}>
                      {genre.name}
                    </Text>
                    {selected && <Text style={styles.checkMark}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => setGenreModalOpen(false)}
            >
              <Text style={styles.modalDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  title: { color: colors.textPrimary, fontSize: fontSize.xxl, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2 },
  typeTabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.md,
    padding: 3,
  },
  typeTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md - 2,
    alignItems: 'center',
  },
  typeTabActive: { backgroundColor: colors.primaryLight },
  typeTabText: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: '600' },
  typeTabTextActive: { color: colors.primary },
  filterChips: { marginBottom: spacing.sm },
  filterChipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  filterChip: {
    backgroundColor: colors.bgTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  filterChipText: { color: colors.textSecondary, fontSize: fontSize.xs },
  filterChipTextActive: { color: colors.primary, fontWeight: '600' },
  clearChip: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  clearChipText: { color: colors.danger, fontSize: fontSize.xs },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  filterInput: {
    flex: 1,
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: colors.textPrimary,
    fontSize: fontSize.xs,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  grid: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  gridRow: { gap: spacing.sm },
  card: { width: CARD_WIDTH, marginBottom: spacing.md },
  cardPoster: { width: '100%', aspectRatio: 2 / 3, borderRadius: borderRadius.md, overflow: 'hidden', backgroundColor: colors.bgTertiary },
  cardImage: { width: '100%', height: '100%' },
  cardPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardPlaceholderText: { fontSize: 28 },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardRating: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardRatingText: { color: colors.white, fontSize: 10 },
  cardTitle: { color: colors.textPrimary, fontSize: fontSize.xs, fontWeight: '500', marginTop: 4 },
  cardMeta: { color: colors.textMuted, fontSize: 10, marginTop: 1 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyIcon: { fontSize: 40, marginBottom: spacing.md },
  emptyTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: '600' },
  emptyHint: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 4 },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: SCREEN_WIDTH * 0.85,
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: '700', marginBottom: spacing.md },
  modalClear: { color: colors.danger, fontSize: fontSize.sm },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  modalOptionActive: { backgroundColor: colors.primaryLight },
  modalOptionText: { color: colors.textSecondary, fontSize: fontSize.md },
  modalOptionTextActive: { color: colors.primary, fontWeight: '600' },
  checkMark: { color: colors.primary, fontSize: fontSize.md, fontWeight: '600' },
  modalDoneBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  modalDoneBtnText: { color: colors.white, fontSize: fontSize.md, fontWeight: '600' },
});

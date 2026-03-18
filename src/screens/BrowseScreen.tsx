import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { cinemetaService, MediaItem } from '../services';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm * 2) / 3;

const CATEGORIES: Record<
  string,
  { title: string; type: 'movie' | 'series'; catalog: 'top' | 'imdbRating' }
> = {
  'popular-movies': { title: 'Popular Movies', type: 'movie', catalog: 'top' },
  'popular-series': { title: 'Popular TV Shows', type: 'series', catalog: 'top' },
  'top-movies': { title: 'Top Rated Movies', type: 'movie', catalog: 'imdbRating' },
  'top-series': { title: 'Top Rated TV Shows', type: 'series', catalog: 'imdbRating' },
};

type BrowseRouteParams = { category?: string };

function BrowseCard({ item }: { item: MediaItem }) {
  const navigation = useNavigation<any>();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('Details', { id: item.id, type: item.type })}
      activeOpacity={0.7}
    >
      <View style={styles.cardPoster}>
        {item.poster ? (
          <Image source={{ uri: item.poster }} style={styles.cardImage} />
        ) : (
          <View style={styles.cardPlaceholder}>
            <Text style={styles.cardPlaceholderText}>
              {item.type === 'movie' ? '🎬' : '📺'}
            </Text>
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
        {item.year || 'TBA'} · {item.type === 'movie' ? 'Movie' : 'Series'}
      </Text>
    </TouchableOpacity>
  );
}

export function BrowseScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ Browse: BrowseRouteParams }, 'Browse'>>();
  const category = route.params?.category || 'popular-movies';
  const config = CATEGORIES[category];

  const [items, setItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const loadingMoreRef = useRef(false);

  const loadItems = useCallback(
    async (currentSkip: number) => {
      if (!config) return;
      try {
        const data = await cinemetaService.getCatalog(config.type, config.catalog, currentSkip);
        if (data.length === 0) {
          setHasMore(false);
        } else {
          setItems((prev) => (currentSkip === 0 ? data : [...prev, ...data]));
        }
      } catch {
        // ignore
      }
    },
    [config],
  );

  useEffect(() => {
    setItems([]);
    setSkip(0);
    setHasMore(true);
    setIsLoading(true);
    loadItems(0).finally(() => setIsLoading(false));
  }, [category, loadItems]);

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current || !hasMore || isLoading) return;
    loadingMoreRef.current = true;
    const nextSkip = skip + 100;
    setSkip(nextSkip);
    setIsLoadingMore(true);
    loadItems(nextSkip).finally(() => {
      setIsLoadingMore(false);
      loadingMoreRef.current = false;
    });
  }, [hasMore, isLoading, skip, loadItems]);

  if (!config) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Category not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.goBackText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderItem = useCallback(
    ({ item }: { item: MediaItem }) => <BrowseCard item={item} />,
    [],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{config.title}</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => `${item.type}-${item.id}`}
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  backBtn: { padding: spacing.xs },
  title: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: '800', letterSpacing: -0.5 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  grid: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  gridRow: { gap: spacing.sm },
  card: { width: CARD_WIDTH, marginBottom: spacing.md },
  cardPoster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.bgTertiary,
  },
  cardImage: { width: '100%', height: '100%' },
  cardPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardPlaceholderText: { fontSize: 28 },
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
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPrimary },
  emptyTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: '600' },
  goBackText: { color: colors.primary, fontSize: fontSize.md, marginTop: spacing.md },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useLibraryStore } from '../stores';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';

type Tab = 'all' | 'movies' | 'series' | 'favorites' | 'watchlist';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLS = 3;
const CARD_GAP = spacing.md;
const CARD_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - CARD_GAP * (NUM_COLS - 1)) / NUM_COLS;

export function LibraryScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const { library, collections } = useLibraryStore();

  const filteredItems = library.filter((item: any) => {
    switch (activeTab) {
      case 'movies':
        return item.type === 'movie';
      case 'series':
        return item.type === 'series';
      case 'favorites':
        return item.isFavorite;
      case 'watchlist':
        return item.watchlist;
      default:
        return true;
    }
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'movies', label: 'Movies' },
    { key: 'series', label: 'Series' },
    { key: 'favorites', label: '★ Favorites' },
    { key: 'watchlist', label: 'Watchlist' },
  ];

  const handlePress = (item: any) => {
    navigation.navigate('Details', {
      type: item.type,
      id: item.imdbId,
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
        style={styles.tabsScroll}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Library items */}
      {filteredItems.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyText}>Your library is empty</Text>
          <Text style={styles.emptySubtext}>
            Add movies and shows from their detail pages
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item: any) => item.imdbId}
          numColumns={NUM_COLS}
          contentContainerStyle={styles.grid}
          renderItem={({ item, index }: { item: any; index: number }) => {
            const isLastInRow = (index + 1) % NUM_COLS === 0;
            return (
              <TouchableOpacity
                style={[styles.card, !isLastInRow && { marginRight: CARD_GAP }]}
                onPress={() => handlePress(item)}
                activeOpacity={0.75}
              >
                <View style={styles.posterContainer}>
                  <Image
                    source={{ uri: item.poster }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    transition={200}
                  />
                  {/* Overlay */}
                  <View style={styles.posterOverlay} />
                  {/* Play circle */}
                  <View style={styles.playCircle}>
                    <Text style={styles.playIcon}>▶</Text>
                  </View>
                  {/* Favorite badge */}
                  {item.isFavorite && (
                    <View style={styles.favoriteBadge}>
                      <Text style={styles.favoriteBadgeText}>★</Text>
                    </View>
                  )}
                  {/* Watchlist badge */}
                  {item.watchlist && (
                    <View style={styles.watchlistBadge}>
                      <Text style={styles.watchlistBadgeText}>+</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={styles.cardMeta}>
                  <Text style={styles.cardYear}>{item.year}</Text>
                  <Text style={styles.cardType}>
                    {item.type === 'movie' ? 'Movie' : 'Series'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  tabsScroll: {
    flexGrow: 0,
  },
  tabs: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  tab: {
    backgroundColor: colors.bgTertiary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    marginRight: spacing.sm,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  tabTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  grid: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  card: {
    width: CARD_WIDTH,
    marginBottom: spacing.lg,
  },
  posterContainer: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.5,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.bgTertiary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 4,
  },
  posterOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  playCircle: {
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
  playIcon: {
    color: colors.bgPrimary,
    fontSize: 13,
    marginLeft: 2,
  },
  favoriteBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: borderRadius.round,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  favoriteBadgeText: {
    color: colors.star,
    fontSize: 12,
  },
  watchlistBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: borderRadius.round,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.4)',
  },
  watchlistBadgeText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginTop: spacing.xs,
    letterSpacing: -0.1,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  cardYear: {
    color: colors.textMuted,
    fontSize: 10,
  },
  cardType: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '500',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});

import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { useLibraryStore } from '../stores';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';

interface WatchHistoryItem {
  imdbId: string;
  title: string;
  type: 'movie' | 'series';
  poster?: string;
  progress: number;
  duration?: number;
  season?: number;
  episode?: number;
  episodeTitle?: string;
  watchedAt: string;
}

interface ContinueWatchingProps {
  items: WatchHistoryItem[];
}

const CARD_WIDTH = Dimensions.get('window').width * 0.44;
const CARD_HEIGHT = CARD_WIDTH * 0.58; // 16:9-ish landscape

export function ContinueWatching({ items }: ContinueWatchingProps) {
  const navigation = useNavigation<any>();
  const { removeFromHistory } = useLibraryStore();

  if (!items.length) return null;

  const handlePress = (item: WatchHistoryItem) => {
    if (item.type === 'movie') {
      navigation.navigate('Player', { type: 'movie', id: item.imdbId });
    } else {
      navigation.navigate('Player', {
        type: 'series',
        id: item.imdbId,
        season: item.season,
        episode: item.episode,
      });
    }
  };

  const getRemainingMin = (item: WatchHistoryItem) => {
    if (!item.duration) return null;
    const remaining = Math.ceil((item.duration * (100 - item.progress)) / 100 / 60);
    return remaining > 0 ? remaining : null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Continue Watching</Text>
        <View style={styles.titleAccent} />
      </View>
      <FlatList
        data={items.slice(0, 10)}
        keyExtractor={(item, index) =>
          `${item.imdbId}-${item.season}-${item.episode}-${index}`
        }
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const remaining = getRemainingMin(item);
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => handlePress(item)}
              activeOpacity={0.8}
            >
              <View style={styles.thumbnailContainer}>
                <Image
                  source={{ uri: item.poster }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                />
                {/* Dark overlay */}
                <View style={styles.darkOverlay} />
                {/* Play circle */}
                <View style={styles.playCircle}>
                  <Text style={styles.playIcon}>▶</Text>
                </View>

                {/* Remove button */}
                {removeFromHistory && (
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() =>
                      removeFromHistory(`${item.imdbId}-${item.season}-${item.episode}`)
                    }
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={styles.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                )}

                {/* Progress bar */}
                <View style={styles.progressBar}>
                  <View
                    style={[styles.progressFill, { width: `${Math.min(item.progress, 100)}%` as any }]}
                  />
                </View>
              </View>

              {/* Card info */}
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                {item.type === 'series' && item.season && item.episode ? (
                  <Text style={styles.cardEpisode} numberOfLines={1}>
                    S{item.season}:E{item.episode}
                    {item.episodeTitle ? ` · ${item.episodeTitle}` : ''}
                  </Text>
                ) : null}
                {remaining && <Text style={styles.cardRemaining}>{remaining} min left</Text>}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xxl,
  },
  header: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  titleAccent: {
    width: 28,
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
    marginTop: 4,
  },
  list: {
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: CARD_WIDTH,
    marginRight: spacing.md,
  },
  thumbnailContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.bgTertiary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -18,
    marginLeft: -18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  playIcon: {
    color: colors.bgPrimary,
    fontSize: 13,
    marginLeft: 2,
  },
  removeBtn: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  removeBtnText: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '700',
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  cardInfo: {
    paddingTop: spacing.xs,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  cardEpisode: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 1,
  },
  cardRemaining: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 1,
  },
});


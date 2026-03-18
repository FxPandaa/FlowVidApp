import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MediaCard } from './MediaCard';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';

interface MediaItem {
  imdbId: string;
  title: string;
  year?: number;
  poster?: string;
  type: 'movie' | 'series';
  rating?: number;
}

interface MediaRowProps {
  title: string;
  items: MediaItem[];
  isLoading?: boolean;
}

const SKELETON_CARD_WIDTH = 100;
const SKELETON_CARD_HEIGHT = SKELETON_CARD_WIDTH * 1.5;

export function MediaRow({ title, items, isLoading }: MediaRowProps) {
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>
        <FlatList
          data={[1, 2, 3, 4, 5]}
          keyExtractor={(item) => String(item)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.list}
          scrollEnabled={false}
          renderItem={() => (
            <View style={styles.skeletonCard}>
              <View style={styles.skeletonPoster} />
              <View style={styles.skeletonTitle} />
              <View style={styles.skeletonMeta} />
            </View>
          )}
        />
      </View>
    );
  }

  if (!items.length) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.titleAccent} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.imdbId}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <MediaCard item={item} />}
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
  title: {
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
  // Skeleton styles
  skeletonCard: {
    width: SKELETON_CARD_WIDTH,
    marginRight: spacing.md,
  },
  skeletonPoster: {
    width: SKELETON_CARD_WIDTH,
    height: SKELETON_CARD_HEIGHT,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bgTertiary,
    marginBottom: spacing.xs,
  },
  skeletonTitle: {
    width: '80%',
    height: 11,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.bgTertiary,
    marginBottom: 4,
  },
  skeletonMeta: {
    width: '50%',
    height: 9,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.bgTertiary,
  },
});


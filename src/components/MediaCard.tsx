import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';

interface MediaItem {
  imdbId: string;
  title: string;
  year?: number;
  poster?: string;
  type: 'movie' | 'series';
  rating?: number;
}

interface MediaCardProps {
  item: MediaItem;
  width?: number;
}

const CARD_WIDTH = (Dimensions.get('window').width - spacing.lg * 2 - spacing.md * 2) / 3;

export function MediaCard({ item, width = CARD_WIDTH }: MediaCardProps) {
  const navigation = useNavigation<any>();

  const handlePress = () => {
    navigation.navigate('Details', {
      type: item.type,
      id: item.imdbId,
    });
  };

  return (
    <TouchableOpacity
      style={[styles.card, { width }]}
      onPress={handlePress}
      activeOpacity={0.75}
    >
      <View style={[styles.posterContainer, { width, height: width * 1.5 }]}>
        <Image
          source={{ uri: item.poster }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
        />
        {/* Gradient overlay at bottom for play icon */}
        <View style={styles.gradientOverlay} />

        {/* Play button overlay */}
        <View style={styles.playOverlay}>
          <View style={styles.playCircle}>
            <Text style={styles.playIcon}>▶</Text>
          </View>
        </View>

        {/* Rating badge — top right, glass style */}
        {item.rating && item.rating > 0 && (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingStar}>★</Text>
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.meta}>
          {item.year && <Text style={styles.year}>{item.year}</Text>}
          <Text style={styles.type}>
            {item.type === 'movie' ? 'Movie' : 'Series'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginRight: spacing.md,
  },
  posterContainer: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.bgTertiary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'transparent',
    // subtle darkening at bottom
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  playCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  playIcon: {
    color: colors.bgPrimary,
    fontSize: 14,
    marginLeft: 2,
  },
  ratingBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ratingStar: {
    color: colors.star,
    fontSize: 10,
  },
  ratingText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '600',
  },
  info: {
    paddingTop: spacing.sm,
    paddingHorizontal: 2,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginBottom: 3,
    letterSpacing: -0.1,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  year: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  type: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
});


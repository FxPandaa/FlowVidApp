import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';
import { useValidatedImage } from '../utils/useValidatedImage';

interface MediaItem {
  imdbId: string;
  title: string;
  year?: number;
  poster?: string;
  backdrop?: string;
  logo?: string;
  type: 'movie' | 'series';
  rating?: number;
  genres?: string[];
  overview?: string;
}

interface HeroBannerProps {
  items: MediaItem[];
  isLoading?: boolean;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BANNER_HEIGHT = SCREEN_HEIGHT * 0.58;
const ROTATION_INTERVAL = 15000;

export function HeroBanner({ items, isLoading }: HeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const navigation = useNavigation<any>();

  const currentItem = items[currentIndex] || null;
  const validLogo = useValidatedImage(currentItem?.logo);

  useEffect(() => {
    if (items.length <= 1) return;

    const timer = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      });
    }, ROTATION_INTERVAL);

    return () => clearInterval(timer);
  }, [items.length]);

  const handleNavigateDetails = useCallback(() => {
    if (currentItem) {
      navigation.navigate('Details', {
        type: currentItem.type,
        id: currentItem.imdbId,
      });
    }
  }, [currentItem, navigation]);

  const handlePlay = useCallback(() => {
    if (currentItem) {
      navigation.navigate('Player', {
        type: currentItem.type,
        id: currentItem.imdbId,
      });
    }
  }, [currentItem, navigation]);

  if (isLoading || !currentItem) {
    return (
      <View style={[styles.container, styles.loading]}>
        <View style={styles.skeletonBadge} />
        <View style={styles.skeletonLogo} />
        <View style={styles.skeletonMeta} />
        <View style={styles.skeletonOverview} />
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ImageBackground
        source={{ uri: currentItem.backdrop || currentItem.poster }}
        style={styles.backdrop}
        resizeMode="cover"
      >
        {/* Multi-layer gradient matching desktop */}
        <LinearGradient
          colors={[
            'transparent',
            'rgba(5,5,7,0.45)',
            'rgba(5,5,7,0.82)',
            colors.bgPrimary,
          ]}
          locations={[0, 0.4, 0.72, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* Left purple accent glow */}
        <LinearGradient
          colors={['rgba(99,102,241,0.18)', 'transparent']}
          start={{ x: 0, y: 1 }}
          end={{ x: 0.6, y: 0 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View style={styles.content}>
          {/* Type badge — matching desktop pill */}
          <View style={styles.typeBadge}>
            <LinearGradient
              colors={[colors.primary, '#818cf8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.typeBadgeGradient}
            >
              <Text style={styles.typeBadgeText}>
                {currentItem.type === 'movie' ? 'MOVIE' : 'SERIES'}
              </Text>
            </LinearGradient>
          </View>

          {/* Logo or title */}
          <View style={styles.logoContainer}>
            {validLogo ? (
              <Image
                source={{ uri: validLogo }}
                style={styles.logo}
                contentFit="contain"
              />
            ) : (
              <Text style={styles.title} numberOfLines={2}>
                {currentItem.title}
              </Text>
            )}
          </View>

          {/* Meta row */}
          <View style={styles.meta}>
            {currentItem.year && (
              <Text style={styles.metaText}>{currentItem.year}</Text>
            )}
            {currentItem.rating && currentItem.rating > 0 && (
              <>
                <Text style={styles.metaDivider}>·</Text>
                <View style={styles.ratingPill}>
                  <Text style={styles.ratingStar}>★</Text>
                  <Text style={styles.ratingValue}>{currentItem.rating.toFixed(1)}</Text>
                </View>
              </>
            )}
            {currentItem.genres && currentItem.genres.length > 0 && (
              <>
                <Text style={styles.metaDivider}>·</Text>
                <Text style={styles.metaText} numberOfLines={1}>
                  {currentItem.genres.slice(0, 2).join(', ')}
                </Text>
              </>
            )}
          </View>

          {/* Overview */}
          {currentItem.overview && (
            <Text style={styles.overview} numberOfLines={2}>
              {currentItem.overview}
            </Text>
          )}

          {/* Action buttons — Play + More Info, matching desktop */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.playButton} onPress={handlePlay} activeOpacity={0.85}>
              <Text style={styles.playButtonText}>▶  Play</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.infoButton} onPress={handleNavigateDetails} activeOpacity={0.8}>
              <Text style={styles.infoButtonText}>More Info</Text>
            </TouchableOpacity>
          </View>

          {/* Dot indicators */}
          {items.length > 1 && (
            <View style={styles.dots}>
              {items.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
                      setCurrentIndex(index);
                      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
                    });
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <View
                    style={[
                      styles.dot,
                      index === currentIndex && styles.dotActive,
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ImageBackground>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: BANNER_HEIGHT,
  },
  loading: {
    backgroundColor: colors.bgSecondary,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  skeletonBadge: {
    width: 64,
    height: 22,
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.round,
    marginBottom: spacing.sm,
  },
  skeletonLogo: {
    width: '55%',
    height: 52,
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.md,
  },
  skeletonMeta: {
    width: '40%',
    height: 14,
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.sm,
  },
  skeletonOverview: {
    width: '90%',
    height: 32,
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.sm,
  },
  backdrop: {
    width: '100%',
    height: '100%',
  },
  content: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
    borderRadius: borderRadius.round,
    overflow: 'hidden',
  },
  typeBadgeGradient: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  typeBadgeText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
  logoContainer: {
    height: 70,
    justifyContent: 'flex-end',
    marginBottom: spacing.md,
  },
  logo: {
    width: SCREEN_WIDTH * 0.52,
    height: 64,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  metaDivider: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    opacity: 0.5,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bgGlass,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.bgGlassBorder,
  },
  ratingStar: {
    color: colors.star,
    fontSize: 11,
  },
  ratingValue: {
    color: colors.textPrimary,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  overview: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 21,
    marginBottom: spacing.lg,
    maxWidth: SCREEN_WIDTH * 0.88,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  playButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  playButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  infoButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  infoButtonText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 20,
  },
});

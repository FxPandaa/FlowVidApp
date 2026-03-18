import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Dimensions,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  cinemetaService,
  tmdbService,
} from '../services';
import type { TmdbEnrichedData } from '../services';
import { useLibraryStore, useSettingsStore, useAddonStore } from '../stores';
import type { AddonStreamResult } from '../stores';
import { parseStreamInfo } from '../utils/streamParser';
import { useValidatedImage } from '../utils/useValidatedImage';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function getResolutionColor(badge?: string): string {
  if (!badge) return 'rgba(255,255,255,0.12)';
  const b = badge.toLowerCase();
  if (b.includes('4k') || b.includes('2160')) return 'rgba(245,158,11,0.25)';
  if (b.includes('1080')) return 'rgba(34,197,94,0.2)';
  if (b.includes('720')) return 'rgba(59,130,246,0.2)';
  return 'rgba(255,255,255,0.1)';
}

interface MovieDetails {
  imdbId: string;
  title: string;
  year?: number;
  poster?: string;
  backdrop?: string;
  logo?: string;
  rating: number;
  genres?: string[];
  overview?: string;
  runtime?: string;
  cast?: string[];
}

interface SeriesDetails extends MovieDetails {
  numberOfSeasons?: number;
  seasons?: { id: string; seasonNumber: number }[];
}

interface Episode {
  id: string;
  name: string;
  episodeNumber: number;
  overview?: string;
  still?: string;
}

export function DetailsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { type, id } = route.params;

  const [details, setDetails] = useState<MovieDetails | SeriesDetails | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [enrichedData, setEnrichedData] = useState<TmdbEnrichedData | null>(null);

  // Addon stream state
  const [streams, setStreams] = useState<AddonStreamResult[]>([]);
  const [pendingAddons, setPendingAddons] = useState<string[]>([]);
  const [isLoadingStreams, setIsLoadingStreams] = useState(false);

  const { getStreamsProgressive, addons } = useAddonStore();

  const {
    isInLibrary,
    addToLibrary,
    removeFromLibrary,
    toggleFavorite,
    toggleWatchlist,
    setUserRating,
    library,
    getWatchProgress,
  } = useLibraryStore();
  const { blurUnwatchedEpisodes } = useSettingsStore();

  const isMovie = type === 'movie';
  const validLogo = useValidatedImage(details?.logo);
  const inLibrary = details?.imdbId ? isInLibrary(details.imdbId) : false;
  const libraryItem = details?.imdbId
    ? library.find((item: any) => item.imdbId === details.imdbId)
    : null;
  const isFavorite = libraryItem?.isFavorite || false;
  const isWatchlist = libraryItem?.watchlist || false;
  const userRating = libraryItem?.userRating;

  const hasAddons = addons.filter((a) => a.enabled).length > 0;

  useEffect(() => {
    if (id) loadDetails(id);
  }, [id, type]);

  useEffect(() => {
    if (type === 'series' && details && 'seasons' in details && id) {
      loadEpisodes(id, selectedSeason);
    }
  }, [selectedSeason, details]);

  // Fetch TMDB enrichment (cast photos, trailers, recommendations)
  useEffect(() => {
    if (!id || !type) return;
    setEnrichedData(null);
    tmdbService
      .getEnrichedData(id, type as 'movie' | 'series')
      .then((data) => setEnrichedData(data))
      .catch(() => {});
  }, [id, type]);

  const loadDetails = async (imdbId: string) => {
    setIsLoading(true);
    try {
      if (isMovie) {
        const data = await cinemetaService.getMovieDetails(imdbId);
        setDetails(data);
      } else {
        const data = await cinemetaService.getSeriesDetails(imdbId);
        setDetails(data);
        const firstSeason = data.seasons?.find((s: any) => s.seasonNumber > 0);
        if (firstSeason) setSelectedSeason(firstSeason.seasonNumber);
      }
    } catch (error) {
      console.error('Failed to load details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEpisodes = async (imdbId: string, season: number) => {
    try {
      const eps = await cinemetaService.getSeasonEpisodes(imdbId, season);
      setEpisodes(eps);
    } catch {
      setEpisodes([]);
    }
  };

  const handleLoadStreams = useCallback(async (season?: number, episode?: number) => {
    if (!details?.imdbId || !hasAddons) return;
    setIsLoadingStreams(true);
    setStreams([]);
    setPendingAddons([]);

    const contentId = isMovie
      ? details.imdbId
      : `${details.imdbId}:${season || selectedSeason}:${episode || 1}`;

    try {
      await getStreamsProgressive(
        type as string,
        contentId,
        (partial, pending) => {
          setStreams([...partial]);
          setPendingAddons([...pending]);
        },
      );
    } catch (err) {
      console.error('Stream loading failed:', err);
    } finally {
      setIsLoadingStreams(false);
    }
  }, [details, hasAddons, isMovie, selectedSeason, type, getStreamsProgressive]);

  const handlePlay = (streamUrl?: string, season?: number, episode?: number) => {
    if (isMovie) {
      navigation.navigate('Player', { type, id, streamUrl, details });
    } else {
      navigation.navigate('Player', {
        type,
        id,
        season: season || selectedSeason,
        episode: episode || 1,
        streamUrl,
        details,
      });
    }
  };

  const handleLibraryToggle = () => {
    if (!details?.imdbId) return;
    if (inLibrary) {
      removeFromLibrary(details.imdbId);
    } else {
      addToLibrary({
        imdbId: details.imdbId,
        type: type as 'movie' | 'series',
        title: details.title,
        year: details.year || new Date().getFullYear(),
        poster: details.poster,
        backdrop: details.backdrop,
        rating: details.rating,
        genres: details.genres,
      });
    }
  };

  const totalStreamCount = streams.reduce((sum, r) => sum + r.streams.length, 0);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!details) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Content not found</Text>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.homeButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const seriesDetails = details as SeriesDetails;

  const SAFE_TOP = Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 0) + 8;

  return (
    <ScrollView style={styles.container}>
      {/* Hero backdrop */}
      <ImageBackground
        source={{ uri: details.backdrop || details.poster }}
        style={styles.backdrop}
        resizeMode="cover"
      >
        {/* Multi-layer gradient like desktop */}
        <LinearGradient
          colors={['transparent', 'rgba(5,5,7,0.5)', 'rgba(5,5,7,0.88)', colors.bgPrimary]}
          locations={[0, 0.38, 0.7, 1]}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(99,102,241,0.14)', 'transparent']}
          start={{ x: 0, y: 1 }}
          end={{ x: 0.5, y: 0 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Back button */}
        <TouchableOpacity
          style={[styles.backButton, { top: SAFE_TOP }]}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.heroContent}>
          {/* Type badge */}
          <View style={styles.typeBadgeWrapper}>
            <LinearGradient
              colors={[colors.primary, '#818cf8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.typeBadgeGradient}
            >
              <Text style={styles.typeBadgeText}>
                {isMovie ? 'MOVIE' : 'SERIES'}
              </Text>
            </LinearGradient>
          </View>

          {validLogo ? (
            <Image
              source={{ uri: validLogo }}
              style={styles.logo}
              contentFit="contain"
            />
          ) : (
            <Text style={styles.title}>{details.title}</Text>
          )}

          <View style={styles.meta}>
            {details.year && <Text style={styles.metaText}>{details.year}</Text>}
            {details.rating > 0 && (
              <>
                <Text style={styles.metaDivider}>·</Text>
                <View style={styles.ratingPill}>
                  <Text style={styles.ratingStar}>★</Text>
                  <Text style={styles.ratingPillText}>{details.rating.toFixed(1)}</Text>
                </View>
              </>
            )}
            {isMovie && (details as MovieDetails).runtime && (
              <>
                <Text style={styles.metaDivider}>·</Text>
                <Text style={styles.metaText}>{(details as MovieDetails).runtime} min</Text>
              </>
            )}
            {!isMovie && seriesDetails.numberOfSeasons && (
              <>
                <Text style={styles.metaDivider}>·</Text>
                <Text style={styles.metaText}>
                  {seriesDetails.numberOfSeasons} Season{seriesDetails.numberOfSeasons > 1 ? 's' : ''}
                </Text>
              </>
            )}
          </View>

          {details.genres && details.genres.length > 0 && (
            <View style={styles.genres}>
              {details.genres.slice(0, 4).map((genre) => (
                <View key={genre} style={styles.genreTag}>
                  <Text style={styles.genreText}>{genre}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ImageBackground>

      {/* Overview */}
      {details.overview && (
        <Text style={styles.overview}>{details.overview}</Text>
      )}

      {/* Primary play button */}
      <TouchableOpacity
        style={styles.playButtonFull}
        onPress={() => handlePlay()}
        activeOpacity={0.85}
      >
        <Text style={styles.playButtonFullText}>▶  Play</Text>
      </TouchableOpacity>

      {/* Action row */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, inLibrary && styles.actionButtonActive]}
          onPress={handleLibraryToggle}
        >
          <Text style={styles.actionButtonIcon}>{inLibrary ? '✓' : '+'}</Text>
          <Text style={styles.actionButtonText}>
            {inLibrary ? 'In Library' : 'Library'}
          </Text>
        </TouchableOpacity>
        {inLibrary && (
          <TouchableOpacity
            style={[styles.actionButton, isFavorite && styles.actionButtonActive]}
            onPress={() => details?.imdbId && toggleFavorite(details.imdbId)}
          >
            <Text style={styles.actionButtonIcon}>{isFavorite ? '★' : '☆'}</Text>
            <Text style={styles.actionButtonText}>Favorite</Text>
          </TouchableOpacity>
        )}
        {inLibrary && (
          <TouchableOpacity
            style={[styles.actionButton, isWatchlist && styles.actionButtonActive]}
            onPress={() => details?.imdbId && toggleWatchlist(details.imdbId)}
          >
            <Text style={styles.actionButtonIcon}>{isWatchlist ? '✓' : '⊕'}</Text>
            <Text style={styles.actionButtonText}>Watchlist</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Find Streams (addon-based) */}
      <TouchableOpacity
        style={[
          styles.findSourcesButton,
          !hasAddons && styles.buttonDisabled,
        ]}
        onPress={() => handleLoadStreams()}
        disabled={isLoadingStreams || !hasAddons}
        activeOpacity={0.8}
      >
        {isLoadingStreams ? (
          <ActivityIndicator color={colors.primary} size="small" style={{ marginRight: spacing.sm }} />
        ) : null}
        <Text style={styles.findSourcesText}>
          {isLoadingStreams
            ? pendingAddons.length > 0
              ? `Searching... (${pendingAddons.length} addon${pendingAddons.length > 1 ? 's' : ''} pending)`
              : 'Loading Streams...'
            : !hasAddons
              ? 'Install Addons to Stream'
              : totalStreamCount > 0
                ? `${totalStreamCount} Stream${totalStreamCount > 1 ? 's' : ''} Found — Tap to Refresh`
                : 'Find Streams'}
        </Text>
      </TouchableOpacity>

      {/* User rating */}
      {inLibrary && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Rating</Text>
          <View style={styles.sectionDivider} />
          <View style={styles.ratingStars}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => details?.imdbId && setUserRating(details.imdbId, star)}
              >
                <Text
                  style={[
                    styles.starButton,
                    userRating != null && userRating >= star ? styles.starActive : undefined,
                  ]}
                >
                  ★
                </Text>
              </TouchableOpacity>
            ))}
            {userRating && (
              <Text style={styles.ratingValue}>{userRating}/10</Text>
            )}
          </View>
        </View>
      )}

      {/* Trailers — from TMDB */}
      {enrichedData && enrichedData.trailers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trailers</Text>
          <View style={styles.sectionDivider} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
            {enrichedData.trailers.map((trailer) => (
              <TouchableOpacity key={trailer.id} style={styles.trailerCard} activeOpacity={0.8}>
                <View style={styles.trailerThumb}>
                  <Image
                    source={{ uri: `https://i.ytimg.com/vi/${trailer.key}/mqdefault.jpg` }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                  />
                  <View style={styles.trailerPlayOverlay}>
                    <Text style={styles.trailerPlayIcon}>▶</Text>
                  </View>
                </View>
                <Text style={styles.trailerName} numberOfLines={1}>{trailer.name}</Text>
                <Text style={styles.trailerType}>{trailer.type}{trailer.official ? ' · Official' : ''}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Cast — enriched with photos from TMDB */}
      {enrichedData && enrichedData.cast.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cast</Text>
          <View style={styles.sectionDivider} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
            {enrichedData.cast.map((member) => (
              <View key={member.id} style={styles.castCard}>
                <View style={styles.castPhoto}>
                  {member.profilePhoto ? (
                    <Image source={{ uri: member.profilePhoto }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  ) : (
                    <Text style={styles.castPhotoPlaceholder}>
                      {member.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </Text>
                  )}
                </View>
                <Text style={styles.enrichedCastName} numberOfLines={2}>{member.name}</Text>
                {member.character ? <Text style={styles.castCharacter} numberOfLines={2}>{member.character}</Text> : null}
              </View>
            ))}
          </ScrollView>
        </View>
      ) : details.cast && details.cast.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cast</Text>
          <View style={styles.sectionDivider} />
          <View style={styles.castList}>
            {details.cast.slice(0, 10).map((name, index) => (
              <View key={index} style={styles.castChip}>
                <Text style={styles.castName}>{name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Episodes for series */}
      {!isMovie && seriesDetails.seasons && seriesDetails.seasons.length > 0 && (
        <View style={styles.section}>
          <View style={styles.episodesHeader}>
            <Text style={styles.sectionTitle}>Episodes</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.seasonTabs}>
                {seriesDetails.seasons
                  .filter((s: any) => s.seasonNumber > 0)
                  .map((season: any) => (
                    <TouchableOpacity
                      key={season.id}
                      style={[
                        styles.seasonTab,
                        selectedSeason === season.seasonNumber && styles.seasonTabActive,
                      ]}
                      onPress={() => setSelectedSeason(season.seasonNumber)}
                    >
                      <Text
                        style={[
                          styles.seasonTabText,
                          selectedSeason === season.seasonNumber &&
                            styles.seasonTabTextActive,
                        ]}
                      >
                        S{season.seasonNumber}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </ScrollView>
          </View>

          {episodes.map((episode) => {
            const watchProgress = id
              ? getWatchProgress(id, selectedSeason, episode.episodeNumber)
              : undefined;
            const isWatched = watchProgress && watchProgress.progress > 0;

            return (
              <TouchableOpacity
                key={episode.id}
                style={styles.episodeCard}
                onPress={() => handlePlay(undefined, selectedSeason, episode.episodeNumber)}
              >
                <View style={styles.episodeThumbnail}>
                  {episode.still ? (
                    <Image
                      source={{ uri: episode.still }}
                      style={styles.episodeStill}
                      contentFit="cover"
                      blurRadius={blurUnwatchedEpisodes && !isWatched ? 15 : 0}
                    />
                  ) : (
                    <View style={styles.episodePlaceholder}>
                      <Text style={styles.episodePlaceholderText}>📺</Text>
                    </View>
                  )}
                  <View style={styles.episodePlayOverlay}>
                    <Text style={styles.episodePlayIcon}>▶</Text>
                  </View>
                  {watchProgress && watchProgress.progress > 0 && (
                    <View style={styles.episodeProgressBar}>
                      <View
                        style={[
                          styles.episodeProgressFill,
                          { width: `${watchProgress.progress}%` },
                        ]}
                      />
                    </View>
                  )}
                </View>
                <View style={styles.episodeInfo}>
                  <Text style={styles.episodeNumber}>E{episode.episodeNumber}</Text>
                  <Text style={styles.episodeName} numberOfLines={1}>
                    {episode.name}
                  </Text>
                  {episode.overview && (
                    <Text style={styles.episodeOverview} numberOfLines={2}>
                      {episode.overview}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Addon stream results (grouped by addon) */}
      {streams.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Streams</Text>
          <View style={styles.sectionDivider} />
          <Text style={styles.sourceCount}>
            {totalStreamCount} stream{totalStreamCount !== 1 ? 's' : ''} from {streams.length} addon{streams.length !== 1 ? 's' : ''}
          </Text>
          {streams.map((addonResult) => (
            <View key={addonResult.addonId} style={styles.addonGroup}>
              <View style={styles.addonGroupHeader}>
                {addonResult.addonLogo && (
                  <Image
                    source={{ uri: addonResult.addonLogo }}
                    style={styles.addonLogo}
                    contentFit="contain"
                  />
                )}
                <Text style={styles.addonGroupName}>{addonResult.addonName}</Text>
                <Text style={styles.addonStreamCount}>
                  {addonResult.streams.length} stream{addonResult.streams.length !== 1 ? 's' : ''}
                </Text>
              </View>
              {addonResult.error && (
                <Text style={styles.addonError}>{addonResult.error}</Text>
              )}
              {addonResult.streams.map((stream, idx) => {
                const info = parseStreamInfo(stream.name || stream.title || '');
                return (
                  <TouchableOpacity
                    key={`${addonResult.addonId}-${idx}`}
                    style={styles.streamCard}
                    onPress={() => handlePlay(stream.url || stream.externalUrl)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.streamHeader}>
                      <View style={[styles.streamBadge, { backgroundColor: getResolutionColor(info.resolutionBadge) }]}>
                        <Text style={styles.streamBadgeText}>
                          {info.resolutionBadge || 'HD'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.streamTitle} numberOfLines={2}>
                      {stream.name || stream.title || 'Unknown Stream'}
                    </Text>
                    {stream.description && (
                      <Text style={styles.streamDescription} numberOfLines={2}>
                        {stream.description}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      )}

      {/* More Like This — recommendations from TMDB */}
      {enrichedData && enrichedData.recommendations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>More Like This</Text>
          <View style={styles.sectionDivider} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
            {enrichedData.recommendations.map((rec) => (
              <TouchableOpacity
                key={rec.id}
                style={styles.recCard}
                activeOpacity={0.7}
                onPress={async () => {
                  const imdbId = await tmdbService.resolveImdbId(rec.id, rec.type);
                  if (imdbId) {
                    navigation.push('Details', { type: rec.type, id: imdbId });
                  }
                }}
              >
                <View style={styles.recPoster}>
                  {rec.posterUrl ? (
                    <Image source={{ uri: rec.posterUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  ) : (
                    <Text style={styles.recPosterPlaceholder}>{rec.title.slice(0, 2)}</Text>
                  )}
                  {rec.rating > 0 && (
                    <View style={styles.recRating}>
                      <Text style={styles.recRatingText}>★ {rec.rating}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.recTitle} numberOfLines={1}>{rec.title}</Text>
                {rec.releaseDate && (
                  <Text style={styles.recYear}>{rec.releaseDate.split('-')[0]}</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    marginBottom: spacing.lg,
  },
  homeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  homeButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  backButton: {
    position: 'absolute',
    left: spacing.lg,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  backButtonText: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 32,
    marginTop: -2,
  },
  typeBadgeWrapper: {
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
  backdrop: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.05,
  },
  heroContent: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
  },
  logo: {
    width: SCREEN_WIDTH * 0.58,
    height: 70,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
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
    opacity: 0.5,
    fontSize: fontSize.sm,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
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
  ratingPillText: {
    color: colors.textPrimary,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  genres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  genreTag: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  genreText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },
  overview: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    lineHeight: 24,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  playButtonFull: {
    backgroundColor: colors.primary,
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  playButtonFullText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.bgCard,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 4,
  },
  actionButtonActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  actionButtonIcon: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  actionButtonText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '500',
  },
  findSourcesButton: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  findSourcesText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  sectionDivider: {
    width: 28,
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
    marginBottom: spacing.md,
  },
  sourceCount: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  ratingStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  starButton: {
    fontSize: fontSize.xl,
    color: colors.textMuted,
  },
  starActive: {
    color: colors.star,
  },
  ratingValue: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginLeft: spacing.sm,
  },
  castList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  castChip: {
    backgroundColor: colors.bgTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
  },
  castName: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  episodesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  seasonTabs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  seasonTab: {
    backgroundColor: colors.bgTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  seasonTabActive: {
    backgroundColor: colors.primary,
  },
  seasonTabText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  seasonTabTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  episodeCard: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  episodeThumbnail: {
    width: 140,
    height: 80,
    backgroundColor: colors.bgTertiary,
  },
  episodeStill: {
    width: '100%',
    height: '100%',
  },
  episodePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodePlaceholderText: {
    fontSize: fontSize.xxl,
  },
  episodePlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  episodePlayIcon: {
    color: colors.white,
    fontSize: fontSize.lg,
  },
  episodeProgressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  episodeProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  episodeInfo: {
    flex: 1,
    padding: spacing.md,
  },
  episodeNumber: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  episodeName: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  episodeOverview: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
    lineHeight: 16,
  },

  // Addon stream results
  addonGroup: {
    marginBottom: spacing.md,
  },
  addonGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  addonLogo: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  addonGroupName: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  addonStreamCount: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  addonError: {
    color: colors.error,
    fontSize: fontSize.xs,
    marginBottom: spacing.sm,
  },
  streamCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  streamHeader: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  streamBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  streamBadgeText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  streamTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
  streamDescription: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
  bottomPadding: {
    height: 100,
  },

  // Trailers
  trailerCard: {
    width: 220,
  },
  trailerThumb: {
    width: 220,
    height: 124,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: spacing.xs,
  },
  trailerPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  trailerPlayIcon: {
    fontSize: 28,
    color: 'rgba(255,255,255,0.9)',
  },
  trailerName: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  trailerType: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },

  // Enriched cast
  castCard: {
    width: 90,
    alignItems: 'center',
    gap: 4,
  },
  castPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  castPhotoPlaceholder: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
  },
  enrichedCastName: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 15,
  },
  castCharacter: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 13,
  },

  // Recommendations
  recCard: {
    width: 110,
    gap: 4,
  },
  recPoster: {
    width: 110,
    height: 160,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recPosterPlaceholder: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
  },
  recRating: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  recRatingText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fbbf24',
  },
  recTitle: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  recYear: {
    fontSize: 10,
    color: colors.textMuted,
  },
});

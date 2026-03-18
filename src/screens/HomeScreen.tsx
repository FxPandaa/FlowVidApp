import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { HeroBanner, MediaRow, ContinueWatching } from '../components';
import { cinemetaService } from '../services';
import { useLibraryStore } from '../stores';
import { colors } from '../styles/theme';

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

export function HomeScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [popularMovies, setPopularMovies] = useState<MediaItem[]>([]);
  const [popularSeries, setPopularSeries] = useState<MediaItem[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<MediaItem[]>([]);
  const [topRatedSeries, setTopRatedSeries] = useState<MediaItem[]>([]);

  const { watchHistory } = useLibraryStore();

  // Build the top 10 featured items from popular movies + series
  const featuredItems = useMemo(() => {
    const combined: MediaItem[] = [];
    const maxEach = 5;
    for (let i = 0; i < maxEach; i++) {
      if (popularMovies[i]) combined.push(popularMovies[i]);
      if (popularSeries[i]) combined.push(popularSeries[i]);
    }
    return combined.slice(0, 10);
  }, [popularMovies, popularSeries]);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setIsLoading(true);
      const [movies, series, topMovies, topSeries] = await Promise.all([
        cinemetaService.getPopularMovies(),
        cinemetaService.getPopularSeries(),
        cinemetaService.getTopRatedMovies(),
        cinemetaService.getTopRatedSeries(),
      ]);
      setPopularMovies(movies);
      setPopularSeries(series);
      setTopRatedMovies(topMovies);
      setTopRatedSeries(topSeries);
    } catch (error) {
      console.error('Failed to load content:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadContent();
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <HeroBanner items={featuredItems} isLoading={isLoading} />

      {/* Continue Watching */}
      {watchHistory.length > 0 && (
        <ContinueWatching
          items={watchHistory.filter((item: any, index: number, self: any[]) => {
            if (item.type === 'movie') return true;
            return self.findIndex((h: any) => h.imdbId === item.imdbId) === index;
          })}
        />
      )}

      <MediaRow title="Popular Movies" items={popularMovies} isLoading={isLoading} />
      <MediaRow title="Popular TV Shows" items={popularSeries} isLoading={isLoading} />
      <MediaRow title="Top Rated Movies" items={topRatedMovies} isLoading={isLoading} />
      <MediaRow title="Top Rated TV Shows" items={topRatedSeries} isLoading={isLoading} />

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  bottomPadding: {
    height: 100,
  },
});

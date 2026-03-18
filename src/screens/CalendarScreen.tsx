import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useLibraryStore } from '../stores';
import { cinemetaService } from '../services';
import type { Episode } from '../services';
import { colors, spacing, fontSize, borderRadius, fontWeight } from '../styles/theme';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CalendarEpisode {
  imdbId: string;
  seriesTitle: string;
  poster?: string;
  season: number;
  episode: number;
  title: string;
  released: string;
  thumbnail?: string;
  overview?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CELL_SIZE = Math.floor((SCREEN_WIDTH - spacing.lg * 2) / 7);

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDate(iso: string): Date | null {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function cinemetaPoster(imdbId: string): string {
  return `https://images.metahub.space/poster/medium/${imdbId}/img`;
}

function mapEpisodes(
  imdbId: string,
  seriesTitle: string,
  poster: string | undefined,
  episodes: Episode[],
): CalendarEpisode[] {
  const seriesPoster = poster || cinemetaPoster(imdbId);
  return episodes
    .filter((ep) => ep.released)
    .map((ep) => ({
      imdbId,
      seriesTitle,
      poster: seriesPoster,
      season: ep.season,
      episode: ep.episodeNumber ?? ep.episode,
      title: ep.title || ep.name || `Episode ${ep.episode}`,
      released: ep.released!,
      thumbnail: ep.thumbnail || ep.still,
      overview: ep.overview,
    }));
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CalendarScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const library = useLibraryStore((s) => s.library);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [episodes, setEpisodes] = useState<CalendarEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Fetch episodes for all series in library
  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      setLoading(true);
      const seriesItems = library.filter((item: any) => item.type === 'series');
      const allEps: CalendarEpisode[] = [];

      await Promise.all(
        seriesItems.map(async (item: any) => {
          try {
            const meta = await cinemetaService.getSeriesDetails(item.imdbId);
            if (!meta?.videos) return;
            const mapped = mapEpisodes(item.imdbId, meta.name || item.title, item.poster, meta.videos);
            allEps.push(...mapped);
          } catch { /* skip */ }
        }),
      );

      if (!cancelled) {
        setEpisodes(allEps);
        setLoading(false);
      }
    }
    fetch();
    return () => { cancelled = true; };
  }, [library]);

  // Group episodes by date
  const episodesByDate = useMemo(() => {
    const map = new Map<string, CalendarEpisode[]>();
    for (const ep of episodes) {
      const d = parseDate(ep.released);
      if (!d) continue;
      const key = toDateKey(d);
      const arr = map.get(key) || [];
      arr.push(ep);
      map.set(key, arr);
    }
    return map;
  }, [episodes]);

  // Calendar grid cells
  const calendarCells = useMemo(() => {
    const { year, month } = currentMonth;
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = toDateKey(new Date());

    const cells: Array<{
      day: number;
      dateKey: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      episodes: CalendarEpisode[];
      isPast: boolean;
    }> = [];

    // Previous month padding
    if (firstDay > 0) {
      const prevDays = getDaysInMonth(year, month - 1);
      for (let i = firstDay - 1; i >= 0; i--) {
        const day = prevDays - i;
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        const key = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        cells.push({ day, dateKey: key, isCurrentMonth: false, isToday: false, episodes: episodesByDate.get(key) || [], isPast: key < today });
      }
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateKey: key, isCurrentMonth: true, isToday: key === today, episodes: episodesByDate.get(key) || [], isPast: key < today });
    }

    // Next month padding
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        const key = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        cells.push({ day: d, dateKey: key, isCurrentMonth: false, isToday: false, episodes: episodesByDate.get(key) || [], isPast: key < today });
      }
    }

    return cells;
  }, [currentMonth, episodesByDate]);

  // Upcoming episodes (next 14 days)
  const upcoming = useMemo(() => {
    const today = toDateKey(new Date());
    return episodes
      .filter((ep) => {
        const d = parseDate(ep.released);
        return d && toDateKey(d) >= today;
      })
      .sort((a, b) => a.released.localeCompare(b.released))
      .slice(0, 20);
  }, [episodes]);

  const selectedEpisodes = selectedDate ? (episodesByDate.get(selectedDate) || []) : [];

  const goToPrev = useCallback(() => {
    setCurrentMonth((p) => p.month === 0 ? { year: p.year - 1, month: 11 } : { year: p.year, month: p.month - 1 });
    setSelectedDate(null);
  }, []);

  const goToNext = useCallback(() => {
    setCurrentMonth((p) => p.month === 11 ? { year: p.year + 1, month: 0 } : { year: p.year, month: p.month + 1 });
    setSelectedDate(null);
  }, []);

  const goToToday = useCallback(() => {
    const now = new Date();
    setCurrentMonth({ year: now.getFullYear(), month: now.getMonth() });
    setSelectedDate(toDateKey(now));
  }, []);

  const navigateToSeries = useCallback((ep: CalendarEpisode) => {
    navigation.navigate('Details', { type: 'series', id: ep.imdbId });
  }, [navigation]);

  // ---------- RENDER ----------

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top + 60 }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading calendar…</Text>
      </View>
    );
  }

  const seriesInLibrary = library.filter((i: any) => i.type === 'series');
  if (seriesInLibrary.length === 0) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top + 60 }]}>
        <Text style={styles.emptyIcon}>📅</Text>
        <Text style={styles.emptyTitle}>No Series in Library</Text>
        <Text style={styles.emptySub}>Add TV shows to your library to see upcoming episodes here.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
        <View style={styles.nav}>
          <TouchableOpacity style={styles.navBtn} onPress={goToPrev}>
            <Text style={styles.navBtnText}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goToToday}>
            <Text style={styles.monthLabel}>
              {MONTH_NAMES[currentMonth.month]} {currentMonth.year}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={goToNext}>
            <Text style={styles.navBtnText}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Day-of-week headers */}
      <View style={styles.dayHeaders}>
        {DAY_NAMES.map((d) => (
          <View key={d} style={styles.dayHeaderCell}>
            <Text style={styles.dayHeaderText}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.grid}>
        {calendarCells.map((cell, idx) => {
          const isSelected = selectedDate === cell.dateKey;
          const hasEps = cell.episodes.length > 0;
          return (
            <TouchableOpacity
              key={idx}
              style={[
                styles.cell,
                !cell.isCurrentMonth && styles.cellOtherMonth,
                cell.isToday && styles.cellToday,
                isSelected && styles.cellSelected,
                hasEps && styles.cellHasEpisodes,
              ]}
              activeOpacity={0.7}
              onPress={() => setSelectedDate(cell.dateKey === selectedDate ? null : cell.dateKey)}
            >
              <View style={[styles.cellDayWrap, cell.isToday && styles.cellDayToday]}>
                <Text style={[styles.cellDayText, cell.isToday && styles.cellDayTodayText]}>
                  {cell.day}
                </Text>
              </View>
              {hasEps && (
                <View style={styles.cellDots}>
                  {cell.episodes.slice(0, 3).map((ep, i) => (
                    <View key={i} style={[styles.cellDot, cell.isPast && { opacity: 0.4 }]} />
                  ))}
                  {cell.episodes.length > 3 && (
                    <Text style={styles.cellMore}>+{cell.episodes.length - 3}</Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected date detail */}
      {selectedDate && (
        <View style={styles.detailSection}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailDate}>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric',
              })}
            </Text>
            <TouchableOpacity onPress={() => setSelectedDate(null)}>
              <Text style={styles.detailClose}>✕</Text>
            </TouchableOpacity>
          </View>
          {selectedEpisodes.length === 0 ? (
            <Text style={styles.noEpsText}>No episodes on this date</Text>
          ) : (
            selectedEpisodes.map((ep, i) => (
              <TouchableOpacity
                key={`${ep.imdbId}-${ep.season}-${ep.episode}-${i}`}
                style={styles.episodeCard}
                onPress={() => navigateToSeries(ep)}
                activeOpacity={0.7}
              >
                {ep.thumbnail ? (
                  <Image source={{ uri: ep.thumbnail }} style={styles.epThumb} contentFit="cover" />
                ) : ep.poster ? (
                  <Image source={{ uri: ep.poster }} style={styles.epPoster} contentFit="cover" />
                ) : (
                  <View style={[styles.epThumb, { backgroundColor: colors.bgTertiary }]} />
                )}
                <View style={styles.epInfo}>
                  <Text style={styles.epSeries} numberOfLines={1}>{ep.seriesTitle}</Text>
                  <Text style={styles.epNumber}>S{ep.season} E{ep.episode}</Text>
                  <Text style={styles.epTitle} numberOfLines={1}>{ep.title}</Text>
                  {ep.overview ? (
                    <Text style={styles.epOverview} numberOfLines={2}>{ep.overview}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      {/* Upcoming episodes */}
      {upcoming.length > 0 && (
        <View style={styles.upcomingSection}>
          <Text style={styles.upcomingTitle}>Upcoming</Text>
          {upcoming.map((ep, i) => {
            const d = parseDate(ep.released);
            const dateLabel = d
              ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : '';
            return (
              <TouchableOpacity
                key={`${ep.imdbId}-${ep.season}-${ep.episode}-up-${i}`}
                style={styles.upcomingCard}
                onPress={() => navigateToSeries(ep)}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: ep.poster || cinemetaPoster(ep.imdbId) }}
                  style={styles.upcomingPoster}
                  contentFit="cover"
                />
                <View style={styles.upcomingInfo}>
                  <Text style={styles.upcomingSeries} numberOfLines={1}>{ep.seriesTitle}</Text>
                  <Text style={styles.upcomingEp} numberOfLines={1}>
                    S{ep.season} E{ep.episode} — {ep.title}
                  </Text>
                  <Text style={styles.upcomingDate}>{dateLabel}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    paddingHorizontal: spacing.lg,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  emptyIcon: { fontSize: 40, opacity: 0.25, marginBottom: spacing.sm },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginBottom: spacing.xs },
  emptySub: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', maxWidth: 280 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navBtnText: {
    fontSize: 22,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  monthLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    minWidth: 150,
    textAlign: 'center',
  },

  // Day headers
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  dayHeaderCell: {
    width: CELL_SIZE,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  dayHeaderText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cell: {
    width: CELL_SIZE,
    minHeight: CELL_SIZE,
    padding: spacing.xs,
    backgroundColor: colors.bgPrimary,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
  },
  cellOtherMonth: { opacity: 0.3 },
  cellToday: { backgroundColor: 'rgba(0,229,255,0.08)' },
  cellSelected: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  cellHasEpisodes: { backgroundColor: 'rgba(0,229,255,0.04)' },
  cellDayWrap: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  cellDayToday: {
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  cellDayText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  cellDayTodayText: {
    color: '#000',
    fontWeight: fontWeight.bold,
  },
  cellDots: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
    alignItems: 'center',
  },
  cellDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
  },
  cellMore: {
    fontSize: 8,
    color: colors.textMuted,
    fontWeight: fontWeight.bold,
  },

  // Detail section
  detailSection: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  detailDate: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  detailClose: {
    fontSize: 16,
    color: colors.textSecondary,
    padding: spacing.xs,
  },
  noEpsText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  episodeCard: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: spacing.sm,
  },
  epThumb: {
    width: 80,
    height: 52,
    borderRadius: borderRadius.sm,
  },
  epPoster: {
    width: 40,
    height: 58,
    borderRadius: borderRadius.sm,
  },
  epInfo: {
    flex: 1,
    gap: 2,
  },
  epSeries: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  epNumber: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  epTitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  epOverview: {
    fontSize: 10,
    color: colors.textMuted,
    lineHeight: 14,
    marginTop: 2,
  },

  // Upcoming
  upcomingSection: {
    marginTop: spacing.xxl,
  },
  upcomingTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    letterSpacing: -0.2,
  },
  upcomingCard: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: spacing.sm,
  },
  upcomingPoster: {
    width: 40,
    height: 58,
    borderRadius: borderRadius.sm,
  },
  upcomingInfo: {
    flex: 1,
    gap: 2,
  },
  upcomingSeries: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  upcomingEp: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  upcomingDate: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    marginTop: 2,
  },
});

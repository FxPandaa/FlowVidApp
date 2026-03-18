import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  AppState,
  AppStateStatus,
  Modal,
  Slider,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { skipIntroService, openSubtitlesService, cinemetaService } from '../services';
import type { SkipSegment, Subtitle } from '../services';
import { useLibraryStore, useSettingsStore, useAddonStore } from '../stores';
import type { AddonStreamResult } from '../stores';
import type { AddonStream } from '../services/addons/types';
import { parseStreamInfo } from '../utils/streamParser';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const LOCAL_SAVE_INTERVAL = 5000; // 5 seconds
const SERVER_SYNC_INTERVAL = 60000; // 60 seconds

export function PlayerScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const videoRef = useRef<Video>(null);

  const { type, id, season, episode, streamUrl: initialStreamUrl, details } = route.params || {};

  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Loading streams...');
  const [streamUrl, setStreamUrl] = useState<string | null>(initialStreamUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);

  // Stream selection
  const [addonStreams, setAddonStreams] = useState<AddonStreamResult[]>([]);
  const [pendingAddons, setPendingAddons] = useState<string[]>([]);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [selectedStream, setSelectedStream] = useState<AddonStream | null>(null);

  // Skip intro/outro state
  const [skipSegments, setSkipSegments] = useState<SkipSegment[]>([]);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipOutro, setShowSkipOutro] = useState(false);
  const activeSkipRef = useRef<SkipSegment | null>(null);
  const activeOutroRef = useRef<SkipSegment | null>(null);

  // Subtitle state
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState<Subtitle | null>(null);
  const [subtitleText, setSubtitleText] = useState('');
  const [subtitleOffset, setSubtitleOffset] = useState(0);
  const [showSubtitlePicker, setShowSubtitlePicker] = useState(false);
  const [showSubtitleOffsetSlider, setShowSubtitleOffsetSlider] = useState(false);

  // Next episode auto-play
  const [showNextEpisodePopup, setShowNextEpisodePopup] = useState(false);
  const [nextEpisodeCountdown, setNextEpisodeCountdown] = useState(10);
  const [nextEpisodeInfo, setNextEpisodeInfo] = useState<any>(null);
  const nextEpisodeDismissedRef = useRef(false);

  // Episode navigation
  const [seriesEpisodes, setSeriesEpisodes] = useState<any[]>([]);

  // Progress tracking refs
  const latestPosRef = useRef({ pos: 0, dur: 0, pct: 0 });
  const localSaveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const serverSyncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const markedFinishedRef = useRef(false);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    updateWatchProgress,
    getWatchProgress,
    removeFromHistory,
    syncToServer: syncLibraryToServer,
  } = useLibraryStore();
  const {
    autoPlay,
    autoPlayNext,
    skipIntro: skipIntroSetting,
    skipOutro: skipOutroSetting,
    subtitleAppearance,
  } = useSettingsStore();
  const { getStreamsProgressive } = useAddonStore();

  // ── Lock landscape, hide status bar ──────────────────────────────────
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    StatusBar.setHidden(true);

    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
      StatusBar.setHidden(false);
    };
  }, []);

  // ── Resolve stream from addons ───────────────────────────────────────
  useEffect(() => {
    if (initialStreamUrl) {
      setStreamUrl(initialStreamUrl);
      setIsLoading(false);
      return;
    }
    resolveStream();
  }, []);

  const resolveStream = async () => {
    setIsLoading(true);
    setError(null);
    setStreamUrl(null);

    if (!id) {
      setError('No content info available.');
      setIsLoading(false);
      return;
    }

    const contentId = type === 'series' && season && episode
      ? `${id}:${season}:${episode}`
      : id;

    setLoadingStatus('Searching addons for streams...');

    try {
      const results = await getStreamsProgressive(
        type as string,
        contentId,
        (partial, pending) => {
          setAddonStreams([...partial]);
          setPendingAddons([...pending]);
          const totalStreams = partial.reduce((s, r) => s + r.streams.length, 0);
          if (pending.length > 0) {
            setLoadingStatus(`Found ${totalStreams} stream${totalStreams !== 1 ? 's' : ''}... (${pending.length} addon${pending.length > 1 ? 's' : ''} pending)`);
          }
        },
      );

      // Pick best stream to play
      const allStreams = results.flatMap((r) =>
        r.streams.filter((s) => s.url).map((s) => ({ ...s, addonName: r.addonName }))
      );

      if (allStreams.length === 0) {
        setError('No playable streams found. Try installing more addons.');
        setIsLoading(false);
        return;
      }

      // Auto-play the first URL stream
      const firstStream = allStreams[0];
      setStreamUrl(firstStream.url!);
      setSelectedStream(firstStream);
      setIsLoading(false);
    } catch (err) {
      console.error('Stream resolve failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load streams.');
      setIsLoading(false);
    }
  };

  // ── Load subtitles ───────────────────────────────────────────────────
  useEffect(() => {
    if (!id || !streamUrl) return;
    openSubtitlesService
      .searchSubtitles({
        imdbId: id,
        season: season ? parseInt(String(season)) : undefined,
        episode: episode ? parseInt(String(episode)) : undefined,
      })
      .then((subs) => setSubtitles(subs))
      .catch(() => setSubtitles([]));
  }, [id, season, episode, streamUrl]);

  // ── Load skip segments ───────────────────────────────────────────────
  useEffect(() => {
    if (type !== 'series' || !id || !season || !episode) {
      setSkipSegments([]);
      return;
    }
    skipIntroService
      .getSkipSegments(id, parseInt(String(season)), parseInt(String(episode)))
      .then((segs) => setSkipSegments(segs))
      .catch(() => setSkipSegments([]));
  }, [id, type, season, episode]);

  // ── Load series episodes for navigation ──────────────────────────────
  useEffect(() => {
    if (type !== 'series' || !id || !season) return;
    cinemetaService
      .getSeasonEpisodes(id, parseInt(String(season)))
      .then((eps) => setSeriesEpisodes(eps))
      .catch(() => setSeriesEpisodes([]));
  }, [id, type, season]);

  // ── Skip intro/outro detection ───────────────────────────────────────
  useEffect(() => {
    if (skipSegments.length === 0) {
      setShowSkipIntro(false);
      setShowSkipOutro(false);
      return;
    }

    const intro = skipSegments.find((s) => s.type === 'intro' || s.type === 'mixed-intro');
    const outro = skipSegments.find((s) => s.type === 'outro' || s.type === 'mixed-outro' || s.type === 'ed');

    if (intro && progress >= intro.startTime && progress < intro.endTime) {
      activeSkipRef.current = intro;
      setShowSkipIntro(true);
      if (skipIntroSetting) {
        // Auto-skip if setting is enabled
        handleSkip(intro);
      }
    } else {
      activeSkipRef.current = null;
      setShowSkipIntro(false);
    }

    if (outro && progress >= outro.startTime && progress < outro.endTime) {
      activeOutroRef.current = outro;
      setShowSkipOutro(true);
      if (skipOutroSetting) {
        handleSkip(outro);
      }
    } else {
      activeOutroRef.current = null;
      setShowSkipOutro(false);
    }
  }, [progress, skipSegments]);

  // ── Progress tracking: local save every 5s ───────────────────────────
  useEffect(() => {
    localSaveIntervalRef.current = setInterval(() => {
      const { pos, dur, pct } = latestPosRef.current;
      if (dur > 0 && id && details) {
        // Save to AsyncStorage (local only)
        const key = `progress:${id}:${season || ''}:${episode || ''}`;
        AsyncStorage.setItem(key, JSON.stringify({ pos, dur, pct, ts: Date.now() })).catch(() => {});

        // Update library store (local)
        updateWatchProgress({
          imdbId: id,
          type: type || 'movie',
          title: details?.name || details?.title || '',
          poster: details?.poster,
          backdrop: details?.backdrop,
          progress: pct,
          duration: Math.round(dur),
          season: season ? parseInt(String(season)) : undefined,
          episode: episode ? parseInt(String(episode)) : undefined,
          subtitle_id: activeSubtitle?.id,
          subtitle_offset: subtitleOffset,
          stream_url: streamUrl || undefined,
        });
      }
    }, LOCAL_SAVE_INTERVAL);

    return () => {
      if (localSaveIntervalRef.current) clearInterval(localSaveIntervalRef.current);
    };
  }, [id, type, season, episode, details, activeSubtitle, subtitleOffset, streamUrl]);

  // ── Progress tracking: server sync every 60s ─────────────────────────
  useEffect(() => {
    serverSyncIntervalRef.current = setInterval(() => {
      syncLibraryToServer();
    }, SERVER_SYNC_INTERVAL);

    return () => {
      if (serverSyncIntervalRef.current) clearInterval(serverSyncIntervalRef.current);
    };
  }, []);

  // ── Sync on app background / close ───────────────────────────────────
  useEffect(() => {
    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        syncLibraryToServer();
      }
    };
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      sub.remove();
      syncLibraryToServer();
    };
  }, []);

  // ── Mark as finished at 95% + auto-play next ─────────────────────────
  const markAsFinished = useCallback(() => {
    if (markedFinishedRef.current || !details || !id) return;
    markedFinishedRef.current = true;

    updateWatchProgress({
      imdbId: id,
      type: type || 'movie',
      title: details?.name || details?.title || '',
      poster: details?.poster,
      backdrop: details?.backdrop,
      progress: 100,
      duration: Math.round(latestPosRef.current.dur || duration),
      season: season ? parseInt(String(season)) : undefined,
      episode: episode ? parseInt(String(episode)) : undefined,
    });

    // Remove from continue watching
    const existing = getWatchProgress(
      id,
      season ? parseInt(String(season)) : undefined,
      episode ? parseInt(String(episode)) : undefined,
    );
    if (existing) removeFromHistory(existing.id);

    // For series: pre-seed next episode
    if (type === 'series' && season && episode) {
      const currentEpNum = parseInt(String(episode));
      const nextEp = seriesEpisodes.find((e: any) => e.episodeNumber === currentEpNum + 1);

      if (nextEp) {
        updateWatchProgress({
          imdbId: id,
          type: 'series',
          title: details?.name || details?.title || '',
          poster: details?.poster,
          backdrop: details?.backdrop,
          progress: 0,
          duration: 0,
          season: parseInt(String(season)),
          episode: nextEp.episodeNumber,
        });

        setNextEpisodeInfo({
          season: parseInt(String(season)),
          episode: nextEp.episodeNumber,
          title: nextEp.name,
        });

        if (autoPlayNext && !nextEpisodeDismissedRef.current) {
          setShowNextEpisodePopup(true);
          setNextEpisodeCountdown(10);
        }
      }
    }

    syncLibraryToServer();
  }, [id, type, season, episode, details, seriesEpisodes, autoPlayNext, duration]);

  // ── Next episode countdown ───────────────────────────────────────────
  useEffect(() => {
    if (!showNextEpisodePopup) return;

    const timer = setInterval(() => {
      setNextEpisodeCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          playNextEpisode();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showNextEpisodePopup]);

  const playNextEpisode = () => {
    if (!nextEpisodeInfo) return;
    setShowNextEpisodePopup(false);
    navigation.replace('Player', {
      type,
      id,
      season: nextEpisodeInfo.season,
      episode: nextEpisodeInfo.episode,
      details,
    });
  };

  // ── Playback status handler ──────────────────────────────────────────
  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    setIsPlaying(status.isPlaying);
    const pos = status.positionMillis / 1000;
    const dur = (status.durationMillis || 0) / 1000;
    setProgress(pos);
    setDuration(dur);

    const pct = dur > 0 ? (pos / dur) * 100 : 0;
    latestPosRef.current = { pos, dur, pct };

    // Check for finished state
    if (pct >= 95 && !markedFinishedRef.current) {
      markAsFinished();
    }
  };

  // ── Controls ─────────────────────────────────────────────────────────
  const togglePlayPause = async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
      syncLibraryToServer(); // Sync on pause
    } else {
      await videoRef.current.playAsync();
    }
  };

  const seekRelative = async (seconds: number) => {
    if (!videoRef.current) return;
    const newPos = Math.max(0, (progress + seconds) * 1000);
    await videoRef.current.setPositionAsync(newPos);
  };

  const handleSkip = async (segment: SkipSegment) => {
    if (!videoRef.current) return;
    await videoRef.current.setPositionAsync(segment.endTime * 1000);
    setShowSkipIntro(false);
    setShowSkipOutro(false);
  };

  const handleSelectStream = (stream: AddonStream) => {
    if (stream.url) {
      setStreamUrl(stream.url);
      setSelectedStream(stream);
      setShowSourcePicker(false);
      setIsLoading(false);
      markedFinishedRef.current = false;
    }
  };

  const handleSelectSubtitle = async (subtitle: Subtitle | null) => {
    setActiveSubtitle(subtitle);
    setShowSubtitlePicker(false);
  };

  const handlePrevEpisode = () => {
    if (type !== 'series' || !season || !episode) return;
    const currentEpNum = parseInt(String(episode));
    if (currentEpNum > 1) {
      navigation.replace('Player', {
        type, id, season, episode: currentEpNum - 1, details,
      });
    }
  };

  const handleNextEpisode = () => {
    if (type !== 'series' || !season || !episode) return;
    const currentEpNum = parseInt(String(episode));
    const nextEp = seriesEpisodes.find((e: any) => e.episodeNumber === currentEpNum + 1);
    if (nextEp) {
      navigation.replace('Player', {
        type, id, season, episode: nextEp.episodeNumber, details,
      });
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Auto-hide controls
  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 4000);
  };

  const totalStreamCount = addonStreams.reduce((sum, r) => sum + r.streams.length, 0);

  // ── Render: Loading state ────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>{loadingStatus}</Text>
        {totalStreamCount > 0 && (
          <TouchableOpacity
            style={styles.pickSourceBtn}
            onPress={() => {
              setShowSourcePicker(true);
              setIsLoading(false);
            }}
          >
            <Text style={styles.pickSourceBtnText}>Pick a Stream ({totalStreamCount})</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // ── Render: Error state ──────────────────────────────────────────────
  if (error || !streamUrl) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error || 'No stream available'}</Text>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              setError(null);
              setStreamUrl(null);
              markedFinishedRef.current = false;
              resolveStream();
            }}
          >
            <Text style={styles.actionBtnText}>Retry</Text>
          </TouchableOpacity>
          {totalStreamCount > 0 && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.bgCard }]}
              onPress={() => setShowSourcePicker(true)}
            >
              <Text style={styles.actionBtnText}>Pick Stream</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.actionBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Render: Player ───────────────────────────────────────────────────
  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={1}
      onPress={resetControlsTimeout}
    >
      <Video
        ref={videoRef}
        source={{ uri: streamUrl }}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={autoPlay}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        onError={(error: string) => {
          console.error('Video playback error:', error);
          setError(`Playback failed: ${error || 'Unknown error'}. Try another source.`);
        }}
        useNativeControls={false}
      />

      {/* Subtitle Overlay */}
      {activeSubtitle && subtitleText ? (
        <View style={[styles.subtitleContainer, { bottom: `${subtitleAppearance?.bottomPosition || 10}%` }]}>
          <Text style={[
            styles.subtitleTextStyle,
            {
              fontSize: subtitleAppearance?.fontSize || 22,
              color: subtitleAppearance?.textColor || '#FFFFFF',
              backgroundColor: `rgba(0,0,0,${subtitleAppearance?.backgroundOpacity || 0.75})`,
            },
          ]}>
            {subtitleText}
          </Text>
        </View>
      ) : null}

      {/* Skip Intro button */}
      {showSkipIntro && activeSkipRef.current && (
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => handleSkip(activeSkipRef.current!)}
        >
          <Text style={styles.skipBtnText}>Skip Intro</Text>
        </TouchableOpacity>
      )}

      {/* Skip Outro button */}
      {showSkipOutro && activeOutroRef.current && (
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => handleSkip(activeOutroRef.current!)}
        >
          <Text style={styles.skipBtnText}>Skip Outro</Text>
        </TouchableOpacity>
      )}

      {/* Next Episode Popup */}
      {showNextEpisodePopup && nextEpisodeInfo && (
        <View style={styles.nextEpisodePopup}>
          <Text style={styles.nextEpisodeTitle}>Next Episode</Text>
          <Text style={styles.nextEpisodeInfo}>
            S{nextEpisodeInfo.season}E{nextEpisodeInfo.episode}: {nextEpisodeInfo.title}
          </Text>
          <View style={styles.nextEpisodeActions}>
            <TouchableOpacity style={styles.nextEpisodePlayBtn} onPress={playNextEpisode}>
              <Text style={styles.nextEpisodePlayText}>Play Now ({nextEpisodeCountdown}s)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.nextEpisodeDismissBtn}
              onPress={() => {
                setShowNextEpisodePopup(false);
                nextEpisodeDismissedRef.current = true;
              }}
            >
              <Text style={styles.nextEpisodeDismissText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Controls overlay */}
      {showControls && (
        <View style={styles.controls}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.playerTitle} numberOfLines={1}>
              {details?.title || 'Playing'}
              {season && episode ? ` · S${season}E${episode}` : ''}
            </Text>
            <View style={styles.topBarActions}>
              {/* Subtitle button */}
              <TouchableOpacity onPress={() => setShowSubtitlePicker(true)}>
                <Text style={styles.topBarIcon}>CC</Text>
              </TouchableOpacity>
              {/* Source picker button */}
              {totalStreamCount > 1 && (
                <TouchableOpacity onPress={() => setShowSourcePicker(true)}>
                  <Text style={styles.topBarIcon}>SRC</Text>
                </TouchableOpacity>
              )}
              {/* Subtitle offset */}
              {activeSubtitle && (
                <TouchableOpacity onPress={() => setShowSubtitleOffsetSlider(!showSubtitleOffsetSlider)}>
                  <Text style={styles.topBarIcon}>±</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Center controls */}
          <View style={styles.centerControls}>
            {/* Prev episode */}
            {type === 'series' && season && episode && parseInt(String(episode)) > 1 && (
              <TouchableOpacity onPress={handlePrevEpisode}>
                <Text style={styles.episodeNavText}>⏮</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => seekRelative(-10)}>
              <Text style={styles.seekText}>-10s</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={togglePlayPause} style={styles.playPauseButton}>
              <Text style={styles.playPauseText}>
                {isPlaying ? '⏸' : '▶'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => seekRelative(30)}>
              <Text style={styles.seekText}>+30s</Text>
            </TouchableOpacity>
            {/* Next episode */}
            {type === 'series' && seriesEpisodes.length > 0 && (
              <TouchableOpacity onPress={handleNextEpisode}>
                <Text style={styles.episodeNavText}>⏭</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Bottom bar */}
          <View style={styles.bottomBar}>
            <Text style={styles.timeText}>{formatTime(progress)}</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: duration > 0 ? `${(progress / duration) * 100}%` : '0%' },
                ]}
              />
            </View>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>

          {/* Stream info */}
          {selectedStream && (
            <View style={styles.streamInfoBar}>
              <Text style={styles.streamInfoText} numberOfLines={1}>
                {parseStreamInfo(selectedStream.name || selectedStream.title || '').resolutionBadge || 'Stream'}
                {selectedStream.name ? ` · ${selectedStream.name}` : ''}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Subtitle offset slider */}
      {showSubtitleOffsetSlider && (
        <View style={styles.offsetSliderContainer}>
          <Text style={styles.offsetLabel}>Subtitle Offset: {subtitleOffset > 0 ? '+' : ''}{subtitleOffset.toFixed(1)}s</Text>
          <Slider
            style={{ width: 250, height: 40 }}
            minimumValue={-10}
            maximumValue={10}
            step={0.1}
            value={subtitleOffset}
            onValueChange={(val: number) => setSubtitleOffset(val)}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor="rgba(255,255,255,0.3)"
            thumbTintColor={colors.primary}
          />
        </View>
      )}

      {/* Source Picker Modal */}
      <Modal
        visible={showSourcePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSourcePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Stream</Text>
              <TouchableOpacity onPress={() => setShowSourcePicker(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {addonStreams.map((addonResult) => (
                <View key={addonResult.addonId}>
                  <Text style={styles.addonGroupTitle}>{addonResult.addonName}</Text>
                  {addonResult.streams.filter((s) => s.url).map((stream, idx) => {
                    const info = parseStreamInfo(stream.name || stream.title || '');
                    const isSelected = selectedStream?.url === stream.url;
                    return (
                      <TouchableOpacity
                        key={`${addonResult.addonId}-${idx}`}
                        style={[styles.streamOption, isSelected && styles.streamOptionSelected]}
                        onPress={() => handleSelectStream(stream)}
                      >
                        <View style={[styles.streamBadge, { backgroundColor: getResolutionColor(info.resolutionBadge) }]}>
                          <Text style={styles.streamBadgeText}>{info.resolutionBadge || 'HD'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.streamOptionTitle} numberOfLines={1}>
                            {stream.name || stream.title || 'Stream'}
                          </Text>
                          {stream.description && (
                            <Text style={styles.streamOptionDesc} numberOfLines={1}>{stream.description}</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
              {pendingAddons.length > 0 && (
                <View style={styles.pendingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.pendingText}>Waiting for: {pendingAddons.join(', ')}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Subtitle Picker Modal */}
      <Modal
        visible={showSubtitlePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSubtitlePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Subtitles</Text>
              <TouchableOpacity onPress={() => setShowSubtitlePicker(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <TouchableOpacity
                style={[styles.subtitleOption, !activeSubtitle && styles.subtitleOptionSelected]}
                onPress={() => handleSelectSubtitle(null)}
              >
                <Text style={styles.subtitleOptionText}>Off</Text>
              </TouchableOpacity>
              {subtitles.map((sub) => (
                <TouchableOpacity
                  key={sub.id}
                  style={[styles.subtitleOption, activeSubtitle?.id === sub.id && styles.subtitleOptionSelected]}
                  onPress={() => handleSelectSubtitle(sub)}
                >
                  <Text style={styles.subtitleOptionText}>
                    {sub.language} {sub.hearingImpaired ? '(CC)' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </TouchableOpacity>
  );
}

function getResolutionColor(badge?: string): string {
  if (!badge) return 'rgba(255,255,255,0.12)';
  const b = badge.toLowerCase();
  if (b.includes('4k') || b.includes('2160')) return 'rgba(245,158,11,0.25)';
  if (b.includes('1080')) return 'rgba(34,197,94,0.2)';
  if (b.includes('720')) return 'rgba(59,130,246,0.2)';
  return 'rgba(255,255,255,0.1)';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginTop: spacing.md,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.md,
    marginBottom: spacing.lg,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  actionBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  actionBtnText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  pickSourceBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.bgCard,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickSourceBtnText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  controls: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  backIcon: {
    color: colors.white,
    fontSize: fontSize.xxl,
  },
  playerTitle: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '500',
    flex: 1,
  },
  topBarActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  topBarIcon: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '700',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  centerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xxxl,
  },
  seekText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  episodeNavText: {
    color: colors.white,
    fontSize: fontSize.xl,
  },
  playPauseButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseText: {
    color: colors.white,
    fontSize: fontSize.xxl,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  timeText: {
    color: colors.white,
    fontSize: fontSize.xs,
    minWidth: 50,
    textAlign: 'center',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  streamInfoBar: {
    position: 'absolute',
    bottom: 60,
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
  },
  streamInfoText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: fontSize.xs,
  },

  // Skip buttons
  skipBtn: {
    position: 'absolute',
    bottom: 100,
    right: 40,
    zIndex: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: borderRadius.md,
  },
  skipBtnText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },

  // Subtitle overlay
  subtitleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  subtitleTextStyle: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    textAlign: 'center',
    maxWidth: '80%',
  },

  // Subtitle offset slider
  offsetSliderContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    zIndex: 40,
  },
  offsetLabel: {
    color: colors.white,
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },

  // Next episode popup
  nextEpisodePopup: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    zIndex: 50,
    width: 280,
  },
  nextEpisodeTitle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  nextEpisodeInfo: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '500',
    marginBottom: spacing.md,
  },
  nextEpisodeActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  nextEpisodePlayBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  nextEpisodePlayText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  nextEpisodeDismissBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  nextEpisodeDismissText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.bgPrimary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  modalClose: {
    color: colors.textMuted,
    fontSize: fontSize.xl,
  },
  modalScroll: {
    padding: spacing.lg,
  },

  // Stream option
  addonGroupTitle: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  streamOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  streamOptionSelected: {
    backgroundColor: colors.primaryLight,
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
  },
  streamOptionTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  streamOptionDesc: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  pendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  pendingText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },

  // Subtitle picker
  subtitleOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  subtitleOptionSelected: {
    backgroundColor: colors.primaryLight,
  },
  subtitleOptionText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
  },
});

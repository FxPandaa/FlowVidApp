import { create } from "zustand/index";
import { persist } from "zustand/middleware.js";
import { createAsyncStorage } from "./asyncStorage";
import { API_URL } from "../config";

export type VideoQuality = "4k" | "1080p" | "720p" | "480p" | "auto";
export type Theme = "dark" | "light" | "system";
export type PlayerType = "default" | "embedded-mpv";
export type StreamSorting = "quality" | "addon";

export interface SubtitlePreferences {
  autoLoad: boolean;
  defaultLanguage: string;
  secondaryLanguages: string[];
  preferHearingImpaired: boolean;
  syncOffsets: Record<string, number>;
}

export interface SubtitleAppearance {
  fontSize: number;
  fontFamily: string;
  textColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
  textShadow: boolean;
  lineHeight: number;
  bottomPosition: number;
}

export interface SeriesSubtitlePref {
  language: string;
  hearingImpaired: boolean;
}

interface SettingsState {
  // Playback settings
  preferredQuality: VideoQuality;
  autoPlay: boolean;
  autoPlayNext: boolean;
  skipIntro: boolean;
  skipOutro: boolean;
  playerType: PlayerType;
  preferredAudioLanguage: string;
  preferredSubtitleLanguage: string;
  streamSorting: StreamSorting;

  // UI settings
  theme: Theme;
  showWatchedIndicator: boolean;
  showRatings: boolean;
  showForYou: boolean;

  // TMDB custom API key
  tmdbCustomApiKey: string;
  tmdbUseCustomKey: boolean;

  // Subtitle settings
  subtitles: SubtitlePreferences;
  subtitleAppearance: SubtitleAppearance;
  seriesSubtitleSelections: Record<string, SeriesSubtitlePref>;

  // Episode thumbnail blur
  blurUnwatchedEpisodes: boolean;

  // Actions
  setPreferredQuality: (quality: VideoQuality) => void;
  setAutoPlay: (enabled: boolean) => void;
  setAutoPlayNext: (enabled: boolean) => void;
  setSkipIntro: (enabled: boolean) => void;
  setSkipOutro: (enabled: boolean) => void;
  setPlayerType: (playerType: PlayerType) => void;
  setPreferredAudioLanguage: (lang: string) => void;
  setPreferredSubtitleLanguage: (lang: string) => void;
  setStreamSorting: (sorting: StreamSorting) => void;
  setTheme: (theme: Theme) => void;
  setShowWatchedIndicator: (show: boolean) => void;
  setShowRatings: (show: boolean) => void;
  setShowForYou: (show: boolean) => void;
  setTmdbCustomApiKey: (key: string) => void;
  setTmdbUseCustomKey: (enabled: boolean) => void;
  setBlurUnwatchedEpisodes: (enabled: boolean) => void;
  resetSettings: () => void;

  // Subtitle actions
  setSubtitleAutoLoad: (enabled: boolean) => void;
  setSubtitleLanguage: (language: string) => void;
  setSecondaryLanguages: (languages: string[]) => void;
  setPreferHearingImpaired: (enabled: boolean) => void;
  setSyncOffset: (videoId: string, offset: number) => void;
  getSyncOffset: (videoId: string) => number;
  setSubtitleAppearance: (appearance: Partial<SubtitleAppearance>) => void;
  setSeriesSubtitleSelection: (seriesId: string, pref: SeriesSubtitlePref) => void;

  // Sync
  syncWithServer: () => Promise<void>;
  loadFromServer: () => Promise<void>;
}

const defaultSubtitleAppearance: SubtitleAppearance = {
  fontSize: 28,
  fontFamily: "sans-serif",
  textColor: "#FFFFFF",
  backgroundColor: "#000000",
  backgroundOpacity: 0.6,
  textShadow: true,
  lineHeight: 1.5,
  bottomPosition: 8,
};

const defaultSettings = {
  preferredQuality: "1080p" as VideoQuality,
  autoPlay: true,
  autoPlayNext: true,
  skipIntro: false,
  skipOutro: false,
  playerType: "default" as PlayerType,
  preferredAudioLanguage: "eng",
  preferredSubtitleLanguage: "eng",
  streamSorting: "quality" as StreamSorting,
  theme: "dark" as Theme,
  showWatchedIndicator: true,
  showRatings: true,
  showForYou: true,
  tmdbCustomApiKey: "",
  tmdbUseCustomKey: false,
  subtitles: {
    autoLoad: true,
    defaultLanguage: "eng",
    secondaryLanguages: ["nld"],
    preferHearingImpaired: false,
    syncOffsets: {},
  },
  blurUnwatchedEpisodes: true,
  subtitleAppearance: defaultSubtitleAppearance,
  seriesSubtitleSelections: {} as Record<string, SeriesSubtitlePref>,
};

let syncTimeout: ReturnType<typeof setTimeout> | null = null;
const debouncedSync = (syncFn: () => Promise<void>) => {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    syncFn();
  }, 2000);
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...defaultSettings,

      setPreferredQuality: (quality: VideoQuality) => {
        set({ preferredQuality: quality });
        debouncedSync(() => get().syncWithServer());
      },

      setAutoPlay: (enabled: boolean) => {
        set({ autoPlay: enabled });
        debouncedSync(() => get().syncWithServer());
      },

      setAutoPlayNext: (enabled: boolean) => {
        set({ autoPlayNext: enabled });
        debouncedSync(() => get().syncWithServer());
      },

      setSkipIntro: (enabled: boolean) => {
        set({ skipIntro: enabled });
        debouncedSync(() => get().syncWithServer());
      },

      setSkipOutro: (enabled: boolean) => {
        set({ skipOutro: enabled });
        debouncedSync(() => get().syncWithServer());
      },

      setPlayerType: (playerType: PlayerType) => {
        set({ playerType });
      },

      setPreferredAudioLanguage: (lang: string) => {
        set({ preferredAudioLanguage: lang });
        debouncedSync(() => get().syncWithServer());
      },

      setPreferredSubtitleLanguage: (lang: string) => {
        set({ preferredSubtitleLanguage: lang });
        debouncedSync(() => get().syncWithServer());
      },

      setStreamSorting: (sorting: StreamSorting) => {
        set({ streamSorting: sorting });
        debouncedSync(() => get().syncWithServer());
      },

      setTheme: (theme: Theme) => {
        set({ theme });
      },

      setShowWatchedIndicator: (show: boolean) => {
        set({ showWatchedIndicator: show });
      },

      setShowRatings: (show: boolean) => {
        set({ showRatings: show });
      },

      setShowForYou: (show: boolean) => {
        set({ showForYou: show });
        debouncedSync(() => get().syncWithServer());
      },

      setTmdbCustomApiKey: (key: string) => {
        set({ tmdbCustomApiKey: key });
      },

      setTmdbUseCustomKey: (enabled: boolean) => {
        set({ tmdbUseCustomKey: enabled });
      },

      setBlurUnwatchedEpisodes: (enabled: boolean) => {
        set({ blurUnwatchedEpisodes: enabled });
        debouncedSync(() => get().syncWithServer());
      },

      resetSettings: () => {
        set(defaultSettings);
        debouncedSync(() => get().syncWithServer());
      },

      // Subtitle actions
      setSubtitleAutoLoad: (enabled: boolean) =>
        set((state) => ({
          subtitles: { ...state.subtitles, autoLoad: enabled },
        })),

      setSubtitleLanguage: (language: string) =>
        set((state) => ({
          subtitles: { ...state.subtitles, defaultLanguage: language },
        })),

      setSecondaryLanguages: (languages: string[]) =>
        set((state) => ({
          subtitles: { ...state.subtitles, secondaryLanguages: languages },
        })),

      setPreferHearingImpaired: (enabled: boolean) =>
        set((state) => ({
          subtitles: { ...state.subtitles, preferHearingImpaired: enabled },
        })),

      setSyncOffset: (videoId: string, offset: number) =>
        set((state) => ({
          subtitles: {
            ...state.subtitles,
            syncOffsets: { ...state.subtitles.syncOffsets, [videoId]: offset },
          },
        })),

      getSyncOffset: (videoId: string) => {
        return get().subtitles.syncOffsets[videoId] || 0;
      },

      setSubtitleAppearance: (appearance: Partial<SubtitleAppearance>) =>
        set((state) => ({
          subtitleAppearance: { ...state.subtitleAppearance, ...appearance },
        })),

      setSeriesSubtitleSelection: (seriesId: string, pref: SeriesSubtitlePref) =>
        set((state) => ({
          seriesSubtitleSelections: {
            ...state.seriesSubtitleSelections,
            [seriesId]: pref,
          },
        })),

      // Sync settings with server
      syncWithServer: async () => {
        const { useAuthStore } = await import("./authStore");
        const { useProfileStore } = await import("./profileStore");
        const authState = useAuthStore.getState();
        if (!authState.isAuthenticated || !authState.token) return;

        const state = get();
        const profileId = useProfileStore.getState().activeProfileId;
        try {
          await fetch(`${API_URL}/sync/settings`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authState.token}`,
            },
            body: JSON.stringify({
              profileId,
              settings: {
                preferredQuality: state.preferredQuality,
                autoPlay: state.autoPlay,
                autoPlayNext: state.autoPlayNext,
                skipIntro: state.skipIntro,
                skipOutro: state.skipOutro,
                streamSorting: state.streamSorting,
                theme: state.theme,
                showWatchedIndicator: state.showWatchedIndicator,
                showRatings: state.showRatings,
                showForYou: state.showForYou,
                preferredAudioLanguage: state.preferredAudioLanguage,
                preferredSubtitleLanguage: state.preferredSubtitleLanguage,
                subtitles: state.subtitles,
                blurUnwatchedEpisodes: state.blurUnwatchedEpisodes,
                subtitleAppearance: state.subtitleAppearance,
                seriesSubtitleSelections: state.seriesSubtitleSelections,
              },
            }),
          });
        } catch (error) {
          console.error("Failed to sync settings with server:", error);
        }
      },

      loadFromServer: async () => {
        const { useAuthStore } = await import("./authStore");
        const { useProfileStore } = await import("./profileStore");
        const authState = useAuthStore.getState();
        if (!authState.isAuthenticated || !authState.token) return;

        const profileId = useProfileStore.getState().activeProfileId;
        const profileQuery = profileId
          ? `?profileId=${encodeURIComponent(profileId)}`
          : "";
        try {
          const res = await fetch(`${API_URL}/sync/settings${profileQuery}`, {
            headers: {
              Authorization: `Bearer ${authState.token}`,
            },
          });

          if (res.ok) {
            const { settings } = await res.json();
            if (settings && Object.keys(settings).length > 0) {
              set(settings);
            }
          }
        } catch (error) {
          console.error("Failed to load settings from server:", error);
        }
      },
    }),
    {
      name: "FlowVid-settings",
      storage: createAsyncStorage(),
    },
  ),
);

/**
 * Skip Intro / Outro service.
 *
 * Uses the IntroHater API as the primary source:
 *   https://introhater.com/api.html
 *
 * Returns skip segments (intro/outro/recap) with start & end timestamps.
 */

const INTROHATER_BASE = 'https://api.introhater.com';

/** Tracks whether the IntroHater API is reachable this session. */
let apiAvailable = true;
let lastAvailabilityCheck = 0;
const AVAILABILITY_RETRY_MS = 5 * 60 * 1000;

export interface SkipSegment {
  type: 'intro' | 'outro' | 'recap' | 'mixed-intro' | 'mixed-outro';
  startTime: number;
  endTime: number;
  source: 'introhater' | 'aniskip';
}

interface IntroHaterResponse {
  found: boolean;
  results?: IntroHaterSegment[];
}

interface IntroHaterSegment {
  start: number;
  end: number;
  type: string;
}

class SkipIntroService {
  private cache = new Map<string, { data: SkipSegment[]; ts: number }>();
  private static CACHE_TTL = 12 * 60 * 60 * 1000;

  async getSkipSegments(
    imdbId: string,
    season: number,
    episode: number,
    _episodeLength?: number,
  ): Promise<SkipSegment[]> {
    const key = `${imdbId}:${season}:${episode}`;

    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.ts < SkipIntroService.CACHE_TTL) {
      return cached.data;
    }

    try {
      // If the API was unreachable, skip network calls until retry window
      if (!apiAvailable && Date.now() - lastAvailabilityCheck < AVAILABILITY_RETRY_MS) {
        return [];
      }

      const segments = await this.fetchFromIntroHater(imdbId, season, episode);
      apiAvailable = true;

      this.cache.set(key, { data: segments, ts: Date.now() });
      return segments;
    } catch {
      return [];
    }
  }

  async hasIntro(
    imdbId: string,
    season: number,
    episode: number,
  ): Promise<boolean> {
    const segments = await this.getSkipSegments(imdbId, season, episode);
    return segments.some((s) => s.type === 'intro');
  }

  async getIntro(
    imdbId: string,
    season: number,
    episode: number,
  ): Promise<SkipSegment | null> {
    const segments = await this.getSkipSegments(imdbId, season, episode);
    return segments.find((s) => s.type === 'intro') || null;
  }

  private async fetchFromIntroHater(
    imdbId: string,
    season: number,
    episode: number,
  ): Promise<SkipSegment[]> {
    const videoId = `${imdbId}:${season}:${episode}`;
    const url = `${INTROHATER_BASE}/v1/timestamps/${encodeURIComponent(videoId)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) return [];

      const data: IntroHaterResponse = await res.json();
      if (!data.found || !data.results) return [];

      return data.results
        .filter((s) => s.start != null && s.end != null && s.end > s.start)
        .map((s) => ({
          type: this.normalizeType(s.type),
          startTime: s.start,
          endTime: s.end,
          source: 'introhater' as const,
        }));
    } catch {
      clearTimeout(timeout);
      apiAvailable = false;
      lastAvailabilityCheck = Date.now();
      return [];
    }
  }

  private normalizeType(raw: string): SkipSegment['type'] {
    const lower = raw.toLowerCase();
    if (lower.includes('intro') || lower === 'op') return 'intro';
    if (lower.includes('outro') || lower === 'ed') return 'outro';
    if (lower.includes('recap')) return 'recap';
    if (lower.includes('mixed') && lower.includes('intro'))
      return 'mixed-intro';
    if (lower.includes('mixed') && lower.includes('outro'))
      return 'mixed-outro';
    return 'intro';
  }
}

export const skipIntroService = new SkipIntroService();

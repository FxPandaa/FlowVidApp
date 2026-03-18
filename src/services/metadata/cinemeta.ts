const CINEMETA_BASE_URL = "https://v3-cinemeta.strem.io";

interface CinemetaRawMeta {
  id: string;
  type: "movie" | "series";
  name: string;
  year?: number;
  releaseInfo?: string;
  description?: string;
  poster?: string;
  background?: string;
  logo?: string;
  runtime?: string;
  genres?: string[];
  director?: string[];
  cast?: string[];
  imdbRating?: string;
  popularity?: number;
  slug?: string;
  videos?: CinemetaRawEpisode[];
  writer?: string[];
  awards?: string;
  country?: string;
  language?: string;
}

interface CinemetaRawEpisode {
  id: string;
  title?: string;
  name?: string;
  season: number;
  episode: number;
  released?: string;
  overview?: string;
  thumbnail?: string;
}

export interface MediaItem {
  id: string;
  imdbId: string;
  type: "movie" | "series";
  name: string;
  title: string;
  year?: number;
  releaseInfo?: string;
  description?: string;
  overview?: string;
  poster?: string;
  background?: string;
  backdrop?: string;
  logo?: string;
  runtime?: string;
  genres?: string[];
  director?: string[];
  cast?: string[];
  imdbRating?: string;
  rating: number;
  popularity?: number;
  slug?: string;
}

export interface MovieDetails extends MediaItem {
  type: "movie";
  writer?: string[];
  awards?: string;
  country?: string;
  language?: string;
}

export interface SeriesDetails extends MediaItem {
  type: "series";
  videos?: Episode[];
  seasons?: { seasonNumber: number; id: string }[];
  numberOfSeasons?: number;
}

export interface Episode {
  id: string;
  title: string;
  name: string;
  season: number;
  episode: number;
  episodeNumber: number;
  released?: string;
  overview?: string;
  thumbnail?: string;
  still?: string;
}

interface CatalogResponse {
  metas: CinemetaRawMeta[];
}

function normalizeMediaItem(raw: CinemetaRawMeta): MediaItem {
  return { ...raw, imdbId: raw.id, title: raw.name, overview: raw.description, backdrop: raw.background, rating: raw.imdbRating ? parseFloat(raw.imdbRating) : 0 };
}

function normalizeMovieDetails(raw: CinemetaRawMeta): MovieDetails {
  return { ...normalizeMediaItem(raw), type: "movie", writer: raw.writer, awards: raw.awards, country: raw.country, language: raw.language };
}

function normalizeSeriesDetails(raw: CinemetaRawMeta): SeriesDetails {
  const videos = raw.videos?.map(normalizeEpisode) || [];
  const seasonNumbers = [...new Set(videos.map((v) => v.season).filter((s) => s > 0))].sort((a, b) => a - b);
  return { ...normalizeMediaItem(raw), type: "series", videos, seasons: seasonNumbers.map((num) => ({ seasonNumber: num, id: `${raw.id}:${num}` })), numberOfSeasons: seasonNumbers.length };
}

function normalizeEpisode(raw: CinemetaRawEpisode): Episode {
  const episodeName = raw.name || raw.title || `Episode ${raw.episode}`;
  return { ...raw, title: episodeName, name: episodeName, episodeNumber: raw.episode, still: raw.thumbnail };
}

class CinemetaService {
  private async request<T>(endpoint: string): Promise<T> {
    const url = `${CINEMETA_BASE_URL}${endpoint}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Cinemeta API error: ${response.status}`);
    return response.json();
  }

  async getDetails(type: "movie" | "series", imdbId: string): Promise<MovieDetails | SeriesDetails> {
    const data = await this.request<{ meta: CinemetaRawMeta }>(`/meta/${type}/${imdbId}.json`);
    if (type === "movie") return normalizeMovieDetails(data.meta);
    return normalizeSeriesDetails(data.meta);
  }

  async getMovieDetails(imdbId: string): Promise<MovieDetails> { return this.getDetails("movie", imdbId) as Promise<MovieDetails>; }
  async getSeriesDetails(imdbId: string): Promise<SeriesDetails> { return this.getDetails("series", imdbId) as Promise<SeriesDetails>; }

  async getCatalog(type: "movie" | "series", catalog: "top" | "year" | "imdbRating" = "top", skip: number = 0): Promise<MediaItem[]> {
    try {
      const data = await this.request<CatalogResponse>(`/catalog/${type}/${catalog}/skip=${skip}.json`);
      return (data.metas || []).map((meta) => normalizeMediaItem({ ...meta, type }));
    } catch { return []; }
  }

  async getPopularMovies(skip: number = 0): Promise<MediaItem[]> { return this.getCatalog("movie", "top", skip); }
  async getPopularSeries(skip: number = 0): Promise<MediaItem[]> { return this.getCatalog("series", "top", skip); }
  async getTopRatedMovies(skip: number = 0): Promise<MediaItem[]> { return this.getCatalog("movie", "imdbRating", skip); }
  async getTopRatedSeries(skip: number = 0): Promise<MediaItem[]> { return this.getCatalog("series", "imdbRating", skip); }

  async search(query: string, type?: "movie" | "series"): Promise<{ results: MediaItem[] }> {
    const searchTypes = type ? [type] : (["movie", "series"] as const);
    const results: MediaItem[] = [];
    for (const t of searchTypes) {
      try {
        const data = await this.request<CatalogResponse>(`/catalog/${t}/top/search=${encodeURIComponent(query)}.json`);
        if (data.metas) results.push(...data.metas.map((meta) => normalizeMediaItem({ ...meta, type: t })));
      } catch {}
    }
    return { results };
  }

  async getSeasonEpisodes(imdbId: string, seasonNumber: number): Promise<Episode[]> {
    const series = await this.getSeriesDetails(imdbId);
    if (!series.videos) return [];
    return series.videos.filter((video) => video.season === seasonNumber).sort((a, b) => a.episodeNumber - b.episodeNumber);
  }

  getSeasons(seriesDetails: SeriesDetails): number[] {
    if (!seriesDetails.videos) return [];
    const seasons = new Set(seriesDetails.videos.map((v) => v.season).filter((s) => s > 0));
    return Array.from(seasons).sort((a, b) => a - b);
  }

  async findByImdbId(imdbId: string): Promise<MediaItem | null> {
    try { const movie = await this.getMovieDetails(imdbId); if (movie) return movie; } catch {}
    try { const series = await this.getSeriesDetails(imdbId); if (series) return series; } catch {}
    return null;
  }
}

export const cinemetaService = new CinemetaService();

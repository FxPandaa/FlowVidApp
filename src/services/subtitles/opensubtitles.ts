const STREMIO_SUBS_API = "https://opensubtitles-v3.strem.io/subtitles";

export interface Subtitle {
  id: string;
  language: string;
  languageCode: string;
  fileName: string;
  downloadUrl: string;
  format: string;
  rating: number;
  downloads: number;
  hearing_impaired: boolean;
  foreignPartsOnly: boolean;
}

export interface SubtitleSearchParams {
  imdbId: string;
  season?: number;
  episode?: number;
  languages?: string[];
}

const LANGUAGE_NAMES: Record<string, string> = {
  eng: "English", nld: "Dutch", dut: "Dutch", spa: "Spanish", fra: "French", fre: "French",
  deu: "German", ger: "German", ita: "Italian", por: "Portuguese", rus: "Russian",
  jpn: "Japanese", kor: "Korean", zho: "Chinese", chi: "Chinese", ara: "Arabic",
  hin: "Hindi", tur: "Turkish", pol: "Polish", swe: "Swedish", nor: "Norwegian",
  dan: "Danish", fin: "Finnish", hun: "Hungarian", ces: "Czech", cze: "Czech",
  ron: "Romanian", rum: "Romanian", ell: "Greek", gre: "Greek", heb: "Hebrew",
  tha: "Thai", vie: "Vietnamese", ind: "Indonesian",
};

class OpenSubtitlesService {
  async search(params: SubtitleSearchParams): Promise<Subtitle[]> {
    const results: Subtitle[] = [];
    const imdbId = params.imdbId.startsWith("tt") ? params.imdbId : `tt${params.imdbId}`;
    let url: string;
    if (params.season !== undefined && params.episode !== undefined) {
      url = `${STREMIO_SUBS_API}/series/${imdbId}:${params.season}:${params.episode}.json`;
    } else {
      url = `${STREMIO_SUBS_API}/movie/${imdbId}.json`;
    }
    try {
      const response = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
      if (!response.ok) return results;
      const data = await response.json();
      const subtitles = data.subtitles || [];
      const preferredLanguages = params.languages || ["eng"];
      for (const sub of subtitles) {
        const langCode = sub.lang || "";
        const isPreferred = preferredLanguages.some((pref) => langCode.toLowerCase() === pref.toLowerCase() || langCode.toLowerCase().startsWith(pref.toLowerCase().slice(0, 2)));
        results.push({ id: sub.id || `stremio-${Date.now()}-${Math.random()}`, language: LANGUAGE_NAMES[langCode] || langCode, languageCode: langCode, fileName: `subtitle-${sub.id}.srt`, downloadUrl: sub.url || "", format: "srt", rating: isPreferred ? 10 : 5, downloads: 0, hearing_impaired: sub.m === "h" || false, foreignPartsOnly: false });
      }
      results.sort((a, b) => {
        const aPreferred = preferredLanguages.includes(a.languageCode);
        const bPreferred = preferredLanguages.includes(b.languageCode);
        if (aPreferred && !bPreferred) return -1;
        if (!aPreferred && bPreferred) return 1;
        return a.language.localeCompare(b.language);
      });
    } catch (error) { console.error("Error searching subtitles:", error); }
    return results;
  }

  async download(subtitle: Subtitle): Promise<string> {
    try {
      const response = await fetch(subtitle.downloadUrl, { method: "GET", headers: { Accept: "text/plain, text/vtt, application/x-subrip, */*" } });
      if (!response.ok) throw new Error(`Failed to download subtitle: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      try {
        const decompressed = await this.decompressGzip(arrayBuffer);
        return decompressed;
      } catch {
        const decoder = new TextDecoder("utf-8");
        return decoder.decode(arrayBuffer);
      }
    } catch (error) { console.error("Failed to download subtitle:", error); throw error; }
  }

  private async decompressGzip(data: ArrayBuffer): Promise<string> {
    const header = new Uint8Array(data.slice(0, 2));
    if (header[0] !== 0x1f || header[1] !== 0x8b) throw new Error("Not gzip data");
    const stream = new DecompressionStream("gzip");
    const writer = stream.writable.getWriter();
    writer.write(data);
    writer.close();
    const reader = stream.readable.getReader();
    const chunks: Uint8Array[] = [];
    while (true) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); }
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
    return new TextDecoder("utf-8").decode(result);
  }
}

export const openSubtitlesService = new OpenSubtitlesService();

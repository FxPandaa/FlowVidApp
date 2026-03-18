/**
 * useValidatedImage — React Native version
 *
 * Validates image URLs by attempting to prefetch them.
 * Returns the URL if valid, or null if it fails.
 * Uses a module-level cache to avoid repeated checks.
 */

import { useState, useEffect } from "react";
import { Image as RNImage } from "react-native";

const cache = new Map<string, string | null>();

export function useValidatedImage(url: string | undefined | null): string | null {
  const [validUrl, setValidUrl] = useState<string | null>(() => {
    if (!url) return null;
    const cached = cache.get(url);
    return cached !== undefined ? cached : null;
  });

  useEffect(() => {
    if (!url) {
      setValidUrl(null);
      return;
    }

    // Check cache first
    const cached = cache.get(url);
    if (cached !== undefined) {
      setValidUrl(cached);
      return;
    }

    let cancelled = false;

    // Validate by prefetching the image
    RNImage.prefetch(url)
      .then(() => {
        cache.set(url, url);
        if (!cancelled) setValidUrl(url);
      })
      .catch(() => {
        cache.set(url, null);
        if (!cancelled) setValidUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return validUrl;
}

"use client";

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { SearchMatchResponse } from '@/types';

export const SEARCH_DEBOUNCE_MS = 250;
export const MIN_SEARCH_QUERY_LENGTH = 2;

interface SearchResult {
  query: string;
  matches: SearchMatchResponse[];
}

const EMPTY_MATCHES: SearchMatchResponse[] = [];

/**
 * Debounced type-ahead against the backend /search resolver. Returns the
 * matches for the current query only — results that answered a previous
 * query are never surfaced. Lookup failures resolve to no matches: for
 * type-ahead that is the normal outcome of most keystrokes, not an error
 * worth surfacing.
 */
export default function useSearchMatches(
  query: string,
  network?: string,
  enabled = true
): SearchMatchResponse[] {
  const [result, setResult] = useState<SearchResult>({ query: '', matches: EMPTY_MATCHES });
  const requestIdRef = useRef(0);

  const trimmed = query.trim();
  const active = enabled && trimmed.length >= MIN_SEARCH_QUERY_LENGTH;

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    if (!active) return;

    const timeout = setTimeout(async () => {
      let matches = EMPTY_MATCHES;
      try {
        matches = await api.search(trimmed, network);
      } catch {
        matches = EMPTY_MATCHES;
      }
      if (requestIdRef.current === requestId) {
        setResult({ query: trimmed, matches });
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [active, trimmed, network]);

  return active && result.query === trimmed ? result.matches : EMPTY_MATCHES;
}

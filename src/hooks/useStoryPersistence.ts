import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SeenProgress, StorageAdapter } from '../types';
import { createMemoryStorage } from '../storage/memoryAdapter';

const STORAGE_KEY = '@novev9/react-native-instagram-stories/seen-progress';

interface Args {
  enabled: boolean;
  storage?: StorageAdapter;
}

/**
 * Persisted "seen" map: userId → last viewed slideId.
 *
 * Hydrates once on mount from the configured storage adapter and
 * writes back on every update. Writes are fire-and-forget — the worst
 * case on crash mid-write is that one slide is re-shown next session.
 */
export function useStoryPersistence({ enabled, storage }: Args) {
  const adapter = useMemo<StorageAdapter>(
    () => storage ?? createMemoryStorage(),
    [storage]
  );
  const [seen, setSeen] = useState<SeenProgress>({});

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    Promise.resolve(adapter.getItem(STORAGE_KEY))
      .then(raw => {
        if (cancelled || !raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') setSeen(parsed);
        } catch {
          // Corrupt blob — ignore, start fresh.
        }
      })
      .catch(() => {
        // Storage read failed — accept "no progress" silently.
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, adapter]);

  const markSeen = useCallback(
    (userId: string, slideId: string) => {
      setSeen(prev => {
        if (prev[userId] === slideId) return prev;
        const next = { ...prev, [userId]: slideId };
        if (enabled) {
          Promise.resolve(adapter.setItem(STORAGE_KEY, JSON.stringify(next)))
            .catch(() => {
              // Storage write failed — visible only as a re-show next launch.
            });
        }
        return next;
      });
    },
    [enabled, adapter]
  );

  return { seen, markSeen };
}

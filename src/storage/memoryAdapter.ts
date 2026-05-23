import type { StorageAdapter } from '../types';

/**
 * In-memory storage adapter. Used as the default when the consumer
 * doesn't pass a `storage` prop. Progress is lost on unmount —
 * suitable for development / tests / cases where persistence is
 * intentionally off.
 *
 * For real persistence install `@react-native-async-storage/async-storage`
 * and import `createAsyncStorageAdapter` from
 * `@novev9/react-native-instagram-stories/async-storage`.
 */
export function createMemoryStorage(): StorageAdapter {
  const store = new Map<string, string>();
  return {
    getItem(key) {
      return store.get(key) ?? null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
  };
}

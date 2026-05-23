import type { StorageAdapter } from '../types';

/**
 * Adapter that backs the story progress map with
 * `@react-native-async-storage/async-storage`. Optional — the main
 * library entry point does NOT depend on AsyncStorage, so importing
 * this file only works if you've installed it as a peer dep.
 *
 * @example
 *   import AsyncStorage from '@react-native-async-storage/async-storage';
 *   import { createAsyncStorageAdapter } from '@novev9/react-native-instagram-stories/async-storage';
 *
 *   <Stories storage={createAsyncStorageAdapter(AsyncStorage)} ... />
 */
export interface AsyncStorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export function createAsyncStorageAdapter(
  asyncStorage: AsyncStorageLike
): StorageAdapter {
  return {
    getItem: key => asyncStorage.getItem(key),
    setItem: (key, value) => asyncStorage.setItem(key, value),
  };
}

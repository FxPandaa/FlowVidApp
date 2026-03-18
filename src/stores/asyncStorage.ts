import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware.js';

/**
 * Creates a Zustand-compatible storage adapter backed by AsyncStorage.
 * Used as a drop-in replacement for `createJSONStorage(() => localStorage)`
 */
export function createAsyncStorage() {
  return createJSONStorage(() => ({
    getItem: async (name: string) => {
      const value = await AsyncStorage.getItem(name);
      return value ?? null;
    },
    setItem: async (name: string, value: string) => {
      await AsyncStorage.setItem(name, value);
    },
    removeItem: async (name: string) => {
      await AsyncStorage.removeItem(name);
    },
  }));
}

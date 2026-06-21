/**
 * Vitest Setup File
 * إعدادات الاختبارات
 */

import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables
process.env.NODE_ENV = 'test';
vi.stubEnv('VITE_ENABLE_CLOUD_SYNC', 'true');
vi.stubEnv('VITE_SHELL_AUTH_OPEN', 'false');

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

global.localStorage = localStorageMock as any;

// Mock Supabase info (for testing)
vi.mock('@/utils/supabase/info', () => ({
  projectId: 'test-project-id',
  publicAnonKey: 'test-anon-key'
}));

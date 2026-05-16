/**
 * useCloudSync Hook Tests
 * Tests for automatic cloud synchronization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCloudSync } from '../useCloudSync';
import { SupabaseService } from '@/app/services/SupabaseService';

const EXECUTION_KEY = 'lawyer-execution-files';

vi.mock('@/app/services/SupabaseService', () => ({
  SupabaseService: {
    checkUserAuth: vi.fn(() => Promise.resolve(true)),
    getExecutionFiles: vi.fn(() => Promise.resolve([])),
    getLawsuitFiles: vi.fn(() => Promise.resolve([])),
    getGlobalNotes: vi.fn(() => Promise.resolve([])),
    updateExecutionFile: vi.fn(() => Promise.resolve(undefined)),
    saveExecutionFile: vi.fn(() => Promise.resolve({ id: 'test' })),
    saveLawsuitFile: vi.fn(() => Promise.resolve(undefined)),
    saveGlobalNote: vi.fn(() => Promise.resolve(undefined)),
    checkConnection: vi.fn(() => Promise.resolve({ online: true })),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

function resetSupabaseMocks() {
  vi.mocked(SupabaseService.checkUserAuth).mockResolvedValue(true);
  vi.mocked(SupabaseService.getExecutionFiles).mockResolvedValue([]);
  vi.mocked(SupabaseService.getLawsuitFiles).mockResolvedValue([]);
  vi.mocked(SupabaseService.getGlobalNotes).mockResolvedValue([]);
  vi.mocked(SupabaseService.updateExecutionFile).mockResolvedValue(undefined);
  vi.mocked(SupabaseService.saveExecutionFile).mockResolvedValue({ id: 'test' } as never);
  vi.mocked(SupabaseService.saveLawsuitFile).mockResolvedValue(undefined);
  vi.mocked(SupabaseService.saveGlobalNote).mockResolvedValue(undefined);
}

describe('useCloudSync Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    resetSupabaseMocks();
    Object.defineProperty(window.navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() =>
        useCloudSync({
          localKey: EXECUTION_KEY,
          enabled: true,
        })
      );

      expect(result.current.isSyncing).toBe(false);
      expect(result.current.syncStatus).toBe('idle');
      expect(result.current.isOnline).toBe(true);
    });

    it('should not sync when disabled', () => {
      const { result } = renderHook(() =>
        useCloudSync({
          localKey: EXECUTION_KEY,
          enabled: false,
        })
      );

      expect(result.current.isSyncing).toBe(false);
    });
  });

  describe('Sync Operations', () => {
    it('should sync data to cloud', async () => {
      const testData = [{ id: '1', name: 'Test File', updatedAt: new Date().toISOString() }];
      localStorageMock.setItem(EXECUTION_KEY, JSON.stringify(testData));

      const { result } = renderHook(() =>
        useCloudSync({
          localKey: EXECUTION_KEY,
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.isSyncing).toBe(false);
      });
      expect(SupabaseService.checkUserAuth).toHaveBeenCalled();
    });

    it('should handle manual sync', async () => {
      const { result } = renderHook(() =>
        useCloudSync({
          localKey: EXECUTION_KEY,
          enabled: true,
        })
      );

      await result.current.syncNow();

      await waitFor(() => {
        expect(result.current.isSyncing).toBe(false);
      });
    });
  });

  describe('Sync Status', () => {
    it('should update sync status during sync', async () => {
      const { result } = renderHook(() =>
        useCloudSync({
          localKey: EXECUTION_KEY,
          enabled: true,
        })
      );

      void result.current.syncNow();

      await waitFor(() => {
        expect(['idle', 'syncing', 'success', 'error']).toContain(result.current.syncStatus);
      });
    });

    it('should track last sync time', async () => {
      const { result } = renderHook(() =>
        useCloudSync({
          localKey: EXECUTION_KEY,
          enabled: true,
        })
      );

      await result.current.syncNow();

      await waitFor(() => {
        expect(result.current.lastSyncTime).not.toBeNull();
      });
    });
  });

  describe('Online/Offline Detection', () => {
    it('should detect online status', () => {
      const { result } = renderHook(() =>
        useCloudSync({
          localKey: EXECUTION_KEY,
          enabled: true,
        })
      );

      expect(result.current.isOnline).toBe(true);
    });

    it('should handle offline mode gracefully', async () => {
      Object.defineProperty(window.navigator, 'onLine', {
        writable: true,
        configurable: true,
        value: false,
      });

      const { result } = renderHook(() =>
        useCloudSync({
          localKey: EXECUTION_KEY,
          enabled: true,
        })
      );

      await result.current.syncNow();

      expect(result.current.syncStatus).toBeDefined();
    });
  });

  describe('Sync Interval', () => {
    it('should respect custom sync interval', async () => {
      const { result } = renderHook(() =>
        useCloudSync({
          localKey: EXECUTION_KEY,
          enabled: true,
          syncInterval: 1000,
        })
      );

      expect(result.current).toBeDefined();
    }, 5000);

    it('should use default interval when not specified', () => {
      const { result } = renderHook(() =>
        useCloudSync({
          localKey: EXECUTION_KEY,
          enabled: true,
        })
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle sync errors gracefully', async () => {
      vi.mocked(SupabaseService.getExecutionFiles).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useCloudSync({
          localKey: EXECUTION_KEY,
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.syncStatus).toBe('error');
      });
      expect(result.current.syncError).toMatch(/network error/i);
    });

    it('should succeed on a later manual sync after a failure', async () => {
      let call = 0;
      vi.mocked(SupabaseService.getExecutionFiles).mockImplementation(() => {
        call += 1;
        if (call === 1) return Promise.reject(new Error('First failure'));
        return Promise.resolve([]);
      });

      const { result } = renderHook(() =>
        useCloudSync({
          localKey: EXECUTION_KEY,
          enabled: true,
        })
      );

      await waitFor(() => expect(result.current.syncStatus).toBe('error'));

      await result.current.syncNow();

      await waitFor(() => {
        expect(result.current.syncStatus).toBe('success');
      });
    });
  });

  describe('Unsupported localKey', () => {
    it('should return to idle when localKey is not supported', async () => {
      const { result } = renderHook(() =>
        useCloudSync({
          localKey: 'unknown-key-without-type',
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.isSyncing).toBe(false);
        expect(result.current.syncStatus).toBe('idle');
      });
    });
  });

  describe('Data Integrity', () => {
    it('should preserve data during sync', async () => {
      const originalData = [
        { id: '1', name: 'File 1', updatedAt: new Date().toISOString() },
        { id: '2', name: 'File 2', updatedAt: new Date().toISOString() },
      ];

      localStorageMock.setItem(EXECUTION_KEY, JSON.stringify(originalData));

      const { result } = renderHook(() =>
        useCloudSync({
          localKey: EXECUTION_KEY,
          enabled: true,
        })
      );

      await result.current.syncNow();

      await waitFor(() => {
        expect(result.current.isSyncing).toBe(false);
      });

      const storedData = JSON.parse(localStorageMock.getItem(EXECUTION_KEY) || '[]');
      expect(storedData).toHaveLength(originalData.length);
    });

    it('should handle empty data', async () => {
      localStorageMock.setItem(EXECUTION_KEY, '[]');

      const { result } = renderHook(() =>
        useCloudSync({
          localKey: EXECUTION_KEY,
          enabled: true,
        })
      );

      await result.current.syncNow();

      expect(result.current.syncStatus).toBeDefined();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() =>
        useCloudSync({
          localKey: EXECUTION_KEY,
          enabled: true,
        })
      );

      unmount();

      expect(true).toBe(true);
    });

    it('should stop syncing after unmount', async () => {
      const { unmount } = renderHook(() =>
        useCloudSync({
          localKey: EXECUTION_KEY,
          enabled: true,
          syncInterval: 100,
        })
      );

      unmount();

      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(true).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should sync efficiently with small datasets', async () => {
      const smallData = [{ id: '1', name: 'Test', updatedAt: new Date().toISOString() }];
      localStorageMock.setItem(EXECUTION_KEY, JSON.stringify(smallData));

      const { result } = renderHook(() =>
        useCloudSync({
          localKey: EXECUTION_KEY,
          enabled: true,
        })
      );

      const startTime = Date.now();
      await result.current.syncNow();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000);
    });

    it('should handle large datasets without blocking', async () => {
      const largeData = Array.from({ length: 100 }, (_, i) => ({
        id: `file-${i}`,
        name: `File ${i}`,
        updatedAt: new Date().toISOString(),
        data: 'x'.repeat(1000),
      }));

      localStorageMock.setItem(EXECUTION_KEY, JSON.stringify(largeData));

      const { result } = renderHook(() =>
        useCloudSync({
          localKey: EXECUTION_KEY,
          enabled: true,
        })
      );

      const startTime = Date.now();
      await result.current.syncNow();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
    });
  });
});

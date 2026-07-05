import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    hydrateWallpaperFromSecureStore,
    invalidateWallpaperCache,
    loadPersistedWallpaper,
    persistWallpaper,
} from '@/app/services/settings/apply';

const store = new Map<string, string>();

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        setItemSync: vi.fn((key: string, value: string) => {
            store.set(key, value);
        }),
        deleteItemSync: vi.fn((key: string) => {
            store.delete(key);
        }),
        getItemSync: vi.fn((key: string) => store.get(key) ?? null),
        getItem: vi.fn(async (key: string) => store.get(key) ?? null),
        ensureBootShellReady: vi.fn(async () => undefined),
    },
}));

describe('wallpaper persistence', () => {
    beforeEach(() => {
        store.clear();
        invalidateWallpaperCache();
        localStorage.clear();
    });

    it('roundtrips wallpaper via SecureStore sync cache', () => {
        const dataUrl = 'data:image/jpeg;base64,abc123';
        expect(persistWallpaper(dataUrl)).toBe(true);
        expect(loadPersistedWallpaper()).toBe(dataUrl);
    });

    it('migrates legacy localStorage wallpaper into SecureStore', () => {
        const legacy = 'data:image/jpeg;base64,legacy';
        localStorage.setItem('lawyer_wallpaper', legacy);
        invalidateWallpaperCache();
        expect(loadPersistedWallpaper()).toBe(legacy);
        expect(localStorage.getItem('lawyer_wallpaper')).toBeNull();
    });

    it('hydrates async store when sync cache is cold', async () => {
        const dataUrl = 'data:image/jpeg;base64,async';
        store.set('lawyer_wallpaper', dataUrl);
        invalidateWallpaperCache();
        await expect(hydrateWallpaperFromSecureStore()).resolves.toBe(dataUrl);
        expect(loadPersistedWallpaper()).toBe(dataUrl);
    });

    it('clears wallpaper on remove', () => {
        persistWallpaper('data:image/jpeg;base64,x');
        expect(persistWallpaper(undefined)).toBe(true);
        invalidateWallpaperCache();
        expect(loadPersistedWallpaper()).toBeUndefined();
    });
});

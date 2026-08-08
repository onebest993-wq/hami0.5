import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearWallpaperDecodeCache, ensureWallpaperDecoded } from '@/app/services/settings/wallpaperPaintReady';

describe('wallpaperPaintReady', () => {
    beforeEach(() => {
        clearWallpaperDecodeCache();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        clearWallpaperDecodeCache();
    });

    it('يُكمل فوراً عند غياب المصدر', async () => {
        await expect(ensureWallpaperDecoded(undefined)).resolves.toBeUndefined();
    });

    it('يستدعي decode قبل الإرجاع', async () => {
        const decode = vi.fn().mockResolvedValue(undefined);
        const originalImage = globalThis.Image;
        class MockImage {
            onload: (() => void) | null = null;
            onerror: (() => void) | null = null;
            decode = decode;
            set src(_value: string) {
                queueMicrotask(() => this.onload?.());
            }
        }
        globalThis.Image = MockImage as unknown as typeof Image;

        await ensureWallpaperDecoded('data:image/jpeg;base64,abc');
        expect(decode).toHaveBeenCalledTimes(1);

        globalThis.Image = originalImage;
    });

    it('لا يُعيد فك الترميز لنفس المصدر', async () => {
        const decode = vi.fn().mockResolvedValue(undefined);
        const originalImage = globalThis.Image;
        class MockImage {
            onload: (() => void) | null = null;
            onerror: (() => void) | null = null;
            decode = decode;
            set src(_value: string) {
                queueMicrotask(() => this.onload?.());
            }
        }
        globalThis.Image = MockImage as unknown as typeof Image;

        const src = 'data:image/jpeg;base64,xyz';
        await ensureWallpaperDecoded(src);
        await ensureWallpaperDecoded(src);
        expect(decode).toHaveBeenCalledTimes(1);

        globalThis.Image = originalImage;
    });
});

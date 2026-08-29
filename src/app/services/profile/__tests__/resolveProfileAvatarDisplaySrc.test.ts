import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    PROFILE_AVATAR_INLINE_HEAVY_CHARS,
    resetProfileAvatarDisplayCacheForTests,
    resolveProfileAvatarDisplaySrc,
    shouldDownscaleProfileAvatarSrc,
} from '@/app/services/profile/resolveProfileAvatarDisplaySrc';

describe('resolveProfileAvatarDisplaySrc', () => {
    afterEach(() => {
        resetProfileAvatarDisplayCacheForTests();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('لا يصغّر الروابط الشبكية أو data القصير', () => {
        expect(shouldDownscaleProfileAvatarSrc('https://cdn.example/a.jpg')).toBe(false);
        expect(shouldDownscaleProfileAvatarSrc('data:image/jpeg;base64,abc')).toBe(false);
        expect(
            shouldDownscaleProfileAvatarSrc(
                `data:image/jpeg;base64,${'A'.repeat(PROFILE_AVATAR_INLINE_HEAVY_CHARS + 1)}`,
            ),
        ).toBe(true);
    });

    it('يمرّر المصدر كما هو عندما لا يحتاج تصغيراً', async () => {
        await expect(resolveProfileAvatarDisplaySrc('https://cdn.example/a.jpg', 256)).resolves.toBe(
            'https://cdn.example/a.jpg',
        );
    });

    it('يعيد blob: مصغّر لـ data الثقيل عبر canvas', async () => {
        const heavy = `data:image/jpeg;base64,${'A'.repeat(PROFILE_AVATAR_INLINE_HEAVY_CHARS + 8)}`;
        const close = vi.fn();
        vi.stubGlobal(
            'createImageBitmap',
            vi.fn(async () => ({
                width: 1200,
                height: 900,
                close,
            })),
        );
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                blob: async () => new Blob(['x'], { type: 'image/jpeg' }),
            })),
        );
        const toBlob = vi.fn((cb: (b: Blob | null) => void) => {
            cb(new Blob(['thumb'], { type: 'image/jpeg' }));
        });
        const ctx = {
            drawImage: vi.fn(),
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high' as ImageSmoothingQuality,
        };
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
            ctx as unknown as CanvasRenderingContext2D,
        );
        vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(toBlob as never);
        vi.stubGlobal(
            'URL',
            class {
                static createObjectURL = vi.fn(() => 'blob:hami-avatar-thumb');
                static revokeObjectURL = vi.fn();
            },
        );

        const resolved = await resolveProfileAvatarDisplaySrc(heavy, 256);
        expect(resolved).toBe('blob:hami-avatar-thumb');
        expect(ctx.imageSmoothingQuality).toBe('medium');
        expect(close).toHaveBeenCalled();

        const again = await resolveProfileAvatarDisplaySrc(heavy, 256);
        expect(again).toBe('blob:hami-avatar-thumb');
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('لا يمرّ على canvas إذا كانت الصورة أصغر من الحد', async () => {
        const heavy = `data:image/jpeg;base64,${'A'.repeat(PROFILE_AVATAR_INLINE_HEAVY_CHARS + 8)}`;
        const close = vi.fn();
        vi.stubGlobal(
            'createImageBitmap',
            vi.fn(async () => ({
                width: 80,
                height: 80,
                close,
            })),
        );
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                blob: async () => new Blob(['x'], { type: 'image/jpeg' }),
            })),
        );
        const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext');
        vi.stubGlobal(
            'URL',
            class {
                static createObjectURL = vi.fn(() => 'blob:hami-avatar-native');
                static revokeObjectURL = vi.fn();
            },
        );

        const resolved = await resolveProfileAvatarDisplaySrc(heavy, 256);
        expect(resolved).toBe('blob:hami-avatar-native');
        expect(getContext).not.toHaveBeenCalled();
        expect(close).toHaveBeenCalled();
    });
});

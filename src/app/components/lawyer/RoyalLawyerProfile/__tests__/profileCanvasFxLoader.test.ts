import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
    ensureProfileCanvasFxLoaded,
    isProfileCanvasFxSuppressed,
    resetProfileCanvasFxLoaderForTests,
    shouldDeferProfileCanvasInteractionCss,
} from '@/app/components/lawyer/RoyalLawyerProfile/profileCanvasFxLoader';

vi.mock('@/app/runtime/nativePlatform', () => ({
    isAndroidNativeShell: vi.fn(() => false),
}));

import { isAndroidNativeShell } from '@/app/runtime/nativePlatform';

describe('profileCanvasFxLoader', () => {
    beforeEach(() => {
        resetProfileCanvasFxLoaderForTests();
        vi.mocked(isAndroidNativeShell).mockReturnValue(false);
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            configurable: true,
            value: vi.fn().mockImplementation((query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });
    });

    it('loads interaction CSS under forceInteractionCss even when page is hidden (lite-like suppress)', async () => {
        const root = document.createElement('div');
        root.setAttribute('data-lawyer-profile-root', '');
        root.setAttribute('data-profile-page-hidden', 'true');
        document.body.appendChild(root);

        expect(isProfileCanvasFxSuppressed()).toBe(true);

        await expect(
            ensureProfileCanvasFxLoaded({
                interaction: 'tapReveal',
                forceInteractionCss: true,
            }),
        ).resolves.toBeUndefined();

        root.remove();
    });

    it('defers interaction CSS on Android unless forceInteractionCss or includeStudio', async () => {
        vi.mocked(isAndroidNativeShell).mockReturnValue(true);
        expect(shouldDeferProfileCanvasInteractionCss()).toBe(true);

        await expect(
            ensureProfileCanvasFxLoaded({
                interaction: 'tapReveal',
            }),
        ).resolves.toBeUndefined();

        await expect(
            ensureProfileCanvasFxLoaded({
                interaction: 'tapReveal',
                forceInteractionCss: true,
            }),
        ).resolves.toBeUndefined();
    });
});

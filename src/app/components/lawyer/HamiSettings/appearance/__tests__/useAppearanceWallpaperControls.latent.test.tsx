import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { SettingsSectionActiveProvider } from '@/app/components/lawyer/HamiSettings/settingsSectionActiveContext';
import type { AppSettingsState } from '@/app/services/settings';

const persistWallpaper = vi.fn(() => true);
const applyWallpaperSurfaceVarsWhenReady = vi.fn(async () => undefined);
const resolveWallpaperSrc = vi.fn(() => undefined as string | undefined);
const success = vi.fn();
const error = vi.fn();

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        success: (...args: unknown[]) => success(...args),
        error: (...args: unknown[]) => error(...args),
        info: vi.fn(),
        warning: vi.fn(),
    },
}));

vi.mock('@/app/services/settings', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/services/settings')>();
    return {
        ...actual,
        persistWallpaper: (...args: unknown[]) => persistWallpaper(...args),
        applyWallpaperSurfaceVarsWhenReady: (...args: unknown[]) =>
            applyWallpaperSurfaceVarsWhenReady(...(args as [boolean, string, string?])),
        resolveWallpaperSrc: (...args: unknown[]) => resolveWallpaperSrc(...args),
    };
});

vi.mock('@/app/services/settings/wallpaperEditorRender', () => ({
    loadWallpaperImageFromUrl: vi.fn(async () => ({
        naturalWidth: 8,
        naturalHeight: 8,
        width: 8,
        height: 8,
    })),
    renderWallpaperCanvas: vi.fn(() => document.createElement('canvas')),
    canvasToWallpaperDataUrl: vi.fn(async () => 'data:image/png;base64,AAA'),
}));

import { useAppearanceWallpaperControls } from '@/app/components/lawyer/HamiSettings/appearance/useAppearanceWallpaperControls';

const TRANSFORM = { scale: 1, offsetX: 0, offsetY: 0 };
const appearance = { theme: 'gold' } as AppSettingsState['appearance'];

describe('useAppearanceWallpaperControls — مغادرة أثناء التطبيق', () => {
    beforeEach(() => {
        persistWallpaper.mockReset();
        persistWallpaper.mockReturnValue(true);
        applyWallpaperSurfaceVarsWhenReady.mockReset();
        applyWallpaperSurfaceVarsWhenReady.mockResolvedValue(undefined);
        resolveWallpaperSrc.mockReset();
        resolveWallpaperSrc.mockReturnValue(undefined);
        success.mockReset();
        error.mockReset();
        URL.createObjectURL = vi.fn(() => 'blob:wallpaper-test') as typeof URL.createObjectURL;
        URL.revokeObjectURL = vi.fn() as typeof URL.revokeObjectURL;
    });

    it('يثبّت الخلفية عند نجاح التطبيق والبقاء في المنظر', async () => {
        const patchAppearance = vi.fn();
        const { result } = renderHook(
            () => useAppearanceWallpaperControls(appearance, patchAppearance),
            {
                wrapper: ({ children }) => (
                    <SettingsSectionActiveProvider active>{children}</SettingsSectionActiveProvider>
                ),
            },
        );

        act(() => {
            result.current.beginWallpaperEdit(new File(['x'], 'wall.jpg', { type: 'image/jpeg' }));
        });

        let ok = false;
        await act(async () => {
            ok = await result.current.applyWallpaperEdit(TRANSFORM);
        });

        expect(ok).toBe(true);
        expect(persistWallpaper).toHaveBeenCalledWith('data:image/png;base64,AAA');
        expect(patchAppearance).toHaveBeenCalled();
        expect(success).toHaveBeenCalled();
    });

    it('يعيد السطح السابق ولا يثبّت إن غادر المستخدم أثناء التطبيق الحي', async () => {
        let releaseLive!: () => void;
        applyWallpaperSurfaceVarsWhenReady.mockImplementationOnce(
            () =>
                new Promise<void>((resolve) => {
                    releaseLive = resolve;
                }),
        );
        applyWallpaperSurfaceVarsWhenReady.mockResolvedValue(undefined);

        let active = true;
        const patchAppearance = vi.fn();
        const { result, rerender } = renderHook(
            () => useAppearanceWallpaperControls(appearance, patchAppearance),
            {
                wrapper: ({ children }) => (
                    <SettingsSectionActiveProvider active={active}>{children}</SettingsSectionActiveProvider>
                ),
            },
        );

        act(() => {
            result.current.beginWallpaperEdit(new File(['x'], 'wall.jpg', { type: 'image/jpeg' }));
        });

        let finished: boolean | undefined;
        act(() => {
            void result.current.applyWallpaperEdit(TRANSFORM).then((value) => {
                finished = value;
            });
        });

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });
        expect(applyWallpaperSurfaceVarsWhenReady).toHaveBeenCalledTimes(1);

        active = false;
        rerender();

        await act(async () => {
            releaseLive();
            await Promise.resolve();
        });

        expect(finished).toBe(false);
        expect(persistWallpaper).not.toHaveBeenCalled();
        expect(patchAppearance).not.toHaveBeenCalled();
        expect(applyWallpaperSurfaceVarsWhenReady).toHaveBeenCalledTimes(2);
        expect(applyWallpaperSurfaceVarsWhenReady).toHaveBeenLastCalledWith(false, 'gold');
    });
});

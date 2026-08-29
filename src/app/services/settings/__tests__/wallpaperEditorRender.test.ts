import { describe, expect, it, vi } from 'vitest';
import {
    WALLPAPER_EDITOR_DEFAULT_TRANSFORM,
    WALLPAPER_EXPORT_MAX_BYTES,
    canvasToWallpaperDataUrl,
    clampWallpaperEditorTransform,
    computeWallpaperCoverLayout,
} from '../wallpaperEditorRender';

describe('wallpaperEditorRender', () => {
    it('يحسب ملء الإطار مع إزاحة', () => {
        const centered = computeWallpaperCoverLayout(2000, 3000, 360, 780, WALLPAPER_EDITOR_DEFAULT_TRANSFORM);
        expect(centered.drawW).toBeGreaterThanOrEqual(360);
        expect(centered.drawH).toBeGreaterThanOrEqual(780);
        expect(centered.left).toBeLessThanOrEqual(0);
        expect(centered.top).toBeLessThanOrEqual(0);

        const shiftedRight = computeWallpaperCoverLayout(2000, 3000, 360, 780, {
            scale: 1.5,
            offsetX: 1,
            offsetY: -1,
        });
        const shiftedLeft = computeWallpaperCoverLayout(2000, 3000, 360, 780, {
            scale: 1.5,
            offsetX: -1,
            offsetY: 1,
        });
        expect(shiftedRight.left).toBeGreaterThan(shiftedLeft.left);
        expect(shiftedRight.top).toBeLessThan(shiftedLeft.top);
    });

    it('يحدّ التكبير والإزاحة', () => {
        expect(
            clampWallpaperEditorTransform({ scale: 5, offsetX: 2, offsetY: -3 }),
        ).toEqual({ scale: 3, offsetX: 1, offsetY: -1 });
    });

    it('canvasToWallpaperDataUrl يُرجع dataUrl ضمن الحد', async () => {
        const canvas = document.createElement('canvas');
        const huge = `data:image/jpeg;base64,${'A'.repeat(WALLPAPER_EXPORT_MAX_BYTES + 1)}`;
        const ok = `data:image/jpeg;base64,${'B'.repeat(1000)}`;
        vi.spyOn(canvas, 'toDataURL')
            .mockReturnValueOnce(huge)
            .mockReturnValueOnce(huge)
            .mockReturnValue(ok);

        const dataUrl = await canvasToWallpaperDataUrl(canvas);
        expect(dataUrl).toBe(ok);
        expect(dataUrl.length).toBeLessThanOrEqual(WALLPAPER_EXPORT_MAX_BYTES);
    });
});

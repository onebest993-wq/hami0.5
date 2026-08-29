import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HOME_MAIN_GRID_PAINTED_EVENT } from '@/app/bootstrap/bootEventNames';
import {
    ensureWallpaperDecoded,
    holdWallpaperCssImageUntilHomePainted,
    isWallpaperCssImageHeld,
    releaseWallpaperCssImageHold,
    resetWallpaperPaintDeferralForTests,
    scheduleAfterHomeMainGridPaint,
} from '@/app/services/settings/wallpaperPaintReady';

describe('wallpaperPaintReady', () => {
    beforeEach(() => {
        resetWallpaperPaintDeferralForTests();
        window.__hamiHomeMainGridPainted__ = false;
    });

    afterEach(() => {
        vi.restoreAllMocks();
        resetWallpaperPaintDeferralForTests();
        window.__hamiHomeMainGridPainted__ = false;
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

    it('يؤجّل المهمة حتى طلاء شبكة المنزل', () => {
        const task = vi.fn();
        scheduleAfterHomeMainGridPaint(task);
        expect(task).not.toHaveBeenCalled();
        window.dispatchEvent(new Event(HOME_MAIN_GRID_PAINTED_EVENT));
        expect(task).toHaveBeenCalledTimes(1);
    });

    it('يحجز حقن CSS للصورة حتى الإفراج', () => {
        holdWallpaperCssImageUntilHomePainted();
        expect(isWallpaperCssImageHeld()).toBe(true);
        releaseWallpaperCssImageHold();
        expect(isWallpaperCssImageHeld()).toBe(false);
    });

    it('الإقلاع يحجز الصورة حتى طلاء الشبكة', () => {
        const preamble = readFileSync(join(process.cwd(), 'src/boot/bootEntryPreamble.ts'), 'utf8');
        expect(preamble).toContain('holdWallpaperCssImageUntilHomePainted');
        expect(preamble).toContain('scheduleAfterHomeMainGridPaint');
        expect(preamble).not.toMatch(
            /if \(wallpaper\) await wallpaperMod\.ensureWallpaperDecoded\(wallpaper\);\s*applyMod\.applySettingsToDom/,
        );
        expect(preamble).not.toContain(
            'if (wallpaper) await wallpaperMod.ensureWallpaperDecoded(wallpaper);',
        );
        expect(preamble).toContain("document.getElementById('hami-static-boot')");
        const applySrc = readFileSync(join(process.cwd(), 'src/app/services/settings/apply.ts'), 'utf8');
        expect(applySrc).toContain('} else if (!isWallpaperCssImageHeld()) {');
    });
});

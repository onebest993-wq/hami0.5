import { describe, it, expect, vi, afterEach } from 'vitest';

import {
    removeStaticBootShell,
    STATIC_BOOT_SHELL_ID,
    STATIC_BOOT_SHELL_FADE_MS,
    shouldMountReactBootOverlay,
} from '@/app/bootstrap/bootStaticShell';

describe('bootStaticShell', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('يزيل طبقة الإقلاع الثابتة وتصنيف html بعد تلاشٍ قصير', () => {
        vi.useFakeTimers();
        document.documentElement.classList.add('hami-boot-static-active');
        const layer = document.createElement('div');
        layer.id = STATIC_BOOT_SHELL_ID;
        document.body.appendChild(layer);

        removeStaticBootShell({ force: true });
        expect(layer.classList.contains('hami-boot-cinematic--exiting')).toBe(true);

        vi.advanceTimersByTime(STATIC_BOOT_SHELL_FADE_MS);

        expect(document.getElementById(STATIC_BOOT_SHELL_ID)).toBeNull();
        expect(document.documentElement.classList.contains('hami-boot-static-active')).toBe(false);
    });

    it('لا يُركّب overlay React عندما shell الثابت موجود', () => {
        const layer = document.createElement('div');
        layer.id = STATIC_BOOT_SHELL_ID;
        document.body.appendChild(layer);

        expect(shouldMountReactBootOverlay()).toBe(false);

        layer.remove();
    });
});

import { describe, expect, it, vi, afterEach } from 'vitest';

vi.mock('@/app/runtime/nativePlatform', () => ({
    isCapacitorNativePlatform: () => false,
}));

import { bindWebScreenshotDeterrent } from '@/app/runtime/screenshotDeterrentRuntime';

describe('bindWebScreenshotDeterrent', () => {
    afterEach(() => {
        delete document.documentElement.dataset.hamiScreenshotGuard;
    });

    it('يضبط dataset ويمنع contextmenu', () => {
        const release = bindWebScreenshotDeterrent();
        expect(document.documentElement.dataset.hamiScreenshotGuard).toBe('1');

        const event = new Event('contextmenu', { cancelable: true });
        document.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);

        release();
        expect(document.documentElement.dataset.hamiScreenshotGuard).toBeUndefined();
    });

    it('يمنع النسخ أثناء التفعيل', () => {
        const release = bindWebScreenshotDeterrent();
        const event = new Event('copy', { cancelable: true }) as ClipboardEvent;
        document.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
        release();
    });
});

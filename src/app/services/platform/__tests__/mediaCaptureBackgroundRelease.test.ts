import { afterEach, describe, expect, it, vi } from 'vitest';
import { subscribeCaptureBackgroundRelease } from '@/app/services/platform/mediaCaptureBackgroundRelease';

describe('mediaCaptureBackgroundRelease', () => {
    afterEach(() => {
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: 'visible',
        });
    });

    it('يحرّر عند إخفاء الصفحة', () => {
        const onRelease = vi.fn();
        const unsub = subscribeCaptureBackgroundRelease(onRelease);
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: 'hidden',
        });
        document.dispatchEvent(new Event('visibilitychange'));
        expect(onRelease).toHaveBeenCalledTimes(1);
        unsub();
    });

    it('يحرّر عند pagehide', () => {
        const onRelease = vi.fn();
        const unsub = subscribeCaptureBackgroundRelease(onRelease);
        window.dispatchEvent(new Event('pagehide'));
        expect(onRelease).toHaveBeenCalledTimes(1);
        unsub();
    });
});

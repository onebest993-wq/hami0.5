import { afterEach, describe, expect, it, vi } from 'vitest';
import { subscribeCaptureBackgroundRelease } from '@/app/services/platform/mediaCaptureBackgroundRelease';
import { HAMI_APP_STATE_EVENT } from '@/app/runtime/appStateEvents';

describe('mediaCaptureBackgroundRelease', () => {
    afterEach(() => {
        Object.defineProperty(document, 'hidden', {
            configurable: true,
            value: false,
        });
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: 'visible',
        });
        delete document.documentElement.dataset.hamiAppActive;
    });

    it('يحرّر عند إخفاء الصفحة', () => {
        const onRelease = vi.fn();
        const unsub = subscribeCaptureBackgroundRelease(onRelease);
        Object.defineProperty(document, 'hidden', {
            configurable: true,
            value: true,
        });
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

    it('يحرّر عند خلفية التطبيق الأصلية', () => {
        const onRelease = vi.fn();
        const unsub = subscribeCaptureBackgroundRelease(onRelease);
        window.dispatchEvent(
            new CustomEvent(HAMI_APP_STATE_EVENT, { detail: { isActive: false } }),
        );
        expect(onRelease).toHaveBeenCalledTimes(1);
        unsub();
    });
});

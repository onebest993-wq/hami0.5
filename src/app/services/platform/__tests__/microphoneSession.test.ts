import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    clearPendingMicrophoneStream,
    consumePendingMicrophoneStream,
    hasLiveMicrophoneStream,
    setPendingMicrophoneStream,
} from '@/app/services/platform/microphoneSession';

function stubStream(stop = vi.fn()) {
    const track = { stop, readyState: 'live' as MediaStreamTrackState };
    return {
        stop,
        stream: {
            getTracks: () => [track],
            getAudioTracks: () => [track],
        } as unknown as MediaStream,
    };
}

describe('microphoneSession', () => {
    afterEach(() => {
        clearPendingMicrophoneStream();
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

    it('يوقف المسار فوراً دون إعادة دخول إن سُلّح والتطبيق مخفى', () => {
        Object.defineProperty(document, 'hidden', {
            configurable: true,
            value: true,
        });
        document.documentElement.dataset.hamiAppActive = '0';
        const { stop, stream } = stubStream();
        expect(() => setPendingMicrophoneStream(stream)).not.toThrow();
        expect(stop).toHaveBeenCalledTimes(1);
        expect(consumePendingMicrophoneStream()).toBeNull();
    });

    it('يرفض null/undefined', () => {
        expect(hasLiveMicrophoneStream(null)).toBe(false);
        expect(hasLiveMicrophoneStream(undefined)).toBe(false);
    });

    it('لا يرمي إن غاب getAudioTracks (محاكاة E2E ناقصة)', () => {
        const stub = {
            getTracks: () => [{ stop: () => undefined }],
        } as unknown as MediaStream;
        expect(() => hasLiveMicrophoneStream(stub)).not.toThrow();
        expect(hasLiveMicrophoneStream(stub)).toBe(false);
    });

    it('يقبل مساراً حياً فيه مسار صوت live', () => {
        const stream = {
            getAudioTracks: () => [{ readyState: 'live' as MediaStreamTrackState }],
        } as unknown as MediaStream;
        expect(hasLiveMicrophoneStream(stream)).toBe(true);
    });

    it('يرفض مساراً متوقفاً', () => {
        const stream = {
            getAudioTracks: () => [{ readyState: 'ended' as MediaStreamTrackState }],
        } as unknown as MediaStream;
        expect(hasLiveMicrophoneStream(stream)).toBe(false);
    });

    it('يوقف المسار المعلّق عند إخفاء الصفحة', () => {
        const { stop, stream } = stubStream();
        setPendingMicrophoneStream(stream);
        Object.defineProperty(document, 'hidden', {
            configurable: true,
            value: true,
        });
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: 'hidden',
        });
        document.dispatchEvent(new Event('visibilitychange'));
        expect(stop).toHaveBeenCalled();
        expect(consumePendingMicrophoneStream()).toBeNull();
    });

    it('consume يفك الاشتراك فلا يُوقف المسار بعد التسليم', () => {
        const { stop, stream } = stubStream();
        setPendingMicrophoneStream(stream);
        expect(consumePendingMicrophoneStream()).toBe(stream);
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: 'hidden',
        });
        document.dispatchEvent(new Event('visibilitychange'));
        expect(stop).not.toHaveBeenCalled();
    });
});

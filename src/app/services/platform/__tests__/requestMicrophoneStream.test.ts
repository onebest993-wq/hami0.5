import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    requestMicrophoneStream,
    resolveMicrophoneAccessMessage,
} from '@/app/services/platform/requestMicrophoneStream';

describe('requestMicrophoneStream', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it('يرجع رسالة المهلة من اسم الخطأ دون hamiCode', () => {
        expect(resolveMicrophoneAccessMessage({ name: 'TimeoutError' })).toContain('تأخر تشغيل الميكروفون');
    });

    it('يرمي timeout إذا تجمّد getUserMedia', async () => {
        vi.useFakeTimers();
        vi.stubGlobal('navigator', {
            mediaDevices: {
                getUserMedia: () => new Promise(() => undefined),
            },
        });
        const pending = requestMicrophoneStream();
        const assertion = expect(pending).rejects.toMatchObject({ name: 'TimeoutError', hamiCode: 'timeout' });
        await vi.advanceTimersByTimeAsync(8_001);
        await assertion;
    });
});

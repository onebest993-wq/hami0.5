import { describe, expect, it } from 'vitest';
import {
    clearIntervalRef,
    forumVoiceAttachmentMeta,
    stopMediaRecorderQuietly,
} from '../forumVoiceRecorderControl';

describe('forumVoiceRecorderControl', () => {
    it('يستخرج امتداد الملف من نوع التسجيل', () => {
        expect(forumVoiceAttachmentMeta('audio/webm;codecs=opus')).toEqual({
            mime: 'audio/webm',
            ext: 'webm',
        });
        expect(forumVoiceAttachmentMeta('audio/mp4')).toEqual({ mime: 'audio/mp4', ext: 'm4a' });
        expect(forumVoiceAttachmentMeta('audio/ogg;codecs=opus')).toEqual({
            mime: 'audio/ogg',
            ext: 'ogg',
        });
        expect(forumVoiceAttachmentMeta(undefined)).toEqual({ mime: 'audio/webm', ext: 'webm' });
    });

    it('لا يرمي عند إيقاف مسجّل خامل', () => {
        expect(() => stopMediaRecorderQuietly(null)).not.toThrow();
        const inactive = { state: 'inactive', stop: () => undefined } as unknown as MediaRecorder;
        expect(() => stopMediaRecorderQuietly(inactive)).not.toThrow();
    });

    it('يمسح المؤقّت ويصفّر المرجع', () => {
        const handle = setInterval(() => undefined, 60_000);
        const ref = { current: handle as ReturnType<typeof setInterval> };
        clearIntervalRef(ref);
        expect(ref.current).toBeNull();
    });
});

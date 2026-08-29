import { afterEach, describe, expect, it, vi } from 'vitest';
import { pickRecorderMimeType, createMediaRecorder } from '@/app/components/lawyer/ActionModals/voiceRecorderMedia';

class FakeMediaRecorder {
    static isTypeSupported(type: string) {
        return type === 'audio/webm';
    }

    stream: MediaStream;
    mimeType: string | undefined;

    constructor(stream: MediaStream, options?: { mimeType?: string }) {
        this.stream = stream;
        this.mimeType = options?.mimeType;
    }
}

describe('voiceRecorderMedia', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('يعيد نوعاً مدعوماً أو undefined', () => {
        const mime = pickRecorderMimeType();
        expect(mime === undefined || typeof mime === 'string').toBe(true);
    });

    it('ينشئ MediaRecorder بنوع مدعوم عند توفر الواجهة', () => {
        vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
        const track = { stop: () => undefined, readyState: 'live', kind: 'audio' };
        const stream = {
            getTracks: () => [track],
            getAudioTracks: () => [track],
        } as unknown as MediaStream;
        const recorder = createMediaRecorder(stream) as unknown as FakeMediaRecorder;
        expect(recorder.mimeType).toBe('audio/webm');
        expect(pickRecorderMimeType()).toBe('audio/webm');
    });
});

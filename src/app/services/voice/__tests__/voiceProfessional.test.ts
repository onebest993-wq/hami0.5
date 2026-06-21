import { describe, expect, it, beforeEach } from 'vitest';
import {
    encodeVoiceNoteRef,
    parseVoiceNoteRef,
    voiceNoteTitleFromMeta,
} from '@/app/services/voice/voiceNoteCodec';
import { putVoiceBlob, getVoiceBlob, clearVoiceBlobTestStore } from '@/app/services/voice/voiceNoteStorage';
import {
    isVoiceDurationValid,
    isVoiceBlobWithinLimit,
    persistVoiceRecording,
} from '@/app/services/voice/voiceRecordingLimits';

describe('voiceNoteCodec', () => {
    it('encodes and parses ref', () => {
        const ref = encodeVoiceNoteRef(12345);
        expect(parseVoiceNoteRef(ref)).toBe('12345');
    });

    it('builds title from transcript or duration', () => {
        expect(voiceNoteTitleFromMeta({ transcript: 'جلسة مرافعة غداً' })).toContain('جلسة');
        expect(voiceNoteTitleFromMeta({ durationSec: 90 })).toContain('1:30');
    });
});

describe('voiceNoteStorage', () => {
    beforeEach(() => {
        clearVoiceBlobTestStore();
    });

    it('stores and retrieves blob in test mode', async () => {
        const blob = new Blob(['audio-bytes'], { type: 'audio/webm' });
        await putVoiceBlob('n-1', blob);
        const hit = await getVoiceBlob('n-1');
        expect(hit?.size).toBe(blob.size);
    });
});

describe('voiceRecordingLimits', () => {
    beforeEach(() => {
        clearVoiceBlobTestStore();
    });

    it('validates duration and size', () => {
        expect(isVoiceDurationValid(0)).toBe(false);
        expect(isVoiceDurationValid(30)).toBe(true);
        expect(isVoiceBlobWithinLimit(1024)).toBe(true);
    });

    it('persists via indexed ref when possible', async () => {
        const blob = new Blob(['x'], { type: 'audio/webm' });
        const { body, usedIndexedDb } = await persistVoiceRecording('99', blob);
        expect(usedIndexedDb).toBe(true);
        expect(parseVoiceNoteRef(body)).toBe('99');
    });
});

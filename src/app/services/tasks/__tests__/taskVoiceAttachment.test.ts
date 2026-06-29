import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    parseTaskVoiceStorageKey,
    taskVoiceStorageKey,
    titleFromVoicePayload,
} from '@/app/services/tasks/taskVoiceAttachment';

describe('taskVoiceAttachment', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('taskVoiceStorageKey prefixes task id', () => {
        expect(taskVoiceStorageKey('abc')).toBe('task-voice-abc');
    });

    it('parseTaskVoiceStorageKey accepts task voice refs only', () => {
        expect(parseTaskVoiceStorageKey('hami-voice-ref:task-voice-abc')).toBe('task-voice-abc');
        expect(parseTaskVoiceStorageKey('hami-voice-ref:notepad-1')).toBeNull();
        expect(parseTaskVoiceStorageKey(null)).toBeNull();
    });

    it('titleFromVoicePayload prefers transcript', () => {
        expect(
            titleFromVoicePayload({
                blob: new Blob(),
                durationSeconds: 12,
                transcript: 'جلسة محكمة',
            }),
        ).toBe('جلسة محكمة');
    });
});

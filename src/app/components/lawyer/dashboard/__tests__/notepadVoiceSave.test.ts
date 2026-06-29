import { describe, expect, it, vi } from 'vitest';
import { saveVoiceNoteToNotepad } from '../notepadVoiceSave';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/app/services/voice/voiceRecordingLimits', () => ({
    isVoiceDurationValid: () => true,
    isVoiceBlobWithinLimit: () => true,
    persistVoiceRecording: vi.fn(async () => ({ body: 'hami-voice-ref:test-1' })),
}));

describe('saveVoiceNoteToNotepad', () => {
    it('يرفض الحفظ بدون تسجيل دخول', async () => {
        const saveNote = vi.fn();
        const id = await saveVoiceNoteToNotepad(
            { blob: new Blob(['x']), durationSeconds: 10 },
            { userId: undefined, saveNote },
        );
        expect(id).toBeNull();
        expect(saveNote).not.toHaveBeenCalled();
    });

    it('يحفظ تسجيلاً صوتياً للمستخدم المسجّل', async () => {
        const saveNote = vi.fn();
        const id = await saveVoiceNoteToNotepad(
            {
                blob: new Blob(['x']),
                durationSeconds: 12,
                transcript: 'ملاحظة صوتية',
            },
            { userId: 'lawyer-1', saveNote },
        );
        expect(id).not.toBeNull();
        expect(saveNote).toHaveBeenCalledTimes(1);
        expect(saveNote.mock.calls[0]![0].type).toBe('voice');
    });
});

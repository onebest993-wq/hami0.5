import { describe, expect, it, beforeEach } from 'vitest';
import { isVoiceNote, isVoiceNoteBody } from '../notepadNoteUtils';
import { clearQuickNoteDraft, loadQuickNoteDraft, saveQuickNoteDraft } from '../quickNoteDraft';

describe('notepadNoteUtils', () => {
    it('detects voice data URLs and refs', () => {
        expect(isVoiceNoteBody('data:audio/webm;base64,abc')).toBe(true);
        expect(isVoiceNoteBody('hami-voice-ref:123')).toBe(true);
        expect(isVoiceNoteBody('نص عادي')).toBe(false);
    });

    it('detects voice notes by type or body', () => {
        expect(isVoiceNote({ type: 'voice', body: 'x' })).toBe(true);
        expect(isVoiceNote({ body: 'data:audio/webm;base64,x' })).toBe(true);
    });
});

describe('quickNoteDraft', () => {
    beforeEach(async () => {
        await clearQuickNoteDraft('lawyer-test');
    });

    it('persists and clears draft per user', async () => {
        await saveQuickNoteDraft('lawyer-test', 'مسودة مهمة');
        expect(await loadQuickNoteDraft('lawyer-test')).toBe('مسودة مهمة');
        await clearQuickNoteDraft('lawyer-test');
        expect(await loadQuickNoteDraft('lawyer-test')).toBe('');
    });
});

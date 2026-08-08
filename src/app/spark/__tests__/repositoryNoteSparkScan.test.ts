import { describe, expect, it } from 'vitest';
import { scanNotesForSpark } from '@/app/spark/engine/repositoryNoteSparkScan';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';

const baseNote = (overrides: Partial<GlobalNote> = {}): GlobalNote =>
    ({
        id: 'note-1',
        title: 'ملاحظة مهمة',
        body: '',
        isPinned: false,
        ...overrides,
    }) as GlobalNote;

describe('repositoryNoteSparkScan', () => {
    it('ينبّه عند تذكير قريب', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const ymd = tomorrow.toISOString().slice(0, 10);
        const nudge = scanNotesForSpark([baseNote({ reminder_at: ymd })]);
        expect(nudge?.kind).toBe('repository.note_reminder_near');
    });

    it('ينبّه عند تواريخ في نص الملاحظة', () => {
        const nudge = scanNotesForSpark([
            baseNote({
                body: 'جلسة بتاريخ 2026-06-15 يجب الحضور',
            }),
        ]);
        expect(nudge?.kind).toBe('repository.note_date_hint');
        expect(nudge?.targetFileId).toBe('note-1');
    });
});

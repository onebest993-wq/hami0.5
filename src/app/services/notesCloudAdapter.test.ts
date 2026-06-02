import { describe, expect, it } from 'vitest';
import { cloudNoteToDashboard, normalizeNotesList, dashboardNoteToCloudPayload } from './notesCloudAdapter';

describe('notesCloudAdapter', () => {
    it('maps cloud content field to dashboard body', () => {
        const note = cloudNoteToDashboard({
            id: 'n1',
            title: 'عنوان',
            content: 'نص الملاحظة',
            createdAt: '2026-01-01T00:00:00.000Z',
        });
        expect(note?.body).toBe('نص الملاحظة');
        expect(note?.title).toBe('عنوان');
    });

    it('maps dashboard body to cloud content', () => {
        const payload = dashboardNoteToCloudPayload({
            id: 1,
            title: 't',
            body: 'محتوى',
            isPinned: false,
        });
        expect(payload.content).toBe('محتوى');
    });

    it('normalizes mixed arrays', () => {
        const list = normalizeNotesList([
            { id: 1, title: 'a', body: 'x', isPinned: false },
            { id: '2', title: 'b', content: 'y' },
        ]);
        expect(list).toHaveLength(2);
        expect(list[1].body).toBe('y');
    });
});

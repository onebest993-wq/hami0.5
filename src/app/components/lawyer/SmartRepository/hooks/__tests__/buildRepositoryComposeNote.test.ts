import { describe, expect, it } from 'vitest';
import { REPOSITORY_ACTION_CATEGORY } from '@/app/services/vaultCustomCategories';
import {
    buildRepositoryComposeNote,
    composeNoteTags,
} from '@/app/components/lawyer/SmartRepository/hooks/buildRepositoryComposeNote';

describe('buildRepositoryComposeNote', () => {
    it('composeNoteTags يضيف التصنيف الحي ويتجاهل الكل', () => {
        expect(composeNoteTags('مسودة', 'الكل')).toEqual(['مسودة']);
        expect(composeNoteTags('مسودة', '')).toEqual(['مسودة']);
        expect(composeNoteTags('مسودة', 'عقود')).toEqual(['مسودة', 'عقود']);
        expect(composeNoteTags('مسودة', 'مسودة')).toEqual(['مسودة']);
    });

    it('يبني ملاحظة غنية بلا مرفق وعنوان افتراضي', () => {
        const now = new Date('2026-08-24T10:00:00.000Z');
        const note = buildRepositoryComposeNote({
            title: '  ',
            safeBody: '<p>نص</p>',
            plain: 'نص',
            isPinned: false,
            activeRoomId: 'room_1',
            vaultActiveFilter: 'الكل',
            now,
        });
        expect(note.id).toBe(`note_${now.getTime()}`);
        expect(note.title).toBe('ملاحظة بدون عنوان');
        expect(note.body).toBe('<p>نص</p>');
        expect(note.type).toBe('rich');
        expect(note.roomId).toBe('room_1');
        expect(note.tags).toEqual([REPOSITORY_ACTION_CATEGORY.note]);
        expect(note.createdAtIso).toBe(now.toISOString());
    });

    it('يجعل النوع media عند وجود مرفق', () => {
        const note = buildRepositoryComposeNote({
            title: 'عقد',
            safeBody: '',
            plain: '',
            isPinned: true,
            attachmentDocId: 'doc_1',
            activeRoomId: null,
            vaultActiveFilter: 'عقود',
            now: new Date('2026-08-24T10:00:00.000Z'),
        });
        expect(note.type).toBe('media');
        expect(note.attachmentDocId).toBe('doc_1');
        expect(note.isPinned).toBe(true);
        expect(note.tags).toEqual([REPOSITORY_ACTION_CATEGORY.note, 'عقود']);
    });
});

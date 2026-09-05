import { describe, expect, it, vi } from 'vitest';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import {
    clearRoomIdOnGlobalNotes,
    repositoryItemsInRoom,
    restoreGlobalNotesRoom,
} from '../repositoryRoomRelocate';

describe('repositoryRoomRelocate', () => {
    it('يصفي عناصر الغرفة فقط', () => {
        const notes: GlobalNote[] = [
            { id: 'a', title: 't', body: '', isPinned: false, roomId: 'r1' },
            { id: 'b', title: 't', body: '', isPinned: false, roomId: null },
            { id: 'c', title: 't', body: '', isPinned: false, roomId: 'r1' },
        ];
        expect(repositoryItemsInRoom(notes, 'r1').map((n) => n.id)).toEqual(['a', 'c']);
    });

    it('يفرغ roomId ثم يستعيد الأصل عند الفشل', async () => {
        const original: GlobalNote = {
            id: 'a',
            title: 't',
            body: '',
            isPinned: false,
            roomId: 'r1',
        };
        const saved: GlobalNote[] = [];
        const onSave = vi.fn(async (note: GlobalNote) => {
            saved.push(note);
        });
        const relocated = await clearRoomIdOnGlobalNotes([original], onSave);
        expect(relocated).toEqual([original]);
        expect(saved[0]?.roomId).toBeNull();
        await restoreGlobalNotesRoom(relocated, onSave);
        expect(saved[1]?.roomId).toBe('r1');
    });

    it('يكمل استعادة الملاحظات حتى لو فشلت واحدة', async () => {
        const notes: GlobalNote[] = [
            { id: 'a', title: 't', body: '', isPinned: false, roomId: 'r1' },
            { id: 'b', title: 't', body: '', isPinned: false, roomId: 'r1' },
        ];
        const onSave = vi.fn(async (note: GlobalNote) => {
            if (note.id === 'a') throw new Error('fail');
        });
        await expect(restoreGlobalNotesRoom(notes, onSave)).resolves.toBeUndefined();
        expect(onSave).toHaveBeenCalledTimes(2);
    });
});

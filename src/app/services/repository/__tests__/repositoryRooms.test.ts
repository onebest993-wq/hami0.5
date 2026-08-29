import { beforeEach, describe, expect, it } from 'vitest';
import {
    addRepositoryRoom,
    itemMatchesRoomFilter,
    loadRepositoryRooms,
    removeRepositoryRoom,
} from '@/app/services/repository/repositoryRooms';
import {
    buildRepositoryFeed,
    filterRepositoryFeedByRoom,
} from '@/app/services/repository/repositoryUnifiedFeed';
import SecureStoreService from '@/app/services/SecureStoreService';

describe('repositoryRooms', () => {
    beforeEach(() => {
        localStorage.clear();
        SecureStoreService.deleteItemSync('hami:repository:rooms:v1:u1');
        SecureStoreService.deleteItemSync('hami:repository:rooms:v1:u2');
    });

    it('يحفظ ويحمّل الغرف لكل مستخدم', () => {
        const rooms = addRepositoryRoom('u1', 'موكل أحمد');
        expect(rooms).toHaveLength(1);
        expect(rooms[0].title).toBe('موكل أحمد');
        expect(loadRepositoryRooms('u1')).toHaveLength(1);
        expect(loadRepositoryRooms('u2')).toHaveLength(0);
    });

    it('لا يكرر عنواناً مطابقاً', () => {
        addRepositoryRoom('u1', 'غرفة');
        expect(addRepositoryRoom('u1', 'غرفة')).toHaveLength(1);
    });

    it('يحذف الغرفة من التخزين', () => {
        const [room] = addRepositoryRoom('u1', 'مؤقتة');
        expect(removeRepositoryRoom('u1', room.id)).toHaveLength(0);
    });

    it('يطابق فلتر المستودع العام والغرف', () => {
        expect(itemMatchesRoomFilter(null, 'main')).toBe(true);
        expect(itemMatchesRoomFilter(undefined, 'main')).toBe(true);
        expect(itemMatchesRoomFilter('room_1', 'main')).toBe(false);
        expect(itemMatchesRoomFilter('room_1', 'room_1')).toBe(true);
        expect(itemMatchesRoomFilter('room_2', 'room_1')).toBe(false);
    });
});

describe('filterRepositoryFeedByRoom', () => {
    it('يفصل عناصر الغرف عن المستودع العام', () => {
        const items = buildRepositoryFeed({
            globalNotes: [
                { id: 'n1', title: 'عام', body: 'نص', isPinned: false },
                { id: 'n2', title: 'غرفة', body: 'نص', isPinned: false, roomId: 'room_a' },
            ],
            lawsuitFiles: [
                {
                    id: 1,
                    notes: [{ id: 9, text: 'ملاحظة', meta: 'عنوان', stageCtx: 'عام', date: '2026-01-01' }],
                } as never,
            ],
            executionFiles: [],
            vaultDocs: [
                { id: 'd1', title: 'pdf', type: 'pdf', authorId: 'u1', roomId: null } as never,
                { id: 'd2', title: 'صورة', type: 'image', authorId: 'u1', roomId: 'room_a' } as never,
            ],
        });

        const main = filterRepositoryFeedByRoom(items, 'main');
        expect(main.some((i) => i.kind === 'global' && i.note.id === 'n1')).toBe(true);
        expect(main.some((i) => i.kind === 'global' && i.note.id === 'n2')).toBe(false);
        expect(main.some((i) => i.kind === 'dossier')).toBe(true);
        expect(main.some((i) => i.kind === 'vault_doc' && i.doc.id === 'd1')).toBe(true);
        expect(main.some((i) => i.kind === 'vault_doc' && i.doc.id === 'd2')).toBe(false);

        const room = filterRepositoryFeedByRoom(items, 'room_a');
        expect(room.some((i) => i.kind === 'global' && i.note.id === 'n2')).toBe(true);
        expect(room.some((i) => i.kind === 'vault_doc' && i.doc.id === 'd2')).toBe(true);
        expect(room.some((i) => i.kind === 'dossier')).toBe(false);
    });
});

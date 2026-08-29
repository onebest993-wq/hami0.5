import { describe, expect, it } from 'vitest';
import type { RepositoryRoom } from '@/app/services/repository/repositoryRooms';
import { filterRepositoryRoomsByQuery } from '@/app/components/lawyer/SmartRepository/repositoryRoomsGalleryQuery';

function room(id: string, title: string, clientLabel?: string): RepositoryRoom {
    return { id, title, createdAt: '2026-01-01T00:00:00.000Z', clientLabel };
}

describe('filterRepositoryRoomsByQuery', () => {
    const rooms = [
        room('r1', 'موكل أحمد', 'أحمد'),
        room('r2', 'شركة النور'),
    ];

    it('يرجع الكل عند استعلام فارغ', () => {
        expect(filterRepositoryRoomsByQuery(rooms, '  ')).toEqual(rooms);
    });

    it('يطابق العنوان أو تسمية الموكل دون حالة الأحرف', () => {
        expect(filterRepositoryRoomsByQuery(rooms, 'أحمد').map((r) => r.id)).toEqual(['r1']);
        expect(filterRepositoryRoomsByQuery(rooms, 'النور').map((r) => r.id)).toEqual(['r2']);
        expect(filterRepositoryRoomsByQuery(rooms, 'xyz')).toEqual([]);
    });
});

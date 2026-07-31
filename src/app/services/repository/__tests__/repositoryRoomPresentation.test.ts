import { beforeEach, describe, expect, it } from 'vitest';
import {
    buildRepositoryRoomCounts,
    groupRepositoryRoomsByInitial,
    resolvePinnedRailRooms,
    toggleRepositoryPinnedRoom,
} from '@/app/services/repository/repositoryRoomPresentation';
import type { RepositoryRoom } from '@/app/services/repository/repositoryRooms';

const room = (id: string, title: string): RepositoryRoom => ({
    id,
    title,
    createdAt: '2026-01-01T00:00:00.000Z',
});

describe('repositoryRoomPresentation — pin rail', () => {
    beforeEach(() => localStorage.clear());

    it('يعرض المثبّتة فقط + الغرفة النشطة غير المثبتة', () => {
        const rooms = [room('a', 'أحمد'), room('b', 'بلال'), room('c', 'خالد')];
        const plan = resolvePinnedRailRooms(rooms, ['b'], 'c');
        expect(plan.pinned.map((r) => r.id)).toEqual(['b']);
        expect(plan.activeUnpinned?.id).toBe('c');
    });

    it('يمنع تجاوز حد التثبيت', () => {
        const ids = ['1', '2', '3', '4', '5'];
        const result = toggleRepositoryPinnedRoom('u1', '6', ids);
        expect(result.atLimit).toBe(true);
        expect(result.ids).toEqual(ids);
    });

    it('يعدّ العناصر بتمريرة واحدة', () => {
        const counts = buildRepositoryRoomCounts(
            ['a', 'b'],
            [{ roomId: 'a' }, { roomId: 'a' }, { roomId: null }],
            [{ roomId: 'b' }, { roomId: 'x' }],
        );
        expect(counts.get('a')).toBe(2);
        expect(counts.get('b')).toBe(1);
    });

    it('يجمّع أبجدياً', () => {
        const groups = groupRepositoryRoomsByInitial([room('1', 'سامر'), room('2', 'أحمد')]);
        expect(groups[0].letter).toBe('ا');
    });
});

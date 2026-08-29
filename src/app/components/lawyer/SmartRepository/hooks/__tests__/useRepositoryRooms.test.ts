import { describe, expect, it, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRepositoryRooms } from '../useRepositoryRooms';
import { addRepositoryRoom } from '@/app/services/repository/repositoryRooms';

describe('useRepositoryRooms', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('يرفض الإنشاء بدون هوية', () => {
        const { result } = renderHook(() => useRepositoryRooms(''));
        const created = result.current.createRoom('موكل');
        expect(created.reason).toBe('unsigned');
        expect(created.room).toBeNull();
        expect(result.current.rooms).toHaveLength(0);
    });

    it('ينشئ غرفة ويختارها', () => {
        const { result } = renderHook(() => useRepositoryRooms('u1'));
        act(() => {
            const created = result.current.createRoom('موكل أحمد');
            expect(created.room?.title).toBe('موكل أحمد');
            expect(created.reason).toBeUndefined();
        });
        expect(result.current.rooms).toHaveLength(1);
        expect(result.current.selectedRoomId).not.toBe('main');
        expect(result.current.activeRoomId).toBe(result.current.rooms[0].id);
    });

    it('يكتشف التكرار حسب العنوان', () => {
        addRepositoryRoom('u1', 'غرفة');
        const { result } = renderHook(() => useRepositoryRooms('u1'));
        let outcome: ReturnType<typeof result.current.createRoom> | undefined;
        act(() => {
            outcome = result.current.createRoom('غرفة');
        });
        expect(outcome?.reason).toBe('duplicate');
        expect(result.current.rooms).toHaveLength(1);
    });

    it('لا يثبّت بدون هوية', () => {
        const { result } = renderHook(() => useRepositoryRooms(undefined));
        const pin = result.current.togglePinRoom('room_x');
        expect(pin.applied).toBe(false);
        expect(pin.atLimit).toBe(false);
    });
});

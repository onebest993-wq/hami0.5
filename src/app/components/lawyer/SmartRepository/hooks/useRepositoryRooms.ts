import { useCallback, useEffect, useState } from 'react';
import {
    addRepositoryRoom,
    loadRepositoryRooms,
    removeRepositoryRoom,
    type RepositoryRoom,
    type RepositoryRoomFilter,
} from '@/app/services/repository/repositoryRooms';
import {
    loadRepositoryPinnedRoomIds,
    pruneRepositoryPinnedRoomIds,
    REPOSITORY_ROOMS_SOFT_MAX,
    toggleRepositoryPinnedRoom,
} from '@/app/services/repository/repositoryRoomPresentation';

export function useRepositoryRooms(userId?: string) {
    const uid = userId?.trim() || '';
    const [rooms, setRooms] = useState<RepositoryRoom[]>(() => loadRepositoryRooms(uid));
    const [pinnedRoomIds, setPinnedRoomIds] = useState<string[]>(() => loadRepositoryPinnedRoomIds(uid));
    const [selectedRoomId, setSelectedRoomId] = useState<RepositoryRoomFilter>('main');

    useEffect(() => {
        const loaded = loadRepositoryRooms(uid);
        setRooms(loaded);
        setPinnedRoomIds(pruneRepositoryPinnedRoomIds(uid, new Set(loaded.map((r) => r.id))));
        setSelectedRoomId('main');
    }, [uid]);

    const createRoom = useCallback(
        (title: string): { room: RepositoryRoom | null; reason?: 'duplicate' | 'limit' | 'unsigned' } => {
            if (!uid) return { room: null, reason: 'unsigned' };
            const before = loadRepositoryRooms(uid);
            if (before.some((r) => r.title === title.trim())) {
                const existing = before.find((r) => r.title === title.trim()) ?? null;
                if (existing) setSelectedRoomId(existing.id);
                return { room: existing, reason: 'duplicate' };
            }
            if (before.length >= REPOSITORY_ROOMS_SOFT_MAX) {
                return { room: null, reason: 'limit' };
            }
            const next = addRepositoryRoom(uid, title, { maxRooms: REPOSITORY_ROOMS_SOFT_MAX });
            setRooms(next);
            const created = next.find((r) => r.title === title.trim()) ?? null;
            if (created) setSelectedRoomId(created.id);
            return { room: created };
        },
        [uid],
    );

    const deleteRoom = useCallback(
        (roomId: string) => {
            if (!uid) return;
            const next = removeRepositoryRoom(uid, roomId);
            setRooms(next);
            setPinnedRoomIds(pruneRepositoryPinnedRoomIds(uid, new Set(next.map((r) => r.id))));
            setSelectedRoomId((prev) => (prev === roomId ? 'main' : prev));
        },
        [uid],
    );

    const togglePinRoom = useCallback(
        (roomId: string): { pinned: boolean; atLimit: boolean; applied: boolean } => {
            if (!uid) return { pinned: false, atLimit: false, applied: false };
            const result = toggleRepositoryPinnedRoom(uid, roomId, pinnedRoomIds);
            setPinnedRoomIds(result.ids);
            return { pinned: result.pinned, atLimit: result.atLimit, applied: !result.atLimit };
        },
        [pinnedRoomIds, uid],
    );

    const activeRoomId = selectedRoomId === 'main' ? null : selectedRoomId;

    return {
        rooms,
        pinnedRoomIds,
        selectedRoomId,
        setSelectedRoomId,
        activeRoomId,
        createRoom,
        deleteRoom,
        togglePinRoom,
        roomsSoftMax: REPOSITORY_ROOMS_SOFT_MAX,
    };
}

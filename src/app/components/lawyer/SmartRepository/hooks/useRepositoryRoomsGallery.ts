import { useEffect, useMemo, useState } from 'react';
import { groupRepositoryRoomsByInitial } from '@/app/services/repository/repositoryRoomPresentation';
import type { RepositoryRoom } from '@/app/services/repository/repositoryRooms';
import { useRepositoryChromeDismiss } from './useRepositoryChromeDismiss';
import { filterRepositoryRoomsByQuery } from '../repositoryRoomsGalleryQuery';

type UseRepositoryRoomsGalleryParams = {
    open: boolean;
    rooms: RepositoryRoom[];
    pinnedRoomIds: string[];
    onClose: () => void;
};

export function useRepositoryRoomsGallery({
    open,
    rooms,
    pinnedRoomIds,
    onClose,
}: UseRepositoryRoomsGalleryParams) {
    const [query, setQuery] = useState('');
    const pinnedSet = useMemo(() => new Set(pinnedRoomIds), [pinnedRoomIds]);

    useEffect(() => {
        if (!open) setQuery('');
    }, [open]);

    useRepositoryChromeDismiss(open, onClose);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    const filtered = useMemo(
        () => filterRepositoryRoomsByQuery(rooms, query),
        [query, rooms],
    );
    const groups = useMemo(() => groupRepositoryRoomsByInitial(filtered), [filtered]);

    return { query, setQuery, pinnedSet, groups };
}

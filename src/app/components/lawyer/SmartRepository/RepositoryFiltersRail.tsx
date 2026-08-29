import React, { useEffect, useMemo, useState } from 'react';
import { registerRepositoryChromeDismiss } from './hooks/repositoryChromeDismiss';
import { createPortal } from 'react-dom';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { Layers } from '@/app/components/ui/icons/Layers';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { RepositoryRoom, RepositoryRoomFilter } from '@/app/services/repository/repositoryRooms';
import { buildRepositoryRoomCounts } from '@/app/services/repository/repositoryRoomPresentation';
import { REPO_FILTER_RAIL, REPO_ROOM_CHIP, REPO_ROOM_CHIP_ACTIVE } from './smartRepositoryTheme';
import { RepositoryRoomsGallery } from './RepositoryRoomsGallery';
import { RepositoryRoomMenu } from './RepositoryRoomMenu';
import { useRepositoryRoomMenu } from './hooks/useRepositoryRoomMenu';

type RepositoryFiltersRailProps = {
    docs: SmartVaultDoc[];
    notes?: GlobalNote[];
    rooms: RepositoryRoom[];
    pinnedRoomIds: string[];
    selectedRoomId: RepositoryRoomFilter;
    onSelectRoom: (filter: RepositoryRoomFilter) => void;
    onCreateRoom: (title: string) => void;
    onRemoveRoom: (roomId: string) => void;
    onTogglePinRoom: (roomId: string) => void;
};

function roomLabel(selectedRoomId: RepositoryRoomFilter, rooms: RepositoryRoom[]): string {
    if (selectedRoomId === 'main') return 'العام';
    return rooms.find((r) => r.id === selectedRoomId)?.title?.trim() || 'العام';
}

/** شريط الغرف فقط — التصنيف يعيش في نافذة البحث (VaultSearchFilterHub). */
export function RepositoryFiltersRail({
    docs,
    notes = [],
    rooms,
    pinnedRoomIds,
    selectedRoomId,
    onSelectRoom,
    onCreateRoom,
    onRemoveRoom,
    onTogglePinRoom,
}: RepositoryFiltersRailProps) {
    const [galleryOpen, setGalleryOpen] = useState(false);
    const [newRoomTitle, setNewRoomTitle] = useState('');
    const {
        roomMenuOpen,
        setRoomMenuOpen,
        creatingRoom,
        setCreatingRoom,
        menuPos,
        triggerRef,
        menuRef,
        closeMenu,
    } = useRepositoryRoomMenu(rooms.length);

    const countsByRoomId = useMemo(
        () => buildRepositoryRoomCounts(rooms.map((r) => r.id), notes, docs),
        [docs, notes, rooms],
    );

    const submitRoom = () => {
        const trimmed = newRoomTitle.trim();
        if (!trimmed) return;
        onCreateRoom(trimmed);
        setNewRoomTitle('');
        closeMenu();
    };

    const currentRoomTitle = roomLabel(selectedRoomId, rooms);

    useEffect(() => {
        if (!roomMenuOpen) return;
        return registerRepositoryChromeDismiss(() => {
            if (creatingRoom) {
                setCreatingRoom(false);
                setNewRoomTitle('');
                return true;
            }
            closeMenu();
            setNewRoomTitle('');
            return true;
        });
    }, [closeMenu, creatingRoom, roomMenuOpen, setCreatingRoom]);

    const roomMenu =
        roomMenuOpen && menuPos ? (
            <RepositoryRoomMenu
                menuRef={menuRef}
                pos={menuPos}
                creating={creatingRoom}
                newTitle={newRoomTitle}
                rooms={rooms}
                selectedRoomId={selectedRoomId}
                onNewTitleChange={setNewRoomTitle}
                onSubmit={submitRoom}
                onCancelCreate={() => {
                    setCreatingRoom(false);
                    setNewRoomTitle('');
                }}
                onSelectMain={() => {
                    onSelectRoom('main');
                    setRoomMenuOpen(false);
                }}
                onSelectRoom={(id) => {
                    onSelectRoom(id);
                    setRoomMenuOpen(false);
                }}
                onStartCreate={() => setCreatingRoom(true)}
                onOpenGallery={() => {
                    setRoomMenuOpen(false);
                    setGalleryOpen(true);
                }}
            />
        ) : null;

    return (
        <div className={REPO_FILTER_RAIL} dir="rtl" data-testid="repository-filter-row">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none touch-pan-x w-full min-w-0">
                <div className="relative shrink-0" data-testid="repository-rooms-row">
                    <button
                        ref={triggerRef}
                        type="button"
                        data-testid="repository-room-filter-trigger"
                        aria-haspopup="listbox"
                        aria-expanded={roomMenuOpen}
                        onClick={() => setRoomMenuOpen((v) => !v)}
                        className={selectedRoomId !== 'main' ? REPO_ROOM_CHIP_ACTIVE : REPO_ROOM_CHIP}
                    >
                        <Layers size={13} className="shrink-0 opacity-80" aria-hidden />
                        <span className="truncate max-w-[7.5rem]">{currentRoomTitle}</span>
                        <ChevronDown
                            size={13}
                            className={`shrink-0 transition-transform ${roomMenuOpen ? 'rotate-180' : ''}`}
                            aria-hidden
                        />
                    </button>
                    {typeof document !== 'undefined' && roomMenu
                        ? createPortal(roomMenu, document.body)
                        : null}
                </div>
            </div>

            <RepositoryRoomsGallery
                open={galleryOpen}
                rooms={rooms}
                pinnedRoomIds={pinnedRoomIds}
                selectedRoomId={selectedRoomId === 'main' ? null : selectedRoomId}
                countsByRoomId={countsByRoomId}
                onClose={() => setGalleryOpen(false)}
                onSelect={(id) => onSelectRoom(id)}
                onRemove={onRemoveRoom}
                onTogglePin={onTogglePinRoom}
            />
        </div>
    );
}

import React, { useMemo, useState } from 'react';
import { Check, FolderKanban, FolderPlus, X } from '@/app/components/ui/lucideIcons';
import {
    buildRepositoryRoomCounts,
    resolvePinnedRailRooms,
} from '@/app/services/repository/repositoryRoomPresentation';
import type { RepositoryRoom, RepositoryRoomFilter } from '@/app/services/repository/repositoryRooms';
import { REPO_INPUT, REPO_TOUCH_ICON } from './smartRepositoryTheme';
import { RepositoryRoomsGallery } from './RepositoryRoomsGallery';

const ROOM_PILL =
    'inline-flex items-center gap-1.5 shrink-0 min-h-[40px] px-3 rounded-full text-[11px] font-bold border touch-manipulation whitespace-nowrap transition-colors';
const ROOM_PILL_IDLE = `${ROOM_PILL} border-white/10 bg-white/[0.03] text-white/55 hover:border-[#E6C673]/25 hover:text-white/75`;
const ROOM_PILL_ACTIVE = `${ROOM_PILL} border-[#E6C673]/40 bg-[#E6C673]/14 text-[#E6C673]`;

const RAIL_ICON_BTN =
    `${REPO_TOUCH_ICON} !min-h-[40px] !min-w-[40px] rounded-xl border border-white/10 bg-white/[0.04] text-white/55 ` +
    'hover:border-[#E6C673]/30 hover:text-[#E6C673] hover:bg-[#E6C673]/10 transition-colors';

const RAIL_ICON_BTN_GOLD =
    `${REPO_TOUCH_ICON} !min-h-[40px] !min-w-[40px] rounded-xl border border-[#E6C673]/35 bg-[#E6C673]/12 text-[#E6C673] ` +
    'hover:bg-[#E6C673]/20 transition-colors';

type RepositoryRoomsRowProps = {
    rooms: RepositoryRoom[];
    pinnedRoomIds: string[];
    selectedRoomId: RepositoryRoomFilter;
    notes: { roomId?: string | null }[];
    docs: { roomId?: string | null }[];
    onSelect: (filter: RepositoryRoomFilter) => void;
    onCreate: (title: string) => void;
    onRemove: (roomId: string) => void;
    onTogglePin: (roomId: string) => void;
};

export function RepositoryRoomsRow({
    rooms,
    pinnedRoomIds,
    selectedRoomId,
    notes,
    docs,
    onSelect,
    onCreate,
    onRemove,
    onTogglePin,
}: RepositoryRoomsRowProps) {
    const [galleryOpen, setGalleryOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');

    const countsByRoomId = useMemo(
        () => buildRepositoryRoomCounts(rooms.map((r) => r.id), notes, docs),
        [docs, notes, rooms],
    );

    const { pinned, activeUnpinned } = useMemo(
        () => resolvePinnedRailRooms(rooms, pinnedRoomIds, selectedRoomId),
        [pinnedRoomIds, rooms, selectedRoomId],
    );

    const submitCreate = () => {
        const trimmed = newTitle.trim();
        if (!trimmed) return;
        onCreate(trimmed);
        setNewTitle('');
        setCreating(false);
    };

    const cancelCreate = () => {
        setCreating(false);
        setNewTitle('');
    };

    return (
        <div className="hami-repository-rooms-panel" dir="rtl" data-testid="repository-rooms-row">
            <div className="flex items-center justify-between gap-2 mb-1.5">
                <p className="text-[10px] font-bold tracking-wide text-white/40 px-0.5">الغرف</p>
                {!creating ? (
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            type="button"
                            onClick={() => setCreating(true)}
                            data-testid="repository-room-create"
                            className={RAIL_ICON_BTN_GOLD}
                            aria-label="إنشاء غرفة مخصصة"
                            title="إنشاء غرفة"
                        >
                            <FolderPlus size={15} aria-hidden />
                        </button>
                        {rooms.length > 0 ? (
                            <button
                                type="button"
                                onClick={() => setGalleryOpen(true)}
                                data-testid="repository-rooms-open-gallery"
                                className={`${RAIL_ICON_BTN} relative`}
                                aria-label={`عرض كل الغرف (${rooms.length})`}
                                title="كل الغرف"
                            >
                                <FolderKanban size={14} aria-hidden />
                                <span className="absolute -top-0.5 -start-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#E6C673]/90 text-[#0a0f1c] text-[8px] font-extrabold tabular-nums flex items-center justify-center leading-none">
                                    {rooms.length}
                                </span>
                            </button>
                        ) : null}
                    </div>
                ) : null}
            </div>

            {creating ? (
                <div className="flex items-center gap-2 w-full min-w-0" data-testid="repository-room-create-form">
                    <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') submitCreate();
                            if (e.key === 'Escape') cancelCreate();
                        }}
                        placeholder="اسم الموكل / الغرفة…"
                        autoFocus
                        data-testid="repository-room-new-title"
                        className={`${REPO_INPUT} !py-1.5 !px-3 text-xs flex-1 min-w-0 !min-h-[44px]`}
                    />
                    <button
                        type="button"
                        onClick={submitCreate}
                        disabled={!newTitle.trim()}
                        data-testid="repository-room-new-save"
                        aria-label="حفظ الغرفة"
                        className={`${REPO_TOUCH_ICON} rounded-xl border border-[#E6C673]/35 bg-[#E6C673]/12 text-[#E6C673] disabled:opacity-40`}
                    >
                        <Check size={15} />
                    </button>
                    <button
                        type="button"
                        onClick={cancelCreate}
                        aria-label="إلغاء الإنشاء"
                        className={`${REPO_TOUCH_ICON} rounded-xl border border-white/10 text-white/45`}
                    >
                        <X size={15} />
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto scrollbar-none touch-pan-x pb-0.5">
                    <button
                        type="button"
                        onClick={() => onSelect('main')}
                        data-testid="repository-room-filter-main"
                        className={selectedRoomId === 'main' ? ROOM_PILL_ACTIVE : ROOM_PILL_IDLE}
                    >
                        العام
                    </button>

                    {pinned.map((room) => {
                        const active = selectedRoomId === room.id;
                        return (
                            <button
                                key={room.id}
                                type="button"
                                onClick={() => onSelect(room.id)}
                                data-testid={`repository-room-filter-${room.id}`}
                                title={room.title}
                                className={active ? ROOM_PILL_ACTIVE : ROOM_PILL_IDLE}
                            >
                                {room.title}
                            </button>
                        );
                    })}

                    {activeUnpinned ? (
                        <button
                            type="button"
                            onClick={() => onSelect(activeUnpinned.id)}
                            data-testid={`repository-room-filter-${activeUnpinned.id}`}
                            title={`${activeUnpinned.title} — غير مثبتة`}
                            className={ROOM_PILL_ACTIVE}
                        >
                            {activeUnpinned.title}
                        </button>
                    ) : null}
                </div>
            )}

            <RepositoryRoomsGallery
                open={galleryOpen}
                rooms={rooms}
                pinnedRoomIds={pinnedRoomIds}
                selectedRoomId={selectedRoomId === 'main' ? null : selectedRoomId}
                countsByRoomId={countsByRoomId}
                onClose={() => setGalleryOpen(false)}
                onSelect={(id) => onSelect(id)}
                onRemove={onRemove}
                onTogglePin={onTogglePin}
            />
        </div>
    );
}

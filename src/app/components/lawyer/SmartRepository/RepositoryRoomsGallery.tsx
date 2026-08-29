import React from 'react';
import { createPortal } from 'react-dom';
import { Pin } from '@/app/components/ui/icons/Pin';
import { PinOff } from '@/app/components/ui/icons/PinOff';
import { Search } from '@/app/components/ui/icons/Search';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import { X } from '@/app/components/ui/icons/X';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';
import {
    REPOSITORY_PINNED_MAX,
    repositoryRoomInitial,
} from '@/app/services/repository/repositoryRoomPresentation';
import type { RepositoryRoom } from '@/app/services/repository/repositoryRooms';
import { REPO_INPUT, REPO_TOUCH_ICON } from './smartRepositoryTheme';
import { useRepositoryRoomsGallery } from './hooks/useRepositoryRoomsGallery';

type RepositoryRoomsGalleryProps = {
    open: boolean;
    rooms: RepositoryRoom[];
    pinnedRoomIds: string[];
    selectedRoomId: string | null;
    countsByRoomId: Map<string, number>;
    onClose: () => void;
    onSelect: (roomId: string) => void;
    onRemove: (roomId: string) => void;
    onTogglePin: (roomId: string) => void;
};

export function RepositoryRoomsGallery({
    open,
    rooms,
    pinnedRoomIds,
    selectedRoomId,
    countsByRoomId,
    onClose,
    onSelect,
    onRemove,
    onTogglePin,
}: RepositoryRoomsGalleryProps) {
    const { query, setQuery, pinnedSet, groups } = useRepositoryRoomsGallery({
        open,
        rooms,
        pinnedRoomIds,
        onClose,
    });
    const keyboardInset = useMobileKeyboardInset(open);

    if (!open || typeof document === 'undefined') return null;

    return createPortal(
        <>
            <button
                type="button"
                className="fixed inset-0 z-[138] bg-[#0A0F1C]/55"
                aria-label="إغلاق معرض الغرف"
                data-testid="repository-rooms-gallery-backdrop"
                onClick={onClose}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label="معرض الغرف المخصصة"
                data-testid="repository-rooms-gallery"
                dir="rtl"
                className="fixed z-[139] inset-x-3 top-[max(12px,env(safe-area-inset-top))] bottom-[max(12px,env(safe-area-inset-bottom))] sm:inset-auto sm:top-[12%] sm:left-1/2 sm:-translate-x-1/2 sm:w-[min(26rem,92vw)] sm:max-h-[72dvh] sm:bottom-auto flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0A0F1C]"
                style={
                    keyboardInset > 0
                        ? { paddingBottom: `max(12px, ${keyboardInset}px)` }
                        : undefined
                }
            >
                <div className="shrink-0 px-4 pt-3.5 pb-2.5 border-b border-white/[0.07]">
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="min-w-0">
                            <h2 className="text-sm font-medium text-[#F4F4F5]">كل الغرف</h2>
                            <p className="text-[10px] text-white/40 mt-0.5">
                                استعراض وتثبيت · حتى {REPOSITORY_PINNED_MAX} في الشريط · الإنشاء من الزر العلوي
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className={`${REPO_TOUCH_ICON} rounded-full border-0 text-white/50 hover:bg-white/[0.06]`}
                            aria-label="إغلاق"
                        >
                            <X size={15} />
                        </button>
                    </div>
                    <div className="relative">
                        <Search
                            size={13}
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#E6C673]/50"
                            aria-hidden
                        />
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="ابحث عن موكل…"
                            data-testid="repository-rooms-gallery-search"
                            autoFocus
                            inputMode="search"
                            enterKeyHint="search"
                            autoComplete="off"
                            className={`${REPO_INPUT} !py-2 !pr-9 !pl-3`}
                        />
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y px-2.5 py-2.5 space-y-3 [-webkit-overflow-scrolling:touch]">
                    {groups.length === 0 ? (
                        <p className="text-center text-xs text-white/40 py-8">لا توجد غرف مطابقة</p>
                    ) : (
                        groups.map((group) => (
                            <section key={group.letter} aria-label={`حرف ${group.letter}`}>
                                <div className="sticky top-0 z-[1] flex items-center gap-2 py-1 mb-1 bg-[#0A0F1C]/95">
                                    <span className="inline-flex size-6 items-center justify-center rounded-md bg-[#E6C673]/10 text-[#E6C673] text-[11px] font-medium">
                                        {group.letter}
                                    </span>
                                    <div className="h-px flex-1 bg-white/[0.06]" />
                                </div>
                                <ul className="space-y-1">
                                    {group.rooms.map((room) => {
                                        const active = selectedRoomId === room.id;
                                        const pinned = pinnedSet.has(room.id);
                                        const count = countsByRoomId.get(room.id) ?? 0;
                                        const initial = repositoryRoomInitial(room.title);
                                        return (
                                            <li key={room.id}>
                                                <div
                                                    className={`flex items-center gap-1 rounded-xl px-1.5 py-1 ${
                                                        active
                                                            ? 'bg-[#E6C673]/10'
                                                            : 'bg-white/[0.03]'
                                                    }`}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            onSelect(room.id);
                                                            onClose();
                                                        }}
                                                        data-testid={`repository-gallery-room-${room.id}`}
                                                        className="flex min-w-0 flex-1 items-center gap-2.5 min-h-[44px] px-1 text-right touch-manipulation"
                                                    >
                                                        <span
                                                            className={`inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-medium border-0 ${
                                                                active
                                                                    ? 'bg-[#E6C673]/15 text-[#E6C673]'
                                                                    : 'bg-white/[0.05] text-white/65'
                                                            }`}
                                                            aria-hidden
                                                        >
                                                            {initial}
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate text-[12px] font-medium text-[#F4F4F5]">
                                                                {room.title}
                                                            </span>
                                                            <span className="block text-[10px] text-white/35 tabular-nums">
                                                                {count > 0 ? `${count} عنصر` : 'فارغة'}
                                                                {pinned ? ' · مثبتة' : ''}
                                                            </span>
                                                        </span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => onTogglePin(room.id)}
                                                        aria-label={
                                                            pinned
                                                                ? `إلغاء تثبيت ${room.title}`
                                                                : `تثبيت ${room.title} في الأعلى`
                                                        }
                                                        data-testid={`repository-gallery-pin-${room.id}`}
                                                        className={`${REPO_TOUCH_ICON} rounded-lg ${
                                                            pinned
                                                                ? 'text-[#E6C673] bg-[#E6C673]/12'
                                                                : 'text-white/35 hover:text-[#E6C673]/80'
                                                        }`}
                                                    >
                                                        {pinned ? <Pin size={14} className="fill-current" /> : <PinOff size={14} />}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => onRemove(room.id)}
                                                        aria-label={`حذف غرفة ${room.title}`}
                                                        data-testid={`repository-gallery-remove-${room.id}`}
                                                        className={`${REPO_TOUCH_ICON} rounded-lg text-white/30 hover:text-rose-300`}
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        ))
                    )}
                </div>
            </div>
        </>,
        document.body,
    );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FolderInput } from '@/app/components/ui/lucideIcons';
import { groupRepositoryRoomsByInitial } from '@/app/services/repository/repositoryRoomPresentation';
import type { RepositoryRoom } from '@/app/services/repository/repositoryRooms';
import { REPO_CARD_ICON_BTN } from './smartRepositoryTheme';

const ROOM_SEARCH_THRESHOLD = 8;

type RepositoryMoveToRoomButtonProps = {
    rooms: RepositoryRoom[];
    currentRoomId?: string | null;
    disabled?: boolean;
    onMove: (roomId: string | null) => void | Promise<void>;
};

export function RepositoryMoveToRoomButton({
    rooms,
    currentRoomId,
    disabled,
    onMove,
}: RepositoryMoveToRoomButtonProps) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [query, setQuery] = useState('');
    const anchorRef = useRef<HTMLButtonElement>(null);
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 280 });

    const normalizedCurrent = currentRoomId?.trim() || null;
    const showSearch = rooms.length >= ROOM_SEARCH_THRESHOLD;

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return rooms;
        return rooms.filter(
            (r) =>
                r.title.toLowerCase().includes(q) ||
                (r.clientLabel?.toLowerCase().includes(q) ?? false),
        );
    }, [query, rooms]);

    const groups = useMemo(() => groupRepositoryRoomsByInitial(filtered), [filtered]);

    useEffect(() => {
        if (!open || !anchorRef.current) return;
        const rect = anchorRef.current.getBoundingClientRect();
        setMenuPos({
            top: rect.bottom + 6,
            left: Math.max(8, rect.right - 280),
            width: 280,
        });
    }, [open]);

    useEffect(() => {
        if (!open) setQuery('');
    }, [open]);

    useEffect(() => () => setOpen(false), []);

    if (rooms.length === 0) return null;

    const handlePick = async (roomId: string | null) => {
        if (normalizedCurrent === roomId) {
            setOpen(false);
            return;
        }
        setBusy(true);
        try {
            await onMove(roomId);
            setOpen(false);
        } finally {
            setBusy(false);
        }
    };

    const menu = open ? (
        <div
            className="fixed z-[136] rounded-2xl border border-[#E6C673]/20 bg-[#0a0f1c]/96 backdrop-blur-xl shadow-2xl p-2.5"
            style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
            dir="rtl"
            data-testid="repository-move-room-menu"
        >
            <p className="px-2 pb-1.5 text-[10px] font-bold text-[#E6C673]/70">نقل إلى…</p>
            {showSearch ? (
                <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="ابحث عن موكل…"
                    data-testid="repository-move-room-search"
                    className="w-full mb-2 px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm outline-none focus:border-[#E6C673]/35"
                />
            ) : null}
            <div className="max-h-56 overflow-y-auto overscroll-contain space-y-2">
                <button
                    type="button"
                    disabled={busy || normalizedCurrent == null}
                    onClick={() => void handlePick(null)}
                    className="w-full text-right px-3 min-h-[44px] rounded-xl text-sm font-bold text-white/80 hover:bg-white/[0.06] disabled:opacity-40 touch-manipulation"
                    data-testid="repository-move-room-main"
                >
                    المستودع العام
                </button>
                {groups.length === 0 ? (
                    <p className="text-xs text-white/45 text-center py-3">لا توجد غرف مطابقة</p>
                ) : (
                    groups.map((group) => (
                        <div key={group.letter}>
                            <p className="px-2 py-1 text-[10px] font-bold text-[#E6C673]/50">{group.letter}</p>
                            <div className="space-y-1">
                                {group.rooms.map((room) => {
                                    const active = normalizedCurrent === room.id;
                                    return (
                                        <button
                                            key={room.id}
                                            type="button"
                                            disabled={busy || active}
                                            onClick={() => void handlePick(room.id)}
                                            className="w-full text-right px-3 min-h-[44px] rounded-xl text-sm font-bold text-white truncate hover:bg-white/[0.06] disabled:opacity-40 touch-manipulation"
                                            data-testid={`repository-move-room-${room.id}`}
                                        >
                                            {room.title}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    ) : null;

    const backdrop =
        open && typeof document !== 'undefined' ? (
            <button
                type="button"
                className="fixed inset-0 z-[135] cursor-default bg-transparent"
                aria-label="إغلاق قائمة النقل"
                onClick={() => setOpen(false)}
            />
        ) : null;

    return (
        <>
            <button
                ref={anchorRef}
                type="button"
                disabled={disabled || busy}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpen((v) => !v);
                }}
                className={`${REPO_CARD_ICON_BTN} relative z-[2] pointer-events-auto disabled:opacity-50`}
                aria-label="نقل بين المستودع العام والغرف"
                data-testid="repository-move-to-room"
            >
                <FolderInput size={14} />
            </button>
            {typeof document !== 'undefined' && backdrop ? createPortal(backdrop, document.body) : null}
            {typeof document !== 'undefined' && menu ? createPortal(menu, document.body) : null}
        </>
    );
}

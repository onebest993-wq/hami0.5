import React from 'react';
import { Check } from '@/app/components/ui/icons/Check';
import { FolderPlus } from '@/app/components/ui/icons/FolderPlus';
import { Settings2 } from '@/app/components/ui/icons/Settings2';
import type { RepositoryRoom } from '@/app/services/repository/repositoryRooms';
import {
    REPO_INPUT,
    REPO_ROOM_MENU,
    REPO_ROOM_MENU_ACTION,
    REPO_ROOM_MENU_FOOTER,
    REPO_ROOM_MENU_ITEM,
    REPO_ROOM_MENU_SCROLL,
    REPO_TOUCH_ICON,
} from './smartRepositoryTheme';
import type { AnchoredPopoverPos } from './anchoredPopoverPos';

type RepositoryRoomMenuProps = {
    menuRef: React.RefObject<HTMLDivElement | null>;
    pos: AnchoredPopoverPos;
    creating: boolean;
    newTitle: string;
    rooms: RepositoryRoom[];
    selectedRoomId: string;
    onNewTitleChange: (value: string) => void;
    onSubmit: () => void;
    onCancelCreate: () => void;
    onSelectMain: () => void;
    onSelectRoom: (roomId: string) => void;
    onStartCreate: () => void;
    onOpenGallery: () => void;
};

export function RepositoryRoomMenu({
    menuRef,
    pos,
    creating,
    newTitle,
    rooms,
    selectedRoomId,
    onNewTitleChange,
    onSubmit,
    onCancelCreate,
    onSelectMain,
    onSelectRoom,
    onStartCreate,
    onOpenGallery,
}: RepositoryRoomMenuProps) {
    return (
        <div
            ref={menuRef}
            role="listbox"
            className={`${REPO_ROOM_MENU} fixed`}
            data-testid="repository-room-menu"
            dir="rtl"
            style={{
                top: pos.top,
                left: pos.left,
                width: pos.width,
                maxHeight: pos.maxHeight,
            }}
        >
            {creating ? (
                <div className="flex items-center gap-1.5 p-2" data-testid="repository-room-create-form">
                    <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => onNewTitleChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onSubmit();
                            if (e.key === 'Escape') onCancelCreate();
                        }}
                        placeholder="اسم الموكل / الغرفة…"
                        autoFocus
                        data-testid="repository-room-new-title"
                        className={`${REPO_INPUT} !py-1.5 !px-2 text-base flex-1 min-w-0 !min-h-[44px]`}
                    />
                    <button
                        type="button"
                        onClick={onSubmit}
                        disabled={!newTitle.trim()}
                        data-testid="repository-room-new-save"
                        aria-label="حفظ الغرفة"
                        className={`${REPO_TOUCH_ICON} rounded-lg bg-[#E6C673] text-[#0A0F1C] disabled:opacity-40`}
                    >
                        <Check size={14} />
                    </button>
                </div>
            ) : (
                <>
                    <div className={REPO_ROOM_MENU_SCROLL} role="presentation">
                        <button
                            type="button"
                            role="option"
                            aria-selected={selectedRoomId === 'main'}
                            data-testid="repository-room-filter-main"
                            className={REPO_ROOM_MENU_ITEM}
                            onClick={(event) => {
                                event.stopPropagation();
                                onSelectMain();
                            }}
                        >
                            العام
                            {selectedRoomId === 'main' ? (
                                <Check size={14} className="text-[#E6C673]" aria-hidden />
                            ) : null}
                        </button>
                        {rooms.map((room) => (
                            <button
                                key={room.id}
                                type="button"
                                role="option"
                                aria-selected={selectedRoomId === room.id}
                                data-testid={`repository-room-filter-${room.id}`}
                                title={room.title}
                                className={REPO_ROOM_MENU_ITEM}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onSelectRoom(room.id);
                                }}
                            >
                                <span className="truncate">{room.title}</span>
                                {selectedRoomId === room.id ? (
                                    <Check size={14} className="text-[#E6C673] shrink-0" aria-hidden />
                                ) : null}
                            </button>
                        ))}
                    </div>
                    <div className={REPO_ROOM_MENU_FOOTER}>
                        <button
                            type="button"
                            data-testid="repository-room-create"
                            className={REPO_ROOM_MENU_ACTION}
                            onClick={onStartCreate}
                        >
                            <FolderPlus size={14} aria-hidden />
                            غرفة جديدة
                        </button>
                        {rooms.length > 0 ? (
                            <button
                                type="button"
                                data-testid="repository-rooms-open-gallery"
                                className={REPO_ROOM_MENU_ITEM}
                                onClick={onOpenGallery}
                            >
                                <Settings2 size={14} aria-hidden />
                                إدارة الغرف ({rooms.length})
                            </button>
                        ) : null}
                    </div>
                </>
            )}
        </div>
    );
}

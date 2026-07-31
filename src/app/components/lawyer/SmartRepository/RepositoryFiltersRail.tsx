import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, FolderPlus, Layers, Plus, Settings2, X } from 'lucide-react';
import {
    countDocsInCategory,
    countRepositoryCategoryItems,
    getVisibleVaultCustomCategories,
    isRepositoryActionCategory,
    REPOSITORY_ACTION_CATEGORY,
    categoryMatchesName,
} from '@/app/services/vaultCustomCategories';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { RepositoryFeedFilter } from '@/app/services/repository/repositoryUnifiedFeed';
import type { RepositoryRoom, RepositoryRoomFilter } from '@/app/services/repository/repositoryRooms';
import { buildRepositoryRoomCounts } from '@/app/services/repository/repositoryRoomPresentation';
import {
    REPO_FILTER_CHIP,
    REPO_FILTER_CHIP_ACTIVE,
    REPO_FILTER_RAIL,
    REPO_INPUT,
    REPO_ROOM_CHIP,
    REPO_ROOM_CHIP_ACTIVE,
    REPO_ROOM_MENU,
    REPO_ROOM_MENU_ACTION,
    REPO_ROOM_MENU_FOOTER,
    REPO_ROOM_MENU_ITEM,
    REPO_ROOM_MENU_SCROLL,
    REPO_TOUCH_ICON,
} from './smartRepositoryTheme';
import { RepositoryRoomsGallery } from './RepositoryRoomsGallery';

const ACTION_FILTER_CHIPS: ReadonlyArray<{ label: string; value: string }> = [
    { label: 'الكل', value: 'الكل' },
    { label: 'بطاقة', value: REPOSITORY_ACTION_CATEGORY.note },
    { label: 'مسح', value: REPOSITORY_ACTION_CATEGORY.scan },
    { label: 'صورة', value: REPOSITORY_ACTION_CATEGORY.image },
    { label: 'PDF', value: REPOSITORY_ACTION_CATEGORY.pdf },
    { label: 'تسجيل', value: REPOSITORY_ACTION_CATEGORY.voice },
];

const MENU_MAX_H = 352;

type MenuPos = { top: number; left: number; width: number; maxHeight: number };

type RepositoryFiltersRailProps = {
    activeFilter: string;
    customCategories?: string[];
    docs: SmartVaultDoc[];
    notes?: GlobalNote[];
    rooms: RepositoryRoom[];
    pinnedRoomIds: string[];
    selectedRoomId: RepositoryRoomFilter;
    onSelectRoom: (filter: RepositoryRoomFilter) => void;
    onCreateRoom: (title: string) => void;
    onRemoveRoom: (roomId: string) => void;
    onTogglePinRoom: (roomId: string) => void;
    onFilterChange: (filter: string) => void;
    onAddCategory?: (name: string) => void;
    onRemoveCategory?: (name: string) => void;
    onMainFilterChange?: (filter: RepositoryFeedFilter) => void;
};

function isChipActive(activeFilter: string, value: string): boolean {
    if (value === 'الكل') return !activeFilter || activeFilter === 'الكل';
    if (activeFilter === value) return true;
    return categoryMatchesName(activeFilter, value);
}

function roomLabel(selectedRoomId: RepositoryRoomFilter, rooms: RepositoryRoom[]): string {
    if (selectedRoomId === 'main') return 'العام';
    return rooms.find((r) => r.id === selectedRoomId)?.title?.trim() || 'العام';
}

function computeMenuPos(anchor: HTMLElement): MenuPos {
    const rect = anchor.getBoundingClientRect();
    const width = Math.max(rect.width, 240);
    const gap = 6;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spaceBelow = vh - rect.bottom - gap - 8;
    const spaceAbove = rect.top - gap - 8;
    const preferBelow = spaceBelow >= Math.min(220, MENU_MAX_H) || spaceBelow >= spaceAbove;
    const maxHeight = Math.min(
        MENU_MAX_H,
        Math.round(vh * 0.52),
        preferBelow ? Math.max(160, spaceBelow) : Math.max(160, spaceAbove),
    );
    const top = preferBelow
        ? rect.bottom + gap
        : Math.max(8, rect.top - gap - maxHeight);
    // RTL: محاذاة الحافة اليمنى للزر
    let left = rect.right - width;
    left = Math.max(8, Math.min(left, vw - width - 8));
    return { top, left, width, maxHeight };
}

/**
 * شريط فلاتر موحّد: منتقي الغرفة + رقائق النوع/التصنيف — بلا صندوق «الغرف» المنفصل.
 */
export function RepositoryFiltersRail({
    activeFilter,
    customCategories,
    docs,
    notes = [],
    rooms,
    pinnedRoomIds,
    selectedRoomId,
    onSelectRoom,
    onCreateRoom,
    onRemoveRoom,
    onTogglePinRoom,
    onFilterChange,
    onAddCategory,
    onRemoveCategory = () => undefined,
    onMainFilterChange,
}: RepositoryFiltersRailProps) {
    const customCategoriesSafe = customCategories ?? [];
    const [roomMenuOpen, setRoomMenuOpen] = useState(false);
    const [galleryOpen, setGalleryOpen] = useState(false);
    const [creatingRoom, setCreatingRoom] = useState(false);
    const [newRoomTitle, setNewRoomTitle] = useState('');
    const [creatingCategory, setCreatingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const countsByRoomId = useMemo(
        () => buildRepositoryRoomCounts(rooms.map((r) => r.id), notes, docs),
        [docs, notes, rooms],
    );

    const customOnlyCategories = useMemo(() => {
        const visible = getVisibleVaultCustomCategories([
            ...customCategoriesSafe,
            ...docs.map((d) => d.customCategory?.trim() || '').filter(Boolean),
        ]);
        return visible.filter((c) => !isRepositoryActionCategory(c));
    }, [customCategoriesSafe, docs]);

    useLayoutEffect(() => {
        if (!roomMenuOpen || !triggerRef.current) {
            setMenuPos(null);
            return;
        }
        const update = () => {
            if (triggerRef.current) setMenuPos(computeMenuPos(triggerRef.current));
        };
        update();
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [roomMenuOpen, creatingRoom, rooms.length]);

    useEffect(() => {
        if (!roomMenuOpen) return;
        const onDoc = (e: MouseEvent) => {
            const t = e.target as Node;
            if (triggerRef.current?.contains(t)) return;
            if (menuRef.current?.contains(t)) return;
            setRoomMenuOpen(false);
            setCreatingRoom(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setRoomMenuOpen(false);
                setCreatingRoom(false);
            }
        };
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDoc);
            document.removeEventListener('keydown', onKey);
        };
    }, [roomMenuOpen]);

    const selectFilter = (value: string) => {
        onMainFilterChange?.('all');
        onFilterChange(value);
    };

    const submitRoom = () => {
        const trimmed = newRoomTitle.trim();
        if (!trimmed) return;
        onCreateRoom(trimmed);
        setNewRoomTitle('');
        setCreatingRoom(false);
        setRoomMenuOpen(false);
    };

    const submitCategory = () => {
        const trimmed = newCategoryName.trim();
        if (!trimmed || !onAddCategory) return;
        onAddCategory(trimmed);
        selectFilter(trimmed);
        setNewCategoryName('');
        setCreatingCategory(false);
    };

    const currentRoomTitle = roomLabel(selectedRoomId, rooms);

    const roomMenu =
        roomMenuOpen && menuPos ? (
            <div
                ref={menuRef}
                role="listbox"
                className={`${REPO_ROOM_MENU} fixed`}
                data-testid="repository-room-menu"
                dir="rtl"
                style={{
                    top: menuPos.top,
                    left: menuPos.left,
                    width: menuPos.width,
                    maxHeight: menuPos.maxHeight,
                }}
            >
                {creatingRoom ? (
                    <div className="flex items-center gap-1.5 p-2" data-testid="repository-room-create-form">
                        <input
                            type="text"
                            value={newRoomTitle}
                            onChange={(e) => setNewRoomTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') submitRoom();
                                if (e.key === 'Escape') {
                                    setCreatingRoom(false);
                                    setNewRoomTitle('');
                                }
                            }}
                            placeholder="اسم الموكل / الغرفة…"
                            autoFocus
                            data-testid="repository-room-new-title"
                            className={`${REPO_INPUT} !py-1.5 !px-2 text-xs flex-1 min-w-0 !min-h-[40px]`}
                        />
                        <button
                            type="button"
                            onClick={submitRoom}
                            disabled={!newRoomTitle.trim()}
                            data-testid="repository-room-new-save"
                            aria-label="حفظ الغرفة"
                            className={`${REPO_TOUCH_ICON} !min-h-[40px] !min-w-[40px] rounded-lg border border-[#E6C673]/80 bg-[#E6C673]/90 text-[#0A0F1C] disabled:opacity-40`}
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
                                onClick={() => {
                                    onSelectRoom('main');
                                    setRoomMenuOpen(false);
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
                                    onClick={() => {
                                        onSelectRoom(room.id);
                                        setRoomMenuOpen(false);
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
                                onClick={() => setCreatingRoom(true)}
                            >
                                <FolderPlus size={14} aria-hidden />
                                غرفة جديدة
                            </button>
                            {rooms.length > 0 ? (
                                <button
                                    type="button"
                                    data-testid="repository-rooms-open-gallery"
                                    className={REPO_ROOM_MENU_ITEM}
                                    onClick={() => {
                                        setRoomMenuOpen(false);
                                        setGalleryOpen(true);
                                    }}
                                >
                                    <Settings2 size={14} aria-hidden />
                                    إدارة الغرف ({rooms.length})
                                </button>
                            ) : null}
                        </div>
                    </>
                )}
            </div>
        ) : null;

    return (
        <div className={REPO_FILTER_RAIL} dir="rtl" data-testid="repository-filter-row">
            {creatingCategory ? (
                <div className="flex items-center gap-2 w-full min-w-0 px-0">
                    <input
                        type="text"
                        data-testid="smart-vault-new-category"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') submitCategory();
                            if (e.key === 'Escape') {
                                setCreatingCategory(false);
                                setNewCategoryName('');
                            }
                        }}
                        placeholder="اسم التصنيف..."
                        autoFocus
                        className={`${REPO_INPUT} !py-2 !px-3 text-xs flex-1 min-w-0 !min-h-[44px]`}
                    />
                    <button
                        type="button"
                        onClick={submitCategory}
                        disabled={!newCategoryName.trim()}
                        data-testid="smart-vault-new-category-save"
                        aria-label="حفظ التصنيف"
                        className={`${REPO_TOUCH_ICON} rounded-xl border border-[#E6C673]/80 bg-[#E6C673]/90 text-[#0A0F1C] disabled:opacity-40`}
                    >
                        <Check size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setCreatingCategory(false);
                            setNewCategoryName('');
                        }}
                        aria-label="إلغاء"
                        className={`${REPO_TOUCH_ICON} rounded-xl border border-white/10 text-white/50`}
                    >
                        <X size={16} />
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none touch-pan-x w-full min-w-0">
                    <div className="relative shrink-0" data-testid="repository-rooms-row">
                        <button
                            ref={triggerRef}
                            type="button"
                            data-testid="repository-room-filter-trigger"
                            aria-haspopup="listbox"
                            aria-expanded={roomMenuOpen}
                            onClick={() => setRoomMenuOpen((v) => !v)}
                            className={
                                selectedRoomId !== 'main' ? REPO_ROOM_CHIP_ACTIVE : REPO_ROOM_CHIP
                            }
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

                    {ACTION_FILTER_CHIPS.map((chip) => {
                        const active = isChipActive(activeFilter, chip.value);
                        const count =
                            chip.value === 'الكل'
                                ? undefined
                                : countRepositoryCategoryItems(docs, notes, chip.value);
                        return (
                            <button
                                key={chip.value}
                                type="button"
                                data-testid={
                                    chip.value === 'الكل'
                                        ? 'repository-filter-all'
                                        : `smart-vault-filter-${chip.value}`
                                }
                                onClick={() => selectFilter(chip.value)}
                                className={active ? REPO_FILTER_CHIP_ACTIVE : REPO_FILTER_CHIP}
                            >
                                <span>{chip.label}</span>
                                {typeof count === 'number' && count > 0 ? (
                                    <span className="opacity-70 tabular-nums text-[10px]">{count}</span>
                                ) : null}
                            </button>
                        );
                    })}

                    {customOnlyCategories.map((category) => {
                        const count = countDocsInCategory(docs, category);
                        const isActive = activeFilter === category;
                        return (
                            <div
                                key={category}
                                className={`${isActive ? REPO_FILTER_CHIP_ACTIVE : REPO_FILTER_CHIP} gap-0.5 !px-1 max-w-[9rem]`}
                            >
                                <button
                                    type="button"
                                    onClick={() => selectFilter(isActive ? 'الكل' : category)}
                                    data-testid={`smart-vault-filter-${category}`}
                                    title={category}
                                    className="min-w-0 flex-1 truncate text-right px-2 min-h-[44px] inline-flex items-center"
                                >
                                    <span className="truncate">{category}</span>
                                    {count > 0 ? (
                                        <span className="mr-1 opacity-70 tabular-nums text-[10px]">
                                            ({count})
                                        </span>
                                    ) : null}
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveCategory(category);
                                    }}
                                    aria-label={`حذف تصنيف ${category}`}
                                    className={`${REPO_TOUCH_ICON} !min-w-[36px] !min-h-[36px] rounded-lg hover:bg-rose-500/20 text-inherit opacity-70 hover:opacity-100`}
                                >
                                    <X size={11} strokeWidth={2.5} />
                                </button>
                            </div>
                        );
                    })}

                    {onAddCategory ? (
                        <button
                            type="button"
                            onClick={() => setCreatingCategory(true)}
                            data-testid="smart-vault-add-category"
                            aria-label="تصنيف مخصص"
                            title="تصنيف مخصص"
                            className={REPO_FILTER_CHIP}
                        >
                            <Plus size={14} aria-hidden />
                            <span>تصنيف</span>
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
                onSelect={(id) => onSelectRoom(id)}
                onRemove={onRemoveRoom}
                onTogglePin={onTogglePinRoom}
            />
        </div>
    );
}

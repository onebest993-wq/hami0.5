import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Columns3, GalleryHorizontal, LayoutGrid, List, Rows3 } from 'lucide-react';
import {
    REPOSITORY_FEED_LAYOUT_OPTIONS,
    repositoryFeedLayoutLabel,
    type RepositoryFeedLayoutId,
} from './repositoryFeedLayout';
import { REPO_ACTION_BTN } from './smartRepositoryTheme';

const LAYOUT_ICONS: Record<RepositoryFeedLayoutId, React.ReactNode> = {
    grid: <LayoutGrid size={17} strokeWidth={2.25} />,
    list: <List size={17} strokeWidth={2.25} />,
    compact: <Rows3 size={17} strokeWidth={2.25} />,
    timeline: <Columns3 size={17} strokeWidth={2.25} />,
    gallery: <GalleryHorizontal size={17} strokeWidth={2.25} />,
};

type MenuPosition = { top: number; left: number; width: number };

type RepositoryViewLayoutPickerProps = {
    layoutId: RepositoryFeedLayoutId;
    onSelect: (id: RepositoryFeedLayoutId) => void;
    disabled?: boolean;
};

function measureMenuPosition(anchor: HTMLElement, menuHeight: number): MenuPosition {
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(window.innerWidth - 20, 272);
    const left = Math.max(10, Math.min(rect.right - width, window.innerWidth - width - 10));
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < menuHeight + 12 && spaceAbove > spaceBelow;
    const top = openUp
        ? Math.max(10, rect.top - menuHeight - 8)
        : Math.min(window.innerHeight - menuHeight - 10, rect.bottom + 8);
    return { top, left, width };
}

export function RepositoryViewLayoutPicker({
    layoutId,
    onSelect,
    disabled = false,
}: RepositoryViewLayoutPickerProps) {
    const [open, setOpen] = useState(false);
    const anchorRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuPos, setMenuPos] = useState<MenuPosition>({ top: 0, left: 0, width: 272 });

    const close = useCallback(() => setOpen(false), []);

    const updateMenuPosition = useCallback(() => {
        if (!anchorRef.current) return;
        const measured = menuRef.current?.offsetHeight ?? 280;
        setMenuPos(measureMenuPosition(anchorRef.current, measured));
    }, []);

    useEffect(() => {
        if (!open) return;
        updateMenuPosition();
        const onPointer = (e: MouseEvent | TouchEvent) => {
            const target = e.target as Node;
            if (anchorRef.current?.contains(target)) return;
            if (menuRef.current?.contains(target)) return;
            close();
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close();
        };
        const onLayout = () => updateMenuPosition();
        document.addEventListener('mousedown', onPointer);
        document.addEventListener('touchstart', onPointer);
        window.addEventListener('keydown', onKey);
        window.addEventListener('resize', onLayout);
        window.addEventListener('scroll', onLayout, true);
        return () => {
            document.removeEventListener('mousedown', onPointer);
            document.removeEventListener('touchstart', onPointer);
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('resize', onLayout);
            window.removeEventListener('scroll', onLayout, true);
        };
    }, [close, open, updateMenuPosition]);

    useEffect(() => {
        if (!open) return;
        updateMenuPosition();
    }, [open, updateMenuPosition]);

    const pick = useCallback(
        (id: RepositoryFeedLayoutId) => {
            onSelect(id);
            close();
        },
        [close, onSelect],
    );

    const menu = open ? (
        <div
            ref={menuRef}
            role="listbox"
            aria-label="اختر شكل عرض البطاقات"
            className="fixed z-[200] rounded-2xl border border-white/12 bg-[#0A0F1C]/96 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.45)] p-1.5"
            style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
            dir="rtl"
        >
            <p className="px-2.5 pt-1.5 pb-2 text-[10px] font-bold text-white/40">شكل البطاقات</p>
            {REPOSITORY_FEED_LAYOUT_OPTIONS.map((opt) => {
                const active = opt.id === layoutId;
                return (
                    <button
                        key={opt.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        data-testid={`repository-layout-${opt.id}`}
                        onClick={() => pick(opt.id)}
                        className={`w-full flex items-center gap-2.5 rounded-xl px-2.5 min-h-[44px] text-right transition-colors touch-manipulation ${
                            active
                                ? 'bg-[#E6C673]/12 border border-[#E6C673]/28'
                                : 'border border-transparent hover:bg-white/[0.05]'
                        }`}
                    >
                        <span className={`mt-0.5 shrink-0 ${active ? 'text-[#E6C673]' : 'text-white/45'}`}>
                            {LAYOUT_ICONS[opt.id]}
                        </span>
                        <span className="flex-1 min-w-0">
                            <span
                                className={`block text-[11px] font-bold ${
                                    active ? 'text-[#E6C673]' : 'text-white/85'
                                }`}
                            >
                                {opt.label}
                            </span>
                            <span className="block text-[9px] text-white/45 leading-snug mt-0.5">{opt.hint}</span>
                        </span>
                        {active ? (
                            <Check size={14} className="shrink-0 text-[#E6C673] mt-1" aria-hidden />
                        ) : null}
                    </button>
                );
            })}
        </div>
    ) : null;

    return (
        <>
            <button
                ref={anchorRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                disabled={disabled}
                className={`${REPO_ACTION_BTN} border-white/14 bg-white/[0.05] text-white/65 hover:bg-white/[0.08] hover:border-white/22 hover:text-[#E6C673] ${
                    open ? 'border-[#E6C673]/35 bg-[#E6C673]/10 text-[#E6C673]' : ''
                } ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
                data-testid="repository-view-toggle"
                aria-expanded={open}
                aria-haspopup="listbox"
            >
                {LAYOUT_ICONS[layoutId]}
                <span>{repositoryFeedLayoutLabel(layoutId)}</span>
            </button>
            {typeof document !== 'undefined' && menu ? createPortal(menu, document.body) : null}
        </>
    );
}

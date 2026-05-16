import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';

const MENU_MIN_W = 160;
const PORTAL_Z = 25000;

export interface JudicialCustodianCardMenuProps {
    onEdit: () => void;
    onDelete: () => void;
}

/**
 * قائمة ⋮ لبطاقة الحارس — تُعرض عبر portal لتجاوز overflow البطاقات.
 */
export const JudicialCustodianCardMenu: React.FC<JudicialCustodianCardMenuProps> = ({
    onEdit,
    onDelete,
}) => {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

    const updatePosition = useCallback(() => {
        const btn = buttonRef.current;
        if (!btn || !open) return;
        const r = btn.getBoundingClientRect();
        let left = r.right - MENU_MIN_W;
        left = Math.max(8, Math.min(left, window.innerWidth - MENU_MIN_W - 8));
        setPos({ top: r.bottom + 6, left });
    }, [open]);

    useLayoutEffect(() => {
        if (!open) {
            setPos(null);
            return;
        }
        updatePosition();
    }, [open, updatePosition]);

    useEffect(() => {
        if (!open) return;
        const onScrollResize = () => updatePosition();
        window.addEventListener('scroll', onScrollResize, true);
        window.addEventListener('resize', onScrollResize);
        return () => {
            window.removeEventListener('scroll', onScrollResize, true);
            window.removeEventListener('resize', onScrollResize);
        };
    }, [open, updatePosition]);

    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => {
            const t = e.target as Node;
            if (rootRef.current?.contains(t)) return;
            if (menuRef.current?.contains(t)) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', onDoc, true);
        return () => document.removeEventListener('mousedown', onDoc, true);
    }, [open]);

    const pick = useCallback((fn: () => void) => {
        fn();
        setOpen(false);
    }, []);

    const menuPortal =
        open &&
        pos &&
        typeof document !== 'undefined' &&
        createPortal(
            <div
                ref={menuRef}
                className="min-w-[10rem] rounded-xl border border-white/15 bg-[#0A0F1C]/98 backdrop-blur-xl shadow-2xl py-1 text-right"
                style={{
                    position: 'fixed',
                    top: pos.top,
                    left: pos.left,
                    zIndex: PORTAL_Z,
                }}
                dir="rtl"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    className="flex w-full flex-row-reverse items-center gap-2 px-3 py-2 text-right text-[11px] font-bold text-slate-100 hover:bg-white/10"
                    onClick={() => pick(onEdit)}
                >
                    <Pencil size={12} strokeWidth={2} className="shrink-0 text-amber-200/80" />
                    تعديل
                </button>
                <button
                    type="button"
                    className="flex w-full flex-row-reverse items-center gap-2 px-3 py-2 text-right text-[11px] font-bold text-rose-200 hover:bg-rose-500/15"
                    onClick={() => pick(onDelete)}
                >
                    <Trash2 size={12} strokeWidth={2} className="shrink-0" />
                    حذف
                </button>
            </div>,
            document.body
        );

    return (
        <div ref={rootRef} className="relative shrink-0">
            <button
                ref={buttonRef}
                type="button"
                aria-expanded={open}
                aria-haspopup="menu"
                aria-label="خيارات الحارس"
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen((v) => !v);
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.06] bg-transparent text-slate-400 transition hover:border-amber-500/20 hover:bg-white/[0.04] hover:text-amber-200/90 active:scale-[0.97]"
            >
                <MoreVertical size={15} strokeWidth={2} />
            </button>
            {menuPortal}
        </div>
    );
};

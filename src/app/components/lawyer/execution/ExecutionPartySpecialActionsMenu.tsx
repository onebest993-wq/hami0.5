import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

const MENU_MIN_W = 176;
const PORTAL_Z = 25000;

export type ExecutionPartySpecialActionsVariant = 'creditor' | 'debtor';

export interface ExecutionPartySpecialActionsMenuProps {
    variant: ExecutionPartySpecialActionsVariant;
    /** عنوان بند الدائن في القائمة (الافتراضي: الإبلاغ عن وفاة الدائن) */
    creditorDeathEntryLabel?: string;
    /** عنوان بند المدين في القائمة (الافتراضي: الإبلاغ عن وفاة المدين) */
    debtorDeathEntryLabel?: string;
    onReportCreditorDeath?: () => void;
    onReportDebtorDeath?: () => void;
    /** true = موظف، false = كاسب — لتعطيل التحويل إلى كاسب عند الإيقاف */
    debtorIsEmployee?: boolean;
    /** نص زر التبديل (يُشتق من المسار الأصلي + الحالة الحالية في الـ Dashboard) */
    debtorEmploymentToggleLabel?: string;
    onToggleDebtorEmployment?: () => void;
    /** تعطيل التحويل إلى كاسب فقط (مثلاً إضبارة موقوفة) */
    debtorEmploymentToggleToKasabDisabled?: boolean;
    /** إخفاء خيار تغيير الحالة الوظيفية (مثلاً عند وفاة المدين) */
    hideDebtorEmploymentToggle?: boolean;
    /** معاينة تاريخية — إخفاء القائمة بالكامل */
    isHistoricalMode?: boolean;
}

/**
 * قائمة ⋮ — تُعرض عبر portal على document.body لتجاوز overflow البطاقات وسياقات z-index.
 */
export const ExecutionPartySpecialActionsMenu: React.FC<ExecutionPartySpecialActionsMenuProps> = ({
    variant,
    creditorDeathEntryLabel = 'الإبلاغ عن وفاة الدائن',
    debtorDeathEntryLabel = 'الإبلاغ عن وفاة المدين',
    onReportCreditorDeath,
    onReportDebtorDeath,
    debtorIsEmployee,
    debtorEmploymentToggleLabel,
    onToggleDebtorEmployment,
    debtorEmploymentToggleToKasabDisabled,
    hideDebtorEmploymentToggle,
    isHistoricalMode = false,
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

    useEffect(() => {
        if (isHistoricalMode) setOpen(false);
    }, [isHistoricalMode]);

    const pick = useCallback(
        (fn?: () => void) => {
            fn?.();
            setOpen(false);
        },
        []
    );

    const menuPortal =
        open &&
        pos &&
        typeof document !== 'undefined' &&
        createPortal(
            <div
                ref={menuRef}
                className="min-w-[11rem] rounded-xl border border-white/15 bg-[#0A0F1C]/98 backdrop-blur-xl shadow-2xl py-1 text-right"
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
                {variant === 'creditor' && (
                    <button
                        type="button"
                        className="w-full px-3 py-2 text-right text-[11px] font-bold text-slate-100 hover:bg-white/10"
                        onClick={() => pick(onReportCreditorDeath)}
                    >
                        {creditorDeathEntryLabel}
                    </button>
                )}
                {variant === 'debtor' && (
                    <>
                        <button
                            type="button"
                            className="w-full px-3 py-2 text-right text-[11px] font-bold text-slate-100 hover:bg-white/10"
                            onClick={() => pick(onReportDebtorDeath)}
                        >
                            {debtorDeathEntryLabel}
                        </button>
                        {!hideDebtorEmploymentToggle &&
                            typeof debtorIsEmployee === 'boolean' &&
                            onToggleDebtorEmployment && (
                            <button
                                type="button"
                                disabled={
                                    debtorIsEmployee === true &&
                                    Boolean(debtorEmploymentToggleToKasabDisabled)
                                }
                                className="w-full px-3 py-2 text-right text-[11px] font-bold text-slate-100 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                                onClick={() => {
                                    if (
                                        debtorIsEmployee === true &&
                                        debtorEmploymentToggleToKasabDisabled
                                    ) {
                                        return;
                                    }
                                    pick(onToggleDebtorEmployment);
                                }}
                            >
                                {debtorEmploymentToggleLabel ??
                                    (debtorIsEmployee === true
                                        ? 'إنهاء الحالة الوظيفية (تحويل إلى كاسب)'
                                        : 'إعادة تفعيل الوظيفة (تحويل إلى موظف)')}
                            </button>
                        )}
                    </>
                )}
            </div>,
            document.body
        );

    if (isHistoricalMode) return null;

    return (
        <div ref={rootRef} className="relative ms-2 me-1 shrink-0">
            <button
                ref={buttonRef}
                type="button"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-colors"
                aria-label="إجراءات إضافية"
                aria-expanded={open}
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen((v) => !v);
                }}
            >
                <MoreVertical size={16} strokeWidth={2.25} />
            </button>
            {menuPortal}
        </div>
    );
};

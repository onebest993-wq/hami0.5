import React, { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from '@/app/components/ui/icons/MoreVertical';
import { dispatchPrefetchPartyDeathHandlers } from '@/app/utils/partyDeathUiEvents';

const MENU_MIN_W = 176;
const PORTAL_Z = 25000;
const MENU_ITEM_CLASS =
    'touch-manipulation min-h-[44px] w-full px-3 py-2 text-right text-[11px] font-bold';

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
    /** تعديل بيانات الطرف (داخل القائمة) */
    editPartyLabel?: string;
    onEditParty?: () => void;
    /** إضافة إشارة مخصصة تظهر في صف الإشارات */
    onAddCustomSignal?: (label: string) => void;
}

/**
 * قائمة ⋮ — تُعرض عبر portal على document.body لتجاوز overflow البطاقات وسياقات z-index.
 */
export const ExecutionPartySpecialActionsMenu = memo(function ExecutionPartySpecialActionsMenu({
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
    editPartyLabel,
    onEditParty,
    onAddCustomSignal,
}: ExecutionPartySpecialActionsMenuProps) {
    const [open, setOpen] = useState(false);
    const [addingSignal, setAddingSignal] = useState(false);
    const [signalDraft, setSignalDraft] = useState('');
    const rootRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const signalInputRef = useRef<HTMLInputElement>(null);
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
    }, [open, updatePosition, addingSignal]);

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
        dispatchPrefetchPartyDeathHandlers();
        void import('@/app/components/lawyer/ExecutionDashboard/executionDashboardShellOverlaysLazy')
            .then((m) => m.prefetchExecutionDashboardShellOverlays())
            .catch(() => {});
        const onDoc = (e: MouseEvent) => {
            const t = e.target as Node;
            if (rootRef.current?.contains(t)) return;
            if (menuRef.current?.contains(t)) return;
            setOpen(false);
            setAddingSignal(false);
            setSignalDraft('');
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    useEffect(() => {
        if (isHistoricalMode) setOpen(false);
    }, [isHistoricalMode]);

    useEffect(() => {
        if (!addingSignal) return;
        const t = window.setTimeout(() => signalInputRef.current?.focus(), 30);
        return () => window.clearTimeout(t);
    }, [addingSignal]);

    const pick = useCallback((fn?: () => void) => {
        fn?.();
        setOpen(false);
        setAddingSignal(false);
        setSignalDraft('');
    }, []);

    const commitCustomSignal = useCallback(() => {
        const label = signalDraft.trim();
        if (!label || !onAddCustomSignal) return;
        onAddCustomSignal(label);
        setOpen(false);
        setAddingSignal(false);
        setSignalDraft('');
    }, [onAddCustomSignal, signalDraft]);

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
                {addingSignal && onAddCustomSignal ? (
                    <div className="space-y-1.5 px-2 py-1.5">
                        <p className="px-1 text-[10px] font-bold text-[#E6C673]/90">إشارة مخصصة</p>
                        <input
                            ref={signalInputRef}
                            dir="rtl"
                            value={signalDraft}
                            maxLength={32}
                            placeholder="مثال: مراجعة غداً"
                            onChange={(e) => setSignalDraft(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    commitCustomSignal();
                                }
                                if (e.key === 'Escape') {
                                    setAddingSignal(false);
                                    setSignalDraft('');
                                }
                            }}
                            className="min-h-[40px] w-full rounded-lg border border-white/12 bg-white/[0.06] px-2.5 text-[11px] font-semibold text-[#F4F4F5] outline-none focus:border-[#E6C673]/35"
                        />
                        <div className="flex flex-row-reverse gap-1.5">
                            <button
                                type="button"
                                className="min-h-[40px] flex-1 rounded-lg border border-[#E6C673]/35 bg-[#E6C673]/12 text-[11px] font-bold text-[#E6C673] touch-manipulation"
                                onClick={commitCustomSignal}
                            >
                                إضافة
                            </button>
                            <button
                                type="button"
                                className="min-h-[40px] shrink-0 rounded-lg border border-white/10 px-3 text-[11px] font-bold text-slate-300 touch-manipulation"
                                onClick={() => {
                                    setAddingSignal(false);
                                    setSignalDraft('');
                                }}
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {onEditParty && editPartyLabel ? (
                            <>
                                <button
                                    type="button"
                                    className={`${MENU_ITEM_CLASS} hover:bg-white/10 ${
                                        variant === 'creditor' ? 'text-emerald-300' : 'text-rose-300'
                                    }`}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={() => pick(onEditParty)}
                                >
                                    {editPartyLabel}
                                </button>
                                <div className="my-0.5 border-t border-white/8" aria-hidden />
                            </>
                        ) : null}
                        {variant === 'creditor' && (
                            <button
                                type="button"
                                className={`${MENU_ITEM_CLASS} text-slate-100 hover:bg-white/10`}
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={() => pick(onReportCreditorDeath)}
                            >
                                {creditorDeathEntryLabel}
                            </button>
                        )}
                        {variant === 'debtor' && (
                            <>
                                <button
                                    type="button"
                                    className={`${MENU_ITEM_CLASS} text-slate-100 hover:bg-white/10`}
                                    onMouseDown={(e) => e.stopPropagation()}
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
                                            className={`${MENU_ITEM_CLASS} text-slate-100 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40`}
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
                        {onAddCustomSignal ? (
                            <>
                                <div className="my-0.5 border-t border-white/8" aria-hidden />
                                <button
                                    type="button"
                                    data-testid="party-add-custom-signal"
                                    className={`${MENU_ITEM_CLASS} text-[#E6C673] hover:bg-[#E6C673]/10`}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={() => setAddingSignal(true)}
                                >
                                    إضافة إشارة مخصصة
                                </button>
                            </>
                        ) : null}
                    </>
                )}
            </div>,
            document.body,
        );

    if (isHistoricalMode) return null;

    return (
        <div ref={rootRef} className="relative ms-1 me-0.5 shrink-0">
            <button
                ref={buttonRef}
                type="button"
                className="inline-flex size-9 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-colors touch-manipulation"
                aria-label="إجراءات إضافية"
                aria-expanded={open}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen((v) => !v);
                    if (open) {
                        setAddingSignal(false);
                        setSignalDraft('');
                    }
                }}
            >
                <MoreVertical size={16} strokeWidth={2.25} />
            </button>
            {menuPortal}
        </div>
    );
});

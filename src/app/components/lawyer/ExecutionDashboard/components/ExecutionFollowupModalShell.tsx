import React from 'react';
import { X } from '@/app/components/ui/icons/X';
import { EXEC_MODAL_Z } from '@/app/components/lawyer/ExecutionDashboard/executionDashboardConstants';
import {
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_MODAL_TOUCH_TARGET,
    EXEC_OVERLAY_HEADER,
    EXEC_OVERLAY_PHONE_BACKDROP,
    EXEC_OVERLAY_PHONE_SHEET_XL,
    EXEC_OVERLAY_SEG_ACTIVE,
    EXEC_OVERLAY_SEG_IDLE,
    EXEC_OVERLAY_TITLE,
    execModalKeyboardPadStyle,
} from '../executionModalMobileShell';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';
import { assignMutableRefCurrent } from '../utils/assignMutableRefCurrent';
import type { ExecutionFollowupModalPortalController } from '../hooks/useExecutionFollowupModalPortalController';
import { prefetchExecutionFollowupTab } from '../executionFollowupTabPrefetch';
import { useExecutionDashboardStore } from '@/app/stores';
import { useOverlayBackdropArm } from '@/app/hooks/useOverlayBackdropArm';
import { useOverlayEscapeDismiss } from '@/app/hooks/useOverlayEscapeDismiss';

export function ExecutionFollowupModalShell({
    c,
    children,
}: {
    c: ExecutionFollowupModalPortalController;
    children: React.ReactNode;
}) {
    const {
        ProgressBar,
        activeChipTabId,
        debtorsUnified,
        executionDebtorTabIndex,
        followupModalBodyScrollRef,
        followupModalChipTablistRef,
        followupModalDebtorTabsRef,
        followupModalSectionTabsRef,
        followupModalTabs,
        isSolidaryLiability,
        paidDebt,
        persistFollowupModalViewport,
        personalTabLockedForEmployee,
        safeCloseFollowupModalPersisted,
        setExecutionDebtorTabIndex,
        switchFollowupTab,
        totalOwed,
    } = c;

    const [dismissed, setDismissed] = React.useState(false);
    const storeOpen = useExecutionDashboardStore((s) => s.modals.showUnifiedExecutionModal);
    const backdropArmed = useOverlayBackdropArm(storeOpen && !dismissed);

    React.useEffect(() => {
        if (storeOpen) setDismissed(false);
    }, [storeOpen]);

    // كتابة sessionStorage المتزامنة على كل حدث scroll كانت مصدر jank محسوس —
    // نؤجّلها بمهلة قصيرة (آخر موضع يُكتب دائماً، والإغلاق يكتب فورياً في مساره).
    const persistScrollTimerRef = React.useRef<number | null>(null);
    const schedulePersistViewport = React.useCallback(() => {
        if (persistScrollTimerRef.current !== null) return;
        persistScrollTimerRef.current = window.setTimeout(() => {
            persistScrollTimerRef.current = null;
            if (typeof persistFollowupModalViewport === 'function') {
                persistFollowupModalViewport();
            }
        }, 220);
    }, [persistFollowupModalViewport]);
    React.useEffect(
        () => () => {
            if (persistScrollTimerRef.current !== null) {
                window.clearTimeout(persistScrollTimerRef.current);
                persistScrollTimerRef.current = null;
            }
        },
        [],
    );

    const forceCloseFollowup = React.useCallback(() => {
        setDismissed(true);
        try {
            safeCloseFollowupModalPersisted();
        } finally {
            useExecutionDashboardStore.getState().closeModal('showUnifiedExecutionModal');
        }
    }, [safeCloseFollowupModalPersisted]);

    const keyboardInset = useMobileKeyboardInset(!dismissed, true);

    useOverlayEscapeDismiss(!dismissed, forceCloseFollowup);

    if (dismissed) return null;

    return (
        <div
            className={`${EXEC_OVERLAY_PHONE_BACKDROP} sm:bg-black/75`}
            style={{ zIndex: EXEC_MODAL_Z.unifiedFollowUp, ...execModalKeyboardPadStyle(keyboardInset) }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="execution-followup-modal-title"
            data-testid="execution-followup-modal"
            onClick={(e) => {
                if (!backdropArmed) return;
                if (e.target === e.currentTarget) forceCloseFollowup();
            }}
        >
            <div className="flex min-h-0 w-full flex-1 flex-col" onClick={(e) => e.stopPropagation()}>
                <div className={EXEC_OVERLAY_PHONE_SHEET_XL}>
                    <div className={EXEC_OVERLAY_HEADER}>
                        <h2 id="execution-followup-modal-title" className={EXEC_OVERLAY_TITLE}>
                            محضر المتابعة
                        </h2>
                        <button
                            type="button"
                            data-testid="execution-followup-modal-close"
                            data-hami-dialog-close
                            onClick={(e) => {
                                e.stopPropagation();
                                forceCloseFollowup();
                            }}
                            className={EXEC_MODAL_CLOSE_BTN_CLASS}
                            aria-label="إغلاق محضر المتابعة"
                        >
                            <X size={22} />
                        </button>
                    </div>

                    <div className="shrink-0 border-b border-white/10 px-3 py-2" dir="rtl">
                        <div
                            ref={(el) => {
                                assignMutableRefCurrent(followupModalChipTablistRef, el);
                                assignMutableRefCurrent(followupModalSectionTabsRef, el);
                            }}
                            role="tablist"
                            aria-label="أقسام محضر المتابعة"
                            className="flex w-full items-center gap-1.5 overflow-x-auto overscroll-x-contain whitespace-nowrap snap-x pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                        >
                            {followupModalTabs.map((tab) => {
                                const active = activeChipTabId === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        role="tab"
                                        data-followup-tab={tab.id}
                                        aria-selected={active}
                                        onPointerDown={() => {
                                            prefetchExecutionFollowupTab(tab.id);
                                        }}
                                        onClick={() => {
                                            switchFollowupTab(tab.id);
                                        }}
                                        title={
                                            tab.id === 'personal' && personalTabLockedForEmployee
                                                ? 'المدين موظف — الخيارات مقفلة حتى فك القفل'
                                                : undefined
                                        }
                                        className={`flex min-h-[44px] shrink-0 snap-start flex-row-reverse items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-2 text-[11px] font-bold touch-manipulation ${
                                            active ? EXEC_OVERLAY_SEG_ACTIVE : EXEC_OVERLAY_SEG_IDLE
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div
                        ref={followupModalBodyScrollRef}
                        onScroll={schedulePersistViewport}
                        className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#0A0F1C] p-3 sm:p-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10"
                    >
                        {!isSolidaryLiability && debtorsUnified.length > 1 ? (
                            <div className="sticky top-0 z-[5] mb-3 border-b border-white/10 bg-[#0A0F1C] pb-2">
                                <p className="mb-1 text-right text-[10px] text-slate-500">
                                    مدينو الإضبارة — ذمة مستقلة لكل منهم
                                </p>
                                <div
                                    ref={followupModalDebtorTabsRef}
                                    className="flex gap-1 overflow-x-auto overscroll-x-contain pb-1"
                                >
                                    {debtorsUnified.map((d, i) => (
                                        <button
                                            key={d.id}
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setExecutionDebtorTabIndex(i);
                                            }}
                                            className={`shrink-0 rounded-xl border px-3 py-2 text-[11px] font-bold ${EXEC_MODAL_TOUCH_TARGET} ${
                                                executionDebtorTabIndex === i
                                                    ? EXEC_OVERLAY_SEG_ACTIVE
                                                    : EXEC_OVERLAY_SEG_IDLE
                                            }`}
                                        >
                                            {`مدين ${i + 1}`}
                                        </button>
                                    ))}
                                </div>
                                {debtorsUnified[executionDebtorTabIndex] ? (
                                    <>
                                        <ProgressBar
                                            allocated={
                                                debtorsUnified[executionDebtorTabIndex].allocated_debt
                                            }
                                            paid={debtorsUnified[executionDebtorTabIndex].paid_amount}
                                            label="حصة المدين النشط"
                                        />
                                        <div className="flex justify-end px-1 -mt-1 pb-1">
                                            <span className="text-[10px] text-slate-500">
                                                {`المدين النشط: مدين ${executionDebtorTabIndex + 1}`}
                                            </span>
                                        </div>
                                        {debtorsUnified[executionDebtorTabIndex].cleared ? (
                                            <div className="flex justify-end px-1 pb-1">
                                                <span className="rounded-lg border border-emerald-500/45 bg-emerald-950/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                                                    براءة ذمة / Cleared
                                                </span>
                                            </div>
                                        ) : null}
                                    </>
                                ) : null}
                            </div>
                        ) : null}

                        {isSolidaryLiability && debtorsUnified.length >= 1 ? (
                            <div className="mb-3 border-b border-white/10 pb-2">
                                <p className="mb-2 text-right text-[10px] font-bold text-slate-300">
                                    تضامن — عرض موحّد لجميع المدينين
                                </p>
                                <ul className="mb-2 space-y-1 text-right text-[11px] text-slate-300">
                                    {debtorsUnified.map((d, idx) => (
                                        <li key={d.id}>
                                            • {`مدين ${idx + 1}`}
                                            {d.cleared ? (
                                                <span className="mr-1 text-[9px] text-emerald-400">
                                                    (براءة ذمة جزئية)
                                                </span>
                                            ) : null}
                                        </li>
                                    ))}
                                </ul>
                                <ProgressBar
                                    allocated={totalOwed}
                                    paid={paidDebt}
                                    label="تقدّم الإضبارة (إجمالي)"
                                />
                            </div>
                        ) : null}

                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}

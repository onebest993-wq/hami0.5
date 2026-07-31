import React from 'react';
import { X } from 'lucide-react';
import { EXEC_MODAL_Z } from '@/app/components/lawyer/execution/executionModalStack';
import {
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_MODAL_HEADER_SAFE_TOP,
    EXEC_MODAL_SHELL_HEIGHT_CLASS,
} from '../executionModalMobileShell';
import { assignMutableRefCurrent } from '../utils/assignMutableRefCurrent';
import type { ExecutionFollowupModalPortalController } from '../hooks/useExecutionFollowupModalPortalController';
import { prefetchExecutionFollowupTab } from '../executionFollowupTabPrefetch';
import { useExecutionDashboardStore } from '@/app/stores';

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

    React.useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            e.stopPropagation();
            forceCloseFollowup();
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [forceCloseFollowup]);

    if (dismissed) return null;

    return (
        <div
            className="fixed inset-0 bg-slate-950/95 backdrop-blur-lg px-[max(0px,env(safe-area-inset-left))] py-[max(0px,env(safe-area-inset-top))] pb-[max(0px,env(safe-area-inset-bottom))]"
            style={{ zIndex: EXEC_MODAL_Z.unifiedFollowUp }}
            role="presentation"
            data-testid="execution-followup-modal"
            onClick={(e) => {
                if (e.target === e.currentTarget) forceCloseFollowup();
            }}
        >
            <div className="w-full" onClick={(e) => e.stopPropagation()}>
                <div
                    className={`relative mx-auto flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0A0F1C]/98 shadow-[0_8px_32px_rgba(0,0,0,0.65)] ring-1 ring-white/10 ${EXEC_MODAL_SHELL_HEIGHT_CLASS}`}
                >
                    <div
                        className={`flex shrink-0 items-center justify-between border-b border-white/10 bg-[#0A0F1C]/98 px-4 py-3 ${EXEC_MODAL_HEADER_SAFE_TOP}`}
                    >
                        <button
                            type="button"
                            data-testid="execution-followup-modal-close"
                            onClick={(e) => {
                                e.stopPropagation();
                                forceCloseFollowup();
                            }}
                            className={`rounded-full text-slate-200/90 transition-all hover:bg-white/10 hover:text-white ${EXEC_MODAL_CLOSE_BTN_CLASS}`}
                            aria-label="إغلاق محضر المتابعة"
                        >
                            <X size={20} className="text-white" />
                        </button>
                        <h2 className="text-lg font-bold tracking-wide text-amber-200">
                            محضر المتابعة
                        </h2>
                        <span className="w-9" aria-hidden />
                    </div>

                    <div
                        className="shrink-0 border-b border-white/10 bg-gradient-to-b from-[#0A0F1C]/80 to-transparent px-3 py-2.5"
                        dir="rtl"
                    >
                        <div
                            ref={(el) => {
                                assignMutableRefCurrent(followupModalChipTablistRef, el);
                                assignMutableRefCurrent(followupModalSectionTabsRef, el);
                            }}
                            role="tablist"
                            aria-label="أقسام محضر المتابعة"
                            className="flex w-full items-center gap-1.5 overflow-x-auto whitespace-nowrap scroll-smooth snap-x pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                            onWheelCapture={(e) => {
                                const el = e.currentTarget;
                                if (el.scrollWidth <= el.clientWidth) return;
                                const delta =
                                    Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
                                if (delta === 0) return;
                                e.preventDefault();
                                el.scrollLeft += delta;
                            }}
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
                                        onClick={() => {
                                            switchFollowupTab(tab.id);
                                        }}
                                        onPointerEnter={() => {
                                            prefetchExecutionFollowupTab(tab.id);
                                        }}
                                        title={
                                            tab.id === 'personal' && personalTabLockedForEmployee
                                                ? 'المدين موظف — الخيارات مقفلة حتى فك القفل'
                                                : undefined
                                        }
                                        className={`flex shrink-0 snap-start flex-row-reverse items-center gap-1.5 whitespace-nowrap rounded-xl border px-4 py-2.5 text-[11px] font-bold transition-all ${
                                            active
                                                ? 'border-amber-400/35 bg-gradient-to-b from-amber-500/20 to-amber-500/5 text-amber-50 shadow-[0_0_22px_-8px_rgba(230,198,115,0.45)]'
                                                : 'border-transparent bg-white/[0.03] text-slate-400 hover:border-white/10 hover:bg-white/[0.06] hover:text-slate-200'
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
                        className="min-h-0 flex-1 overflow-y-auto bg-[#0A0F1C] p-4 md:p-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10"
                    >
                        {!isSolidaryLiability && debtorsUnified.length > 1 ? (
                            <div className="sticky top-0 z-[5] border-b border-slate-700/50 bg-[#0B1120]/98 px-2 pt-2 pb-2 backdrop-blur-md">
                                <p className="mb-1 px-1 text-right text-[9px] text-slate-500">
                                    مدينو الإضبارة — ذمة مستقلة لكل منهم (اختر التبويب قبل الإجراء)
                                </p>
                                <div
                                    ref={followupModalDebtorTabsRef}
                                    className="scrollbar-hide flex gap-1 overflow-x-auto pb-1"
                                >
                                    {debtorsUnified.map((d, i) => (
                                        <button
                                            key={d.id}
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setExecutionDebtorTabIndex(i);
                                            }}
                                            className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition-all ${
                                                executionDebtorTabIndex === i
                                                    ? 'border-amber-500/50 bg-amber-950/40 text-amber-100'
                                                    : 'border-slate-600/40 bg-slate-900/60 text-slate-400 hover:border-slate-500/50'
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
                            <div className="border-b border-amber-500/25 bg-slate-900/50 px-3 py-2">
                                <p className="mb-2 text-right text-[10px] font-bold text-amber-200/90">
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

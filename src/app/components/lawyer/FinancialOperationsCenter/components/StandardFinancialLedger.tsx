import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Send, X, Handshake, Trophy, PencilLine } from 'lucide-react';
import { formatIqdDisplay } from '../utils';
import { SECTION_GLASS } from '../constants';
import type { UnifiedLedgerStore, FinancialLedgerEntry } from '../types';
import { ReactiveSettlementEntry } from './ReactiveSettlementEntry';
import { SettlementBuriedKebab } from './SettlementBuriedKebab';
import LedgerExpenseEditCluster from './LedgerExpenseEditCluster';
import { SettlementRepaymentStrip } from './SettlementRepaymentStrip';
import type { SettlementUxTier } from '../settlementUxMatrix';
import { DECISIONS_RELOAD_EVENT, readExecutorDecisionsArray } from '@/app/utils/executorSeizureDecisionQueue';
import { ExecutionInlineExecutorDecisionActions } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';

interface StandardFinancialLedgerProps {
    executionId: string | undefined;
    totalOwedUnified: number;
    remainingUnified: number;
    baseDossierAmount: number;
    store: UnifiedLedgerStore;
    setExpenseSheetOpen: (v: boolean) => void;
    setFeesSheetOpen: (v: boolean) => void;
    canShowDisburse: boolean;
    onOpenDisburse: () => void;
    retractCollectionRequest: () => void;
    unifiedCollectionExecutorApproved: boolean;
    showEmployeeCollection: boolean;
    showNonEmployeePhase2: boolean;
    applyFullPayment: () => void;
    setShowGarnishModal: (v: boolean) => void;
    undoLastPayment: () => void;
    financialLedger: FinancialLedgerEntry[];
    onPayment: () => void;
    canEditDebtTotals?: boolean;
    onOpenDebtEdit?: () => void;
    flatChrome?: boolean;
    settlementUxTier?: SettlementUxTier;
    settlementPanelOpen?: boolean;
    onActivateSettlement?: () => void;
    onDeactivateSettlement?: () => void;
    repaymentInput?: string;
    setRepaymentInput?: (v: string) => void;
    canApplyRepayment?: boolean;
    applyDebtRepayment?: () => boolean;
    repaymentExceedsRemaining?: boolean;
    /** إجمالي النفقة الشهرية المستمرة (زوجة + أولاد) — يُعرض تحت متبقي الوعاء */
    ongoingMonthlyAlimony?: number;
    /** إظهار مداخل التسوية — يُخفى عند نشاط مسار حجز الراتب */
    showSettlementEntry?: boolean;
}

export const StandardFinancialLedger = ({
    executionId,
    totalOwedUnified,
    remainingUnified,
    store,
    setExpenseSheetOpen,
    setFeesSheetOpen,
    canShowDisburse,
    onOpenDisburse,
    retractCollectionRequest,
    unifiedCollectionExecutorApproved,
    showEmployeeCollection,
    showNonEmployeePhase2,
    applyFullPayment,
    setShowGarnishModal,
    undoLastPayment,
    financialLedger,
    onPayment,
    canEditDebtTotals = false,
    onOpenDebtEdit,
    flatChrome = false,
    settlementUxTier = 'hidden',
    settlementPanelOpen = false,
    onActivateSettlement,
    onDeactivateSettlement,
    repaymentInput = '',
    setRepaymentInput,
    canApplyRepayment = false,
    applyDebtRepayment,
    repaymentExceedsRemaining = false,
    ongoingMonthlyAlimony,
    showSettlementEntry = true,
}: StandardFinancialLedgerProps) => {
    const [fullPayOpen, setFullPayOpen] = useState(false);
    const [fullPayCountdown, setFullPayCountdown] = useState(0);

    useEffect(() => {
        if (!fullPayOpen || fullPayCountdown <= 0) return;
        const timer = window.setTimeout(() => setFullPayCountdown((c) => c - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [fullPayOpen, fullPayCountdown]);

    const openFullPaymentConfirm = () => {
        setFullPayOpen(true);
        setFullPayCountdown(3);
    };

    const cancelFullPaymentConfirm = () => {
        setFullPayOpen(false);
        setFullPayCountdown(0);
    };

    const confirmFullPayment = () => {
        applyFullPayment();
        cancelFullPaymentConfirm();
    };
    const [decisions, setDecisions] = React.useState<Record<string, unknown>[]>(() =>
        readExecutorDecisionsArray(executionId)
    );
    React.useEffect(() => {
        const sync = () => setDecisions(readExecutorDecisionsArray(executionId));
        sync();
        window.addEventListener(DECISIONS_RELOAD_EVENT, sync);
        window.addEventListener('hami-execution-decision-outcome', sync as EventListener);
        window.addEventListener('focus', sync);
        return () => {
            window.removeEventListener(DECISIONS_RELOAD_EVENT, sync);
            window.removeEventListener('hami-execution-decision-outcome', sync as EventListener);
            window.removeEventListener('focus', sync);
        };
    }, [executionId]);
    const settlementInProgress =
        settlementPanelOpen || Boolean(store.pendingSettlement);
    const highlightedUnifiedAmount = remainingUnified;
    const pendingUnifiedCollectionDecision = useMemo(() => {
        const list = Array.isArray(decisions) ? decisions : [];
        const pending = list
            .filter((d: any) => String(d?.requestKind || '') === 'unified_collection')
            .filter((d: any) => String(d?.executorOutcome ?? 'pending') === 'pending' || String(d?.executorOutcome ?? '') === '')
            .sort((a: any, b: any) => {
                const da = String(a?.resolvedAt ?? a?.date ?? '');
                const db = String(b?.resolvedAt ?? b?.date ?? '');
                return db.localeCompare(da, undefined, { numeric: true });
            });
        return pending[0] || null;
    }, [decisions]);

    const latestUnifiedCollectionDecision = useMemo(() => {
        const list = Array.isArray(decisions) ? decisions : [];
        const all = list
            .filter((d: any) => String(d?.requestKind || '') === 'unified_collection')
            .sort((a: any, b: any) => {
                const da = String(a?.resolvedAt ?? a?.date ?? '');
                const db = String(b?.resolvedAt ?? b?.date ?? '');
                return db.localeCompare(da, undefined, { numeric: true });
            });
        return all[0] || null;
    }, [decisions]);

    const latestUnifiedOutcome = String((latestUnifiedCollectionDecision as any)?.executorOutcome ?? '');
    const unifiedRejected = latestUnifiedOutcome === 'rejected';

    const openAppealCenter = () => {
        if (!executionId) return;
        try {
            window.dispatchEvent(
                new CustomEvent('hami-open-decisions-modal', {
                    detail: {
                        executionId,
                        tab: 'previous',
                        decisionId: String((latestUnifiedCollectionDecision as any)?.id || '').trim() || undefined,
                    },
                })
            );
        } catch {
            /* ignore */
        }
    };

    return (
        <div
            className={
                flatChrome
                    ? 'flex flex-col gap-y-4'
                    : `${SECTION_GLASS} flex flex-col gap-y-4`
            }
        >
            <div
                className={
                    flatChrome
                        ? 'flex flex-col items-center text-center pb-2 gap-y-1.5'
                        : 'flex flex-col items-center text-center pb-4 mb-1 border-b border-white/10 gap-y-2'
                }
            >
                <p className="text-[10px] text-slate-500 tracking-wide">متبقي الوعاء</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                    <p
                        className="text-2xl sm:text-3xl font-black tabular-nums leading-none tracking-tight bg-gradient-to-b from-[#FFF8DC] via-[#E6C673] to-amber-700 bg-clip-text text-transparent"
                        style={{ filter: 'drop-shadow(0 0 14px rgba(230, 198, 115, 0.32))' }}
                    >
                        {formatIqdDisplay(highlightedUnifiedAmount)}
                    </p>
                    {showSettlementEntry &&
                    settlementUxTier === 'buried' &&
                    !settlementInProgress &&
                    onActivateSettlement ? (
                        <SettlementBuriedKebab onActivate={onActivateSettlement} />
                    ) : null}
                    {canEditDebtTotals && onOpenDebtEdit && !flatChrome ? (
                        <button
                            type="button"
                            onClick={onOpenDebtEdit}
                            className="inline-flex items-center justify-center gap-1 min-w-[3.6rem] py-1.5 px-2 rounded-md border border-[#E6C673]/30 bg-[#E6C673]/10 text-[#F5E6A8] hover:bg-[#E6C673]/15 transition"
                        >
                            <PencilLine size={13} strokeWidth={1.85} className="shrink-0" />
                            <span className="text-[10px] font-semibold leading-tight text-center">تعديل</span>
                        </button>
                    ) : null}
                    <LedgerExpenseEditCluster
                        onExpenses={() => setExpenseSheetOpen(true)}
                        onEditFees={() => setFeesSheetOpen(true)}
                        hideFees
                    />
                </div>
                {showSettlementEntry &&
                settlementUxTier === 'primary' &&
                onActivateSettlement &&
                !(ongoingMonthlyAlimony != null && ongoingMonthlyAlimony > 0) ? (
                    <div className="w-full pt-2">
                        <ReactiveSettlementEntry
                            tier="primary"
                            isActive={settlementInProgress}
                            onActivate={onActivateSettlement}
                            onDeactivate={onDeactivateSettlement}
                        />
                    </div>
                ) : null}
                {ongoingMonthlyAlimony != null && ongoingMonthlyAlimony > 0 ? (
                    <div className="mt-3 w-full border-t border-white/[0.06] pt-3">
                        <p className="text-[10px] text-emerald-400/85 tracking-wide">
                            النفقة المستمرة المطلوبة
                        </p>
                        <p className="mt-1 text-lg sm:text-xl font-black tabular-nums text-emerald-300/95 leading-none">
                            {formatIqdDisplay(ongoingMonthlyAlimony)}
                            <span className="text-[11px] font-semibold text-slate-500 mr-1">/ شهرياً</span>
                        </p>
                        {showSettlementEntry && settlementUxTier === 'primary' && onActivateSettlement ? (
                            <div className="mt-3">
                                <ReactiveSettlementEntry
                                    tier="primary"
                                    shortLabel
                                    isActive={settlementInProgress}
                                    onActivate={onActivateSettlement}
                                    onDeactivate={onDeactivateSettlement}
                                />
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </div>

            <div className="space-y-3">
                {remainingUnified > 0 &&
                !store.completed &&
                setRepaymentInput &&
                applyDebtRepayment ? (
                    <SettlementRepaymentStrip
                        repaymentInput={repaymentInput}
                        setRepaymentInput={setRepaymentInput}
                        canApplyRepayment={canApplyRepayment}
                        onApply={applyDebtRepayment}
                        remainingUnified={remainingUnified}
                        repaymentExceedsRemaining={repaymentExceedsRemaining}
                    />
                ) : null}

                {(store.completed || remainingUnified <= 0) && totalOwedUnified > 0 && (
                    <div className="flex items-center justify-center gap-2 text-emerald-300 text-xs font-bold">
                        <CheckCircle size={16} />
                        منجز — الوعاء مغلق
                    </div>
                )}

                {store.garnishment && !store.completed && (
                    <p className="text-center text-xs text-indigo-200/90 leading-relaxed">
                        مسار حجز الراتب (١/٥) مفعّل — تابع من «التنفيذ والمحجوزات» ومفاتحة جهة العمل.
                    </p>
                )}

                {store.collectionRequestActive && !store.completed && !unifiedCollectionExecutorApproved ? (
                    <div className="w-full rounded-lg backdrop-blur-sm py-3 px-3.5 flex flex-col items-center justify-center gap-2 text-xs font-bold border border-slate-500/30 bg-slate-800/40 text-slate-300">
                        <div className="flex items-center justify-center gap-2">
                            <CheckCircle size={17} className="shrink-0" />
                            {unifiedRejected
                                ? 'تم رفض طلب الاستحصال من قبل المنفذ'
                                : 'طلب الاستحصال قيد البت — اتخذ قرار المنفذ هنا'}
                        </div>
                        {unifiedRejected ? (
                            <ExecutionInlineExecutorDecisionActions
                                executionId={executionId}
                                decisionId={String((latestUnifiedCollectionDecision as any)?.id || '').trim()}
                                requestKind="unified_collection"
                                disabled
                                onOpenAppealCenter={openAppealCenter}
                            />
                        ) : pendingUnifiedCollectionDecision ? (
                            <ExecutionInlineExecutorDecisionActions
                                executionId={executionId}
                                decisionId={String((pendingUnifiedCollectionDecision as any)?.id || '').trim()}
                                requestKind="unified_collection"
                            />
                        ) : null}
                    </div>
                ) : canShowDisburse ? (
                    <button
                        type="button"
                        onClick={onOpenDisburse}
                        className="w-full rounded-lg bg-gradient-to-l from-[#E6C673] to-amber-600 py-3.5 px-4 text-[#0A0F1C] font-black text-xs shadow-md shadow-amber-900/25 disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Send size={17} className="shrink-0" />
                        الصرف
                    </button>
                ) : null}

                {store.collectionRequestActive && unifiedCollectionExecutorApproved && (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onPayment}
                                className="flex-1 rounded-lg bg-gradient-to-l from-emerald-500 to-emerald-700 py-3.5 px-4 text-white font-extrabold text-xs shadow-md shadow-emerald-950/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Handshake size={17} className="shrink-0" />
                                تحصيل دفعة
                            </button>
                            <button
                                type="button"
                                onClick={retractCollectionRequest}
                                className="flex-1 rounded-lg bg-gradient-to-l from-rose-500/80 to-rose-800/80 py-3.5 px-4 text-rose-100 font-extrabold text-xs shadow-md shadow-rose-950/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <X size={17} className="shrink-0" />
                                إلغاء الطلب
                            </button>
                        </div>
                        {showSettlementEntry && settlementUxTier === 'secondary' && onActivateSettlement ? (
                            <ReactiveSettlementEntry
                                tier="secondary"
                                isActive={settlementInProgress}
                                onActivate={onActivateSettlement}
                                onDeactivate={onDeactivateSettlement}
                            />
                        ) : null}
                    </div>
                )}

                {showSettlementEntry &&
                settlementUxTier === 'secondary' &&
                onActivateSettlement &&
                !(store.collectionRequestActive && unifiedCollectionExecutorApproved) &&
                !store.completed &&
                remainingUnified > 0 ? (
                    <ReactiveSettlementEntry
                        tier="secondary"
                        isActive={settlementInProgress}
                        onActivate={onActivateSettlement}
                        onDeactivate={onDeactivateSettlement}
                    />
                ) : null}

                {unifiedCollectionExecutorApproved && (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            {showEmployeeCollection && (
                                <button
                                    type="button"
                                    onClick={() => setShowGarnishModal(true)}
                                    className="w-full rounded-lg border border-violet-500/30 bg-violet-950/50 backdrop-blur-sm py-3.5 px-4 text-violet-100/95 text-[11px] font-bold shadow-sm shadow-black/25 disabled:opacity-30 disabled:cursor-not-allowed transition-colors hover:bg-violet-900/42 hover:border-violet-400/32"
                                >
                                    حجز الراتب (1/5)
                                </button>
                            )}
                            {showNonEmployeePhase2 && !fullPayOpen && (
                                <button
                                    type="button"
                                    onClick={openFullPaymentConfirm}
                                    disabled={remainingUnified <= 0 || store.completed}
                                    className="flex-1 rounded-lg border border-emerald-500/30 bg-emerald-950/55 backdrop-blur-sm py-3.5 px-4 text-emerald-50/95 text-[11px] font-bold shadow-sm shadow-black/25 disabled:opacity-30 disabled:cursor-not-allowed transition-colors hover:bg-emerald-900/45 hover:border-emerald-400/35"
                                >
                                    تحصيل كامل الوعاء
                                </button>
                            )}
                        </div>
                        {showNonEmployeePhase2 && fullPayOpen && (
                            <div className="rounded-xl border border-emerald-500/35 bg-emerald-950/35 p-3 space-y-3 text-right">
                                <p className="text-[11px] font-bold text-emerald-100 leading-relaxed">
                                    تأكيد تحصيل كامل الوعاء بمبلغ{' '}
                                    <span className="tabular-nums text-emerald-300">
                                        {formatIqdDisplay(remainingUnified)} د.ع
                                    </span>
                                    — سيُغلق الوعاء نهائياً.
                                </p>
                                {fullPayCountdown > 0 ? (
                                    <div className="flex flex-col items-center gap-2 py-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10">
                                        <Trophy size={28} className="text-emerald-300 animate-pulse" />
                                        <p className="text-xs font-black text-emerald-200">
                                            انتصار — اكتمال الوعاء
                                        </p>
                                        <p className="text-[10px] text-emerald-300/90">
                                            زر الموافقة يتاح بعد {fullPayCountdown} ثانية
                                        </p>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={confirmFullPayment}
                                        className="w-full rounded-lg bg-gradient-to-l from-emerald-500 to-emerald-700 py-3 px-4 text-white text-xs font-black shadow-md shadow-emerald-950/30"
                                    >
                                        موافقة — تنفيذ التحصيل الكامل
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={cancelFullPaymentConfirm}
                                    className="w-full text-center text-[11px] text-slate-400 hover:text-slate-200 py-1"
                                >
                                    إلغاء
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {store.completed && (
                    <button
                        type="button"
                        onClick={undoLastPayment}
                        className="w-full text-center text-[11px] font-medium text-[#A0AEC0] hover:text-[#CBD5E0] transition-colors duration-200 py-2.5 underline-offset-4 hover:underline"
                    >
                        تراجع عن آخر دفعة
                    </button>
                )}

                {(store.collectionRequestActive || store.completed) && !unifiedCollectionExecutorApproved && (
                    <button
                        type="button"
                        onClick={retractCollectionRequest}
                        className="w-full text-center text-[11px] font-medium text-[#A0AEC0] hover:text-[#CBD5E0] transition-colors duration-200 py-2.5 underline-offset-4 hover:underline"
                    >
                        إلغاء طلب الاستحصال
                    </button>
                )}
            </div>
        </div>
    );
};

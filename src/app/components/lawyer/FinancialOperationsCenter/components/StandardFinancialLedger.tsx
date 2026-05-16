import React, { useMemo } from 'react';
import { CheckCircle, Send, X, Handshake } from 'lucide-react';
import { formatIqdDisplay, parseAmount } from '../utils';
import { SECTION_GLASS } from '../constants';
import type { UnifiedLedgerStore, FinancialLedgerEntry } from '../types';
import LedgerExpenseEditCluster from './LedgerExpenseEditCluster';
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
    canSubmitRequest: boolean;
    submitCollectionRequest: () => void;
    retractCollectionRequest: () => void;
    unifiedCollectionExecutorApproved: boolean;
    showEmployeeCollection: boolean;
    showNonEmployeePhase2: boolean;
    applyFullPayment: () => void;
    applyPartialSettlement: () => boolean;
    settlementInput: string;
    setSettlementInput: (v: string) => void;
    setShowGarnishModal: (v: boolean) => void;
    undoLastPayment: () => void;
    financialLedger: FinancialLedgerEntry[];
    onPayment: () => void;
    onSettlement: () => void;
    hideFeesCluster?: boolean;
}

export const StandardFinancialLedger = ({
    executionId,
    totalOwedUnified,
    remainingUnified,
    store,
    setExpenseSheetOpen,
    setFeesSheetOpen,
    canSubmitRequest,
    submitCollectionRequest,
    retractCollectionRequest,
    unifiedCollectionExecutorApproved,
    showEmployeeCollection,
    showNonEmployeePhase2,
    applyFullPayment,
    applyPartialSettlement,
    settlementInput,
    setSettlementInput,
    setShowGarnishModal,
    undoLastPayment,
    financialLedger,
    onPayment,
    onSettlement,
    hideFeesCluster = false,
}: StandardFinancialLedgerProps) => {
    const [settlementExpanded, setSettlementExpanded] = React.useState(false);
    const settlementAmount = parseAmount(settlementInput);
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
    const standardRecentFinancialLedger = useMemo(
        () => (Array.isArray(financialLedger) ? financialLedger.slice(0, 5) : []),
        [financialLedger]
    );
    const canApplySettlement =
        Number.isFinite(settlementAmount) &&
        settlementAmount > 0 &&
        settlementAmount <= remainingUnified;
    const highlightedUnifiedAmount = remainingUnified;

    const applySettlementAndCollapse = () => {
        if (applyPartialSettlement()) setSettlementExpanded(false);
    };

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
                        tab: 'appeals',
                        decisionId: String((latestUnifiedCollectionDecision as any)?.id || '').trim() || undefined,
                    },
                })
            );
        } catch {
            /* ignore */
        }
    };

    return (
        <div className={`${SECTION_GLASS} flex flex-col gap-y-4`}>
            <div className="flex flex-col items-center text-center pb-4 mb-1 border-b border-white/10 gap-y-2">
                <p className="text-[10px] text-slate-500 tracking-wide">متبقي الوعاء</p>
                <div className="flex items-center justify-center gap-2">
                    <p
                        className="text-2xl sm:text-3xl font-black tabular-nums leading-none tracking-tight bg-gradient-to-b from-[#FFF8DC] via-[#E6C673] to-amber-700 bg-clip-text text-transparent"
                        style={{ filter: 'drop-shadow(0 0 14px rgba(230, 198, 115, 0.32))' }}
                    >
                        {formatIqdDisplay(highlightedUnifiedAmount)}
                    </p>
                    <LedgerExpenseEditCluster
                        onExpenses={() => setExpenseSheetOpen(true)}
                        onEditFees={() => setFeesSheetOpen(true)}
                        hideFees={hideFeesCluster}
                    />
                </div>
                {null}
            </div>

            <div className="space-y-3">
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
                ) : canSubmitRequest ? (
                    <button
                        type="button"
                        onClick={submitCollectionRequest}
                        className="w-full rounded-lg bg-gradient-to-l from-[#E6C673] to-amber-600 py-3.5 px-4 text-[#0A0F1C] font-black text-xs shadow-md shadow-amber-900/25 disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Send size={17} className="shrink-0" />
                        طلب الاستحصال (إجمالي الوعاء)
                    </button>
                ) : null}

                {store.collectionRequestActive && unifiedCollectionExecutorApproved && (
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
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
                    </div>
                )}

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
                            {showNonEmployeePhase2 && (
                                <button
                                    type="button"
                                    onClick={applyFullPayment}
                                    className="flex-1 rounded-lg border border-emerald-500/30 bg-emerald-950/55 backdrop-blur-sm py-3.5 px-4 text-emerald-50/95 text-[11px] font-bold shadow-sm shadow-black/25 disabled:opacity-30 disabled:cursor-not-allowed transition-colors hover:bg-emerald-900/45 hover:border-emerald-400/35"
                                >
                                    تحصيل كامل الوعاء
                                </button>
                            )}
                        </div>
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

            {!store.completed && remainingUnified > 0 && (
                <div className="border-t border-white/5 pt-4 mt-1">
                    <button
                        type="button"
                        onClick={() => setSettlementExpanded((v) => !v)}
                        className="w-full text-center text-xs text-cyan-400/80 hover:text-cyan-300 transition-colors py-1.5 flex items-center justify-center gap-1"
                    >
                        {settlementExpanded ? 'إغلاق' : 'تسوية جزئية'}
                    </button>
                    {settlementExpanded && (
                        <div className="flex flex-col gap-2 mt-2" dir="ltr">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={settlementInput}
                                    onChange={(e) => setSettlementInput(e.target.value)}
                                    placeholder="مبلغ التسوية"
                                    className="flex-1 rounded-lg bg-[#0A1122]/75 backdrop-blur-sm border border-cyan-500/25 px-3 py-3 text-xs text-left text-cyan-50 font-bold tracking-wide tabular-nums placeholder:text-cyan-800/50 focus:outline-none focus:border-cyan-400/40"
                                />
                                <button
                                    type="button"
                                    onClick={applySettlementAndCollapse}
                                    disabled={!canApplySettlement}
                                    className="rounded-xl bg-gradient-to-l from-cyan-500 to-sky-700 px-5 py-2.5 text-white text-xs font-bold shadow-md shadow-cyan-950/30 disabled:opacity-35 disabled:cursor-not-allowed"
                                >
                                    تطبيق
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-500 text-center">
                                المبلغ المتبقي: {formatIqdDisplay(remainingUnified)} د.ع
                            </p>
                        </div>
                    )}
                </div>
            )}

            {standardRecentFinancialLedger.length > 0 && (
                <div className="border-t border-white/5 pt-4 mt-1 space-y-1.5">
                    <p className="text-[10px] text-slate-600 font-bold tracking-wider pb-1">آخر الحركات</p>
                    {standardRecentFinancialLedger.map((entry) => (
                        <div
                            key={entry.id}
                            className="flex items-center justify-between text-[11px] text-slate-400 py-1"
                        >
                            <span>
                                {entry.type === 'payment'
                                    ? 'دفعة'
                                    : entry.type === 'fee'
                                      ? 'رسوم'
                                      : entry.type === 'settlement'
                                        ? 'تسوية'
                                        : entry.type}
                            </span>
                            <span className="font-bold tabular-nums text-slate-300">
                                {formatIqdDisplay(entry.amount)} د.ع
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

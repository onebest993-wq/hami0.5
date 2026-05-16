import React, { Suspense } from 'react';
import { createPortal } from 'react-dom';
import { X, CreditCard, Wallet } from 'lucide-react';
import type { TimelineEvent } from '@/app/types/execution';

export interface ExecutionFinancialHubPortalProps {
    showExecutionFinancialHub: boolean;
    setShowExecutionFinancialHub: (v: boolean) => void;
    showSeizureLogModal: boolean;
    setShowSeizureLogModal: (v: boolean) => void;
    executionFinancialHubTab: 'ledger' | 'wallet';
    setExecutionFinancialHubTab: (v: 'ledger' | 'wallet') => void;
    financialHubAutoOpenMode: 'disburse' | null;
    setFinancialHubAutoOpenMode: React.Dispatch<React.SetStateAction<'disburse' | null>>;
    financialSeizureLogPreview: any[];
    financialSeizureLogEvents: any[];
    EXEC_MODAL_BACKDROP_STRONG: string;
    EXEC_MODAL_Z: { unifiedFollowUp: number };
    LazyFinancialOperationsCenter: React.LazyExoticComponent<React.ComponentType<any>>;
    ClientWalletExecutionSection: React.LazyExoticComponent<React.ComponentType<any>>;
    EXEC_FOC_LAZY_FALLBACK: React.ReactNode;
    realEstateSeizureRegistryAssets: any[];
    movableSeizureRegistryAssets: any[];
    salarySeizureRegistryAssets: any[];
    thirdPartySeizureRegistryAssets: any[];
    standaloneExecutionMarks: any[];
    executionData: Record<string, any> | null | undefined;
    executionId: string | undefined;
    isFinancialCenterExpanded: boolean;
    setIsFinancialCenterExpanded: React.Dispatch<React.SetStateAction<boolean>>;
    activeFinancialTab: number;
    setActiveFinancialTab: React.Dispatch<React.SetStateAction<number>>;
    principalDebtAmount: number;
    evictionLawyerFeesInTotals: number;
    isEvictionExecutionModule: boolean;
    parsedLawyerFees: number;
    total_execution_expenses: number;
    monthlyAlimony: number;
    totalOwed: number;
    remaining: number;
    parsedCourtFees: number;
    parsedDirectorateFees: number;
    parsedClientFees: number;
    financialStatus: { label: string; color: string; pulse: boolean };
    isNonFinancialClaim: boolean;
    isAlimonyClaim: boolean;
    claimType: string;
    paidDebt: number;
    totalWithExecutionFee: number;
    calculatedExecutionFee: number;
    shouldCalculateExecutionFee: boolean;
    accumulatedAlimony: number;
    paidCourtFees: number;
    paidDirectorateFees: number;
    paidClientFees: number;
    daysSinceNoticeCalculated: number;
    gracePeriodEnded: boolean;
    initiator: string;
    setShowPaymentCalculator: (v: boolean) => void;
    setShowSettlementCalculator: (v: boolean) => void;
    handleCoerciveAction: (action: string) => void;
    executionStatus: string;
    statusMetadata: any;
    isPaused: boolean;
    setShowLedgerModal: (v: boolean) => void;
    financialLedger: any[];
    evictionCaseExpensesTotalForFinancial: number;
    evictionCaseExpenses: any[];
    setShowEvictionExpenseModal: (v: boolean) => void;
    handleEvictionLawyerFeeRequest: () => void;
    lawyerFeePayoutApproved: boolean;
    handleFundsLedgerPayment: (data: any) => void;
    setTimelineEvents: React.Dispatch<React.SetStateAction<any[]>>;
    nextTimelineId: () => string;
    guarantorFollowupAwaitingDetailsSave: (data: any) => boolean;
    setShowUnifiedExecutionModal: (v: boolean) => void;
    setExecutionDebtorTabIndex: (v: number) => void;
    primaryDebtorWorkspaceKey: string | undefined;
    setExpandedDebtorById: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    openGuarantorDetailsModal: () => void;
    appendGuarantorFollowupRequest: (data: { executionId: string | undefined }) => { ok: boolean; decisionId?: string };
    decisionsStorageExecutionId: string | undefined;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info', options?: any) => void;
    timelineDebtorMetadata: (debtorKey: string) => Record<string, unknown>;
    assignmentWorkspaceCtx: { activeDebtorKey: string };
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    handleEvictionLedgerActivated: () => void;
    evictionAssetsTabUnlocked: boolean;
    syncPaidClientFeesFromWallet: (total: number) => void;
    getLocalTodayYmd: () => string;
    setCaseTasksPending: React.Dispatch<React.SetStateAction<any[]>>;
    patchRealEstateMarkConfirmation: (id: string, data: Record<string, unknown>) => void;
    realEstateAuctionDateDraftById: Record<string, string>;
    setRealEstateAuctionDateDraftById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    saveRealEstateAuctionDate: (asset: any, ymd: string) => void;
    beginRealEstateSalePriceStep: (asset: any) => void;
    cancelRealEstateSalePriceStep: (asset: any) => void;
    confirmRealEstateSaleWithPrice: (asset: any) => void;
    updateRealEstateSaleDraft: (assetId: string, v: string) => void;
    archiveRealEstateSeizureRow: (asset: any) => void;
    undoArchiveRealEstateSeizureRow: (asset: any) => void;
    releaseSeizureAssetRow: (asset: any) => void;
    undoReleaseSeizureAssetRow: (asset: any) => void;
    saveSeizureAuctionDate: (asset: any, ymd: string) => void;
    seizureAuctionDateDraftById: Record<string, string>;
    setSeizureAuctionDateDraftById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    patchSeizureMarkConfirmation: (id: string, data: Record<string, unknown>) => void;
    beginSeizureSalePriceStep: (asset: any) => void;
    confirmSeizureSaleWithPrice: (asset: any) => void;
    cancelSeizureSalePriceStep: (asset: any) => void;
    updateSeizureSaleDraft: (assetId: string, v: string) => void;
    salarySeizureReleaseSeizureAssetRow: (asset: any) => void;
    salarySeizureUndoReleaseSeizureAssetRow: (asset: any) => void;
    beginThirdPartyReceiveStep: (asset: any) => void;
    updateThirdPartyReceiveDraft: (assetId: string, v: string) => void;
    cancelThirdPartyReceiveStep: (asset: any) => void;
    confirmThirdPartyReceive: (asset: any) => void;
    toggleStandaloneExecutionMarkConfirmed: (mark: any) => void;
    archiveStandaloneExecutionMark: (mark: any) => void;
    undoArchiveStandaloneExecutionMark: (mark: any) => void;
}

export const ExecutionFinancialHubPortal: React.FC<ExecutionFinancialHubPortalProps> = ({
    showExecutionFinancialHub,
    setShowExecutionFinancialHub,
    showSeizureLogModal,
    setShowSeizureLogModal,
    executionFinancialHubTab,
    setExecutionFinancialHubTab,
    financialHubAutoOpenMode,
    setFinancialHubAutoOpenMode,
    financialSeizureLogPreview,
    financialSeizureLogEvents,
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
    LazyFinancialOperationsCenter,
    ClientWalletExecutionSection,
    EXEC_FOC_LAZY_FALLBACK,
    realEstateSeizureRegistryAssets,
    movableSeizureRegistryAssets,
    salarySeizureRegistryAssets,
    thirdPartySeizureRegistryAssets,
    standaloneExecutionMarks,
    executionData,
    executionId,
    isFinancialCenterExpanded,
    setIsFinancialCenterExpanded,
    activeFinancialTab,
    setActiveFinancialTab,
    principalDebtAmount,
    evictionLawyerFeesInTotals,
    isEvictionExecutionModule,
    parsedLawyerFees,
    total_execution_expenses,
    monthlyAlimony,
    totalOwed,
    remaining,
    parsedCourtFees,
    parsedDirectorateFees,
    parsedClientFees,
    financialStatus,
    isNonFinancialClaim,
    isAlimonyClaim,
    claimType,
    paidDebt,
    totalWithExecutionFee,
    calculatedExecutionFee,
    shouldCalculateExecutionFee,
    accumulatedAlimony,
    paidCourtFees,
    paidDirectorateFees,
    paidClientFees,
    daysSinceNoticeCalculated,
    gracePeriodEnded,
    initiator,
    setShowPaymentCalculator,
    setShowSettlementCalculator,
    handleCoerciveAction,
    executionStatus,
    statusMetadata,
    isPaused,
    setShowLedgerModal,
    financialLedger,
    evictionCaseExpensesTotalForFinancial,
    evictionCaseExpenses,
    setShowEvictionExpenseModal,
    handleEvictionLawyerFeeRequest,
    lawyerFeePayoutApproved,
    handleFundsLedgerPayment,
    setTimelineEvents,
    nextTimelineId,
    guarantorFollowupAwaitingDetailsSave,
    setShowUnifiedExecutionModal,
    setExecutionDebtorTabIndex,
    primaryDebtorWorkspaceKey,
    setExpandedDebtorById,
    openGuarantorDetailsModal,
    appendGuarantorFollowupRequest,
    decisionsStorageExecutionId,
    showToast,
    timelineDebtorMetadata,
    assignmentWorkspaceCtx,
    persistExecutionMerge,
    handleEvictionLedgerActivated,
    evictionAssetsTabUnlocked,
    syncPaidClientFeesFromWallet,
    getLocalTodayYmd,
    setCaseTasksPending,
    patchRealEstateMarkConfirmation,
    realEstateAuctionDateDraftById,
    setRealEstateAuctionDateDraftById,
    saveRealEstateAuctionDate,
    beginRealEstateSalePriceStep,
    cancelRealEstateSalePriceStep,
    confirmRealEstateSaleWithPrice,
    updateRealEstateSaleDraft,
    archiveRealEstateSeizureRow,
    undoArchiveRealEstateSeizureRow,
    releaseSeizureAssetRow,
    undoReleaseSeizureAssetRow,
    saveSeizureAuctionDate,
    seizureAuctionDateDraftById,
    setSeizureAuctionDateDraftById,
    patchSeizureMarkConfirmation,
    beginSeizureSalePriceStep,
    confirmSeizureSaleWithPrice,
    cancelSeizureSalePriceStep,
    updateSeizureSaleDraft,
    salarySeizureReleaseSeizureAssetRow,
    salarySeizureUndoReleaseSeizureAssetRow,
    beginThirdPartyReceiveStep,
    updateThirdPartyReceiveDraft,
    cancelThirdPartyReceiveStep,
    confirmThirdPartyReceive,
    toggleStandaloneExecutionMarkConfirmed,
    archiveStandaloneExecutionMark,
    undoArchiveStandaloneExecutionMark,
}) => {
    const debtors = (executionData?.debtors as any[]) || [];
    const firstDebtor = debtors[0] || {};
    const debtorJob = firstDebtor?.occupation || '\u0643\u0627\u0633\u0628';
    const debtorEmploymentType = firstDebtor?.employmentType;
    const debtorKinship = firstDebtor?.kinship || '';
    const creditors = (executionData?.creditors as any[]) || [];
    const creditorsCount = Array.isArray(creditors) ? creditors.length : 0;
    const ghuramaaCreditors = React.useMemo(() => {
        const list = Array.isArray(creditors) ? creditors : [];
        return list.map((c: any) => {
            const creditorId = String(c?.id ?? '').trim();
            const creditorName = String(c?.fullName ?? c?.name ?? 'دائن').trim() || 'دائن';
            const allocRaw =
                c?.allocated_debt ??
                c?.allocatedDebt ??
                c?.debtAmountIqd ??
                c?.debtAmount ??
                c?.claimAmountIqd ??
                c?.creditorDebtAmountIqd;
            const paidRaw = c?.paid_amount ?? c?.paidAmount ?? c?.paidDebtAmountIqd ?? 0;
            const alloc = Number(allocRaw);
            const paid = Number(paidRaw);
            const debtBeforeDistribution = Number.isFinite(alloc) ? Math.max(0, Math.trunc(alloc)) : 0;
            const paidSafe = Number.isFinite(paid) ? Math.max(0, Math.trunc(paid)) : 0;
            const remainingDebt = Math.max(0, debtBeforeDistribution - paidSafe);
            return { creditorId, creditorName, debtBeforeDistribution, remainingDebt };
        });
    }, [creditors]);

    if (!showExecutionFinancialHub || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG}`}
            style={{ zIndex: EXEC_MODAL_Z.unifiedFollowUp }}
            role="presentation"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    setShowSeizureLogModal(false);
                    setFinancialHubAutoOpenMode(null);
                    setShowExecutionFinancialHub(false);
                }
            }}
        >
            <div
                className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border-2 border-[#E6C673]/40 bg-[#0B1120] shadow-2xl shadow-black/50"
                onClick={(e) => e.stopPropagation()}
            >
                {showSeizureLogModal ? (
                    <div
                        className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-black/60"
                        role="presentation"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setShowSeizureLogModal(false);
                        }}
                    >
                        <div
                            className="w-full max-w-md rounded-2xl border border-[#E6C673]/25 bg-[#05060D]/85 backdrop-blur-xl p-3"
                            onClick={(e) => e.stopPropagation()}
                            dir="rtl"
                        >
                            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                                <button
                                    type="button"
                                    onClick={() => setShowSeizureLogModal(false)}
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
                                    aria-label="إغلاق سجل الحجوزات"
                                >
                                    <X size={18} />
                                </button>
                                <p className="text-[11px] font-bold text-[#E6C673]">
                                    سجل الحجوزات
                                </p>
                                <span className="w-8" aria-hidden />
                            </div>
                            <div className="mt-2 max-h-[55vh] overflow-y-auto space-y-2">
                                {financialSeizureLogPreview.map((e: any) => (
                                    <div
                                        key={String(e?.id)}
                                        className="rounded-xl border border-white/10 bg-slate-900/40 px-2.5 py-2"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-[10px] font-bold text-slate-100 text-right leading-snug">
                                                {String(e?.title || '—')}
                                            </p>
                                            <p className="shrink-0 text-[9px] text-slate-500 tabular-nums">
                                                {String(e?.date || '')}
                                            </p>
                                        </div>
                                        {String(e?.description || '').trim() ? (
                                            <p className="mt-1 text-[9px] text-slate-400 leading-relaxed text-right">
                                                {String(e?.description || '')}
                                            </p>
                                        ) : null}
                                    </div>
                                ))}
                                {financialSeizureLogEvents.length === 0 ? (
                                    <p className="text-center text-[10px] text-slate-500 py-4">
                                        لا توجد حجوزات مسجلة بعد.
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    </div>
                ) : null}
                <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-2 border-b border-[#E6C673]/30 bg-[#0B1120] p-3">
                    <button
                        type="button"
                        onClick={() => {
                            setShowSeizureLogModal(false);
                            setFinancialHubAutoOpenMode(null);
                            setShowExecutionFinancialHub(false);
                        }}
                        className="rounded-lg p-2 text-slate-400 transition-all hover:bg-[#E6C673]/15 hover:text-white"
                        aria-label="إغلاق المركز المالي"
                    >
                        <X size={20} />
                    </button>
                    <h2 className="flex flex-row-reverse items-center gap-2 text-base font-bold text-[#E6C673]">
                        <Wallet size={20} className="shrink-0 text-[#E6C673]" />
                        المركز المالي
                    </h2>
                    <span className="w-9 shrink-0" aria-hidden />
                </div>

                <div className="shrink-0 border-b border-white/10 bg-gradient-to-l from-slate-950/90 to-[#0A0F1C] px-2.5 py-2">
                    <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-[#05060D]/80 p-1 ring-1 ring-[#E6C673]/25">
                        <button
                            type="button"
                            onClick={() => setExecutionFinancialHubTab('ledger')}
                            className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-center transition-all ${
                                executionFinancialHubTab === 'ledger'
                                    ? 'border border-[#E6C673]/50 bg-gradient-to-br from-[#E6C673]/20 to-amber-950/40 text-[#E6C673] shadow-[inset_0_1px_0_rgba(230,198,115,0.25)]'
                                    : 'border border-transparent text-slate-500 hover:bg-white/[0.04] hover:text-slate-300'
                            }`}
                        >
                            <CreditCard size={16} className="shrink-0 opacity-90" />
                            <span className="text-[10px] font-bold leading-tight">
                                إدارة الأموال والمصاريف
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setExecutionFinancialHubTab('wallet')}
                            className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-center transition-all ${
                                executionFinancialHubTab === 'wallet'
                                    ? 'border border-[#E6C673]/50 bg-gradient-to-br from-[#E6C673]/20 to-amber-950/40 text-[#E6C673] shadow-[inset_0_1px_0_rgba(230,198,115,0.25)]'
                                    : 'border border-transparent text-slate-500 hover:bg-white/[0.04] hover:text-slate-300'
                            }`}
                        >
                            <Wallet size={16} className="shrink-0 opacity-90" />
                            <span className="text-[10px] font-bold leading-tight">
                                محفظة الموكلي
                            </span>
                        </button>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-5 pt-2">
                    {executionFinancialHubTab === 'ledger' ? (
                        <>
                        <Suspense fallback={EXEC_FOC_LAZY_FALLBACK}>
                        <LazyFinancialOperationsCenter
                            embeddedInFinancialHub
                            isExpanded={isFinancialCenterExpanded}
                            onToggle={() =>
                                setIsFinancialCenterExpanded((prev) => !prev)
                            }
                            activeTab={activeFinancialTab}
                            onTabChange={setActiveFinancialTab}
                            principal_amount={principalDebtAmount}
                            court_ordered_fees={evictionLawyerFeesInTotals}
                            evictionLawyerFeeWaivedAtIntake={Boolean(
                                executionData?.eviction_lawyer_fee_waived_at_intake
                            )}
                            evictionReenableCourtOrderedFees={
                                isEvictionExecutionModule &&
                                executionData?.eviction_lawyer_fee_waived_at_intake &&
                                parsedLawyerFees > 0
                                    ? {
                                          grossAmount: parsedLawyerFees,
                                          onEnable: () =>
                                              persistExecutionMerge({
                                                  eviction_lawyer_fee_waived_at_intake: false,
                                              }),
                                      }
                                    : undefined
                            }
                            execution_expenses_sum={total_execution_expenses}
                            past_wife_alimony={executionData?.pastWifeAlimony || 0}
                            past_children_alimony={executionData?.pastChildrenAlimony || 0}
                            monthly_wife_alimony={executionData?.monthlyWifeAlimony || monthlyAlimony}
                            monthly_children_alimony={
                                executionData?.monthlyChildrenAlimony || 0
                            }
                            children_count={executionData?.childrenCount || 1}
                            totalOwed={totalOwed}
                            remaining={remaining}
                            feesTotal={
                                parsedCourtFees + parsedDirectorateFees + parsedClientFees
                            }
                            financialStatus={financialStatus}
                            isNonFinancialClaim={isNonFinancialClaim}
                            isAlimonyClaim={isAlimonyClaim}
                            claimType={claimType}
                            paidDebt={paidDebt}
                            totalWithExecutionFee={totalWithExecutionFee}
                            executionFee={calculatedExecutionFee}
                            shouldCalculateExecutionFee={shouldCalculateExecutionFee}
                            monthlyAlimony={monthlyAlimony}
                            accumulatedAlimony={accumulatedAlimony}
                            courtFees={parsedCourtFees}
                            directorateFees={parsedDirectorateFees}
                            clientFees={parsedClientFees}
                            paidCourtFees={paidCourtFees}
                            paidDirectorateFees={paidDirectorateFees}
                            paidClientFees={paidClientFees}
                            daysSinceNotice={daysSinceNoticeCalculated}
                            gracePeriodEnded={gracePeriodEnded}
                            debtorJob={debtorJob}
                            debtorEmploymentType={debtorEmploymentType}
                            debtorKinship={debtorKinship}
                            initiator={initiator}
                            onPayment={() => setShowPaymentCalculator(true)}
                            onSettlement={() => setShowSettlementCalculator(true)}
                            onCoerciveAction={(action: string) => {
                                handleCoerciveAction(action);
                            }}
                            executionStatus={executionStatus}
                            statusMetadata={statusMetadata}
                            isPaused={isPaused}
                            onShowLedger={() => setShowLedgerModal(true)}
                            onShowSeizureLog={() => setShowSeizureLogModal(true)}
                            financialLedger={financialLedger}
                            autoOpenLedgerMode={financialHubAutoOpenMode}
                            onAutoOpenHandled={() => setFinancialHubAutoOpenMode(null)}
                            executionId={(() => {
                                const resolved = String(executionData?.id ?? executionId ?? '').trim();
                                return resolved && resolved !== 'undefined' ? resolved : undefined;
                            })()}
                            creditorsCount={creditorsCount}
                            ghuramaaCreditors={ghuramaaCreditors}
                            onApplyGhuramaaDistribution={(args: any) => {
                                const details = Array.isArray(args?.distributionDetails)
                                    ? (args.distributionDetails as any[])
                                    : [];
                                const total = Math.max(0, Math.trunc(Number(args?.totalAmountDistributed ?? 0) || 0));
                                const ts = String(args?.dateIso || new Date().toISOString());
                                const transactionId = String(args?.transactionId || `ghr-${Date.now()}`);
                                const prevLogs = Array.isArray((executionData as any)?.ghuramaDistributionLogs)
                                    ? (((executionData as any).ghuramaDistributionLogs as any[]) || [])
                                    : [];
                                const nextLog = {
                                    transactionId,
                                    dateIso: ts,
                                    totalAmountDistributed: total,
                                    distributionDetails: details.map((d: any) => ({
                                        creditorId: String(d?.creditorId ?? '').trim(),
                                        creditorName: String(d?.creditorName ?? 'دائن').trim() || 'دائن',
                                        debtBeforeDistribution: Math.max(0, Math.trunc(Number(d?.debtBeforeDistribution ?? 0) || 0)),
                                        amountDistributed: Math.max(0, Math.trunc(Number(d?.amountDistributed ?? 0) || 0)),
                                    })),
                                };
                                const nextCreditors = (Array.isArray(creditors) ? creditors : []).map((c: any) => {
                                    const cid = String(c?.id ?? '').trim();
                                    if (!cid) return c;
                                    const hit = nextLog.distributionDetails.find((x: any) => String(x.creditorId) === cid);
                                    if (!hit) return c;
                                    const prevPaidRaw = c?.paid_amount ?? c?.paidAmount ?? c?.paidDebtAmountIqd ?? 0;
                                    const prevPaid = Number(prevPaidRaw);
                                    const paidSafe = Number.isFinite(prevPaid) ? Math.max(0, Math.trunc(prevPaid)) : 0;
                                    return { ...c, paid_amount: paidSafe + hit.amountDistributed };
                                });
                                persistExecutionMerge({
                                    creditors: nextCreditors,
                                    ghuramaDistributionLogs: [nextLog, ...prevLogs],
                                });
                            }}
                            eviction_case_expenses_sum={
                                isEvictionExecutionModule ? evictionCaseExpensesTotalForFinancial : 0
                            }
                            evictionFinanceStrip={
                                isEvictionExecutionModule
                                    ? {
                                          expensesSum: evictionCaseExpensesTotalForFinancial,
                                          expenseRows: evictionCaseExpenses.length,
                                          onRecordExpense: () =>
                                              setShowEvictionExpenseModal(true),
                                          onRequestLawyerFees: handleEvictionLawyerFeeRequest,
                                          lawyerFeeRequestDisabled: lawyerFeePayoutApproved,
                                          lawyerFeeRequestTitle: lawyerFeePayoutApproved
                                              ? 'تم قبول صرف الأتعاب من المنفذ — لا يُعاد الطلب'
                                              : undefined,
                                      }
                                    : undefined
                            }
                            onFundsLedgerPayment={handleFundsLedgerPayment}
                            onFinancialTimelineNote={(title: string, description: string) => {
                                const ev: TimelineEvent = {
                                    id: nextTimelineId(),
                                    date: new Date().toISOString(),
                                    timestamp: new Date().toISOString(),
                                    title,
                                    description,
                                    type: 'other',
                                    source: 'إدارة الأموال والمصاريف',
                                };
                                setTimelineEvents((prev) => [ev, ...prev]);
                            }}
                            onGuarantorRequest={() => {
                                if (
                                    guarantorFollowupAwaitingDetailsSave(
                                        executionData?.guarantor_followup
                                    )
                                ) {
                                    setShowUnifiedExecutionModal(false);
                                    setExecutionDebtorTabIndex(0);
                                    if (primaryDebtorWorkspaceKey) {
                                        setExpandedDebtorById((prev) => ({
                                            ...prev,
                                            [primaryDebtorWorkspaceKey]: true,
                                        }));
                                    }
                                    openGuarantorDetailsModal();
                                    return;
                                }
                                const gReq = appendGuarantorFollowupRequest({
                                    executionId: decisionsStorageExecutionId,
                                });
                                if (!gReq.ok) {
                                    showToast('يوجد طلب كفيل قيد البت لدى المنفذ.', 'warning', {
                                        decisionsLink: true,
                                    });
                                    return;
                                }
                                if (gReq.decisionId) {
                                    const ts = new Date().toISOString();
                                    setTimelineEvents((prev) => [
                                        {
                                            id: nextTimelineId(),
                                            date: ts.slice(0, 10),
                                            timestamp: ts,
                                            title: 'طلب إدخال كفيل ضامن — قيد البت',
                                            type: 'decision',
                                            source: 'القرارات والطعون',
                                            metadata: {
                                                ...timelineDebtorMetadata(
                                                    assignmentWorkspaceCtx.activeDebtorKey
                                                ),
                                                timelineThreadKey: `executor_decision:${gReq.decisionId}`,
                                                decisionRowId: gReq.decisionId,
                                            },
                                        },
                                        ...prev,
                                    ]);
                                }
                                showToast('تم إرسال طلب الكفيل إلى القرارات والطعون.', 'success', {
                                    decisionsLink: true,
                                });
                            }}
                            evictionLedgerActivatedPersisted={Boolean(
                                executionData?.eviction_assets_tab_unlocked || evictionAssetsTabUnlocked
                            )}
                            onEvictionLedgerActivated={handleEvictionLedgerActivated}
                            onAfterCollectionRequestSubmitted={() => {
                                showToast(
                                    'تم حفظ الطلب بنجاح وتحويله إلى مركز القرارات بانتظار موافقة المنفذ',
                                    'success',
                                    { decisionsLink: true }
                                );
                            }}
                            onMonthlySettlementDefault={({ dueDate, amount }: { dueDate: string; amount: number }) => {
                                const ts = new Date().toISOString();
                                const ymd = getLocalTodayYmd();
                                const title = '\u26A0\uFE0F \u0646\u0643\u0633 \u0627\u0644\u062A\u0633\u0648\u064A\u0629 \u0627\u0644\u0634\u0647\u0631\u064A\u0629';
                                const body = `\u0644\u0645 \u064A\u062A\u0645 \u062F\u0641\u0639 \u0627\u0644\u062A\u0633\u0648\u064A\u0629 \u0627\u0644\u0645\u0633\u062A\u062D\u0642\u0629 \u0628\u062A\u0627\u0631\u064A\u062E ${dueDate} \u0628\u0645\u0628\u0644\u063A ${Math.max(0, amount).toLocaleString(
                                    'ar-IQ'
                                )} \u062F.\u0639.\n\u064A\u0644\u0632\u0645 \u0627\u062A\u062E\u0627\u0630 \u0625\u062C\u0631\u0627\u0621\u0627\u062A \u062C\u0628\u0631\u064A\u0629.`;
                                setCaseTasksPending((prev: any) => {
                                    const prevDue = String(
                                        (executionData as any)?.monthly_settlement_default_dueDate || ''
                                    ).trim();
                                    const prevDelay = Number(
                                        (executionData as any)?.monthly_settlement_delay_count
                                    );
                                    const safePrevDelay = Number.isFinite(prevDelay) ? prevDelay : 0;
                                    const nextDelay = dueDate && prevDue === dueDate ? safePrevDelay + 1 : safePrevDelay + 1;
                                    const exists = prev.some(
                                        (t: any) =>
                                            !t?.trashedAt &&
                                            String(t?.title || '').trim() === title &&
                                            String(t?.dueDate || '').trim() === String(dueDate || '').trim()
                                    );
                                    const next = exists
                                        ? prev
                                        : ([
                                              ...prev,
                                              {
                                                  id: nextTimelineId(),
                                                  title,
                                                  body,
                                                  dueDate: String(dueDate || ymd).trim(),
                                                  createdAt: ts,
                                              },
                                          ] as any);
                                    queueMicrotask(() =>
                                        persistExecutionMerge({
                                            caseTasksPending: next,
                                            monthly_settlement_default_alert: true,
                                            monthly_settlement_default_dueDate: dueDate,
                                            monthly_settlement_delay_count: nextDelay,
                                            monthly_settlement_default_at: ts,
                                        } as any)
                                    );
                                    return next as any;
                                });
                                showToast('\u26A0\uFE0F \u0646\u0643\u0633 \u0627\u0644\u062A\u0633\u0648\u064A\u0629: \u062A\u0645 \u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u062A\u0646\u0628\u064A\u0647 \u0641\u064A \u0627\u0644\u0625\u0636\u0628\u0627\u0631\u0629.', 'warning');
                            }}
                            onMonthlySettlementPaid={({ dueDate, nextDueDate, amount }: { dueDate: string; nextDueDate: string; amount: number }) => {
                                const ts = new Date().toISOString();
                                setCaseTasksPending((prev: any) => {
                                    const next = prev.map((t: any) => {
                                        if (
                                            !t?.trashedAt &&
                                            String(t?.title || '').trim() === '\u26A0\uFE0F \u0646\u0643\u0633 \u0627\u0644\u062A\u0633\u0648\u064A\u0629 \u0627\u0644\u0634\u0647\u0631\u064A\u0629' &&
                                            String(t?.dueDate || '').trim() === String(dueDate || '').trim()
                                        ) {
                                            return { ...t, trashedAt: ts };
                                        }
                                        return t;
                                    });
                                    queueMicrotask(() =>
                                        persistExecutionMerge({
                                            caseTasksPending: next,
                                            monthly_settlement_default_alert: false,
                                            monthly_settlement_default_dueDate: null,
                                            monthly_settlement_delay_count: 0,
                                            monthly_settlement_last_paid_at: ts,
                                            monthly_settlement_last_paid_amount: Math.max(0, amount || 0),
                                            monthly_settlement_next_dueDate: String(nextDueDate || '').trim(),
                                        } as any)
                                    );
                                    return next as any;
                                });
                            }}
                            onToast={(
                                message: string,
                                variant: 'success' | 'error' | 'warning' | 'info' = 'warning',
                                options?: {
                                    decisionsLink?: boolean;
                                    decisionId?: string;
                                    decisionsTab?: 'current' | 'previous' | 'appeals';
                                    action?: { label: string; onClick: () => void };
                                }
                            ) => showToast(message, variant, options)}
                            onEvictionCourtOrderedFeesActivatedFromLedger={(totalAmount: number) => {
                                persistExecutionMerge({
                                    eviction_lawyer_fee_waived_at_intake: false,
                                    includeLawyerFees: true,
                                    lawyerFeesAmount: totalAmount,
                                });
                                showToast(
                                    '\u062A\u0645 \u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u0623\u062A\u0639\u0627\u0628 \u0627\u0644\u0645\u062D\u0643\u0648\u0645\u0629 \u0641\u064A \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0625\u0636\u0628\u0627\u0631\u0629 \u0645\u0646 \u0627\u0644\u0648\u0639\u0627\u0621 \u0627\u0644\u0645\u0648\u062D\u0651\u062F',
                                    'success'
                                );
                            }}
                        />
                        </Suspense>

                        {false ? (
                            <div className="mt-3 px-1" dir="rtl">
                                <div className="rounded-2xl border border-sky-500/20 bg-[#05060D]/60 p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-[11px] font-bold text-sky-300">
                                            سجل الحجوزات — عقار
                                        </p>
                                        <span className="text-[10px] text-slate-500 tabular-nums">
                                            {realEstateSeizureRegistryAssets.length}
                                        </span>
                                    </div>
                                    <div className="mt-2 space-y-3">
                                        {realEstateSeizureRegistryAssets.map((asset: any) => {
                                            const locked = Boolean(asset.record_locked);
                                            const archivedLocked = locked && String(asset.status) === 'archived';
                                            const soldLocked = locked && String(asset.status) === 'sold';
                                            const auctionDraft =
                                                realEstateAuctionDateDraftById[asset.id] ||
                                                asset.auction_date_ymd ||
                                                '';
                                            const saleDraft = String(asset.sale_price_draft || '');
                                            const markConfirmed = Boolean(asset.isMarkConfirmed);
                                            const markLock = !markConfirmed;
                                            const statusLabel =
                                                asset.status === 'seized'
                                                    ? 'تم الحجز'
                                                    : asset.status === 'archived'
                                                      ? 'ملغى/مؤرشف'
                                                      : asset.status === 'sold'
                                                        ? `تم البيع${asset.sale_price_iqd ? ` — ${asset.sale_price_iqd} د.ع` : ''}`
                                                        : String(asset.status || '—');
                                            const est =
                                                typeof asset.estimatedPriceIqd === 'number' &&
                                                Number.isFinite(asset.estimatedPriceIqd) &&
                                                asset.estimatedPriceIqd > 0
                                                    ? `${asset.estimatedPriceIqd.toLocaleString('ar-IQ')} د.ع`
                                                    : '—';
                                            const auctionDateYmd = String(asset.auction_date_ymd || '').trim();
                                            const showSellAction = (() => {
                                                if (locked || asset.status !== 'seized') return false;
                                                if (!auctionDateYmd) return false;
                                                if (markLock) return false;
                                                const today = new Date(`${getLocalTodayYmd()}T00:00:00`);
                                                const auction = new Date(`${auctionDateYmd}T00:00:00`);
                                                const diffDays = Math.floor(
                                                    (auction.getTime() - today.getTime()) / 86400000
                                                );
                                                return diffDays <= 7;
                                            })();

                                            return (
                                                <div
                                                    key={String(asset.id)}
                                                    className={`relative overflow-hidden rounded-2xl border p-3 backdrop-blur-xl ${
                                                        locked
                                                            ? 'border-slate-600/40 bg-slate-900/55 opacity-90'
                                                            : 'border-slate-700/40 bg-slate-800/55'
                                                    }`}
                                                >
                                                    <div className="mb-2 flex flex-col gap-2 sm:flex-row-reverse sm:items-start sm:justify-between">
                                                        <span
                                                            className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] ${
                                                                asset.status === 'seized'
                                                                    ? 'bg-emerald-500/20 text-emerald-200'
                                                                    : asset.status === 'sold'
                                                                      ? 'bg-violet-500/20 text-violet-200'
                                                                      : asset.status === 'archived'
                                                                        ? 'bg-slate-500/25 text-slate-300'
                                                                        : 'bg-blue-500/20 text-blue-200'
                                                            }`}
                                                        >
                                                            {statusLabel}
                                                        </span>
                                                        <div className="min-w-0 text-right">
                                                            <p className="truncate text-[11px] font-bold text-slate-50">
                                                                {asset.propertyNoAndDistrict || '—'}
                                                            </p>
                                                            <p className="mt-0.5 text-[10px] text-slate-300">
                                                                {asset.propertyGender || '—'} · {est}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {asset.deedNotes ? (
                                                        <p className="text-[10px] leading-relaxed text-slate-300 text-right whitespace-pre-line">
                                                            {asset.deedNotes}
                                                        </p>
                                                    ) : null}

                                                    <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                                                        <div className="rounded-xl border border-white/10 bg-black/20 px-2 py-1.5 text-right">
                                                            <span className="text-slate-500">تاريخ المزايدة</span>
                                                            <div className="mt-0.5 text-slate-200 tabular-nums">
                                                                {asset.auction_date_ymd || '—'}
                                                            </div>
                                                        </div>
                                                        <div className="rounded-xl border border-white/10 bg-black/20 px-2 py-1.5 text-right">
                                                            <span className="text-slate-500">سعر البيع النهائي</span>
                                                            <div className="mt-0.5 text-slate-200 tabular-nums">
                                                                {asset.sale_price_iqd ? `${asset.sale_price_iqd} د.ع` : '—'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-2 rounded-xl border border-white/10 bg-black/20 p-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                patchRealEstateMarkConfirmation(asset.id, {
                                                                    isMarkConfirmed: !markConfirmed,
                                                                    ...(markConfirmed
                                                                        ? { markConfirmationLetterNo: undefined, markConfirmationLetterDateYmd: null }
                                                                        : {}),
                                                                })
                                                            }
                                                            className={`w-full rounded-lg border px-3 py-2 text-[11px] font-extrabold transition-colors ${
                                                                markConfirmed
                                                                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15'
                                                                    : 'border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15'
                                                            }`}
                                                        >
                                                            {markConfirmed ? 'تم تأييد وضع الإشارة' : 'بانتظار تأييد وضع الإشارة (من الطابو)'}
                                                        </button>
                                                        {markConfirmed ? (
                                                            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                                <input
                                                                    type="text"
                                                                    value={String(asset.markConfirmationLetterNo || '')}
                                                                    onChange={(e) => patchRealEstateMarkConfirmation(asset.id, { markConfirmationLetterNo: e.target.value })}
                                                                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-100"
                                                                    placeholder="رقم كتاب التأييد"
                                                                />
                                                                <input
                                                                    type="date"
                                                                    value={asset.markConfirmationLetterDateYmd || ''}
                                                                    onChange={(e) => patchRealEstateMarkConfirmation(asset.id, { markConfirmationLetterDateYmd: e.target.value || null })}
                                                                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-100"
                                                                />
                                                            </div>
                                                        ) : null}
                                                    </div>

                                                    {locked ? null : (
                                                        <div className="mt-3 flex flex-col gap-2">
                                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                                <button
                                                                    type="button"
                                                                    disabled={markLock}
                                                                    className="rounded-xl border border-sky-500/30 bg-sky-950/30 px-3 py-2 text-[11px] font-bold text-sky-100 hover:bg-sky-900/30 disabled:opacity-40 disabled:pointer-events-none"
                                                                    onClick={() => {
                                                                        const el = document.getElementById(`re_auction_${asset.id}`) as any;
                                                                        if (el?.showPicker) el.showPicker();
                                                                        else el?.focus?.();
                                                                    }}
                                                                >
                                                                    تحديد موعد المزايدة
                                                                </button>
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        id={`re_auction_${asset.id}`}
                                                                        type="date"
                                                                        value={auctionDraft}
                                                                        disabled={markLock}
                                                                        onChange={(e) => setRealEstateAuctionDateDraftById((p) => ({ ...p, [asset.id]: e.target.value }))}
                                                                        className="h-[34px] rounded-xl border border-white/10 bg-white/5 px-2 text-[11px] text-slate-100"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        disabled={markLock}
                                                                        className="h-[34px] rounded-xl bg-white/10 px-3 text-[11px] font-bold text-slate-100 hover:bg-white/15 disabled:opacity-40 disabled:pointer-events-none"
                                                                        onClick={() => saveRealEstateAuctionDate(asset, auctionDraft)}
                                                                    >
                                                                        حفظ
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {asset.awaiting_sale_price ? (
                                                                <div className="flex flex-col gap-2 rounded-2xl border border-violet-500/25 bg-violet-950/20 p-3">
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <p className="text-[11px] font-bold text-violet-200">أدخل سعر البيع النهائي</p>
                                                                        <button
                                                                            type="button"
                                                                            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-200 hover:bg-white/10"
                                                                            onClick={() => cancelRealEstateSalePriceStep(asset)}
                                                                        >
                                                                            إلغاء
                                                                        </button>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <input
                                                                            type="text"
                                                                            inputMode="numeric"
                                                                            value={saleDraft}
                                                                            onChange={(e) => updateRealEstateSaleDraft(asset.id, e.target.value)}
                                                                            className="h-[36px] w-full rounded-xl border border-white/10 bg-white/5 px-3 text-[12px] text-slate-100 text-right"
                                                                            placeholder="مثال: 150000000"
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            className="h-[36px] shrink-0 rounded-xl bg-gradient-to-l from-violet-500 to-fuchsia-700 px-4 text-[11px] font-black text-white"
                                                                            onClick={() => confirmRealEstateSaleWithPrice(asset)}
                                                                        >
                                                                            تأكيد البيع
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : showSellAction ? (
                                                                <button
                                                                    type="button"
                                                                    className="w-full rounded-xl bg-gradient-to-l from-violet-500 to-fuchsia-700 px-4 py-2 text-[11px] font-black text-white"
                                                                    onClick={() => beginRealEstateSalePriceStep(asset)}
                                                                >
                                                                    تم البيع والإحالة القطعية
                                                                </button>
                                                            ) : null}

                                                            {soldLocked ? null : (
                                                                <button
                                                                    type="button"
                                                                    className="w-full rounded-xl border border-rose-500/30 bg-rose-950/25 px-4 py-2 text-[11px] font-black text-rose-100 hover:bg-rose-900/25"
                                                                    onClick={() => archiveRealEstateSeizureRow(asset)}
                                                                >
                                                                    فك الحجز
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}

                                                    {archivedLocked ? (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                                            <button
                                                                type="button"
                                                                className="rounded-xl bg-white/10 px-4 py-2 text-[11px] font-black text-white hover:bg-white/15"
                                                                onClick={() => undoArchiveRealEstateSeizureRow(asset)}
                                                            >
                                                                تراجع
                                                            </button>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {false ? (
                            <div className="mt-3 px-1" dir="rtl">
                                <div className="rounded-2xl border border-[#E6C673]/20 bg-[#05060D]/60 p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-[11px] font-bold text-[#E6C673]">
                                            سجل الحجوزات — مال منقول
                                        </p>
                                        <span className="text-[10px] text-slate-500 tabular-nums">
                                            {movableSeizureRegistryAssets.length}
                                        </span>
                                    </div>
                                    <div className="mt-2 space-y-3">
                                        {movableSeizureRegistryAssets.map((asset: any) => {
                                            const locked = Boolean(asset.seizure_record_locked);
                                            const releasedLocked = locked && String(asset.status) === 'released';
                                            const statusLabel =
                                                asset.status === 'seized'
                                                    ? 'تم الحجز'
                                                    : asset.status === 'released'
                                                      ? 'فُك الحجز'
                                                      : asset.status === 'sold'
                                                        ? `تمت المزايدة${asset.sale_price_iqd ? ` — ${asset.sale_price_iqd} د.ع` : ''}`
                                                        : String(asset.status || '—');
                                            const det =
                                                typeof asset.details === 'object' && asset.details && !Array.isArray(asset.details)
                                                    ? (asset.details as Record<string, unknown>)
                                                    : null;
                                            const movableType = String(det?.movableAssetType ?? asset.description ?? '').trim() || '—';
                                            const est =
                                                typeof asset.estimatedValue === 'number' && Number.isFinite(asset.estimatedValue) && asset.estimatedValue > 0
                                                    ? asset.estimatedValue
                                                    : null;
                                            const notes = String(asset.notes ?? '').trim();
                                            const auctionDraft = seizureAuctionDateDraftById[asset.id] || '';
                                            const saleDraft = String(asset.seizure_sale_price_draft || '');
                                            const uiKind = String(det?.seizureUiKind || '').trim();
                                            const requiresMarkConfirmation = uiKind === 'vehicle';
                                            const markConfirmed = Boolean(asset.isMarkConfirmed);
                                            const markLock = requiresMarkConfirmation && !markConfirmed;

                                            return (
                                                <div
                                                    key={String(asset.id)}
                                                    className={`relative overflow-hidden rounded-2xl border p-3 backdrop-blur-xl ${
                                                        locked
                                                            ? 'border-slate-600/40 bg-slate-900/55 opacity-90'
                                                            : 'border-slate-700/40 bg-slate-800/55'
                                                    }`}
                                                >
                                                    <div className="mb-2 flex flex-col gap-2 sm:flex-row-reverse sm:items-start sm:justify-between">
                                                        <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] ${
                                                            asset.status === 'seized'
                                                                ? 'bg-emerald-500/20 text-emerald-200'
                                                                : asset.status === 'sold'
                                                                  ? 'bg-violet-500/20 text-violet-200'
                                                                  : asset.status === 'released'
                                                                    ? 'bg-slate-500/25 text-slate-300'
                                                                    : 'bg-blue-500/20 text-blue-200'
                                                        }`}>
                                                            {statusLabel}
                                                        </span>
                                                        <div className="min-w-0 text-right">
                                                            <p className="truncate text-[11px] font-bold text-slate-50">{movableType}</p>
                                                            {est != null ? (
                                                                <p className="mt-0.5 text-[10px] text-slate-300 tabular-nums">
                                                                    القيمة التقديرية: {est.toLocaleString('ar-IQ')} د.ع
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                    {notes ? (
                                                        <p className="text-[10px] leading-relaxed text-slate-300 text-right whitespace-pre-line">{notes}</p>
                                                    ) : null}
                                                    <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                                                        <div className="rounded-xl border border-white/10 bg-black/20 px-2 py-1.5 text-right">
                                                            <span className="text-slate-500">تاريخ المزايدة</span>
                                                            <div className="mt-0.5 text-slate-200 tabular-nums">{asset.auction_date_ymd || '—'}</div>
                                                        </div>
                                                        <div className="rounded-xl border border-white/10 bg-black/20 px-2 py-1.5 text-right">
                                                            <span className="text-slate-500">مبلغ البيع</span>
                                                            <div className="mt-0.5 text-slate-200 tabular-nums">{asset.sale_price_iqd ? `${asset.sale_price_iqd} د.ع` : '—'}</div>
                                                        </div>
                                                    </div>

                                                    {requiresMarkConfirmation ? (
                                                        <div className="mt-2 rounded-xl border border-white/10 bg-black/20 p-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => patchSeizureMarkConfirmation(asset.id, {
                                                                    isMarkConfirmed: !markConfirmed,
                                                                    ...(markConfirmed ? { markConfirmationLetterNo: undefined, markConfirmationLetterDateYmd: null } : {}),
                                                                })}
                                                                className={`w-full rounded-lg border px-3 py-2 text-[11px] font-extrabold transition-colors ${
                                                                    markConfirmed
                                                                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15'
                                                                        : 'border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15'
                                                                }`}
                                                            >
                                                                {markConfirmed ? 'تم تأييد وضع الإشارة' : 'بانتظار تأييد وضع الإشارة (من المرور)'}
                                                            </button>
                                                            {markConfirmed ? (
                                                                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                                    <input type="text" value={String(asset.markConfirmationLetterNo || '')}
                                                                        onChange={(e) => patchSeizureMarkConfirmation(asset.id, { markConfirmationLetterNo: e.target.value })}
                                                                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-100" placeholder="رقم كتاب التأييد" />
                                                                    <input type="date" value={asset.markConfirmationLetterDateYmd || ''}
                                                                        onChange={(e) => patchSeizureMarkConfirmation(asset.id, { markConfirmationLetterDateYmd: e.target.value || null })}
                                                                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-100" />
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    ) : null}

                                                    {releasedLocked ? (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/55 p-3">
                                                            <button type="button" onClick={(e) => { e.stopPropagation(); undoReleaseSeizureAssetRow(asset); }}
                                                                className="w-full rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] font-extrabold text-amber-200 hover:bg-amber-500/15">
                                                                تراجع
                                                            </button>
                                                        </div>
                                                    ) : null}

                                                    {!locked ? (
                                                        <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                                                            {!asset.auction_date_ymd ? (
                                                                <>
                                                                    <button type="button" disabled={markLock}
                                                                        onClick={() => { setSeizureAuctionDateDraftById((p) => ({ ...p, [asset.id]: p[asset.id] || getLocalTodayYmd() })); }}
                                                                        className="w-full rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-[11px] font-extrabold text-indigo-200 hover:bg-indigo-500/15 disabled:opacity-40 disabled:pointer-events-none">
                                                                        تحديد موعد المزايدة
                                                                    </button>
                                                                    {auctionDraft ? (
                                                                        <div className="rounded-xl border border-white/10 bg-black/20 p-2">
                                                                            <input type="date" value={auctionDraft} disabled={markLock}
                                                                                onChange={(e) => setSeizureAuctionDateDraftById((p) => ({ ...p, [asset.id]: e.target.value }))}
                                                                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-100" />
                                                                            <div className="mt-2 grid grid-cols-2 gap-2">
                                                                                <button type="button" disabled={markLock}
                                                                                    onClick={() => saveSeizureAuctionDate(asset, auctionDraft)}
                                                                                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-2 text-[10px] font-bold text-emerald-200 hover:bg-emerald-500/15 disabled:opacity-40 disabled:pointer-events-none">
                                                                                    حفظ
                                                                                </button>
                                                                                <button type="button"
                                                                                    onClick={() => setSeizureAuctionDateDraftById((p) => { const n = { ...p }; delete n[asset.id]; return n; })}
                                                                                    className="rounded-lg border border-slate-500/30 bg-slate-500/10 py-2 text-[10px] font-bold text-slate-200 hover:bg-slate-500/15">
                                                                                    إلغاء
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ) : null}
                                                                </>
                                                            ) : asset.seizure_awaiting_sale_price ? (
                                                                <div className="rounded-xl border border-white/10 bg-black/20 p-2">
                                                                    <label className="mb-1 block text-[10px] text-slate-400 text-right">مبلغ البيع</label>
                                                                    <input type="text" value={saleDraft}
                                                                        onChange={(e) => updateSeizureSaleDraft(asset.id, e.target.value)}
                                                                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-100 text-right" placeholder="مثال: 1500000" dir="rtl" />
                                                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                                                        <button type="button" onClick={() => confirmSeizureSaleWithPrice(asset)}
                                                                            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-2 text-[10px] font-bold text-emerald-200 hover:bg-emerald-500/15">
                                                                            حفظ مبلغ البيع
                                                                        </button>
                                                                        <button type="button" onClick={() => cancelSeizureSalePriceStep(asset)}
                                                                            className="rounded-lg border border-slate-500/30 bg-slate-500/10 py-2 text-[10px] font-bold text-slate-200 hover:bg-slate-500/15">
                                                                            إلغاء
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : asset.auction_date_ymd ? (
                                                                <button type="button" disabled={markLock}
                                                                    onClick={() => beginSeizureSalePriceStep(asset)}
                                                                    className="w-full rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-[11px] font-extrabold text-violet-200 hover:bg-violet-500/15 disabled:opacity-40 disabled:pointer-events-none">
                                                                    تم بيع المال
                                                                </button>
                                                            ) : null}

                                                            <button type="button" onClick={() => releaseSeizureAssetRow(asset)}
                                                                className="w-full rounded-xl border border-slate-500/30 bg-slate-500/10 px-3 py-2 text-[11px] font-extrabold text-slate-200 hover:bg-slate-500/15">
                                                                فك الحجز
                                                            </button>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {false ? (
                            <div className="mt-3 px-1" dir="rtl">
                                <div className="rounded-2xl border border-emerald-500/20 bg-[#05060D]/60 p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-[11px] font-bold text-emerald-300">سجل الحجوزات — الراتب</p>
                                        <span className="text-[10px] text-slate-500 tabular-nums">{salarySeizureRegistryAssets.length}</span>
                                    </div>
                                    <div className="mt-2 space-y-3">
                                        {salarySeizureRegistryAssets.map((asset: any) => {
                                            const locked = Boolean(asset.seizure_record_locked);
                                            const releasedLocked = locked && String(asset.status) === 'released';
                                            const det = typeof asset.details === 'object' && asset.details && !Array.isArray(asset.details)
                                                ? (asset.details as Record<string, unknown>) : null;
                                            const office = String(det?.employerName || '').trim();
                                            const salary = String(det?.salaryAmount || '').trim();
                                            const statusLabel = asset.status === 'seized' ? 'تم الحجز' : asset.status === 'released' ? 'فُك الحجز' : String(asset.status || '—');

                                            return (
                                                <div key={String(asset.id)} className={`relative overflow-hidden rounded-2xl border p-3 backdrop-blur-xl ${locked ? 'border-slate-600/40 bg-slate-900/55 opacity-90' : 'border-slate-700/40 bg-slate-800/55'}`}>
                                                    <div className="mb-2 flex flex-col gap-2 sm:flex-row-reverse sm:items-start sm:justify-between">
                                                        <span className="shrink-0 rounded-lg bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-200">{statusLabel}</span>
                                                        <div className="min-w-0 text-right">
                                                            <p className="truncate text-[11px] font-bold text-slate-50">حجز راتب</p>
                                                            {office ? <p className="mt-0.5 text-[10px] text-slate-300">جهة العمل: {office}</p> : null}
                                                            {salary ? <p className="mt-0.5 text-[10px] text-slate-300 tabular-nums">الدخل الشهري: {salary} د.ع</p> : null}
                                                        </div>
                                                    </div>
                                                    {releasedLocked ? (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/55 p-3">
                                                            <button type="button" onClick={(e) => { e.stopPropagation(); undoReleaseSeizureAssetRow(asset); }}
                                                                className="w-full rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] font-extrabold text-amber-200 hover:bg-amber-500/15">تراجع</button>
                                                        </div>
                                                    ) : null}
                                                    {!locked ? (
                                                        <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                                                            <button type="button" onClick={() => releaseSeizureAssetRow(asset)}
                                                                className="w-full rounded-xl border border-slate-500/30 bg-slate-500/10 px-3 py-2 text-[11px] font-extrabold text-slate-200 hover:bg-slate-500/15">فك الحجز</button>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        
                        {false ? (
                            <div className="mt-3 px-1" dir="rtl">
                                <div className="rounded-2xl border border-amber-500/20 bg-[#05060D]/60 p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-[11px] font-bold text-amber-200">سجل الحجوزات — شارة/تعميم</p>
                                        <span className="text-[10px] text-slate-500 tabular-nums">{standaloneExecutionMarks.length}</span>
                                    </div>
                                    <div className="mt-2 space-y-3">
                                        {standaloneExecutionMarks.map((m: any) => {
                                            const locked = Boolean(m.record_locked) || m.status === 'archived';
                                            const confirmed = Boolean(m.isMarkConfirmed);
                                            return (
                                                <div key={String(m.id)} className={`relative overflow-hidden rounded-2xl border p-3 backdrop-blur-xl ${locked ? 'border-slate-600/40 bg-slate-900/55 opacity-90' : 'border-slate-700/40 bg-slate-800/55'}`}>
                                                    <div className="mb-2 flex flex-col gap-2 sm:flex-row-reverse sm:items-start sm:justify-between">
                                                        <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] ${confirmed ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/15 text-amber-200'}`}>
                                                            {confirmed ? 'تم وضع الشارة رسمياً' : 'بانتظار التأييد'}
                                                        </span>
                                                        <div className="min-w-0 text-right">
                                                            <p className="truncate text-[11px] font-bold text-slate-50">{m.markType}</p>
                                                            <p className="mt-0.5 text-[10px] text-slate-300">الجهة: {m.targetEntity}</p>
                                                            {m.letterDetails ? <p className="mt-0.5 text-[10px] text-slate-400">الكتاب: {m.letterDetails}</p> : null}
                                                        </div>
                                                    </div>
                                                    {locked ? (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/55 p-3">
                                                            <button type="button" onClick={(e) => { e.stopPropagation(); undoArchiveStandaloneExecutionMark(m); }}
                                                                className="w-full rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] font-extrabold text-amber-200 hover:bg-amber-500/15">تراجع</button>
                                                        </div>
                                                    ) : (
                                                        <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                                                            <button type="button" onClick={() => toggleStandaloneExecutionMarkConfirmed(m)}
                                                                className={`w-full rounded-xl border px-3 py-2 text-[11px] font-extrabold ${confirmed ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15' : 'border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15'}`}>
                                                                {confirmed ? 'تم تأييد وضع الشارة/التعميم' : 'بانتظار تأييد وضع الشارة/التعميم'}
                                                            </button>
                                                            <button type="button" onClick={() => archiveStandaloneExecutionMark(m)}
                                                                className="w-full rounded-xl border border-slate-500/30 bg-slate-500/10 px-3 py-2 text-[11px] font-extrabold text-slate-200 hover:bg-slate-500/15">رفع الشارة/التعميم</button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : null}
                        </>
                    ) : (
                        <Suspense fallback={EXEC_FOC_LAZY_FALLBACK}>
                            <ClientWalletExecutionSection
                                embedded
                                executionId={executionData?.id || executionId}
                                agreedClientFees={parsedClientFees}
                                legacyPaidClientFees={
                                    typeof executionData?.paidClientFees === 'number'
                                        ? executionData.paidClientFees
                                        : 0
                                }
                                onPaidTotalSync={syncPaidClientFeesFromWallet}
                            />
                        </Suspense>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

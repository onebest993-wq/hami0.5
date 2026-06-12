import React, { Suspense, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Wallet } from 'lucide-react';
import { publishFinancialCenterTimelineNote } from '@/app/utils/financialCenterTimeline';
import { buildGhuramaaCreditorRows } from '@/app/utils/creditorPaymentProRata';
import { buildDebtorAgentSeizedItems } from '@/app/components/lawyer/FinancialOperationsCenter/debtorAgentSeizedItems';
import {
    appendMonthlySettlementDefaultTask,
    buildGhuramaaDistributionMergePatch,
    computeMonthlySettlementDelayCount,
    resolveFinancialHubExecutionId,
    trashMonthlySettlementDefaultTasks,
    MONTHLY_SETTLEMENT_DEFAULT_TASK_TITLE,
} from '@/app/components/lawyer/ExecutionDashboard/utils/financialHubPortalUtils';

export interface ExecutionFinancialHubPortalProps {
    showExecutionFinancialHub: boolean;
    setShowExecutionFinancialHub: (v: boolean) => void;
    onOpenUnifiedSeizureLog?: () => void;
    financialHubAutoOpenMode: 'disburse' | null;
    setFinancialHubAutoOpenMode: React.Dispatch<React.SetStateAction<'disburse' | null>>;
    financialHubSeizedMovableId: string | null;
    setFinancialHubSeizedMovableId: React.Dispatch<React.SetStateAction<string | null>>;
    financialHubSeizedPropertyId: string | null;
    setFinancialHubSeizedPropertyId: React.Dispatch<React.SetStateAction<string | null>>;
    EXEC_MODAL_BACKDROP_STRONG: string;
    EXEC_MODAL_Z: { unifiedFollowUp: number };
    LazyFinancialOperationsCenter: React.LazyExoticComponent<React.ComponentType<any>>;
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
    expandDebtor: (debtorKey: string) => void;
    openGuarantorDetailsModal: () => void;
    appendGuarantorFollowupRequest: (data: { executionId: string | undefined }) => { ok: boolean; decisionId?: string };
    decisionsStorageExecutionId: string | undefined;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info', options?: any) => void;
    timelineDebtorMetadata: (debtorKey: string) => Record<string, unknown>;
    assignmentWorkspaceCtx: { activeDebtorKey: string };
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    handleEvictionLedgerActivated: () => void;
    evictionAssetsTabUnlocked: boolean;
    getLocalTodayYmd: () => string;
    setCaseTasksPending: React.Dispatch<React.SetStateAction<any[]>>;
    onClearSalarySeizurePath?: () => void;
    isRepresentingDebtor?: boolean;
}

export const ExecutionFinancialHubPortal: React.FC<ExecutionFinancialHubPortalProps> = ({
    showExecutionFinancialHub,
    setShowExecutionFinancialHub,
    onOpenUnifiedSeizureLog,
    financialHubAutoOpenMode,
    setFinancialHubAutoOpenMode,
    financialHubSeizedMovableId,
    setFinancialHubSeizedMovableId,
    financialHubSeizedPropertyId,
    setFinancialHubSeizedPropertyId,
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
    LazyFinancialOperationsCenter,
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
    expandDebtor,
    openGuarantorDetailsModal,
    appendGuarantorFollowupRequest,
    decisionsStorageExecutionId,
    showToast,
    timelineDebtorMetadata,
    assignmentWorkspaceCtx,
    persistExecutionMerge,
    handleEvictionLedgerActivated,
    evictionAssetsTabUnlocked,
    getLocalTodayYmd,
    setCaseTasksPending,
    onClearSalarySeizurePath,
    isRepresentingDebtor = false,
}) => {
    const closeFinancialHub = useCallback(() => {
        setFinancialHubAutoOpenMode(null);
        setFinancialHubSeizedMovableId(null);
        setFinancialHubSeizedPropertyId(null);
        setShowExecutionFinancialHub(false);
    }, [
        setFinancialHubAutoOpenMode,
        setFinancialHubSeizedMovableId,
        setFinancialHubSeizedPropertyId,
        setShowExecutionFinancialHub,
    ]);

    useEffect(() => {
        if (!showExecutionFinancialHub) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeFinancialHub();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [showExecutionFinancialHub, closeFinancialHub]);

    const debtors = (executionData?.debtors as any[]) || [];
    const firstDebtor = debtors[0] || {};
    const debtorJob = firstDebtor?.occupation || 'كاسب';
    const debtorEmploymentType = firstDebtor?.employmentType;
    const debtorKinship = firstDebtor?.kinship || '';
    const creditors = (executionData?.creditors as any[]) || [];
    const additionalCreditorsPm = executionData?.party_multiplicity?.additionalCreditors ?? [];
    const creditorsCount =
        (Array.isArray(creditors) ? creditors.length : 0) +
        (Array.isArray(additionalCreditorsPm) ? additionalCreditorsPm.length : 0);

    const debtorAgentSeizedItems = useMemo(
        () =>
            buildDebtorAgentSeizedItems({
                realEstate: realEstateSeizureRegistryAssets,
                movable: movableSeizureRegistryAssets,
                salary: salarySeizureRegistryAssets,
                thirdParty: thirdPartySeizureRegistryAssets,
                marks: standaloneExecutionMarks,
            }),
        [
            realEstateSeizureRegistryAssets,
            movableSeizureRegistryAssets,
            salarySeizureRegistryAssets,
            thirdPartySeizureRegistryAssets,
            standaloneExecutionMarks,
        ]
    );

    const ghuramaaCreditors = useMemo(() => {
        const claimFallback = Math.max(
            0,
            Number(executionData?.totalAmount ?? executionData?.debtAmount ?? 0) || 0,
            Number(principalDebtAmount ?? 0) || 0,
            Number(totalOwed ?? 0) || 0
        );
        return buildGhuramaaCreditorRows(
            {
                ...(executionData ?? {}),
                creditors,
                party_multiplicity: {
                    ...(executionData?.party_multiplicity ?? {}),
                    additionalCreditors: additionalCreditorsPm,
                },
            },
            claimFallback
        );
    }, [executionData, creditors, additionalCreditorsPm, principalDebtAmount, totalOwed]);

    const hubExecutionId = resolveFinancialHubExecutionId(executionData, executionId);

    if (!showExecutionFinancialHub || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG}`}
            style={{ zIndex: EXEC_MODAL_Z.unifiedFollowUp }}
            role="presentation"
            onClick={(e) => {
                if (e.target === e.currentTarget) closeFinancialHub();
            }}
        >
            <div
                className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border-2 border-[#E6C673]/40 bg-[#0B1120] shadow-2xl shadow-black/50"
                role="dialog"
                aria-modal="true"
                aria-labelledby="execution-financial-hub-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-2 border-b border-[#E6C673]/30 bg-[#0B1120] p-3">
                    <button
                        type="button"
                        onClick={closeFinancialHub}
                        className="rounded-lg p-2 text-slate-400 transition-all hover:bg-[#E6C673]/15 hover:text-white"
                        aria-label="إغلاق المركز المالي"
                    >
                        <X size={20} />
                    </button>
                    <h2
                        id="execution-financial-hub-title"
                        className="flex flex-row-reverse items-center gap-2 text-base font-bold text-[#E6C673]"
                    >
                        <Wallet size={20} className="shrink-0 text-[#E6C673]" />
                        {isRepresentingDebtor ? 'المركز المالي — موكل المدين' : 'المركز المالي'}
                    </h2>
                    <span className="w-9 shrink-0" aria-hidden />
                </div>

                <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4 pt-1">
                    <Suspense fallback={EXEC_FOC_LAZY_FALLBACK}>
                        <LazyFinancialOperationsCenter
                            embeddedInFinancialHub
                            isExpanded={isFinancialCenterExpanded}
                            onToggle={() => setIsFinancialCenterExpanded((prev) => !prev)}
                            activeTab={activeFinancialTab}
                            onTabChange={setActiveFinancialTab}
                            principal_amount={principalDebtAmount}
                            court_ordered_fees={evictionLawyerFeesInTotals}
                            evictionLawyerFeeWaivedAtIntake={
                                isEvictionExecutionModule
                                    ? !executionData?.eviction_initial_notice_lawyer_fees_included
                                    : Boolean(executionData?.eviction_lawyer_fee_waived_at_intake)
                            }
                            evictionReenableCourtOrderedFees={
                                isEvictionExecutionModule &&
                                !executionData?.eviction_initial_notice_lawyer_fees_included &&
                                parsedLawyerFees > 0
                                    ? {
                                          grossAmount: parsedLawyerFees,
                                          onEnable: () =>
                                              persistExecutionMerge({
                                                  eviction_lawyer_fee_waived_at_intake: false,
                                                  eviction_initial_notice_lawyer_fees_included: true,
                                                  eviction_lawyer_fee_requested: true,
                                              }),
                                      }
                                    : undefined
                            }
                            execution_expenses_sum={total_execution_expenses}
                            past_wife_alimony={executionData?.pastWifeAlimony || 0}
                            past_children_alimony={executionData?.pastChildrenAlimony || 0}
                            alimonyCalculated={executionData?.alimony?.calculated ?? null}
                            pastAlimonyClaim={
                                (executionData as { pastAlimonyClaim?: unknown } | null | undefined)
                                    ?.pastAlimonyClaim ?? null
                            }
                            monthly_wife_alimony={executionData?.monthlyWifeAlimony || monthlyAlimony}
                            monthly_children_alimony={executionData?.monthlyChildrenAlimony || 0}
                            children_count={executionData?.childrenCount || 1}
                            totalOwed={totalOwed}
                            remaining={remaining}
                            feesTotal={parsedCourtFees + parsedDirectorateFees + parsedClientFees}
                            financialStatus={financialStatus}
                            isNonFinancialClaim={isNonFinancialClaim}
                            isAlimonyClaim={isAlimonyClaim}
                            claimType={claimType}
                            claimTypes={
                                Array.isArray((executionData as { claimTypes?: string[] })?.claimTypes)
                                    ? (executionData as { claimTypes?: string[] }).claimTypes
                                    : undefined
                            }
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
                            onCoerciveAction={(action: string) => handleCoerciveAction(action)}
                            executionStatus={executionStatus}
                            statusMetadata={statusMetadata}
                            isPaused={isPaused}
                            onShowLedger={() => setShowLedgerModal(true)}
                            onShowSeizureLog={() => onOpenUnifiedSeizureLog?.()}
                            financialLedger={financialLedger}
                            autoOpenLedgerMode={financialHubAutoOpenMode}
                            onAutoOpenHandled={() => setFinancialHubAutoOpenMode(null)}
                            proceedsDisburseSeizedMovableId={financialHubSeizedMovableId}
                            onProceedsDisburseHandled={() => setFinancialHubSeizedMovableId(null)}
                            proceedsDisburseSeizedPropertyId={financialHubSeizedPropertyId}
                            onProceedsDisbursePropertyHandled={() => setFinancialHubSeizedPropertyId(null)}
                            executionId={hubExecutionId}
                            creditorsCount={creditorsCount}
                            ghuramaaCreditors={ghuramaaCreditors}
                            onApplyGhuramaaDistribution={(args: any) => {
                                const details = Array.isArray(args?.distributionDetails)
                                    ? (args.distributionDetails as any[])
                                    : [];
                                const total = Math.max(0, Math.trunc(Number(args?.totalAmountDistributed ?? 0) || 0));
                                persistExecutionMerge(
                                    buildGhuramaaDistributionMergePatch({
                                        executionData,
                                        creditors,
                                        args,
                                    })
                                );
                                publishFinancialCenterTimelineNote(
                                    String(executionData?.id ?? executionId ?? ''),
                                    '⚖️ قسمة الغرماء — توزيع الأمانات',
                                    `تم توزيع ${total.toLocaleString('ar-IQ')} د.ع على ${details.length} دائن/دائنين (حصص يدوية).`,
                                    'payment'
                                );
                            }}
                            eviction_case_expenses_sum={
                                isEvictionExecutionModule ? evictionCaseExpensesTotalForFinancial : 0
                            }
                            evictionFinanceStrip={
                                isEvictionExecutionModule
                                    ? {
                                          expensesSum: evictionCaseExpensesTotalForFinancial,
                                          expenseRows: evictionCaseExpenses.length,
                                          onRecordExpense: () => setShowEvictionExpenseModal(true),
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
                                publishFinancialCenterTimelineNote(
                                    String(executionData?.id ?? executionId ?? ''),
                                    title,
                                    description,
                                    'other'
                                );
                            }}
                            onGuarantorRequest={() => {
                                if (guarantorFollowupAwaitingDetailsSave(executionData?.guarantor_followup)) {
                                    setShowUnifiedExecutionModal(false);
                                    setExecutionDebtorTabIndex(0);
                                    if (primaryDebtorWorkspaceKey) {
                                        expandDebtor(primaryDebtorWorkspaceKey);
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
                                                ...timelineDebtorMetadata(assignmentWorkspaceCtx.activeDebtorKey),
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
                                const prevDue = String(
                                    (executionData as any)?.monthly_settlement_default_dueDate || ''
                                ).trim();
                                const prevDelay = Number((executionData as any)?.monthly_settlement_delay_count);
                                const nextDelay = computeMonthlySettlementDelayCount({
                                    dueDate,
                                    prevDueDate: prevDue,
                                    prevDelayCount: prevDelay,
                                });
                                setCaseTasksPending((prev: any) => {
                                    const { nextTasks } = appendMonthlySettlementDefaultTask({
                                        prevTasks: prev,
                                        dueDate,
                                        amount,
                                        todayYmd: ymd,
                                        nextTimelineId,
                                    });
                                    queueMicrotask(() =>
                                        persistExecutionMerge({
                                            caseTasksPending: nextTasks,
                                            monthly_settlement_default_alert: true,
                                            monthly_settlement_default_dueDate: dueDate,
                                            monthly_settlement_delay_count: nextDelay,
                                            monthly_settlement_default_at: ts,
                                        } as any)
                                    );
                                    return nextTasks as any;
                                });
                                showToast(
                                    `${MONTHLY_SETTLEMENT_DEFAULT_TASK_TITLE}: تم تفعيل التنبيه في الإضبارة.`,
                                    'warning'
                                );
                            }}
                            onAlimonyOngoingAccrued={({
                                newPrincipalTotal,
                                accruedAmount,
                                billableDays,
                            }: {
                                newPrincipalTotal: number;
                                accruedAmount: number;
                                billableDays: number;
                            }) => {
                                const safeTotal = Math.max(0, Math.round(newPrincipalTotal || 0));
                                const safeAccrued = Math.max(0, Math.round(accruedAmount || 0));
                                persistExecutionMerge({
                                    totalAmount: safeTotal,
                                    debtAmount: safeTotal,
                                    alimony: {
                                        ...(executionData?.alimony || {}),
                                        calculated: {
                                            ...(executionData?.alimony?.calculated || {}),
                                            totalAccumulated: safeTotal,
                                            lastOngoingAccrualAmount: safeAccrued,
                                            lastOngoingAccrualDays: billableDays,
                                        },
                                    },
                                } as any);
                            }}
                            onMonthlySettlementPaid={({
                                dueDate,
                                nextDueDate,
                                amount,
                            }: {
                                dueDate: string;
                                nextDueDate: string;
                                amount: number;
                            }) => {
                                const ts = new Date().toISOString();
                                setCaseTasksPending((prev: any) => {
                                    const next = trashMonthlySettlementDefaultTasks(prev, dueDate);
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
                                    eviction_initial_notice_lawyer_fees_included: true,
                                    eviction_lawyer_fee_requested: true,
                                    includeLawyerFees: true,
                                    lawyerFeesAmount: totalAmount,
                                });
                                showToast(
                                    'تم تفعيل الأتعاب المحكومة في بيانات الإضبارة من الوعاء الموحّد',
                                    'success'
                                );
                            }}
                            onManualDebtTotalsUpdated={({
                                principalSnapshot,
                                totalOwed: nextTotalOwed,
                            }: {
                                principalSnapshot: number;
                                totalOwed: number;
                                remaining: number;
                            }) => {
                                persistExecutionMerge({
                                    debtAmount: principalSnapshot,
                                    totalAmount: nextTotalOwed,
                                } as Record<string, unknown>);
                            }}
                            salarySeizureRegistryAssets={salarySeizureRegistryAssets}
                            onClearSalarySeizurePath={onClearSalarySeizurePath}
                            isRepresentingDebtor={isRepresentingDebtor}
                            debtorAgentSeizedItems={debtorAgentSeizedItems}
                        />
                    </Suspense>
                </div>
            </div>
        </div>,
        document.body
    );
};

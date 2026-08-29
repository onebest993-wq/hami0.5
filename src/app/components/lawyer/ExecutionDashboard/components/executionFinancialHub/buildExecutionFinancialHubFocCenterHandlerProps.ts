import { publishFinancialCenterTimelineNote } from '@/app/utils/financialCenterTimeline';
import { buildGhuramaaDistributionMergePatch } from '@/app/components/lawyer/ExecutionDashboard/utils/financialHubPortalUtils';
import {
    runMonthlySettlementDefault,
    runMonthlySettlementPaid,
} from './financialHubMonthlySettlementHandlers';
import { runFinancialHubGuarantorRequest } from './financialHubFocRequestHelpers';
import { toastAfterExecutionPersist } from '@/app/components/lawyer/ExecutionDashboard/helpers/toastAfterExecutionPersist';
import type { ExecutionFinancialHubFocCenterProps } from './ExecutionFinancialHubFocCenterProps';

/** Interaction / callback props for LazyFinancialOperationsCenter */
export function buildExecutionFinancialHubFocCenterHandlerProps(
    props: ExecutionFinancialHubFocCenterProps,
) {
    const {
        onOpenUnifiedSeizureLog,
        setFinancialHubAutoOpenMode,
        setFinancialHubSeizedMovableId,
        setFinancialHubSeizedPropertyId,
        setIsFinancialCenterExpanded,
        onToggleFinancialCenterExpanded,
        setActiveFinancialTab,
        isEvictionExecutionModule,
        setShowPaymentCalculator,
        onOpenPaymentCalculator,
        setShowSettlementCalculator,
        onOpenSettlementCalculator,
        handleCoerciveAction,
        setShowLedgerModal,
        onOpenLedgerModal,
        evictionCaseExpensesTotalForFinancial,
        evictionCaseExpenses,
        setShowEvictionExpenseModal,
        onOpenEvictionExpenseModal,
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
        onOpenGuarantorFollowupDetails,
        appendGuarantorFollowupRequest,
        decisionsStorageExecutionId,
        showToast,
        timelineDebtorMetadata,
        assignmentWorkspaceCtx,
        persistExecutionMerge,
        handleEvictionLedgerActivated,
        getLocalTodayYmd,
        setCaseTasksPending,
        onClearSalarySeizurePath,
        executionData,
        executionId,
    } = props;

    const { creditors } = props.model;

    return {
        onToggle: () => {
            if (onToggleFinancialCenterExpanded) {
                onToggleFinancialCenterExpanded();
                return;
            }
            setIsFinancialCenterExpanded?.((prev) => !prev);
        },
        onTabChange: setActiveFinancialTab,
        onPayment: () =>
            onOpenPaymentCalculator
                ? onOpenPaymentCalculator()
                : setShowPaymentCalculator?.(true),
        onSettlement: () =>
            onOpenSettlementCalculator
                ? onOpenSettlementCalculator()
                : setShowSettlementCalculator?.(true),
        onCoerciveAction: (action: string) => handleCoerciveAction(action),
        onShowLedger: () =>
            onOpenLedgerModal ? onOpenLedgerModal() : setShowLedgerModal?.(true),
        onShowSeizureLog: () => onOpenUnifiedSeizureLog?.(),
        onAutoOpenHandled: () => setFinancialHubAutoOpenMode(null),
        onProceedsDisburseHandled: () => setFinancialHubSeizedMovableId(null),
        onProceedsDisbursePropertyHandled: () => setFinancialHubSeizedPropertyId(null),
        onApplyGhuramaaDistribution: (args: {
            distributionDetails?: unknown[];
            totalAmountDistributed?: number;
        }) => {
            const details = Array.isArray(args?.distributionDetails) ? args.distributionDetails : [];
            const total = Math.max(0, Math.trunc(Number(args?.totalAmountDistributed ?? 0) || 0));
            persistExecutionMerge(
                buildGhuramaaDistributionMergePatch({
                    executionData: executionData as Record<string, unknown> | null | undefined,
                    creditors: Array.isArray(creditors) ? creditors : [],
                    args,
                })
            );
            publishFinancialCenterTimelineNote(
                String(executionData?.id ?? executionId ?? ''),
                '⚖️ قسمة الغرماء — توزيع الأمانات',
                `تم توزيع ${total.toLocaleString('ar-IQ')} د.ع على ${details.length} دائن/دائنين (حصص يدوية).`,
                'payment'
            );
        },
        evictionFinanceStrip: isEvictionExecutionModule
            ? {
                  expensesSum: evictionCaseExpensesTotalForFinancial,
                  expenseRows: evictionCaseExpenses.length,
                  onRecordExpense: () =>
                      onOpenEvictionExpenseModal
                          ? onOpenEvictionExpenseModal()
                          : setShowEvictionExpenseModal?.(true),
                  onRequestLawyerFees: handleEvictionLawyerFeeRequest,
                  lawyerFeeRequestDisabled: lawyerFeePayoutApproved,
                  lawyerFeeRequestTitle: lawyerFeePayoutApproved
                      ? 'تم قبول صرف الأتعاب من المنفذ — لا يُعاد الطلب'
                      : undefined,
              }
            : undefined,
        onFundsLedgerPayment: handleFundsLedgerPayment,
        onFinancialTimelineNote: (title: string, description: string) => {
            publishFinancialCenterTimelineNote(
                String(executionData?.id ?? executionId ?? ''),
                title,
                description,
                'other'
            );
        },
        onGuarantorRequest: () => {
            runFinancialHubGuarantorRequest({
                onOpenGuarantorFollowupDetails,
                guarantorFollowupAwaitingDetailsSave,
                guarantorFollowup: executionData?.guarantor_followup,
                setShowUnifiedExecutionModal,
                setExecutionDebtorTabIndex,
                primaryDebtorWorkspaceKey,
                expandDebtor,
                openGuarantorDetailsModal,
                appendGuarantorFollowupRequest,
                decisionsStorageExecutionId,
                showToast,
                setTimelineEvents,
                nextTimelineId,
                timelineDebtorMetadata,
                assignmentWorkspaceActiveDebtorKey: assignmentWorkspaceCtx.activeDebtorKey,
            });
        },
        onEvictionLedgerActivated: handleEvictionLedgerActivated,
        onAfterCollectionRequestSubmitted: () => {
            showToast(
                'تم حفظ الطلب بنجاح وتحويله إلى مركز القرارات بانتظار موافقة المنفذ',
                'success',
                { decisionsLink: true }
            );
        },
        onMonthlySettlementDefault: ({
            dueDate,
            amount,
        }: {
            dueDate: string;
            amount: number;
        }) => {
            runMonthlySettlementDefault({
                dueDate,
                amount,
                executionData,
                getLocalTodayYmd,
                nextTimelineId,
                setCaseTasksPending,
                persistExecutionMerge,
                showToast,
            });
        },
        onAlimonyOngoingAccrued: ({
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
            });
        },
        onMonthlySettlementPaid: ({
            dueDate,
            nextDueDate,
            amount,
        }: {
            dueDate: string;
            nextDueDate: string;
            amount: number;
        }) => {
            runMonthlySettlementPaid({
                dueDate,
                nextDueDate,
                amount,
                setCaseTasksPending,
                persistExecutionMerge,
            });
        },
        onToast: (
            message: string,
            variant: 'success' | 'error' | 'warning' | 'info' = 'warning',
            options?: {
                decisionsLink?: boolean;
                decisionId?: string;
                decisionsTab?: 'current' | 'previous' | 'appeals';
                action?: { label: string; onClick: () => void };
            }
        ) => showToast(message, variant, options),
        onEvictionCourtOrderedFeesActivatedFromLedger: (totalAmount: number) => {
            toastAfterExecutionPersist(
                persistExecutionMerge({
                    eviction_lawyer_fee_waived_at_intake: false,
                    eviction_initial_notice_lawyer_fees_included: true,
                    eviction_lawyer_fee_requested: true,
                    includeLawyerFees: true,
                    lawyerFeesAmount: totalAmount,
                }),
                showToast,
                'تم تفعيل الأتعاب المحكومة في بيانات الإضبارة من الوعاء الموحّد',
            );
        },
        onManualDebtTotalsUpdated: ({
            principalSnapshot,
            totalOwed: nextTotalOwed,
            remaining,
        }: {
            principalSnapshot: number;
            totalOwed: number;
            remaining: number;
        }) => {
            persistExecutionMerge({
                debtAmount: principalSnapshot,
                totalAmount: nextTotalOwed,
                total_remaining_balance: remaining,
                remainingDebt: remaining,
            } as Record<string, unknown>);
        },
        onClearSalarySeizurePath,
    };
}

// @ts-nocheck
/** توجيه handleCoerciveAction — موجة 7 */
import { useCallback, type MutableRefObject } from 'react';
import { readExecutorDecisionsArray } from '@/app/utils/executorSeizureDecisionQueue';
import { buildInitialExecutorSeizureDetails } from './executionDashboardCoerciveAction';
import {
    findAwaitingSeizureDecisionId,
    isSeizureActionType,
    routeCoerciveAction,
    type DebtorUnifiedRow,
} from './executionDashboardCoerciveActionRouting';

export type UseExecutionDashboardCoerciveActionHandlersParams = {
    coerciveUiLocked: boolean;
    activeDebtorIsEmployee: boolean;
    activeDebtorIsDeceased: boolean;
    decisionsStorageExecutionId: string | undefined;
    allDebtorsUnified: DebtorUnifiedRow[];
    executionDebtorTabIndex: number;
    isSolidaryLiability: boolean;
    resolveDebtorSolidaryFlag: (row: DebtorUnifiedRow) => boolean;
    effectiveDebtors: Array<{ name?: string }>;
    coerciveSubjectRef: MutableRefObject<{ id: string; name: string }>;
    openSeizureRequestsTabRef: MutableRefObject<() => void>;
    setShowUnifiedExecutionModal: (open: boolean) => void;
    showToast: (message: string, type?: string, opts?: Record<string, unknown>) => void;
    saveCoerciveAction: (actionType: string, details: Record<string, string>) => void;
};

export function useExecutionDashboardCoerciveActionHandlers(
    params: UseExecutionDashboardCoerciveActionHandlersParams,
) {
    const {
        coerciveUiLocked,
        activeDebtorIsEmployee,
        activeDebtorIsDeceased,
        decisionsStorageExecutionId,
        allDebtorsUnified,
        executionDebtorTabIndex,
        isSolidaryLiability,
        resolveDebtorSolidaryFlag,
        effectiveDebtors,
        coerciveSubjectRef,
        openSeizureRequestsTabRef,
        setShowUnifiedExecutionModal,
        showToast,
        saveCoerciveAction,
    } = params;

    const handleCoerciveAction = useCallback(
        (actionType: string) => {
            let awaitingSeizureDecisionId: string | null = null;
            if (isSeizureActionType(actionType)) {
                const exId = String(decisionsStorageExecutionId ?? '').trim();
                if (exId && exId !== 'undefined') {
                    const rows = readExecutorDecisionsArray(exId) as Array<Record<string, unknown>>;
                    awaitingSeizureDecisionId = findAwaitingSeizureDecisionId(actionType, rows);
                }
            }

            const route = routeCoerciveAction({
                actionType,
                coerciveUiLocked,
                activeDebtorIsEmployee,
                awaitingSeizureDecisionId,
                allDebtorsUnified,
                executionDebtorTabIndex,
                isSolidaryLiability,
                resolveDebtorSolidaryFlag,
                fallbackDebtorName: String(
                    (effectiveDebtors[0] as { name?: string } | undefined)?.name || 'المدين',
                ),
            });

            if (route.kind === 'toast') {
                showToast(route.message, route.type);
                return;
            }

            if (route.kind === 'redirect_followup') {
                setShowUnifiedExecutionModal(true);
                openSeizureRequestsTabRef.current();
                showToast('يوجد طلب حجز موافق عليه يحتاج إكمال البيانات داخل محضر المتابعة.', 'info', {
                    decisionsLink: true,
                    decisionId: route.decisionId,
                    decisionsTab: 'current',
                });
                return;
            }

            coerciveSubjectRef.current = route.subject;
            saveCoerciveAction(
                actionType,
                buildInitialExecutorSeizureDetails(actionType, activeDebtorIsDeceased),
            );
        },
        [
            activeDebtorIsDeceased,
            activeDebtorIsEmployee,
            allDebtorsUnified,
            coerciveSubjectRef,
            coerciveUiLocked,
            decisionsStorageExecutionId,
            effectiveDebtors,
            executionDebtorTabIndex,
            isSolidaryLiability,
            openSeizureRequestsTabRef,
            resolveDebtorSolidaryFlag,
            saveCoerciveAction,
            setShowUnifiedExecutionModal,
            showToast,
        ],
    );

    return { handleCoerciveAction };
}

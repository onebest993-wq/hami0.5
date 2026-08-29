/** ╪ص╪│╪د╪ذ╪د╪ز ╪د┘┘à╪╖╪د┘╪ذ╪ر ┘ê╪د┘╪░┘à╪ر ╪د┘┘à╪د┘┘è╪ر ظ¤ ╪ذ┘╪د outcome hooks (╪ز╪ذ┘é┘ë ┘┘è useExecutionDashboardCore) */
import { useEffect, useMemo, useState } from 'react';
import type { UnifiedLedgerTotalParams } from '@/app/slices/financial/ledgerPublic';
import { useExecutionFlags } from '../useExecutionFlags';
import { useFinancialTotals } from '../useFinancialTotals';
import {
    computeFinancialLawyerFeesAmount,
    computeFinancialPrincipalAmount,
    computePrincipalDebtAmount,
    hasEvictionDataSignals,
    hasEvictionTimelineSignals as detectEvictionTimelineSignals,
    resolveExecutionClaimTypeFlags,
    resolveIsEvictionExecutionModule,
} from './executionDashboardClaimFinancials';
import { resolvePrimaryExecutionClaimType } from '@/app/utils/executionClaimIsolation';
import { getExecutionModuleStrategy } from '@/app/utils/executionModuleStrategies';
import { readMaritalFurnitureItems } from '@/app/utils/maritalFurniture';
import { resolveMaritalFurnitureClaimExecutionData } from '@/app/components/lawyer/ExecutionDashboard/utils/resolveExecutionFinancialHubPrincipal';
import type { DebtorLiabilityGroup } from '@/app/utils/debtorLiabilityGroups';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';

export type UseExecutionDashboardClaimFinancialsParams = {
    executionData: ExecutionFile | null | undefined;
    viewExecutionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    claimType: string | undefined;
    parsedDebtAmount: number;
    parsedLawyerFees: number;
    lawyerFeesAmount: unknown;
    executionFee: unknown;
    total_execution_expenses: number;
    evictionCaseExpensesSum: number;
    liabilityGroupTabsMode: boolean;
    activeLiabilityGroup: DebtorLiabilityGroup | null | undefined;
    allDebtorRowsForLiability: Array<Record<string, unknown>>;
    activeTimelineEvents: TimelineEvent[];
    decisionsStorageExecutionId: string | undefined;
    debtorNotificationDate: string | null | undefined;
    effectiveDebtors: ExecutionFile['debtors'];
};

export function useExecutionDashboardClaimFinancials(params: UseExecutionDashboardClaimFinancialsParams) {
    const {
        executionData,
        viewExecutionData,
        executionId,
        claimType,
        parsedDebtAmount,
        parsedLawyerFees,
        lawyerFeesAmount,
        executionFee,
        total_execution_expenses,
        evictionCaseExpensesSum,
        liabilityGroupTabsMode,
        activeLiabilityGroup,
        allDebtorRowsForLiability,
        activeTimelineEvents,
        decisionsStorageExecutionId,
        debtorNotificationDate,
        effectiveDebtors,
    } = params;

    const executionRecord = executionData as Record<string, unknown> | null | undefined;

    const {
        isNonFinancialClaim,
        isVisitationClaim,
        isMaritalFurnitureClaim,
        isAlimonyClaimType,
    } = resolveExecutionClaimTypeFlags(executionRecord, claimType);

    const maritalFurnitureExecutionView = useMemo(
        () =>
            isMaritalFurnitureClaim
                ? resolveMaritalFurnitureClaimExecutionData(
                      viewExecutionData,
                      executionId,
                      decisionsStorageExecutionId,
                  )
                : viewExecutionData,
        [isMaritalFurnitureClaim, viewExecutionData, executionId, decisionsStorageExecutionId],
    );

    const maritalFurnitureItemsForFollowup = useMemo(
        () => readMaritalFurnitureItems(maritalFurnitureExecutionView),
        [maritalFurnitureExecutionView],
    );

    const maritalFurnitureFinancialSig = useMemo(() => {
        if (!isMaritalFurnitureClaim) return '';
        return maritalFurnitureItemsForFollowup
            .map(
                (row) =>
                    `${row.id}:${row.deliveryOutcome ?? ''}:${row.delivered ?? ''}:${row.deliveryRecordedAt ?? ''}`,
            )
            .join('|');
    }, [isMaritalFurnitureClaim, maritalFurnitureItemsForFollowup]);

    const principalDebtAmount = useMemo(
        () =>
            computePrincipalDebtAmount({
                executionData: isMaritalFurnitureClaim
                    ? (maritalFurnitureExecutionView as Record<string, unknown> | null | undefined)
                    : executionRecord,
                parsedDebtAmount,
                isNonFinancialClaim,
                isMaritalFurnitureClaim,
            }),
        [
            executionRecord,
            viewExecutionData,
            maritalFurnitureExecutionView,
            executionId,
            parsedDebtAmount,
            isNonFinancialClaim,
            isMaritalFurnitureClaim,
            maritalFurnitureFinancialSig,
        ],
    );

    const financialPrincipalAmount = useMemo(
        () =>
            computeFinancialPrincipalAmount({
                liabilityGroupTabsMode,
                activeLiabilityGroup,
                isNonFinancialClaim,
                isMaritalFurnitureClaim,
                principalDebtAmount,
                allDebtorRowsForLiability,
                partyMultiplicity: executionData?.party_multiplicity as Record<string, unknown> | undefined,
            }),
        [
            liabilityGroupTabsMode,
            activeLiabilityGroup,
            isNonFinancialClaim,
            isMaritalFurnitureClaim,
            principalDebtAmount,
            allDebtorRowsForLiability,
            executionData?.party_multiplicity,
        ],
    );

    const financialLawyerFeesAmount = useMemo(
        () =>
            computeFinancialLawyerFeesAmount({
                liabilityGroupTabsMode,
                activeLiabilityGroup,
                parsedLawyerFees,
                allDebtorRowsForLiability,
                lawyerFeesAmount,
                executionFee,
            }),
        [
            liabilityGroupTabsMode,
            activeLiabilityGroup,
            parsedLawyerFees,
            allDebtorRowsForLiability,
            lawyerFeesAmount,
            executionFee,
        ],
    );

    const claimTypeForExecutionModule = useMemo(
        () => resolvePrimaryExecutionClaimType(executionRecord, claimType),
        [claimType, executionRecord],
    );

    const executionModuleStrategy = useMemo(
        () => getExecutionModuleStrategy(claimTypeForExecutionModule),
        [claimTypeForExecutionModule],
    );

    const hasEvictionSignals = useMemo(
        () => hasEvictionDataSignals(executionData),
        [executionData],
    );

    const hasEvictionTimelineSignals = useMemo(
        () => detectEvictionTimelineSignals(activeTimelineEvents),
        [activeTimelineEvents],
    );

    const isEvictionExecutionModule = useMemo(
        () =>
            resolveIsEvictionExecutionModule({
                claimTypeForExecutionModule,
                isMaritalFurnitureClaim,
                useEvictionFieldProcedures: executionModuleStrategy.useEvictionFieldProcedures,
                hasEvictionSignals,
                hasEvictionTimelineSignals,
            }),
        [
            claimTypeForExecutionModule,
            isMaritalFurnitureClaim,
            executionModuleStrategy.useEvictionFieldProcedures,
            hasEvictionSignals,
            hasEvictionTimelineSignals,
        ],
    );

    const {
        judicialCustodiansResolved,
        judicialCustodianSalariesExpenseIqd,
        evictionCaseExpensesTotalForFinancial,
        evictionLawyerFeesInTotals,
        totalOwed,
    } = useFinancialTotals(
        executionData,
        evictionCaseExpensesSum,
        isEvictionExecutionModule,
        financialLawyerFeesAmount,
        financialPrincipalAmount,
        total_execution_expenses,
    );

    const [unifiedLedgerRevision, setUnifiedLedgerRevision] = useState(0);
    useEffect(() => {
        const bump = () => setUnifiedLedgerRevision((n) => n + 1);
        window.addEventListener('hami-unified-ledger-updated', bump);
        window.addEventListener('hami-unified-ledger-external-collect', bump);
        window.addEventListener('hami-unified-ledger-payment-undo', bump);
        window.addEventListener('focus', bump);
        return () => {
            window.removeEventListener('hami-unified-ledger-updated', bump);
            window.removeEventListener('hami-unified-ledger-external-collect', bump);
            window.removeEventListener('hami-unified-ledger-payment-undo', bump);
            window.removeEventListener('focus', bump);
        };
    }, []);

    const seizureMatrixLedgerParams = useMemo((): UnifiedLedgerTotalParams => {
        const exId = String(decisionsStorageExecutionId ?? executionId ?? '').trim();
        const evictionLawyerFeeWaivedAtIntake = isEvictionExecutionModule
            ? !(executionData as { eviction_initial_notice_lawyer_fees_included?: boolean } | undefined)
                  ?.eviction_initial_notice_lawyer_fees_included
            : Boolean(
                  (executionData as { eviction_lawyer_fee_waived_at_intake?: boolean } | undefined)
                      ?.eviction_lawyer_fee_waived_at_intake,
              );
        return {
            principal_amount: financialPrincipalAmount,
            courtOrderedFeesSafe: Math.max(0, evictionLawyerFeesInTotals),
            evictionLawyerFeeWaivedAtIntake,
            executionExpensesSumSafe: Math.max(0, total_execution_expenses),
            evictionCaseExpensesSumSafe: isEvictionExecutionModule
                ? Math.max(0, evictionCaseExpensesTotalForFinancial)
                : 0,
            seedLawyerId: exId ? `seed-lawyer-${exId}` : '',
            seedExpenseId: exId ? `seed-exp-${exId}` : '',
        };
    }, [
        decisionsStorageExecutionId,
        executionId,
        isEvictionExecutionModule,
        executionData,
        financialPrincipalAmount,
        evictionLawyerFeesInTotals,
        total_execution_expenses,
        evictionCaseExpensesTotalForFinancial,
    ]);

    const {
        debtorNotifiedForEvictionGrace,
        isAlimonyClaim,
        isHybridFeesNonMonetary,
        monetaryExecutionStrictPathFlag,
        monetaryStrictForSummoningEngine,
    } = useExecutionFlags(
        executionData,
        debtorNotificationDate,
        effectiveDebtors,
        claimType,
        isNonFinancialClaim,
        financialPrincipalAmount,
        financialLawyerFeesAmount,
    );

    return {
        isNonFinancialClaim,
        isVisitationClaim,
        isMaritalFurnitureClaim,
        maritalFurnitureItemsForFollowup,
        isAlimonyClaimType,
        principalDebtAmount,
        financialPrincipalAmount,
        financialLawyerFeesAmount,
        claimTypeForExecutionModule,
        executionModuleStrategy,
        hasEvictionSignals,
        hasEvictionTimelineSignals,
        isEvictionExecutionModule,
        judicialCustodiansResolved,
        judicialCustodianSalariesExpenseIqd,
        evictionCaseExpensesTotalForFinancial,
        evictionLawyerFeesInTotals,
        totalOwed,
        unifiedLedgerRevision,
        setUnifiedLedgerRevision,
        seizureMatrixLedgerParams,
        debtorNotifiedForEvictionGrace,
        isAlimonyClaim,
        isHybridFeesNonMonetary,
        monetaryExecutionStrictPathFlag,
        monetaryStrictForSummoningEngine,
    };
}

import type { ExecutionFinancialHubFocCenterProps } from './ExecutionFinancialHubFocCenterProps';
import { resolveHubMonthlyAlimony } from './financialHubFocRequestHelpers';

/** Static / derived value props for LazyFinancialOperationsCenter (no interaction callbacks) */
export function buildExecutionFinancialHubFocCenterValueProps(
    props: ExecutionFinancialHubFocCenterProps,
) {
    const {
        financialHubAutoOpenMode,
        financialHubSeizedMovableId,
        financialHubSeizedPropertyId,
        isFinancialCenterExpanded,
        activeFinancialTab,
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
        executionStatus,
        statusMetadata,
        isPaused,
        financialLedger,
        evictionCaseExpensesTotalForFinancial,
        evictionAssetsTabUnlocked,
        salarySeizureRegistryAssets,
        isRepresentingDebtor = false,
        executionData,
        persistExecutionMerge,
    } = props;

    const {
        hubDebtorIsDeceased,
        debtorJob,
        debtorEmploymentType,
        debtorKinship,
        creditorsCount,
        debtorAgentSeizedItems,
        hubExecutionId,
        hubPrincipalAmount,
        ghuramaaCreditors,
    } = props.model;

    return {
        embeddedInFinancialHub: true as const,
        isExpanded: isFinancialCenterExpanded,
        activeTab: activeFinancialTab,
        principal_amount: hubPrincipalAmount,
        court_ordered_fees: evictionLawyerFeesInTotals,
        evictionLawyerFeeWaivedAtIntake: isEvictionExecutionModule
            ? !executionData?.eviction_initial_notice_lawyer_fees_included
            : Boolean(executionData?.eviction_lawyer_fee_waived_at_intake),
        evictionReenableCourtOrderedFees:
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
                : undefined,
        execution_expenses_sum: total_execution_expenses,
        past_wife_alimony: executionData?.pastWifeAlimony || 0,
        past_children_alimony: executionData?.pastChildrenAlimony || 0,
        alimonyCalculated: executionData?.alimony?.calculated ?? null,
        alimony_blob:
            executionData?.alimony && typeof executionData.alimony === 'object'
                ? (executionData.alimony as unknown as Record<string, unknown>)
                : null,
        alimony_beneficiary_death:
            (executionData as { alimony_beneficiary_death?: unknown } | null | undefined)
                ?.alimony_beneficiary_death ?? null,
        pastAlimonyClaim:
            (executionData as { pastAlimonyClaim?: unknown } | null | undefined)?.pastAlimonyClaim ??
            null,
        monthly_wife_alimony: executionData?.monthlyWifeAlimony ?? 0,
        monthly_children_alimony: executionData?.monthlyChildrenAlimony ?? 0,
        monthlyAlimony: resolveHubMonthlyAlimony({
            executionData,
            monthlyAlimony,
        }),
        children_count: executionData?.childrenCount ?? 1,
        totalOwed,
        remaining,
        feesTotal: parsedCourtFees + parsedDirectorateFees + parsedClientFees,
        financialStatus,
        isNonFinancialClaim,
        isAlimonyClaim,
        claimType,
        claimTypes: Array.isArray((executionData as { claimTypes?: string[] })?.claimTypes)
            ? (executionData as { claimTypes?: string[] }).claimTypes
            : undefined,
        paidDebt,
        totalWithExecutionFee,
        executionFee: calculatedExecutionFee,
        shouldCalculateExecutionFee,
        accumulatedAlimony,
        courtFees: parsedCourtFees,
        directorateFees: parsedDirectorateFees,
        clientFees: parsedClientFees,
        paidCourtFees,
        paidDirectorateFees,
        paidClientFees,
        daysSinceNotice: daysSinceNoticeCalculated,
        gracePeriodEnded,
        debtorJob,
        debtorEmploymentType,
        debtorKinship,
        initiator,
        executionStatus,
        statusMetadata,
        isPaused,
        financialLedger,
        autoOpenLedgerMode: financialHubAutoOpenMode,
        proceedsDisburseSeizedMovableId: financialHubSeizedMovableId,
        proceedsDisburseSeizedPropertyId: financialHubSeizedPropertyId,
        executionId: hubExecutionId,
        creditorsCount,
        ghuramaaCreditors,
        eviction_case_expenses_sum: isEvictionExecutionModule
            ? evictionCaseExpensesTotalForFinancial
            : 0,
        evictionLedgerActivatedPersisted: Boolean(
            executionData?.eviction_assets_tab_unlocked || evictionAssetsTabUnlocked
        ),
        salarySeizureRegistryAssets: salarySeizureRegistryAssets as unknown[] | undefined,
        isRepresentingDebtor,
        debtorAgentSeizedItems,
        activeDebtorIsDeceased: hubDebtorIsDeceased,
        hubKey: `${hubExecutionId ?? 'hub'}-${hubPrincipalAmount}`,
    };
}

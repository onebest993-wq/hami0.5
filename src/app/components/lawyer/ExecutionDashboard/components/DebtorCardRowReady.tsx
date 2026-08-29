import React from 'react';
import type {
    Debtor,
    RealEstateSeizureAsset,
    SeizedAsset,
    StandaloneExecutionMark,
    ThirdPartySeizure,
    ThirdPartySeizureAsset,
    TimelineEvent,
} from '@/app/types/execution';
import type { DebtorWorkspaceEntry as DebtorWorkspaceEntryContract } from '@/app/components/lawyer/ExecutionDashboard/hooks/useDebtorWorkspaceEntries';
import { buildDebtorCardRowModel } from '../helpers/buildDebtorCardRowModel';
import type {
    DebtorsSectionProps,
    ExpandControlRegistrar,
} from './DebtorsSection.types';
import { DebtorCardRowPartyBody } from './DebtorCardRowPartyBody';

export type DebtorCardRowProps = DebtorsSectionProps & {
    raw: DebtorWorkspaceEntryContract | Debtor;
    loopIdx: number;
    registerExpandControl: ExpandControlRegistrar;
    applyPartyOverlay: (
        party: Record<string, unknown>,
        role: 'debtor' | 'creditor',
    ) => Record<string, unknown>;
    custodyRemovalClaimActive: boolean;
    safeActiveDebtorHeirsForNotification: unknown[];
    safeActiveTimelineEvents: TimelineEvent[];
    safeActiveTimelineEventsDebtorScoped: TimelineEvent[];
    safeDebtorWorkspaceEntries: DebtorWorkspaceEntryContract[];
    safeEffectiveDebtors: Debtor[];
    safeRealEstateSeizureAssets: RealEstateSeizureAsset[];
    safeSeizedAssets: SeizedAsset[];
    safeStandaloneExecutionMarks: StandaloneExecutionMark[];
    safeThirdPartySeizureAssets: ThirdPartySeizureAsset[];
    safeThirdPartySeizures: ThirdPartySeizure[];
};

export function DebtorCardRowReady(props: DebtorCardRowProps) {
    const model = buildDebtorCardRowModel({
        raw: props.raw,
        loopIdx: props.loopIdx,
        applyPartyOverlay: props.applyPartyOverlay,
        multiDebtorMode: props.multiDebtorMode,
        showExtraDebtors: props.showExtraDebtors,
        safeDebtorWorkspaceEntries: props.safeDebtorWorkspaceEntries,
        safeEffectiveDebtors: props.safeEffectiveDebtors,
        getExecutionPartyDisplayName: props.getExecutionPartyDisplayName,
        buildPartyHeirsRows: props.buildPartyHeirsRows,
        executionData: props.executionData,
        decisionsStorageExecutionId: props.decisionsStorageExecutionId,
        debtorBrowserTabsMode: props.debtorBrowserTabsMode,
        isDebtorRowEmployee: props.isDebtorRowEmployee,
        debtorEmploymentToggleMenuLabel: props.debtorEmploymentToggleMenuLabel,
        principalDebtAmount: props.principalDebtAmount,
        parsedLawyerFees: props.parsedLawyerFees,
        claimType: props.claimType,
        isNonFinancialClaim: props.isNonFinancialClaim,
        debtorSummonsProfile: props.debtorSummonsProfile,
        getDebtorSummonsProfile: props.getDebtorSummonsProfile,
        isRepresentingDebtor: props.isRepresentingDebtor,
        viewExecutionData: props.viewExecutionData,
        primaryDebtorKeyResolved: props.primaryDebtorKeyResolved,
        isEvictionExecutionModule: props.isEvictionExecutionModule,
        debtorAttendedVoluntarily: props.debtorAttendedVoluntarily,
        voluntaryAttendanceCount: props.voluntaryAttendanceCount,
        noticeVoluntaryPeriodEndOptimistic: Boolean(props.noticeVoluntaryPeriodEndOptimistic),
        voluntaryEndOptimistic: Boolean(props.voluntaryEndOptimistic),
        getPublicationNoticeForDebtorKey: props.getPublicationNoticeForDebtorKey,
        publicationNoticeDeadlineYmd: props.publicationNoticeDeadlineYmd,
        isAssignmentDeadlinePassed: props.isAssignmentDeadlinePassed,
        daysRemainingUntilDeadline: props.daysRemainingUntilDeadline,
        getEmployeeAssignmentForDebtorKey: props.getEmployeeAssignmentForDebtorKey,
        computeTaklifDeadlineYmd: props.computeTaklifDeadlineYmd,
        getPersonalCoerciveSubtypeOutcome: props.getPersonalCoerciveSubtypeOutcome,
        executionId: props.executionId,
        primaryMemoNoticeBadge: props.primaryMemoNoticeBadge,
        primaryDebtorAbsenceBadge: props.primaryDebtorAbsenceBadge,
        getDebtorSummonsMarkerForKey: props.getDebtorSummonsMarkerForKey,
        forcedPathAttendanceSecured: props.forcedPathAttendanceSecured,
        debtorForcedToAttend: props.debtorForcedToAttend,
    } as Parameters<typeof buildDebtorCardRowModel>[0]);

    if (!model) return null;

    return <DebtorCardRowPartyBody {...props} model={model} />;
}

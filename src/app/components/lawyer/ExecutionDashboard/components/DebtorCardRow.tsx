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
import { DebtorPartyCard } from './DebtorPartyCard';
import { DebtorCardRowCollapsed } from './DebtorCardRowCollapsed';
import { DebtorCardRowExpanded } from './DebtorCardRowExpanded';
import type {
    DebtorsSectionProps,
    ExpandControlRegistrar,
} from './DebtorsSection.types';

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

export function DebtorCardRow({
    raw,
    loopIdx,
    registerExpandControl,
    applyPartyOverlay,
    custodyRemovalClaimActive,
    safeActiveDebtorHeirsForNotification,
    safeActiveTimelineEvents,
    safeActiveTimelineEventsDebtorScoped,
    safeDebtorWorkspaceEntries,
    safeEffectiveDebtors,
    safeRealEstateSeizureAssets,
    safeSeizedAssets,
    safeStandaloneExecutionMarks,
    safeThirdPartySeizureAssets,
    safeThirdPartySeizures,
    Bell,
    Calendar,
    DebtorSeizureCategoryBadges,
    ExecutionPartyInteractiveBadges,
    MapPin,
    Phone,
    X,
    activeDebtorIsDeceased,
    buildDebtorSummonsMarkerPatchForKey,
    buildEmployeeAssignmentPatchForDebtorKey,
    buildPartyHeirsRows,
    buildPublicationNoticePatchForDebtorKey,
    claimType,
    clearDebtorSummonsMarker,
    completeEvictionResidentialGrace,
    completePoliceAssistance,
    computeTaklifDeadlineYmd,
    daysRemainingUntilDeadline,
    debtorArrested,
    debtorAttendedVoluntarily,
    debtorBrowserTabsMode,
    debtorDeathMenuLabel,
    debtorEmploymentToggleMenuLabel,
    debtorForcedToAttend,
    debtorSummonsMarkerLocal,
    debtorSummonsProfile,
    decisionsReloadEpoch,
    decisionsStorageExecutionId,
    dismissDebtorAbsenceBadge,
    evictionGraceBadgeInfo,
    evictionGracePinned,
    executionAppealBanner,
    executionData,
    executionId,
    executionMemoBadgePopoverOpen,
    executionToolsTimelineLockedUi,
    forcedPathAttendanceSecured,
    getDebtorSummonsMarkerForKey,
    getDebtorSummonsProfile,
    getEmployeeAssignmentForDebtorKey,
    getExecutionPartyDisplayName,
    getPersonalCoerciveSubtypeOutcome,
    getPublicationNoticeForDebtorKey,
    handleDebtorDeathMenuAction,
    handleDebtorEmploymentToggle,
    heirsDetailsIncludeClient,
    isAssignmentDeadlinePassed,
    isDebtorRowEmployee,
    isEvictionExecutionModule,
    isHistoricalMode,
    isNonFinancialClaim,
    isRepresentingDebtor = false,
    multiDebtorMode,
    nextTimelineId,
    openEditParty,
    openEvictionResidentialGraceModal,
    openHeirsNotificationCenter,
    openHeirsQuickView,
    openPoliceAssistanceFromBadge,
    parsedLawyerFees,
    partyBadgesExecutionId,
    persistExecutionMerge,
    policeAssistanceBadgeInfo,
    primaryDebtorAbsenceBadge,
    primaryDebtorKeyResolved,
    primaryMemoNoticeBadge,
    principalDebtAmount,
    publicationNoticeDeadlineYmd,
    pushTimelineEvent,
    saveSummonsMarkerPurposeEdit,
    setDebtorSummonsMarkerLocal,
    onOpenDecisionsAppealsTab,
    setEvictionGraceDecisionId,
    setExecutionMemoBadgePopoverOpen,
    onOpenUnifiedSummonsHub,
    setSummonsMarkerPopoverOpen,
    setSummonsPurposeDraft,
    showDebtorSummonsAttendanceBadge,
    showDebtorUnservedMemoBadge,
    showExtraDebtors,
    showToast,
    summonsMarkerPopoverOpen,
    summonsPurposeDraft,
    timelineDebtorMetadata,
    toggleEvictionGracePinned,
    viewExecutionData,
    voluntaryAttendanceCount,
    noticeVoluntaryPeriodEndOptimistic = false,
    voluntaryEndOptimistic = false,
}: DebtorCardRowProps) {
    const model = buildDebtorCardRowModel({
        raw,
        loopIdx,
        applyPartyOverlay,
        multiDebtorMode,
        showExtraDebtors,
        safeDebtorWorkspaceEntries,
        safeEffectiveDebtors,
        getExecutionPartyDisplayName,
        buildPartyHeirsRows,
        executionData,
        decisionsStorageExecutionId,
        debtorBrowserTabsMode,
        isDebtorRowEmployee,
        debtorEmploymentToggleMenuLabel,
        principalDebtAmount,
        parsedLawyerFees,
        claimType,
        isNonFinancialClaim,
        debtorSummonsProfile,
        getDebtorSummonsProfile,
        isRepresentingDebtor,
        viewExecutionData,
        primaryDebtorKeyResolved,
        isEvictionExecutionModule,
        debtorAttendedVoluntarily,
        voluntaryAttendanceCount,
        noticeVoluntaryPeriodEndOptimistic,
        voluntaryEndOptimistic,
        getPublicationNoticeForDebtorKey,
        publicationNoticeDeadlineYmd,
        isAssignmentDeadlinePassed,
        daysRemainingUntilDeadline,
        getEmployeeAssignmentForDebtorKey,
        computeTaklifDeadlineYmd,
        getPersonalCoerciveSubtypeOutcome,
        executionId,
        primaryMemoNoticeBadge,
        primaryDebtorAbsenceBadge,
        getDebtorSummonsMarkerForKey,
        forcedPathAttendanceSecured,
        debtorForcedToAttend,
    });

    if (!model) return null;

    const {
        wsDebt,
        wsRow,
        d,
        fileDebtorOrdinal,
        idx,
        isPrimary,
        debtorKey,
        debtorDisp,
        debtorHasHeirs,
        debtorHeirsWord,
        debtorHeirsEditOnly,
        rowIsEmployee,
        rowEmploymentToggleLabel,
        rowIsLegalEntity,
        showDebtorNotificationPanel,
        rowShowUnservedMemoBadge,
        rowTaklifAssignmentBadge,
        rowAbsenceNoticeBadge,
        rowMemoNoticeBadge,
        rowShowSummonsBadge,
        rowRegularTablighBadge,
        rowPublicationNoticeBadgeResolved,
        rowForcedAttendancePending,
        showDebtorOrdinalBadge,
    } = model;

    const debtorBadgeExtra = showDebtorOrdinalBadge ? (
        <span className="tabular-nums text-[10px] font-bold opacity-90">
            {fileDebtorOrdinal + 1}
        </span>
    ) : null;

    return (
        <div className="mt-2 w-full" dir="rtl">
            <DebtorPartyCard
                debtorKey={debtorKey}
                registerExpandControl={registerExpandControl}
                badgeExtra={debtorBadgeExtra}
                collapsed={
                    <DebtorCardRowCollapsed
                        d={d}
                        debtorDisp={debtorDisp}
                        debtorHeirsWord={debtorHeirsWord}
                        debtorHasHeirs={debtorHasHeirs}
                        rowIsLegalEntity={rowIsLegalEntity}
                        rowShowUnservedMemoBadge={rowShowUnservedMemoBadge}
                        showDebtorNotificationPanel={showDebtorNotificationPanel}
                        heirsDetailsIncludeClient={heirsDetailsIncludeClient}
                        openHeirsQuickView={openHeirsQuickView}
                        executionAppealBanner={executionAppealBanner}
                        onOpenDecisionsAppealsTab={onOpenDecisionsAppealsTab}
                        isRepresentingDebtor={Boolean(isRepresentingDebtor)}
                        isPrimary={isPrimary}
                        debtorBrowserTabsMode={debtorBrowserTabsMode}
                        debtorKey={debtorKey}
                        primaryDebtorKeyResolved={primaryDebtorKeyResolved}
                        rowIsEmployee={rowIsEmployee}
                        rowForcedAttendancePending={rowForcedAttendancePending}
                        rowMemoNoticeBadge={rowMemoNoticeBadge}
                        rowAbsenceNoticeBadge={rowAbsenceNoticeBadge}
                        rowShowSummonsBadge={rowShowSummonsBadge}
                        rowRegularTablighBadge={rowRegularTablighBadge}
                        rowPublicationNoticeBadgeResolved={rowPublicationNoticeBadgeResolved}
                        rowTaklifAssignmentBadge={rowTaklifAssignmentBadge}
                        safeSeizedAssets={safeSeizedAssets}
                        safeRealEstateSeizureAssets={safeRealEstateSeizureAssets}
                        safeThirdPartySeizureAssets={safeThirdPartySeizureAssets}
                        safeThirdPartySeizures={safeThirdPartySeizures}
                        safeStandaloneExecutionMarks={safeStandaloneExecutionMarks}
                        safeActiveTimelineEvents={safeActiveTimelineEvents}
                        safeActiveTimelineEventsDebtorScoped={safeActiveTimelineEventsDebtorScoped}
                        DebtorSeizureCategoryBadges={DebtorSeizureCategoryBadges}
                        ExecutionPartyInteractiveBadges={ExecutionPartyInteractiveBadges}
                        partyBadgesExecutionId={partyBadgesExecutionId}
                        viewExecutionData={viewExecutionData}
                        debtorAttendedVoluntarily={debtorAttendedVoluntarily}
                        voluntaryAttendanceCount={voluntaryAttendanceCount}
                        executionData={executionData}
                        setSummonsMarkerPopoverOpen={setSummonsMarkerPopoverOpen}
                        setExecutionMemoBadgePopoverOpen={setExecutionMemoBadgePopoverOpen}
                        evictionGraceBadgeInfo={evictionGraceBadgeInfo}
                        evictionGracePinned={evictionGracePinned}
                        toggleEvictionGracePinned={toggleEvictionGracePinned}
                        setEvictionGraceDecisionId={setEvictionGraceDecisionId}
                        openEvictionResidentialGraceModal={openEvictionResidentialGraceModal}
                        completeEvictionResidentialGrace={completeEvictionResidentialGrace}
                        policeAssistanceBadgeInfo={policeAssistanceBadgeInfo}
                        openPoliceAssistanceFromBadge={openPoliceAssistanceFromBadge}
                        completePoliceAssistance={completePoliceAssistance}
                        getPublicationNoticeForDebtorKey={getPublicationNoticeForDebtorKey}
                        persistExecutionMerge={persistExecutionMerge}
                        buildPublicationNoticePatchForDebtorKey={buildPublicationNoticePatchForDebtorKey}
                        onOpenUnifiedSummonsHub={onOpenUnifiedSummonsHub}
                        dismissDebtorAbsenceBadge={dismissDebtorAbsenceBadge}
                        getDebtorSummonsMarkerForKey={getDebtorSummonsMarkerForKey}
                        buildDebtorSummonsMarkerPatchForKey={buildDebtorSummonsMarkerPatchForKey}
                        debtorSummonsMarkerLocal={debtorSummonsMarkerLocal}
                        setDebtorSummonsMarkerLocal={setDebtorSummonsMarkerLocal}
                        debtorArrested={debtorArrested}
                        decisionsStorageExecutionId={decisionsStorageExecutionId}
                        pushTimelineEvent={pushTimelineEvent}
                        nextTimelineId={nextTimelineId}
                        timelineDebtorMetadata={timelineDebtorMetadata}
                        showToast={showToast}
                        getEmployeeAssignmentForDebtorKey={getEmployeeAssignmentForDebtorKey}
                        buildEmployeeAssignmentPatchForDebtorKey={buildEmployeeAssignmentPatchForDebtorKey}
                        decisionsReloadEpoch={decisionsReloadEpoch}
                        isHistoricalMode={isHistoricalMode}
                    />
                }
                expanded={
                    <DebtorCardRowExpanded
                        d={d}
                        debtorKey={debtorKey}
                        isPrimary={isPrimary}
                        idx={idx}
                        wsDebt={wsDebt}
                        wsRow={wsRow}
                        multiDebtorMode={multiDebtorMode}
                        rowIsEmployee={rowIsEmployee}
                        rowEmploymentToggleLabel={rowEmploymentToggleLabel}
                        rowIsLegalEntity={rowIsLegalEntity}
                        debtorHeirsEditOnly={debtorHeirsEditOnly}
                        debtorDisp={debtorDisp}
                        showDebtorNotificationPanel={showDebtorNotificationPanel}
                        custodyRemovalClaimActive={custodyRemovalClaimActive}
                        Bell={Bell}
                        Phone={Phone}
                        MapPin={MapPin}
                        X={X}
                        Calendar={Calendar}
                        debtorDeathMenuLabel={debtorDeathMenuLabel}
                        handleDebtorDeathMenuAction={handleDebtorDeathMenuAction}
                        handleDebtorEmploymentToggle={handleDebtorEmploymentToggle}
                        isHistoricalMode={isHistoricalMode}
                        showToast={showToast}
                        openEditParty={openEditParty}
                        openHeirsNotificationCenter={openHeirsNotificationCenter}
                        executionToolsTimelineLockedUi={executionToolsTimelineLockedUi}
                        activeDebtorIsDeceased={activeDebtorIsDeceased}
                        safeActiveDebtorHeirsForNotification={safeActiveDebtorHeirsForNotification}
                        onOpenUnifiedSummonsHub={onOpenUnifiedSummonsHub}
                        executionData={executionData}
                        executionMemoBadgePopoverOpen={executionMemoBadgePopoverOpen}
                        primaryMemoNoticeBadge={primaryMemoNoticeBadge}
                        showDebtorUnservedMemoBadge={showDebtorUnservedMemoBadge}
                        setExecutionMemoBadgePopoverOpen={setExecutionMemoBadgePopoverOpen}
                        showDebtorSummonsAttendanceBadge={showDebtorSummonsAttendanceBadge}
                        summonsMarkerPopoverOpen={summonsMarkerPopoverOpen}
                        debtorSummonsMarkerLocal={debtorSummonsMarkerLocal}
                        summonsPurposeDraft={summonsPurposeDraft}
                        setSummonsPurposeDraft={setSummonsPurposeDraft}
                        setSummonsMarkerPopoverOpen={setSummonsMarkerPopoverOpen}
                        saveSummonsMarkerPurposeEdit={saveSummonsMarkerPurposeEdit}
                        clearDebtorSummonsMarker={clearDebtorSummonsMarker}
                    />
                }
            />
        </div>
    );
}

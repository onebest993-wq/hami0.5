import React from 'react';
import { useExecutionSectionConfirm } from '@/app/components/lawyer/execution/useExecutionSectionConfirm';
import { useDebtorCardRowBadgeActions } from './debtorCardRow/useDebtorCardRowBadgeActions';

export type { DebtorCardRowBadgesClusterProps } from './DebtorCardRowBadgesCluster.types';
import type { DebtorCardRowBadgesClusterProps } from './DebtorCardRowBadgesCluster.types';

export function DebtorCardRowBadgesCluster(props: DebtorCardRowBadgesClusterProps) {
    const {
        isRepresentingDebtor,
        isPrimary,
        debtorBrowserTabsMode,
        debtorKey,
        primaryDebtorKeyResolved,
        rowIsEmployee,
        rowForcedAttendancePending,
        rowMemoNoticeBadge,
        rowAbsenceNoticeBadge,
        rowShowSummonsBadge,
        rowRegularTablighBadge,
        rowPublicationNoticeBadgeResolved,
        rowTaklifAssignmentBadge,
        safeSeizedAssets,
        safeRealEstateSeizureAssets,
        safeThirdPartySeizureAssets,
        safeThirdPartySeizures,
        safeStandaloneExecutionMarks,
        safeActiveTimelineEvents,
        safeActiveTimelineEventsDebtorScoped,
        DebtorSeizureCategoryBadges,
        ExecutionPartyInteractiveBadges,
        partyBadgesExecutionId,
        viewExecutionData,
        debtorAttendedVoluntarily,
        voluntaryAttendanceCount,
        executionData,
        setSummonsMarkerPopoverOpen,
        setExecutionMemoBadgePopoverOpen,
        evictionGraceBadgeInfo,
        evictionGracePinned,
        toggleEvictionGracePinned,
        setEvictionGraceDecisionId,
        openEvictionResidentialGraceModal,
        completeEvictionResidentialGrace,
        policeAssistanceBadgeInfo,
        openPoliceAssistanceFromBadge,
        completePoliceAssistance,
        dismissDebtorAbsenceBadge,
        debtorArrested,
        decisionsReloadEpoch,
        isHistoricalMode,
    } = props;

    const { confirm: confirmInSection, dialog: sectionConfirmDialog } = useExecutionSectionConfirm();
    const actions = useDebtorCardRowBadgeActions(props, confirmInSection);

    if (isRepresentingDebtor) return null;

    const hasSeizureBadges =
        safeSeizedAssets.length > 0 ||
        safeRealEstateSeizureAssets.length > 0 ||
        safeThirdPartySeizureAssets.length > 0 ||
        safeThirdPartySeizures.length > 0 ||
        safeStandaloneExecutionMarks.length > 0;
    const showInteractive = Boolean(isPrimary || debtorBrowserTabsMode);
    if (!hasSeizureBadges && !showInteractive) return null;

    return (
        <div
            className="mt-2 flex flex-row-reverse flex-wrap items-center justify-start gap-1.5"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="presentation"
        >
            {showInteractive ? (
                <ExecutionPartyInteractiveBadges
                    embeddedInRow
                    executionId={partyBadgesExecutionId}
                    party="debtor"
                    isPrimaryDebtor={isPrimary}
                    executionData={viewExecutionData}
                    debtorAttendedVoluntarily={isPrimary ? debtorAttendedVoluntarily : false}
                    voluntaryAttendanceCount={isPrimary ? voluntaryAttendanceCount : 0}
                    seizedAssets={safeSeizedAssets}
                    timelineEvents={
                        debtorBrowserTabsMode
                            ? safeActiveTimelineEventsDebtorScoped
                            : safeActiveTimelineEvents
                    }
                    memoBadge={rowMemoNoticeBadge}
                    onMemoActivate={() => {
                        setSummonsMarkerPopoverOpen(false);
                        setExecutionMemoBadgePopoverOpen(true);
                    }}
                    evictionGraceBadge={isPrimary ? evictionGraceBadgeInfo : null}
                    evictionGracePinned={evictionGracePinned}
                    onToggleEvictionGracePinned={toggleEvictionGracePinned}
                    onEvictionGraceActivate={
                        isPrimary &&
                        evictionGraceBadgeInfo &&
                        typeof openEvictionResidentialGraceModal === 'function'
                            ? () => {
                                  setEvictionGraceDecisionId(null);
                                  openEvictionResidentialGraceModal();
                              }
                            : undefined
                    }
                    onCompleteEvictionGrace={
                        isPrimary &&
                        evictionGraceBadgeInfo &&
                        typeof completeEvictionResidentialGrace === 'function'
                            ? completeEvictionResidentialGrace
                            : undefined
                    }
                    policeAssistanceBadge={isPrimary ? policeAssistanceBadgeInfo : null}
                    onPoliceAssistanceActivate={
                        isPrimary &&
                        policeAssistanceBadgeInfo &&
                        typeof openPoliceAssistanceFromBadge === 'function'
                            ? openPoliceAssistanceFromBadge
                            : undefined
                    }
                    onCompletePoliceAssistance={
                        isPrimary &&
                        policeAssistanceBadgeInfo &&
                        typeof completePoliceAssistance === 'function'
                            ? completePoliceAssistance
                            : undefined
                    }
                    publicationNoticeBadge={rowPublicationNoticeBadgeResolved}
                    onDismissPublicationNoticeBadge={actions.onDismissPublicationNoticeBadge}
                    onPublicationNoticeActivate={actions.openNashrHub}
                    absenceBadge={rowAbsenceNoticeBadge}
                    onDismissAbsence={rowAbsenceNoticeBadge ? dismissDebtorAbsenceBadge : undefined}
                    showSummonsBadge={rowShowSummonsBadge}
                    onSummonsActivate={actions.openTablighHub}
                    regularTablighBadge={rowRegularTablighBadge}
                    onDismissRegularTablighBadge={actions.onDismissRegularTablighBadge}
                    debtorArrested={Boolean(debtorArrested || executionData?.debtorArrested)}
                    personalCoerciveDecisionBadges={!rowIsEmployee}
                    debtorIsEmployee={rowIsEmployee}
                    activeDebtorKey={String(debtorKey)}
                    primaryDebtorKey={primaryDebtorKeyResolved}
                    forcedAttendancePending={rowForcedAttendancePending}
                    onWithdrawTravelBan={actions.onWithdrawTravelBan}
                    taklifAssignmentBadge={rowTaklifAssignmentBadge}
                    onTaklifAssignmentActivate={actions.onTaklifAssignmentActivate}
                    onDismissTaklifAssignmentBadge={actions.onDismissTaklifAssignmentBadge}
                    decisionsReloadEpoch={decisionsReloadEpoch}
                    isHistoricalMode={isHistoricalMode}
                />
            ) : null}
            {hasSeizureBadges ? (
                <DebtorSeizureCategoryBadges
                    embeddedInRow
                    executionId={partyBadgesExecutionId}
                    decisionsExecutionId={partyBadgesExecutionId}
                    seizedAssets={safeSeizedAssets}
                    realEstateSeizureAssets={safeRealEstateSeizureAssets}
                    thirdPartySeizureAssets={safeThirdPartySeizureAssets}
                    thirdPartySeizures={safeThirdPartySeizures}
                    standaloneExecutionMarks={safeStandaloneExecutionMarks}
                />
            ) : null}
            {sectionConfirmDialog}
        </div>
    );
}

import React from 'react';
import { DebtorPartyCard } from './DebtorPartyCard';
import { DebtorCardRowCollapsed } from './DebtorCardRowCollapsed';
import { DebtorCardRowExpanded } from './DebtorCardRowExpanded';
import { ExecutionPartySpecialActionsMenu } from '@/app/components/lawyer/execution/ExecutionPartySpecialActionsMenu';
import { appendCustomPartySignal } from '@/app/components/lawyer/execution/partyInteractiveBadges/customPartySignalsStorage';
import { isPrimaryPartyDeceased } from '@/app/utils/partyHeirsEditOnlyMode';
import type { Debtor, Party } from '@/app/types/execution';
import type { DebtorCardRowProps } from './DebtorCardRowReady';

type Model = NonNullable<ReturnType<typeof import('../helpers/buildDebtorCardRowModel').buildDebtorCardRowModel>>;

export function DebtorCardRowPartyBody({
    model,
    registerExpandControl,
    custodyRemovalClaimActive,
    safeActiveDebtorHeirsForNotification,
    safeActiveTimelineEvents,
    safeActiveTimelineEventsDebtorScoped,
    safeRealEstateSeizureAssets,
    safeSeizedAssets,
    safeStandaloneExecutionMarks,
    safeThirdPartySeizureAssets,
    safeThirdPartySeizures,
    ...rest
}: DebtorCardRowProps & { model: Model }) {
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
    const {
        Bell,
        Calendar,
        DebtorSeizureCategoryBadges,
        ExecutionPartyInteractiveBadges,
        X,
        activeDebtorIsDeceased,
        buildDebtorSummonsMarkerPatchForKey,
        buildEmployeeAssignmentPatchForDebtorKey,
        buildPublicationNoticePatchForDebtorKey,
        completeEvictionResidentialGrace,
        completePoliceAssistance,
        debtorArrested,
        debtorAttendedVoluntarily,
        debtorBrowserTabsMode,
        debtorDeathMenuLabel,
        dismissDebtorAbsenceBadge,
        evictionGraceBadgeInfo,
        evictionGracePinned,
        executionAppealBanner,
        executionData,
        executionMemoBadgePopoverOpen,
        executionToolsTimelineLockedUi,
        getDebtorSummonsMarkerForKey,
        getEmployeeAssignmentForDebtorKey,
        getPublicationNoticeForDebtorKey,
        handleDebtorDeathMenuAction,
        handleDebtorEmploymentToggle,
        heirsDetailsIncludeClient,
        isHistoricalMode,
        isRepresentingDebtor = false,
        multiDebtorMode,
        nextTimelineId,
        openEditParty,
        openEvictionResidentialGraceModal,
        openHeirsNotificationCenter,
        openHeirsQuickView,
        openPoliceAssistanceFromBadge,
        partyBadgesExecutionId,
        persistExecutionMerge,
        persistGuarantorFollowupDetails,
        policeAssistanceBadgeInfo,
        primaryDebtorKeyResolved,
        primaryMemoNoticeBadge,
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
        showToast,
        summonsMarkerPopoverOpen,
        summonsPurposeDraft,
        timelineDebtorMetadata,
        toggleEvictionGracePinned,
        viewExecutionData,
        voluntaryAttendanceCount,
        debtorSummonsMarkerLocal,
        decisionsReloadEpoch,
        decisionsStorageExecutionId,
        clearDebtorSummonsMarker,
    } = rest as DebtorCardRowProps;

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
                        actionsMenu={
                            <ExecutionPartySpecialActionsMenu
                                variant="debtor"
                                debtorDeathEntryLabel={debtorDeathMenuLabel}
                                onReportDebtorDeath={handleDebtorDeathMenuAction}
                                debtorIsEmployee={rowIsEmployee}
                                debtorEmploymentToggleLabel={rowEmploymentToggleLabel}
                                onToggleDebtorEmployment={() =>
                                    handleDebtorEmploymentToggle({
                                        debtorKey,
                                        isPrimary,
                                    })
                                }
                                debtorEmploymentToggleToKasabDisabled={false}
                                hideDebtorEmploymentToggle={Boolean(
                                    (isPrimary
                                        ? isPrimaryPartyDeceased(
                                              'debtor',
                                              d as Party,
                                              executionData,
                                          )
                                        : Boolean((d as Debtor)?.isDeceased)) ||
                                        rowIsLegalEntity ||
                                        custodyRemovalClaimActive
                                )}
                                isHistoricalMode={isHistoricalMode}
                                onAddCustomSignal={(label) => {
                                    const added = appendCustomPartySignal(
                                        String(partyBadgesExecutionId || ''),
                                        'debtor',
                                        String(debtorKey || ''),
                                        label,
                                    );
                                    if (!added) {
                                        showToast('تعذّر إضافة الإشارة أو أنها مكررة.', 'warning');
                                        return;
                                    }
                                    showToast('تمت إضافة الإشارة المخصصة.', 'success');
                                }}
                                editPartyLabel={
                                    debtorHeirsEditOnly ? 'تعديل بيانات الورثة' : undefined
                                }
                                onEditParty={
                                    debtorHeirsEditOnly
                                        ? () => {
                                              if (
                                                  multiDebtorMode &&
                                                  wsDebt &&
                                                  wsRow.fileDebtorIndex === null
                                              ) {
                                                  showToast(
                                                      'لا يمكن تعديل هذا المدين من هنا بعد تسجيل الإضبارة.',
                                                      'info',
                                                  );
                                                  return;
                                              }
                                              openEditParty('debtor', idx, {
                                                  party: d as Party,
                                                  forceHeirs: true,
                                              });
                                          }
                                        : undefined
                                }
                            />
                        }
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
                        persistGuarantorFollowupDetails={persistGuarantorFollowupDetails}
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
                        isPrimary={isPrimary}
                        multiDebtorMode={multiDebtorMode}
                        rowIsEmployee={rowIsEmployee}
                        rowIsLegalEntity={rowIsLegalEntity}
                        debtorDisp={debtorDisp}
                        showDebtorNotificationPanel={showDebtorNotificationPanel}
                        Bell={Bell}
                        X={X}
                        Calendar={Calendar}
                        openHeirsNotificationCenter={openHeirsNotificationCenter}
                        executionToolsTimelineLockedUi={executionToolsTimelineLockedUi}
                        activeDebtorIsDeceased={activeDebtorIsDeceased}
                        safeActiveDebtorHeirsForNotification={safeActiveDebtorHeirsForNotification}
                        onOpenUnifiedSummonsHub={onOpenUnifiedSummonsHub}
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

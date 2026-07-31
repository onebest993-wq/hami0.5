import React from 'react';
import type { Debtor, Party } from '@/app/types/execution';
import { HeirsQuickViewTrigger } from './HeirsQuickViewTrigger';
import {
    DebtorCardRowBadgesCluster,
    type DebtorCardRowBadgesClusterProps,
} from './DebtorCardRowBadgesCluster';
import type { DebtorsSectionProps } from './DebtorsSection.types';

export type DebtorCardRowCollapsedProps = DebtorCardRowBadgesClusterProps & {
    d: Debtor;
    debtorDisp: {
        text: string;
        baseName: string;
        showDeceasedGlyph: boolean;
        heirSubstituteLines?: string[];
    };
    debtorHeirsWord: string | null;
    debtorHasHeirs: boolean;
    rowIsLegalEntity: boolean;
    rowShowUnservedMemoBadge: boolean;
    showDebtorNotificationPanel: boolean;
    heirsDetailsIncludeClient: DebtorsSectionProps['heirsDetailsIncludeClient'];
    openHeirsQuickView: DebtorsSectionProps['openHeirsQuickView'];
    executionAppealBanner: DebtorsSectionProps['executionAppealBanner'];
    onOpenDecisionsAppealsTab: DebtorsSectionProps['onOpenDecisionsAppealsTab'];
};

export function DebtorCardRowCollapsed({
    d,
    debtorDisp,
    debtorHeirsWord,
    debtorHasHeirs,
    rowIsLegalEntity,
    rowShowUnservedMemoBadge,
    showDebtorNotificationPanel,
    heirsDetailsIncludeClient,
    openHeirsQuickView,
    executionAppealBanner,
    onOpenDecisionsAppealsTab,
    isPrimary,
    debtorKey,
    isRepresentingDebtor,
    debtorBrowserTabsMode,
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
    getPublicationNoticeForDebtorKey,
    persistExecutionMerge,
    buildPublicationNoticePatchForDebtorKey,
    onOpenUnifiedSummonsHub,
    dismissDebtorAbsenceBadge,
    getDebtorSummonsMarkerForKey,
    buildDebtorSummonsMarkerPatchForKey,
    debtorSummonsMarkerLocal,
    setDebtorSummonsMarkerLocal,
    debtorArrested,
    decisionsStorageExecutionId,
    pushTimelineEvent,
    nextTimelineId,
    timelineDebtorMetadata,
    showToast,
    getEmployeeAssignmentForDebtorKey,
    buildEmployeeAssignmentPatchForDebtorKey,
    decisionsReloadEpoch,
    isHistoricalMode,
}: DebtorCardRowCollapsedProps) {
    const showPrimaryInlineBadges =
        (debtorDisp.showDeceasedGlyph && !debtorHeirsWord) ||
        (isPrimary && executionAppealBanner.show) ||
        (showDebtorNotificationPanel && rowShowUnservedMemoBadge);

    return (
                                                    <div
                                                        className="flex w-full items-center justify-between gap-2.5"
                                                        dir="rtl"
                                                    >
                                                        {isPrimary && (
                                                            <div
                                                                className="flex min-w-0 flex-1 flex-col items-stretch gap-0.5 text-right"
                                                            >
                                                                <div
                                                                    className="flex w-full min-w-0 flex-row flex-nowrap items-center justify-center gap-2 overflow-hidden"
                                                                    dir="rtl"
                                                                >
                                                                    <div
                                                                        className="flex min-w-0 max-w-full flex-row flex-nowrap items-center justify-center gap-1.5 overflow-hidden px-1"
                                                                        dir="rtl"
                                                                    >
                                                                        {debtorHeirsWord ? (
                                                                            <HeirsQuickViewTrigger
                                                                                label={debtorHeirsWord}
                                                                                onOpen={() =>
                                                                                    openHeirsQuickView(
                                                                                        d as Party,
                                                                                        'debtor',
                                                                                        'ورثة المدين'
                                                                                    )
                                                                                }
                                                                            />
                                                                        ) : null}
                                                                        <span className="block min-w-0 max-w-full truncate text-center text-[1.04rem] font-bold leading-tight text-white sm:text-[1.08rem]">
                                                                            {debtorHeirsWord ? debtorDisp.baseName : debtorDisp.text}
                                                                            {(debtorHasHeirs
                                                                                ? heirsDetailsIncludeClient(
                                                                                      d.heirs_details
                                                                                  )
                                                                                : d.isClient) &&
                                                                            !rowIsLegalEntity &&
                                                                            !debtorDisp.showDeceasedGlyph ? (
                                                                                <span
                                                                                    className="ms-1 inline-block rounded border border-[#E6C673]/30 bg-[#E6C673]/10 px-1 py-px text-[9px] font-bold leading-none text-[#E6C673] select-none"
                                                                                    title="موكلي"
                                                                                    aria-label="موكلي"
                                                                                >
                                                                                    موكلي
                                                                                </span>
                                                                            ) : null}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                {showPrimaryInlineBadges ? (
                                                                <div
                                                                    className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5"
                                                                    onClick={e => e.stopPropagation()}
                                                                    onKeyDown={e => e.stopPropagation()}
                                                                    role="presentation"
                                                                    dir="rtl"
                                                                >
                                                                    {debtorDisp.showDeceasedGlyph && !debtorHeirsWord ? (
                                                                        <span className="shrink-0 rounded-md border border-rose-500/40 bg-rose-950/40 px-1.5 py-0.5 text-[10px] font-bold leading-none text-rose-200/95 select-none">
                                                                            متوفى
                                                                        </span>
                                                                    ) : null}
                                                                    {isPrimary &&
                                                                    executionAppealBanner.show ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                onOpenDecisionsAppealsTab();
                                                                            }}
                                                                            className="shrink-0 whitespace-nowrap inline-flex items-center rounded-md border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-normal text-red-500 transition-colors hover:bg-red-500/15"
                                                                            title={`طعن ساري: ${executionAppealBanner.label} — افتح مركز الطعون`}
                                                                        >
                                                                            {executionAppealBanner.label}
                                                                        </button>
                                                                    ) : null}
                                                                    {showDebtorNotificationPanel &&
                                                                    rowShowUnservedMemoBadge ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (isPrimary) {
                                                                                    setSummonsMarkerPopoverOpen(false);
                                                                                    setExecutionMemoBadgePopoverOpen(true);
                                                                                } else {
                                                                                    onOpenUnifiedSummonsHub({
                                                                                        debtorKey: String(debtorKey),
                                                                                        initialMainTab: 'tabligh',
                                                                                    });
                                                                                }
                                                                            }}
                                                                            className="shrink-0 whitespace-nowrap rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-100 hover:bg-amber-500/15"
                                                                            title="لم يُسجَّل بعد تبليغ بمذكرة الإخبار بالتنفيذ"
                                                                        >
                                                                            غير مبلّغ
                                                                        </button>
                                                                    ) : null}
                                                                </div>
                                                                ) : null}
                                                                <DebtorCardRowBadgesCluster
                                                                    isRepresentingDebtor={isRepresentingDebtor}
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
                                                            </div>
                                                        )}
                                                        {!isPrimary && (
                                                            <div className="min-w-0 flex-1 text-right">
                                                                <div
                                                                    className="flex w-full min-w-0 flex-col items-stretch gap-1"
                                                                    dir="rtl"
                                                                >
                                                                    <div
                                                                        className="flex w-full min-w-0 flex-row flex-nowrap items-center justify-center gap-2 overflow-hidden"
                                                                        dir="rtl"
                                                                    >
                                                                        <div
                                                                            className="flex min-w-0 max-w-full flex-row flex-nowrap items-center justify-center gap-1 overflow-hidden"
                                                                            dir="rtl"
                                                                        >
                                                                            {debtorHeirsWord ? (
                                                                                <HeirsQuickViewTrigger
                                                                                    label={debtorHeirsWord}
                                                                                    onOpen={() =>
                                                                                        openHeirsQuickView(
                                                                                            d as Party,
                                                                                            'debtor',
                                                                                            'ورثة المدين'
                                                                                        )
                                                                                    }
                                                                                />
                                                                            ) : null}
                                                                            <span className="min-w-0 max-w-full truncate text-center text-xl font-bold leading-tight text-white">
                                                                                {debtorHeirsWord ? debtorDisp.baseName : debtorDisp.text}
                                                                                {(debtorHasHeirs
                                                                                    ? heirsDetailsIncludeClient(
                                                                                          d.heirs_details
                                                                                      )
                                                                                    : d.isClient) &&
                                                                                !rowIsLegalEntity &&
                                                                                !debtorDisp.showDeceasedGlyph ? (
                                                                                    <span
                                                                                        className="ms-1 inline-block rounded border border-[#E6C673]/30 bg-[#E6C673]/10 px-1 py-px text-[9px] font-bold leading-none text-[#E6C673] select-none"
                                                                                        title="موكلي"
                                                                                        aria-label="موكلي"
                                                                                    >
                                                                                        موكلي
                                                                                    </span>
                                                                                ) : null}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    {(debtorDisp.showDeceasedGlyph && !debtorHeirsWord) ||
                                                                    rowShowUnservedMemoBadge ? (
                                                                    <div
                                                                        className="mt-1 flex flex-wrap items-center justify-center gap-1.5"
                                                                        onClick={e => e.stopPropagation()}
                                                                        onKeyDown={e => e.stopPropagation()}
                                                                        role="presentation"
                                                                        dir="rtl"
                                                                    >
                                                                        {debtorDisp.showDeceasedGlyph && !debtorHeirsWord ? (
                                                                            <span className="shrink-0 rounded-md border border-rose-500/40 bg-rose-950/40 px-1.5 py-0.5 text-[10px] font-bold leading-none text-rose-200/95 select-none">
                                                                                متوفى
                                                                            </span>
                                                                        ) : null}
                                                                        {rowShowUnservedMemoBadge ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    onOpenUnifiedSummonsHub({
                                                                                        debtorKey: String(debtorKey),
                                                                                        initialMainTab: 'tabligh',
                                                                                    });
                                                                                }}
                                                                                className="shrink-0 whitespace-nowrap rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-100 hover:bg-amber-500/15"
                                                                                title="لم يُسجَّل بعد تبليغ بمذكرة الإخبار بالتنفيذ"
                                                                            >
                                                                                غير مبلّغ
                                                                            </button>
                                                                        ) : null}
                                                                    </div>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                        )}

                                                    </div>
    );
}

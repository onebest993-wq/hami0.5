import { heirsDetailsIncludeClient } from '../helpers';
import type { MutableRefObject } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import {
    buildPhoneBodyLiveScopeHandler,
    readPhoneBodyLiveScopeValue,
} from './buildPhoneBodyLiveScopeHandler';
import { buildPhoneBodyDebtorEmploymentToggleHandler } from './buildPhoneBodyDebtorEmploymentToggleHandler';
import { buildPhoneBodyPartyDeathMenuHandler } from './buildPhoneBodyPartyDeathMenuHandler';
import { pickExecutionPhoneBodyDebtorsScope } from './executionPhoneBodyDebtorsScope';

export function buildPhoneBodyDebtorsSectionProps(
    source: Record<string, unknown>,
    safeOpenEditParty: (
        kind: 'creditor' | 'debtor',
        index: number,
        opts?: { forceHeirs?: boolean; party?: import('@/app/types/execution').Party },
    ) => void,
    openDecisionsModalWithBoot: (boot?: { tab?: string }) => void,
    scopeRef?: MutableRefObject<Record<string, unknown>>,
) {
    const s = pickExecutionPhoneBodyDebtorsScope(source);
    const executionData = s.executionData as ExecutionFile | null | undefined;
    const viewExecutionData = s.viewExecutionData as ExecutionFile | null | undefined;
    const followupSpecialization = s.followupSpecialization as
        | { hideAllGuarantorPresence?: boolean }
        | null
        | undefined;
    const openUnifiedSummonsHubFromScope = s.onOpenUnifiedSummonsHub as
        | ((options?: {
              debtorKey?: string | null;
              initialMainTab?: 'tabligh' | 'taklif' | 'nashr' | 'guarantor' | null;
          }) => void)
        | undefined;
    return {
        executionId: String(s.executionId ?? executionData?.id ?? ''),
        heirsDetailsIncludeClient:
            typeof s.heirsDetailsIncludeClient === 'function'
                ? s.heirsDetailsIncludeClient
                : heirsDetailsIncludeClient,
        onOpenUnifiedSummonsHub: (options?: {
            debtorKey?: string | null;
            initialMainTab?: 'tabligh' | 'taklif' | 'nashr' | 'guarantor' | null;
        }) => {
            if (typeof openUnifiedSummonsHubFromScope === 'function') {
                openUnifiedSummonsHubFromScope(options);
                return;
            }
            const setKey = s.setSummonsContextDebtorKey;
            const setTab = s.setSummonsHubInitialMainTab;
            const setShow = s.setShowUnifiedSummonsModal;
            if (typeof setKey === 'function') {
                (setKey as (key: string | null) => void)(options?.debtorKey ?? null);
            }
            if (typeof setTab === 'function') {
                (setTab as (tab: 'tabligh' | 'taklif' | 'nashr' | 'guarantor' | null) => void)(
                    options?.initialMainTab ?? null,
                );
            }
            if (typeof setShow === 'function') {
                (setShow as (v: boolean) => void)(true);
            }
        },
        activeCoerciveActions: s.activeCoerciveActions,
        activeDebtorHeirsForNotification: s.activeDebtorHeirsForNotification,
        activeDebtorIsDeceased: s.activeDebtorIsDeceased,
        activeNoticeState: s.activeNoticeState,
        activeTimelineEvents: s.activeTimelineEvents,
        activeTimelineEventsDebtorScoped: s.activeTimelineEventsDebtorScoped,
        buildDebtorSummonsMarkerPatchForKey: s.buildDebtorSummonsMarkerPatchForKey,
        buildEmployeeAssignmentPatchForDebtorKey: s.buildEmployeeAssignmentPatchForDebtorKey,
        buildPartyHeirsRows: s.buildPartyHeirsRows,
        buildPublicationNoticePatchForDebtorKey: s.buildPublicationNoticePatchForDebtorKey,
        claimType: s.claimType,
        clearDebtorSummonsMarker: s.clearDebtorSummonsMarker,
        completeEvictionResidentialGrace: buildPhoneBodyLiveScopeHandler(
            scopeRef,
            source,
            'completeEvictionResidentialGrace',
        ),
        completePoliceAssistance: buildPhoneBodyLiveScopeHandler(scopeRef, source, 'completePoliceAssistance'),
        computeTaklifDeadlineYmd: s.computeTaklifDeadlineYmd,
        daysRemainingUntilDeadline: s.daysRemainingUntilDeadline,
        debtorArrested: s.debtorArrested,
        debtorAttendedVoluntarily: s.debtorAttendedVoluntarily,
        debtorBrowserTabsMode: s.debtorBrowserTabsMode,
        liabilityGroupTabsMode: s.liabilityGroupTabsMode,
        debtorLiabilityGroups: s.debtorLiabilityGroups,
        debtorDeathMenuLabel: s.debtorDeathMenuLabel,
        debtorEmploymentToggleMenuLabel: s.debtorEmploymentToggleMenuLabel,
        debtorForcedToAttend: s.debtorForcedToAttend,
        debtorSummonsMarkerLocal: s.debtorSummonsMarkerLocal,
        debtorSummonsProfile: s.debtorSummonsProfile,
        debtorWorkspaceChipStripRef: s.debtorWorkspaceChipStripRef,
        debtorWorkspaceEntries: s.debtorWorkspaceEntries,
        decisionsReloadEpoch: s.decisionsReloadEpoch,
        decisionsStorageExecutionId: s.decisionsStorageExecutionId,
        dismissDebtorAbsenceBadge: s.dismissDebtorAbsenceBadge,
        effectiveDebtors: s.effectiveDebtors,
        evictionGraceBadgeInfo: s.evictionGraceBadgeInfo,
        evictionGracePinned: readPhoneBodyLiveScopeValue(scopeRef, source, 'evictionGracePinned', false),
        executionAppealBanner: s.executionAppealBanner,
        executionData,
        executionDebtorTabIndex: s.executionDebtorTabIndex,
        executionMemoBadgePopoverOpen: s.executionMemoBadgePopoverOpen,
        executionToolsTimelineLockedUi: s.executionToolsTimelineLockedUi,
        forcedAttendanceIssued: s.forcedAttendanceIssued,
        forcedPathAttendanceSecured: s.forcedPathAttendanceSecured,
        getDebtorSummonsMarkerForKey: s.getDebtorSummonsMarkerForKey,
        getDebtorSummonsProfile: s.getDebtorSummonsProfile,
        getEmployeeAssignmentForDebtorKey: s.getEmployeeAssignmentForDebtorKey,
        getExecutionPartyDisplayName: s.getExecutionPartyDisplayName,
        getPersonalCoerciveSubtypeOutcome: s.getPersonalCoerciveSubtypeOutcome,
        getPublicationNoticeForDebtorKey: s.getPublicationNoticeForDebtorKey,
        handleDebtorDeathMenuAction: buildPhoneBodyPartyDeathMenuHandler(
            scopeRef,
            source,
            'handleDebtorDeathMenuAction',
        ),
        handleDebtorEmploymentToggle: buildPhoneBodyDebtorEmploymentToggleHandler(scopeRef, source),
        isAssignmentDeadlinePassed: s.isAssignmentDeadlinePassed,
        isDebtorGovernmentEmployee: s.isDebtorGovernmentEmployee,
        isDebtorRowEmployee: s.isDebtorRowEmployee,
        isEvictionExecutionModule: s.isEvictionExecutionModule,
        isHistoricalMode: s.isHistoricalMode,
        isNonFinancialClaim: s.isNonFinancialClaim,
        isRepresentingDebtor: s.isRepresentingDebtor,
        multiDebtorMode: s.multiDebtorMode,
        nextTimelineId: s.nextTimelineId,
        openEditParty: safeOpenEditParty,
        openEvictionResidentialGraceModal: buildPhoneBodyLiveScopeHandler(
            scopeRef,
            source,
            'openEvictionResidentialGraceModal',
        ),
        openHeirsNotificationCenter: s.openHeirsNotificationCenter,
        openHeirsQuickView: s.openHeirsQuickView,
        openPoliceAssistanceFromBadge: buildPhoneBodyLiveScopeHandler(
            scopeRef,
            source,
            'openPoliceAssistanceFromBadge',
        ),
        parsedLawyerFees: s.financialLawyerFeesAmount,
        partyBadgesExecutionId: s.partyBadgesExecutionId,
        persistExecutionMerge: s.persistExecutionMerge,
        persistGuarantorFollowupDetails: s.persistGuarantorFollowupDetails,
        policeAssistanceBadgeInfo: s.policeAssistanceBadgeInfo,
        primaryDebtorAbsenceBadge: s.primaryDebtorAbsenceBadge,
        primaryDebtorKeyResolved: s.primaryDebtorKeyResolved,
        primaryMemoNoticeBadge: s.primaryMemoNoticeBadge,
        principalDebtAmount: s.financialPrincipalAmount,
        publicationNoticeDeadlineYmd: s.publicationNoticeDeadlineYmd,
        pushTimelineEvent: s.pushTimelineEvent,
        realEstateSeizureAssets: s.realEstateSeizureAssets,
        saveSummonsMarkerPurposeEdit: s.saveSummonsMarkerPurposeEdit,
        seizedAssets: s.seizedAssets,
        setDebtorSummonsMarkerLocal: s.setDebtorSummonsMarkerLocal,
        onOpenDecisionsAppealsTab: () => openDecisionsModalWithBoot({ tab: 'appeals' }),
        setEvictionGraceDecisionId: s.setEvictionGraceDecisionId,
        setExecutionDebtorTabIndex: s.setExecutionDebtorTabIndex,
        setExecutionMemoBadgePopoverOpen: s.setExecutionMemoBadgePopoverOpen,
        setShowExtraDebtors: s.setShowExtraDebtors,
        setShowUnifiedSummonsModal: s.setShowUnifiedSummonsModal,
        setSummonsContextDebtorKey: s.setSummonsContextDebtorKey,
        setSummonsHubInitialMainTab: s.setSummonsHubInitialMainTab,
        setSummonsMarkerPopoverOpen: s.setSummonsMarkerPopoverOpen,
        setSummonsPurposeDraft: s.setSummonsPurposeDraft,
        showDebtorSummonsAttendanceBadge: s.showDebtorSummonsAttendanceBadge,
        showDebtorUnservedMemoBadge: s.showDebtorUnservedMemoBadge,
        showExtraDebtors: s.showExtraDebtors,
        showToast: s.showToast,
        smExecutionTarget: executionData?.executionTarget,
        smHasGuarantorFile: executionData?.hasGuarantor,
        hideAllGuarantorPresence: followupSpecialization?.hideAllGuarantorPresence,
        standaloneExecutionMarks: s.standaloneExecutionMarks,
        summonsMarkerPopoverOpen: s.summonsMarkerPopoverOpen,
        summonsPurposeDraft: s.summonsPurposeDraft,
        thirdPartySeizureAssets: s.thirdPartySeizureAssets,
        thirdPartySeizures: s.thirdPartySeizuresUi,
        timelineDebtorMetadata: s.timelineDebtorMetadata,
        toggleEvictionGracePinned: buildPhoneBodyLiveScopeHandler(scopeRef, source, 'toggleEvictionGracePinned'),
        viewExecutionData,
        voluntaryAttendanceCount: s.voluntaryAttendanceCount,
        noticeVoluntaryPeriodEndOptimistic: s.noticeVoluntaryPeriodEndOptimistic,
        voluntaryEndOptimistic: s.voluntaryEndOptimistic,
    };
}

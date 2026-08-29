import type {
    RealEstateSeizureAsset,
    SeizedAsset,
    StandaloneExecutionMark,
    ThirdPartySeizure,
    ThirdPartySeizureAsset,
    TimelineEvent,
} from '@/app/types/execution';
import type {
    PublicationNoticeBadgeInfo,
    TaklifAssignmentBadgeInfo,
} from '@/app/components/lawyer/execution/ExecutionPartyInteractiveBadges';
import type { DebtorsSectionProps } from './DebtorsSection.types';

export type DebtorCardRowBadgesClusterProps = {
    isRepresentingDebtor: boolean;
    isPrimary: boolean;
    debtorBrowserTabsMode: boolean;
    debtorKey: string;
    primaryDebtorKeyResolved: string;
    rowIsEmployee: boolean;
    rowForcedAttendancePending: boolean;
    rowMemoNoticeBadge: DebtorsSectionProps['primaryMemoNoticeBadge'];
    rowAbsenceNoticeBadge: DebtorsSectionProps['primaryDebtorAbsenceBadge'];
    rowShowSummonsBadge: boolean;
    rowRegularTablighBadge: {
        noticeDateYmd: string;
        purpose: string;
        recordedAt?: string;
        badgeHiddenAt?: string;
        periodEndedAt?: string;
    } | null;
    rowPublicationNoticeBadgeResolved: PublicationNoticeBadgeInfo | null;
    rowTaklifAssignmentBadge: TaklifAssignmentBadgeInfo | null;
    safeSeizedAssets: SeizedAsset[];
    safeRealEstateSeizureAssets: RealEstateSeizureAsset[];
    safeThirdPartySeizureAssets: ThirdPartySeizureAsset[];
    safeThirdPartySeizures: ThirdPartySeizure[];
    safeStandaloneExecutionMarks: StandaloneExecutionMark[];
    safeActiveTimelineEvents: TimelineEvent[];
    safeActiveTimelineEventsDebtorScoped: TimelineEvent[];
    DebtorSeizureCategoryBadges: DebtorsSectionProps['DebtorSeizureCategoryBadges'];
    ExecutionPartyInteractiveBadges: DebtorsSectionProps['ExecutionPartyInteractiveBadges'];
    partyBadgesExecutionId: DebtorsSectionProps['partyBadgesExecutionId'];
    viewExecutionData: DebtorsSectionProps['viewExecutionData'];
    debtorAttendedVoluntarily: DebtorsSectionProps['debtorAttendedVoluntarily'];
    voluntaryAttendanceCount: DebtorsSectionProps['voluntaryAttendanceCount'];
    executionData: DebtorsSectionProps['executionData'];
    setSummonsMarkerPopoverOpen: DebtorsSectionProps['setSummonsMarkerPopoverOpen'];
    setExecutionMemoBadgePopoverOpen: DebtorsSectionProps['setExecutionMemoBadgePopoverOpen'];
    evictionGraceBadgeInfo: DebtorsSectionProps['evictionGraceBadgeInfo'];
    evictionGracePinned: DebtorsSectionProps['evictionGracePinned'];
    toggleEvictionGracePinned: DebtorsSectionProps['toggleEvictionGracePinned'];
    setEvictionGraceDecisionId: DebtorsSectionProps['setEvictionGraceDecisionId'];
    openEvictionResidentialGraceModal: DebtorsSectionProps['openEvictionResidentialGraceModal'];
    completeEvictionResidentialGrace: DebtorsSectionProps['completeEvictionResidentialGrace'];
    policeAssistanceBadgeInfo: DebtorsSectionProps['policeAssistanceBadgeInfo'];
    openPoliceAssistanceFromBadge: DebtorsSectionProps['openPoliceAssistanceFromBadge'];
    completePoliceAssistance: DebtorsSectionProps['completePoliceAssistance'];
    getPublicationNoticeForDebtorKey: DebtorsSectionProps['getPublicationNoticeForDebtorKey'];
    persistExecutionMerge: DebtorsSectionProps['persistExecutionMerge'];
    buildPublicationNoticePatchForDebtorKey: DebtorsSectionProps['buildPublicationNoticePatchForDebtorKey'];
    onOpenUnifiedSummonsHub: DebtorsSectionProps['onOpenUnifiedSummonsHub'];
    dismissDebtorAbsenceBadge: DebtorsSectionProps['dismissDebtorAbsenceBadge'];
    getDebtorSummonsMarkerForKey: DebtorsSectionProps['getDebtorSummonsMarkerForKey'];
    buildDebtorSummonsMarkerPatchForKey: DebtorsSectionProps['buildDebtorSummonsMarkerPatchForKey'];
    debtorSummonsMarkerLocal: DebtorsSectionProps['debtorSummonsMarkerLocal'];
    setDebtorSummonsMarkerLocal: DebtorsSectionProps['setDebtorSummonsMarkerLocal'];
    debtorArrested: DebtorsSectionProps['debtorArrested'];
    decisionsStorageExecutionId: DebtorsSectionProps['decisionsStorageExecutionId'];
    pushTimelineEvent: DebtorsSectionProps['pushTimelineEvent'];
    nextTimelineId: DebtorsSectionProps['nextTimelineId'];
    timelineDebtorMetadata: DebtorsSectionProps['timelineDebtorMetadata'];
    showToast: DebtorsSectionProps['showToast'];
    getEmployeeAssignmentForDebtorKey: DebtorsSectionProps['getEmployeeAssignmentForDebtorKey'];
    buildEmployeeAssignmentPatchForDebtorKey: DebtorsSectionProps['buildEmployeeAssignmentPatchForDebtorKey'];
    decisionsReloadEpoch: DebtorsSectionProps['decisionsReloadEpoch'];
    isHistoricalMode: DebtorsSectionProps['isHistoricalMode'];
};

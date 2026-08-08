import type { Dispatch, ElementType, RefObject, SetStateAction } from 'react';
import type {
    AdditionalExecutionDebtor,
    Debtor,
    ExecutionFile,
    Party,
    RealEstateSeizureAsset,
    SeizedAsset,
    StandaloneExecutionMark,
    ThirdPartySeizure,
    ThirdPartySeizureAsset,
    TimelineEvent,
} from '@/app/types/execution';
import type { TaklifAssignmentBadgeInfo } from '@/app/components/lawyer/execution/ExecutionPartyInteractiveBadges';
import type { ExecutionPartyDisplayNameResult } from '@/app/utils/partyDisplayName';
import type { PersonalCoerciveSubtype } from '@/app/utils/executorSeizureDecisionQueue';
import type { DebtorSummonsProfile } from '@/app/utils/debtorSummonsProfile';
import type { DebtorLiabilityGroup } from '@/app/utils/debtorLiabilityGroups';
import type { DebtorWorkspaceEntry as DebtorWorkspaceEntryContract } from '@/app/components/lawyer/ExecutionDashboard/hooks/useDebtorWorkspaceEntries';

export type DebtorRowLike = Debtor | AdditionalExecutionDebtor;

export type ExpandControlRegistrar = (debtorKey: string, expand: () => void) => () => void;

export type SummonsMarker = {
    id: string;
    date: string;
    purpose: string;
    badgeHiddenAt?: string;
    periodEndedAt?: string;
    recordedAt?: string;
};

export type PublicationNoticeState = {
    publicationDateYmd: string;
    newspaper1: string;
    newspaper2: string;
    recordedAt?: string;
    badgeHiddenAt?: string;
    periodEndedAt?: string;
};

export type EmployeeAssignmentState = {
    phase: TaklifAssignmentBadgeInfo['phase'] | 'none';
    purpose?: string;
    notifyDate?: string;
    deadlineDate?: string;
    durationDays?: number;
    taklifCycleGeneration?: number;
    confirmedAt?: string;
    badgeHiddenAt?: string;
    periodEndedAt?: string;
    arrestOrderRecorded?: boolean;
};

export type MemoNoticeBadge = {
    anchor: string;
    remaining: number;
    graceExpired: boolean;
};

export type DebtorsSectionProps = {
    Bell: ElementType;
    Calendar: ElementType;
    DebtorSeizureCategoryBadges: ElementType;
    ExecutionPartyInteractiveBadges: ElementType;
    MapPin: ElementType;
    PartyOverflowToggle: ElementType;
    Phone: ElementType;
    X: ElementType;
    activeCoerciveActions: unknown[];
    activeDebtorHeirsForNotification: unknown[];
    activeDebtorIsDeceased: boolean;
    activeNoticeState: string;
    activeTimelineEvents: TimelineEvent[];
    activeTimelineEventsDebtorScoped: TimelineEvent[];
    buildDebtorSummonsMarkerPatchForKey: (
        executionData: ExecutionFile,
        debtorKey: string,
        primaryDebtorKeyResolved: string,
        next: SummonsMarker
    ) => Record<string, unknown>;
    buildEmployeeAssignmentPatchForDebtorKey: (
        executionData: ExecutionFile,
        debtorKey: string,
        assignment: EmployeeAssignmentState,
        primaryDebtorKeyResolved: string
    ) => Record<string, unknown>;
    buildPartyHeirsRows: (party: Party, kind: 'debtor' | 'creditor') => unknown[];
    buildPublicationNoticePatchForDebtorKey: (
        executionData: ExecutionFile,
        debtorKey: string,
        next: PublicationNoticeState
    ) => Record<string, unknown>;
    claimType: string;
    clearDebtorSummonsMarker: () => void;
    completeEvictionResidentialGrace: () => void;
    completePoliceAssistance: () => void;
    computeTaklifDeadlineYmd: (notifyDateYmd: string, durationDays: number) => string;
    daysRemainingUntilDeadline: (deadlineYmd: string) => number;
    debtorArrested: boolean;
    debtorAttendedVoluntarily: boolean;
    debtorBrowserTabsMode: boolean;
    liabilityGroupTabsMode?: boolean;
    debtorLiabilityGroups?: DebtorLiabilityGroup[];
    debtorDeathMenuLabel: string;
    debtorEmploymentToggleMenuLabel: (isEmployee: boolean, initial?: boolean) => string;
    debtorForcedToAttend: boolean;
    debtorSummonsMarkerLocal: SummonsMarker | null;
    debtorSummonsProfile: DebtorSummonsProfile;
    debtorWorkspaceChipStripRef: RefObject<HTMLDivElement | null>;
    debtorWorkspaceEntries: DebtorWorkspaceEntryContract[];
    decisionsReloadEpoch: number;
    decisionsStorageExecutionId: string;
    dismissDebtorAbsenceBadge: () => void;
    effectiveDebtors: Debtor[];
    evictionGraceBadgeInfo: unknown;
    evictionGracePinned: boolean;
    executionAppealBanner: { show: boolean; label: string };
    executionData: ExecutionFile | null;
    executionDebtorTabIndex: number;
    executionId: string;
    executionMemoBadgePopoverOpen: boolean;
    executionToolsTimelineLockedUi: boolean;
    forcedAttendanceIssued: boolean;
    forcedPathAttendanceSecured: boolean;
    getDebtorSummonsMarkerForKey: (
        executionData: ExecutionFile | null,
        debtorKey: string,
        primaryDebtorKeyResolved: string
    ) => SummonsMarker | null;
    getDebtorSummonsProfile: (params: {
        isGovernmentEmployee: boolean;
        parsedDebtAmount: number;
        parsedLawyerFees: number;
        claimType: string;
        isNonFinancialClaim: boolean;
    }) => DebtorSummonsProfile;
    getEmployeeAssignmentForDebtorKey: (
        executionData: ExecutionFile | null,
        debtorKey: string,
        primaryDebtorKeyResolved: string
    ) => EmployeeAssignmentState | null;
    getExecutionPartyDisplayName: (
        party: Party | undefined,
        role: 'creditor' | 'debtor',
        index: number,
        file: ExecutionFile | null | undefined
    ) => ExecutionPartyDisplayNameResult;
    getPersonalCoerciveSubtypeOutcome: (
        executionId: string,
        subtype: PersonalCoerciveSubtype,
        options?: { debtorKey?: string; primaryDebtorKey?: string }
    ) => { pending: boolean; approved: boolean; rejected: boolean; alternative: boolean };
    getPublicationNoticeForDebtorKey: (
        executionData: ExecutionFile | null,
        debtorKey: string
    ) => PublicationNoticeState | null;
    handleDebtorDeathMenuAction: () => void;
    handleDebtorEmploymentToggle: (payload: { debtorKey: string; isPrimary: boolean }) => void;
    heirsDetailsIncludeClient: (heirsDetails: Party['heirs_details']) => boolean;
    isAssignmentDeadlinePassed: (deadlineYmd: string) => boolean;
    isDebtorGovernmentEmployee: boolean;
    isDebtorRowEmployee: (debtor: DebtorRowLike | undefined) => boolean;
    isEvictionExecutionModule: boolean;
    isHistoricalMode: boolean;
    isNonFinancialClaim: boolean;
    /** وكيل المدين — إخفاء التبليغ وصفة طبيعي/معنوي */
    isRepresentingDebtor?: boolean;
    multiDebtorMode: boolean;
    nextTimelineId: () => string;
    openEditParty: (
        kind: 'debtor' | 'creditor',
        index: number,
        opts?: { forceHeirs?: boolean; party?: Party },
    ) => void;
    openEvictionResidentialGraceModal: () => void;
    openHeirsNotificationCenter: () => void;
    openHeirsQuickView: (party: Party, kind: 'debtor' | 'creditor', title: string) => void;
    openPoliceAssistanceFromBadge: () => void;
    parsedLawyerFees: number;
    partyBadgesExecutionId: string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    persistGuarantorFollowupDetails: (
        guarantorName: string,
        guarantorWorkplace: string,
        opts?: {
            salaryIqd: number | null;
            deductionIqd: number | null;
            guaranteeType?: 'amount' | 'attendance';
        }
    ) => void;
    policeAssistanceBadgeInfo: unknown;
    primaryDebtorAbsenceBadge: unknown;
    primaryDebtorKeyResolved: string;
    primaryMemoNoticeBadge: MemoNoticeBadge | null;
    principalDebtAmount: number;
    publicationNoticeDeadlineYmd: (publicationDateYmd: string) => string;
    pushTimelineEvent: (event: TimelineEvent) => void;
    realEstateSeizureAssets: RealEstateSeizureAsset[];
    saveSummonsMarkerPurposeEdit: () => void;
    seizedAssets: SeizedAsset[];
    setDebtorSummonsMarkerLocal: Dispatch<SetStateAction<SummonsMarker | null>>;
    onOpenDecisionsAppealsTab: () => void;
    setEvictionGraceDecisionId: Dispatch<SetStateAction<string | null>>;
    setExecutionDebtorTabIndex: Dispatch<SetStateAction<number>>;
    setExecutionMemoBadgePopoverOpen: Dispatch<SetStateAction<boolean>>;
    setShowExtraDebtors: Dispatch<SetStateAction<boolean>>;
    onOpenUnifiedSummonsHub?: (options?: {
        debtorKey?: string | null;
        initialMainTab?: 'tabligh' | 'taklif' | 'nashr' | 'guarantor' | null;
    }) => void;
    setSummonsContextDebtorKey?: (debtorKey: string | null) => void;
    setSummonsHubInitialMainTab?: (
        tab: 'tabligh' | 'taklif' | 'nashr' | 'guarantor' | null,
    ) => void;
    setShowUnifiedSummonsModal?: (open: boolean) => void;
    setSummonsMarkerPopoverOpen: Dispatch<SetStateAction<boolean>>;
    setSummonsPurposeDraft: Dispatch<SetStateAction<string>>;
    showDebtorSummonsAttendanceBadge: boolean;
    showDebtorUnservedMemoBadge: boolean;
    showExtraDebtors: boolean;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    smExecutionTarget: string | null;
    smHasGuarantorFile: boolean;
    hideAllGuarantorPresence?: boolean;
    standaloneExecutionMarks: StandaloneExecutionMark[];
    summonsMarkerPopoverOpen: boolean;
    summonsPurposeDraft: string;
    thirdPartySeizureAssets: ThirdPartySeizureAsset[];
    thirdPartySeizures?: ThirdPartySeizure[];
    timelineDebtorMetadata: (debtorKey: string) => Record<string, unknown>;
    toggleEvictionGracePinned: () => void;
    viewExecutionData: ExecutionFile | null;
    voluntaryAttendanceCount: number;
    noticeVoluntaryPeriodEndOptimistic?: boolean;
    voluntaryEndOptimistic?: boolean;
};

export type DebtorsSectionHandle = {
    expandDebtor: (debtorKey: string) => void;
};

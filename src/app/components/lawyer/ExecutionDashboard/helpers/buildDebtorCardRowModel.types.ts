import type {
    Debtor,
    Party,
    ExecutionFile,
} from '@/app/types/execution';
import type {
    PublicationNoticeBadgeInfo,
    TaklifAssignmentBadgeInfo,
} from '@/app/components/lawyer/execution/ExecutionPartyInteractiveBadges';
import type { ExecutionPartyDisplayNameResult } from '@/app/utils/partyDisplayName';
import type { PersonalCoerciveSubtype } from '@/app/utils/executorSeizureDecisionQueue';
import type { DebtorWorkspaceEntry as DebtorWorkspaceEntryContract } from '@/app/components/lawyer/ExecutionDashboard/hooks/useDebtorWorkspaceEntries';
import type { DebtorRowLike, MemoNoticeBadge } from '../components/DebtorsSection.types';

export type BuildDebtorCardRowModelInput = {
    raw: DebtorWorkspaceEntryContract | Debtor;
    loopIdx: number;
    applyPartyOverlay: (
        party: Record<string, unknown>,
        role: 'debtor' | 'creditor',
    ) => Record<string, unknown>;
    multiDebtorMode: boolean;
    showExtraDebtors: boolean;
    safeDebtorWorkspaceEntries: DebtorWorkspaceEntryContract[];
    safeEffectiveDebtors: Debtor[];
    getExecutionPartyDisplayName: (
        party: Party,
        role: 'debtor' | 'creditor',
        ordinal: number,
        executionData: ExecutionFile | null | undefined,
    ) => ExecutionPartyDisplayNameResult;
    buildPartyHeirsRows: (party: Party, role: 'debtor' | 'creditor') => unknown[] | null | undefined;
    executionData: ExecutionFile | null | undefined;
    decisionsStorageExecutionId: string;
    debtorBrowserTabsMode: boolean;
    isDebtorRowEmployee: (row: DebtorRowLike | undefined) => boolean;
    debtorEmploymentToggleMenuLabel: (
        isEmployee: boolean,
        initialWasEmployee: boolean | undefined,
    ) => string;
    principalDebtAmount: number;
    parsedLawyerFees: number;
    claimType: string;
    isNonFinancialClaim: boolean;
    debtorSummonsProfile: unknown;
    getDebtorSummonsProfile: (input: {
        isGovernmentEmployee: boolean;
        parsedDebtAmount: number;
        parsedLawyerFees: number;
        claimType: string;
        isNonFinancialClaim: boolean;
    }) => unknown;
    isRepresentingDebtor?: boolean;
    viewExecutionData: ExecutionFile | null | undefined;
    primaryDebtorKeyResolved: string;
    isEvictionExecutionModule: boolean;
    debtorAttendedVoluntarily: boolean;
    voluntaryAttendanceCount: number;
    noticeVoluntaryPeriodEndOptimistic: boolean;
    voluntaryEndOptimistic: boolean;
    getPublicationNoticeForDebtorKey: (
        executionData: ExecutionFile | null | undefined,
        debtorKey: string,
    ) => {
        publicationDateYmd?: string;
        newspaper1?: string;
        newspaper2?: string;
        recordedAt?: string;
        badgeHiddenAt?: string;
        periodEndedAt?: string;
    } | null | undefined;
    publicationNoticeDeadlineYmd: (ymd: string) => string;
    isAssignmentDeadlinePassed: (ymd: string) => boolean;
    daysRemainingUntilDeadline: (ymd: string) => number;
    getEmployeeAssignmentForDebtorKey: (
        executionData: ExecutionFile,
        debtorKey: string,
        primaryDebtorKey: string,
    ) => {
        phase?: string;
        notifyDate?: string;
        durationDays?: number;
        deadlineDate?: string;
        purpose?: string;
        taklifCycleGeneration?: number;
        confirmedAt?: string;
        badgeHiddenAt?: string;
        periodEndedAt?: string;
        arrestOrderRecorded?: boolean;
    } | null | undefined;
    computeTaklifDeadlineYmd: (notifyDate: string, durationDays: number) => string;
    getPersonalCoerciveSubtypeOutcome: (
        executionId: string,
        subtype: PersonalCoerciveSubtype,
        options?: { debtorKey?: string; primaryDebtorKey?: string },
    ) => { pending: boolean; approved: boolean; rejected: boolean; alternative: boolean };
    executionId: string | undefined;
    primaryMemoNoticeBadge: MemoNoticeBadge | null;
    primaryDebtorAbsenceBadge: unknown;
    getDebtorSummonsMarkerForKey: (
        executionData: ExecutionFile | null | undefined,
        debtorKey: string,
        primaryDebtorKey: string,
    ) => {
        date?: string;
        purpose?: string;
        recordedAt?: string;
        badgeHiddenAt?: string;
        periodEndedAt?: string;
    } | null | undefined;
    forcedPathAttendanceSecured: boolean;
    debtorForcedToAttend: boolean;
};

export type DebtorCardRowModel = {
    wsDebt: boolean;
    wsRow: DebtorWorkspaceEntryContract;
    d: Debtor;
    fileDebtorOrdinal: number;
    idx: number;
    isPrimary: boolean;
    debtorKey: string;
    debtorDisp: ReturnType<BuildDebtorCardRowModelInput['getExecutionPartyDisplayName']>;
    debtorHeirsRows: unknown[];
    debtorHasHeirs: boolean;
    debtorHeirsWord: string | null;
    debtorHeirsEditOnly: boolean;
    debtorPartyPreserveAppealInline: boolean;
    rowIsGovEmp: boolean;
    rowIsRetired: boolean;
    rowIsEmployee: boolean;
    rowInitialWasEmployee: boolean | undefined;
    rowEmploymentToggleLabel: string;
    rowIsLegalEntity: boolean;
    rowDebtorSummonsProfile: unknown;
    rowIsDeceased: boolean;
    showDebtorNotificationPanel: boolean;
    rowShowUnservedMemoBadge: boolean;
    rowTaklifAssignmentBadge: TaklifAssignmentBadgeInfo | null;
    rowForcedBringDecisionState: { pending?: boolean; approved?: boolean };
    rowAbsenceNoticeBadge: unknown;
    rowMemoNoticeBadge: MemoNoticeBadge | null;
    rowShowSummonsBadge: boolean;
    rowRegularTablighBadge: {
        noticeDateYmd: string;
        purpose: string;
        recordedAt?: string;
        badgeHiddenAt?: string;
        periodEndedAt?: string;
    } | null;
    rowPublicationNoticeBadgeResolved: PublicationNoticeBadgeInfo | null;
    rowForcedAttendancePending: boolean;
    showDebtorOrdinalBadge: boolean;
};
